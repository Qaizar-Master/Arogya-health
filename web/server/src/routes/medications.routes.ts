/**
 * Medication routes — /api/medications/*
 * Handles medication CRUD + adherence logging.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { AdherenceStatus } from "@prisma/client";

const router = Router();
router.use(authenticateToken);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createMedSchema = z.object({
  name: z.string().min(1).max(200),
  genericName: z.string().optional(),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  route: z.string().default("oral"),
  startDate: z.string(),
  endDate: z.string().optional(),
  prescribedBy: z.string().optional(),
  rxNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateMedSchema = createMedSchema.partial().extend({
  active: z.boolean().optional(),
});

const adherenceLogSchema = z.object({
  scheduledAt: z.string(),
  takenAt: z.string().optional(),
  status: z.enum(["TAKEN", "MISSED", "SKIPPED", "PENDING"]),
  notes: z.string().optional(),
});

// ─── GET /api/medications/me ──────────────────────────────────────────────────

router.get(
  "/me",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Patient profile not found");

      const { active } = req.query;
      const medications = await prisma.medication.findMany({
        where: {
          profileId,
          ...(active !== undefined ? { active: active === "true" } : {}),
        },
        orderBy: { startDate: "desc" },
        include: {
          adherenceLogs: {
            orderBy: { scheduledAt: "desc" },
            take: 30, // last 30 adherence logs per medication
          },
        },
      });

      res.json(medications);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/medications ────────────────────────────────────────────────────

router.post(
  "/",
  requireRole("PATIENT", "DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Profile not found");

      const input = createMedSchema.parse(req.body);

      const medication = await prisma.medication.create({
        data: {
          profileId,
          ...input,
          startDate: new Date(input.startDate),
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        },
      });

      res.status(201).json({ message: "Medication added", medication });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /api/medications/:id ─────────────────────────────────────────────────

router.put(
  "/:id",
  requireRole("PATIENT", "DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      const existing = await prisma.medication.findFirst({
        where: { id: req.params.id, profileId: profileId! },
      });
      if (!existing) throw new AppError(404, "NOT_FOUND", "Medication not found");

      const input = updateMedSchema.parse(req.body);
      const updated = await prisma.medication.update({
        where: { id: req.params.id },
        data: {
          ...input,
          startDate: input.startDate ? new Date(input.startDate) : undefined,
          endDate: input.endDate ? new Date(input.endDate) : undefined,
        },
      });

      res.json({ message: "Medication updated", medication: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /api/medications/:id (soft delete) ────────────────────────────────

router.delete(
  "/:id",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      const existing = await prisma.medication.findFirst({
        where: { id: req.params.id, profileId: profileId! },
      });
      if (!existing) throw new AppError(404, "NOT_FOUND", "Medication not found");

      await prisma.medication.update({
        where: { id: req.params.id },
        data: { active: false },
      });

      res.json({ message: "Medication deactivated" });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/medications/:id/adherence — log a dose taken/missed ────────────

router.post(
  "/:id/adherence",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      const medication = await prisma.medication.findFirst({
        where: { id: req.params.id, profileId: profileId! },
      });
      if (!medication) throw new AppError(404, "NOT_FOUND", "Medication not found");

      const input = adherenceLogSchema.parse(req.body);
      const log = await prisma.medAdherenceLog.create({
        data: {
          medicationId: req.params.id,
          scheduledAt: new Date(input.scheduledAt),
          takenAt: input.takenAt ? new Date(input.takenAt) : undefined,
          status: input.status as AdherenceStatus,
          notes: input.notes,
        },
      });

      // If MISSED, create an alert
      if (input.status === "MISSED") {
        await prisma.alert.create({
          data: {
            profileId: profileId!,
            type: "MED_MISSED",
            severity: "LOW",
            message: `Missed dose of ${medication.name} (${medication.dosage}) scheduled at ${new Date(input.scheduledAt).toLocaleString()}`,
            sourceType: "Medication",
            sourceId: medication.id,
            metadata: { medicationId: medication.id, logId: log.id },
          },
        });
      }

      res.status(201).json({ message: "Adherence logged", log });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/medications/:id/adherence — adherence history ──────────────────

router.get(
  "/:id/adherence",
  requireRole("PATIENT", "DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days = "30" } = req.query;
      const since = new Date();
      since.setDate(since.getDate() - parseInt(days as string));

      const logs = await prisma.medAdherenceLog.findMany({
        where: {
          medicationId: req.params.id,
          scheduledAt: { gte: since },
        },
        orderBy: { scheduledAt: "desc" },
      });

      // Calculate adherence %
      const taken = logs.filter((l) => l.status === "TAKEN").length;
      const total = logs.filter((l) => l.status !== "PENDING").length;
      const adherencePct = total > 0 ? Math.round((taken / total) * 100) : null;

      res.json({ logs, adherencePct, totalLogged: total, takenCount: taken });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
