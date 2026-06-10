// APEX — SportsFusion's AI sports companion, powered by Google Gemini (free
// Flash tier). Uses systemInstruction for personality, multi-turn history for
// context, and an injected "live context" block of REAL standings/results so
// answers are grounded in actual data rather than guessed.

import { GEMINI_API_KEY, GEMINI_MODEL } from "../config";

export class MissingGeminiKeyError extends Error {
  constructor() {
    super("No Gemini API key configured");
    this.name = "MissingGeminiKeyError";
  }
}

export interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const APEX_PERSONA = `You are APEX — the SportsFusion app's AI sports companion. A witty, opinionated
analyst with deep Formula 1 and football knowledge who talks like a mate in the
stands, not a database.

VOICE
- Expert knowledge, casual delivery. Drop insight as asides, not lectures.
- Make calls and have takes. Be confident but not arrogant.
- 2–3 sentences max per reply. One emoji only if it genuinely lands.

GROUNDING (critical)
- A "LIVE CONTEXT" block below may contain the user's real current standings and
  recent results from the app. Treat it as the source of truth and base factual
  claims on it.
- If the context doesn't contain something, say you don't have it rather than
  inventing it. Never fabricate a live score, lap time, or stat.
- For minute-by-minute live questions ("who just scored?"), point them to the
  LIVE tab — the app's data is slightly delayed on the free tier.

SCOPE
- Match/race strategy and momentum, standings interpretation, trivia, rules,
  history, and cross-sport takes. Stay on football and F1.`;

// Builds a context string from real app data to ground APEX.
export function buildLiveContext(input: {
  sport?: string;
  competition?: string;
  standings?: string; // pre-formatted table text
  latestResults?: string; // pre-formatted results text
  f1Session?: string; // pre-formatted session/leaderboard text
}): string {
  const parts: string[] = [];
  if (input.sport) parts.push(`Active sport: ${input.sport}`);
  if (input.competition) parts.push(`Competition: ${input.competition}`);
  if (input.standings) parts.push(`Standings:\n${input.standings}`);
  if (input.latestResults) parts.push(`Recent results:\n${input.latestResults}`);
  if (input.f1Session) parts.push(`Latest F1 session:\n${input.f1Session}`);
  return parts.length ? parts.join("\n\n") : "";
}

export async function askAPEX(
  history: ChatTurn[],
  liveContext: string = ""
): Promise<string> {
  if (!GEMINI_API_KEY) throw new MissingGeminiKeyError();

  const systemText = liveContext
    ? `${APEX_PERSONA}\n\n--- LIVE CONTEXT (real app data) ---\n${liveContext}`
    : APEX_PERSONA;

  const contents = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemText }] },
        contents,
        generationConfig: { maxOutputTokens: 250, temperature: 0.8 },
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 400) {
      // often a bad/disabled key or wrong model name
      throw new Error("Request rejected — check your API key and model name in config.");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Invalid or unauthorized Gemini API key.");
    }
    if (res.status === 429) {
      throw new Error("Rate limit reached (free tier ~10/min) — give it a moment.");
    }
    if (res.status === 404) {
      throw new Error(`Model "${GEMINI_MODEL}" not found — try "gemini-2.5-flash" in config.`);
    }
    throw new Error(`Gemini request failed (${res.status}).`);
  }

  const json = await res.json();

  // safety/blocked responses come back without text
  const candidate = json.candidates?.[0];
  const text = candidate?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  if (!text) {
    if (candidate?.finishReason === "SAFETY") {
      return "I'll sit that one out — let's keep it to the football and the racing. ⚽";
    }
    throw new Error("Empty response from Gemini.");
  }
  return text.trim();
}
