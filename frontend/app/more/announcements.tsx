import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, EmptyState, Input } from "@/src/ui";
import { spacing, useTheme } from "@/src/theme";

export default function Announcements() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [important, setImportant] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => { const r = await apiFetch("/announcements"); setItems(r.announcements || []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    if (!title || !body) return;
    await apiFetch("/announcements", { method: "POST", body: JSON.stringify({ title, body, important }) });
    setTitle(""); setBody(""); setImportant(false); setCreating(false); await load();
  };
  const del = async (id: string) => { await apiFetch(`/announcements/${id}`, { method: "DELETE" }); await load(); };
  const markRead = async (id: string) => { await apiFetch(`/announcements/${id}/read`, { method: "POST" }); await load(); };
  const react = async (id: string) => { await apiFetch(`/announcements/${id}/react`, { method: "POST", body: JSON.stringify({ emoji: "👍" }) }); await load(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}
        ListEmptyComponent={<EmptyState emoji="📢" text={t("empty_ann")} />}
        renderItem={({ item }) => (
          <Card style={item.important ? { borderColor: colors.error, borderWidth: 2 } : undefined}>
            {item.important && <Text style={{ color: colors.error, fontWeight: "900", fontSize: 12 }}>📌 {t("important")}</Text>}
            <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 18, marginTop: spacing.xs }}>{item.title}</Text>
            <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.sm }}>{item.body}</Text>
            <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md, alignItems: "center" }}>
              <Pressable testID={`react-ann-${item.id}`} onPress={() => react(item.id)}><Text>👍</Text></Pressable>
              <Pressable testID={`read-ann-${item.id}`} onPress={() => markRead(item.id)}>
                <Text style={{ color: item.read ? colors.success : colors.brandPrimary, fontWeight: "700" }}>{item.read ? "✓ letto" : "Segna come letto"}</Text>
              </Pressable>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{item.read_count} {t("readCount")}</Text>
              {user?.role === "ADMIN" && (
                <Pressable testID={`del-ann-${item.id}`} onPress={() => del(item.id)}><Text style={{ color: colors.error, fontWeight: "700", marginLeft: "auto" }}>✕</Text></Pressable>
              )}
            </View>
          </Card>
        )}
      />
      {user?.role === "ADMIN" && (
        <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm }}>
          {!creating ? <Button testID="show-create-ann" label={t("newAnnouncement")} onPress={() => setCreating(true)} /> : (
            <>
              <Input testID="ann-title" value={title} onChangeText={setTitle} placeholder={t("title")} />
              <Input testID="ann-body" value={body} onChangeText={setBody} placeholder={t("body")} multiline />
              <Pressable testID="toggle-important" onPress={() => setImportant(!important)} style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={{ width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: important ? colors.error : colors.borderStrong, backgroundColor: important ? colors.error : "transparent" }} />
                <Text style={{ color: colors.onSurface }}>{t("important")}</Text>
              </Pressable>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Button label={t("cancel")} onPress={() => setCreating(false)} variant="secondary" /></View>
                <View style={{ flex: 1 }}><Button testID="create-ann-button" label={t("save")} onPress={create} /></View>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
