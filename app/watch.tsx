// WATCH — match/event hub, opened by tapping any match row, WATCH button, or
// the chat's watch-live chip.
//
// What it shows depends on the event state and what's configured in
// LIVE_STREAM_SOURCES (lib/config.ts):
//   • live + mapped "hls"  → plays in-app via expo-video (fullscreen + PiP)
//   • live + mapped "web"  → official broadcaster handoff (opens browser/app)
//   • live + unmapped      → honest options: per-match "where to watch" lookup
//                            (finds the legal broadcaster for your region) and
//                            an explicit demo-player button
//   • upcoming             → kickoff time + where-to-watch lookup
//   • finished             → highlights search + where-it-aired lookup
//
// Rights-holders don't expose raw streams, so there is no universal free
// "play the match" URL — the per-match lookup is the legal route everywhere.

import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/themes";
import { whereToWatchUrl, highlightsUrl } from "../lib/streams";

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

const open = (url: string) => Linking.openURL(url).catch(() => {});

export default function WatchScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const title = asString(params.title) || "Match";
  const subtitle = asString(params.subtitle);
  const kind = asString(params.kind) === "web" ? "web" : "hls";
  const url = asString(params.url);
  const isDemo = asString(params.demo) === "1";
  const status = (asString(params.status) || "live") as
    | "live"
    | "upcoming"
    | "finished";
  const kickoff = asString(params.kickoff);

  // Demo player is opt-in, never pretending to be the real match.
  const [showDemoPlayer, setShowDemoPlayer] = useState(false);

  const chip =
    status === "live"
      ? { label: "LIVE", color: t.color.live }
      : status === "upcoming"
      ? { label: "UPCOMING", color: t.color.accent }
      : { label: "FULL TIME", color: t.color.textDim };

  const kickoffLabel = kickoff
    ? new Date(kickoff).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  let body: React.ReactNode;
  if (status === "live" && kind === "hls" && !isDemo) {
    body = <HlsPlayer url={url} styles={styles} />;
  } else if (status === "live" && kind === "web" && !isDemo) {
    body = (
      <OptionsCard
        styles={styles}
        t={t}
        icon="tv-outline"
        heading="Official broadcast"
        text="This event streams through its official rights-holder. Open it to watch with your account."
        actions={[
          { label: "OPEN OFFICIAL STREAM", icon: "open-outline", primary: true, onPress: () => open(url) },
          { label: "WHERE TO WATCH IN MY COUNTRY", icon: "search-outline", onPress: () => open(whereToWatchUrl(title, subtitle)) },
        ]}
      />
    );
  } else if (status === "live") {
    // live but no stream mapped for this competition
    body = showDemoPlayer ? (
      <HlsPlayer url={url} styles={styles} />
    ) : (
      <OptionsCard
        styles={styles}
        t={t}
        icon="radio-outline"
        heading="This match is live now"
        text="No stream is mapped for this competition yet. Find the legal broadcaster showing it in your country, or map a stream you're entitled to in lib/config.ts."
        actions={[
          { label: "WHERE TO WATCH IN MY COUNTRY", icon: "search-outline", primary: true, onPress: () => open(whereToWatchUrl(title, subtitle)) },
          { label: "OPEN DEMO PLAYER", icon: "play-outline", onPress: () => setShowDemoPlayer(true) },
        ]}
      />
    );
  } else if (status === "upcoming") {
    body = (
      <OptionsCard
        styles={styles}
        t={t}
        icon="time-outline"
        heading={kickoffLabel ? `Kicks off ${kickoffLabel}` : "Not started yet"}
        text="Check who's broadcasting it in your country so you're ready at kickoff."
        actions={[
          { label: "WHERE TO WATCH IN MY COUNTRY", icon: "search-outline", primary: true, onPress: () => open(whereToWatchUrl(title, subtitle)) },
          ...(kind === "web" && !isDemo
            ? [{ label: "OFFICIAL STREAMING PAGE", icon: "open-outline" as const, onPress: () => open(url) }]
            : []),
        ]}
      />
    );
  } else {
    body = (
      <OptionsCard
        styles={styles}
        t={t}
        icon="film-outline"
        heading="Match finished"
        text="Catch the highlights, or see where the replay is airing."
        actions={[
          { label: "WATCH HIGHLIGHTS", icon: "logo-youtube", primary: true, onPress: () => open(highlightsUrl(title, subtitle)) },
          { label: "FIND THE REPLAY", icon: "search-outline", onPress: () => open(whereToWatchUrl(title, subtitle)) },
        ]}
      />
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={26} color={t.color.text} />
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.liveRow}>
            <View style={[styles.liveDot, { backgroundColor: chip.color }]} />
            <Text style={[styles.liveLabel, { color: chip.color }]}>{chip.label}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {body}

      {isDemo && showDemoPlayer ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={t.color.textDim} />
          <Text style={styles.noticeText}>
            Demo stream — not the real match. Live sports video is licensed,
            so there's no free public feed. Map a source you're entitled to
            watch in LIVE_STREAM_SOURCES (lib/config.ts) and it plays here.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function HlsPlayer({ url, styles }: { url: string; styles: any }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });

  return (
    <View style={styles.playerBox}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="contain"
        allowsFullscreen
        allowsPictureInPicture
        nativeControls
      />
    </View>
  );
}

