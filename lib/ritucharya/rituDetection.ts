/**
 * Ritu Detection Engine
 * Based on the classical Ayurvedic Ritu Chakra chart
 * आयुर्वेदिक ऋतु चक्र — Complete Temperature Based (10° Logic)
 *
 * 6 Ritus × 3 Phases = 18 precise data points
 * Detection uses: Temp (40%) + Humidity (25%) + Wind (20%) + Sky (15%)
 * Humidity has extra tolerance (±15%) because coastal areas are always higher,
 * desert areas always lower — temperature is the most reliable anchor.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type RituKey = 'shishir' | 'vasant' | 'grishma' | 'varsha' | 'sharad' | 'hemant';
export type PhaseKey = 'begin' | 'peak' | 'last';
export type AyanaKey = 'uttarayan' | 'dakshinayan';

export interface WeatherInput {
  temp: number;        // °C — current temperature
  tempMin: number;     // °C — today's minimum
  tempMax: number;     // °C — today's maximum
  humidity: number;    // % — relative humidity
  windSpeed: number;   // km/h — air flow
  aqi: number;         // Air Quality Index
  description: string; // 'Clear sky' | 'Partly cloudy' | 'Rainy' | etc.
  rain: boolean;       // Is it raining right now?
}

export interface RituPhaseData {
  id: string;
  ritu: RituKey;
  phase: PhaseKey;
  ayana: AyanaKey;
  dateStart: string;   // 'MM-DD'
  dateEnd:   string;   // 'MM-DD'
  temp:     { min: number; max: number };
  humidity: { min: number; max: number };
  airFlow:  { min: number; max: number }; // km/h
  cloud:    string[];  // sky conditions that match
  characterHi: string; // Hindi description
  characterEn: string; // English description
  dosha: string;       // dominant dosha effect
  agni: string;        // digestive fire state
}

export interface DetectionResult {
  phase:       RituPhaseData;
  score:       number;        // 0–100
  confidence:  'high' | 'medium' | 'low';
  tempScore:   number;
  humidScore:  number;
  windScore:   number;
  cloudScore:  number;
  allScores:   { id: string; ritu: RituKey; phase: PhaseKey; score: number }[];
}

// ─── Complete 18-Phase Reference Data (from the chart) ───────────────────────

export const RITU_PHASES: RituPhaseData[] = [

  // ══════════════════════════════════════════════════════
  // शीत / SHISHIRA — उत्तरायण (Uttarayan)
  // ══════════════════════════════════════════════════════
  {
    id: 'shishira_begin',
    ritu: 'shishir', phase: 'begin', ayana: 'uttarayan',
    dateStart: '12-21', dateEnd: '01-10',
    temp:     { min: -20, max: -10 },
    humidity: { min: 20,  max: 25  },
    airFlow:  { min: 15,  max: 25  },
    cloud:    ['Clear'],
    characterHi: 'गहन ठंड शुरू, कफ+वात बढ़ रहा',
    characterEn: 'Deep cold begins, Kapha + Vata rising',
    dosha: 'Kapha + Vata increasing',
    agni: 'Strong — body generates internal heat',
  },
  {
    id: 'shishira_peak',
    ritu: 'shishir', phase: 'peak', ayana: 'uttarayan',
    dateStart: '01-11', dateEnd: '02-05',
    temp:     { min: -10, max: 0   },
    humidity: { min: 15,  max: 20  },
    airFlow:  { min: 15,  max: 20  },
    cloud:    ['Clear'],
    characterHi: 'सर्वाधिक ठंड, पाचन तीव्र',
    characterEn: 'Peak cold, digestion intense',
    dosha: 'Kapha + Vata at peak',
    agni: 'Very Strong — eat heavy nourishing food',
  },
  {
    id: 'shishira_last',
    ritu: 'shishir', phase: 'last', ayana: 'uttarayan',
    dateStart: '02-06', dateEnd: '02-20',
    temp:     { min: 0,   max: 10  },
    humidity: { min: 20,  max: 30  },
    airFlow:  { min: 15,  max: 25  },
    cloud:    ['P.Cloudy', 'Partly cloudy'],
    characterHi: 'ठंड घट रही, गर्मी शुरू',
    characterEn: 'Cold reducing, warmth beginning',
    dosha: 'Kapha decreasing, Pitta starting',
    agni: 'Strong',
  },

  // ══════════════════════════════════════════════════════
  // वसंत / VASANT — उत्तरायण (Uttarayan)
  // ══════════════════════════════════════════════════════
  {
    id: 'vasant_begin',
    ritu: 'vasant', phase: 'begin', ayana: 'uttarayan',
    dateStart: '02-21', dateEnd: '03-20',
    temp:     { min: 10,  max: 20  },
    humidity: { min: 30,  max: 40  },
    airFlow:  { min: 15,  max: 25  },
    cloud:    ['P.Cloudy', 'Partly cloudy'],
    characterHi: 'वसंत शुरू, कफ उत्तेजना',
    characterEn: 'Spring begins, Kapha gets excited',
    dosha: 'Kapha excited (liquefying)',
    agni: 'Moderate — reduce heavy foods',
  },
  {
    id: 'vasant_peak',
    ritu: 'vasant', phase: 'peak', ayana: 'uttarayan',
    dateStart: '03-21', dateEnd: '04-10',
    temp:     { min: 20,  max: 30  },
    humidity: { min: 35,  max: 50  },
    airFlow:  { min: 15,  max: 30  },
    cloud:    ['Cloudy', 'Mostly cloudy'],
    characterHi: 'कफ शिखर, एलर्जी अधिक',
    characterEn: 'Kapha peak, allergies high',
    dosha: 'Kapha at peak — heaviness, lethargy',
    agni: 'Low-Moderate — eat light, pungent, bitter',
  },
  {
    id: 'vasant_last',
    ritu: 'vasant', phase: 'last', ayana: 'uttarayan',
    dateStart: '04-11', dateEnd: '04-20',
    temp:     { min: 25,  max: 35  },
    humidity: { min: 40,  max: 55  },
    airFlow:  { min: 20,  max: 35  },
    cloud:    ['P.Cloudy', 'Partly cloudy'],
    characterHi: 'वसंत अंत, पित्त शुरू',
    characterEn: 'Spring ending, Pitta beginning',
    dosha: 'Kapha reducing, Pitta starting',
    agni: 'Moderate-improving',
  },

  // ══════════════════════════════════════════════════════
  // ग्रीष्म / GRISHMA — उत्तरायण (Uttarayan)
  // ══════════════════════════════════════════════════════
  {
    id: 'grishma_begin',
    ritu: 'grishma', phase: 'begin', ayana: 'uttarayan',
    dateStart: '04-21', dateEnd: '05-10',
    temp:     { min: 30,  max: 40  },
    humidity: { min: 40,  max: 55  },
    airFlow:  { min: 25,  max: 40  },
    cloud:    ['Clear', 'Hazy', 'Clear/Hazy'],
    characterHi: 'तीव्र गर्मी शुरू (सूख)',
    characterEn: 'Intense heat begins (dry)',
    dosha: 'Pitta rising, body dehydrating',
    agni: 'Weak — avoid heavy food, drink water',
  },
  {
    id: 'grishma_peak',
    ritu: 'grishma', phase: 'peak', ayana: 'uttarayan',
    dateStart: '05-11', dateEnd: '06-05',
    temp:     { min: 35,  max: 45  },
    humidity: { min: 45,  max: 65  },
    airFlow:  { min: 30,  max: 45  },
    cloud:    ['Hazy', 'Hazy/Humid'],
    characterHi: 'अति गर्मी + आर्द्रता बढ़',
    characterEn: 'Extreme heat + humidity rising',
    dosha: 'Pitta at peak + Vata accumulating',
    agni: 'Very Weak — only light sweet cool foods',
  },
  {
    id: 'grishma_last',
    ritu: 'grishma', phase: 'last', ayana: 'uttarayan',
    dateStart: '06-06', dateEnd: '06-20',
    temp:     { min: 32,  max: 42  },
    humidity: { min: 55,  max: 70  },
    airFlow:  { min: 35,  max: 50  },
    cloud:    ['Cloud form', 'Mostly cloudy'],
    characterHi: 'ग्रीष्म अंत, वर्षा आने वाली',
    characterEn: 'Summer ending, monsoon approaching',
    dosha: 'Pitta high, pre-monsoon Vata',
    agni: 'Very Weak — clouds forming, body confused',
  },

  // ══════════════════════════════════════════════════════
  // वर्षा / VARSHA — दक्षिणायन (Dakshinayan)
  // ══════════════════════════════════════════════════════
  {
    id: 'varsha_begin',
    ritu: 'varsha', phase: 'begin', ayana: 'dakshinayan',
    dateStart: '06-21', dateEnd: '07-10',
    temp:     { min: 28,  max: 35  },
    humidity: { min: 65,  max: 75  },
    airFlow:  { min: 40,  max: 50  },
    cloud:    ['Heavy clouds', 'Overcast'],
    characterHi: 'वर्षा शुरू, वात उत्तेजना',
    characterEn: 'Monsoon starts, Vata excited',
    dosha: 'Vata excited, Pitta suppressed',
    agni: 'Very Weak — digestive fire dampened by rain',
  },
  {
    id: 'varsha_peak',
    ritu: 'varsha', phase: 'peak', ayana: 'dakshinayan',
    dateStart: '07-11', dateEnd: '08-05',
    temp:     { min: 24,  max: 28  },
    humidity: { min: 70,  max: 85  },
    airFlow:  { min: 45,  max: 60  },
    cloud:    ['V.Heavy clouds', 'Heavy rain', 'Thunderstorm'],
    characterHi: 'वर्षा शिखर, वात अधिक',
    characterEn: 'Peak monsoon, Vata very high',
    dosha: 'Vata at peak — pain, bloating, gas',
    agni: 'Weakest — eat only warm light fresh food',
  },
  {
    id: 'varsha_last',
    ritu: 'varsha', phase: 'last', ayana: 'dakshinayan',
    dateStart: '08-06', dateEnd: '08-20',
    temp:     { min: 20,  max: 24  },
    humidity: { min: 60,  max: 75  },
    airFlow:  { min: 35,  max: 45  },
    cloud:    ['Heavy clouds', 'Overcast'],
    characterHi: 'वर्षा अंत, शरद शुरू',
    characterEn: 'Monsoon ending, Sharad approaching',
    dosha: 'Vata reducing, Pitta starting to rise',
    agni: 'Very Weak to Weak — slowly improving',
  },

  // ══════════════════════════════════════════════════════
  // शरद / SHARAD — दक्षिणायन (Dakshinayan)
  // ══════════════════════════════════════════════════════
  {
    id: 'sharad_begin',
    ritu: 'sharad', phase: 'begin', ayana: 'dakshinayan',
    dateStart: '08-21', dateEnd: '09-10',
    temp:     { min: 20,  max: 26  },
    humidity: { min: 55,  max: 65  },
    airFlow:  { min: 25,  max: 35  },
    cloud:    ['Clearing', 'Partly cloudy'],
    characterHi: 'शरद शुरू, साफ आसमान',
    characterEn: 'Sharad begins, sky clearing',
    dosha: 'Pitta rising — heat from inside',
    agni: 'Moderate and improving',
  },
  {
    id: 'sharad_peak',
    ritu: 'sharad', phase: 'peak', ayana: 'dakshinayan',
    dateStart: '09-11', dateEnd: '10-05',
    temp:     { min: 26,  max: 32  },
    humidity: { min: 45,  max: 55  },
    airFlow:  { min: 15,  max: 30  },
    cloud:    ['Clear'],
    characterHi: 'शरद शिखर — BEST HEALTH',
    characterEn: 'Sharad peak — BEST HEALTH season',
    dosha: 'Pitta peak — hot inside, cool outside',
    agni: 'Moderate — best season for balanced diet',
  },
  {
    id: 'sharad_last',
    ritu: 'sharad', phase: 'last', ayana: 'dakshinayan',
    dateStart: '10-06', dateEnd: '10-20',
    temp:     { min: 24,  max: 30  },
    humidity: { min: 40,  max: 50  },
    airFlow:  { min: 15,  max: 25  },
    cloud:    ['Clear'],
    characterHi: 'शरद अंत, ठंड आने वाली',
    characterEn: 'Sharad ending, cold approaching',
    dosha: 'Pitta decreasing, Kapha beginning',
    agni: 'Moderate-Strong — digestion improving',
  },

  // ══════════════════════════════════════════════════════
  // हेमंत / HEMANT — दक्षिणायन (Dakshinayan)
  // ══════════════════════════════════════════════════════
  {
    id: 'hemant_begin',
    ritu: 'hemant', phase: 'begin', ayana: 'dakshinayan',
    dateStart: '10-21', dateEnd: '11-10',
    temp:     { min: 12,  max: 24  },
    humidity: { min: 30,  max: 40  },
    airFlow:  { min: 15,  max: 25  },
    cloud:    ['P.Cloudy', 'Partly cloudy'],
    characterHi: 'हेमंत शुरू, कफ शुरू',
    characterEn: 'Hemant begins, Kapha building',
    dosha: 'Kapha accumulating slowly',
    agni: 'Strong — eat well, body building reserves',
  },
  {
    id: 'hemant_peak',
    ritu: 'hemant', phase: 'peak', ayana: 'dakshinayan',
    dateStart: '11-11', dateEnd: '12-05',
    temp:     { min: 2,   max: 12  },
    humidity: { min: 25,  max: 35  },
    airFlow:  { min: 15,  max: 20  },
    cloud:    ['Clear', 'Foggy', 'Clear/Foggy'],
    characterHi: 'हेमंत शिखर — गहन ठंड',
    characterEn: 'Hemant peak — deep cold',
    dosha: 'Kapha + Vata both high',
    agni: 'Very Strong — best time to eat heavy food',
  },
  {
    id: 'hemant_last',
    ritu: 'hemant', phase: 'last', ayana: 'dakshinayan',
    dateStart: '12-06', dateEnd: '12-20',
    temp:     { min: -8,  max: 2   },
    humidity: { min: 20,  max: 30  },
    airFlow:  { min: 10,  max: 20  },
    cloud:    ['Clear'],
    characterHi: 'हेमंत अंत, शीत शुरू',
    characterEn: 'Hemant ending, Shishira beginning',
    dosha: 'Kapha + Vata peak — transition',
    agni: 'Very Strong',
  },
];

// ─── Cloud / Sky Condition Mapping ───────────────────────────────────────────

/**
 * Maps Open-Meteo weather descriptions to our cloud categories.
 * Returns 0–15 score based on how well it matches the phase cloud list.
 */
