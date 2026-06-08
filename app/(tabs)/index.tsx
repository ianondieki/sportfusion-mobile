import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { fetchLatestSession, type LatestSession, type RaceEntry } from "../../lib/api/openf1";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import SportSwitcher from "../../components/SportSwitcher";
import { useSport } from "../../lib/sport-context";
import FootballMatches from "../../components/football/FootballMatches";

type Status = "loading" | "ready" | "error";

export default function LiveScreen() {
  const { sport } = useSport();
  return sport === "football" ? <FootballMatches mode="results" /> : <F1Live />;
}

function F1Live() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 52;

  const [status, setStatus] = useState<Status>("loading");
  const [data, setData] = useState<LatestSession | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setStatus("loading");
    try {
      const result = await fetchLatestSession();
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

  // light auto-refresh only while a session is actually in progress
  useEffect(() => {
    if (poll.current) clearInterval(poll.current);
    if (data?.isLive) {
      poll.current = setInterval(() => load(true), 15000);
    }
    return () => {
      if (poll.current) clearInterval(poll.current);
    };
  }, [data?.isLive, load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  if (status === "loading") {
    return (
      <View style={[styles.centered, { paddingTop: topPad }]}>
        <ActivityIndicator size="large" color={t.color.accent} />
        <Text style={styles.dim}>Loading latest session…</Text>
      </View>
    );
  }

  if (status === "error" || !data) {
    return (
      <View style={[styles.centered, { paddingTop: topPad }]}>
        <Ionicons name="warning-outline" size={48} color={t.color.accent} />
        <Text style={styles.errorTitle}>Couldn’t load session</Text>
        <Text style={styles.dim}>Pull down to try again.</Text>
      </View>
    );
  }

  return (
    <Animated.FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingTop: topPad }]}
      data={data.entries}
      keyExtractor={(item) => String(item.driver_number)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.color.accent}
          progressViewOffset={topPad}
        />
      }
      ListHeaderComponent={<SessionHeader data={data} />}
      renderItem={({ item, index }) => <EntryRow item={item} index={index} />}
    />
  );
}

function SessionHeader({ data }: { data: LatestSession }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { session, isLive } = data;

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 750, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 750, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, []);
  const dotStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  const dateLabel = new Date(session.date_start).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Animated.View entering={FadeIn.duration(450)} style={styles.header}>
      <SportSwitcher />
      <View style={styles.badgeRow}>
        {isLive ? (
          <View style={[styles.badge, { backgroundColor: t.color.surfaceAlt }]}>
            <Animated.View style={[styles.dot, dotStyle]} />
            <Text style={[styles.badgeText, { color: t.color.live }]}>LIVE</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: t.color.surfaceAlt }]}>
            <Text style={[styles.badgeText, { color: t.color.textDim }]}>
              LATEST SESSION
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.gp}>{session.country_name?.toUpperCase()}</Text>
      <Text style={styles.sessionName}>{session.session_name}</Text>
      <Text style={styles.meta}>
        {session.circuit_short_name} · {dateLabel}
      </Text>

      <Text style={styles.tableLabel}>FINISHING ORDER</Text>
    </Animated.View>
  );
}

function EntryRow({ item, index }: { item: RaceEntry; index: number }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const podium = item.position <= 3;
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 12) * 40)
        .duration(420)
        .springify()
        .damping(16)}
      style={styles.row}
    >
      <View style={[styles.accentBar, { backgroundColor: item.colour }]} />
      <Text style={[styles.pos, podium && { color: t.color.gold }]}>
        {item.position === 999 ? "–" : item.position}
      </Text>
      <View style={styles.nameBlock}>
        <View style={styles.acroRow}>
          <Text style={styles.acro}>{item.acronym}</Text>
          <View style={[styles.numChip, { borderColor: item.colour }]}>
            <Text style={[styles.numText, { color: item.colour }]}>
              {item.driver_number}
            </Text>
          </View>
        </View>
        <Text style={styles.team} numberOfLines={1}>
          {item.team}
        </Text>
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {item.fullName}
      </Text>
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
    badgeRow: { flexDirection: "row", marginBottom: t.space(3) },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: t.radius.pill,
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: t.color.live },
    badgeText: { fontFamily: t.font.bodyMed, fontSize: 11, letterSpacing: 2 },
    gp: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 13,
      letterSpacing: 2,
    },
    sessionName: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 40,
      letterSpacing: 0.5,
      marginTop: -2,
    },
    meta: { color: t.color.textDim, fontFamily: t.font.body, fontSize: 13, marginTop: 2 },
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
      width: 34,
      textAlign: "center",
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 22,
    },
    nameBlock: { flex: 1, marginLeft: t.space(1) },
    acroRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    acro: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 1,
    },
    numChip: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
    numText: { fontFamily: t.font.bodyMed, fontSize: 9, letterSpacing: 0.5 },
    team: { color: t.color.textFaint, fontFamily: t.font.body, fontSize: 12, marginTop: 1 },
    name: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 12,
      maxWidth: 90,
      textAlign: "right",
    },
  });
