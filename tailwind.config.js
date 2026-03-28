/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm terracotta / brick red — cookbook warmth, not alarm-panel red
        primary: {
          50:  '#fef5f2',
          100: '#fde6df',
          200: '#fac9bc',
          300: '#f4a08e',
          400: '#e57560',
          500: '#c25842',   // main button colour — warm brick terracotta
          600: '#a84535',   // hover / darker
          700: '#8b3228',   // deep brick (header stripe, nav active)
          800: '#6b2218',   // very dark — title text
          900: '#4a150e',
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
      boxShadow: {
        // Warm-tinted card shadow — feels organic, not grey/corporate
        'card':    '0 2px 12px rgba(139, 50, 40, 0.07), 0 1px 3px rgba(0,0,0,0.05)',
        'card-lg': '0 8px 28px rgba(139, 50, 40, 0.12), 0 2px 8px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
