import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, EmptyState, Input } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

// Sticky-note colors that read in both light and dark themes.
const STICKY_COLORS = ["#FEF3C7", "#DBEAFE", "#DCFCE7", "#FCE7F3", "#EDE9FE", "#FEE2E2"];

export default function Board() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [color, setColor] = useState<string>(STICKY_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/board");
    setItems(r.notes || []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const post = async () => {
    setErr(null);
    if (!text.trim()) return;
    setBusy(true);
    try {
      await apiFetch("/board", { method: "POST", body: JSON.stringify({ text, color }) });
      setText(""); await load();
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const del = async (id: string) => { await apiFetch(`/board/${id}`, { method: "DELETE" }); await load(); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <Stack.Screen options={{ title: `📌 ${t("board")}` }} />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}
        ListEmptyComponent={<EmptyState emoji="📌" text={t("empty_board")} />}
        renderItem={({ item }) => {
          const bg = item.color || STICKY_COLORS[0];
          const canDelete = user?.role === "ADMIN" || item.author_id === user?.id;
          return (
            <View
              testID={`board-${item.id}`}
              style={{
                flex: 1, backgroundColor: bg, borderRadius: radius.md,
                padding: spacing.md, minHeight: 120,
                // Slight sticky-note offset by index parity - CSS-safe on both platforms
                transform: [{ rotate: item.id.charCodeAt(0) % 2 === 0 ? "-1deg" : "1deg" }],
              }}
            >
              <Text style={{ color: "#1E1B4B", fontSize: 14, lineHeight: 20, fontWeight: "600" }}>{item.text}</Text>
              <View style={{ marginTop: spacing.sm, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#312E81", fontSize: 10, fontWeight: "700" }}>— {item.author_name}</Text>
                {canDelete && (
                  <Pressable testID={`del-board-${item.id}`} onPress={() => del(item.id)}>
                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />

      <View style={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm }}>
        <Input testID="board-text" value={text} onChangeText={setText} placeholder={t("writeSomething")} multiline />
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
          {STICKY_COLORS.map((c) => (
            <Pressable
              key={c}
              testID={`board-color-${c}`}
              onPress={() => setColor(c)}
              style={{
                width: 26, height: 26, borderRadius: 13, backgroundColor: c,
                borderWidth: color === c ? 3 : 1,
                borderColor: color === c ? colors.brandPrimary : colors.border,
              }}
            />
          ))}
        </View>
        {err && <Text style={{ color: colors.error }}>{err}</Text>}
        <Button testID="board-post-button" label={t("postNote")} onPress={post} loading={busy} />
      </View>
    </View>
  );
}
