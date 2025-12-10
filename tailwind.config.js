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
        // Primary Green (Nature & Wellness)
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Main Green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#145231',
          950: '#0c2818',
        },
        // Secondary Teal (Ocean & Calm)
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6', // Teal Accent
          600: '#0d9488',
          700: '#0f766e',
          800: '#155e75',
          900: '#134e4a',
        },
        // Accent Gold (Warmth & Prosperity)
        accent: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308', // Gold Accent
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        // Neutral (Professional Look)
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Background & Subtle Greens
        nature: {
          50: '#f5fdf8',
          100: '#e8faf4',
          200: '#d0f5e8',
          300: '#a8ead9',
          400: '#7cdec9',
          500: '#4ecab7',
          600: '#3db0a0',
          700: '#2f8f87',
          800: '#2a716e',
          900: '#255a59',
        },
        // Yoga Custom
        yoga: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#145231',
        },
      },
      backgroundImage: {
        'gradient-eco': 'linear-gradient(135deg, #22c55e 0%, #14b8a6 100%)',
        'gradient-warm': 'linear-gradient(135deg, #15803d 0%, #eab308 100%)',
        'gradient-premium': 'linear-gradient(135deg, #0c2818 0%, #22c55e 50%, #14b8a6 100%)',
        'gradient-subtle': 'linear-gradient(180deg, rgba(34, 197, 94, 0.05) 0%, rgba(20, 184, 166, 0.05) 100%)',
      },
      boxShadow: {
        'eco': '0 10px 30px rgba(34, 197, 94, 0.15)',
        'eco-lg': '0 20px 50px rgba(34, 197, 94, 0.2)',
        'premium': '0 15px 40px rgba(12, 40, 24, 0.15)',
      },
      fontSize: {
        'header-lg': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'header-md': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'header-sm': ['2rem', { lineHeight: '1.3', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};
