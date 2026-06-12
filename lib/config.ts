// ---------------------------------------------------------------------------
// API endpoint configuration
// ---------------------------------------------------------------------------
// The app ships pointed at the public Jolpica F1 API (Ergast-compatible) so it
// returns real data the moment you run `npm start` — no backend required.
//
// When your SportsFusion backend exposes an equivalent standings route, just
// swap API_BASE below and adjust lib/api/standings.ts to match your response
// shape. The screen code doesn't change — that's the whole point of keeping the
// fetch + parse isolated in lib/api.
// ---------------------------------------------------------------------------

export const API_BASE = "https://api.jolpi.ca/ergast/f1";

// Your SportsFusion backend on Render (uncomment + edit when its route is ready):
// export const API_BASE = "https://YOUR-SPORTSFUSION.onrender.com/api";

// The Live tab uses the OpenF1 API directly (free historical F1 data, no auth):
//   https://api.openf1.org/v1   — see lib/api/openf1.ts

// ---------------------------------------------------------------------------
// Football (soccer) — football-data.org (free tier: 12 top leagues, league
// tables + fixtures, delayed scores, 10 requests/min).
//
// 1. Get a FREE key: https://www.football-data.org/client/register
// 2. Paste it below. Until you do, the Football tabs show a setup prompt.
//
// NOTE: a key in the app bundle is visible to anyone and shared across all
// users (10 req/min). Fine for a portfolio demo; for production, proxy this
// through your SportsFusion backend and keep the key server-side.
// Also: football-data.org blocks browser-origin calls, so the Football tabs
// work in the native Expo Go app, not the `w` (web) preview.
// ---------------------------------------------------------------------------

export const FOOTBALL_API_KEY = ""; // <-- paste your free key here
export const FOOTBALL_COMPETITION = "PL"; // PL, PD (La Liga), SA, BL1, FL1, CL...

// ---------------------------------------------------------------------------
// APEX chatbot — Google Gemini (free tier).
//
// 1. Get a FREE key: https://aistudio.google.com/app/apikeys
// 2. Paste it below. Until you do, the Chat tab shows a setup prompt.
// Same caveat as above: bundle keys are fine for a demo, proxy for production.
// ---------------------------------------------------------------------------

export const GEMINI_API_KEY = ""; // <-- paste your free Gemini key here
export const GEMINI_MODEL = "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// OPTIONAL: API-Football (api-sports.io) for real match statistics
// (possession, shots…). Free key: https://dashboard.api-football.com/register
// Leave blank and the stats widget simply falls back to score-only cards.
// ---------------------------------------------------------------------------

export const APIFOOTBALL_API_KEY = "";

// ---------------------------------------------------------------------------
// LIVE STREAMS — "Watch Live" sources.
//
// There is NO free, legal API that serves live video of top-flight football
// or F1: broadcast rights are licensed per region (F1 TV, DAZN, Sky, etc.).
// What the app ships with instead:
//
//   • An in-app HLS player (expo-video). If you have rights to a stream —
//     a licensed provider URL, your club's own broadcast, or a federation's
//     free stream — map it here by competition code and it plays in-app.
//   • "web" entries open the official broadcaster page/app in the browser,
//     which is the legal route for big leagues.
//   • A free public demo HLS stream so you can see the player working today.
//
// kind: "hls" → plays inside the app; "web" → opens externally.
// Keys: football competition codes ("PL", "CL"…) or "f1".
// ---------------------------------------------------------------------------

export type StreamSource = { kind: "hls" | "web"; url: string; label?: string };

export const LIVE_STREAM_SOURCES: Record<string, StreamSource> = {
  // In-app HLS examples (replace with streams you're licensed to view):
  // PL: { kind: "hls", url: "https://your-provider.example/master.m3u8", label: "Premier League" },

  // Official broadcaster fallbacks (legal, may require a subscription):
  f1: { kind: "web", url: "https://f1tv.formula1.com", label: "F1 TV" },
  CL: { kind: "web", url: "https://www.uefa.com/uefachampionsleague/", label: "UEFA.com" },
  WC: { kind: "web", url: "https://www.plus.fifa.com", label: "FIFA+" },
};

// Free public test stream (Mux) — used when no source is mapped above, so the
// Watch Live flow is fully demoable without any paid subscription.
export const DEMO_STREAM_URL =
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
