// Comprehensive Master Configuration for AI Avatar & Multilingual Video Studio

export interface BackgroundItem {
  id: string;
  name: string;
  category: string;
  badge: string;
  description: string;
  imageUrl: string;
  isVideo?: boolean;
  videoUrl?: string;
  recommendedLighting: string;
}

export interface ClothingItem {
  id: string;
  name: string;
  category: 'traditional' | 'formal' | 'casual' | 'yoga' | 'chef';
  icon: string;
  description: string;
  availableColors: string[];
  imageUrl: string;
}

export interface EmotionPreset {
  tag: string;
  name: string;
  category:
    | 'happiness'
    | 'seriousness'
    | 'questioning'
    | 'surprise'
    | 'sadness'
    | 'anger'
    | 'motivation'
    | 'spirituality'
    | 'humour'
    | 'teaching'
    | 'storytelling'
    | 'professional';
  icon: string;
  defaultIntensity: number;
  facialBlendshape: string;
  prosodyRate: number;
  prosodyPitch: number;
  recommendedGesture?: string;
}

// 1. ALL 20 REQUIRED BACKGROUND CATEGORIES
export const BACKGROUND_CATEGORIES = [
  'Kitchen',
  'Library',
  'Study Room',
  'Office',
  'Conference Room',
  'Classroom',
  'Yoga Studio',
  'Meditation Room',
  'Nature',
  'Garden',
  'Swimming Pool Area',
  'Near Swimming Tank',
  'Resort',
  'Mountain',
  'Forest',
  'Beach',
  'Home',
  'Professional Studio',
  'Plain Background',
  'Custom Background Upload',
] as const;

