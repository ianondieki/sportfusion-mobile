// Curated football-data.org competitions for the picker. All reachable on the
// free tier with a token. "cup" competitions have group stages / knockouts, so
// their standings come back as multiple group tables (handled in the table UI).

export type CompKind = "league" | "cup";

export interface Competition {
  code: string;
  label: string; // full name (picker + header)
  kind: CompKind;
}

export const COMPETITIONS: Competition[] = [
  { code: "PL", label: "Premier League", kind: "league" },
  { code: "PD", label: "La Liga", kind: "league" },
  { code: "SA", label: "Serie A", kind: "league" },
  { code: "BL1", label: "Bundesliga", kind: "league" },
  { code: "FL1", label: "Ligue 1", kind: "league" },
  { code: "CL", label: "Champions League", kind: "cup" },
  { code: "WC", label: "World Cup 2026", kind: "cup" },
];

export const DEFAULT_COMPETITION = "PL";

export function isCup(code: string): boolean {
  return COMPETITIONS.find((c) => c.code === code)?.kind === "cup";
}
