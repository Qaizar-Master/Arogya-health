/**
 * Auth controller — thin layer that validates input via Zod,
 * delegates to authService, and formats the HTTP response.
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authService } from "../services/auth.service";
import { AppError } from "../middleware/error.middleware";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  firstName: z.string().min(1, "First name required").max(100),
  lastName: z.string().min(1, "Last name required").max(100),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  conditions: z.array(z.string()).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export class AuthController {
  /**
   * POST /api/auth/register
   * Public — patient self-registration only.
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = registerSchema.parse(req.body);
      const tokens = await authService.register({ ...input, role: "PATIENT" });

      res.status(201).json({
        message: "Account created successfully",
        ...tokens,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/login
   * Returns access + refresh tokens.
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const tokens = await authService.login(email, password);

      // Set refresh token as HttpOnly cookie (supplementary to response body)
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: "/api/auth",
      });

      res.json(tokens);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/refresh
   * Accepts refresh token from body or HttpOnly cookie.
   * Returns a new access token + rotated refresh token.
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Accept token from cookie OR body (clients may use either pattern)
      const tokenFromCookie = req.cookies?.refreshToken;
      const tokenFromBody = req.body?.refreshToken;
      const refreshToken = tokenFromCookie ?? tokenFromBody;

      if (!refreshToken) {
        throw new AppError(401, "MISSING_REFRESH_TOKEN", "No refresh token provided");
      }

      const tokens = await authService.refresh(refreshToken);

      // Rotate cookie as well
      res.cookie("refreshToken", tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/api/auth",
      });

      res.json(tokens);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Revokes the refresh token. Client must discard access token.
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie("refreshToken", { path: "/api/auth" });
      res.json({ message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
