import crypto from 'node:crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export interface AvatarDnaLook {
  id: string;
  title: string;
  heading: string; // Strictly 1-line heading
  description: string; // Strictly 2-line description
  video_url: string;
  thumbnail_url: string;
  look_category: 'vedic_traditional' | 'ashram_sadhana' | 'modern_corporate' | 'outdoor_nature' | 'studio_master';
  outfit_style: string;
  emotion_profile: string;
  speaking_tone: string;
  duration_seconds: number;
  is_active: boolean;
  source_type: 'youtube' | 'direct_mp4' | 'zoom_speaker';
  created_at: string;
  updated_at: string;
}

export interface FacialDnaItem {
  id: string;
  emotion: string;
  label: string;
  marathiLabel: string;
  hindiLabel: string;
  intensity: number; // 0-100
  sampleTimestamp: string;
  description: string;
  landmarkPoints: number;
  videoClipUrl: string;
  detectedInVideosCount: number;
}

export interface VocalDnaItem {
  id: string;
  language: 'mr' | 'hi' | 'en';
  toneName: string;
  pitchHz: number;
  cadenceWordsPerMinute: number;
  characteristic: string;
  samplePhrase: string;
  audioSampleUrl: string;
}

export interface YogicPostureItem {
  id: string;
  postureName: string;
  sanskritName: string;
  category: 'mudra' | 'asana' | 'pranayama_gesture';
  description: string;
  associatedNadi: 'surya' | 'chandra' | 'sushumna';
  videoClipUrl: string;
}

export interface WardrobeDnaItem {
  id: string;
  clothing_name: string;
  category: 'vedic_traditional' | 'ashram_daily' | 'corporate_keynote' | 'evening_satsang' | 'asana_demo';
  color_hex: string;
  color_name: string;
  fabric_description: string;
  collar_style: string;
  yogic_occasion: string;
  front_image_url: string;
  video_clip_url: string;
  is_selected: boolean;
  worn_in_videos_count: number;
  created_at: string;
  updated_at: string;
}

export interface AvatarDnaLookIdentityRow {
  id: string;
  video_url: string;
  is_active?: boolean | number;
  created_at?: string;
}

function isAvatarDnaLookActive(value: unknown): boolean {
  return value === true || value === 1 || value === '1';
}

