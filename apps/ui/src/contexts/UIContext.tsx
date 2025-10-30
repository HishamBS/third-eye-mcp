'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  STRICTNESS_PRESETS,
  DEFAULT_STRICTNESS_PRESET,
  type StrictnessSettings,
  type StrictnessPresetId,
} from '@third-eye/types';
import { type ThemeName, DEFAULT_THEME } from '@third-eye/theme';
import { STORAGE_KEYS } from '@/constants/storage';

export type ViewMode = 'novice' | 'expert';

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
  applyStrictnessProfile: (profile: StrictnessPresetId) => void;

  autoOpenSessions: boolean;
  setAutoOpenSessions: (value: boolean) => void;

  showPersonaVoice: boolean;
  setShowPersonaVoice: (value: boolean) => void;

  selectedSessionId: string | null;
  setSelectedSession: (sessionId: string | null) => void;
}

const UIContext = createContext<UIContextValue | undefined>(undefined);

export function UIProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>('expert');
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [darkMode, setDarkModeState] = useState(true);
  const [strictness, setStrictnessState] = useState<StrictnessSettings>(
    STRICTNESS_PRESETS[DEFAULT_STRICTNESS_PRESET].settings
  );
  const [autoOpenSessions, setAutoOpenSessionsState] = useState(true);
  const [showPersonaVoice, setShowPersonaVoiceState] = useState(false);
  const [selectedSessionId, setSelectedSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

    fetch(`${API_URL}/api/app-settings`)
      .then(res => res.json())
      .then(response => {
        const data = response.data || response;
        if (data.theme) setThemeState(data.theme);
        if (data.darkMode !== undefined) setDarkModeState(data.darkMode);
        if (data.auto_open !== undefined) setAutoOpenSessionsState(data.auto_open);
      })
      .catch(() => {
        const savedMode = localStorage.getItem(STORAGE_KEYS.VIEW_MODE) as ViewMode;
        if (savedMode) setViewModeState(savedMode);

        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeName;
        if (savedTheme) setThemeState(savedTheme);

        const savedDarkMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE);
        if (savedDarkMode !== null) setDarkModeState(savedDarkMode === 'dark');

        const savedStrictness = localStorage.getItem(STORAGE_KEYS.STRICTNESS);
        if (savedStrictness) {
          try {
            setStrictnessState(JSON.parse(savedStrictness));
          } catch (e) {
            console.error('Failed to parse strictness settings', e);
          }
        }

        const savedAutoOpen = localStorage.getItem(STORAGE_KEYS.AUTO_OPEN);
        if (savedAutoOpen !== null) setAutoOpenSessionsState(savedAutoOpen === 'true');

        const savedPersonaVoice = localStorage.getItem(STORAGE_KEYS.PERSONA_VOICE);
        if (savedPersonaVoice !== null) setShowPersonaVoiceState(savedPersonaVoice === 'true');

        const savedSessionId = localStorage.getItem(STORAGE_KEYS.SELECTED_SESSION);
        if (savedSessionId) setSelectedSessionIdState(savedSessionId);
      });
  }, []);

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
  };

  const toggleViewMode = () => {
    const newMode = viewMode === 'novice' ? 'expert' : 'novice';
    setViewMode(newMode);
  };

  const setTheme = (newTheme: ThemeName) => {
    if (!mounted) return;

    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
    fetch(`${API_URL}/api/app-settings/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: newTheme }),
    }).catch(err => console.debug('Failed to persist theme:', err));
  };

  const setDarkMode = (enabled: boolean) => {
    if (!mounted) return;

    setDarkModeState(enabled);
    const mode = enabled ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    document.documentElement.setAttribute('data-mode', mode);

    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
    fetch(`${API_URL}/api/app-settings/darkMode`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: enabled }),
    }).catch(err => console.debug('Failed to persist dark mode:', err));
  };

  const setStrictness = (settings: StrictnessSettings) => {
    setStrictnessState(settings);
    localStorage.setItem(STORAGE_KEYS.STRICTNESS, JSON.stringify(settings));
  };

  const applyStrictnessProfile = (profile: StrictnessPresetId) => {
    setStrictness(STRICTNESS_PRESETS[profile].settings);
  };

  const setAutoOpenSessions = (value: boolean) => {
    setAutoOpenSessionsState(value);
    localStorage.setItem(STORAGE_KEYS.AUTO_OPEN, value.toString());
  };

  const setShowPersonaVoice = (value: boolean) => {
    setShowPersonaVoiceState(value);
    localStorage.setItem(STORAGE_KEYS.PERSONA_VOICE, value.toString());
  };

  const setSelectedSession = (sessionId: string | null) => {
    setSelectedSessionIdState(sessionId);
    if (sessionId) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_SESSION, sessionId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_SESSION);
    }
  };

  useEffect(() => {
    if (!mounted) return;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-mode', darkMode ? 'dark' : 'light');

    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mounted, theme, darkMode]);

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
        selectedSessionId,
        setSelectedSession,
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
