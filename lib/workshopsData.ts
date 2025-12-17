export type WorkshopOverview = {
  id: number;
  name: string;
  slug: string;
  image: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  mode?: string[];
  language?: string[];
  currency?: string[];
  batches?: { id: string; startDate: string; mode: string; language: string; status: 'open' | 'closed'; price: number; currency: string }[];
};

// ============================================================================
// WORKSHOP CATALOG - Dynamically generated from .env.workshop
// ============================================================================
// This catalog is the source of truth for workshop metadata
// Schedules are loaded from .env.workshop via API

// Workshop metadata (displayed on main pages and catalog)
const WORKSHOP_METADATA: Record<string, Omit<WorkshopOverview, 'id'>> = {
  'swar-yoga-basic': {
    name: 'Swar Yoga Basic',
    slug: 'swar-yoga-basic',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    description: 'Foundation of Swar Yoga practice with breathing techniques',
    duration: '3 days',
    level: 'Beginner',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'yogasana-sadhana': {
    name: 'Yogasana & Sadhana',
    slug: 'yogasana-sadhana',
    image: 'https://images.pexels.com/photos/3807514/pexels-photo-3807514.jpeg',
    description: 'Complete asana and spiritual practice for holistic health (recorded)',
    duration: '30 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Recorded'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-level-1': {
    name: 'Swar Yoga Level-1',
    slug: 'swar-yoga-level-1',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    description: 'First level comprehensive Swar Yoga training',
    duration: '15 days',
    level: 'Beginner',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-level-3': {
    name: 'Swar Yoga Level-3',
    slug: 'swar-yoga-level-3',
    image: 'https://images.pexels.com/photos/3807516/pexels-photo-3807516.jpeg',
    description: 'Level-3 advanced meditation and wisdom',
    duration: '10 days',
    level: 'Advanced',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-level-4': {
    name: 'Swar Yoga Level-4',
    slug: 'swar-yoga-level-4',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    description: 'Ultimate self-discovery and spiritual transformation',
    duration: '42 days',
    level: 'Advanced',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'weight-loss-96days': {
    name: '96 Days Weight Loss Program',
    slug: 'weight-loss-96days',
    image: 'https://images.pexels.com/photos/1624365/pexels-photo-1624365.jpeg',
    description: 'Transform your body through Swar Yoga - 96 days comprehensive program',
    duration: '96 days',
    level: 'Intermediate',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'meditation-42days': {
    name: '42 Days Meditation Program',
    slug: 'meditation-42days',
    image: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg',
    description: 'Deep meditation and mindfulness training - 42 days',
    duration: '42 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'amrut-aahar-42days': {
    name: '42 Days Amrut Aahar Program',
    slug: 'amrut-aahar-42days',
    image: 'https://images.pexels.com/photos/3807507/pexels-photo-3807507.jpeg',
    description: 'Complete natural diet and nutrition guidance - 42 days',
    duration: '42 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'bandhan-mukti': {
    name: 'Bandhan Mukti',
    slug: 'bandhan-mukti',
    image: 'https://images.pexels.com/photos/3807519/pexels-photo-3807519.jpeg',
    description: 'Liberation from limitations through Swar Yoga practice',
    duration: '10 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-level-2': {
    name: 'Swar Yoga Level-2',
    slug: 'swar-yoga-level-2',
    image: 'https://images.pexels.com/photos/3873033/pexels-photo-3873033.jpeg',
    description: 'Advanced Swar Yoga for wealth creation and prosperity',
    duration: '14 days',
    level: 'Intermediate',
    category: 'Wealth',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-businessman': {
    name: 'Swar Yoga for Businessman',
    slug: 'swar-yoga-businessman',
    image: 'https://images.pexels.com/photos/3807520/pexels-photo-3807520.jpeg',
    description: 'Business opportunity and personal development through Swar Yoga (2 sessions/week)',
    duration: '10 weeks',
    level: 'Intermediate',
    category: 'Wealth',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'corporate-swaryoga': {
    name: 'Corporate Swaryoga',
    slug: 'corporate-swaryoga',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    description: 'Stress management and productivity for corporate professionals (2 sessions/week)',
    duration: '10 weeks',
    level: 'Intermediate',
    category: 'Wealth',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'pre-pregnancy-planning': {
    name: 'Pre Pregnancy Planning Program',
    slug: 'pre-pregnancy-planning',
    image: 'https://images.pexels.com/photos/3807521/pexels-photo-3807521.jpeg',
    description: 'Pre planning pregnancy program (Sat-Sun sessions)',
    duration: '8 weeks',
    level: 'All Levels',
    category: 'Married',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'garbh-sanskar-9months': {
    name: '9 Months Garbh Sanskar Sadhana',
    slug: 'garbh-sanskar-9months',
    image: 'https://images.pexels.com/photos/3807525/pexels-photo-3807525.jpeg',
    description: 'Complete 9 months garbh sanskar sadhana for expecting mothers',
    duration: '9 months (monthly)',
    level: 'All Levels',
    category: 'Married',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'happy-married-life': {
    name: 'Happy Married Life',
    slug: 'happy-married-life',
    image: 'https://images.pexels.com/photos/3807512/pexels-photo-3807512.jpeg',
    description: 'Transform your married life with Swar Yoga techniques for couples (recorded)',
    duration: 'Recorded',
    level: 'All Levels',
    category: 'Married',
    mode: ['Recorded'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-youth': {
    name: 'Swar Yoga for Youth',
    slug: 'swar-yoga-youth',
    image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg',
    description: 'Specially designed Swar Yoga program for young practitioners',
    duration: '10 days',
    level: 'Beginner',
    category: 'Youth',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'children-swaryoga': {
    name: 'Children Swaryoga',
    slug: 'children-swaryoga',
    image: 'https://images.pexels.com/photos/3807518/pexels-photo-3807518.jpeg',
    description: 'Yoga training program for children and teenagers',
    duration: '10 days',
    level: 'Beginner',
    category: 'Youth',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swy-teacher-training': {
    name: 'Swar Yoga Teachers Training',
    slug: 'swy-teacher-training',
    image: 'https://images.pexels.com/photos/3807523/pexels-photo-3807523.jpeg',
    description: 'Become a certified Swar Yoga teacher (Residential) • Food & accommodation extra',
    duration: '15 days',
    level: 'Advanced',
    category: 'Trainings',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'gurukul-organiser-training': {
    name: 'Gurukul Organiser Training',
    slug: 'gurukul-organiser-training',
    image: 'https://images.pexels.com/photos/3807522/pexels-photo-3807522.jpeg',
    description: 'Train to become a Gurukul organiser and event coordinator',
    duration: '4 days',
    level: 'Advanced',
    category: 'Trainings',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'gurukul-teacher-training': {
    name: 'Gurukul Teachers Training',
    slug: 'gurukul-teacher-training',
    image: 'https://images.pexels.com/photos/3807522/pexels-photo-3807522.jpeg',
    description: 'Comprehensive teacher training in traditional Gurukul style',
    duration: '5 days',
    level: 'Advanced',
    category: 'Trainings',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
};

export const workshopCatalog: WorkshopOverview[] = Object.entries(WORKSHOP_METADATA).map(([slug, data], index) => ({
  id: index + 1,
  ...data,
  slug
}));

export interface Schedule {
  id: string;
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  startDate: string;
  endDate: string;
  time: string;
  seats: number;
  price: number;
  currency: string;
  location?: string;
}

export interface WorkshopDetail {
  id: number;
  name: string;
  image: string;
  duration: string;
  level: string;
  price: string;
  schedules: Schedule[];
}

const ISO_MS_PER_DAY = 24 * 60 * 60 * 1000;

const formatInr = (value: number) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const toISODate = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDaysInclusive = (startISO: string, durationDays: number) => {
  const startMs = Date.parse(startISO);
  if (Number.isNaN(startMs) || durationDays <= 0) return startISO;
  const endMs = startMs + (durationDays - 1) * ISO_MS_PER_DAY;
  return toISODate(new Date(endMs));
};

const scheduleIdByMode: Record<Schedule['mode'], string> = {
  online: 'on1',
  offline: 'of1',
  residential: 'rs1',
  recorded: 'rc1',
};

const scheduleTimeByMode: Record<Schedule['mode'], string> = {
  online: '6:00 AM - 8:00 AM',
  offline: '7:00 AM - 9:00 AM',
  residential: 'Full Day',
  recorded: 'Anytime (Recorded)',
};

const scheduleLocationByMode: Partial<Record<Schedule['mode'], string>> = {
  offline: 'Swar Yoga Center',
  residential: 'Swar Yoga Gurukul (Residential)',
};

type WorkshopPricingConfig = {
  durationLabel: string;
  durationDays: number;
  pricesInrByMode: Partial<Record<Schedule['mode'], number>>;
  modes: Schedule['mode'][];
  priceLabel?: string;
};

// All seats are 60 as requested.
const DEFAULT_SEATS = 60;

// Canonical fees + duration mapping (INR)
const WORKSHOP_PRICING: Record<string, WorkshopPricingConfig> = {
  // Health
  'swar-yoga-basic': {
    durationLabel: '3 days',
    durationDays: 3,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 96, offline: 96 },
  },
  'yogasana-sadhana': {
    durationLabel: '30 days',
    durationDays: 30,
    modes: ['recorded'],
    pricesInrByMode: { recorded: 330 },
  },
  'swar-yoga-level-1': {
    durationLabel: '15 days',
    durationDays: 15,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 3300, offline: 3300 },
  },
  'swar-yoga-level-3': {
    durationLabel: '10 days',
    durationDays: 10,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 3300, offline: 3300 },
  },
  'swar-yoga-level-4': {
    durationLabel: '42 days',
    durationDays: 42,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 6000, offline: 6000 },
  },
  'weight-loss-96days': {
    durationLabel: '96 days',
    durationDays: 96,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 6600, offline: 6600 },
  },
  'meditation-42days': {
    durationLabel: '42 days',
    durationDays: 42,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 2400, offline: 2400 },
  },
  'amrut-aahar-42days': {
    durationLabel: '42 days',
    durationDays: 42,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 2400, offline: 2400 },
  },
  'bandhan-mukti': {
    durationLabel: '10 days',
    durationDays: 10,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 2400, offline: 2400 },
  },

  // Wealth
  'swar-yoga-level-2': {
    durationLabel: '14 days',
    durationDays: 14,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 3300, offline: 3300 },
  },
  'swar-yoga-businessman': {
    durationLabel: '10 weeks (2 sessions/week)',
    durationDays: 70,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 4200, offline: 4200 },
  },
  'corporate-swaryoga': {
    durationLabel: '10 weeks (2 sessions/week)',
    durationDays: 70,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 4200, offline: 4200 },
  },

  // Married
  'pre-pregnancy-planning': {
    durationLabel: '8 weeks (Sat-Sun)',
    durationDays: 56,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 3300, offline: 3300 },
  },
  'garbh-sanskar-9months': {
    durationLabel: '9 months (monthly)',
    durationDays: 270,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 1000, offline: 1000 },
    priceLabel: `${formatInr(1000)} / month`,
  },
  'happy-married-life': {
    durationLabel: 'Recorded',
    durationDays: 30,
    modes: ['recorded'],
    pricesInrByMode: { recorded: 5900 },
  },

  // Youth & Children
  'swar-yoga-youth': {
    durationLabel: '10 days',
    durationDays: 10,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 999, offline: 999 },
  },
  'children-swaryoga': {
    durationLabel: '10 days',
    durationDays: 10,
    modes: ['online', 'offline'],
    pricesInrByMode: { online: 600, offline: 600 },
  },

  // Trainings
  'swy-teacher-training': {
    durationLabel: '15 days (Residential)',
    durationDays: 15,
    modes: ['residential'],
    pricesInrByMode: { residential: 33000 },
  },
  'gurukul-organiser-training': {
    durationLabel: '4 days (Residential)',
    durationDays: 4,
    modes: ['residential'],
    pricesInrByMode: { residential: 4500 },
  },
  'gurukul-teacher-training': {
    durationLabel: '5 days (Residential)',
    durationDays: 5,
    modes: ['residential'],
    pricesInrByMode: { residential: 5999 },
  },
};

