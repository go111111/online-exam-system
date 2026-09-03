import { Router } from "express";
import { loginUser, registerUser } from "../services/auth.service";

const router = Router();

  router.post("/api/register", async (req, res) => {
    try {
      res.json(await registerUser(req.body));
    } catch (e: any) {
      if (!e.statusCode) console.error('Registration error:', e);
      res.status(e.statusCode || 400).json({ error: e.message || "Registration failed" });
    }
  });

  // Login

  router.post("/api/login", async (req, res) => {
    try {
      res.json(await loginUser(req.body));
    } catch (e: any) {
      res.status(e.statusCode || 500).json({ error: e.statusCode ? e.message : "Login failed" });
    }
  });
export default router;
