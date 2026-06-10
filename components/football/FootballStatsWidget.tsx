import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import { isLive, type Match } from "../../lib/api/football";
import { fetchLatestStats, type MatchStats } from "../../lib/api/apiFootball";
import Crest from "./Crest";

// Football spotlight. If an API-Football key is set AND returns stats for the
// competition's latest fixture, shows a full stats grid (possession, shots,
// fouls). Otherwise falls back to a real score-only spotlight from
// football-data.org — never fabricated.
export default function FootballStatsWidget({
  match,
  competition,
  competitionCode,
}: {
  match: Match | null;
  competition: string;
  competitionCode: string;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [stats, setStats] = useState<MatchStats | null>(null);

  useEffect(() => {
    let active = true;
    fetchLatestStats(competitionCode)
      .then((s) => {
        if (active) setStats(s);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [competitionCode]);

  // --- rich card from API-Football (real stats) ---
  if (stats) {
    return (
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.competition}>{competition?.toUpperCase()}</Text>
          <View style={styles.statusTag}>
            <Text style={styles.statusText}>{stats.statusLabel}</Text>
          </View>
        </View>

        <View style={styles.scoreRow}>
          <View style={styles.side}>
            <Crest uri={stats.homeLogo} name={stats.home} size={40} />
            <Text style={styles.teamName} numberOfLines={2}>
              {stats.home}
            </Text>
          </View>
          <Text style={styles.score}>{stats.score}</Text>
          <View style={styles.side}>
            <Crest uri={stats.awayLogo} name={stats.away} size={40} />
            <Text style={styles.teamName} numberOfLines={2}>
              {stats.away}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.stats.map((s, i) => (
            <View key={i} style={styles.statRow}>
              <Text style={styles.statValue}>{s.home}</Text>
              <Text style={styles.statMetric}>{s.metric}</Text>
              <Text style={styles.statValue}>{s.away}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.source}>match stats via API-Football</Text>
      </Animated.View>
    );
  }

  // --- fallback: real score-only spotlight from football-data.org ---
  if (!match) return null;
  const live = isLive(match.status);
  const done = match.status === "FINISHED";
  const kickoff = new Date(match.utcDate);
  const dateLabel = kickoff.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const statusLabel = live
    ? "LIVE"
    : done
    ? "FULL TIME"
    : kickoff.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const scoreText =
    match.homeScore != null && match.awayScore != null
      ? `${match.homeScore} – ${match.awayScore}`
      : "vs";

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.competition}>{competition?.toUpperCase()}</Text>
        <View
          style={[
            styles.statusTag,
            { backgroundColor: live ? t.color.live : t.color.surfaceAlt },
          ]}
        >
          <Text
            style={[styles.statusText, { color: live ? "#04210F" : t.color.textDim }]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {match.stage ? <Text style={styles.stage}>{match.stage}</Text> : null}

      <View style={styles.scoreRow}>
        <View style={styles.side}>
          <Crest uri={match.homeCrest} name={match.home} size={40} />
          <Text style={styles.teamName} numberOfLines={2}>
            {match.home}
          </Text>
        </View>
        <Text style={styles.score}>{scoreText}</Text>
        <View style={styles.side}>
          <Crest uri={match.awayCrest} name={match.away} size={40} />
          <Text style={styles.teamName} numberOfLines={2}>
            {match.away}
          </Text>
        </View>
      </View>

      <Text style={styles.date}>{dateLabel}</Text>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      backgroundColor: t.color.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      padding: t.space(4),
      marginBottom: t.space(3),
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: t.space(2),
    },
    competition: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
    },
    statusTag: {
      backgroundColor: t.color.surfaceAlt,
      borderRadius: t.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    statusText: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 9,
      letterSpacing: 1,
    },
    stage: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 10,
      letterSpacing: 1.5,
      marginBottom: t.space(3),
    },
    scoreRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: t.space(2),
    },
    side: { flex: 1, alignItems: "center", gap: t.space(2) },
    teamName: {
      color: t.color.text,
      fontFamily: t.font.bodyMed,
      fontSize: 14,
      textAlign: "center",
    },
    score: {
      color: t.color.accent,
      fontFamily: t.font.display,
      fontSize: 34,
      lineHeight: 38,
    },
    date: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 12,
      textAlign: "center",
      marginTop: t.space(3),
    },
    statsGrid: {
      marginTop: t.space(4),
      gap: t.space(2),
      borderTopWidth: 1,
      borderTopColor: t.color.borderSolid,
      paddingTop: t.space(3),
    },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    statValue: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 16,
      width: 56,
      textAlign: "center",
    },
    statMetric: {
      flex: 1,
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 12,
      textAlign: "center",
      letterSpacing: 0.5,
    },
    source: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 10,
      textAlign: "center",
      marginTop: t.space(3),
      fontStyle: "italic",
    },
  });
