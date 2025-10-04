import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#D9463B',
          primaryDark: '#B3362D',
          accent: '#F7B500',
          ink: '#0F0F12',
          paper: '#0B0B0D',
          paperElev: '#15161A',
          outline: '#2A2B32',
        },
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
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      fontFamily: {
        display: ['"InterVariable"', 'ui-sans-serif', 'system-ui'],
        mono: ['"GeistMono"', 'ui-monospace', 'SFMono-Regular'],
      },
    },
  },
  plugins: [],
}

export default config
