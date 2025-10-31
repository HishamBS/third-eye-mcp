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
          foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
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
        // Aurora Theme (Sky Blue) - Dark Mode
        ':root[data-theme="aurora"].dark': {
          '--color-primary': '96 165 250', // sky-400
          '--color-accent': '125 211 252', // sky-300
          '--color-ink': '8 8 12',
          '--color-paper': '15 23 42',
          '--color-paper-elev': '30 41 59',
          '--color-outline': '51 65 85',
          '--color-foreground': '248 248 242',
        },
        ':root[data-theme="aurora"]:not(.dark)': {
          '--color-primary': '14 165 233', // sky-600 (WCAG AA compliant)
          '--color-accent': '2 132 199', // sky-700
          '--color-ink': '15 23 42',
          '--color-paper': '248 250 252',
          '--color-paper-elev': '241 245 249',
          '--color-outline': '203 213 225',
          '--color-foreground': '15 23 42',
        },

        // Midnight Theme (Indigo & Purple) - Dark Mode
        ':root[data-theme="midnight"].dark': {
          '--color-primary': '99 102 241', // indigo-500
          '--color-accent': '139 92 246', // purple-500
          '--color-ink': '10 10 20',
          '--color-paper': '17 24 39',
          '--color-paper-elev': '31 41 55',
          '--color-outline': '55 65 81',
          '--color-foreground': '248 248 242',
        },
        ':root[data-theme="midnight"]:not(.dark)': {
          '--color-primary': '79 70 229', // indigo-600 (WCAG AA)
          '--color-accent': '124 58 237', // purple-700
          '--color-ink': '30 27 75',
          '--color-paper': '248 250 252',
          '--color-paper-elev': '241 245 249',
          '--color-outline': '199 210 254',
          '--color-foreground': '30 27 75',
        },

        // Sakura Theme (Pink) - Dark Mode
        ':root[data-theme="sakura"].dark': {
          '--color-primary': '244 114 182', // pink-400
          '--color-accent': '251 207 232', // pink-200
          '--color-ink': '12 8 12',
          '--color-paper': '24 10 24',
          '--color-paper-elev': '39 20 39',
          '--color-outline': '62 35 62',
          '--color-foreground': '248 248 242',
        },
        ':root[data-theme="sakura"]:not(.dark)': {
          '--color-primary': '219 39 119', // pink-700 (WCAG AA)
          '--color-accent': '190 24 93', // pink-800
          '--color-ink': '63 15 50',
          '--color-paper': '253 242 248',
          '--color-paper-elev': '252 231 243',
          '--color-outline': '251 207 232',
          '--color-foreground': '63 15 50',
        },

        // Horizon Theme (Orange & Amber) - Dark Mode
        ':root[data-theme="horizon"].dark': {
          '--color-primary': '251 146 60', // orange-400
          '--color-accent': '251 191 36', // amber-400
          '--color-ink': '20 12 8',
          '--color-paper': '31 20 16',
          '--color-paper-elev': '42 31 26',
          '--color-outline': '61 46 36',
          '--color-foreground': '248 248 242',
        },
        ':root[data-theme="horizon"]:not(.dark)': {
          '--color-primary': '217 119 6', // amber-700 (WCAG AA)
          '--color-accent': '180 83 9', // amber-800
          '--color-ink': '69 26 3',
          '--color-paper': '254 252 232',
          '--color-paper-elev': '254 249 195',
          '--color-outline': '253 230 138',
          '--color-foreground': '69 26 3',
        },

        // Emerald Theme (Green) - Dark Mode
        ':root[data-theme="emerald"].dark': {
          '--color-primary': '52 211 153', // emerald-400
          '--color-accent': '110 231 183', // emerald-300
          '--color-ink': '6 20 14',
          '--color-paper': '6 20 14',
          '--color-paper-elev': '20 46 35',
          '--color-outline': '45 74 58',
          '--color-foreground': '248 248 242',
        },
        ':root[data-theme="emerald"]:not(.dark)': {
          '--color-primary': '5 150 105', // emerald-700 (WCAG AA)
          '--color-accent': '4 120 87', // emerald-800
          '--color-ink': '6 78 59',
          '--color-paper': '240 253 244',
          '--color-paper-elev': '209 250 229',
          '--color-outline': '167 243 208',
          '--color-foreground': '6 78 59',
        },

        // Obsidian Theme (Grayscale) - Dark Mode
        ':root[data-theme="obsidian"].dark': {
          '--color-primary': '107 114 128', // gray-500
          '--color-accent': '156 163 175', // gray-400
          '--color-ink': '0 0 0',
          '--color-paper': '17 17 17',
          '--color-paper-elev': '26 26 26',
          '--color-outline': '51 51 51',
          '--color-foreground': '248 248 242',
        },
        ':root[data-theme="obsidian"]:not(.dark)': {
          '--color-primary': '55 65 81', // gray-700 (WCAG AA)
          '--color-accent': '75 85 99', // gray-600
          '--color-ink': '17 24 39',
          '--color-paper': '249 250 251',
          '--color-paper-elev': '243 244 246',
          '--color-outline': '209 213 219',
          '--color-foreground': '17 24 39',
        },

        // Overseer Theme (Naruto/Sharingan Purple & Red) - Dark Mode (WCAG AAA)
        ':root[data-theme="overseer"].dark': {
          '--color-primary': '196 181 253', // violet-300 (9.67:1)
          '--color-accent': '253 164 175', // rose-300 (9.44:1)
          '--color-ink': '241 245 249', // slate-100 (16.30:1)
          '--color-paper': '15 23 42', // slate-900
          '--color-paper-elev': '30 41 59', // slate-800
          '--color-outline': '216 180 254', // purple-300 (10.10:1)
          '--color-foreground': '241 245 249',
        },
        ':root[data-theme="overseer"]:not(.dark)': {
          '--color-primary': '91 33 182', // violet-800 (8.37:1)
          '--color-accent': '136 19 55', // rose-900 (8.91:1)
          '--color-ink': '17 24 39', // gray-900 (16.53:1)
          '--color-paper': '250 245 255', // purple-50
          '--color-paper-elev': '243 232 255', // purple-100
          '--color-outline': '55 65 81', // gray-700 (9.61:1)
          '--color-foreground': '17 24 39',
        },
      })
    }
  ],
}

export default config
