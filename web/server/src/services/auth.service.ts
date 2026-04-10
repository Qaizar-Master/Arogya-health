/**
 * Auth service — all business logic for registration, login, token rotation.
 * Controllers stay thin; this layer owns the rules.
 */

import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  parseExpiryToDate,
} from "../lib/jwt";
import { AppError } from "../middleware/error.middleware";

const BCRYPT_ROUNDS = 12;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
  phone?: string;
  dateOfBirth?: string;
  conditions?: string[]; // ConditionType[]
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: Role;
    profileId: string | null;
    firstName: string | null;
    lastName: string | null;
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class AuthService {
  /**
   * Registers a new user and creates their profile.
   * Only PATIENT self-registration is public — DOCTOR/ADMIN roles require
   * existing ADMIN to assign.
   */
  async register(input: RegisterInput): Promise<AuthTokens> {
    const { email, password, firstName, lastName, role = Role.PATIENT, phone, dateOfBirth, conditions } = input;

    // Check uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, "CONFLICT", "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user + profile in a transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
          profile: {
            create: {
              firstName,
              lastName,
              phone,
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
              conditions:
                conditions && conditions.length > 0
                  ? {
                      createMany: {
                        data: conditions.map((c) => ({ conditionType: c as any })),
                      },
                    }
                  : undefined,
            },
          },
        },
        include: { profile: true },
      });

      return newUser;
    });

    return this._issueTokens(user.id, user.email, user.role, user.profile?.id ?? null, user.profile?.firstName ?? firstName, user.profile?.lastName ?? lastName);
  }

  /**
   * Validates credentials and issues token pair.
   */
  async login(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      // Constant-time comparison even on miss (avoid timing oracle)
      await bcrypt.compare(password, "$2b$12$invalidhashfillertomatchtime");
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    // Update lastLoginAt
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this._issueTokens(user.id, user.email, user.role, user.profile?.id ?? null, user.profile?.firstName ?? null, user.profile?.lastName ?? null);
  }

  /**
   * Validates a refresh token, rotates it (revokes old, issues new pair).
   */
  async refresh(incomingRefreshToken: string): Promise<AuthTokens> {
    let payload;
    try {
      payload = verifyRefreshToken(incomingRefreshToken);
    } catch {
      throw new AppError(401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    // Look up stored token — must be un-revoked and not expired
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: incomingRefreshToken },
      include: { user: { include: { profile: true } } },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      // Possible token reuse — revoke all tokens for this user (security measure)
      if (storedToken) {
        await prisma.refreshToken.updateMany({
          where: { userId: payload.sub },
          data: { revokedAt: new Date() },
        });
      }
      throw new AppError(401, "REFRESH_TOKEN_REUSE", "Refresh token already used or revoked");
    }

    // Revoke the current token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const { user } = storedToken;
    return this._issueTokens(user.id, user.email, user.role, user.profile?.id ?? null, user.profile?.firstName ?? null, user.profile?.lastName ?? null);
  }

  /**
   * Revokes the supplied refresh token (logout).
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  /**
   * Generates access + refresh token pair and persists the refresh token.
   */
  private async _issueTokens(
    userId: string,
    email: string,
    role: Role,
    profileId: string | null,
    firstName: string | null,
    lastName: string | null
  ): Promise<AuthTokens> {
    const jti = uuidv4();
    const refreshExpiry = process.env.JWT_REFRESH_EXPIRES_IN ?? "7d";

    const accessToken = signAccessToken({ sub: userId, email, role, profileId });
    const refreshToken = signRefreshToken({ sub: userId, jti });

    // Persist refresh token for rotation tracking
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: parseExpiryToDate(refreshExpiry),
      },
    });

    // Prune old revoked tokens for this user (keep DB clean)
    await prisma.refreshToken.deleteMany({
      where: { userId, revokedAt: { not: null }, expiresAt: { lt: new Date() } },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: userId, email, role, profileId, firstName, lastName },
    };
  }
}

export const authService = new AuthService();
