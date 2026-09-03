import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT || 3000);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number.isFinite(port) ? port : 3000,
  jwtSecret: process.env.JWT_SECRET || "default_secret_key_12345",
  mysql: {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT || "3306"),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  },
  corsOrigins: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
  ],
};
