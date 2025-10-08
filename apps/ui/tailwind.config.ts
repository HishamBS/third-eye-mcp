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
        brand: {
          primary: 'rgb(var(--color-primary) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          ink: 'rgb(var(--color-ink) / <alpha-value>)',
          paper: 'rgb(var(--color-paper) / <alpha-value>)',
          paperElev: 'rgb(var(--color-paper-elev) / <alpha-value>)',
          outline: 'rgb(var(--color-outline) / <alpha-value>)',
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
        ':root[data-theme="overseer"]': {
          '--color-primary': '217 70 59',
          '--color-accent': '247 181 0',
          '--color-ink': '15 15 18',
          '--color-paper': '11 11 13',
          '--color-paper-elev': '21 22 26',
          '--color-outline': '42 43 50',
        },

        ':root[data-theme="midnight"]': {
          '--color-primary': '79 70 229',
          '--color-accent': '139 92 246',
          '--color-ink': '10 10 20',
          '--color-paper': '17 24 39',
          '--color-paper-elev': '31 41 55',
          '--color-outline': '55 65 81',
        },

        ':root[data-theme="ocean"]': {
          '--color-primary': '6 182 212',
          '--color-accent': '20 184 166',
          '--color-ink': '12 24 33',
          '--color-paper': '15 23 42',
          '--color-paper-elev': '30 41 59',
          '--color-outline': '51 65 85',
        },

        ':root[data-theme="forest"]': {
          '--color-primary': '16 185 129',
          '--color-accent': '132 204 22',
          '--color-ink': '10 31 21',
          '--color-paper': '15 31 22',
          '--color-paper-elev': '26 46 35',
          '--color-outline': '45 74 58',
        },

        ':root[data-theme="sunset"]': {
          '--color-primary': '249 115 22',
          '--color-accent': '251 191 36',
          '--color-ink': '26 15 10',
          '--color-paper': '31 20 16',
          '--color-paper-elev': '42 31 26',
          '--color-outline': '61 46 36',
        },

        ':root[data-theme="monochrome"]': {
          '--color-primary': '107 114 128',
          '--color-accent': '156 163 175',
          '--color-ink': '0 0 0',
          '--color-paper': '17 17 17',
          '--color-paper-elev': '26 26 26',
          '--color-outline': '51 51 51',
        },

        ':root:not(.dark)': {
          '--color-ink': '255 255 255',
          '--color-paper': '249 250 251',
          '--color-paper-elev': '243 244 246',
          '--color-outline': '229 231 235',
        },
      })
    }
  ],
}

export default config
