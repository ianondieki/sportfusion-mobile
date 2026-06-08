import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  LinearTransition,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
} from "react-native-reanimated";
import { fetchDriverStandings } from "../../lib/api/standings";
import type { DriverStanding } from "../../lib/types";
import { teamColor } from "../../lib/teamColors";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import ThemePicker from "../../components/ThemePicker";
import SportSwitcher from "../../components/SportSwitcher";
import { useSport } from "../../lib/sport-context";
import FootballTable from "../../components/football/FootballTable";

type Status = "loading" | "ready" | "error";

export default function StandingsScreen() {
  const { sport } = useSport();
  return sport === "football" ? <FootballTable /> : <F1Standings />;
}

function F1Standings() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 52;

  const [status, setStatus] = useState<Status>("loading");
  const [rows, setRows] = useState<DriverStanding[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setStatus("loading");
    try {
      const data = await fetchDriverStandings();
      setRows(data);
      setStatus("ready");
    } catch (e) {
      console.warn(e);
      setStatus("error");
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  if (status === "loading") return <SkeletonList topPad={topPad} />;

  if (status === "error") {
    return (
      <View style={[styles.centered, { paddingTop: topPad }]}>
        <Ionicons name="warning-outline" size={48} color={t.color.accent} />
        <Text style={styles.errorTitle}>Couldn’t load standings</Text>
        <Text style={styles.dim}>Check your connection and try again.</Text>
        <Pressable style={styles.retry} onPress={() => load()}>
          <Text style={styles.retryText}>RETRY</Text>
        </Pressable>
      </View>
    );
  }

  const leaderPoints = Number(rows[0]?.points ?? 0) || 1;

  return (
    <Animated.FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingTop: topPad }]}
      data={rows}
      keyExtractor={(item) => item.Driver.driverId}
      itemLayoutAnimation={LinearTransition.springify().damping(18)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.color.accent}
          progressViewOffset={topPad}
        />
      }
      ListHeaderComponent={<Header leader={rows[0]} />}
      renderItem={({ item, index }) => (
        <Row item={item} index={index} leaderPoints={leaderPoints} />
      )}
    />
  );
}

/* ----------------------------- Header / hero ----------------------------- */

function Header({ leader }: { leader?: DriverStanding }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  if (!leader) return null;
  const accent = teamColor(leader.Constructors[0]?.constructorId);
  return (
    <View style={styles.header}>
      <SportSwitcher />
      <ThemePicker />

      <Animated.Text entering={FadeIn.duration(500)} style={styles.kicker}>
        2026 · DRIVERS’ CHAMPIONSHIP
      </Animated.Text>

      <Animated.View
        entering={FadeInUp.delay(80).duration(600).springify().damping(16)}
        style={styles.heroCard}
      >
        <LinearGradient
          colors={[accent + "55", accent + "0D", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.heroEdge, { backgroundColor: accent }]} />
        <View style={styles.heroBody}>
          <View style={styles.crownRow}>
            <Ionicons name="trophy" size={13} color={t.color.gold} />
            <Text style={styles.crownText}>CHAMPIONSHIP LEADER</Text>
          </View>
          <Text style={styles.heroGiven}>{leader.Driver.givenName}</Text>
          <Text style={styles.heroFamily}>
            {leader.Driver.familyName.toUpperCase()}
          </Text>
          <Text style={styles.heroTeam}>{leader.Constructors[0]?.name}</Text>
        </View>
        <View style={styles.heroPts}>
          <Text style={[styles.heroPtsNum, { color: accent }]}>
            {leader.points}
          </Text>
          <Text style={styles.heroPtsLabel}>POINTS</Text>
        </View>
      </Animated.View>

      <Text style={styles.tableLabel}>FULL STANDINGS</Text>
    </View>
  );
}

/* --------------------------------- Row ----------------------------------- */

