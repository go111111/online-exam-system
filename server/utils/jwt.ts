import jwt from "jsonwebtoken";
import type { AuthUser } from "../../types";
import { env } from "../config/env";

export const JWT_SECRET = env.jwtSecret;

export function signAuthToken(user: AuthUser) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET
  );
}

export function verifyAuthToken(token: string, callback: jwt.VerifyCallback) {
  return jwt.verify(token, JWT_SECRET, callback);
}
