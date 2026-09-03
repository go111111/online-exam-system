import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { env } from "../config/env";
import { ensureAcademicSchema, ensureGradingSchema, ensureNotificationSchema } from "./migrate";
import { getDatabase, getOne, isUsingMySQL, query, setDatabase } from "./query";

const DEFAULT_ADMIN_EMAIL = "1776866817@qq.com";
const DEFAULT_ADMIN_PASSWORD = "jungle123";

let userTableHasUsername = false;

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
  const database = getDatabase();

  if (isUsingMySQL()) {
    const [columns] = await database.execute("SHOW COLUMNS FROM users LIKE 'username'");
    userTableHasUsername = Array.isArray(columns) && columns.length > 0;
    return;
  }

  const columns = database.prepare("PRAGMA table_info(users)").all();
  userTableHasUsername = Array.isArray(columns) && columns.some((col: any) => col.name === "username");
}

export async function createUser(email: string, password: string, fullName: string, role: string) {
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
    console.log(`Default admin user created (${DEFAULT_ADMIN_EMAIL}/${DEFAULT_ADMIN_PASSWORD})`);
  }
}

export async function initDB() {
  try {
    const connection = await mysql.createConnection({
      host: env.mysql.host,
      port: env.mysql.port,
      user: env.mysql.user,
      password: env.mysql.password,
      database: env.mysql.database,
    });

    setDatabase(connection, true);
    console.log("Connected to MySQL");
    await connection.execute("SELECT 1");
    console.log("Database connection verified");
  } catch (err: any) {
    console.log("MySQL not available, falling back to SQLite:", err.message);
    console.log("Using SQLite database");

    const sqlite = new Database("exam.db");
    setDatabase(sqlite, false);

    sqlite.exec(`
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
        status TEXT DEFAULT 'published',
        created_by INTEGER
      );

      CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exam_id INTEGER,
        question_type TEXT,
        content TEXT,
        correct_answer TEXT,
        score INTEGER DEFAULT 5,
        sort_order INTEGER DEFAULT 0,
        image_path TEXT
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
        total_score REAL,
        used_time_minutes INTEGER,
        rejection_reason TEXT,
        rejection_by INTEGER,
        has_manual_scoring INTEGER DEFAULT 0,
        scored_by INTEGER,
        scored_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS answers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        submission_id INTEGER,
        question_id INTEGER,
        student_answer TEXT,
        is_correct INTEGER,
        awarded_score REAL,
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

    try {
      const database = getDatabase();
      const examColumns = database.prepare("PRAGMA table_info(exams)").all();
      const hasCreatedBy = Array.isArray(examColumns) && examColumns.some((col: any) => col.name === "created_by");
      if (!hasCreatedBy) {
        database.exec("ALTER TABLE exams ADD COLUMN created_by INTEGER");
        console.log("Added exams.created_by");
      }

      const questionColumns = database.prepare("PRAGMA table_info(questions)").all();
      const hasImagePath = Array.isArray(questionColumns) && questionColumns.some((col: any) => col.name === "image_path");
      if (!hasImagePath) {
        database.exec("ALTER TABLE questions ADD COLUMN image_path TEXT");
        console.log("Added questions.image_path");
      }

      const answerColumns = database.prepare("PRAGMA table_info(answers)").all();
      const hasAnswerImagePath = Array.isArray(answerColumns) && answerColumns.some((col: any) => col.name === "answer_image_path");
      if (!hasAnswerImagePath) {
        database.exec("ALTER TABLE answers ADD COLUMN answer_image_path TEXT");
        console.log("Added answers.answer_image_path");
      }

      const hasSubmissionType = Array.isArray(answerColumns) && answerColumns.some((col: any) => col.name === "submission_type");
      if (!hasSubmissionType) {
        database.exec("ALTER TABLE answers ADD COLUMN submission_type TEXT DEFAULT 'text'");
        console.log("Added answers.submission_type");
      }
    } catch (migrateErr: any) {
      console.log("Database migration warning:", migrateErr.message);
    }
  }

  await detectUserSchema();
  await ensureAdminUsers();
  await ensureGradingSchema();
  await ensureNotificationSchema();
  await ensureAcademicSchema();
}

export { getDatabase, getOne, isUsingMySQL, query };
export { ensureAcademicSchema, ensureColumn, ensureGradingSchema, ensureNotificationSchema } from "./migrate";
