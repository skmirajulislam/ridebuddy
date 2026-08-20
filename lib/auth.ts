import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

const SECRET = process.env.JWT_SECRET || "ride-buddy-dev-secret-change-in-prod";
const BCRYPT_ROUNDS = 12;

export interface TokenPayload {
  userId: number;
  name: string;
  email: string | null;
  role: "user" | "official" | string;
}

export interface AuthenticatedUser extends TokenPayload {
  uid: string;
}

/**
 * Hash password with bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare plain password against bcrypt hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate 7-day signed JWT
 */
export function generateToken(user: { id: number; name: string; email: string; role?: string }): string {
  const payload: TokenPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
  };
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

/**
 * Verify JWT token string
 */
export function verifyJwtToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as TokenPayload;
    return decoded;
  } catch (err) {
    console.warn("[Auth] Token verification failed:", (err as Error).message);
    return null;
  }
}

/**
 * Extract and verify authentication from NextRequest
 * Returns AuthenticatedUser or null
 */
export function getAuthUser(req: NextRequest): AuthenticatedUser | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) return null;

  const decoded = verifyJwtToken(token);
  if (!decoded) return null;

  return {
    ...decoded,
    uid: String(decoded.userId),
  };
}

/**
 * Strict authentication guard for route handlers. Throws or returns user.
 */
export function requireAuth(req: NextRequest): AuthenticatedUser {
  const user = getAuthUser(req);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

/**
 * Strict role guard for route handlers (e.g. "official")
 */
export function requireRole(req: NextRequest, requiredRole: string): AuthenticatedUser {
  const user = requireAuth(req);
  if (user.role !== requiredRole) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
