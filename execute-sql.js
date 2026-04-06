import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

async function executeSql() {
    let connection;
    try {
        console.log('🔄 Connecting to Aiven MySQL...');
        connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST,
            port: parseInt(process.env.MYSQL_PORT || '3306'),
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASSWORD,
            database: process.env.MYSQL_DATABASE,
            multipleStatements: true,
        });

        console.log('✅ Connected to MySQL');

        const sql = fs.readFileSync('database.sql', 'utf-8');

        console.log('🔄 Executing database.sql...');
        await connection.query(sql);

        console.log('✅ Database schema created successfully!');

        // 验证表
        const [tables] = await connection.query("SHOW TABLES");
        console.log('\n📊 Tables created:');
        tables.forEach((table) => {
            console.log(`  ✓ ${Object.values(table)[0]}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

executeSql();
