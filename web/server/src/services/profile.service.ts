/**
 * Profile service — user profile CRUD.
 * Handles personal info updates, condition management, and ABHA ID.
 */

import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { ConditionType } from "@prisma/client";

export interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  abhaId?: string;
  avatarUrl?: string;
  // Doctor fields
  licenseNo?: string;
  speciality?: string;
  clinicName?: string;
  consultFee?: number;
}

export interface AddConditionInput {
  conditionType: ConditionType;
  diagnosedAt?: string;
  severity?: string;
  notes?: string;
  icdCode?: string;
  snomedCode?: string;
}

export class ProfileService {
  /**
   * Returns the current user's full profile including conditions, active
   * medications, recent vitals, and alert counts.
   */
  async getMyProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        lastLoginAt: true,
        createdAt: true,
        profile: {
          include: {
            conditions: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
            medications: {
              where: { active: true },
              orderBy: { startDate: "desc" },
              take: 10,
            },
            alerts: {
              where: { isRead: false },
              orderBy: { createdAt: "desc" },
              take: 5,
            },
            _count: {
              select: { alerts: { where: { isRead: false } } },
            },
          },
        },
      },
    });

    if (!user) throw new AppError(404, "NOT_FOUND", "User not found");
    return user;
  }

  /**
   * Returns a patient/doctor profile by profileId — accessible to doctors and admins.
   */
  async getProfileById(profileId: string) {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        user: { select: { id: true, email: true, role: true, isActive: true, createdAt: true } },
        conditions: { where: { isActive: true } },
        medications: { where: { active: true } },
        alerts: {
          where: { isRead: false },
          orderBy: { severity: "asc" },
          take: 10,
        },
      },
    });

    if (!profile) throw new AppError(404, "NOT_FOUND", "Profile not found");
    return profile;
  }

  /**
   * Updates the current user's profile. Only user-owned fields; conditions
   * are managed separately.
   */
  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user?.profile) throw new AppError(404, "NOT_FOUND", "Profile not found");

    // Check ABHA ID uniqueness if provided
    if (input.abhaId && input.abhaId !== user.profile.abhaId) {
      const existing = await prisma.profile.findUnique({ where: { abhaId: input.abhaId } });
      if (existing) {
        throw new AppError(409, "CONFLICT", "This ABHA ID is already linked to another account");
      }
    }

    const updated = await prisma.profile.update({
      where: { id: user.profile.id },
      data: {
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
      include: {
        conditions: { where: { isActive: true } },
      },
    });

    return updated;
  }

  /**
   * Adds a chronic condition to the patient's profile.
   */
  async addCondition(profileId: string, input: AddConditionInput) {
    // Prevent duplicate active conditions of the same type
    const existing = await prisma.patientCondition.findFirst({
      where: { profileId, conditionType: input.conditionType, isActive: true },
    });

    if (existing) {
      throw new AppError(409, "CONFLICT", `Condition ${input.conditionType} is already active`);
    }

    return prisma.patientCondition.create({
      data: {
        profileId,
        conditionType: input.conditionType,
        diagnosedAt: input.diagnosedAt ? new Date(input.diagnosedAt) : undefined,
        severity: input.severity,
        notes: input.notes,
        icdCode: input.icdCode,
        snomedCode: input.snomedCode,
      },
    });
  }

  /**
   * Deactivates (soft-deletes) a condition.
   */
  async removeCondition(profileId: string, conditionId: string) {
    const condition = await prisma.patientCondition.findFirst({
      where: { id: conditionId, profileId },
    });

    if (!condition) throw new AppError(404, "NOT_FOUND", "Condition not found");

    return prisma.patientCondition.update({
      where: { id: conditionId },
      data: { isActive: false },
    });
  }
}

export const profileService = new ProfileService();
