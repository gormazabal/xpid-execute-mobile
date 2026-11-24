module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1724',
        surface1: '#1e293b',
        surface2: '#28374a',
        border1: '#334155',
        border2: '#475569',
        text1: '#f1f5f9',
        text2: '#e2e8f0',
        text3: '#cbd5e1',
        muted: '#94a3b8',
        faint: '#64748b',
        emerald: { DEFAULT: '#34d399', soft: '#6ee7b7' },
        rose: { DEFAULT: '#f87171', soft: '#fca5a5' },
        amber: { DEFAULT: '#fbbf24' },
        accent: '#60a5fa',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
