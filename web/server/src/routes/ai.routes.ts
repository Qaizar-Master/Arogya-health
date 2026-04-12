/**
 * AI clinical decision support routes — /api/ai/*
 * All routes apply aiLimiter (20 req/min per user).
 *
 * 3 endpoints:
 *  POST /analyze-vitals    — anomaly analysis of recent vitals
 *  POST /soap-draft        — generate SOAP note draft for a consultation
 *  POST /drug-interaction  — check for drug interactions
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";
import { aiLimiter } from "../middleware/rateLimit.middleware";
import { groq, AI_MODEL, MAX_TOKENS } from "../lib/ai.client";
import { AppError } from "../middleware/error.middleware";

const router = Router();

// Authentication + rate limiting on all AI routes
router.use(authenticateToken);
router.use(aiLimiter);

// ─── Helper: call Gemini and return text ──────────────────────────────────────

async function aiGenerate(prompt: string, maxTokens = MAX_TOKENS): Promise<string> {
  const res = await groq.chat.completions.create({
    model: AI_MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: maxTokens,
    temperature: 0.3,
  });
  return res.choices[0].message.content ?? "";
}

// ─── Helper: parse JSON from model output (handles markdown code blocks) ──────

function parseModelJSON(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1]);
    throw new Error("Model did not return valid JSON");
  }
}

// ─── POST /api/ai/analyze-vitals ─────────────────────────────────────────────

const analyzeVitalsSchema = z.object({
  conditions: z.array(z.string()),
  vitals: z.array(z.record(z.unknown())),
  patientAge: z.number().optional(),
  patientGender: z.string().optional(),
});

router.post(
  "/analyze-vitals",
  requireRole("DOCTOR", "ADMIN"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = analyzeVitalsSchema.parse(req.body);

      if (!process.env.GROQ_API_KEY) {
        throw new AppError(503, "AI_UNAVAILABLE", "AI service is not configured");
      }

      // Strip null fields and cap at 10 readings to minimise input tokens
      const VITAL_FIELDS = ["recordedAt","bloodGlucose","systolicBP","diastolicBP","heartRate","spo2","weight","temperature","hba1c","creatinine","egfr","cholesterol"];
      const trimmedVitals = input.vitals.slice(0, 10).map((v) =>
        Object.fromEntries(VITAL_FIELDS.filter((k) => v[k] != null).map((k) => [k, v[k]]))
      );

      const prompt = `Clinical AI for Arogya (India). Patient: ${input.conditions.join(", ")}, age ${input.patientAge ?? "?"}, ${input.patientGender ?? "?"}.

Vitals (newest first, up to 10):
${JSON.stringify(trimmedVitals)}

Identify out-of-range values, worsening trends, and condition-specific concerns. Be concise.

Reply ONLY with valid JSON:
{"anomalies":[{"field":"","value":0,"unit":"","normalRange":"","severity":"low|medium|high|critical","note":""}],"trend_summary":"1-2 sentences","recommended_followup":"1 sentence","urgency_level":"low|medium|high|critical"}`;

      const raw = await aiGenerate(prompt, 512);

      let parsed;
      try {
        parsed = parseModelJSON(raw);
      } catch {
        parsed = { raw };
      }

      res.json({ analysis: parsed });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/ai/soap-draft ──────────────────────────────────────────────────

const soapDraftSchema = z.object({
  chiefComplaint: z.string(),
  conditions: z.array(z.string()),
  recentVitals: z.array(z.record(z.unknown())).max(5),
  medications: z.array(
    z.object({ name: z.string(), dosage: z.string(), frequency: z.string() })
  ),
  patientAge: z.number().optional(),
  patientGender: z.string().optional(),
});

router.post(
  "/soap-draft",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = soapDraftSchema.parse(req.body);

      if (!process.env.GROQ_API_KEY) {
        throw new AppError(503, "AI_UNAVAILABLE", "AI service is not configured");
      }

      const VITAL_FIELDS = ["recordedAt","bloodGlucose","systolicBP","diastolicBP","heartRate","spo2","weight","temperature","hba1c"];
      const trimmedVitals = input.recentVitals.slice(0, 3).map((v) =>
        Object.fromEntries(VITAL_FIELDS.filter((k) => v[k] != null).map((k) => [k, v[k]]))
      );

      const prompt = `SOAP note draft AI for Arogya (India). FOR DOCTOR REVIEW ONLY.
Patient: age ${input.patientAge ?? "?"}, ${input.patientGender ?? "?"}, ${input.conditions.join(", ")}.
Complaint: ${input.chiefComplaint}.
Meds: ${input.medications.map((m) => `${m.name} ${m.dosage} ${m.frequency}`).join("; ")}.
Vitals: ${JSON.stringify(trimmedVitals)}.

Write a brief outpatient SOAP draft. Each field max 2 sentences.

Reply ONLY with valid JSON:
{"subjective":"","objective":"","assessment":"","plan":""}`;

      const raw = await aiGenerate(prompt, 400);

      let parsed;
      try {
        parsed = parseModelJSON(raw);
      } catch {
        parsed = { plan: raw };
      }

      res.json({ draft: parsed });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/ai/drug-interaction ───────────────────────────────────────────

const drugInteractionSchema = z.object({
  newDrug: z.string().min(1),
  existingMedications: z.array(
    z.object({ name: z.string(), dosage: z.string().optional() })
  ),
});

router.post(
  "/drug-interaction",
  requireRole("DOCTOR"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = drugInteractionSchema.parse(req.body);

      if (!process.env.GROQ_API_KEY) {
        throw new AppError(503, "AI_UNAVAILABLE", "AI service is not configured");
      }

      const prompt = `Drug interaction checker. New drug: ${input.newDrug}. Current: ${input.existingMedications.map((m) => m.name + (m.dosage ? ` ${m.dosage}` : "")).join(", ")}.

Only flag real, evidence-based interactions (not theoretical). Be brief.

Reply ONLY with valid JSON:
{"hasInteraction":false,"interactions":[{"drug1":"","drug2":"","severity":"mild|moderate|severe","mechanism":"1 sentence","clinicalEffect":"1 sentence","recommendation":"1 sentence"}],"overallSeverity":"none|mild|moderate|severe","summary":"1 sentence"}`;

      const raw = await aiGenerate(prompt, 400);

      let parsed;
      try {
        parsed = parseModelJSON(raw);
      } catch {
        parsed = { hasInteraction: false, summary: raw };
      }

      res.json(parsed);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
