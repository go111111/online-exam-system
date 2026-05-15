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
import multer from "multer";
import fs from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件上传目录
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // 只允许图片格式
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式的文件'));
    }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12345";

let db: any;
let isMySQL = false;
let userTableHasUsername = false;

const DEFAULT_ADMIN_EMAIL = "1776866817@qq.com";
const DEFAULT_ADMIN_PASSWORD = "jungle123";

const isBcryptHash = (value: string) => /^\$2[aby]\$\d{2}\$/.test(value);
const buildUsernameFromEmail = (email: string) => email.toLowerCase().split("@")[0];

async function getAvailableUsername(base: string) {
  const normalizedBase = (base || "user").toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const firstCandidate = normalizedBase || "user";
  const exists = await getOne("SELECT id FROM users WHERE username = ? LIMIT 1", [firstCandidate]);
  if (!exists) return firstCandidate;

  let suffix = 1;
  while (suffix <= 9999) {
    const candidate = `${firstCandidate}_${suffix}`;
    const collision = await getOne("SELECT id FROM users WHERE username = ? LIMIT 1", [candidate]);
    if (!collision) return candidate;
    suffix += 1;
  }

  return `${firstCandidate}_${Date.now()}`;
}

async function detectUserSchema() {
  if (isMySQL) {
    const [columns] = await db.execute("SHOW COLUMNS FROM users LIKE 'username'");
    userTableHasUsername = Array.isArray(columns) && columns.length > 0;
    return;
  }

  const columns = db.prepare("PRAGMA table_info(users)").all();
  userTableHasUsername = Array.isArray(columns) && columns.some((col: any) => col.name === "username");
}

async function createUser(email: string, password: string, fullName: string, role: string) {
  const normalizedEmail = email.toLowerCase();
  if (userTableHasUsername) {
    const username = await getAvailableUsername(buildUsernameFromEmail(normalizedEmail));
    await query(
      "INSERT INTO users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)",
      [username, normalizedEmail, password, fullName, role]
    );
    return;
  }

  await query(
    "INSERT INTO users (email, password, full_name, role) VALUES (?, ?, ?, ?)",
    [normalizedEmail, password, fullName, role]
  );
}

