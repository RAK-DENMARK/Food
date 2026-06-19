/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B5E4F',
          50: '#E8F5F2',
          100: '#C5E8DF',
          200: '#8ECFC0',
          300: '#57B6A0',
          400: '#339D86',
          500: '#1B5E4F',
          600: '#154B3F',
          700: '#0F3830',
          800: '#092520',
          900: '#031210',
        }
      }
    }
  },
  plugins: []
}
