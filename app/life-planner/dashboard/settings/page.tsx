'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Globe,
  Bell,
  Volume2,
  Shield,
  Smartphone,
  Database,
  Download,
  HelpCircle,
  MessageCircle,
  LogOut,
  ChevronRight,
  Check,
  RefreshCw,
  Sparkles,
  Info,
  Sun,
  Moon,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { clearSession, ensureSessionExpiry, extendSession, getFormattedRemainingTime } from '@/lib/sessionManager';

// 27 Languages (Strictly NO Urdu per project guidelines)
const SETTINGS_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🚩' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', flag: '🇮🇳' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', flag: '🕉️' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', flag: '🇳🇵' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: 'Mandarin Chinese', native: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', native: 'Italiano', flag: '🇮🇹' },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'th', name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { code: 'ko', name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
];

export default function LifePlannerAndroidSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<string>('');
  const [userProfile, setUserProfile] = useState<{ name: string; email: string }>({
    name: 'Swar Sadhak',
    email: '',
  });

  // Settings State (Persisted in localStorage)
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [swarReminder, setSwarReminder] = useState<boolean>(true);
  const [soundChimes, setSoundChimes] = useState<boolean>(true);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);
  const [autoSwarCalc, setAutoSwarCalc] = useState<boolean>(true);
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const hasAuth = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token') || localStorage.getItem('lifePlannerToken');
    const user = localStorage.getItem('user') || localStorage.getItem('lifePlannerUser');
    return Boolean(token && user);
  }, []);

  useEffect(() => {
    setMounted(true);

    if (!hasAuth) {
      router.replace('/signin?redirect=/life-planner/dashboard/settings');
      return;
    }

    // Keep session alive (1-year sliding window)
    ensureSessionExpiry();
    extendSession();

    const update = () => setRemaining(getFormattedRemainingTime());
    update();
    const t = window.setInterval(update, 30_000);

    // Read stored preferences
    try {
      const storedLang = localStorage.getItem('lifePlannerLanguage') || 'en';
      setSelectedLanguage(storedLang);

      const rawUser = localStorage.getItem('user') || localStorage.getItem('lifePlannerUser');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        setUserProfile({
          name: parsed.name || parsed.email?.split('@')[0] || 'Swar Sadhak',
          email: parsed.email || '',
        });
      }

      setSwarReminder(localStorage.getItem('lp_setting_reminders') !== 'false');
      setSoundChimes(localStorage.getItem('lp_setting_sound') !== 'false');
      setHapticFeedback(localStorage.getItem('lp_setting_haptic') !== 'false');
      setAutoSwarCalc(localStorage.getItem('lp_setting_autoswar') !== 'false');
    } catch {
      // Ignore
    }

    return () => window.clearInterval(t);
  }, [hasAuth, router]);

  const handleToggle = (key: string, currentVal: boolean, setter: (v: boolean) => void) => {
    const newVal = !currentVal;
    setter(newVal);
    localStorage.setItem(key, String(newVal));
    showToast('Setting updated');
  };

  const handleSelectLanguage = (code: string) => {
    setSelectedLanguage(code);
    localStorage.setItem('lifePlannerLanguage', code);
    setIsLangModalOpen(false);
    showToast('Language updated');
  };

  const handleClearCache = () => {
    try {
      // Keep auth tokens, clear UI cache keys
      const keysToKeep = ['token', 'user', 'lifePlannerToken', 'lifePlannerUser', 'lifePlannerLanguage'];
      Object.keys(localStorage).forEach((k) => {
        if (!keysToKeep.includes(k) && !k.startsWith('lp_setting_')) {
          localStorage.removeItem(k);
        }
      });
      showToast('Cache cleared successfully');
    } catch {
      showToast('Cache cleared');
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/signin');
  };

  if (!mounted) return null;

  const currentLangObj = SETTINGS_LANGUAGES.find((l) => l.code === selectedLanguage) || SETTINGS_LANGUAGES[0];

  return (
    <div className="min-h-full pb-16 max-w-2xl mx-auto px-3 sm:px-4 space-y-4">
      {/* Toast Notification (Android Material Style) */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg backdrop-blur-sm animate-fade-in flex items-center gap-2">
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Android Top App Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition flex items-center justify-center text-slate-700 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight truncate">
              Settings
            </h1>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              Android Preferences & Swar Yoga Controls
            </p>
          </div>
        </div>

        <Link
          href="/life-planner/dashboard"
          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition shrink-0"
        >
          Launchpad
        </Link>
      </div>

      {/* Android Profile Card (Material 3 Style) */}
      <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white rounded-2xl p-4 sm:p-5 shadow-[0_4px_16px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)] border border-emerald-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-[0_4px_10px_rgba(5,150,105,0.3)] shrink-0">
            {userProfile.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 truncate">{userProfile.name}</h2>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                Active
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">{userProfile.email || 'Sadhak Member'}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1">
              <Shield className="w-3.5 h-3.5" />
              <span>1-Year Persistent Session</span>
            </div>
          </div>
        </div>

        <Link
          href="/life-planner/profile"
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/90 hover:bg-white text-slate-700 text-xs font-bold border border-slate-200/80 shadow-2xs transition shrink-0 flex items-center gap-1"
        >
          <User className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Profile</span>
        </Link>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: Preferences & Language */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="px-4 py-2.5 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Preferences & Localization
        </div>

        {/* Language Picker Item */}
        <button
          type="button"
          onClick={() => setIsLangModalOpen(true)}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">App Language / भाषा</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">27 Indian & global languages</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 flex items-center gap-1">
              <span>{currentLangObj.flag}</span>
              <span>{currentLangObj.name}</span>
            </span>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </button>

        {/* Auto Swar Calculation */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <Sun className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Auto Swar & Tithi Timings</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Vedic sunrise & nostril alignment (Ida/Pingala)</p>
            </div>
          </div>
          {/* Android Material Switch */}
          <button
            type="button"
            onClick={() => handleToggle('lp_setting_autoswar', autoSwarCalc, setAutoSwarCalc)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative shrink-0 p-0.5 focus:outline-none ${
              autoSwarCalc ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                autoSwarCalc ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Hourly Swar Reminders */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Breath & Routine Reminders</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Notify when dominant Swar shifts</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('lp_setting_reminders', swarReminder, setSwarReminder)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative shrink-0 p-0.5 focus:outline-none ${
              swarReminder ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                swarReminder ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Singing Bowl Sound & Audio */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Volume2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Singing Bowl Chimes</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Tibetan bowl sound on meditation interval</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('lp_setting_sound', soundChimes, setSoundChimes)}
            className={`w-12 h-6 rounded-full transition-colors duration-200 relative shrink-0 p-0.5 focus:outline-none ${
              soundChimes ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                soundChimes ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: Session, Cloud & Storage */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="px-4 py-2.5 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Session & Data
        </div>

        {/* 1-Year Session Status */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Shield className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Session Status</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                Remaining: <span className="font-bold text-emerald-700">{remaining || '1 year'}</span>
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            Auto-Refreshed
          </span>
        </div>

        {/* Bunny Database Edge SQL */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Cloud Storage Sync</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Bunny Edge SQL & Bunny CDN</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200 shrink-0">
            🟢 Connected
          </span>
        </div>

        {/* Clear Local Cache */}
        <button
          type="button"
          onClick={handleClearCache}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 border border-slate-200">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Clear Temporary Cache</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Free up space on this device</p>
            </div>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/80 shrink-0">
            Clean Cache
          </span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* SECTION 3: App Info & Support */}
      {/* ========================================================= */}
      <div className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.03)] border border-slate-200/80 overflow-hidden divide-y divide-slate-100">
        <div className="px-4 py-2.5 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Support & App Info
        </div>

        {/* WhatsApp Teacher Support */}
        <a
          href="https://wa.me/919972323565?text=Hello%20Swar%20Yoga%20Team%2C%20I%20have%20a%20question%20about%20Life%20Planner"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50/80 transition active:bg-slate-100"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">WhatsApp Gurukul Support</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Chat directly with Swar Yoga masters</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
        </a>

        {/* App Version & Build */}
        <div className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">Swar Yoga Android App</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">Version 2.1.0 • Contabo Blue/Green</p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0">
            Up to date
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 4: Logout (Android Material Dialog Trigger) */}
      {/* ========================================================= */}
      <div className="bg-red-50/60 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-red-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-red-900">Sign Out</p>
            <p className="text-xs text-red-700 truncate mt-0.5">Exit your Life Planner session</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsLogoutModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-bold shadow-xs transition shrink-0"
        >
          Sign Out
        </button>
      </div>

      {/* ========================================================= */}
      {/* Android Bottom Sheet / Modal: Language Selection */}
      {/* ========================================================= */}
      {isLangModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Language / भाषा</h3>
                <p className="text-xs text-slate-500">27 Indian & global languages</p>
              </div>
              <button
                type="button"
                onClick={() => setIsLangModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
              {SETTINGS_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`w-full px-4 py-3 flex items-center justify-between text-left transition ${
                      isSelected ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{lang.flag}</span>
                      <div>
                        <p className="text-sm font-semibold">{lang.name}</p>
                        <p className="text-xs text-slate-400 font-normal">{lang.native}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-emerald-600 font-bold" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Android Material Dialog: Logout Confirmation */}
      {/* ========================================================= */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Sign Out?</h3>
              <p className="text-xs text-slate-500">
                You will need to sign in again to access your Swar Yoga Life Planner dashboard.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