async function ensureAdminUsers() {
  const defaultAdmin = await getOne("SELECT id FROM users WHERE email = ? LIMIT 1", [DEFAULT_ADMIN_EMAIL]);
  if (!defaultAdmin) {
    const hashedPassword = bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10);
    await createUser(DEFAULT_ADMIN_EMAIL, hashedPassword, "Administrator", "admin");
    console.log(`✅ Default admin user created (${DEFAULT_ADMIN_EMAIL}/${DEFAULT_ADMIN_PASSWORD})`);
  }
}

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
        student_answer TEXT,
        answer_image_path TEXT,
        answer_image_base64 TEXT,
        submission_type TEXT DEFAULT 'text'
      );

      CREATE TABLE IF NOT EXISTS answer_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        answer_id INTEGER,
        file_name TEXT,
        file_path TEXT,
        file_size INTEGER,
        file_type TEXT,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS drawing_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        answer_id INTEGER UNIQUE,
        canvas_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
    
  }

  await detectUserSchema();
  await ensureAdminUsers();
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

  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true,
    maxAge: 86400
  }));
  
  app.options('*', cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true
  }));
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

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
      
      await createUser(email, hashedPassword, email.toLowerCase().split('@')[0], "student");
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
      
      let passwordValid = false;
      const storedPassword = user.password as string;

      if (storedPassword && isBcryptHash(storedPassword)) {
        passwordValid = bcrypt.compareSync(password, storedPassword);
      } else {
        // Backward compatibility: support legacy plain-text password rows.
        passwordValid = password === storedPassword;
        if (passwordValid) {
          const upgradedHash = bcrypt.hashSync(password, 10);
          await query("UPDATE users SET password = ? WHERE id = ?", [upgradedHash, user.id]);
        }
      }

      if (!passwordValid) {
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
        } else if (qq.type === 'drawing') {
          qq.type = 'drawing';
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
          `INSERT INTO answers (submission_id, question_id, student_answer, submission_type) VALUES (?, ?, ?, 'text')`,
          [submissionId, questionId, studentAnswer]
        );
      }

      res.json({ id: submissionId });
    } catch (e: any) {
      console.error('Submit exam error:', e.message);
      res.status(500).json({ error: "Failed to submit exam" });
    }
  });

  // Submit exam with file upload (for drawing or image answers)
  app.post("/api/exams/:id/submit-answer", authenticateToken, upload.single('file'), async (req, res) => {
    const { id } = req.params;
    const { questionId, answerText, drawingData } = req.body;
    const userId = (req as any).user.id;

    try {
      if (!questionId) {
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ error: "Missing question ID" });
      }

      // 获取或创建提交记录
      let existing = await query(
        `SELECT id FROM submissions WHERE user_id = ? AND exam_id = ? LIMIT 1`,
        [userId, id]
      );
      let submissionId: number;

      if (existing) {
        const existingSub = Array.isArray(existing) ? existing[0] : existing;
        submissionId = existingSub.id;
      } else {
        const result = await query(
          `INSERT INTO submissions (user_id, exam_id, status) VALUES (?, ?, 'submitted')`,
          [userId, id]
        );
        submissionId = isMySQL ? (result as any).insertId : (result as any).insertId;
      }

      // 检查是否已存在该问题的答案
      const existingAnswer = await query(
        `SELECT id FROM answers WHERE submission_id = ? AND question_id = ? LIMIT 1`,
        [submissionId, questionId]
      );

      let answerId: number;

      if (existingAnswer) {
        const ea = Array.isArray(existingAnswer) ? existingAnswer[0] : existingAnswer;
        answerId = ea.id;
        // 删除旧的文件记录
        const oldFiles = await query(
          `SELECT file_path FROM answer_files WHERE answer_id = ?`,
          [answerId]
        );
        const oldFileList = Array.isArray(oldFiles) ? oldFiles : (oldFiles ? [oldFiles] : []);
        for (const oldFile of oldFileList) {
          try {
            fs.unlinkSync(oldFile.file_path);
          } catch (e) {
            console.error('Failed to delete old file:', e);
          }
        }
        await query(`DELETE FROM answer_files WHERE answer_id = ?`, [answerId]);
        
        // 更新答案
        const submissionType = req.file ? 'file' : (drawingData ? 'canvas' : 'text');
        await query(
          `UPDATE answers SET student_answer = ?, answer_image_path = ?, submission_type = ? WHERE id = ?`,
          [answerText || '', req.file ? req.file.filename : null, submissionType, answerId]
        );
      } else {
        // 创建新答案
        const submissionType = req.file ? 'file' : (drawingData ? 'canvas' : 'text');
        const result = await query(
          `INSERT INTO answers (submission_id, question_id, student_answer, answer_image_path, submission_type) VALUES (?, ?, ?, ?, ?)`,
          [submissionId, questionId, answerText || '', req.file ? req.file.filename : null, submissionType]
        );
        answerId = isMySQL ? (result as any).insertId : (result as any).insertId;
      }

      // 保存文件信息
      if (req.file) {
        await query(
          `INSERT INTO answer_files (answer_id, file_name, file_path, file_size, file_type) VALUES (?, ?, ?, ?, ?)`,
          [answerId, req.file.originalname, req.file.path, req.file.size, req.file.mimetype]
        );
      }

      // 保存绘图数据
      if (drawingData) {
        const existingDrawing = await query(
          `SELECT id FROM drawing_data WHERE answer_id = ? LIMIT 1`,
          [answerId]
        );

        if (existingDrawing) {
          const ed = Array.isArray(existingDrawing) ? existingDrawing[0] : existingDrawing;
          await query(
            `UPDATE drawing_data SET canvas_json = ? WHERE answer_id = ?`,
            [drawingData, answerId]
          );
        } else {
          await query(
            `INSERT INTO drawing_data (answer_id, canvas_json) VALUES (?, ?)`,
            [answerId, drawingData]
          );
        }
      }

      res.json({ id: answerId, submissionId });
    } catch (e: any) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error('Failed to delete uploaded file:', err);
        }
      }
      console.error('Submit answer error:', e.message);
      res.status(500).json({ error: "Failed to submit answer" });
    }
  });

  // Get submission answers (with files and drawing data)
  app.get("/api/exams/:id/submission/answers", authenticateToken, async (req, res) => {
    const { id } = req.params;
    const userId = (req as any).user.id;

    try {
      const submission = await query(
        `SELECT id FROM submissions WHERE user_id = ? AND exam_id = ? LIMIT 1`,
        [userId, id]
      );
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      const submissionId = Array.isArray(submission) ? submission[0].id : submission.id;

      const answers = await query(
        `SELECT a.id, a.question_id, a.student_answer, a.submission_type, a.answer_image_path
         FROM answers a
         WHERE a.submission_id = ?`,
        [submissionId]
      );

      const answersList = Array.isArray(answers) ? answers : (answers ? [answers] : []);
      
      // 为每个答案获取文件和绘图数据
      const enrichedAnswers = await Promise.all(answersList.map(async (ans: any) => {
        const files = await query(
          `SELECT id, file_name, file_path, file_size FROM answer_files WHERE answer_id = ?`,
          [ans.id]
        );

        const drawing = await query(
          `SELECT canvas_json FROM drawing_data WHERE answer_id = ? LIMIT 1`,
          [ans.id]
        );

        const fileList = Array.isArray(files) ? files : (files ? [files] : []);
        const drawingData = Array.isArray(drawing) ? drawing[0] : drawing;

        return {
          ...ans,
          files: fileList,
          drawing: drawingData?.canvas_json || null
        };
      }));

      res.json(enrichedAnswers);
    } catch (e: any) {
      console.error('Fetch submission answers error:', e.message);
      res.status(500).json({ error: "Failed to fetch submission answers" });
    }
  });

  // Get uploaded file
  app.get("/api/uploads/:filename", (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(uploadDir, filename);

    // 安全性检查：确保文件在 uploads 目录内
    if (!path.resolve(filePath).startsWith(path.resolve(uploadDir))) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.sendFile(filePath);
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
// Create exam - 已修复版本
app.post("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, start_time, end_time, duration_minutes, status } = req.body;
    const userId = (req as any).user.id;

    try {
        if (!title || !start_time || !end_time) {
            return res.status(400).json({ error: "Missing required exam fields: title, start_time, end_time" });
        }

        const result = await query(
            `INSERT INTO exams (title, description, start_time, end_time, duration_minutes, status, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                title, 
                description || null, 
                start_time, 
                end_time, 
                duration_minutes || 60, 
                status || 'published', 
                userId
            ]
        );

        // 安全获取 insertId（兼容 MySQL / SQLite）
        let id = null;
        if (result && typeof result === 'object') {
            id = (result as any).insertId || (result as any).lastInsertRowid;
        }

        if (!id) {
            throw new Error("Failed to retrieve insert ID");
        }

        res.json({ id, message: "考试创建成功" });
    } catch (e: any) {
        console.error('Create exam error:', e.message || e);
        console.error('Error stack:', e.stack);
        res.status(500).json({ 
            error: "Failed to create exam", 
            message: e.message || "数据库错误" 
        });
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
        else if (qq.type === 'drawing') qq.type = 'drawing';
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
      if (!type || !content) {
        return res.status(400).json({ error: "Missing required question fields" });
      }

      let questionType = 'short_answer';
      if (type === 'choice') {
        questionType = 'single_choice';
      } else if (type === 'fill') {
        questionType = 'fill_blank';
      } else if (type === 'drawing') {
        questionType = 'drawing';
      } else if (type === 'text') {
        questionType = 'short_answer';
      }

      // 画图题不需要 correct_answer，因为需要手动评分
      const finalAnswer = questionType === 'drawing' ? '' : answer;

      const result = await query(
        `INSERT INTO questions (exam_id, question_type, content, score, correct_answer, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, questionType, content, score, finalAnswer, 0]
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

  // Get current user profile
  app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const users = await query("SELECT id, email, full_name, role FROM users WHERE id = ?", [userId]);
      const user = Array.isArray(users) ? users[0] : users;
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      res.json(user);
    } catch (e: any) {
      console.error('Get profile error:', e.message);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Update question (admin)
  app.put("/api/admin/exams/:id/questions/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { id, qid } = req.params;
    const { type, content, options, answer, score = 5 } = req.body;
    
    try {
      if (!type || !content) {
        return res.status(400).json({ error: "Missing required question fields" });
      }

      let questionType = 'short_answer';
      if (type === 'choice') {
        questionType = 'single_choice';
      } else if (type === 'fill') {
        questionType = 'fill_blank';
      } else if (type === 'drawing') {
        questionType = 'drawing';
      }

      // 画图题不需要 correct_answer
      const finalAnswer = questionType === 'drawing' ? '' : answer;

      await query(
        `UPDATE questions SET question_type = ?, content = ?, correct_answer = ?, score = ? WHERE id = ? AND exam_id = ?`,
        [questionType, content, finalAnswer, score, qid, id]
      );
      
      res.json({ id: qid });
    } catch (e: any) {
      console.error('Update question error:', e.message);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Delete question (admin)
  app.delete("/api/admin/exams/:id/questions/:qid", authenticateToken, isAdmin, async (req, res) => {
    const { id, qid } = req.params;
    
    try {
      await query("DELETE FROM questions WHERE id = ? AND exam_id = ?", [qid, id]);
      res.json({ success: true });
    } catch (e: any) {
      console.error('Delete question error:', e.message);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Get all users (admin)
  app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
    try {
      const users = await query("SELECT id, email, full_name, role FROM users ORDER BY id DESC");
      res.json(users);
    } catch (e: any) {
      console.error('Fetch users error:', e.message);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get user submissions (admin)
  app.get("/api/admin/users/:userId/submissions", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const submissions = await query(
        `SELECT s.id, e.title as examTitle, s.total_score as score, s.cheated, s.status, s.submitted_at
         FROM submissions s
         JOIN exams e ON s.exam_id = e.id
         WHERE s.user_id = ?
         ORDER BY s.submitted_at DESC`,
        [userId]
      );
      res.json(submissions);
    } catch (e: any) {
      console.error('Fetch user submissions error:', e.message);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Get submission detail (admin)
  app.get("/api/admin/submissions/:submissionId", authenticateToken, isAdmin, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const submissions = await query(
        `SELECT s.id, u.email, e.id as examId, e.title as examTitle, s.total_score as score, s.cheated, s.status, s.submitted_at
         FROM submissions s
         JOIN users u ON s.user_id = u.id
         JOIN exams e ON s.exam_id = e.id
         WHERE s.id = ?`,
        [submissionId]
      );
      const submission = Array.isArray(submissions) ? submissions[0] : submissions;
      
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }

      // Get answers
      const answers = await query(
        `SELECT a.id, a.question_id, a.student_answer, q.content, q.correct_answer
         FROM answers a
         JOIN questions q ON a.question_id = q.id
         WHERE a.submission_id = ?`,
        [submissionId]
      );

      res.json({ submission, answers });
    } catch (e: any) {
      console.error('Fetch submission detail error:', e.message);
      res.status(500).json({ error: "Failed to fetch submission" });
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
