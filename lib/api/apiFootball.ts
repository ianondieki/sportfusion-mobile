// API-Football (api-sports.io) — OPTIONAL real match statistics.
// Purely additive: returns null whenever a key is absent, the season is blocked
// on the free tier, or no stats exist — and the spotlight falls back to the
// real score-only card. Never throws into the UI.

import { APIFOOTBALL_API_KEY } from "../config";

const BASE = "https://v3.football.api-sports.io";

// our competition codes -> API-Football league IDs
const LEAGUE_IDS: Record<string, number> = {
  PL: 39,
  PD: 140,
  SA: 135,
  BL1: 78,
  FL1: 61,
  CL: 2,
  WC: 1,
};

// API-Football seasons use the START year. World Cup 2026 is season 2026.
function seasonFor(code: string): number {
  if (code === "WC") return 2026;
  const now = new Date();
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
}

export interface StatRow {
  metric: string;
  home: string;
  away: string;
}

export interface MatchStats {
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  score: string;
  statusLabel: string;
  stats: StatRow[];
}

const cache = new Map<string, { expires: number; value: MatchStats | null }>();
const TTL = 5 * 60 * 1000; // 5 min — keeps us well under 100 req/day

async function af(path: string): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "x-apisports-key": APIFOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`API-Football ${res.status}`);
  const json = await res.json();
  // API-Football reports plan/season errors in json.errors even on HTTP 200
  const errs = json.errors;
  const hasErr =
    errs &&
    ((Array.isArray(errs) && errs.length > 0) ||
      (typeof errs === "object" && Object.keys(errs).length > 0));
  if (hasErr) throw new Error("api-football-error");
  return json;
}

const pick = (stats: any[], type: string) =>
  stats.find((x: any) => x.type === type)?.value;

export async function fetchLatestStats(code: string): Promise<MatchStats | null> {
  if (!APIFOOTBALL_API_KEY) return null;
  const leagueId = LEAGUE_IDS[code];
  if (!leagueId) return null;

  const season = seasonFor(code);
  const cacheKey = `${code}:${season}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  let result: MatchStats | null = null;
  try {
    const fx = await af(`/fixtures?league=${leagueId}&season=${season}&last=1`);
    const fixture = fx.response?.[0];
    if (fixture) {
      const id = fixture.fixture?.id;
      const gh = fixture.goals?.home;
      const ga = fixture.goals?.away;
      const base = {
        home: fixture.teams?.home?.name ?? "Home",
        away: fixture.teams?.away?.name ?? "Away",
        homeLogo: fixture.teams?.home?.logo ?? null,
        awayLogo: fixture.teams?.away?.logo ?? null,
        score: gh != null && ga != null ? `${gh} – ${ga}` : "vs",
        statusLabel:
          fixture.fixture?.status?.short === "FT"
            ? "FULL TIME"
            : fixture.fixture?.status?.short ?? "",
      };

      let stats: StatRow[] = [];
      if (id) {
        const st = await af(`/fixtures/statistics?fixture=${id}`);
        const homeStats = st.response?.[0]?.statistics ?? [];
        const awayStats = st.response?.[1]?.statistics ?? [];
        const row = (metric: string, type: string): StatRow => ({
          metric,
          home: String(pick(homeStats, type) ?? "—"),
          away: String(pick(awayStats, type) ?? "—"),
        });
        stats = [
          row("Possession", "Ball Possession"),
          row("Shots on target", "Shots on Goal"),
          row("Total shots", "Total Shots"),
          row("Fouls", "Fouls"),
        ].filter((r) => r.home !== "—" || r.away !== "—");
      }

      result = stats.length ? { ...base, stats } : null;
    }
  } catch {
    result = null; // free-tier season block, no key, rate limit, etc. → fallback
  }

  cache.set(cacheKey, { expires: Date.now() + TTL, value: result });
  return result;
}