function Row({
  item,
  index,
  leaderPoints,
}: {
  item: DriverStanding;
  index: number;
  leaderPoints: number;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const constructor = item.Constructors[0];
  const accent = teamColor(constructor?.constructorId);
  const fraction = Math.max(0.04, Number(item.points) / leaderPoints);

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fill = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(
      Math.min(index, 12) * 45 + 250,
      withTiming(fraction * 100, { duration: 750, easing: Easing.out(Easing.cubic) })
    );
  }, [fraction, index]);
  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value}%` }));

  return (
    <Pressable
      onPressIn={() => (scale.value = withSpring(0.975, { damping: 18 }))}
      onPressOut={() => (scale.value = withSpring(1, { damping: 14 }))}
    >
      <Animated.View
        entering={FadeInDown.delay(Math.min(index, 12) * 45)
          .duration(420)
          .springify()
          .damping(16)}
        style={[styles.row, pressStyle]}
      >
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <Text style={styles.pos}>{item.positionText}</Text>

        <View style={styles.nameBlock}>
          <Text style={styles.given} numberOfLines={1}>
            {item.Driver.givenName}
          </Text>
          <View style={styles.familyRow}>
            <Text style={styles.family} numberOfLines={1}>
              {item.Driver.familyName.toUpperCase()}
            </Text>
            {item.Driver.code ? (
              <View style={[styles.codeChip, { borderColor: accent }]}>
                <Text style={[styles.codeText, { color: accent }]}>
                  {item.Driver.code}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.team} numberOfLines={1}>
            {constructor?.name ?? "—"}
          </Text>
        </View>

        <View style={styles.ptsBlock}>
          <Text style={styles.pts}>{item.points}</Text>
          <Text style={styles.ptsLabel}>PTS</Text>
        </View>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, fillStyle]}>
            <LinearGradient
              colors={[accent + "00", accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

/* ---------------------------- Skeleton loader ---------------------------- */

function SkeletonList({ topPad }: { topPad: number }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const pulse = useSharedValue(0.4);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.4, { duration: 650, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.listContent, { paddingTop: topPad }]}>
      <Animated.View style={[styles.skelHero, pulseStyle]} />
      {Array.from({ length: 8 }).map((_, i) => (
        <Animated.View key={i} style={[styles.skelRow, pulseStyle]}>
          <View style={styles.skelBar} />
          <View style={styles.skelPos} />
          <View style={{ flex: 1, gap: 6, marginLeft: 8 }}>
            <View style={[styles.skelLine, { width: "55%" }]} />
            <View style={[styles.skelLine, { width: "35%" }]} />
          </View>
          <View style={styles.skelPts} />
        </Animated.View>
      ))}
    </View>
  );
}

/* -------------------------------- Styles --------------------------------- */

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    list: { flex: 1 },
    listContent: { paddingHorizontal: t.space(3), paddingBottom: t.space(8) },

    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: t.space(3),
      padding: t.space(8),
    },
    dim: { color: t.color.textDim, fontSize: 14, fontFamily: t.font.body },
    errorTitle: {
      color: t.color.text,
      fontSize: 20,
      fontFamily: t.font.display,
      letterSpacing: 0.5,
    },
    retry: {
      marginTop: t.space(2),
      backgroundColor: t.color.accent,
      paddingHorizontal: t.space(7),
      paddingVertical: t.space(3),
      borderRadius: t.radius.pill,
    },
    retryText: {
      color: t.color.onAccent,
      fontFamily: t.font.bodyMed,
      letterSpacing: 1.5,
      fontSize: 13,
    },

    header: { marginBottom: t.space(2) },
    kicker: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
      marginTop: t.space(4),
      marginBottom: t.space(3),
    },
    heroCard: {
      borderRadius: t.radius.lg,
      overflow: "hidden",
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      flexDirection: "row",
      alignItems: "center",
      minHeight: 124,
    },
    heroEdge: { width: 6, alignSelf: "stretch" },
    heroBody: { flex: 1, padding: t.space(4) },
    crownRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
    crownText: {
      color: t.color.gold,
      fontFamily: t.font.bodyMed,
      fontSize: 10,
      letterSpacing: 1.5,
    },
    heroGiven: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 15,
      marginBottom: -4,
    },
    heroFamily: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 34,
      letterSpacing: 0.5,
    },
    heroTeam: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 13,
      marginTop: 2,
    },
    heroPts: { paddingHorizontal: t.space(5), alignItems: "center" },
    heroPtsNum: { fontFamily: t.font.display, fontSize: 40 },
    heroPtsLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 10,
      letterSpacing: 2,
      marginTop: -2,
    },
    tableLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
      marginTop: t.space(5),
      marginBottom: t.space(2),
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.color.surface,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      overflow: "hidden",
      paddingVertical: t.space(3),
      paddingRight: t.space(4),
      marginBottom: t.space(2),
    },
    accentBar: { width: 5, alignSelf: "stretch", marginRight: t.space(3) },
    pos: {
      width: 36,
      textAlign: "center",
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 24,
    },
    nameBlock: { flex: 1, marginLeft: t.space(1) },
    given: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 12,
      marginBottom: -2,
    },
    familyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    family: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 0.4,
    },
    codeChip: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    codeText: { fontFamily: t.font.bodyMed, fontSize: 9, letterSpacing: 1 },
    team: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 12,
      marginTop: 1,
    },
    ptsBlock: { alignItems: "flex-end", minWidth: 44 },
    pts: { color: t.color.text, fontFamily: t.font.display, fontSize: 22 },
    ptsLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 9,
      letterSpacing: 1.5,
      marginTop: -2,
    },
    barTrack: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      backgroundColor: t.color.surfaceAlt,
    },
    barFill: { height: 3, overflow: "hidden" },

    skelHero: {
      height: 124,
      borderRadius: t.radius.lg,
      backgroundColor: t.color.surface,
      marginBottom: t.space(7),
      marginTop: t.space(4),
    },
    skelRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.color.surface,
      borderRadius: t.radius.md,
      padding: t.space(3),
      marginBottom: t.space(2),
      height: 72,
    },
    skelBar: { width: 5, height: "100%", backgroundColor: t.color.surfaceAlt },
    skelPos: {
      width: 28,
      height: 28,
      borderRadius: 6,
      backgroundColor: t.color.surfaceAlt,
      marginLeft: 12,
    },
    skelLine: { height: 12, borderRadius: 6, backgroundColor: t.color.surfaceAlt },
    skelPts: {
      width: 36,
      height: 22,
      borderRadius: 6,
      backgroundColor: t.color.surfaceAlt,
    },
  });
