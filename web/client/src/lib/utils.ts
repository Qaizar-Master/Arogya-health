/**
 * Utility functions — shared across the client.
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ConditionType, AlertSeverity, RiskTier, Alert } from "../types";

/** shadcn/ui class merge helper */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Date formatting ──────────────────────────────────────────────────────────

export const formatDate = (date: string | Date) =>
  format(new Date(date), "dd MMM yyyy");

export const formatDateTime = (date: string | Date) =>
  format(new Date(date), "dd MMM yyyy, h:mm a");

export const formatRelative = (date: string | Date) =>
  formatDistanceToNow(new Date(date), { addSuffix: true });

export const formatTime = (date: string | Date) =>
  format(new Date(date), "h:mm a");

// ─── Condition display ────────────────────────────────────────────────────────

export const CONDITION_LABELS: Record<ConditionType, string> = {
  DIABETES_T1: "Type 1 Diabetes",
  DIABETES_T2: "Type 2 Diabetes",
  HYPERTENSION: "Hypertension",
  CKD: "Chronic Kidney Disease",
  HEART_DISEASE: "Heart Disease",
  COPD: "COPD",
  ASTHMA: "Asthma",
  OTHER: "Other",
};

export const CONDITION_COLORS: Record<ConditionType, string> = {
  DIABETES_T1: "bg-purple-100 text-purple-800",
  DIABETES_T2: "bg-blue-100 text-blue-800",
  HYPERTENSION: "bg-red-100 text-red-800",
  CKD: "bg-amber-100 text-amber-800",
  HEART_DISEASE: "bg-pink-100 text-pink-800",
  COPD: "bg-orange-100 text-orange-800",
  ASTHMA: "bg-sky-100 text-sky-800",
  OTHER: "bg-slate-100 text-slate-800",
};

// ─── Severity / risk colours ──────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  LOW: "text-slate-600 bg-slate-100",
  MEDIUM: "text-amber-700 bg-amber-100",
  HIGH: "text-orange-700 bg-orange-100",
  CRITICAL: "text-red-700 bg-red-100",
};

export const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  LOW: "bg-slate-200 text-slate-700",
  MEDIUM: "bg-amber-200 text-amber-800",
  HIGH: "bg-orange-200 text-orange-800",
  CRITICAL: "bg-red-200 text-red-800",
};

export const RISK_TIER_STYLES: Record<RiskTier, { label: string; badge: string; dot: string }> = {
  GREEN: { label: "Stable", badge: "bg-green-100 text-green-800", dot: "bg-green-500" },
  AMBER: { label: "Watch", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  RED: { label: "Urgent", badge: "bg-red-100 text-red-800", dot: "bg-red-500" },
};

// ─── Risk stratification logic ────────────────────────────────────────────────

/**
 * Classifies a patient into GREEN/AMBER/RED based on their unread alerts.
 * Mirrors the server-side business rule.
 */
export function computeRiskTier(alerts: Alert[]): RiskTier {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recent7 = alerts.filter((a) => new Date(a.createdAt) >= sevenDaysAgo);
  const recent14 = alerts.filter((a) => new Date(a.createdAt) >= fourteenDaysAgo);

  const hasCriticalOrHigh = recent7.some(
    (a) => a.severity === "CRITICAL" || a.severity === "HIGH"
  );
  if (hasCriticalOrHigh) return "RED";

  const hasMedium = recent14.some((a) => a.severity === "MEDIUM");
  if (hasMedium) return "AMBER";

  return "GREEN";
}

// ─── Vitals reference ranges ──────────────────────────────────────────────────

export interface VitalRange {
  min: number;
  max: number;
  unit: string;
  label: string;
}

export const VITAL_RANGES: Record<string, VitalRange> = {
  bloodGlucose: { min: 70, max: 140, unit: "mg/dL", label: "Blood Glucose" },
  systolicBP: { min: 90, max: 140, unit: "mmHg", label: "Systolic BP" },
  diastolicBP: { min: 60, max: 90, unit: "mmHg", label: "Diastolic BP" },
  heartRate: { min: 50, max: 100, unit: "bpm", label: "Heart Rate" },
  spo2: { min: 95, max: 100, unit: "%", label: "SpO₂" },
  temperature: { min: 36.1, max: 37.5, unit: "°C", label: "Temperature" },
  hba1c: { min: 0, max: 7, unit: "%", label: "HbA1c" },
  creatinine: { min: 0.6, max: 1.2, unit: "mg/dL", label: "Creatinine" },
  weight: { min: 30, max: 200, unit: "kg", label: "Weight" },
  egfr: { min: 60, max: 120, unit: "mL/min", label: "eGFR" },
  cholesterol: { min: 0, max: 200, unit: "mg/dL", label: "Cholesterol" },
};

export function isVitalOutOfRange(field: string, value: number): boolean {
  const range = VITAL_RANGES[field];
  if (!range) return false;
  return value < range.min || value > range.max;
}

// ─── Adherence % color ────────────────────────────────────────────────────────

export function adherenceColor(pct: number): string {
  if (pct >= 90) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-600";
}

// ─── Full name ────────────────────────────────────────────────────────────────

export const fullName = (p: { firstName: string; lastName: string }) =>
  `${p.firstName} ${p.lastName}`;