export const MASTER_BACKGROUNDS: BackgroundItem[] = [
  {
    id: 'bg_kitchen',
    name: 'Modern Luxury Kitchen & Cooking Studio',
    category: 'Kitchen',
    badge: '🍳 Kitchen & Recipes',
    description: 'Designer marble island, warm teakwood shelves, fresh organic herbs and sattvic spices setting.',
    imageUrl: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Warm Golden Sunlight & Under-Cabinet Glow',
  },
  {
    id: 'bg_library',
    name: 'Grand Classical Vedic & Academic Library',
    category: 'Library',
    badge: '📚 Scholarly & Vedic',
    description: 'Floor-to-ceiling mahogany bookshelves, antique globes, leather-bound ancient yoga treatises.',
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Warm Soft Ambient Chandelier',
  },
  {
    id: 'bg_study_room',
    name: 'Contemporary Minimalist Study Room',
    category: 'Study Room',
    badge: '📖 Focused Study',
    description: 'Clean Scandinavian study desk, warm desk lamp, curated philosophy books, quiet aesthetic.',
    imageUrl: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Diffuse Reading Glow',
  },
  {
    id: 'bg_office',
    name: 'Modern Corporate Executive Office',
    category: 'Office',
    badge: '💼 Professional Office',
    description: 'Panoramic skyline window, glass conference whiteboard, sleek high-end office furniture.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Natural Daylit Skylight',
  },
  {
    id: 'bg_conference',
    name: 'High-Tech Global Conference Room',
    category: 'Conference Room',
    badge: '🏢 Corporate Boardroom',
    description: 'Long acoustic boardroom table with dual video monitors, clean corporate presentation lighting.',
    imageUrl: 'https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Cool Neutral Diffused Overhead',
  },
  {
    id: 'bg_classroom',
    name: 'Interactive Yoga & Wellness Classroom',
    category: 'Classroom',
    badge: '🎓 Academic Classroom',
    description: 'Modern educational lecture hall with smart presentation screen and student seating layout.',
    imageUrl: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Bright Educational Luminescence',
  },
  {
    id: 'bg_yoga_studio',
    name: 'Warm Bamboo & Mirror Yoga Studio',
    category: 'Yoga Studio',
    badge: '🧘 Flow Yoga Studio',
    description: 'Polished wooden floorboards, floor-to-ceiling mirrors, meditation bolsters, natural greenery.',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Warm Natural Bamboo Sunlight',
  },
  {
    id: 'bg_meditation_room',
    name: 'Vedic Dhyan & Shiva Swarodaya Sanctuary',
    category: 'Meditation Room',
    badge: '🕉️ Sacred Dhyan',
    description: 'Carved temple pillars, brass oil lamps (diyas), incense holder, quiet spiritual resonance.',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Golden Candlelight & Spiritual Aura',
  },
  {
    id: 'bg_nature',
    name: 'Pristine Himalayan Valley & River Ganga',
    category: 'Nature',
    badge: '🌿 Prana Nature',
    description: 'Flowing holy river, gentle mountain breeze, lush alpine flora, deep breath energy.',
    imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Golden Hour Morning Sun',
  },
  {
    id: 'bg_garden',
    name: 'Zen Botanical Ayurvedic Garden',
    category: 'Garden',
    badge: '🌸 Zen Garden',
    description: 'Manicured herbal flowerbeds, stone pathways, blooming jasmine and tulsi shrubs.',
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Diffused Morning Garden Daylight',
  },
  {
    id: 'bg_swimming_pool',
    name: 'Luxury Open-Air Infinity Swimming Pool Area',
    category: 'Swimming Pool Area',
    badge: '🏊 Infinity Pool Area',
    description: 'Turquoise reflective waters, wooden lounge deck, tranquil horizon line.',
    imageUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Bright Refreshing Aquatic Shimmer',
  },
  {
    id: 'bg_near_swimming_tank',
    name: 'Calm Poolside Veranda & Deck Decking',
    category: 'Near Swimming Tank',
    badge: '💧 Poolside Veranda',
    description: 'Teak chairs directly beside serene calm water tank with tropical palm shadows.',
    imageUrl: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Tropical Afternoon Warm Glow',
  },
  {
    id: 'bg_resort',
    name: 'Five-Star Ayurvedic Wellness Resort Villa',
    category: 'Resort',
    badge: '🏨 Wellness Resort',
    description: 'Private luxury courtyard villa with serene water fountains, silk cushions, and stone carvings.',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Luxury Sunset Warm Accent',
  },
  {
    id: 'bg_mountain',
    name: 'Majestic Himalayan Snow Peaks & Mist',
    category: 'Mountain',
    badge: '🏔️ High Mountain Peak',
    description: 'Snow-capped Kailash-style ranges with dramatic morning cloud formations.',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'High-Altitude Solar Radiance',
  },
  {
    id: 'bg_forest',
    name: 'Ancient Pine & Bamboo Forest Path',
    category: 'Forest',
    badge: '🌲 Deep Forest',
    description: 'Towering pine trees with sunbeams piercing through morning woodland mist.',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Filtered Volumetric Sun Rays',
  },
  {
    id: 'bg_beach',
    name: 'Golden Sand Coastline & Gentle Waves',
    category: 'Beach',
    badge: '🏖️ Ocean Horizon',
    description: 'Tranquil shoreline with rolling tidal waves and expansive golden sky.',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Warm Coastal Sunset Shimmer',
  },
  {
    id: 'bg_home',
    name: 'Cozy Warm Family Living Room',
    category: 'Home',
    badge: '🏡 Peaceful Home',
    description: 'Comfortable sofa, warm indoor house plants, artistic wall frames, welcoming home ambience.',
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Soft Warm Residential Lumens',
  },
  {
    id: 'bg_pro_studio',
    name: 'Acoustic Dark Slat Podcast & Broadcast Studio',
    category: 'Professional Studio',
    badge: '🎙️ Pro Broadcast Studio',
    description: 'Modern slatted acoustic panel walls, dual-tone neon rim lighting, pro podcast boom mic setup.',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Cyan & Amber Rim with Softbox Fill',
  },
  {
    id: 'bg_plain',
    name: 'Chroma Key Green Screen (#00FF00)',
    category: 'Plain Background',
    badge: '🟢 Studio Chroma Key',
    description: 'Uniform zero-shadow studio green backdrop for custom video editing in Premiere or CapCut.',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Even Flat Key Studio Light',
  },
  {
    id: 'bg_custom',
    name: 'Custom User Uploaded Scene',
    category: 'Custom Background Upload',
    badge: '📁 Custom Upload',
    description: 'User uploaded image or looping video background from Bunny CDN or local disk.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
    recommendedLighting: 'Configurable',
  },
];

