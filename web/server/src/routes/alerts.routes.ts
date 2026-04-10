/**
 * Alerts routes — /api/alerts/*
 */

import { Router, Request, Response, NextFunction } from "express";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";

const router = Router();
router.use(authenticateToken);

// ─── GET /api/alerts/me — own alerts (patient) ────────────────────────────────

router.get(
  "/me",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Profile not found");

      const { unread, severity, limit = "50" } = req.query;

      const alerts = await prisma.alert.findMany({
        where: {
          profileId,
          ...(unread === "true" ? { isRead: false } : {}),
          ...(severity ? { severity: severity as any } : {}),
        },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: parseInt(limit as string),
      });

      const unreadCount = await prisma.alert.count({
        where: { profileId, isRead: false },
      });

      res.json({ alerts, unreadCount });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/alerts/panel — all patient alerts (doctor) ─────────────────────

router.get(
  "/panel",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorProfileId = req.user!.profileId;
      if (!doctorProfileId) throw new AppError(400, "NO_PROFILE", "Profile not found");

      // Get all patients assigned to this doctor
      const assignments = await prisma.doctorPatient.findMany({
        where: { doctorId: doctorProfileId },
        select: { patientId: true },
      });
      const patientIds = assignments.map((a) => a.patientId);

      const alerts = await prisma.alert.findMany({
        where: {
          profileId: { in: patientIds },
          isRead: false,
        },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        include: {
          profile: { select: { firstName: true, lastName: true } },
        },
        take: 100,
      });

      res.json(alerts);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /api/alerts/:id/read — mark alert read ───────────────────────────────

router.put(
  "/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      const alert = await prisma.alert.findFirst({
        where: { id: req.params.id, profileId: profileId! },
      });

      if (!alert) throw new AppError(404, "NOT_FOUND", "Alert not found");

      const updated = await prisma.alert.update({
        where: { id: req.params.id },
        data: { isRead: true, readAt: new Date() },
      });

      res.json({ message: "Alert marked as read", alert: updated });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
