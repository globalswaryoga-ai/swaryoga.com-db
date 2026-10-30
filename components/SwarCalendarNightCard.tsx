'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { 
  Moon, 
  Sun, 
  Settings, 
  X, 
  MapPin, 
  Compass, 
  Sparkles, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  Clock,
  RotateCw,
  Calendar as CalendarIcon,
  Flame,
  Timer as TimerIcon,
  Leaf,
  Target,
  ArrowRight
} from 'lucide-react';
import { 
  calculateHinduCalendar, 
  calculateCompletePanchang 
} from '@/lib/calendarCalculations';
import { 
  locationData, 
  getCountryNames, 
  getStateNames, 
  getCityNames, 
  getCityCoordinates 
} from '@/lib/locationData';
import { 
  SWAR_CALENDAR_LANGUAGES, 
  getLanguage, 
  SwarCalendarLanguage,
  getLocalizedTithi
} from '@/lib/swarCalendarTranslations';

interface CalendarNightCardSettings {
  country: string;
  state: string;
  city: string;
  latitude: number;
  longitude: number;
  timezoneOffset: number;
  languageCode: string;
}

const DEFAULT_SETTINGS: CalendarNightCardSettings = {
  country: 'India',
  state: 'Maharashtra',
  city: 'Pune',
  latitude: 18.5204,
  longitude: 73.8567,
  timezoneOffset: 5.5,
  languageCode: 'hi', // Default Hindi
};

export type ActivePreviewSlot = 'calendar' | 'sadhana' | 'rutucharya' | 'vision' | null;

