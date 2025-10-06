import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class', // Enable class-based dark mode
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Overseer theme (default - Naruto palette)
        brand: {
          primary: '#D9463B',
          primaryDark: '#B3362D',
          accent: '#F7B500',
          ink: '#0F0F12',
          paper: '#0B0B0D',
          paperElev: '#15161A',
          outline: '#2A2B32',
        },

        // Eye colors (consistent across all themes)
        eye: {
          sharingan: '#E11D48',
          prompt: '#A78BFA',
          jogan: '#38BDF8',
          rinnegan: '#818CF8',
          mangekyo: '#FB7185',
          tenseigan: '#34D399',
          byakugan: '#93C5FD',
        },

        // Theme-specific palettes (CSS variables will override these)
        theme: {
          // Midnight Blue
          midnight: {
            primary: '#4F46E5', // Indigo
            accent: '#8B5CF6', // Purple
            ink: '#0A0A14',
            paper: '#111827',
            paperElev: '#1F2937',
            outline: '#374151',
          },

          // Ocean Breeze
          ocean: {
            primary: '#06B6D4', // Cyan
            accent: '#14B8A6', // Teal
            ink: '#0C1821',
            paper: '#0F172A',
            paperElev: '#1E293B',
            outline: '#334155',
          },

          // Forest Green
          forest: {
            primary: '#10B981', // Emerald
            accent: '#84CC16', // Lime
            ink: '#0A1F15',
            paper: '#0F1F16',
            paperElev: '#1A2E23',
            outline: '#2D4A3A',
          },

          // Sunset Orange
          sunset: {
            primary: '#F97316', // Orange
            accent: '#FBBF24', // Amber
            ink: '#1A0F0A',
            paper: '#1F1410',
            paperElev: '#2A1F1A',
            outline: '#3D2E24',
          },

          // Monochrome
          monochrome: {
            primary: '#6B7280', // Gray
            accent: '#9CA3AF', // Light gray
            ink: '#000000',
            paper: '#111111',
            paperElev: '#1A1A1A',
            outline: '#333333',
          },
        },
      },
      boxShadow: {
        glass: '0 10px 30px rgba(0, 0, 0, 0.35)',
        'glass-light': '0 10px 30px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      fontFamily: {
        display: ['"InterVariable"', 'ui-sans-serif', 'system-ui'],
        mono: ['"GeistMono"', 'ui-monospace', 'SFMono-Regular'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [
    // Custom plugin for theme switching
    function({ addBase, theme }) {
      addBase({
        // Overseer theme (default)
        ':root[data-theme="overseer"]': {
          '--color-primary': '#D9463B',
          '--color-accent': '#F7B500',
          '--color-ink': '#0F0F12',
          '--color-paper': '#0B0B0D',
          '--color-paper-elev': '#15161A',
          '--color-outline': '#2A2B32',
        },

        // Midnight theme
        ':root[data-theme="midnight"]': {
          '--color-primary': '#4F46E5',
          '--color-accent': '#8B5CF6',
          '--color-ink': '#0A0A14',
          '--color-paper': '#111827',
          '--color-paper-elev': '#1F2937',
          '--color-outline': '#374151',
        },

        // Ocean theme
        ':root[data-theme="ocean"]': {
          '--color-primary': '#06B6D4',
          '--color-accent': '#14B8A6',
          '--color-ink': '#0C1821',
          '--color-paper': '#0F172A',
          '--color-paper-elev': '#1E293B',
          '--color-outline': '#334155',
        },

        // Forest theme
        ':root[data-theme="forest"]': {
          '--color-primary': '#10B981',
          '--color-accent': '#84CC16',
          '--color-ink': '#0A1F15',
          '--color-paper': '#0F1F16',
          '--color-paper-elev': '#1A2E23',
          '--color-outline': '#2D4A3A',
        },

        // Sunset theme
        ':root[data-theme="sunset"]': {
          '--color-primary': '#F97316',
          '--color-accent': '#FBBF24',
          '--color-ink': '#1A0F0A',
          '--color-paper': '#1F1410',
          '--color-paper-elev': '#2A1F1A',
          '--color-outline': '#3D2E24',
        },

        // Monochrome theme
        ':root[data-theme="monochrome"]': {
          '--color-primary': '#6B7280',
          '--color-accent': '#9CA3AF',
          '--color-ink': '#000000',
          '--color-paper': '#111111',
          '--color-paper-elev': '#1A1A1A',
          '--color-outline': '#333333',
        },

        // Light mode overrides (when dark mode is disabled)
        ':root:not(.dark)': {
          '--color-ink': '#FFFFFF',
          '--color-paper': '#F9FAFB',
          '--color-paper-elev': '#F3F4F6',
          '--color-outline': '#E5E7EB',
        },
      })
    }
  ],
}

export default config
