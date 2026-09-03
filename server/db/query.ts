let db: any;
let mysqlMode = false;

export function setDatabase(connection: any, isMySQL: boolean) {
  db = connection;
  mysqlMode = isMySQL;
}

export function getDatabase() {
  if (!db) {
    throw new Error("Database has not been initialized");
  }
  return db;
}

export function isUsingMySQL() {
  return mysqlMode;
}

export async function query(sql: string, params: any[] = []) {
  const database = getDatabase();

  if (mysqlMode) {
    const [result] = await database.execute(sql, params);
    return result;
  }

  const stmt = database.prepare(sql);
  if (sql.trim().toUpperCase().startsWith("SELECT")) {
    return stmt.all(...params);
  }

  const result = stmt.run(...params);
  return { insertId: result.lastInsertRowid, affectedRows: result.changes };
}

export async function getOne(sql: string, params: any[] = []) {
  const database = getDatabase();

  if (mysqlMode) {
    const [result] = await database.execute(sql, params);
    return (result as any)[0];
  }

  return database.prepare(sql).get(...params);
}
