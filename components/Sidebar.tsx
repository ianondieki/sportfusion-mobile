import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { SlideInLeft, SlideOutLeft, FadeIn } from "react-native-reanimated";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/themes";
import {
  usePreferences,
  type FontChoice,
  type FontSize,
} from "../lib/preferences-context";
import { useMatchReminders } from "../lib/match-reminders-context";

type Section = "settings" | "trending" | "quick" | "notifications" | null;

const FONT_OPTIONS: { key: FontChoice; label: string }[] = [
  { key: "default", label: "Saira" },
  { key: "system", label: "System" },
  { key: "serif", label: "Serif" },
  { key: "mono", label: "Mono" },
];
const SIZE_OPTIONS: { key: FontSize; label: string }[] = [
  { key: "s", label: "S" },
  { key: "m", label: "M" },
  { key: "l", label: "L" },
  { key: "xl", label: "XL" },
];

export default function Sidebar({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fontChoice, fontSize, setFontChoice, setFontSize } = usePreferences();
  const { reminders } = useMatchReminders();
  const [open, setOpen] = useState<Section>("settings");

  const reminderList = useMemo(
    () =>
      Object.values(reminders).sort(
        (a, b) =>
          new Date(a.kickoffISO).getTime() - new Date(b.kickoffISO).getTime()
      ),
    [reminders]
  );

  const toggle = (s: Section) => setOpen((cur) => (cur === s ? null : s));

  const go = (path: string) => {
    onClose();
    // small delay so the drawer close animation isn't janky
    setTimeout(() => router.navigate(path as any), 180);
  };

  const signOut = () => {
    Alert.alert(
      "Sign out",
      "No account is connected yet — SportsFusion runs locally on your device. Account sync is coming later.",
      [{ text: "OK" }]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View
          entering={SlideInLeft.duration(260)}
          exiting={SlideOutLeft.duration(200)}
          style={[styles.panel, { paddingTop: insets.top + 16 }]}
        >
          {/* Brand header */}
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>⚡</Text>
            </View>
            <View>
              <Text style={styles.brandName}>SportsFusion</Text>
              <Text style={styles.brandSub}>APEX companion</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* SETTINGS */}
            <Row
              t={t}
              icon="settings-outline"
              label="Settings"
              expanded={open === "settings"}
              onPress={() => toggle("settings")}
            />
            {open === "settings" && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.drawerBody}>
                <Text style={styles.fieldLabel}>FONT TYPE</Text>
                <View style={styles.pillRow}>
                  {FONT_OPTIONS.map((o) => (
                    <Pressable
                      key={o.key}
                      onPress={() => setFontChoice(o.key)}
                      style={[styles.pill, fontChoice === o.key && styles.pillOn]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          fontChoice === o.key && styles.pillTextOn,
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={[styles.fieldLabel, { marginTop: t.space(3) }]}>
                  FONT SIZE
                </Text>
                <View style={styles.pillRow}>
                  {SIZE_OPTIONS.map((o) => (
                    <Pressable
                      key={o.key}
                      onPress={() => setFontSize(o.key)}
                      style={[styles.pill, fontSize === o.key && styles.pillOn]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          fontSize === o.key && styles.pillTextOn,
                        ]}
                      >
                        {o.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* TRENDING */}
            <Row
              t={t}
              icon="flame-outline"
              label="Trending"
              expanded={open === "trending"}
              onPress={() => toggle("trending")}
            />
            {open === "trending" && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.drawerBody}>
                <Link t={t} icon="podium-outline" label="Championship standings" onPress={() => go("/(tabs)/standings")} />
                <Link t={t} icon="football-outline" label="Latest results" onPress={() => go("/(tabs)")} />
              </Animated.View>
            )}

            {/* QUICK ACCESS */}
            <Row
              t={t}
              icon="flash-outline"
              label="Quick access"
              expanded={open === "quick"}
              onPress={() => toggle("quick")}
            />
            {open === "quick" && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.drawerBody}>
                <Link t={t} icon="radio-outline" label="Live" onPress={() => go("/(tabs)")} />
                <Link t={t} icon="podium-outline" label="Standings" onPress={() => go("/(tabs)/standings")} />
                <Link t={t} icon="calendar-outline" label="Schedule" onPress={() => go("/(tabs)/schedule")} />
                <Link t={t} icon="chatbubble-ellipses-outline" label="Ask APEX" onPress={() => go("/(tabs)/chat")} />
              </Animated.View>
            )}

            {/* NOTIFICATIONS */}
            <Row
              t={t}
              icon="notifications-outline"
              label="Notifications"
              expanded={open === "notifications"}
              onPress={() => toggle("notifications")}
            />
            {open === "notifications" && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.drawerBody}>
                {reminderList.length === 0 ? (
                  <Text style={styles.empty}>
                    No reminders yet. Tap the bell on an upcoming match to get a
                    kickoff alert.
                  </Text>
                ) : (
                  reminderList.map((r) => {
                    const k = new Date(r.kickoffISO);
                    const when = k.toLocaleString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    return (
                      <View key={r.matchId} style={styles.reminder}>
                        <Ionicons name="notifications" size={15} color={t.color.accent} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reminderTitle} numberOfLines={1}>
                            {r.title}
                          </Text>
                          <Text style={styles.reminderWhen}>{when}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </Animated.View>
            )}

            {/* SIGN OUT */}
            <Pressable style={styles.signOut} onPress={signOut}>
              <Ionicons name="log-out-outline" size={20} color={t.color.accent} />
              <Text style={styles.signOutText}>Sign out</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>

        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onClose} />
      </View>
    </Modal>
  );
}

function Row({
  t,
  icon,
  label,
  expanded,
  onPress,
}: {
  t: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  expanded: boolean;
  onPress: () => void;
}) {
  const styles = makeStyles(t);
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Ionicons name={icon} size={20} color={t.color.text} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons
        name={expanded ? "chevron-up" : "chevron-down"}
        size={16}
        color={t.color.textFaint}
      />
    </Pressable>
  );
}

function Link({
  t,
  icon,
  label,
  onPress,
}: {
  t: Theme;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const styles = makeStyles(t);
  return (
    <Pressable style={styles.link} onPress={onPress}>
      <Ionicons name={icon} size={16} color={t.color.textDim} />
      <Text style={styles.linkText}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: { flex: 1, flexDirection: "row" },
    panel: {
      width: "78%",
      maxWidth: 320,
      backgroundColor: t.color.surface,
      borderRightWidth: 1,
      borderRightColor: t.color.borderSolid,
      paddingHorizontal: t.space(4),
    },
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
    brand: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(3),
      paddingBottom: t.space(4),
      marginBottom: t.space(2),
      borderBottomWidth: 1,
      borderBottomColor: t.color.borderSolid,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.color.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: { fontSize: 20 },
    brandName: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 20,
      letterSpacing: 1,
    },
    brandSub: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 12,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(3),
      paddingVertical: t.space(3),
    },
    rowLabel: {
      flex: 1,
      color: t.color.text,
      fontFamily: t.font.bodyMed,
      fontSize: 15,
    },
    drawerBody: {
      paddingLeft: t.space(2),
      paddingBottom: t.space(3),
      gap: t.space(1),
    },
    fieldLabel: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 10,
      letterSpacing: 1.5,
      marginBottom: t.space(2),
    },
    pillRow: { flexDirection: "row", gap: t.space(2), flexWrap: "wrap" },
    pill: {
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: t.radius.pill,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      backgroundColor: t.color.bg,
    },
    pillOn: { backgroundColor: t.color.accent, borderColor: t.color.accent },
    pillText: { color: t.color.textDim, fontFamily: t.font.bodyMed, fontSize: 13 },
    pillTextOn: { color: t.color.onAccent },
    link: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(2),
      paddingVertical: t.space(2),
    },
    linkText: { color: t.color.textDim, fontFamily: t.font.body, fontSize: 14 },
    empty: {
      color: t.color.textFaint,
      fontFamily: t.font.body,
      fontSize: 13,
      paddingVertical: t.space(2),
      lineHeight: 18,
    },
    reminder: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(2),
      paddingVertical: t.space(2),
    },
    reminderTitle: { color: t.color.text, fontFamily: t.font.bodyMed, fontSize: 14 },
    reminderWhen: { color: t.color.textDim, fontFamily: t.font.body, fontSize: 12 },
    signOut: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space(3),
      paddingVertical: t.space(4),
      marginTop: t.space(2),
      borderTopWidth: 1,
      borderTopColor: t.color.borderSolid,
    },
    signOutText: {
      color: t.color.accent,
      fontFamily: t.font.bodyMed,
      fontSize: 15,
    },
  });
