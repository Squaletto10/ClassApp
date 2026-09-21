// Shared UI atoms
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle, ActivityIndicator, TextInput as RNTextInput } from "react-native";
import { makeStyles, radius, spacing, tilePalette, useTheme } from "./theme";

export function Card({ children, style, testID }: { children: React.ReactNode; style?: ViewStyle; testID?: string }) {
  const s = useCardStyles();
  return <View testID={testID} style={[s.card, style]}>{children}</View>;
}
const useCardStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: c.border,
    // soft mockup-style shadow
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
}));

export function Button({
  label, onPress, variant = "primary", disabled, testID, loading, style,
}: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost" | "danger" | "success"; disabled?: boolean; testID?: string; loading?: boolean; style?: ViewStyle }) {
  const { colors } = useTheme();
  const bg = variant === "primary" ? colors.brandPrimary
    : variant === "secondary" ? colors.brandTertiary
    : variant === "danger" ? colors.error
    : variant === "success" ? colors.success : "transparent";
  const fg = variant === "primary" ? colors.onBrandPrimary
    : variant === "secondary" ? colors.onBrandTertiary
    : variant === "danger" ? colors.onError
    : variant === "success" ? colors.onSuccess : colors.brandPrimary;
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
      backgroundColor: colors.surfaceSecondary, borderRadius: radius.md,
      paddingHorizontal: spacing.lg, paddingVertical: multiline ? spacing.md : spacing.md,
      borderWidth: 1, borderColor: colors.border, ...(style || {}),
    }}>
      <RNTextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        placeholderTextColor={colors.muted} secureTextEntry={secureTextEntry}
        style={{ color: colors.onSurface, fontSize: 15, minHeight: multiline ? 80 : 24, outlineStyle: "none" } as any}
        testID={testID} keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? "none"}
        multiline={multiline}
      />
    </View>
  );
}

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID} onPress={onPress}
      style={{
        height: 36, paddingHorizontal: spacing.lg, borderRadius: radius.pill,
        backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary,
        borderWidth: 1, borderColor: active ? colors.brandPrimary : colors.border,
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      <Text style={{ color: active ? colors.onBrandPrimary : colors.onSurface, fontWeight: "600", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md }}>
      <Text style={{ fontSize: 56 }}>{emoji}</Text>
      <Text style={{ color: colors.muted, textAlign: "center", fontSize: 15 }}>{text}</Text>
    </View>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md }}>
      <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 18 }}>{children}</Text>
      {action}
    </View>
  );
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  const seed = (name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0);
  const palette = tilePalette[seed % tilePalette.length];
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: palette.bg,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: colors.surfaceSecondary,
    }}>
      <Text style={{ color: palette.fg, fontWeight: "800", fontSize: size / 2.6 }}>{initials || "?"}</Text>
    </View>
  );
}

/** Small rounded tinted tile with an emoji inside — used next to titles like in the mockup. */
export function IconTile({ emoji, index = 0, size = 44 }: { emoji: string; index?: number; size?: number }) {
  const palette = tilePalette[index % tilePalette.length];
  return (
    <View style={{
      width: size, height: size, borderRadius: radius.md,
      backgroundColor: palette.bg, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

/** Green pill floating "+" for admin create actions, mockup-style. */
export function Fab({ onPress, testID, icon = "+", bottom = 24, right = 24 }: { onPress: () => void; testID?: string; icon?: string; bottom?: number; right?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        position: "absolute", right, bottom,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: colors.success,
        alignItems: "center", justifyContent: "center",
        transform: [{ scale: pressed ? 0.95 : 1 }],
        shadowColor: colors.success, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      })}
    >
      <Text style={{ color: colors.onSuccess, fontSize: 28, fontWeight: "900", lineHeight: 30 }}>{icon}</Text>
    </Pressable>
  );
}

/** Row with a colored square, title, subtitle and chevron — the "materials list" pattern. */
export function ListRow({
  emoji, index = 0, title, subtitle, right, onPress, testID,
}: { emoji: string; index?: number; title: string; subtitle?: string; right?: React.ReactNode; onPress?: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID} onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: spacing.md,
        backgroundColor: colors.surfaceSecondary,
        borderRadius: radius.lg, padding: spacing.md,
        borderWidth: 1, borderColor: colors.border,
        opacity: pressed ? 0.92 : 1,
      })}
    >
      <IconTile emoji={emoji} index={index} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.onSurface, fontWeight: "800", fontSize: 15 }}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {right ?? <Text style={{ color: colors.muted, fontSize: 22 }}>›</Text>}
    </Pressable>
  );
}
