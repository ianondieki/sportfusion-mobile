import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";

export default function FootballStatsWidget({
  homeTeam,
  awayTeam,
  score,
  time,
  stats,
}: {
  homeTeam: string;
  awayTeam: string;
  score: string;
  time: string;
  stats: {
    metric: string;
    home: number | string;
    away: number | string;
    insight: string;
  }[];
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <Animated.View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>MATCH LIVE</Text>
        <View style={styles.scoreBoard}>
          <Text style={styles.teamName} numberOfLines={1}>
            {homeTeam}
          </Text>
          <Text style={styles.score}>{score}</Text>
          <Text style={styles.teamName} numberOfLines={1}>
            {awayTeam}
          </Text>
        </View>
        <Text style={styles.matchTime}>{time}'</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{s.home}</Text>
              <Text style={styles.statLabel}>{s.metric}</Text>
            </View>
            <Text style={styles.statDivider}>·</Text>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{s.away}</Text>
            </View>
            <Text style={styles.statInsight}>{s.insight}</Text>
          </View>
        ))}
      </View>

      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>💥 Match Momentum</Text>
        <Text style={styles.insightText}>
          Watch for tactical shifts in the final 20 minutes — both teams pushing hard.
        </Text>
      </View>
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
    header: { alignItems: "center", marginBottom: t.space(3) },
    title: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 2,
      marginBottom: t.space(2),
    },
    scoreBoard: {
      alignItems: "center",
      gap: t.space(2),
    },
    teamName: {
      color: t.color.text,
      fontFamily: t.font.bodyMed,
      fontSize: 14,
      maxWidth: 80,
    },
    score: {
      color: t.color.accent,
      fontFamily: t.font.display,
      fontSize: 32,
      lineHeight: 36,
    },
    matchTime: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 13,
      marginTop: t.space(1),
    },
    statsGrid: { gap: t.space(2), marginBottom: t.space(3) },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.color.surfaceAlt,
      borderRadius: t.radius.md,
      padding: t.space(2),
      gap: t.space(2),
    },
    statItem: { alignItems: "center", flex: 0.3 },
    statValue: {
      color: t.color.accent,
      fontFamily: t.font.display,
      fontSize: 18,
    },
    statLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 10,
    },
    statDivider: { color: t.color.borderSolid, fontSize: 16 },
    statInsight: {
      flex: 1,
      color: t.color.text,
      fontFamily: t.font.body,
      fontSize: 12,
      lineHeight: 16,
    },
    insightBox: {
      backgroundColor: t.color.bg,
      borderRadius: t.radius.md,
      padding: t.space(3),
    },
    insightTitle: {
      color: t.color.accent,
      fontFamily: t.font.bodyMed,
      fontSize: 12,
      letterSpacing: 1,
      marginBottom: t.space(1),
    },
    insightText: {
      color: t.color.text,
      fontFamily: t.font.body,
      fontSize: 13,
      lineHeight: 18,
    },
  });
