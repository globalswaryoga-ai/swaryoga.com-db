'use client';

/**
 * Ritucharya — Smart Ayurvedic Seasonal Planner
 * crm/planner/ritucharya
 *
 * Step 1 → Location picker → auto-fetch weather
 * Step 2 → Ayurvedic analysis (Ritu + Dosha + Rasas) computed from weather + month
 * Step 3 → 30-day personalised meal & lifestyle plan
 */

import React, { useState, useEffect, useCallback } from 'react';
import { locationData } from '@/lib/locationData';
import {
  RITUS, RASAS, getCurrentRitu, KAALS,
  type RituKey, type HemisphereType,
} from '@/lib/ritucharya';
import { foodDatabase } from '@/lib/ritucharya/foodDatabase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherInput {
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  aqi: number;
  description: string;
}

interface DoshaProfile {
  vata: number;   // 0-100
  pitta: number;
  kapha: number;
  dominant: 'Vata' | 'Pitta' | 'Kapha';
  agni: 'Weak' | 'Moderate' | 'Strong' | 'Very Strong';
}

interface RasaPlan {
  sweet: number;
  sour: number;
  salty: number;
  pungent: number;
  bitter: number;
  astringent: number;
}

interface MealSlot {
  time: string;
  label: string;
  emoji: string;
  foods: string[];
  tip: string;
}

interface WeekPlan {
  week: number;
  title: string;
  focus: string;
  color: string;
  days: string;
  meals: MealSlot[];
  lifestyleTips: string[];
  herbs: string[];
  avoidFoods: string[];
}

// ─── Ayurvedic Logic Engine ───────────────────────────────────────────────────

function computeDoshaFromWeather(
  weather: WeatherInput,
  ritu: RituKey,
): DoshaProfile {
  const base = RITUS[ritu];

  // Base dosha from the Ritu
  let vata = 33;
  let pitta = 33;
  let kapha = 34;

  // Set Ritu base levels
  if (ritu === 'grishma')  { vata = 40; pitta = 50; kapha = 10; }
  if (ritu === 'varsha')   { vata = 55; pitta = 25; kapha = 20; }
  if (ritu === 'sharad')   { vata = 20; pitta = 60; kapha = 20; }
  if (ritu === 'hemant')   { vata = 20; pitta = 20; kapha = 60; }
  if (ritu === 'shishir')  { vata = 30; pitta = 15; kapha = 55; }
  if (ritu === 'vasant')   { vata = 20; pitta = 25; kapha = 55; }

  // Modify based on actual weather
  // High temp → increases Pitta
  if (weather.temp > 38)        { pitta += 15; vata += 5; kapha -= 10; }
  else if (weather.temp > 32)   { pitta += 8; kapha -= 5; }
  else if (weather.temp < 15)   { kapha += 15; vata += 10; pitta -= 10; }
  else if (weather.temp < 22)   { kapha += 8; pitta -= 5; }

  // High humidity → increases Kapha
  if (weather.humidity > 75)    { kapha += 20; vata -= 10; }
  else if (weather.humidity > 55) { kapha += 8; }
  else if (weather.humidity < 25) { vata += 15; kapha -= 8; pitta += 5; }
  else if (weather.humidity < 40) { vata += 8; }

  // High wind → increases Vata
  if (weather.windSpeed > 35)   { vata += 15; }
  else if (weather.windSpeed > 20) { vata += 8; }

  // Bad AQI → increases Kapha + Vata (respiratory)
  if (weather.aqi > 150)        { kapha += 10; vata += 5; }
  else if (weather.aqi > 100)   { kapha += 5; }

  // Normalise to sum = 100
  const total = vata + pitta + kapha;
  vata   = Math.round((vata / total) * 100);
  pitta  = Math.round((pitta / total) * 100);
  kapha  = 100 - vata - pitta;

  const dominant =
    vata > pitta && vata > kapha ? 'Vata' :
    pitta > kapha ? 'Pitta' : 'Kapha';

  // Agni strength based on Ritu + weather
  let agni: DoshaProfile['agni'] =
    ritu === 'hemant' ? 'Very Strong' :
    ritu === 'shishir' ? 'Strong' :
    ritu === 'vasant' || ritu === 'sharad' ? 'Moderate' :
    ritu === 'grishma' ? 'Weak' : 'Weak'; // varsha weakest

  // Adjust agni based on weather
  if (weather.humidity > 70 && agni === 'Moderate') agni = 'Weak';
  if (weather.temp > 38 && agni !== 'Weak') agni = 'Weak';
  if (weather.temp < 12 && agni === 'Moderate') agni = 'Strong';

  return { vata, pitta, kapha, dominant, agni };
}

function computeRasaPlan(ritu: RituKey, dosha: DoshaProfile): RasaPlan {
  const base = RITUS[ritu];

  // Start with Ritu recommendations
  const favour = base.favour;
  const avoid = base.avoid;

  let sweet = 0, sour = 0, salty = 0, pungent = 0, bitter = 0, astringent = 0;

  // Base allocation per Ritu
  if (ritu === 'shishir' || ritu === 'hemant') {
    sweet = 35; sour = 25; salty = 20; pungent = 5; bitter = 5; astringent = 10;
  } else if (ritu === 'vasant') {
    sweet = 10; sour = 5; salty = 5; pungent = 30; bitter = 30; astringent = 20;
  } else if (ritu === 'grishma') {
    sweet = 50; sour = 10; salty = 5; pungent = 5; bitter = 10; astringent = 20;
  } else if (ritu === 'varsha') {
    sweet = 30; sour = 25; salty = 20; pungent = 10; bitter = 5; astringent = 10;
  } else if (ritu === 'sharad') {
    sweet = 35; sour = 5; salty = 5; pungent = 5; bitter = 25; astringent = 25;
  }

  // Adjust based on dominant dosha
  if (dosha.dominant === 'Pitta') {
    sweet += 10; bitter += 5; astringent += 5; pungent -= 10; sour -= 5; salty -= 5;
  } else if (dosha.dominant === 'Vata') {
    sweet += 10; sour += 5; salty += 5; pungent -= 5; bitter -= 10; astringent -= 5;
  } else { // Kapha
    pungent += 10; bitter += 10; astringent += 5; sweet -= 15; sour -= 5; salty -= 5;
  }

  // Clamp all to 0–100 and normalise
  const clamp = (v: number) => Math.max(0, v);
  sweet = clamp(sweet); sour = clamp(sour); salty = clamp(salty);
  pungent = clamp(pungent); bitter = clamp(bitter); astringent = clamp(astringent);
  const total = sweet + sour + salty + pungent + bitter + astringent;
  const norm = (v: number) => Math.round((v / total) * 100);

  return {
    sweet: norm(sweet), sour: norm(sour), salty: norm(salty),
    pungent: norm(pungent), bitter: norm(bitter),
    astringent: 100 - norm(sweet) - norm(sour) - norm(salty) - norm(pungent) - norm(bitter),
  };
}

