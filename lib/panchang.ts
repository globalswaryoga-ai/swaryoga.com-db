/**
 * Panchang Integration Module
 * Using @bidyashish/panchang - Modern Hindu Calendar Calculator
 * 
 * NOTE: @bidyashish/panchang has been removed due to native module (swisseph) 
 * compilation issues on Vercel. The calendar endpoint uses calendarCalculations.ts instead.
 * 
 * Installation:
 * npm install @bidyashish/panchang
 */

// DISABLED: import { getPanchanga, type PanchangaResult } from '@bidyashish/panchang';
// Stub for compilation - actual panchang functionality moved to calendarCalculations.ts

/**
 * Complete Panchang data structure matching Hindu Calendar system
 */
export interface PanchangData {
  // Basic
  date: string;
  day: string;
  
  // Five Elements (Panch-Anga)
  tithi: {
    name: string;
    number: number; // 1-30
    paksha: 'Shukla Paksha' | 'Krishna Paksha';
    startTime: string;
    endTime: string;
  };
  
  nakshatra: {
    name: string;
    number: number; // 1-27
    deity: string;
    startTime: string;
    endTime: string;
  };
  
  yoga: {
    name: string;
    number: number; // 1-27
    type: 'auspicious' | 'inauspicious' | 'mixed';
    startTime: string;
    endTime: string;
  };
  
  karana: {
    name: string;
    type: 'fixed' | 'movable';
    startTime: string;
    endTime: string;
  };
  
  vaara: {
    name: 'Sunday' | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
    number: number; // 0-6
  };
  
  // Sixth Element
  raasi: {
    name: string;
    number: number; // 1-12
    element: 'Fire' | 'Earth' | 'Air' | 'Water';
    symbol: string;
  };
  
  // Ayanamsa
  ayanamsa: number;
}

/**
 * All 27 Nakshatras with their deities and properties
 */
export const NAKSHATRAS = [
  { name: 'Ashwini', deity: 'Ashwini Kumaras', number: 1 },
  { name: 'Bharani', deity: 'Yama', number: 2 },
  { name: 'Krittika', deity: 'Agni', number: 3 },
  { name: 'Rohini', deity: 'Brahma', number: 4 },
  { name: 'Mrigashirsha', deity: 'Soma', number: 5 },
  { name: 'Ardra', deity: 'Rudra', number: 6 },
  { name: 'Punarvasu', deity: 'Aditi', number: 7 },
  { name: 'Pushyami', deity: 'Brihaspati', number: 8 },
  { name: 'Ashlesha', deity: 'Serpent', number: 9 },
  { name: 'Magha', deity: 'Pitris', number: 10 },
  { name: 'Purva Phalguni', deity: 'Aryaman', number: 11 },
  { name: 'Uttara Phalguni', deity: 'Bhaga', number: 12 },
  { name: 'Hasta', deity: 'Savitar', number: 13 },
  { name: 'Chitra', deity: 'Tvashtar', number: 14 },
  { name: 'Swati', deity: 'Vayu', number: 15 },
  { name: 'Vishakha', deity: 'Indra & Agni', number: 16 },
  { name: 'Anuradha', deity: 'Mitra', number: 17 },
  { name: 'Jyeshtha', deity: 'Indra', number: 18 },
  { name: 'Mula', deity: 'Kali', number: 19 },
  { name: 'Purva Ashadha', deity: 'Apas', number: 20 },
  { name: 'Uttara Ashadha', deity: 'Vishvadevas', number: 21 },
  { name: 'Abhijit', deity: 'Brahmanaspati', number: 22 },
  { name: 'Sravana', deity: 'Vishnu', number: 23 },
  { name: 'Dhanishtha', deity: 'Vasus', number: 24 },
  { name: 'Shatabhisha', deity: 'Varuna', number: 25 },
  { name: 'Purva Bhadrapada', deity: 'Aja Ekapada', number: 26 },
  { name: 'Uttara Bhadrapada', deity: 'Ahir Budhnya', number: 27 },
];

/**
 * All 12 Raasis (Zodiac Signs)
 */
