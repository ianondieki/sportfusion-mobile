import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "transparent" },
        headerTransparent: true,
        headerTitleStyle: {
          color: t.color.text,
          fontFamily: t.font.display,
          fontSize: 20,
          letterSpacing: 1.5,
        },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: "transparent" },
        tabBarStyle: {
          backgroundColor: t.color.surface,
          borderTopColor: t.color.borderSolid,
          height: 64,
          paddingTop: 6,
        },
        tabBarActiveTintColor: t.color.accent,
        tabBarInactiveTintColor: t.color.textFaint,
        tabBarLabelStyle: {
          fontFamily: t.font.bodyMed,
          fontSize: 10,
          letterSpacing: 1.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "LIVE",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="radio-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="standings"
        options={{
          title: "STANDINGS",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="podium-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "SCHEDULE",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
