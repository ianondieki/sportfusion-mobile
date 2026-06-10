// OpenF1 (https://openf1.org) — free historical F1 data (2023+), no auth.
// We use it to show the most recent real session: who finished where, with
// official team colours. `session_key=latest` always targets the newest session.
//
// Note: OpenF1's *real-time* (during-session) feed now needs a paid plan, so the
// free data reliably reflects the latest *completed* session. We surface a LIVE
// badge if a session is currently in progress, otherwise "Latest session".

const OPENF1 = "https://api.openf1.org/v1";

export interface F1Session {
  session_key: number;
  meeting_key: number;
  session_name: string; // "Race" | "Qualifying" | "Sprint" | "Practice 1" ...
  session_type: string;
  country_name: string;
  circuit_short_name: string;
  location: string;
  date_start: string;
  date_end: string;
  year: number;
}

interface F1Driver {
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string | null;
  team_colour: string | null; // "RRGGBB" (no '#'), may be null
}

interface F1Position {
  driver_number: number;
  position: number;
  date: string;
}

export interface RaceEntry {
  position: number;
  driver_number: number;
  fullName: string;
  acronym: string;
  team: string;
  colour: string; // "#RRGGBB"
  gap?: string; // "+1.234s" | "+1 LAP" | "—" (real, from intervals)
  compound?: string; // "SOFT" | "MEDIUM" | "HARD" ... (real, from stints)
  tireAge?: string; // e.g. "12 laps" (real, from stints)
}

export interface LatestSession {
  session: F1Session;
  isLive: boolean;
  entries: RaceEntry[];
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenF1 request failed (${res.status})`);
  return (await res.json()) as T;
}

interface F1Stint {
  driver_number: number;
  stint_number: number;
  compound: string | null;
  lap_start: number;
  lap_end: number;
  tyre_age_at_start: number;
}

interface F1Interval {
  driver_number: number;
  gap_to_leader: number | string | null;
  date: string;
}

function formatGap(g: number | string | null | undefined): string {
  if (g == null) return "—";
  if (typeof g === "string") return g; // e.g. "+1 LAP"
  if (g === 0) return "LEADER";
  return `+${g.toFixed(3)}s`;
}

export async function fetchLatestSession(): Promise<LatestSession> {
  // 1) the latest session's metadata
  const sessions = await getJSON<F1Session[]>(`${OPENF1}/sessions?session_key=latest`);
  const session = sessions[sessions.length - 1];
  if (!session) throw new Error("No session found");

  // 2) drivers (names, acronyms, team colours) + 3) position changes, in parallel
  const [drivers, positions] = await Promise.all([
    getJSON<F1Driver[]>(`${OPENF1}/drivers?session_key=latest`),
    getJSON<F1Position[]>(`${OPENF1}/position?session_key=latest`),
  ]);

  // 4) tire stints + 5) intervals — best-effort (only present for race sessions,
  //    and intervals can be large), so each is wrapped so a failure degrades
  //    gracefully to "no tire/gap data" rather than breaking the screen.
  const [stints, intervals] = await Promise.all([
    getJSON<F1Stint[]>(`${OPENF1}/stints?session_key=latest`).catch(() => []),
    getJSON<F1Interval[]>(`${OPENF1}/intervals?session_key=latest`).catch(() => []),
  ]);

  // reduce position changes to the most recent position per driver
  const latest = new Map<number, F1Position>();
  for (const p of positions) {
    const cur = latest.get(p.driver_number);
    if (!cur || p.date > cur.date) latest.set(p.driver_number, p);
  }

  // last stint per driver (highest stint_number) → real compound + tire age
  const lastStint = new Map<number, F1Stint>();
  for (const s of stints) {
    const cur = lastStint.get(s.driver_number);
    if (!cur || s.stint_number > cur.stint_number) lastStint.set(s.driver_number, s);
  }

  // latest interval per driver → real gap to leader
  const lastGap = new Map<number, F1Interval>();
  for (const iv of intervals) {
    const cur = lastGap.get(iv.driver_number);
    if (!cur || iv.date > cur.date) lastGap.set(iv.driver_number, iv);
  }

  const entries: RaceEntry[] = drivers
    .map((d) => {
      const stint = lastStint.get(d.driver_number);
      const tireLaps = stint
        ? stint.tyre_age_at_start + (stint.lap_end - stint.lap_start)
        : undefined;
      return {
        position: latest.get(d.driver_number)?.position ?? 999,
        driver_number: d.driver_number,
        fullName: d.full_name,
        acronym: d.name_acronym,
        team: d.team_name ?? "—",
        colour: d.team_colour ? `#${d.team_colour}` : "#E10600",
        gap: lastGap.has(d.driver_number)
          ? formatGap(lastGap.get(d.driver_number)!.gap_to_leader)
          : undefined,
        compound: stint?.compound ? stint.compound.toUpperCase() : undefined,
        tireAge: tireLaps != null ? `${tireLaps} laps` : undefined,
      };
    })
    .sort((a, b) => a.position - b.position);

  const now = Date.now();
  const isLive =
    now >= Date.parse(session.date_start) && now <= Date.parse(session.date_end);

  return { session, isLive, entries };
}

/* ----------------------- Season schedule (calendar) ---------------------- */

export interface RaceMeeting {
  round: number;
  meeting_key: number;
  gp: string; // country name, e.g. "Bahrain"
  circuit: string;
  date: string; // ISO date_start of the Race session
}

export interface SeasonSchedule {
  year: number;
  races: RaceMeeting[];
  nextIndex: number; // index of the next upcoming race, or -1 if season is done
}

interface F1RaceSession {
  meeting_key: number;
  country_name: string;
  circuit_short_name: string;
  date_start: string;
  year: number;
  session_name: string;
}

// Pulls every "Race" session for the current season and marks the next one.
export async function fetchSeasonRaces(): Promise<SeasonSchedule> {
  const year = new Date().getFullYear();
  const sessions = await getJSON<F1RaceSession[]>(
    `${OPENF1}/sessions?year=${year}&session_name=Race`
  );

  const races: RaceMeeting[] = sessions
    .map((s) => ({
      meeting_key: s.meeting_key,
      gp: s.country_name,
      circuit: s.circuit_short_name,
      date: s.date_start,
      round: 0,
    }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .map((r, i) => ({ ...r, round: i + 1 }));

  const now = Date.now();
  const nextIndex = races.findIndex((r) => Date.parse(r.date) > now);

  return { year, races, nextIndex };
}
