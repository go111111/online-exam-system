const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const db = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  try {
    // 删除 email 的唯一性约束（如果存在）
    try {
      await db.execute('ALTER TABLE users DROP INDEX email');
      console.log('✅ 删除了 email UNIQUE 约束');
    } catch (e) {
      // 约束可能不存在
    }

    // 将 email 改为可选
    await db.execute('ALTER TABLE users MODIFY COLUMN email VARCHAR(150) NULL DEFAULT NULL');
    console.log('✅ email 已改为可选（允许 NULL）');

    // 查看 users 表结构
    const [rows] = await db.execute('DESCRIBE users');
    console.log('\n✅ users 表当前结构：');
    rows.forEach(row => {
      console.log(`  ${row.Field}: ${row.Type} ${row.Null === 'YES' ? '(可选)' : '(必填)'}`);
    });

  } catch (err) {
    console.error('❌ 错误:', err.message);
  } finally {
    await db.end();
  }
})();
