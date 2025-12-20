import { NextRequest, NextResponse } from 'next/server';

// IMPORTANT:
// We intentionally keep this API route free of native dependencies.
// The @bidyashish/panchang package depends on a native swisseph addon which may not bundle cleanly.
// So we use our in-repo (client-safe) approximation logic as the server source of truth for now.
import { calculateTithiAccurate } from '@/lib/calendarCalculations';

interface HinduCalendarDate {
  date: string;
  day: string;
  tithi: string;
  paksha: 'Shukla Paksha' | 'Krishna Paksha';
  nakshatra: string;
  yoga: string;
  karana: string;
  rahuKalam: {
    start: string;
    end: string;
  };
  auspiciousTime: boolean;
  festivals: string[];
}

// Hindu Tithi names
const tithiNames = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya'
];

// Nakshatra names
const nakshatraNames = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashirsha',
  'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha',
  'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati',
  'Visakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati'
];

// Yoga names
const yogaNames = [
  'Vishkambha', 'Preeti', 'Ayushman', 'Saubhagya', 'Shobhana',
  'Atiganda', 'Sukarma', 'Dhriti', 'Shula', 'Ganda',
  'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma',
  'Indra', 'Vaidhriti'
];

// Major Hindu festivals by date
const festivals: Record<string, string[]> = {
  '1-26': ['Republic Day'],
  '3-8': ['Maha Shivaratri'],
  '3-29': ['Holi - Festival of Colors'],
  '4-14': ['Baisakhi'],
  '4-17': ['Ram Navami'],
  '5-23': ['Buddha Purnima'],
  '8-15': ['Independence Day'],
  '8-31': ['Janmashtami'],
  '9-29': ['Ganesh Chaturthi'],
  '10-2': ['Gandhi Jayanti'],
  '10-12': ['Dussehra'],
  '10-30': ['Diwali'],
  '11-1': ['Diwali (continued)'],
  '12-25': ['Christmas']
};

const DEFAULT_LATITUDE = 28.7041;
const DEFAULT_LONGITUDE = 77.1025;
const DEFAULT_TIMEZONE = 5.5;

