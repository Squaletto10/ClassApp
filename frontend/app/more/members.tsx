import React, { useCallback, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar, Card, EmptyState } from "@/src/ui";
import { spacing, useTheme } from "@/src/theme";

export default function Members() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<any[]>([]);

  const load = useCallback(async () => { const r = await apiFetch("/users"); setUsers(r.users || []); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const patch = async (id: string, patch: any) => { await apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }); await load(); };

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + spacing.xxl }}
      style={{ backgroundColor: colors.surface }}
      ListEmptyComponent={<EmptyState emoji="👥" text="Nessuno studente" />}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
            <Avatar name={`${item.name} ${item.surname}`} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 15 }}>{item.name} {item.surname}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>@{item.username} • {item.role}</Text>
              {item.muted && <Text style={{ color: colors.warning, fontSize: 11, fontWeight: "700" }}>🔇 silenziato</Text>}
              {item.disabled && <Text style={{ color: colors.error, fontSize: 11, fontWeight: "700" }}>⛔ disabilitato</Text>}
            </View>
            {user?.role === "ADMIN" && item.id !== user.id && (
              <View style={{ gap: spacing.xs }}>
                <Pressable testID={`toggle-mute-${item.id}`} onPress={() => patch(item.id, { muted: !item.muted })}>
                  <Text style={{ color: colors.brandPrimary, fontWeight: "700", fontSize: 12 }}>{item.muted ? t("unmute") : t("mute")}</Text>
                </Pressable>
                <Pressable testID={`toggle-disable-${item.id}`} onPress={() => patch(item.id, { disabled: !item.disabled })}>
                  <Text style={{ color: colors.error, fontWeight: "700", fontSize: 12 }}>{item.disabled ? t("enable") : t("disable")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </Card>
      )}
    />
  );
}
