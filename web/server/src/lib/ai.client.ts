/**
 * Google Gemini AI client singleton.
 * All AI calls flow through this module — swap models or add logging here.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("[ai] GEMINI_API_KEY not set — AI features will be unavailable");
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

export const AI_MODEL = "gemini-2.0-flash";
export const MAX_TOKENS = 2048;
