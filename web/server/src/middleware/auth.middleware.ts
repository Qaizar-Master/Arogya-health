/**
 * Authentication & authorisation middleware.
 *
 * authenticateToken — verifies Bearer JWT, attaches decoded payload to req.user
 * requireRole       — RBAC guard; use after authenticateToken
 * optionalAuth      — attaches user if token present but doesn't block if missing
 */

import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken, AccessTokenPayload } from "../lib/jwt";

// ─── Extend Express Request ───────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Verifies the Authorization: Bearer <token> header.
 * Attaches decoded payload to req.user on success.
 * Returns 401 if token is missing or invalid.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ error: "UNAUTHORIZED", message: "No token provided" });
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err: unknown) {
    const isExpired = (err as { name?: string }).name === "TokenExpiredError";
    res.status(401).json({
      error: isExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
      message: isExpired
        ? "Access token has expired — refresh required"
        : "Invalid token",
    });
  }
}

/**
 * Role-based access control guard. Must be used after authenticateToken.
 *
 * @example router.get('/admin/users', authenticateToken, requireRole('ADMIN'), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Not authenticated" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: `This action requires one of: ${roles.join(", ")}`,
      });
      return;
    }

    next();
  };
}

/**
 * Attaches user from token if present, but does not block unauthenticated
 * requests. Useful for routes that behave differently when logged in.
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (token) {
    try {
      req.user = verifyAccessToken(token);
    } catch {
      // Ignore invalid tokens in optional auth
    }
  }

  next();
}
