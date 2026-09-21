import React, { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, Chip, EmptyState, Input } from "@/src/ui";
import { spacing, useTheme } from "@/src/theme";

const TYPES = [
  { key: "verifica", emoji: "🔴", color: "#EF4444" },
  { key: "interrogazione", emoji: "🟠", color: "#F59E0B" },
  { key: "compito", emoji: "🔵", color: "#3B82F6" },
  { key: "evento", emoji: "🟢", color: "#10B981" },
  { key: "consegna", emoji: "🟣", color: "#7C3AED" },
  { key: "altro", emoji: "⚪", color: "#64748B" },
];

export default function Calendar() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("verifica");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [desc, setDesc] = useState("");

  const load = useCallback(async () => {
    const r = await apiFetch("/events");
    setEvents(r.events || []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!title || !date) return;
    await apiFetch("/events", { method: "POST", body: JSON.stringify({ title, type, date, time: time || null, description: desc }) });
    setTitle(""); setDate(""); setTime(""); setDesc(""); setCreating(false); await load();
  };
  const del = async (id: string) => { await apiFetch(`/events/${id}`, { method: "DELETE" }); await load(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ padding: spacing.lg }}>
        <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "900" }}>📅 {t("calendar")}</Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
        ListEmptyComponent={<EmptyState emoji="📅" text={t("empty_events")} />}
        renderItem={({ item }) => {
          const tt = TYPES.find((x) => x.key === item.type) || TYPES[5];
          return (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tt.color }} />
                <Text style={{ color: colors.muted, fontSize: 12, textTransform: "uppercase", fontWeight: "800" }}>{t(item.type as any)}</Text>
              </View>
              <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16, marginTop: spacing.xs }}>{item.title}</Text>
              <Text style={{ color: colors.muted, marginTop: spacing.xs }}>{item.date}{item.time ? ` • ${item.time}` : ""}</Text>
              {item.description ? <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.sm }}>{item.description}</Text> : null}
              {user?.role === "ADMIN" && (
                <Pressable testID={`del-event-${item.id}`} onPress={() => del(item.id)} style={{ marginTop: spacing.sm }}>
                  <Text style={{ color: colors.error, fontWeight: "700" }}>{t("delete")}</Text>
                </Pressable>
              )}
            </Card>
          );
        }}
      />

      {user?.role === "ADMIN" && (
        <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
          {!creating ? (
            <Button testID="show-create-event" label={t("newEvent")} onPress={() => setCreating(true)} />
          ) : (
            <View style={{ gap: spacing.sm }}>
              <Input testID="event-title-input" value={title} onChangeText={setTitle} placeholder={t("title")} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                {TYPES.map((tt) => (
                  <Chip key={tt.key} label={t(tt.key as any)} active={type === tt.key} onPress={() => setType(tt.key)} testID={`type-${tt.key}`} />
                ))}
              </ScrollView>
              <Input testID="event-date-input" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
              <Input testID="event-time-input" value={time} onChangeText={setTime} placeholder="HH:MM" />
              <Input testID="event-desc-input" value={desc} onChangeText={setDesc} placeholder={t("description")} multiline />
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Button label={t("cancel")} onPress={() => setCreating(false)} variant="secondary" /></View>
                <View style={{ flex: 1 }}><Button testID="create-event-button" label={t("save")} onPress={create} /></View>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
