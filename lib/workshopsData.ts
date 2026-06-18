export type WorkshopOverview = {
  id: number;
  name: string;
  slug: string;
  image: string;
  description: string;
  detailedDescription?: string;
  videoUrl?: string;
  instructor?: string;
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
  'master-swar-yoga': {
    name: 'Master Swar Yoga - (6 Month)',
    slug: 'master-swar-yoga',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    description: 'A 6-month masterclass combining Swar Yoga Levels 1 to 5. New batch starts every month (3 days/week).',
    detailedDescription:
      'This Master Swar Yoga program combines Levels 1–5 in a single guided 6-month journey. The curriculum includes: Level-1, Level-2 (Aham Brahmasmi), Level-3 (Astavakra), Level-4, and Level-5 (Bandhan Mukti). New batch starts every month. Classes run 3 days a week with timings and dates managed from Admin schedules. Choose monthly payment or a discounted 3-month plan.',
    videoUrl: 'https://www.youtube.com/embed/0q2FWUqqqPs',
    duration: '6 months',
    level: 'Masterclass',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'swar-yoga-basic-program': {
    name: 'Swar Yoga Basic Program',
    slug: 'swar-yoga-basic-program',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    description: '2-day starter program (1.5 hours/day) to learn the fundamentals of Swar Yoga.',
    detailedDescription:
      'Swar Yoga Basic Program is a short 2-day introduction designed for beginners. Learn the core foundations of Swar Yoga in 1.5-hour classes. Schedules (next batch dates and timings) are controlled from Admin. Seats are limited per batch.',
    videoUrl: 'https://www.youtube.com/embed/0q2FWUqqqPs',
    duration: '2 days',
    level: 'Beginner',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR']
  },
  'yogasana-sadhana': {
    name: 'Yogasana & Sadhana',
    slug: 'yogasana-sadhana',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    description: 'A complete yogasana and sadhana practice program for disciplined daily growth.',
    detailedDescription: 'Master the fundamental yogasanas and integrate them into a daily sadhana (spiritual practice) that transforms your body, mind, and spirit. This comprehensive program covers classical yoga postures combined with breathing techniques and meditation. You will develop strength, flexibility, and inner awareness through consistent daily practice. Perfect for beginners and experienced practitioners seeking to deepen their practice. This program has helped thousands achieve better health, mental clarity, and spiritual growth.',
    videoUrl: 'https://www.youtube.com/embed/mzYKqFxYzQU',
    duration: '30 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-level-1': {
    name: 'Swar Yoga Basic Workshop',
    slug: 'swar-yoga-level-1',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    description: 'First level comprehensive Swar Yoga training',
    detailedDescription: 'Unlock the ancient science of Swar Yoga and learn how to balance your body, mind, and energy through nasal breathing techniques. Level-1 introduces the fundamentals of alternating nostrils and their effects on consciousness. This workshop teaches you to harness the natural rhythm of your breath to improve health, energy levels, and decision-making abilities. Participants learn practical techniques that can be applied immediately in daily life for enhanced vitality and mental clarity.',
    videoUrl: 'https://www.youtube.com/embed/0q2FWUqqqPs',
    duration: '15 days',
    level: 'Beginner',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-level-2': {
    name: 'Swar Yoga Level-2 Workshop',
    slug: 'swar-yoga-level-2',
    image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=800',
    description: 'Advanced Swar Yoga for wealth creation and prosperity',
    detailedDescription: 'Build on Level-1 foundations with advanced Swar Yoga techniques specifically designed for wealth creation, prosperity, and success. Learn the deeper principles of lunar and solar energy cycles and how to align them with your intentions. This advanced workshop reveals ancient secrets used by successful entrepreneurs and leaders. Master timing for important decisions, business launches, and personal goals aligned with natural cycles.',
    videoUrl: 'https://www.youtube.com/embed/5nqVXQG9Mvk',
    duration: '15 days',
    level: 'Intermediate',
    category: 'Wealth',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-youth': {
    name: 'Swar Yoga Youth Program',
    slug: 'swar-yoga-youth',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800',
    description: 'Specially designed for young practitioners',
    detailedDescription: 'A modern, engaging approach to Swar Yoga specifically tailored for young adults and teenagers. This program addresses common challenges like stress, focus issues, and confidence using ancient yoga science combined with contemporary understanding. Youth learn practical tools to excel in academics, sports, and relationships. Interactive, fun, and results-driven approach makes ancient wisdom accessible to today\'s generation.',
    videoUrl: 'https://www.youtube.com/embed/xm1h7KLhBNM',
    duration: '10 days',
    level: 'Beginner',
    category: 'Youth & Children',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'weight-loss': {
    name: 'Weight Loss Program',
    slug: 'weight-loss',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800',
    description: 'Transform your body through Swar Yoga',
    detailedDescription: 'Achieve sustainable weight loss without restrictive diets using the holistic Swar Yoga approach. This program combines specialized breathing techniques, movement practices, and metabolic optimization. Learn how to activate your natural fat-burning mechanisms and maintain ideal weight long-term. Includes nutrition guidance aligned with your individual constitution and energy patterns.',
    videoUrl: 'https://www.youtube.com/embed/cklZSXAWA5U',
    duration: '90 days',
    level: 'Intermediate',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  meditation: {
    name: 'Meditation Program',
    slug: 'meditation',
    image: 'https://images.unsplash.com/photo-1545641203-7d072a14e3b2?auto=format&fit=crop&q=80&w=800',
    description: 'Deep meditation and mindfulness training inspired by the Buddha.',
    detailedDescription: 'Journey into profound states of meditation and inner peace through techniques inspired by the serene stillness of the Buddha. This program progressively develops your meditation capacity, from basic mindfulness to advanced states of consciousness. Experience reduced stress, enhanced focus, and spiritual connection. Daily guided practices combined with theory helps you understand the mechanics of mind and meditation.',
    videoUrl: 'https://www.youtube.com/embed/T3qQdIj7f0Y',
    duration: '15 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-meditation': {
    name: 'Swar Yoga Meditation',
    slug: 'swar-yoga-meditation',
    image: 'https://images.unsplash.com/photo-1545641203-7d072a14e3b2?auto=format&fit=crop&q=80&w=800',
    description: 'A focused meditation practice rooted in Swar Yoga breath awareness.',
    detailedDescription: 'Swar Yoga Meditation guides you through breath-based meditation techniques rooted in the Swar Yoga tradition. Daily guided sessions build steady focus, calm the nervous system, and deepen your connection to the natural rhythm of the breath. Schedules (next batch dates and timings) are managed from Admin.',
    videoUrl: 'https://www.youtube.com/embed/T3qQdIj7f0Y',
    duration: '9 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'amrut-aahar': {
    name: 'Amrut Aahar Program',
    slug: 'amrut-aahar',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
    description: 'Complete natural diet and nutrition guidance',
    detailedDescription: 'Discover the science of optimal nutrition and how to nourish your body for maximum vitality and longevity. Amrut Aahar means "nectar food" - learn which foods truly nourish and heal your unique constitution. This program covers seasonal eating, food combinations, digestion optimization, and natural remedies. Transform your eating habits into a path of health and enlightenment.',
    videoUrl: 'https://www.youtube.com/embed/9uWo6Av2Qcg',
    duration: '45 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  astavakra: {
    name: 'Astavakra Dhyan Level-3',
    slug: 'astavakra',
    image: 'https://images.unsplash.com/photo-1502101872923-d48509bff386?auto=format&fit=crop&q=80&w=800',
    description: 'Level-3 advanced meditation and wisdom drawing from the Astavakra Gita.',
    detailedDescription: 'The highest level of advanced meditation practice drawing from the Astavakra Gita teachings. This intensive residential program guides seekers into transcendent states of consciousness and self-realization. Only for those who have completed prerequisite levels. Experience non-dual awareness and the ultimate truths of existence through direct practice and transmission from the master.',
    videoUrl: 'https://www.youtube.com/embed/L3GGhK65iEw',
    duration: '10 days',
    level: 'Advanced',
    category: 'Health',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'pre-pregnancy': {
    name: 'Pre Pregnancy Program',
    slug: 'pre-pregnancy',
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=800',
    description: 'Safe yoga practice for expecting mothers',
    detailedDescription: 'A specially designed program for expectant mothers that ensures safe, effective yoga practice throughout pregnancy. Learn techniques to reduce pregnancy discomfort, prepare for childbirth naturally, and maintain emotional wellbeing. Includes gentle movements, breathing practices, and meditation designed specifically for pregnant women. Reduces anxiety, improves sleep, and promotes healthy development of the baby.',
    videoUrl: 'https://www.youtube.com/embed/y90cV_3OMrQ',
    duration: '36 days',
    level: 'All Levels',
    category: 'Marriage',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swy-children': {
    name: 'Swar Yoga Children Program',
    slug: 'swy-children',
    image: 'https://images.unsplash.com/photo-1476703993599-0035a260f381?auto=format&fit=crop&q=80&w=800',
    description: 'Yoga training for children and teenagers',
    detailedDescription: 'Introduce children to yoga with fun, engaging, and age-appropriate practices. This program helps kids develop focus, confidence, physical strength, and emotional intelligence. Through games, stories, and interactive practices, children learn ancient wisdom in a modern, relatable way. Reduces hyperactivity, improves concentration for studies, and builds character.',
    videoUrl: 'https://www.youtube.com/embed/8HWaFGJz6Yw',
    duration: '10 days',
    level: 'Beginner',
    category: 'Youth & Children',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'complete-health': {
    name: 'Complete Health Program',
    slug: 'complete-health',
    image: 'https://images.unsplash.com/photo-1519824141121-99767218abb2?auto=format&fit=crop&q=80&w=800',
    description: 'Holistic cure for BP, diabetes, heart, liver, kidney, migraine & hormonal balance',
    detailedDescription: 'A comprehensive holistic healing program addressing all major health conditions including hypertension, diabetes, heart disease, liver and kidney issues, migraines, and hormonal imbalances. This program integrates therapeutic massage, dietary changes, and specialized breathing to facilitate natural healing. Participants report significant improvement in symptoms and restored vitality.',
    videoUrl: 'https://www.youtube.com/embed/5jvJY-I7Vug',
    duration: '45 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'corporate-swy': {
    name: 'Corporate Swar Yoga Management',
    slug: 'corporate-swy',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800',
    description: 'Stress management and productivity for corporate professionals',
    detailedDescription: 'Tailored for corporate leaders and professionals, this program teaches practical techniques to manage stress, make better decisions, and boost productivity. Learn how to use Swar Yoga for strategic timing, negotiation success, and team management. Applicable immediately in business contexts with measurable results in performance and wellbeing.',
    videoUrl: 'https://www.youtube.com/embed/9_OLxmZzcNQ',
    duration: '10 days',
    level: 'Intermediate',
    category: 'Wealth',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'self-awareness': {
    name: 'Self Awareness Level-4',
    slug: 'self-awareness',
    image: 'https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&q=80&w=800',
    description: 'Ultimate self-discovery following the path of Adi Shankaracharya.',
    detailedDescription: 'The pinnacle of self-discovery and spiritual transformation through intensive residential practice. This advanced Level-4 program follows the non-dualistic (Advaita) path of Adi Shankaracharya, facilitating profound shifts in consciousness and understanding of one\'s true nature. Experience direct realization of your authentic self beyond ego and conditioning. Suitable only for advanced practitioners committed to radical transformation.',
    videoUrl: 'https://www.youtube.com/embed/GNNmCPBSyv8',
    duration: '30 days',
    level: 'Advanced',
    category: 'Health',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'happy-marriage': {
    name: 'Happy Married Life',
    slug: 'happy-marriage',
    image: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=800',
    description: 'Transform your married life with Swar Yoga techniques',
    detailedDescription: 'Revitalize your married life using proven Swar Yoga techniques that enhance compatibility, communication, and intimacy. Learn how to align with your partner\'s natural rhythms and create harmonious relationships. This program addresses common marriage challenges and provides practical tools for couples. Transform conflict into connection and deepen the bonds of love.',
    videoUrl: 'https://www.youtube.com/embed/gNbVlsGXe3M',
    duration: '36 days',
    level: 'All Levels',
    category: 'Marriage',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'gurukul-training': {
    name: 'Gurukul Teachers Training',
    slug: 'gurukul-training',
    image: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=800',
    description: 'Comprehensive teacher training program in traditional Gurukul style',
    detailedDescription: 'Become a master teacher in the traditional Gurukul education system. This 90-day intensive residential program transmits the complete knowledge and skills needed to teach Swar Yoga and yoga science at the highest level. Includes extensive mentorship, practice, and teaching methodology. Produces qualified teachers capable of spreading these transformative teachings worldwide.',
    videoUrl: 'https://www.youtube.com/embed/XQ6MYL_rKgE',
    duration: '90 days',
    level: 'Advanced',
    category: 'Training',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swy-teacher': {
    name: 'Swar Yoga Teachers Training',
    slug: 'swy-teacher',
    image: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&q=80&w=800',
    description: 'Become a certified Swar Yoga teacher and trainer',
    detailedDescription: 'Get certified to teach Swar Yoga to others and build a meaningful career. This comprehensive program covers theory, practice, teaching methodology, and business aspects. Learn how to effectively communicate these ancient techniques to modern practitioners. This certification is globally recognized and opens doors to teaching opportunities worldwide.',
    videoUrl: 'https://www.youtube.com/embed/7qTSVzR6gIc',
    duration: '15 days',
    level: 'Advanced',
    category: 'Training',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'gurukul-organiser-training': {
    name: 'Gurukul Organiser Training',
    slug: 'gurukul-organiser-training',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
    description: 'Training program to build organisers who can manage and grow Gurukul systems.',
    detailedDescription: 'Learn to organize and manage Gurukul education centers and yoga programs. This training develops leadership skills, business acumen, and deep knowledge needed to establish sustainable yoga and wellness centers. Includes curriculum design, student management, staff training, and financial planning for yoga enterprises.',
    videoUrl: 'https://www.youtube.com/embed/mTVVNGMBx0Q',
    duration: '45 days',
    level: 'Intermediate',
    category: 'Training',
    mode: ['Online', 'Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  naturopathy: {
    name: 'Naturopathy Treatment Program',
    slug: 'naturopathy',
    image: 'https://images.unsplash.com/photo-1620733321588-2f0851f50a49?auto=format&fit=crop&q=80&w=800',
    description: 'Complete natural healing with Shirodhara and traditional treatments.',
    detailedDescription: 'Master the ancient art and science of natural healing. This program includes intensive Shirodhara sessions, therapeutic massages, and holistic detoxification in a traditional residential setting.',
    videoUrl: 'https://www.youtube.com/embed/nGNnVhEhjPg',
    duration: '7 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'businessman-swar-yoga': {
    name: 'Businessman Swar Yoga',
    slug: 'businessman-swar-yoga',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=800',
    description: 'Swar Yoga techniques for business success, wealth creation, and entrepreneurial growth.',
    detailedDescription: 'Master advanced Swar Yoga techniques specifically designed for business professionals and entrepreneurs. Learn how to use nasal breathing cycles to enhance business decision-making, improve negotiation skills, and attract prosperity. This program combines ancient yogic wisdom with modern business principles to accelerate wealth creation and business growth.',
    videoUrl: 'https://www.youtube.com/embed/9_OLxmZzcNQ',
    duration: '21 days',
    level: 'Intermediate',
    category: 'Wealth',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'garbh-sanskara': {
    name: '9 Month Garbh Sanskara Sadhana Program',
    slug: 'garbh-sanskara',
    image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=800',
    description: 'Complete 9-month program for spiritual development during pregnancy.',
    detailedDescription: 'A comprehensive 9-month Garbh Sanskara (fetal education) program designed to facilitate optimal spiritual and physical development during pregnancy. This ancient practice combines specific yoga practices, meditation, chanting, and lifestyle guidelines to nurture the developing baby and prepare the mother for childbirth. Experience profound connection with your baby and lay the foundation for the child\'s holistic development.',
    videoUrl: 'https://www.youtube.com/embed/y90cV_3OMrQ',
    duration: '9 months',
    level: 'All Levels',
    category: 'Marriage',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  }
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

export const workshopDetails: Record<string, WorkshopDetail> = {
  'basic-workshop-50': {
    id: 999,
    name: 'Basic Workshop (₹50 Test)',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    duration: '1 day',
    level: 'All Levels',
    price: '₹50',
    schedules: [
      {
        id: 't1',
        mode: 'online',
        startDate: '2025-12-15',
        endDate: '2025-12-15',
        time: '7:00 PM - 8:00 PM',
        seats: 999,
        price: 50,
        currency: 'INR'
      }
    ]
  },
  'swar-yoga-basic-program': {
    id: 1001,
    name: 'Swar Yoga Basic Program',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800',
    duration: '2 days',
    level: 'Beginner',
    price: '₹145',
    schedules: [
      {
        id: 'jan-2026',
        mode: 'online',
        startDate: '2026-01-19',
        endDate: '2026-01-20',
        time: '7:00 PM - 8:30 PM',
        seats: 99,
        price: 145,
        currency: 'INR'
      }
    ]
  },
  'swar-yoga-basic': {
    id: 1,
    name: 'Swar Yoga Basic Workshop',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    duration: '3 days',
    level: 'Beginner',
    price: '₹2,999',
    schedules: [
      // ...existing code...
      { id: 'r6', mode: 'residential', startDate: '2025-06-28', endDate: '2025-06-30', time: 'Full Day', seats: 18, price: 5999, currency: 'INR', location: 'Goa Retreat Center' }
    ]
  },
  'swar-yoga-level-1': {
    id: 2,
    name: 'Swar Yoga Level-1 Workshop',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    duration: '15 days',
    level: 'Beginner',
    price: '₹9,999',
    schedules: [
      // ...existing code...
      { id: 'r6', mode: 'residential', startDate: '2025-06-22', endDate: '2025-07-06', time: 'Full Day', seats: 12, price: 16999, currency: 'INR', location: 'Goa Retreat Center' }
    ]
  },
  'swar-yoga-youth': {
    id: 3,
    name: 'Swar Yoga Youth Program',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800',
    duration: '10 days',
    level: 'All Levels',
    price: '₹4,999',
    schedules: [
      { id: 'o1', mode: 'online', startDate: '2026-01-05', endDate: '2026-01-17', time: '9:00 PM - 10:30 PM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'o2', mode: 'online', startDate: '2025-02-08', endDate: '2025-02-17', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'o3', mode: 'online', startDate: '2025-03-03', endDate: '2025-03-12', time: '5:00 PM - 7:00 PM', seats: 55, price: 4999, currency: 'INR' },
      { id: 'o4', mode: 'online', startDate: '2025-04-10', endDate: '2025-04-19', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'o5', mode: 'online', startDate: '2025-05-12', endDate: '2025-05-21', time: '7:00 AM - 9:00 AM', seats: 58, price: 4999, currency: 'INR' },
      { id: 'o6', mode: 'online', startDate: '2025-06-12', endDate: '2025-06-21', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'of1', mode: 'offline', startDate: '2025-01-18', endDate: '2025-01-27', time: '8:00 AM - 10:00 AM', seats: 35, price: 5999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of2', mode: 'offline', startDate: '2025-02-12', endDate: '2025-02-21', time: '8:00 AM - 10:00 AM', seats: 32, price: 5999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of3', mode: 'offline', startDate: '2025-03-08', endDate: '2025-03-17', time: '5:00 PM - 7:00 PM', seats: 30, price: 5999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'of4', mode: 'offline', startDate: '2025-04-15', endDate: '2025-04-24', time: '8:00 AM - 10:00 AM', seats: 35, price: 5999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of5', mode: 'offline', startDate: '2025-05-20', endDate: '2025-05-29', time: '8:00 AM - 10:00 AM', seats: 30, price: 5999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of6', mode: 'offline', startDate: '2025-06-18', endDate: '2025-06-27', time: '8:00 AM - 10:00 AM', seats: 35, price: 5999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'r1', mode: 'residential', startDate: '2025-01-28', endDate: '2025-02-06', time: 'Full Day', seats: 25, price: 8999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r2', mode: 'residential', startDate: '2025-02-25', endDate: '2025-03-06', time: 'Full Day', seats: 22, price: 8999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r3', mode: 'residential', startDate: '2025-03-25', endDate: '2025-04-03', time: 'Full Day', seats: 25, price: 8999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r4', mode: 'residential', startDate: '2025-04-30', endDate: '2025-05-09', time: 'Full Day', seats: 20, price: 8999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r5', mode: 'residential', startDate: '2025-06-02', endDate: '2025-06-11', time: 'Full Day', seats: 25, price: 8999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r6', mode: 'residential', startDate: '2025-07-01', endDate: '2025-07-10', time: 'Full Day', seats: 22, price: 8999, currency: 'INR', location: 'Goa Retreat Center' }
    ]
  },
  'astavakra': {
    id: 10,
    name: 'Astavakra Dhyan Level-3',
    image: 'https://images.unsplash.com/photo-1518191766444-14a89f16daac?auto=format&fit=crop&q=80&w=800',
    duration: '10 days',
    level: 'Advanced',
    price: '₹21,000',
    schedules: [
      { id: 'r1', mode: 'residential', startDate: '2026-03-15', endDate: '2026-03-25', time: 'Full Day', seats: 30, price: 21000, currency: 'INR', location: 'Rishikesh Ashram' }
    ]
  },
  'self-awareness': {
    id: 11,
    name: 'Self Awareness Level-4',
    image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=800',
    duration: '30 days',
    level: 'Advanced',
    price: '₹35,000',
    schedules: [
      { id: 'r1', mode: 'residential', startDate: '2026-05-01', endDate: '2026-05-31', time: 'Full Day', seats: 20, price: 35000, currency: 'INR', location: 'Himalayan Retreat' }
    ]
  },
  'meditation': {
    id: 12,
    name: 'Meditation Program',
    image: 'https://images.unsplash.com/photo-1545641203-7d072a14e3b2?auto=format&fit=crop&q=80&w=800',
    duration: '15 days',
    level: 'All Levels',
    price: '₹3,300',
    schedules: [
      { id: 'o1', mode: 'online', startDate: '2026-02-10', endDate: '2026-02-25', time: '7:00 PM - 8:30 PM', seats: 100, price: 3300, currency: 'INR' }
    ]
  },
  'complete-health': {
    id: 14,
    name: 'Complete Health Program',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&q=80&w=800',
    duration: '45 days',
    level: 'All Levels',
    price: '₹21,000',
    schedules: [
      { id: 'o1', mode: 'online', startDate: '2026-03-01', endDate: '2026-04-15', time: '6:30 AM - 8:00 AM', seats: 50, price: 21000, currency: 'INR' }
    ]
  },
  'naturopathy': {
    id: 13,
    name: 'Naturopathy Treatment Program',
    image: 'https://images.unsplash.com/photo-1620733321588-2f0851f50a49?auto=format&fit=crop&q=80&w=800',
    duration: '7 days',
    level: 'All Levels',
    price: '₹11,000',
    schedules: [
      { id: 'r1', mode: 'residential', startDate: '2026-04-05', endDate: '2026-04-12', time: 'Full Day', seats: 20, price: 11000, currency: 'INR', location: 'Natural Healing Center' }
    ]
  }
};

// Landing Page Data for each workshop
export interface WorkshopLandingData {
  heroImage: string;
  introVideoUrl: string;
  whatYouWillLearn: string[];
  highlightVideos: Array<{ title: string; url: string }>;
  // Additional small videos shown in a compact grid (3 recommended)
  detailVideos?: Array<{ title: string; url: string }>;
  mentorInfo: string;
  testimonials: Array<{ quote: string; name: string; place: string }>;
  videoTestimonials: Array<{ name: string; url: string }>;
  finalCTA: string;
}

export const workshopLandingPages: Record<string, WorkshopLandingData> = {
  'yogasana-sadhana': {
    heroImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/mzYKqFxYzQU',
    whatYouWillLearn: [
      'Master fundamental yogasanas with proper alignment and breathing',
      'Integrate daily sadhana (spiritual practice) into your routine',
      'Develop strength, flexibility, and inner awareness',
      'Combine classical yoga postures with meditation techniques',
      'Transform your body, mind, and spirit through consistent practice'
    ],
    highlightVideos: [
      { title: 'Yogasana Fundamentals', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Daily Sadhana Practice', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' },
      { title: 'Success Transformations', url: 'https://www.youtube.com/embed/5nqVXQG9Mvk' }
    ],
    mentorInfo: 'Our yoga masters have 25+ years of experience guiding thousands through authentic yogasana and sadhana practices. They provide personalized modifications and deep spiritual guidance throughout the program.',
    testimonials: [
      { quote: 'My body became stronger and more flexible than ever before!', name: 'Raj Kumar', place: 'Mumbai' },
      { quote: 'The daily sadhana practice brought real peace and clarity to my mind.', name: 'Priya Sharma', place: 'Delhi' },
      { quote: 'Simple techniques that created profound transformation in my life.', name: 'Vikram Singh', place: 'Bangalore' },
      { quote: 'I finally understand the true purpose of yoga beyond just exercise.', name: 'Anjali Verma', place: 'Pune' }
    ],
    videoTestimonials: [
      { name: 'Raj - IT Professional', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Priya - Student', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Vikram - Business Owner', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Anjali - Homemaker', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Join this 21-day transformative yogasana and sadhana program. Master the ancient practices that have guided thousands to health and spiritual growth.'
  },
  'swar-yoga-basic-program': {
    heroImage: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/luSaTlBXssM',
    whatYouWillLearn: [
      'Understand the science of alternating nostril breathing',
      'Balance your body, mind, and energy through nasal breathing',
      'Harness natural breath rhythms for improved consciousness',
      'Apply practical techniques immediately in daily life',
      'Enhance vitality, mental clarity, and decision-making abilities'
    ],
    highlightVideos: [
      { title: 'Swar Yoga Level-1 Complete Guide', url: 'https://www.youtube.com/embed/_sVjfPam0SM' },
      { title: 'Nasal Breathing Techniques', url: 'https://www.youtube.com/embed/fxA5CjzgHQA' },
      { title: 'Real Results from Practitioners', url: 'https://www.youtube.com/embed/_EWOgcAc8GA' }
    ],
    mentorInfo: 'Learn from experienced Swar Yoga teachers who have mastered the ancient science of nasal breathing. They will guide you through each technique with precision and care.',
    testimonials: [
      { quote: 'My energy levels increased significantly within days!', name: 'Arjun Kumar', place: 'Hyderabad' },
      { quote: 'This simple breathing technique changed how I make decisions.', name: 'Deepika Singh', place: 'Mumbai' },
      { quote: 'I feel more balanced and calm throughout the day.', name: 'Rohan Patel', place: 'Ahmedabad' },
      { quote: 'The results are natural and lasting!', name: 'Sneha Gupta', place: 'Kolkata' }
    ],
    videoTestimonials: [
      { name: 'Arjun - Corporate Executive', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Deepika - Doctor', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Rohan - Entrepreneur', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Sneha - Student', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Begin your Swar Yoga journey. Unlock ancient secrets for health, wealth, and success through the power of breath.'
  },
  'swar-yoga-level-1': {
    heroImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/luSaTlBXssM',
    whatYouWillLearn: [
      'Understand the science of alternating nostril breathing',
      'Balance your body, mind, and energy through nasal breathing',
      'Harness natural breath rhythms for improved consciousness',
      'Apply practical techniques immediately in daily life',
      'Enhance vitality, mental clarity, and decision-making abilities'
    ],
    highlightVideos: [
      { title: 'Swar Yoga Level-1 Complete Guide', url: 'https://www.youtube.com/embed/_sVjfPam0SM' },
      { title: 'Nasal Breathing Techniques', url: 'https://www.youtube.com/embed/fxA5CjzgHQA' },
      { title: 'Real Results from Practitioners', url: 'https://www.youtube.com/embed/_EWOgcAc8GA' }
    ],
    mentorInfo: 'Learn from experienced Swar Yoga teachers who have mastered the ancient science of nasal breathing. They will guide you through each technique with precision and care, ensuring you grasp the deeper principles.',
    testimonials: [
      { quote: 'My energy levels increased significantly within days!', name: 'Arjun Kumar', place: 'Hyderabad' },
      { quote: 'This simple breathing technique changed how I make decisions.', name: 'Deepika Singh', place: 'Mumbai' },
      { quote: 'I feel more balanced and calm throughout the day.', name: 'Rohan Patel', place: 'Ahmedabad' },
      { quote: 'The results are natural and lasting - no side effects!', name: 'Sneha Gupta', place: 'Kolkata' }
    ],
    videoTestimonials: [
      { name: 'Arjun - Corporate Executive', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Deepika - Doctor', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Rohan - Entrepreneur', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Sneha - Student', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Begin your 15-day Swar Yoga Level-1 journey. Unlock ancient secrets for health, wealth, and success through the power of breath.'
  },
  'swar-yoga-level-2': {
    heroImage: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/5nqVXQG9Mvk',
    whatYouWillLearn: [
      'Build on Level-1 foundations with advanced Swar Yoga techniques',
      'Master lunar and solar energy cycles for success',
      'Learn timing strategies for major life decisions',
      'Discover ancient secrets used by successful leaders',
      'Align business launches and goals with natural cycles'
    ],
    highlightVideos: [
      { title: 'Advanced Techniques', url: 'https://www.youtube.com/embed/5nqVXQG9Mvk' },
      { title: 'Wealth Creation Secrets', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Business Success Stories', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Advanced level teaching from master practitioners who have used these techniques to achieve remarkable success. Their insights combine ancient wisdom with modern business understanding.',
    testimonials: [
      { quote: 'My business decisions became significantly more successful!', name: 'Harsh Mehta', place: 'Mumbai' },
      { quote: 'Understanding natural cycles gave me competitive advantage.', name: 'Meera Desai', place: 'Pune' },
      { quote: 'Prosperity followed naturally once I aligned with these principles.', name: 'Aditya Kapoor', place: 'Delhi' },
      { quote: 'The timing techniques work - my results speak for themselves!', name: 'Nisha Iyer', place: 'Chennai' }
    ],
    videoTestimonials: [
      { name: 'Harsh - CEO', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Meera - Investor', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Aditya - Startup Founder', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Nisha - Entrepreneur', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Advance your Swar Yoga practice with Level-2. Master wealth creation and success principles used by top performers worldwide.'
  },
  'swar-yoga-youth': {
    heroImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/luSaTlBXssM',
    whatYouWillLearn: [
      'Manage stress and anxiety using proven techniques',
      'Improve focus and concentration for academics and sports',
      'Build confidence and emotional intelligence',
      'Develop healthy relationships with peers',
      'Master practical tools for modern life challenges'
    ],
    highlightVideos: [
      { title: 'Youth Program Overview', url: 'https://www.youtube.com/embed/xm1h7KLhBNM' },
      { title: 'Stress Management for Students', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Young Success Stories', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Designed by experts who understand young people\'s challenges. Our mentors use engaging, fun, and practical approaches to make ancient wisdom accessible to today\'s generation.',
    testimonials: [
      { quote: 'My exam anxiety completely disappeared!', name: 'Aman Verma', place: 'Jaipur' },
      { quote: 'I feel more confident in myself and my abilities.', name: 'Zara Khan', place: 'Lucknow' },
      { quote: 'My friends noticed positive changes in my personality.', name: 'Kabir Singh', place: 'Chandigarh' },
      { quote: 'Finally, tools that actually work in real life!', name: 'Diya Patel', place: 'Vadodara' }
    ],
    videoTestimonials: [
      { name: 'Aman - School Student', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Zara - College Student', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Kabir - Young Professional', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Diya - Student Athlete', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Transform your teenage and young adult years. Learn practical tools for stress, focus, confidence, and success in today\'s world.'
  },
  'weight-loss': {
    heroImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/cklZSXAWA5U',
    whatYouWillLearn: [
      'Activate your natural fat-burning mechanisms',
      'Achieve sustainable weight loss without restrictive diets',
      'Learn specialized breathing techniques for metabolism',
      'Understand nutrition aligned with your constitution',
      'Maintain ideal weight long-term through natural methods'
    ],
    highlightVideos: [
      { title: 'Weight Loss Science', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { title: 'Breathing for Metabolism', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Transformation Stories', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Our weight loss specialists combine ancient Swar Yoga science with modern nutritional understanding. They provide personalized guidance for sustainable, healthy weight transformation.',
    testimonials: [
      { quote: 'Lost 15 kg naturally without any side effects!', name: 'Participant', place: 'India' },
      { quote: 'No more yo-yo dieting - weight stayed off permanently.', name: 'Participant', place: 'India' },
      { quote: 'My entire health improved, not just weight.', name: 'Participant', place: 'India' },
      { quote: 'Finally, a method that works with my body, not against it!', name: 'Participant', place: 'India' }
    ],
    videoTestimonials: [
      { name: 'Swati - Lost 20kg', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Rahul - Lost 18kg', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Neha - Lost 15kg', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Amit - Lost 25kg', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Start your 90-day weight loss transformation. Achieve sustainable results using holistic Swar Yoga methods without diets or starvation.'
  },
  'meditation': {
    heroImage: 'https://images.unsplash.com/photo-1545641203-7d072a14e3b2?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/T3qQdIj7f0Y',
    whatYouWillLearn: [
      'Progress from basic mindfulness to advanced meditation states',
      'Experience profound inner peace inspired by the Buddha',
      'Reduce stress and anxiety naturally through breath awareness',
      'Enhance focus and mental clarity using ancient techniques',
      'Develop spiritual connection through guided practice'
    ],
    highlightVideos: [
      { title: 'Meditation Fundamentals', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { title: 'Advanced Meditation States', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Peace and Transformation', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Learn from experienced meditation teachers who guide students into profound states of consciousness. Progressive practices ensure success at every level.',
    testimonials: [
      { quote: 'Found the peace I\'ve been searching for my whole life.', name: 'Participant', place: 'India' },
      { quote: 'My mind is clearer and my thoughts more positive.', name: 'Participant', place: 'India' },
      { quote: 'Sleep quality improved dramatically.', name: 'Participant', place: 'India' },
      { quote: 'Meditation became my favorite part of the day!', name: 'Participant', place: 'India' }
    ],
    videoTestimonials: [
      { name: 'Ashok - Retired Executive', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Pooja - Anxiety Sufferer', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Vikas - Busy Professional', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Sunita - Housewife', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Begin your 15-day deep meditation journey. Experience inner peace, clarity, and spiritual growth through scientifically-backed techniques.'
  },
  'amrut-aahar': {
    heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/9uWo6Av2Qcg',
    whatYouWillLearn: [
      'Discover optimal nutrition for your unique constitution',
      'Learn seasonal eating and food combining principles',
      'Optimize digestion and nutrient absorption',
      'Use natural remedies for health challenges',
      'Transform eating into a path of health and enlightenment'
    ],
    highlightVideos: [
      { title: 'Nutritional Science', url: 'https://www.youtube.com/embed/9uWo6Av2Qcg' },
      { title: 'Seasonal Eating Guide', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Health Transformations', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Our nutrition experts blend ancient Ayurvedic wisdom with modern nutritional science. Learn personalized diet guidance that actually works for your body type.',
    testimonials: [
      { quote: 'My digestion issues disappeared completely!', name: 'Vinod Sharma', place: 'Indore' },
      { quote: 'Finally understanding why some foods work for me and others don\'t.', name: 'Shruti Desai', place: 'Nashik' },
      { quote: 'Energy levels are at their best ever.', name: 'Bhavesh Patel', place: 'Surat' },
      { quote: 'Food became medicine rather than a source of problems.', name: 'Kavya Iyer', place: 'Cochin' }
    ],
    videoTestimonials: [
      { name: 'Vinod - Digestion Issues Resolved', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Shruti - Nutrition Expert', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Bhavesh - Energy Transformed', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Kavya - Glowing Health', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Transform your health through the Amrut Aahar program. Learn the science of nourishing your unique body for vitality and longevity.'
  },
  'astavakra': {
    heroImage: 'https://images.unsplash.com/photo-1518191766444-14a89f16daac?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/L3GGhK65iEw',
    whatYouWillLearn: [
      'Experience radical non-dual awareness (Advaita) following the Astavakra Gita',
      'Direct realization of the self beyond body, mind, and intellect',
      'The path of effortless meditation and absolute stillness',
      'Integrate the revolutionary wisdom of Sage Astavakra into daily life',
      'Transmission of silence from enlightened masters in deep retreat'
    ],
    highlightVideos: [
      { title: 'The Wisdom of Astavakra', url: 'https://www.youtube.com/embed/L3GGhK65iEw' },
      { title: 'Path of No-Effort', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Radical Awakening', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'This supreme level program is taught by masters who live the non-dual truth. Prerequisites: Swar Yoga Level 2 and prior approval. Conducted in profound silence and intensive residential retreat.',
    testimonials: [
      { quote: 'A lightning bolt that shattered my ego overnight. Pure bliss.', name: 'Arjun Reddy', place: 'Goa' },
      { quote: 'The most direct and uncompromising path to liberation I have found.', name: 'Meera Sinha', place: 'Rishikesh' },
      { quote: 'No more seeker, just the seeking completed. Absolute clarity.', name: 'Ravi Kumar', place: 'Varanasi' },
      { quote: ' Sage Astavakra\'s words came alive in my own heart.', name: 'Anjana Verma', place: 'Ujjain' }
    ],
    videoTestimonials: [
      { name: 'Sadhak 1 - Awakening', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Sadhak 2 - Stillness', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Sadhak 3 - Clarity', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Sadhak 4 - Freedom', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'The peak of spiritual evolution. 10 days of radical transcendence through the timeless wisdom of the Astavakra Gita.'
  },
  'pre-pregnancy': {
    heroImage: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/y90cV_3OMrQ',
    whatYouWillLearn: [
      'Practice safe yoga specifically designed for pregnancy',
      'Reduce pregnancy discomforts naturally',
      'Prepare body and mind for childbirth',
      'Maintain emotional wellbeing throughout pregnancy',
      'Promote healthy fetal development'
    ],
    highlightVideos: [
      { title: 'Safe Pregnancy Yoga', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { title: 'Breathing for Childbirth', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Happy Mothers', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Specialized program created by yoga experts with obstetric knowledge. Safe, gentle practices designed specifically for pregnant women at every stage.',
    testimonials: [
      { quote: 'Pregnancy discomforts disappeared completely!', name: 'Priya Mehta', place: 'Bangalore' },
      { quote: 'My anxiety and fear about childbirth vanished.', name: 'Shreya Nair', place: 'Thiruvananthapuram' },
      { quote: 'Easy and natural labor thanks to these practices.', name: 'Pooja Singh', place: 'Chandigarh' },
      { quote: 'Felt amazing throughout my entire pregnancy!', name: 'Divya Gupta', place: 'Noida' }
    ],
    videoTestimonials: [
      { name: 'Mom 1 - Easy Birth', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Mom 2 - Pain-Free', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Mom 3 - Healthy Baby', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Mom 4 - Joyful Pregnancy', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Ensure a safe, healthy, joyful pregnancy. Join the 36-day program designed specifically for expecting mothers.'
  },
  'swy-children': {
    heroImage: 'https://images.unsplash.com/photo-1476703993599-0035a260f381?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/8HWaFGJz6Yw',
    whatYouWillLearn: [
      'Practice yoga in fun, age-appropriate ways',
      'Develop focus and concentration for studies',
      'Build confidence and self-esteem',
      'Learn emotional intelligence and resilience',
      'Create healthy, joyful habits from childhood'
    ],
    highlightVideos: [
      { title: 'Fun Yoga for Kids', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' },
      { title: 'Focus and Confidence', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Happy Kids Success', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Child-friendly instructors who understand children\'s psychology and developmental needs. Interactive, playful, and effective approaches make learning fun.',
    testimonials: [
      { quote: 'My child\'s school grades improved significantly!', name: 'Arun Verma', place: 'Delhi' },
      { quote: 'Hyperactivity and restlessness completely reduced.', name: 'Isha Kapoor', place: 'Mumbai' },
      { quote: 'Increased confidence and happiness at school.', name: 'Dev Nair', place: 'Kochi' },
      { quote: 'My child now loves practicing yoga every day!', name: 'Sara Khan', place: 'Pune' }
    ],
    videoTestimonials: [
      { name: 'Arun - Age 8', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Isha - Age 10', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Dev - Age 12', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Sara - Age 14', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Give your child the gift of yoga and wellness. 10-day program with fun, engaging, and transformative practices.'
  },
  'complete-health': {
    heroImage: 'https://images.unsplash.com/photo-1519824141121-99767218abb2?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/5jvJY-I7Vug',
    whatYouWillLearn: [
      'Holistic approach to BP, diabetes, and cardiovascular health',
      'Integrate therapeutic massage for circulation and healing',
      'Natural protocols for liver and kidney rejuvenation',
      'Overcome migraines and hormonal imbalances naturally',
      'Restore vitality and long-term wellness'
    ],
    highlightVideos: [
      { title: 'Holistic Health Science', url: 'https://www.youtube.com/embed/5jvJY-I7Vug' },
      { title: 'Disease Reversal Methods', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Health Transformations', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Expert practitioners trained in both traditional yoga science and modern medical understanding. Comprehensive protocols for each health condition.',
    testimonials: [
      { quote: 'My blood pressure normalized without medication!', name: 'Suresh Sharma', place: 'Ahmedabad' },
      { quote: 'Diabetes under control through natural methods.', name: 'Sakshi Desai', place: 'Nagpur' },
      { quote: 'Migraines disappeared after 30 years of suffering.', name: 'Vikram Reddy', place: 'Hyderabad' },
      { quote: 'Doctors amazed by my complete health recovery!', name: 'Neeta Patel', place: 'Rajkot' }
    ],
    videoTestimonials: [
      { name: 'Sharma - BP Cured', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Gupta - Diabetes Reversed', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Desai - Heart Health', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Khan - Total Wellness', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Reclaim your health with the Complete Health program. Holistic healing for all major health conditions in 45 days.'
  },
  'corporate-swy': {
    heroImage: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/9_OLxmZzcNQ',
    whatYouWillLearn: [
      'Manage workplace stress and pressure effectively',
      'Make better strategic business decisions',
      'Enhance leadership and negotiation skills',
      'Boost productivity and team performance',
      'Achieve work-life balance and wellbeing'
    ],
    highlightVideos: [
      { title: 'Corporate Performance', url: 'https://www.youtube.com/embed/9_OLxmZzcNQ' },
      { title: 'Decision-Making Excellence', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Executive Success Stories', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Specialized for corporate professionals. Teachers understand business pressures and provide immediately applicable techniques for office environments.',
    testimonials: [
      { quote: 'My sales increased by 40% after the program!', name: 'Rajesh Chopra', place: 'Gurgaon' },
      { quote: 'Team dynamics improved dramatically.', name: 'Priya Sharma', place: 'Bangalore' },
      { quote: 'Stress at work completely reduced.', name: 'Amit Gupta', place: 'Mumbai' },
      { quote: 'Finally found balance between work and personal life.', name: 'Anjali Singh', place: 'Delhi' }
    ],
    videoTestimonials: [
      { name: 'CEO - Fortune 500', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Manager - Tech Company', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Sales Head - Corporate', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Executive - Finance', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Elevate your corporate leadership. 10-day intensive designed specifically for busy professionals seeking peak performance.'
  },
  'self-awareness': {
    heroImage: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/GNNmCPBSyv8',
    whatYouWillLearn: [
      'Master the path of Jnana Yoga (Knowledge) as taught by Adi Shankaracharya',
      'Analyze and dissolve the layers of ego conditioning (Pancha Kosha)',
      'The direct realization of "Aham Brahmasmi" (I am Brahman)',
      'Understand and transcend the illusion of duality (Maya)',
      'Establish yourself in the state of eternal, unchanging awareness'
    ],
    highlightVideos: [
      { title: 'The Path of Shankaracharya', url: 'https://www.youtube.com/embed/GNNmCPBSyv8' },
      { title: 'Dissolving the Ego', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Eternal Awareness', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'A month-long immersive journey led by scholars and practitioners of Advaita Vedanta. This Level-4 retreat is the ultimate offering of Swar Yoga for those seeking final liberation (Moksha).',
    testimonials: [
      { quote: 'The teachings of Adi Shankaracharya became my living reality.', name: 'Samir Kapoor', place: 'Goa' },
      { quote: 'I finally found the "I" that never changes amidst all life\'s storms.', name: 'Deepa Nair', place: 'Rishikesh' },
      { quote: 'A systematic and profound dismantling of everything I thought I was.', name: 'Arjun Sinha', place: 'Varanasi' },
      { quote: 'The most authentic exposition of non-duality I have ever experienced.', name: 'Meera Verma', place: 'Ujjain' }
    ],
    videoTestimonials: [
      { name: 'Seeker - Realization', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Seeker - Freedom', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Seeker - Truth', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Seeker - Awakening', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'The ultimate 30-day residential transformation. Step into the lineage of Adi Shankaracharya and realize your true nature as infinite awareness.'
  },
  'happy-marriage': {
    heroImage: 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/gNbVlsGXe3M',
    whatYouWillLearn: [
      'Enhance compatibility and understanding with partner',
      'Improve communication and intimacy',
      'Align with partner\'s natural rhythms',
      'Transform conflict into connection',
      'Deepen the bonds of love and partnership'
    ],
    highlightVideos: [
      { title: 'Relationship Harmony', url: 'https://www.youtube.com/embed/gNbVlsGXe3M' },
      { title: 'Couples Communication', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Love Stories', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Expert couple\'s counselors trained in Swar Yoga relationship techniques. Helps couples understand and strengthen their partnership.',
    testimonials: [
      { quote: 'Our marriage feels like dating again!', name: 'Rahul Verma', place: 'Chandigarh' },
      { quote: 'Finally understand my partner deeply.', name: 'Neha Patel', place: 'Ahmedabad' },
      { quote: 'Conflicts resolved with loving communication.', name: 'Vikram Sharma', place: 'Pune' },
      { quote: 'Our love deepened in ways we never expected.', name: 'Swati Iyer', place: 'Chennai' }
    ],
    videoTestimonials: [
      { name: 'Couple 1 - Rekindled Love', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Couple 2 - Communication', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Couple 3 - Harmony', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Couple 4 - Forever Love', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Transform your marriage into a loving partnership. 36-day program to deepen connection and create lasting happiness together.'
  },
  'gurukul-training': {
    heroImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/XQ6MYL_rKgE',
    whatYouWillLearn: [
      'Complete knowledge of Swar Yoga teaching methods',
      'Traditional Gurukul education philosophy',
      'Advanced teaching and mentoring skills',
      'Build a career teaching yoga and wellness',
      'Spread transformative teachings worldwide'
    ],
    highlightVideos: [
      { title: 'Gurukul Philosophy', url: 'https://www.youtube.com/embed/XQ6MYL_rKgE' },
      { title: 'Teaching Methodology', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Graduate Success', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: '90-day intensive residential training from master teachers. Comprehensive knowledge transmission and extensive mentorship for future Gurukul leaders.',
    testimonials: [
      { quote: 'Became a confident, skilled yoga teacher.', name: 'Anand Kumar', place: 'Lucknow' },
      { quote: 'Ready to help thousands transform their lives.', name: 'Priya Sharma', place: 'Indore' },
      { quote: 'Traditional wisdom combined with modern methods.', name: 'Sanjay Singh', place: 'Nagpur' },
      { quote: 'Most fulfilling career path I\'ve ever chosen.', name: 'Divya Desai', place: 'Surat' }
    ],
    videoTestimonials: [
      { name: 'Teacher 1 - Passionate Educator', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Teacher 2 - School Owner', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Teacher 3 - Corporate Trainer', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Teacher 4 - International Teacher', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Begin your 90-day Gurukul Teachers Training. Master teaching skills and become a qualified Swar Yoga educator.'
  },
  'swy-teacher': {
    heroImage: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/7qTSVzR6gIc',
    whatYouWillLearn: [
      'Get certified to teach Swar Yoga to others',
      'Master both theory and practical teaching',
      'Develop effective communication skills',
      'Learn business and entrepreneurship aspects',
      'Build a meaningful teaching career'
    ],
    highlightVideos: [
      { title: 'Teacher Certification', url: 'https://www.youtube.com/embed/7qTSVzR6gIc' },
      { title: 'Teaching Techniques', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Successful Teachers', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Comprehensive certification program with globally recognized credentials. Covers theory, practice, teaching methodology, and business skills.',
    testimonials: [
      { quote: 'Got certified and started teaching within months!', name: 'Rohit Desai', place: 'Nashik' },
      { quote: 'International opportunities opened up.', name: 'Sakshi Nair', place: 'Kottayam' },
      { quote: 'Building a thriving yoga teaching business.', name: 'Amar Singh', place: 'Guwahati' },
      { quote: 'Making a real difference in people\'s lives.', name: 'Priyanka Gupta', place: 'Raipur' }
    ],
    videoTestimonials: [
      { name: 'Certified Teacher 1', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Certified Teacher 2', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Certified Teacher 3', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Certified Teacher 4', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Get certified as a professional Swar Yoga teacher. 15-day intensive with globally recognized credentials.'
  },
  'gurukul-organiser-training': {
    heroImage: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/mTVVNGMBx0Q',
    whatYouWillLearn: [
      'Establish and manage yoga centers and programs',
      'Develop effective organizational leadership',
      'Design Gurukul curriculum and programs',
      'Manage staff, finances, and operations',
      'Build sustainable yoga enterprises'
    ],
    highlightVideos: [
      { title: 'Organiser Training Overview', url: 'https://www.youtube.com/embed/mTVVNGMBx0Q' },
      { title: 'Business Fundamentals', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Successful Centers', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: 'Training for entrepreneurs and leaders seeking to establish yoga centers. Combines yoga philosophy with modern business management.',
    testimonials: [
      { quote: 'Opened 3 successful yoga centers!', name: 'Ashok Kumar', place: 'Vadodara' },
      { quote: 'Business thriving with strong values.', name: 'Meera Patel', place: 'Bhavnagar' },
      { quote: 'Impacting thousands of lives.', name: 'Vikram Reddy', place: 'Tirupati' },
      { quote: 'Building a legacy of wellness.', name: 'Anjana Sharma', place: 'Indore' }
    ],
    videoTestimonials: [
      { name: 'Center Owner 1', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Center Owner 2', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Franchise Leader', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Regional Director', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Learn to build and manage yoga centers. 45-day training combining yoga philosophy with business excellence.'
  },
  'naturopathy': {
    heroImage: 'https://images.unsplash.com/photo-1620733321588-2f0851f50a49?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/nGNnVhEhjPg',
    whatYouWillLearn: [
      'Master natural healing following Mahavir\'s ascetic wisdom',
      'Specialized treatments including Shirodhara and therapeutic massage',
      'Learn herbal remedies and natural water therapy',
      'Apply diet and lifestyle modifications for total health',
      'Diagnose and treat imbalances without pharmaceuticals'
    ],
    highlightVideos: [
      { title: 'Naturopathy Science', url: 'https://www.youtube.com/embed/nGNnVhEhjPg' },
      { title: 'Healing Protocols', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Patient Transformations', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    mentorInfo: '30-day residential program with experienced naturopathy practitioners. Complete training in natural healing methods and treatment protocols.',
    testimonials: [
      { quote: 'Learned to heal naturally without drugs.', name: 'Suresh Verma', place: 'Alappuzha' },
      { quote: 'Amazing results in patient care.', name: 'Deepa Sharma', place: 'Palakkad' },
      { quote: 'Natural methods work better than pharmaceuticals.', name: 'Ravi Gupta', place: 'Thrissur' },
      { quote: 'Building a thriving naturopathy practice.', name: 'Sneha Desai', place: 'Malappuram' }
    ],
    videoTestimonials: [
      { name: 'Practitioner 1 - Natural Healer', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Practitioner 2 - Clinic Owner', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Practitioner 3 - Alternative Medicine', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Practitioner 4 - Wellness Expert', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Master natural healing methods. 30-day residential naturopathy treatment program with credentials and expertise.'
  },
  'master-swar-yoga': {
    heroImage: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=1200',
    introVideoUrl: 'https://www.youtube.com/embed/luSaTlBXssM',
    whatYouWillLearn: [
      'Level 1 to 5 - Complete Master Class Curriculum',
      'Advanced Swar Yoga & Breath Mastery',
      'Non-dualistic (Advaita) Philosophy & Realization',
      'Astavakra Gita & Meditation Mastery',
      'Hereditary Health & Lifespan Secrets'
    ],
    highlightVideos: [
      { title: 'Master Class Intro', url: 'https://www.youtube.com/embed/j_H8i50HjYQ' },
      { title: 'Level 1-5 Journey', url: 'https://www.youtube.com/embed/_sVjfPam0SM' },
      { title: 'The Power of Mastery', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' }
    ],
    detailVideos: [
      { title: 'Science of Swar', url: 'https://www.youtube.com/embed/fxA5CjzgHQA' },
      { title: 'Meditation Depth', url: 'https://www.youtube.com/embed/_EWOgcAc8GA' },
      { title: 'Final Realization', url: 'https://www.youtube.com/embed/5nqVXQG9Mvk' }
    ],
    mentorInfo: 'The Master Swar Yoga program is mentored by masters with decades of experience in the lineage of absolute self-realization.',
    testimonials: [
      { quote: 'The most comprehensive spiritual journey I have ever taken.', name: 'Dr. Ramesh', place: 'Bangalore' },
      { quote: 'Level 1-5 combined is a life-changing experience.', name: 'Sunita Mani', place: 'Hyderabad' },
      { quote: 'I finally understood the connection between breath and soul.', name: 'Amitabh', place: 'Mumbai' },
      { quote: 'The 6-month progression is perfectly designed.', name: 'Kavita', place: 'Delhi' }
    ],
    videoTestimonials: [
      { name: 'Master Student 1', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Master Student 2', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Master Student 3', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Master Student 4', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: 'Enroll in the 6-Month Master Swar Yoga Program. Complete your journey from Level 1 to Level 5.'
  }
};

export const findWorkshopBySlug = (slug: string) => workshopCatalog.find((workshop) => workshop.slug === slug);
