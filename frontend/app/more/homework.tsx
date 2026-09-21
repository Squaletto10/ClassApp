import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, EmptyState, Input } from "@/src/ui";
import { spacing, useTheme } from "@/src/theme";

export default function Homework() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [hw, setHw] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [desc, setDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => { const r = await apiFetch("/homework"); setHw(r.homework || []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = async (id: string) => { await apiFetch(`/homework/${id}/toggle`, { method: "POST" }); await load(); };
  const create = async () => {
    if (!title || !due) return;
    await apiFetch("/homework", { method: "POST", body: JSON.stringify({ title, due_date: due, description: desc }) });
    setTitle(""); setDue(""); setDesc(""); setCreating(false); await load();
  };
  const del = async (id: string) => { await apiFetch(`/homework/${id}`, { method: "DELETE" }); await load(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <FlatList
        data={hw}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}
        ListEmptyComponent={<EmptyState emoji="📝" text={t("empty_hw")} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Pressable testID={`toggle-hw-${item.id}`} onPress={() => toggle(item.id)}
                style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: item.completed ? colors.success : colors.borderStrong, backgroundColor: item.completed ? colors.success : "transparent", alignItems: "center", justifyContent: "center" }}>
                {item.completed && <Text style={{ color: colors.onSuccess, fontWeight: "900" }}>✓</Text>}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16, textDecorationLine: item.completed ? "line-through" : "none" }}>{item.title}</Text>
                <Text style={{ color: colors.muted, marginTop: spacing.xs }}>{item.due_date}</Text>
                {item.description ? <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.xs }}>{item.description}</Text> : null}
              </View>
              {user?.role === "ADMIN" && (
                <Pressable testID={`del-hw-${item.id}`} onPress={() => del(item.id)}><Text style={{ color: colors.error, fontWeight: "700" }}>✕</Text></Pressable>
              )}
            </View>
          </Card>
        )}
      />
      {user?.role === "ADMIN" && (
        <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm }}>
          {!creating ? <Button testID="show-create-hw" label={t("newHomework")} onPress={() => setCreating(true)} /> : (
            <>
              <Input testID="hw-title" value={title} onChangeText={setTitle} placeholder={t("title")} />
              <Input testID="hw-due" value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" />
              <Input testID="hw-desc" value={desc} onChangeText={setDesc} placeholder={t("description")} multiline />
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Button label={t("cancel")} onPress={() => setCreating(false)} variant="secondary" /></View>
                <View style={{ flex: 1 }}><Button testID="create-hw-button" label={t("save")} onPress={create} /></View>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
