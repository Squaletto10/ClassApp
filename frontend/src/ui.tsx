// Shared UI atoms
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { makeStyles, radius, spacing, useTheme } from "./theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const s = useCardStyles();
  return <View style={[s.card, style]}>{children}</View>;
}
const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: c.border,
  },
}));

export function Button({
  label, onPress, variant = "primary", disabled, testID, loading, style,
}: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; testID?: string; loading?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  const bg = variant === "primary" ? colors.brandPrimary
    : variant === "secondary" ? colors.brandTertiary
    : variant === "danger" ? colors.error : "transparent";
  const fg = variant === "primary" ? colors.onBrandPrimary
    : variant === "secondary" ? colors.onBrandTertiary
    : variant === "danger" ? colors.onError : colors.brandPrimary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [{
        backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        paddingVertical: spacing.md + 2, paddingHorizontal: spacing.xl,
        borderRadius: radius.pill, alignItems: "center", justifyContent: "center",
        minHeight: 48,
      }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: "700", fontSize: 15 }}>{label}</Text>}
    </Pressable>
  );
}

export function Input({
  value, onChangeText, placeholder, secureTextEntry, testID, keyboardType, autoCapitalize,
  multiline, style,
}: any) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surfaceTertiary, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: multiline ? spacing.md : spacing.md,
      borderWidth: 1, borderColor: colors.border, ...(style || {}),
    }}>
      <TextInputWrap
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry}
        style={{ color: colors.onSurface, fontSize: 15, minHeight: multiline ? 80 : 24 }}
        testID={testID} keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? "none"}
        multiline={multiline}
      />
    </View>
  );
}
import { TextInput as RNTextInput } from "react-native";
const TextInputWrap = React.forwardRef<any, any>((props, ref) => <RNTextInput ref={ref} {...props} />);

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID} onPress={onPress}
      style={{
        height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
        backgroundColor: active ? colors.brandPrimary : colors.surfaceTertiary,
        borderWidth: 1, borderColor: active ? colors.brandPrimary : colors.border,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurfaceTertiary, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md }}>
      <Text style={{ fontSize: 48 }}>{emoji}</Text>
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 15 }}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 18, marginBottom: spacing.md }}>{children}</Text>;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandTertiary,
      alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: colors.onBrandTertiary, fontWeight: "800", fontSize: size / 2.6 }}>{initials || "?"}</Text>
    </View>
  );
}
