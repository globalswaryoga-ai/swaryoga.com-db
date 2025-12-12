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
        // ===== SWAR YOGA WELLNESS PALETTE (Global Design Standards) =====
        
        // PRIMARY: Forest Green (Healing, Growth, Trust, Nature)
        // Used for: Main UI, navigation, headers, primary CTAs
        'forest-green': {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#2D6A4F', // PRIMARY - Tetradic balance
          600: '#259d4d',
          700: '#1b7e4a',
          800: '#155e47',
          900: '#0d4437',
          950: '#05342a',
        },
        
        // SECONDARY: Teal (Calm, Clarity, Tranquility, Water)
        // Used for: Secondary buttons, links, calm sections, accents
        'teal-accent': {
          50: '#e0f7f6',
          100: '#b3e5e2',
          200: '#80d4ce',
          300: '#4dc3ba',
          400: '#4ECDC4', // SECONDARY - Tetradic balance
          500: '#35b8a9',
          600: '#2a9b93',
          700: '#1f7d7d',
          800: '#156768',
          900: '#0b4f52',
          950: '#052c2e',
        },
        
        // ACCENT: Coral-Rose (Energy, Vitality, Prana, Life Force)
        // Used for: Important CTAs, alerts, motivation, energy sections
        'coral-rose': {
          50: '#ffe8e0',
          100: '#ffc9ba',
          200: '#ffaa94',
          300: '#ff8b6e',
          400: '#E07B69', // ACCENT - Tetradic balance
          500: '#d66b58',
          600: '#cc5b47',
          700: '#b84a36',
          800: '#a43a25',
          900: '#902a14',
          950: '#7c1f09',
        },
        
        // BASE: Earth Brown (Stability, Grounding, Trust, Foundation)
        // Used for: Body text, base elements, grounding accents
        'earth-brown': {
          50: '#f5f5f0',
          100: '#e8e0d5',
          200: '#d4c4b0',
          300: '#bfa88b',
          400: '#a78c66',
          500: '#6F4E37', // BASE - Tetradic balance
          600: '#664132',
          700: '#56362d',
          800: '#462b28',
          900: '#362023',
          950: '#2b181d',
        },
        
        // NEUTRALS: Cream & White (Light, Clean, Professional)
        'cream': '#f5f5f0',
        'off-white': '#fafaf8',
        
        // ===== LEGACY SUPPORT (For compatibility) =====
        primary: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#2D6A4F', // Mapped to Forest Green
          600: '#259d4d',
          700: '#1b7e4a',
          800: '#155e47',
          900: '#0d4437',
          950: '#05342a',
        },
        secondary: {
          50: '#e0f7f6',
          100: '#b3e5e2',
          200: '#80d4ce',
          300: '#4dc3ba',
          400: '#4ECDC4', // Mapped to Teal
          500: '#35b8a9',
          600: '#2a9b93',
          700: '#1f7d7d',
          800: '#156768',
          900: '#0b4f52',
        },
        accent: {
          50: '#ffe8e0',
          100: '#ffc9ba',
          200: '#ffaa94',
          300: '#ff8b6e',
          400: '#E07B69', // Mapped to Coral-Rose
          500: '#d66b58',
          600: '#cc5b47',
          700: '#b84a36',
          800: '#a43a25',
          900: '#902a14',
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
