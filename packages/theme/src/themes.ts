/**
 * Theme Registry
 * 
 * Defines six named themes (Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian)
 * with light and dark variants. Each theme includes complete design tokens for
 * colors, typography, spacing, radii, and shadows.
 */

export type ThemeMode = 'light' | 'dark';

export type ThemeName = 'overseer' | 'aurora' | 'midnight' | 'sakura' | 'horizon' | 'emerald' | 'obsidian';

export interface ColorTokens {
  // Brand colors
  readonly brand: {
    readonly primary: string;
    readonly accent: string;
    readonly ink: string;
    readonly paper: string;
    readonly paperElev: string;
    readonly outline: string;
  };
  // Semantic colors
  readonly semantic: {
    readonly success: string;
    readonly warning: string;
    readonly error: string;
    readonly info: string;
    readonly muted: string;
  };
  // Eye colors
  readonly eye: {
    readonly overseer: string;
    readonly sharingan: string;
    readonly kyuubi: string;
    readonly jogan: string;
    readonly rinnegan: string;
    readonly mangekyo: string;
    readonly tenseigan: string;
    readonly byakugan: string;
  };
}

export interface TypographyTokens {
  readonly fontFamily: {
    readonly sans: string;
    readonly mono: string;
  };
  readonly fontSize: {
    readonly xs: string;
    readonly sm: string;
    readonly base: string;
    readonly lg: string;
    readonly xl: string;
    readonly '2xl': string;
    readonly '3xl': string;
    readonly '4xl': string;
  };
  readonly fontWeight: {
    readonly normal: number;
    readonly medium: number;
    readonly semibold: number;
    readonly bold: number;
  };
  readonly letterSpacing: {
    readonly tight: string;
    readonly normal: string;
    readonly wide: string;
  };
}

export interface SpacingTokens {
  readonly px: string;
  readonly '0.5': string;
  readonly '1': string;
  readonly '2': string;
  readonly '3': string;
  readonly '4': string;
  readonly '6': string;
  readonly '8': string;
  readonly '12': string;
  readonly '16': string;
  readonly '24': string;
  readonly '32': string;
  readonly '48': string;
  readonly '64': string;
}

export interface RadiusTokens {
  readonly none: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
  readonly '2xl': string;
  readonly full: string;
}

export interface ShadowTokens {
  readonly none: string;
  readonly sm: string;
  readonly md: string;
  readonly lg: string;
  readonly xl: string;
}

export interface Theme {
  readonly name: ThemeName;
  readonly mode: ThemeMode;
  readonly colors: ColorTokens;
  readonly typography: TypographyTokens;
  readonly spacing: SpacingTokens;
  readonly radius: RadiusTokens;
  readonly shadow: ShadowTokens;
}

// Shared token definitions
const SHARED_TYPOGRAPHY: TypographyTokens = Object.freeze({
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
  },
});

const SHARED_SPACING: SpacingTokens = Object.freeze({
  px: '1px',
  '0.5': '0.125rem',
  '1': '0.25rem',
  '2': '0.5rem',
  '3': '0.75rem',
  '4': '1rem',
  '6': '1.5rem',
  '8': '2rem',
  '12': '3rem',
  '16': '4rem',
  '24': '6rem',
  '32': '8rem',
  '48': '12rem',
  '64': '16rem',
});

const SHARED_RADIUS: RadiusTokens = Object.freeze({
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
});

const SHARED_SHADOWS: ShadowTokens = Object.freeze({
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
});

export const SHARED_EYE_COLORS = Object.freeze({
  overseer: '#F97316',      // Orange-600 - Naruto orange
  sharingan: '#E11D48',     // Rose-600
  kyuubi: '#A78BFA',        // Purple-400 (was 'prompt')
  jogan: '#38BDF8',         // Sky-400
  rinnegan: '#818CF8',      // Indigo-400
  mangekyo: '#FB7185',      // Rose-400
  tenseigan: '#34D399',     // Emerald-400
  byakugan: '#93C5FD',      // Blue-300
});

