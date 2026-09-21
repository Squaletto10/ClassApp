import React, { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar, EmptyState, Input } from "@/src/ui";
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
      {/* Sticky header */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 20 }}>💬</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "900" }}>Chat classe</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{messages.filter((m) => !m.deleted).length} messaggi</Text>
          </View>
        </View>
        {pinned.length > 0 && (
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <View style={{
              flexDirection: "row", alignItems: "center", gap: spacing.sm,
              backgroundColor: colors.surfaceTertiary, padding: spacing.sm, paddingHorizontal: spacing.md,
              borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandTertiary,
            }}>
              <Text style={{ fontSize: 14 }}>📌</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "800" }}>MESSAGGIO FISSATO</Text>
                <Text style={{ color: colors.onSurface, fontSize: 12 }} numberOfLines={2}>{pinned[0].text}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        ListEmptyComponent={<EmptyState emoji="💬" text={t("empty_chat")} />}
        renderItem={({ item }) => {
          const mine = item.author_id === user?.id;
          const original = item.reply_to ? messages.find((x) => x.id === item.reply_to) : null;
          return (
            <View style={{ flexDirection: "row", justifyContent: mine ? "flex-end" : "flex-start", alignItems: "flex-end", gap: spacing.xs }}>
              {!mine && <Avatar name={item.author_name || "?"} size={32} />}
              <Pressable
                testID={`msg-${item.id}`}
                onPress={() => !item.deleted && setReplyTo(item)}
                style={{
                  maxWidth: "78%",
                  backgroundColor: mine ? colors.brandPrimary : colors.surfaceSecondary,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  borderBottomRightRadius: mine ? 6 : radius.lg,
                  borderBottomLeftRadius: mine ? radius.lg : 6,
                  borderWidth: mine ? 0 : 1, borderColor: colors.border,
                }}
              >
                {!mine && <Text style={{ color: colors.brandPrimary, fontWeight: "800", fontSize: 12, marginBottom: spacing.xs }}>{item.author_name}</Text>}
                {original && (
                  <View style={{ backgroundColor: mine ? "rgba(255,255,255,0.18)" : colors.surfaceTertiary, padding: spacing.xs + 2, borderRadius: 8, marginBottom: spacing.xs, borderLeftWidth: 3, borderLeftColor: mine ? "rgba(255,255,255,0.7)" : colors.brandPrimary }}>
                    <Text style={{ color: mine ? colors.onBrandPrimary : colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700" }} numberOfLines={1}>{original.author_name}</Text>
                    <Text style={{ color: mine ? colors.onBrandPrimary : colors.onSurface, fontSize: 11 }} numberOfLines={1}>{original.text}</Text>
                  </View>
                )}
                {item.deleted ? (
                  <Text style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.muted, fontStyle: "italic" }}>{t("messageDeleted")}</Text>
                ) : (
                  <Text style={{ color: mine ? colors.onBrandPrimary : colors.onSurface, fontSize: 14, lineHeight: 20 }}>{item.text}</Text>
                )}
                <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.xs, alignItems: "center" }}>
                  <Text style={{ color: mine ? "rgba(255,255,255,0.7)" : colors.muted, fontSize: 10 }}>{new Date(item.created_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</Text>
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
          <Text style={{ color: colors.brandPrimary, fontSize: 16 }}>↩️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700" }}>{replyTo.author_name}</Text>
            <Text style={{ color: colors.onSurface, fontSize: 12 }} numberOfLines={1}>{replyTo.text}</Text>
          </View>
          <Pressable onPress={() => setReplyTo(null)}><Text style={{ color: colors.error, fontWeight: "700", fontSize: 18 }}>✕</Text></Pressable>
        </View>
      )}

      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingBottom: Math.max(spacing.md, insets.bottom), borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Input testID="chat-input" value={text} onChangeText={setText} placeholder={t("typeMessage")} />
        </View>
        <Pressable testID="chat-send-button" onPress={send} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: colors.onBrandPrimary, fontSize: 20, fontWeight: "900" }}>↑</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
