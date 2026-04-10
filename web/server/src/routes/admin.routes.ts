/**
 * Admin routes — /api/admin/*
 * All routes require ADMIN role.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { prisma } from "../lib/prisma";

const router = Router();
router.use(authenticateToken, requireRole("ADMIN"));

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

router.get(
  "/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { role, search, page = "1", limit = "20" } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where = {
        ...(role ? { role: role as any } : {}),
        ...(search
          ? {
              OR: [
                { email: { contains: search as string, mode: "insensitive" as const } },
                { profile: { firstName: { contains: search as string, mode: "insensitive" as const } } },
                { profile: { lastName: { contains: search as string, mode: "insensitive" as const } } },
              ],
            }
          : {}),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: parseInt(limit as string),
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            profile: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                speciality: true,
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        users,
        pagination: {
          total,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── PUT /api/admin/users/:id — update role or active status ─────────────────

const updateUserSchema = z.object({
  role: z.enum(["PATIENT", "DOCTOR", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
});

router.put(
  "/users/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateUserSchema.parse(req.body);
      const user = await prisma.user.update({
        where: { id: req.params.id },
        data: input,
        select: { id: true, email: true, role: true, isActive: true },
      });
      res.json({ message: "User updated", user });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/admin/stats — platform statistics ────────────────────────────────

router.get(
  "/stats",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalPatients,
        totalDoctors,
        totalAdmins,
        consultationsThisMonth,
        activeAlerts,
        alertsBySeverity,
        vitalsToday,
      ] = await Promise.all([
        prisma.user.count({ where: { role: "PATIENT", isActive: true } }),
        prisma.user.count({ where: { role: "DOCTOR", isActive: true } }),
        prisma.user.count({ where: { role: "ADMIN", isActive: true } }),
        prisma.consultation.count({
          where: { scheduledAt: { gte: thisMonthStart } },
        }),
        prisma.alert.count({ where: { isRead: false } }),
        prisma.alert.groupBy({
          by: ["severity"],
          where: { isRead: false },
          _count: { severity: true },
        }),
        prisma.vitalLog.count({
          where: { recordedAt: { gte: new Date(now.setHours(0, 0, 0, 0)) } },
        }),
      ]);

      res.json({
        users: { patients: totalPatients, doctors: totalDoctors, admins: totalAdmins },
        consultationsThisMonth,
        activeAlerts,
        alertsBySeverity: Object.fromEntries(
          alertsBySeverity.map((a) => [a.severity, a._count.severity])
        ),
        vitalsLoggedToday: vitalsToday,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/admin/users/:id/link-doctor — link patient to doctor ───────────

const linkDoctorSchema = z.object({
  doctorProfileId: z.string().uuid(),
  patientProfileId: z.string().uuid(),
});

router.post(
  "/link-doctor-patient",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { doctorProfileId, patientProfileId } = linkDoctorSchema.parse(req.body);
      const link = await prisma.doctorPatient.upsert({
        where: { doctorId_patientId: { doctorId: doctorProfileId, patientId: patientProfileId } },
        create: { doctorId: doctorProfileId, patientId: patientProfileId },
        update: {},
      });
      res.status(201).json({ message: "Doctor-patient link created", link });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