function getFoodsForSlot(
  category: string,
  ritu: RituKey,
  dosha: DoshaProfile,
  count = 5,
): string[] {
  const dominant = dosha.dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha';

  // Pool: foods matching the category
  const pool = foodDatabase.filter(
    f => f.category === category || (category === 'drink' && f.category === 'herbal')
  );

  // First try: foods that decrease or balance the dominant dosha
  const preferred = pool.filter(f => {
    const impact = f.doshaImpact[dominant];
    return impact === 'decrease' || impact === 'balance';
  });

  // Fallback: if preferred is empty, use all category foods (don't show blank)
  const result = preferred.length > 0 ? preferred : pool;

  return result.slice(0, count).map(f => `${f.nameHi} (${f.nameEn})`);
}

function build30DayPlan(ritu: RituKey, dosha: DoshaProfile, savedDiet?: any): WeekPlan[] {
  const rData = RITUS[ritu];
  const dominant = dosha.dominant;

  // Helper: get foods for a slot from saved MongoDB diet plan
  const getSavedFoods = (slotKey: string): string[] => {
    if (!savedDiet?.meals) return [];
    const slot = savedDiet.meals.find((m: any) => m.slotKey === slotKey);
    return Array.isArray(slot?.foods) && slot.foods.length > 0 ? slot.foods : [];
  };
  const getSavedTip = (slotKey: string): string => {
    if (!savedDiet?.meals) return '';
    const slot = savedDiet.meals.find((m: any) => m.slotKey === slotKey);
    return slot?.tip || '';
  };

  // Shared base meal structure — 7 time slots
  // Foods from MongoDB if admin saved them, otherwise fallback to generated foods
  const baseMeals: MealSlot[] = [
    {
      time: '4:00 AM',
      label: 'Gond Pani',
      emoji: '🌙',
      // Use admin-saved foods if available, else default
      foods: getSavedFoods('gond_pani').length > 0
        ? getSavedFoods('gond_pani')
        : ['Gond Pani (गोंद पानी)', 'Lukewarm water with honey', 'Warm lemon water'],
      tip: getSavedTip('gond_pani') || 'Wake up in Brahma Muhurta — first drink should be warm, never cold',
    },
    {
      time: '6:00 AM',
      label: 'Herbal Drink',
      emoji: '🌿',
      foods: getSavedFoods('herbal_drink').length > 0
        ? getSavedFoods('herbal_drink')
        : getFoodsForSlot('herbal', ritu, dosha, 4),
      tip: getSavedTip('herbal_drink') || `${rData.dietTips[0]} — drink warm, never cold`,
    },
    {
      time: '8:30 AM',
      label: 'Breakfast (Nasta)',
      emoji: '🥣',
      foods: getSavedFoods('breakfast').length > 0
        ? getSavedFoods('breakfast')
        : getFoodsForSlot('breakfast', ritu, dosha, 5),
      tip: getSavedTip('breakfast') || `Agni is ${dosha.agni} — ${dosha.agni === 'Weak' ? 'eat light' : 'moderate portions'}`,
    },
    {
      time: '11:30 AM',
      label: 'Lunch (Bhojan)',
      emoji: '🍱',
      foods: getSavedFoods('lunch').length > 0
        ? getSavedFoods('lunch')
        : getFoodsForSlot('lunch', ritu, dosha, 6),
      tip: getSavedTip('lunch') || 'Largest meal of the day — Agni is strongest at midday',
    },
    {
      time: '5:00 PM',
      label: 'Snacks (Nashta)',
      emoji: '🍎',
      foods: getSavedFoods('snacks').length > 0
        ? getSavedFoods('snacks')
        : getFoodsForSlot('snack', ritu, dosha, 3),
      tip: getSavedTip('snacks') || 'Light seasonal snack — keep Agni active before dinner',
    },
    {
      time: '7:30 PM',
      label: 'Dinner (Ratri Bhojan)',
      emoji: '🍽️',
      foods: getSavedFoods('dinner').length > 0
        ? getSavedFoods('dinner')
        : getFoodsForSlot('dinner', ritu, dosha, 4),
      tip: getSavedTip('dinner') || 'Keep dinner light and warm — digestive fire slows at night',
    },
    {
      time: '9:30 PM',
      label: 'Sleep Drink',
      emoji: '🥛',
      foods: getSavedFoods('sleep_drink').length > 0
        ? getSavedFoods('sleep_drink')
        : ['Warm turmeric milk (Haldi Doodh)', 'Ashwagandha warm milk', 'Saffron milk (optional)'],
      tip: getSavedTip('sleep_drink') || 'Ojas-building drink — promotes deep restful sleep',
    },
  ];

  // If admin saved herbs/lifestyle/avoid — use them in Week plans
  const savedHerbs     = savedDiet?.herbs         || [];
  const savedLifestyle = savedDiet?.lifestyleTips || [];
  const savedAvoid     = savedDiet?.avoidFoods    || [];

  return [
    {
      week: 1,
      title: 'शोधन — Purification Week',
      focus: 'Cleanse the body, set the foundation. Light foods, hydration, early rising.',
      color: 'blue',
      days: 'Day 1–7',
      meals: baseMeals.map(m => ({
        ...m,
        // Week 1: trim lunch to 3 items (lighter intro), add note to breakfast
        foods: m.label === 'Lunch (Bhojan)' ? m.foods.slice(0, 3) : m.foods,
        tip: m.tip + (m.label === 'Breakfast (Nasta)' ? ' — Week 1: lighter portions, no heavy grains yet' : ''),
      })),
      lifestyleTips: savedLifestyle.length > 0
        ? savedLifestyle
        : [...rData.lifestyle.slice(0, 3), 'Drink 8–10 glasses of warm water daily', 'Sleep before 10 PM for best Ojas', 'Morning Surya Namaskar (5–10 rounds)'],
      herbs: savedHerbs.length > 0
        ? savedHerbs
        : (dominant === 'Pitta' ? ['Amla (Aanvla)', 'Shatavari', 'Coriander seeds tea'] : dominant === 'Vata' ? ['Ashwagandha', 'Dashamool', 'Ginger tea'] : ['Trikatu', 'Guggul', 'Turmeric']),
      avoidFoods: savedAvoid.length > 0
        ? savedAvoid
        : rData.avoid.map(k => `${RASAS[k].english} foods (${RASAS[k].examples.slice(0, 2).join(', ')})`),
    },
    {
      week: 2,
      title: 'पोषण — Nourishment Week',
      focus: 'Build strength with seasonal foods. Full Ritu diet in place.',
      color: 'green',
      days: 'Day 8–14',
      meals: baseMeals,
      lifestyleTips: savedLifestyle.length > 0
        ? savedLifestyle
        : [...rData.lifestyle, 'Practice Pranayama 15 min (Nadi Shodhana)', 'Oil massage 2x this week (Abhyanga)'],
      herbs: savedHerbs.length > 0
        ? savedHerbs
        : (dominant === 'Pitta' ? ['Brahmi', 'Neem water morning', 'Rose petals in water'] : dominant === 'Vata' ? ['Bala', 'Vidari', 'Sesame oil massage daily'] : ['Punarnava', 'Triphala', 'Dry ginger powder']),
      avoidFoods: savedAvoid.length > 0
        ? savedAvoid
        : [...rData.avoid.map(k => RASAS[k].english + ' taste'), 'Processed foods, packaged snacks', 'Cold drinks, ice water', 'Late-night eating after 8 PM'],
    },
    {
      week: 3,
      title: 'रसायन — Rejuvenation Week',
      focus: 'Herbs + special foods for immunity and Ojas (vital essence). Peak season diet.',
      color: 'orange',
      days: 'Day 15–21',
      meals: baseMeals.map(m => ({
        ...m,
        foods: m.label === 'Before Sleep'
          ? ['Warm Ashwagandha milk', 'Chyawanprash 1 tsp', 'Golden milk with nutmeg']
          : m.foods,
        tip: m.tip,
      })),
      lifestyleTips: [
        'Add Chyawanprash daily (morning + evening)',
        'Continue Abhyanga (oil massage)',
        ...rData.lifestyle.slice(0, 2),
        'Meditate 20 min daily — builds mental Ojas',
        'Avoid excessive screen time after sunset',
      ],
      herbs: [
        'Chyawanprash (1 tsp morning)',
        dominant === 'Pitta' ? 'Guduchi + Shatavari' :
        dominant === 'Vata'  ? 'Ashwagandha + Bala' : 'Trikatu + Triphala',
        'Triphala (before sleep)',
        ritu === 'grishma' || ritu === 'sharad' ? 'Amla daily' : 'Ginger + Honey morning',
      ],
      avoidFoods: [
        'Stale / reheated food (eat fresh always)',
        'Very heavy meals at dinner',
        'Dairy with fish or sour fruits',
        'Incompatible food combinations (Virudh Aahar)',
      ],
    },
    {
      week: 4,
      title: 'संतुलन — Balance & Transition Week',
      focus: 'Maintain progress. Prepare body for next Ritu. Gradual adjustment.',
      color: 'purple',
      days: 'Day 22–30',
      meals: baseMeals,
      lifestyleTips: [
        'Begin to introduce foods of the upcoming Ritu gradually',
        'Reduce herbs — let the body\'s natural balance take over',
        'Yoga + walking — 30 min daily',
        ...rData.lifestyle.slice(-2),
        'Review and reflect — notice how your body feels',
      ],
      herbs: [
        'Triphala churna (maintenance)',
        'Turmeric + black pepper in warm water',
        ritu === 'vasant' ? 'Guduchi (Giloy) juice' :
        ritu === 'varsha' ? 'Ginger + lemon water' :
        'Ashwagandha (maintenance dose)',
        'Amla — daily Vitamin C',
      ],
      avoidFoods: [
        'New foods suddenly — introduce slowly',
        rData.avoid.map(k => RASAS[k].english).join(', ') + ' taste excess',
        'Skipping meals — keep routine',
      ],
    },
  ];
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const DOSHA_COLORS = { Vata: '#8B5CF6', Pitta: '#EF4444', Kapha: '#3B82F6' };
const RASA_COLORS: Record<string, string> = {
  sweet: '#F59E0B', sour: '#EAB308', salty: '#3B82F6',
  pungent: '#EF4444', bitter: '#22C55E', astringent: '#A855F7',
};
const WEEK_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-300',
  green: 'bg-green-50 border-green-300',
  orange: 'bg-orange-50 border-orange-300',
  purple: 'bg-purple-50 border-purple-300',
};
const WEEK_HEADER_COLORS: Record<string, string> = {
  blue: 'bg-blue-600', green: 'bg-green-600',
  orange: 'bg-orange-600', purple: 'bg-purple-600',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RitucharyaPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Location
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [fetchingWeather, setFetchingWeather] = useState(false);

  // Step 2 — Weather (editable)
  const [weather, setWeather] = useState<WeatherInput>({
    temp: 28, tempMin: 22, tempMax: 35,
    humidity: 55, windSpeed: 12, aqi: 60,
    description: 'Partly cloudy',
  });

  // Computed Ayurvedic data
  const [ritu, setRitu] = useState<RituKey>('grishma');
  const [dosha, setDosha] = useState<DoshaProfile | null>(null);
  const [rasaPlan, setRasaPlan] = useState<RasaPlan | null>(null);
  const [plan30, setPlan30] = useState<WeekPlan[]>([]);
  const [activeWeek, setActiveWeek] = useState(0);
  const [activeMealSlot, setActiveMealSlot] = useState<number | null>(null);

  // Load saved state and re-run analysis so Step 2/3 render correctly
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ritucharya_plan_v2');
      if (!saved) return;
      const data = JSON.parse(saved);

      if (data.weather) setWeather(data.weather);
      if (data.country) setCountry(data.country);
      if (data.state)   setState(data.state);
      if (data.city)    setCity(data.city);
      if (data.ritu)    setRitu(data.ritu as RituKey);

      // Re-compute analysis so Step 2 / Step 3 are not blank on reload
      if (data.step >= 2 && data.weather && data.ritu) {
        const savedRitu = data.ritu as RituKey;
        const d = computeDoshaFromWeather(data.weather, savedRitu);
        const r = computeRasaPlan(savedRitu, d);
        const plan = build30DayPlan(savedRitu, d);
        setDosha(d);
        setRasaPlan(r);
        setPlan30(plan);
        setStep(data.step as 1 | 2 | 3);
      }
    } catch { /* ignore corrupt data */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Country change
  const handleCountryChange = (val: string) => {
    const c = locationData.find(c => c.name === val);
    setCountry(val); setState(''); setCity('');
    setStates(c?.states || []); setCities([]);
  };
  const handleStateChange = (val: string) => {
    const c = locationData.find(c => c.name === country);
    const s = c?.states.find(s => s.name === val);
    setState(val); setCity('');
    setCities(s?.cities || []);
  };

  // Fetch weather from Open-Meteo (current + daily min/max + AQI)
  const fetchWeather = async () => {
    if (!city) return;
    setFetchingWeather(true);
    try {
      const c = locationData.find(c => c.name === country);
      const s = c?.states.find(s => s.name === state);
      const cityObj = s?.cities.find(c => c.name === city);
      if (!cityObj) {
        // Bug fix: always reset spinner
        setFetchingWeather(false);
        return;
      }

      const { latitude, longitude } = cityObj;

      // Fetch weather + daily min/max in one call
      const [weatherRes, aqiRes] = await Promise.allSettled([
        fetch(
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${latitude}&longitude=${longitude}` +
          `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
          `&daily=temperature_2m_max,temperature_2m_min` +
          `&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh`
        ),
        fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality` +
          `?latitude=${latitude}&longitude=${longitude}&current=us_aqi`
        ),
      ]);

      let temp = weather.temp, tempMin = weather.tempMin, tempMax = weather.tempMax;
      let humidity = weather.humidity, windSpeed = weather.windSpeed;
      let description = weather.description, aqi = weather.aqi;

      // Parse main weather
      if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
        const wData = await weatherRes.value.json();
        const cur = wData.current;
        const daily = wData.daily;
        temp        = Math.round(cur.temperature_2m);
        humidity    = Math.round(cur.relative_humidity_2m);
        windSpeed   = Math.round(cur.wind_speed_10m);
        description = getWeatherDesc(cur.weather_code);
        // Real daily min/max from the daily forecast (index 0 = today)
        tempMin     = daily?.temperature_2m_min?.[0] != null ? Math.round(daily.temperature_2m_min[0]) : Math.round(temp - 4);
        tempMax     = daily?.temperature_2m_max?.[0] != null ? Math.round(daily.temperature_2m_max[0]) : Math.round(temp + 5);
      }

      // Parse AQI (separate API)
      if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
        const aqiData = await aqiRes.value.json();
        if (aqiData?.current?.us_aqi != null) {
          aqi = Math.round(aqiData.current.us_aqi);
        }
      }

      setWeather(w => ({ ...w, temp, tempMin, tempMax, humidity, windSpeed, description, aqi }));
    } catch { /* use manual values — user can edit */ }
    finally { setFetchingWeather(false); }
  };

  function getWeatherDesc(code: number): string {
    if (code === 0)  return 'Clear sky';
    if (code <= 3)   return 'Partly cloudy';
    if (code <= 48)  return 'Foggy';
    if (code <= 67)  return 'Rainy';
    if (code <= 77)  return 'Snowy';
    if (code <= 82)  return 'Heavy rain';
    return 'Thunderstorm';
  }

  // Auto-calculate climate type from temperature
  function getClimateType(temp: number): string {
    if (temp < 0)   return 'Extreme Cold';
    if (temp < 10)  return 'Very Cold';
    if (temp < 18)  return 'Cold';
    if (temp < 24)  return 'Mild / Pleasant';
    if (temp < 30)  return 'Warm';
    if (temp < 36)  return 'Hot';
    if (temp < 42)  return 'Very Hot';
    return 'Extreme Hot';
  }

  // Auto-fetch weather when city changes
  useEffect(() => {
    if (city) fetchWeather();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  // Detect Ritu from admin-saved logic table in MongoDB
  function matchWeatherToLogic(
    w: WeatherInput,
    rows: any[]
  ): { ritu: RituKey; phase: string; score: number; row: any } | null {
    let best: { ritu: RituKey; phase: string; score: number; row: any } | null = null;

    for (const row of rows) {
      let score = 0;

      // Temperature match (40 pts) — most reliable
      const temp = w.temp;
      if (temp >= row.tempMin && temp <= row.tempMax) {
        score += 40;
      } else {
        const gap = temp < row.tempMin ? row.tempMin - temp : temp - row.tempMax;
        if (gap <= 3)  score += 28;
        else if (gap <= 7)  score += 15;
        else if (gap <= 12) score += 5;
      }

      // Humidity match (30 pts) — flexible ±15% for coastal/desert areas
      const humid = w.humidity;
      if (humid >= row.humidMin && humid <= row.humidMax) {
        score += 30;
      } else {
        const gap = humid < row.humidMin ? row.humidMin - humid : humid - row.humidMax;
        if (gap <= 10) score += 20;
        else if (gap <= 20) score += 10;
        else if (gap <= 30) score += 3;
      }

      // Wind match (15 pts)
      const wind = w.windSpeed;
      if (wind >= row.windMin && wind <= row.windMax) {
        score += 15;
      } else {
        const gap = wind < row.windMin ? row.windMin - wind : wind - row.windMax;
        if (gap <= 5)  score += 10;
        else if (gap <= 10) score += 5;
      }

      // Sky/Cloud match (15 pts)
      if (row.skyConditions?.length > 0) {
        const desc = w.description.toLowerCase();
        const matched = (row.skyConditions as string[]).some(sky =>
          desc.includes(sky.toLowerCase().split(' ')[0])
        );
        if (matched) score += 15;
        else score += 3; // partial credit — sky is subjective
      } else {
        score += 8; // no sky filter = partial match
      }

      if (!best || score > best.score) {
        best = { ritu: row.ritu as RituKey, phase: row.phase, score, row };
      }
    }

    return best;
  }

  // Run full Ayurvedic analysis — fetch logic from MongoDB then match weather
  const runAnalysis = useCallback(async () => {
    try {
      // 1. Fetch admin-saved logic table from MongoDB
      let logicRows: any[] = [];
      try {
        const res  = await fetch('/api/admin/crm/ritucharya-logic');
        const data = await res.json();
        if (data.success && Array.isArray(data.rows) && data.rows.length > 0) {
          logicRows = data.rows;
        }
      } catch { /* fall through to fallback */ }

      // 2. Detect Ritu — from MongoDB logic OR fallback to date-based method
      let detectedRitu: RituKey;
      let detectedPhase = 'peak';

      if (logicRows.length > 0) {
        // Use admin-defined logic table
        const match = matchWeatherToLogic(weather, logicRows);
        if (match) {
          detectedRitu  = match.ritu;
          detectedPhase = match.phase;
        } else {
          // Fallback to hemisphere date-based
          const hemisphere: HemisphereType =
            ['Australia', 'New Zealand', 'South Africa', 'Argentina', 'Chile', 'Brazil'].includes(country) ? 'south' :
            ['Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Kenya', 'Nigeria', 'Ghana', 'Philippines', 'Sri Lanka', 'Bangladesh', 'Colombia'].includes(country) ? 'tropical' :
            'north';
          detectedRitu = getCurrentRitu(hemisphere);
        }
      } else {
        // No logic saved yet — use date-based fallback
        const hemisphere: HemisphereType =
          ['Australia', 'New Zealand', 'South Africa', 'Argentina', 'Chile', 'Brazil'].includes(country) ? 'south' :
          ['Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Kenya', 'Nigeria', 'Ghana', 'Philippines', 'Sri Lanka', 'Bangladesh', 'Colombia'].includes(country) ? 'tropical' :
          'north';
        detectedRitu = getCurrentRitu(hemisphere);
      }

      setRitu(detectedRitu);

      // 3. Fetch diet plan for detected Ritu + Phase from MongoDB
      let fetchedDiet: any = null;
      try {
        const dietRes  = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${detectedRitu}&phase=${detectedPhase}`);
        const dietData = await dietRes.json();
        if (dietData.success && dietData.plan) fetchedDiet = dietData.plan;
      } catch { /* ignore — use generated plan */ }

      // 4. Compute dosha + rasa plan (still needed for Step 2 display)
      const d = computeDoshaFromWeather(weather, detectedRitu);
      const r = computeRasaPlan(detectedRitu, d);
      const plan = build30DayPlan(detectedRitu, d, fetchedDiet);

      setDosha(d);
      setRasaPlan(r);
      setPlan30(plan);

      // 5. Save state to localStorage
      localStorage.setItem('ritucharya_plan_v2', JSON.stringify({
        country, state, city, weather,
        ritu: detectedRitu,
        phase: detectedPhase,
        step: 2,
        savedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[runAnalysis] error:', err);
    }
  }, [weather, country, state, city]);

  const goToAnalysis = async () => { await runAnalysis(); setStep(2); };
  const goTo30DayPlan = () => { setStep(3); };

  const rituData = RITUS[ritu];
  const kaalData = rituData ? KAALS[rituData.kaal] : null;

  // ─── STEP 1: Location + Weather Form ─────────────────────────────────────

  if (step === 1) return (
    <div className="space-y-6 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">⚙️ Manage Weather Form</h1>
      </div>

      {/* Location — same green box as manage page */}
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
        <h2 className="text-xl font-bold text-emerald-700 mb-4">📍 User Selected Location</h2>

        {/* Location dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Country</p>
            <select value={country} onChange={e => handleCountryChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
              <option value="">Select Country…</option>
              {locationData.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">State/Region</p>
            <select value={state} onChange={e => handleStateChange(e.target.value)}
              disabled={!country}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">Select State…</option>
              {states.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">City</p>
            <select value={city} onChange={e => setCity(e.target.value)}
              disabled={!state}
              className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed">
              <option value="">Select City…</option>
              {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Selected location display — same as manage page */}
        {country && (
          <div className="flex gap-8 mt-2">
            <div>
              <p className="text-sm text-gray-500">Country</p>
              <p className="text-lg font-bold text-emerald-700">{country}</p>
            </div>
            {state && (
              <div>
                <p className="text-sm text-gray-500">State/Region</p>
                <p className="text-lg font-bold text-emerald-700">{state}</p>
              </div>
            )}
            {city && (
              <div>
                <p className="text-sm text-gray-500">City</p>
                <p className="text-lg font-bold text-emerald-700">{city}</p>
              </div>
            )}
          </div>
        )}

        {/* Manual refresh button */}
        {city && (
          <button onClick={fetchWeather} disabled={fetchingWeather}
            className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2">
            {fetchingWeather
              ? <><span className="animate-spin inline-block">⏳</span> Fetching…</>
              : <><span>🔄</span> Refresh Weather</>}
          </button>
        )}
      </div>

      {/* Editable Weather Blocks — exact same as manage page */}
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">☁️ Editable Weather Blocks</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

          {/* Current Temp */}
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">🌡️ Current Temp</p>
            <input type="number" value={weather.temp}
              onChange={e => setWeather(w => ({ ...w, temp: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Today's temp</p>
          </div>

          {/* Min Temp */}
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">❄️ Min Temp</p>
            <input type="number" value={weather.tempMin}
              onChange={e => setWeather(w => ({ ...w, tempMin: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Lowest today</p>
          </div>

          {/* Max Temp */}
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">🔥 Max Temp</p>
            <input type="number" value={weather.tempMax}
              onChange={e => setWeather(w => ({ ...w, tempMax: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Highest today</p>
          </div>

          {/* Humidity */}
          <div className="bg-cyan-100 rounded-xl p-4 border border-cyan-300">
            <p className="text-xs text-gray-600 mb-2">💧 Humidity (%)</p>
            <input type="number" value={weather.humidity}
              onChange={e => setWeather(w => ({ ...w, humidity: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-cyan-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">Air moisture</p>
          </div>

          {/* Wind Speed */}
          <div className="bg-yellow-100 rounded-xl p-4 border border-yellow-300">
            <p className="text-xs text-gray-600 mb-2">💨 Wind Speed</p>
            <input type="number" value={weather.windSpeed}
              onChange={e => setWeather(w => ({ ...w, windSpeed: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-yellow-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">km/h — Air movement</p>
          </div>

          {/* Air Quality */}
          <div className="bg-red-100 rounded-xl p-4 border border-red-300">
            <p className="text-xs text-gray-600 mb-2">🌫️ Air Quality (AQI)</p>
            <input type="number" value={weather.aqi}
              onChange={e => setWeather(w => ({ ...w, aqi: Number(e.target.value) }))}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-red-300 rounded px-3 py-2" />
            <p className="text-xs text-gray-500 mt-2">
              {weather.aqi <= 50 ? '🟢 Good' : weather.aqi <= 100 ? '🟡 Moderate' : weather.aqi <= 150 ? '🟠 Sensitive' : '🔴 Unhealthy'}
            </p>
          </div>

          {/* Description dropdown */}
          <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
            <p className="text-xs text-gray-600 mb-2">📝 Description</p>
            <select value={weather.description}
              onChange={e => setWeather(w => ({ ...w, description: e.target.value }))}
              className="w-full text-sm font-bold bg-white text-slate-900 outline-none border-2 border-purple-300 rounded px-3 py-2">
              <option value="Clear">Clear</option>
              <option value="Partly cloudy">Partly cloudy</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Mostly cloudy">Mostly cloudy</option>
              <option value="Overcast">Overcast</option>
              <option value="Foggy">Foggy</option>
              <option value="Hazy">Hazy</option>
              <option value="Light rain">Light rain</option>
              <option value="Rainy">Rainy</option>
              <option value="Heavy rain">Heavy rain</option>
              <option value="Thunderstorm">Thunderstorm</option>
              <option value="Snowy">Snowy</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">Clear, Cloudy, Rainy</p>
          </div>

          {/* Climate Type — auto-calculated */}
          <div className="bg-green-100 rounded-xl p-4 border border-green-300">
            <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
            <div className="w-full text-2xl font-bold bg-white text-slate-900 border-2 border-green-300 rounded px-3 py-2">
              {getClimateType(weather.temp)}
            </div>
            <p className="text-xs text-gray-500 mt-2">Auto-calculated</p>
          </div>

        </div>

        {/* Save / Analyse button — same style as manage page */}
        <button onClick={goToAnalysis} disabled={!country}
          className="w-full px-6 py-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-bold text-lg flex items-center justify-center gap-2">
          {fetchingWeather
            ? <><span className="animate-spin">⏳</span> Loading weather data…</>
            : <><span>🌿</span> Save Weather &amp; Run Ayurvedic Analysis</>}
        </button>
      </div>

      {/* Note */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>💡 Note:</strong> Select your location to auto-fetch live weather data. All fields are editable — adjust if needed for your actual conditions.
        </p>
      </div>
    </div>
  );

      {/* Ayurvedic Preview */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
        <h2 className="text-xl font-bold text-amber-800 mb-3">🔮 Ayurvedic Preview</h2>
        <div className="grid grid-cols-3 gap-3 text-center mb-3">
          <div className="bg-white rounded-xl p-3 border border-amber-200">
            <div className="text-2xl mb-1">{rituData?.icon || '🌿'}</div>
            <div className="text-xs text-gray-500">Current Ritu</div>
            <div className="font-bold text-amber-700">{rituData?.sanskrit}</div>
            <div className="text-xs text-gray-600">{rituData?.english}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-200">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-xs text-gray-500">Agni (Digestive Fire)</div>
            <div className="font-bold text-amber-700">{rituData?.agniStrength.split('—')[0].trim()}</div>
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-200">
            <div className="text-2xl mb-1">⚡</div>
            <div className="text-xs text-gray-500">Dominant Dosha</div>
            <div className="font-bold text-amber-700">{rituData?.dominantDosha}</div>
          </div>
        </div>
        <p className="text-xs text-amber-700">
          ℹ️ This is based on today's date + your location hemisphere. The full analysis (with weather adjustment) runs in Step 2.
        </p>
      </div>

      {/* CTA */}
  // ─── STEP 2: Ayurvedic Analysis Results ──────────────────────────────────

  if (step === 2 && dosha && rasaPlan) return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🌿 Ayurvedic Analysis</h1>
          <p className="text-slate-500 text-sm">📍 {city}, {state}, {country}</p>
        </div>
        <button onClick={() => setStep(1)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
          ← Edit Location
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {['📍 Location & Weather', '🌿 Ayurvedic Analysis', '📅 30-Day Plan'].map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
              i === 1 ? 'bg-emerald-600 text-white' : i < 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
            }`}>{s}</div>
            {i < 2 && <div className={`flex-1 h-0.5 ${i < 1 ? 'bg-emerald-400' : 'bg-gray-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Current Ritu Card */}
      <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <div className="flex items-start gap-5">
          <div className="text-6xl">{rituData.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-3xl font-bold text-emerald-800">{rituData.sanskrit}</h2>
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-sm font-bold">NOW</span>
            </div>
            <p className="text-emerald-700 font-semibold">{rituData.hindi} — {rituData.english}</p>
            <p className="text-sm text-gray-600 mt-1">{rituData.approxGregorian} · {rituData.months}</p>
            <div className="mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: kaalData?.color === 'orange' ? '#FEF3C7' : '#DBEAFE', color: kaalData?.color === 'orange' ? '#92400E' : '#1E40AF' }}>
              {kaalData?.sanskrit} — {kaalData?.english}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Agni Strength</div>
            <div className={`text-xl font-bold ${
              dosha.agni === 'Very Strong' ? 'text-green-600' :
              dosha.agni === 'Strong' ? 'text-emerald-600' :
              dosha.agni === 'Moderate' ? 'text-yellow-600' : 'text-red-500'
            }`}>
              {dosha.agni === 'Very Strong' ? '🔥🔥🔥' : dosha.agni === 'Strong' ? '🔥🔥' : dosha.agni === 'Moderate' ? '🔥' : '⚠️'} {dosha.agni}
            </div>
            <div className="text-xs text-gray-500 mt-1">{rituData.dominantDosha}</div>
          </div>
        </div>
      </div>

      {/* 2-column: Dosha + Rasa */}
      <div className="grid md:grid-cols-2 gap-5">

        {/* Dosha Analysis */}
        <div className="rounded-2xl border-2 border-purple-300 bg-purple-50 p-5">
          <h3 className="text-lg font-bold text-purple-800 mb-1">⚡ Dosha State Analysis</h3>
          <p className="text-xs text-purple-600 mb-4">Based on current Ritu + your weather data</p>
          {(['vata', 'pitta', 'kapha'] as const).map(d => (
            <div key={d} className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-gray-700 capitalize">
                  {d === 'vata' ? '💨' : d === 'pitta' ? '🔥' : '🌊'} {d.charAt(0).toUpperCase() + d.slice(1)}
                  {dosha.dominant.toLowerCase() === d && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                      style={{ background: DOSHA_COLORS[dosha.dominant] }}>HIGH</span>
                  )}
                </span>
                <span className="text-sm font-bold" style={{ color: DOSHA_COLORS[d === 'vata' ? 'Vata' : d === 'pitta' ? 'Pitta' : 'Kapha'] }}>
                  {dosha[d]}%
                </span>
              </div>
              <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${dosha[d]}%`, background: DOSHA_COLORS[d === 'vata' ? 'Vata' : d === 'pitta' ? 'Pitta' : 'Kapha'] }} />
              </div>
            </div>
          ))}
          <div className="mt-3 p-3 rounded-xl bg-white border border-purple-200">
            <p className="text-xs font-bold text-purple-700 mb-1">
              Dominant: {dosha.dominant} ({dosha[dosha.dominant.toLowerCase() as 'vata' | 'pitta' | 'kapha']}%)
            </p>
            <p className="text-xs text-gray-600">
              {dosha.dominant === 'Pitta' ? 'Focus on cooling, sweet, bitter foods. Avoid spicy, sour, oily.' :
               dosha.dominant === 'Vata' ? 'Focus on warm, oily, grounding foods. Avoid raw, cold, dry foods.' :
               'Focus on light, dry, warm foods. Avoid heavy, sweet, cold foods.'}
            </p>
          </div>
        </div>

        {/* Rasa (Taste) Plan */}
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5">
          <h3 className="text-lg font-bold text-amber-800 mb-1">🎨 Daily Rasa (Taste) Balance</h3>
          <p className="text-xs text-amber-600 mb-4">Recommended % of each taste in your daily meals</p>
          {Object.entries(rasaPlan).map(([rasa, pct]) => {
            const rasaData = Object.values(RASAS).find(r => r.english.toLowerCase().startsWith(rasa));
            return (
              <div key={rasa} className="mb-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-semibold text-gray-700">
                    {rasaData?.sanskrit} {rasaData?.english} — {rasaData?.hindi}
                  </span>
                  <span className="text-xs font-bold" style={{ color: RASA_COLORS[rasa] }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-200">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: RASA_COLORS[rasa] }} />
                </div>
              </div>
            );
          })}
          <div className="mt-3 p-2 rounded-lg bg-white border border-amber-200 text-xs text-gray-600">
            💡 These percentages guide your daily plate. Eat all 6 tastes, with emphasis on the higher %.
          </div>
        </div>
      </div>

      {/* Favour vs Avoid Tastes */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-xl border-2 border-green-300 bg-green-50 p-4">
          <h3 className="font-bold text-green-800 mb-3">✅ Favour These Tastes</h3>
          <div className="space-y-2">
            {rituData.favour.map(key => (
              <div key={key} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-green-200">
                <span className="text-green-500 mt-0.5">✓</span>
                <div>
                  <div className="text-sm font-bold text-gray-800">{RASAS[key].sanskrit} — {RASAS[key].english}</div>
                  <div className="text-xs text-gray-500">{RASAS[key].examples.slice(0, 4).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <h3 className="font-bold text-red-800 mb-3">❌ Reduce / Avoid</h3>
          <div className="space-y-2">
            {rituData.avoid.map(key => (
              <div key={key} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-red-200">
                <span className="text-red-400 mt-0.5">✗</span>
                <div>
                  <div className="text-sm font-bold text-gray-800">{RASAS[key].sanskrit} — {RASAS[key].english}</div>
                  <div className="text-xs text-gray-500">{RASAS[key].examples.slice(0, 3).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Seasonal Foods */}
      <div className="rounded-2xl border-2 border-teal-300 bg-teal-50 p-5">
        <h3 className="text-lg font-bold text-teal-800 mb-3">🥗 Seasonal Foods for {rituData.english}</h3>
        <div className="flex flex-wrap gap-2">
          {rituData.foods.map(f => (
            <span key={f} className="px-3 py-1.5 rounded-full bg-white border border-teal-300 text-sm font-medium text-teal-800">
              🌿 {f}
            </span>
          ))}
        </div>
      </div>

      {/* Diet Tips + Lifestyle */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded-xl bg-white border-2 border-gray-200 p-5">
          <h3 className="font-bold text-gray-800 mb-3">🍽️ Diet Tips for {rituData.english}</h3>
          <ul className="space-y-2">
            {rituData.dietTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-emerald-500 mt-0.5 shrink-0">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-white border-2 border-gray-200 p-5">
          <h3 className="font-bold text-gray-800 mb-3">🧘 Lifestyle for {rituData.english}</h3>
          <ul className="space-y-2">
            {rituData.lifestyle.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-500 mt-0.5 shrink-0">•</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={goTo30DayPlan}
        className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-colors">
        📅 Generate My 30-Day Plan →
      </button>
    </div>
  );

  // ─── STEP 3: 30-Day Plan ──────────────────────────────────────────────────

  if (step === 3 && dosha && plan30.length > 0) return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">📅 Your 30-Day Ritucharya Plan</h1>
          <p className="text-slate-500 text-sm">
            {rituData.icon} {rituData.english} Season · {city}, {country} ·
            Dominant Dosha: <strong>{dosha.dominant}</strong>
          </p>
        </div>
        <button onClick={() => setStep(2)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
          ← Analysis
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-2">
        {['📍 Location & Weather', '🌿 Ayurvedic Analysis', '📅 30-Day Plan'].map((s, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
              i === 2 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
            }`}>{s}</div>
            {i < 2 && <div className="flex-1 h-0.5 bg-emerald-400" />}
          </React.Fragment>
        ))}
      </div>

      {/* Ritu Summary Strip */}
      <div className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white flex items-center gap-5">
        <div className="text-5xl">{rituData.icon}</div>
        <div className="flex-1">
          <div className="text-lg font-bold">{rituData.sanskrit} — {rituData.english} · {rituData.approxGregorian}</div>
          <div className="text-emerald-100 text-sm">{rituData.hindi} · Agni: {dosha.agni} · Dominant: {dosha.dominant}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-emerald-200 mb-1">30-day commitment</div>
          <div className="font-bold text-lg">Day 1 → Day 30</div>
          <div className="text-xs text-emerald-200">Follow daily for best results</div>
        </div>
      </div>

      {/* Week Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {plan30.map((week, i) => (
          <button key={i} onClick={() => { setActiveWeek(i); setActiveMealSlot(null); }}
            className={`shrink-0 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${
              activeWeek === i
                ? `${WEEK_HEADER_COLORS[week.color]} text-white border-transparent`
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {week.days}<br />
            <span className="text-[10px] font-normal">{week.title}</span>
          </button>
        ))}
      </div>

      {/* Active Week Detail */}
      {(() => {
        const week = plan30[activeWeek];
        return (
          <div className={`rounded-2xl border-2 p-5 ${WEEK_COLORS[week.color]}`}>
            {/* Week Header */}
            <div className={`rounded-xl p-4 mb-5 text-white ${WEEK_HEADER_COLORS[week.color]}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">{week.title}</div>
                  <div className="text-sm opacity-90">{week.days} · {week.focus}</div>
                </div>
                <div className="text-4xl">W{week.week}</div>
              </div>
            </div>

            {/* Meal Slots */}
            <h3 className="font-bold text-gray-800 mb-3">🍽️ Daily Meal Schedule</h3>
            <div className="space-y-3 mb-6">
              {week.meals.map((meal, mi) => (
                <div key={mi}
                  className={`rounded-xl border-2 cursor-pointer transition-all ${
                    activeMealSlot === mi
                      ? 'border-emerald-500 bg-white shadow-lg'
                      : 'border-gray-200 bg-white hover:border-emerald-300'
                  }`}
                  onClick={() => setActiveMealSlot(activeMealSlot === mi ? null : mi)}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="text-3xl">{meal.emoji}</div>
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 text-sm">{meal.label}</div>
                      <div className="text-xs text-gray-500">🕐 {meal.time}</div>
                    </div>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {meal.foods.slice(0, 2).map((f, fi) => (
                        <span key={fi} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">
                          {f.split('(')[0].trim()}
                        </span>
                      ))}
                      {meal.foods.length > 2 && (
                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px]">
                          +{meal.foods.length - 2} more
                        </span>
                      )}
                    </div>
                    <span className="text-gray-400 ml-2">{activeMealSlot === mi ? '▲' : '▼'}</span>
                  </div>

                  {activeMealSlot === mi && (
                    <div className="px-4 pb-4 border-t border-gray-100">
                      <div className="pt-3 flex flex-wrap gap-2 mb-3">
                        {meal.foods.map((f, fi) => (
                          <span key={fi} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                            🌿 {f}
                          </span>
                        ))}
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                        💡 <strong>Tip:</strong> {meal.tip}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Herbs */}
            <div className="mb-5">
              <h3 className="font-bold text-gray-800 mb-2">🌱 Recommended Herbs & Supplements</h3>
              <div className="flex flex-wrap gap-2">
                {week.herbs.map((h, hi) => (
                  <span key={hi} className="px-3 py-1.5 rounded-full bg-green-100 border border-green-300 text-xs font-semibold text-green-800">
                    🌿 {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Lifestyle Tips */}
            <div className="mb-5">
              <h3 className="font-bold text-gray-800 mb-2">🧘 Lifestyle Practices — Week {week.week}</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {week.lifestyleTips.map((tip, ti) => (
                  <div key={ti} className="flex items-start gap-2 p-2.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700">
                    <span className="text-blue-500 mt-0.5 shrink-0">✦</span> {tip}
                  </div>
                ))}
              </div>
            </div>

            {/* Avoid Foods */}
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🚫 Avoid This Week</h3>
              <div className="flex flex-wrap gap-2">
                {week.avoidFoods.map((f, fi) => (
                  <span key={fi} className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                    ✗ {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 30-Day Quick Reference */}
      <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-5">
        <h3 className="font-bold text-gray-800 mb-4">📋 30-Day Quick Reference</h3>
        <div className="grid md:grid-cols-4 gap-4">
          {plan30.map((week, i) => (
            <div key={i} className={`rounded-xl p-4 border-2 cursor-pointer transition-all ${
              activeWeek === i ? 'border-emerald-500 shadow-md' : 'border-gray-200'
            }`} onClick={() => { setActiveWeek(i); setActiveMealSlot(null); window.scrollTo({ top: 300, behavior: 'smooth' }); }}>
              <div className={`text-sm font-bold mb-1 ${WEEK_HEADER_COLORS[week.color].replace('bg-', 'text-').replace('-600', '-700')}`}>
                {week.days}
              </div>
              <div className="text-xs font-bold text-gray-800 mb-1">{week.title}</div>
              <div className="text-xs text-gray-500">{week.focus.slice(0, 50)}…</div>
            </div>
          ))}
        </div>
      </div>

      {/* Print / Save */}
      <div className="flex gap-3">
        <button
          onClick={() => {
            localStorage.setItem('ritucharya_plan_v2', JSON.stringify({
              country, state, city, weather, ritu, dosha, rasaPlan,
              step: 3, savedAt: new Date().toISOString(),
            }));
            alert('✅ 30-Day Plan saved! It will be available when you return.');
          }}
          className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2">
          💾 Save 30-Day Plan
        </button>
        <button
          onClick={() => window.print()}
          className="px-5 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 flex items-center gap-2">
          🖨️ Print
        </button>
        <button
          onClick={() => { setStep(1); }}
          className="px-5 py-3 rounded-xl border-2 border-emerald-300 text-emerald-700 font-semibold hover:bg-emerald-50">
          🔄 New Plan
        </button>
      </div>
    </div>
  );

  // Loading/fallback
  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🌿</div>
        <div>Loading Ritucharya...</div>
      </div>
    </div>
  );
}