function cloudScore(weatherDesc: string, phaseCloud: string[]): number {
  const d = weatherDesc.toLowerCase();

  // Map Open-Meteo / user descriptions → internal categories
  const descCategory =
    d.includes('thunder') || d.includes('storm')          ? 'thunderstorm' :
    d.includes('heavy rain') || d.includes('v.heavy')     ? 'heavy_rain' :
    d.includes('heavy cloud') || d.includes('overcast')   ? 'heavy_clouds' :
    d.includes('rain') || d.includes('drizzle')           ? 'rain' :
    d.includes('fog') || d.includes('mist')               ? 'foggy' :
    d.includes('hazy') || d.includes('haze')              ? 'hazy' :
    d.includes('clearing')                                 ? 'clearing' :
    d.includes('mostly cloudy') || d.includes('cloud form') ? 'mostly_cloudy' :
    d.includes('partly cloudy') || d.includes('p.cloudy') ? 'partly_cloudy' :
    d.includes('cloudy')                                   ? 'cloudy' :
    d.includes('clear') || d.includes('sunny')            ? 'clear' :
    'unknown';

  // Score matrix: how well each phase cloud category matches the detected desc
  const scoreMap: Record<string, Record<string, number>> = {
    clear:           { clear: 15, partly_cloudy: 8, hazy: 5, foggy: 5, cloudy: 2, mostly_cloudy: 1, heavy_clouds: 0, rain: 0, heavy_rain: 0, thunderstorm: 0, clearing: 8, unknown: 5 },
    'p.cloudy':      { partly_cloudy: 15, clear: 8, clearing: 10, cloudy: 8, hazy: 5, foggy: 3, mostly_cloudy: 5, heavy_clouds: 2, rain: 2, heavy_rain: 0, thunderstorm: 0, unknown: 5 },
    'partly cloudy': { partly_cloudy: 15, clear: 8, clearing: 10, cloudy: 8, hazy: 5, foggy: 3, mostly_cloudy: 5, heavy_clouds: 2, rain: 2, heavy_rain: 0, thunderstorm: 0, unknown: 5 },
    cloudy:          { cloudy: 15, mostly_cloudy: 12, partly_cloudy: 8, heavy_clouds: 8, rain: 5, clear: 2, hazy: 3, foggy: 3, heavy_rain: 3, thunderstorm: 3, clearing: 5, unknown: 5 },
    hazy:            { hazy: 15, clear: 8, partly_cloudy: 5, cloudy: 5, foggy: 5, mostly_cloudy: 3, heavy_clouds: 2, rain: 0, heavy_rain: 0, thunderstorm: 0, clearing: 5, unknown: 5 },
    'hazy/humid':    { hazy: 15, cloudy: 8, mostly_cloudy: 8, partly_cloudy: 5, heavy_clouds: 5, clear: 3, foggy: 3, rain: 3, heavy_rain: 1, thunderstorm: 0, clearing: 3, unknown: 5 },
    'cloud form':    { mostly_cloudy: 15, cloudy: 12, heavy_clouds: 10, partly_cloudy: 5, rain: 5, hazy: 3, clear: 1, foggy: 2, heavy_rain: 3, thunderstorm: 3, clearing: 3, unknown: 5 },
    'heavy clouds':  { heavy_clouds: 15, mostly_cloudy: 12, rain: 10, heavy_rain: 10, thunderstorm: 8, cloudy: 8, clearing: 3, partly_cloudy: 2, hazy: 1, clear: 0, foggy: 2, unknown: 5 },
    'v.heavy clouds':{ heavy_rain: 15, thunderstorm: 15, heavy_clouds: 12, rain: 12, mostly_cloudy: 5, cloudy: 3, clearing: 0, partly_cloudy: 0, hazy: 0, clear: 0, foggy: 1, unknown: 3 },
    clearing:        { clearing: 15, partly_cloudy: 12, clear: 8, cloudy: 5, mostly_cloudy: 3, rain: 3, hazy: 3, foggy: 3, heavy_clouds: 1, heavy_rain: 0, thunderstorm: 0, unknown: 5 },
    foggy:           { foggy: 15, clear: 8, partly_cloudy: 5, hazy: 8, clearing: 5, cloudy: 3, mostly_cloudy: 2, heavy_clouds: 1, rain: 2, heavy_rain: 0, thunderstorm: 0, unknown: 5 },
    'clear/foggy':   { foggy: 15, clear: 15, partly_cloudy: 8, hazy: 8, clearing: 8, cloudy: 3, mostly_cloudy: 2, heavy_clouds: 0, rain: 0, heavy_rain: 0, thunderstorm: 0, unknown: 5 },
    overcast:        { heavy_clouds: 15, mostly_cloudy: 12, rain: 10, cloudy: 8, heavy_rain: 8, thunderstorm: 5, clearing: 2, partly_cloudy: 2, hazy: 1, clear: 0, foggy: 2, unknown: 5 },
  };

  let best = 5; // default partial score
  for (const pc of phaseCloud) {
    const row = scoreMap[pc.toLowerCase()];
    if (row) {
      const s = row[descCategory] ?? 5;
      if (s > best) best = s;
    }
  }
  return best;
}

