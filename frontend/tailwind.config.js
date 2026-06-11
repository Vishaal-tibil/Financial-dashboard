/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F1B3D',
          800: '#16234d',
          700: '#1d2c5e',
        },
        canvas: '#F5F7FB',
        brand: '#2D5BFF',
        ai: '#7C5CFC',
        good: '#16A34A',
        bad: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,27,61,0.06), 0 1px 2px rgba(16,27,61,0.04)',
      },
    },
  },
  plugins: [],
};