export default function SwarCalendarNightCard() {
  const [mounted, setMounted] = useState(false);
  const [activeSlot, setActiveSlot] = useState<ActivePreviewSlot>(null);
  const [dismissedSlots, setDismissedSlots] = useState<Record<string, boolean>>({});
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings & Location state
  const [settings, setSettings] = useState<CalendarNightCardSettings>(DEFAULT_SETTINGS);
  const [tempCountry, setTempCountry] = useState(DEFAULT_SETTINGS.country);
  const [tempState, setTempState] = useState(DEFAULT_SETTINGS.state);
  const [tempCity, setTempCity] = useState(DEFAULT_SETTINGS.city);
  const [tempLang, setTempLang] = useState(DEFAULT_SETTINGS.languageCode);
  
  // GPS & Detection Feedback
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsStatusMsg, setGpsStatusMsg] = useState('');
  
  // Calculated Tomorrow Data
  const [calendarData, setCalendarData] = useState<{
    dateFormatted: string;
    tithiName: string;
    tithiNum: number;
    paksha: 'Shukla Paksha' | 'Krishna Paksha';
    sunriseTime: string;
    nadi: {
      type: 'Sun' | 'Moon';
      symbol: string;
      name: string;
    };
    dominant: 'Prakruti' | 'Purusha';
    sleepSwitchTime: string;
  } | null>(null);

  const lang: SwarCalendarLanguage = getLanguage(settings.languageCode);
  const t = lang.translations;

  // Active Contextual Time Window Slot:
  // 1. Swar Calendar: 9:30 PM (21:30) to 5:00 AM (05:00) -> 80% minimized bottom side
  // 2. My Sadhana: 5:00 AM to 8:00 AM -> closable card on main page bottom
  // 3. Rutucharya: 8:00 AM to 9:00 AM -> closable card on main page bottom
  // 4. Vision: 9:00 AM to 11:00 AM -> closable card on main page bottom
  const getActiveSlot = useCallback((): ActivePreviewSlot => {
    if (typeof window === 'undefined') return null;

    // Developer / manual testing overrides via query param
    const urlParams = new URLSearchParams(window.location.search);
    const previewParam = urlParams.get('preview_card');
    if (previewParam && ['calendar', 'sadhana', 'rutucharya', 'vision'].includes(previewParam)) {
      return previewParam as ActivePreviewSlot;
    }
    if (urlParams.get('swar_preview_calendar') === 'true') {
      return 'calendar';
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    // 1. Swar Calendar: 9:30 PM (1290 min) to 5:00 AM (300 min)
    if (currentMinutes >= 1290 || currentMinutes < 300) {
      return 'calendar';
    }

    // 2. My Sadhana: 5:00 AM (300 min) to 8:00 AM (480 min)
    if (currentMinutes >= 300 && currentMinutes < 480) {
      return 'sadhana';
    }

    // 3. Rutucharya: 8:00 AM (480 min) to 9:00 AM (540 min)
    if (currentMinutes >= 480 && currentMinutes < 540) {
      return 'rutucharya';
    }

    // 4. Vision: 9:00 AM (540 min) to 11:00 AM (660 min)
    if (currentMinutes >= 540 && currentMinutes < 660) {
      return 'vision';
    }

    // 11:00 AM to 9:30 PM: No preview card
    return null;
  }, []);

  // Compute upcoming morning data from Swar Yoga calculations engine
  const computeTomorrowData = useCallback(async (currentSettings: CalendarNightCardSettings) => {
    try {
      const targetMorning = new Date();
      // If evening before midnight (e.g. 9:30 PM to 11:59 PM), upcoming sunrise is tomorrow (+1 day).
      // If past midnight (e.g. 12:00 AM to 7:30 AM), upcoming sunrise is today (+0 days).
      if (targetMorning.getHours() >= 12) {
        targetMorning.setDate(targetMorning.getDate() + 1);
      }

      const year = targetMorning.getFullYear();
      const month = String(targetMorning.getMonth() + 1).padStart(2, '0');
      const day = String(targetMorning.getDate()).padStart(2, '0');
      const targetDateStr = `${year}-${month}-${day}`;
      const dateFormatted = `${day}/${month}/${year}`;

      const hinduData = await calculateHinduCalendar(
        targetDateStr,
        currentSettings.latitude,
        currentSettings.longitude,
        currentSettings.timezoneOffset
      );

      // In Swar Shastra, sleep guidance is strictly determined by the sunrise active nadi
      // Moon (Chandra Nadi) -> Sleep whole night on left side to activate Moon swar at sunrise
      // Sun (Surya Nadi) -> Sleep left side first, then turn right side ~3 hrs before dawn
      const dominant = hinduData.nadi.type === 'Moon' ? 'Prakruti' : 'Purusha';

      const srTime = hinduData.sunriseTime12 || '06:30 AM';
      const srMatch = srTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let sleepSwitch = '03:30 AM';
      if (srMatch) {
        let hrs = parseInt(srMatch[1], 10);
        const mins = parseInt(srMatch[2], 10);
        const ampm = srMatch[3].toUpperCase();
        if (ampm === 'PM' && hrs !== 12) hrs += 12;
        if (ampm === 'AM' && hrs === 12) hrs = 0;
        let switchHrs = hrs - 3;
        if (switchHrs < 0) switchHrs += 24;
        const swAmPm = switchHrs >= 12 ? 'PM' : 'AM';
        const dispHrs = switchHrs % 12 || 12;
        sleepSwitch = `${dispHrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${swAmPm}`;
      }

      setCalendarData({
        dateFormatted,
        tithiName: hinduData.tithiName,
        tithiNum: hinduData.tithi,
        paksha: hinduData.paksha,
        sunriseTime: srTime,
        nadi: hinduData.nadi,
        dominant,
        sleepSwitchTime: sleepSwitch,
      });
    } catch (e) {
      console.warn('Error calculating Swar Calendar Night Card:', e);
    }
  }, []);

  // Check if a specific time slot is dismissed in the current session
  const isSlotDismissed = useCallback((slot: ActivePreviewSlot) => {
    if (!slot || typeof window === 'undefined') return false;
    const now = new Date();
    const key = `swar_preview_dismissed_${slot}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
    return sessionStorage.getItem(key) === 'true';
  }, []);

  // Handle manual dismiss for the active slot
  const handleDismissSlot = (slot: ActivePreviewSlot) => {
    if (!slot || typeof window === 'undefined') return;
    const now = new Date();
    const key = `swar_preview_dismissed_${slot}_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
    sessionStorage.setItem(key, 'true');
    setDismissedSlots((prev) => ({ ...prev, [slot]: true }));
  };

  // Hydrate settings and run slot visibility check
  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      // 1. Load stored settings
      let activeSettings = DEFAULT_SETTINGS;
      try {
        const stored = localStorage.getItem('swar_calendar_night_settings');
        if (stored) {
          activeSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
        const plannerLang = localStorage.getItem('swar_planner_lang');
        if (plannerLang) {
          activeSettings.languageCode = plannerLang;
        }
      } catch {}

      setSettings(activeSettings);
      setTempCountry(activeSettings.country);
      setTempState(activeSettings.state);
      setTempCity(activeSettings.city);
      setTempLang(activeSettings.languageCode);

      // Listen for language changes across modules
      const handleStorageOrLangChange = () => {
        try {
          const plannerLang = localStorage.getItem('swar_planner_lang');
          const stored = localStorage.getItem('swar_calendar_night_settings');
          let nextLang = plannerLang || (stored ? JSON.parse(stored).languageCode : null);
          if (nextLang) {
            setSettings((prev) => ({ ...prev, languageCode: nextLang }));
            setTempLang(nextLang);
          }
        } catch {}
      };
      window.addEventListener('storage', handleStorageOrLangChange);
      window.addEventListener('swar_planner_lang_changed', handleStorageOrLangChange);

      // 2. Initial compute
      computeTomorrowData(activeSettings);

      // 3. Initial slot determination
      const current = getActiveSlot();
      setActiveSlot(current);

      // For Swar Calendar (9:30 PM to 5:00 AM), 80% minimized by default
      if (current === 'calendar') {
        setIsMinimized(true);
      } else {
        setIsMinimized(false);
      }

      // 4. Periodic check every 60 seconds to switch slots smoothly in real-time
      const timer = setInterval(() => {
        const updated = getActiveSlot();
        setActiveSlot((prev) => {
          if (prev !== updated) {
            if (updated === 'calendar') {
              setIsMinimized(true);
            } else {
              setIsMinimized(false);
            }
          }
          return updated;
        });
      }, 60000);

      return () => clearInterval(timer);
    }
  }, [getActiveSlot, computeTomorrowData]);

  // Backward compatible dismiss for calendar
  const handleDismiss = () => {
    handleDismissSlot('calendar');
  };

  // GPS Auto-Detection: "Do you want your correct location?"
  const handleDetectLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsStatusMsg(t.locationError);
      return;
    }

    setIsDetectingGps(true);
    setGpsStatusMsg(t.detectingLocation);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        // Auto-calculate standard timezone offset
        const tzOffset = -new Date().getTimezoneOffset() / 60;

        // Find nearest city in our dataset
        let nearestCity = { name: 'Pune', state: 'Maharashtra', country: 'India', lat: 18.5204, lng: 73.8567 };
        let minDistanceSq = Number.MAX_VALUE;

        for (const c of locationData) {
          for (const s of c.states) {
            for (const ct of s.cities) {
              const dSq = Math.pow(ct.latitude - userLat, 2) + Math.pow(ct.longitude - userLng, 2);
              if (dSq < minDistanceSq) {
                minDistanceSq = dSq;
                nearestCity = {
                  name: ct.name,
                  state: s.name,
                  country: c.name,
                  lat: ct.latitude,
                  lng: ct.longitude,
                };
              }
            }
          }
        }

        const updatedSettings: CalendarNightCardSettings = {
          ...settings,
          country: nearestCity.country,
          state: nearestCity.state,
          city: nearestCity.name,
          latitude: nearestCity.lat,
          longitude: nearestCity.lng,
          timezoneOffset: tzOffset,
        };

        setSettings(updatedSettings);
        setTempCountry(nearestCity.country);
        setTempState(nearestCity.state);
        setTempCity(nearestCity.name);

        try {
          localStorage.setItem('swar_calendar_night_settings', JSON.stringify(updatedSettings));
        } catch {}

        computeTomorrowData(updatedSettings);
        setIsDetectingGps(false);
        setGpsStatusMsg(t.locationDetected);

        setTimeout(() => setGpsStatusMsg(''), 4000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsDetectingGps(false);
        setGpsStatusMsg(t.locationError);
        setTimeout(() => setGpsStatusMsg(''), 4000);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Save Settings from Modal
  const handleSaveSettings = () => {
    const coords = getCityCoordinates(tempCountry, tempState, tempCity) || {
      latitude: settings.latitude,
      longitude: settings.longitude,
    };

    const isIndianLng = coords.longitude >= 68 && coords.longitude <= 97;
    const tzOffset = isIndianLng ? 5.5 : Math.round(coords.longitude / 15);

    const newSettings: CalendarNightCardSettings = {
      country: tempCountry,
      state: tempState,
      city: tempCity,
      latitude: coords.latitude,
      longitude: coords.longitude,
      timezoneOffset: tzOffset,
      languageCode: tempLang,
    };

    setSettings(newSettings);
    try {
      localStorage.setItem('swar_calendar_night_settings', JSON.stringify(newSettings));
    } catch {}

    computeTomorrowData(newSettings);
    setIsSettingsOpen(false);
  };

  if (!mounted || !activeSlot || isSlotDismissed(activeSlot) || dismissedSlots[activeSlot]) {
    return null;
  }

  // If calendar slot is active, wait until calendarData is ready
  if (activeSlot === 'calendar' && !calendarData) {
    return null;
  }

  // Tithi Code notation: K-01 to K-15 for Krishna Paksha, S-01 to S-15 for Shukla Paksha
  const pakshaPrefix = calendarData?.paksha === 'Krishna Paksha' ? 'K' : 'S';
  const tithiCode = calendarData ? `${pakshaPrefix}-${String(calendarData.tithiNum).padStart(2, '0')}` : '';

  const isPastMidnight = mounted && new Date().getHours() < 12;

  const dateLabel = isPastMidnight 
    ? (t.todayDate || t.tomorrowDate) 
    : t.tomorrowDate;

  const tithiLabel = isPastMidnight 
    ? (t.todayTithi || t.tomorrowTithi) 
    : t.tomorrowTithi;

  const pakshaLabel = isPastMidnight 
    ? (t.todayPaksha || t.tomorrowPaksha) 
    : t.tomorrowPaksha;

  const activeSwarTitle = isPastMidnight
    ? (t.todayNadiTitle || t.tomorrowNadiTitle || "Today at Sunrise (Active Swar)")
    : (t.tomorrowNadiTitle || "Tomorrow at Sunrise (Active Swar)");

  const localizedTithiName = calendarData ? getLocalizedTithi(
    settings.languageCode,
    calendarData.tithiNum,
    calendarData.paksha,
    calendarData.tithiName
  ) : '';

  return (
    <>
      {/* Floating Card Container */}
      <aside 
        aria-label="Daily Swar Calendar & Time-Based Practice Cards"
        lang={settings.languageCode}
        className={`fixed bottom-4 right-4 z-[90] max-w-[360px] w-[calc(100vw-2rem)] select-none drop-shadow-2xl transition-all duration-300 ${
          ['hi', 'mr', 'sa', 'ne'].includes(settings.languageCode) ? 'font-devanagari' : 'font-sans'
        }`}
      >
        {/* ========================================================= */}
        {/* 1. SWAR CALENDAR SLOT: 9:30 PM to 5:00 AM (80% MINIMIZED BY DEFAULT) */}
        {/* ========================================================= */}
        {activeSlot === 'calendar' && calendarData && (
          isMinimized ? (
            /* Minimized Floating Pill (80% minimized bottom side) */
            <div 
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-amber-400/40 shadow-xl cursor-pointer hover:border-amber-400 transition-all active:scale-95 group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Moon className="w-4 h-4 fill-amber-400" />
                </div>
                <div className="truncate text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-amber-300 truncate">{t.title}</span>
                    <span className="text-[10px] text-gray-300 font-medium">📍 {settings.city}</span>
                  </div>
                  <span className="text-[10px] text-gray-300 truncate block">
                    {calendarData.dateFormatted} • {localizedTithiName} ({tithiCode}) • {calendarData.nadi?.type === 'Sun' ? (t.suryaNadi || '☀️ सूर्य') : (t.chandraNadi || '🌙 चंद्र')} • 🌅 {calendarData.sunriseTime}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                  {lang.code === 'mr' ? 'पहा' : (lang.code === 'hi' ? 'देखें' : 'Show')}
                </span>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissSlot('calendar');
                  }}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/50 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            /* Full Attractive Night Card (9:30 PM - 5:00 AM) */
            <div className="rounded-3xl bg-slate-950/95 backdrop-blur-xl border border-amber-400/30 text-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              {/* Header with Title, City, Settings & Close */}
              <div className="bg-gradient-to-r from-amber-600/30 via-purple-900/40 to-slate-900/60 p-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 flex-shrink-0">
                    <Moon className="w-4 h-4 fill-amber-300" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm tracking-tight text-amber-300 truncate">
                        {t.title}
                      </h4>
                      {/* ONLY CITY NAME (Country & State hidden on front) */}
                      <span className="text-[11px] font-semibold bg-emerald-500/25 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{settings.city}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-purple-200/80 block truncate">
                      {lang.flag} {lang.nativeName} • 9:30 PM - 5:00 AM
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Minimize, Settings, Close */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {/* Minimize */}
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize"
                    aria-label="Minimize"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-90 border border-slate-600/70 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm group"
                  >
                    <span className="text-sm font-black leading-none group-hover:scale-110">−</span>
                  </button>

                  {/* Settings */}
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    title={t.settingsTitle}
                    aria-label="Calendar Settings"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 active:scale-90 border border-amber-400/50 flex items-center justify-center text-amber-300 transition-all cursor-pointer shadow-sm group"
                  >
                    <span className="text-xs leading-none group-hover:rotate-45 transition-transform">⚙️</span>
                  </button>

                  {/* Close */}
                  <button
                    type="button"
                    onClick={() => handleDismissSlot('calendar')}
                    title={t.close}
                    aria-label="Close"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-500/25 hover:bg-red-500/45 active:scale-90 border border-red-400/50 flex items-center justify-center text-red-200 transition-all cursor-pointer shadow-sm group"
                  >
                    <span className="text-xs font-black leading-none group-hover:scale-125 transition-transform">✕</span>
                  </button>
                </div>
              </div>

              {/* Panchang & Swar Details */}
              <div className="p-3.5 space-y-3">
                {/* Tomorrow's Active Swar at Sunrise */}
                <div className={`p-3 rounded-2xl border text-left shadow-lg transition-all ${
                  calendarData.nadi?.type === 'Sun'
                    ? 'bg-gradient-to-r from-amber-950/90 via-orange-950/70 to-slate-900 border-amber-400/60 shadow-amber-950/50'
                    : 'bg-gradient-to-r from-cyan-950/90 via-blue-950/70 to-slate-900 border-cyan-400/60 shadow-cyan-950/50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 shadow-md ${
                      calendarData.nadi?.type === 'Sun'
                        ? 'bg-amber-500/30 border border-amber-400/60 text-amber-300'
                        : 'bg-cyan-500/30 border border-cyan-400/60 text-cyan-300'
                    }`}>
                      {calendarData.nadi?.type === 'Sun' ? '☀️' : '🌙'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1">
                        <span>{activeSwarTitle}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-white">
                          {calendarData.nadi?.type === 'Sun' ? (t.suryaNadi || 'सूर्य स्वर / नाडी') : (t.chandraNadi || 'चंद्र स्वर / नाडी')}
                        </span>
                        <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          calendarData.nadi?.type === 'Sun'
                            ? 'bg-orange-500/25 text-orange-200 border-orange-400/50'
                            : 'bg-cyan-500/25 text-cyan-200 border-cyan-400/50'
                        }`}>
                          {calendarData.nadi?.type === 'Sun' ? (t.rightNostril || 'उजवे नाकपुडी (पिंगळा)') : (t.leftNostril || 'डावे नाकपुडी (इडा)')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date, Sunrise & Tithi Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Date */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-left">
                    <span className="text-[10px] text-gray-400 font-medium block truncate">
                      {dateLabel}
                    </span>
                    <span className="font-extrabold text-xs sm:text-sm text-white block mt-0.5 tracking-tight truncate">
                      {calendarData.dateFormatted}
                    </span>
                  </div>

                  {/* Sunrise */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-amber-400/30 text-left">
                    <span className="text-[10px] text-amber-300/90 font-medium block truncate">
                      🌅 {t.sunriseTime}
                    </span>
                    <span className="font-extrabold text-xs sm:text-sm text-amber-400 block mt-0.5 tracking-tight truncate">
                      {calendarData.sunriseTime}
                    </span>
                  </div>

                  {/* Tithi & Paksha */}
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-purple-400/30 text-left min-w-0">
                    <span className="text-[10px] text-purple-300 font-medium block truncate">
                      {tithiLabel}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="font-bold text-xs text-purple-200 truncate">
                        {calendarData.paksha === 'Shukla Paksha' ? t.shuklaPaksha : t.krishnaPaksha}
                      </span>
                      <span className="text-[10px] font-black text-purple-300 bg-purple-500/20 px-1 py-0.5 rounded border border-purple-400/30">
                        {pakshaPrefix}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tonight's Sleep Posture Guidance */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-slate-950 border border-emerald-400/50 shadow-xl text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wide">
                        {t.sleepGuidanceTitle}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-400/40">
                      {t.swarShastraBadge || 'स्वर शास्त्र'}
                    </span>
                  </div>

                  {calendarData.dominant === 'Prakruti' ? (
                    <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/40">
                      <p className="text-xs text-white leading-relaxed font-semibold">
                        🛏️ {t.sleepLeftOnly}
                      </p>
                      <p className="text-[11px] text-emerald-200 mt-1 font-medium">
                        {lang.code === 'mr'
                          ? 'रात्रभर डाव्या कुशीवर झोपल्यामुळे सूर्योदयाच्या वेळी चंद्र स्वर (डावे नाकपुडी / इडा) आपोआप सक्रिय होतो.'
                          : (lang.code === 'hi'
                            ? 'पूरी रात बाईं करवट सोने से सूर्योदय पर चंद्र स्वर (बायाँ स्वर / इड़ा) स्वतः सक्रिय हो जाता है।'
                            : 'Sleeping on your left side all night stabilizes lunar pranic flow so Moon Swar awakens at sunrise.')}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-800/90 border border-slate-700/80">
                        <span className="w-5 h-5 rounded-md bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                          1
                        </span>
                        <span className="text-white font-semibold leading-snug">
                          {t.sleepSwitchPhase1}
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-amber-500/20 border border-amber-400/40">
                        <span className="w-5 h-5 rounded-md bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5 shadow">
                          2
                        </span>
                        <span className="text-amber-100 font-semibold leading-snug">
                          {t.sleepSwitchPhase2.replace('{time}', calendarData.sleepSwitchTime)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Note & Compact Settings Link */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 px-1 pt-0.5 border-t border-white/10">
                  <span className="text-[10px] text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400 inline" /> At 5:00 AM switches to My Sadhana
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="text-[11px] text-amber-300 hover:text-amber-200 font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/30 hover:bg-amber-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>⚙️</span>
                    <span>{t.changeCityLang || 'स्थान / भाषा बदला'}</span>
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {/* ========================================================= */}
        {/* 2. MY SADHANA SLOT: 5:00 AM to 8:00 AM (CLOSABLE CARD) */}
        {/* ========================================================= */}
        {activeSlot === 'sadhana' && (
          isMinimized ? (
            <div 
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 text-white border border-orange-400/40 shadow-xl cursor-pointer hover:border-orange-400 transition-all active:scale-95 group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 flex-shrink-0 text-base">
                  🧘‍♂️
                </div>
                <div className="truncate text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-orange-300 truncate">My Sadhana</span>
                    <span className="text-[10px] text-orange-200 font-medium bg-orange-500/20 px-1.5 py-0.2 rounded-full">5:00 – 8:00 AM</span>
                  </div>
                  <span className="text-[10px] text-gray-300 truncate block">
                    Pranayama • Kumbhaka • Swar Dhyana • Om Japa
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-bold">Show</span>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissSlot('sadhana');
                  }}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/50 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition ml-1"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-950/95 backdrop-blur-xl border border-orange-500/40 text-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-600/40 via-red-900/40 to-slate-900/60 p-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-400/40 flex items-center justify-center text-orange-400 flex-shrink-0 text-base">
                    🧘‍♂️
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm tracking-tight text-orange-300 truncate">
                        My Sadhana
                      </h4>
                      <span className="text-[10px] font-bold bg-orange-500/20 text-orange-200 border border-orange-400/30 px-2 py-0.5 rounded-full">
                        Brahma Muhurta
                      </span>
                    </div>
                    <span className="text-[10px] text-orange-200/80 block">
                      5:00 AM – 8:00 AM • Morning Practice
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-90 border border-slate-600/70 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-sm font-black leading-none">−</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissSlot('sadhana')}
                    title="Close Sadhana Preview"
                    aria-label="Close"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-500/25 hover:bg-red-500/45 active:scale-90 border border-red-400/50 flex items-center justify-center text-red-200 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-xs font-black">✕</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3.5 space-y-3">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-orange-950/80 via-red-950/60 to-slate-900 border border-orange-500/40 text-left space-y-2">
                  <p className="text-[11px] font-bold text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🔥</span>
                    <span>Today&apos;s Morning Practices</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-200">
                    <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      <span>⏱️</span>
                      <span>Pranayama</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      <span>🧘</span>
                      <span>Swar Dhyana</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      <span>🫁</span>
                      <span>Kumbhaka</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-xl border border-white/10">
                      <span>🕉️</span>
                      <span>Om Japa</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href="/life-planner/dashboard/sadhana?tab=timer"
                    className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center gap-1 border border-white/10 text-center"
                  >
                    <span>⏱️ Timer</span>
                  </Link>
                  <Link
                    href="/life-planner/dashboard/sadhana?tab=stopwatch"
                    className="py-2 px-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center justify-center gap-1 border border-white/10 text-center"
                  >
                    <span>🔥 Watch</span>
                  </Link>
                  <Link
                    href="/life-planner/dashboard/sadhana?tab=sadhana-page"
                    className="py-2 px-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold transition flex items-center justify-center gap-1 shadow-md shadow-orange-600/30 text-center"
                  >
                    <span>Open ›</span>
                  </Link>
                </div>
              </div>
            </div>
          )
        )}

        {/* ========================================================= */}
        {/* 3. RUTUCHARYA SLOT: 8:00 AM to 9:00 AM (CLOSABLE CARD) */}
        {/* ========================================================= */}
        {activeSlot === 'rutucharya' && (
          isMinimized ? (
            <div 
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white border border-emerald-400/40 shadow-xl cursor-pointer hover:border-emerald-400 transition-all active:scale-95 group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0 text-base">
                  🌿
                </div>
                <div className="truncate text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-emerald-300 truncate">Rutucharya</span>
                    <span className="text-[10px] text-emerald-200 font-medium bg-emerald-500/20 px-1.5 py-0.2 rounded-full">8:00 – 9:00 AM</span>
                  </div>
                  <span className="text-[10px] text-gray-300 truncate block">
                    Ayurvedic Seasonal Diet • Warm Water • Solar Agni
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Show</span>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissSlot('rutucharya');
                  }}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/50 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition ml-1"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-950/95 backdrop-blur-xl border border-emerald-500/40 text-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600/40 via-teal-900/40 to-slate-900/60 p-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 flex-shrink-0 text-base">
                    🌿
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm tracking-tight text-emerald-300 truncate">
                        Rutucharya
                      </h4>
                      <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                        Dinacharya
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-200/80 block">
                      8:00 AM – 9:00 AM • Ayurvedic Season Guide
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-90 border border-slate-600/70 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-sm font-black leading-none">−</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissSlot('rutucharya')}
                    title="Close Rutucharya Preview"
                    aria-label="Close"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-500/25 hover:bg-red-500/45 active:scale-90 border border-red-400/50 flex items-center justify-center text-red-200 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-xs font-black">✕</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3.5 space-y-3">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-teal-950/60 to-slate-900 border border-emerald-500/40 text-left space-y-2">
                  <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🍵</span>
                    <span>Ayurvedic Morning Guidance</span>
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Drink warm water / herbal tea for Agni balance</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Seasonal breakfast aligned with current Ritu</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>Solar alignment (Surya Nadi) for digestion</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/life-planner/dashboard/ritucharya"
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/30"
                >
                  <span>Open Rutucharya Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        )}

        {/* ========================================================= */}
        {/* 4. VISION SLOT: 9:00 AM to 11:00 AM (CLOSABLE CARD) */}
        {/* ========================================================= */}
        {activeSlot === 'vision' && (
          isMinimized ? (
            <div 
              onClick={() => setIsMinimized(false)}
              className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-400/40 shadow-xl cursor-pointer hover:border-indigo-400 transition-all active:scale-95 group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 text-base">
                  🎯
                </div>
                <div className="truncate text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-indigo-300 truncate">My Vision</span>
                    <span className="text-[10px] text-indigo-200 font-medium bg-indigo-500/20 px-1.5 py-0.2 rounded-full">9:00 – 11:00 AM</span>
                  </div>
                  <span className="text-[10px] text-gray-300 truncate block">
                    Strategic Targets • Goals • Action Execution
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">Show</span>
                <ChevronUp className="w-4 h-4 text-gray-400 group-hover:text-white" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissSlot('vision');
                  }}
                  className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/50 text-slate-300 hover:text-white flex items-center justify-center text-[10px] transition ml-1"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-950/95 backdrop-blur-xl border border-indigo-500/40 text-white shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600/40 via-purple-900/40 to-slate-900/60 p-3.5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400 flex-shrink-0 text-base">
                    🎯
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm tracking-tight text-indigo-300 truncate">
                        My Vision
                      </h4>
                      <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                        Goal Focus
                      </span>
                    </div>
                    <span className="text-[10px] text-indigo-200/80 block">
                      9:00 AM – 11:00 AM • Strategic Planning
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    title="Minimize"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-90 border border-slate-600/70 flex items-center justify-center text-white transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-sm font-black leading-none">−</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissSlot('vision')}
                    title="Close Vision Preview"
                    aria-label="Close"
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-red-500/25 hover:bg-red-500/45 active:scale-90 border border-red-400/50 flex items-center justify-center text-red-200 transition-all cursor-pointer shadow-sm"
                  >
                    <span className="text-xs font-black">✕</span>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-3.5 space-y-3">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-slate-900 border border-indigo-500/40 text-left space-y-2">
                  <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                    <span>🌟</span>
                    <span>Today&apos;s Focus &amp; Targets</span>
                  </p>
                  <div className="space-y-1.5 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>Review core Life Mission &amp; blueprint</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>Align today&apos;s high-priority milestone actions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-400 font-bold">✓</span>
                      <span>Execute Top 3 tasks with single-pointed focus</span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/life-planner/dashboard/vision"
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-indigo-700/30"
                >
                  <span>Open Vision Board</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        )}
      </aside>

      {/* Settings Modal (Location & 27 Languages) */}
      {isSettingsOpen && (
        <div 
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div 
            lang={settings.languageCode}
            className={`relative w-full max-w-md bg-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/20 select-none max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200 text-left ${
              ['hi', 'mr', 'sa', 'ne'].includes(settings.languageCode) ? 'font-devanagari' : 'font-sans'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              aria-label="Close"
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            {/* Header */}
            <div className="pr-8 mb-4">
              <h3 className="font-bold text-lg text-amber-300 flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>{t.settingsTitle}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure your accurate location & preferred language
              </p>
            </div>

            {/* SECTION 1: Ask "Do you want your correct location?" with Auto GPS */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <Compass className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">
                  {t.autoLocationPrompt}
                </span>
              </div>
              <p className="text-[11px] text-gray-300 mb-2.5 leading-relaxed">
                Our system will auto-detect your location and fill country, state, city & precise sunrise calculations instantly.
              </p>
              <button
                type="button"
                disabled={isDetectingGps}
                onClick={handleDetectLocation}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
              >
                <Compass className={`w-4 h-4 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? t.detectingLocation : t.yesDetectLocation}</span>
              </button>
              {gpsStatusMsg && (
                <div className="mt-2 text-[11px] text-center font-semibold text-emerald-300 bg-emerald-900/40 p-1.5 rounded-lg border border-emerald-500/30">
                  {gpsStatusMsg}
                </div>
              )}
            </div>

            {/* SECTION 2: Manual Country, State, City Selection */}
            <div className="space-y-3 mb-4">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Or Select Location Manually:
              </span>

              {/* Country */}
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  {t.countryLabel}
                </label>
                <select
                  value={tempCountry}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setTempCountry(newCountry);
                    const states = getStateNames(newCountry);
                    const newState = states[0] || '';
                    setTempState(newState);
                    const cities = getCityNames(newCountry, newState);
                    setTempCity(cities[0] || '');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {getCountryNames().map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* State */}
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  {t.stateLabel}
                </label>
                <select
                  value={tempState}
                  onChange={(e) => {
                    const newState = e.target.value;
                    setTempState(newState);
                    const cities = getCityNames(tempCountry, newState);
                    setTempCity(cities[0] || '');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {getStateNames(tempCountry).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                  {t.cityLabel}
                </label>
                <select
                  value={tempCity}
                  onChange={(e) => setTempCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  {getCityNames(tempCountry, tempState).map((ct) => (
                    <option key={ct} value={ct}>
                      {ct}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 3: Select from all 27 Languages */}
            <div className="mb-5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                <span>{t.selectLanguageLabel} (27 Languages)</span>
                <span className="text-[10px] text-amber-400 font-semibold lowercase">
                  active: {lang.name}
                </span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-44 overflow-y-auto p-1.5 bg-slate-800/60 rounded-xl border border-slate-700">
                {SWAR_CALENDAR_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setTempLang(l.code)}
                    className={`p-2 rounded-lg text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                      tempLang === l.code
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                        : 'bg-slate-800 hover:bg-slate-700 text-gray-200'
                    }`}
                  >
                    <span className="truncate">
                      {l.flag} {l.nativeName}
                    </span>
                    {tempLang === l.code && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="w-1/3 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-gray-300 font-semibold text-xs cursor-pointer transition-colors text-center"
              >
                {t.close}
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="w-2/3 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg active:scale-98 transition-all cursor-pointer text-center"
              >
                {t.saveButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

