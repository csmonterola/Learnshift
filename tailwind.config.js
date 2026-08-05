export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#a77959',
          600: '#8c5e3c',
          700: '#6d482d',
          800: '#523520',
          900: '#382213',
        },
        accent: {
          50: '#f4fbf9',
          100: '#e0f5ee',
          200: '#c2ebd9',
          300: '#99dbc1',
          400: '#6bc3a3',
          500: '#45a784',
          600: '#328568',
          700: '#296b54',
          800: '#235544',
          900: '#1e4639',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 8px 40px rgb(0 0 0 / 0.06)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
