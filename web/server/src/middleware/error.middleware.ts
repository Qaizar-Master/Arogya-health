/**
 * Global error handler — catches anything that reaches Express's error pipeline.
 * All errors are normalised to { error, message, ...(details in dev) } JSON.
 */

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";

// ─── Custom Error Class ────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly error: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

// ─── Error Handler ────────────────────────────────────────────────────────────

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV === "development";

  // AppError — intentional, already has HTTP status
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.error,
      message: err.message,
      ...(isDev && err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Zod validation error — 422 Unprocessable Entity
  if (err instanceof ZodError) {
    res.status(422).json({
      error: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Unique constraint violation
      const target = (err.meta?.target as string[])?.join(", ") ?? "field";
      res.status(409).json({
        error: "CONFLICT",
        message: `A record with this ${target} already exists`,
      });
      return;
    }

    if (err.code === "P2025") {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Record not found",
      });
      return;
    }
  }

  // JWT errors (caught upstream in middleware, but just in case)
  if ((err as { name?: string }).name === "JsonWebTokenError") {
    res.status(401).json({ error: "INVALID_TOKEN", message: "Invalid token" });
    return;
  }

  // Unknown / unexpected error — 500
  console.error("[errorHandler] Unhandled error:", err);

  res.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    ...(isDev ? { stack: (err as Error).stack } : {}),
  });
}
