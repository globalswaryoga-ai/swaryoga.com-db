'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RITUS,
  RASAS,
  RITU_ORDER,
  KAALS,
  getCurrentRitu,
  COUNTRIES,
  LANGUAGES,
  UI_LABELS,
  getCountryByCode,
  type RituKey,
  type RasaKey,
  type LangKey,
} from '@/lib/ritucharya';
import { ChevronDown, ChevronUp, Leaf, Sun, Droplets, Flame, Wind, Globe, Languages } from 'lucide-react';

// ─── Timezone → country code mapping for auto-detection ────────────────────────

const TZ_COUNTRY_MAP: Record<string, string> = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Mumbai': 'IN',
  'Asia/Kathmandu': 'NP', 'Asia/Katmandu': 'NP',
  'Asia/Colombo': 'LK', 'Asia/Dhaka': 'BD', 'Asia/Karachi': 'PK',
  'Asia/Thimphu': 'BT', 'Asia/Rangoon': 'MM', 'Asia/Yangon': 'MM',
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW', 'Asia/Muscat': 'OM', 'Asia/Bahrain': 'BH',
  'Asia/Singapore': 'SG', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Bangkok': 'TH',
  'Asia/Jakarta': 'ID', 'Asia/Tokyo': 'JP', 'Asia/Shanghai': 'CN',
  'Asia/Seoul': 'KR', 'Asia/Manila': 'PH',
  'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL',
  'Europe/Moscow': 'RU',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Santiago': 'CL', 'America/Bogota': 'CO',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU',
  'Pacific/Auckland': 'NZ', 'Pacific/Fiji': 'FJ',
  'Africa/Johannesburg': 'ZA', 'Africa/Nairobi': 'KE', 'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
};

function detectCountryCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_COUNTRY_MAP[tz] || 'IN';
  } catch {
    return 'IN';
  }
}

// ─── Extended food items per Rasa ──────────────────────────────────────────────

