import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function updateDatabase() {
  let db;
  try {
    db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
    });

    console.log('✅ Connected to MySQL');

    // Check and add status column
    try {
      await db.execute(`
        ALTER TABLE submissions
        ADD COLUMN status ENUM('submitted', 'graded', 'rejected') DEFAULT 'submitted'
      `);
      console.log('✅ Added status column');
    } catch (err: any) {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('ℹ️  status column already exists');
    }

    // Check and add rejection_reason column
    try {
      await db.execute(`
        ALTER TABLE submissions
        ADD COLUMN rejection_reason TEXT
      `);
      console.log('✅ Added rejection_reason column');
    } catch (err: any) {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('ℹ️  rejection_reason column already exists');
    }

    // Check and add rejection_by column
    try {
      await db.execute(`
        ALTER TABLE submissions
        ADD COLUMN rejection_by INT
      `);
      console.log('✅ Added rejection_by column');
    } catch (err: any) {
      if (!err.message.includes('Duplicate column')) throw err;
      console.log('ℹ️  rejection_by column already exists');
    }

    // Check and add foreign key for rejection_by
    try {
      await db.execute(`
        ALTER TABLE submissions
        ADD CONSTRAINT fk_rejection_by FOREIGN KEY (rejection_by) REFERENCES users(id)
      `);
      console.log('✅ Added fk_rejection_by');
    } catch (err: any) {
      if (!err.message.includes('Duplicate key') && !err.message.includes('already exists')) throw err;
      console.log('ℹ️  fk_rejection_by already exists');
    }

    // Verify
    const [columns]: any = await db.execute('DESCRIBE submissions');
    const statusCol = columns.find((c: any) => c.Field === 'status');
    const reasonCol = columns.find((c: any) => c.Field === 'rejection_reason');
    const byCol = columns.find((c: any) => c.Field === 'rejection_by');

    console.log('\n📊 Submissions table structure:');
    console.log('  status:', statusCol ? '✅' : '❌');
    console.log('  rejection_reason:', reasonCol ? '✅' : '❌');
    console.log('  rejection_by:', byCol ? '✅' : '❌');

  } catch (err: any) {
    console.error('❌ Error:', err.message);
  } finally {
    if (db) await db.end();
  }
}

updateDatabase();
