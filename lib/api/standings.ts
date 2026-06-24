import { API_BASE } from "../config";
import type { DriverStanding, ErgastStandingsResponse } from "../types";

// Fetches the current season's driver standings. All network + parsing lives
// here so the screen only ever deals with a clean DriverStanding[].
//
// API_BASE ships pointed at Jolpica (https://api.jolpi.ca/ergast/f1), the
// actively-maintained, Ergast-compatible replacement for the retired Ergast
// API. Jolpica rate-limits per IP (~4 req/s burst, 500/day sustained), so we
// keep a short response cache to avoid re-hitting it on every tab mount or
// pull-to-refresh, and a timeout so a stalled mobile connection can't leave the
// Standings tab spinning forever.
//
// NOTE: Jolpica intends to eventually retire the "/ergast" compatibility prefix
// in favour of its native "/f1" path. If standings ever start 404ing, drop the
// "/ergast" segment from API_BASE in lib/config.ts.

const CACHE_TTL = 60_000; // ms — one fetch covers rapid tab/refresh churn
const TIMEOUT_MS = 10_000;

let cache: { expires: number; data: DriverStanding[] } | null = null;

async function getJSON(url: string): Promise<ErgastStandingsResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`Standings request failed (${res.status})`);
    }
    return (await res.json()) as ErgastStandingsResponse;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Standings request timed out");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchDriverStandings(): Promise<DriverStanding[]> {
  if (cache && cache.expires > Date.now()) return cache.data;

  const json = await getJSON(`${API_BASE}/current/driverStandings/?format=json`);
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  const data = list?.DriverStandings ?? [];

  cache = { expires: Date.now() + CACHE_TTL, data };
  return data;
}
