import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "@/src/i18n";
import { Card } from "@/src/ui";
import { radius, spacing, useTheme } from "@/src/theme";

export default function Settings() {
  const { colors } = useTheme();
  const { t, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surface }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
      <Stack.Screen options={{ title: t("settingsHeader") }} />
      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16, marginBottom: spacing.md }}>{t("language")}</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable testID="lang-it" onPress={() => setLang("it")} style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: lang === "it" ? colors.brandPrimary : colors.surfaceTertiary, alignItems: "center" }}>
            <Text style={{ color: lang === "it" ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700" }}>🇮🇹 {t("italian")}</Text>
          </Pressable>
          <Pressable testID="lang-en" onPress={() => setLang("en")} style={{ flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: lang === "en" ? colors.brandPrimary : colors.surfaceTertiary, alignItems: "center" }}>
            <Text style={{ color: lang === "en" ? colors.onBrandPrimary : colors.onSurface, fontWeight: "700" }}>🇬🇧 {t("english")}</Text>
          </Pressable>
        </View>
      </Card>
      <Card>
        <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 16 }}>{t("theme")}</Text>
        <Text style={{ color: colors.muted, marginTop: spacing.sm }}>{t("themeFollowsSystem")}</Text>
      </Card>
    </ScrollView>
  );
}
