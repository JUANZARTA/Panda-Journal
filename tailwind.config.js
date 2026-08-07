/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enable dark mode support
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // Paleta "cuaderno": los valores reales viven en variables CSS
      // (src/styles.css) — acá solo se referencian, así el modo oscuro no
      // invierte colores, define su propia paleta completa.
      colors: {
        paper: {
          DEFAULT: 'var(--paper-bg)',
          raised: 'var(--paper-bg-raised)',
          line: 'var(--paper-line)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
        },
        done: 'var(--done)',
        pending: 'var(--pending)',
        overdue: 'var(--overdue)',
      },
      fontFamily: {
        hand: ['"Caveat"', 'cursive'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        page: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -12px rgba(0,0,0,0.18)',
      },
    },
  },
  plugins: [],
}
