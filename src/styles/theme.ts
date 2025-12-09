/**
 * SWAR YOGA - Global Design System
 * 20-Point Brand Design Specification
 */

export const theme = {
  // Color Palette (4 colors max)
  colors: {
    // Primary Brand Green
    primary: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      400: '#4ADE80',
      500: '#22C55E', // Primary Green
      600: '#16A34A',
      700: '#15803D',
      800: '#166534',
      900: '#145231',
      DEFAULT: '#22C55E', // Main brand green
      dark: '#16A34A', // Darker for hover
      light: '#BBF7D0', // Light for backgrounds
    },

    // Teal Accent (small use only)
    accent: {
      50: '#F0FDFC',
      300: '#67E8F9',
      400: '#4FA3A5',
      500: '#14B8A6',
      DEFAULT: '#4FA3A5', // Teal accent
    },

    // Off-white/Beige Background
    background: {
      primary: '#FFFBF8', // Off-white
      secondary: '#F8F7F5', // Very light beige
      light: '#FAFAF9', // Neutral light
      DEFAULT: '#FFFBF8',
    },

    // Text Colors
    text: {
      primary: '#2A2A2A', // Charcoal for body text
      secondary: '#525252', // Medium gray
      tertiary: '#78716C', // Light gray
      light: '#A8A29E', // Lighter gray
      white: '#FFFFFF',
      dark: '#1F2937',
    },

    // Neutral Grays
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },

    // Utility Colors
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  // Typography System (1-2 fonts)
  fonts: {
    body: "'Inter', 'Segoe UI', Roboto, sans-serif",
    heading: "'Poppins', 'Inter', sans-serif",
    mono: "'Fira Code', monospace",
  },

  // Font Sizes
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },

  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Spacing System
  spacing: {
    xs: '0.5rem', // 8px
    sm: '0.75rem', // 12px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '2.5rem', // 40px
    '3xl': '3rem', // 48px
    '4xl': '4rem', // 64px
  },

  // Border Radius (consistent rounded corners)
  borderRadius: {
    none: '0',
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px', // Fully rounded
    button: '0.75rem', // 12px for buttons
  },

  // Shadow System
  shadow: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },

  // Transitions
  transition: {
    fast: 'all 0.15s ease-in-out',
    base: 'all 0.3s ease-in-out',
    slow: 'all 0.5s ease-in-out',
  },
};

// CSS Variables for global use
export const cssVariables = `
  :root {
    /* Primary Colors */
    --color-primary: ${theme.colors.primary.DEFAULT};
    --color-primary-dark: ${theme.colors.primary.dark};
    --color-primary-light: ${theme.colors.primary.light};

    /* Accent */
    --color-accent: ${theme.colors.accent.DEFAULT};

    /* Background */
    --color-bg-primary: ${theme.colors.background.primary};
    --color-bg-secondary: ${theme.colors.background.secondary};

    /* Text */
    --color-text-primary: ${theme.colors.text.primary};
    --color-text-secondary: ${theme.colors.text.secondary};

    /* Typography */
    --font-body: ${theme.fonts.body};
    --font-heading: ${theme.fonts.heading};

    /* Spacing */
    --spacing-xs: ${theme.spacing.xs};
    --spacing-sm: ${theme.spacing.sm};
    --spacing-md: ${theme.spacing.md};
    --spacing-lg: ${theme.spacing.lg};
    --spacing-xl: ${theme.spacing.xl};

    /* Border Radius */
    --radius-button: ${theme.borderRadius.button};
    --radius-lg: ${theme.borderRadius.lg};

    /* Transition */
    --transition: ${theme.transition.base};
  }
`;
