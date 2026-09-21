import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Button, Input } from "@/src/ui";
import { useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { radius, spacing, useTheme } from "@/src/theme";

export default function Login() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setBusy(true);
    try { await login(username, password); router.replace("/"); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xxl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 48 }}>🎓</Text>
        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.onSurface }}>ClassSync</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{t("welcome")} — {t("login")}</Text>

        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Input testID="login-username-input" value={username} onChangeText={setU} placeholder={t("username")} />
          <Input testID="login-password-input" value={password} onChangeText={setP} placeholder={t("password")} secureTextEntry />
          {err ? <Text testID="login-error" style={{ color: colors.error }}>{err}</Text> : null}
          <Button testID="login-submit-button" label={t("login")} onPress={submit} loading={busy} />
        </View>

        <Link href="/(auth)/register" asChild>
          <Pressable testID="go-register-link" style={{ padding: spacing.md, alignItems: "center" }}>
            <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>{t("noAccount")} {t("register")}</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
