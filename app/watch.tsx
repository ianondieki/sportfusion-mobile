// WATCH LIVE — in-app player for live events.
//
// Two source kinds (see LIVE_STREAM_SOURCES in lib/config.ts):
//   • "hls" — plays inside the app via expo-video (fullscreen + PiP capable).
//   • "web" — official broadcaster page; rights-holders don't expose raw
//     streams, so we hand off to the browser/app where the user is logged in.

import { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/themes";

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default function WatchScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const title = asString(params.title) || "Live event";
  const subtitle = asString(params.subtitle);
  const kind = asString(params.kind) === "web" ? "web" : "hls";
  const url = asString(params.url);
  const isDemo = asString(params.demo) === "1";

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={26} color={t.color.text} />
        </Pressable>
        <View style={styles.headerText}>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>WATCH LIVE</Text>
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

      {kind === "hls" ? (
        <HlsPlayer url={url} styles={styles} />
      ) : (
        <WebHandoff url={url} styles={styles} accent={t.color.accent} onAccent={t.color.onAccent} />
      )}

      {isDemo ? (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={16} color={t.color.textDim} />
          <Text style={styles.noticeText}>
            Demo stream — live sports video is licensed, so there's no free
            public feed for this event. Map a source you're entitled to watch
            in LIVE_STREAM_SOURCES (lib/config.ts) and it plays here instead.
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

function WebHandoff({
  url,
  styles,
  accent,
  onAccent,
}: {
  url: string;
  styles: any;
  accent: string;
  onAccent: string;
}) {
  return (
    <View style={styles.handoff}>
      <Ionicons name="tv-outline" size={44} color={accent} />
      <Text style={styles.handoffTitle}>Official broadcast</Text>
      <Text style={styles.handoffBody}>
        This event streams through its official rights-holder. We'll open it
        so you can watch with your account.
      </Text>
      <Pressable
        style={[styles.handoffBtn, { backgroundColor: accent }]}
        onPress={() => Linking.openURL(url).catch(() => {})}
      >
        <Ionicons name="open-outline" size={18} color={onAccent} />
        <Text style={[styles.handoffBtnText, { color: onAccent }]}>OPEN STREAM</Text>
      </Pressable>
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
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.color.live },
    liveLabel: {
      color: t.color.live,
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

    handoff: {
      marginHorizontal: t.space(3),
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      backgroundColor: t.color.surface,
      alignItems: "center",
      gap: t.space(2),
      paddingVertical: t.space(8),
      paddingHorizontal: t.space(5),
    },
    handoffTitle: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 0.5,
    },
    handoffBody: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },
    handoffBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space(5),
      paddingVertical: t.space(3),
      marginTop: t.space(2),
    },
    handoffBtnText: { fontFamily: t.font.bodyMed, fontSize: 13, letterSpacing: 1.5 },

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
