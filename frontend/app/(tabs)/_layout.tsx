import { Tabs } from "expo-router";
import { Text, View, Platform } from "react-native";
import { useTheme } from "@/src/theme";

function Icon({ name, focused, colors }: { name: string; focused: boolean; colors: any }) {
  return (
    <View style={{
      width: 36, height: 36, borderRadius: 12,
      alignItems: "center", justifyContent: "center",
      backgroundColor: focused ? colors.brandTertiary : "transparent",
    }}>
      <Text style={{ fontSize: focused ? 20 : 18, opacity: focused ? 1 : 0.55 }}>{name}</Text>
    </View>
  );
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
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.border,
          paddingTop: 6,
          ...(Platform.OS === "web" ? { height: 68 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <Icon name="🏠" focused={focused} colors={colors} /> }} />
      <Tabs.Screen name="materials" options={{ title: "Materiale", tabBarIcon: ({ focused }) => <Icon name="📚" focused={focused} colors={colors} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendario", tabBarIcon: ({ focused }) => <Icon name="📅" focused={focused} colors={colors} /> }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ focused }) => <Icon name="💬" focused={focused} colors={colors} /> }} />
      <Tabs.Screen name="more" options={{ title: "Altro", tabBarIcon: ({ focused }) => <Icon name="⋯" focused={focused} colors={colors} /> }} />
    </Tabs>
  );
}
