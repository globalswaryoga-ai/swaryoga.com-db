/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        yoga: {
          50: '#f8f5f0',
          100: '#ede5d8',
          500: '#c9934f',
          600: '#b8793d',
          700: '#9d5f2e',
        },
      },
    },
  },
  plugins: [],
};
