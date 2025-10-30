/**
 * Theme Registry
 * 
 * Defines six named themes (Aurora, Midnight, Sakura, Horizon, Emerald, Obsidian)
 * with light and dark variants. Each theme includes complete design tokens for
 * colors, typography, spacing, radii, and shadows.
 */

export type ThemeMode = 'light' | 'dark';

export type ThemeName = 'aurora' | 'midnight' | 'sakura' | 'horizon' | 'emerald' | 'obsidian';

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
  overseer: '#8B5CF6',      // Violet-500 - Added for completeness
  sharingan: '#E11D48',     // Rose-600
  kyuubi: '#A78BFA',        // Purple-400 (was 'prompt')
  jogan: '#38BDF8',         // Sky-400
  rinnegan: '#818CF8',      // Indigo-400
  mangekyo: '#FB7185',      // Rose-400
  tenseigan: '#34D399',     // Emerald-400
  byakugan: '#93C5FD',      // Blue-300
});

// AURORA THEME - Vibrant sunrise colors
const AURORA_LIGHT: Theme = Object.freeze({
  name: 'aurora',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#F97316',
      accent: '#FB923C',
      ink: '#1C1917',
      paper: '#FFF7ED',
      paperElev: '#FFF1E0',
      outline: '#E7E5E4',
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

const AURORA_DARK: Theme = Object.freeze({
  name: 'aurora',
  mode: 'dark',
  colors: Object.freeze({
    brand: {
      primary: '#FB923C',
      accent: '#FDBA74',
      ink: '#FAFAF9',
      paper: '#1C1917',
      paperElev: '#292524',
      outline: '#3F3F46',
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
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
  }),
});

// MIDNIGHT THEME - Deep blues and purples
const MIDNIGHT_LIGHT: Theme = Object.freeze({
  name: 'midnight',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#6366F1',
      accent: '#818CF8',
      ink: '#1E293B',
      paper: '#F8FAFC',
      paperElev: '#F1F5F9',
      outline: '#CBD5E1',
    },
    semantic: {
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
      muted: '#94A3B8',
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
      primary: '#818CF8',
      accent: '#A5B4FC',
      ink: '#F1F5F9',
      paper: '#0F172A',
      paperElev: '#1E293B',
      outline: '#334155',
    },
    semantic: {
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      info: '#60A5FA',
      muted: '#64748B',
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

// SAKURA THEME - Soft pinks and roses
const SAKURA_LIGHT: Theme = Object.freeze({
  name: 'sakura',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#EC4899',
      accent: '#F472B6',
      ink: '#1F2937',
      paper: '#FFF1F2',
      paperElev: '#FFE4E6',
      outline: '#FBCFE8',
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
      primary: '#F472B6',
      accent: '#F9A8D4',
      ink: '#F3F4F6',
      paper: '#1F2937',
      paperElev: '#374151',
      outline: '#4B5563',
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

// HORIZON THEME - Ocean sunset colors
const HORIZON_LIGHT: Theme = Object.freeze({
  name: 'horizon',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#06B6D4',
      accent: '#22D3EE',
      ink: '#0C4A6E',
      paper: '#ECFEFF',
      paperElev: '#CFFAFE',
      outline: '#A5F3FC',
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
      primary: '#22D3EE',
      accent: '#67E8F9',
      ink: '#ECFEFF',
      paper: '#0C4A6E',
      paperElev: '#164E63',
      outline: '#075985',
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

// EMERALD THEME - Fresh greens
const EMERALD_LIGHT: Theme = Object.freeze({
  name: 'emerald',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#10B981',
      accent: '#34D399',
      ink: '#064E3B',
      paper: '#ECFDF5',
      paperElev: '#D1FAE5',
      outline: '#A7F3D0',
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
      primary: '#34D399',
      accent: '#6EE7B7',
      ink: '#D1FAE5',
      paper: '#064E3B',
      paperElev: '#065F46',
      outline: '#047857',
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

// OBSIDIAN THEME - Deep blacks and grays
const OBSIDIAN_LIGHT: Theme = Object.freeze({
  name: 'obsidian',
  mode: 'light',
  colors: Object.freeze({
    brand: {
      primary: '#1F2937',
      accent: '#374151',
      ink: '#111827',
      paper: '#F9FAFB',
      paperElev: '#F3F4F6',
      outline: '#E5E7EB',
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
      primary: '#F9FAFB',
      accent: '#E5E7EB',
      ink: '#F3F4F6',
      paper: '#111827',
      paperElev: '#1F2937',
      outline: '#374151',
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
export const DEFAULT_THEME: ThemeName = 'midnight';

// SSOT: Theme metadata for UI display
export interface ThemeMetadata {
  readonly value: ThemeName;
  readonly label: string;
  readonly description: string;
  readonly color: string;
}

export const THEME_METADATA: readonly ThemeMetadata[] = Object.freeze([
  { value: 'aurora', label: 'Aurora', description: 'Sky Blue', color: '#60A5FA' },
  { value: 'midnight', label: 'Midnight', description: 'Indigo & Purple', color: '#6366F1' },
  { value: 'sakura', label: 'Sakura', description: 'Pink Blossom', color: '#F472B6' },
  { value: 'horizon', label: 'Horizon', description: 'Orange & Amber', color: '#F59E0B' },
  { value: 'emerald', label: 'Emerald', description: 'Green Nature', color: '#10B981' },
  { value: 'obsidian', label: 'Obsidian', description: 'Grayscale', color: '#6B7280' },
]);
