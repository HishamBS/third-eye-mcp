'use client';

import { DEFAULT_THEME } from '@third-eye/theme';
import { STORAGE_KEYS } from '@/constants/storage';

export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('${STORAGE_KEYS.THEME}') || '${DEFAULT_THEME}';
        const mode = localStorage.getItem('${STORAGE_KEYS.THEME_MODE}') || 'dark';

        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-mode', mode);

        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeScript }}
      suppressHydrationWarning
    />
  );
}
