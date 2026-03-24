/**
 * Ritucharya — Ayurvedic Seasonal Eating Guide
 *
 * 3 Seasons (Kaal) → 6 Ritus → 6 Rasas (Tastes)
 * Multi-location: Hemisphere-aware season mapping for global users.
 * Multi-language: UI labels translated.
 *
 * Based on classical Ayurveda texts (Charaka Samhita / Ashtanga Hridaya).
 */

// ─── Supported Languages ──────────────────────────────────────────────────────

export type LangKey = 'en' | 'hi' | 'mr' | 'ne' | 'es' | 'pt' | 'de' | 'fr' | 'ja' | 'zh' | 'ar' | 'ru';

export interface Language {
  key: LangKey;
  label: string;
  nativeLabel: string;
}

export const LANGUAGES: Language[] = [
  { key: 'en', label: 'English', nativeLabel: 'English' },
  { key: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { key: 'mr', label: 'Marathi', nativeLabel: 'मराठी' },
  { key: 'ne', label: 'Nepali', nativeLabel: 'नेपाली' },
  { key: 'es', label: 'Spanish', nativeLabel: 'Español' },
  { key: 'pt', label: 'Portuguese', nativeLabel: 'Português' },
  { key: 'de', label: 'German', nativeLabel: 'Deutsch' },
  { key: 'fr', label: 'French', nativeLabel: 'Français' },
  { key: 'ja', label: 'Japanese', nativeLabel: '日本語' },
  { key: 'zh', label: 'Chinese', nativeLabel: '中文' },
  { key: 'ar', label: 'Arabic', nativeLabel: 'العربية' },
  { key: 'ru', label: 'Russian', nativeLabel: 'Русский' },
];

// ─── UI label translations ────────────────────────────────────────────────────

export interface UILabels {
  ritucharya: string;
  currentSeason: string;
  favourTastes: string;
  avoidTastes: string;
  whatToEat: string;
  seasonalFoods: string;
  reduceOrAvoid: string;
  dietTips: string;
  lifestyle: string;
  sixRasas: string;
  sixRasasSubtitle: string;
  yearOverview: string;
  yearOverviewSubtitle: string;
  period: string;
  agni: string;
  dosha: string;
  eat: string;
  avoid: string;
  now: string;
  favour: string;
  selectCountry: string;
  selectLanguage: string;
  location: string;
  foodsRecommended: string;
  items: string;
}

export const UI_LABELS: Record<LangKey, UILabels> = {
  en: {
    ritucharya: 'ऋतुचर्या — Ritucharya',
    currentSeason: 'Current Season',
    favourTastes: '✅ Favour these tastes',
    avoidTastes: '❌ Avoid these tastes',
    whatToEat: '🍽️ What to Eat',
    seasonalFoods: '🌿 Seasonal Foods',
    reduceOrAvoid: '🚫 Reduce or Avoid in',
    dietTips: 'Diet Tips',
    lifestyle: 'Lifestyle',
    sixRasas: 'षड्रस — 6 Rasas (Tastes)',
    sixRasasSubtitle: 'Complete reference of all six tastes in Ayurveda',
    yearOverview: '📅 All 6 Ritus — Year Overview',
    yearOverviewSubtitle: 'Tap any Ritu to see its full food guide',
    period: 'Period',
    agni: 'Agni (Digestive Fire)',
    dosha: 'Dosha',
    eat: '✅ Eat',
    avoid: '❌ Avoid',
    now: 'NOW',
    favour: '✅ Favour',
    selectCountry: 'Select Country',
    selectLanguage: 'Language',
    location: 'Location',
    foodsRecommended: 'Foods recommended for the current Ritu based on Ayurvedic guidelines',
    items: 'Items',
  },
  hi: {
    ritucharya: 'ऋतुचर्या',
    currentSeason: 'वर्तमान ऋतु',
    favourTastes: '✅ इन रसों का सेवन करें',
    avoidTastes: '❌ इन रसों से बचें',
    whatToEat: '🍽️ क्या खाएं',
    seasonalFoods: '🌿 मौसमी आहार',
    reduceOrAvoid: '🚫 कम करें या बचें',
    dietTips: 'आहार सुझाव',
    lifestyle: 'जीवनशैली',
    sixRasas: 'षड्रस — छह रस',
    sixRasasSubtitle: 'आयुर्वेद में छह रसों का सम्पूर्ण विवरण',
    yearOverview: '📅 सभी ६ ऋतुएँ — वार्षिक दृश्य',
    yearOverviewSubtitle: 'किसी भी ऋतु पर टैप करें',
    period: 'अवधि',
    agni: 'अग्नि (जठराग्नि)',
    dosha: 'दोष',
    eat: '✅ खाएं',
    avoid: '❌ बचें',
    now: 'अभी',
    favour: '✅ सेवन करें',
    selectCountry: 'देश चुनें',
    selectLanguage: 'भाषा',
    location: 'स्थान',
    foodsRecommended: 'वर्तमान ऋतु के अनुसार आयुर्वेदिक आहार',
    items: 'सामग्री',
  },
  mr: {
    ritucharya: 'ऋतुचर्या',
    currentSeason: 'सध्याची ऋतू',
    favourTastes: '✅ हे रस खा',
    avoidTastes: '❌ हे रस टाळा',
    whatToEat: '🍽️ काय खावे',
    seasonalFoods: '🌿 हंगामी अन्न',
    reduceOrAvoid: '🚫 कमी करा किंवा टाळा',
    dietTips: 'आहार टिप्स',
    lifestyle: 'जीवनशैली',
    sixRasas: 'षड्रस — सहा रस',
    sixRasasSubtitle: 'आयुर्वेदातील सहा रसांचे संपूर्ण वर्णन',
    yearOverview: '📅 सर्व ६ ऋतू — वार्षिक दृश्य',
    yearOverviewSubtitle: 'कोणत्याही ऋतूवर टॅप करा',
    period: 'कालावधी',
    agni: 'अग्नी (जठराग्नी)',
    dosha: 'दोष',
    eat: '✅ खा',
    avoid: '❌ टाळा',
    now: 'आता',
    favour: '✅ सेवन करा',
    selectCountry: 'देश निवडा',
    selectLanguage: 'भाषा',
    location: 'स्थान',
    foodsRecommended: 'सध्याच्या ऋतूनुसार आयुर्वेदिक आहार',
    items: 'पदार्थ',
  },
  ne: {
    ritucharya: 'ऋतुचर्या',
    currentSeason: 'हालको ऋतु',
    favourTastes: '✅ यी रस खानुहोस्',
    avoidTastes: '❌ यी रसबाट बच्नुहोस्',
    whatToEat: '🍽️ के खाने',
    seasonalFoods: '🌿 मौसमी खाना',
    reduceOrAvoid: '🚫 कम गर्नुहोस्',
    dietTips: 'आहार सुझाव',
    lifestyle: 'जीवनशैली',
    sixRasas: 'षड्रस — छ रस',
    sixRasasSubtitle: 'आयुर्वेदमा छ रसहरूको विवरण',
    yearOverview: '📅 सबै ६ ऋतुहरू',
    yearOverviewSubtitle: 'कुनै पनि ऋतुमा ट्याप गर्नुहोस्',
    period: 'अवधि',
    agni: 'अग्नि',
    dosha: 'दोष',
    eat: '✅ खानुहोस्',
    avoid: '❌ बच्नुहोस्',
    now: 'अहिले',
    favour: '✅ सेवन',
    selectCountry: 'देश छान्नुहोस्',
    selectLanguage: 'भाषा',
    location: 'स्थान',
    foodsRecommended: 'हालको ऋतु अनुसार आयुर्वेदिक आहार',
    items: 'सामग्री',
  },
  es: {
    ritucharya: 'ऋतुचर्या — Ritucharya',
    currentSeason: 'Temporada actual',
    favourTastes: '✅ Favorece estos sabores',
    avoidTastes: '❌ Evita estos sabores',
    whatToEat: '🍽️ Qué comer',
    seasonalFoods: '🌿 Alimentos de temporada',
    reduceOrAvoid: '🚫 Reducir o evitar en',
    dietTips: 'Consejos de dieta',
    lifestyle: 'Estilo de vida',
    sixRasas: 'षड्रस — 6 Rasas (Sabores)',
    sixRasasSubtitle: 'Referencia completa de los seis sabores en Ayurveda',
    yearOverview: '📅 Las 6 Ritus — Resumen anual',
    yearOverviewSubtitle: 'Toca cualquier Ritu para ver su guía',
    period: 'Período',
    agni: 'Agni (Fuego digestivo)',
    dosha: 'Dosha',
    eat: '✅ Comer',
    avoid: '❌ Evitar',
    now: 'AHORA',
    favour: '✅ Favorece',
    selectCountry: 'Seleccionar país',
    selectLanguage: 'Idioma',
    location: 'Ubicación',
    foodsRecommended: 'Alimentos recomendados según las pautas ayurvédicas',
    items: 'Artículos',
  },
  pt: {
    ritucharya: 'ऋतुचर्या — Ritucharya',
    currentSeason: 'Estação atual',
    favourTastes: '✅ Favoreça estes sabores',
    avoidTastes: '❌ Evite estes sabores',
    whatToEat: '🍽️ O que comer',
    seasonalFoods: '🌿 Alimentos sazonais',
    reduceOrAvoid: '🚫 Reduzir ou evitar em',
    dietTips: 'Dicas de dieta',
    lifestyle: 'Estilo de vida',
    sixRasas: 'षड्रस — 6 Rasas (Sabores)',
    sixRasasSubtitle: 'Referência completa dos seis sabores no Ayurveda',
    yearOverview: '📅 As 6 Ritus — Visão anual',
    yearOverviewSubtitle: 'Toque em qualquer Ritu para ver o guia',
    period: 'Período',
    agni: 'Agni (Fogo digestivo)',
    dosha: 'Dosha',
    eat: '✅ Comer',
    avoid: '❌ Evitar',
    now: 'AGORA',
    favour: '✅ Favorecer',
    selectCountry: 'Selecionar país',
    selectLanguage: 'Idioma',
    location: 'Localização',
    foodsRecommended: 'Alimentos recomendados de acordo com as diretrizes ayurvédicas',
    items: 'Itens',
  },
  de: {
    ritucharya: 'ऋतुचर्या — Ritucharya',
    currentSeason: 'Aktuelle Jahreszeit',
    favourTastes: '✅ Diese Geschmäcker bevorzugen',
    avoidTastes: '❌ Diese Geschmäcker vermeiden',
    whatToEat: '🍽️ Was essen',
    seasonalFoods: '🌿 Saisonale Lebensmittel',
    reduceOrAvoid: '🚫 Reduzieren oder vermeiden in',
    dietTips: 'Ernährungstipps',
    lifestyle: 'Lebensstil',
    sixRasas: 'षड्रस — 6 Rasas (Geschmäcker)',
    sixRasasSubtitle: 'Vollständige Referenz aller sechs Geschmäcker im Ayurveda',
    yearOverview: '📅 Alle 6 Ritus — Jahresübersicht',
    yearOverviewSubtitle: 'Tippen Sie auf eine Ritu',
    period: 'Zeitraum',
    agni: 'Agni (Verdauungsfeuer)',
    dosha: 'Dosha',
    eat: '✅ Essen',
    avoid: '❌ Vermeiden',
    now: 'JETZT',
    favour: '✅ Bevorzugen',
    selectCountry: 'Land auswählen',
    selectLanguage: 'Sprache',
    location: 'Standort',
    foodsRecommended: 'Empfohlene Lebensmittel nach ayurvedischen Richtlinien',
    items: 'Artikel',
  },
  fr: {
    ritucharya: 'ऋतुचर्या — Ritucharya',
    currentSeason: 'Saison actuelle',
    favourTastes: '✅ Favorisez ces saveurs',
    avoidTastes: '❌ Évitez ces saveurs',
    whatToEat: '🍽️ Quoi manger',
    seasonalFoods: '🌿 Aliments de saison',
    reduceOrAvoid: '🚫 Réduire ou éviter en',
    dietTips: 'Conseils diététiques',
    lifestyle: 'Mode de vie',
    sixRasas: 'षड्रस — 6 Rasas (Saveurs)',
    sixRasasSubtitle: 'Référence complète des six saveurs en Ayurveda',
    yearOverview: '📅 Les 6 Ritus — Vue annuelle',
    yearOverviewSubtitle: 'Appuyez sur une Ritu pour voir le guide',
    period: 'Période',
    agni: 'Agni (Feu digestif)',
    dosha: 'Dosha',
    eat: '✅ Manger',
    avoid: '❌ Éviter',
    now: 'MAINTENANT',
    favour: '✅ Favoriser',
    selectCountry: 'Sélectionner le pays',
    selectLanguage: 'Langue',
    location: 'Emplacement',
    foodsRecommended: 'Aliments recommandés selon les directives ayurvédiques',
    items: 'Articles',
  },
  ja: {
    ritucharya: 'ऋतुचर्या — リトゥチャリヤ',
    currentSeason: '現在の季節',
    favourTastes: '✅ この味を好む',
    avoidTastes: '❌ この味を避ける',
    whatToEat: '🍽️ 何を食べるか',
    seasonalFoods: '🌿 旬の食材',
    reduceOrAvoid: '🚫 控えるか避ける',
    dietTips: '食事のヒント',
    lifestyle: 'ライフスタイル',
    sixRasas: 'षड्रस — 六味',
    sixRasasSubtitle: 'アーユルヴェーダの6つの味の完全ガイド',
    yearOverview: '📅 6つのリトゥ — 年間概要',
    yearOverviewSubtitle: 'タップしてガイドを見る',
    period: '期間',
    agni: 'アグニ（消化の火）',
    dosha: 'ドーシャ',
    eat: '✅ 食べる',
    avoid: '❌ 避ける',
    now: '今',
    favour: '✅ 好む',
    selectCountry: '国を選択',
    selectLanguage: '言語',
    location: '場所',
    foodsRecommended: 'アーユルヴェーダに基づく推奨食品',
    items: 'アイテム',
  },
  zh: {
    ritucharya: 'ऋतुचर्या — 时令养生',
    currentSeason: '当前季节',
    favourTastes: '✅ 推荐这些味道',
    avoidTastes: '❌ 避免这些味道',
    whatToEat: '🍽️ 吃什么',
    seasonalFoods: '🌿 时令食物',
    reduceOrAvoid: '🚫 减少或避免',
    dietTips: '饮食建议',
    lifestyle: '生活方式',
    sixRasas: 'षड्रस — 六味',
    sixRasasSubtitle: '阿育吠陀六味完整参考',
    yearOverview: '📅 六季 — 全年概览',
    yearOverviewSubtitle: '点击查看完整指南',
    period: '时段',
    agni: '消化之火',
    dosha: '体质',
    eat: '✅ 吃',
    avoid: '❌ 避免',
    now: '当前',
    favour: '✅ 推荐',
    selectCountry: '选择国家',
    selectLanguage: '语言',
    location: '位置',
    foodsRecommended: '根据阿育吠陀指南推荐的食物',
    items: '项目',
  },
  ar: {
    ritucharya: 'ऋतुचर्या — ريتوتشاريا',
    currentSeason: 'الموسم الحالي',
    favourTastes: '✅ فضّل هذه الأذواق',
    avoidTastes: '❌ تجنب هذه الأذواق',
    whatToEat: '🍽️ ماذا تأكل',
    seasonalFoods: '🌿 أطعمة موسمية',
    reduceOrAvoid: '🚫 قلل أو تجنب',
    dietTips: 'نصائح غذائية',
    lifestyle: 'نمط الحياة',
    sixRasas: 'षड्रस — ٦ أذواق',
    sixRasasSubtitle: 'مرجع كامل للأذواق الستة في الأيورفيدا',
    yearOverview: '📅 المواسم الستة — نظرة سنوية',
    yearOverviewSubtitle: 'اضغط على أي موسم لرؤية الدليل',
    period: 'الفترة',
    agni: 'أجني (نار الهضم)',
    dosha: 'دوشا',
    eat: '✅ كُل',
    avoid: '❌ تجنب',
    now: 'الآن',
    favour: '✅ مُفضّل',
    selectCountry: 'اختر الدولة',
    selectLanguage: 'اللغة',
    location: 'الموقع',
    foodsRecommended: 'أطعمة موصى بها وفقاً لإرشادات الأيورفيدا',
    items: 'مواد',
  },
  ru: {
    ritucharya: 'ऋतुचर्या — Ритучарья',
    currentSeason: 'Текущий сезон',
    favourTastes: '✅ Предпочитайте эти вкусы',
    avoidTastes: '❌ Избегайте этих вкусов',
    whatToEat: '🍽️ Что есть',
    seasonalFoods: '🌿 Сезонные продукты',
    reduceOrAvoid: '🚫 Уменьшить или избегать',
    dietTips: 'Советы по питанию',
    lifestyle: 'Образ жизни',
    sixRasas: 'षड्रस — 6 вкусов (Расы)',
    sixRasasSubtitle: 'Полный справочник шести вкусов Аюрведы',
    yearOverview: '📅 Все 6 Риту — обзор года',
    yearOverviewSubtitle: 'Нажмите на любую Риту для подробностей',
    period: 'Период',
    agni: 'Агни (Пищеварительный огонь)',
    dosha: 'Доша',
    eat: '✅ Есть',
    avoid: '❌ Избегать',
    now: 'СЕЙЧАС',
    favour: '✅ Предпочтение',
    selectCountry: 'Выберите страну',
    selectLanguage: 'Язык',
    location: 'Местоположение',
    foodsRecommended: 'Продукты, рекомендуемые по принципам Аюрведы',
    items: 'Продукты',
  },
};

// ─── Country / Region system ──────────────────────────────────────────────────

export type HemisphereType = 'north' | 'south' | 'tropical';

export interface CountryInfo {
  code: string;     // ISO 2-letter
  name: string;
  nativeName: string;
  hemisphere: HemisphereType;
  defaultLang: LangKey;
}

export const COUNTRIES: CountryInfo[] = [
  // South Asia — North hemisphere, Indian Ritu cycle directly applies
  { code: 'IN', name: 'India', nativeName: 'भारत', hemisphere: 'north', defaultLang: 'hi' },
  { code: 'NP', name: 'Nepal', nativeName: 'नेपाल', hemisphere: 'north', defaultLang: 'ne' },
  { code: 'LK', name: 'Sri Lanka', nativeName: 'ශ්‍රී ලංකාව', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'BD', name: 'Bangladesh', nativeName: 'বাংলাদেশ', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'PK', name: 'Pakistan', nativeName: 'پاکستان', hemisphere: 'north', defaultLang: 'en' },
  { code: 'BT', name: 'Bhutan', nativeName: 'འབྲུག', hemisphere: 'north', defaultLang: 'en' },
  { code: 'MM', name: 'Myanmar', nativeName: 'မြန်မာ', hemisphere: 'tropical', defaultLang: 'en' },

  // Middle East & Central Asia
  { code: 'AE', name: 'UAE', nativeName: 'الإمارات', hemisphere: 'north', defaultLang: 'ar' },
  { code: 'SA', name: 'Saudi Arabia', nativeName: 'المملكة العربية السعودية', hemisphere: 'north', defaultLang: 'ar' },
  { code: 'QA', name: 'Qatar', nativeName: 'قطر', hemisphere: 'north', defaultLang: 'ar' },
  { code: 'KW', name: 'Kuwait', nativeName: 'الكويت', hemisphere: 'north', defaultLang: 'ar' },
  { code: 'OM', name: 'Oman', nativeName: 'عُمان', hemisphere: 'north', defaultLang: 'ar' },
  { code: 'BH', name: 'Bahrain', nativeName: 'البحرين', hemisphere: 'north', defaultLang: 'ar' },

  // Southeast Asia
  { code: 'SG', name: 'Singapore', nativeName: 'Singapore', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'MY', name: 'Malaysia', nativeName: 'Malaysia', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'TH', name: 'Thailand', nativeName: 'ไทย', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'ID', name: 'Indonesia', nativeName: 'Indonesia', hemisphere: 'tropical', defaultLang: 'en' },

  // East Asia — Northern hemisphere
  { code: 'JP', name: 'Japan', nativeName: '日本', hemisphere: 'north', defaultLang: 'ja' },
  { code: 'CN', name: 'China', nativeName: '中国', hemisphere: 'north', defaultLang: 'zh' },
  { code: 'KR', name: 'South Korea', nativeName: '한국', hemisphere: 'north', defaultLang: 'en' },

  // Europe — Northern hemisphere
  { code: 'GB', name: 'United Kingdom', nativeName: 'United Kingdom', hemisphere: 'north', defaultLang: 'en' },
  { code: 'DE', name: 'Germany', nativeName: 'Deutschland', hemisphere: 'north', defaultLang: 'de' },
  { code: 'FR', name: 'France', nativeName: 'France', hemisphere: 'north', defaultLang: 'fr' },
  { code: 'IT', name: 'Italy', nativeName: 'Italia', hemisphere: 'north', defaultLang: 'en' },
  { code: 'ES', name: 'Spain', nativeName: 'España', hemisphere: 'north', defaultLang: 'es' },
  { code: 'NL', name: 'Netherlands', nativeName: 'Nederland', hemisphere: 'north', defaultLang: 'en' },
  { code: 'RU', name: 'Russia', nativeName: 'Россия', hemisphere: 'north', defaultLang: 'ru' },

  // North America — Northern hemisphere
  { code: 'US', name: 'USA', nativeName: 'United States', hemisphere: 'north', defaultLang: 'en' },
  { code: 'CA', name: 'Canada', nativeName: 'Canada', hemisphere: 'north', defaultLang: 'en' },
  { code: 'MX', name: 'Mexico', nativeName: 'México', hemisphere: 'north', defaultLang: 'es' },

  // Southern hemisphere — Seasons are INVERTED
  { code: 'AU', name: 'Australia', nativeName: 'Australia', hemisphere: 'south', defaultLang: 'en' },
  { code: 'NZ', name: 'New Zealand', nativeName: 'New Zealand', hemisphere: 'south', defaultLang: 'en' },
  { code: 'ZA', name: 'South Africa', nativeName: 'South Africa', hemisphere: 'south', defaultLang: 'en' },
  { code: 'AR', name: 'Argentina', nativeName: 'Argentina', hemisphere: 'south', defaultLang: 'es' },
  { code: 'CL', name: 'Chile', nativeName: 'Chile', hemisphere: 'south', defaultLang: 'es' },
  { code: 'BR', name: 'Brazil', nativeName: 'Brasil', hemisphere: 'south', defaultLang: 'pt' },

  // Tropical / Equatorial
  { code: 'KE', name: 'Kenya', nativeName: 'Kenya', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'NG', name: 'Nigeria', nativeName: 'Nigeria', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'GH', name: 'Ghana', nativeName: 'Ghana', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'CO', name: 'Colombia', nativeName: 'Colombia', hemisphere: 'tropical', defaultLang: 'es' },
  { code: 'PH', name: 'Philippines', nativeName: 'Pilipinas', hemisphere: 'tropical', defaultLang: 'en' },
  { code: 'FJ', name: 'Fiji', nativeName: 'Fiji', hemisphere: 'south', defaultLang: 'en' },
];

// ─── 6 Rasas (Tastes) ─────────────────────────────────────────────────────────

export type RasaKey = 'madhura' | 'amla' | 'lavana' | 'katu' | 'tikta' | 'kashaya';

export interface Rasa {
  key: RasaKey;
  sanskrit: string;
  hindi: string;
  english: string;
  hindiTaste: string;
  elements: string;
  effect: string;
  examples: string[];
  color: string; // tailwind color for tags
}

export const RASAS: Record<RasaKey, Rasa> = {
  madhura: {
    key: 'madhura',
    sanskrit: 'मधुर',
    hindi: 'मीठा',
    english: 'Sweet',
    hindiTaste: 'मीठा',
    elements: 'पृथ्वी + जल (Earth + Water)',
    effect: 'Nourishing, grounding, builds tissue',
    examples: ['Ghee', 'Rice', 'Milk', 'Jaggery (Gud)', 'Wheat', 'Banana', 'Dates (Khajoor)', 'Sweet potato'],
    color: 'amber',
  },
  amla: {
    key: 'amla',
    sanskrit: 'अम्ल',
    hindi: 'खट्टा',
    english: 'Sour',
    hindiTaste: 'खट्टा',
    elements: 'पृथ्वी + अग्नि (Earth + Fire)',
    effect: 'Stimulates appetite, aids digestion',
    examples: ['Tomato', 'Tamarind (Imli)', 'Curd (Dahi)', 'Lemon (Nimbu)', 'Raw Mango', 'Vinegar', 'Amchur'],
    color: 'yellow',
  },
  lavana: {
    key: 'lavana',
    sanskrit: 'लवण',
    hindi: 'नमकीन',
    english: 'Salty',
    hindiTaste: 'नमकीन',
    elements: 'जल + अग्नि (Water + Fire)',
    effect: 'Retains moisture, softens tissues',
    examples: ['Rock salt (Sendha namak)', 'Sea salt', 'Black salt (Kala namak)', 'Pickles (Achaar)', 'Seaweed'],
    color: 'blue',
  },
  katu: {
    key: 'katu',
    sanskrit: 'कटु',
    hindi: 'तीखा',
    english: 'Pungent / Spicy',
    hindiTaste: 'तीखा',
    elements: 'अग्नि + वायु (Fire + Air)',
    effect: 'Burns toxins (Aam), stimulates metabolism',
    examples: ['Chilli (Mirch)', 'Ginger (Adrak)', 'Black pepper (Kali mirch)', 'Garlic (Lehsun)', 'Mustard (Rai)', 'Onion'],
    color: 'red',
  },
  tikta: {
    key: 'tikta',
    sanskrit: 'तिक्त',
    hindi: 'कड़वा',
    english: 'Bitter',
    hindiTaste: 'कड़वा',
    elements: 'वायु + आकाश (Air + Ether)',
    effect: 'Detoxifying, blood purifying, reduces Pitta',
    examples: ['Karela (Bitter gourd)', 'Neem', 'Methi (Fenugreek)', 'Turmeric (Haldi)', 'Aloe Vera', 'Coffee'],
    color: 'green',
  },
  kashaya: {
    key: 'kashaya',
    sanskrit: 'कषाय',
    hindi: 'कसैला',
    english: 'Astringent',
    hindiTaste: 'कसैला',
    elements: 'वायु + पृथ्वी (Air + Earth)',
    effect: 'Drying, tightening, absorbs excess moisture',
    examples: ['Amla fruit (Aanvla)', 'Unripe banana', 'Honey (Shahad)', 'Pomegranate (Anaar)', 'Green beans', 'Green tea', 'Jamun'],
    color: 'purple',
  },
};

export const RASA_LIST: Rasa[] = Object.values(RASAS);

// ─── 6 Ritus ──────────────────────────────────────────────────────────────────

export type RituKey = 'shishir' | 'vasant' | 'grishma' | 'varsha' | 'sharad' | 'hemant';
export type KaalKey = 'adaan' | 'visarga';

export interface Ritu {
  key: RituKey;
  sanskrit: string;
  hindi: string;
  english: string;
  kaal: KaalKey;
  kaalName: string;
  months: string;
  hinduMonths: string;
  approxGregorian: string;
  startMonth: number; // 1-indexed month for auto-detection
  endMonth: number;
  dominantDosha: string;
  agniStrength: string;
  favour: RasaKey[];
  avoid: RasaKey[];
  dietTips: string[];
  lifestyle: string[];
  foods: string[];
  icon: string; // emoji
}

export const RITUS: Record<RituKey, Ritu> = {
  shishir: {
    key: 'shishir',
    sanskrit: 'शिशिर',
    hindi: 'शिशिर ऋतु',
    english: 'Late Winter',
    kaal: 'visarga',
    kaalName: 'विसर्ग काल (Visarga Kaal — Daksinayan)',
    months: 'Magha – Phalguna',
    hinduMonths: 'माघ – फाल्गुन',
    approxGregorian: 'Mid-Jan – Mid-Mar',
    startMonth: 1,
    endMonth: 3,
    dominantDosha: 'Kapha accumulates',
    agniStrength: 'Strong — heavy food digests well',
    favour: ['madhura', 'amla', 'lavana'],
    avoid: ['katu', 'tikta', 'kashaya'],
    dietTips: [
      'Eat warm, heavy, oily, nourishing foods',
      'Include ghee, til (sesame), gur (jaggery)',
      'Drink warm water and milk',
      'Favor sweet, sour, salty tastes',
    ],
    lifestyle: [
      'Oil massage (Abhyanga) with sesame oil',
      'Exercise is beneficial — body is strong',
      'Avoid excess cold and wind exposure',
      'Warm clothing, sun exposure recommended',
    ],
    foods: ['Til (Sesame)', 'Gud (Jaggery)', 'Ghee', 'Warm milk', 'Urad dal', 'Dry fruits', 'Ginger tea', 'Sweet potatoes', 'Bajra roti'],
    icon: '❄️',
  },
  vasant: {
    key: 'vasant',
    sanskrit: 'वसंत',
    hindi: 'वसंत ऋतु',
    english: 'Spring',
    kaal: 'adaan',
    kaalName: 'आदान काल (Adaan Kaal — Uttarayan)',
    months: 'Chaitra – Vaishakha',
    hinduMonths: 'चैत्र – वैशाख',
    approxGregorian: 'Mid-Mar – Mid-May',
    startMonth: 3,
    endMonth: 5,
    dominantDosha: 'Kapha aggravated (melts with warmth)',
    agniStrength: 'Moderate — light food preferred',
    favour: ['katu', 'tikta', 'kashaya'],
    avoid: ['madhura', 'amla', 'lavana'],
    dietTips: [
      'Eat light, dry, warm foods',
      'Reduce sweets, oily, heavy foods',
      'Include honey, barley, moong dal',
      'Favor pungent, bitter, astringent tastes',
    ],
    lifestyle: [
      'Exercise and Yoga highly recommended',
      'Dry massage (Udvartana) with herbal powders',
      'Avoid daytime sleep — increases Kapha',
      'Use warm water, not cold drinks',
    ],
    foods: ['Honey (Shahad)', 'Barley (Jau)', 'Moong dal', 'Old rice', 'Ginger', 'Black pepper', 'Methi', 'Karela', 'Wheat chapati'],
    icon: '🌸',
  },
  grishma: {
    key: 'grishma',
    sanskrit: 'ग्रीष्म',
    hindi: 'ग्रीष्म ऋतु',
    english: 'Summer',
    kaal: 'adaan',
    kaalName: 'आदान काल (Adaan Kaal — Uttarayan)',
    months: 'Jyeshtha – Ashadha',
    hinduMonths: 'ज्येष्ठ – आषाढ़',
    approxGregorian: 'Mid-May – Mid-Jul',
    startMonth: 5,
    endMonth: 7,
    dominantDosha: 'Vata starts accumulating, Kapha pacified',
    agniStrength: 'Weak — eat light, cool foods',
    favour: ['madhura'],
    avoid: ['katu', 'amla', 'lavana'],
    dietTips: [
      'Eat sweet, light, liquid, cool foods',
      'Drink plenty of water, buttermilk, sherbets',
      'Avoid excess salty, sour, pungent food',
      'Rice, milk, coconut water are ideal',
    ],
    lifestyle: [
      'Stay in cool places, avoid excess sun',
      'Apply sandalwood (Chandan) paste',
      'Light exercise only — body is weak',
      'Daytime nap allowed in this Ritu',
      'Moonlight walks beneficial',
    ],
    foods: ['Sattu drink', 'Buttermilk (Chaanch)', 'Coconut water', 'Watermelon', 'Cucumber', 'Mint (Pudina)', 'Rice', 'Kheer', 'Mango (ripe)'],
    icon: '☀️',
  },
  varsha: {
    key: 'varsha',
    sanskrit: 'वर्षा',
    hindi: 'वर्षा ऋतु',
    english: 'Monsoon / Rainy',
    kaal: 'visarga',
    kaalName: 'विसर्ग काल (Visarga Kaal — Daksinayan)',
    months: 'Shravana – Bhadrapada',
    hinduMonths: 'श्रावण – भाद्रपद',
    approxGregorian: 'Mid-Jul – Mid-Sep',
    startMonth: 7,
    endMonth: 9,
    dominantDosha: 'Vata aggravated, Pitta accumulates',
    agniStrength: 'Weakest — digestion very slow',
    favour: ['amla', 'lavana', 'madhura'],
    avoid: ['katu', 'tikta', 'kashaya'],
    dietTips: [
      'Eat warm, light, freshly cooked food',
      'Include sour and salty tastes',
      'Add ginger, lemon to meals',
      'Avoid raw salads, leafy greens, heavy food',
      'Avoid stale / leftover food',
    ],
    lifestyle: [
      'Boil drinking water',
      'Avoid getting wet in rain for too long',
      'Use medicated oils if needed',
      'Keep surroundings clean and dry',
      'Avoid daytime sleep',
    ],
    foods: ['Old rice', 'Moong dal', 'Ginger (Adrak)', 'Lemon water', 'Honey', 'Til oil', 'Light soups', 'Warm dals', 'Khichdi'],
    icon: '🌧️',
  },
  sharad: {
    key: 'sharad',
    sanskrit: 'शरद',
    hindi: 'शरद ऋतु',
    english: 'Autumn',
    kaal: 'visarga',
    kaalName: 'विसर्ग काल (Visarga Kaal — Daksinayan)',
    months: 'Ashwin – Kartika',
    hinduMonths: 'अश्विन – कार्तिक',
    approxGregorian: 'Mid-Sep – Mid-Nov',
    startMonth: 9,
    endMonth: 11,
    dominantDosha: 'Pitta aggravated (summer heat releases)',
    agniStrength: 'Moderate — improving gradually',
    favour: ['madhura', 'tikta', 'kashaya'],
    avoid: ['amla', 'lavana', 'katu'],
    dietTips: [
      'Eat sweet, bitter, astringent foods',
      'Avoid excess sour, salty, spicy',
      'Include Amla fruit, pomegranate, bitter gourd',
      'Ghee processed with bitter herbs is ideal',
      'Eat light, easily digestible food',
    ],
    lifestyle: [
      'Virechana (mild purgation) recommended',
      'Moonlight exposure beneficial',
      'Apply sandalwood, camphor',
      'Wear light, white clothes and flowers',
      'Blood donation / Raktamokshana in this season',
    ],
    foods: ['Amla fruit', 'Pomegranate (Anaar)', 'Ghee (bitter-herb processed)', 'Rice', 'Green gram', 'Sugar candy (Mishri)', 'Honey water', 'Patola (pointed gourd)'],
    icon: '🍂',
  },
  hemant: {
    key: 'hemant',
    sanskrit: 'हेमंत',
    hindi: 'हेमंत ऋतु',
    english: 'Early Winter',
    kaal: 'visarga',
    kaalName: 'विसर्ग काल (Visarga Kaal — Daksinayan)',
    months: 'Margashirsha – Pausha',
    hinduMonths: 'मार्गशीर्ष – पौष',
    approxGregorian: 'Mid-Nov – Mid-Jan',
    startMonth: 11,
    endMonth: 1,
    dominantDosha: 'Kapha starts accumulating, Pitta balanced',
    agniStrength: 'Strongest — can digest heavy food',
    favour: ['madhura', 'amla', 'lavana'],
    avoid: ['katu', 'tikta', 'kashaya'],
    dietTips: [
      'Eat heavy, warm, oily, nourishing foods',
      'Include sugarcane products, milk, ghee',
      'Favor sweet, sour, salty tastes',
      'Heavy meals are well-digested',
      'Do not skip meals — strong Agni needs fuel',
    ],
    lifestyle: [
      'Oil massage (Abhyanga) daily',
      'Heavy exercise, wrestling, swimming',
      'Warm clothing essential',
      'Apply Aguru, Kumkum on body',
      'Enjoy warm sunlight',
    ],
    foods: ['Til (Sesame)', 'Gud (Jaggery)', 'Til ladoo', 'Ghee', 'Warm milk', 'Sugarcane juice', 'New rice', 'Urad dal', 'Dry fruits', 'Badam (Almond)'],
    icon: '🥶',
  },
};

// Ordered by natural year flow
export const RITU_ORDER: RituKey[] = ['shishir', 'vasant', 'grishma', 'varsha', 'sharad', 'hemant'];

// ─── 2 Kaals (Solstice-based) ─────────────────────────────────────────────────

export interface Kaal {
  key: KaalKey;
  sanskrit: string;
  hindi: string;
  english: string;
  description: string;
  ritus: RituKey[];
  color: string;
}

export const KAALS: Record<KaalKey, Kaal> = {
  adaan: {
    key: 'adaan',
    sanskrit: 'आदान काल',
    hindi: 'आदान काल (उत्तरायण)',
    english: 'Northern Solstice Period',
    description: 'Sun moves north — takes away strength. Body weakens. Agni decreases.',
    ritus: ['shishir', 'vasant', 'grishma'],
    color: 'orange',
  },
  visarga: {
    key: 'visarga',
    sanskrit: 'विसर्ग काल',
    hindi: 'विसर्ग काल (दक्षिणायन)',
    english: 'Southern Solstice Period',
    description: 'Sun moves south — gives back strength. Body strengthens. Moon nourishes.',
    ritus: ['varsha', 'sharad', 'hemant'],
    color: 'sky',
  },
};

// ─── Auto-detect current Ritu (hemisphere-aware) ──────────────────────────────

/**
 * Northern hemisphere: standard Indian Ritu cycle.
 * Southern hemisphere: 6-month offset (inverted seasons).
 * Tropical: simplified 2-phase mapping (hot/dry vs warm/wet).
 */
export function getCurrentRitu(hemisphere: HemisphereType = 'north'): RituKey {
  const month = new Date().getMonth() + 1; // 1-indexed
  const day = new Date().getDate();

  // For southern hemisphere, shift by 6 months
  let effectiveMonth = month;
  let effectiveDay = day;
  if (hemisphere === 'south') {
    effectiveMonth = ((month + 5) % 12) + 1; // shift 6 months forward
  }

  if (hemisphere === 'tropical') {
    // Tropical: broadly 2 main seasons mapped to closest Ritu
    // Nov–Feb: cooler/dry → Hemant-like
    // Mar–May: hot/pre-monsoon → Grishma-like
    // Jun–Sep: wet/monsoon → Varsha-like
    // Oct–Nov: post-monsoon → Sharad-like
    if (effectiveMonth >= 11 || effectiveMonth <= 2) return 'hemant';
    if (effectiveMonth >= 3 && effectiveMonth <= 5) return 'grishma';
    if (effectiveMonth >= 6 && effectiveMonth <= 9) return 'varsha';
    return 'sharad';
  }

  // Standard Indian Ritu cycle (approximate mid-month boundaries)
  if ((effectiveMonth === 1 && effectiveDay >= 14) || effectiveMonth === 2 || (effectiveMonth === 3 && effectiveDay < 14)) return 'shishir';
  if ((effectiveMonth === 3 && effectiveDay >= 14) || effectiveMonth === 4 || (effectiveMonth === 5 && effectiveDay < 14)) return 'vasant';
  if ((effectiveMonth === 5 && effectiveDay >= 14) || effectiveMonth === 6 || (effectiveMonth === 7 && effectiveDay < 14)) return 'grishma';
  if ((effectiveMonth === 7 && effectiveDay >= 14) || effectiveMonth === 8 || (effectiveMonth === 9 && effectiveDay < 14)) return 'varsha';
  if ((effectiveMonth === 9 && effectiveDay >= 14) || effectiveMonth === 10 || (effectiveMonth === 11 && effectiveDay < 14)) return 'sharad';
  // hemant: mid-Nov – mid-Jan
  return 'hemant';
}

export function getCurrentKaal(hemisphere: HemisphereType = 'north'): KaalKey {
  const ritu = getCurrentRitu(hemisphere);
  return RITUS[ritu].kaal;
}

// ─── Country helper ───────────────────────────────────────────────────────────

export function getCountryByCode(code: string): CountryInfo | undefined {
  return COUNTRIES.find(c => c.code === code);
}
