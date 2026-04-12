/**
 * Groq AI client singleton.
 * All AI calls flow through this module — swap models or add logging here.
 */

import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  console.warn("[ai] GROQ_API_KEY not set — AI features will be unavailable");
}

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? "" });

export const AI_MODEL = "llama-3.3-70b-versatile";
export const MAX_TOKENS = 512;
