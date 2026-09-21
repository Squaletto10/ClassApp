import React, { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View, Pressable } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar, Card, EmptyState, SectionTitle } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

const QUICK = [
  { key: "materials", emoji: "📚", label: "materials", route: "/(tabs)/materials" as const },
  { key: "calendar", emoji: "📅", label: "calendar", route: "/(tabs)/calendar" as const },
  { key: "ann", emoji: "📢", label: "announcements", route: "/more/announcements" as const },
  { key: "chat", emoji: "💬", label: "chat", route: "/(tabs)/chat" as const },
  { key: "class", emoji: "👥", label: "classMembers", route: "/more/members" as const },
];

export default function Home() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, cls } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [ann, setAnn] = useState<any[]>([]);
  const [hw, setHw] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, n, a, h] = await Promise.all([
        apiFetch("/events"), apiFetch("/notes"), apiFetch("/announcements"), apiFetch("/homework"),
      ]);
      setEvents(e.events || []); setNotes(n.notes || []); setAnn(a.announcements || []); setHw(h.homework || []);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const upcoming = events.filter((e) => e.date >= new Date().toISOString().slice(0, 10)).slice(0, 3);
  const nextHw = hw.filter((h) => !h.completed && h.due_date >= new Date().toISOString().slice(0, 10)).slice(0, 3);
  const latestAnn = ann[0];
  const latestNotes = notes.slice(0, 3);

  return (
    <ScrollView
      testID="home-scroll"
      style={{ flex: 1, backgroundColor: colors.surface }}
      contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandPrimary} />}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontSize: 13 }}>{cls?.name || "Classe"}</Text>
          <Text style={{ color: colors.onSurface, fontSize: 24, fontWeight: "900" }}>Ciao, {user?.name} 👋</Text>
        </View>
        <Pressable testID="home-profile-avatar" onPress={() => router.push("/more/profile")}>
          <Avatar name={`${user?.name || ""} ${user?.surname || ""}`} size={48} />
        </Pressable>
      </View>

      <View>
        <SectionTitle>{t("quickAccess")}</SectionTitle>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
          {QUICK.map((q) => (
            <Pressable key={q.key} testID={`quick-${q.key}`} onPress={() => router.push(q.route as any)}
              style={{ width: "31%", aspectRatio: 1, backgroundColor: colors.brandTertiary, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
              <Text style={{ fontSize: 28 }}>{q.emoji}</Text>
              <Text style={{ color: colors.onBrandTertiary, fontWeight: "700", fontSize: 12 }}>{t(q.label as any)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <SectionTitle>{t("upcoming")}</SectionTitle>
        {upcoming.length === 0 ? <EmptyState emoji="📅" text={t("empty_events")} /> :
          upcoming.map((e) => (
            <Card key={e.id} style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.brandPrimary, fontWeight: "800", fontSize: 12, textTransform: "uppercase" }}>{e.type}</Text>
              <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 16, marginTop: spacing.xs }}>{e.title}</Text>
              <Text style={{ color: colors.muted, marginTop: spacing.xs }}>{e.date}{e.time ? ` • ${e.time}` : ""}</Text>
            </Card>
          ))}
      </View>

      {nextHw.length > 0 && (
        <View>
          <SectionTitle>{t("homework")}</SectionTitle>
          {nextHw.map((h) => (
            <Card key={h.id} style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 16 }}>{h.title}</Text>
              <Text style={{ color: colors.muted, marginTop: spacing.xs }}>{h.due_date}</Text>
            </Card>
          ))}
        </View>
      )}

      {latestAnn && (
        <View>
          <SectionTitle>{t("latestAnnouncement")}</SectionTitle>
          <Card>
            {latestAnn.important && <Text style={{ color: colors.error, fontWeight: "900", fontSize: 12 }}>📌 {t("important")}</Text>}
            <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 18, marginTop: spacing.xs }}>{latestAnn.title}</Text>
            <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.sm }} numberOfLines={3}>{latestAnn.body}</Text>
          </Card>
        </View>
      )}

      <View>
        <SectionTitle>{t("latestNotes")}</SectionTitle>
        {latestNotes.length === 0 ? <EmptyState emoji="📚" text={t("empty_notes")} /> :
          latestNotes.map((n) => (
            <Card key={n.id} style={{ marginBottom: spacing.md }}>
              <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 15 }}>{n.title}</Text>
              <Text style={{ color: colors.muted, marginTop: spacing.xs, fontSize: 12 }}>{t("uploadedBy")}: {n.author_name}</Text>
            </Card>
          ))}
      </View>
    </ScrollView>
  );
}