type Action = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
};

function OptionsCard({
  styles,
  t,
  icon,
  heading,
  text,
  actions,
}: {
  styles: any;
  t: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  heading: string;
  text: string;
  actions: Action[];
}) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={44} color={t.color.accent} />
      <Text style={styles.cardTitle}>{heading}</Text>
      <Text style={styles.cardBody}>{text}</Text>
      {actions.map((a) => (
        <Pressable
          key={a.label}
          style={[styles.btn, a.primary ? styles.btnPrimary : styles.btnGhost]}
          onPress={a.onPress}
        >
          <Ionicons
            name={a.icon}
            size={18}
            color={a.primary ? t.color.onAccent : t.color.accent}
          />
          <Text
            style={[
              styles.btnText,
              { color: a.primary ? t.color.onAccent : t.color.accent },
            ]}
          >
            {a.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { flex: 1, backgroundColor: t.color.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(3),
      paddingHorizontal: t.space(3),
      paddingBottom: t.space(3),
    },
    headerText: { flex: 1 },
    liveRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    liveDot: { width: 7, height: 7, borderRadius: 4 },
    liveLabel: {
      fontFamily: t.font.bodyMed,
      fontSize: 10,
      letterSpacing: 2,
    },
    title: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 22,
      letterSpacing: 0.5,
    },
    subtitle: { color: t.color.textDim, fontFamily: t.font.body, fontSize: 12 },

    playerBox: {
      marginHorizontal: t.space(3),
      borderRadius: t.radius.md,
      overflow: "hidden",
      backgroundColor: "#000",
      aspectRatio: 16 / 9,
    },
    video: { width: "100%", height: "100%" },

    card: {
      marginHorizontal: t.space(3),
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      backgroundColor: t.color.surface,
      alignItems: "center",
      gap: t.space(2),
      paddingVertical: t.space(7),
      paddingHorizontal: t.space(5),
    },
    cardTitle: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 0.5,
      textAlign: "center",
    },
    cardBody: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: t.space(2),
    },
    btn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space(5),
      paddingVertical: t.space(3),
      alignSelf: "stretch",
    },
    btnPrimary: { backgroundColor: t.color.accent },
    btnGhost: { borderWidth: 1, borderColor: t.color.accent },
    btnText: { fontFamily: t.font.bodyMed, fontSize: 12, letterSpacing: 1 },

    notice: {
      flexDirection: "row",
      gap: 8,
      marginTop: t.space(3),
      marginHorizontal: t.space(3),
      padding: t.space(3),
      borderRadius: t.radius.md,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
    },
    noticeText: {
      flex: 1,
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 12,
      lineHeight: 17,
    },
  });
