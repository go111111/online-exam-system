import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12345";

// Database Connection
let db: any;
let isMySQL = false;

async function initDB() {
  try {
    if (process.env.MYSQL_HOST) {
      db = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
      });
      isMySQL = true;
      console.log("Connected to MySQL");
      
      // Init MySQL Tables
      await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          role VARCHAR(50) DEFAULT 'user'
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS exams (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255),
          description TEXT,
          startTime DATETIME,
          endTime DATETIME,
          duration INT,
          status VARCHAR(50) DEFAULT 'closed'
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          examId INT,
          type VARCHAR(50),
          content TEXT,
          options TEXT,
          answer TEXT
        )
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS submissions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          userId INT,
          examId INT,
          answers TEXT,
          score FLOAT,
          startTime DATETIME,
          endTime DATETIME,
          cheated TINYINT(1) DEFAULT 0
        )
      `);
    } else {
      throw new Error("MySQL not configured, falling back to SQLite");
    }
  } catch (err) {
    console.log(err instanceof Error ? err.message : "Database error");
    db = new Database("exam.db");
    isMySQL = false;
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT, role TEXT DEFAULT 'user');
      CREATE TABLE IF NOT EXISTS exams (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, description TEXT, startTime DATETIME, endTime DATETIME, duration INTEGER, status TEXT DEFAULT 'closed');
      CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, examId INTEGER, type TEXT, content TEXT, options TEXT, answer TEXT);
      CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, examId INTEGER, answers TEXT, score REAL, startTime DATETIME, endTime DATETIME, cheated BOOLEAN DEFAULT 0);
    `);
  }

  // Create default admin
  const adminUsername = "admin";
  let admin;
  if (isMySQL) {
    const [rows]: any = await db.execute("SELECT * FROM users WHERE username = ?", [adminUsername]);
    admin = rows[0];
  } else {
    admin = db.prepare("SELECT * FROM users WHERE username = ?").get(adminUsername);
  }

  if (!admin) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    if (isMySQL) {
      await db.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [adminUsername, hashedPassword, "admin"]);
    } else {
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run(adminUsername, hashedPassword, "admin");
    }
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

  // Helper for DB queries
  const query = async (sql: string, params: any[] = []) => {
    if (isMySQL) {
      const [rows] = await db.execute(sql, params);
      return rows;
    } else {
      const stmt = db.prepare(sql);
      if (sql.trim().toUpperCase().startsWith("SELECT")) {
        return stmt.all(...params);
      } else {
        return stmt.run(...params);
      }
    }
  };

  const getOne = async (sql: string, params: any[] = []) => {
    if (isMySQL) {
      const [rows]: any = await db.execute(sql, params);
      return rows[0];
    } else {
      return db.prepare(sql).get(...params);
    }
  };

  // --- API Routes ---

  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      await query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
      res.json({ message: "User registered successfully" });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await getOne("SELECT * FROM users WHERE username = ?", [username]);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.get("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const exams = await query("SELECT * FROM exams");
    res.json(exams);
  });

  app.post("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, startTime, endTime, duration, status } = req.body;
    const result: any = await query("INSERT INTO exams (title, description, startTime, endTime, duration, status) VALUES (?, ?, ?, ?, ?, ?)", 
      [title, description, startTime, endTime, duration, status || 'closed']);
    res.json({ id: isMySQL ? result.insertId : result.lastInsertRowid });
  });

  app.put("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, startTime, endTime, duration, status } = req.body;
    await query("UPDATE exams SET title = ?, description = ?, startTime = ?, endTime = ?, duration = ?, status = ? WHERE id = ?", 
      [title, description, startTime, endTime, duration, status, req.params.id]);
    res.json({ message: "Exam updated" });
  });

  app.delete("/api/admin/exams/:id", authenticateToken, isAdmin, async (req, res) => {
    await query("DELETE FROM exams WHERE id = ?", [req.params.id]);
    await query("DELETE FROM questions WHERE examId = ?", [req.params.id]);
    res.json({ message: "Exam deleted" });
  });

  app.get("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const questions: any = await query("SELECT * FROM questions WHERE examId = ?", [req.params.id]);
    res.json(questions.map((q: any) => ({ ...q, options: JSON.parse(q.options || '[]') })));
  });

  app.post("/api/admin/exams/:id/questions", authenticateToken, isAdmin, async (req, res) => {
    const { type, content, options, answer } = req.body;
    const result: any = await query("INSERT INTO questions (examId, type, content, options, answer) VALUES (?, ?, ?, ?, ?)", 
      [req.params.id, type, content, JSON.stringify(options), answer]);
    res.json({ id: isMySQL ? result.insertId : result.lastInsertRowid });
  });

  app.get("/api/exams", authenticateToken, async (req, res) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const exams = await query("SELECT * FROM exams WHERE status = 'open' AND startTime <= ? AND endTime >= ?", [now, now]);
    res.json(exams);
  });

  app.get("/api/exams/:id", authenticateToken, async (req: any, res: any) => {
    const exam = await getOne("SELECT * FROM exams WHERE id = ?", [req.params.id]);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const submission = await getOne("SELECT * FROM submissions WHERE userId = ? AND examId = ?", [req.user.id, req.params.id]);
    if (submission) return res.status(403).json({ error: "Already submitted", submission });
    const questions: any = await query("SELECT id, type, content, options FROM questions WHERE examId = ?", [req.params.id]);
    res.json({ exam, questions: questions.map((q: any) => ({ ...q, options: JSON.parse(q.options || '[]') })) });
  });

  app.post("/api/exams/:id/submit", authenticateToken, async (req: any, res: any) => {
    const { answers, cheated, startTime } = req.body;
    const endTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const questions: any = await query("SELECT * FROM questions WHERE examId = ?", [req.params.id]);
    let score = 0;
    questions.forEach((q: any) => {
      if ((q.type === 'choice' || q.type === 'fill') && answers[q.id] === q.answer) score += 1;
    });
    const result: any = await query("INSERT INTO submissions (userId, examId, answers, score, startTime, endTime, cheated) VALUES (?, ?, ?, ?, ?, ?, ?)", 
      [req.user.id, req.params.id, JSON.stringify(answers), score, startTime.slice(0, 19).replace('T', ' '), endTime, cheated ? 1 : 0]);
    res.json({ message: "Submitted", score, id: isMySQL ? result.insertId : result.lastInsertRowid });
  });

  app.get("/api/admin/results", authenticateToken, isAdmin, async (req, res) => {
    const results: any = await query(`
      SELECT s.*, u.username, e.title as examTitle 
      FROM submissions s
      JOIN users u ON s.userId = u.id
      JOIN exams e ON s.examId = e.id
    `);
    res.json(results.map((r: any) => ({ ...r, answers: JSON.parse(r.answers || '{}') })));
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
