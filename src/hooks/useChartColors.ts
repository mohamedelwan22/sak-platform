import { useMemo } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { ResolvedTheme } from "@/lib/theme";

/**
 * Deterministic chart palette per resolved theme — no DOM reads, no
 * getComputedStyle in render, stable references for recharts props.
 * Financial semantics are preserved: profit=success, warning=caution,
 * loss=destructive, brand series=gold.
 */
export interface ChartColors {
  grid: string;
  axis: string;
  axisLine: string;
  cursor: string;
  tooltipBackground: string;
  tooltipBorder: string;
  tooltipText: string;
  gold: string;
  success: string;
  warning: string;
  info: string;
  destructive: string;
  /** Categorical series palette (pie/donut/allocation) */
  palette: string[];
}

const LIGHT: ChartColors = {
  grid: "oklch(0.929 0.013 255)",
  axis: "oklch(0.55 0.027 256)",
  axisLine: "oklch(0.86 0.018 255)",
  cursor: "oklch(0.735 0.104 88 / 0.25)",
  tooltipBackground: "#FFFFFF",
  tooltipBorder: "oklch(0.929 0.013 255)",
  tooltipText: "oklch(0.28 0.03 256)",
  gold: "#C9A84C",
  success: "#10B981",
  warning: "#F59E0B",
  info: "#3B82F6",
  destructive: "#EF4444",
  palette: [
    "#C9A84C",
    "#10B981",
    "#3B82F6",
    "#A855F7",
    "#F43F5E",
    "#F59E0B",
    "#06B6D4",
    "#14B8A6",
    "#8B5CF6",
    "#F97316",
  ],
};

const DARK: ChartColors = {
  grid: "oklch(1 0 0 / 0.07)",
  axis: "oklch(0.7 0.018 265)",
  axisLine: "oklch(0.3 0.02 264)",
  cursor: "oklch(0.735 0.104 88 / 0.3)",
  tooltipBackground: "oklch(0.215 0.028 264)",
  tooltipBorder: "oklch(0.735 0.104 88 / 0.45)",
  tooltipText: "oklch(0.925 0.012 85)",
  gold: "#E8C84E",
  success: "#34D399",
  warning: "#FBBF24",
  info: "#60A5FA",
  destructive: "#F87171",
  palette: [
    "#E8C84E",
    "#34D399",
    "#60A5FA",
    "#C084FC",
    "#FB7185",
    "#FBBF24",
    "#22D3EE",
    "#2DD4BF",
    "#A78BFA",
    "#FB923C",
  ],
};

export function getChartColors(theme: ResolvedTheme): ChartColors {
  return theme === "dark" ? DARK : LIGHT;
}

export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  return useMemo(() => getChartColors(resolvedTheme), [resolvedTheme]);
}
