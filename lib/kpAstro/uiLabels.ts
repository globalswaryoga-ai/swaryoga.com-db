// Hindi/English UI label dictionary for the interactive Astrologer
// Workspace (chart tables, toggles, headers) — distinct from
// lib/kpAstro/languages.ts, which covers the many languages the AI-generated
// final-prediction reports can be written in. This only covers the small
// set of structural UI strings; planet/sign/star names (e.g. "Punarvasu",
// "Aries") are left as-is in both languages, matching standard KP software
// convention of keeping technical terms untranslated.

export type UiLang = 'en' | 'hi';

const DICTIONARY: Record<string, { en: string; hi: string }> = {
  houses: { en: 'Houses', hi: 'भाव' },
  planets: { en: 'Planets', hi: 'ग्रह' },
  house: { en: 'House', hi: 'भाव' },
  planet: { en: 'Planet', hi: 'ग्रह' },
  sign: { en: 'Sign', hi: 'राशि' },
  position: { en: 'Position', hi: 'स्थिति' },
  star: { en: 'Star', hi: 'नक्षत्र' },
  signLord: { en: 'Sign Lord', hi: 'राशि स्वामी' },
  starLord: { en: 'Star Lord', hi: 'नक्षत्र स्वामी' },
  subLord: { en: 'Sub Lord', hi: 'उप स्वामी' },
  occupants: { en: 'Occupants', hi: 'स्थित ग्रह' },
  occupies: { en: 'Occupies', hi: 'स्थित भाव' },
  owns: { en: 'Owns', hi: 'स्वामित्व' },
  drishti: { en: 'Drishti', hi: 'दृष्टि' },
  subLordSignifies: { en: 'Sub Lord Signifies', hi: 'उप स्वामी संकेत' },
  nature: { en: 'Nature', hi: 'स्वभाव' },
  benefic: { en: 'Benefic', hi: 'शुभ' },
  malefic: { en: 'Malefic', hi: 'अशुभ' },
  neutral: { en: 'Neutral', hi: 'सम' },
  housesAndPlanets: { en: 'Houses & Planets', hi: 'भाव और ग्रह' },
  planetaryAspects: { en: 'Planetary Aspects', hi: 'ग्रह दृष्टि संबंध' },
  significationStrengthTitle: { en: 'Planet Signification and Strength Table', hi: 'ग्रह कारकत्व और शक्ति तालिका' },
  selectHouse: { en: 'Select House', hi: 'भाव चुनें' },
  starLordCol: { en: 'Star Lord', hi: 'नक्षत्र स्वामी' },
  subLordCol: { en: 'Sub Lord', hi: 'उप स्वामी' },
  conjunctionLords: { en: 'Conjunction Lords', hi: 'युति स्वामी' },
  oppositionLords: { en: 'Opposition Lords', hi: 'प्रतियुति स्वामी' },
  self: { en: 'Self', hi: 'स्वयं' },
  dep: { en: 'Dep', hi: 'स्थित' },
  own: { en: 'Own', hi: 'स्वामित्व' },
  conjunction: { en: 'Conjunction', hi: 'युति' },
  semiSextile: { en: 'Semi-sextile', hi: 'अर्ध-षष्टक' },
  semiSquare: { en: 'Semi-square', hi: 'अर्ध-चतुष्कोण' },
  sextile: { en: 'Sextile', hi: 'षष्टक' },
  square: { en: 'Square', hi: 'चतुष्कोण' },
  trine: { en: 'Trine', hi: 'त्रिकोण' },
  sesquisquare: { en: 'Sesquisquare', hi: 'सवाया चतुष्कोण' },
  quincunx: { en: 'Quincunx', hi: 'पंचषट्क' },
  opposition: { en: 'Opposition', hi: 'प्रतियुति' },
  abcdSignificators: { en: 'ABCD Significators', hi: 'एबीसीडी कारक' },
  bhavAnalysis: { en: '12 Bhav Analysis', hi: '12 भाव विश्लेषण' },
  north: { en: 'North', hi: 'उत्तर' },
  south: { en: 'South', hi: 'दक्षिण' },
  bhav: { en: 'Bhav', hi: 'भाव' },
  noHouseData: { en: 'No house data found.', hi: 'कोई भाव डेटा नहीं मिला।' },
  noPlanetData: { en: 'No planet data found.', hi: 'कोई ग्रह डेटा नहीं मिला।' },
  noSignificatorHouse: { en: 'No planets signify this house.', hi: 'इस भाव के लिए कोई ग्रह कारक नहीं है।' },
};

export function t(key: keyof typeof DICTIONARY, lang: UiLang): string {
  return DICTIONARY[key]?.[lang] ?? DICTIONARY[key]?.en ?? String(key);
}
