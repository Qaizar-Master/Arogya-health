/**
 * Consultations routes — /api/consultations/*
 * Covers scheduling, SOAP notes, and prescriptions.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { sendMail } from "../lib/mailer";
import { ConsultStatus } from "@prisma/client";

const router = Router();
router.use(authenticateToken);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createConsultSchema = z.object({
  patientId: z.string().uuid("Valid patient profile ID required"),
  scheduledAt: z.string(),
  chiefComplaint: z.string().optional(),
  visitType: z.enum(["in-person", "telemedicine"]).default("in-person"),
  duration: z.number().int().positive().optional(),
});

const updateConsultSchema = z.object({
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  completedAt: z.string().optional(),
  chiefComplaint: z.string().optional(),
  duration: z.number().int().positive().optional(),
});

const soapNoteSchema = z.object({
  subjective: z.string().optional(),
  objective: z.string().optional(),
  assessment: z.string().optional(),
  plan: z.string().optional(),
  aiDraft: z.string().optional(),
  isDoctorEdited: z.boolean().optional(),
});

const prescriptionSchema = z.object({
  items: z.array(
    z.object({
      drugName: z.string().min(1),
      genericName: z.string().optional(),
      dosage: z.string().min(1),
      frequency: z.string().min(1),
      duration: z.string().min(1),
      quantity: z.string().optional(),
      route: z.string().default("oral"),
      specialInstr: z.string().optional(),
      interactionFlag: z.boolean().default(false),
      interactionNote: z.string().optional(),
      interactionSeverity: z.string().optional(),
    })
  ).min(1),
  instructions: z.string().optional(),
  followUpDate: z.string().optional(),
});

// ─── GET /api/consultations/me — patient's own consultations ─────────────────

router.get(
  "/me",
  requireRole("PATIENT"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Profile not found");

      const consultations = await prisma.consultation.findMany({
        where: { patientId: profileId },
        orderBy: { scheduledAt: "desc" },
        include: {
          doctor: { select: { firstName: true, lastName: true, speciality: true } },
          soapNote: true,
          prescription: { include: { items: true } },
        },
      });

      res.json(consultations);
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/consultations/doctor — doctor's schedule ───────────────────────

router.get(
  "/doctor",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profileId = req.user!.profileId;
      if (!profileId) throw new AppError(400, "NO_PROFILE", "Profile not found");

      const { status, date, patientId, upcoming } = req.query;

      // Default to today's consultations if date not specified
      const targetDate = date ? new Date(date as string) : new Date();
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Build date filter:
      // - upcoming=true  → all future consultations (no upper bound)
      // - patientId set  → no date filter (return all for that patient)
      // - status set     → no date filter (original behaviour)
      // - default        → today only
      let scheduledAtFilter: object | undefined;
      if (upcoming === "true") {
        scheduledAtFilter = { scheduledAt: { gte: new Date() } };
      } else if (!status && !patientId) {
        scheduledAtFilter = { scheduledAt: { gte: dayStart, lte: dayEnd } };
      }

      const consultations = await prisma.consultation.findMany({
        where: {
          doctorId: profileId,
          ...(patientId ? { patientId: patientId as string } : {}),
          ...(status ? { status: status as ConsultStatus } : {}),
          ...scheduledAtFilter,
        },
        orderBy: { scheduledAt: "asc" },
        include: {
          patient: {
            include: {
              conditions: { where: { isActive: true } },
              alerts: { where: { isRead: false, severity: { in: ["HIGH", "CRITICAL"] } } },
            },
          },
          soapNote: true,
          prescription: { include: { items: true } },
        },
      });

      res.json(consultations);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/consultations — doctor creates a consultation ──────────────────

router.post(
  "/",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doctorId = req.user!.profileId;
      if (!doctorId) throw new AppError(400, "NO_PROFILE", "Doctor profile not found");

      const input = createConsultSchema.parse(req.body);

      // Verify patient exists
      const patient = await prisma.profile.findUnique({ where: { id: input.patientId } });
      if (!patient) throw new AppError(404, "NOT_FOUND", "Patient profile not found");

      const consultation = await prisma.consultation.create({
        data: {
          doctorId,
          patientId: input.patientId,
          scheduledAt: new Date(input.scheduledAt),
          chiefComplaint: input.chiefComplaint,
          visitType: input.visitType,
          duration: input.duration,
        },
        include: {
          patient: { select: { firstName: true, lastName: true } },
          doctor: { select: { firstName: true, lastName: true } },
        },
      });

      // Fire-and-forget confirmation email to the doctor
      const scheduledStr = new Date(input.scheduledAt).toLocaleString("en-IN", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      });

      sendMail({
        to: req.user!.email,
        subject: `Consultation Scheduled — ${consultation.patient.firstName} ${consultation.patient.lastName}`,
        html: `
          <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:#0F6E56;padding:20px;border-radius:8px 8px 0 0;">
              <h2 style="color:white;margin:0;">Arogya — Consultation Scheduled</h2>
            </div>
            <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
              <p style="margin:0 0 8px;">A new consultation has been scheduled.</p>
              <table style="font-size:14px;border-collapse:collapse;width:100%;">
                <tr><td style="padding:6px 0;color:#64748b;width:140px;">Patient</td><td style="padding:6px 0;font-weight:600;">${consultation.patient.firstName} ${consultation.patient.lastName}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Date &amp; Time</td><td style="padding:6px 0;">${scheduledStr}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b;">Visit Type</td><td style="padding:6px 0;">${input.visitType}</td></tr>
                ${input.chiefComplaint ? `<tr><td style="padding:6px 0;color:#64748b;">Chief Complaint</td><td style="padding:6px 0;">${input.chiefComplaint}</td></tr>` : ""}
              </table>
              <p style="color:#64748b;font-size:13px;margin-top:20px;">
                Log in to the Arogya portal to manage this consultation.
              </p>
            </div>
          </div>`,
      }).catch((err) => console.error("[mailer] Consultation email failed:", err));

      res.status(201).json({ message: "Consultation scheduled", consultation });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/consultations/:id ───────────────────────────────────────────────

router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const consultation = await prisma.consultation.findUnique({
        where: { id: req.params.id },
        include: {
          patient: {
            include: {
              conditions: { where: { isActive: true } },
              medications: { where: { active: true } },
            },
          },
          doctor: { select: { firstName: true, lastName: true, speciality: true } },
          soapNote: true,
          prescription: { include: { items: true } },
        },
      });

      if (!consultation) throw new AppError(404, "NOT_FOUND", "Consultation not found");

      // Patients can only see their own; doctors can see their own
      const profileId = req.user!.profileId;
      const role = req.user!.role;
      if (
        role !== "ADMIN" &&
        consultation.patientId !== profileId &&
        consultation.doctorId !== profileId
      ) {
        throw new AppError(403, "FORBIDDEN", "Access denied to this consultation");
      }

      res.json(consultation);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /api/consultations/:id ───────────────────────────────────────────────

router.put(
  "/:id",
  requireRole("DOCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateConsultSchema.parse(req.body);
      const consultation = await prisma.consultation.update({
        where: { id: req.params.id },
        data: {
          ...input,
          status: input.status as ConsultStatus | undefined,
          completedAt: input.completedAt ? new Date(input.completedAt) : undefined,
        },
      });
      res.json({ message: "Consultation updated", consultation });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/consultations/:id/soap — save SOAP note ────────────────────────

router.post(
  "/:id/soap",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = soapNoteSchema.parse(req.body);

      // Upsert: create or update SOAP note for this consultation
      const soapNote = await prisma.sOAPNote.upsert({
        where: { consultationId: req.params.id },
        create: { consultationId: req.params.id, ...input },
        update: {
          ...input,
          aiGeneratedAt: input.aiDraft ? new Date() : undefined,
        },
      });

      res.json({ message: "SOAP note saved", soapNote });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/consultations/:id/prescription ─────────────────────────────────

router.post(
  "/:id/prescription",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = prescriptionSchema.parse(req.body);

      // Upsert prescription
      const existing = await prisma.prescription.findUnique({
        where: { consultationId: req.params.id },
      });

      let prescription;
      if (existing) {
        // Delete old items and recreate
        await prisma.prescriptionItem.deleteMany({
          where: { prescriptionId: existing.id },
        });
        prescription = await prisma.prescription.update({
          where: { id: existing.id },
          data: {
            instructions: input.instructions,
            followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
            items: { createMany: { data: input.items } },
          },
          include: { items: true },
        });
      } else {
        prescription = await prisma.prescription.create({
          data: {
            consultationId: req.params.id,
            instructions: input.instructions,
            followUpDate: input.followUpDate ? new Date(input.followUpDate) : undefined,
            items: { createMany: { data: input.items } },
          },
          include: { items: true },
        });
      }

      res.status(201).json({ message: "Prescription saved", prescription });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
