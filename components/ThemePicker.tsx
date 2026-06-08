import { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useThemeControls } from "../lib/theme-context";
import { THEME_LIST, type Theme } from "../lib/themes";

export default function ThemePicker() {
  const { theme, themeName, setThemeName } = useThemeControls();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Text style={styles.label}>THEME</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {THEME_LIST.map((t) => {
          const active = t.name === themeName;
          return (
            <Pressable
              key={t.name}
              onPress={() => setThemeName(t.name)}
              style={[
                styles.pill,
                active && { borderColor: theme.color.accent, backgroundColor: theme.color.surfaceAlt },
              ]}
            >
              <View style={styles.swatch}>
                <View style={[styles.swHalf, { backgroundColor: t.swatch[1] }]} />
                <View style={[styles.swHalf, { backgroundColor: t.swatch[0] }]} />
              </View>
              <Text style={[styles.pillText, active && { color: theme.color.text }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    label: {
      color: t.color.textFaint,
      fontFamily: t.font.bodyMed,
      fontSize: 11,
      letterSpacing: 2,
      marginBottom: t.space(2),
    },
    row: { gap: t.space(2), paddingRight: t.space(2) },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: t.radius.pill,
      borderWidth: 1.5,
      borderColor: t.color.borderSolid,
      backgroundColor: t.color.surface,
    },
    swatch: {
      width: 18,
      height: 18,
      borderRadius: 9,
      overflow: "hidden",
      flexDirection: "row",
      borderWidth: 1,
      borderColor: t.color.borderSolid,
    },
    swHalf: { flex: 1, height: "100%" },
    pillText: {
      color: t.color.textDim,
      fontFamily: t.font.bodyMed,
      fontSize: 13,
    },
  });
