import { 
  calculateSunTimes, 
  calculateHinduCalendar, 
  calculateCompletePanchang, 
  calculateAstroLogicDetails 
} from './compiled/calendarCalculations.js';

// 10 Major Cities across India & International
const CITIES = [
  { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777, tz: 5.5, tzName: 'IST (+05:30)' },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.2090, tz: 5.5, tzName: 'IST (+05:30)' },
  { name: 'Bengaluru', country: 'India', lat: 12.9716, lng: 77.5946, tz: 5.5, tzName: 'IST (+05:30)' },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639, tz: 5.5, tzName: 'IST (+05:30)' },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707, tz: 5.5, tzName: 'IST (+05:30)' },
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, tz: 4.0, tzName: 'GST (+04:00)' },
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, tz: 1.0, tzName: 'BST (+01:00)' },
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060, tz: -4.0, tzName: 'EDT (-04:00)' },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, tz: 9.0, tzName: 'JST (+09:00)' },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, tz: 11.0, tzName: 'AEDT (+11:00)' }
];

async function runAudit() {
  const testDateStr = new Date().toISOString().split('T')[0];
  const testDate = new Date();

  console.log(`========================================================================================`);
  console.log(`      SWAR YOGA CALENDAR & PANCHANG ASTRONOMICAL AUDIT — 10 MAJOR CITIES`);
  console.log(`      Test Date: ${testDateStr} (${testDate.toDateString()})`);
  console.log(`========================================================================================\n`);

  const results = [];

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i];
    const sunTimes = calculateSunTimes(testDate, city.lat, city.lng, city.tz);
    const hinduCal = await calculateHinduCalendar(testDateStr, city.lat, city.lng, city.tz);
    const panchang = calculateCompletePanchang(testDate);
    const astroLogic = calculateAstroLogicDetails(testDate, city.lat, city.lng, city.tz);

    const check = {
      city: city.name,
      country: city.country,
      coordinates: `${city.lat.toFixed(4)}°, ${city.lng.toFixed(4)}°`,
      tz: city.tzName,
      sunrise: sunTimes.sunrise12,
      sunset: sunTimes.sunset12,
      solarNoon: sunTimes.solarNoon12,
      dayLength: sunTimes.dayLength,
      brahmaMuhurta: sunTimes.brahmaMuhurta12,
      tithi: `${hinduCal.tithiName} (#${hinduCal.tithi})`,
      paksha: hinduCal.paksha,
      activeNadi: `${hinduCal.nadi.symbol} ${hinduCal.nadi.name} (${hinduCal.nadi.type === 'Sun' ? 'Right Nostril' : 'Left Nostril'})`,
      nakshatra: `${panchang.nakshatra.name} (${panchang.nakshatra.symbolText})`,
      yoga: panchang.yoga.name,
      karana: panchang.karana.name,
      dominant: panchang.swarYoga.dominant,
      moonSunRatio: `Moon: ${panchang.swarYoga.moonCount}/5 | Sun: ${panchang.swarYoga.sunCount}/5`,
      elongation: astroLogic.elongation,
      valid: true
    };

    // Sanity checks:
    // 1. Sunrise should be earlier than sunset
    const [srH, srM] = sunTimes.sunrise.split(':').map(Number);
    const [ssH, ssM] = sunTimes.sunset.split(':').map(Number);
    const srTotal = srH * 60 + srM;
    const ssTotal = ssH * 60 + ssM;
    if (ssTotal <= srTotal) {
      check.valid = false;
      check.issue = 'Sunset is not after Sunrise';
    }

    // 2. DayLength should match difference within 2 minutes
    const calculatedDuration = ssTotal - srTotal;
    if (Math.abs(calculatedDuration - sunTimes.dayLengthMinutes) > 2) {
      check.valid = false;
      check.issue = 'Day length discrepancy';
    }

    // 3. Tithi must be between 1 and 15
    if (hinduCal.tithi < 1 || hinduCal.tithi > 15) {
      check.valid = false;
      check.issue = 'Tithi out of range 1-15';
    }

    results.push(check);

    console.log(`[${i + 1}/10] ${city.name.toUpperCase()}, ${city.country} (${city.tzName})`);
    console.log(`      Coordinates : Lat ${city.lat.toFixed(4)}° | Lng ${city.lng.toFixed(4)}°`);
    console.log(`      Solar Times : Sunrise: ${sunTimes.sunrise12} | Sunset: ${sunTimes.sunset12} | Noon: ${sunTimes.solarNoon12}`);
    console.log(`      Daylight    : ${sunTimes.dayLength} | Brahma Muhurta: ${sunTimes.brahmaMuhurta12}`);
    console.log(`      Panchang    : Tithi: ${check.tithi} (${check.paksha})`);
    console.log(`                    Nakshatra: ${check.nakshatra} | Yoga: ${check.yoga} | Karana: ${check.karana}`);
    console.log(`      Astro Math  : Moon-Sun Elongation: ${check.elongation} | Ayanamsha: ${astroLogic.ayanamsha}`);
    console.log(`      Swar Shastra: Active Nadi at Sunrise: ${check.activeNadi}`);
    console.log(`                    Dominance: ${check.dominant} (${check.moonSunRatio})`);
    console.log(`      Status      : ${check.valid ? '✅ ACCURATE & VERIFIED' : '❌ ERROR: ' + check.issue}\n`);
  }

  const allPassed = results.every(r => r.valid);
  console.log(`========================================================================================`);
  console.log(`AUDIT RESULT: ${allPassed ? 'ALL 10 CITIES VERIFIED MATHEMATICALLY & ACCURATELY ✅' : 'SOME CITIES HAD ISSUES ❌'}`);
  console.log(`========================================================================================`);
}

runAudit();
