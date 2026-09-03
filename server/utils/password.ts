import bcrypt from "bcryptjs";

export const isBcryptHash = (value: string) => /^\$2[aby]\$\d{2}\$/.test(value);

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, storedPassword: string) {
  if (storedPassword && isBcryptHash(storedPassword)) {
    return bcrypt.compareSync(password, storedPassword);
  }

  return password === storedPassword;
}
