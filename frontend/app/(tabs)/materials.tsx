import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, Chip, EmptyState, Fab, IconTile, Input, ListRow, SectionTitle } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

const SUBJ_EMOJI: Record<string, string> = {
  matematica: "📐", italiano: "📖", storia: "🏛️", inglese: "🌍",
  informatica: "💻", fisica: "🧪", scienze: "🔬", diritto: "⚖️",
  "educazione fisica": "⚽",
};
const emojiFor = (name: string) => SUBJ_EMOJI[name.toLowerCase().trim()] || "📚";

export default function Materials() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showSubjModal, setShowSubjModal] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [newSubj, setNewSubj] = useState("");
  const [pickSubj, setPickSubj] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await apiFetch("/subjects");
    setSubjects(s.subjects || []);
    const query = `${active ? `?subject_id=${active}` : ""}${q ? `${active ? "&" : "?"}q=${encodeURIComponent(q)}` : ""}`;
    const n = await apiFetch(`/notes${query}`);
    setNotes(n.notes || []);
  }, [active, q]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const countBySubject = useMemo(() => {
    const m: Record<string, number> = {};
    for (const n of notes) m[n.subject_id] = (m[n.subject_id] || 0) + 1;
    return m;
  }, [notes]);

  const createNote = async () => {
    if (!pickSubj || !title.trim()) return;
    await apiFetch("/notes", { method: "POST", body: JSON.stringify({ subject_id: pickSubj, title, description: desc, body: "", attachments: [] }) });
    setTitle(""); setDesc(""); setPickSubj(null); setShowCreate(false); await load();
  };
  const addSubject = async () => {
    if (!newSubj.trim()) return;
    await apiFetch("/subjects", { method: "POST", body: JSON.stringify({ name: newSubj, order: subjects.length }) });
    setNewSubj(""); setShowSubjModal(false); await load();
  };
  const delNote = async (id: string) => { await apiFetch(`/notes/${id}`, { method: "DELETE" }); await load(); };

  const showList = active !== null || q.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: colors.onSurface, fontSize: 28, fontWeight: "900" }}>📚 {t("materials")}</Text>
          <View style={{ marginTop: spacing.md }}>
            <Input testID="materials-search" value={q} onChangeText={setQ} placeholder={t("searchPlaceholder")} />
          </View>
        </View>
        <View style={{ height: 52 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, alignItems: "center" }}>
            <Chip label={t("all")} active={active === null} onPress={() => setActive(null)} testID="chip-all" />
            {subjects.map((s) => (
              <Chip key={s.id} label={s.name} active={active === s.id} onPress={() => setActive(s.id)} testID={`chip-${s.id}`} />
            ))}
          </ScrollView>
        </View>
      </View>

      {showList ? (
        <FlatList
          data={notes}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: insets.bottom + 96 }}
          ListEmptyComponent={<EmptyState emoji="📚" text={t("empty_notes")} />}
          renderItem={({ item, index }) => (
            <Card>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.md }}>
                <IconTile emoji="📄" index={index} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 15 }}>{item.title}</Text>
                  {item.description ? <Text style={{ color: colors.onSurfaceSecondary, marginTop: spacing.xs, fontSize: 13 }}>{item.description}</Text> : null}
                  <Text style={{ color: colors.muted, marginTop: spacing.sm, fontSize: 11 }}>{t("uploadedBy")}: {item.author_name}</Text>
                </View>
                {(user?.role === "ADMIN" || item.author_id === user?.id) && (
                  <Pressable testID={`del-note-${item.id}`} onPress={() => delNote(item.id)}>
                    <Text style={{ color: colors.error, fontSize: 18 }}>✕</Text>
                  </Pressable>
                )}
              </View>
            </Card>
          )}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm, paddingBottom: insets.bottom + 96 }}>
          <SectionTitle action={user?.role === "ADMIN" ? (
            <Pressable testID="add-subject" onPress={() => setShowSubjModal(true)}><Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>+ Materia</Text></Pressable>
          ) : undefined}>{t("subjects")}</SectionTitle>
          {subjects.length === 0 ? <EmptyState emoji="📚" text="Nessuna materia" /> : subjects.map((s, i) => (
            <ListRow
              key={s.id}
              testID={`subject-row-${s.id}`}
              emoji={emojiFor(s.name)}
              index={i}
              title={s.name}
              subtitle={`${countBySubject[s.id] || 0} appunti`}
              onPress={() => setActive(s.id)}
            />
          ))}
        </ScrollView>
      )}

      <Fab testID="fab-note" onPress={() => setShowCreate(true)} bottom={insets.bottom + 24} />

      {/* Create note modal */}
      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
            <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
            <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "900" }}>{t("newNote")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, alignItems: "center" }}>
              {subjects.map((s) => (
                <Chip key={s.id} label={s.name} active={pickSubj === s.id} onPress={() => setPickSubj(s.id)} testID={`pick-subj-${s.id}`} />
              ))}
            </ScrollView>
            <Input testID="note-title-input" value={title} onChangeText={setTitle} placeholder={t("title")} />
            <Input testID="note-desc-input" value={desc} onChangeText={setDesc} placeholder={t("description")} multiline />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Button label={t("cancel")} variant="secondary" onPress={() => setShowCreate(false)} /></View>
              <View style={{ flex: 1 }}><Button testID="create-note-button" label={t("save")} onPress={createNote} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add subject modal (admin) */}
      <Modal visible={showSubjModal} animationType="slide" transparent onRequestClose={() => setShowSubjModal(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.4)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, paddingBottom: insets.bottom + spacing.lg, gap: spacing.md }}>
            <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "900" }}>Nuova materia</Text>
            <Input testID="new-subject-input" value={newSubj} onChangeText={setNewSubj} placeholder="Nome materia" autoCapitalize="words" />
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Button label={t("cancel")} variant="secondary" onPress={() => setShowSubjModal(false)} /></View>
              <View style={{ flex: 1 }}><Button testID="add-subject-button" label={t("save")} onPress={addSubject} /></View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
