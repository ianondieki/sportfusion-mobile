import { useEffect } from "react";
import { View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  SairaCondensed_700Bold,
  SairaCondensed_800ExtraBold,
} from "@expo-google-fonts/saira-condensed";
import { Saira_400Regular, Saira_600SemiBold } from "@expo-google-fonts/saira";
import { ThemeProvider, useTheme } from "../lib/theme-context";
import { PreferencesProvider } from "../lib/preferences-context";
import { SportProvider } from "../lib/sport-context";
import { CompetitionProvider } from "../lib/football-competition-context";
import { MatchRemindersProvider } from "../lib/match-reminders-context";
import { configureNotifications } from "../lib/notifications";
import ErrorBoundary from "../components/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SairaCondensed_700Bold,
    SairaCondensed_800ExtraBold,
    Saira_400Regular,
    Saira_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  // set up the notification handler / Android channel once at startup
  useEffect(() => {
    configureNotifications();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <PreferencesProvider>
          <SportProvider>
            <CompetitionProvider>
              <MatchRemindersProvider>
                <Shell />
              </MatchRemindersProvider>
            </CompetitionProvider>
          </SportProvider>
        </PreferencesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function Shell() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: t.color.bg }}>
      {/* Ambient top glow — a faint accent bleed behind everything */}
      <LinearGradient
        colors={[t.color.bgTint, t.color.bg]}
        locations={[0, 0.45]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: 320 }}
        pointerEvents="none"
      />
      <StatusBar style={t.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "transparent" },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="watch" options={{ presentation: "modal" }} />
      </Stack>
    </View>
  );
}
