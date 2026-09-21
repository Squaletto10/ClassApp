import React, { useCallback, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, Chip, EmptyState, Input, SectionTitle } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

export default function Materials() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [newSubj, setNewSubj] = useState("");

  const load = useCallback(async () => {
    const s = await apiFetch("/subjects");
    setSubjects(s.subjects || []);
    const n = await apiFetch(`/notes${active ? `?subject_id=${active}` : ""}${q ? `${active ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`);
    setNotes(n.notes || []);
  }, [active, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const createNote = async () => {
    if (!active || !title.trim()) return;
    await apiFetch("/notes", { method: "POST", body: JSON.stringify({ subject_id: active, title, description: desc, body: "", attachments: [] }) });
    setTitle(""); setDesc(""); setCreating(false); await load();
  };
  const addSubject = async () => {
    if (!newSubj.trim()) return;
    await apiFetch("/subjects", { method: "POST", body: JSON.stringify({ name: newSubj, order: subjects.length }) });
    setNewSubj(""); await load();
  };
  const delNote = async (id: string) => { await apiFetch(`/notes/${id}`, { method: "DELETE" }); await load(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface, paddingTop: insets.top }}>
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "900" }}>📚 {t("materials")}</Text>
        <Input testID="materials-search" value={q} onChangeText={setQ} placeholder={t("searchPlaceholder")} />
      </View>
      <View style={{ height: 56 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" }}>
          <Chip label={t("all")} active={active === null} onPress={() => setActive(null)} testID="chip-all" />
          {subjects.map((s) => (
            <Chip key={s.id} label={s.name} active={active === s.id} onPress={() => setActive(s.id)} testID={`chip-${s.id}`} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={notes}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
        ListEmptyComponent={<EmptyState emoji="📚" text={t("empty_notes")} />}
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16 }}>{item.title}</Text>
            {item.description ? <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.sm }}>{item.description}</Text> : null}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{t("uploadedBy")}: {item.author_name}</Text>
              {(user?.role === "ADMIN" || item.author_id === user?.id) && (
                <Pressable testID={`del-note-${item.id}`} onPress={() => delNote(item.id)}>
                  <Text style={{ color: colors.error, fontWeight: "700" }}>{t("delete")}</Text>
                </Pressable>
              )}
            </View>
          </Card>
        )}
      />

      {user?.role === "ADMIN" && (
        <View style={{ padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}><Input testID="new-subject-input" value={newSubj} onChangeText={setNewSubj} placeholder="Nuova materia" /></View>
            <Button testID="add-subject-button" label="+" onPress={addSubject} style={{ paddingHorizontal: spacing.lg }} />
          </View>
        </View>
      )}

      <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md }}>
        {active && !creating && <Button testID="show-create-note" label={t("newNote")} onPress={() => setCreating(true)} />}
        {creating && (
          <View style={{ gap: spacing.sm }}>
            <Input testID="note-title-input" value={title} onChangeText={setTitle} placeholder={t("title")} />
            <Input testID="note-desc-input" value={desc} onChangeText={setDesc} placeholder={t("description")} multiline />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Button label={t("cancel")} onPress={() => setCreating(false)} variant="secondary" /></View>
              <View style={{ flex: 1 }}><Button testID="create-note-button" label={t("save")} onPress={createNote} /></View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
