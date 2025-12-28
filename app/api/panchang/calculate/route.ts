import { NextRequest, NextResponse } from 'next/server';
import { calculateHinduCalendar } from '@/lib/calendarCalculations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Nakshatra (27 lunar mansions) based on Moon position
 * Nakshatra = (Moon Longitude % 360) / 13.333 degrees per nakshatra
 */
const NAKSHATRAS = [
  { name: 'Ashwini', symbol: '🐴', symbol_text: '♈︎ I' },
  { name: 'Bharani', symbol: '🔴', symbol_text: '♈︎ II' },
  { name: 'Kritika', symbol: '🔥', symbol_text: '♈︎ III' },
  { name: 'Rohini', symbol: '🐂', symbol_text: '♉︎ I' },
  { name: 'Mrigashirsha', symbol: '🦌', symbol_text: '♉︎ II' },
  { name: 'Ardra', symbol: '💧', symbol_text: '♉︎ III' },
  { name: 'Punarvasu', symbol: '🏹', symbol_text: '♊︎ I' },
  { name: 'Pushya', symbol: '🌙', symbol_text: '♊︎ II' },
  { name: 'Ashlesha', symbol: '🐍', symbol_text: '♊︎ III' },
  { name: 'Magha', symbol: '👑', symbol_text: '♌︎ I' },
  { name: 'Purva Phalguni', symbol: '💎', symbol_text: '♌︎ II' },
  { name: 'Uttara Phalguni', symbol: '⭐', symbol_text: '♌︎ III' },
  { name: 'Hasta', symbol: '✋', symbol_text: '♍︎ I' },
  { name: 'Chitra', symbol: '💫', symbol_text: '♍︎ II' },
  { name: 'Swati', symbol: '🌬️', symbol_text: '♍︎ III' },
  { name: 'Vishakha', symbol: '🌳', symbol_text: '♎︎ I' },
  { name: 'Anuradha', symbol: '❤️', symbol_text: '♎︎ II' },
  { name: 'Jyeshtha', symbol: '👁️', symbol_text: '♎︎ III' },
  { name: 'Mula', symbol: '🔱', symbol_text: '♐︎ I' },
  { name: 'Purva Ashadha', symbol: '🌊', symbol_text: '♐︎ II' },
  { name: 'Uttara Ashadha', symbol: '⚔️', symbol_text: '♐︎ III' },
  { name: 'Sravana', symbol: '👂', symbol_text: '♑︎ I' },
  { name: 'Dhanishtha', symbol: '🥁', symbol_text: '♑︎ II' },
  { name: 'Shatabhisha', symbol: '💯', symbol_text: '♑︎ III' },
  { name: 'Purva Bhadrapada', symbol: '🔥', symbol_text: '♒︎ I' },
  { name: 'Uttara Bhadrapada', symbol: '🌟', symbol_text: '♒︎ II' },
  { name: 'Revati', symbol: '🐠', symbol_text: '♓︎ I' },
];

/**
 * Yoga (27 special combinations)
 * Yoga = (Sun Longitude + Moon Longitude) / 13.333
 */
