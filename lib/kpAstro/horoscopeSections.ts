// Configurable list of report sections for the AI-generated horoscope reading.
// Adding a new section later is just appending one entry here — nothing else
// needs to change, since the prompt builder in buildChartContext.ts iterates
// this array to construct the section headers it asks the AI to write.
export interface HoroscopeSection {
  key: string;
  title: string; // English label, shown in the admin UI and used in the AI prompt
  houses: number[]; // houses relevant to this section, used to pull supporting rule-book context
  notes?: string; // extra guidance injected into the prompt for this section
}

export const horoscopeSections: HoroscopeSection[] = [
  { key: 'swabhav', title: 'Swabhav (Nature & Temperament)', houses: [1], notes: 'Cover nature, emotions, food habits, honesty/truthfulness, and general disposition.' },
  { key: 'education', title: 'Education (Higher Education, PhD, Research/Science field)', houses: [4, 9], notes: 'Cover schooling, higher education, suitability for PhD/research/scientist path, and the field of study indicated.' },
  { key: 'wealth', title: 'Wealth', houses: [2, 6, 11] },
  { key: 'career', title: 'Job / Business', houses: [2, 6, 10, 11], notes: 'State whether job or business is more favorable.' },
  { key: 'marriagePeriod', title: 'Marriage Period (Timing)', houses: [7], notes: 'Use the Mahadasha/Antardasha context to indicate likely timing.' },
  { key: 'marriageLife', title: 'Marriage Life (Quality)', houses: [2, 7], notes: 'Cover compatibility, harmony, and quality of married life.' },
  { key: 'children', title: 'Children', houses: [5], notes: 'Cover number/timing of children and their wellbeing, as indicated.' },
  { key: 'property', title: 'Self Property (Land, Home, Farmhouse)', houses: [4] },
  { key: 'vehicles', title: 'Vehicles (2-Wheeler, 4-Wheeler, Yacht, Plane)', houses: [4] },
  { key: 'affairs', title: 'Affairs / Extra-marital Affairs', houses: [5, 7, 12], notes: 'Only mention if the chart data clearly indicates affliction; otherwise state no significant indication.' },
  { key: 'loansDebts', title: 'Loans & Debts', houses: [6, 8, 12] },
  { key: 'healthInsurance', title: 'Health & Medical Insurance', houses: [6, 8] },
  { key: 'spiritualPath', title: 'Spiritual Path', houses: [9, 12] },
  { key: 'shareMarket', title: 'Share Market (Yes/No)', houses: [2, 5, 11], notes: 'Give a clear yes/no/cautious verdict on suitability for stock market speculation.' },
  { key: 'sadhana', title: 'Sadhana (Recommended Spiritual Practice)', houses: [9, 12], notes: 'Recommend a specific practice (mantra, meditation, yoga) suited to the weak/afflicted areas of the chart.' },
  { key: 'gemstone', title: 'Gemstone (If Needed)', houses: [], notes: 'Only recommend a gemstone if a planet is clearly weak/afflicted; otherwise state none is required. Use the supplied gemstone reference table — do not invent stones.' },
  { key: 'doshaRemedy', title: 'Dosha & Remedy', houses: [], notes: 'Only discuss doshas flagged as present in the chart data; use the supplied remedy reference text.' },
];
