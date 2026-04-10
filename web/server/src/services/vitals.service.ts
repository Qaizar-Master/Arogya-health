/**
 * Vitals service — logging, batch sync (offline queue), retrieval with
 * date range filtering. Also triggers anomaly alerts on save.
 */

import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { sendMail } from "../lib/mailer";
import { VitalSource } from "@prisma/client";

// ─── Reference ranges for anomaly detection ───────────────────────────────────

const RANGES = {
  bloodGlucose: { min: 70, max: 140 },   // mg/dL (random/post-prandial)
  systolicBP: { min: 90, max: 140 },     // mmHg
  diastolicBP: { min: 60, max: 90 },     // mmHg
  heartRate: { min: 50, max: 100 },      // bpm
  spo2: { min: 95, max: 100 },           // %
  temperature: { min: 36.1, max: 37.5 }, // °C
  hba1c: { min: 0, max: 7 },             // % (diabetic target)
  creatinine: { min: 0.6, max: 1.2 },   // mg/dL
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VitalInput {
  recordedAt?: string;
  bloodGlucose?: number;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  weight?: number;
  spo2?: number;
  temperature?: number;
  hba1c?: number;
  creatinine?: number;
  egfr?: number;
  cholesterol?: number;
  notes?: string;
  source?: VitalSource;
  localId?: string; // for deduplication in batch sync
}

export interface VitalsQueryOptions {
  profileId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class VitalsService {
  /**
   * Logs a single vital reading and auto-creates alerts for out-of-range values.
   */
  async logVital(profileId: string, input: VitalInput) {
    const vital = await prisma.vitalLog.create({
      data: {
        profileId,
        recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined,
        bloodGlucose: input.bloodGlucose,
        systolicBP: input.systolicBP,
        diastolicBP: input.diastolicBP,
        heartRate: input.heartRate,
        weight: input.weight,
        spo2: input.spo2,
        temperature: input.temperature,
        hba1c: input.hba1c,
        creatinine: input.creatinine,
        egfr: input.egfr,
        cholesterol: input.cholesterol,
        notes: input.notes,
        source: input.source ?? VitalSource.MANUAL,
        localId: input.localId,
        syncedAt: new Date(),
      },
    });

    // Fire-and-forget anomaly alert creation
    this._checkAndCreateAlerts(profileId, vital.id, input).catch((err) =>
      console.error("[vitals] Alert creation failed:", err)
    );

    return vital;
  }

  /**
   * Batch-syncs an offline queue of vitals.
   * Skips records that already exist (by localId) for idempotency.
   */
  async batchSync(profileId: string, vitals: VitalInput[]) {
    const results = { created: 0, skipped: 0, errors: 0 };

    for (const v of vitals) {
      try {
        // If a localId is provided, check for duplicates
        if (v.localId) {
          const existing = await prisma.vitalLog.findFirst({
            where: { profileId, localId: v.localId },
          });
          if (existing) {
            results.skipped++;
            continue;
          }
        }

        await this.logVital(profileId, { ...v, source: VitalSource.MANUAL });
        results.created++;
      } catch {
        results.errors++;
      }
    }

    return results;
  }

  /**
   * Returns paginated vitals for a patient, with optional date range filter.
   */
  async getVitals(options: VitalsQueryOptions) {
    const { profileId, startDate, endDate, page = 1, limit = 50 } = options;

    const where = {
      profileId,
      ...(startDate || endDate
        ? {
            recordedAt: {
              ...(startDate ? { gte: new Date(startDate) } : {}),
              ...(endDate ? { lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    };

    const [vitals, total] = await Promise.all([
      prisma.vitalLog.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vitalLog.count({ where }),
    ]);

    return {
      data: vitals,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /**
   * Deletes a single vital log (patient can only delete their own).
   */
  async deleteVital(vitalId: string, profileId: string) {
    const vital = await prisma.vitalLog.findFirst({
      where: { id: vitalId, profileId },
    });

    if (!vital) throw new AppError(404, "NOT_FOUND", "Vital record not found");

    await prisma.vitalLog.delete({ where: { id: vitalId } });
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  /**
   * Compares logged values against reference ranges and creates alerts.
   */
  private async _checkAndCreateAlerts(
    profileId: string,
    vitalId: string,
    input: VitalInput
  ) {
    const alerts: Array<{
      type: "VITAL_ANOMALY";
      severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
      message: string;
    }> = [];

    const check = (
      field: keyof typeof RANGES,
      value: number | undefined,
      unit: string,
      label: string
    ) => {
      if (value === undefined) return;
      const range = RANGES[field];
      if (value < range.min || value > range.max) {
        const severity =
          value < range.min * 0.7 || value > range.max * 1.4
            ? "CRITICAL"
            : value < range.min * 0.85 || value > range.max * 1.2
            ? "HIGH"
            : "MEDIUM";

        alerts.push({
          type: "VITAL_ANOMALY",
          severity,
          message: `${label} is ${value}${unit} (normal: ${range.min}–${range.max}${unit})`,
        });
      }
    };

    check("bloodGlucose", input.bloodGlucose, " mg/dL", "Blood glucose");
    check("systolicBP", input.systolicBP, " mmHg", "Systolic BP");
    check("diastolicBP", input.diastolicBP, " mmHg", "Diastolic BP");
    check("heartRate", input.heartRate, " bpm", "Heart rate");
    check("spo2", input.spo2, "%", "SpO₂");
    check("temperature", input.temperature, "°C", "Temperature");
    check("hba1c", input.hba1c, "%", "HbA1c");
    check("creatinine", input.creatinine, " mg/dL", "Creatinine");

    if (alerts.length === 0) return;

    await prisma.alert.createMany({
      data: alerts.map((a) => ({
        profileId,
        type: a.type,
        severity: a.severity,
        message: a.message,
        sourceType: "VitalLog",
        sourceId: vitalId,
        metadata: { vitalId },
      })),
    });

    // Only email for HIGH or CRITICAL alerts
    const urgentAlerts = alerts.filter(
      (a) => a.severity === "HIGH" || a.severity === "CRITICAL"
    );
    if (urgentAlerts.length === 0) return;

    // Get patient name + assigned doctors' emails
    const patient = await prisma.profile.findUnique({
      where: { id: profileId },
      select: {
        firstName: true,
        lastName: true,
        assignedDoctors: {
          select: {
            doctor: {
              select: { user: { select: { email: true } } },
            },
          },
        },
      },
    });

    if (!patient) return;

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const doctorEmails = patient.assignedDoctors
      .map((d) => d.doctor.user?.email)
      .filter(Boolean) as string[];

    if (doctorEmails.length === 0) return;

    const overallSeverity = urgentAlerts.some((a) => a.severity === "CRITICAL")
      ? "CRITICAL"
      : "HIGH";

    const alertRows = urgentAlerts
      .map(
        (a) =>
          `<tr>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;">${a.message}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #f1f5f9;color:${a.severity === "CRITICAL" ? "#dc2626" : "#ea580c"};font-weight:600;">${a.severity}</td>
          </tr>`
      )
      .join("");

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#0F6E56;padding:20px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;">Arogya — Vital Alert</h2>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
          <p style="margin:0 0 16px;">Abnormal vital readings have been recorded for <strong>${patientName}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:8px 12px;text-align:left;color:#475569;">Anomaly</th>
                <th style="padding:8px 12px;text-align:left;color:#475569;">Severity</th>
              </tr>
            </thead>
            <tbody>${alertRows}</tbody>
          </table>
          <p style="color:#64748b;font-size:13px;margin-top:20px;">
            Log in to the Arogya portal to review this patient's vitals and take action.
          </p>
        </div>
      </div>`;

    await Promise.all(
      doctorEmails.map((email) =>
        sendMail({
          to: email,
          subject: `[Arogya ${overallSeverity}] Vital anomaly — ${patientName}`,
          html,
        }).catch((err) => console.error("[mailer] Alert email failed:", err))
      )
    );
  }
}

export const vitalsService = new VitalsService();