// ─── Score a single parameter (0–maxPoints) ──────────────────────────────────

function rangeScore(value: number, min: number, max: number, maxPoints: number, tolerance: number): number {
  if (value >= min && value <= max) return maxPoints;
  const distance = value < min ? min - value : value - max;
  if (distance <= tolerance * 0.25) return Math.round(maxPoints * 0.75);
  if (distance <= tolerance * 0.5)  return Math.round(maxPoints * 0.50);
  if (distance <= tolerance)        return Math.round(maxPoints * 0.25);
  if (distance <= tolerance * 1.5)  return Math.round(maxPoints * 0.10);
  return 0;
}

// ─── Main Detection Function ──────────────────────────────────────────────────

export function detectRituPhase(weather: WeatherInput): DetectionResult {
  const allScores: { id: string; ritu: RituKey; phase: PhaseKey; score: number }[] = [];

  let bestPhase: RituPhaseData = RITU_PHASES[0];
  let bestTotal = -1;
  let bestBreakdown = { tempScore: 0, humidScore: 0, windScore: 0, cloudScore: 0 };

  for (const p of RITU_PHASES) {
    // ── 1. TEMPERATURE (40 points) ─────────────────────────────────────────
    // Most reliable anchor. Tolerance = 8°C (to handle global altitude/region differences)
    const tScore = rangeScore(weather.temp, p.temp.min, p.temp.max, 40, 8);

    // ── 2. HUMIDITY (25 points) ────────────────────────────────────────────
    // Less reliable — coastal areas always higher, deserts always lower.
    // Extra tolerance = 20% to handle location-based variance.
    const hScore = rangeScore(weather.humidity, p.humidity.min, p.humidity.max, 25, 20);

    // ── 3. AIR FLOW / WIND (20 points) ─────────────────────────────────────
    // Moderate reliability. Tolerance = 12 km/h
    const wScore = rangeScore(weather.windSpeed, p.airFlow.min, p.airFlow.max, 20, 12);

    // ── 4. CLOUD / SKY (15 points) ─────────────────────────────────────────
    const cScore = cloudScore(weather.description, p.cloud);

    // ── RAIN OVERRIDE ──────────────────────────────────────────────────────
    // Heavy rain always points to Varsha, no matter what other params say.
    // Light rain is handled by the cloud score naturally.
    let total = tScore + hScore + wScore + cScore;

    if (weather.rain) {
      const desc = weather.description.toLowerCase();
      const isHeavy = desc.includes('heavy') || desc.includes('thunder') || desc.includes('storm');
      const isMod   = desc.includes('rain') || desc.includes('drizzle');

      if (isHeavy && !p.ritu.includes('varsha') && p.id !== 'varsha_peak' && p.id !== 'varsha_begin') {
        total = Math.round(total * 0.3); // heavily penalise non-Varsha in heavy rain
      }
      if (isHeavy && (p.id === 'varsha_peak' || p.id === 'varsha_begin')) {
        total = Math.min(100, total + 25); // bonus for correct Varsha detection
      }
    }

    allScores.push({ id: p.id, ritu: p.ritu, phase: p.phase, score: total });

    if (total > bestTotal) {
      bestTotal = total;
      bestPhase = p;
      bestBreakdown = { tempScore: tScore, humidScore: hScore, windScore: wScore, cloudScore: cScore };
    }
  }

  // Sort all scores descending
  allScores.sort((a, b) => b.score - a.score);

  const confidence: DetectionResult['confidence'] =
    bestTotal >= 70 ? 'high' :
    bestTotal >= 45 ? 'medium' : 'low';

  return {
    phase:      bestPhase,
    score:      bestTotal,
    confidence,
    tempScore:  bestBreakdown.tempScore,
    humidScore: bestBreakdown.humidScore,
    windScore:  bestBreakdown.windScore,
    cloudScore: bestBreakdown.cloudScore,
    allScores,
  };
}

