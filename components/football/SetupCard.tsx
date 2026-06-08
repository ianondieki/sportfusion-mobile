import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";

// Shown when no football API key is set (or it's invalid).
export default function SetupCard({ message }: { message?: string }) {
  const t = useTheme();
  const styles = useMemo(() => makeStyles(t), [t]);
  return (
    <View style={styles.card}>
      <Ionicons name="football-outline" size={48} color={t.color.accent} />
      <Text style={styles.title}>FOOTBALL SETUP</Text>
      <Text style={styles.body}>
        {message ??
          "Add a free football-data.org API key to load matches and tables."}
      </Text>
      <View style={styles.steps}>
        <Text style={styles.step}>
          1 · Register free at football-data.org
        </Text>
        <Text style={styles.step}>
          2 · Paste the key into FOOTBALL_API_KEY in lib/config.ts
        </Text>
        <Text style={styles.step}>3 · Reload the app</Text>
      </View>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      alignItems: "center",
      gap: t.space(3),
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      borderRadius: t.radius.lg,
      padding: t.space(7),
    },
    title: {
      color: t.color.text,
      fontFamily: t.font.display,
      fontSize: 24,
      letterSpacing: 1,
    },
    body: {
      color: t.color.textDim,
      fontFamily: t.font.body,
      fontSize: 14,
      lineHeight: 21,
      textAlign: "center",
    },
    steps: {
      alignSelf: "stretch",
      gap: 6,
      marginTop: t.space(2),
      paddingTop: t.space(3),
      borderTopWidth: 1,
      borderTopColor: t.color.borderSolid,
    },
    step: { color: t.color.textFaint, fontFamily: t.font.body, fontSize: 13 },
  });
