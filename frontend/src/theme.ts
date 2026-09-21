// ClassSync design tokens - refined light + dark, mockup-inspired
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Softer cool-gray backdrop lets white cards pop like in the mockups
  surface: "#F4F6FB",
  onSurface: "#0F172A",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#0F172A",
  surfaceTertiary: "#EEF2FF",
  onSurfaceTertiary: "#3730A3",
  surfaceInverse: "#0F172A",
  onSurfaceInverse: "#FFFFFF",
  muted: "#64748B",

  brand: "#4F46E5",
  onBrand: "#FFFFFF",
  brandPrimary: "#4F46E5",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#3B82F6",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#EEF2FF",
  onBrandTertiary: "#3730A3",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#FFFFFF",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#E5E9F2",
  borderStrong: "#CBD5E1",
  divider: "#EEF0F7",
};

const dark: typeof light = {
  surface: "#0B1220",
  onSurface: "#F8FAFC",
  surfaceSecondary: "#141C2E",
  onSurfaceSecondary: "#F1F5F9",
  surfaceTertiary: "#1E2740",
  onSurfaceTertiary: "#C7D2FE",
  surfaceInverse: "#F8FAFC",
  onSurfaceInverse: "#0B1220",
  muted: "#94A3B8",

  brand: "#818CF8",
  onBrand: "#0B1220",
  brandPrimary: "#818CF8",
  onBrandPrimary: "#0B1220",
  brandSecondary: "#60A5FA",
  onBrandSecondary: "#0B1220",
  brandTertiary: "#1F2A4A",
  onBrandTertiary: "#C7D2FE",

  success: "#34D399",
  onSuccess: "#052E20",
  warning: "#FBBF24",
  onWarning: "#3B1F00",
  error: "#F87171",
  onError: "#3B0808",
  info: "#60A5FA",
  onInfo: "#0B1220",

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
setColorScheme?.(null);

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

// Tinted "icon tile" palette used across subject rows and quick actions.
// Same order as default subjects seeded server-side. Wraps around beyond index 6.
export const tilePalette: { bg: string; fg: string }[] = [
  { bg: "#DBEAFE", fg: "#1D4ED8" }, // Matematica - blue
  { bg: "#FEE2E2", fg: "#B91C1C" }, // Italiano - red
  { bg: "#FEF3C7", fg: "#B45309" }, // Storia - amber
  { bg: "#DCFCE7", fg: "#166534" }, // Inglese - green
  { bg: "#EDE9FE", fg: "#5B21B6" }, // Informatica - violet
  { bg: "#FCE7F3", fg: "#BE185D" }, // Fisica - pink
  { bg: "#E0F2FE", fg: "#075985" }, // Scienze - sky
  { bg: "#FFEDD5", fg: "#9A3412" }, // extra - orange
];

export const colors = light;
