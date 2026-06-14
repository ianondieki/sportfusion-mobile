import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import {
  fetchResults,
  fetchFixtures,
  fetchLiveAndToday,
  isLive,
  MissingKeyError,
  type Match,
} from "../../lib/api/football";
import { useCompetition } from "../../lib/football-competition-context";
import { useMatchReminders } from "../../lib/match-reminders-context";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import { buildWatchParams } from "../../lib/streams";
import SportSwitcher from "../SportSwitcher";
import CompetitionPicker from "./CompetitionPicker";
import Crest from "./Crest";
import FootballStatsWidget from "./FootballStatsWidget";
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
  const [today, setToday] = useState<Match[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setState({ status: "loading" });
      try {
        // cross-competition live/today board (results mode only) — best-effort
        const todayPromise =
          mode === "results"
            ? fetchLiveAndToday().catch(() => [] as Match[])
            : Promise.resolve([] as Match[]);
        const { competition: name, matches } =
          mode === "results"
            ? await fetchResults(competition)
            : await fetchFixtures(competition);
        setToday(await todayPromise);
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

  // auto-refresh while anything on the board is live
  const anyLive = today.some((m) => isLive(m.status));
  useEffect(() => {
    if (!anyLive) return;
    const timer = setInterval(() => load(true), 60_000);
    return () => clearInterval(timer);
  }, [anyLive, load]);

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
          {mode === "results" && today.length > 0 ? (
            <>
              <Text style={styles.tableLabel}>LIVE & TODAY · ALL COMPETITIONS</Text>
              {today.map((m) => (
                <MatchRow
                  key={`today-${m.id}`}
                  item={m}
                  index={0}
                  mode={
                    isLive(m.status) || m.status === "FINISHED"
                      ? "results"
                      : "fixtures"
                  }
                  showCompetition
                />
              ))}
            </>
          ) : null}
          <Text style={styles.kicker}>{state.competition?.toUpperCase()}</Text>
          {mode === "results" && state.matches.length > 0 ? (
            <FootballStatsWidget
              match={state.matches[0]}
              competition={state.competition}
              competitionCode={competition}
            />
          ) : null}
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

function MatchRow({
  item,
  index,
  mode,
  showCompetition = false,
}: {
  item: Match;
  index: number;
  mode: Mode;
  showCompetition?: boolean;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const { competition } = useCompetition();
  const { hasReminder, toggleReminder, available: remindersAvailable } =
    useMatchReminders();
  const live = isLive(item.status);
  const upcoming = !live && item.status !== "FINISHED" &&
    new Date(item.utcDate).getTime() > Date.now();
  const reminded = hasReminder(item.id);
  const streamKey = item.competitionCode ?? competition;
  const tagLabel = showCompetition
    ? [item.competitionName, item.stage].filter(Boolean).join(" · ") || null
    : item.stage;

  const openMatch = useCallback(() => {
    router.push({
      pathname: "/watch",
      params: buildWatchParams(
        streamKey,
        `${item.home} vs ${item.away}`,
        item.competitionName ?? undefined,
        {
          status: live
            ? "live"
            : item.status === "FINISHED"
            ? "finished"
            : "upcoming",
          kickoff: item.utcDate,
        }
      ),
    });
  }, [streamKey, item, live]);

  const onBell = useCallback(async () => {
    if (!remindersAvailable) {
      Alert.alert(
        "Reminders need a dev build",
        "Scheduled notifications use a native module that isn't in Expo Go. " +
          "Run a dev/EAS build and you'll get a kickoff alert 15 minutes before the match."
      );
      return;
    }
    const result = await toggleReminder({
      matchId: item.id,
      title: `${item.home} vs ${item.away}`,
      competition: item.competitionName ?? undefined,
      kickoffISO: item.utcDate,
    });
    if (result === "added") {
      Alert.alert("Reminder set", "We'll ping you 15 minutes before kickoff. ⚡");
    } else if (result === "denied") {
      Alert.alert("Notifications off", "Enable notifications for SportsFusion in your phone settings to get reminders.");
    }
  }, [remindersAvailable, toggleReminder, item]);

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
      {/* whole row opens the match hub: live → watch, upcoming → where to
          watch at kickoff, finished → highlights */}
      <Pressable style={styles.rowPress} onPress={openMatch}>
      <View style={styles.teams}>
        {tagLabel ? <Text style={styles.stage}>{tagLabel}</Text> : null}
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
        <View style={styles.liveCol}>
          <View style={styles.liveTag}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Pressable style={styles.watchBtn} onPress={openMatch} hitSlop={6}>
            <Ionicons name="play" size={10} color={t.color.live} />
            <Text style={styles.watchText}>WATCH</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.trailing}>
          {upcoming ? (
            <Pressable onPress={onBell} hitSlop={8} style={styles.bell}>
              <Ionicons
                name={reminded ? "notifications" : "notifications-outline"}
                size={18}
                color={reminded ? t.color.accent : t.color.textFaint}
              />
            </Pressable>
          ) : null}
          <Ionicons name="chevron-forward" size={16} color={t.color.textFaint} />
        </View>
      )}
      </Pressable>
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
    rowPress: { flex: 1, flexDirection: "row", alignItems: "center" },
    trailing: { flexDirection: "row", alignItems: "center", gap: t.space(2), marginLeft: t.space(2) },
    bell: { padding: 2 },
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
    liveCol: { marginLeft: t.space(3), alignItems: "center", gap: 6 },
    liveTag: {
      backgroundColor: t.color.live,
      borderRadius: t.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    liveText: { color: "#04210F", fontFamily: t.font.bodyMed, fontSize: 9, letterSpacing: 1 },
    watchBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderColor: t.color.live,
      borderRadius: t.radius.pill,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    watchText: {
      color: t.color.live,
      fontFamily: t.font.bodyMed,
      fontSize: 9,
      letterSpacing: 1,
    },
  });
