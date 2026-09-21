import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar, Button, EmptyState, Input } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

export default function Chat() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const r = await apiFetch("/messages");
    setMessages(r.messages || []);
  }, []);
  useFocusEffect(useCallback(() => { load(); const i = setInterval(load, 4000); return () => clearInterval(i); }, [load]));
  useEffect(() => { setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50); }, [messages.length]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      await apiFetch("/messages", { method: "POST", body: JSON.stringify({ text: text.trim(), reply_to: replyTo?.id }) });
      setText(""); setReplyTo(null); await load();
    } catch (e: any) { alert(e.message); }
  };
  const del = async (id: string) => { await apiFetch(`/messages/${id}`, { method: "DELETE" }); await load(); };
  const pin = async (id: string) => { await apiFetch(`/messages/${id}/pin`, { method: "POST" }); await load(); };
  const react = async (id: string, emoji: string) => { await apiFetch(`/messages/${id}/react`, { method: "POST", body: JSON.stringify({ emoji }) }); await load(); };

  const pinned = messages.filter((m) => m.pinned && !m.deleted);
  const isAdmin = user?.role === "ADMIN";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0} style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Text style={{ color: colors.onSurface, fontSize: 22, fontWeight: "900" }}>💬 {t("chat")}</Text>
        </View>
        {pinned.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "700", marginBottom: spacing.xs }}>📌 PINNED</Text>
            {pinned.map((m) => (
              <View key={m.id} style={{ backgroundColor: colors.brandTertiary, padding: spacing.sm, borderRadius: radius.md, marginBottom: spacing.xs }}>
                <Text style={{ color: colors.onBrandTertiary, fontSize: 12 }} numberOfLines={2}>{m.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={<EmptyState emoji="💬" text={t("empty_chat")} />}
        renderItem={({ item }) => {
          const mine = item.author_id === user?.id;
          const original = item.reply_to ? messages.find((x) => x.id === item.reply_to) : null;
          return (
            <View style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start" }}>
              {!mine && <Avatar name={item.author_name || "?"} size={32} />}
              <Pressable
                testID={`msg-${item.id}`}
                onLongPress={() => {
                  if (item.deleted) return;
                  const canDel = isAdmin || mine;
                  const actions = ["👍 Reagisci", "↩️ Rispondi", isAdmin ? "📌 Pin" : null, canDel ? "🗑️ Elimina" : null].filter(Boolean).join("\n");
                  alert(actions);
                }}
                onPress={() => !item.deleted && setReplyTo(item)}
                style={{
                  maxWidth: "78%", marginHorizontal: spacing.sm,
                  backgroundColor: mine ? colors.brandPrimary : colors.surfaceSecondary,
                  padding: spacing.md, borderRadius: radius.md, borderBottomRightRadius: mine ? 4 : radius.md, borderBottomLeftRadius: mine ? radius.md : 4,
                }}
              >
                {!mine && <Text style={{ color: colors.brandPrimary, fontWeight: "800", fontSize: 12, marginBottom: spacing.xs }}>{item.author_name}</Text>}
                {original && (
                  <View style={{ backgroundColor: mine ? "rgba(255,255,255,0.2)" : colors.surfaceTertiary, padding: spacing.xs, borderRadius: 6, marginBottom: spacing.xs }}>
                    <Text style={{ color: mine ? colors.onBrandPrimary : colors.onSurfaceTertiary, fontSize: 11 }} numberOfLines={1}>↩️ {original.text}</Text>
                  </View>
                )}
                {item.deleted ? (
                  <Text style={{ color: mine ? colors.onBrandPrimary : colors.muted, fontStyle: "italic" }}>{t("messageDeleted")}</Text>
                ) : (
                  <Text style={{ color: mine ? colors.onBrandPrimary : colors.onSurface }}>{item.text}</Text>
                )}
                <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
                  {!item.deleted && (
                    <>
                      <Pressable testID={`react-${item.id}`} onPress={() => react(item.id, "👍")}><Text style={{ fontSize: 12 }}>👍</Text></Pressable>
                      {isAdmin && <Pressable testID={`pin-${item.id}`} onPress={() => pin(item.id)}><Text style={{ fontSize: 12 }}>📌</Text></Pressable>}
                      {(mine || isAdmin) && <Pressable testID={`del-${item.id}`} onPress={() => del(item.id)}><Text style={{ fontSize: 12 }}>🗑️</Text></Pressable>}
                    </>
                  )}
                </View>
              </Pressable>
            </View>
          );
        }}
      />

      {replyTo && (
        <View style={{ padding: spacing.sm, backgroundColor: colors.surfaceTertiary, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 12 }} numberOfLines={1}>↩️ {replyTo.author_name}: {replyTo.text}</Text>
          <Pressable onPress={() => setReplyTo(null)}><Text style={{ color: colors.error, fontWeight: "700" }}>✕</Text></Pressable>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingBottom: Math.max(spacing.md, insets.bottom), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }}>
        <View style={{ flex: 1 }}>
          <Input testID="chat-input" value={text} onChangeText={setText} placeholder={t("typeMessage")} />
        </View>
        <Button testID="chat-send-button" label={t("send")} onPress={send} />
      </View>
    </KeyboardAvoidingView>
  );
}
