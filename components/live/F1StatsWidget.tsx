import { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";

interface Driver {
  position: number;
  name: string;
  team: string;
  gap: string;
  tireCompound: string;
  tireAge: string;
}

export default function F1StatsWidget({
  drivers,
  insight1,
  insight2,
}: {
  drivers: Driver[];
  insight1: string;
  insight2: string;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const topDrivers = drivers.slice(0, 5);

  const tireColor = (compound: string) => {
    if (compound.includes("SOFT")) return t.color.accent;
    if (compound.includes("MEDIUM")) return "#FFC300";
    if (compound.includes("HARD")) return "#F0F0F0";
    if (compound.includes("INTER")) return "#43B02A";
    if (compound.includes("WET")) return "#0067AD";
    return t.color.surfaceAlt;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RACE LIVE</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.leaderboardScroll}
      >
        {topDrivers.map((d) => (
          <View
            key={d.position}
            style={[
              styles.driverCard,
              d.position === 1 && styles.driverCardLeader,
            ]}
          >
            <Text style={styles.position}>{d.position}</Text>
            <Text style={styles.driverName}>{d.name}</Text>
            <Text style={styles.team}>{d.team}</Text>
            {d.gap ? <Text style={styles.gap}>{d.gap}</Text> : null}
            {d.tireCompound ? (
              <View
                style={[styles.tireTag, { backgroundColor: tireColor(d.tireCompound) }]}
              >
                <Text style={styles.tireText}>{d.tireCompound}</Text>
              </View>
            ) : null}
            {d.tireAge ? <Text style={styles.small}>{d.tireAge}</Text> : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.insightsBox}>
        <Text style={styles.insightLabel}>⚡ Pace & Tire Strategy</Text>
        <Text style={styles.insight}>{insight1}</Text>
        <Text style={[styles.insightLabel, { marginTop: 8 }]}>
          🏁 Race Momentum
        </Text>
        <Text style={styles.insight}>{insight2}</Text>
      </View>
    </View>
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
    title: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 2,
      marginBottom: t.space(3),
    },
    leaderboardScroll: {
      gap: t.space(2),
      paddingRight: t.space(2),
      marginBottom: t.space(3),
    },
    driverCard: {
      backgroundColor: t.color.surfaceAlt,
      borderRadius: t.radius.md,
      padding: t.space(3),
      minWidth: 110,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
    },
    driverCardLeader: {
      borderColor: t.color.accent,
      borderWidth: 2,
    },
    position: {
      color: t.color.accent,
      fontFamily: t.font.display,
      fontSize: 22,
      lineHeight: 24,
    },
    driverName: {
      color: t.color.text,
      fontFamily: t.font.bodyMed,
      fontSize: 14,
      marginTop: t.space(1),
    },
    team: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 11,
    },
    gap: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 12,
      marginTop: t.space(1),
    },
    tireTag: {
      alignSelf: "flex-start",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: t.radius.pill,
      marginTop: t.space(1),
    },
    tireText: {
      color: "#000",
      fontFamily: t.font.bodyMed,
      fontSize: 10,
      fontWeight: "600",
    },
    small: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 10,
      marginTop: t.space(1),
    },
    insightsBox: {
      backgroundColor: t.color.bg,
      borderRadius: t.radius.md,
      padding: t.space(3),
      gap: t.space(2),
    },
    insightLabel: {
      color: t.color.accent,
      fontFamily: t.font.bodyMed,
      fontSize: 12,
      letterSpacing: 1,
    },
    insight: {
      color: t.color.text,
      fontFamily: t.font.body,
      fontSize: 13,
      lineHeight: 18,
    },
  });
