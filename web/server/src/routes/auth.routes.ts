/**
 * Auth routes — /api/auth/*
 * All routes apply authLimiter to protect against brute-force.
 */

import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/rateLimit.middleware";

const router = Router();

// Apply rate limiting to all auth endpoints
router.use(authLimiter);

router.post("/register", authController.register.bind(authController));
router.post("/login", authController.login.bind(authController));
router.post("/refresh", authController.refresh.bind(authController));
router.post("/logout", authController.logout.bind(authController));

export default router;
