// football-data.org v4 — table + matches for a chosen competition (code passed
// in by the caller, e.g. "PL", "CL", "WC"). All parsing isolated here.
//
// Rate-limit friendly for the free tier (10 req/min):
//   1) a 60s response cache per endpoint+competition, so tab/competition
//      switching reuses fetches (Live + Schedule share one /matches payload), and
//   2) auto-throttle from the API's rate-limit headers — we pause new requests
//      when nearly out, instead of getting blocked.
//
// Cups (Champions League, World Cup) return standings as MULTIPLE group tables,
// so fetchTable returns a list of groups; leagues return a single unnamed group.

import { FOOTBALL_API_KEY } from "../config";

const BASE = "https://api.football-data.org/v4";
const CACHE_TTL = 60_000; // ms

export class MissingKeyError extends Error {
  constructor() {
    super("No football API key configured");
    this.name = "MissingKeyError";
  }
}

function authHeaders(): Record<string, string> {
  if (!FOOTBALL_API_KEY) throw new MissingKeyError();
  return { "X-Auth-Token": FOOTBALL_API_KEY };
}

const cache = new Map<string, { expires: number; data: any }>();
let gateUntil = 0;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readRateLimit(res: Response, on429 = false) {
  const available = res.headers.get("X-Requests-Available-Minute");
  const resetSec = Number(res.headers.get("X-RequestCounter-Reset"));
  const resetMs = (Number.isNaN(resetSec) ? 60 : resetSec) * 1000 + 500;
  if (on429) {
    gateUntil = Date.now() + resetMs;
    return;
  }
  if (available != null) {
    const n = Number(available);
    if (!Number.isNaN(n) && n <= 1) gateUntil = Date.now() + resetMs;
  }
}

async function getJSON(path: string): Promise<any> {
  const cached = cache.get(path);
  if (cached && cached.expires > Date.now()) return cached.data;

  const now = Date.now();
  if (now < gateUntil) await delay(gateUntil - now);

  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Key invalid, or this competition isn't on your plan");
  }
  if (res.status === 429) {
    readRateLimit(res, true);
    throw new Error("Rate limit reached — backing off, try again shortly");
  }
  if (!res.ok) throw new Error(`Football request failed (${res.status})`);

  readRateLimit(res);
  const data = await res.json();
  cache.set(path, { expires: Date.now() + CACHE_TTL, data });
  return data;
}

export interface TableRow {
  position: number;
  team: string;
  crest: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  gd: number;
  points: number;
}

export interface TableGroup {
  name: string | null; // e.g. "GROUP A" for cups, null for a single league table
  rows: TableRow[];
}

export interface Match {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string | null;
  competitionCode: string | null;
  competitionName: string | null;
  home: string;
  away: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

function mapRow(r: any): TableRow {
  return {
    position: r.position,
    team: r.team?.shortName ?? r.team?.name ?? "—",
    crest: r.team?.crest ?? null,
    played: r.playedGames,
    won: r.won,
    draw: r.draw,
    lost: r.lost,
    gd: r.goalDifference,
    points: r.points,
  };
}

function prettyGroup(s: any): string | null {
  const g = s.group ?? s.stage;
  if (!g) return null;
  return String(g).replace(/_/g, " ");
}

export async function fetchTable(
  code: string
): Promise<{ competition: string; groups: TableGroup[] }> {
  const json = await getJSON(`/competitions/${code}/standings`);
  const totals = (json.standings ?? []).filter((s: any) => s.type === "TOTAL");

  let groups: TableGroup[];
  if (totals.length <= 1) {
    groups = [{ name: null, rows: (totals[0]?.table ?? []).map(mapRow) }];
  } else {
    groups = totals.map((s: any) => ({
      name: prettyGroup(s),
      rows: (s.table ?? []).map(mapRow),
    }));
  }
  // drop empty groups (e.g. a tournament that hasn't started yet)
  groups = groups.filter((g) => g.rows.length > 0);

  return { competition: json.competition?.name ?? code, groups };
}

function mapMatch(m: any): Match {
  return {
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    matchday: m.matchday,
    stage: m.stage ? String(m.stage).replace(/_/g, " ") : null,
    competitionCode: m.competition?.code ?? null,
    competitionName: m.competition?.name ?? null,
    home: m.homeTeam?.shortName ?? m.homeTeam?.name ?? "TBD",
    away: m.awayTeam?.shortName ?? m.awayTeam?.name ?? "TBD",
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    homeScore: m.score?.fullTime?.home ?? null,
    awayScore: m.score?.fullTime?.away ?? null,
  };
}

export async function fetchResults(
  code: string
): Promise<{ competition: string; matches: Match[] }> {
  const json = await getJSON(`/competitions/${code}/matches`);
  const all: Match[] = (json.matches ?? []).map(mapMatch);
  const matches = all
    .filter((m) => ["FINISHED", "IN_PLAY", "PAUSED"].includes(m.status))
    .slice(-40)
    .reverse();
  return { competition: json.competition?.name ?? code, matches };
}

export async function fetchFixtures(
  code: string
): Promise<{ competition: string; matches: Match[] }> {
  const json = await getJSON(`/competitions/${code}/matches`);
  const all: Match[] = (json.matches ?? []).map(mapMatch);
  const matches = all
    .filter((m) => ["SCHEDULED", "TIMED"].includes(m.status))
    .slice(0, 40);
  return { competition: json.competition?.name ?? code, matches };
}

export function isLive(status: string): boolean {
  return status === "IN_PLAY" || status === "PAUSED";
}

// Cross-competition board: everything live RIGHT NOW plus matches within ±24h,
// across ALL competitions on the plan — so a World Cup or Champions League
// match surfaces even while the picker sits on a domestic league. Uses the
// free-tier /matches endpoint: ONE request (cached 60s) regardless of how many
// competitions are in play. The ±1 day window (not "today" UTC) avoids
// timezone gaps for evening kickoffs in the Americas.
export async function fetchLiveAndToday(): Promise<Match[]> {
  const DAY = 86_400_000;
  const fmt = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const now = Date.now();
  const json = await getJSON(
    `/matches?dateFrom=${fmt(now - DAY)}&dateTo=${fmt(now + DAY)}`
  );
  const all: Match[] = (json.matches ?? []).map(mapMatch);

  // live first, then upcoming by kickoff, then recently finished
  const rank = (m: Match) =>
    isLive(m.status) ? 0 : ["TIMED", "SCHEDULED"].includes(m.status) ? 1 : 2;

  return all
    .filter(
      (m) =>
        isLive(m.status) || Math.abs(new Date(m.utcDate).getTime() - now) <= DAY
    )
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    )
    .slice(0, 12);
}
