const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  try {
    const db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT, 10),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('修改 users 表...');
    
    // 修改 email 字段为可选（允许 NULL）
    await db.execute('ALTER TABLE users MODIFY COLUMN email VARCHAR(150) NULL');
    
    console.log('✅ email 字段已改为可选');

    // 确保 username 有唯一性约束
    const [indexes] = await db.execute("SHOW INDEX FROM users WHERE Column_name='username'");
    if (indexes.length === 0) {
      await db.execute('ALTER TABLE users ADD UNIQUE KEY unique_username (username)');
      console.log('✅ username 唯一性约束已添加');
    } else {
      console.log('✅ username 已有唯一性约束');
    }

    await db.end();
    console.log('✅ 数据库修改完成');
  } catch (err) {
    console.error('❌ 错误:', err.message);
    process.exit(1);
  }
})();