// 2. CLOTHING & APPEARANCE OPTIONS
export const MASTER_CLOTHING: ClothingItem[] = [
  {
    id: 'cloth_white_kurta',
    name: 'Pure White Khadi Cotton Kurta',
    category: 'traditional',
    icon: '⚪',
    description: 'Traditional Indian yogic attire with Mandarin collar and subtle white threadwork.',
    availableColors: ['#FFFFFF', '#F5F5F0', '#EAEAEA'],
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloth_saffron_kurta',
    name: 'Sacred Saffron / Ochre Silk Kurta',
    category: 'traditional',
    icon: '🟠',
    description: 'Auspicious Vedic spiritual attire worn during Surya Swar energy sadhana.',
    availableColors: ['#FF9933', '#E67E22', '#D35400'],
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloth_chef_apron',
    name: 'Master Chef Apron & Rolled Sleeves',
    category: 'chef',
    icon: '👨‍🍳',
    description: 'Heavy artisan dark canvas apron with Swar Yoga golden crest for culinary recipes.',
    availableColors: ['#2C3E50', '#1A252F', '#7F8C8D'],
    imageUrl: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloth_suit_blazer',
    name: 'Charcoal Navy Linen Smart Blazer',
    category: 'formal',
    icon: '👔',
    description: 'Sharp contemporary tailored jacket over crisp open-collar white shirt.',
    availableColors: ['#1B263B', '#2B2D42', '#343A40'],
    imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloth_formal_shirt',
    name: 'Executive Pressed Oxford Formal Shirt',
    category: 'formal',
    icon: '👔',
    description: 'Classic light blue or crisp white formal button-down shirt.',
    availableColors: ['#E3F2FD', '#FFFFFF', '#CFD8DC'],
    imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloth_yoga_active',
    name: 'Breathable Yoga Flow Activewear',
    category: 'yoga',
    icon: '🧘',
    description: 'Flexible moisture-wicking yogic wear engineered for asanas and deep stretches.',
    availableColors: ['#2E4057', '#048A81', '#545E75'],
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'cloth_casual_tshirt',
    name: 'Comfort Organic Cotton Crewneck T-Shirt',
    category: 'casual',
    icon: '👕',
    description: 'Casual, approachable organic cotton tee in earthy soothing tones.',
    availableColors: ['#3A506B', '#486581', '#627D98'],
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80',
  },
];

