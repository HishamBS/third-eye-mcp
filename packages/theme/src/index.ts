/**
 * @third-eye/theme - Theme system for Third Eye MCP
 *
 * SSOT for all theme-related constants, types, and functions.
 */

export * from './themes';

// Export types for use in React components
export type {
  Theme,
  ThemeName,
  ThemeMode,
  ColorTokens,
  TypographyTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  ThemeMetadata,
} from './themes';

// Re-export SSOT constants
export {
  THEMES,
  DEFAULT_THEME,
  THEME_METADATA,
  SHARED_EYE_COLORS,
  getTheme,
  getAllThemes,
  getThemeNames,
} from './themes';
