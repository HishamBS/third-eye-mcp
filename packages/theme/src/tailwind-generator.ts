/**
 * Tailwind Theme Generator
 *
 * CRITICAL: This file enforces SSOT (Single Source of Truth) for themes.
 *
 * PURPOSE:
 * - Converts theme definitions from packages/theme/src/themes.ts into Tailwind CSS variables
 * - Eliminates manual duplication between themes.ts and tailwind.config.ts
 * - Ensures themes.ts is the ONLY place to edit theme colors
 *
 * ARCHITECTURE:
 * - themes.ts (SSOT) → this generator → tailwind.config.ts (derived)
 * - Changes to themes.ts automatically propagate to Tailwind
 */

import { THEMES, SHARED_EYE_COLORS, type ThemeName, type ThemeMode } from './themes';

/**
 * Converts hex color to RGB space-separated string for Tailwind CSS variables
 * @example hexToRgb('#FB923C') → '251 146 60'
 */
export function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `${r} ${g} ${b}`;
}

/**
 * Generates Tailwind CSS variable definitions for all themes
 * Returns an object suitable for Tailwind's addBase() plugin
 */
export function generateTailwindThemeVariables(): Record<string, Record<string, string>> {
  const cssVariables: Record<string, Record<string, string>> = {};

  // Add :root fallback with Overseer dark theme (default)
  // This ensures colors exist before JavaScript applies data-theme attribute
  // Prevents FOUC (Flash of Unstyled Content) on initial page load
  const overseerDark = THEMES.overseer.dark;
  cssVariables[':root'] = {
    '--color-primary': hexToRgb(overseerDark.colors.brand.primary),
    '--color-accent': hexToRgb(overseerDark.colors.brand.accent),
    '--color-ink': hexToRgb(overseerDark.colors.brand.ink),
    '--color-paper': hexToRgb(overseerDark.colors.brand.paper),
    '--color-paper-elev': hexToRgb(overseerDark.colors.brand.paperElev),
    '--color-outline': hexToRgb(overseerDark.colors.brand.outline),
    '--color-foreground': hexToRgb(overseerDark.colors.brand.ink),
    '--color-success': hexToRgb(overseerDark.colors.semantic.success),
    '--color-warning': hexToRgb(overseerDark.colors.semantic.warning),
    '--color-error': hexToRgb(overseerDark.colors.semantic.error),
    '--color-info': hexToRgb(overseerDark.colors.semantic.info),
    '--color-muted': hexToRgb(overseerDark.colors.semantic.muted),
  };

  // Generate variables for each theme and mode
  const themeNames: ThemeName[] = ['overseer', 'aurora', 'midnight', 'sakura', 'horizon', 'emerald', 'obsidian'];
  const modes: ThemeMode[] = ['dark', 'light'];

  for (const themeName of themeNames) {
    for (const mode of modes) {
      const theme = THEMES[themeName][mode];
      const selector = mode === 'dark'
        ? `:root[data-theme="${themeName}"].dark`
        : `:root[data-theme="${themeName}"]:not(.dark)`;

      cssVariables[selector] = {
        // Brand colors
        '--color-primary': hexToRgb(theme.colors.brand.primary),
        '--color-accent': hexToRgb(theme.colors.brand.accent),
        '--color-ink': hexToRgb(theme.colors.brand.ink),
        '--color-paper': hexToRgb(theme.colors.brand.paper),
        '--color-paper-elev': hexToRgb(theme.colors.brand.paperElev),
        '--color-outline': hexToRgb(theme.colors.brand.outline),
        '--color-foreground': hexToRgb(theme.colors.brand.ink),

        // Semantic colors
        '--color-success': hexToRgb(theme.colors.semantic.success),
        '--color-warning': hexToRgb(theme.colors.semantic.warning),
        '--color-error': hexToRgb(theme.colors.semantic.error),
        '--color-info': hexToRgb(theme.colors.semantic.info),
        '--color-muted': hexToRgb(theme.colors.semantic.muted),
      };
    }
  }

  return cssVariables;
}

/**
 * Generates eye color definitions for Tailwind config
 * These are consistent across all themes
 */
export function generateEyeColors(): Record<string, string> {
  return {
    overseer: SHARED_EYE_COLORS.overseer,
    sharingan: SHARED_EYE_COLORS.sharingan,
    kyuubi: SHARED_EYE_COLORS.kyuubi,
    jogan: SHARED_EYE_COLORS.jogan,
    rinnegan: SHARED_EYE_COLORS.rinnegan,
    mangekyo: SHARED_EYE_COLORS.mangekyo,
    tenseigan: SHARED_EYE_COLORS.tenseigan,
    byakugan: SHARED_EYE_COLORS.byakugan,
  };
}

/**
 * Complete Tailwind theme configuration generator
 * Use this in tailwind.config.ts to ensure SSOT compliance
 */
export function generateTailwindThemeConfig() {
  return {
    cssVariables: generateTailwindThemeVariables(),
    eyeColors: generateEyeColors(),
  };
}