const buildWorkshopDetails = (): Record<string, WorkshopDetail> => {
  const details: Record<string, WorkshopDetail> = {};

  const slugs = workshopCatalog.map((w) => w.slug);
  slugs.forEach((slug, index) => {
    const meta = workshopCatalog.find((w) => w.slug === slug);
    const cfg = WORKSHOP_PRICING[slug];

    // If a workshop exists in catalog but not in pricing, skip it.
    // (We intentionally removed Create Well from the updated list.)
    if (!meta || !cfg) return;

    const startBase = new Date(Date.UTC(2026, 0, 10 + index * 3));
    const startDate = toISODate(startBase);

    const schedules: Schedule[] = cfg.modes
      .map((mode, modeIndex) => {
        const price = cfg.pricesInrByMode[mode];
        if (typeof price !== 'number') return null;

        // Stagger modes by a day so they don't all start on the same date.
        const startForMode = toISODate(new Date(Date.parse(startDate) + modeIndex * ISO_MS_PER_DAY));
        const endDate = addDaysInclusive(startForMode, cfg.durationDays);

        return {
          id: scheduleIdByMode[mode],
          mode,
          startDate: startForMode,
          endDate,
          time: scheduleTimeByMode[mode],
          seats: DEFAULT_SEATS,
          price,
          currency: 'INR',
          location: scheduleLocationByMode[mode],
        };
      })
      .filter(Boolean) as Schedule[];

    const prices = schedules.map((s) => s.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const priceLabel = cfg.priceLabel || formatInr(minPrice);

    details[slug] = {
      id: index + 1,
      name: meta.name,
      image: meta.image,
      duration: cfg.durationLabel,
      level: meta.level,
      price: priceLabel,
      schedules,
    };
  });

  return details;
};

export const workshopDetails: Record<string, WorkshopDetail> = buildWorkshopDetails();

export const findWorkshopBySlug = (slug: string) => workshopCatalog.find((workshop) => workshop.slug === slug);
