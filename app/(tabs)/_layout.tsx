import { useState } from "react";
import { Pressable } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../lib/theme-context";
import BreathingChatIcon from "../../components/BreathingChatIcon";
import Sidebar from "../../components/Sidebar";

export default function TabsLayout() {
  const t = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuButton = () => (
    <Pressable
      hitSlop={12}
      onPress={() => setSidebarOpen(true)}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="menu" size={26} color={t.color.text} />
    </Pressable>
  );

  return (
    <>
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
          // Android: don't leave a dead tab bar floating above the keyboard
          // while typing to APEX.
          tabBarHideOnKeyboard: true,
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
            // The sidebar opens from any tab's header.
            headerLeft: menuButton,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="radio-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="standings"
          options={{
            title: "STANDINGS",
            headerLeft: menuButton,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="podium-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: "SCHEDULE",
            headerLeft: menuButton,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "CHAT",
            headerShown: false,
            tabBarIcon: ({ color, size, focused }) => (
              <BreathingChatIcon color={color} size={size} focused={focused} />
            ),
          }}
        />
      </Tabs>

      {/* App-level sidebar, opened from the Live tab */}
      <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
