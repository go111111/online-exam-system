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
        res.status(400).json({ error: "Registration failed" });
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
      if (!user || !bcrypt.compareSync(password, user.password)) {
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
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch exams" });
    }
  });

  // Create exam
  app.post("/api/admin/exams", authenticateToken, isAdmin, async (req, res) => {
    const { title, description, start_time, end_time, duration_minutes, total_score } = req.body;
    try {
      const result: any = await db.execute(
        `INSERT INTO exams (title, description, start_time, end_time, duration_minutes, total_score, created_by, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, 'published')`,
        [title, description, start_time, end_time, duration_minutes, total_score, (req as any).user.id]
      );
      res.json({ id: result[0].insertId });
    } catch (e) {
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
