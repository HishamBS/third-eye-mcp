import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0F172A',
          raised: '#1E293B',
          outline: '#334155',
        },
        accent: {
          primary: '#38BDF8',
          danger: '#F87171',
          success: '#4ADE80',
        },
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