const RASA_FOODS: Record<RasaKey, { category: string; items: string[] }[]> = {
  madhura: [
    { category: 'Sweeteners', items: ['Honey (Shahad)', 'Jaggery (Gud)', 'Rock sugar (Mishri)', 'Dates (Khajoor)', 'Sugarcane (Ganna)'] },
    { category: 'Grains', items: ['Daliya (Broken wheat)', 'Rice (Chawal)', 'Wheat (Gehun)', 'Bajra', 'Jowar', 'Corn (Makka)', 'Oats (Jai)'] },
    { category: 'Dairy', items: ['Milk (Doodh)', 'Ghee', 'Butter (Makhan)', 'Paneer', 'Cream (Malai)', 'Kheer', 'Rabdi'] },
    { category: 'Fruits', items: ['Banana (Kela)', 'Mango (Aam)', 'Grapes (Angoor)', 'Watermelon (Tarbooz)', 'Chikoo', 'Figs (Anjeer)', 'Coconut (Nariyal)', 'Papaya', 'Muskmelon (Kharbooja)'] },
    { category: 'Vegetables', items: ['Sweet potato (Shakarkand)', 'Pumpkin (Kaddu)', 'Carrot (Gajar)', 'Beetroot (Chukandar)', 'Jimikand (Yam)'] },
    { category: 'Dry fruits', items: ['Almonds (Badam)', 'Cashew (Kaju)', 'Raisins (Kishmish)', 'Walnuts (Akhrot)', 'Pista', 'Dried figs (Anjeer)', 'Makhana (Fox nuts)'] },
    { category: 'Oils & Others', items: ['Sesame oil (Til ka tel)', 'Coconut oil (Nariyal tel)', 'Urad dal', 'Soybean', 'Sesame (Til)', 'Flax seeds (Alsi)'] },
  ],
  amla: [
    { category: 'Key items', items: ['Tamarind (Imli)', 'Kokum', 'Dry Mango powder (Amchur)', 'Curd (Dahi)', 'Buttermilk (Chaanch/Mattha)'] },
    { category: 'Fruits', items: ['Lemon (Nimbu)', 'Raw Mango (Kairi)', 'Orange (Santra)', 'Pineapple (Ananas)', 'Kiwi', 'Sour grapes (Khatte angoor)', 'Sour pomegranate', 'Starfruit (Kamrakh)'] },
    { category: 'Fermented', items: ['Kanji', 'Idli / Dosa batter', 'Dhokla', 'Fermented rice', 'Aam papad'] },
    { category: 'Condiments', items: ['Vinegar (Sirka)', 'Lemon pickle (Nimbu ka achaar)', 'Raw Mango pickle', 'Citrus chutneys'] },
    { category: 'Drinks', items: ['Nimbu pani', 'Kokum sharbat', 'Imli water', 'Aam panna'] },
  ],
  lavana: [
    { category: 'Natural salts', items: ['Rock salt (Sendha namak)', 'Sea salt (Samudri namak)', 'Black salt (Kala namak)', 'Pink salt (Himalayan)', 'Lahori namak'] },
    { category: 'Pickles & Preserves', items: ['Mango pickle (Aam ka achaar)', 'Lemon pickle', 'Mixed pickle', 'Chilli pickle', 'Garlic pickle', 'Gooseberry pickle (Amla achaar)'] },
    { category: 'Savoury items', items: ['Papad', 'Salted nuts (Namkeen meva)', 'Chips', 'Mathri', 'Sev', 'Chakli'] },
    { category: 'Vegetables', items: ['Celery (Ajwain patta)', 'Seaweed', 'Olives'] },
    { category: 'Ayurvedic salts', items: ['Saindha Lavan', 'Samudra Lavan', 'Vida Lavan', 'Sauvarchala Lavan (Sochal)', 'Audbhida Lavan'] },
  ],
  katu: [
    { category: 'Chillies', items: ['Byadgi mirch', 'Kashmiri mirch', 'Green chilli (Hari mirch)', 'Red chilli (Lal mirch)', 'Cayenne pepper', 'Bird\'s eye chilli'] },
    { category: 'Whole spices', items: ['Black pepper (Kali mirch)', 'Long pepper (Pippali)', 'Clove (Laung)', 'Cinnamon (Dalchini)', 'Cardamom (Elaichi)', 'Bay leaf (Tej patta)', 'Star anise (Chakra phool)', 'Mace (Javitri)', 'Nutmeg (Jaiphal)'] },
    { category: 'Ground spices', items: ['Ginger (Adrak/Sonth)', 'Mustard (Rai/Sarson)', 'Asafoetida (Hing)', 'Cumin (Jeera)', 'Ajwain (Carom)', 'Coriander (Dhaniya)', 'Fennel (Saunf)', 'Fenugreek seeds (Methi)'] },
    { category: 'Vegetables', items: ['Onion (Pyaaz)', 'Garlic (Lehsun)', 'Radish (Mooli)', 'Turnip (Shalgam)', 'Spring onion', 'Shallots (Chhote pyaaz)'] },
    { category: 'Herbs & Leaves', items: ['Tulsi', 'Curry leaves (Kadi patta)', 'Mint (Pudina)', 'Oregano (Ajwain patta)', 'Thyme'] },
    { category: 'Spice blends', items: ['Garam masala', 'Chaat masala', 'Pav bhaji masala', 'Sambhar masala', 'Panch phoron', 'Kitchen king masala'] },
  ],
  tikta: [
    { category: 'Key items', items: ['Bitter gourd (Karela)', 'Fenugreek seeds (Methi dana)', 'Giloy (Guduchi)', 'Chirayta (Chirata)', 'Kutaki (Katuki)'] },
    { category: 'Vegetables', items: ['Fenugreek leaves (Methi saag)', 'Neem leaves', 'Drumstick (Sahjan)', 'Bottle gourd (Lauki)', 'Ridge gourd (Turai)', 'Snake gourd (Chichinda)', 'Pointed gourd (Parwal)'] },
    { category: 'Greens', items: ['Spinach (Palak)', 'Amaranth (Chaulai)', 'Mustard greens (Sarson ka saag)', 'Bathua', 'Moringa leaves (Sahjan patti)'] },
    { category: 'Spices', items: ['Turmeric (Haldi)', 'Saffron (Kesar)', 'Neem bark'] },
    { category: 'Drinks & Herbs', items: ['Giloy juice', 'Neem juice', 'Aloe Vera juice', 'Green tea', 'Chirayta kadha', 'Kutaki churna', 'Bitter melon tea'] },
    { category: 'Others', items: ['Aloe Vera (Ghritkumari)', 'Kalmegh', 'Bhui amla', 'Makoy (Black nightshade)'] },
  ],
  kashaya: [
    { category: 'Key items', items: ['Amla fruit (Aanvla)', 'Triphala (Harad + Baheda + Amla)', 'Arjun bark (Arjun chhaal)'] },
    { category: 'Bitter leafy vegetables', items: ['Spinach (Palak)', 'Bathua', 'Chaulai (Amaranth)', 'Sarson saag', 'Lal saag', 'Poi saag', 'Palak saag'] },
    { category: 'Vegetables', items: ['Green beans (Sem)', 'Lotus stem (Kamal kakdi)', 'Raw banana (Kacha kela)', 'Broccoli', 'Cabbage (Patta gobhi)', 'Cauliflower (Phool gobhi)', 'Jackfruit raw (Kathal)'] },
    { category: 'Fruits', items: ['Pomegranate (Anaar)', 'Jamun (Java plum)', 'Persimmon (Japani phal)', 'Cranberry', 'Unripe banana'] },
    { category: 'Legumes', items: ['Chickpeas (Chana)', 'Moong dal', 'Masoor dal', 'Toor dal', 'Kidney beans (Rajma)', 'Chana dal'] },
    { category: 'Herbs & Drinks', items: ['Honey (Shahad)', 'Green tea', 'Turmeric milk (Haldi doodh)', 'Betel leaf (Paan)', 'Arjun bark tea', 'Haritaki (Harad)', 'Lodhra', 'Ashoka bark'] },
  ],
};

