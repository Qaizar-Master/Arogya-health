/**
 * JWT utility — access + refresh token generation and verification.
 * Access tokens are short-lived (15m), refresh tokens rotate on each use (7d).
 */

import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;   // user ID
  email: string;
  role: Role;
  profileId: string | null;
}

export interface RefreshTokenPayload {
  sub: string;   // user ID
  jti: string;   // unique token ID (stored in DB for rotation/revocation)
}

// ─── Config ───────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN ?? "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set in environment");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Signs a short-lived access token containing the user's identity and role.
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
    issuer: "arogya",
    audience: "arogya-client",
  });
}

/**
 * Signs a long-lived refresh token. The jti is stored in the DB so it
 * can be revoked on logout or rotation.
 */
export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES as jwt.SignOptions["expiresIn"],
    issuer: "arogya",
    audience: "arogya-client",
  });
}

/**
 * Verifies an access token. Throws jwt.JsonWebTokenError on failure.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    issuer: "arogya",
    audience: "arogya-client",
  }) as AccessTokenPayload;
}

/**
 * Verifies a refresh token. Throws jwt.JsonWebTokenError on failure.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer: "arogya",
    audience: "arogya-client",
  }) as RefreshTokenPayload;
}

/**
 * Parses token expiry string (e.g. "7d") to a future Date — used for DB storage.
 */
export function parseExpiryToDate(expiry: string): Date {
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const [, amount, unit] = match;
  return new Date(Date.now() + parseInt(amount) * units[unit]);
}