export const RAASIS = [
  { name: 'Aries', element: 'Fire', symbol: '♈', number: 1 },
  { name: 'Taurus', element: 'Earth', symbol: '♉', number: 2 },
  { name: 'Gemini', element: 'Air', symbol: '♊', number: 3 },
  { name: 'Cancer', element: 'Water', symbol: '♋', number: 4 },
  { name: 'Leo', element: 'Fire', symbol: '♌', number: 5 },
  { name: 'Virgo', element: 'Earth', symbol: '♍', number: 6 },
  { name: 'Libra', element: 'Air', symbol: '♎', number: 7 },
  { name: 'Scorpio', element: 'Water', symbol: '♏', number: 8 },
  { name: 'Sagittarius', element: 'Fire', symbol: '♐', number: 9 },
  { name: 'Capricorn', element: 'Earth', symbol: '♑', number: 10 },
  { name: 'Aquarius', element: 'Air', symbol: '♒', number: 11 },
  { name: 'Pisces', element: 'Water', symbol: '♓', number: 12 },
];

/**
 * All 27 Yogas with their auspiciousness classification
 */
export const YOGAS = [
  { name: 'Vishkambha', type: 'auspicious', number: 1 },
  { name: 'Priti', type: 'auspicious', number: 2 },
  { name: 'Ayushman', type: 'auspicious', number: 3 },
  { name: 'Saubhagya', type: 'auspicious', number: 4 },
  { name: 'Shobhana', type: 'auspicious', number: 5 },
  { name: 'Atiganda', type: 'inauspicious', number: 6 },
  { name: 'Sukarma', type: 'auspicious', number: 7 },
  { name: 'Dhriti', type: 'auspicious', number: 8 },
  { name: 'Shula', type: 'inauspicious', number: 9 },
  { name: 'Ganda', type: 'inauspicious', number: 10 },
  { name: 'Vriddhi', type: 'auspicious', number: 11 },
  { name: 'Dhruva', type: 'auspicious', number: 12 },
  { name: 'Vyaghata', type: 'inauspicious', number: 13 },
  { name: 'Harshana', type: 'auspicious', number: 14 },
  { name: 'Vajra', type: 'auspicious', number: 15 },
  { name: 'Siddhi', type: 'auspicious', number: 16 },
  { name: 'Vyatipata', type: 'inauspicious', number: 17 },
  { name: 'Variyana', type: 'inauspicious', number: 18 },
  { name: 'Parigha', type: 'inauspicious', number: 19 },
  { name: 'Shiva', type: 'auspicious', number: 20 },
  { name: 'Siddha', type: 'auspicious', number: 21 },
  { name: 'Sadharana', type: 'auspicious', number: 22 },
  { name: 'Shubha', type: 'auspicious', number: 23 },
  { name: 'Shukla', type: 'auspicious', number: 24 },
  { name: 'Brahma', type: 'auspicious', number: 25 },
  { name: 'Indra', type: 'auspicious', number: 26 },
  { name: 'Vaidhriti', type: 'inauspicious', number: 27 },
];

/**
 * All Tithis in Shukla Paksha (Waxing Moon)
 */
export const TITHI_NAMES_SHUKLA = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];

/**
 * All Tithis in Krishna Paksha (Waning Moon)
 */
export const TITHI_NAMES_KRISHNA = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

/**
 * Vaara (Days of Week)
 */
export const VAARAS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Karana names (half-tithis)
 */
export const KARANAS = [
  { name: 'Kava', type: 'movable' as const },
  { name: 'Bava', type: 'movable' as const },
  { name: 'Balava', type: 'movable' as const },
  { name: 'Kaulava', type: 'movable' as const },
  { name: 'Taitula', type: 'movable' as const },
  { name: 'Gara', type: 'movable' as const },
  { name: 'Vanija', type: 'movable' as const },
  { name: 'Vishti', type: 'movable' as const },
  { name: 'Shakuni', type: 'fixed' as const },
  { name: 'Chatushpada', type: 'fixed' as const },
  { name: 'Naga', type: 'fixed' as const },
  { name: 'Kintamani', type: 'fixed' as const },
  { name: 'Bhadraka', type: 'fixed' as const },
  { name: 'Balakara', type: 'fixed' as const },
  { name: 'Prarambha', type: 'movable' as const },
];

/**
 * Calculate complete Panchang data for a given date and location
 * NOTE: Disabled - @bidyashish/panchang removed due to native module issues
 * Use calendarCalculations.ts instead for calendar data
 */
