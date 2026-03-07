// Script to create 6 professional sample landing pages for Swar Yoga Master Class
// Run: node scripts/create-sample-landing-pages.js

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment');
  process.exit(1);
}

// Landing Page Schema (simplified for script)
const landingPageSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const LandingPage = mongoose.models.LandingPage || mongoose.model('LandingPage', landingPageSchema, 'landingpages');

// Sample landing pages with different professional themes
const samplePages = [
  // 1. BLACK PREMIUM THEME - Luxury Dark
  {
    slug: 'sample-black-premium',
    name: 'Sample - Black Premium Theme',
    status: 'draft',
    heroHeading: 'Master the Ancient Science of Swar Yoga',
    heroSubheading: 'Unlock the secrets of breath consciousness and transform your life with this exclusive masterclass',
    heroCTA: 'Enroll Now - Limited Seats',
    heroCtaLink: '#pricing',
    eventTitle: 'Swar Yoga Masterclass',
    eventDescription: 'Discover the profound wisdom of Swar Yoga - the ancient science of breath and consciousness. This comprehensive masterclass will guide you through the mystical knowledge that has been passed down through generations of yogic masters.\n\nLearn to harness the power of your breath to enhance decision-making, improve health, boost energy, and align with cosmic rhythms for success in all areas of life.',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eventTime: '7:00 PM - 9:00 PM IST',
    location: 'Online via Zoom',
    language: 'English & Hindi',
    theme: {
      mode: 'dark',
      primaryColor: '#FFD700',
      secondaryColor: '#FFFFFF',
      accentColor: '#FFB800',
      backgroundColor: '#0A0A0A',
      textColor: '#E5E5E5',
      fontFamily: 'Playfair Display',
    },
    pricing: [
      {
        name: 'Early Bird',
        price: 1999,
        currency: 'INR',
        originalPrice: 4999,
        features: ['7-Day Live Masterclass', 'Lifetime Recording Access', 'Course Materials PDF', 'Certificate of Completion'],
        isPopular: false,
        ctaText: 'Get Early Bird Price',
      },
      {
        name: 'Premium',
        price: 3999,
        currency: 'INR',
        originalPrice: 7999,
        features: ['Everything in Early Bird', '1-on-1 Doubt Clearing Session', 'Private WhatsApp Group', 'Monthly Q&A Calls', 'Advanced Techniques Module'],
        isPopular: true,
        ctaText: 'Enroll Premium',
      },
      {
        name: 'VIP',
        price: 9999,
        currency: 'INR',
        originalPrice: 19999,
        features: ['Everything in Premium', 'Personal Mentorship (3 months)', 'Exclusive Retreat Invitation', 'Lifetime Updates', 'Priority Support'],
        isPopular: false,
        ctaText: 'Join VIP',
      },
    ],
    instructorName: 'Guruji Mahesh Sharma',
    instructorTitle: 'Swar Yoga Master | 25+ Years Experience',
    instructorBio: 'Guruji Mahesh Sharma is a renowned Swar Yoga practitioner with over 25 years of dedicated practice and teaching. Having trained under the guidance of Himalayan masters, he brings authentic knowledge and practical wisdom to modern seekers.',
    benefits: [
      { icon: '🔮', title: 'Predict Your Day', description: 'Learn to read the subtle signs of breath to make better decisions throughout the day' },
      { icon: '⚡', title: 'Boost Energy', description: 'Harness prana shakti to increase vitality and overcome fatigue naturally' },
      { icon: '🧘', title: 'Deep Meditation', description: 'Use breath awareness to achieve deeper meditative states effortlessly' },
      { icon: '💼', title: 'Business Success', description: 'Apply Swar principles for timing important meetings and decisions' },
      { icon: '❤️', title: 'Health Improvement', description: 'Balance your doshas and improve overall health through breath science' },
      { icon: '🌙', title: 'Better Sleep', description: 'Learn techniques to optimize sleep quality and wake up refreshed' },
    ],
    curriculum: [
      { title: 'Introduction to Swar Yoga', description: 'History, philosophy, and scientific basis of Swar Shastra', duration: '2 hours' },
      { title: 'The Five Elements & Breath', description: 'Understanding Tattvas and their manifestation in breath', duration: '2 hours' },
      { title: 'Ida, Pingala & Sushumna', description: 'The three nadis and their influence on consciousness', duration: '2 hours' },
      { title: 'Daily Swar Practice', description: 'Practical techniques for everyday application', duration: '2 hours' },
      { title: 'Swar for Health & Healing', description: 'Using breath science for physical and mental wellness', duration: '2 hours' },
      { title: 'Advanced Applications', description: 'Swar in decision making, relationships, and spiritual growth', duration: '2 hours' },
      { title: 'Integration & Mastery', description: 'Putting it all together with Q&A and practice session', duration: '2 hours' },
    ],
    testimonials: [
      { name: 'Rajesh Kumar', location: 'Mumbai, India', text: 'This masterclass changed my life! I now make better business decisions using Swar principles.', rating: 5 },
      { name: 'Priya Sharma', location: 'Delhi, India', text: 'The depth of knowledge shared is incredible. Guruji explains complex concepts so simply.', rating: 5 },
      { name: 'David Chen', location: 'Singapore', text: 'As a skeptic, I was amazed by the practical applications. This is real, transformative knowledge.', rating: 5 },
    ],
    faqs: [
      { question: 'Is this suitable for beginners?', answer: 'Absolutely! This masterclass is designed for all levels. No prior yoga or meditation experience is required.' },
      { question: 'Will I get recordings?', answer: 'Yes, all live sessions will be recorded and you will have lifetime access to replay them anytime.' },
      { question: 'What if I miss a live session?', answer: 'No worries! All sessions are recorded and uploaded within 24 hours. You can watch at your convenience.' },
      { question: 'Is there a money-back guarantee?', answer: 'Yes, we offer a 7-day money-back guarantee. If you are not satisfied, we will refund 100%.' },
    ],
    socialProof: {
      studentsCount: 5000,
      reviewsCount: 850,
      avgRating: 4.9,
      yearsExperience: 25,
    },
    countdown: {
      enabled: true,
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      message: '🔥 Special launch price ends in:',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 100,
      seatsRemaining: 23,
      earlyBirdMessage: 'Early bird discount ends soon!',
      showLiveCount: true,
    },
    guarantee: {
      enabled: true,
      days: 7,
      title: '100% Money-Back Guarantee',
      description: 'If you are not completely satisfied with the masterclass within 7 days, we will refund your entire investment. No questions asked.',
    },
    integrations: {
      whatsappNumber: '919876543210',
      whatsappMessage: 'Hi, I am interested in the Swar Yoga Masterclass!',
    },
    problemStatement: {
      enabled: true,
      title: 'Are You Struggling With These Issues?',
      subtitle: 'Most people face these challenges without knowing the solution exists',
      points: [
        { icon: '😰', title: 'Confusion in Decision Making', description: 'Unable to decide the right time for important actions' },
        { icon: '😴', title: 'Low Energy & Fatigue', description: 'Feeling drained despite adequate rest and nutrition' },
        { icon: '🤯', title: 'Stress & Anxiety', description: 'Constant mental pressure affecting health and relationships' },
        { icon: '💔', title: 'Health Issues', description: 'Recurring problems that modern medicine cannot fully address' },
        { icon: '😞', title: 'Missed Opportunities', description: 'Right things at wrong time leading to failures' },
        { icon: '🌀', title: 'Lack of Clarity', description: 'Feeling disconnected from your true purpose and path' },
      ],
    },
    solution: {
      enabled: true,
      title: 'Swar Yoga: Your Complete Solution',
      subtitle: 'Ancient wisdom for modern challenges',
      description: 'Swar Yoga provides a complete framework for understanding the natural rhythms of your body and the universe. By mastering this knowledge, you can align your actions with cosmic timing for guaranteed success.',
      points: [
        'Know exactly when to start new ventures',
        'Predict and prevent health issues',
        'Improve relationships with proper timing',
        'Enhance meditation and spiritual practice',
        'Make better financial decisions',
        'Achieve work-life harmony naturally',
      ],
    },
    transformation: {
      enabled: true,
      title: 'Your Transformation Journey',
      before: {
        title: 'Before Swar Yoga',
        points: ['Random decision making', 'Energy fluctuations throughout day', 'Stress and anxiety', 'Missed opportunities', 'Health imbalances', 'Lack of direction'],
      },
      after: {
        title: 'After Mastering Swar Yoga',
        points: ['Perfect timing for all actions', 'Consistent high energy', 'Inner peace and clarity', 'Right opportunities at right time', 'Optimal health and vitality', 'Clear life purpose and direction'],
      },
    },
    bonuses: [
      { title: 'Swar Yoga Quick Reference Chart', description: 'Printable PDF with all Swar timings and applications', value: 999, currency: 'INR' },
      { title: 'Daily Swar Practice Audio Guide', description: '21-day guided audio program for building the habit', value: 1999, currency: 'INR' },
      { title: 'Private Community Access', description: 'Lifetime access to our exclusive practitioners community', value: 2999, currency: 'INR' },
    ],
    trustBadges: [
      { title: 'Yoga Alliance Certified', image: '' },
      { title: '5000+ Students Worldwide', image: '' },
      { title: 'Featured in Times of India', image: '' },
      { title: '25+ Years Teaching Experience', image: '' },
    ],
  },

  // 2. DARK GREEN NATURE THEME
  {
    slug: 'sample-dark-green-nature',
    name: 'Sample - Dark Green Nature Theme',
    status: 'draft',
    heroHeading: 'Breathe Life Into Your Destiny',
    heroSubheading: 'Connect with nature\'s rhythms through the sacred science of Swar Yoga',
    heroCTA: 'Start Your Journey',
    heroCtaLink: '#pricing',
    eventTitle: 'Swar Yoga Nature Retreat Masterclass',
    eventDescription: 'Immerse yourself in the natural wisdom of Swar Yoga. This masterclass brings together the ancient breath science with nature\'s healing power to create a transformative learning experience.\n\nDiscover how your breath mirrors the cycles of nature and learn to live in harmony with the cosmic rhythms.',
    startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eventTime: '6:00 AM - 8:00 AM IST',
    location: 'Online + Optional In-Person',
    language: 'English & Hindi',
    theme: {
      mode: 'dark',
      primaryColor: '#22C55E',
      secondaryColor: '#86EFAC',
      accentColor: '#4ADE80',
      backgroundColor: '#052E16',
      textColor: '#DCFCE7',
      fontFamily: 'Lora',
    },
    pricing: [
      {
        name: 'Digital Access',
        price: 2499,
        currency: 'INR',
        originalPrice: 4999,
        features: ['Complete Online Course', 'Nature Meditation Audios', 'Swar Practice Guide', 'Community Access'],
        isPopular: false,
        ctaText: 'Get Digital Access',
      },
      {
        name: 'Complete Experience',
        price: 4999,
        currency: 'INR',
        originalPrice: 9999,
        features: ['Everything in Digital', 'Live Q&A Sessions', '1-on-1 Consultation', 'Advanced Modules', 'Lifetime Updates'],
        isPopular: true,
        ctaText: 'Join Complete Experience',
      },
    ],
    instructorName: 'Guruji Mahesh Sharma',
    instructorTitle: 'Swar Yoga & Nature Healing Expert',
    instructorBio: 'With 25+ years of practice in both Swar Yoga and nature-based healing, Guruji brings a unique perspective that connects breath science with the natural world.',
    benefits: [
      { icon: '🌳', title: 'Nature Connection', description: 'Deepen your bond with nature through breath awareness' },
      { icon: '🌬️', title: 'Breath Mastery', description: 'Learn to read and control your breath patterns' },
      { icon: '🌿', title: 'Natural Healing', description: 'Use breath for self-healing and vitality' },
      { icon: '🌙', title: 'Lunar Rhythms', description: 'Align with moon cycles for optimal living' },
      { icon: '☀️', title: 'Solar Energy', description: 'Harness sun energy through specific practices' },
      { icon: '🦋', title: 'Transformation', description: 'Experience profound personal transformation' },
    ],
    curriculum: [
      { title: 'Swar Yoga & Nature', description: 'Understanding the connection between breath and natural cycles', duration: '90 mins' },
      { title: 'The Five Elements in Breath', description: 'Earth, Water, Fire, Air, Ether - their signs and applications', duration: '2 hours' },
      { title: 'Moon & Breath Cycles', description: 'Lunar phases and their effect on Ida-Pingala', duration: '90 mins' },
      { title: 'Nature Meditation Practices', description: 'Outdoor practices to enhance Swar awareness', duration: '2 hours' },
      { title: 'Healing with Swar', description: 'Natural remedies and breath-based healing', duration: '2 hours' },
    ],
    testimonials: [
      { name: 'Anita Desai', location: 'Bangalore, India', text: 'The nature integration makes this so unique. I feel more connected to myself and the world.', rating: 5 },
      { name: 'Michael Brown', location: 'California, USA', text: 'This is exactly what I was looking for - authentic yoga wisdom with ecological awareness.', rating: 5 },
    ],
    faqs: [
      { question: 'Do I need to be in nature to practice?', answer: 'No, the techniques can be practiced anywhere. However, nature settings enhance the experience.' },
      { question: 'Is morning time mandatory?', answer: 'Early morning is ideal but recordings are available for flexible learning.' },
    ],
    socialProof: {
      studentsCount: 3500,
      reviewsCount: 620,
      avgRating: 4.8,
      yearsExperience: 25,
    },
    countdown: {
      enabled: true,
      endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      message: '🌿 Nature batch closing in:',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 50,
      seatsRemaining: 12,
      showLiveCount: true,
    },
    guarantee: {
      enabled: true,
      days: 14,
      title: '14-Day Nature Guarantee',
      description: 'Try the complete program for 14 days. If you don\'t feel more connected to nature and yourself, get a full refund.',
    },
    problemStatement: {
      enabled: true,
      title: 'Feeling Disconnected?',
      points: [
        { icon: '🏙️', title: 'Urban Stress', description: 'City life draining your energy and peace' },
        { icon: '📱', title: 'Digital Overwhelm', description: 'Constant screen time affecting your natural rhythms' },
        { icon: '😔', title: 'Nature Deficit', description: 'Longing for connection with the natural world' },
      ],
    },
    solution: {
      enabled: true,
      title: 'Return to Your Natural State',
      description: 'Through Swar Yoga, reconnect with the rhythms that govern all life. Your breath is the bridge between you and nature.',
      points: ['Sync with natural cycles', 'Reduce digital dependence', 'Find inner peace', 'Live harmoniously'],
    },
    transformation: {
      enabled: true,
      title: 'From Disconnected to Harmonized',
      before: { title: 'Current State', points: ['Stressed and rushed', 'Disconnected from nature', 'Irregular energy levels', 'Poor sleep patterns'] },
      after: { title: 'After the Course', points: ['Calm and centered', 'Deep nature connection', 'Stable high energy', 'Restorative sleep'] },
    },
    bonuses: [
      { title: 'Nature Meditation Pack', description: '10 guided nature meditations with soundscapes', value: 1499, currency: 'INR' },
      { title: 'Seasonal Swar Guide', description: 'Practices for each season and climate', value: 999, currency: 'INR' },
    ],
  },

  // 3. BLUE OCEAN THEME
  {
    slug: 'sample-blue-ocean',
    name: 'Sample - Blue Ocean Theme',
    status: 'draft',
    heroHeading: 'Dive Deep Into Breath Consciousness',
    heroSubheading: 'Navigate life with the wisdom of Swar Yoga - your compass for success',
    heroCTA: 'Dive In Now',
    heroCtaLink: '#pricing',
    eventTitle: 'Swar Yoga Deep Dive Intensive',
    eventDescription: 'Take a deep dive into the ocean of Swar Yoga wisdom. This intensive program is designed for those who want comprehensive mastery of breath science.\n\nLike the ocean holds infinite treasures, Swar Yoga contains profound knowledge waiting to be discovered by sincere seekers.',
    startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eventTime: '8:00 PM - 10:00 PM IST',
    location: 'Online via Zoom',
    language: 'English',
    theme: {
      mode: 'dark',
      primaryColor: '#3B82F6',
      secondaryColor: '#93C5FD',
      accentColor: '#60A5FA',
      backgroundColor: '#0C1929',
      textColor: '#E0F2FE',
      fontFamily: 'Montserrat',
    },
    pricing: [
      {
        name: 'Explorer',
        price: 1999,
        currency: 'INR',
        originalPrice: 3999,
        features: ['Core Swar Yoga Course', 'Practice Workbook', 'Community Access', '30-Day Support'],
        isPopular: false,
        ctaText: 'Start Exploring',
      },
      {
        name: 'Navigator',
        price: 3999,
        currency: 'INR',
        originalPrice: 7999,
        features: ['Everything in Explorer', 'Live Intensive Sessions', 'Personal Guidance', 'Advanced Techniques', '90-Day Support'],
        isPopular: true,
        ctaText: 'Navigate to Success',
      },
      {
        name: 'Captain',
        price: 7999,
        currency: 'INR',
        originalPrice: 14999,
        features: ['Everything in Navigator', 'Master Certification', 'Teaching Rights', 'VIP Mentorship', 'Lifetime Access'],
        isPopular: false,
        ctaText: 'Become Captain',
      },
    ],
    instructorName: 'Guruji Mahesh Sharma',
    instructorTitle: 'Master Navigator of Swar Yoga',
    instructorBio: 'Guruji has guided thousands of students through the vast ocean of yogic wisdom. His teaching style is clear, practical, and deeply transformative.',
    benefits: [
      { icon: '🧭', title: 'Life Navigation', description: 'Use Swar as your compass for all decisions' },
      { icon: '🌊', title: 'Flow State', description: 'Achieve effortless flow in work and life' },
      { icon: '⚓', title: 'Stability', description: 'Anchor yourself in turbulent times' },
      { icon: '🚢', title: 'Direction', description: 'Clear path forward in any situation' },
      { icon: '💎', title: 'Treasures', description: 'Discover hidden potential within' },
      { icon: '🌅', title: 'New Horizons', description: 'Expand your consciousness boundaries' },
    ],
    curriculum: [
      { title: 'Charting the Course', description: 'Introduction and fundamentals of Swar navigation', duration: '2 hours' },
      { title: 'Reading the Currents', description: 'Understanding breath patterns and their meanings', duration: '2 hours' },
      { title: 'The Tides of Time', description: 'Timing actions with Swar for maximum impact', duration: '2 hours' },
      { title: 'Deep Sea Practices', description: 'Advanced techniques for profound transformation', duration: '3 hours' },
      { title: 'Navigating Storms', description: 'Using Swar during challenges and difficulties', duration: '2 hours' },
      { title: 'Reaching New Shores', description: 'Integration and ongoing practice guidance', duration: '2 hours' },
    ],
    testimonials: [
      { name: 'Vikram Mehta', location: 'Pune, India', text: 'The ocean metaphor really resonates. This program gave me a whole new way to navigate life.', rating: 5 },
      { name: 'Lisa Anderson', location: 'London, UK', text: 'Deep, practical, and beautifully structured. Worth every penny.', rating: 5 },
      { name: 'Chen Wei', location: 'Hong Kong', text: 'As an entrepreneur, the decision-making framework alone was transformational.', rating: 5 },
    ],
    faqs: [
      { question: 'How deep does this go?', answer: 'This is our most comprehensive program, covering everything from basics to advanced mastery.' },
      { question: 'Can I become a teacher?', answer: 'Yes, the Captain tier includes teaching certification and rights.' },
      { question: 'What support is included?', answer: 'Each tier includes email support, community access, and live Q&A sessions.' },
    ],
    socialProof: {
      studentsCount: 4200,
      reviewsCount: 780,
      avgRating: 4.9,
      yearsExperience: 25,
    },
    countdown: {
      enabled: true,
      endDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      message: '⚓ Enrollment closes in:',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 75,
      seatsRemaining: 18,
      showLiveCount: true,
    },
    guarantee: {
      enabled: true,
      days: 30,
      title: '30-Day Voyage Guarantee',
      description: 'Set sail with confidence. If within 30 days you don\'t feel this program is worth 10x your investment, we\'ll refund everything.',
    },
    problemStatement: {
      enabled: true,
      title: 'Lost in Life\'s Ocean?',
      points: [
        { icon: '🌫️', title: 'Lack of Direction', description: 'Feeling adrift without clear purpose' },
        { icon: '🌀', title: 'Overwhelmed', description: 'Too many choices, no clarity' },
        { icon: '⛈️', title: 'Life Storms', description: 'Challenges hitting from all sides' },
      ],
    },
    solution: {
      enabled: true,
      title: 'Swar Yoga: Your Navigation System',
      description: 'Just as sailors used stars to navigate, Swar Yoga gives you an internal compass that never fails.',
      points: ['Always know the right direction', 'Stay calm in any storm', 'Find your true north', 'Navigate with confidence'],
    },
    transformation: {
      enabled: true,
      title: 'From Lost to Leader',
      before: { title: 'Currently', points: ['Confused about decisions', 'Reactive to situations', 'Drifting without purpose', 'Missing opportunities'] },
      after: { title: 'After Mastery', points: ['Clear on every decision', 'Proactive and prepared', 'Moving with purpose', 'Catching every wave'] },
    },
    bonuses: [
      { title: 'Captain\'s Logbook', description: 'Premium Swar tracking journal', value: 799, currency: 'INR' },
      { title: 'Navigation Charts', description: 'Complete Swar timing reference sheets', value: 599, currency: 'INR' },
      { title: 'Sailor\'s Meditations', description: '12 ocean-themed guided practices', value: 1299, currency: 'INR' },
    ],
  },

  // 4. WHITE CLEAN THEME WITH GREEN BUTTONS
  {
    slug: 'sample-white-green',
    name: 'Sample - White Clean (Green Buttons)',
    status: 'draft',
    heroHeading: 'Transform Your Life with Swar Yoga',
    heroSubheading: 'Simple, practical, life-changing breath wisdom for modern living',
    heroCTA: 'Start Free Preview',
    heroCtaLink: '#pricing',
    eventTitle: 'Swar Yoga Essentials',
    eventDescription: 'Get started with Swar Yoga in the simplest way possible. This clean, no-fluff program teaches you the essential practices that will make the biggest difference in your daily life.\n\nNo prior experience needed. Just bring an open mind and willingness to learn.',
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eventTime: '7:00 PM IST',
    location: 'Online',
    language: 'English & Hindi',
    theme: {
      mode: 'light',
      primaryColor: '#16A34A',
      secondaryColor: '#166534',
      accentColor: '#22C55E',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      fontFamily: 'Inter',
    },
    pricing: [
      {
        name: 'Starter',
        price: 999,
        currency: 'INR',
        originalPrice: 1999,
        features: ['5 Core Lessons', 'Practice Guide', 'Email Support', '7-Day Access'],
        isPopular: false,
        ctaText: 'Get Started',
      },
      {
        name: 'Essential',
        price: 2499,
        currency: 'INR',
        originalPrice: 4999,
        features: ['Complete Course (12 Lessons)', 'Lifetime Access', 'Live Q&A Weekly', 'Community Access', 'Certificate'],
        isPopular: true,
        ctaText: 'Join Essential',
      },
    ],
    instructorName: 'Guruji Mahesh Sharma',
    instructorTitle: 'Swar Yoga Teacher',
    instructorBio: 'Teaching Swar Yoga for 25+ years with a focus on making ancient wisdom accessible and practical for everyone.',
    benefits: [
      { icon: '✅', title: 'Easy to Learn', description: 'Simple techniques anyone can follow' },
      { icon: '⏰', title: 'Quick Results', description: 'See changes within the first week' },
      { icon: '📱', title: 'Mobile Friendly', description: 'Learn anywhere, anytime' },
      { icon: '💪', title: 'Practical Focus', description: 'Real-world applications you can use today' },
      { icon: '🎯', title: 'Goal Oriented', description: 'Clear outcomes for each lesson' },
      { icon: '🤝', title: 'Supportive Community', description: 'Learn together, grow together' },
    ],
    curriculum: [
      { title: 'What is Swar Yoga?', description: 'Clear introduction without jargon', duration: '30 mins' },
      { title: 'Your First Practice', description: 'Start observing your breath today', duration: '45 mins' },
      { title: 'Left vs Right Nostril', description: 'The fundamental you need to know', duration: '45 mins' },
      { title: 'Daily Applications', description: 'Using Swar in everyday decisions', duration: '1 hour' },
      { title: 'Building the Habit', description: 'Making Swar practice automatic', duration: '45 mins' },
    ],
    testimonials: [
      { name: 'Sneha Patel', location: 'Ahmedabad, India', text: 'Finally a yoga course that is simple and practical. No fluff, just results!', rating: 5 },
      { name: 'John Smith', location: 'Texas, USA', text: 'Clean, well-organized, and actually useful. Highly recommend.', rating: 5 },
    ],
    faqs: [
      { question: 'How long until I see results?', answer: 'Most students notice changes within the first 3-5 days of practice.' },
      { question: 'Is this for complete beginners?', answer: 'Yes! This course is specifically designed for people new to Swar Yoga.' },
    ],
    socialProof: {
      studentsCount: 8500,
      reviewsCount: 1200,
      avgRating: 4.8,
      yearsExperience: 25,
    },
    countdown: {
      enabled: true,
      endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      message: '⏱️ Enrollment closing:',
    },
    urgency: {
      enabled: false,
    },
    guarantee: {
      enabled: true,
      days: 7,
      title: 'Simple 7-Day Guarantee',
      description: 'Try the course for a week. Not for you? Full refund, no questions.',
    },
    problemStatement: {
      enabled: true,
      title: 'Common Struggles',
      points: [
        { icon: '❓', title: 'Overthinking', description: 'Analysis paralysis in decisions' },
        { icon: '😓', title: 'Inconsistent Energy', description: 'Good days and bad days unpredictably' },
        { icon: '🎯', title: 'Lack of Focus', description: 'Difficulty concentrating on what matters' },
      ],
    },
    solution: {
      enabled: true,
      title: 'The Simple Solution',
      description: 'Swar Yoga gives you a simple framework to understand your body\'s natural rhythms and work with them, not against them.',
      points: ['Make decisions easily', 'Consistent energy daily', 'Better focus naturally'],
    },
  },

  // 5. WHITE CLEAN THEME WITH BLUE BUTTONS
  {
    slug: 'sample-white-blue',
    name: 'Sample - White Clean (Blue Buttons)',
    status: 'draft',
    heroHeading: 'Unlock Your Hidden Potential',
    heroSubheading: 'Discover the scientific secrets of breath that top performers use',
    heroCTA: 'Unlock Access',
    heroCtaLink: '#pricing',
    eventTitle: 'Swar Yoga for Peak Performance',
    eventDescription: 'This program is designed for high achievers who want to optimize every aspect of their life using the science of breath.\n\nBacked by both ancient wisdom and modern research, learn how controlling your breath can elevate your performance in business, sports, relationships, and beyond.',
    startDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eventTime: '9:00 PM IST',
    location: 'Online',
    language: 'English',
    theme: {
      mode: 'light',
      primaryColor: '#2563EB',
      secondaryColor: '#1E40AF',
      accentColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      textColor: '#111827',
      fontFamily: 'Poppins',
    },
    pricing: [
      {
        name: 'Professional',
        price: 4999,
        currency: 'INR',
        originalPrice: 9999,
        features: ['Complete Performance Course', 'Weekly Live Coaching', 'Private Community', 'Performance Tracking Tools', '90-Day Program'],
        isPopular: true,
        ctaText: 'Go Professional',
      },
      {
        name: 'Executive',
        price: 14999,
        currency: 'INR',
        originalPrice: 29999,
        features: ['Everything in Professional', '4x Personal Coaching Sessions', 'Custom Performance Plan', 'Priority Support', 'Executive Network Access'],
        isPopular: false,
        ctaText: 'Join Executive',
      },
    ],
    instructorName: 'Guruji Mahesh Sharma',
    instructorTitle: 'Performance Coach & Swar Yoga Expert',
    instructorBio: 'Having coached CEOs, athletes, and entrepreneurs, Guruji specializes in applying Swar Yoga for peak performance in competitive environments.',
    benefits: [
      { icon: '📈', title: 'Peak Performance', description: 'Optimize your output in any field' },
      { icon: '🧠', title: 'Mental Clarity', description: 'Sharp thinking when it matters most' },
      { icon: '⚡', title: 'Explosive Energy', description: 'Sustained high energy throughout the day' },
      { icon: '🎯', title: 'Laser Focus', description: 'Eliminate distractions and stay on target' },
      { icon: '😴', title: 'Recovery Mastery', description: 'Optimal rest for maximum performance' },
      { icon: '🏆', title: 'Competitive Edge', description: 'The advantage others don\'t know about' },
    ],
    curriculum: [
      { title: 'Performance Fundamentals', description: 'How breath affects performance at cellular level', duration: '2 hours' },
      { title: 'Energy Management', description: 'Using Swar for sustained high energy', duration: '2 hours' },
      { title: 'Decision Science', description: 'Optimal breath states for critical decisions', duration: '2 hours' },
      { title: 'Focus & Flow', description: 'Achieving flow state on demand', duration: '2 hours' },
      { title: 'Recovery Protocols', description: 'Breath techniques for faster recovery', duration: '2 hours' },
      { title: 'Performance Integration', description: 'Building your personal performance system', duration: '3 hours' },
    ],
    testimonials: [
      { name: 'Arjun Kapoor', location: 'Mumbai, India', text: 'As a startup founder, the decision-making techniques alone were worth 100x the investment.', rating: 5 },
      { name: 'Sarah Johnson', location: 'New York, USA', text: 'My focus and energy levels have transformed. This is the real deal.', rating: 5 },
      { name: 'Ravi Krishnan', location: 'Bangalore, India', text: 'Finally found the edge I was looking for. Highly recommended for any high performer.', rating: 5 },
    ],
    faqs: [
      { question: 'Is this different from regular yoga?', answer: 'Yes, this focuses specifically on breath science for performance, not physical yoga poses.' },
      { question: 'How much time commitment?', answer: 'About 30-45 minutes daily for the 90-day program, plus weekly live sessions.' },
      { question: 'Will this help my business?', answer: 'Absolutely. Better decisions, more energy, and sharper focus directly impact business results.' },
    ],
    socialProof: {
      studentsCount: 2800,
      reviewsCount: 450,
      avgRating: 4.9,
      yearsExperience: 25,
    },
    countdown: {
      enabled: true,
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      message: '🚀 Next cohort starts in:',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 30,
      seatsRemaining: 7,
      earlyBirdMessage: 'Limited executive spots available',
      showLiveCount: true,
    },
    guarantee: {
      enabled: true,
      days: 30,
      title: 'Performance Promise',
      description: 'If you don\'t see measurable improvement in your performance within 30 days, we\'ll refund every rupee.',
    },
    problemStatement: {
      enabled: true,
      title: 'What\'s Holding You Back?',
      points: [
        { icon: '🔋', title: 'Energy Crashes', description: 'Losing steam when you need it most' },
        { icon: '🤔', title: 'Decision Fatigue', description: 'Too many choices, declining quality' },
        { icon: '📉', title: 'Inconsistent Results', description: 'Some days great, some days not' },
      ],
    },
    solution: {
      enabled: true,
      title: 'Your Performance Edge',
      description: 'Swar Yoga gives you control over your internal state, allowing you to perform at your peak whenever needed.',
      points: ['Consistent high energy', 'Clear decision making', 'Reliable peak performance'],
    },
    transformation: {
      enabled: true,
      title: 'The Performance Shift',
      before: { title: 'Current Performance', points: ['Inconsistent energy', 'Decision fatigue', 'Slow recovery', 'Missed opportunities'] },
      after: { title: 'Peak Performance', points: ['Sustained high energy', 'Crystal clear decisions', 'Rapid recovery', 'Seizing every opportunity'] },
    },
    bonuses: [
      { title: 'Performance Tracker App (3 months)', description: 'Track your Swar and correlate with performance', value: 2999, currency: 'INR' },
      { title: 'Executive Breathing Protocols', description: 'Quick techniques for meeting rooms and travel', value: 1499, currency: 'INR' },
    ],
  },

  // 6. ROYAL PURPLE PREMIUM THEME
  {
    slug: 'sample-royal-purple',
    name: 'Sample - Royal Purple Premium',
    status: 'draft',
    heroHeading: 'Awaken Your Spiritual Potential',
    heroSubheading: 'The sacred path of Swar Yoga for spiritual seekers and meditation practitioners',
    heroCTA: 'Begin Your Awakening',
    heroCtaLink: '#pricing',
    eventTitle: 'Swar Yoga Spiritual Intensive',
    eventDescription: 'For serious spiritual seekers ready to go deeper. This intensive combines Swar Yoga with advanced meditation practices for profound spiritual awakening.\n\nThrough the mastery of breath, unlock doorways to higher consciousness that sages have accessed for millennia.',
    startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    eventTime: '5:00 AM - 7:00 AM IST',
    location: 'Online Ashram Setting',
    language: 'English, Hindi, Sanskrit',
    theme: {
      mode: 'dark',
      primaryColor: '#A855F7',
      secondaryColor: '#E9D5FF',
      accentColor: '#C084FC',
      backgroundColor: '#1E1033',
      textColor: '#F3E8FF',
      fontFamily: 'Cormorant Garamond',
    },
    pricing: [
      {
        name: 'Sadhaka (Seeker)',
        price: 5999,
        currency: 'INR',
        originalPrice: 11999,
        features: ['Full Spiritual Course', 'Daily Sadhana Guides', 'Meditation Recordings', 'Sacred Texts Access', 'Community Sangha'],
        isPopular: false,
        ctaText: 'Begin Seeking',
      },
      {
        name: 'Sadhak (Practitioner)',
        price: 11999,
        currency: 'INR',
        originalPrice: 23999,
        features: ['Everything in Sadhaka', 'Personal Guidance from Guruji', 'Advanced Tantric Practices', 'Initiation Ceremony', 'Lifetime Sangha Access'],
        isPopular: true,
        ctaText: 'Deepen Practice',
      },
      {
        name: 'Siddha (Master)',
        price: 29999,
        currency: 'INR',
        originalPrice: 59999,
        features: ['Everything in Sadhak', 'Monthly Private Sessions', 'Advanced Initiation', 'Teaching Transmission', 'Himalayan Retreat Invitation'],
        isPopular: false,
        ctaText: 'Seek Mastery',
      },
    ],
    instructorName: 'Guruji Mahesh Sharma',
    instructorTitle: 'Spiritual Guide & Swar Yoga Acharya',
    instructorBio: 'Initiated in the Himalayan tradition, Guruji has dedicated his life to the spiritual path. His teachings bridge the gap between ancient mysticism and practical spirituality.',
    benefits: [
      { icon: '🕉️', title: 'Spiritual Awakening', description: 'Connect with your higher self through breath' },
      { icon: '🙏', title: 'Deeper Meditation', description: 'Access profound states effortlessly' },
      { icon: '✨', title: 'Kundalini Preparation', description: 'Safe foundation for advanced practices' },
      { icon: '🔮', title: 'Subtle Awareness', description: 'Perceive energy and consciousness' },
      { icon: '💜', title: 'Heart Opening', description: 'Expand love and compassion naturally' },
      { icon: '🌌', title: 'Cosmic Connection', description: 'Experience oneness with existence' },
    ],
    curriculum: [
      { title: 'Sacred Foundations', description: 'The spiritual science behind Swar Yoga', duration: '3 hours' },
      { title: 'Pranayama & Swar', description: 'Integration of breath control with Swar awareness', duration: '3 hours' },
      { title: 'Nadis & Chakras', description: 'Energy pathways and their relationship with breath', duration: '3 hours' },
      { title: 'Meditation Mastery', description: 'Using Swar to deepen meditative absorption', duration: '3 hours' },
      { title: 'Tantric Applications', description: 'Advanced practices from the tantric tradition', duration: '3 hours' },
      { title: 'Living Spirituality', description: 'Integrating spiritual awareness into daily life', duration: '3 hours' },
      { title: 'Initiation & Transmission', description: 'Sacred ceremony and blessing', duration: '2 hours' },
    ],
    testimonials: [
      { name: 'Swami Ananda', location: 'Rishikesh, India', text: 'This is authentic teaching. Guruji carries the true lineage blessing.', rating: 5 },
      { name: 'Maria Santos', location: 'Brazil', text: 'My meditation has transformed completely. I can now access states I only read about.', rating: 5 },
      { name: 'Thomas Mueller', location: 'Germany', text: 'A rare find in today\'s world - genuine spiritual transmission with practical techniques.', rating: 5 },
    ],
    faqs: [
      { question: 'Is this religious?', answer: 'No, this is spiritual science that transcends any particular religion. All backgrounds are welcome.' },
      { question: 'Do I need meditation experience?', answer: 'Basic familiarity with meditation is helpful but not required. We guide you from wherever you are.' },
      { question: 'What is the initiation ceremony?', answer: 'A sacred blessing and transmission that connects you to the lineage of masters.' },
    ],
    socialProof: {
      studentsCount: 1500,
      reviewsCount: 320,
      avgRating: 5.0,
      yearsExperience: 25,
    },
    countdown: {
      enabled: true,
      endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      message: '🕉️ Sacred window closing:',
    },
    urgency: {
      enabled: true,
      limitedSeats: true,
      totalSeats: 21,
      seatsRemaining: 5,
      earlyBirdMessage: 'Limited initiations available',
      showLiveCount: false,
    },
    guarantee: {
      enabled: true,
      days: 21,
      title: 'Spiritual Integrity Promise',
      description: 'If after 21 days of dedicated practice you don\'t feel spiritually elevated, we honor your request for refund.',
    },
    problemStatement: {
      enabled: true,
      title: 'The Seeker\'s Struggle',
      points: [
        { icon: '🔍', title: 'Spiritual Seeking', description: 'Trying many paths without depth' },
        { icon: '🧘', title: 'Meditation Plateau', description: 'Stuck at the same level for years' },
        { icon: '💫', title: 'Missing Connection', description: 'Longing for authentic transmission' },
      ],
    },
    solution: {
      enabled: true,
      title: 'The Ancient Way',
      description: 'Swar Yoga is the bridge between physical breath and cosmic consciousness. Masters have used this path for millennia.',
      points: ['Direct spiritual experience', 'Break through plateaus', 'Authentic lineage connection', 'Sustainable awakening'],
    },
    transformation: {
      enabled: true,
      title: 'The Spiritual Journey',
      before: { title: 'Seeker', points: ['Surface-level practice', 'Distracted mind', 'Seeking externally', 'Spiritual doubt'] },
      after: { title: 'Awakened', points: ['Deep absorption', 'One-pointed awareness', 'Inner knowing', 'Unshakable faith'] },
    },
    bonuses: [
      { title: 'Sacred Mantras Collection', description: 'Authentic mantras for Swar practice', value: 2999, currency: 'INR' },
      { title: 'Guided Meditation Library', description: '30 profound meditation recordings', value: 4999, currency: 'INR' },
      { title: 'Private Sangha Access', description: 'Lifetime access to spiritual community', value: 5999, currency: 'INR' },
    ],
    trustBadges: [
      { title: 'Himalayan Lineage', image: '' },
      { title: 'Yoga Alliance RYT-500', image: '' },
      { title: 'Traditional Transmission', image: '' },
    ],
  },
];

async function createSamples() {
  console.log('🚀 Connecting to MongoDB...');
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📝 Creating 6 sample landing pages...\n');

    for (const page of samplePages) {
      // Check if exists
      const existing = await LandingPage.findOne({ slug: page.slug });
      if (existing) {
        console.log(`⏭️  Skipping "${page.name}" - already exists`);
        continue;
      }

      await LandingPage.create({
        ...page,
        createdBy: 'system',
        updatedBy: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Created: ${page.name}`);
      console.log(`   Theme: ${page.theme.mode} | Primary: ${page.theme.primaryColor} | BG: ${page.theme.backgroundColor}`);
    }

    console.log('\n🎉 Done! 6 sample landing pages created successfully.');
    console.log('\n📋 Summary:');
    console.log('1. sample-black-premium     - Luxury dark theme with gold accents');
    console.log('2. sample-dark-green-nature - Nature-inspired dark green theme');
    console.log('3. sample-blue-ocean        - Deep blue ocean theme');
    console.log('4. sample-white-green       - Clean white with green buttons');
    console.log('5. sample-white-blue        - Clean white with blue buttons');
    console.log('6. sample-royal-purple      - Spiritual purple premium theme');
    console.log('\n🔗 View them at: /admin/landing-pages');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

createSamples();
