import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
} from "react-native-reanimated";
import { fetchSeasonRaces, type SeasonSchedule, type RaceMeeting } from "../../lib/api/openf1";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import SportSwitcher from "../../components/SportSwitcher";
import { useSport } from "../../lib/sport-context";
import FootballMatches from "../../components/football/FootballMatches";

type Status = "loading" | "ready" | "error";

export default function ScheduleScreen() {
  const { sport } = useSport();
  return sport === "football" ? <FootballMatches mode="fixtures" /> : <F1Schedule />;
}

function F1Schedule() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 52;

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<SeasonSchedule | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setStatus("loading");
    try {
      const result = await fetchSeasonRaces();
      setData(result);
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

  if (status === "loading") {
    return (
      <View style={[styles.centered, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={t.color.accent} />
        <Text style={styles.dim}>Loading the calendar…</Text>
      </View>
    );
  }

  if (status === "error" || !data) {
    return (
      <View style={[styles.centered, { paddingTop: topPad }]}>
        <Ionicons name="warning-outline" size={48} color={t.color.accent} />
        <Text style={styles.errorTitle}>Couldn’t load schedule</Text>
        <Text style={styles.dim}>Pull down to try again.</Text>
      </View>
    );
  }

  return (
    <Animated.FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingTop: topPad }]}
      data={data.races}
      keyExtractor={(item) => String(item.meeting_key)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.color.accent}
          progressViewOffset={topPad}
        />
      }
      ListHeaderComponent={<ScheduleHeader data={data} />}
      renderItem={({ item, index }) => (
        <RaceRow item={item} index={index} nextIndex={data.nextIndex} />
      )}
    />
  );
}

function ScheduleHeader({ data }: { data: SeasonSchedule }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const next = data.nextIndex >= 0 ? data.races[data.nextIndex] : null;

  return (
    <View style={styles.header}>
      <SportSwitcher />
      <Animated.Text entering={FadeIn.duration(450)} style={styles.kicker}>
        {data.year} SEASON · {data.races.length} ROUNDS
      </Animated.Text>

      {next ? (
        <CountdownCard race={next} />
      ) : (
        <Animated.View entering={FadeInUp.duration(500)} style={styles.doneCard}>
          <Ionicons name="flag" size={20} color={t.color.gold} />
          <Text style={styles.doneText}>Season complete</Text>
        </Animated.View>
      )}

      <Text style={styles.tableLabel}>FULL CALENDAR</Text>
    </View>
  );
}

function CountdownCard({ race }: { race: RaceMeeting }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, Date.parse(race.date) - now);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <Animated.View
      entering={FadeInUp.delay(60).duration(600).springify().damping(16)}
      style={styles.countCard}
    >
      <LinearGradient
        colors={[t.color.accent + "33", t.color.accent + "0A", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.nextLabel}>NEXT RACE · ROUND {race.round}</Text>
      <Text style={styles.nextGp}>{race.gp?.toUpperCase()}</Text>
      <Text style={styles.nextCircuit}>{race.circuit}</Text>

      <View style={styles.clock}>
        <Unit value={days} label="DAYS" />
        <Sep />
        <Unit value={hours} label="HRS" pad={pad} />
        <Sep />
        <Unit value={mins} label="MIN" pad={pad} />
        <Sep />
        <Unit value={secs} label="SEC" pad={pad} />
      </View>
    </Animated.View>
  );
}

function Unit({
  value,
  label,
  pad,
}: {
  value: number;
  label: string;
  pad?: (n: number) => string;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.unit}>
      <Text style={styles.unitNum}>{pad ? pad(value) : value}</Text>
      <Text style={styles.unitLabel}>{label}</Text>
    </View>
  );
}

function Sep() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return <Text style={styles.sep}>:</Text>;
}

function RaceRow({
  item,
  index,
  nextIndex,
}: {
  item: RaceMeeting;
  index: number;
  nextIndex: number;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const isNext = index === nextIndex;
  const isPast = nextIndex >= 0 ? index < nextIndex : true;

  const dateLabel = new Date(item.date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 12) * 35)
        .duration(400)
        .springify()
        .damping(16)}
      style={[
        styles.row,
        isNext && { borderColor: t.color.accent, borderWidth: 1.5 },
      ]}
    >
      <Text style={[styles.round, isPast && styles.roundPast]}>
        {String(item.round).padStart(2, "0")}
      </Text>
      <View style={styles.rowBody}>
        <Text style={[styles.gp, isPast && styles.gpPast]} numberOfLines={1}>
          {item.gp}
        </Text>
        <Text style={styles.circuit} numberOfLines={1}>
          {item.circuit}
        </Text>
      </View>
      {isNext ? (
        <View style={styles.nextPill}>
          <Text style={styles.nextPillText}>NEXT</Text>
        </View>
      ) : isPast ? (
        <Ionicons name="checkmark-circle" size={18} color={t.color.textFaint} />
      ) : null}
      <Text style={[styles.date, isPast && styles.gpPast]}>{dateLabel}</Text>
    </Animated.View>
  );
}

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
    dim: { color: t.color.textDim, fontFamily: t.font.body, fontSize: 14 },
    errorTitle: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 0.5,
    },

    header: { marginTop: t.space(4), marginBottom: t.space(2) },
    kicker: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
      marginBottom: t.space(3),
    },

    countCard: {
      borderRadius: t.radius.lg,
      overflow: "hidden",
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      padding: t.space(5),
    },
    nextLabel: {
      color: t.color.accent,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
    },
    nextGp: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 34,
      letterSpacing: 0.5,
      marginTop: 2,
    },
    nextCircuit: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 13,
      marginBottom: t.space(4),
    },
    clock: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
    unit: { alignItems: "center", minWidth: 46 },
    unitNum: { color: t.color.text, fontFamily: t.font.display, fontSize: 32 },
    unitLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 9,
      letterSpacing: 1.5,
      marginTop: -2,
    },
    sep: {
      color: t.color.textFaint,
      fontFamily: t.font.display,
      fontSize: 28,
      marginBottom: 14,
    },

    doneCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      borderRadius: t.radius.lg,
      padding: t.space(5),
    },
    doneText: { color: t.color.text, fontFamily: t.font.display, fontSize: 20 },

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
      paddingVertical: t.space(3),
      paddingHorizontal: t.space(4),
      marginBottom: t.space(2),
      gap: t.space(3),
    },
    round: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      width: 30,
    },
    roundPast: { color: t.color.textFaint },
    rowBody: { flex: 1 },
    gp: { color: t.color.text, fontFamily: t.font.displayBold, fontSize: 17 },
    gpPast: { color: t.color.textDim },
    circuit: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 12,
      marginTop: 1,
    },
    date: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 13,
      minWidth: 48,
      textAlign: "right",
    },
    nextPill: {
      backgroundColor: t.color.accent,
      borderRadius: t.radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    nextPillText: {
      color: t.color.onAccent,
      fontFamily: t.font.bodyMed,
      fontSize: 9,
      letterSpacing: 1.5,
    },
  });
