import type { ServiceError } from "../../types";
import { createUser, query } from "../db";
import { hashPassword, isBcryptHash, verifyPassword } from "../utils/password";
import { signAuthToken } from "../utils/jwt";

function serviceError(statusCode: number, message: string): ServiceError {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
}

export async function registerUser(payload: { email?: string; password?: string }) {
  const { email, password } = payload;

  if (!email || !password) {
    throw serviceError(400, "Email and password required");
  }

  const qqEmailRegex = /^[0-9]+@qq\.com$/;
  if (!qqEmailRegex.test(email.toLowerCase())) {
    throw serviceError(400, "Please use QQ email (xxx@qq.com)");
  }

  if (password.length < 6 || password.length > 20) {
    throw serviceError(400, "Password must be 6-20 characters");
  }

  try {
    await createUser(email, hashPassword(password), email.toLowerCase().split("@")[0], "student");
  } catch (e: any) {
    if (e.message?.includes("Duplicate entry") || e.code === "SQLITE_CONSTRAINT") {
      throw serviceError(400, "Email already exists");
    }
    throw e;
  }

  return { message: "User registered successfully" };
}

export async function loginUser(payload: { email?: string; password?: string }) {
  const { email, password } = payload;

  if (!email || !password) {
    throw serviceError(400, "Email and password required");
  }

  const users = await query("SELECT * FROM users WHERE email = ?", [email.toLowerCase()]);
  const user = Array.isArray(users) ? users[0] : users;

  if (!user) {
    throw serviceError(401, "Invalid email or password");
  }

  const storedPassword = user.password as string;
  const passwordValid = verifyPassword(password, storedPassword);

  if (!passwordValid) {
    throw serviceError(401, "Invalid email or password");
  }

  if (storedPassword && !isBcryptHash(storedPassword)) {
    await query("UPDATE users SET password = ? WHERE id = ?", [hashPassword(password), user.id]);
  }

  const authUser = { id: user.id, email: user.email, role: user.role };
  return {
    token: signAuthToken(authUser),
    user: authUser
  };
}
