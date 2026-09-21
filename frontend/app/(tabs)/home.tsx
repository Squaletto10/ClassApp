import React, { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar, Card, EmptyState, IconTile, SectionTitle } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

const QUICK = [
  { key: "materials", emoji: "📚", label: "materials", route: "/(tabs)/materials", tile: 0 },
  { key: "calendar", emoji: "📅", label: "calendar", route: "/(tabs)/calendar", tile: 2 },
  { key: "ann", emoji: "📢", label: "announcements", route: "/more/announcements", tile: 1 },
  { key: "chat", emoji: "💬", label: "chat", route: "/(tabs)/chat", tile: 3 },
  { key: "class", emoji: "👥", label: "classMembers", route: "/more/members", tile: 4 },
  { key: "polls", emoji: "📊", label: "polls", route: "/more/polls", tile: 5 },
];

function dateLabel(iso: string): { day: string; month: string; full: string } {
  const d = new Date(iso + (iso.length <= 10 ? "T00:00:00" : ""));
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "").toUpperCase();
  const full = d.toLocaleDateString("it-IT", { day: "numeric", month: "long" });
  return { day, month, full };
}

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

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = events.filter((e) => e.date >= today).slice(0, 3);
  const nextHw = hw.filter((h) => !h.completed && h.due_date >= today).slice(0, 3);
  const latestAnn = ann[0];
  const latestNotes = notes.slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={{ paddingBottom: spacing.xxxl, gap: spacing.lg, paddingTop: insets.top + spacing.md }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.brandPrimary} />}
      >
        {/* Top pill: class name + avatar */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: spacing.md,
            backgroundColor: colors.surfaceSecondary, padding: spacing.sm, paddingLeft: spacing.md,
            borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
          }}>
            <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.onBrandPrimary, fontWeight: "900" }}>{(cls?.name?.[0] || "C").toUpperCase()}</Text>
            </View>
            <Text style={{ flex: 1, color: colors.onSurface, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>{cls?.name || "Classe"}</Text>
            <Pressable testID="home-profile-avatar" onPress={() => router.push("/more/profile")}>
              <Avatar name={`${user?.name || ""} ${user?.surname || ""}`} size={40} />
            </Pressable>
          </View>
        </View>

        {/* Greeting */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "900" }}>Ciao, {user?.name}! 👋</Text>
          <Text style={{ color: colors.muted, marginTop: spacing.xs }}>Benvenuto nella tua classe</Text>
        </View>

        {/* Prossimo evento */}
        {upcoming[0] && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SectionTitle>{t("upcoming")}</SectionTitle>
            <Pressable onPress={() => router.push("/(tabs)/calendar")}>
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                  {(() => { const d = dateLabel(upcoming[0].date); return (
                    <View style={{ width: 56, borderRadius: radius.md, backgroundColor: colors.brandTertiary, paddingVertical: spacing.sm, alignItems: "center" }}>
                      <Text style={{ color: colors.onBrandTertiary, fontWeight: "900", fontSize: 20 }}>{d.day}</Text>
                      <Text style={{ color: colors.onBrandTertiary, fontWeight: "700", fontSize: 10 }}>{d.month}</Text>
                    </View>
                  ); })()}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.brandPrimary, fontWeight: "800", fontSize: 11, textTransform: "uppercase" }}>{upcoming[0].type}</Text>
                    <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16, marginTop: 2 }}>{upcoming[0].title}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{dateLabel(upcoming[0].date).full}{upcoming[0].time ? ` • ${upcoming[0].time}` : ""}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          </View>
        )}

        {/* Ultimo annuncio */}
        {latestAnn && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SectionTitle>{t("latestAnnouncement")}</SectionTitle>
            <Pressable onPress={() => router.push("/more/announcements")}>
              <Card style={latestAnn.important ? { borderColor: colors.error, borderWidth: 2 } : undefined}>
                {latestAnn.important && (
                  <View style={{ alignSelf: "flex-start", backgroundColor: colors.error, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm, marginBottom: spacing.sm }}>
                    <Text style={{ color: colors.onError, fontWeight: "900", fontSize: 10 }}>📌 {t("important")}</Text>
                  </View>
                )}
                <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16 }}>{latestAnn.title}</Text>
                <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.sm, lineHeight: 20 }} numberOfLines={3}>{latestAnn.body}</Text>
              </Card>
            </Pressable>
          </View>
        )}

        {/* Prossimi compiti */}
        {nextHw.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <SectionTitle action={<Pressable onPress={() => router.push("/more/homework")}><Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>Leggi tutto</Text></Pressable>}>{t("homework")}</SectionTitle>
            <View style={{ gap: spacing.sm }}>
              {nextHw.map((h) => {
                const d = dateLabel(h.due_date);
                return (
                  <Card key={h.id}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                      <View style={{ width: 44, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, alignItems: "center", paddingVertical: 6 }}>
                        <Text style={{ color: colors.onSurfaceTertiary, fontWeight: "900" }}>{d.day}</Text>
                        <Text style={{ color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" }}>{d.month}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.onSurface, fontWeight: "700" }}>{h.title}</Text>
                        {h.description ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{h.description}</Text> : null}
                      </View>
                    </View>
                  </Card>
                );
              })}
            </View>
          </View>
        )}

        {/* Quick access */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SectionTitle>{t("quickAccess")}</SectionTitle>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
            {QUICK.map((q) => (
              <Pressable key={q.key} testID={`quick-${q.key}`} onPress={() => router.push(q.route as any)}
                style={{ width: "31%", aspectRatio: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: spacing.xs }}>
                <IconTile emoji={q.emoji} index={q.tile} size={44} />
                <Text style={{ color: colors.onSurface, fontWeight: "700", fontSize: 12, marginTop: 2 }}>{t(q.label as any)}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Ultimi appunti */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <SectionTitle action={<Pressable onPress={() => router.push("/(tabs)/materials")}><Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>Vedi tutti</Text></Pressable>}>{t("latestNotes")}</SectionTitle>
          {latestNotes.length === 0 ? <EmptyState emoji="📚" text={t("empty_notes")} /> : (
            <View style={{ gap: spacing.sm }}>
              {latestNotes.map((n, i) => (
                <Card key={n.id}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <IconTile emoji="📄" index={i} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.onSurface, fontWeight: "700" }} numberOfLines={1}>{n.title}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{t("uploadedBy")}: {n.author_name}</Text>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