export async function calculatePanchang(
  date: Date,
  latitude: number = 28.6139,
  longitude: number = 77.209,
  timezone: string = 'Asia/Kolkata'
): Promise<PanchangData> {
  // Stub implementation - panchang calculations disabled
  // Use /api/calendar endpoint which uses calendarCalculations.ts
  throw new Error('Panchang calculations not available. Use /api/calendar endpoint instead.');
}

/**
 * Get Tithi name based on number and paksha
 */
export function getTithiName(number: number, isShukla: boolean): string {
  if (isShukla && number >= 1 && number <= 15) {
    return TITHI_NAMES_SHUKLA[number - 1] || 'Unknown';
  } else if (!isShukla && number >= 1 && number <= 15) {
    return TITHI_NAMES_KRISHNA[number - 1] || 'Unknown';
  }
  return 'Unknown';
}

/**
 * Check if a date is auspicious
 */
export function isAuspiciousDate(panchang: PanchangData): boolean {
  const auspiciousYogas = ['Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana'];
  const inauspiciousTithis = ['Amavasya', 'Chaturdashi'];
  const inauspiciousNakshatras = ['Kritika'];

  const yogeScore = auspiciousYogas.includes(panchang.yoga.name) ? 1 : -1;
  const tithiScore = inauspiciousTithis.includes(panchang.tithi.name) ? -1 : 1;
  const nakshatraScore = inauspiciousNakshatras.includes(panchang.nakshatra.name) ? -1 : 1;

  return yogeScore + tithiScore + nakshatraScore > 0;
}

/**
 * Get festival suggestions based on Panchang data
 */
export function getFestivalSuggestions(panchang: PanchangData): string[] {
  const festivals: string[] = [];

  // Amavasya (New Moon) - Suitable for Kali worship
  if (panchang.tithi.name === 'Amavasya') {
    festivals.push('Kali Puja', 'Ancestor Worship');
  }

  // Purnima (Full Moon) - Suitable for Lakshmi worship
  if (panchang.tithi.name === 'Purnima') {
    festivals.push('Lakshmi Puja', 'Full Moon Meditation');
  }

  // Ekadashi - Fasting day
  if (panchang.tithi.name === 'Ekadashi') {
    festivals.push('Ekadashi Vrat (Fast)', 'Vishnu Worship');
  }

  // Specific Nakshatra good times
  if (panchang.nakshatra.name === 'Rohini') {
    festivals.push('House Warming', 'Vehicle Purchase');
  }

  if (panchang.nakshatra.name === 'Magha') {
    festivals.push('Ancestor Worship', 'Family Ceremonies');
  }

  if (panchang.yoga.type === 'auspicious') {
    festivals.push('Good for New Endeavors');
  }

  return festivals;
}

/**
 * Format Panchang time string for display
 */
export function formatPanchangTime(time: string | undefined): string {
  if (!time) return 'N/A';
  try {
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  } catch {
    return time;
  }
}

/**
 * Get Panchang interpretation for UI display
 */
export function getPanchangInterpretation(
  panchang: PanchangData
): {
  summary: string;
  details: string[];
  recommendation: string;
} {
  const details: string[] = [];

  // Tithi analysis
  if (panchang.tithi.name === 'Amavasya') {
    details.push('Amavasya (New Moon) - Time for introspection and dark practices');
  } else if (panchang.tithi.name === 'Purnima') {
    details.push('Purnima (Full Moon) - Highly auspicious for spiritual practices');
  } else {
    details.push(`${panchang.tithi.name} (${panchang.tithi.paksha}) - ${panchang.tithi.number}/30`);
  }

  // Nakshatra analysis
  details.push(`Nakshatra: ${panchang.nakshatra.name} (Ruled by ${panchang.nakshatra.deity})`);

  // Yoga analysis
  details.push(`Yoga: ${panchang.yoga.name} - ${panchang.yoga.type.charAt(0).toUpperCase() + panchang.yoga.type.slice(1)}`);

  // Raasi analysis
  details.push(`Moon in ${panchang.raasi.name} (${panchang.raasi.element})`);

  return {
    summary: `${panchang.day}, ${panchang.tithi.name} in ${panchang.nakshatra.name}`,
    details,
    recommendation: isAuspiciousDate(panchang)
      ? 'Favorable day for important activities'
      : 'Day requires caution for major decisions',
  };
}
