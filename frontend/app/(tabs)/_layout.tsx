import { Tabs } from "expo-router";
import { Text, Platform } from "react-native";
import { useTheme } from "@/src/theme";

// Emoji-based icons for cross-platform simplicity (Phosphor via SF Symbols/vector icons need extra setup).
function Icon({ name, focused }: { name: string; focused: boolean }) {
  return <Text style={{ fontSize: focused ? 22 : 20, opacity: focused ? 1 : 0.6 }}>{name}</Text>;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <Icon name="🏠" focused={focused} /> }} />
      <Tabs.Screen name="materials" options={{ title: "Materiale", tabBarIcon: ({ focused }) => <Icon name="📚" focused={focused} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendario", tabBarIcon: ({ focused }) => <Icon name="📅" focused={focused} /> }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ focused }) => <Icon name="💬" focused={focused} /> }} />
      <Tabs.Screen name="more" options={{ title: "Altro", tabBarIcon: ({ focused }) => <Icon name="⋯" focused={focused} /> }} />
    </Tabs>
  );
}
