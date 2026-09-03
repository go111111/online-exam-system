import { createApp } from "./app";
import { env } from "./config/env";
import { initDB } from "./db";

async function startServer() {
  await initDB();
  const app = await createApp();

  app.listen(env.port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${env.port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
