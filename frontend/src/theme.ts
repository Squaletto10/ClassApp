// ClassSync design tokens - light + dark themes matching design_guidelines.json
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#FFFFFF",
  onSurface: "#0F172A",
  surfaceSecondary: "#F5F3FF",
  onSurfaceSecondary: "#1E1B4B",
  surfaceTertiary: "#EDE9FE",
  onSurfaceTertiary: "#312E81",
  surfaceInverse: "#1E1B4B",
  onSurfaceInverse: "#FFFFFF",
  muted: "#64748B",

  brand: "#7C3AED",
  onBrand: "#FFFFFF",
  brandPrimary: "#7C3AED",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#3B82F6",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#E0E7FF",
  onBrandTertiary: "#3730A3",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  divider: "#F1F5F9",
};

const dark: typeof light = {
  surface: "#0B0B1A",
  onSurface: "#F8FAFC",
  surfaceSecondary: "#141428",
  onSurfaceSecondary: "#E2E8F0",
  surfaceTertiary: "#1E1B3D",
  onSurfaceTertiary: "#C4B5FD",
  surfaceInverse: "#F5F3FF",
  onSurfaceInverse: "#1E1B4B",
  muted: "#94A3B8",

  brand: "#A78BFA",
  onBrand: "#0B0B1A",
  brandPrimary: "#A78BFA",
  onBrandPrimary: "#0B0B1A",
  brandSecondary: "#60A5FA",
  onBrandSecondary: "#0B0B1A",
  brandTertiary: "#312E81",
  onBrandTertiary: "#E0E7FF",

  success: "#34D399",
  onSuccess: "#052E20",
  warning: "#FBBF24",
  onWarning: "#3B1F00",
  error: "#F87171",
  onError: "#3B0808",
  info: "#60A5FA",
  onInfo: "#0B0B1A",

  border: "#1F2A44",
  borderStrong: "#334155",
  divider: "#1F2A44",
};

export type ThemeColors = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 8, md: 16, lg: 24, pill: 999 };

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}
setColorScheme?.(null); // follow device

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

export const colors = light;
