import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Button, Input } from "@/src/ui";
import { useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { spacing, useTheme } from "@/src/theme";

export default function Register() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { register, hasClass } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      await register({
        name, surname, username, password,
        invite_code: hasClass ? code : undefined,
      });
      router.replace("/");
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xxl, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.onSurface }}>{t("register")}</Text>
        <Text style={{ color: colors.muted }}>
          {hasClass ? t("joinWithCode") : t("firstAdmin")}
        </Text>

        <View style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Input testID="reg-name-input" value={name} onChangeText={setName} placeholder={t("name")} autoCapitalize="words" />
          <Input testID="reg-surname-input" value={surname} onChangeText={setSurname} placeholder={t("surname")} autoCapitalize="words" />
          <Input testID="reg-username-input" value={username} onChangeText={setU} placeholder={t("username")} />
          <Input testID="reg-password-input" value={password} onChangeText={setP} placeholder={t("password")} secureTextEntry />
          {hasClass && (
            <Input testID="reg-code-input" value={code} onChangeText={setCode} placeholder={t("inviteCode")} autoCapitalize="characters" />
          )}
          {err ? <Text testID="reg-error" style={{ color: colors.error }}>{err}</Text> : null}
          <Button testID="reg-submit-button" label={t("register")} onPress={submit} loading={busy} />
        </View>

        <Link href="/(auth)/login" asChild>
          <Pressable testID="go-login-link" style={{ padding: spacing.md, alignItems: "center" }}>
            <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>{t("hasAccount")} {t("login")}</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
