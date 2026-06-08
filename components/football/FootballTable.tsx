import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { fetchTable, MissingKeyError, type TableGroup } from "../../lib/api/football";
import { useCompetition } from "../../lib/football-competition-context";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import SportSwitcher from "../SportSwitcher";
import CompetitionPicker from "./CompetitionPicker";
import Crest from "./Crest";
import SetupCard from "./SetupCard";

// flattened list item: a group header or a table row
type Item =
  | { kind: "group"; name: string }
  | { kind: "row"; row: TableGroup["rows"][number]; topOfGroup: boolean };

type State =
  | { status: "loading" }
  | { status: "ready"; competition: string; groups: TableGroup[] }
  | { status: "error"; message: string }
  | { status: "setup" };

export default function FootballTable() {
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
        const { competition: name, groups } = await fetchTable(competition);
        setState({ status: "ready", competition: name, groups });
      } catch (e) {
        if (e instanceof MissingKeyError) setState({ status: "setup" });
        else setState({ status: "error", message: (e as Error).message });
      } finally {
        if (isRefresh) setRefreshing(false);
      }
    },
    [competition]
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
        <Text style={styles.kicker}>{state.competition?.toUpperCase()}</Text>
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

  // flatten groups into a single list with headers
  const items: Item[] = [];
  for (const g of state.groups) {
    if (g.name) items.push({ kind: "group", name: g.name });
    g.rows.forEach((row, i) =>
      items.push({ kind: "row", row, topOfGroup: i === 0 })
    );
  }

  return (
    <Animated.FlatList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingTop: topPad }]}
      data={items}
      keyExtractor={(it, i) =>
        it.kind === "group" ? `g-${it.name}-${i}` : `r-${it.row.team}-${i}`
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={t.color.accent}
          progressViewOffset={topPad}
        />
      }
      ListHeaderComponent={Header}
      ListEmptyComponent={
        <SetupCard message="No standings yet — this competition hasn't started." />
      }
      renderItem={({ item, index }) =>
        item.kind === "group" ? (
          <Text style={styles.groupHead}>{item.name}</Text>
        ) : (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 16) * 28)
              .duration(360)
              .springify()
              .damping(16)}
            style={styles.row}
          >
            <Text style={[styles.pos, item.row.position <= 2 && { color: t.color.accent }]}>
              {item.row.position}
            </Text>
            <Crest uri={item.row.crest} name={item.row.team} size={26} />
            <Text style={styles.club} numberOfLines={1}>
              {item.row.team}
            </Text>
            <Text style={styles.cell}>{item.row.played}</Text>
            <Text style={styles.cell}>
              {item.row.gd > 0 ? `+${item.row.gd}` : item.row.gd}
            </Text>
            <Text style={styles.pts}>{item.row.points}</Text>
          </Animated.View>
        )
      }
    />
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    list: { flex: 1 },
    listContent: { paddingHorizontal: t.space(3), paddingBottom: t.space(8) },
    wrap: { flex: 1, paddingHorizontal: t.space(3) },
    centeredInline: { paddingTop: t.space(10), alignItems: "center" },
    header: { marginBottom: t.space(2) },
    kicker: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
    },
    groupHead: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 18,
      letterSpacing: 1,
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
      gap: t.space(3),
    },
    pos: {
      width: 22,
      textAlign: "center",
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 18,
    },
    monogram: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: t.color.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    monoText: { color: t.color.text, fontFamily: t.font.bodyMed, fontSize: 10 },
    club: { flex: 1, color: t.color.text, fontFamily: t.font.bodyMed, fontSize: 15 },
    cell: {
      width: 26,
      textAlign: "center",
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 13,
    },
    pts: {
      width: 26,
      textAlign: "center",
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 18,
    },
  });
