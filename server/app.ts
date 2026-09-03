import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { env } from "./config/env";
import { getDatabase, isUsingMySQL } from "./db";
import adminRoutes from "./routes/admin.routes";
import authRoutes from "./routes/auth.routes";
import examRoutes from "./routes/exam.routes";
import notificationRoutes from "./routes/notification.routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

export async function createApp() {
  const app = express();

  app.use(cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
    maxAge: 86400,
  }));

  app.options("*", cors({
    origin: env.corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(authRoutes);
  app.use(examRoutes);
  app.use(adminRoutes);
  app.use(notificationRoutes);

  app.get("/api/health", async (_req, res) => {
    try {
      if (isUsingMySQL()) {
        await getDatabase().execute("SELECT 1");
      } else {
        getDatabase().prepare("SELECT 1").get();
      }
      res.json({ status: "ok", database: isUsingMySQL() ? "MySQL" : "SQLite" });
    } catch {
      res.status(500).json({ status: "error", database: "disconnected" });
    }
  });

  if (env.nodeEnv !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
    });
    app.use(vite.middlewares);
  }

  app.get("/", (_req, res) => {
    res.sendFile(path.join(rootDir, "index.html"));
  });

  return app;
}
