/**
 * Shared TypeScript types for the Arogya client.
 * Keep in sync with the Prisma schema on the server side.
 */

// ─── Enums ────────────────────────────────────────────────────────────────────

export type Role = "PATIENT" | "DOCTOR" | "ADMIN";

export type ConditionType =
  | "DIABETES_T1"
  | "DIABETES_T2"
  | "HYPERTENSION"
  | "CKD"
  | "HEART_DISEASE"
  | "COPD"
  | "ASTHMA"
  | "OTHER";

export type VitalSource = "MANUAL" | "DEVICE" | "IMPORTED";
export type AdherenceStatus = "TAKEN" | "MISSED" | "SKIPPED" | "PENDING";
export type ConsultStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type AlertType = "VITAL_ANOMALY" | "MED_MISSED" | "APPOINTMENT" | "LAB_RESULT" | "AI_FLAG";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  profileId: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface PatientCondition {
  id: string;
  profileId: string;
  conditionType: ConditionType;
  diagnosedAt: string | null;
  severity: string | null;
  notes: string | null;
  icdCode: string | null;
  snomedCode: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string | null;
  gender: string | null;
  avatarUrl: string | null;
  abhaId: string | null;
  licenseNo: string | null;
  speciality: string | null;
  clinicName: string | null;
  consultFee: number | null;
  conditions: PatientCondition[];
  medications?: Medication[];
  alerts?: Alert[];
  vitals?: VitalLog[];
  patientConsultations?: Consultation[];
  doctorConsultations?: Consultation[];
  assignedPatients?: unknown[];
  assignedDoctors?: unknown[];
  createdAt: string;
  updatedAt: string;
}

// ─── Vitals ───────────────────────────────────────────────────────────────────

export interface VitalLog {
  id: string;
  profileId: string;
  recordedAt: string;
  bloodGlucose: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  heartRate: number | null;
  weight: number | null;
  spo2: number | null;
  temperature: number | null;
  hba1c: number | null;
  creatinine: number | null;
  egfr: number | null;
  cholesterol: number | null;
  notes: string | null;
  source: VitalSource;
  localId: string | null;
  syncedAt: string | null;
  createdAt: string;
}

// ─── Medications ─────────────────────────────────────────────────────────────

export interface MedAdherenceLog {
  id: string;
  medicationId: string;
  scheduledAt: string;
  takenAt: string | null;
  status: AdherenceStatus;
  notes: string | null;
  createdAt: string;
}

export interface Medication {
  id: string;
  profileId: string;
  name: string;
  genericName: string | null;
  dosage: string;
  frequency: string;
  route: string;
  startDate: string;
  endDate: string | null;
  prescribedBy: string | null;
  rxNumber: string | null;
  active: boolean;
  notes: string | null;
  adherenceLogs: MedAdherenceLog[];
  createdAt: string;
  updatedAt: string;
}

// ─── Consultations ────────────────────────────────────────────────────────────

export interface SOAPNote {
  id: string;
  consultationId: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  aiDraft: string | null;
  aiGeneratedAt: string | null;
  isDoctorEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  drugName: string;
  genericName: string | null;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string | null;
  route: string;
  specialInstr: string | null;
  interactionFlag: boolean;
  interactionNote: string | null;
  interactionSeverity: string | null;
}

export interface Prescription {
  id: string;
  consultationId: string;
  items: PrescriptionItem[];
  instructions: string | null;
  followUpDate: string | null;
  pdfUrl: string | null;
  createdAt: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  completedAt: string | null;
  duration: number | null;
  status: ConsultStatus;
  chiefComplaint: string | null;
  visitType: string | null;
  patient?: Partial<Profile>;
  doctor?: Partial<Profile>;
  soapNote?: SOAPNote | null;
  prescription?: Prescription | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  profileId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  metadata: unknown;
  isRead: boolean;
  readAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  profile?: Partial<Profile>;
}

// ─── AI Response types ────────────────────────────────────────────────────────

export interface VitalAnomaly {
  field: string;
  value: number;
  unit: string;
  normalRange: string;
  severity: "low" | "medium" | "high" | "critical";
  note: string;
}

export interface VitalsAnalysis {
  anomalies: VitalAnomaly[];
  trend_summary: string;
  recommended_followup: string;
  urgency_level: "low" | "medium" | "high" | "critical";
}

export interface SOAPDraft {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "mild" | "moderate" | "severe";
  mechanism: string;
  clinicalEffect: string;
  recommendation: string;
}

export interface DrugInteractionResult {
  hasInteraction: boolean;
  interactions: DrugInteraction[];
  overallSeverity: "none" | "mild" | "moderate" | "severe";
  summary: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─── Risk stratification ──────────────────────────────────────────────────────

export type RiskTier = "GREEN" | "AMBER" | "RED";