export function getAvatarDnaVideoKey(videoUrl: string): string {
  const rawUrl = videoUrl.trim();
  if (!rawUrl) return '';

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const youtubeId = host === 'youtu.be'
      ? url.pathname.split('/').filter(Boolean)[0]
      : ['youtube.com', 'm.youtube.com'].includes(host)
        ? url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]
        : null;
    if (youtubeId) return `youtube:${youtubeId}`;

    const bunnyGuid = url.pathname.match(/(?:^|\/)([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/|$)/i)?.[1];
    if (bunnyGuid) return `bunny:${bunnyGuid.toLowerCase()}`;

    return `url:${host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return `url:${rawUrl.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase()}`;
  }
}

export function getDuplicateAvatarDnaLookIds(
  rows: AvatarDnaLookIdentityRow[],
  activeLookId?: string,
): string[] {
  const groups = new Map<string, AvatarDnaLookIdentityRow[]>();
  for (const row of rows) {
    const key = getAvatarDnaVideoKey(row.video_url);
    if (!key) continue;
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  const duplicateIds: string[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const keep = group.find((row) => row.id === activeLookId)
      || group.find((row) => isAvatarDnaLookActive(row.is_active))
      || group[0];
    duplicateIds.push(...group.filter((row) => row.id !== keep.id).map((row) => row.id));
  }
  return duplicateIds;
}

let isAvatarDnaSchemaReady = false;

export const DEFAULT_AVATAR_DNA_LOOKS: AvatarDnaLook[] = [
  {
    id: 'dna_look_vedic_white_01',
    title: 'Authentic White Khadi Kurta & Rudraksha — Pranayama Master',
    heading: 'Authentic White Khadi Kurta — Pranayama Master',
    description: 'Captured during Morning Himalayan Pranayama session. Features calm meditative gaze, natural hand gestures, and rhythmic breathing cadence.',
    video_url: 'https://iframe.mediadelivery.net/play/606386/107fce87-d999-4671-9d38-58ee2d3522b2',
    thumbnail_url: '/avatar-studio/looks/mohan_white_khadi_1080p.jpg',
    look_category: 'vedic_traditional',
    outfit_style: 'White Khadi Kurta & Rudraksha Mala',
    emotion_profile: 'Calm Meditative Focus & Breathing Clarity',
    speaking_tone: 'Serene, Measured, Scriptural Cadence',
    duration_seconds: 120,
    is_active: true,
    source_type: 'direct_mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dna_look_executive_suit_02',
    title: 'Executive Business Suit & Coat — Strategic Keynote Master',
    heading: 'Executive Bespoke Suit — Global Keynote Master',
    description: 'High-level executive presentation in tailored corporate suit. Clear articulation, sharp leadership presence, and deep calm breath focus.',
    video_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    thumbnail_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_businessman_suit.jpg',
    look_category: 'corporate_keynote',
    outfit_style: 'Tailored Bespoke Navy Suit & Tie',
    emotion_profile: 'Executive Presence & Strategic Clarity',
    speaking_tone: 'Authoritative, Confident, Global Keynote Delivery',
    duration_seconds: 180,
    is_active: false,
    source_type: 'direct_mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dna_look_aqua_mudra_03',
    title: 'Vibrant Aqua Kurta — Chin Mudra & Breath Mechanics',
    heading: 'Vibrant Aqua Kurta — Mudra & Swar Mechanics',
    description: 'Dynamic teaching session demonstrating Chin Mudra and conscious breath control. Features intense teaching focus and precise hand gestures.',
    video_url: 'https://iframe.mediadelivery.net/play/606386/4e3dfe2f-1ab2-4ece-ab1e-da5ee179c30e',
    thumbnail_url: '/avatar-studio/looks/mohan_aqua_mudra.jpg',
    look_category: 'ashram_sadhana',
    outfit_style: 'Vibrant Aqua Kurta with Chin Mudra',
    emotion_profile: 'Dynamic Authority & Engaging Exposition',
    speaking_tone: 'Energetic, Resonant, Clarity-Driven Teaching',
    duration_seconds: 140,
    is_active: false,
    source_type: 'direct_mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dna_look_sand_heart_04',
    title: 'Ashram Sand Botanical — Heart Chakra & Anahata Dhyan',
    heading: 'Ashram Sand Botanical — Anahata Dhyan & Love',
    description: 'Gentle discourse on Anahata chakra and compassionate breath flow. Features hand on heart chakra, serene loving gaze, and gentle meditative rhythm.',
    video_url: 'https://iframe.mediadelivery.net/play/606386/4cd25a86-3ee2-41ce-bb41-e38cf946d6aa',
    thumbnail_url: '/avatar-studio/looks/mohan_sand_heart_chakra.jpg',
    look_category: 'vedic_traditional',
    outfit_style: 'Sand/Beige Leaf-Patterned Kurta',
    emotion_profile: 'Heart-Centered Compassion & Gentle Guidance',
    speaking_tone: 'Warm, Reassuring, Intimate Satsang Voice',
    duration_seconds: 160,
    is_active: false,
    source_type: 'direct_mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dna_look_studio_white_05',
    title: 'Studio Master White — Deep Meditation & Universal Consciousness',
    heading: 'Studio Master White — Deep Meditation Sadhana',
    description: 'Pristine studio setting focused on Dhyana and Samadhi meditation states. Minimalist lighting, centered posture, and deep transcendent presence.',
    video_url: 'https://iframe.mediadelivery.net/play/606386/33b599f9-fbfc-432e-9339-b5f7b4a0e5b3',
    thumbnail_url: '/avatar-studio/looks/mohan_studio_white_meditation.jpg',
    look_category: 'studio_master',
    outfit_style: 'Pristine Studio White Kurta',
    emotion_profile: 'Transcendent Stillness & Universal Peace',
    speaking_tone: 'Soft, Grounded, Meditative Whispers',
    duration_seconds: 125,
    is_active: false,
    source_type: 'direct_mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'dna_look_khadi_sadhana_06',
    title: 'Classical Khadi Kurta — Morning Sadhana & Tithi Awareness',
    heading: 'Classical Khadi Kurta — Morning Tithi Sadhana',
    description: 'Full HD morning awakening guidance on Lunar (Shukla/Krishna) Paksha tithis and Earth Touch ritual. Calm, grounded, deeply Vedic.',
    video_url: 'https://iframe.mediadelivery.net/play/606386/c828f318-88d6-48e4-b0c9-fe5004ae59f0',
    thumbnail_url: '/avatar-studio/looks/mohan_khadi_sadhana_1080p.jpg',
    look_category: 'vedic_traditional',
    outfit_style: 'Natural Woven Khadi Kurta & Band Collar',
    emotion_profile: 'Grounded Wisdom & Ancient Vedic Authority',
    speaking_tone: 'Measured, Sacred, Traditional Lineage Tone',
    duration_seconds: 155,
    is_active: false,
    source_type: 'direct_mp4',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEFAULT_FACIAL_DNA: FacialDnaItem[] = [
  {
    id: 'face_dna_smile_warm',
    emotion: 'smile_warm',
    label: 'Affectionate Guru Smile',
    marathiLabel: 'स्नेहपूर्ण गुरु हास्य',
    hindiLabel: 'स्नेहपूर्ण गुरु मुस्कान',
    intensity: 92,
    sampleTimestamp: '05:13',
    description: 'Gentle upturn of lip corners with soft eye crinkling (Duchenne marker) observed when welcoming students.',
    landmarkPoints: 468,
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    detectedInVideosCount: 48,
  },
  {
    id: 'face_dna_focus_meditation',
    emotion: 'meditative_focus',
    label: 'Deep Meditative Concentration',
    marathiLabel: 'गहन ध्यान एकाग्रता',
    hindiLabel: 'गहरी ध्यान एकाग्रता',
    intensity: 95,
    sampleTimestamp: '10:40',
    description: 'Half-closed eyelids, relaxed forehead, still jawline, and subtle nostril flaring during Swar observation.',
    landmarkPoints: 468,
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_04.mp4',
    detectedInVideosCount: 72,
  },
  {
    id: 'face_dna_eyebrow_wonder',
    emotion: 'inquisitive_eyebrow',
    label: 'Inquisitive Eyebrow Lift (Question Cues)',
    marathiLabel: 'प्रश्न विचारताना भुवया उंचावणे',
    hindiLabel: 'प्रश्न पूछते समय भौंहें उठाना',
    intensity: 84,
    sampleTimestamp: '08:22',
    description: 'Bilateral eyebrow elevation synchronized with question punchlines (e.g., "जेवण कधी करायचं? सूर्य नाडीमध्ये!").',
    landmarkPoints: 468,
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    detectedInVideosCount: 56,
  },
  {
    id: 'face_dna_humor_laugh',
    emotion: 'punchline_humor',
    label: 'Hearty Native Punchline Laugh',
    marathiLabel: 'दिलखुलास हास्य व विनोद',
    hindiLabel: 'दिलखोलकर हंसी व हास्य',
    intensity: 96,
    sampleTimestamp: '14:05',
    description: 'Wide mouth aperture, cheeks lifted, head tilted back slightly during Mohan Sir’s relatable daily life examples.',
    landmarkPoints: 468,
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    detectedInVideosCount: 39,
  },
  {
    id: 'face_dna_teaching_authority',
    emotion: 'teaching_authority',
    label: 'Decisive Shastric Authority',
    marathiLabel: 'शास्त्रीय अधिकार वाणी भाव',
    hindiLabel: 'शास्त्रीय आधिकारिक भाव',
    intensity: 88,
    sampleTimestamp: '18:30',
    description: 'Direct forward gaze, steady head nod, firm lips, and focused ocular tracking when asserting strict dietary rules.',
    landmarkPoints: 468,
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_04.mp4',
    detectedInVideosCount: 64,
  },
];

export const DEFAULT_VOCAL_DNA: VocalDnaItem[] = [
  {
    id: 'vocal_dna_marathi_native',
    language: 'mr',
    toneName: 'Native Puneri/Solapuri Swar Cadence',
    pitchHz: 118,
    cadenceWordsPerMinute: 112,
    characteristic: 'Warm, conversational, rhythmic pauses before key rules, emphatic verb delivery ("आहे", "बघा", "करा").',
    samplePhrase: 'चला डोळे बंद करा. शरीर स्थिर. लक्ष श्वासाकडे. पहिले पूर्ण श्वासाकडे बघा...',
    audioSampleUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
  },
  {
    id: 'vocal_dna_hindi_satsang',
    language: 'hi',
    toneName: 'Hindi Morning Swar Yoga Master Cadence (प्रातःकालीन स्वर अमृतवाणी)',
    pitchHz: 122,
    cadenceWordsPerMinute: 108,
    characteristic: 'Resonant chest voice, deliberate pacing, authentic Hindi Satsang delivery with clear Swar terminology (सूर्य स्वर, चंद्र स्वर, इड़ा, पिंगला, सुषुम्ना, जठराग्नि).',
    samplePhrase: 'सूर्य नाड़ी में जब भोजन किया जाता है, तो जठराग्नि तीव्र होती है और पाचन सर्वोत्तम होता है।',
    audioSampleUrl: 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13%20H1P12YTMTRy5J0baEAa-bQ--%20Hindi%20Oct-26%20Mor%20Swar%20Yoga%20L-1%20(speaker).mp4',
  },
];

export const DEFAULT_POSTURE_DNA: YogicPostureItem[] = [
  {
    id: 'posture_dna_gyan_mudra',
    postureName: 'Gyan Mudra in Sukhasana',
    sanskritName: 'ज्ञान मुद्रा (Dhyana Asana)',
    category: 'mudra',
    description: 'Thumb and index fingertips lightly touching, three fingers extended straight on knees, spine aligned straight.',
    associatedNadi: 'sushumna',
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_04.mp4',
  },
  {
    id: 'posture_dna_nostril_check',
    postureName: 'Nostril Airflow Testing Gesture',
    sanskritName: 'नासिका स्वर परीक्षण हस्त मुद्रा',
    category: 'pranayama_gesture',
    description: 'Back of index finger placed horizontally under nostrils to feel subtle thermal airflow and active nostril.',
    associatedNadi: 'surya',
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
  },
  {
    id: 'posture_dna_jatharagni_navel',
    postureName: 'Solar Plexus Digestive Demonstration',
    sanskritName: 'मणिपूरक चक्र / जठराग्नी संकेत',
    category: 'pranayama_gesture',
    description: 'Right hand open palm circling near the upper abdomen illustrating active digestive fire during lunch.',
    associatedNadi: 'surya',
    videoClipUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
  },
];

export const DEFAULT_WARDROBE_DNA: WardrobeDnaItem[] = [
  {
    id: 'ward_ashram_daily_solapuri_01',
    clothing_name: 'Authentic Ashram Sadra & Dark Navy Waistcoat',
    category: 'ashram_daily',
    color_hex: '#1E3A8A',
    color_name: 'Solapuri Ashram Navy & Sky Blue (आश्रम सदरा व कोट)',
    fabric_description: 'Classic handspun cotton sky blue Sadra layered with tailored dark navy sleeveless Nehru waistcoat (Koti). Mohan Sir signature lecture attire.',
    collar_style: 'Vedic Mandarin High Band Collar with Contrast Welt Pocket',
    yogic_occasion: 'Live Zoom Swar Yoga Morning & Evening Masterclasses, Whiteboard Scriptural Breakdown',
    front_image_url: '/api/recorded-courses/thumbnail?videoId=baedb88d-2353-4215-ab33-2ddbbf5cb9d9',
    video_clip_url: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    is_selected: true,
    worn_in_videos_count: 28,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ward_vedic_khadi_sadhana_02',
    clothing_name: 'Vedic Pure White Khadi Sadhana Kurta',
    category: 'vedic_traditional',
    color_hex: '#F8FAFC',
    color_name: 'Sacred Pearl White (शुद्ध श्वेत खादी)',
    fabric_description: 'Pure handloom khadi cotton woven with breathable organic fibers for high-prana meditation and breath retention states.',
    collar_style: 'Traditional Kurta Placket with Natural Coconut Shell Buttons',
    yogic_occasion: 'Brahma Muhurta Pranayama, Sushumna Awakening & Sacred Shiva Swarodaya Initiations',
    front_image_url: '/avatar-studio/looks/mohan_white_khadi_1080p.jpg',
    video_clip_url: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
    is_selected: false,
    worn_in_videos_count: 14,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ward_sand_ochre_heart_chakra_03',
    clothing_name: 'Sand Ochre Meditation Angavastram Robe',
    category: 'evening_satsang',
    color_hex: '#D97706',
    color_name: 'Golden Ochre Sand (सुवर्ण पीतांबर / काषाय)',
    fabric_description: 'Warm golden-sand ceremonial silk-cotton blend with subtle earthen border, symbolizing renunciation and heart-centered satsang.',
    collar_style: 'Seamless Draped Shoulder Angavastram with Flowing Fall',
    yogic_occasion: 'Evening Satsangs, Guru Purnima Discourses & Advanced Level 3 Spiritual Transmission',
    front_image_url: '/avatar-studio/looks/mohan_sand_heart_chakra.jpg',
    video_clip_url: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    is_selected: false,
    worn_in_videos_count: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ward_aqua_mudra_teaching_04',
    clothing_name: 'Aqua Prana Flow Teaching Attire',
    category: 'asana_demo',
    color_hex: '#0284C7',
    color_name: 'Pranic Sky Aqua (प्राण आकाश नील)',
    fabric_description: 'Lightweight flexible stretch bamboo-cotton blend designed for smooth nostril testing, hand mudras, and spinal alignment demonstration.',
    collar_style: 'Soft Curved Nehru Band with Reinforced Double Stitching',
    yogic_occasion: 'Nostril Airflow Breath Testing, Asana Postural Alignment & Student Body Diagnostics',
    front_image_url: '/avatar-studio/looks/mohan_aqua_mudra.jpg',
    video_clip_url: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    is_selected: false,
    worn_in_videos_count: 9,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'ward_lime_herbal_digestive_05',
    clothing_name: 'Herbal Lime Ayurvedic Digestive Kurta',
    category: 'corporate_keynote',
    color_hex: '#65A30D',
    color_name: 'Herbal Green (आयुर्वेद निसर्ग हरित)',
    fabric_description: 'Natural dyed herbal lime cotton representing active Jatharagni and balanced digestive fire in Aahar Shastra nutrition.',
    collar_style: 'Modern Clean Band Collar with Hidden Button Fly',
    yogic_occasion: 'Aahar Shastra Lectures, Digestive Fire Mastery, Water Therapy Rules & Health Webinars',
    front_image_url: '/avatar-studio/looks/mohan_lime_green_diet.jpg',
    video_clip_url: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
    is_selected: false,
    worn_in_videos_count: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function initAvatarDnaSchema(): Promise<void> {
  if (isAvatarDnaSchemaReady) return;

  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_avatar_dna_looks_sql (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        heading TEXT NOT NULL,
        description TEXT NOT NULL,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL DEFAULT '',
        look_category TEXT NOT NULL DEFAULT 'vedic_traditional',
        outfit_style TEXT NOT NULL DEFAULT '',
        emotion_profile TEXT NOT NULL DEFAULT '',
        speaking_tone TEXT NOT NULL DEFAULT '',
        duration_seconds REAL DEFAULT 0.0,
        is_active INTEGER NOT NULL DEFAULT 0,
        source_type TEXT NOT NULL DEFAULT 'direct_mp4',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_active_avatar_dna_sql (
        key TEXT PRIMARY KEY,
        active_look_id TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_avatar_dna_category ON mohan_avatar_dna_looks_sql(look_category)`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_avatar_wardrobe_dna_sql (
        id TEXT PRIMARY KEY,
        clothing_name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'vedic_traditional',
        color_hex TEXT NOT NULL DEFAULT '#F8FAFC',
        color_name TEXT NOT NULL DEFAULT '',
        fabric_description TEXT NOT NULL DEFAULT '',
        collar_style TEXT NOT NULL DEFAULT '',
        yogic_occasion TEXT NOT NULL DEFAULT '',
        front_image_url TEXT NOT NULL DEFAULT '',
        video_clip_url TEXT NOT NULL DEFAULT '',
        is_selected INTEGER NOT NULL DEFAULT 0,
        worn_in_videos_count INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_wardrobe_dna_cat ON mohan_avatar_wardrobe_dna_sql(category)`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_avatar_facial_dna_sql (
        id TEXT PRIMARY KEY,
        emotion TEXT NOT NULL,
        label TEXT NOT NULL,
        marathi_label TEXT NOT NULL,
        hindi_label TEXT NOT NULL,
        intensity INTEGER NOT NULL DEFAULT 85,
        sample_timestamp TEXT NOT NULL DEFAULT '00:00',
        description TEXT NOT NULL DEFAULT '',
        landmark_points INTEGER NOT NULL DEFAULT 468,
        video_clip_url TEXT NOT NULL DEFAULT '',
        detected_in_videos_count INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_avatar_vocal_dna_sql (
        id TEXT PRIMARY KEY,
        language TEXT NOT NULL,
        tone_name TEXT NOT NULL,
        pitch_hz INTEGER NOT NULL DEFAULT 130,
        cadence_words_per_minute INTEGER NOT NULL DEFAULT 115,
        characteristic TEXT NOT NULL DEFAULT '',
        sample_phrase TEXT NOT NULL DEFAULT '',
        audio_sample_url TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS mohan_avatar_posture_dna_sql (
        id TEXT PRIMARY KEY,
        posture_name TEXT NOT NULL,
        sanskrit_name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        associated_nadi TEXT NOT NULL,
        video_clip_url TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      args: [],
    },
  ]);

  // Seed default looks if table is empty
  const countRes = await bunnyExecute('SELECT COUNT(*) as cnt FROM mohan_avatar_dna_looks_sql');
  const count = Number(countRes.rows?.[0]?.cnt || 0);

  if (count === 0) {
    for (const look of DEFAULT_AVATAR_DNA_LOOKS) {
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO mohan_avatar_dna_looks_sql (
          id, title, heading, description, video_url, thumbnail_url, look_category,
          outfit_style, emotion_profile, speaking_tone, duration_seconds, is_active,
          source_type, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          look.id,
          look.title,
          look.heading,
          look.description,
          look.video_url,
          look.thumbnail_url,
          look.look_category,
          look.outfit_style,
          look.emotion_profile,
          look.speaking_tone,
          look.duration_seconds,
          look.is_active ? 1 : 0,
          look.source_type,
          look.created_at,
          look.updated_at,
        ],
      });
    }

    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)`,
      args: ['global_active_dna', 'dna_look_vedic_white_01', new Date().toISOString()],
    });
  }

  isAvatarDnaSchemaReady = true;
}

