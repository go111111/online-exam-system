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
    const [rows] = await db.execute('SHOW CREATE TABLE users');
    console.log(rows[0]['Create Table']);
    await db.end();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();