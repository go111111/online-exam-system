import { getDatabase, isUsingMySQL, query } from "./query";

async function getTableColumns(tableName: string) {
  const database = getDatabase();

  if (isUsingMySQL()) {
    const [columns] = await database.execute(`SHOW COLUMNS FROM ${tableName}`);
    return (columns as any[]).map((column: any) => column.Field);
  }

  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all();
  return (columns as any[]).map((column: any) => column.name);
}

export async function ensureColumn(
  tableName: string,
  columnName: string,
  mysqlDefinition: string,
  sqliteDefinition = mysqlDefinition
) {
  const columns = await getTableColumns(tableName);
  if (columns.includes(columnName)) return;

  const definition = isUsingMySQL() ? mysqlDefinition : sqliteDefinition;
  await query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  console.log(`Added ${tableName}.${columnName}`);
}

export async function ensureGradingSchema() {
  await ensureColumn("submissions", "used_time_minutes", "INT DEFAULT NULL", "INTEGER");
  await ensureColumn("submissions", "rejection_reason", "TEXT");
  await ensureColumn("submissions", "rejection_by", "INT DEFAULT NULL", "INTEGER");
  await ensureColumn("submissions", "has_manual_scoring", "TINYINT(1) DEFAULT 0", "INTEGER DEFAULT 0");
  await ensureColumn("submissions", "scored_by", "INT DEFAULT NULL", "INTEGER");
  await ensureColumn("submissions", "scored_at", "DATETIME DEFAULT NULL", "DATETIME");

  await ensureColumn("answers", "is_correct", "TINYINT(1) DEFAULT NULL", "INTEGER");
  await ensureColumn("answers", "awarded_score", "DECIMAL(6,2) DEFAULT NULL", "REAL");
  await ensureColumn("answers", "answer_image_path", "VARCHAR(500) NULL", "TEXT");
  await ensureColumn("answers", "answer_image_base64", "LONGTEXT NULL", "TEXT");
  await ensureColumn("answers", "submission_type", "VARCHAR(20) DEFAULT 'text'", "TEXT DEFAULT 'text'");

  if (isUsingMySQL()) {
    await query(`
      CREATE TABLE IF NOT EXISTS answer_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        answer_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        file_type VARCHAR(50),
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
        INDEX idx_answer_id (answer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS drawing_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        answer_id INT NOT NULL,
        canvas_json LONGTEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE CASCADE,
        UNIQUE KEY unique_answer_drawing (answer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS answer_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        answer_id INTEGER,
        file_name TEXT,
        file_path TEXT,
        file_size INTEGER,
        file_type TEXT,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS drawing_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        answer_id INTEGER UNIQUE,
        canvas_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
}

export async function ensureNotificationSchema() {
  if (isUsingMySQL()) {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'announcement',
        target_role VARCHAR(20) DEFAULT 'all',
        exam_id INT DEFAULT NULL,
        created_by INT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_target_role (target_role),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        notification_id INT NOT NULL,
        user_id INT NOT NULL,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_notification_read (notification_id, user_id),
        INDEX idx_notification_id (notification_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        type TEXT DEFAULT 'announcement',
        target_role TEXT DEFAULT 'all',
        exam_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        notification_id INTEGER,
        user_id INTEGER,
        read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(notification_id, user_id)
      )
    `);
  }
}

export async function ensureAcademicSchema() {
  if (isUsingMySQL()) {
    await query(`
      CREATE TABLE IF NOT EXISTS majors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) DEFAULT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_major_name (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        major_id INT DEFAULT NULL,
        grade VARCHAR(20) DEFAULT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_major_id (major_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  } else {
    await query(`
      CREATE TABLE IF NOT EXISTS majors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        code TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        major_id INTEGER,
        grade TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  await ensureColumn("users", "student_no", "VARCHAR(60) DEFAULT NULL", "TEXT");
  await ensureColumn("users", "teacher_no", "VARCHAR(60) DEFAULT NULL", "TEXT");
  await ensureColumn("users", "class_id", "INT DEFAULT NULL", "INTEGER");
  await ensureColumn("users", "major_id", "INT DEFAULT NULL", "INTEGER");
  await ensureColumn("users", "phone", "VARCHAR(40) DEFAULT NULL", "TEXT");
  await ensureColumn("users", "status", "VARCHAR(20) DEFAULT 'active'", "TEXT DEFAULT 'active'");
}
