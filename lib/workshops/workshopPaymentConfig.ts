/**
 * @fileoverview Workshop Payment Configuration
 * 
 * Centralized configuration for all workshop payment links
 * Each workshop has direct PayU payment links for different modes and languages
 * 
 * Structure:
 * - workshopSlug (unique identifier)
 * - name (display name)
 * - duration (e.g., "2 days", "5 days")
 * - schedule (e.g., "7:00 PM - 8:30 PM")
 * - basePrice (price in INR)
 * - paymentLinks (PayU links for different modes and languages)
 */

export interface WorkshopPaymentConfig {
  slug: string;
  name: string;
  shortName: string;
  duration: string;
  schedule: string;
  basePrice: number;
  currency: string;
  paymentLinks: {
    online: {
      english: string;
      hindi: string;
      marathi?: string;
      nepali?: string;
    };
    offline?: {
      english: string;
      hindi: string;
      marathi?: string;
    };
    residential?: {
      english: string;
      hindi: string;
    };
    recorded?: {
      english: string;
      hindi: string;
    };
  };
}

/**
 * SWAR YOGA BASIC PROGRAM
 * 2 Days Only
 * Time: 7:00 PM - 8:30 PM
 */
export const SwarYogaBasicProgram: WorkshopPaymentConfig = {
  slug: 'swar-yoga-basic-program',
  name: 'Swar Yoga Basic Program - 2 Days',
  shortName: 'Swar Yoga Basic',
  duration: '2 days only',
  schedule: '7:00 PM - 8:30 PM',
  basePrice: 3300,
  currency: 'INR',
  paymentLinks: {
    online: {
      english: 'https://u.payu.in/example-english-online', // Replace with actual link
      hindi: 'https://u.payu.in/kru2VzxJ7TlK', // Your provided link
      marathi: 'https://u.payu.in/example-marathi-online',
      nepali: 'https://u.payu.in/example-nepali-online',
    },
    offline: {
      english: 'https://u.payu.in/example-english-offline',
      hindi: 'https://u.payu.in/example-hindi-offline',
    },
    residential: {
      english: 'https://u.payu.in/example-english-residential',
      hindi: 'https://u.payu.in/example-hindi-residential',
    },
  },
};

/**
 * SWAR YOGA LEVEL-1 WORKSHOP
 * 5 Days
 * Time: Varies by schedule
 */
export const SwarYogaLevel1: WorkshopPaymentConfig = {
  slug: 'swar-yoga-level-1',
  name: 'Swar Yoga Level-1 Workshop',
  shortName: 'Swar Yoga L-1',
  duration: '5 days',
  schedule: 'Varies by schedule',
  basePrice: 3300,
  currency: 'INR',
  paymentLinks: {
    online: {
      english: 'https://u.payu.in/swar-yoga-l1-english-online',
      hindi: 'https://u.payu.in/swar-yoga-l1-hindi-online',
      marathi: 'https://u.payu.in/swar-yoga-l1-marathi-online',
      nepali: 'https://u.payu.in/swar-yoga-l1-nepali-online',
    },
    offline: {
      english: 'https://u.payu.in/swar-yoga-l1-english-offline',
      hindi: 'https://u.payu.in/swar-yoga-l1-hindi-offline',
    },
    residential: {
      english: 'https://u.payu.in/swar-yoga-l1-english-residential',
      hindi: 'https://u.payu.in/swar-yoga-l1-hindi-residential',
    },
  },
};

/**
 * YOGASANA SADHANA
 * 3 Days
 */
export const YogasanaSadhana: WorkshopPaymentConfig = {
  slug: 'yogasana-sadhana',
  name: 'Yogasana Sadhana Workshop',
  shortName: 'Yogasana Sadhana',
  duration: '3 days',
  schedule: 'Varies by schedule',
  basePrice: 330,
  currency: 'INR',
  paymentLinks: {
    online: {
      english: 'https://u.payu.in/yogasana-sadhana-english-online',
      hindi: 'https://u.payu.in/yogasana-sadhana-hindi-online',
    },
  },
};

/**
 * BREATHING BASICS
 * 2 Days
 */
export const BreathingBasics: WorkshopPaymentConfig = {
  slug: 'breathing-basics',
  name: 'Breathing Basics Workshop',
  shortName: 'Breathing Basics',
  duration: '2 days',
  schedule: 'Varies by schedule',
  basePrice: 1500,
  currency: 'INR',
  paymentLinks: {
    online: {
      english: 'https://u.payu.in/breathing-basics-english-online',
      hindi: 'https://u.payu.in/breathing-basics-hindi-online',
    },
  },
};

/**
 * MASTER SWAR YOGA – 6 MONTH MASTERCLASS (L1–L5)
 * Monthly plan + 3-month plan.
 * NOTE: Replace the placeholder PayU links with real PayU URLs when available.
 */