// 3. OVER 80 EMOTION PRESETS ORGANIZED INTO 12 CATEGORIES
export const MASTER_EMOTION_PRESETS: EmotionPreset[] = [
  // Category: Happiness
  { tag: 'smile:80', name: 'Gentle Warm Smile', category: 'happiness', icon: '😊', defaultIntensity: 80, facialBlendshape: 'mouthSmileLeft,mouthSmileRight', prosodyRate: 1.0, prosodyPitch: 1.05 },
  { tag: 'big_smile:90', name: 'Big Radiant Smile', category: 'happiness', icon: '😃', defaultIntensity: 90, facialBlendshape: 'mouthSmile_max,eyeSquint', prosodyRate: 1.05, prosodyPitch: 1.1 },
  { tag: 'laugh:85', name: 'Joyful Laugh', category: 'happiness', icon: '😄', defaultIntensity: 85, facialBlendshape: 'jawOpen,mouthSmile,eyeBlinkLeft', prosodyRate: 1.1, prosodyPitch: 1.15, recommendedGesture: 'open_palms' },
  { tag: 'cheerful:80', name: 'Cheerful & Upbeat', category: 'happiness', icon: '😁', defaultIntensity: 80, facialBlendshape: 'browInnerUp,mouthSmile', prosodyRate: 1.05, prosodyPitch: 1.08 },
  { tag: 'blissful:90', name: 'Inner Yogic Bliss (Ananda)', category: 'happiness', icon: '😇', defaultIntensity: 90, facialBlendshape: 'eyeSquint,mouthSmile', prosodyRate: 0.9, prosodyPitch: 1.02, recommendedGesture: 'namaste' },
  { tag: 'warm_welcome:85', name: 'Warm Heartfelt Welcome', category: 'happiness', icon: '🤗', defaultIntensity: 85, facialBlendshape: 'mouthSmile,browInnerUp', prosodyRate: 1.0, prosodyPitch: 1.05, recommendedGesture: 'namaste' },
  { tag: 'delight:75', name: 'Subtle Delight', category: 'happiness', icon: '✨', defaultIntensity: 75, facialBlendshape: 'mouthSmileRight,eyeWide', prosodyRate: 1.02, prosodyPitch: 1.06 },

  // Category: Seriousness
  { tag: 'serious:90', name: 'Deep Vedic Seriousness', category: 'seriousness', icon: '🧐', defaultIntensity: 90, facialBlendshape: 'browDownLeft,browDownRight', prosodyRate: 0.92, prosodyPitch: 0.95, recommendedGesture: 'pointing_finger' },
  { tag: 'caution:85', name: 'Caution & Warning (सावधान)', category: 'seriousness', icon: '⚠️', defaultIntensity: 85, facialBlendshape: 'browDown,eyeSquint', prosodyRate: 0.9, prosodyPitch: 0.98, recommendedGesture: 'pointing_finger' },
  { tag: 'strict_rule:90', name: 'Strict Principle / Sutra', category: 'seriousness', icon: '📜', defaultIntensity: 90, facialBlendshape: 'browDown,jawForward', prosodyRate: 0.88, prosodyPitch: 0.92, recommendedGesture: 'hand_down' },
  { tag: 'focused:80', name: 'Intense Focus', category: 'seriousness', icon: '🎯', defaultIntensity: 80, facialBlendshape: 'eyeSquint,browDown', prosodyRate: 0.95, prosodyPitch: 0.96 },
  { tag: 'reverence:90', name: 'Sacred Reverence (आदर)', category: 'seriousness', icon: '🙏', defaultIntensity: 90, facialBlendshape: 'browInnerUp,eyeSquint', prosodyRate: 0.85, prosodyPitch: 0.98, recommendedGesture: 'namaste' },

  // Category: Questioning
  { tag: 'curious:85', name: 'Curious & Inquiring', category: 'questioning', icon: '🤔', defaultIntensity: 85, facialBlendshape: 'browInnerUp,headTilt', prosodyRate: 1.0, prosodyPitch: 1.08, recommendedGesture: 'head_tilt' },
  { tag: 'question:90', name: 'Direct Audience Question', category: 'questioning', icon: '❓', defaultIntensity: 90, facialBlendshape: 'browOuterUp,eyeWide', prosodyRate: 1.02, prosodyPitch: 1.12, recommendedGesture: 'open_palms' },
  { tag: 'contemplative:80', name: 'Contemplative Pondering', category: 'questioning', icon: '💭', defaultIntensity: 80, facialBlendshape: 'browInnerUp,eyeLookUp', prosodyRate: 0.88, prosodyPitch: 0.98 },
  { tag: 'quizzical:75', name: 'Puzzled & Examining', category: 'questioning', icon: '🧐', defaultIntensity: 75, facialBlendshape: 'browDownLeft,browUpRight', prosodyRate: 0.95, prosodyPitch: 1.05 },
  { tag: 'doubt_clear:80', name: 'Clarifying Misconception', category: 'questioning', icon: '💡', defaultIntensity: 80, facialBlendshape: 'eyeWide,mouthSmile', prosodyRate: 1.04, prosodyPitch: 1.06, recommendedGesture: 'pointing_finger' },

  // Category: Surprise & Exclamation (उद्गारवाचक)
  { tag: 'exclamatory:90', name: 'Exclamation & Wonder (अरे वाह!)', category: 'surprise', icon: '😲', defaultIntensity: 90, facialBlendshape: 'eyeWide,jawOpen,browInnerUp', prosodyRate: 1.08, prosodyPitch: 1.18, recommendedGesture: 'open_palms' },
  { tag: 'miracle:95', name: 'Miraculous Revelation (चमत्कार)', category: 'surprise', icon: '🌟', defaultIntensity: 95, facialBlendshape: 'eyeWide,mouthSmile', prosodyRate: 1.05, prosodyPitch: 1.14, recommendedGesture: 'open_palms' },
  { tag: 'amazed:85', name: 'Genuinely Amazed', category: 'surprise', icon: '🤩', defaultIntensity: 85, facialBlendshape: 'jawOpen,eyeWide', prosodyRate: 1.06, prosodyPitch: 1.12 },
  { tag: 'astonished:90', name: 'Astonished Secret', category: 'surprise', icon: '🤯', defaultIntensity: 90, facialBlendshape: 'eyeWide,browOuterUp', prosodyRate: 1.0, prosodyPitch: 1.15 },

  // Category: Motivation & Energy
  { tag: 'inspire:85', name: 'Inspirational Ignition', category: 'motivation', icon: '✨', defaultIntensity: 85, facialBlendshape: 'mouthSmile,eyeWide', prosodyRate: 1.05, prosodyPitch: 1.08, recommendedGesture: 'open_palms' },
  { tag: 'enthusiastic:90', name: 'High Energy & Zeal', category: 'motivation', icon: '🔥', defaultIntensity: 90, facialBlendshape: 'eyeWide,jawOpen', prosodyRate: 1.12, prosodyPitch: 1.12, recommendedGesture: 'pointing_finger' },
  { tag: 'empowering:85', name: 'Empowering Affirmation', category: 'motivation', icon: '💪', defaultIntensity: 85, facialBlendshape: 'jawForward,browDown', prosodyRate: 0.98, prosodyPitch: 1.04, recommendedGesture: 'hand_up' },
  { tag: 'courageous:90', name: 'Fearless Vitality (निर्भय)', category: 'motivation', icon: '🦁', defaultIntensity: 90, facialBlendshape: 'eyeWide,jawForward', prosodyRate: 1.02, prosodyPitch: 1.0 },

  // Category: Spirituality & Peace
  { tag: 'spiritual:95', name: 'Deep Yogic Stillness', category: 'spirituality', icon: '🕉️', defaultIntensity: 95, facialBlendshape: 'eyeSquint,browInnerUp', prosodyRate: 0.85, prosodyPitch: 0.96, recommendedGesture: 'namaste' },
  { tag: 'peaceful:90', name: 'Shanti & Serenity (शांति)', category: 'spirituality', icon: '🕊️', defaultIntensity: 90, facialBlendshape: 'eyeSquint,mouthSmile', prosodyRate: 0.82, prosodyPitch: 0.95 },
  { tag: 'blessing:95', name: 'Heartfelt Guru Blessing (आशीर्वाद)', category: 'spirituality', icon: '✋', defaultIntensity: 95, facialBlendshape: 'mouthSmile,eyeSquint', prosodyRate: 0.88, prosodyPitch: 0.98, recommendedGesture: 'open_palms' },
  { tag: 'breath_prana:90', name: 'Conscious Prana Inhalation', category: 'spirituality', icon: '💨', defaultIntensity: 90, facialBlendshape: 'nostrilDilate,chestUp', prosodyRate: 0.78, prosodyPitch: 0.94 },

  // Category: Teaching & Demonstrating
  { tag: 'teaching:85', name: 'Masterclass Instruction', category: 'teaching', icon: '🧘', defaultIntensity: 85, facialBlendshape: 'browInnerUp,mouthSmile', prosodyRate: 0.96, prosodyPitch: 1.0, recommendedGesture: 'open_palms' },
  { tag: 'demonstrating:85', name: 'Technique Demonstration', category: 'teaching', icon: '👉', defaultIntensity: 85, facialBlendshape: 'eyeWide,mouthSmile', prosodyRate: 0.98, prosodyPitch: 1.02, recommendedGesture: 'pointing_finger' },
  { tag: 'step_by_step:80', name: 'Step 1-2-3 Sequencing', category: 'teaching', icon: '🔢', defaultIntensity: 80, facialBlendshape: 'browDown,eyeSquint', prosodyRate: 0.94, prosodyPitch: 0.98, recommendedGesture: 'pointing_finger' },
  { tag: 'recipe_craft:85', name: 'Ayurvedic Culinary Craft', category: 'teaching', icon: '🍲', defaultIntensity: 85, facialBlendshape: 'mouthSmile,eyeWide', prosodyRate: 1.02, prosodyPitch: 1.04, recommendedGesture: 'open_palms' },

  // Category: Storytelling
  { tag: 'storytelling:85', name: 'Puranic Story Cadence', category: 'storytelling', icon: '📜', defaultIntensity: 85, facialBlendshape: 'browInnerUp,eyeLookUp', prosodyRate: 0.92, prosodyPitch: 1.02 },
  { tag: 'parable:80', name: 'Wise Parable Narration', category: 'storytelling', icon: '🪔', defaultIntensity: 80, facialBlendshape: 'mouthSmileRight,eyeSquint', prosodyRate: 0.9, prosodyPitch: 0.98 },
  { tag: 'secret_revealed:90', name: 'Ancient Secret Disclosed', category: 'storytelling', icon: '🗝️', defaultIntensity: 90, facialBlendshape: 'eyeWide,browDown', prosodyRate: 0.88, prosodyPitch: 0.96 },

  // Category: Humour
  { tag: 'humour:80', name: 'Lighthearted Joke & Witty Remark', category: 'humour', icon: '😜', defaultIntensity: 80, facialBlendshape: 'mouthSmileRight,eyeWink', prosodyRate: 1.1, prosodyPitch: 1.14 },
  { tag: 'chuckle:75', name: 'Friendly Chuckle', category: 'humour', icon: '🤭', defaultIntensity: 75, facialBlendshape: 'mouthSmile,jawOpen', prosodyRate: 1.08, prosodyPitch: 1.1 },

  // Category: Professional Presentation
  { tag: 'professional:85', name: 'Crisp Keynote Delivery', category: 'professional', icon: '💼', defaultIntensity: 85, facialBlendshape: 'browDown,eyeWide', prosodyRate: 1.02, prosodyPitch: 1.0 },
  { tag: 'authoritative:90', name: 'Authoritative Proof & Science', category: 'professional', icon: '📊', defaultIntensity: 90, facialBlendshape: 'browDown,jawForward', prosodyRate: 0.96, prosodyPitch: 0.95 },

  // Category: Pauses & Breaths
  { tag: 'pause:1.5s', name: 'Pacing Pause (1.5s)', category: 'seriousness', icon: '⏳', defaultIntensity: 100, facialBlendshape: 'still', prosodyRate: 0.0, prosodyPitch: 1.0 },
  { tag: 'pause:2.5s', name: 'Dramatic Deep Pause (2.5s)', category: 'seriousness', icon: '⏸️', defaultIntensity: 100, facialBlendshape: 'still', prosodyRate: 0.0, prosodyPitch: 1.0 },
  { tag: 'deep_breath:2s', name: 'Conscious Deep Breath', category: 'spirituality', icon: '🫁', defaultIntensity: 100, facialBlendshape: 'chestUp', prosodyRate: 0.0, prosodyPitch: 1.0 },
];

