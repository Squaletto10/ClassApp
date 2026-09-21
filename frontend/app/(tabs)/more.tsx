import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

export default function More() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const items = [
    { key: "homework", emoji: "📝", label: t("homework"), route: "/more/homework" },
    { key: "announcements", emoji: "📢", label: t("announcements"), route: "/more/announcements" },
    { key: "members", emoji: "👥", label: t("classMembers"), route: "/more/members" },
    { key: "polls", emoji: "📊", label: t("polls"), route: "/more/polls" },
    { key: "board", emoji: "📌", label: t("board"), route: "/more/board" },
    { key: "profile", emoji: "👤", label: t("profile"), route: "/more/profile" },
    { key: "settings", emoji: "⚙️", label: t("settings"), route: "/more/settings" },
    { key: "duck", emoji: "🦆", label: t("duckJump"), route: "/more/duckjump" },
  ];
  if (user?.role === "ADMIN") items.push({ key: "admin", emoji: "🛠️", label: t("adminPanel"), route: "/more/admin" });

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl, padding: spacing.lg, gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md }}>
        <Avatar name={`${user?.name || ""} ${user?.surname || ""}`} size={56} />
        <View>
          <Text style={{ color: colors.onSurface, fontWeight: "900", fontSize: 20 }}>{user?.name} {user?.surname}</Text>
          <Text style={{ color: colors.muted }}>@{user?.username} • {user?.role}</Text>
        </View>
      </View>
      {items.map((it) => (
        <Pressable key={it.key} testID={`more-${it.key}`} onPress={() => router.push(it.route as any)}
          style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 26 }}>{it.emoji}</Text>
          <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 16, flex: 1 }}>{it.label}</Text>
          <Text style={{ color: colors.muted }}>›</Text>
        </Pressable>
      ))}
      <Pressable testID="logout-button" onPress={logout} style={{ padding: spacing.lg, backgroundColor: colors.error, borderRadius: radius.pill, alignItems: "center", marginTop: spacing.lg }}>
        <Text style={{ color: colors.onError, fontWeight: "800" }}>{t("logout")}</Text>
      </Pressable>
    </ScrollView>
  );
}