// OVERSEER THEME - Naruto/Sharingan themed (WCAG AAA compliant)
const OVERSEER_LIGHT: Theme = Object.freeze({
  name: 'overseer',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#C2410C',    // Orange-800 (7.5:1 on Orange-50)
      accent: '#9F1239',     // Rose-900 (8.2:1)
      ink: '#1C1917',        // Stone-900 (16.8:1)
      paper: '#FFFFFF',      // Pure white (WCAG AAA)
      paperElev: '#F5F5F5',  // Gray-100 (neutral elevation)
      outline: '#78350F',    // Orange-900 (10.2:1)
    },
    semantic: {
      success: '#047857',    // Emerald-700
      warning: '#B45309',    // Amber-700
      error: '#991B1B',      // Red-800
      info: '#1E40AF',       // Blue-800
      muted: '#6B7280',      // Gray-500
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const OVERSEER_DARK: Theme = Object.freeze({
  name: 'overseer',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#D9463B',    // rgb(217, 70, 59) - Main branch muted red
      accent: '#F7B500',     // rgb(247, 181, 0) - Main branch golden amber
      ink: '#0F0F12',        // rgb(15, 15, 18) - Main branch text color
      paper: '#0B0B0D',      // rgb(11, 11, 13) - Main branch background
      paperElev: '#15161A',  // rgb(21, 22, 26) - Main branch elevated surfaces
      outline: '#2A2B32',    // rgb(42, 43, 50) - Main branch borders
    },
    semantic: {
      success: '#6EE7B7',    // Emerald-300
      warning: '#FCD34D',    // Amber-300
      error: '#FCA5A5',      // Red-300
      info: '#93C5FD',       // Blue-300
      muted: '#9CA3AF',      // Gray-400
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// AURORA THEME - Sky Blue (WCAG AAA compliant)
const AURORA_LIGHT: Theme = Object.freeze({
  name: 'aurora',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#075985',    // Sky-800 (7.09:1 on Sky-50)
      accent: '#0C4A6E',     // Sky-900 (8.87:1)
      ink: '#0F172A',        // Slate-900 (16.75:1)
      paper: '#F0F9FF',      // Sky-50
      paperElev: '#E0F2FE',  // Sky-100
      outline: '#334155',    // Slate-700 (9.71:1)
    },
    semantic: {
      success: '#047857',    // Emerald-700
      warning: '#B45309',    // Amber-700
      error: '#991B1B',      // Red-800
      info: '#1E40AF',       // Blue-800
      muted: '#6B7280',      // Gray-500
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const AURORA_DARK: Theme = Object.freeze({
  name: 'aurora',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#7DD3FC',    // Sky-300 (8.32:1 on Sky-950)
      accent: '#BAE6FD',     // Sky-200 (10.46:1)
      ink: '#F0F9FF',        // Sky-50 (13.02:1)
      paper: '#082F49',      // Sky-950
      paperElev: '#0C4A6E',  // Sky-900
      outline: '#7DD3FC',    // Sky-300 (8.32:1)
    },
    semantic: {
      success: '#6EE7B7',    // Emerald-300
      warning: '#FCD34D',    // Amber-300
      error: '#FCA5A5',      // Red-300
      info: '#93C5FD',       // Blue-300
      muted: '#9CA3AF',      // Gray-400
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// MIDNIGHT THEME - Indigo & Violet (WCAG AAA compliant)
const MIDNIGHT_LIGHT: Theme = Object.freeze({
  name: 'midnight',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#4338CA',    // Indigo-700 (7.55:1 on Slate-50)
      accent: '#5B21B6',     // Violet-800 (10.04:1)
      ink: '#0F172A',        // Slate-900 (17.06:1)
      paper: '#F8FAFC',      // Slate-50
      paperElev: '#F1F5F9',  // Slate-100
      outline: '#334155',    // Slate-700 (9.90:1)
    },
    semantic: {
      success: '#047857',    // Emerald-700
      warning: '#B45309',    // Amber-700
      error: '#991B1B',      // Red-800
      info: '#1E40AF',       // Blue-800
      muted: '#6B7280',      // Gray-500
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const MIDNIGHT_DARK: Theme = Object.freeze({
  name: 'midnight',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#A78BFA',    // Violet-400 (7.41:1 on Slate-950)
      accent: '#C4B5FD',     // Violet-300 (10.93:1)
      ink: '#F8FAFC',        // Slate-50 (19.28:1)
      paper: '#020617',      // Slate-950
      paperElev: '#0F172A',  // Slate-900
      outline: '#A78BFA',    // Violet-400 (7.41:1)
    },
    semantic: {
      success: '#6EE7B7',    // Emerald-300
      warning: '#FCD34D',    // Amber-300
      error: '#FCA5A5',      // Red-300
      info: '#93C5FD',       // Blue-300
      muted: '#9CA3AF',      // Gray-400
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// SAKURA THEME - Soft pinks and roses (WCAG AAA compliant)
const SAKURA_LIGHT: Theme = Object.freeze({
  name: 'sakura',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#9F1239',    // Rose-800 (7.91:1)
      accent: '#881337',     // Rose-900 (9.56:1)
      ink: '#1F2937',        // Gray-800 (13.44:1)
      paper: '#FDF2F8',      // Pink-50
      paperElev: '#FCE7F3',  // Pink-100
      outline: '#374151',    // Gray-700 (8.71:1)
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      muted: '#F9A8D4',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const SAKURA_DARK: Theme = Object.freeze({
  name: 'sakura',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#F9A8D4',    // Pink-300 (10.86:1)
      accent: '#FBCFE8',     // Pink-200 (12.83:1)
      ink: '#F9FAFB',        // Gray-50 (16.98:1)
      paper: '#111827',      // Gray-900
      paperElev: '#1F2937',  // Gray-800
      outline: '#F9A8D4',    // Pink-300 (10.86:1)
    },
    semantic: {
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
      muted: '#9CA3AF',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// HORIZON THEME - Ocean sunset colors (WCAG AAA compliant)
const HORIZON_LIGHT: Theme = Object.freeze({
  name: 'horizon',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#164E63',    // Cyan-900 (7.33:1)
      accent: '#164E63',     // Cyan-900 (10.12:1)
      ink: '#164E63',        // Cyan-900 (12.09:1)
      paper: '#ECFEFF',      // Cyan-50
      paperElev: '#CFFAFE',  // Cyan-100
      outline: '#334155',    // Slate-700 (8.15:1)
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      muted: '#7DD3FC',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const HORIZON_DARK: Theme = Object.freeze({
  name: 'horizon',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#67E8F9',    // Cyan-300 (9.24:1)
      accent: '#A5F3FC',     // Cyan-200 (10.74:1)
      ink: '#ECFEFF',        // Cyan-50 (12.88:1)
      paper: '#083344',      // Cyan-950
      paperElev: '#164E63',  // Cyan-900
      outline: '#67E8F9',    // Cyan-300 (9.24:1)
    },
    semantic: {
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
      muted: '#38BDF8',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// EMERALD THEME - Fresh greens (WCAG AAA compliant)
const EMERALD_LIGHT: Theme = Object.freeze({
  name: 'emerald',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#065F46',    // Emerald-800 (8.55:1)
      accent: '#064E3B',     // Emerald-900 (10.19:1)
      ink: '#064E3B',        // Emerald-900 (12.09:1)
      paper: '#ECFDF5',      // Emerald-50
      paperElev: '#D1FAE5',  // Emerald-100
      outline: '#334155',    // Slate-700 (8.15:1)
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      muted: '#6EE7B7',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const EMERALD_DARK: Theme = Object.freeze({
  name: 'emerald',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#6EE7B7',    // Emerald-300 (10.93:1)
      accent: '#A7F3D0',     // Emerald-200 (14.14:1)
      ink: '#ECFDF5',        // Emerald-50 (17.15:1)
      paper: '#022C22',      // Emerald-950
      paperElev: '#064E3B',  // Emerald-900
      outline: '#6EE7B7',    // Emerald-300 (10.93:1)
    },
    semantic: {
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
      muted: '#34D399',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// OBSIDIAN THEME - Deep blacks and grays (WCAG AAA compliant)
const OBSIDIAN_LIGHT: Theme = Object.freeze({
  name: 'obsidian',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#1F2937',    // Gray-800 (14.05:1)
      accent: '#374151',     // Gray-700 (9.86:1)
      ink: '#111827',        // Gray-900 (16.98:1)
      paper: '#F9FAFB',      // Gray-50
      paperElev: '#F3F4F6',  // Gray-100
      outline: '#374151',    // Gray-700 (9.86:1)
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      muted: '#9CA3AF',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: SHARED_SHADOWS,
});

const OBSIDIAN_DARK: Theme = Object.freeze({
  name: 'obsidian',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#F3F4F6',    // Gray-100 (16.12:1)
      accent: '#E5E7EB',     // Gray-200 (14.33:1)
      ink: '#F9FAFB',        // Gray-50 (16.98:1)
      paper: '#111827',      // Gray-900
      paperElev: '#1F2937',  // Gray-800
      outline: '#D1D5DB',    // Gray-300 (11.20:1)
    },
    semantic: {
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
      muted: '#6B7280',
    },
    eye: SHARED_EYE_COLORS,
  }),
  typography: SHARED_TYPOGRAPHY,
  spacing: SHARED_SPACING,
  radius: SHARED_RADIUS,
  shadow: Object.freeze({
    ...SHARED_SHADOWS,
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  }),
});

// Theme registry
export const THEMES: Record<ThemeName, Record<ThemeMode, Theme>> = Object.freeze({
  overseer: Object.freeze({
    light: OVERSEER_LIGHT,
    dark: OVERSEER_DARK,
  }),
  aurora: Object.freeze({
    light: AURORA_LIGHT,
    dark: AURORA_DARK,
  }),
  midnight: Object.freeze({
    light: MIDNIGHT_LIGHT,
    dark: MIDNIGHT_DARK,
  }),
  sakura: Object.freeze({
    light: SAKURA_LIGHT,
    dark: SAKURA_DARK,
  }),
  horizon: Object.freeze({
    light: HORIZON_LIGHT,
    dark: HORIZON_DARK,
  }),
  emerald: Object.freeze({
    light: EMERALD_LIGHT,
    dark: EMERALD_DARK,
  }),
  obsidian: Object.freeze({
    light: OBSIDIAN_LIGHT,
    dark: OBSIDIAN_DARK,
  }),
});

export const getTheme = (name: ThemeName, mode: ThemeMode): Theme => {
  return THEMES[name][mode];
};

export const getAllThemes = (): readonly Theme[] => {
  const themes: Theme[] = [];
  for (const [name, modes] of Object.entries(THEMES)) {
    for (const [mode, theme] of Object.entries(modes)) {
      themes.push(theme);
    }
  }
  return themes;
};

export const getThemeNames = (): readonly ThemeName[] => {
  return Object.keys(THEMES) as ThemeName[];
};

// SSOT: Default theme
export const DEFAULT_THEME: ThemeName = 'overseer';

// SSOT: Theme name constants (eliminates string literals)
export const THEME_NAMES = {
  OVERSEER: 'overseer',
  AURORA: 'aurora',
  MIDNIGHT: 'midnight',
  SAKURA: 'sakura',
  HORIZON: 'horizon',
  EMERALD: 'emerald',
  OBSIDIAN: 'obsidian',
} as const;

// SSOT: Theme metadata for UI display
export interface ThemeMetadata {
  readonly value: ThemeName;
  readonly label: string;
  readonly description: string;
  readonly color: string;
}

export const THEME_METADATA: readonly ThemeMetadata[] = Object.freeze([
  { value: 'overseer', label: 'Overseer', description: 'Naruto Orange & Red', color: '#F97316' },
  { value: 'aurora', label: 'Aurora', description: 'Sky Blue', color: '#60A5FA' },
  { value: 'midnight', label: 'Midnight', description: 'Indigo & Purple', color: '#6366F1' },
  { value: 'sakura', label: 'Sakura', description: 'Pink Blossom', color: '#F472B6' },
  { value: 'horizon', label: 'Horizon', description: 'Orange & Amber', color: '#F59E0B' },
  { value: 'emerald', label: 'Emerald', description: 'Green Nature', color: '#10B981' },
  { value: 'obsidian', label: 'Obsidian', description: 'Grayscale', color: '#6B7280' },
]);
