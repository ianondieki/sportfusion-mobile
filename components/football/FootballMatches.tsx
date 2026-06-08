import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  fetchResults,
  fetchFixtures,
  isLive,
  MissingKeyError,
  type Match,
} from "../../lib/api/football";
import { useCompetition } from "../../lib/football-competition-context";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import SportSwitcher from "../SportSwitcher";
import CompetitionPicker from "./CompetitionPicker";
import Crest from "./Crest";
import SetupCard from "./SetupCard";

type Mode = "results" | "fixtures";
type State =
  | { status: "loading" }
  | { status: "ready"; competition: string; matches: Match[] }
  | { status: "error"; message: string }
  | { status: "setup" };

export default function FootballMatches({ mode }: { mode: Mode }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 52;
  const { competition } = useCompetition();

  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setState({ status: "loading" });
      try {
        const { competition: name, matches } =
          mode === "results"
            ? await fetchResults(competition)
            : await fetchFixtures(competition);
        setState({ status: "ready", competition: name, matches });
      } catch (e) {
        if (e instanceof MissingKeyError) setState({ status: "setup" });
        else setState({ status: "error", message: (e as Error).message });
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [mode, competition]
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load(true);
  }, [load]);

  const Header = (
    <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
      <SportSwitcher />
      <CompetitionPicker />
      {state.status === "ready" ? (
        <>
          <Text style={styles.kicker}>{state.competition?.toUpperCase()}</Text>
          <Text style={styles.tableLabel}>
            {mode === "results" ? "RECENT RESULTS" : "UPCOMING FIXTURES"}
          </Text>
        </>
      ) : null}
    </Animated.View>
  );

  if (state.status === "loading") {
    return (
      <View style={[styles.wrap, { paddingTop: topPad }]}>
        {Header}
        <View style={styles.centeredInline}>
          <ActivityIndicator size="large" color={t.color.accent} />
        </View>
      </View>
    );
  }

  if (state.status === "setup" || state.status === "error") {
    return (
      <View style={[styles.wrap, { paddingTop: topPad }]}>
        {Header}
        <SetupCard message={state.status === "error" ? state.message : undefined} />
      </View>
    );
  }

  return (
    <Animated.FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingTop: topPad }]}
      data={state.matches}
      keyExtractor={(item) => String(item.id)}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.color.accent}
          progressViewOffset={topPad}
        />
      }
      ListEmptyComponent={
        <View style={styles.centeredInline}>
          <Text style={styles.dim}>
            {mode === "results" ? "No recent results yet." : "No upcoming fixtures."}
          </Text>
        </View>
      }
      ListHeaderComponent={Header}
      renderItem={({ item, index }) => (
        <MatchRow item={item} index={index} mode={mode} />
      )}
    />
  );
}

function MatchRow({ item, index, mode }: { item: Match; index: number; mode: Mode }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const live = isLive(item.status);

  const kickoff = new Date(item.utcDate);
  const dateLabel = kickoff.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  const timeLabel = kickoff.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 14) * 30)
        .duration(360)
        .springify()
        .damping(16)}
      style={[styles.row, live && { borderColor: t.color.live, borderWidth: 1.5 }]}
    >
      <View style={styles.teams}>
        {item.stage ? <Text style={styles.stage}>{item.stage}</Text> : null}
        <View style={styles.teamLine}>
          <Crest uri={item.homeCrest} name={item.home} size={20} />
          <Text style={styles.team} numberOfLines={1}>{item.home}</Text>
        </View>
        <View style={styles.teamLine}>
          <Crest uri={item.awayCrest} name={item.away} size={20} />
          <Text style={styles.team} numberOfLines={1}>{item.away}</Text>
        </View>
      </View>

      {mode === "results" ? (
        <View style={styles.scoreBox}>
          <Text style={styles.score}>{item.homeScore ?? "–"}</Text>
          <Text style={styles.score}>{item.awayScore ?? "–"}</Text>
        </View>
      ) : (
        <View style={styles.kickBox}>
          <Text style={styles.kickDate}>{dateLabel}</Text>
          <Text style={styles.kickTime}>{timeLabel}</Text>
        </View>
      )}

      {live ? (
        <View style={styles.liveTag}>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    list: { flex: 1 },
    listContent: { paddingHorizontal: t.space(3), paddingBottom: t.space(8) },
    wrap: { flex: 1, paddingHorizontal: t.space(3) },
    centeredInline: { paddingTop: t.space(10), alignItems: "center" },
    dim: { color: t.color.textDim, fontFamily: t.font.body, fontSize: 14 },
    header: { marginBottom: t.space(2) },
    kicker: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
    },
    tableLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
      marginTop: t.space(4),
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
    },
    teams: { flex: 1, gap: 6 },
    teamLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    stage: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 9,
      letterSpacing: 1.5,
      marginBottom: 2,
    },
    team: { color: t.color.text, fontFamily: t.font.bodyMed, fontSize: 15 },
    scoreBox: { alignItems: "center", gap: 6, minWidth: 28 },
    score: { color: t.color.text, fontFamily: t.font.display, fontSize: 18, lineHeight: 20 },
    kickBox: { alignItems: "flex-end", minWidth: 56 },
    kickDate: { color: t.color.textDim, fontFamily: t.font.bodyMed, fontSize: 13 },
    kickTime: { color: t.color.textFaint, fontFamily: t.font.body, fontSize: 12 },
    liveTag: {
      marginLeft: t.space(3),
      backgroundColor: t.color.live,
      borderRadius: t.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    liveText: { color: "#04210F", fontFamily: t.font.bodyMed, fontSize: 9, letterSpacing: 1 },
  });