// ─── Helper: Get Ritu display name ───────────────────────────────────────────

export const RITU_META: Record<RituKey, { icon: string; nameEn: string; nameSanskrit: string; nameHi: string; color: string }> = {
  shishir: { icon: '❄️', nameEn: 'Shishira', nameSanskrit: 'शिशिर',  nameHi: 'शीत ऋतु',   color: '#60A5FA' },
  vasant:  { icon: '🌸', nameEn: 'Vasant',   nameSanskrit: 'वसंत',   nameHi: 'वसंत ऋतु',  color: '#34D399' },
  grishma: { icon: '☀️', nameEn: 'Grishma',  nameSanskrit: 'ग्रीष्म', nameHi: 'ग्रीष्म ऋतु', color: '#F97316' },
  varsha:  { icon: '🌧️', nameEn: 'Varsha',   nameSanskrit: 'वर्षा',  nameHi: 'वर्षा ऋतु',  color: '#818CF8' },
  sharad:  { icon: '🍂', nameEn: 'Sharad',   nameSanskrit: 'शरद',    nameHi: 'शरद ऋतु',   color: '#FBBF24' },
  hemant:  { icon: '🥶', nameEn: 'Hemant',   nameSanskrit: 'हेमंत',  nameHi: 'हेमंत ऋतु', color: '#A78BFA' },
};

export const PHASE_LABEL: Record<PhaseKey, { en: string; hi: string }> = {
  begin: { en: 'Beginning',  hi: 'प्रारंभ' },
  peak:  { en: 'Peak',       hi: 'शिखर'    },
  last:  { en: 'Transition', hi: 'अंत'     },
};

// ─── Hemisphere Adjustment ────────────────────────────────────────────────────

/**
 * For southern hemisphere — shift dates by 6 months.
 * For tropical — use only temperature + humidity (ignore month).
 */
export function getHemisphere(country: string): 'north' | 'south' | 'tropical' {
  const south = ['Australia', 'New Zealand', 'South Africa', 'Argentina', 'Chile', 'Brazil', 'Uruguay', 'Paraguay', 'Bolivia', 'Fiji'];
  const tropical = ['Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Kenya', 'Nigeria', 'Ghana', 'Philippines', 'Sri Lanka', 'Bangladesh', 'Colombia', 'Ecuador', 'Vietnam', 'Cambodia', 'Myanmar', 'Laos'];
  if (south.includes(country)) return 'south';
  if (tropical.includes(country)) return 'tropical';
  return 'north';
}
