/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Distinctive, warm — set via next/font in layout.tsx
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      colors: {
        // Soft, calm palette per PRD §14
        cream: {
          50: '#fdfaf5',
          100: '#faf3e8',
          200: '#f3e7d1',
        },
        sage: {
          50: '#f3f7f3',
          100: '#e1ebe2',
          200: '#bfd2c1',
          300: '#94b399',
          400: '#6f9576',
          500: '#557a5d',
          600: '#42624a',
          700: '#36503d',
          800: '#2d4133',
          900: '#26362b',
        },
        mist: {
          50: '#f4f7fa',
          100: '#e6edf4',
          200: '#cdd9e6',
          300: '#a6bbd0',
          400: '#7896b6',
          500: '#5b7a9e',
          600: '#476284',
          700: '#3b506c',
          800: '#33445b',
          900: '#2d3a4d',
        },
        coral: {
          50: '#fdf5f1',
          100: '#fbe7dd',
          200: '#f7cbb6',
          300: '#f1a787',
          400: '#e8825c',
          500: '#dc6438',
          600: '#c54d24',
          700: '#a43c1f',
          800: '#85331f',
          900: '#6c2d1e',
        },
        lavender: {
          50: '#f7f5fb',
          100: '#ece8f4',
          200: '#dad2e8',
          300: '#bdaed4',
          400: '#9c87bb',
          500: '#7e64a3',
        },
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgb(45 65 51 / 0.08), 0 1px 3px -1px rgb(45 65 51 / 0.04)',
        glow: '0 8px 32px -8px rgb(85 122 93 / 0.25)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
