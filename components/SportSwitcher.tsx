import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSport, type Sport } from "../lib/sport-context";
import { useTheme } from "../lib/theme-context";
import type { Theme } from "../lib/themes";

const OPTIONS: { key: Sport; label: string }[] = [
  { key: "f1", label: "FORMULA 1" },
  { key: "football", label: "FOOTBALL" },
];

export default function SportSwitcher() {
  const t = useTheme();
  const { sport, setSport } = useSport();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <View style={styles.track}>
      {OPTIONS.map((o) => {
        const active = o.key === sport;
        return (
          <Pressable
            key={o.key}
            onPress={() => setSport(o.key)}
            style={[styles.seg, active && styles.segActive]}
          >
            <Text style={[styles.segText, active && styles.segTextActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: "row",
      backgroundColor: t.color.surface,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      borderRadius: t.radius.pill,
      padding: 4,
      marginTop: t.space(4),
      marginBottom: t.space(3),
    },
    seg: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 8,
      borderRadius: t.radius.pill,
    },
    segActive: { backgroundColor: t.color.accent },
    segText: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 12,
      letterSpacing: 2,
    },
    segTextActive: { color: t.color.onAccent },
  });
