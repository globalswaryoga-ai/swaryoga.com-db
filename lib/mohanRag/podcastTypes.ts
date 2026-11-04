export interface DialogueTurn {
  turnNumber: number;
  speaker: 'host' | 'mohan_sir';
  speakerName: string;
  text: string;
  toneCue?: string; // e.g. '[curious]', '[compassionate]', '[calm:90]'
}

export interface PodcastEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  topic: string;
  category:
    | 'water_digestion'
    | 'gas_sleep_health'
    | 'nadi_breath_mechanics'
    | 'level2_samyama'
    | 'level3_ashtavakra'
    | 'mind_emotions'
    | 'weight_loss_metabolism'
    | 'garbh_sanskar';
  language: 'mr' | 'hi' | 'en';
  hostName: string; // e.g. 'Priya (Curious Seeker)', 'Aryan (Yogic Inquirer)'
  hostGender: 'female' | 'male';
  studentQuestion: string;
  mohanSirAnswer: string;
  dialogueTurns: DialogueTurn[];
  audioUrl?: string;
  videoUrl?: string;
  durationSeconds: number;
  tags: string[];
  isPublished: boolean;
  listenCount: number;
  hostCloneId?: string;
  mohanCloneId?: string;
  backgroundId?: string;
  backgroundUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HostClonePreset {
  id: string;
  name: string;
  gender: 'female' | 'male';
  title: string;
  avatarIcon: string;
  description: string;
  voiceStyle: string;
}

export interface MohanClonePreset {
  id: string;
  name: string;
  avatarUrl: string;
  toneName: string;
  description: string;
  badge: string;
}

export interface PodcastBackgroundPreset {
  id: string;
  name: string;
  description: string;
  previewUrl: string;
  gradient: string;
  badge: string;
}

export const HOST_CLONE_PRESETS: HostClonePreset[] = [
  {
    id: 'priya_seeker',
    name: 'Priya (Curious Seeker)',
    gender: 'female',
    title: 'Curious Seeker / Host',
    avatarIcon: '👩‍🎓',
    description: 'Warm, intuitive student asking everyday health, digestion, and water therapy questions.',
    voiceStyle: 'Warm conversational Indian English/Hindi (Female, Pitch: 1.05)',
  },
  {
    id: 'aarav_inquirer',
    name: 'Aarav (Vedic Inquirer)',
    gender: 'male',
    title: 'Vedic Inquirer / Sadhak',
    avatarIcon: '👨‍🎓',
    description: 'Deep inquiry student asking about Nadi switching, Samyama, and Shiva Swarodaya secrets.',
    voiceStyle: 'Grounded thoughtful male tone (Pitch: 0.95)',
  },
  {
    id: 'ananya_sadhana',
    name: 'Ananya (Sadhana Student)',
    gender: 'female',
    title: 'Sadhana Student / Host',
    avatarIcon: '🧘‍♀️',
    description: 'Devoted practitioner inquiring about breath awareness during meditation, sleep, and emotional peace.',
    voiceStyle: 'Gentle, respectful meditative female tone (Pitch: 1.0)',
  },
  {
    id: 'rohan_biohacker',
    name: 'Rohan (Modern Biohacker)',
    gender: 'male',
    title: 'Modern Biohacker / Sadhak',
    avatarIcon: '🔬',
    description: 'Analytical student linking Swar Yoga breath dominance with metabolic science and circadian rhythm.',
    voiceStyle: 'Crisp, articulate modern student (Pitch: 1.0)',
  },
];

export const MOHAN_CLONE_PRESETS: MohanClonePreset[] = [
  {
    id: 'mohan_pearl_white_khadi',
    name: 'Mohan Sir (Master Vedic Pearl White Khadi)',
    avatarUrl: '/avatar-studio/looks/mohan_white_khadi_1080p.jpg',
    toneName: 'Classical Vedic Satsang Hindi (122 Hz)',
    description: 'Pure handspun Pearl White Khadi Kurta with Rudraksha Mala and serene Gyan Mudra.',
    badge: 'Pearl White Khadi',
  },
  {
    id: 'mohan_workshop_speaker',
    name: 'Mohan Sir (Morning Workshop Video Clone)',
    avatarUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
    toneName: 'Hindi Morning Swar Yoga Master Cadence (125 Hz)',
    description: 'Authentic Zoom workshop speaker-view digital twin with warm smile and animated face cues.',
    badge: 'Live Workshop Look',
  },
  {
    id: 'mohan_saffron_acharya',
    name: 'Mohan Sir (Saffron Vedic Acharya)',
    avatarUrl: '/avatar-studio/looks/mohan_saffron_acharya.jpg',
    toneName: 'Traditional Vedic Acharya Delivery',
    description: 'Auspicious Saffron Khadi with sacred Shiva Swarodaya energy.',
    badge: 'Saffron Acharya',
  },
  {
    id: 'mohan_marathi_native',
    name: 'Mohan Sir (Solapuri/Puneri Native Marathi)',
    avatarUrl: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
    toneName: 'Native Puneri/Solapuri Cadence (118 Hz)',
    description: 'Warm, colloquial mother-tongue Marathi delivery with authentic punchlines.',
    badge: 'Marathi Native',
  },
];

export const PODCAST_BACKGROUND_PRESETS: PodcastBackgroundPreset[] = [
  {
    id: 'bg_himalayan_zen',
    name: '🌿 Himalayan Bamboo Shala',
    description: 'Misty morning Himalayan yoga shala with bamboo arches and meditation cushions.',
    previewUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1200&auto=format&fit=crop&q=80',
    gradient: 'from-emerald-950/90 via-slate-900/90 to-teal-950/90',
    badge: 'Bamboo Shala',
  },
  {
    id: 'bg_vedic_gurukul',
    name: '🏛️ Sacred Vedic Gurukul Studio',
    description: 'Warm teakwood ashrama interior with brass diyas, traditional motifs, and warm lighting.',
    previewUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
    gradient: 'from-amber-950/90 via-slate-900/90 to-yellow-950/90',
    badge: 'Vedic Gurukul',
  },
  {
    id: 'bg_dark_studio',
    name: '🎙️ Minimalist Dark Zen Studio',
    description: 'Acoustic dark charcoal studio with glowing emerald ambient rim lights.',
    previewUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&auto=format&fit=crop&q=80',
    gradient: 'from-slate-950 via-slate-900 to-slate-950',
    badge: 'Dark Studio',
  },
  {
    id: 'bg_ganga_sunrise',
    name: '🌅 Sunrise Ganges Ghat',
    description: 'Spiritual golden dawn by the holy river Ganges, celebrating Surya Nadi awakening.',
    previewUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    gradient: 'from-orange-950/90 via-slate-900/90 to-amber-950/90',
    badge: 'Ganges Sunrise',
  },
  {
    id: 'bg_lotus_sanctuary',
    name: '🪷 Swar Yoga Lotus Sanctuary',
    description: 'Peaceful lotus sanctuary with carved temple sandstone pillars.',
    previewUrl: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=1200&auto=format&fit=crop&q=80',
    gradient: 'from-purple-950/90 via-slate-900/90 to-pink-950/90',
    badge: 'Lotus Sanctuary',
  },
];

