/**
 * Anthropic AI client singleton.
 * All AI calls flow through this module — swap models or add logging here.
 */

import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[ai] ANTHROPIC_API_KEY not set — AI features will be unavailable");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "",
});

export const AI_MODEL = "claude-sonnet-4-5";
export const MAX_TOKENS = 2048;
