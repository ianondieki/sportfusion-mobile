import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
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
import {
  speak,
  stopSpeaking,
  speechRecognitionAvailable,
  startListening,
} from "../../lib/voice";
import { findLiveEvents, type LiveEvent } from "../../lib/live-events";
import { buildWatchParams } from "../../lib/streams";

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

Tap the mic to talk to me, or the speaker up top and I'll read my answers aloud. 🎙️

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
  const [inputFocused, setInputFocused] = useState(false);

  // voice assistant state
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const stopListeningRef = useRef<(() => void) | null>(null);
  const voiceRepliesRef = useRef(voiceReplies);
  voiceRepliesRef.current = voiceReplies;

  // "Watch live" suggestion
  const [liveEvent, setLiveEvent] = useState<LiveEvent | null>(null);

  const listRef = useRef<FlatList>(null);
  const contextRef = useRef<{ key: string; value: string } | null>(null);

  const scrollToEnd = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  // Surface a "Watch live" chip whenever something is live right now.
  // Re-checked on sport/competition change and every 60s (matches API cache).
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const events = await findLiveEvents(sport === "football" ? "football" : "f1", competition);
      if (!cancelled) setLiveEvent(events[0] ?? null);
    };
    check();
    const timer = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sport, competition]);

  // stop any audio/dictation when leaving the screen
  useEffect(
    () => () => {
      stopSpeaking();
      stopListeningRef.current?.();
    },
    []
  );

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

  const send = useCallback(
    async (overrideText?: string) => {
      const trimmed = (overrideText ?? input).trim();
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
        if (voiceRepliesRef.current) {
          setSpeaking(true);
          speak(reply, () => setSpeaking(false));
        }
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
    },
    [input, loading, messages, getLiveContext, scrollToEnd]
  );

  const toggleVoiceReplies = useCallback(() => {
    setVoiceReplies((on) => {
      if (on) {
        stopSpeaking();
        setSpeaking(false);
      }
      return !on;
    });
  }, []);

  const onMicPress = useCallback(async () => {
    if (listening) {
      stopListeningRef.current?.();
      return;
    }
    if (!speechRecognitionAvailable()) {
      Alert.alert(
        "Voice input needs a dev build",
        "Speech recognition uses a native module that isn't inside Expo Go. " +
          "Run `npx expo run:android` / `run:ios` (or an EAS build) and the mic comes alive. " +
          "Voice replies (speaker icon) work everywhere."
      );
      return;
    }
    stopSpeaking();
    setSpeaking(false);
    setListening(true);
    const stop = await startListening({
      onResult: (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal && transcript.trim()) {
          setListening(false);
          send(transcript);
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!stop) {
      setListening(false);
      return;
    }
    stopListeningRef.current = () => {
      stop();
      stopListeningRef.current = null;
    };
  }, [listening, send]);

  const openWatchLive = useCallback(() => {
    if (!liveEvent) return;
    router.push({
      pathname: "/watch",
      params: buildWatchParams(liveEvent.streamKey, liveEvent.title, liveEvent.subtitle),
    });
  }, [liveEvent]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
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
              <Text style={styles.statusLabel}>
                {speaking ? "Speaking…" : listening ? "Listening…" : "Online"}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable hitSlop={10} onPress={toggleVoiceReplies}>
            <Ionicons
              name={voiceReplies ? "volume-high" : "volume-mute-outline"}
              size={22}
              color={voiceReplies ? t.color.accent : t.color.textDim}
            />
          </Pressable>
          <Pressable
            hitSlop={10}
            onPress={() => {
              stopSpeaking();
              setSpeaking(false);
              setMessages([{ id: "0", role: "apex", text: GREETING }]);
            }}
          >
            <Ionicons name="create-outline" size={22} color={t.color.textDim} />
          </Pressable>
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 64 }]}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={scrollToEnd}
        keyboardShouldPersistTaps="handled"
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

      {/* Suggestion chip — only when something is live right now */}
      {liveEvent ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.suggestRow}>
          <Pressable style={styles.watchChip} onPress={openWatchLive}>
            <LivePulseDot color={t.color.live} />
            <Text style={styles.watchChipText} numberOfLines={1}>
              Watch live · {liveEvent.title}
            </Text>
            <Ionicons name="play-circle" size={18} color={t.color.live} />
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[styles.mic, listening && styles.micActive]}
          onPress={onMicPress}
          disabled={loading}
        >
          <Ionicons
            name={listening ? "stop" : "mic-outline"}
            size={20}
            color={listening ? t.color.onAccent : t.color.textDim}
          />
        </Pressable>
        <TextInput
          style={[styles.input, inputFocused && styles.inputFocused]}
          placeholder={listening ? "Listening… speak now" : "Ask APEX anything…"}
          placeholderTextColor={t.color.textFaint}
          value={input}
          onChangeText={setInput}
          onFocus={() => {
            setInputFocused(true);
            scrollToEnd();
          }}
          onBlur={() => setInputFocused(false)}
          editable={!loading}
          multiline
          cursorColor={t.color.accent}
          selectionColor={t.color.accentGlow}
        />
        <Pressable
          style={[styles.send, (!input.trim() || loading) && styles.sendOff]}
          onPress={() => send()}
          disabled={loading || !input.trim()}
        >
          <Ionicons name="arrow-up" size={20} color={t.color.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// Small pulsing dot for the watch-live chip.
function LivePulseDot({ color }: { color: string }) {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <Animated.View
      style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }, style]}
    />
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
    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(4),
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
    suggestRow: {
      paddingHorizontal: t.space(3),
      paddingBottom: t.space(2),
      backgroundColor: t.color.bg,
    },
    watchChip: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "flex-start",
      gap: 8,
      maxWidth: "100%",
      backgroundColor: t.color.surfaceAlt,
      borderColor: t.color.live,
      borderWidth: 1,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space(3),
      paddingVertical: t.space(2),
    },
    watchChipText: {
      flexShrink: 1,
      color: t.color.text,
      fontFamily: t.font.bodyMed,
      fontSize: 13,
    },
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
    mic: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      backgroundColor: t.color.bg,
      alignItems: "center",
      justifyContent: "center",
    },
    micActive: {
      backgroundColor: t.color.accent,
      borderColor: t.color.accent,
    },
    input: {
      flex: 1,
      color: t.color.text,
      fontFamily: t.font.body,
      fontSize: 15,
      minHeight: 40,
      paddingHorizontal: t.space(3),
      paddingVertical: t.space(2),
      backgroundColor: t.color.bg,
      borderRadius: t.radius.md,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      maxHeight: 100,
    },
    inputFocused: {
      borderColor: t.color.accent,
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
