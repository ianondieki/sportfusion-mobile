import { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";
import {
  askAPEX,
  buildLiveContext,
  MissingGeminiKeyError,
  type ChatTurn,
} from "../../lib/api/gemini";
import { useSport } from "../../lib/sport-context";
import { useCompetition } from "../../lib/football-competition-context";
import { fetchDriverStandings } from "../../lib/api/standings";
import { fetchTable, fetchResults } from "../../lib/api/football";

type Message = {
  id: string;
  role: "user" | "apex";
  text: string;
};

const GREETING = `I'm APEX — your sports companion. I'm wired into your live standings and results, so ask me things like:

• "Who's leading the championship and by how much?"
• "Was that a good result for them?"
• "Compare the top two."
• "Explain DRS / offside / the points system."

Heads up: add a free Gemini key in lib/config.ts to switch me on (aistudio.google.com/app/apikeys). 🏎️⚽`;

export default function ChatScreen() {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const { sport } = useSport();
  const { competition } = useCompetition();

  const [messages, setMessages] = useState<Message[]>([
    { id: "0", role: "apex", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const contextRef = useRef<{ key: string; value: string } | null>(null);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Pull REAL standings/results for the active sport and format for APEX.
  const getLiveContext = useCallback(async (): Promise<string> => {
    const key = `${sport}:${competition}`;
    if (contextRef.current?.key === key) return contextRef.current.value;

    let ctx = "";
    try {
      if (sport === "football") {
        const [table, results] = await Promise.all([
          fetchTable(competition),
          fetchResults(competition),
        ]);
        const rows = table.groups.flatMap((g) => g.rows).slice(0, 8);
        const tableStr = rows
          .map(
            (r) =>
              `${r.position}. ${r.team} — ${r.points} pts (GD ${r.gd > 0 ? "+" : ""}${r.gd})`
          )
          .join("\n");
        const resStr = results.matches
          .slice(0, 5)
          .map(
            (m) =>
              `${m.home} ${m.homeScore ?? "?"}-${m.awayScore ?? "?"} ${m.away}`
          )
          .join("\n");
        ctx = buildLiveContext({
          sport: "Football",
          competition: table.competition,
          standings: tableStr,
          latestResults: resStr,
        });
      } else {
        const standings = await fetchDriverStandings();
        const str = standings
          .slice(0, 8)
          .map(
            (d) =>
              `${d.position}. ${d.Driver.givenName} ${d.Driver.familyName} (${d.Constructors[0]?.name ?? "—"}) — ${d.points} pts`
          )
          .join("\n");
        ctx = buildLiveContext({ sport: "Formula 1", standings: str });
      }
    } catch {
      ctx = ""; // grounding is best-effort; APEX still answers generally
    }
    contextRef.current = { key, value: ctx };
    return ctx;
  }, [sport, competition]);

  const send = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: trimmed };

    // build multi-turn history (skip greeting + past error notices)
    const priorTurns: ChatTurn[] = messages
      .filter((m) => m.id !== "0" && !m.text.startsWith("⚠️"))
      .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text }));
    const history: ChatTurn[] = [...priorTurns, { role: "user", text: trimmed }];

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const ctx = await getLiveContext();
      const reply = await askAPEX(history, ctx);
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: "apex", text: reply },
      ]);
    } catch (e) {
      const msg =
        e instanceof MissingGeminiKeyError
          ? "Add a free Gemini key in lib/config.ts (aistudio.google.com/app/apikeys) and reload to switch me on."
          : (e as Error).message;
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-e`, role: "apex", text: `⚠️ ${msg}` },
      ]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [input, loading, messages, getLiveContext, scrollToEnd]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
    >
      {/* APEX header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>⚡</Text>
          </View>
          <View>
            <Text style={styles.headerName}>APEX</Text>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.statusLabel}>Online</Text>
            </View>
          </View>
        </View>
        <Pressable
          hitSlop={10}
          onPress={() => setMessages([{ id: "0", role: "apex", text: GREETING }])}
        >
          <Ionicons name="create-outline" size={22} color={t.color.textDim} />
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 64 }]}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => (
          <View
            style={[
              styles.row,
              item.role === "user" ? styles.userRow : styles.apexRow,
            ]}
          >
            {item.role === "apex" && (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>⚡</Text>
              </View>
            )}
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.userBubble : styles.apexBubble,
              ]}
            >
              <Text
                style={[
                  styles.msg,
                  item.role === "user" ? styles.userText : styles.apexText,
                ]}
              >
                {item.text}
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={[styles.row, styles.apexRow]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>⚡</Text>
              </View>
              <View style={[styles.bubble, styles.apexBubble]}>
                <ActivityIndicator size="small" color={t.color.accent} />
              </View>
            </View>
          ) : null
        }
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask APEX anything…"
          placeholderTextColor={t.color.textFaint}
          value={input}
          onChangeText={setInput}
          editable={!loading}
          multiline
        />
        <Pressable
          style={[styles.send, (!input.trim() || loading) && styles.sendOff]}
          onPress={send}
          disabled={loading || !input.trim()}
        >
          <Ionicons name="arrow-up" size={20} color={t.color.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    header: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: t.space(3),
      paddingBottom: t.space(2),
      backgroundColor: t.color.surface,
      borderBottomWidth: 1,
      borderBottomColor: t.color.borderSolid,
    },
    headerCenter: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(2),
    },
    headerAvatar: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: t.color.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    headerAvatarText: { fontSize: 16 },
    headerName: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 18,
      letterSpacing: 1,
    },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    onlineDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: "#2BD576",
    },
    statusLabel: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 12,
    },
    list: { flex: 1, backgroundColor: t.color.bg },
    listContent: { paddingHorizontal: t.space(3), paddingBottom: t.space(3) },
    row: {
      flexDirection: "row",
      marginVertical: t.space(2),
      alignItems: "flex-end",
      gap: t.space(2),
    },
    userRow: { justifyContent: "flex-end" },
    apexRow: { justifyContent: "flex-start" },
    avatar: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.color.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: { fontSize: 14 },
    bubble: {
      maxWidth: "80%",
      borderRadius: t.radius.lg,
      paddingHorizontal: t.space(3),
      paddingVertical: t.space(2),
    },
    userBubble: { backgroundColor: t.color.accent },
    apexBubble: {
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
    },
    msg: {
      fontFamily: t.font.body,
      fontSize: 14 * (t.fontScale ?? 1),
      lineHeight: 20 * (t.fontScale ?? 1),
    },
    userText: { color: t.color.onAccent },
    apexText: { color: t.color.text },
    inputBar: {
      flexDirection: "row",
      alignItems: "flex-end",
      gap: t.space(2),
      paddingHorizontal: t.space(3),
      paddingTop: t.space(2),
      backgroundColor: t.color.surface,
      borderTopWidth: 1,
      borderTopColor: t.color.borderSolid,
    },
    input: {
      flex: 1,
      color: t.color.text,
      fontFamily: t.font.body,
      fontSize: 14,
      paddingHorizontal: t.space(3),
      paddingVertical: t.space(2),
      backgroundColor: t.color.bg,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      maxHeight: 100,
    },
    send: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.color.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    sendOff: { opacity: 0.4 },
  });
