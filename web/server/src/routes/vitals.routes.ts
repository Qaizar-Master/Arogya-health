/**
 * Vitals routes — /api/vitals/*
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { vitalsService } from "../services/vitals.service";
import { AppError } from "../middleware/error.middleware";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(authenticateToken);

// ─── Validation ────────────────────────────────────────────────────────────────

const vitalInputSchema = z.object({
  recordedAt: z.string().optional(),
  bloodGlucose: z.number().positive().optional(),
  systolicBP: z.number().int().positive().optional(),
  diastolicBP: z.number().int().positive().optional(),
  heartRate: z.number().int().positive().optional(),
  weight: z.number().positive().optional(),
  spo2: z.number().int().min(0).max(100).optional(),
  temperature: z.number().optional(),
  hba1c: z.number().min(0).max(20).optional(),
  creatinine: z.number().positive().optional(),
  egfr: z.number().positive().optional(),
  cholesterol: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
  source: z.enum(["MANUAL", "DEVICE", "IMPORTED"]).optional(),
  localId: z.string().optional(),
});

const vitalsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

// ─── POST /api/vitals — log single reading (patient) ─────────────────────────

router.post(
  "/",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Patient profile not found");

      const input = vitalInputSchema.parse(req.body);
      const vital = await vitalsService.logVital(profileId, input);
      res.status(201).json({ message: "Vital logged", vital });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/vitals/batch — offline queue sync (patient) ───────────────────

router.post(
  "/batch",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Patient profile not found");

      const batchSchema = z.object({ vitals: z.array(vitalInputSchema).max(500) });
      const { vitals } = batchSchema.parse(req.body);

      const results = await vitalsService.batchSync(profileId, vitals);
      res.json({ message: "Batch sync complete", ...results });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/vitals/me — own vitals (patient) ────────────────────────────────

router.get(
  "/me",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Patient profile not found");

      const query = vitalsQuerySchema.parse(req.query);
      const result = await vitalsService.getVitals({ profileId, ...query });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/vitals/:patientId — doctor reading patient vitals ───────────────

router.get(
  "/:patientId",
  requireRole("DOCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = vitalsQuerySchema.parse(req.query);
      const result = await vitalsService.getVitals({
        profileId: req.params.patientId,
        ...query,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/vitals/:id — patient deletes own reading ─────────────────────

router.delete(
  "/:id",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Patient profile not found");

      await vitalsService.deleteVital(req.params.id, profileId);
      res.json({ message: "Vital record deleted" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/vitals/patient/:patientId — doctor logs vitals for a patient ───

router.post(
  "/patient/:patientId",
  requireRole("DOCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { patientId } = req.params;

      const profile = await prisma.profile.findUnique({ where: { id: patientId } });
      if (!profile) throw new AppError(404, "NOT_FOUND", "Patient profile not found");

      const input = vitalInputSchema.parse(req.body);
      const vital = await vitalsService.logVital(patientId, input);
      res.status(201).json({ message: "Vitals logged for patient", vital });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
