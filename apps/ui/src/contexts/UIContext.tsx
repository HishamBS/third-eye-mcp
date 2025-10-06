'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ViewMode = 'novice' | 'expert';
export type ThemeName = 'overseer' | 'midnight' | 'ocean' | 'forest' | 'sunset' | 'monochrome';

export interface StrictnessSettings {
  ambiguityThreshold: number; // 0-100
  citationCutoff: number; // 0-1
  consistencyTolerance: number; // 0-100
  mangekyoStrictness: number; // 0-100
}

export const DEFAULT_STRICTNESS: Record<'casual' | 'enterprise' | 'security', StrictnessSettings> = {
  casual: {
    ambiguityThreshold: 60,
    citationCutoff: 0.5,
    consistencyTolerance: 70,
    mangekyoStrictness: 50,
  },
  enterprise: {
    ambiguityThreshold: 40,
    citationCutoff: 0.7,
    consistencyTolerance: 50,
    mangekyoStrictness: 70,
  },
  security: {
    ambiguityThreshold: 20,
    citationCutoff: 0.9,
    consistencyTolerance: 30,
    mangekyoStrictness: 90,
  },
};

interface UIContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;

  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;

  darkMode: boolean;
  setDarkMode: (enabled: boolean) => void;

  strictness: StrictnessSettings;
  setStrictness: (settings: StrictnessSettings) => void;
  applyStrictnessProfile: (profile: 'casual' | 'enterprise' | 'security') => void;

  autoOpenSessions: boolean;
  setAutoOpenSessions: (value: boolean) => void;

  showPersonaVoice: boolean;
  setShowPersonaVoice: (value: boolean) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  // State with defaults
  const [viewMode, setViewModeState] = useState<ViewMode>('expert');
  const [theme, setThemeState] = useState<ThemeName>('overseer');
  const [darkMode, setDarkModeState] = useState(true);
  const [strictness, setStrictnessState] = useState<StrictnessSettings>(DEFAULT_STRICTNESS.enterprise);
  const [autoOpenSessions, setAutoOpenSessionsState] = useState(true);
  const [showPersonaVoice, setShowPersonaVoiceState] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('third-eye-view-mode') as ViewMode;
    if (savedMode) setViewModeState(savedMode);

    const savedTheme = localStorage.getItem('third-eye-theme') as ThemeName;
    if (savedTheme) setThemeState(savedTheme);

    const savedDarkMode = localStorage.getItem('third-eye-dark-mode');
    if (savedDarkMode !== null) setDarkModeState(savedDarkMode === 'true');

    const savedStrictness = localStorage.getItem('third-eye-strictness');
    if (savedStrictness) {
      try {
        setStrictnessState(JSON.parse(savedStrictness));
      } catch (e) {
        console.error('Failed to parse strictness settings', e);
      }
    }

    const savedAutoOpen = localStorage.getItem('third-eye-auto-open');
    if (savedAutoOpen !== null) setAutoOpenSessionsState(savedAutoOpen === 'true');

    const savedPersonaVoice = localStorage.getItem('third-eye-persona-voice');
    if (savedPersonaVoice !== null) setShowPersonaVoiceState(savedPersonaVoice === 'true');
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('third-eye-view-mode', mode);
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'novice' ? 'expert' : 'novice';
    setViewMode(newMode);
  };

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('third-eye-theme', newTheme);
    // Apply theme to document root
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setDarkMode = (enabled: boolean) => {
    setDarkModeState(enabled);
    localStorage.setItem('third-eye-dark-mode', enabled.toString());
    // Apply dark mode class to document root
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setStrictness = (settings: StrictnessSettings) => {
    setStrictnessState(settings);
    localStorage.setItem('third-eye-strictness', JSON.stringify(settings));
  };

  const applyStrictnessProfile = (profile: 'casual' | 'enterprise' | 'security') => {
    setStrictness(DEFAULT_STRICTNESS[profile]);
  };

  const setAutoOpenSessions = (value: boolean) => {
    setAutoOpenSessionsState(value);
    localStorage.setItem('third-eye-auto-open', value.toString());
  };

  const setShowPersonaVoice = (value: boolean) => {
    setShowPersonaVoiceState(value);
    localStorage.setItem('third-eye-persona-voice', value.toString());
  };

  // Apply theme and dark mode on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme, darkMode]);

  return (
    <UIContext.Provider
      value={{
        viewMode,
        setViewMode,
        toggleViewMode,
        theme,
        setTheme,
        darkMode,
        setDarkMode,
        strictness,
        setStrictness,
        applyStrictnessProfile,
        autoOpenSessions,
        setAutoOpenSessions,
        showPersonaVoice,
        setShowPersonaVoice,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
