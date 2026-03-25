/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fef5f4',
          100: '#fde8e6',
          200: '#fbd0cc',
          300: '#f5a5a0',
          400: '#e87068',
          500: '#c0392b',
          600: '#a93226',
          700: '#8b1a1a',
          800: '#6b1414',
          900: '#4a0e0e',
        },
        olive: {
          50:  '#f6f7ee',
          100: '#eaedda',
          200: '#d3d9b3',
          300: '#b5c082',
          400: '#93a452',
          500: '#6b7c3a',
          600: '#52602c',
          700: '#3f4a22',
          800: '#2e351a',
          900: '#1f2412',
        },
      },
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
