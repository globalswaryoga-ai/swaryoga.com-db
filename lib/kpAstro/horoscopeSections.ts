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
  { key: 'swabhav', title: 'Swabhav (Nature & Temperament)', houses: [1, 3], notes: 'Cover nature, emotions, mindset, food habits, honesty/truthfulness, and general disposition.' },
  { key: 'schoolEducation', title: 'School Education', houses: [4], notes: 'Cover primary and secondary schooling: continuity, interruptions, performance, and favorable/unfavorable school-age periods (4th house; 3rd supports effort, 8th indicates breaks).' },
  { key: 'collegeEducation', title: 'College Education (Graduation)', houses: [4, 9, 11], notes: 'Cover graduation/degree studies: success in exams (11th), stream suitability, and completion vs interruption.' },
  { key: 'higherEducation', title: 'Higher Education (PG, PhD, Research)', houses: [9, 11], notes: 'Cover post-graduation, PhD/research/scientist path, foreign education (9th+12th connection), and the field of study indicated.' },
  { key: 'wealth', title: 'Wealth & Finance', houses: [2, 6, 11] },
  { key: 'career', title: 'Job / Business / Profession', houses: [2, 6, 10, 11], notes: 'State clearly whether job (service) or business (independent) is more favorable — 6th strong favors service, 7th+10th favor business. Name the profession fields indicated.' },
  { key: 'marriagePeriod', title: 'Marriage Period (Timing)', houses: [2, 7, 11], notes: 'Use the Mahadasha/Antardasha context to indicate likely timing. Denial/delay houses are 1, 6, 10.' },
  { key: 'marriageLife', title: 'Marriage Life (Quality)', houses: [2, 7], notes: 'Cover compatibility, harmony, and quality of married life.' },
  { key: 'children', title: 'Children', houses: [2, 5, 11], notes: 'Cover number/timing of children and their wellbeing, as indicated. Denial houses are 1, 4, 10.' },
  { key: 'health', title: 'Health', houses: [1, 6, 8, 12], notes: 'Cover general vitality (1st), disease tendencies (6th), accidents/chronic issues (8th), and hospitalization (12th). Mention preventive care in plain language; never predict death.' },
  { key: 'property', title: 'Buy Home / Land / Property', houses: [4, 11, 12], notes: 'Cover purchase of house, land, or farmhouse: 4th (property) with 11th (fulfillment) and 12th (investment outflow) supports buying; 3rd/5th/10th indicate selling instead.' },
  { key: 'vehicles', title: 'Buy Vehicle (2-Wheeler, 4-Wheeler)', houses: [4, 11], notes: 'Cover vehicle purchase timing and comfort from vehicles.' },
  { key: 'insurance', title: 'Insurance (Policies, Claims, Maturity)', houses: [6, 8, 11], notes: 'Cover suitability of insurance, claim/maturity benefits (8th = others\' money, 11th = gains), and periods favorable for taking policies.' },
  { key: 'shareMarket', title: 'Share Market (Yes/No)', houses: [2, 5, 8, 11], notes: 'Give a clear yes/no/cautious verdict on suitability for stock market speculation — 5th (speculation) with 2nd/11th supports gains; 8th/12th strong indicates losses, advise avoidance.' },
  { key: 'travelling', title: 'Travelling (Short, Long & Foreign)', houses: [3, 9, 12], notes: 'Cover short journeys (3rd), long journeys/pilgrimages (9th), and foreign travel or settlement (12th with 9th). Give favorable travel periods from the dasha context.' },
  { key: 'affairs', title: 'Affairs / Extra-marital Affairs', houses: [5, 7, 12], notes: 'Only mention if the chart data clearly indicates affliction; otherwise state no significant indication.' },
  { key: 'loansDebts', title: 'Loans & Debts', houses: [6, 8, 12] },
  { key: 'spiritualPath', title: 'Spiritual Path', houses: [9, 12] },
  { key: 'sadhana', title: 'Sadhana (Recommended Spiritual Practice)', houses: [9, 12], notes: 'Recommend a specific practice (mantra, meditation, yoga) suited to the weak/afflicted areas of the chart.' },
  { key: 'gemstone', title: 'Gemstone (If Needed)', houses: [], notes: 'Only recommend a gemstone if a planet is clearly weak/afflicted; otherwise state none is required. Use the supplied gemstone reference table — do not invent stones.' },
  { key: 'doshaRemedy', title: 'Dosha & Remedy', houses: [], notes: 'Only discuss doshas flagged as present in the chart data; use the supplied remedy reference text.' },
  { key: 'dosDonts', title: "Do's & Don'ts", houses: [], notes: 'Close with two short bullet lists: DO (practices, colors, directions, favorable weekdays/periods drawn from strong benefic indications) and AVOID (activities/risks tied to afflicted houses and planets). Keep each bullet practical and specific to this chart.' },
];
