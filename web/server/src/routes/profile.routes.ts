/**
 * Profile routes — /api/profile/*
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { profileService } from "../services/profile.service";
import { AppError } from "../middleware/error.middleware";
import { prisma } from "../lib/prisma";

const router = Router();

// All profile routes require authentication
router.use(authenticateToken);

// ─── GET /api/profile/me ──────────────────────────────────────────────────────

router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await profileService.getMyProfile(req.user!.sub);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /api/profile/me ──────────────────────────────────────────────────────

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
  abhaId: z.string().optional(),
  // Doctor fields
  licenseNo: z.string().optional(),
  speciality: z.string().optional(),
  clinicName: z.string().optional(),
  consultFee: z.number().positive().optional(),
});

router.put("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = updateProfileSchema.parse(req.body);
    const updated = await profileService.updateMyProfile(req.user!.sub, input);
    res.json({ message: "Profile updated", profile: updated });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/profile/doctor/patients — all patients assigned to this doctor ──

router.get(
  "/doctor/patients",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorProfileId = req.user!.profileId;
      if (!doctorProfileId) throw new AppError(400, "NO_PROFILE", "Doctor profile not found");

      const assignments = await prisma.doctorPatient.findMany({
        where: { doctorId: doctorProfileId },
        include: {
          patient: {
            include: {
              conditions: { where: { isActive: true } },
              alerts: {
                where: { isRead: false },
                orderBy: { severity: "asc" },
                take: 10,
              },
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      });

      res.json(assignments.map((a) => a.patient));
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/profile/:id — doctor or admin only ──────────────────────────────

router.get(
  "/:id",
  requireRole("DOCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await profileService.getProfileById(req.params.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/profile/me/conditions ─────────────────────────────────────────

const addConditionSchema = z.object({
  conditionType: z.enum([
    "DIABETES_T1", "DIABETES_T2", "HYPERTENSION", "CKD",
    "HEART_DISEASE", "COPD", "ASTHMA", "OTHER",
  ]),
  diagnosedAt: z.string().optional(),
  severity: z.string().optional(),
  notes: z.string().optional(),
  icdCode: z.string().optional(),
  snomedCode: z.string().optional(),
});

router.post(
  "/me/conditions",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Profile not found for user");

      const input = addConditionSchema.parse(req.body);
      const condition = await profileService.addCondition(profileId, input as any);
      res.status(201).json({ message: "Condition added", condition });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/profile/me/conditions/:conditionId ──────────────────────────

router.delete(
  "/me/conditions/:conditionId",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Profile not found for user");

      await profileService.removeCondition(profileId, req.params.conditionId);
      res.json({ message: "Condition removed" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
