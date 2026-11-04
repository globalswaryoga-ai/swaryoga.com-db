/**
 * Cultural Context & Lifestyle Adaptation Engine
 * 
 * Maps local foods, climates, daily routines, and relatable metaphors
 * so that Shiva Swarodaya teachings remain 100% sacred,
 * while daily examples touch the student's personal heart and culture.
 */

export interface CulturalProfile {
  languageName: string;
  nativeName: string;
  stapleFoods: string[];
  digestiveHeavyFood: string;
  morningRoutine: string;
  climateContext: string;
  dailyMetaphor: string;
  honorificLevel: string;
}

export const CULTURAL_PROFILES: Record<string, CulturalProfile> = {
  mr: {
    languageName: 'Marathi',
    nativeName: 'मराठी',
    stapleFoods: ['भाकरी', 'वरण-भात', 'पोळी', 'तूप-खिचडी'],
    digestiveHeavyFood: 'गरम पुरणपोळी आणि साजूक तूप',
    morningRoutine: 'सकाळचा वाफाळलेला चहा आणि प्राणायाम',
    climateContext: 'दुपारचे कडक ऊन आणि थंडगार पहाट',
    dailyMetaphor: 'लोकल ट्रेनची गर्दी किंवा शेतातील शांत सकाळ',
    honorificLevel: 'आदरार्थी आणि आपुलकीचे (तुम्ही, आपण)',
  },
  hi: {
    languageName: 'Hindi',
    nativeName: 'हिन्दी',
    stapleFoods: ['रोटी', 'दाल-चावल', 'खिचड़ी', 'परांठा'],
    digestiveHeavyFood: 'देसी घी के गरम परांठे और हलवा',
    morningRoutine: 'सुबह की गुनगुनी धूप और अदरक वाली चाय',
    climateContext: 'गर्मी की दोपहर या सर्दियों की ठंडी सुबह',
    dailyMetaphor: 'घर का शांत माहौल और परिवार के साथ नाश्ता',
    honorificLevel: 'आदरपूर्ण और आत्मीय (आप)',
  },
  en: {
    languageName: 'English (Global)',
    nativeName: 'English',
    stapleFoods: ['Oatmeal', 'Fresh sourdough', 'Salads', 'Steamed rice'],
    digestiveHeavyFood: 'A hearty Sunday roast or heavy pasta dinner',
    morningRoutine: 'Morning coffee or warm lemon water before checking emails',
    climateContext: 'Chilly autumn mornings or hot summer afternoons',
    dailyMetaphor: 'Rush-hour highway traffic or screen fatigue at work',
    honorificLevel: 'Warm, direct, respectful mentor tone',
  },
  ja: {
    languageName: 'Japanese',
    nativeName: '日本語',
    stapleFoods: ['ご飯 (Steamed Rice)', '味噌汁 (Miso Soup)', '豆腐 (Tofu)', '緑茶 (Green Tea)'],
    digestiveHeavyFood: '熱々のラーメンや天ぷら (Rich ramen or tempura)',
    morningRoutine: '静かな朝のお茶と呼吸 (Quiet morning tea and breath observation)',
    climateContext: '四季折々の風と桜の季節 (Seasonal winds and mindful temperature changes)',
    dailyMetaphor: '朝の通勤電車での緊張と、畳の上での深い静寂 (Morning commute vs tatami stillness)',
    honorificLevel: '丁寧語・温かい師匠の語り口 (Teinei-go with deep gentle compassion)',
  },
  es: {
    languageName: 'Spanish',
    nativeName: 'Español',
    stapleFoods: ['Arroz', 'Tortilla de patatas', 'Legumbres', 'Aceite de oliva'],
    digestiveHeavyFood: 'Una paella abundante o un guiso pesado de mediodía',
    morningRoutine: 'Un café tranquilo por la mañana con la brisa fresca',
    climateContext: 'El calor del mediodía y el aire fresco del atardecer',
    dailyMetaphor: 'El bullicio de la calle versus la paz de la sobremesa',
    honorificLevel: 'Cercano, cálido y respetuoso (Usted/Tú respetuoso)',
  },
  de: {
    languageName: 'German',
    nativeName: 'Deutsch',
    stapleFoods: ['Vollkornbrot', 'Dinkel', 'Kartoffeln', 'Kräutertee'],
    digestiveHeavyFood: 'Ein schweres Abendessen mit deftigen Beilagen',
    morningRoutine: 'Ein stiller Moment mit Kräutertee vor dem Arbeitsbeginn',
    climateContext: 'Frische Waldluft am Morgen und kühle Tage',
    dailyMetaphor: 'Der strukturierte Arbeitstag und der Wunsch nach innerer Ruhe',
    honorificLevel: 'Klar, wertschätzend und bodenständig (Sie / warmherzig)',
  },
  fr: {
    languageName: 'French',
    nativeName: 'Français',
    stapleFoods: ['Pain artisanal', 'Légumes de saison', 'Soupes', 'Tisanes'],
    digestiveHeavyFood: 'Un repas copieux du dimanche midi avec fromage',
    morningRoutine: 'Un moment de calme avec une tisane au réveil',
    climateContext: 'La douceur du matin et les variations saisonnières',
    dailyMetaphor: 'Le rythme effréné du quotidien face à la sérénité intérieure',
    honorificLevel: 'Élégant, bienveillant et intime (Vous chaleureux)',
  },
  gu: {
    languageName: 'Gujarati',
    nativeName: 'ગુજરાતી',
    stapleFoods: ['ખીચડી-કઢી', 'રોટલી', 'શાક', 'દાળ-ભાત'],
    digestiveHeavyFood: 'ઘીમાં લથબથ મોહનથાળ અને ઊંધિયું',
    morningRoutine: 'સવારનો મસાલા ચા અને ઈષ્ટદેવનું સ્મરણ',
    climateContext: 'બપોરની ગરમી અને સાંજની શીતળ હવા',
    dailyMetaphor: 'વેપાર-ધંધાની દોડધામ વચ્ચે મનની શાંતિ',
    honorificLevel: 'ખૂબ જ સ્નેહભર્યું અને આદરપૂર્વક (તમે)',
  },
  ta: {
    languageName: 'Tamil',
    nativeName: 'தமிழ்',
    stapleFoods: ['இட்லி', 'சாம்பார் சாதம்', 'ரசம்', 'கஞ்சி'],
    digestiveHeavyFood: 'நெய் பொங்கல் மற்றும் அசைவ/கனமான உணவு',
    morningRoutine: 'காலை பில்டர் காபி மற்றும் பிராணாயாம தியானம்',
    climateContext: 'உச்சக்கட்ட வெயில் மற்றும் விடியற்காலை குளிர் காற்று',
    dailyMetaphor: 'கோயில் பிரகாரத்தின் அமைதி மற்றும் அன்றாட வேலைப்பளு',
    honorificLevel: 'பண்பான மற்றும் ஆன்மீக வாஞ்சையுள்ள நடை (நீங்கள்)',
  },
};

export function getCulturalProfile(languageCode: string): CulturalProfile {
  return CULTURAL_PROFILES[languageCode.toLowerCase()] || CULTURAL_PROFILES.en;
}

/**
 * Injects cultural context instructions into the synthesis prompt
 */
export function getCulturalPromptGuidance(languageCode: string): string {
  const profile = getCulturalProfile(languageCode);
  return `[CULTURAL & LIFESTYLE ADAPTATION]
Target Culture: ${profile.languageName} (${profile.nativeName})
1. Common Local Foods to reference: ${profile.stapleFoods.join(', ')}.
2. Heavy Food reference (for digestion & Sun Nadi examples): "${profile.digestiveHeavyFood}".
3. Morning Routine reference: "${profile.morningRoutine}".
4. Relatable Daily Metaphor: "${profile.dailyMetaphor}".
5. Politeness / Honorific: ${profile.honorificLevel}.
DO NOT alter any spiritual Swar Yoga principle. Only adapt the physical lifestyle examples so local students feel the example directly in their daily life.`;
}