export async function getAllAvatarDnaLooks(): Promise<AvatarDnaLook[]> {
  await initAvatarDnaSchema();
  const res = await bunnyExecute('SELECT * FROM mohan_avatar_dna_looks_sql ORDER BY created_at ASC');
  const activeRes = await bunnyExecute("SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'global_active_dna' LIMIT 1");
  const activeId = activeRes.rows?.[0]?.active_look_id || 'dna_look_vedic_white_01';
  const rows = res.rows || [];
  const duplicateIds = new Set(getDuplicateAvatarDnaLookIds(
    rows.map((row: any) => ({
      id: String(row.id),
      video_url: String(row.video_url || ''),
      is_active: isAvatarDnaLookActive(row.is_active),
      created_at: String(row.created_at || ''),
    })),
    String(activeId),
  ));

  return rows.filter((row: any) => !duplicateIds.has(String(row.id))).map((row: any) => ({
    id: String(row.id),
    title: String(row.title),
    heading: String(row.heading || row.title),
    description: String(row.description),
    video_url: String(row.video_url),
    thumbnail_url: String(row.thumbnail_url || ''),
    look_category: row.look_category as AvatarDnaLook['look_category'],
    outfit_style: String(row.outfit_style || ''),
    emotion_profile: String(row.emotion_profile || ''),
    speaking_tone: String(row.speaking_tone || ''),
    duration_seconds: Number(row.duration_seconds || 0),
    is_active: String(row.id) === String(activeId) || isAvatarDnaLookActive(row.is_active),
    source_type: row.source_type as AvatarDnaLook['source_type'],
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function getAvatarDnaDuplicateLookCount(): Promise<number> {
  await initAvatarDnaSchema();
  const [looksRes, activeRes] = await Promise.all([
    bunnyExecute('SELECT id, video_url, is_active, created_at FROM mohan_avatar_dna_looks_sql ORDER BY created_at ASC'),
    bunnyExecute("SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'global_active_dna' LIMIT 1"),
  ]);
  const rows = (looksRes.rows || []).map((row: any) => ({
    id: String(row.id),
    video_url: String(row.video_url || ''),
    is_active: isAvatarDnaLookActive(row.is_active),
    created_at: String(row.created_at || ''),
  }));
  return getDuplicateAvatarDnaLookIds(rows, String(activeRes.rows?.[0]?.active_look_id || '')).length;
}

export async function removeDuplicateAvatarDnaLooks(): Promise<number> {
  await initAvatarDnaSchema();
  const [looksRes, activeRes] = await Promise.all([
    bunnyExecute('SELECT id, video_url, is_active, created_at FROM mohan_avatar_dna_looks_sql ORDER BY created_at ASC'),
    bunnyExecute("SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'global_active_dna' LIMIT 1"),
  ]);
  const rows = (looksRes.rows || []).map((row: any) => ({
    id: String(row.id),
    video_url: String(row.video_url || ''),
    is_active: isAvatarDnaLookActive(row.is_active),
    created_at: String(row.created_at || ''),
  }));
  const duplicateIds = getDuplicateAvatarDnaLookIds(rows, String(activeRes.rows?.[0]?.active_look_id || ''));
  if (!duplicateIds.length) return 0;

  for (let offset = 0; offset < duplicateIds.length; offset += 100) {
    const batch = duplicateIds.slice(offset, offset + 100);
    await bunnyExecute({
      sql: `DELETE FROM mohan_avatar_dna_looks_sql WHERE id IN (${batch.map(() => '?').join(', ')})`,
      args: batch,
    });
  }
  return duplicateIds.length;
}

export async function getActiveAvatarDnaLook(): Promise<AvatarDnaLook | null> {
  const looks = await getAllAvatarDnaLooks();
  return looks.find((l) => l.is_active) || looks[0] || null;
}

export async function setActiveAvatarDnaLook(lookId: string): Promise<boolean> {
  await initAvatarDnaSchema();
  const now = new Date().toISOString();

  await bunnyBatch([
    {
      sql: 'UPDATE mohan_avatar_dna_looks_sql SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END, updated_at = ?',
      args: [lookId, now],
    },
    {
      sql: `INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)`,
      args: ['global_active_dna', lookId, now],
    },
  ]);

  return true;
}

export async function saveAvatarDnaLook(look: Partial<AvatarDnaLook>): Promise<AvatarDnaLook> {
  await initAvatarDnaSchema();
  const videoUrl = look.video_url || 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4';
  const videoKey = getAvatarDnaVideoKey(videoUrl);
  const existingRes = await bunnyExecute(
    'SELECT id, video_url, is_active, created_at FROM mohan_avatar_dna_looks_sql ORDER BY created_at ASC',
  );
  const activeRes = await bunnyExecute("SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'global_active_dna' LIMIT 1");
  const existingRows = (existingRes.rows || []).map((row: any) => ({
    id: String(row.id),
    video_url: String(row.video_url || ''),
    is_active: isAvatarDnaLookActive(row.is_active),
    created_at: String(row.created_at || ''),
  }));
  const matchingRows = existingRows.filter((row) => getAvatarDnaVideoKey(row.video_url) === videoKey);
  const existing = (look.id && matchingRows.find((row) => row.id === look.id))
    || matchingRows.find((row) => row.id === activeRes.rows?.[0]?.active_look_id)
    || matchingRows.find((row) => row.is_active)
    || matchingRows[0];
  const id = existing?.id || look.id || `dna_look_${crypto.createHash('sha256').update(videoKey).digest('hex').slice(0, 24)}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO mohan_avatar_dna_looks_sql (
      id, title, heading, description, video_url, thumbnail_url, look_category,
      outfit_style, emotion_profile, speaking_tone, duration_seconds, is_active,
      source_type, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      look.title || 'Untitled Mohan Sir Look',
      look.heading || look.title || 'Untitled Mohan Sir Look',
      look.description || 'Mohan Sir authentic Swar Yoga lecture look.',
      videoUrl,
      look.thumbnail_url || 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
      look.look_category || 'vedic_traditional',
      look.outfit_style || 'Traditional Kurta',
      look.emotion_profile || 'Calm Meditative Focus',
      look.speaking_tone || 'Measured Teaching Cadence',
      look.duration_seconds || 120,
      (look.is_active ?? existing?.is_active) ? 1 : 0,
      look.source_type || 'direct_mp4',
      look.created_at || existing?.created_at || now,
      now,
    ],
  });

  const all = await getAllAvatarDnaLooks();
  return all.find((l) => l.id === id)!;
}

export async function deleteAvatarDnaLook(id: string): Promise<boolean> {
  await initAvatarDnaSchema();
  const [looksRes, activeRes] = await Promise.all([
    bunnyExecute('SELECT id, video_url FROM mohan_avatar_dna_looks_sql'),
    bunnyExecute("SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'global_active_dna' LIMIT 1"),
  ]);
  const rows = looksRes.rows || [];
  const target = rows.find((row: any) => String(row.id) === id);
  if (!target) return false;

  const targetKey = getAvatarDnaVideoKey(String(target.video_url || ''));
  const idsToDelete = rows
    .filter((row: any) => String(row.id) === id || (targetKey && getAvatarDnaVideoKey(String(row.video_url || '')) === targetKey))
    .map((row: any) => String(row.id));
  for (let offset = 0; offset < idsToDelete.length; offset += 100) {
    const batch = idsToDelete.slice(offset, offset + 100);
    await bunnyExecute({
      sql: `DELETE FROM mohan_avatar_dna_looks_sql WHERE id IN (${batch.map(() => '?').join(', ')})`,
      args: batch,
    });
  }

  const activeId = String(activeRes.rows?.[0]?.active_look_id || '');
  if (idsToDelete.includes(activeId)) {
    const remainingRes = await bunnyExecute('SELECT id FROM mohan_avatar_dna_looks_sql ORDER BY created_at ASC');
    const nextActiveId = String(remainingRes.rows?.[0]?.id || '');
    if (nextActiveId) {
      await bunnyBatch([
        {
          sql: 'UPDATE mohan_avatar_dna_looks_sql SET is_active = CASE WHEN id = ? THEN 1 ELSE 0 END',
          args: [nextActiveId],
        },
        {
          sql: 'INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)',
          args: ['global_active_dna', nextActiveId, new Date().toISOString()],
        },
      ]);
    } else {
      await bunnyExecute({
        sql: 'DELETE FROM mohan_active_avatar_dna_sql WHERE key = ?',
        args: ['global_active_dna'],
      });
    }
  }

  return true;
}

// ── WARDROBE & DRESS DNA OPERATIONS ──

export async function getAllWardrobeDna(): Promise<WardrobeDnaItem[]> {
  await initAvatarDnaSchema();

  // Check if seeded
  const countRes = await bunnyExecute('SELECT COUNT(*) as cnt FROM mohan_avatar_wardrobe_dna_sql');
  const count = Number(countRes.rows?.[0]?.cnt || 0);

  if (count === 0) {
    for (const w of DEFAULT_WARDROBE_DNA) {
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO mohan_avatar_wardrobe_dna_sql (
          id, clothing_name, category, color_hex, color_name, fabric_description,
          collar_style, yogic_occasion, front_image_url, video_clip_url,
          is_selected, worn_in_videos_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          w.id,
          w.clothing_name,
          w.category,
          w.color_hex,
          w.color_name,
          w.fabric_description,
          w.collar_style,
          w.yogic_occasion,
          w.front_image_url,
          w.video_clip_url,
          w.is_selected ? 1 : 0,
          w.worn_in_videos_count,
          w.created_at,
          w.updated_at,
        ],
      });
    }
  }

  const res = await bunnyExecute('SELECT * FROM mohan_avatar_wardrobe_dna_sql ORDER BY is_selected DESC, created_at ASC');
  return (res.rows || []).map((r: any) => ({
    id: String(r.id),
    clothing_name: String(r.clothing_name),
    category: r.category as WardrobeDnaItem['category'],
    color_hex: String(r.color_hex),
    color_name: String(r.color_name || ''),
    fabric_description: String(r.fabric_description),
    collar_style: String(r.collar_style),
    yogic_occasion: String(r.yogic_occasion),
    front_image_url: String(r.front_image_url),
    video_clip_url: String(r.video_clip_url),
    is_selected: Boolean(r.is_selected),
    worn_in_videos_count: Number(r.worn_in_videos_count || 1),
    created_at: String(r.created_at),
    updated_at: String(r.updated_at),
  }));
}

export async function selectActiveWardrobe(wardrobeId: string): Promise<boolean> {
  await initAvatarDnaSchema();
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: 'UPDATE mohan_avatar_wardrobe_dna_sql SET is_selected = CASE WHEN id = ? THEN 1 ELSE 0 END, updated_at = ?',
    args: [wardrobeId, now],
  });

  return true;
}

export async function saveWardrobeDnaItem(item: Partial<WardrobeDnaItem>): Promise<WardrobeDnaItem> {
  await initAvatarDnaSchema();
  const id = item.id || `ward_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `INSERT OR REPLACE INTO mohan_avatar_wardrobe_dna_sql (
      id, clothing_name, category, color_hex, color_name, fabric_description,
      collar_style, yogic_occasion, front_image_url, video_clip_url,
      is_selected, worn_in_videos_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      item.clothing_name || 'Mohan Sir Real Lecture Outfit',
      item.category || 'vedic_traditional',
      item.color_hex || '#F8FAFC',
      item.color_name || 'Traditional White',
      item.fabric_description || 'Authentic pure cotton',
      item.collar_style || 'Nehru Collar',
      item.yogic_occasion || 'Swar Yoga Sadhana',
      item.front_image_url || 'https://swaryogacrm.b-cdn.net/avatar-studio/thumbnails/8f9280a32e94603307e5312213efd5465c5cbbddcdf9793026e0ce31c3b760b6.jpg',
      item.video_clip_url || 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
      item.is_selected ? 1 : 0,
      item.worn_in_videos_count || 1,
      item.created_at || now,
      now,
    ],
  });

  const all = await getAllWardrobeDna();
  return all.find((w) => w.id === id)!;
}

export async function deleteWardrobeDnaItem(id: string): Promise<boolean> {
  await initAvatarDnaSchema();
  await bunnyExecute({
    sql: 'DELETE FROM mohan_avatar_wardrobe_dna_sql WHERE id = ?',
    args: [id],
  });
  return true;
}

// ── FACIAL EXPRESSION DNA OPERATIONS ──

export async function getAllFacialDna(): Promise<FacialDnaItem[]> {
  await initAvatarDnaSchema();

  // Check if table is empty; if so, populate default facial expressions
  const countRes = await bunnyExecute('SELECT COUNT(*) as cnt FROM mohan_avatar_facial_dna_sql');
  const count = Number(countRes.rows?.[0]?.cnt || 0);

  if (count === 0) {
    const now = new Date().toISOString();
    for (const item of DEFAULT_FACIAL_DNA) {
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO mohan_avatar_facial_dna_sql (
          id, emotion, label, marathi_label, hindi_label, intensity,
          sample_timestamp, description, landmark_points, video_clip_url,
          detected_in_videos_count, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.emotion,
          item.label,
          item.marathiLabel,
          item.hindiLabel,
          item.intensity,
          item.sampleTimestamp,
          item.description,
          item.landmarkPoints,
          item.videoClipUrl,
          item.detectedInVideosCount,
          now,
          now,
        ],
      });
    }
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)`,
      args: ['facial_dna_seeded', '1', now],
    });
  }

  const res = await bunnyExecute('SELECT * FROM mohan_avatar_facial_dna_sql ORDER BY intensity DESC, created_at ASC');
  return (res.rows || []).map((r: any) => ({
    id: String(r.id),
    emotion: String(r.emotion),
    label: String(r.label),
    marathiLabel: String(r.marathi_label),
    hindiLabel: String(r.hindi_label),
    intensity: Number(r.intensity || 85),
    sampleTimestamp: String(r.sample_timestamp || '00:00'),
    description: String(r.description || ''),
    landmarkPoints: Number(r.landmark_points || 468),
    videoClipUrl: String(r.video_clip_url || ''),
    detectedInVideosCount: Number(r.detected_in_videos_count || 1),
  }));
}

export async function deleteFacialDnaItem(id: string): Promise<boolean> {
  await initAvatarDnaSchema();
  await bunnyExecute({
    sql: 'DELETE FROM mohan_avatar_facial_dna_sql WHERE id = ?',
    args: [id],
  });
  return true;
}

// ── VOCAL & SPEECH DNA OPERATIONS ──

export async function getAllVocalDna(): Promise<VocalDnaItem[]> {
  await initAvatarDnaSchema();

  const seedRes = await bunnyExecute("SELECT active_look_id FROM mohan_active_avatar_dna_sql WHERE key = 'vocal_dna_seeded' LIMIT 1");
  const isSeeded = Boolean(seedRes.rows?.[0]);

  if (!isSeeded) {
    const now = new Date().toISOString();
    for (const item of DEFAULT_VOCAL_DNA) {
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO mohan_avatar_vocal_dna_sql (
          id, language, tone_name, pitch_hz, cadence_words_per_minute,
          characteristic, sample_phrase, audio_sample_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.language,
          item.toneName,
          item.pitchHz,
          item.cadenceWordsPerMinute,
          item.characteristic,
          item.samplePhrase,
          item.audioSampleUrl,
          now,
          now,
        ],
      });
    }
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)`,
      args: ['vocal_dna_seeded', '1', now],
    });
  }

  const res = await bunnyExecute('SELECT * FROM mohan_avatar_vocal_dna_sql ORDER BY created_at ASC');
  return (res.rows || []).map((r: any) => ({
    id: String(r.id),
    language: r.language as VocalDnaItem['language'],
    toneName: String(r.tone_name),
    pitchHz: Number(r.pitch_hz || 120),
    cadenceWordsPerMinute: Number(r.cadence_words_per_minute || 110),
    characteristic: String(r.characteristic || ''),
    samplePhrase: String(r.sample_phrase || ''),
    audioSampleUrl: String(r.audio_sample_url || ''),
  }));
}

export async function deleteVocalDnaItem(id: string): Promise<boolean> {
  await initAvatarDnaSchema();
  await bunnyExecute({
    sql: 'DELETE FROM mohan_avatar_vocal_dna_sql WHERE id = ?',
    args: [id],
  });
  return true;
}

// ── YOGIC MUDRAS & POSTURES OPERATIONS ──

export async function getAllPostureDna(): Promise<YogicPostureItem[]> {
  await initAvatarDnaSchema();

  // Check if table is empty; if so, populate default postures
  const countRes = await bunnyExecute('SELECT COUNT(*) as cnt FROM mohan_avatar_posture_dna_sql');
  const count = Number(countRes.rows?.[0]?.cnt || 0);

  if (count === 0) {
    const now = new Date().toISOString();
    for (const item of DEFAULT_POSTURE_DNA) {
      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO mohan_avatar_posture_dna_sql (
          id, posture_name, sanskrit_name, category, description,
          associated_nadi, video_clip_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          item.id,
          item.postureName,
          item.sanskritName,
          item.category,
          item.description,
          item.associatedNadi,
          item.videoClipUrl,
          now,
          now,
        ],
      });
    }
    await bunnyExecute({
      sql: `INSERT OR REPLACE INTO mohan_active_avatar_dna_sql (key, active_look_id, updated_at) VALUES (?, ?, ?)`,
      args: ['posture_dna_seeded', '1', now],
    });
  }

  const res = await bunnyExecute('SELECT * FROM mohan_avatar_posture_dna_sql ORDER BY created_at ASC');
  return (res.rows || []).map((r: any) => ({
    id: String(r.id),
    postureName: String(r.posture_name),
    sanskritName: String(r.sanskrit_name),
    category: r.category as YogicPostureItem['category'],
    description: String(r.description || ''),
    associatedNadi: r.associated_nadi as YogicPostureItem['associatedNadi'],
    videoClipUrl: String(r.video_clip_url || ''),
  }));
}

export async function deletePostureDnaItem(id: string): Promise<boolean> {
  await initAvatarDnaSchema();
  await bunnyExecute({
    sql: 'DELETE FROM mohan_avatar_posture_dna_sql WHERE id = ?',
    args: [id],
  });
  return true;
}
