'use client';

/**
 * Public Ritucharya Page — swaryoga.com/life-planner/ritucharya
 * Step 1 → Location + Weather
 * Step 2 → Detected Ritu (with Uttarayan/Dakshinayan) + Full Diet Plan + Submit
 * Step 3 → Interactive 30-Day Calendar with day-click + ← → navigation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader, RefreshCw, ChevronDown, ChevronUp, Calendar, ArrowRight, ArrowLeft, List } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import DietaryRecommendationsChart from '@/components/ritucharya/DietaryRecommendationsChart';
import { locationData } from '@/lib/locationData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeatherState {
  temp:        number;
  tempMin:     number;
  tempMax:     number;
  humidity:    number;
  windSpeed:   number;
  aqi:         number;
  description: string;
}

interface RituResult {
  ritu:        string;
  phase:       string;
  rituLabel:   string;
  phaseLabel:  string;
  icon:        string;
  score:       number;
  ayana:       string;   // 'uttarayan' | 'dakshinayan'
  characterEn: string;
  characterHi: string;
}

interface MealSlot {
  slotKey: string;
  time:    string;
  label:   string;
  emoji:   string;
  foods:   string[];
  tip:     string;
}

interface DietPlan {
  meals:         MealSlot[];
  herbs:         string[];
  lifestyleTips: string[];
  avoidFoods:    string[];
  specialNotes:  string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RITU_META: Record<string, { label:string; icon:string; color:string; bg:string }> = {
  shishir: { label:'शीत (SHISHIRA)',    icon:'❄️', color:'text-blue-700',   bg:'bg-blue-50 border-blue-300'   },
  vasant:  { label:'वसंत (VASANT)',     icon:'🌸', color:'text-green-700',  bg:'bg-green-50 border-green-300' },
  grishma: { label:'ग्रीष्म (GRISHMA)', icon:'☀️', color:'text-orange-700', bg:'bg-orange-50 border-orange-300'},
  varsha:  { label:'वर्षा (VARSHA)',     icon:'🌧️', color:'text-indigo-700', bg:'bg-indigo-50 border-indigo-300'},
  sharad:  { label:'शरद (SHARAD)',      icon:'🍂', color:'text-amber-700',  bg:'bg-amber-50 border-amber-300' },
  hemant:  { label:'हेमंत (HEMANT)',    icon:'🥶', color:'text-purple-700', bg:'bg-purple-50 border-purple-300'},
};

const PHASE_META: Record<string, { label:string; hi:string }> = {
  begin: { label:'BEGIN', hi:'प्रारंभ' },
  peak:  { label:'PEAK',  hi:'शिखर'   },
  last:  { label:'LAST',  hi:'अंत'    },
};

const AYANA_META: Record<string, { label:string; sublabel:string; hi:string; bg:string; color:string; icon:string }> = {
  uttarayan: {
    label:'Uttarayan', sublabel:'Adana Kala', hi:'उत्तरायण',
    bg:'bg-amber-100 border-amber-400', color:'text-amber-800', icon:'🌅'
  },
  dakshinayan: {
    label:'Dakshinayan', sublabel:'Visarga Kala', hi:'दक्षिणायन',
    bg:'bg-indigo-100 border-indigo-400', color:'text-indigo-800', icon:'🌌'
  },
};

const MEAL_SLOTS = [
  { key:'gond_pani',    time:'4:00 AM',  label:'Gond Pani',             emoji:'🌙' },
  { key:'herbal_drink', time:'6:00 AM',  label:'Herbal Drink',          emoji:'🌿' },
  { key:'breakfast',    time:'8:30 AM',  label:'Breakfast',             emoji:'🥣' },
  { key:'lunch',        time:'11:30 AM', label:'Lunch (Bhojan)',        emoji:'🍱' },
  { key:'snacks',       time:'5:00 PM',  label:'Snacks (Nashta)',       emoji:'🍎' },
  { key:'dinner',       time:'7:30 PM',  label:'Dinner (Ratri Bhojan)',emoji:'🍽️' },
  { key:'sleep_drink',  time:'9:30 PM',  label:'Sleep Drink',           emoji:'🥛' },
];

const DAYS_OF_WEEK = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES  = ['January','February','March','April','May','June','July','August','September','October','November','December'];

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

// ─── DayMealPanel — shared by calendar + list view ───────────────────────────

interface DayMealPanelProps {
  dayNum:      number;
  date:        Date;
  meals:       { key:string; label:string; time:string; emoji:string; foods:string[]; tip:string }[];
  dietPlan:    DietPlan | null;
  total:       number;
  hasPlan:     boolean;
  onPrev:      () => void;
  onNext:      () => void;
  openSlot:    string | null;
  setOpenSlot: (k: string | null) => void;
  inList?:     boolean;
}

function DayMealPanel({ dayNum, date, meals, dietPlan, total, hasPlan, onPrev, onNext, openSlot, setOpenSlot, inList }: DayMealPanelProps) {
  const dateStr = date.toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  return (
    <div className={`bg-white overflow-hidden ${inList ? '' : 'rounded-2xl border-2 border-emerald-400 shadow-md'}`}>

      {/* ← Day N → navigation header */}
      <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between gap-2">
        <button onClick={onPrev} disabled={dayNum <= 1}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0">
          <ArrowLeft size={18}/>
        </button>

        <div className="text-center flex-1 min-w-0">
          <div className="text-white font-black text-base">Day {dayNum} of {total}</div>
          <div className="text-emerald-100 text-xs truncate">{dateStr}</div>
        </div>

        <button onClick={onNext} disabled={dayNum >= total}
          className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors shrink-0">
          <ArrowRight size={18}/>
        </button>
      </div>

      {!hasPlan ? (
        <div className="px-5 py-6 text-center text-amber-700 text-sm">🌿 Diet plan being prepared by our Ayurvedic team.</div>
      ) : (
        <>
          {/* 7 Meal Slots — accordion */}
          <div className="divide-y divide-gray-100">
            {meals.map(slot => {
              const isOpen  = openSlot === slot.key;
              const hasFood = slot.foods.length > 0;
              return (
                <div key={slot.key}>
                  <button
                    onClick={() => setOpenSlot(isOpen ? null : slot.key)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{slot.emoji}</span>
                      <div className="text-left">
                        <div className="font-bold text-gray-900 text-sm">{slot.label}</div>
                        <div className="text-xs text-gray-400">🕐 {slot.time}</div>
                      </div>
                      {hasFood && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                          {slot.foods.length} foods
                        </span>
                      )}
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-gray-400 shrink-0"/> : <ChevronDown size={16} className="text-gray-400 shrink-0"/>}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                      {hasFood ? (
                        <>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {slot.foods.map((f, i) => (
                              <span key={i} className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                                🌿 {f}
                              </span>
                            ))}
                          </div>
                          {slot.tip && (
                            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                              💡 {slot.tip}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-400 italic py-1">No specific foods added yet for this slot.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Herbs + lifestyle */}
          {dietPlan && (dietPlan.herbs?.length > 0 || dietPlan.lifestyleTips?.length > 0) && (
            <div className="px-5 py-3 bg-green-50 border-t border-green-100">
              {dietPlan.herbs?.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-bold text-green-700 mb-1">🌱 Daily Herbs:</p>
                  <div className="flex flex-wrap gap-1">
                    {dietPlan.herbs.map((h,i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-white border border-green-200 text-[10px] text-green-800 font-medium">🌿 {h}</span>
                    ))}
                  </div>
                </div>
              )}
              {dietPlan.lifestyleTips?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-blue-700 mb-1">🧘 Lifestyle:</p>
                  {dietPlan.lifestyleTips.slice(0,2).map((t,i) => (
                    <p key={i} className="text-[10px] text-blue-700">{i+1}. {t}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'ritucharya_user_data_v1';

export default function RitucharyaPage() {

  const [step, setStep]           = useState<1|2|3>(1);
  const [country, setCountry]     = useState('');
  const [state,   setState]       = useState('');
  const [city,    setCity]        = useState('');
  const [aayan,   setAayan]       = useState('');
  const [season,  setSeason]      = useState('');
  const [humidityLevel, setHumidityLevel] = useState('');
  const [states,  setStates]      = useState<any[]>([]);
  const [cities,  setCities]      = useState<any[]>([]);

  const [weather, setWeather]     = useState<WeatherState>({
    temp:28, tempMin:22, tempMax:35, humidity:55, windSpeed:12, aqi:60, description:'Partly cloudy',
  });
  const [fetching, setFetching]   = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [savedAt,  setSavedAt]    = useState<Date|null>(null);   // when data was last saved
  const [saveFlash,setSaveFlash]  = useState(false);             // brief "✓ Saved" flash

  const [ritu,     setRitu]       = useState<RituResult|null>(null);
  const [dietPlan, setDietPlan]   = useState<DietPlan|null>(null);
  const [dietaryRecommendations, setDietaryRecommendations] = useState<any|null>(null);
  const [openSlot, setOpenSlot]   = useState<string|null>('gond_pani');

  // Step 3 calendar state
  const [calView,    setCalView]   = useState<'calendar'|'list'>('calendar');
  const [selectedDay,setSelectedDay] = useState(1);
  const [calMonth,  setCalMonth]   = useState(0);
  const [openMealSlot, setOpenMealSlot] = useState<string|null>(null);

  // ── Persist helpers ──────────────────────────────────────────────────
  const saveData = useCallback((w: WeatherState, loc: { country:string; state:string; city:string; aayan:string; season:string; humidityLevel?:string }) => {
    try {
      const data = { ...loc, weather: w, savedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedAt(new Date());
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 2500);
    } catch { /* storage full / private mode */ }
  }, []);

  const clearSaved = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedAt(null);
    setCountry(''); setState(''); setCity(''); setAayan(''); setSeason(''); setHumidityLevel('');
    setStates([]); setCities([]);
    setWeather({ temp:28, tempMin:22, tempMax:35, humidity:55, windSpeed:12, aqi:60, description:'Partly cloudy' });
  };

  // ── On mount: restore saved location + weather ───────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!data.country) return;

      // Restore location dropdowns
      const countryData = locationData.find(c => c.name === data.country);
      if (!countryData) return;
      setCountry(data.country);
      setStates(countryData.states);

      if (data.state) {
        const stateData = countryData.states.find(s => s.name === data.state);
        if (stateData) {
          setState(data.state);
          setCities(stateData.cities);
          if (data.city) setCity(data.city);
        }
      }

      // Restore aayan, season, and humidity level
      if (data.aayan) setAayan(data.aayan);
      if (data.season) setSeason(data.season);
      if (data.humidityLevel) setHumidityLevel(data.humidityLevel);

      // Restore weather
      if (data.weather) setWeather(data.weather);
      if (data.savedAt) setSavedAt(new Date(data.savedAt));
    } catch { /* corrupted data */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Location handlers ────────────────────────────────────────────────
  const onCountry = (val: string) => {
    const c = locationData.find(c => c.name === val);
    setCountry(val); setState(''); setCity('');
    setStates(c?.states || []); setCities([]);
  };
  const onState = (val: string) => {
    const c = locationData.find(c => c.name === country);
    const s = c?.states.find(s => s.name === val);
    setState(val); setCity(''); setCities(s?.cities || []);
  };

  // ── Auto-save whenever weather field is edited manually ───────────────
  const handleWeatherChange = (field: keyof WeatherState, val: number | string) => {
    setWeather(w => {
      const updated = { ...w, [field]: val };
      if (country && city) saveData(updated, { country, state, city, aayan, season, humidityLevel });
      return updated;
    });
  };

  useEffect(() => {
    if (city) fetchWeather();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city]);

  const fetchWeather = async () => {
    const c       = locationData.find(c => c.name === country);
    const s       = c?.states.find(s => s.name === state);
    const cityObj = s?.cities.find(c => c.name === city);
    if (!cityObj) { setFetching(false); return; }
    setFetching(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || process.env.OPENWEATHER_API_KEY;
      if (!apiKey) { console.warn('OpenWeatherMap API key not configured'); setFetching(false); return; }

      const [wRes, aqiRes] = await Promise.allSettled([
        fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${cityObj.latitude}&lon=${cityObj.longitude}&appid=${apiKey}&units=metric`),
        fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${cityObj.latitude}&lon=${cityObj.longitude}&appid=${apiKey}`),
      ]);
      const w = { ...weather };
      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        const d = await wRes.value.json();
        w.temp        = Math.round(d.main.temp);
        w.humidity    = Math.round(d.main.humidity);
        w.windSpeed   = Math.round(d.wind.speed);
        w.tempMin     = d.main?.temp_min != null ? Math.round(d.main.temp_min) : w.temp - 4;
        w.tempMax     = d.main?.temp_max != null ? Math.round(d.main.temp_max) : w.temp + 5;
        const mainDesc = d.weather?.[0]?.main || 'Unknown';
        w.description = mainDesc.includes('Clear')?'Clear sky':mainDesc.includes('Cloud')?'Partly cloudy':mainDesc.includes('Mist')||mainDesc.includes('Fog')?'Foggy':mainDesc.includes('Rain')?'Rainy':mainDesc.includes('Snow')?'Snowy':mainDesc.includes('Thunder')?'Thunderstorm':mainDesc;
      }
      if (aqiRes.status === 'fulfilled' && aqiRes.value.ok) {
        const a = await aqiRes.value.json();
        if (a?.list?.[0]?.main?.aqi != null) {
          const aqiValue = a.list[0].main.aqi;
          w.aqi = aqiValue === 1 ? 30 : aqiValue === 2 ? 50 : aqiValue === 3 ? 100 : aqiValue === 4 ? 150 : 200;
        }
      }
      setWeather(w);
      // ← auto-save after fetch
      saveData(w, { country, state, city, aayan, season, humidityLevel });
    } catch { /* silent */ }
    finally { setFetching(false); }
  };

  // ── Run analysis ──────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setAnalysing(true);
    try {
      let logicRows: any[] = [];
      try {
        const res  = await fetch('/api/admin/crm/ritucharya-logic');
        const data = await res.json();
        if (data.success && data.rows?.length > 0) logicRows = data.rows;
      } catch { /* fallback */ }

      let bestRitu  = 'grishma';
      let bestPhase = 'peak';
      let bestScore = 0;
      let bestRow: any = null;

      for (const row of logicRows) {
        let score = 0;
        const t = weather.temp;
        if (t >= row.tempMin && t <= row.tempMax) score += 40;
        else { const g = t < row.tempMin ? row.tempMin - t : t - row.tempMax; if (g<=3) score+=28; else if (g<=7) score+=15; else if (g<=12) score+=5; }
        const h = weather.humidity;
        if (h >= row.humidMin && h <= row.humidMax) score += 30;
        else { const g = h < row.humidMin ? row.humidMin - h : h - row.humidMax; if (g<=10) score+=20; else if (g<=20) score+=10; else if (g<=30) score+=3; }
        const ws = weather.windSpeed;
        if (ws >= row.windMin && ws <= row.windMax) score += 15;
        else { const g = ws < row.windMin ? row.windMin - ws : ws - row.windMax; if (g<=5) score+=10; else if (g<=10) score+=5; }
        if (row.skyConditions?.length > 0) {
          const matched = row.skyConditions.some((s:string) => weather.description.toLowerCase().includes(s.toLowerCase().split(' ')[0]));
          score += matched ? 15 : 3;
        } else score += 8;
        if (score > bestScore) { bestScore = score; bestRitu = row.ritu; bestPhase = row.phase; bestRow = row; }
      }

      const rituMeta  = RITU_META[bestRitu]  || RITU_META['grishma'];
      const phaseMeta = PHASE_META[bestPhase] || PHASE_META['peak'];

      setRitu({
        ritu:        bestRitu,
        phase:       bestPhase,
        rituLabel:   rituMeta.label,
        phaseLabel:  `${phaseMeta.label} — ${phaseMeta.hi}`,
        icon:        rituMeta.icon,
        score:       bestScore,
        ayana:       bestRow?.ayana || '',
        characterEn: bestRow?.characterEn || '',
        characterHi: bestRow?.characterHi || '',
      });

      let fetchedDiet: DietPlan | null = null;
      try {
        const res  = await fetch(`/api/admin/crm/ritucharya-diet?ritu=${bestRitu}&phase=${bestPhase}`);
        const data = await res.json();
        if (data.success && data.plan) fetchedDiet = data.plan;
      } catch { /* silent */ }

      let fetchedRecommendations: any = null;
      try {
        const res  = await fetch(`/api/ritucharya/dietary-recommendations?ritu=${bestRitu}&phase=${bestPhase}`);
        const data = await res.json();
        if (data.success && data.data) fetchedRecommendations = data.data;
      } catch { /* silent */ }

      setDietPlan(fetchedDiet);
      setDietaryRecommendations(fetchedRecommendations);
      setStep(2);
    } catch { /* silent */ }
    finally { setAnalysing(false); }
  }, [weather]);

  // ── Refresh diet data from admin (for live updates) ────────────────
  const refreshDietData = useCallback(async () => {
    if (!ritu?.ritu || !ritu?.phase) return;
    try {
      const [dietRes, recRes] = await Promise.all([
        fetch(`/api/admin/crm/ritucharya-diet?ritu=${ritu.ritu}&phase=${ritu.phase}`),
        fetch(`/api/ritucharya/dietary-recommendations?ritu=${ritu.ritu}&phase=${ritu.phase}`),
      ]);
      const dietData = await dietRes.json();
      const recData = await recRes.json();
      if (dietData.success && dietData.plan) setDietPlan(dietData.plan);
      if (recData.success && recData.data) setDietaryRecommendations(recData.data);
    } catch { /* silent */ }
  }, [ritu?.ritu, ritu?.phase]);

  // ── Calendar helpers ──────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);

  // Build 30 days starting from today
  const planDays = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return { dayNum: i + 1, date: d };
    });
  }, [today]);

  // Calendar grid for the displayed month
  const calendarGrid = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + calMonth, 1);
    const year  = base.getFullYear();
    const month = base.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: { date: number | null; dayNum: number | null; isToday: boolean }[] = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, dayNum: null, isToday: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const diff = Math.floor((cellDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000);
      const dayNum = diff >= 0 && diff < 30 ? diff + 1 : null;
      const isToday = diff === 0;
      cells.push({ date: d, dayNum, isToday });
    }
    return { cells, label: `${MONTH_NAMES[month]} ${year}` };
  }, [today, calMonth]);

  // Get meal data for a specific day
  const getDayMeals = (dayNum: number) => {
    if (!dietPlan) return [];
    return MEAL_SLOTS.map(slot => {
      const saved = dietPlan.meals?.find(m => m.slotKey === slot.key);
      return { ...slot, foods: saved?.foods || [], tip: saved?.tip || '' };
    });
  };

  const selectedDayDate = planDays[selectedDay - 1]?.date;
  const selectedDayMeals = getDayMeals(selectedDay);

  // ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">

          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-emerald-700 mb-3">
              ऋतुचर्या (Ritucharya)
            </h1>
            <p className="text-lg text-gray-600">Seasonal Ayurvedic Routine Based on Real-Time Weather</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mt-5">
              {[1,2,3].map((s,i) => (
                <React.Fragment key={s}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${
                    step === s ? 'bg-emerald-600 border-emerald-600 text-white'
                    : step > s ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-400'
                  }`}>{s}</div>
                  {i < 2 && <div className={`w-10 h-0.5 ${step > i+1 ? 'bg-emerald-400' : 'bg-gray-300'}`}/>}
                </React.Fragment>
              ))}
            </div>
            <div className="flex justify-center gap-10 mt-2 text-xs text-gray-500">
              <span>Location</span><span>Ritu &amp; Plan</span><span>30-Day Calendar</span>
            </div>
          </div>

          {/* ── STEP 1 ─────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">

              {/* Location card */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-xl font-bold text-emerald-800">📍 Select Your Location</h2>
                  <div className="flex items-center gap-2">
                    {saveFlash && (
                      <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold animate-pulse">
                        ✓ Saved
                      </span>
                    )}
                    {savedAt && !saveFlash && (
                      <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 text-[10px] font-semibold">
                        💾 Last saved {savedAt.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}
                      </span>
                    )}
                    {savedAt && (
                      <button onClick={clearSaved}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 border border-red-200 transition-colors">
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>

                {savedAt && country && (
                  <div className="mb-4 px-4 py-2.5 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center gap-2 text-sm text-emerald-800">
                    <span>📍</span>
                    <span className="font-bold">{city}{state ? `, ${state}` : ''}{country ? `, ${country}` : ''}</span>
                    <span className="text-emerald-600 text-xs ml-auto">Saved location · Edit below</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {[
                    { label:'Country',        val:country, items:locationData.map(c=>c.name), onChange:(v:string)=>onCountry(v), disabled:false    },
                    { label:'State / Region', val:state,   items:states.map(s=>s.name),       onChange:(v:string)=>onState(v),   disabled:!country },
                    { label:'City',           val:city,    items:cities.map(c=>c.name),        onChange:(v:string)=>setCity(v),   disabled:!state   },
                  ].map(sel => (
                    <div key={sel.label}>
                      <p className="text-sm text-gray-600 mb-1">{sel.label}</p>
                      <select value={sel.val} onChange={e=>sel.onChange(e.target.value)} disabled={sel.disabled}
                        className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="">Select {sel.label}…</option>
                        {sel.items.map(i => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">☀️ Aayan</p>
                    <select value={aayan} onChange={e => { setAayan(e.target.value); if (country && city) saveData(weather, { country, state, city, aayan: e.target.value, season, humidityLevel }); }}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value="">Select Aayan…</option>
                      <option value="uttarayan">🌅 Uttarayan (Jan-Jun)</option>
                      <option value="dakshinayan">🌌 Dakshinayan (Jul-Dec)</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">🌍 Season</p>
                    <select value={season} onChange={e => { setSeason(e.target.value); if (country && city) saveData(weather, { country, state, city, aayan, season: e.target.value, humidityLevel }); }}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value="">Select Season…</option>
                      <option value="summer-pleasant">☀️ Summer - Pleasant</option>
                      <option value="summer-hot">☀️ Summer - Too Hot</option>
                      <option value="winter-pleasant">❄️ Winter - Pleasant</option>
                      <option value="winter-cold">❄️ Winter - Too Cold</option>
                      <option value="rainy-pleasant">🌧️ Rainy - Pleasant</option>
                      <option value="rainy-heavy">🌧️ Rainy - Heavy</option>
                      <option value="rainy-no-rain">🌧️ Rainy - But No Rain</option>
                    </select>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-1">💧 Humidity Level</p>
                    <select value={humidityLevel} onChange={e => { setHumidityLevel(e.target.value); if (country && city) saveData(weather, { country, state, city, aayan, season, humidityLevel: e.target.value }); }}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-emerald-200 bg-white text-sm font-semibold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                      <option value="">Select Humidity…</option>
                      <option value="low">🟢 Low (0-40%)</option>
                      <option value="medium">🟡 Medium (40-70%)</option>
                      <option value="high">🔴 High (70-100%)</option>
                    </select>
                  </div>
                </div>
                {city && (
                  <button onClick={fetchWeather} disabled={fetching}
                    className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2 transition-colors">
                    {fetching ? <><Loader className="animate-spin" size={15}/> Fetching…</> : <><RefreshCw size={15}/> Refresh Weather</>}
                  </button>
                )}
              </div>

              {/* Weather blocks */}
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold text-blue-800">☁️ Weather Details</h2>
                  {fetching && <div className="flex items-center gap-2 text-blue-600 text-sm"><Loader className="animate-spin" size={15}/> Fetching…</div>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  {[
                    { label:'🌡️ Current Temp (°C)', field:'temp'      as keyof WeatherState, color:'blue',   val:weather.temp      },
                    { label:'❄️ Min Temp (°C)',      field:'tempMin'   as keyof WeatherState, color:'blue',   val:weather.tempMin   },
                    { label:'🔥 Max Temp (°C)',      field:'tempMax'   as keyof WeatherState, color:'blue',   val:weather.tempMax   },
                    { label:'💧 Humidity (%)',        field:'humidity'  as keyof WeatherState, color:'cyan',   val:weather.humidity  },
                    { label:'💨 Wind Speed (km/h)',  field:'windSpeed' as keyof WeatherState, color:'yellow', val:weather.windSpeed },
                    { label:'🌫️ Air Quality (AQI)',  field:'aqi'       as keyof WeatherState, color:'red',    val:weather.aqi       },
                  ].map(item => (
                    <div key={item.field} className={`bg-${item.color}-100 rounded-xl p-4 border border-${item.color}-300`}>
                      <p className="text-xs text-gray-600 mb-2">{item.label}</p>
                      <input type="number" value={item.val}
                        onChange={e => handleWeatherChange(item.field, Number(e.target.value))}
                        className={`w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-${item.color}-300 rounded px-3 py-2`}/>
                      {item.field === 'aqi' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {weather.aqi<=50?'🟢 Good':weather.aqi<=100?'🟡 Moderate':weather.aqi<=150?'🟠 Sensitive':'🔴 Unhealthy'}
                        </p>
                      )}
                    </div>
                  ))}

                  <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
                    <p className="text-xs text-gray-600 mb-2">📝 Sky Condition</p>
                    <select value={weather.description} onChange={e => handleWeatherChange('description', e.target.value)}
                      className="w-full text-sm font-bold bg-white text-slate-900 outline-none border-2 border-purple-300 rounded px-3 py-2">
                      {['Clear sky','Partly cloudy','Cloudy','Mostly cloudy','Overcast','Foggy','Hazy','Light rain','Rainy','Heavy rain','Thunderstorm','Snowy'].map(d =>
                        <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  <div className="bg-green-100 rounded-xl p-4 border border-green-300">
                    <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
                    <div className="text-xl font-bold bg-white text-slate-900 border-2 border-green-300 rounded px-3 py-2">
                      {getClimateType(weather.temp)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
                  </div>
                </div>

                <button onClick={runAnalysis} disabled={analysing || !country}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg transition-colors">
                  {analysing
                    ? <><Loader className="animate-spin" size={22}/> Detecting Ritu…</>
                    : <><span>🌿</span> Get My Ritucharya Plan <ArrowRight size={20}/></>}
                </button>
                {!country && <p className="text-center text-xs text-gray-400 mt-2">Please select your location first</p>}
              </div>
            </div>
          )}

          {/* ── STEP 2 ─────────────────────────────────────────────────── */}
          {step === 2 && ritu && (
            <div className="space-y-5">

              {/* Ritu detected banner — with Uttarayan/Dakshinayan */}
              {(() => {
                const meta  = RITU_META[ritu.ritu] || RITU_META['grishma'];
                const ayana = AYANA_META[ritu.ayana];
                return (
                  <div className={`rounded-2xl border-2 p-6 ${meta.bg}`}>
                    {/* Ayana badge row */}
                    {ayana && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold mb-4 ${ayana.bg} ${ayana.color}`}>
                        <span className="text-lg">{ayana.icon}</span>
                        <span>{ayana.label} ({ayana.hi})</span>
                        <span className="font-normal opacity-70">— {ayana.sublabel}</span>
                      </div>
                    )}

                    {/* Main Ritu info */}
                    <div className="flex items-start gap-5">
                      <div className="text-6xl">{ritu.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-3xl font-bold mb-1 ${meta.color}`}>{ritu.rituLabel}</div>
                        <div className="text-lg font-semibold text-gray-700">{ritu.phaseLabel}</div>
                        {ritu.characterHi && <div className="text-sm text-gray-600 mt-1">{ritu.characterHi}</div>}
                        {ritu.characterEn && <div className="text-xs text-gray-500 italic">{ritu.characterEn}</div>}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-gray-500 mb-1">Match Score</div>
                        <div className={`text-2xl font-bold ${meta.color}`}>{ritu.score}/100</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {ritu.score>=70?'✅ High':ritu.score>=45?'🟡 Medium':'⚠️ Low'} confidence
                        </div>
                      </div>
                    </div>

                    {/* Uttarayan/Dakshinayan explanation */}
                    {ayana && (
                      <div className="mt-4 pt-4 border-t border-black/10 text-xs text-gray-600">
                        {ritu.ayana === 'uttarayan'
                          ? '☀️ Uttarayan (Jan–Jun): Sun moves northward. Body energy reduces, digestion strong. Light, nourishing diet recommended.'
                          : '🌌 Dakshinayan (Jul–Dec): Sun moves southward. Body builds strength. Heavier, nourishing foods are beneficial.'}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Weather summary */}
              <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-blue-800">☁️ Your Weather</h3>
                  <button onClick={() => setStep(1)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-100 flex items-center gap-1 transition-colors">
                    <RefreshCw size={12}/> Change Location
                  </button>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center">
                  {[
                    {label:'Temp',  val:`${weather.temp}°C`,        color:'text-blue-700'},
                    {label:'Min',   val:`${weather.tempMin}°C`,     color:'text-blue-600'},
                    {label:'Max',   val:`${weather.tempMax}°C`,     color:'text-orange-600'},
                    {label:'Humid', val:`${weather.humidity}%`,     color:'text-cyan-700'},
                    {label:'Wind',  val:`${weather.windSpeed}km/h`, color:'text-yellow-700'},
                    {label:'AQI',   val:String(weather.aqi),        color:'text-red-600'},
                    {label:'Sky',   val:weather.description,        color:'text-purple-700'},
                  ].map(f => (
                    <div key={f.label} className="bg-white rounded-lg p-2 border border-blue-200">
                      <div className="text-[10px] text-gray-400">{f.label}</div>
                      <div className={`text-xs font-bold truncate ${f.color}`}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diet Plan */}
              {dietPlan ? (
                <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-6 space-y-4">
                  <h2 className="text-xl font-bold text-emerald-800">
                    🍽️ {ritu.icon} {ritu.rituLabel} — {ritu.phaseLabel} Diet Plan
                  </h2>

                  {/* Dietary Recommendations Chart */}
                  <DietaryRecommendationsChart
                    tasteRecommendations={dietaryRecommendations?.tasteRecommendations}
                    avoidRecommendations={dietaryRecommendations?.avoidRecommendations}
                    title={dietaryRecommendations?.title || `${ritu.rituLabel} — ${ritu.phaseLabel} Dietary Recommendations`}
                  />

                  <div className="space-y-2">
                    {MEAL_SLOTS.map(slot => {
                      const mealData = dietPlan.meals?.find(m => m.slotKey === slot.key);
                      if (!mealData || mealData.foods.length === 0) return null;
                      const isOpen = openSlot === slot.key;
                      return (
                        <div key={slot.key} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm">
                          <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                            onClick={() => setOpenSlot(isOpen ? null : slot.key)}>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{slot.emoji}</span>
                              <div className="text-left">
                                <div className="font-bold text-gray-900 text-sm">{slot.label}</div>
                                <div className="text-xs text-gray-500">🕐 {slot.time}</div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                                {mealData.foods.length} foods
                              </span>
                            </div>
                            {isOpen ? <ChevronUp size={18} className="text-gray-400"/> : <ChevronDown size={18} className="text-gray-400"/>}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-4 pt-3 border-t border-gray-100">
                              <div className="flex flex-wrap gap-2 mb-3">
                                {mealData.foods.map((f,i) => (
                                  <span key={i} className="px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800">
                                    🌿 {f}
                                  </span>
                                ))}
                              </div>
                              {mealData.tip && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                                  💡 {mealData.tip}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {dietPlan.herbs?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🌱 Herbs &amp; Supplements</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.herbs.map((h,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-xs font-medium text-green-800">🌿 {h}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietPlan.lifestyleTips?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🧘 Lifestyle Tips</h3>
                      <div className="space-y-2">
                        {dietPlan.lifestyleTips.map((t,i) => (
                          <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
                            <span className="shrink-0 mt-0.5">✦</span> {t}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietPlan.avoidFoods?.length > 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
                      <h3 className="font-bold text-gray-800 mb-3 text-sm">🚫 Avoid This Season</h3>
                      <div className="flex flex-wrap gap-2">
                        {dietPlan.avoidFoods.map((f,i) => (
                          <span key={i} className="px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-xs font-medium text-red-800">✗ {f}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {dietPlan.specialNotes && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 shadow-sm">
                      <h3 className="font-bold text-amber-800 mb-2 text-sm">📝 Special Notes</h3>
                      <p className="text-sm text-amber-900">{dietPlan.specialNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-8 text-center">
                  <div className="text-4xl mb-3">🌿</div>
                  <p className="text-amber-800 font-semibold">Diet plan for {ritu.rituLabel} ({ritu.phaseLabel}) is being prepared.</p>
                  <p className="text-amber-600 text-sm mt-1">Our Ayurvedic team is adding the complete plan. Please check back soon.</p>
                </div>
              )}

              {/* SUBMIT button + Change Location link */}
              <button
                onClick={() => { setSelectedDay(1); setCalMonth(0); setStep(3); }}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-lg font-bold flex items-center justify-center gap-3 shadow-lg transition-colors">
                <Calendar size={22}/> Submit — View My 30-Day Plan →
              </button>

              <button onClick={() => setStep(1)}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-800 font-semibold transition-colors py-2">
                ← Change Location / Weather
              </button>
            </div>
          )}

          {/* ── STEP 3: Interactive 30-Day Calendar ────────────────────── */}
          {step === 3 && ritu && (
            <div className="space-y-4">

              {/* Header row */}
              <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-emerald-800">
                      📅 30-Day Plan — {ritu.icon} {ritu.rituLabel} · {ritu.phaseLabel}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {planDays[0]?.date.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} –{' '}
                      {planDays[29]?.date.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5 bg-white border-2 border-emerald-200 p-1 rounded-lg">
                      <button onClick={() => { setCalView('calendar'); setOpenMealSlot(null); }}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${calView==='calendar' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        <Calendar size={13}/> Calendar
                      </button>
                      <button onClick={() => { setCalView('list'); setOpenMealSlot(null); }}
                        className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-colors ${calView==='list' ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                        <List size={13}/> List
                      </button>
                    </div>
                    <button onClick={() => setStep(2)}
                      className="px-4 py-2 rounded-lg border-2 border-emerald-400 text-emerald-700 font-bold hover:bg-emerald-100 text-sm transition-colors">
                      ← Back
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── CALENDAR VIEW ─────────────────────────────────────── */}
              {calView === 'calendar' && (
                <>
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 shadow-sm">
                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-4">
                      <button onClick={() => setCalMonth(m => m - 1)}
                        className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors">
                        <ArrowLeft size={18}/>
                      </button>
                      <h3 className="font-black text-gray-800 text-lg">{calendarGrid.label}</h3>
                      <button onClick={() => setCalMonth(m => m + 1)}
                        className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-700 transition-colors">
                        <ArrowRight size={18}/>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {DAYS_OF_WEEK.map(d => (
                        <div key={d} className="text-xs font-bold text-gray-400 text-center py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {calendarGrid.cells.map((cell, ci) => {
                        if (!cell.date) return <div key={ci}/>;
                        const isSel = cell.dayNum === selectedDay;
                        const inPlan = cell.dayNum !== null;
                        return (
                          <button key={ci}
                            onClick={() => { if (cell.dayNum) { refreshDietData(); setSelectedDay(cell.dayNum); setOpenMealSlot(null); } }}
                            disabled={!inPlan}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all hover:scale-105 ${
                              isSel ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-400 ring-offset-1 scale-105'
                              : cell.isToday ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400'
                              : inPlan ? 'bg-emerald-50 text-emerald-700 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100'
                              : 'text-gray-300 cursor-not-allowed'
                            }`}>
                            <span>{cell.date}</span>
                            {inPlan && <span className={`text-[8px] mt-0.5 ${isSel ? 'text-white/70' : 'text-emerald-400'}`}>Day {cell.dayNum}</span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-3">🟢 Green = plan days · Click any day to open its diet chart</p>
                  </div>

                  {/* Day panel shown below calendar when a day is selected */}
                  {selectedDay > 0 && (
                    <DayMealPanel
                      dayNum={selectedDay} date={planDays[selectedDay-1].date}
                      meals={getDayMeals(selectedDay)} dietPlan={dietPlan}
                      total={30} hasPlan={!!dietPlan}
                      onPrev={() => { setSelectedDay(d => Math.max(1,d-1)); setOpenMealSlot(null); }}
                      onNext={() => { setSelectedDay(d => Math.min(30,d+1)); setOpenMealSlot(null); }}
                      openSlot={openMealSlot} setOpenSlot={setOpenMealSlot}
                    />
                  )}
                </>
              )}

              {/* ─── LIST VIEW ─────────────────────────────────────────── */}
              {calView === 'list' && (
                <div className="space-y-0.5">
                  {planDays.map(({ dayNum, date }) => {
                    const isSel   = selectedDay === dayNum;
                    const isToday = dayNum === 1;
                    const dayName = date.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });
                    return (
                      <React.Fragment key={dayNum}>
                        {/* Row button */}
                        <button
                          onClick={() => { if (!isSel) refreshDietData(); setSelectedDay(isSel ? 0 : dayNum); setOpenMealSlot(null); }}
                          className={`w-full text-left px-4 py-2 rounded-lg border-2 flex items-center justify-between transition-all ${
                            isSel ? 'bg-emerald-600 border-emerald-600 text-white rounded-b-none'
                            : isToday ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300'
                          }`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isSel ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {dayNum}
                            </span>
                            <span className="font-medium text-xs">{dayName}</span>
                            {isToday && (
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold shrink-0 ${isSel ? 'bg-white/20 text-white' : 'bg-emerald-600 text-white'}`}>TODAY</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] ${isSel ? 'text-white/70' : 'text-gray-400'}`}>7 meals</span>
                            {isSel ? <ChevronUp size={13} className="text-white/70"/> : <ChevronDown size={13} className="text-gray-400"/>}
                          </div>
                        </button>

                        {/* Inline expanded day panel */}
                        {isSel && (
                          <div className="rounded-b-2xl border-2 border-t-0 border-emerald-600 overflow-hidden shadow-md -mt-0.5 mb-1">
                            <DayMealPanel
                              dayNum={dayNum} date={date}
                              meals={getDayMeals(dayNum)} dietPlan={dietPlan}
                              total={30} hasPlan={!!dietPlan}
                              onPrev={() => { setSelectedDay(d => Math.max(1,d-1)); setOpenMealSlot(null); }}
                              onNext={() => { setSelectedDay(d => Math.min(30,d+1)); setOpenMealSlot(null); }}
                              openSlot={openMealSlot} setOpenSlot={setOpenMealSlot}
                              inList
                            />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Avoid foods strip */}
              {dietPlan && dietPlan.avoidFoods && dietPlan.avoidFoods.length > 0 && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                  <h3 className="font-bold text-red-800 mb-3 text-sm">🚫 Avoid All Month</h3>
                  <div className="flex flex-wrap gap-2">
                    {dietPlan.avoidFoods.map((f,i) => (
                      <span key={i} className="px-3 py-1.5 rounded-full bg-white border border-red-200 text-xs font-medium text-red-800">✗ {f}</span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => setStep(1)}
                className="w-full text-center text-sm text-emerald-600 hover:text-emerald-800 font-semibold transition-colors py-2">
                ← Change Location / Weather
              </button>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
