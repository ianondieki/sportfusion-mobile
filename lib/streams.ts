// Resolves a "Watch Live" source for a live event. Lookup order:
//   1. LIVE_STREAM_SOURCES[key] from lib/config.ts (your licensed/official source)
//   2. the free demo HLS stream, so the in-app player is always demoable.
//
// `key` is a football competition code ("PL", "CL"…) or "f1".

import { DEMO_STREAM_URL, LIVE_STREAM_SOURCES, type StreamSource } from "./config";

export interface WatchParams {
  // index signature keeps this assignable to expo-router's route params
  [key: string]: string | undefined;
  title: string;
  subtitle?: string;
  kind: "hls" | "web";
  url: string;
  demo?: "1";
}

export function resolveStream(key: string): { source: StreamSource; isDemo: boolean } {
  const mapped = LIVE_STREAM_SOURCES[key];
  if (mapped) return { source: mapped, isDemo: false };
  return { source: { kind: "hls", url: DEMO_STREAM_URL }, isDemo: true };
}

// Builds the params object for router.push({ pathname: "/watch", params }).
export function buildWatchParams(
  key: string,
  title: string,
  subtitle?: string
): WatchParams {
  const { source, isDemo } = resolveStream(key);
  return {
    title,
    subtitle,
    kind: source.kind,
    url: source.url,
    ...(isDemo ? { demo: "1" as const } : null),
  };
}
