import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Button, Card, Input } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

export default function Admin() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, cls, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const [dash, setDash] = useState<any>(null);
  const [invite, setInvite] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [name, setName] = useState(cls?.name || "");
  const [primary, setPrimary] = useState(cls?.primary_color || "#7C3AED");
  const [secondary, setSecondary] = useState(cls?.secondary_color || "#3B82F6");

  const load = useCallback(async () => {
    if (user?.role !== "ADMIN") return;
    const [d, l] = await Promise.all([apiFetch("/admin/dashboard"), apiFetch("/admin/log")]);
    setDash(d); setLogs(l.log || []);
  }, [user?.role]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const regen = async () => { const r = await apiFetch("/class/invite/regenerate", { method: "POST" }); setInvite(r.invite_code); };
  const saveClass = async () => {
    await apiFetch("/class", { method: "PATCH", body: JSON.stringify({ name, primary_color: primary, secondary_color: secondary }) });
    refresh();
  };

  if (user?.role !== "ADMIN") return <Text style={{ padding: spacing.lg, color: colors.error }}>Non autorizzato</Text>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
      <Text style={{ color: colors.onSurface, fontSize: 24, fontWeight: "900" }}>🛠️ {t("adminPanel")}</Text>

      {dash && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
          {[
            ["👥", dash.users, t("users")],
            ["📚", dash.notes, t("materials")],
            ["📅", dash.events, "Eventi"],
            ["📢", dash.announcements, t("announcements")],
            ["💬", dash.messages, "Messaggi"],
            ["🔇", dash.muted, "Muti"],
          ].map(([e, n, l], i) => (
            <View key={i} style={{ width: "31%", backgroundColor: colors.brandTertiary, padding: spacing.md, borderRadius: radius.md, alignItems: "center" }}>
              <Text style={{ fontSize: 22 }}>{e}</Text>
              <Text style={{ color: colors.onBrandTertiary, fontWeight: "900", fontSize: 20 }}>{n as any}</Text>
              <Text style={{ color: colors.onBrandTertiary, fontSize: 10 }}>{l as any}</Text>
            </View>
          ))}
        </View>
      )}

      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", marginBottom: spacing.sm }}>Codice classe</Text>
        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: spacing.sm }}>Rigenerare invalida il vecchio codice.</Text>
        {invite && <Text testID="new-invite-code" style={{ color: colors.brandPrimary, fontSize: 28, fontWeight: "900", textAlign: "center", letterSpacing: 4, marginVertical: spacing.md }}>{invite}</Text>}
        <Button testID="regen-invite" label={t("regenerateCode")} onPress={regen} />
      </Card>

      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", marginBottom: spacing.sm }}>{t("classInfo")}</Text>
        <Input testID="admin-class-name" value={name} onChangeText={setName} placeholder={t("className")} />
        <View style={{ height: spacing.sm }} />
        <Input testID="admin-primary" value={primary} onChangeText={setPrimary} placeholder="#7C3AED" />
        <View style={{ height: spacing.sm }} />
        <Input testID="admin-secondary" value={secondary} onChangeText={setSecondary} placeholder="#3B82F6" />
        <View style={{ marginTop: spacing.md }}><Button testID="save-class" label={t("save")} onPress={saveClass} /></View>
      </Card>

      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", marginBottom: spacing.sm }}>{t("auditLog")}</Text>
        {logs.slice(0, 20).map((l) => (
          <View key={l.id} style={{ paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
            <Text style={{ color: colors.onSurface, fontSize: 12 }}>{l.action}</Text>
            <Text style={{ color: colors.muted, fontSize: 10 }}>{l.at}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}
