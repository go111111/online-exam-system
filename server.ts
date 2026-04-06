import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("exam.db");
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key_12345";

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    startTime DATETIME,
    endTime DATETIME,
    duration INTEGER, -- in minutes
    status TEXT DEFAULT 'closed' -- open, closed
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    examId INTEGER,
    type TEXT, -- choice, fill, text
    content TEXT,
    options TEXT, -- JSON array for choices
    answer TEXT,
    FOREIGN KEY(examId) REFERENCES exams(id)
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    examId INTEGER,
    answers TEXT, -- JSON object
    score REAL,
    startTime DATETIME,
    endTime DATETIME,
    cheated BOOLEAN DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES users(id),
    FOREIGN KEY(examId) REFERENCES exams(id)
  );
`);

// Create default admin if not exists
const adminExists = db.prepare("SELECT * FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run("admin", hashedPassword, "admin");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Middleware for Auth
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

  // --- API Routes ---

  // Auth
  app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("INSERT INTO users (username, password) VALUES (?, ?)").run(username, hashedPassword);
      res.json({ message: "User registered successfully" });
    } catch (e) {
      res.status(400).json({ error: "Username already exists" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Exams (Admin)
  app.get("/api/admin/exams", authenticateToken, isAdmin, (req, res) => {
    const exams = db.prepare("SELECT * FROM exams").all();
    res.json(exams);
  });

  app.post("/api/admin/exams", authenticateToken, isAdmin, (req, res) => {
    const { title, description, startTime, endTime, duration, status } = req.body;
    const result = db.prepare("INSERT INTO exams (title, description, startTime, endTime, duration, status) VALUES (?, ?, ?, ?, ?, ?)")
      .run(title, description, startTime, endTime, duration, status || 'closed');
    res.json({ id: result.lastInsertRowid });
  });

  app.put("/api/admin/exams/:id", authenticateToken, isAdmin, (req, res) => {
    const { title, description, startTime, endTime, duration, status } = req.body;
    db.prepare("UPDATE exams SET title = ?, description = ?, startTime = ?, endTime = ?, duration = ?, status = ? WHERE id = ?")
      .run(title, description, startTime, endTime, duration, status, req.params.id);
    res.json({ message: "Exam updated" });
  });

  app.delete("/api/admin/exams/:id", authenticateToken, isAdmin, (req, res) => {
    db.prepare("DELETE FROM exams WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM questions WHERE examId = ?").run(req.params.id);
    res.json({ message: "Exam deleted" });
  });

  // Questions (Admin)
  app.get("/api/admin/exams/:id/questions", authenticateToken, isAdmin, (req, res) => {
    const questions = db.prepare("SELECT * FROM questions WHERE examId = ?").all(req.params.id);
    res.json(questions.map((q: any) => ({ ...q, options: JSON.parse(q.options || '[]') })));
  });

  app.post("/api/admin/exams/:id/questions", authenticateToken, isAdmin, (req, res) => {
    const { type, content, options, answer } = req.body;
    const result = db.prepare("INSERT INTO questions (examId, type, content, options, answer) VALUES (?, ?, ?, ?, ?)")
      .run(req.params.id, type, content, JSON.stringify(options), answer);
    res.json({ id: result.lastInsertRowid });
  });

  // User Exams
  app.get("/api/exams", authenticateToken, (req, res) => {
    const now = new Date().toISOString();
    // Only show open exams within time range
    const exams = db.prepare(`
      SELECT * FROM exams 
      WHERE status = 'open' 
      AND startTime <= ? 
      AND endTime >= ?
    `).all(now, now);
    res.json(exams);
  });

  app.get("/api/exams/:id", authenticateToken, (req: any, res: any) => {
    const exam: any = db.prepare("SELECT * FROM exams WHERE id = ?").get(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    
    // Check if user already submitted
    const submission = db.prepare("SELECT * FROM submissions WHERE userId = ? AND examId = ?").get(req.user.id, req.params.id);
    if (submission) return res.status(403).json({ error: "Already submitted", submission });

    const questions = db.prepare("SELECT id, type, content, options FROM questions WHERE examId = ?").all(req.params.id);
    res.json({ 
      exam, 
      questions: questions.map((q: any) => ({ ...q, options: JSON.parse(q.options || '[]') })) 
    });
  });

  app.post("/api/exams/:id/submit", authenticateToken, (req: any, res: any) => {
    const { answers, cheated, startTime } = req.body;
    const endTime = new Date().toISOString();
    
    // Basic scoring (only for choice/fill if exact)
    const questions = db.prepare("SELECT * FROM questions WHERE examId = ?").all(req.params.id);
    let score = 0;
    questions.forEach((q: any) => {
      const userAnswer = answers[q.id];
      if (q.type === 'choice' || q.type === 'fill') {
        if (userAnswer === q.answer) score += 1;
      }
      // Text questions need manual grading, but we'll give 0 for now or placeholder
    });

    const result = db.prepare("INSERT INTO submissions (userId, examId, answers, score, startTime, endTime, cheated) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(req.user.id, req.params.id, JSON.stringify(answers), score, startTime, endTime, cheated ? 1 : 0);
    
    res.json({ message: "Submitted", score, id: result.lastInsertRowid });
  });

  // Results (Admin)
  app.get("/api/admin/results", authenticateToken, isAdmin, (req, res) => {
    const results = db.prepare(`
      SELECT s.*, u.username, e.title as examTitle 
      FROM submissions s
      JOIN users u ON s.userId = u.id
      JOIN exams e ON s.examId = e.id
    `).all();
    res.json(results.map((r: any) => ({ ...r, answers: JSON.parse(r.answers || '{}') })));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
