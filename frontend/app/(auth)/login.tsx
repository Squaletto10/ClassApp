import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
    <View style={{ flex: 1, backgroundColor: "#0B1220" }}>
      <LinearGradient
        // Night-sky gradient inspired by the mockup splash
        colors={["#1E1B4B", "#312E81", "#1E3A8A", "#0B1220"]}
        locations={[0, 0.4, 0.75, 1]}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 460 }}
      />
      {/* soft "mountains" silhouette */}
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 340, height: 140, opacity: 0.85 }}>
        <View style={{ position: "absolute", bottom: 0, left: -40, right: -40, height: 120, backgroundColor: "#0F172A", transform: [{ skewY: "-6deg" }], borderTopLeftRadius: 200, borderTopRightRadius: 120 }} />
        <View style={{ position: "absolute", bottom: 0, left: -60, right: 40, height: 80, backgroundColor: "#111827", transform: [{ skewY: "4deg" }], borderTopRightRadius: 180 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xxl, gap: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: "center", gap: spacing.md, marginTop: spacing.xl }}>
            <View style={{ width: 88, height: 88, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" }}>
              <Text style={{ fontSize: 44 }}>🎓</Text>
            </View>
            <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", letterSpacing: 0.5 }}>ClassSync</Text>
            <Text style={{ color: "#C7D2FE", fontSize: 14 }}>Insieme si va più lontano</Text>
          </View>

          <View style={{
            marginTop: spacing.xxl, backgroundColor: colors.surfaceSecondary,
            borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md,
            shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8,
          }}>
            <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "800" }}>{t("welcome")}</Text>
            <Text style={{ color: colors.muted, marginTop: -spacing.sm }}>Accedi al tuo spazio classe</Text>
            <Input testID="login-username-input" value={username} onChangeText={setU} placeholder={t("username")} />
            <Input testID="login-password-input" value={password} onChangeText={setP} placeholder={t("password")} secureTextEntry />
            {err ? <Text testID="login-error" style={{ color: colors.error }}>{err}</Text> : null}
            <Button testID="login-submit-button" label={t("login")} onPress={submit} loading={busy} />
            <Link href="/(auth)/register" asChild>
              <Pressable testID="go-register-link" style={{ padding: spacing.sm, alignItems: "center" }}>
                <Text style={{ color: colors.brandPrimary, fontWeight: "700" }}>{t("noAccount")} {t("register")}</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
