import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12345";

let db: any;
let isMySQL = false;

async function initDB() {
  try {
    db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || "3306"),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log("✅ Connected to MySQL");
    await db.execute("SELECT 1");
    console.log("✅ Database connection verified");
    isMySQL = true;
  } catch (err: any) {
    console.log("⚠️  MySQL not available, falling back to SQLite:", err.message);
    console.log("🔄 Using SQLite database");
    
    db = new Database("exam.db");
    isMySQL = false;
    
    // Create tables for SQLite
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        role TEXT DEFAULT 'student'
      );
      
      CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        start_time DATETIME,
        end_time DATETIME,
        duration_minutes INTEGER,
        status TEXT DEFAULT 'published'
      );
      
      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        question_type TEXT,
        content TEXT,
        correct_answer TEXT,
        score INTEGER DEFAULT 5,
        sort_order INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS question_options (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER,
        option_label TEXT,
        option_text TEXT,
        is_correct INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        exam_id INTEGER,
        cheated INTEGER DEFAULT 0,
        status TEXT DEFAULT 'submitted',
        submitted_at DATETIME,
        total_score REAL
      );
      
      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER,
        question_id INTEGER,
        student_answer TEXT
      );
      
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        type TEXT DEFAULT 'announcement',
        target_role TEXT DEFAULT 'all',
        exam_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS notification_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id INTEGER,
        user_id INTEGER,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notification_id, user_id)
      );
    `);
    
    // Create default admin user
    const admin = db.prepare("SELECT * FROM users WHERE email = ?").get("admin@qq.com");
    if (!admin) {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      db.prepare("INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)").run(
        "admin@qq.com", hashedPassword, "Administrator", "admin"
      );
      console.log("✅ Default admin user created (admin@qq.com/admin123)");
    }
  }
}

// Helper functions for database queries
const query = async (sql: string, params: any[] = []) => {
  if (isMySQL) {
    const [result] = await db.execute(sql, params);
    return result;
  } else {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      return stmt.all(...params);
    } else {
      const result = stmt.run(...params);
      return { insertId: result.lastInsertRowid, affectedRows: result.changes };
    }
  }
};

const getOne = async (sql: string, params: any[] = []) => {
  if (isMySQL) {
    const [result] = await db.execute(sql, params);
    return (result as any)[0];
  } else {
    return db.prepare(sql).get(...params);
  }
};

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
    const { email, password } = req.body;
    try {
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      // 验证QQ邮箱格式
      const qqEmailRegex = /^[0-9]+@qq\.com$/;
      if (!qqEmailRegex.test(email.toLowerCase())) {
        return res.status(400).json({ error: "Please use QQ email (xxx@qq.com)" });
      }
      if (password.length < 6 || password.length > 20) {
        return res.status(400).json({ error: "Password must be 6-20 characters" });
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      // Generate username from email (e.g., 123456@qq.com -> user_123456)
      const username = `user_${email.toLowerCase().split('@')[0]}`;
      await query(
        "INSERT INTO users (email, password, role, username) VALUES (?, ?, ?, ?)",
        [email.toLowerCase(), hashedPassword, 'student', username]
      );
      res.json({ message: "User registered successfully" });
    } catch (e: any) {
      if (e.message.includes('Duplicate entry') || e.code === 'SQLITE_CONSTRAINT') {
        res.status(400).json({ error: "Email already exists" });
      } else {
        console.error('Registration error:', e);
        res.status(400).json({ error: e.message || "Registration failed" });
      }
    }
  });

  // Login
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }
      
      const users = await query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
      const user = Array.isArray(users) ? users[0] : users;
      
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET
      );
      res.json({
        token,
        user: { id: user.id, email: user.email, role: user.role }
      });
    } catch (e: any) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Get exams
  app.get("/api/exams", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const exams = await query(
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
    const userId = (req as any).user.id;
    try {
      const exams = await query("SELECT * FROM exams WHERE id = ?", [id]);
      const exam = Array.isArray(exams) ? exams[0] : exams;
      
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      // Get questions
      const questions = await query(
        "SELECT id, question_type as type, content, correct_answer as answer, score FROM questions WHERE exam_id = ? ORDER BY sort_order",
        [id]
      );

      // Process questions
      const processedQuestions = (Array.isArray(questions) ? questions : []).map((q: any) => {
        const qq = { ...q };
        if (qq.type === 'single_choice') {
          qq.type = 'choice';
        } else if (qq.type === 'fill_blank') {
          qq.type = 'fill';
        } else if (qq.type === 'short_answer') {
          qq.type = 'text';
        }
        delete qq.answer;
        return qq;
      });

      const submissions = await query(
        "SELECT id, status FROM submissions WHERE exam_id = ? AND user_id = ? LIMIT 1",
        [id, userId]
      );
      const submission = Array.isArray(submissions) ? submissions[0] : submissions;

      res.json({ exam, questions: processedQuestions, existingSubmission: submission || null });
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

      const existing = await query(
        `SELECT id, status FROM submissions WHERE user_id = ? AND exam_id = ? LIMIT 1`,
        [userId, id]
      );
      const existingSub = Array.isArray(existing) ? existing[0] : existing;

      let submissionId: number;
      if (existingSub) {
        if (existingSub.status !== 'rejected') {
          return res.status(400).json({ error: "This exam has already been submitted" });
        }
        submissionId = existingSub.id;
        await query(
          `UPDATE submissions SET submitted_at = CURRENT_TIMESTAMP, cheated = ?, status = 'submitted' WHERE id = ?`,
          [cheated ? 1 : 0, submissionId]
        );
        await query("DELETE FROM answers WHERE submission_id = ?", [submissionId]);
      } else {
        const result = await query(
          `INSERT INTO submissions (user_id, exam_id, cheated, status) VALUES (?, ?, ?, 'submitted')`,
          [userId, id, cheated ? 1 : 0]
        );
        submissionId = isMySQL ? (result as any).insertId : (result as any).insertId;
      }

      // Save answers
      for (const [questionId, studentAnswer] of Object.entries(answers)) {
        await query(
          `INSERT INTO answers (submission_id, question_id, student_answer) VALUES (?, ?, ?)`,
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
      const exams = await query("SELECT * FROM exams ORDER BY start_time DESC");
      res.json(exams);
    } catch (e: any) {
      console.error('Fetch admin exams error:', e.message || e);
      res.status(500).json({ error: "Failed to fetch admin exams" });
    }
  });

  // Create exam
  app.post("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, start_time, end_time, duration_minutes, status } = req.body;

    try {
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required exam fields" });
      }

      const result = await query(
        `INSERT INTO exams (title, description, start_time, end_time, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?)`,
        [title, description, start_time, end_time, duration_minutes || 60, status || 'published']
      );
      const id = isMySQL ? (result as any).insertId : (result as any).insertId;
      res.json({ id });
    } catch (e: any) {
      console.error('Create exam error:', e.message || e);
      res.status(500).json({ error: "Failed to create exam" });
    }
  });

  // Get exam questions (admin)
  app.get("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      const questions = await query(
        "SELECT id, question_type as type, content, correct_answer as answer, score FROM questions WHERE exam_id = ? ORDER BY sort_order",
        [id]
      );
      
      const processedQuestions = (Array.isArray(questions) ? questions : []).map((q: any) => {
        const qq = { ...q };
        if (qq.type === 'single_choice') qq.type = 'choice';
        else if (qq.type === 'fill_blank') qq.type = 'fill';
        else if (qq.type === 'short_answer') qq.type = 'text';
        return qq;
      });
      
      res.json(processedQuestions);
    } catch (e: any) {
      console.error('Fetch questions error:', e.message);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  // Add question
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

      const result = await query(
        `INSERT INTO questions (exam_id, question_type, content, score, correct_answer, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, questionType, content, score, answer, 0]
      );
      const questionId = isMySQL ? (result as any).insertId : (result as any).insertId;

      res.json({ id: questionId });
    } catch (e: any) {
      console.error('Add question error:', e.message);
      res.status(500).json({ error: "Failed to add question" });
    }
  });

  // Update exam
  app.put("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, start_time, end_time, duration_minutes, status } = req.body;
    
    try {
      if (!title || !start_time || !end_time) {
        return res.status(400).json({ error: "Missing required exam fields" });
      }

      await query(
        `UPDATE exams SET title = ?, description = ?, start_time = ?, end_time = ?, duration_minutes = ?, status = ? WHERE id = ?`,
        [title, description, start_time, end_time, duration_minutes || 60, status || 'published', id]
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
      await query("DELETE FROM exams WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete exam error:', e.message);
      res.status(500).json({ error: "Failed to delete exam" });
    }
  });

  // Get admin results
  app.get("/api/admin/results", authenticateToken, isAdmin, async (req, res) => {
    try {
      const results = await query(
        `SELECT s.id, u.email, e.title as examTitle, s.total_score as score, s.cheated, s.status
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

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      if (isMySQL) {
        await db.execute("SELECT 1");
      } else {
        db.prepare("SELECT 1").get();
      }
      res.json({ status: "ok", database: isMySQL ? "MySQL" : "SQLite" });
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
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
