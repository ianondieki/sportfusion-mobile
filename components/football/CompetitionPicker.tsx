import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useCompetition } from "../../lib/football-competition-context";
import { COMPETITIONS } from "../../lib/competitions";
import { useTheme } from "../../lib/theme-context";
import type { Theme } from "../../lib/themes";

export default function CompetitionPicker() {
  const t = useTheme();
  const { competition, setCompetition } = useCompetition();
  const styles = useMemo(() => makeStyles(t), [t]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {COMPETITIONS.map((c) => {
        const active = c.code === competition;
        return (
          <Pressable
            key={c.code}
            onPress={() => setCompetition(c.code)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    row: { gap: t.space(2), paddingRight: t.space(2), marginBottom: t.space(3) },
    pill: {
      paddingVertical: 7,
      paddingHorizontal: 14,
      borderRadius: t.radius.pill,
      borderWidth: 1,
      borderColor: t.color.borderSolid,
      backgroundColor: t.color.surface,
    },
    pillActive: { backgroundColor: t.color.accent, borderColor: t.color.accent },
    text: { color: t.color.textDim, fontFamily: t.font.bodyMed, fontSize: 13 },
    textActive: { color: t.color.onAccent },
  });
