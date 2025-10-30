'use client';

import { DEFAULT_THEME } from '@third-eye/theme';

export function ThemeScript() {
  const themeScript = `
    (function() {
      try {
        const theme = localStorage.getItem('third-eye-theme') || '${DEFAULT_THEME}';
        const darkMode = localStorage.getItem('third-eye-dark-mode');

        document.documentElement.setAttribute('data-theme', theme);

        if (darkMode === 'false') {
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
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
