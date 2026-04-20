import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12345";

let db: any;

async function initDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log("✅ Connected to MySQL (Aiven)");
    await db.execute("SELECT 1");
    console.log("✅ Database connection verified");
  } catch (err: any) {
    console.error("❌ Failed to connect to MySQL:", err.message);
    process.exit(1);
  }
}

async function startServer() {
  await initDB();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
    next();
  };

  // Register
  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    try {
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      if (username.length < 3 || password.length < 6) {
        return res.status(400).json({ error: "Username min 3 chars, password min 6 chars" });
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      await db.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username, hashedPassword, 'student']
      );
      res.json({ message: "User registered successfully" });
    } catch (e: any) {
      if (e.message.includes('Duplicate entry')) {
        res.status(400).json({ error: "Username already exists" });
      } else {
        console.error('Registration error:', e);
        res.status(400).json({ error: e.message || "Registration failed" });
      }
    }
  });

  // Login
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      
      const [users]: any = await db.execute("SELECT * FROM users WHERE username = ?", [username]);
      const user = users[0];
      
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET
      );
      res.json({
        token,
        user: { id: user.id, username: user.username, role: user.role }
      });
    } catch (e: any) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get exams
  app.get("/api/exams", authenticateToken, async (req, res) => {
    try {
      const [exams]: any = await db.execute(
        "SELECT * FROM exams WHERE status != 'draft' ORDER BY start_time DESC"
      );
      res.json(exams);
    } catch (e: any) {
      console.error('Fetch exams error:', e.message || e);
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  });

  // Get exam detail with questions
  app.get("/api/exams/:id", authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
      const [exams]: any = await db.execute(
        "SELECT * FROM exams WHERE id = ?",
        [id]
      );
      if (exams.length === 0) {
        return res.status(404).json({ error: "Exam not found" });
      }

      const exam = exams[0];
      
      // Get questions
      const [questions]: any = await db.execute(
        `SELECT id, question_type as type, content, correct_answer as answer, score
         FROM questions WHERE exam_id = ? ORDER BY sort_order`,
        [id]
      );

      // For choice questions, get options
      for (const q of questions) {
        if (q.type === 'single_choice') {
          q.type = 'choice';
          const [options]: any = await db.execute(
            "SELECT option_text FROM question_options WHERE question_id = ? ORDER BY option_label",
            [q.id]
          );
          q.options = options.map((o: any) => o.option_text);
        } else if (q.type === 'fill_blank') {
          q.type = 'fill';
        } else if (q.type === 'short_answer') {
          q.type = 'text';
        }
        // Don't send correct_answer to student
        delete q.answer;
      }

      res.json({ exam, questions });
    } catch (e: any) {
      console.error('Fetch exam error:', e.message);
      res.status(500).json({ error: "Failed to fetch exam" });
    }
  });

  // Submit exam
  app.post("/api/exams/:id/submit", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { answers, cheated } = req.body;
    const userId = (req as any).user.id;

    try {
      if (!answers) {
        return res.status(400).json({ error: "Missing answers" });
      }

      // Create submission
      const result: any = await db.execute(
        `INSERT INTO submissions (user_id, exam_id, cheated)
         VALUES (?, ?, ?)`,
        [userId, id, cheated ? 1 : 0]
      );

      const submissionId = result[0].insertId;

      // Save answers (answers object: questionId => answer)
      for (const [questionId, studentAnswer] of Object.entries(answers)) {
        await db.execute(
          `INSERT INTO answers (submission_id, question_id, student_answer)
           VALUES (?, ?, ?)`,
          [submissionId, questionId, studentAnswer]
        );
      }

      res.json({ id: submissionId });
    } catch (e: any) {
      console.error('Submit exam error:', e.message);
      res.status(500).json({ error: "Failed to submit exam" });
    }
  });

  // Get admin exams
  app.get("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [exams]: any = await db.execute(
        "SELECT * FROM exams ORDER BY start_time DESC"
      );
      res.json(exams);
    } catch (e: any) {
      console.error('Fetch admin exams error:', e.message || e);
      res.status(500).json({ error: "Failed to fetch admin exams" });
    }
  });

  // Create exam
  app.post("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const {
      title,
      description,
      start_time,
      end_time,
      duration_minutes,
      total_score,
      status,
      startTime,
      endTime,
      duration,
      totalScore,
    } = req.body;

    const finalStart = start_time || startTime;
    const finalEnd = end_time || endTime;
    const finalDuration = duration_minutes ?? duration;
    const finalScore = total_score ?? totalScore ?? 100;
    const finalStatus = status || 'published';

    try {
      if (!title || !finalStart || !finalEnd || !finalDuration) {
        return res.status(400).json({ error: "Missing required exam fields" });
      }

      const result: any = await db.execute(
        `INSERT INTO exams (title, description, start_time, end_time, duration_minutes, total_score, created_by, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, description, finalStart, finalEnd, finalDuration, finalScore, (req as any).user.id, finalStatus]
      );
      res.json({ id: result[0].insertId });
    } catch (e: any) {
      console.error('Create exam error:', e.message || e);
      res.status(500).json({ error: "Failed to create exam" });
    }
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      await db.execute("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (e) {
      res.status(500).json({ status: "error", database: "disconnected" });
    }
  });

  // Get exam questions
  app.get("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const [questions]: any = await db.execute(
        `SELECT id, question_type as type, content, correct_answer as answer, score
         FROM questions WHERE exam_id = ? ORDER BY sort_order`,
        [id]
      );
      
      // For choice questions, parse options from question_options table
      for (const q of questions) {
        if (q.type === 'single_choice') {
          q.type = 'choice';
          const [options]: any = await db.execute(
            "SELECT option_text FROM question_options WHERE question_id = ? ORDER BY option_label",
            [q.id]
          );
          q.options = options.map((o: any) => o.option_text);
        } else if (q.type === 'fill_blank') {
          q.type = 'fill';
        } else if (q.type === 'short_answer') {
          q.type = 'text';
        }
      }
      
      res.json(questions);
    } catch (e: any) {
      console.error('Fetch questions error:', e.message);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Add question to exam
  app.post("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { type, content, options, answer, score = 5 } = req.body;
    
    try {
      if (!type || !content || !answer) {
        return res.status(400).json({ error: "Missing required question fields" });
      }

      let questionType = 'short_answer';
      if (type === 'choice') {
        questionType = 'single_choice';
      } else if (type === 'fill') {
        questionType = 'fill_blank';
      }

      // Get max sort_order
      const [maxSort]: any = await db.execute(
        "SELECT MAX(sort_order) as max_order FROM questions WHERE exam_id = ?",
        [id]
      );
      const nextOrder = (maxSort[0]?.max_order || 0) + 1;

      const result: any = await db.execute(
        `INSERT INTO questions (exam_id, question_type, content, score, correct_answer, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, questionType, content, score, answer, nextOrder]
      );

      const questionId = result[0].insertId;

      // Add options for choice questions
      if (type === 'choice' && options && Array.isArray(options)) {
        const labels = ['A', 'B', 'C', 'D'];
        for (let i = 0; i < options.length; i++) {
          await db.execute(
            `INSERT INTO question_options (question_id, option_label, option_text, is_correct)
             VALUES (?, ?, ?, ?)`,
            [questionId, labels[i], options[i], options[i] === answer ? 1 : 0]
          );
        }
      }

      res.json({ id: questionId });
    } catch (e: any) {
      console.error('Add question error:', e.message);
      res.status(500).json({ error: "Failed to add question" });
    }
  });

  // Update question
  app.put("/api/admin/exams/:id/questions/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { id, qid } = req.params;
    const { type, content, options, answer, score = 5 } = req.body;
    
    try {
      if (!type || !content || !answer) {
        return res.status(400).json({ error: "Missing required question fields" });
      }

      let questionType = 'short_answer';
      if (type === 'choice') {
        questionType = 'single_choice';
      } else if (type === 'fill') {
        questionType = 'fill_blank';
      }

      await db.execute(
        `UPDATE questions SET question_type = ?, content = ?, score = ?, correct_answer = ? WHERE id = ? AND exam_id = ?`,
        [questionType, content, score, answer, qid, id]
      );

      // Update options if choice question
      if (type === 'choice') {
        await db.execute("DELETE FROM question_options WHERE question_id = ?", [qid]);
        if (options && Array.isArray(options)) {
          const labels = ['A', 'B', 'C', 'D'];
          for (let i = 0; i < options.length; i++) {
            await db.execute(
              `INSERT INTO question_options (question_id, option_label, option_text, is_correct)
               VALUES (?, ?, ?, ?)`,
              [qid, labels[i], options[i], options[i] === answer ? 1 : 0]
            );
          }
        }
      }

      res.json({ id: qid });
    } catch (e: any) {
      console.error('Update question error:', e.message);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Delete question
  app.delete("/api/admin/exams/:id/questions/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { id, qid } = req.params;
    
    try {
      // Delete options first
      await db.execute("DELETE FROM question_options WHERE question_id = ?", [qid]);
      // Delete question
      await db.execute("DELETE FROM questions WHERE id = ? AND exam_id = ?", [qid, id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete question error:', e.message);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Update exam
  app.put("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, start_time, end_time, duration_minutes, total_score, status } = req.body;
    
    try {
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required exam fields" });
      }

      await db.execute(
        `UPDATE exams SET title = ?, description = ?, start_time = ?, end_time = ?, duration_minutes = ?, total_score = ?, status = ? 
         WHERE id = ?`,
        [title, description, start_time, end_time, duration_minutes, total_score || 100, status || 'published', id]
      );

      res.json({ id });
    } catch (e: any) {
      console.error('Update exam error:', e.message);
      res.status(500).json({ error: "Failed to update exam" });
    }
  });

  // Delete exam
  app.delete("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    
    try {
      await db.execute("DELETE FROM exams WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete exam error:', e.message);
      res.status(500).json({ error: "Failed to delete exam" });
    }
  });

  // Get admin results (exam submissions)
  app.get("/api/admin/results", authenticateToken, isAdmin, async (req, res) => {
    try {
      const [results]: any = await db.execute(
        `SELECT 
          s.id,
          u.username,
          e.title as examTitle,
          s.total_score as score,
          s.submitted_at as endTime,
          s.cheated
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         JOIN exams e ON s.exam_id = e.id
         ORDER BY s.submitted_at DESC`
      );
      res.json(results);
    } catch (e: any) {
      console.error('Fetch results error:', e.message);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const [notifications]: any = await db.execute(
        `SELECT n.*, 
                (SELECT COUNT(*) FROM notification_reads WHERE notification_id = n.id AND user_id = ?) as read_count
         FROM notifications n
         WHERE (n.target_role = 'all' OR n.target_role = ? OR (n.type = 'exam' AND n.exam_id IN (
           SELECT exam_id FROM exam_participants WHERE user_id = ?
         )))
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [userId, userRole, userId]
      );

      // Mark each notification with read status
      const result = notifications.map((n: any) => ({
        ...n,
        is_read: n.read_count > 0
      }));

      res.json(result);
    } catch (e: any) {
      console.error('Fetch notifications error:', e.message);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread/count", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const [result]: any = await db.execute(
        `SELECT COUNT(DISTINCT n.id) as unread_count
         FROM notifications n
         LEFT JOIN notification_reads nr ON n.id = nr.notification_id AND nr.user_id = ?
         WHERE nr.id IS NULL 
         AND (n.target_role = 'all' OR n.target_role = ? OR (n.type = 'exam' AND n.exam_id IN (
           SELECT exam_id FROM exam_participants WHERE user_id = ?
         )))`,
        [userId, userRole, userId]
      );

      res.json({ unread_count: result[0]?.unread_count || 0 });
    } catch (e: any) {
      console.error('Fetch unread count error:', e.message);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });

  // Publish notification (admin only)
  app.post("/api/admin/notifications", authenticateToken, isAdmin, async (req, res) => {
    const { title, content, type = 'announcement', target_role = 'all', exam_id } = req.body;
    
    try {
      if (!title || !content) {
        return res.status(400).json({ error: "Title and content required" });
      }

      const result: any = await db.execute(
        `INSERT INTO notifications (title, content, type, target_role, exam_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [title, content, type, target_role, exam_id || null, (req as any).user.id]
      );

      res.json({ id: result[0].insertId });
    } catch (e: any) {
      console.error('Create notification error:', e.message);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Mark notification as read
  app.put("/api/notifications/:id/read", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    try {
      await db.execute(
        `INSERT INTO notification_reads (notification_id, user_id) VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE read_at = NOW()`,
        [id, userId]
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error('Mark read error:', e.message);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Delete notification (admin only)
  app.delete("/api/admin/notifications/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
      await db.execute("DELETE FROM notifications WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete notification error:', e.message);
      res.status(500).json({ error: "Failed to delete notification" });
    }
  });

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      await db.execute("SELECT 1");
      res.json({ status: "ok", database: "connected" });
    } catch (e) {
      res.status(500).json({ status: "error", database: "disconnected" });
    }
  });

  // Vite dev server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true }
    });
    app.use(vite.middlewares);
  }

  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on http://localhost:3000`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
