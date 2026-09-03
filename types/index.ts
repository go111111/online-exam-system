export type UserRole = "student" | "admin" | string;

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
}

export interface ServiceError extends Error {
  statusCode?: number;
}