export const MasterSwarYogaMonthly: WorkshopPaymentConfig = {
  slug: 'master-swar-yoga',
  name: 'Master Swar Yoga – 6 Month Masterclass (Monthly)',
  shortName: 'Master Swar Yoga (Monthly)',
  duration: '6 months',
  schedule: '3 days/week (per admin schedule)',
  basePrice: 1500,
  currency: 'INR',
  paymentLinks: {
    online: {
      // TODO: Replace with your real PayU links
      hindi: 'https://u.payu.in/master-swar-yoga-monthly-hindi',
      english: 'https://u.payu.in/master-swar-yoga-monthly-english',
      marathi: 'https://u.payu.in/master-swar-yoga-monthly-marathi',
      nepali: 'https://u.payu.in/master-swar-yoga-monthly-nepali',
    },
  },
};

export const MasterSwarYogaThreeMonth: WorkshopPaymentConfig = {
  // Keep a distinct slug for the 3-month plan so we can show a second button.
  slug: 'master-swar-yoga-3-month',
  name: 'Master Swar Yoga – 6 Month Masterclass (3-Month Plan)',
  shortName: 'Master Swar Yoga (3-Month)',
  duration: '3 months',
  schedule: '3 days/week (per admin schedule)',
  basePrice: 3600,
  currency: 'INR',
  paymentLinks: {
    online: {
      // TODO: Replace with your real PayU links
      hindi: 'https://u.payu.in/master-swar-yoga-3month-hindi',
      english: 'https://u.payu.in/master-swar-yoga-3month-english',
      marathi: 'https://u.payu.in/master-swar-yoga-3month-marathi',
      nepali: 'https://u.payu.in/master-swar-yoga-3month-nepali',
    },
  },
};

/**
 * All workshops configuration
 * Use this to dynamically get payment links
 */
export const workshopPaymentConfig: Record<string, WorkshopPaymentConfig> = {
  'swar-yoga-basic-program': SwarYogaBasicProgram,
  'swar-yoga-level-1': SwarYogaLevel1,
  'yogasana-sadhana': YogasanaSadhana,
  'breathing-basics': BreathingBasics,
  'master-swar-yoga': MasterSwarYogaMonthly,
  'master-swar-yoga-3-month': MasterSwarYogaThreeMonth,
};

/**
 * Get payment link for a workshop
 * 
 * @param workshopSlug - Workshop slug
 * @param mode - 'online', 'offline', 'residential', 'recorded'
 * @param language - 'english', 'hindi', 'marathi', 'nepali'
 * @returns PayU payment link
 * 
 * @example
 * const link = getWorkshopPaymentLink('swar-yoga-basic-program', 'online', 'hindi');
 * // Returns: 'https://u.payu.in/kru2VzxJ7TlK'
 */
export function getWorkshopPaymentLink(
  workshopSlug: string,
  mode: 'online' | 'offline' | 'residential' | 'recorded' = 'online',
  language: 'english' | 'hindi' | 'marathi' | 'nepali' = 'english'
): string {
  const workshop = workshopPaymentConfig[workshopSlug];
  if (!workshop) {
    console.warn(`Workshop not found: ${workshopSlug}`);
    return '';
  }

  const modeLinks = workshop.paymentLinks[mode];
  if (!modeLinks) {
    console.warn(`Mode not found for ${workshopSlug}: ${mode}`);
    return '';
  }

  const link = modeLinks[language as keyof typeof modeLinks];
  if (!link) {
    console.warn(`Language not found for ${workshopSlug} ${mode}: ${language}`);
    return '';
  }

  return link;
}

/**
 * Get workshop details
 * 
 * @param workshopSlug - Workshop slug
 * @returns Workshop configuration
 */
export function getWorkshopDetails(workshopSlug: string): WorkshopPaymentConfig | null {
  return workshopPaymentConfig[workshopSlug] || null;
}

/**
 * Get all available workshops
 */
export function getAllWorkshops(): WorkshopPaymentConfig[] {
  return Object.values(workshopPaymentConfig);
}

/**
 * Get available modes for a workshop
 */
export function getAvailableModes(workshopSlug: string): string[] {
  const workshop = workshopPaymentConfig[workshopSlug];
  if (!workshop) return [];
  return Object.keys(workshop.paymentLinks);
}

/**
 * Get available languages for a workshop mode
 */
export function getAvailableLanguages(
  workshopSlug: string,
  mode: string = 'online'
): string[] {
  const workshop = workshopPaymentConfig[workshopSlug];
  if (!workshop) return [];

  const modeLinks = workshop.paymentLinks[mode as keyof typeof workshop.paymentLinks];
  if (!modeLinks) return [];

  return Object.keys(modeLinks);
}
