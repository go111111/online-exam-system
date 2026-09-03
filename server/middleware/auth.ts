import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  verifyAuthToken(token, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

export function requireRole(role: "student" | "admin") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ error: `${role} access required` });
    }
    next();
  };
}

export const isAdmin = requireRole("admin");
export const isStudent = requireRole("student");
