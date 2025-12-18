/**
 * Swar Yoga Design System Theme Configuration
 * Single source of truth for all design tokens
 * 
 * Usage:
 * import { THEME } from '@/lib/theme';
 * const color = THEME.COLORS.PRIMARY;
 */

export const THEME = {
  // ===== COLORS =====
  COLORS: {
    // Primary: Healing Green
    PRIMARY: '#1E7F43',
    PRIMARY_LIGHT: '#E6F4EC',
    PRIMARY_HOVER: '#166235',

    // Text: Soft Black
    TEXT: '#111111',
    TEXT_SECONDARY: '#333333',
    TEXT_TERTIARY: '#666666',

    // Background: Off White
    BG: '#F9FAF9',
    BG_WHITE: '#FFFFFF',

    // Accent: Saffron Orange
    ACCENT: '#F27A2C',
    ACCENT_LIGHT: '#FFF3E8',
    ACCENT_HOVER: '#E26B1F',

    // Border: Divider Green
    BORDER: '#2F6F4E',
    BORDER_LIGHT: '#E0EDE6',
  },

  // ===== COMPONENT COLORS =====
  COMPONENT_COLORS: {
    // Buttons
    BUTTON: {
      PRIMARY: {
        bg: '#1E7F43',
        text: '#FFFFFF',
        hover: '#166235',
        shadow: 'rgba(30, 127, 67, 0.2)',
      },
      SECONDARY: {
        bg: '#F9FAF9',
        text: '#111111',
        border: '#2F6F4E',
        hover_bg: '#E6F4EC',
        hover_border: '#1E7F43',
        shadow: 'rgba(0, 0, 0, 0.05)',
      },
      ACCENT: {
        bg: '#F27A2C',
        text: '#FFFFFF',
        hover: '#E26B1F',
        shadow: 'rgba(242, 122, 44, 0.2)',
      },
    },

    // Cards
    CARD: {
      bg: '#FFFFFF',
      border: '#E0EDE6',
      text: '#111111',
      hover_border: '#2F6F4E',
      hover_shadow: 'rgba(30, 127, 67, 0.1)',
    },

    // Forms
    FORM: {
      INPUT: {
        bg: '#FFFFFF',
        text: '#111111',
        border: '#2F6F4E',
        border_focus: '#1E7F43',
        shadow_focus: 'rgba(230, 244, 236, 1)',
        placeholder: '#666666',
      },
      LABEL: {
        text: '#111111',
        weight: 500,
      },
    },

    // Navigation
    NAV: {
      bg: '#FFFFFF',
      text: '#111111',
      border: '#E0EDE6',
    },

    // Sidebar
    SIDEBAR: {
      bg: '#1E7F43',
      text: '#FFFFFF',
      text_secondary: '#E6F4EC',
      active_bg: '#F27A2C',
    },

    // Footer
    FOOTER: {
      bg: '#1E7F43',
      text: '#FFFFFF',
      border: 'rgba(255, 255, 255, 0.1)',
    },
  },

  // ===== TYPOGRAPHY =====
  TYPOGRAPHY: {
    HEADING_H1: {
      fontFamily: 'Poppins',
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    HEADING_H2: {
      fontFamily: 'Poppins',
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    HEADING_H3: {
      fontFamily: 'Poppins',
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    HEADING_H4: {
      fontFamily: 'Poppins',
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    BODY_LARGE: {
      fontFamily: 'Poppins',
      fontSize: '1.125rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    BODY_NORMAL: {
      fontFamily: 'Poppins',
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    BODY_SMALL: {
      fontFamily: 'Poppins',
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    BUTTON: {
      fontFamily: 'Poppins',
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    LABEL: {
      fontFamily: 'Poppins',
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.4,
    },
  },

  // ===== SPACING =====
  SPACING: {
    XS: '0.25rem',
    SM: '0.5rem',
    MD: '1rem',
    LG: '1.5rem',
    XL: '2rem',
    XXL: '3rem',
    XXXL: '4rem',
  },

  // ===== SHADOWS =====
  SHADOWS: {
    SMALL: '0 2px 4px rgba(0, 0, 0, 0.05)',
    MEDIUM: '0 4px 6px rgba(30, 127, 67, 0.2)',
    LARGE: '0 4px 12px rgba(30, 127, 67, 0.1)',
    BUTTON_HOVER: '0 6px 12px rgba(30, 127, 67, 0.3)',
  },

  // ===== BORDER RADIUS =====
  BORDER_RADIUS: {
    NONE: '0',
    SMALL: '0.25rem',
    MEDIUM: '0.5rem',
    LARGE: '0.75rem',
    FULL: '9999px',
  },

  // ===== TRANSITIONS =====
  TRANSITIONS: {
    FAST: '0.2s ease',
    NORMAL: '0.3s ease',
    SLOW: '0.5s ease',
  },
};

// Export default for convenience
export default THEME;
