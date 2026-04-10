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
import { anthropic, AI_MODEL, MAX_TOKENS } from "../lib/ai.client";
import { AppError } from "../middleware/error.middleware";

const router = Router();

// Authentication + rate limiting on all AI routes
router.use(authenticateToken);
router.use(aiLimiter);

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

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new AppError(503, "AI_UNAVAILABLE", "AI service is not configured");
      }

      const prompt = `You are a clinical decision support AI integrated into Arogya, a chronic disease management platform used by doctors in India.

Patient profile:
- Conditions: ${input.conditions.join(", ")}
- Age: ${input.patientAge ?? "unknown"}
- Gender: ${input.patientGender ?? "unknown"}

Last 30 days of vitals (newest first):
${JSON.stringify(input.vitals, null, 2)}

Analyse the vitals above and identify:
1. Out-of-range readings based on clinical reference ranges
2. Worsening trends across the period
3. Patterns specific to the patient's conditions (e.g. rising HbA1c for diabetes, creatinine trend for CKD)
4. Any urgently concerning values

Respond ONLY with valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "anomalies": [
    {
      "field": "bloodGlucose",
      "value": 280,
      "unit": "mg/dL",
      "normalRange": "70-140",
      "severity": "high",
      "note": "Significantly elevated — check for poor glycaemic control or illness"
    }
  ],
  "trend_summary": "Brief narrative of the overall trend in 2-3 sentences",
  "recommended_followup": "Specific actionable recommendation for the doctor",
  "urgency_level": "low|medium|high|critical"
}`;

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // If model returned markdown-wrapped JSON, strip it
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { raw };
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

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new AppError(503, "AI_UNAVAILABLE", "AI service is not configured");
      }

      const prompt = `You are a clinical documentation AI assisting a doctor using the Arogya platform in India. Generate a structured SOAP note DRAFT for the doctor to review and edit — never for direct use without review.

Patient:
- Age: ${input.patientAge ?? "unknown"}, Gender: ${input.patientGender ?? "unknown"}
- Chronic conditions: ${input.conditions.join(", ")}
- Chief complaint: ${input.chiefComplaint}

Current medications:
${input.medications.map((m) => `- ${m.name} ${m.dosage} ${m.frequency}`).join("\n")}

Recent vitals (last 5 readings):
${JSON.stringify(input.recentVitals, null, 2)}

Generate a concise clinical SOAP note draft. Use standard clinical language appropriate for an Indian outpatient setting.

Respond ONLY with valid JSON (no markdown wrapper):
{
  "subjective": "Patient-reported symptoms and history from this visit",
  "objective": "Relevant examination findings and vitals summary",
  "assessment": "Clinical impression / working diagnosis",
  "plan": "Treatment plan including medication changes, investigations, lifestyle advice, follow-up"
}`;

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { plan: raw };
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

      if (!process.env.ANTHROPIC_API_KEY) {
        throw new AppError(503, "AI_UNAVAILABLE", "AI service is not configured");
      }

      const prompt = `You are a clinical pharmacology AI. Check for drug interactions between a new drug and an existing medication list.

New drug being prescribed: ${input.newDrug}

Current medications:
${input.existingMedications.map((m) => `- ${m.name}${m.dosage ? ` ${m.dosage}` : ""}`).join("\n")}

Identify any clinically significant drug-drug interactions. Consider: pharmacokinetic interactions (CYP450, protein binding), pharmacodynamic interactions (additive/antagonistic effects), and contraindications.

IMPORTANT: Only flag real, evidence-based interactions. Do not flag minor or theoretical interactions.

Respond ONLY with valid JSON (no markdown):
{
  "hasInteraction": true,
  "interactions": [
    {
      "drug1": "Metformin",
      "drug2": "Contrast dye",
      "severity": "moderate",
      "mechanism": "Brief pharmacological explanation",
      "clinicalEffect": "What may happen clinically",
      "recommendation": "What the doctor should do"
    }
  ],
  "overallSeverity": "none|mild|moderate|severe",
  "summary": "One-line summary for the prescribing doctor"
}`;

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.content[0].type === "text" ? response.content[0].text : "";

      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : { hasInteraction: false, summary: raw };
      }

      res.json(parsed);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