// 4. MULTI-AVATAR SCENE LAYOUTS
export interface MultiAvatarLayout {
  id: string;
  name: string;
  description: string;
  avatarCount: 1 | 2 | 3;
  icon: string;
}

export const MULTI_AVATAR_LAYOUTS: MultiAvatarLayout[] = [
  { id: 'single_center', name: 'Solo Speaker (Full View)', description: 'One presenter centered with full emotional fidelity and gesturing.', avatarCount: 1, icon: '👤' },
  { id: 'two_side_by_side', name: 'Side-by-Side Presentation', description: 'Two avatars side-by-side presenting together.', avatarCount: 2, icon: '👥' },
  { id: 'interview_style', name: 'Host & Guest Interview', description: 'Host on left asking questions, guest on right answering.', avatarCount: 2, icon: '🎙️' },
  { id: 'teacher_student', name: 'Guru & Disciple (Dialogue)', description: 'Master teaching on right, student asking questions on left.', avatarCount: 2, icon: '🎓' },
  { id: 'panel_discussion', name: 'Group Panel Discussion', description: 'Three avatars seated in panel format with alternating speech turns.', avatarCount: 3, icon: '🏛️' },
];

// 5. 3D BODY POSTURES & ACTIVITIES (Option A Rigging)
export interface AvatarPostureItem {
  id: string;
  name: string;
  category: 'basic' | 'locomotion' | 'yoga' | 'sports';
  description: string;
  icon: string;
  cameraDistance: number;
  cameraHeight: number;
}

