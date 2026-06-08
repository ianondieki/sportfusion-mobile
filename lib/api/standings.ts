import { API_BASE } from "../config";
import type { DriverStanding, ErgastStandingsResponse } from "../types";

// Fetches the current season's driver standings. All network + parsing lives
// here so the screen only ever deals with a clean DriverStanding[].
export async function fetchDriverStandings(): Promise<DriverStanding[]> {
  const res = await fetch(`${API_BASE}/current/driverStandings/?format=json`);
  if (!res.ok) {
    throw new Error(`Standings request failed (${res.status})`);
  }
  const json = (await res.json()) as ErgastStandingsResponse;
  const list = json?.MRData?.StandingsTable?.StandingsLists?.[0];
  return list?.DriverStandings ?? [];
}
