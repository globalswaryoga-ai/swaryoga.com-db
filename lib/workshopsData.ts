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
  'yogasana-sadhana': {
    name: 'Yogasana & Sadhana',
    slug: 'yogasana-sadhana',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    description: 'A complete yogasana and sadhana practice program for disciplined daily growth.',
    detailedDescription: 'Master the fundamental yogasanas and integrate them into a daily sadhana (spiritual practice) that transforms your body, mind, and spirit. This comprehensive program covers classical yoga postures combined with breathing techniques and meditation. You will develop strength, flexibility, and inner awareness through consistent daily practice. Perfect for beginners and experienced practitioners seeking to deepen their practice. This program has helped thousands achieve better health, mental clarity, and spiritual growth.',
    videoUrl: 'https://www.youtube.com/embed/mzYKqFxYzQU',
    duration: '21 days',
    level: 'All Levels',
    category: 'Sadhana',
    mode: ['Online', 'Offline'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-level-1': {
    name: 'Swar Yoga Level-1 Workshop',
    slug: 'swar-yoga-level-1',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    description: 'First level comprehensive Swar Yoga training',
    detailedDescription: 'Unlock the ancient science of Swar Yoga and learn how to balance your body, mind, and energy through nasal breathing techniques. Level-1 introduces the fundamentals of alternating nostrils and their effects on consciousness. This workshop teaches you to harness the natural rhythm of your breath to improve health, energy levels, and decision-making abilities. Participants learn practical techniques that can be applied immediately in daily life for enhanced vitality and mental clarity.',
    videoUrl: 'https://www.youtube.com/embed/0q2FWUqqqPs',
    duration: '15 days',
    level: 'Beginner',
    category: 'Swar Yoga',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-level-2': {
    name: 'Swar Yoga Level-2 Workshop',
    slug: 'swar-yoga-level-2',
    image: 'https://images.pexels.com/photos/3873033/pexels-photo-3873033.jpeg',
    description: 'Advanced Swar Yoga for wealth creation and prosperity',
    detailedDescription: 'Build on Level-1 foundations with advanced Swar Yoga techniques specifically designed for wealth creation, prosperity, and success. Learn the deeper principles of lunar and solar energy cycles and how to align them with your intentions. This advanced workshop reveals ancient secrets used by successful entrepreneurs and leaders. Master timing for important decisions, business launches, and personal goals aligned with natural cycles.',
    videoUrl: 'https://www.youtube.com/embed/5nqVXQG9Mvk',
    duration: '15 days',
    level: 'Intermediate',
    category: 'Swar Yoga',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swar-yoga-youth': {
    name: 'Swar Yoga Youth Program',
    slug: 'swar-yoga-youth',
    image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg',
    description: 'Specially designed for young practitioners',
    detailedDescription: 'A modern, engaging approach to Swar Yoga specifically tailored for young adults and teenagers. This program addresses common challenges like stress, focus issues, and confidence using ancient yoga science combined with contemporary understanding. Youth learn practical tools to excel in academics, sports, and relationships. Interactive, fun, and results-driven approach makes ancient wisdom accessible to today\'s generation.',
    videoUrl: 'https://www.youtube.com/embed/xm1h7KLhBNM',
    duration: '10 days',
    level: 'Beginner',
    category: 'Youth',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'weight-loss': {
    name: 'Weight Loss Program',
    slug: 'weight-loss',
    image: 'https://images.pexels.com/photos/1624365/pexels-photo-1624365.jpeg',
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
    image: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg',
    description: 'Deep meditation and mindfulness training',
    detailedDescription: 'Journey into profound states of meditation and inner peace through scientifically-backed techniques. This program progressively develops your meditation capacity, from basic mindfulness to advanced states of consciousness. Experience reduced stress, enhanced focus, and spiritual connection. Daily guided practices combined with theory helps you understand the mechanics of mind and meditation.',
    videoUrl: 'https://www.youtube.com/embed/T3qQdIj7f0Y',
    duration: '15 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'amrut-aahar': {
    name: 'Amrut Aahar Program',
    slug: 'amrut-aahar',
    image: 'https://images.pexels.com/photos/3807507/pexels-photo-3807507.jpeg',
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
    image: 'https://images.pexels.com/photos/3807516/pexels-photo-3807516.jpeg',
    description: 'Level-3 advanced meditation and wisdom',
    detailedDescription: 'The highest level of advanced meditation practice drawing from the Astavakra Gita teachings. This intensive residential program guides seekers into transcendent states of consciousness and self-realization. Only for those who have completed prerequisite levels. Experience non-dual awareness and the ultimate truths of existence through direct practice and transmission from the master.',
    videoUrl: 'https://www.youtube.com/embed/L3GGhK65iEw',
    duration: '10 days',
    level: 'Advanced',
    category: 'Swar Yoga',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'pre-pregnancy': {
    name: 'Pre Pregnancy Program',
    slug: 'pre-pregnancy',
    image: 'https://images.pexels.com/photos/3807521/pexels-photo-3807521.jpeg',
    description: 'Safe yoga practice for expecting mothers',
    detailedDescription: 'A specially designed program for expectant mothers that ensures safe, effective yoga practice throughout pregnancy. Learn techniques to reduce pregnancy discomfort, prepare for childbirth naturally, and maintain emotional wellbeing. Includes gentle movements, breathing practices, and meditation designed specifically for pregnant women. Reduces anxiety, improves sleep, and promotes healthy development of the baby.',
    videoUrl: 'https://www.youtube.com/embed/y90cV_3OMrQ',
    duration: '36 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swy-children': {
    name: 'Swar Yoga Children Program',
    slug: 'swy-children',
    image: 'https://images.pexels.com/photos/3807518/pexels-photo-3807518.jpeg',
    description: 'Yoga training for children and teenagers',
    detailedDescription: 'Introduce children to yoga with fun, engaging, and age-appropriate practices. This program helps kids develop focus, confidence, physical strength, and emotional intelligence. Through games, stories, and interactive practices, children learn ancient wisdom in a modern, relatable way. Reduces hyperactivity, improves concentration for studies, and builds character.',
    videoUrl: 'https://www.youtube.com/embed/8HWaFGJz6Yw',
    duration: '10 days',
    level: 'Beginner',
    category: 'Youth',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'complete-health': {
    name: 'Complete Health Program',
    slug: 'complete-health',
    image: 'https://images.pexels.com/photos/3807519/pexels-photo-3807519.jpeg',
    description: 'Holistic cure for BP, diabetes, heart, liver, kidney, migraine & hormonal balance',
    detailedDescription: 'A comprehensive holistic healing program addressing all major health conditions including hypertension, diabetes, heart disease, liver and kidney issues, migraines, and hormonal imbalances. Using ancient yoga science combined with modern health understanding, this program facilitates natural healing and reversal of chronic diseases. Participants report significant improvement in symptoms, reduced medication dependency, and restored vitality.',
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
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    description: 'Stress management and productivity for corporate professionals',
    detailedDescription: 'Tailored for corporate leaders and professionals, this program teaches practical techniques to manage stress, make better decisions, and boost productivity. Learn how to use Swar Yoga for strategic timing, negotiation success, and team management. Applicable immediately in business contexts with measurable results in performance and wellbeing.',
    videoUrl: 'https://www.youtube.com/embed/9_OLxmZzcNQ',
    duration: '10 days',
    level: 'Intermediate',
    category: 'Corporate',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'self-awareness': {
    name: 'Self Awareness Level-4',
    slug: 'self-awareness',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    description: 'Ultimate self-discovery and spiritual transformation',
    detailedDescription: 'The pinnacle of self-discovery and spiritual transformation through intensive residential practice. This advanced Level-4 program facilitates profound shifts in consciousness and understanding of one\'s true nature. Experience direct realization of your authentic self beyond ego and conditioning. Suitable only for advanced practitioners committed to radical transformation.',
    videoUrl: 'https://www.youtube.com/embed/GNNmCPBSyv8',
    duration: '30 days',
    level: 'Advanced',
    category: 'Swar Yoga',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'happy-marriage': {
    name: 'Happy Married Life',
    slug: 'happy-marriage',
    image: 'https://images.pexels.com/photos/3807512/pexels-photo-3807512.jpeg',
    description: 'Transform your married life with Swar Yoga techniques',
    detailedDescription: 'Revitalize your married life using proven Swar Yoga techniques that enhance compatibility, communication, and intimacy. Learn how to align with your partner\'s natural rhythms and create harmonious relationships. This program addresses common marriage challenges and provides practical tools for couples. Transform conflict into connection and deepen the bonds of love.',
    videoUrl: 'https://www.youtube.com/embed/gNbVlsGXe3M',
    duration: '36 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'gurukul-training': {
    name: 'Gurukul Teachers Training',
    slug: 'gurukul-training',
    image: 'https://images.pexels.com/photos/3807522/pexels-photo-3807522.jpeg',
    description: 'Comprehensive teacher training program in traditional Gurukul style',
    detailedDescription: 'Become a master teacher in the traditional Gurukul education system. This 90-day intensive residential program transmits the complete knowledge and skills needed to teach Swar Yoga and yoga science at the highest level. Includes extensive mentorship, practice, and teaching methodology. Produces qualified teachers capable of spreading these transformative teachings worldwide.',
    videoUrl: 'https://www.youtube.com/embed/XQ6MYL_rKgE',
    duration: '90 days',
    level: 'Advanced',
    category: 'Swar Yoga',
    mode: ['Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'swy-teacher': {
    name: 'Swar Yoga Teachers Training',
    slug: 'swy-teacher',
    image: 'https://images.pexels.com/photos/3807523/pexels-photo-3807523.jpeg',
    description: 'Become a certified Swar Yoga teacher and trainer',
    detailedDescription: 'Get certified to teach Swar Yoga to others and build a meaningful career. This comprehensive program covers theory, practice, teaching methodology, and business aspects. Learn how to effectively communicate these ancient techniques to modern practitioners. This certification is globally recognized and opens doors to teaching opportunities worldwide.',
    videoUrl: 'https://www.youtube.com/embed/7qTSVzR6gIc',
    duration: '15 days',
    level: 'Advanced',
    category: 'Swar Yoga',
    mode: ['Online'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  'gurukul-organiser-training': {
    name: 'Gurukul Organiser Training',
    slug: 'gurukul-organiser-training',
    image: 'https://images.pexels.com/photos/3807524/pexels-photo-3807524.jpeg',
    description: 'Training program to build organisers who can manage and grow Gurukul systems.',
    detailedDescription: 'Learn to organize and manage Gurukul education centers and yoga programs. This training develops leadership skills, business acumen, and deep knowledge needed to establish sustainable yoga and wellness centers. Includes curriculum design, student management, staff training, and financial planning for yoga enterprises.',
    videoUrl: 'https://www.youtube.com/embed/mTVVNGMBx0Q',
    duration: '45 days',
    level: 'Intermediate',
    category: 'Gurukul',
    mode: ['Online', 'Residential'],
    language: ['Hindi', 'English', 'Marathi'],
    currency: ['INR', 'NPR', 'USD']
  },
  naturopathy: {
    name: 'Naturopathy Treatment Program',
    slug: 'naturopathy',
    image: 'https://images.pexels.com/photos/3807524/pexels-photo-3807524.jpeg',
    description: 'Complete natural healing and naturopathy treatment protocols',
    detailedDescription: 'Master the ancient art and science of natural healing through this comprehensive naturopathy program. Learn to diagnose imbalances and apply natural treatments including herbs, diet, water therapy, and lifestyle modifications. This residential program teaches you to facilitate deep healing without pharmaceuticals. Ideal for practitioners seeking alternative medicine credentials.',
    videoUrl: 'https://www.youtube.com/embed/nGNnVhEhjPg',
    duration: '30 days',
    level: 'All Levels',
    category: 'Health',
    mode: ['Residential'],
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
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
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
  'swar-yoga-basic': {
    id: 1,
    name: 'Swar Yoga Basic Workshop',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    duration: '3 days',
    level: 'Beginner',
    price: '₹2,999',
    schedules: [
      { id: 'o1', mode: 'online', startDate: '2025-01-15', endDate: '2025-01-17', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'o2', mode: 'online', startDate: '2025-02-10', endDate: '2025-02-12', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'o3', mode: 'online', startDate: '2025-03-05', endDate: '2025-03-07', time: '5:00 PM - 7:00 PM', seats: 45, price: 2999, currency: 'INR' },
      { id: 'o4', mode: 'online', startDate: '2025-04-12', endDate: '2025-04-14', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'o5', mode: 'online', startDate: '2025-05-20', endDate: '2025-05-22', time: '5:00 PM - 7:00 PM', seats: 40, price: 2999, currency: 'INR' },
      { id: 'o6', mode: 'online', startDate: '2025-06-15', endDate: '2025-06-17', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'of1', mode: 'offline', startDate: '2025-01-20', endDate: '2025-01-22', time: '7:00 AM - 9:00 AM', seats: 30, price: 3999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of2', mode: 'offline', startDate: '2025-02-15', endDate: '2025-02-17', time: '7:00 AM - 9:00 AM', seats: 28, price: 3999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of3', mode: 'offline', startDate: '2025-03-10', endDate: '2025-03-12', time: '6:00 AM - 8:00 AM', seats: 25, price: 3999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'of4', mode: 'offline', startDate: '2025-04-18', endDate: '2025-04-20', time: '7:00 AM - 9:00 AM', seats: 30, price: 3999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of5', mode: 'offline', startDate: '2025-05-25', endDate: '2025-05-27', time: '6:00 AM - 8:00 AM', seats: 22, price: 3999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of6', mode: 'offline', startDate: '2025-06-20', endDate: '2025-06-22', time: '7:00 AM - 9:00 AM', seats: 30, price: 3999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'r1', mode: 'residential', startDate: '2025-01-25', endDate: '2025-01-27', time: 'Full Day', seats: 20, price: 5999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r2', mode: 'residential', startDate: '2025-02-22', endDate: '2025-02-24', time: 'Full Day', seats: 18, price: 5999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r3', mode: 'residential', startDate: '2025-03-18', endDate: '2025-03-20', time: 'Full Day', seats: 20, price: 5999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r4', mode: 'residential', startDate: '2025-04-25', endDate: '2025-04-27', time: 'Full Day', seats: 15, price: 5999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r5', mode: 'residential', startDate: '2025-05-30', endDate: '2025-06-01', time: 'Full Day', seats: 20, price: 5999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r6', mode: 'residential', startDate: '2025-06-28', endDate: '2025-06-30', time: 'Full Day', seats: 18, price: 5999, currency: 'INR', location: 'Goa Retreat Center' }
    ]
  },
  'swar-yoga-level-1': {
    id: 2,
    name: 'Swar Yoga Level-1 Workshop',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    duration: '15 days',
    level: 'Beginner',
    price: '₹9,999',
    schedules: [
      { id: 'o1', mode: 'online', startDate: '2025-01-10', endDate: '2025-01-24', time: '5:00 PM - 7:00 PM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'o2', mode: 'online', startDate: '2025-02-05', endDate: '2025-02-19', time: '5:00 PM - 7:00 PM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'o3', mode: 'online', startDate: '2025-03-01', endDate: '2025-03-15', time: '6:00 AM - 8:00 AM', seats: 35, price: 9999, currency: 'INR' },
      { id: 'o4', mode: 'online', startDate: '2025-04-08', endDate: '2025-04-22', time: '5:00 PM - 7:00 PM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'o5', mode: 'online', startDate: '2025-05-15', endDate: '2025-05-29', time: '5:00 PM - 7:00 PM', seats: 38, price: 9999, currency: 'INR' },
      { id: 'o6', mode: 'online', startDate: '2025-06-10', endDate: '2025-06-24', time: '6:00 AM - 8:00 AM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'of1', mode: 'offline', startDate: '2025-01-15', endDate: '2025-01-29', time: '7:00 AM - 9:00 AM', seats: 25, price: 12999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of2', mode: 'offline', startDate: '2025-02-10', endDate: '2025-02-24', time: '7:00 AM - 9:00 AM', seats: 20, price: 12999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of3', mode: 'offline', startDate: '2025-03-05', endDate: '2025-03-19', time: '6:00 AM - 8:00 AM', seats: 22, price: 12999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'of4', mode: 'offline', startDate: '2025-04-12', endDate: '2025-04-26', time: '7:00 AM - 9:00 AM', seats: 25, price: 12999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of5', mode: 'offline', startDate: '2025-05-18', endDate: '2025-06-01', time: '6:00 AM - 8:00 AM', seats: 18, price: 12999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of6', mode: 'offline', startDate: '2025-06-15', endDate: '2025-06-29', time: '7:00 AM - 9:00 AM', seats: 25, price: 12999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'r1', mode: 'residential', startDate: '2025-01-20', endDate: '2025-02-03', time: 'Full Day', seats: 15, price: 16999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r2', mode: 'residential', startDate: '2025-02-18', endDate: '2025-03-04', time: 'Full Day', seats: 12, price: 16999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r3', mode: 'residential', startDate: '2025-03-22', endDate: '2025-04-05', time: 'Full Day', seats: 15, price: 16999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r4', mode: 'residential', startDate: '2025-04-28', endDate: '2025-05-12', time: 'Full Day', seats: 10, price: 16999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r5', mode: 'residential', startDate: '2025-05-25', endDate: '2025-06-08', time: 'Full Day', seats: 15, price: 16999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r6', mode: 'residential', startDate: '2025-06-22', endDate: '2025-07-06', time: 'Full Day', seats: 12, price: 16999, currency: 'INR', location: 'Goa Retreat Center' }
    ]
  },
  'swar-yoga-youth': {
    id: 3,
    name: 'Swar Yoga Youth Program',
    image: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg',
    duration: '10 days',
    level: 'All Levels',
    price: '₹4,999',
    schedules: [
      { id: 'o1', mode: 'online', startDate: '2025-01-12', endDate: '2025-01-21', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
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
  }
};

export const findWorkshopBySlug = (slug: string) => workshopCatalog.find((workshop) => workshop.slug === slug);
