import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, EmptyState, Input } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

type Poll = {
  id: string; question: string; options: string[];
  results: { index: number; text: string; count: number; pct: number }[];
  total: number; my_choice: number | null; closed: boolean; author_name: string; created_at: string;
};

export default function Polls() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Poll[]>([]);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/polls");
    setItems(r.polls || []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    setErr(null);
    const clean = opts.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || clean.length < 2) { setErr("Servono una domanda e almeno 2 opzioni"); return; }
    setBusy(true);
    try {
      await apiFetch("/polls", { method: "POST", body: JSON.stringify({ question: q, options: clean }) });
      setQ(""); setOpts(["", ""]); setCreating(false); await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const vote = async (pid: string, idx: number) => {
    try { await apiFetch(`/polls/${pid}/vote`, { method: "POST", body: JSON.stringify({ option_index: idx }) }); await load(); }
    catch (e: any) { alert(e.message); }
  };
  const closePoll = async (pid: string) => { await apiFetch(`/polls/${pid}/close`, { method: "POST" }); await load(); };
  const del = async (pid: string) => { await apiFetch(`/polls/${pid}`, { method: "DELETE" }); await load(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ title: `📊 ${t("polls")}` }} />
      <FlatList
        data={items}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}
        ListEmptyComponent={<EmptyState emoji="📊" text={t("empty_polls")} />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
              <Text style={{ flex: 1, color: colors.onSurface, fontWeight: "800", fontSize: 16 }}>{item.question}</Text>
              {item.closed && <Text style={{ color: colors.warning, fontWeight: "800", fontSize: 11 }}>🔒 {t("closed")}</Text>}
            </View>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.xs }}>{item.author_name}</Text>

            <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
              {item.results.map((r) => {
                const selected = item.my_choice === r.index;
                return (
                  <Pressable
                    key={r.index}
                    testID={`poll-${item.id}-opt-${r.index}`}
                    disabled={item.closed}
                    onPress={() => vote(item.id, r.index)}
                    style={{
                      borderWidth: 2, borderColor: selected ? colors.brandPrimary : colors.border,
                      backgroundColor: colors.surfaceTertiary, borderRadius: radius.md, overflow: "hidden",
                    }}
                  >
                    <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${r.pct}%`, backgroundColor: selected ? colors.brandTertiary : colors.divider }} />
                    <View style={{ flexDirection: "row", justifyContent: "space-between", padding: spacing.md }}>
                      <Text style={{ color: colors.onSurface, fontWeight: selected ? "800" : "600", flex: 1 }}>{r.text}</Text>
                      <Text style={{ color: colors.muted, fontWeight: "700" }}>{r.pct}% · {r.count}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={{ color: colors.muted, fontSize: 12, marginTop: spacing.md }}>{item.total} {t("votes")}</Text>

            {user?.role === "ADMIN" && (
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
                {!item.closed && (
                  <Pressable testID={`close-poll-${item.id}`} onPress={() => closePoll(item.id)}>
                    <Text style={{ color: colors.warning, fontWeight: "700" }}>🔒 {t("close")}</Text>
                  </Pressable>
                )}
                <Pressable testID={`del-poll-${item.id}`} onPress={() => del(item.id)}>
                  <Text style={{ color: colors.error, fontWeight: "700" }}>{t("delete")}</Text>
                </Pressable>
              </View>
            )}
          </Card>
        )}
      />

      {user?.role === "ADMIN" && (
        <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm }}>
          {!creating ? (
            <Button testID="show-create-poll" label={t("newPoll")} onPress={() => setCreating(true)} />
          ) : (
            <>
              <Input testID="poll-question" value={q} onChangeText={setQ} placeholder={t("question")} />
              {opts.map((o, i) => (
                <Input
                  key={i}
                  testID={`poll-option-${i}`}
                  value={o}
                  onChangeText={(v: string) => setOpts((prev) => prev.map((x, j) => (j === i ? v : x)))}
                  placeholder={`${t("options")} ${i + 1}`}
                />
              ))}
              {opts.length < 8 && (
                <Pressable testID="poll-add-option" onPress={() => setOpts((p) => [...p, ""])}>
                  <Text style={{ color: colors.brandPrimary, fontWeight: "700", padding: spacing.sm }}>{t("addOption")}</Text>
                </Pressable>
              )}
              {err && <Text style={{ color: colors.error }}>{err}</Text>}
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Button label={t("cancel")} variant="secondary" onPress={() => { setCreating(false); setErr(null); }} /></View>
                <View style={{ flex: 1 }}><Button testID="create-poll-button" label={t("save")} onPress={create} loading={busy} /></View>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
