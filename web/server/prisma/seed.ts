/**
 * Arogya — Database seed script
 * Creates demo-ready data: 1 admin, 1 doctor, 5 patients with 90 days of vitals,
 * medications, adherence logs, consultations, SOAP notes, and alerts.
 *
 * Run: npx ts-node prisma/seed.ts
 */

import "dotenv/config";
import { PrismaClient, ConditionType, VitalSource, AdherenceStatus, ConsultStatus, AlertType, AlertSeverity } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const hash = (pwd: string) => bcrypt.hash(pwd, 12);

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomBetween(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

/** Occasional out-of-range spike (10% chance) */
function withSpike(base: number, spikeFactor: number): number {
  if (Math.random() < 0.1) return parseFloat((base * spikeFactor).toFixed(1));
  return base;
}

// ─── Generate 90 days of vitals for a patient ────────────────────────────────

function generateVitals(
  profileId: string,
  conditions: ConditionType[]
): Array<Record<string, unknown>> {
  const vitals: Array<Record<string, unknown>> = [];

  for (let day = 90; day >= 1; day--) {
    const recordedAt = daysAgo(day);

    const entry: Record<string, unknown> = {
      profileId,
      recordedAt,
      source: VitalSource.MANUAL,
      syncedAt: recordedAt,
    };

    // All patients get HR and weight
    entry.heartRate = Math.round(randomBetween(62, 88));
    entry.weight = randomBetween(60, 90, 1);
    entry.spo2 = Math.round(withSpike(97, 0.93));

    if (conditions.includes(ConditionType.DIABETES_T1) || conditions.includes(ConditionType.DIABETES_T2)) {
      entry.bloodGlucose = parseFloat(withSpike(randomBetween(95, 160), 1.8).toFixed(1));
      if (day % 30 === 0) entry.hba1c = randomBetween(6.5, 9.0, 1);
    }

    if (conditions.includes(ConditionType.HYPERTENSION)) {
      entry.systolicBP = Math.round(withSpike(randomBetween(118, 145), 1.2));
      entry.diastolicBP = Math.round(withSpike(randomBetween(76, 95), 1.15));
    }

    if (conditions.includes(ConditionType.CKD)) {
      entry.creatinine = randomBetween(1.0, 2.2, 2);
      entry.egfr = randomBetween(40, 75, 1);
    }

    if (conditions.includes(ConditionType.HEART_DISEASE)) {
      entry.systolicBP = entry.systolicBP ?? Math.round(randomBetween(110, 145));
      entry.diastolicBP = entry.diastolicBP ?? Math.round(randomBetween(70, 92));
      entry.heartRate = Math.round(withSpike(randomBetween(58, 85), 1.3));
      entry.cholesterol = randomBetween(160, 240, 1);
    }

    vitals.push(entry);
  }

  return vitals;
}

// ─── Generate adherence logs for a medication ────────────────────────────────

function generateAdherence(medicationId: string, daysBack: number) {
  const logs = [];
  for (let d = daysBack; d >= 1; d--) {
    const scheduledAt = daysAgo(d);
    scheduledAt.setHours(8, 0, 0, 0); // morning dose

    // 85% adherence rate
    const taken = Math.random() < 0.85;
    logs.push({
      medicationId,
      scheduledAt,
      takenAt: taken ? new Date(scheduledAt.getTime() + randomBetween(0, 120) * 60000) : null,
      status: taken ? AdherenceStatus.TAKEN : AdherenceStatus.MISSED,
    });
  }
  return logs;
}

// ─── Main seed function ────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding Arogya database...\n");

  // ── 1. Admin ──────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@arogya.health" },
    update: {},
    create: {
      email: "admin@arogya.health",
      passwordHash: await hash("Admin@123"),
      role: "ADMIN",
      profile: {
        create: { firstName: "Arogya", lastName: "Admin" },
      },
    },
    include: { profile: true },
  });
  console.log("✅ Admin created:", adminUser.email);

  // ── 2. Doctor ─────────────────────────────────────────────────────────────

  const doctorUser = await prisma.user.upsert({
    where: { email: "dr.sharma@arogya.health" },
    update: {},
    create: {
      email: "dr.sharma@arogya.health",
      passwordHash: await hash("Doctor@123"),
      role: "DOCTOR",
      profile: {
        create: {
          firstName: "Priya",
          lastName: "Sharma",
          licenseNo: "MH-12345",
          speciality: "Endocrinology",
          clinicName: "Arogya Wellness Clinic",
          phone: "+91 98200 12345",
          consultFee: 500,
        },
      },
    },
    include: { profile: true },
  });
  console.log("✅ Doctor created:", doctorUser.email);
  const doctorProfile = doctorUser.profile!;

  // ── 3. Patients ────────────────────────────────────────────────────────────

  const patientDefs = [
    {
      email: "ravi.kumar@example.com",
      firstName: "Ravi",
      lastName: "Kumar",
      dateOfBirth: new Date("1966-03-15"),
      phone: "+91 98100 11111",
      gender: "male",
      conditions: [ConditionType.DIABETES_T2, ConditionType.HYPERTENSION],
      abhaId: "ABHA-1234-5678-9012",
      meds: [
        { name: "Metformin", dosage: "500mg", frequency: "twice daily" },
        { name: "Amlodipine", dosage: "5mg", frequency: "once daily" },
        { name: "Atorvastatin", dosage: "10mg", frequency: "once daily at night" },
      ],
    },
    {
      email: "sunita.patil@example.com",
      firstName: "Sunita",
      lastName: "Patil",
      dateOfBirth: new Date("1962-07-22"),
      phone: "+91 98100 22222",
      gender: "female",
      conditions: [ConditionType.HYPERTENSION, ConditionType.CKD],
      abhaId: "ABHA-2345-6789-0123",
      meds: [
        { name: "Telmisartan", dosage: "40mg", frequency: "once daily" },
        { name: "Furosemide", dosage: "20mg", frequency: "once daily morning" },
      ],
    },
    {
      email: "amit.desai@example.com",
      firstName: "Amit",
      lastName: "Desai",
      dateOfBirth: new Date("1979-11-05"),
      phone: "+91 98100 33333",
      gender: "male",
      conditions: [ConditionType.DIABETES_T2],
      abhaId: "ABHA-3456-7890-1234",
      meds: [
        { name: "Metformin", dosage: "1000mg", frequency: "twice daily with meals" },
        { name: "Glipizide", dosage: "5mg", frequency: "once daily before breakfast" },
      ],
    },
    {
      email: "meena.joshi@example.com",
      firstName: "Meena",
      lastName: "Joshi",
      dateOfBirth: new Date("1957-01-30"),
      phone: "+91 98100 44444",
      gender: "female",
      conditions: [ConditionType.HEART_DISEASE, ConditionType.DIABETES_T2],
      abhaId: "ABHA-4567-8901-2345",
      meds: [
        { name: "Aspirin", dosage: "75mg", frequency: "once daily" },
        { name: "Metoprolol", dosage: "25mg", frequency: "twice daily" },
        { name: "Metformin", dosage: "500mg", frequency: "twice daily" },
        { name: "Ramipril", dosage: "5mg", frequency: "once daily" },
      ],
    },
    {
      email: "sanjay.more@example.com",
      firstName: "Sanjay",
      lastName: "More",
      dateOfBirth: new Date("1992-06-18"),
      phone: "+91 98100 55555",
      gender: "male",
      conditions: [ConditionType.DIABETES_T1],
      abhaId: "ABHA-5678-9012-3456",
      meds: [
        { name: "Insulin Glargine", dosage: "20 units", frequency: "once daily at bedtime" },
        { name: "Insulin Aspart", dosage: "6-8 units", frequency: "before each meal" },
      ],
    },
  ];

  for (const def of patientDefs) {
    console.log(`\n  👤 Seeding patient: ${def.firstName} ${def.lastName}`);

    const patientUser = await prisma.user.upsert({
      where: { email: def.email },
      update: {},
      create: {
        email: def.email,
        passwordHash: await hash("Patient@123"),
        role: "PATIENT",
        profile: {
          create: {
            firstName: def.firstName,
            lastName: def.lastName,
            dateOfBirth: def.dateOfBirth,
            phone: def.phone,
            gender: def.gender,
            abhaId: def.abhaId,
          },
        },
      },
      include: { profile: true },
    });

    const patientProfile = patientUser.profile!;

    // Add conditions
    for (const ct of def.conditions) {
      await prisma.patientCondition.upsert({
        where: { id: `${patientProfile.id}-${ct}` },
        update: {},
        create: {
          id: `${patientProfile.id}-${ct}`,
          profileId: patientProfile.id,
          conditionType: ct,
          diagnosedAt: new Date(def.dateOfBirth.getTime() + Math.random() * 20 * 365 * 86400000),
          severity: ["mild", "moderate", "moderate", "severe"][Math.floor(Math.random() * 4)],
          isActive: true,
        },
      });
    }

    // Generate 90 days of vitals (batch insert)
    const vitalsData = generateVitals(patientProfile.id, def.conditions);
    await prisma.vitalLog.createMany({ data: vitalsData as any, skipDuplicates: true });
    console.log(`     ✅ ${vitalsData.length} vitals logged`);

    // Add medications
    for (const med of def.meds) {
      const medication = await prisma.medication.create({
        data: {
          profileId: patientProfile.id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          startDate: daysAgo(60),
          prescribedBy: `Dr. ${doctorProfile.firstName} ${doctorProfile.lastName}`,
          active: true,
        },
      });

      // 60 days of adherence logs at 85% compliance
      const adherenceLogs = generateAdherence(medication.id, 60);
      await prisma.medAdherenceLog.createMany({ data: adherenceLogs });
    }
    console.log(`     ✅ ${def.meds.length} medications + adherence logs`);

    // Link patient to doctor
    await prisma.doctorPatient.upsert({
      where: { doctorId_patientId: { doctorId: doctorProfile.id, patientId: patientProfile.id } },
      update: {},
      create: { doctorId: doctorProfile.id, patientId: patientProfile.id },
    });

    // Create 3 past consultations with SOAP notes + prescriptions
    const consultDates = [daysAgo(75), daysAgo(45), daysAgo(15)];

    for (const [i, consultDate] of consultDates.entries()) {
      const consult = await prisma.consultation.create({
        data: {
          patientId: patientProfile.id,
          doctorId: doctorProfile.id,
          scheduledAt: consultDate,
          completedAt: new Date(consultDate.getTime() + 30 * 60000),
          status: ConsultStatus.COMPLETED,
          chiefComplaint: ["Routine follow-up", "Feeling fatigued, blood sugar poorly controlled", "Dizziness and headache"][i],
          visitType: "in-person",
          duration: 30,
        },
      });

      await prisma.sOAPNote.create({
        data: {
          consultationId: consult.id,
          subjective: `Patient presents for ${consult.chiefComplaint}. Reports ${i === 0 ? "stable symptoms" : "worsening over past 2 weeks"}. Medication compliance reported as good.`,
          objective: `BP: ${randomBetween(118, 140, 0)}/${randomBetween(76, 90, 0)} mmHg. HR: ${randomBetween(68, 82, 0)} bpm. Weight: ${randomBetween(65, 85, 1)} kg. General: Alert, oriented, no acute distress.`,
          assessment: `${def.conditions.map((c) => c.replace(/_/g, " ")).join(" + ")} — ${i === 0 ? "stable" : i === 1 ? "suboptimally controlled" : "improving with current regimen"}.`,
          plan: `Continue current medications. ${i === 1 ? "Increase Metformin dose. " : ""}Dietary counseling reinforced. Follow up in ${i === 2 ? "4" : "6"} weeks.`,
          isDoctorEdited: true,
        },
      });

      await prisma.prescription.create({
        data: {
          consultationId: consult.id,
          instructions: "Take medications as prescribed. Maintain low-salt, low-sugar diet. Exercise 30 minutes daily.",
          followUpDate: new Date(consultDate.getTime() + (i === 2 ? 28 : 42) * 86400000),
          items: {
            createMany: {
              data: def.meds.slice(0, 2).map((m) => ({
                drugName: m.name,
                dosage: m.dosage,
                frequency: m.frequency,
                duration: "1 month",
                route: "oral",
              })),
            },
          },
        },
      });
    }
    console.log(`     ✅ 3 consultations with SOAP notes + prescriptions`);

    // Create alerts (mix of severities)
    const alertDefs = [
      { type: AlertType.VITAL_ANOMALY, severity: AlertSeverity.HIGH, message: `Blood glucose spiked to 285 mg/dL — significantly above target range` },
      { type: AlertType.MED_MISSED, severity: AlertSeverity.LOW, message: `Missed morning dose of ${def.meds[0].name}` },
      { type: AlertType.VITAL_ANOMALY, severity: AlertSeverity.MEDIUM, message: `Systolic BP elevated at 158 mmHg` },
      { type: AlertType.AI_FLAG, severity: AlertSeverity.MEDIUM, message: `HbA1c trend worsening over past 3 readings — clinical review recommended` },
      { type: AlertType.APPOINTMENT, severity: AlertSeverity.LOW, message: `Follow-up appointment due in 3 days` },
      { type: AlertType.MED_MISSED, severity: AlertSeverity.HIGH, message: `3 consecutive missed doses of ${def.meds[0].name} — adherence concern` },
    ];

    await prisma.alert.createMany({
      data: alertDefs.map((a, i) => ({
        profileId: patientProfile.id,
        type: a.type,
        severity: a.severity,
        message: a.message,
        isRead: i > 3, // first 4 unread, last 2 read
      })),
    });
    console.log(`     ✅ ${alertDefs.length} alerts created`);
  }

  console.log("\n✅ Seed complete!\n");
  console.log("Demo credentials:");
  console.log("  Admin:   admin@arogya.health   / Admin@123");
  console.log("  Doctor:  dr.sharma@arogya.health / Doctor@123");
  console.log("  Patient: ravi.kumar@example.com  / Patient@123");
  console.log("  (and 4 more patients with same password)\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
