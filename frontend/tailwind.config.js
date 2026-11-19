/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        shelf: 'var(--shelf)',
        tile: 'var(--tile)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        hairline: 'var(--hairline)',
        cocoa: {
          DEFAULT: 'var(--cocoa)',
          deep: 'var(--cocoa-deep)',
          wash: 'var(--cocoa-wash)',
        },
        rise: 'var(--rise)',
        fall: 'var(--fall)',
        steady: 'var(--steady)',
        series: {
          b: 'var(--series-b)',
          c: 'var(--series-c)',
        },
        warn: 'var(--warn)',
      },
      fontFamily: {
        serif: ['"Young Serif"', 'Georgia', 'serif'],
        sans: ['"Rethink Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Fragment Mono"', 'monospace'],
      },
      boxShadow: {
        shelf: '0 1px 0 var(--hairline)',
        tag: '0 2px 4px rgba(35, 24, 21, 0.05)',
      },
      borderRadius: {
        tile: '10px',
      },
    },
  },
  plugins: [],
}