const parseNumericParam = (value: string | number | null | undefined, fallback: number): number => {
  if (value === undefined || value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Calculate Hindu calendar values based on Gregorian date
function getHinduCalendarData(date: Date): HinduCalendarDate {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

  // Use improved moon-phase based approximation from our calendar module.
  // This is significantly more accurate than the previous day-of-year modulo logic.
  const tithiData = calculateTithiAccurate(date);
  const paksha: 'Shukla Paksha' | 'Krishna Paksha' = tithiData.paksha;
  const tithiIndex = Math.max(1, Math.min(15, tithiData.tithi1to15)) - 1;
  
  // Simplified Nakshatra calculation (lunar mansion)
  const nakshatraIndex = Math.floor((dayOfYear * 0.985) % 27);
  
  // Simplified Yoga calculation
  const yogaIndex = Math.floor((dayOfYear * 0.985) % 27);
  
  // Calculate Rahu Kalam (approximately 1.5 hour period unlucky for new work)
  const dayOfWeek = date.getDay();
  const rahuStart = ['4:30 AM', '7:30 AM', '6:00 AM', '4:30 AM', '3:00 AM', '1:30 PM', '12:00 PM'][dayOfWeek];
  const rahuEnd = ['5:30 AM', '8:30 AM', '7:00 AM', '5:30 AM', '4:00 AM', '2:30 PM', '1:00 PM'][dayOfWeek];
  
  // Check for auspicious time (morning, Brahmi Muhurta: 4:24-5:12 AM)
  const hour = date.getHours();
  const auspiciousTime = (hour >= 4 && hour < 6) || (hour >= 17 && hour < 19);
  
  // Get festivals for this date
  const monthDay = `${date.getMonth() + 1}-${date.getDate()}`;
  const festivalsList = festivals[monthDay] || [];
  
  return {
    date: date.toISOString().split('T')[0],
    day: date.toLocaleDateString('en-US', { weekday: 'long' }),
    // Prefer calculated tithi name if available from accurate algo
    tithi: tithiData.tithiName || tithiNames[tithiIndex],
    paksha,
    nakshatra: nakshatraNames[nakshatraIndex],
    yoga: yogaNames[yogaIndex],
    karana: `Karana ${Math.floor((dayOfYear * 0.985) % 60)}`,
    rahuKalam: {
      start: rahuStart,
      end: rahuEnd
    },
    auspiciousTime: auspiciousTime,
    festivals: festivalsList
  };
}

// Call external Hindu Calendar API if API key is provided
async function fetchFromExternalAPI(
  date: Date,
  latitude: number,
  longitude: number,
  timezone: number
): Promise<HinduCalendarDate | null> {
  const apiKey = process.env.HINDU_CALENDAR_API_KEY;
  const apiUrl = process.env.HINDU_CALENDAR_API_URL;
  
  if (!apiKey || !apiUrl) {
    console.log('Hindu Calendar API key not configured, using local calculation');
    return null;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Skipping Hindu Calendar API fetch in non-production environment');
    return null;
  }
  
  try {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
    
    const response = await fetch(
      `${apiUrl}?day=${day}&month=${month}&year=${year}&latitude=${latitude}&longitude=${longitude}&timezone=${timezone}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    if (!response.ok) {
      console.error('Hindu Calendar API error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    
    // Map API response to our format
    if (data.result) {
      return {
        date: date.toISOString().split('T')[0],
        day: date.toLocaleDateString('en-US', { weekday: 'long' }),
        tithi: data.result.tithi?.name || 'Unknown',
        paksha: (data.result.tithi?.paksha?.includes('Krishna') ? 'Krishna Paksha' : 'Shukla Paksha'),
        nakshatra: data.result.nakshatra?.name || 'Unknown',
        yoga: data.result.yoga?.name || 'Unknown',
        karana: data.result.karana?.name || 'Unknown',
        rahuKalam: {
          start: data.result.rahu_kalam?.start || '12:00 AM',
          end: data.result.rahu_kalam?.end || '12:00 AM'
        },
        auspiciousTime: data.result.auspicious || false,
        festivals: data.result.festivals || []
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching from external Hindu Calendar API:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');
    
    let targetDate: Date;
    
    if (dateParam) {
      targetDate = new Date(dateParam);
      if (isNaN(targetDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
    } else {
      targetDate = new Date();
    }

    const latitude = parseNumericParam(searchParams.get('lat'), DEFAULT_LATITUDE);
    const longitude = parseNumericParam(searchParams.get('lng'), DEFAULT_LONGITUDE);
    const timezone = parseNumericParam(searchParams.get('timezone'), DEFAULT_TIMEZONE);
    
    // Try to fetch from external API first
    let hinduCalendarData = await fetchFromExternalAPI(targetDate, latitude, longitude, timezone);
    
    // Fallback to local calculation if API not available
    if (!hinduCalendarData) {
      hinduCalendarData = getHinduCalendarData(targetDate);
    }
    
    return NextResponse.json(
      {
        success: true,
        data: hinduCalendarData,
        // Back-compat for older client parsing (expects top-level fields)
        ...hinduCalendarData,
        // Also provide a nested tithi object for clearer parsing
        tithi: {
          name: hinduCalendarData.tithi,
          paksha: hinduCalendarData.paksha
        },
        message: 'Hindu calendar data retrieved successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hindu calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Hindu calendar data' },
      { status: 500 }
    );
  }
}

// POST endpoint to get multiple dates
export async function POST(request: NextRequest) {
  try {
  const body = await request.json();
  const { startDate, endDate } = body;
  const latitude = parseNumericParam(body.latitude, DEFAULT_LATITUDE);
  const longitude = parseNumericParam(body.longitude, DEFAULT_LONGITUDE);
  const timezone = parseNumericParam(body.timezone, DEFAULT_TIMEZONE);
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    
    const results: Array<unknown> = [];
    const current = new Date(start);
    
    while (current <= end) {
      // Try external API first, fallback to local
      let calendarData = await fetchFromExternalAPI(new Date(current), latitude, longitude, timezone);
      if (!calendarData) {
        calendarData = getHinduCalendarData(new Date(current));
      }
      results.push(calendarData);
      current.setDate(current.getDate() + 1);
    }
    
    return NextResponse.json(
      {
        success: true,
        data: results,
        totalDays: results.length,
        message: `Hindu calendar data for ${results.length} days retrieved successfully`
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Hindu calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Hindu calendar data' },
      { status: 500 }
    );
  }
}
