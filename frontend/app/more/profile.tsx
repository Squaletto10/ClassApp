import React, { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Stack, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { apiFetch, useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { Avatar, Button, Card, Input } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

export default function Profile() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { user, refresh } = useAuth();
  const insets = useSafeAreaInsets();
  const [bio, setBio] = useState(user?.bio || "");
  const [oldPw, setOld] = useState("");
  const [newPw, setNew] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [gameScore, setGameScore] = useState(0);

  const load = useCallback(async () => {
    try {
      const [n, s] = await Promise.all([apiFetch("/notes"), apiFetch("/scores")]);
      setNotesCount((n.notes || []).filter((x: any) => x.author_id === user?.id).length);
      const mine = (s.leaderboard || []).find((x: any) => x.user_id === user?.id);
      setGameScore(mine?.score || 0);
    } catch {}
  }, [user?.id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveBio = async () => {
    await apiFetch("/auth/profile", { method: "PATCH", body: JSON.stringify({ bio }) });
    setMsg("✓ Salvato"); refresh();
  };
  const changePw = async () => {
    try {
      await apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify({ old_password: oldPw, new_password: newPw }) });
      setOld(""); setNew(""); setMsg("✓ Password aggiornata");
    } catch (e: any) { setMsg(e.message); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
      <Stack.Screen options={{ title: t("myProfile") }} />

      <View style={{ alignItems: "center", gap: spacing.sm, paddingTop: spacing.md }}>
        <Avatar name={`${user?.name || ""} ${user?.surname || ""}`} size={96} />
        <Text style={{ color: colors.onSurface, fontSize: 22, fontWeight: "900", marginTop: spacing.sm }}>{user?.name} {user?.surname}</Text>
        <Text style={{ color: colors.muted }}>@{user?.username}</Text>
        <View style={{ alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 4, backgroundColor: colors.brandTertiary, borderRadius: radius.pill }}>
          <Text style={{ color: colors.onBrandTertiary, fontWeight: "800", fontSize: 11 }}>{user?.role === "ADMIN" ? "🛠️ ADMIN" : "🎒 STUDENTE"}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: colors.brandPrimary, fontSize: 28, fontWeight: "900" }}>{notesCount}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: spacing.xs }}>Appunti caricati</Text>
        </Card>
        <Card style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: colors.brandSecondary, fontSize: 28, fontWeight: "900" }}>{gameScore}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, textAlign: "center", marginTop: spacing.xs }}>Punti gioco</Text>
        </Card>
      </View>

      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", marginBottom: spacing.sm }}>{t("bio")}</Text>
        <Input testID="bio-input" value={bio} onChangeText={setBio} placeholder="Scrivi qualcosa..." multiline />
        <View style={{ marginTop: spacing.md }}><Button testID="save-bio" label={t("save")} onPress={saveBio} /></View>
      </Card>

      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", marginBottom: spacing.sm }}>{t("changePassword")}</Text>
        <Input testID="old-pw" value={oldPw} onChangeText={setOld} placeholder={t("oldPassword")} secureTextEntry />
        <View style={{ height: spacing.sm }} />
        <Input testID="new-pw" value={newPw} onChangeText={setNew} placeholder={t("newPassword")} secureTextEntry />
        <View style={{ marginTop: spacing.md }}><Button testID="save-pw" label={t("save")} onPress={changePw} /></View>
      </Card>

      {msg && <Text style={{ color: colors.success, textAlign: "center" }}>{msg}</Text>}
    </ScrollView>
  );
}
