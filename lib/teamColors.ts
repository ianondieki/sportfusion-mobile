// Maps Ergast/Jolpica constructorId -> brand colour, used as a left accent bar
// on each standings row. Unknown IDs (the grid shifts season to season) fall
// back to the F1 red so nothing ever renders colourless.

const TEAM_COLORS: Record<string, string> = {
  red_bull: "#3671C6",
  ferrari: "#E8002D",
  mercedes: "#27F4D2",
  mclaren: "#FF8000",
  aston_martin: "#229971",
  alpine: "#0093CC",
  williams: "#64C4FF",
  rb: "#6692FF",
  racing_bulls: "#6692FF",
  sauber: "#52E252",
  kick_sauber: "#52E252",
  audi: "#52E252",
  haas: "#B6BABD",
  cadillac: "#C0A062",
};

export function teamColor(constructorId?: string): string {
  if (!constructorId) return "#E10600";
  return TEAM_COLORS[constructorId] ?? "#E10600";
}
