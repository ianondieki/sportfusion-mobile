// Finds events that are live RIGHT NOW for the active sport, powering the
// "Watch live" suggestion chip in the chat tab. Best-effort: any API hiccup
// (missing key, rate limit, offline) returns [] and the chip simply stays
// hidden. Reuses the cached fetchers, so this costs no extra rate budget when
// the Live tab has already loaded.

import { fetchLiveAndToday, isLive } from "./api/football";
import { fetchLatestSession } from "./api/openf1";

export interface LiveEvent {
  // key into LIVE_STREAM_SOURCES: a competition code ("PL") or "f1"
  streamKey: string;
  title: string;
  subtitle?: string;
}

export async function findLiveEvents(
  sport: "f1" | "football",
  competition: string
): Promise<LiveEvent[]> {
  try {
    if (sport === "football") {
      // scan ALL competitions, not just the picker's selection — a live World
      // Cup match should surface even while the picker sits on the PL
      const matches = await fetchLiveAndToday();
      return matches
        .filter((m) => isLive(m.status))
        .slice(0, 3)
        .map((m) => ({
          streamKey: m.competitionCode ?? competition,
          title: `${m.home} vs ${m.away}`,
          subtitle: m.competitionName ?? undefined,
        }));
    }

    const session = await fetchLatestSession();
    if (session.isLive) {
      return [
        {
          streamKey: "f1",
          title: session.session.session_name,
          subtitle: `${session.session.country_name} · ${session.session.circuit_short_name}`,
        },
      ];
    }
    return [];
  } catch {
    return [];
  }
}
