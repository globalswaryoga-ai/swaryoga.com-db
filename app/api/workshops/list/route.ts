import { NextResponse } from 'next/server';

// Parse workshop data from environment variables
function parseWorkshopSchedules() {
  const schedules: Record<string, any> = {};

  // Get all environment variables that start with SWARYOGA_ or other workshop prefixes
  Object.entries(process.env).forEach(([key, value]) => {
    if (typeof value !== 'string') return;
    
    const isWorkshopKey = key.startsWith('SWARYOGA_') || 
                          key.startsWith('WEIGHTLOSS_') ||
                          key.startsWith('MEDITATION_') ||
                          key.startsWith('AMRUTAAHAR_') ||
                          key.startsWith('PREPREGNANCY_') ||
                          key.startsWith('SWYCHILDREN_') ||
                          key.startsWith('COMPLETEHEALTH_') ||
                          key.startsWith('BUSINESSSWY_') ||
                          key.startsWith('CORPORATESWY_') ||
                          key.startsWith('SELFAWARENESS_') ||
                          key.startsWith('HAPPYMARRIAGE_') ||
                          key.startsWith('GURUKULTRAINING_') ||
                          key.startsWith('SWYTEACHER_') ||
                          key.startsWith('NATUROPATHY_') ||
                          key.startsWith('ASTAVAKRA_');
    
    if (!isWorkshopKey) return;

    const parts = value.split('|');
    if (parts.length < 9) return;

    const [dates, endDate, days, time, slots, registrationCloseDate, mode, language, location, fees] = parts;
    const [startDate] = dates.split(' to ');

    // Map key to workshop ID and name (Connected to .env.workshop)
    const workshopMap: Record<string, { id: string; name: string }> = {
      'SWARYOGA_BASIC': { id: 'swar-yoga-basic', name: 'Swar Yoga Basic Workshop' },
      'SWARYOGA_LEVEL1': { id: 'swar-yoga-level-1', name: 'Swar Yoga Level-1 Workshop' },
      'SWARYOGA_LEVEL2': { id: 'swar-yoga-level-2', name: 'Swar Yoga Level-2 Workshop' },
      'SWARYOGA_YOUTH': { id: 'swar-yoga-youth', name: 'Swar Yoga Youth Program' },
      'ASTAVAKRA': { id: 'astavakra', name: 'Astavakra Dhyan Level-3' },
      'WEIGHTLOSS': { id: 'weight-loss', name: 'Weight Loss Program' },
      'MEDITATION': { id: 'meditation', name: 'Meditation Program' },
      'AMRUTAAHAR': { id: 'amrut-aahar', name: 'Amrut Aahar Program' },
      'PREPREGNANCY': { id: 'pre-pregnancy', name: 'Pre Pregnancy Program' },
      'SWYCHILDREN': { id: 'swy-children', name: 'Swar Yoga Children Program' },
      'COMPLETEHEALTH': { id: 'complete-health', name: 'Complete Health Program' },
      'BUSINESSSWY': { id: 'business-swy', name: 'Business Swar Yoga' },
      'CORPORATESWY': { id: 'corporate-swy', name: 'Corporate Swar Yoga Management' },
      'SELFAWARENESS': { id: 'self-awareness', name: 'Self Awareness Level-4' },
      'HAPPYMARRIAGE': { id: 'happy-marriage', name: 'Happy Married Life' },
      'GURUKULTRAINING': { id: 'gurukul-training', name: 'Gurukul Teacher Training' },
      'SWYTEACHER': { id: 'swy-teacher', name: 'Swar Yoga Teacher Training' },
      'NATUROPATHY': { id: 'naturopathy', name: 'Naturopathy Treatment Program' },
    };

    let workshopId = '';
    let workshopName = '';

    // Find matching workshop type
    for (const [prefix, info] of Object.entries(workshopMap)) {
      if (key.includes(prefix.replace(/_$/, ''))) {
        workshopId = info.id;
        workshopName = info.name;
        break;
      }
    }

    if (!workshopId) return;

    if (!schedules[workshopId]) {
      schedules[workshopId] = {
        id: workshopId,
        name: workshopName,
        schedules: [],
      };
    }

    schedules[workshopId].schedules.push({
      id: key.toLowerCase(),
      startDate: parseDate(startDate),
      endDate: parseDate(endDate),
      registrationCloseDate: parseDate(registrationCloseDate),
      time,
      mode: mode.toLowerCase(),
      language: language.trim(),
      location: location === 'N/A' ? null : location.trim(),
      slots: parseInt(slots),
      duration: days,
      price: parseInt(fees || '0'),
    });
  });

  return Object.values(schedules);
}

// Parse date string like "15-Jan" to ISO format
function parseDate(dateStr: string): string {
  const currentYear = new Date().getFullYear();
  const monthMap: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  const [day, month] = dateStr.trim().split('-');
  const monthIndex = monthMap[month];

  if (!day || monthIndex === undefined) {
    return ''; // Return empty string for invalid dates
  }

  const date = new Date(currentYear, monthIndex, parseInt(day));
  return date.toISOString().split('T')[0];
}

export async function GET() {
  try {
    const workshops = parseWorkshopSchedules();

    if (workshops.length === 0) {
      return NextResponse.json(
        { error: 'No workshops found in environment configuration' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: 'Workshops retrieved successfully',
        data: workshops,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching workshops:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workshops' },
      { status: 500 }
    );
  }
}