export const MASTER_POSTURES: AvatarPostureItem[] = [
  // Basic Positions
  { id: 'posture_standing', name: 'Standing Keynote (सहज खड़े)', category: 'basic', description: 'Upright natural speaking posture with subtle breathing and hand gesturing.', icon: '🧍', cameraDistance: 3.2, cameraHeight: 1.5 },
  { id: 'posture_chair_sit', name: 'Sitting on Chair (कुर्सी पर बैठना)', category: 'basic', description: 'Seated at desk/interview table with engaged upper body gestures.', icon: '🪑', cameraDistance: 2.8, cameraHeight: 1.2 },
  { id: 'posture_sukhasana', name: 'Sukhasana / Floor Cross-Legged (सुखासन)', category: 'yoga', description: 'Cross-legged seated meditation posture with spine erect and chin mudra.', icon: '🧘', cameraDistance: 2.6, cameraHeight: 0.9 },
  { id: 'posture_padmasana', name: 'Padmasana / Full Lotus (पद्मासन)', category: 'yoga', description: 'Sacred classical lotus posture for deep Swar Yoga pranayama.', icon: '🕉️', cameraDistance: 2.6, cameraHeight: 0.85 },
  { id: 'posture_vajrasana', name: 'Vajrasana / Kneeling Diamond (वज्रासन)', category: 'yoga', description: 'Post-meal digestive posture sitting firmly on heels.', icon: '⚡', cameraDistance: 2.7, cameraHeight: 0.95 },
  { id: 'posture_tadasana', name: 'Tadasana / Mountain Stance (ताड़ासन)', category: 'yoga', description: 'Grounded mountain alignment with arms relaxed and steady gaze.', icon: '🏔️', cameraDistance: 3.4, cameraHeight: 1.6 },
  { id: 'posture_vrikshasana', name: 'Vrikshasana / Tree Balance (वृक्षासन)', category: 'yoga', description: 'Single-leg balancing asana with palms folded above in Anjali Mudra.', icon: '🌳', cameraDistance: 3.5, cameraHeight: 1.6 },
  { id: 'posture_walking', name: 'Natural Walking Flow (प्राकृतिक चलना)', category: 'locomotion', description: 'Gentle mindful walking pacing across garden or studio space.', icon: '🚶', cameraDistance: 3.8, cameraHeight: 1.4 },
  { id: 'posture_jogging', name: 'Active Jogging / Exercise (जॉगिंग)', category: 'sports', description: 'High-energy aerobic stride with rhythmic arm swing.', icon: '🏃', cameraDistance: 4.0, cameraHeight: 1.4 },
  { id: 'posture_swimming', name: 'Swimming Floating Motion (तैराकी प्रवाह)', category: 'sports', description: 'Prone hydro-dynamic floating stroke for swimming pool environments.', icon: '🏊', cameraDistance: 3.6, cameraHeight: 0.7 },
  { id: 'posture_cooking_presenter', name: 'Cooking Island Presenter (सत्त्विक रसोई प्रस्तुति)', category: 'basic', description: 'Slightly leaned forward over kitchen counter, handling ladles and ingredients.', icon: '👨‍🍳', cameraDistance: 2.9, cameraHeight: 1.35 },
];

