/**
 * Theme utilities for non-React environments
 *
 * Note: The actual useTheme() React hook will be implemented in the UI package
 * where it can access browser APIs (localStorage, window).
 */

import { getTheme as getThemeByName } from "./themes";
import type { Theme, ThemeName, ThemeMode } from "./themes";

export const DEFAULT_THEME: ThemeName = "midnight";
export const DEFAULT_MODE: ThemeMode = "light";

/**
 * Get theme by name and mode
 * This is a pure function that doesn't depend on browser APIs
 */
export const getTheme = (name: ThemeName, mode: ThemeMode): Theme => {
  return getThemeByName(name, mode);
};

/**
 * Get default theme (midnight light)
 */
export const getDefaultTheme = (): Theme => {
  return getThemeByName(DEFAULT_THEME, DEFAULT_MODE);
};
