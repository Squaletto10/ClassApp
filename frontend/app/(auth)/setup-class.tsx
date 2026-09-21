import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Card, Input, SectionTitle } from "@/src/ui";
import { useAuth } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { spacing, useTheme } from "@/src/theme";

export default function SetupClass() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { setupClass } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [description, setDescription] = useState("");
  const [primary, setPrimary] = useState("#7C3AED");
  const [secondary, setSecondary] = useState("#3B82F6");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  const submit = async () => {
    setErr(null); setBusy(true);
    try {
      const r = await setupClass({
        name, school, school_year: year, section, description,
        primary_color: primary, secondary_color: secondary,
      });
      setCode(r.invite_code);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (code) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.surface, padding: spacing.xl, paddingTop: insets.top + spacing.xxl, gap: spacing.lg }}>
        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.onSurface }}>🎉 Classe creata!</Text>
        <Text style={{ color: colors.muted, fontSize: 16 }}>{t("firstAdmin")}. {t("inviteCode")}:</Text>
        <Card>
          <Text testID="invite-code-display" style={{ fontSize: 40, fontWeight: "900", color: colors.brandPrimary, textAlign: "center", letterSpacing: 4 }}>{code}</Text>
          <Text style={{ color: colors.muted, textAlign: "center", marginTop: spacing.md }}>Condividilo con i compagni</Text>
        </Card>
        <Button testID="go-home-button" label={t("continue")} onPress={() => router.replace("/(tabs)/home")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.surface }}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingTop: insets.top + spacing.xxl, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 32, fontWeight: "900", color: colors.onSurface }}>{t("setupYourClass")}</Text>
        <SectionTitle>{t("firstAdmin")}</SectionTitle>
        <View style={{ gap: spacing.md }}>
          <Input testID="cls-name-input" value={name} onChangeText={setName} placeholder={t("className") + " (es. 4B Informatica)"} autoCapitalize="words" />
          <Input testID="cls-school-input" value={school} onChangeText={setSchool} placeholder={t("school")} autoCapitalize="words" />
          <Input testID="cls-year-input" value={year} onChangeText={setYear} placeholder={t("schoolYear") + " (es. 2026/2027)"} />
          <Input testID="cls-section-input" value={section} onChangeText={setSection} placeholder={t("section")} />
          <Input testID="cls-desc-input" value={description} onChangeText={setDescription} placeholder={t("description")} multiline />
          <Input testID="cls-primary-input" value={primary} onChangeText={setPrimary} placeholder={t("primaryColor") + " (hex)"} />
          <Input testID="cls-secondary-input" value={secondary} onChangeText={setSecondary} placeholder={t("secondaryColor") + " (hex)"} />
          {err ? <Text testID="setup-error" style={{ color: colors.error }}>{err}</Text> : null}
          <Button testID="cls-submit-button" label={t("createFirstClass")} onPress={submit} loading={busy} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