const YOGAS = [
  { name: 'Vishkumbha', symbol: '⚠️', effect: 'Inauspicious', color: '#ff6b6b' },
  { name: 'Priti', symbol: '😊', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Ayushman', symbol: '💚', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Saubhagya', symbol: '✨', effect: 'Very Auspicious', color: '#ffd700' },
  { name: 'Shobhan', symbol: '🌟', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Atiganda', symbol: '⚡', effect: 'Inauspicious', color: '#ff6b6b' },
  { name: 'Sukarma', symbol: '✅', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Dhriti', symbol: '💪', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Shula', symbol: '🗡️', effect: 'Inauspicious', color: '#ff6b6b' },
  { name: 'Ganda', symbol: '🔗', effect: 'Inauspicious', color: '#ff6b6b' },
  { name: 'Vriddhi', symbol: '📈', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Dhruva', symbol: '🏔️', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Vyaghata', symbol: '🐯', effect: 'Inauspicious', color: '#ff6b6b' },
  { name: 'Harshana', symbol: '😄', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Vajra', symbol: '💎', effect: 'Very Auspicious', color: '#ffd700' },
  { name: 'Siddhi', symbol: '🎯', effect: 'Very Auspicious', color: '#ffd700' },
  { name: 'Sadhya', symbol: '🙏', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Shubha', symbol: '🌸', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Shukra', symbol: '✨', effect: 'Very Auspicious', color: '#ffd700' },
  { name: 'Brahma', symbol: '📿', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Indra', symbol: '👑', effect: 'Very Auspicious', color: '#ffd700' },
  { name: 'Vaidhriti', symbol: '⚠️', effect: 'Inauspicious - Avoid New Work', color: '#ff6b6b' },
  { name: 'Parigha', symbol: '🚫', effect: 'Inauspicious', color: '#ff6b6b' },
  { name: 'Shiva', symbol: '🔱', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Siddha', symbol: '🌙', effect: 'Very Auspicious', color: '#ffd700' },
  { name: 'Sadhak', symbol: '🎪', effect: 'Auspicious', color: '#51cf66' },
  { name: 'Pushya', symbol: '🌟', effect: 'Very Auspicious', color: '#ffd700' },
];

/**
 * Karana (half lunar day - 11.25 degrees)
 * There are 60 Karanas in a lunar month
 */
const KARANAS = [
  { name: 'Kimbhava', symbol: '🌀' },
  { name: 'Taviyah', symbol: '🌪️' },
  { name: 'Bava', symbol: '💨' },
  { name: 'Balava', symbol: '💪' },
  { name: 'Kaulava', symbol: '🦅' },
  { name: 'Taitila', symbol: '🌾' },
  { name: 'Gajajihvika', symbol: '🐘' },
  { name: 'Dhvajajihvika', symbol: '🚩' },
  { name: 'Vyaghajihvika', symbol: '🐯' },
  { name: 'Harajihvika', symbol: '🦌' },
];

/**
 * Rashis (Zodiac signs)
 */
const RASHIS = [
  { name: 'Aries', symbol: '♈', element: 'Fire', ruler: 'Mars' },
  { name: 'Taurus', symbol: '♉', element: 'Earth', ruler: 'Venus' },
  { name: 'Gemini', symbol: '♊', element: 'Air', ruler: 'Mercury' },
  { name: 'Cancer', symbol: '♋', element: 'Water', ruler: 'Moon' },
  { name: 'Leo', symbol: '♌', element: 'Fire', ruler: 'Sun' },
  { name: 'Virgo', symbol: '♍', element: 'Earth', ruler: 'Mercury' },
  { name: 'Libra', symbol: '♎', element: 'Air', ruler: 'Venus' },
  { name: 'Scorpio', symbol: '♏', element: 'Water', ruler: 'Mars' },
  { name: 'Sagittarius', symbol: '♐', element: 'Fire', ruler: 'Jupiter' },
  { name: 'Capricorn', symbol: '♑', element: 'Earth', ruler: 'Saturn' },
  { name: 'Aquarius', symbol: '♒', element: 'Air', ruler: 'Saturn' },
  { name: 'Pisces', symbol: '♓', element: 'Water', ruler: 'Jupiter' },
];

interface PanchangData {
  date: string;
  location: { latitude: number; longitude: number; name: string };
  timezone: number;
  
  // Tithi & Paksha
  tithi: number;
  tithiName: string;
  paksha: string;
  
  // Sunrise & Sunset
  sunriseTime: string;
  sunsetTime: string;
  
  // Nakshatra
  nakshatra: { name: string; symbol: string; symbol_text: string };
  
  // Yoga
  yoga: { name: string; symbol: string; effect: string; isBadDay: boolean; color: string };
  
  // Karana
  karana: { name: string; symbol: string };
  
  // Rashi (Moon sign)
  moonRashi: { name: string; symbol: string; element: string; ruler: string };
  sunRashi: { name: string; symbol: string; element: string; ruler: string };
  
  // Vaidhriti & Vatiapat warning
  vaidhriti: { isPresent: boolean; time?: string; warning?: string };
  vatiapat: { isPresent: boolean; time?: string; warning?: string };
  
  // Overall day quality
  dayQuality: 'Auspicious' | 'Neutral' | 'Inauspicious';
  recommendation: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, latitude, longitude, locationName, timezone } = body;

    if (!date || latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: date, latitude, longitude' },
        { status: 400 }
      );
    }

    // Calculate Hindu calendar data
    const calendarData = await calculateHinduCalendar(date, latitude, longitude);
    
    if (!calendarData) {
      return NextResponse.json(
        { error: 'Failed to calculate calendar data' },
        { status: 500 }
      );
    }

    // Get timezone offset in hours
    const tzOffset = timezone || Math.round(longitude / 15);

    // Get Nakshatra (simulate with tithi-based calculation)
    const nakshatraIndex = (calendarData.tithi + Math.floor(Math.random() * 27)) % 27;
    const nakshatra = NAKSHATRAS[nakshatraIndex];

    // Get Yoga (simulate with tithi-based calculation)
    const yogaIndex = (calendarData.tithi * 2) % 27;
    const yoga = YOGAS[yogaIndex];
    const isBadDay = yoga.effect === 'Inauspicious' || yoga.effect === 'Inauspicious - Avoid New Work';

    // Get Karana
    const karanaIndex = (calendarData.tithi * 2) % 10;
    const karana = KARANAS[karanaIndex];

    // Get Moon Rashi (simulate based on tithi)
    const moonRashiIndex = Math.floor((calendarData.tithi - 1) / 2.5) % 12;
    const moonRashi = RASHIS[moonRashiIndex];

    // Get Sun Rashi (based on date - roughly 1 month per rashi)
    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    const sunRashiIndex = (month + 3) % 12; // Offset by 3 months (Aries starts in April in Indian calendar)
    const sunRashi = RASHIS[sunRashiIndex];

    // Check for Vaidhriti (27th Yoga - avoid new work)
    const hasVaidhriti = yoga.name === 'Vaidhriti';
    const vaidhriti = {
      isPresent: hasVaidhriti,
      time: hasVaidhriti ? '24 hours' : undefined,
      warning: hasVaidhriti ? '⚠️ Vaidhriti Yoga: Avoid starting new ventures, auspicious for yoga & meditation only' : undefined,
    };

    // Check for Vatiapat (Kritika Nakshatra on certain days - avoid travel)
    const hasVatiapat = nakshatra.name === 'Kritika' && calendarData.paksha === 'Krishna Paksha';
    const vatiapat = {
      isPresent: hasVatiapat,
      time: hasVatiapat ? calendarData.sunriseTime : undefined,
      warning: hasVatiapat ? '⚠️ Vatiapat: Avoid long journeys, maintain inner peace' : undefined,
    };

    // Determine day quality and recommendation
    let dayQuality: 'Auspicious' | 'Neutral' | 'Inauspicious' = 'Neutral';
    let recommendation = 'Good day for regular activities';

    if (isBadDay || hasVaidhriti || hasVatiapat) {
      dayQuality = 'Inauspicious';
      recommendation = '❌ Avoid: Starting new projects, business dealings, long journeys | ✅ Good for: Meditation, prayer, inner work';
    } else if (yoga.effect === 'Very Auspicious') {
      dayQuality = 'Auspicious';
      recommendation = '✅ Excellent day for: New beginnings, important decisions, ceremonies, spiritual work';
    } else if (yoga.effect === 'Auspicious') {
      dayQuality = 'Auspicious';
      recommendation = '✅ Good day for: Business, meetings, travel, general activities';
    }

    const panchangData: PanchangData = {
      date,
      location: { latitude, longitude, name: locationName || `${latitude}, ${longitude}` },
      timezone: tzOffset,
      
      tithi: calendarData.tithi,
      tithiName: calendarData.tithiName,
      paksha: calendarData.paksha,
      
      sunriseTime: calendarData.sunriseTime12,
      sunsetTime: calculateSunsetTime(calendarData.sunriseTime12), // Approximate
      
      nakshatra,
      yoga: { ...yoga, isBadDay, color: yoga.color || '#999' },
      karana,
      
      moonRashi,
      sunRashi,
      
      vaidhriti,
      vatiapat,
      
      dayQuality,
      recommendation,
    };

    return NextResponse.json(
      { success: true, data: panchangData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Panchang calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate Panchang details' },
      { status: 500 }
    );
  }
}

/**
 * Approximate sunset time (roughly 12 hours after sunrise)
 */
function calculateSunsetTime(sunriseTime: string): string {
  const [hours, minutes] = sunriseTime.split(':').map(Number);
  let sunsetHours = hours + 12;
  let sunsetMinutes = minutes;
  
  if (sunsetHours >= 24) {
    sunsetHours -= 24;
  }
  
  return `${String(sunsetHours).padStart(2, '0')}:${String(sunsetMinutes).padStart(2, '0')}`;
}
