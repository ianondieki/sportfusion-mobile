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
