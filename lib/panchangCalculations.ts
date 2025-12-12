'use server';

/**
 * Panchang Calculations using @bidyashish/panchang
 * This file is server-only and uses Swiss Ephemeris for accurate calculations
 * 
 * Only imported and used in API routes (server-side)
 * Not bundled with client-side code
 */

import { getPanchanga } from '@bidyashish/panchang';

/**
 * Calculate Tithi using @bidyashish/panchang library (ASYNC - Most Accurate)
 * This uses Swiss Ephemeris for 99.9% accuracy
 * 
 * @param date - Date to calculate tithi for
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param timezone - Timezone as string (e.g., "Asia/Kolkata", "America/New_York")
 * @returns Promise with { tithi: number (1-15), tithiName: string, paksha: string, fullPanchanga: object }
 */
export const calculateTithiWithPanchang = async (
  date: Date,
  latitude: number,
  longitude: number,
  timezone: string
): Promise<{
  tithi: number;
  tithiName: string;
  paksha: 'Shukla Paksha' | 'Krishna Paksha';
  fullPanchanga: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}> => {
  try {
    const panchanga = await getPanchanga(date, latitude, longitude, timezone);
    
    const tithiNumber = panchanga.tithi.number;
    
    // Determine Paksha based on tithi value
    let paksha: 'Shukla Paksha' | 'Krishna Paksha';
    let normalizedTithi: number;
    
    if (tithiNumber <= 15) {
      // Shukla Paksha (Waxing Moon): Tithi 1-15
      paksha = 'Shukla Paksha';
      normalizedTithi = tithiNumber;
    } else {
      // Krishna Paksha (Waning Moon): Tithi 16-30
      paksha = 'Krishna Paksha';
      normalizedTithi = tithiNumber - 15;
    }
    
    // Ensure tithi is in 1-15 range
    if (normalizedTithi <= 0) normalizedTithi = 1;
    if (normalizedTithi > 15) normalizedTithi = 15;
    
    return {
      tithi: normalizedTithi,
      tithiName: panchanga.tithi.name,
      paksha,
      fullPanchanga: panchanga
    };
  } catch (error) {
    console.error('Tithi calculation with @bidyashish/panchang failed:', error);
    throw error;
  }
};

/**
 * Get all 5 Panchang elements
 * Returns: Tithi, Nakshatra, Yoga, Karana, Vara
 */
export const getPanchangaComplete = async (
  date: Date,
  latitude: number,
  longitude: number,
  timezone: string
): Promise<any> => { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    const panchanga = await getPanchanga(date, latitude, longitude, timezone);
    
    return {
      date: date.toISOString().split('T')[0],
      tithi: {
        name: panchanga.tithi.name,
        number: panchanga.tithi.number
      },
      nakshatra: {
        name: panchanga.nakshatra.name,
        number: panchanga.nakshatra.number
      },
      yoga: {
        name: panchanga.yoga.name,
        number: panchanga.yoga.number
      },
      karana: {
        name: panchanga.karana.name
      },
      vara: {
        name: panchanga.vara.name
      },
      sunrise: panchanga.sunrise,
      sunset: panchanga.sunset
    };
  } catch (error) {
    console.error('Panchang calculation failed:', error);
    throw error;
  }
};
