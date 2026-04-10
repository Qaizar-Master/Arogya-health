/**
 * Arogya — Express server entry point
 * Starts the API server; all routing flows through /api/*
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import vitalsRoutes from "./routes/vitals.routes";
import medicationsRoutes from "./routes/medications.routes";
import consultationsRoutes from "./routes/consultations.routes";
import alertsRoutes from "./routes/alerts.routes";
import aiRoutes from "./routes/ai.routes";
import adminRoutes from "./routes/admin.routes";

import { generalLimiter } from "./middleware/rateLimit.middleware";
import { errorHandler } from "./middleware/error.middleware";

const app = express();
const PORT = parseInt(process.env.PORT ?? "3001");

// ─── Security & Parsing ───────────────────────────────────────────────────────

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // allow avatar/upload access
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:5173",
    credentials: true, // allow cookies (refresh token)
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Static uploads ───────────────────────────────────────────────────────────

const uploadDir = process.env.UPLOAD_DIR ?? "./uploads";
app.use("/uploads", express.static(path.resolve(uploadDir)));

// ─── Rate limiting ────────────────────────────────────────────────────────────

app.use("/api", generalLimiter);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "arogya-api", ts: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/vitals", vitalsRoutes);
app.use("/api/medications", medicationsRoutes);
app.use("/api/consultations", consultationsRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/admin", adminRoutes);

// ─── 404 fallback ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Endpoint not found" });
});

// ─── Global error handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🩺 Arogya API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`   Client URL:  ${process.env.CLIENT_URL ?? "http://localhost:5173"}\n`);
});

export default app;
