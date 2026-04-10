/**
 * Rate limiting middleware using express-rate-limit.
 * AI endpoints get a stricter limit to control API costs.
 */

import rateLimit from "express-rate-limit";

/** General API rate limit — 300 requests per 5 minutes per IP */
export const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "RATE_LIMITED",
    message: "Too many requests, please try again later",
  },
});

/** AI endpoint rate limit — configurable via env, defaults to 20/min per IP */
export const aiLimiter = rateLimit({
  windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS ?? "60000"),
  max: parseInt(process.env.AI_RATE_LIMIT_MAX ?? "20"),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? "unknown",
  message: {
    error: "AI_RATE_LIMITED",
    message: "AI request limit reached. Please wait before retrying.",
  },
});

/** Auth endpoint rate limit — 20 attempts per 15 minutes per IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "AUTH_RATE_LIMITED",
    message: "Too many auth attempts, please try again in 15 minutes",
  },
});
