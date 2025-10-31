'use client';

import { useState, useEffect } from 'react';
import { type ThemeName, THEME_METADATA, DEFAULT_THEME } from '@third-eye/theme';
import { useUI } from '@/contexts/UIContext';
import { STORAGE_KEYS } from '@/constants/storage';
import { ARIA_LABELS } from '@/constants/accessibility';

export function ThemeSwitcher() {
  const { darkMode, setDarkMode } = useUI();
  const [theme, setTheme] = useState<ThemeName>(DEFAULT_THEME);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as ThemeName | null;

    if (savedTheme && THEME_METADATA.some(t => t.value === savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }, [theme]);

  const selectTheme = (newTheme: ThemeName) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const currentTheme = THEME_METADATA.find(t => t.value === theme)!;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Theme Button */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-full border border-brand-outline/50 bg-brand-paper px-3 py-1.5 text-sm transition-colors hover:border-brand-accent hover:bg-brand-paperElev whitespace-nowrap"
          aria-label={`Switch theme, current: ${currentTheme.label}`}
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <div
            className="h-4 w-4 rounded-full shrink-0"
            style={{ backgroundColor: currentTheme.color }}
            aria-hidden="true"
          />
          <span className="text-white">{currentTheme.label}</span>
          <svg
            className="h-4 w-4 text-slate-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div
              className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-brand-outline/50 bg-brand-paper shadow-lg"
              role="menu"
              aria-label="Theme options"
            >
              <div className="p-2">
                <div className="mb-2 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Select Theme
                </div>
                {THEME_METADATA.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => selectTheme(t.value)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      theme === t.value
                        ? 'bg-brand-accent text-white'
                        : 'text-slate-300 hover:bg-brand-paperElev hover:text-white'
                    }`}
                    role="menuitem"
                    aria-label={`Select ${t.label} theme`}
                    aria-current={theme === t.value ? 'true' : undefined}
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: t.color }}
                      aria-hidden="true"
                    />
                    <span>{t.label}</span>
                    {theme === t.value && (
                      <svg
                        className="ml-auto h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                      >
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mode Toggle */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="rounded-full border border-brand-outline/50 bg-brand-paper p-1.5 transition-colors hover:border-brand-accent hover:bg-brand-paperElev shrink-0"
        aria-label={ARIA_LABELS.TOGGLE_THEME}
        title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
      >
        {!darkMode ? (
          <svg
            className="h-4 w-4 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-blue-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>
    </div>
  );
}