// ─── Color maps for UI ────────────────────────────────────────────────────────

const RASA_TAG_COLORS: Record<RasaKey, { bg: string; text: string; border: string }> = {
  madhura: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  amla: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  lavana: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  katu: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  tikta: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  kashaya: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
};

const RITU_CARD_COLORS: Record<RituKey, { gradient: string; border: string; badge: string }> = {
  shishir: { gradient: 'from-slate-50 to-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-800' },
  vasant: { gradient: 'from-pink-50 to-green-50', border: 'border-pink-200', badge: 'bg-pink-100 text-pink-800' },
  grishma: { gradient: 'from-orange-50 to-yellow-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800' },
  varsha: { gradient: 'from-cyan-50 to-slate-50', border: 'border-cyan-200', badge: 'bg-cyan-100 text-cyan-800' },
  sharad: { gradient: 'from-amber-50 to-orange-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800' },
  hemant: { gradient: 'from-indigo-50 to-slate-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-800' },
};

const KAAL_ICON: Record<string, React.ReactNode> = {
  adaan: <Sun className="h-5 w-5" />,
  visarga: <Droplets className="h-5 w-5" />,
};

// ─── Page component ───────────────────────────────────────────────────────────

export default function RitucharyaPage() {
  const [countryCode, setCountryCode] = useState<string>('IN');
  const [lang, setLang] = useState<LangKey>('en');
  const [expandedRitu, setExpandedRitu] = useState<RituKey | null>(null);

  // Auto-detect country on mount
  useEffect(() => {
    const detected = detectCountryCode();
    setCountryCode(detected);
    const c = getCountryByCode(detected);
    if (c) setLang(c.defaultLang);
  }, []);

  const country = useMemo(() => getCountryByCode(countryCode) || COUNTRIES[0], [countryCode]);
  const labels = UI_LABELS[lang];
  const currentRitu = getCurrentRitu(country.hemisphere);
  const ritu = RITUS[currentRitu];
  const kaal = KAALS[ritu.kaal];

  const today = new Date();
  const dateStr = today.toLocaleDateString(lang === 'hi' ? 'hi-IN' : lang === 'mr' ? 'mr-IN' : lang === 'ja' ? 'ja-JP' : lang === 'zh' ? 'zh-CN' : lang === 'ar' ? 'ar-SA' : lang === 'ru' ? 'ru-RU' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : lang === 'es' ? 'es-ES' : lang === 'pt' ? 'pt-BR' : lang === 'ne' ? 'ne-NP' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const c = getCountryByCode(code);
    if (c) setLang(c.defaultLang);
  };

  const toggle = (key: RituKey) => setExpandedRitu(prev => (prev === key ? null : key));

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ──── COUNTRY / LANGUAGE SELECTORS ──── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" />
          <select
            value={countryCode}
            onChange={e => handleCountryChange(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>
                {c.nativeName} ({c.name})
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-slate-500" />
          <select
            value={lang}
            onChange={e => setLang(e.target.value as LangKey)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {LANGUAGES.map(l => (
              <option key={l.key} value={l.key}>
                {l.nativeLabel} ({l.label})
              </option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400">{country.nativeName} · {country.hemisphere === 'north' ? '🌍 North' : country.hemisphere === 'south' ? '🌏 South' : '🌴 Tropical'}</span>
      </div>

      {/* ──── TODAY'S RITU HEADER (auto-updates daily) ──── */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden bg-white">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b3d2e] via-[#2A5654] to-[#ff7a18] opacity-95" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.25),transparent_55%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.18),transparent_55%)]" />

          <div className="relative p-5 sm:p-7">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white">
                  <Leaf className="h-4 w-4" />
                  {labels.ritucharya}
                </div>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {ritu.icon} {ritu.hindi} ({ritu.english})
                </h2>
                <p className="mt-1 text-sm text-white/75">{dateStr} — {country.nativeName}</p>
                <p className="mt-2 text-sm sm:text-base text-white/85 leading-relaxed">
                  {kaal.hindi} — {kaal.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 min-w-[180px]">
                <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">{labels.period}</p>
                  <p className="text-sm font-semibold text-white">{ritu.approxGregorian}</p>
                  <p className="text-xs text-white/70">{ritu.hinduMonths} ({ritu.months})</p>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">{labels.agni}</p>
                  <p className="text-sm font-semibold text-white">{ritu.agniStrength}</p>
                </div>
                <div className="rounded-xl bg-white/15 backdrop-blur-sm px-4 py-2">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">{labels.dosha}</p>
                  <p className="text-sm font-semibold text-white">{ritu.dominantDosha}</p>
                </div>
              </div>
            </div>

            {/* Favour / Avoid taste tags */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-emerald-500/20 backdrop-blur-sm px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-emerald-100 font-bold mb-2">✅ {labels.favourTastes}</p>
                <div className="flex flex-wrap gap-2">
                  {ritu.favour.map(rk => {
                    const r = RASAS[rk];
                    return (
                      <span key={rk} className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-emerald-800">
                        {r.sanskrit} — {r.english} ({r.hindiTaste})
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl bg-red-500/20 backdrop-blur-sm px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-red-100 font-bold mb-2">❌ {labels.avoidTastes}</p>
                <div className="flex flex-wrap gap-2">
                  {ritu.avoid.map(rk => {
                    const r = RASAS[rk];
                    return (
                      <span key={rk} className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-red-800">
                        {r.sanskrit} — {r.english} ({r.hindiTaste})
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ──── WHAT TO EAT TODAY — detailed food items for current Ritu ──── */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 mb-1">
          🍽️ {labels.whatToEat} — {ritu.english} ({ritu.hindi})
        </h3>
        <p className="text-xs sm:text-sm text-swar-text-secondary mb-4">
          {labels.foodsRecommended}
        </p>

        {/* Recommended seasonal foods */}
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
          <h4 className="text-sm font-bold text-emerald-800 mb-2">🌿 {labels.seasonalFoods}</h4>
          <div className="flex flex-wrap gap-2">
            {ritu.foods.map((f, i) => (
              <span key={i} className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Foods by favoured Rasa — full item lists */}
        <div className="space-y-4">
          {ritu.favour.map(rasaKey => {
            const r = RASAS[rasaKey];
            const foods = RASA_FOODS[rasaKey];
            const c = RASA_TAG_COLORS[rasaKey];
            return (
              <div key={rasaKey} className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`rounded-full ${c.bg} border ${c.border} px-3 py-0.5 text-xs font-bold ${c.text}`}>
                    {r.sanskrit} — {r.english} ({r.hindiTaste})
                  </span>
                  <span className="text-xs text-slate-500">{r.elements}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {foods.map((cat, ci) => (
                    <div key={ci} className="rounded-lg bg-white/80 border border-white p-3">
                      <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500 mb-1.5">{cat.category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((item, ii) => (
                          <span key={ii} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* What to avoid — condensed */}
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50/50 p-4">
          <h4 className="text-sm font-bold text-red-800 mb-2">🚫 {labels.reduceOrAvoid} {ritu.english}</h4>
          <div className="space-y-2">
            {ritu.avoid.map(rasaKey => {
              const r = RASAS[rasaKey];
              const foods = RASA_FOODS[rasaKey];
              const topExamples = foods.flatMap(f => f.items).slice(0, 8);
              return (
                <div key={rasaKey} className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-[11px] font-bold text-red-700">
                    {r.sanskrit} ({r.hindiTaste})
                  </span>
                  {topExamples.map((item, i) => (
                    <span key={i} className="text-xs text-red-600/80">{item}{i < topExamples.length - 1 ? ',' : ''}</span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ──── DIET & LIFESTYLE TIPS ──── */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" /> {labels.dietTips} — {ritu.english}
          </h4>
          <ul className="space-y-2">
            {ritu.dietTips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Wind className="h-4 w-4 text-sky-500" /> {labels.lifestyle} — {ritu.english}
          </h4>
          <ul className="space-y-2">
            {ritu.lifestyle.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="mt-0.5 h-5 w-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ──── 6 RASAS REFERENCE ──── */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 mb-1">षड्रस — {labels.sixRasas}</h3>
        <p className="text-xs sm:text-sm text-swar-text-secondary mb-4">{labels.sixRasas}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.values(RASAS).map(r => {
            const c = RASA_TAG_COLORS[r.key];
            const isFavoured = ritu.favour.includes(r.key);
            const isAvoided = ritu.avoid.includes(r.key);
            return (
              <div key={r.key} className={`rounded-xl border p-4 ${c.border} ${c.bg} relative`}>
                {isFavoured && (
                  <span className="absolute top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">✅ {labels.eat}</span>
                )}
                {isAvoided && (
                  <span className="absolute top-2 right-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">❌ {labels.avoid}</span>
                )}
                <p className={`text-base font-black ${c.text}`}>{r.sanskrit} — {r.english}</p>
                <p className="text-xs text-slate-500 mt-0.5">{r.hindiTaste} · {r.elements}</p>
                <p className="text-xs text-slate-600 mt-2">{r.effect}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.examples.map((ex, i) => (
                    <span key={i} className="rounded-md bg-white/70 border border-white px-1.5 py-0.5 text-[11px] text-slate-600">{ex}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──── ALL 6 RITUS OVERVIEW ──── */}
      <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 mb-1">📅 {labels.yearOverview}</h3>
        <p className="text-xs sm:text-sm text-swar-text-secondary mb-4">{labels.currentSeason}: {ritu.hindi} ({ritu.english})</p>

        {/* Kaal labels */}
        <div className="flex gap-3 mb-4">
          {Object.values(KAALS).map(k => (
            <div key={k.key} className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {KAAL_ICON[k.key]} {k.hindi}
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {RITU_ORDER.map(rKey => {
            const rt = RITUS[rKey];
            const colors = RITU_CARD_COLORS[rKey];
            const isCurrent = rKey === currentRitu;
            const isExpanded = expandedRitu === rKey;

            return (
              <div key={rKey} className={`rounded-xl border ${colors.border} ${isCurrent ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
                <button
                  onClick={() => toggle(rKey)}
                  className={`w-full rounded-xl bg-gradient-to-r ${colors.gradient} p-4 flex items-center justify-between text-left`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{rt.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {rt.hindi} — {rt.english}
                        {isCurrent && <span className="ml-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{labels.now}</span>}
                      </p>
                      <p className="text-xs text-slate-500">{rt.approxGregorian} · {rt.hinduMonths}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex gap-1">
                      {rt.favour.map(rk => (
                        <span key={rk} className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{RASAS[rk].hindiTaste}</span>
                      ))}
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 space-y-4">
                    {/* Favour/Avoid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <p className="text-xs font-bold text-emerald-700 mb-2">✅ {labels.favour}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rt.favour.map(rk => {
                            const r = RASAS[rk];
                            return <span key={rk} className="rounded-full bg-white border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800">{r.sanskrit} ({r.hindiTaste})</span>;
                          })}
                        </div>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-bold text-red-700 mb-2">❌ {labels.avoid}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {rt.avoid.map(rk => {
                            const r = RASAS[rk];
                            return <span key={rk} className="rounded-full bg-white border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-800">{r.sanskrit} ({r.hindiTaste})</span>;
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Seasonal foods */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-bold text-slate-600 mb-2">🌿 {labels.seasonalFoods}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {rt.foods.map((f, i) => (
                          <span key={i} className="rounded-md bg-white border border-slate-200 px-2 py-0.5 text-xs text-slate-700">{f}</span>
                        ))}
                      </div>
                    </div>

                    {/* Full food list per favoured Rasa */}
                    {rt.favour.map(rasaKey => {
                      const r = RASAS[rasaKey];
                      const foods = RASA_FOODS[rasaKey];
                      const c = RASA_TAG_COLORS[rasaKey];
                      return (
                        <div key={rasaKey} className={`rounded-lg border ${c.border} ${c.bg} p-3`}>
                          <p className={`text-xs font-bold ${c.text} mb-2`}>{r.sanskrit} — {r.english} ({r.hindiTaste}) {labels.items}</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {foods.map((cat, ci) => (
                              <div key={ci}>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{cat.category}</p>
                                <div className="flex flex-wrap gap-1">
                                  {cat.items.map((item, ii) => (
                                    <span key={ii} className="rounded bg-white/80 border border-white px-1.5 py-0.5 text-[11px] text-slate-600">{item}</span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Diet + Lifestyle */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1.5">🍲 {labels.dietTips}</p>
                        <ul className="space-y-1">
                          {rt.dietTips.map((t, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="mt-0.5 h-4 w-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 mb-1.5">🧘 {labels.lifestyle}</p>
                        <ul className="space-y-1">
                          {rt.lifestyle.map((t, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                              <span className="mt-0.5 h-4 w-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">{i + 1}</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                      <span>Agni: {rt.agniStrength}</span>
                      <span>·</span>
                      <span>Dosha: {rt.dominantDosha}</span>
                      <span>·</span>
                      <span>{KAALS[rt.kaal].hindi}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
