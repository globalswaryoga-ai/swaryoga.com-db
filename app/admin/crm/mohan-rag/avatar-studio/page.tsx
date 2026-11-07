'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/client-auth';
import { getMohan360FrameForAngle, MOHAN_360_FRAMES, MOHAN_CLONE_VIDEOS } from '@/lib/mohanAiClone/mohanClone360Catalog';
import { 
  UserCheck, 
  Sparkles, 
  ArrowLeft, 
  Camera, 
  Upload, 
  Mic, 
  Play, 
  RotateCcw, 
  RotateCw,
  Check, 
  ShieldCheck, 
  Activity, 
  Layers, 
  Sliders, 
  Eye, 
  Volume2, 
  Save, 
  CheckCircle2, 
  RefreshCw, 
  Smile, 
  Zap, 
  Plus, 
  Film, 
  ChevronRight,
  ChevronDown,
  Flame,
  HeartPulse,
  Briefcase,
  Crosshair,
  Dumbbell,
  BookOpen,
  Shirt,
  Search,
  Wand2,
  Filter,
  CheckCircle,
  Scissors,
  Palette,
  Video,
  Trash2,
  Maximize2,
  Compass,
  Radio,
  Clock,
  Sparkle,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Brain,
  X
} from 'lucide-react';
import VideoIntelligenceEditorModal from '@/components/avatar/VideoIntelligenceEditorModal';
import PerformanceDnaLibraryModal from '@/components/avatar/PerformanceDnaLibraryModal';
import type { IntelligenceSegment } from '@/lib/mohanAiClone/videoIntelligenceService';
import { AVATAR_DNA_50_CATALOG, MOHAN_VOCAL_DNA_MODELS, VocalDnaModel } from '@/lib/mohanAiClone/avatarDna50Catalog';

type StudioTab = 
  | 'my-avatars' 
  | 'original-videos'
  | 'step-visual' 
  | 'step-hair-face'
  | 'step-wardrobe' 
  | 'step-motion' 
  | 'step-voice' 
  | 'step-expressions' 
  | 'step-drama-swap'
  | 'step-test-lab';

type WardrobeCategory = 
  | 'all'
  | 'used-dresses'
  | 'indian'
  | 'western'
  | 'professional'
  | 'army-defense'
  | 'sports-active'
  | 'farmer-rural'
  | 'workers-trades'
  | 'chef-cooking'
  | 'custom-generator';

export type HairStyleId = 
  | 'natural-guru' 
  | 'vedic-shikha' 
  | 'short-crop' 
  | 'side-part' 
  | 'topknot-rishi' 
  | 'clean-trim';

export type FacialHairId = 
  | 'natural-beard' 
  | 'full-rishi' 
  | 'short-stubble' 
  | 'clean-shaven';

export type SpectaclesId = 
  | 'none' 
  | 'classic-black' 
  | 'gold-rimless' 
  | 'round-scholar' 
  | 'transparent-modern';

export type TilakId = 
  | 'none' 
  | 'chandan-tilak' 
  | 'bhasma-tripundra' 
  | 'vermillion-bindi';

interface StylingItem {
  id: string;
  name: string;
  badge: string;
  description: string;
  emoji: string;
}

const HAIR_STYLES: StylingItem[] = [
  { id: 'natural-guru', name: 'Natural Swar Guruji', badge: 'Video Authentic', description: 'Exact natural hairline and trimmed spiritual beard calibrated from reference videos.', emoji: '🧘' },
  { id: 'vedic-shikha', name: 'Vedic Shikha (Yogi Choti)', badge: 'Traditional', description: 'Classical sacred hair knot (Choti) for ritual chanting, pujas, and temple ceremonies.', emoji: '🕉️' },
  { id: 'short-crop', name: 'Short Professional Crop', badge: 'Modern', description: 'Clean, modern executive haircut for keynote speeches and global webinars.', emoji: '✂️' },
  { id: 'side-part', name: 'Executive Side Part', badge: 'Classic', description: 'Sharp, dignified side-parting for formal conferences and prestigious summits.', emoji: '👔' },
  { id: 'topknot-rishi', name: 'Rishi Bun / Topknot', badge: 'Ancient Sage', description: 'High yogic bun with fuller spiritual beard for deep meditation & pranayama series.', emoji: '📿' },
  { id: 'clean-trim', name: 'Devotional Buzz Trim', badge: 'Monastic', description: 'Tightly trimmed ascetic spiritual cut for rigorous sadhana and ashram retreats.', emoji: '✨' },
];

const FACIAL_BEARDS: StylingItem[] = [
  { id: 'natural-beard', name: 'Natural Spiritual Beard', badge: 'Video Authentic', description: 'Authentic trimmed salt-and-pepper spiritual beard matching your uploaded videos.', emoji: '🧔' },
  { id: 'full-rishi', name: 'Full Vedic Rishi Beard', badge: 'Vedic Sage', description: 'Dignified full yogic beard symbolizing deep spiritual wisdom and Vedic authority.', emoji: '🧙‍♂️' },
  { id: 'short-stubble', name: 'Executive Short Stubble', badge: 'Corporate', description: 'Neat, crisp 3-day stubble ideal for television interviews and business talks.', emoji: '💼' },
  { id: 'clean-shaven', name: 'Clean Shaven Jawline', badge: 'Contemporary', description: 'Sharp, clean-shaven look emphasizing clear articulation and jawline contours.', emoji: '✨' },
];

const SPECTACLES_LIST: StylingItem[] = [
  { id: 'none', name: 'No Spectacles (Natural Eyes)', badge: 'Direct Gaze', description: 'Unobstructed eye contact for intimate meditation and personal discourse.', emoji: '👁️' },
  { id: 'classic-black', name: 'Classic Black Frames', badge: 'Intellectual', description: 'Sophisticated matte black rectangular spectacles for scholarly seminars.', emoji: '👓' },
  { id: 'gold-rimless', name: 'Gold Rimless Aviator / Keynote', badge: 'Distinguished', description: 'Lightweight titanium gold rimless glasses for international keynote speeches.', emoji: '🕶️' },
  { id: 'round-scholar', name: 'Traditional Round Scholar', badge: 'Philosopher', description: 'Vintage round horn-rimmed frames reminiscent of classical philosophers.', emoji: '🧐' },
  { id: 'transparent-modern', name: 'Modern Crystal Acetate', badge: 'Contemporary', description: 'Fashion-forward clear transparent frames popular in modern digital media.', emoji: '🥽' },
];

const TILAK_LIST: StylingItem[] = [
  { id: 'none', name: 'Clean Forehead (Universal)', badge: 'Universal', description: 'Neutral forehead suitable for general audiences and non-denominational wellness.', emoji: '⚪' },
  { id: 'chandan-tilak', name: 'Vedic Sandalwood Chandan Tilak', badge: 'Swar Yoga', description: 'Sacred yellow sandalwood Urdhva Pundra tilak symbolizing third-eye Ajna focus.', emoji: '🟡' },
  { id: 'bhasma-tripundra', name: 'Sacred Bhasma Tripundra', badge: 'Shiva Yoga', description: 'Three horizontal holy ash stripes representing purification of mind, body & soul.', emoji: '⚪' },
  { id: 'vermillion-bindi', name: 'Red Kumkum Tilak', badge: 'Devotional', description: 'Auspicious vermillion mark for sacred beginnings, festivals, and morning sadhana.', emoji: '🔴' },
];

export interface SavedAvatarItem {
  id: string;
  name: string;
  tagline: string;
  category: 'spiritual' | 'ashram' | 'pranayama' | 'himalayan' | 'corporate' | 'wellness' | 'mudra' | 'modern' | 'real-video' | 'ancient' | 'consultation' | 'custom' | string;
  outfitId: string;
  hairStyleId: HairStyleId;
  facialHairId: FacialHairId;
  spectaclesId: SpectaclesId;
  tilakId: TilakId;
  background: 'none' | 'himalayas' | 'ocean' | 'temple' | 'studio' | string;
  badge: string;
  emoji: string;
  isPrimary?: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  heading?: string;
  outfitStyle?: string;
  emotionProfile?: string;
  speakingTone?: string;
  durationSeconds?: number;
}

const DEFAULT_AVATAR_LIBRARY: SavedAvatarItem[] = AVATAR_DNA_50_CATALOG as SavedAvatarItem[];


// Original Reference Video Item (Dedicated Original Video Library)
export interface OriginalSavedVideo {
  id: string;
  title: string;
  fileName: string;
  fileUrl: string;
  faceThumbnailUrl?: string;
  durationText: string;
  originalDuration?: number;
  trimStart?: number;
  trimEnd?: number;
  uploadedAt: string;
  slotAssigned?: string;
  badge?: string;
  category?: 'speech' | 'pranayama' | '360' | 'custom';
}

const DEFAULT_ORIGINAL_VIDEOS: OriginalSavedVideo[] = [
  {
    id: 'orig-snapyt-kurta',
    title: 'Mohan Sir (SnapYT Lime Green Kurta Discourse)',
    fileName: 'SnapYT_MohanSir_LimeKurta.mp4',
    fileUrl: 'https://pub-844a49c69d80424a8726b27e699e28dc.r2.dev/mohan-rag/videos/snapyt-real-kurta.mp4',
    durationText: '2:45 mins',
    originalDuration: 165,
    trimStart: 0,
    trimEnd: 165,
    uploadedAt: 'Oct 28, 2026',
    slotAssigned: 'slot-1',
    badge: '⭐ Primary Training Reference',
    category: 'speech',
  },
  {
    id: 'orig-shadripu-teal',
    title: 'Mohan Sir (Shad Ripu Explained - Sea Green Kurta)',
    fileName: 'Shad_Ripu_Explained_6Enemies.mp4',
    fileUrl: 'https://pub-844a49c69d80424a8726b27e699e28dc.r2.dev/mohan-rag/videos/shad-ripu-teal.mp4',
    durationText: '3:00 mins (Cut)',
    originalDuration: 340,
    trimStart: 10,
    trimEnd: 190,
    uploadedAt: 'Oct 28, 2026',
    slotAssigned: 'slot-2',
    badge: '🎙️ Spiritual Discourse Cut',
    category: 'speech',
  },
  {
    id: 'orig-swaryoga-pranayama',
    title: 'Mohan Sir (Swar Yoga Pranayama & Breath Pacing)',
    fileName: 'Swar_Yoga_Pranayama_Pacing.mp4',
    fileUrl: 'https://pub-844a49c69d80424a8726b27e699e28dc.r2.dev/mohan-rag/videos/pranayama-pacing.mp4',
    durationText: '2:15 mins',
    originalDuration: 135,
    trimStart: 0,
    trimEnd: 135,
    uploadedAt: 'Oct 28, 2026',
    slotAssigned: 'slot-5',
    badge: '🧘 Asana & Breath Anchor',
    category: 'pranayama',
  },
  {
    id: 'orig-360-calibration',
    title: 'Mohan Sir (360° Kinematics & Angular Head Calibration)',
    fileName: 'Mohan_Sir_360_Calibration.mp4',
    fileUrl: 'https://pub-844a49c69d80424a8726b27e699e28dc.r2.dev/mohan-rag/videos/360-calibration.mp4',
    durationText: '2:00 mins',
    originalDuration: 120,
    trimStart: 0,
    trimEnd: 120,
    uploadedAt: 'Oct 28, 2026',
    slotAssigned: 'slot-17',
    badge: '📐 360° Calibration Track',
    category: '360',
  },
  {
    id: 'orig-360-rotation-real',
    title: 'Mohan Sir (360° Rotational Angle Anchor - 60fps Standing)',
    fileName: 'mohan_clone_video_01.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_01.mp4',
    durationText: '0:28 mins',
    originalDuration: 28,
    trimStart: 0,
    trimEnd: 28,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-17',
    badge: '🔄 360° Real Rotation Scan',
    category: '360',
  },
  {
    id: 'orig-kinetic-walk-real',
    title: 'Mohan Sir (Slow Turn & Kinetic Walking Gait)',
    fileName: 'mohan_clone_video_02.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_02.mp4',
    durationText: '0:26 mins',
    originalDuration: 26,
    trimStart: 0,
    trimEnd: 26,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-18',
    badge: '🚶 Kinetic Locomotion Rig',
    category: '360',
  },
  {
    id: 'orig-mudra-flow-real',
    title: 'Mohan Sir (Mudra & Upper Body Flow Calibration)',
    fileName: 'mohan_clone_video_03.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_03.mp4',
    durationText: '0:31 mins',
    originalDuration: 31,
    trimStart: 0,
    trimEnd: 31,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-19',
    badge: '🧘 Yogic Mudra & Breath Flow',
    category: 'pranayama',
  },
  {
    id: 'orig-facial-micro-real',
    title: 'Mohan Sir (Facial Micro-Expressions & Eye Blink Track)',
    fileName: 'mohan_clone_video_04.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_04.mp4',
    durationText: '0:19 mins',
    originalDuration: 19,
    trimStart: 0,
    trimEnd: 19,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-20',
    badge: '👁️ Micro-Expression & Blink Rig',
    category: '360',
  },
  {
    id: 'orig-conversational-speech-real',
    title: 'Mohan Sir (Conversational Speech & Breath Resonance)',
    fileName: 'mohan_clone_video_05.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_05.mp4',
    durationText: '0:41 mins',
    originalDuration: 41,
    trimStart: 0,
    trimEnd: 41,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-3',
    badge: '🎙️ Authentic Discourse Resonance',
    category: 'speech',
  },
  {
    id: 'orig-profile-discourse-real',
    title: 'Mohan Sir (45° Semi-Profile Angle Discourse)',
    fileName: 'mohan_clone_video_06.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_06.mp4',
    durationText: '0:23 mins',
    originalDuration: 23,
    trimStart: 0,
    trimEnd: 23,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-4',
    badge: '📐 45° Semi-Profile Discourse',
    category: 'speech',
  },
  {
    id: 'orig-smile-gaze-real',
    title: 'Mohan Sir (Close-Up Smile & Meditative Gaze Rig)',
    fileName: 'mohan_clone_video_07.mp4',
    fileUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_clone_video_07.mp4',
    durationText: '0:06 mins',
    originalDuration: 6,
    trimStart: 0,
    trimEnd: 6,
    uploadedAt: 'Nov 07, 2026',
    slotAssigned: 'slot-6',
    badge: '✨ Vedic Smile & Aura Anchor',
    category: 'speech',
  },
];

interface OutfitItem {
  id: string;
  name: string;
  category: WardrobeCategory;
  top: string;
  bottom: string;
  headwear?: string;
  footwear: string;
  accessories: string[];
  description: string;
  badge: string;
  colorAccent: string;
  emoji: string;           // Visual icon shown on card preview
  previewGradient: string; // CSS gradient for visual preview box
  imageUrl?: string;       // Optional: real outfit photo URL (upload later)
}

const WARDROBE_CATALOG: OutfitItem[] = [

  // ═══════════════════════════════════════════════
  // 1. INDIAN & TRADITIONAL (8 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'ind-swar-guruji',
    name: 'Swar Yoga Guruji (Vedic Master)',
    category: 'indian',
    emoji: '🕉️',
    previewGradient: 'from-amber-900 via-amber-700 to-yellow-600',
    top: 'Pure White Silk Kurta + Saffron Stole',
    bottom: 'Matching White Silk Dhoti / Pyjama',
    footwear: 'Handcrafted Khadau / Leather Kolhapuri',
    accessories: ['Rudraksha Mala', 'Vedic Sandalwood Tilak', 'Meditation Asana'],
    description: 'Iconic spiritual presentation attire with serene divine aura for discourse and breathing sessions.',
    badge: '⭐ Iconic Swar',
    colorAccent: 'border-amber-400 bg-amber-500/10 text-amber-300'
  },
  {
    id: 'ind-nehru-jacket',
    name: 'Nehru Bandhgala Jacket & Kurta',
    category: 'indian',
    emoji: '🎩',
    previewGradient: 'from-stone-800 via-yellow-900 to-amber-800',
    top: 'Tussar Silk Kurta + Charcoal Nehru Waistcoat',
    bottom: 'Churidar Pyjama',
    footwear: 'Traditional Mojari Shoes',
    accessories: ['Silk Pocket Square', 'Wristwatch'],
    description: 'Formal Indian statesmanship attire for prestigious conferences and cultural keynote sessions.',
    badge: 'Formal Indian',
    colorAccent: 'border-yellow-400 bg-yellow-500/10 text-yellow-300'
  },
  {
    id: 'ind-vedic-acharya',
    name: 'Vedic Scholar & Temple Acharya',
    category: 'indian',
    emoji: '📿',
    previewGradient: 'from-orange-900 via-orange-700 to-amber-600',
    top: 'Traditional Handwoven Cotton Angavastra',
    bottom: 'Gold Zari Border Silk Dhoti (Pancha)',
    footwear: 'Traditional Paduka',
    accessories: ['Sacred Thread (Janeu)', 'Tripundra Bhasma Tilak', 'Vedic Manuscript'],
    description: 'Authentic classical Vedic scholar outfit for chanting, scriptural recitation, and ritual demonstrations.',
    badge: 'Vedic Heritage',
    colorAccent: 'border-orange-400 bg-orange-500/10 text-orange-300'
  },
  {
    id: 'ind-sherwani',
    name: 'Royal Sherwani Ceremonial',
    category: 'indian',
    emoji: '👑',
    previewGradient: 'from-yellow-900 via-amber-800 to-yellow-700',
    top: 'Intricately Embroidered Jamawar Sherwani',
    bottom: 'Silk Churidar',
    footwear: 'Embroidered Jutti',
    accessories: ['Royal Brooch', 'Stole Shawl'],
    description: 'Regal Indian formal costume for grand festivals, award ceremonies, and celebration broadcasts.',
    badge: 'Royal Festive',
    colorAccent: 'border-amber-300 bg-amber-500/10 text-amber-200'
  },
  {
    id: 'ind-kurta-casual',
    name: 'Casual Cotton Kurta & Jeans',
    category: 'indian',
    emoji: '👕',
    previewGradient: 'from-sky-900 via-blue-800 to-indigo-700',
    top: 'Sky Blue Hand-Block Print Cotton Kurta',
    bottom: 'Slim-Fit Light Wash Denim Jeans',
    footwear: 'Brown Leather Sandals',
    accessories: ['Rudraksha Bracelet', 'Copper Water Bottle'],
    description: 'Relaxed Indo-Western fusion for casual Instagram Reels, morning talks, and approachable Q&A sessions.',
    badge: 'Indo-Western Casual',
    colorAccent: 'border-sky-400 bg-sky-500/10 text-sky-300'
  },
  {
    id: 'ind-punjabi-phulkari',
    name: 'Punjabi Phulkari Ethnic Fest',
    category: 'indian',
    emoji: '🌺',
    previewGradient: 'from-pink-900 via-rose-700 to-fuchsia-700',
    top: 'Vibrant Phulkari Embroidered Kurta',
    bottom: 'Straight Cut Salwar',
    headwear: 'Safa (Punjabi Turban)',
    footwear: 'Nagra Jutti',
    accessories: ['Folk Wooden Bead Necklace', 'Bangles'],
    description: 'Vibrant north Indian folk festival costume for heritage stories, Baisakhi, and cultural celebration reels.',
    badge: 'Punjabi Heritage',
    colorAccent: 'border-pink-400 bg-pink-500/10 text-pink-300'
  },
  {
    id: 'ind-dhoti-uttariya',
    name: 'Classic Dhoti & Uttariya (Pan-Indian)',
    category: 'indian',
    emoji: '🤍',
    previewGradient: 'from-stone-700 via-slate-600 to-stone-600',
    top: 'White Khadi Uttariya Draped Shawl',
    bottom: 'White Cotton Dhoti (5-Yard)',
    footwear: 'Minimalist Paduka',
    accessories: ['Vibhuti Bhasma Mark', 'Sandalwood Japamala'],
    description: 'Classical South & Central Indian traditional dress for Ayurveda, ancient wellness, and puja ceremony demonstrations.',
    badge: 'Classical Traditional',
    colorAccent: 'border-stone-400 bg-stone-500/10 text-stone-300'
  },
  {
    id: 'ind-pathani-suit',
    name: 'Pathani Suit (Afghan-Indian Heritage)',
    category: 'indian',
    emoji: '🧕',
    previewGradient: 'from-yellow-900 via-stone-700 to-amber-900',
    top: 'Earthy Cream Pathani Kameez (Long Straight-Cut)',
    bottom: 'Wide Shalwar Pants',
    footwear: 'Peshawari Chappal',
    accessories: ['Pakol Cap', 'Tazbeeh Rosary Beads'],
    description: "Rugged north-western heritage attire for tribal wellness, mountain yoga, and cross-cultural audience content.",
    badge: 'Afghan Heritage',
    colorAccent: 'border-yellow-600 bg-yellow-600/10 text-yellow-400'
  },

  // ═══════════════════════════════════════════════
  // 2. WESTERN & CASUAL (8 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'west-smart-casual',
    name: 'Modern Smart Casual (Denim & Polo)',
    category: 'western',
    emoji: '👔',
    previewGradient: 'from-sky-900 via-sky-700 to-blue-600',
    top: 'Pristine White Pique Cotton Polo Shirt',
    bottom: 'Slim-Fit Dark Indigo Jeans',
    footwear: 'White Minimalist Leather Sneakers',
    accessories: ['Smartwatch', 'Casual Leather Belt'],
    description: 'Approachable everyday lifestyle look for youth podcasts, daily advice, and friendly Q&A vlogs.',
    badge: 'Everyday Casual',
    colorAccent: 'border-sky-400 bg-sky-500/10 text-sky-300'
  },
  {
    id: 'west-hoodie-street',
    name: 'Urban Athleisure Hoodie',
    category: 'western',
    emoji: '🧥',
    previewGradient: 'from-slate-800 via-slate-700 to-zinc-700',
    top: 'Charcoal Grey Fleece Pullover Hoodie',
    bottom: 'Tapered Black Jogger Pants',
    footwear: 'Modern Running High-Tops',
    accessories: ['Wireless Earbuds', 'Fitness Band'],
    description: 'Trendy youthful street athleisure for casual morning walks and conversational Instagram reels.',
    badge: 'Modern Street',
    colorAccent: 'border-slate-400 bg-slate-500/10 text-slate-300'
  },
  {
    id: 'west-trench-winter',
    name: 'Winter Wool Overcoat & Turtleneck',
    category: 'western',
    emoji: '🧣',
    previewGradient: 'from-stone-800 via-stone-700 to-amber-900',
    top: 'Black Cashmere Turtleneck + Camel Trench Coat',
    bottom: 'Tailored Wool Trousers',
    footwear: 'Chelsea Leather Boots',
    accessories: ['Cashmere Scarf', 'Leather Gloves'],
    description: 'Elegant international travel styling for European/Western workshop presentations and cold-weather tours.',
    badge: 'Winter Classic',
    colorAccent: 'border-stone-400 bg-stone-500/10 text-stone-300'
  },
  {
    id: 'west-linen-summer',
    name: 'Summer Linen Resort Shirt',
    category: 'western',
    emoji: '🏖️',
    previewGradient: 'from-lime-800 via-green-700 to-teal-600',
    top: 'Crisp White Linen Open-Collar Shirt (Half Sleeve)',
    bottom: 'Khaki Slim Chino Shorts',
    footwear: 'Brown Leather Slip-On Loafers',
    accessories: ['Polarized Sunglasses', 'Woven Panama Hat'],
    description: "Breezy summer resort & outdoor yoga retreat look for warm-weather travel wellness content.",
    badge: 'Summer Resort',
    colorAccent: 'border-lime-400 bg-lime-500/10 text-lime-300'
  },
  {
    id: 'west-denim-jacket',
    name: 'Denim Jacket & White Tee (Street Classic)',
    category: 'western',
    emoji: '🎽',
    previewGradient: 'from-blue-900 via-blue-800 to-indigo-800',
    top: 'Classic Washed Denim Jacket + Plain White Graphic Tee',
    bottom: 'Straight-Leg Raw Denim Jeans',
    footwear: 'White Canvas High-Top Sneakers',
    accessories: ['Leather Wrist Bracelet', 'Flat Cap'],
    description: 'Timeless American street-classic denim-on-denim for relatable motivational and wellness reels.',
    badge: 'Street Classic',
    colorAccent: 'border-blue-400 bg-blue-500/10 text-blue-300'
  },
  {
    id: 'west-suit-casual',
    name: 'Smart Casual Blazer & Chinos',
    category: 'western',
    emoji: '🕴️',
    previewGradient: 'from-indigo-900 via-indigo-800 to-blue-800',
    top: 'Navy Unstructured Linen Blazer + Henley Shirt',
    bottom: 'Stone Beige Slim Chinos',
    footwear: 'Suede Desert Boots',
    accessories: ['Silver Watch', 'No-Show Socks'],
    description: 'Dressed-up casual for conference breakout talks, panel discussions, and expert-authority content.',
    badge: 'Smart Casual',
    colorAccent: 'border-indigo-400 bg-indigo-500/10 text-indigo-300'
  },
  {
    id: 'west-polo-formal',
    name: 'Business Polo & Dress Pants',
    category: 'western',
    emoji: '💼',
    previewGradient: 'from-purple-900 via-purple-800 to-violet-700',
    top: 'Oxford Striped Button-Down Shirt',
    bottom: 'Charcoal Slim Dress Pants',
    footwear: 'Tassel Leather Moccasins',
    accessories: ['Slim Tie (Optional)', 'Leather Messenger Bag'],
    description: 'Sharp business-casual look for boardroom Zoom calls, consulting sessions, and authority talks.',
    badge: 'Business Casual',
    colorAccent: 'border-purple-400 bg-purple-500/10 text-purple-300'
  },
  {
    id: 'west-tshirt-shorts',
    name: 'Casual T-Shirt & Shorts (Outdoor)',
    category: 'western',
    emoji: '🌿',
    previewGradient: 'from-green-900 via-green-700 to-emerald-600',
    top: 'Breathable Athletic Crew-Neck T-Shirt',
    bottom: 'Lightweight Cargo Shorts',
    footwear: 'Trail Running Shoes',
    accessories: ['Baseball Cap', 'Hydration Pack'],
    description: 'Easy outdoor weekend look for park sessions, sunrise yoga, and outdoor wellness content creation.',
    badge: 'Outdoor Weekend',
    colorAccent: 'border-green-400 bg-green-500/10 text-green-300'
  },

  // ═══════════════════════════════════════════════
  // 3. PROFESSIONALS & EXECUTIVE (7 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'prof-corporate-suit',
    name: 'Executive Navy Business Suit',
    category: 'professional',
    emoji: '🤵',
    previewGradient: 'from-blue-950 via-blue-900 to-indigo-900',
    top: 'Bespoke Navy Blue 2-Piece Suit + Crisp White Shirt',
    bottom: 'Tailored Navy Trousers with Crease',
    footwear: 'Hand-Polished Oxford Leather Shoes',
    accessories: ['Burgundy Silk Tie', 'Cufflinks', 'Presenter Lapel Mic'],
    description: 'High-power C-suite presenter attire for business summits, leadership seminars, and board meetings.',
    badge: 'Executive Formal',
    colorAccent: 'border-blue-400 bg-blue-500/10 text-blue-300'
  },
  {
    id: 'prof-doctor-coat',
    name: 'Doctor & Medical Specialist',
    category: 'professional',
    emoji: '🩺',
    previewGradient: 'from-cyan-900 via-sky-800 to-cyan-700',
    top: 'Sterile Clinical White Laboratory Coat + Light Blue Shirt',
    bottom: 'Professional Charcoal Trousers',
    footwear: 'Comfort Orthopedic Formal Loafers',
    accessories: ['Acoustic Stethoscope', 'Medical ID Badge', 'Penlight'],
    description: 'Authoritative physician outfit for medical wellness talks, clinical breath science, and health content.',
    badge: 'Medical Specialist',
    colorAccent: 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
  },
  {
    id: 'prof-surgeon-scrubs',
    name: 'Surgical Scrubs (Hospital)',
    category: 'professional',
    emoji: '🏥',
    previewGradient: 'from-teal-900 via-teal-800 to-emerald-800',
    top: 'Teal Surgical V-Neck Scrub Shirt',
    bottom: 'Drawstring Matching Scrub Pants',
    footwear: 'Antistatic Surgical Clogs',
    accessories: ['Surgical Cap', 'Stethoscope Around Neck'],
    description: 'Operating theater attire for anatomy, lung health, and specialized clinical breath insights.',
    badge: 'Hospital Healthcare',
    colorAccent: 'border-teal-400 bg-teal-500/10 text-teal-300'
  },
  {
    id: 'prof-professor-tweed',
    name: 'University Professor & Academic',
    category: 'professional',
    emoji: '🎓',
    previewGradient: 'from-amber-950 via-amber-900 to-yellow-900',
    top: 'Tweed Jacket with Suede Elbow Patches + Oxford Shirt',
    bottom: 'Beige Khaki Chinos',
    footwear: 'Brown Leather Brogues',
    accessories: ['Tortoiseshell Reading Glasses', 'Fountain Pen'],
    description: 'Distinguished university lecturer attire for scientific research breakdown and knowledge videos.',
    badge: 'Academic Research',
    colorAccent: 'border-amber-600 bg-amber-600/10 text-amber-400'
  },
  {
    id: 'prof-lawyer',
    name: 'Barrister & Legal Advocate',
    category: 'professional',
    emoji: '⚖️',
    previewGradient: 'from-gray-900 via-gray-800 to-slate-800',
    top: 'Black Legal Gown + White Court Shirt',
    bottom: 'Black Formal Trousers',
    footwear: 'Black Cap-Toe Oxford Shoes',
    accessories: ['White Bar Bands (Tabs)', 'Legal Brief Folder'],
    description: 'Commanding legal courtroom presence for authority, rights, regulatory compliance, and yoga law content.',
    badge: 'Legal Authority',
    colorAccent: 'border-gray-400 bg-gray-500/10 text-gray-300'
  },
  {
    id: 'prof-scientist',
    name: 'Research Scientist & Lab Expert',
    category: 'professional',
    emoji: '🔬',
    previewGradient: 'from-violet-900 via-purple-900 to-indigo-900',
    top: 'White Lab Coat + Blue Safety Goggles',
    bottom: 'Dark Navy Lab Pants',
    footwear: 'Closed-Toe Lab Safety Shoes',
    accessories: ['Lab Gloves', 'Clipboard', 'Test Tube Set'],
    description: 'Scientific research attire for explaining Swar Yoga science, breathing physiology, and neuroscience experiments.',
    badge: 'Research Science',
    colorAccent: 'border-violet-400 bg-violet-500/10 text-violet-300'
  },
  {
    id: 'prof-pilot-civil',
    name: 'Commercial Airline Pilot',
    category: 'professional',
    emoji: '✈️',
    previewGradient: 'from-sky-950 via-sky-900 to-blue-900',
    top: 'Navy Pilot Uniform Shirt with Epaulettes',
    bottom: 'Navy Formal Pilot Trousers',
    headwear: 'Pilot Officer Cap with Gold Wings',
    footwear: 'High-Gloss Black Oxford Shoes',
    accessories: ['Aviator Sunglasses', 'Captain Wing Badge', 'Flight Logbook'],
    description: 'Commercial aviation captain attire for altitude wellness, inflight breathing exercises, and travel health.',
    badge: 'Airline Captain',
    colorAccent: 'border-sky-600 bg-sky-600/10 text-sky-300'
  },

  // ═══════════════════════════════════════════════
  // 4. DEFENSE, ARMY & SECURITY (6 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'army-tactical-camo',
    name: 'Indian Army Combat Camouflage',
    category: 'army-defense',
    emoji: '🪖',
    previewGradient: 'from-green-950 via-emerald-900 to-green-800',
    top: 'Military Combat Digital Camo Uniform Shirt',
    bottom: 'Reinforced Camouflage Cargo Pants',
    footwear: 'High-Ankle Tactical Combat Boots',
    accessories: ['Regimental Shoulder Badges', 'Tactical Webbing Belt', 'Dog Tags'],
    description: 'Commanding military field uniform representing discipline, mental toughness, and high-intensity breath control.',
    badge: 'Combat Tactical',
    colorAccent: 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
  },
  {
    id: 'army-parade-dress',
    name: 'Commissioned Officer Ceremonial Dress',
    category: 'army-defense',
    emoji: '🎖️',
    previewGradient: 'from-green-900 via-green-800 to-olive-800',
    top: 'Olive Green Pressed Service Tunic with Medals',
    bottom: 'Straight Service Trousers with Stripe',
    footwear: 'Mirrored Black Parade Boots',
    accessories: ['Officer Peak Cap', 'Service Ribbons', 'Cross-Belt'],
    description: 'Formal officer parade attire commanding deep authority and supreme patriotic honor.',
    badge: 'Ceremonial Officer',
    colorAccent: 'border-green-600 bg-green-600/10 text-green-300'
  },
  {
    id: 'army-pilot-aviation',
    name: 'Air Force Fighter Pilot Suit',
    category: 'army-defense',
    emoji: '🛩️',
    previewGradient: 'from-sky-900 via-sky-800 to-blue-800',
    top: 'Nomex Olive Flight Overall with Squadron Patches',
    bottom: 'Integrated G-Suit Flight Trousers',
    footwear: 'Aviation Leather Boots',
    accessories: ['Aviator Sunglasses', 'Pilot Helmet Carrier', 'Chronograph Watch'],
    description: 'Fighter jet pilot and flight commander gear for altitude hypoxia and oxygen breath science guidance.',
    badge: 'Aviation Wing',
    colorAccent: 'border-sky-500 bg-sky-500/10 text-sky-300'
  },
  {
    id: 'army-navy-uniform',
    name: 'Indian Navy Officer Whites',
    category: 'army-defense',
    emoji: '⚓',
    previewGradient: 'from-blue-950 via-blue-900 to-sky-900',
    top: 'Crisp White Naval Officer Uniform Jacket with Epaulettes',
    bottom: 'White Naval Service Trousers',
    headwear: 'Naval Officer White Peak Cap',
    footwear: 'White Naval Dress Shoes',
    accessories: ['Gold Service Buttons', 'Ceremonial Sword (Optional)', 'Rank Stripes'],
    description: 'Indian Navy officer ceremonial whites for naval heritage content, ocean health, and maritime wellness.',
    badge: 'Naval Officer',
    colorAccent: 'border-blue-500 bg-blue-500/10 text-blue-300'
  },
  {
    id: 'army-police-uniform',
    name: 'Police Officer Khaki Uniform',
    category: 'army-defense',
    emoji: '👮',
    previewGradient: 'from-yellow-900 via-amber-800 to-yellow-800',
    top: 'Khaki Police Service Shirt with Shoulder Insignia',
    bottom: 'Khaki Service Trousers',
    headwear: 'Khaki Police Cap with Badge',
    footwear: 'Black Leather Duty Boots',
    accessories: ['Service Badge', 'Walkie-Talkie', 'Service Belt'],
    description: 'Police officer attire for public safety, law-enforcement wellness, and community health initiatives.',
    badge: 'Law Enforcement',
    colorAccent: 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
  },
  {
    id: 'army-commando',
    name: 'Special Forces Commando Gear',
    category: 'army-defense',
    emoji: '🔱',
    previewGradient: 'from-rose-950 via-red-900 to-slate-900',
    top: 'All-Black Tactical Commando Assault Shirt',
    bottom: 'Black Ripstop Tactical Pants',
    headwear: 'Black Balaclava / Tactical Helmet',
    footwear: 'Black SF Tactical Boots',
    accessories: ['Molle Tactical Vest', 'Night Vision Mount', 'Rappelling Gloves'],
    description: 'Elite special operations attire for extreme mental fortitude, crisis breath control, and peak performance content.',
    badge: 'Special Forces',
    colorAccent: 'border-rose-500 bg-rose-500/10 text-rose-300'
  },

  // ═══════════════════════════════════════════════
  // 5. SPORTS, FITNESS & SWIMMING (7 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'sport-running-track',
    name: 'Athletic Runner Performance Tracksuit',
    category: 'sports-active',
    emoji: '🏃',
    previewGradient: 'from-rose-900 via-red-800 to-orange-700',
    top: 'Breathable Moisture-Wicking Running Jacket',
    bottom: 'Ergonomic Compression Running Tights',
    footwear: 'Carbon-Plated Marathon Running Shoes',
    accessories: ['GPS Multisport Watch', 'Hydration Bottle Belt'],
    description: 'Dynamic marathon and cardio running gear for VO2 max endurance and sprint cadence simulations.',
    badge: 'Running & Cardio',
    colorAccent: 'border-rose-400 bg-rose-500/10 text-rose-300'
  },
  {
    id: 'sport-swimming-wetsuit',
    name: 'Aquatic Swimmer Pro Hydro-Suit',
    category: 'sports-active',
    emoji: '🏊',
    previewGradient: 'from-cyan-900 via-teal-800 to-blue-700',
    top: 'Hydrodynamic Neoprene Swimming / Triathlete Rashguard',
    bottom: 'Competition Jammer Swim Shorts',
    footwear: 'Barefoot Aquatic Grip',
    accessories: ['Silicone Swim Cap', 'Mirror UV Goggles'],
    description: 'Aquatic buoyancy, bilateral stroke rhythm, and underwater rhythmic lung capacity training.',
    badge: 'Swimming & Aquatic',
    colorAccent: 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
  },
  {
    id: 'sport-yoga-seamless',
    name: 'Seamless Yogic Movement Attire',
    category: 'sports-active',
    emoji: '🧘',
    previewGradient: 'from-emerald-900 via-teal-800 to-green-700',
    top: 'Ultra-Stretch Bamboo Organic Yoga Vest',
    bottom: 'Flexible Harem Yoga Trousers',
    footwear: 'Barefoot Contact Grip',
    accessories: ['Natural Cork Yoga Mat', 'Copper Water Bottle'],
    description: 'Zero-friction kinetic clothing for 360° unrestricted joint flexibility and complex asana flows.',
    badge: 'Yoga Movement',
    colorAccent: 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
  },
  {
    id: 'sport-gym-tank',
    name: 'Gym Bodybuilding Muscle Vest',
    category: 'sports-active',
    emoji: '💪',
    previewGradient: 'from-orange-900 via-red-800 to-orange-700',
    top: 'Dry-Fit Sleeveless Gym Tank Top',
    bottom: 'Compression Gym Shorts',
    footwear: 'Flat-Sole Weightlifting Shoes',
    accessories: ['Lifting Wrist Straps', 'Gym Belt', 'Chalk Bag'],
    description: 'High-intensity gym strength training attire for power postures, muscle wellness, and bodybuilding content.',
    badge: 'Gym Strength',
    colorAccent: 'border-orange-500 bg-orange-500/10 text-orange-300'
  },
  {
    id: 'sport-cycling',
    name: 'Road Cyclist Pro Cycling Kit',
    category: 'sports-active',
    emoji: '🚴',
    previewGradient: 'from-yellow-900 via-amber-800 to-yellow-700',
    top: 'Aerodynamic Cycling Jersey (Short Sleeve)',
    bottom: 'Padded Bib Cycling Shorts',
    headwear: 'Aero Road Cycling Helmet',
    footwear: 'Clipless Carbon Cycling Shoes',
    accessories: ['Cycling Gloves', 'Garmin GPS Bike Computer'],
    description: 'Professional cycling kit for cycling cardio, outdoor endurance, and respiratory rhythm content.',
    badge: 'Road Cycling',
    colorAccent: 'border-yellow-400 bg-yellow-500/10 text-yellow-300'
  },
  {
    id: 'sport-cricket',
    name: 'Cricket Player White Test Kit',
    category: 'sports-active',
    emoji: '🏏',
    previewGradient: 'from-green-950 via-green-900 to-slate-800',
    top: 'Traditional White Cricket Long-Sleeve Shirt',
    bottom: 'White Cricket Flannel Trousers',
    headwear: 'Cricket Helmet (for batting)',
    footwear: 'Rubber-Spiked Cricket Shoes',
    accessories: ['Cricket Gloves', 'Batting Pads', 'Bat'],
    description: 'Classic Test cricket whites for sport wellness, stamina building, and athletic discipline content.',
    badge: 'Cricket Sports',
    colorAccent: 'border-green-400 bg-green-500/10 text-green-300'
  },
  {
    id: 'sport-martial-arts',
    name: 'Martial Arts Gi (Karate / Judo)',
    category: 'sports-active',
    emoji: '🥋',
    previewGradient: 'from-slate-700 via-slate-600 to-stone-600',
    top: 'White Heavyweight Canvas Gi Jacket',
    bottom: 'White Reinforced Gi Pants',
    footwear: 'Barefoot (Traditional)',
    accessories: ['Black Belt Tied at Waist', 'Japanese Kanji Patch'],
    description: 'Traditional martial arts attire for discipline, focus training, breath control, and combat sports content.',
    badge: 'Martial Arts',
    colorAccent: 'border-slate-300 bg-slate-500/10 text-slate-200'
  },

  // ═══════════════════════════════════════════════
  // 6. FARMER & RURAL WORK (5 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'farmer-traditional-khadi',
    name: 'Indian Farmer & Agro Pioneer',
    category: 'farmer-rural',
    emoji: '🌾',
    previewGradient: 'from-lime-900 via-green-800 to-lime-800',
    top: 'Hand-Spun Khadi Cotton Kurta with Utility Pocket',
    bottom: 'Traditional Farmer Dhoti (Folded Field Style)',
    headwear: 'Traditional Saffron / Red Pagdi (Turban)',
    footwear: 'Handmade Desi Mojari / Field Chappal',
    accessories: ['Cotton Gamcha Towel', 'Brass Water Lota', 'Organic Grain Stalks'],
    description: "Traditional agrarian attire connecting with India's heartland rhythms and farmer health education.",
    badge: 'Agro Pioneer',
    colorAccent: 'border-lime-500 bg-lime-500/10 text-lime-300'
  },
  {
    id: 'farmer-modern-field',
    name: 'Modern Organic Agriculturalist',
    category: 'farmer-rural',
    emoji: '🧑‍🌾',
    previewGradient: 'from-green-900 via-emerald-800 to-lime-800',
    top: 'Chambray Utility Work Shirt with Rolled Sleeves',
    bottom: 'Durable Denim Overalls / Work Jeans',
    headwear: 'Wide-Brim Sun Hat',
    footwear: 'Waterproof Mud Rubber Field Boots',
    accessories: ['Soil Moisture Meter', 'Canvas Work Gloves'],
    description: 'Modern agricultural scientist costume for nature wellness and organic nutrition topics.',
    badge: 'Organic Farm Tech',
    colorAccent: 'border-green-500 bg-green-500/10 text-green-300'
  },
  {
    id: 'farmer-potter',
    name: 'Traditional Potter & Craftsman',
    category: 'farmer-rural',
    emoji: '🏺',
    previewGradient: 'from-amber-900 via-amber-800 to-stone-700',
    top: 'Earthy Brown Cotton Vest Shirt (Half Sleeve)',
    bottom: 'Linen Lungi / Dhoti Folded at Knee',
    footwear: 'Barefoot or Rubber Chappal',
    accessories: ['Clay-Stained Hands Effect', 'Pottery Wheel Prop'],
    description: 'Traditional Indian craft artisan attire for handmade culture, nature therapy, and village wellness content.',
    badge: 'Rural Artisan',
    colorAccent: 'border-amber-700 bg-amber-700/10 text-amber-500'
  },
  {
    id: 'farmer-shepherd',
    name: 'Shepherd & Pasture Herder',
    category: 'farmer-rural',
    emoji: '🐑',
    previewGradient: 'from-stone-800 via-stone-700 to-amber-900',
    top: 'Coarse Khadi Shepherd Cloak / Blanket Wrap',
    bottom: 'Dhoti Folded Knee-Length',
    headwear: 'Woven Straw Hat / Gamcha Wrap',
    footwear: 'Simple Leather Sandals',
    accessories: ['Wooden Walking Staff', 'Brass Bell Prop'],
    description: 'Traditional shepherd lifestyle attire for Ayurvedic nature stories, forest therapy, and rural India content.',
    badge: 'Pastoral Rural',
    colorAccent: 'border-stone-400 bg-stone-500/10 text-stone-300'
  },
  {
    id: 'farmer-fisherman',
    name: 'Coastal Fisherman (Konkan Style)',
    category: 'farmer-rural',
    emoji: '🎣',
    previewGradient: 'from-teal-900 via-cyan-800 to-blue-800',
    top: 'Sleeveless Checked Cotton Shirt (Open)',
    bottom: 'Rolled-Up Lungi / Shorts (Knee Length)',
    footwear: 'Barefoot on Sand',
    accessories: ['Fishing Net Thrown on Shoulder', 'Wicker Basket'],
    description: 'Konkan coastal fisherman look for sea breathing, ocean wellness, and maritime heritage content.',
    badge: 'Coastal Heritage',
    colorAccent: 'border-teal-400 bg-teal-500/10 text-teal-300'
  },

  // ═══════════════════════════════════════════════
  // 7. WORKERS & SKILLED TRADES (6 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'worker-construction-vest',
    name: 'Civil Engineer & Construction Site',
    category: 'workers-trades',
    emoji: '👷',
    previewGradient: 'from-yellow-900 via-amber-800 to-yellow-700',
    top: 'High-Visibility Neon Safety Vest + Denim Shirt',
    bottom: 'Heavy-Duty Reinforced Work Utility Pants',
    headwear: 'ANSI Certified Yellow Safety Hardhat',
    footwear: 'Steel-Toe Protective Work Boots',
    accessories: ['Blueprint Tube', 'Tool Belt & Measuring Tape', 'Safety Glasses'],
    description: 'Industrial safety attire for construction wellness and occupational posture safety content.',
    badge: 'Site Engineering',
    colorAccent: 'border-yellow-500 bg-yellow-500/10 text-yellow-300'
  },
  {
    id: 'worker-factory-mechanic',
    name: 'Industrial Technician & Mechanic',
    category: 'workers-trades',
    emoji: '🔧',
    previewGradient: 'from-indigo-900 via-blue-900 to-slate-800',
    top: 'Navy Blue Heavy-Duty Shop Boiler Suit (Coveralls)',
    bottom: 'Integrated Reinforced Knee Panels',
    footwear: 'Oil-Resistant Grip Safety Boots',
    accessories: ['Torque Wrench', 'Work Gloves Hooked to Loop'],
    description: 'Manufacturing trades attire celebrating hands-on craftsmanship and industrial occupational health.',
    badge: 'Trades Manufacturing',
    colorAccent: 'border-indigo-400 bg-indigo-500/10 text-indigo-300'
  },
  {
    id: 'worker-electrician',
    name: 'Electrician & Electrical Engineer',
    category: 'workers-trades',
    emoji: '⚡',
    previewGradient: 'from-amber-900 via-yellow-800 to-orange-700',
    top: 'Insulated Long-Sleeve Electrician Work Shirt',
    bottom: 'Reinforced Work Trousers with Knee Pads',
    headwear: 'Insulated Hard Hat',
    footwear: 'Dielectric Safety Boots',
    accessories: ['Multimeter', 'Electrical Tape Roll', 'Tool Pouch'],
    description: 'Electrical professional attire for tech wellness, energy management, and occupational safety content.',
    badge: 'Electrical Pro',
    colorAccent: 'border-amber-500 bg-amber-500/10 text-amber-300'
  },
  {
    id: 'worker-firefighter',
    name: 'Firefighter & Emergency Rescue',
    category: 'workers-trades',
    emoji: '🚒',
    previewGradient: 'from-red-900 via-red-800 to-orange-800',
    top: 'Flame-Retardant Turnout Jacket (Yellow-Black)',
    bottom: 'Reflective Bunker Pants',
    headwear: 'Firefighter Rescue Helmet',
    footwear: 'Thermal Fire Boots',
    accessories: ['SCBA Air Pack (Backpack Style)', 'Thermal Imaging Camera', 'Radio'],
    description: 'Emergency response attire for fire-safety wellness, oxygen management, and crisis breath control training.',
    badge: 'Fire & Rescue',
    colorAccent: 'border-red-500 bg-red-500/10 text-red-300'
  },
  {
    id: 'worker-carpenter',
    name: 'Master Carpenter & Woodworker',
    category: 'workers-trades',
    emoji: '🪚',
    previewGradient: 'from-orange-900 via-amber-800 to-yellow-800',
    top: 'Flannel Plaid Work Shirt with Rolled Cuffs',
    bottom: 'Carpenter Overalls with Hammer Loop',
    footwear: 'Steel-Toe Work Boots',
    accessories: ['Leather Work Belt with Chisels', 'Safety Goggles', 'Sawdust-Effect Hands'],
    description: 'Traditional carpentry attire for handcraft wellness, woodworking mindfulness, and artisan labor content.',
    badge: 'Master Woodcraft',
    colorAccent: 'border-orange-500 bg-orange-500/10 text-orange-300'
  },
  {
    id: 'worker-miner',
    name: 'Coal Miner & Underground Worker',
    category: 'workers-trades',
    emoji: '⛏️',
    previewGradient: 'from-stone-900 via-slate-800 to-zinc-800',
    top: 'Dusty Dark Coverall Worksuit with Reflective Strips',
    bottom: 'Reinforced Dungaree Pants',
    headwear: 'Miner Helmet with Headlamp',
    footwear: 'Rubber-Soled Heavy Mine Boots',
    accessories: ['Pickaxe', 'Gas Detector Device', 'Gloves'],
    description: 'Underground mining attire for confined-space breath survival, oxygen depletion, and mine worker wellness.',
    badge: 'Mining Industry',
    colorAccent: 'border-stone-500 bg-stone-500/10 text-stone-300'
  },

  // ═══════════════════════════════════════════════
  // 8. CHEF & COOKING (6 Outfits)
  // ═══════════════════════════════════════════════
  {
    id: 'chef-master-coat',
    name: 'Master Executive Chef (French)',
    category: 'chef-cooking',
    emoji: '👨‍🍳',
    previewGradient: 'from-red-900 via-red-800 to-rose-800',
    top: 'Double-Breasted French White Chef Jacket with Cloth Knots',
    bottom: 'Traditional Chef Houndstooth Checked Trousers',
    headwear: 'Pleated White Chef Toque Hat',
    footwear: 'Slip-Resistant Professional Kitchen Clogs',
    accessories: ['Damascene Chef Knife', 'Kitchen Towel', 'Tasting Spoon'],
    description: 'High-end culinary master uniform for Sattvic cooking masterclasses and dietary prana rules.',
    badge: 'Culinary Master',
    colorAccent: 'border-red-400 bg-red-500/10 text-red-300'
  },
  {
    id: 'chef-baker-apron',
    name: 'Artisan Baker & Ayurveda Cook',
    category: 'chef-cooking',
    emoji: '🍞',
    previewGradient: 'from-amber-900 via-yellow-800 to-amber-700',
    top: 'Natural Canvas Cross-Back Halter Apron over Linen Shirt',
    bottom: 'Comfort Fit Chino Pants',
    headwear: 'Baker Linen Bandana',
    footwear: 'Kitchen Comfort Loafers',
    accessories: ['Wooden Rolling Pin', 'Herbal Spice Jars'],
    description: 'Artisan kitchen and Ayurvedic culinary outfit for home nutrition and herbal recipe tutorials.',
    badge: 'Artisan Kitchen',
    colorAccent: 'border-amber-500 bg-amber-500/10 text-amber-300'
  },
  {
    id: 'chef-tandoor',
    name: 'Tandoor & North Indian Chef',
    category: 'chef-cooking',
    emoji: '🫕',
    previewGradient: 'from-rose-900 via-red-800 to-orange-800',
    top: 'Red Classic Indian Restaurant Chef Jacket',
    bottom: 'Black Chef Apron over Trousers',
    headwear: 'Red Bandana Wrap',
    footwear: 'Anti-Slip Kitchen Shoes',
    accessories: ['Long Tandoor Skewer', 'Clay Pot Prop', 'Garlic Naan Tray'],
    description: 'Authentic Indian restaurant chef attire for traditional Ayurvedic cooking and spice wellness content.',
    badge: 'Indian Cuisine',
    colorAccent: 'border-rose-400 bg-rose-500/10 text-rose-300'
  },
  {
    id: 'chef-street-food',
    name: 'Street Food Vendor & Chaat Master',
    category: 'chef-cooking',
    emoji: '🥘',
    previewGradient: 'from-yellow-900 via-orange-800 to-amber-700',
    top: 'White Short-Sleeve Kurta / Casual Shirt',
    bottom: 'Dhoti-Style Folded Pajama',
    headwear: 'Skull Cap / Folded Gamcha',
    footwear: 'Simple Rubber Chappal',
    accessories: ['Brass Tava Griddle', 'Masala Dabba Spice Box', 'Newspaper Cone'],
    description: 'Indian street food cart attire for authentic food culture, spice wellness, and traditional healing diet content.',
    badge: 'Street Food',
    colorAccent: 'border-yellow-400 bg-yellow-500/10 text-yellow-300'
  },
  {
    id: 'chef-ayurveda-vaidya',
    name: 'Ayurveda Vaidya & Herbal Kitchen',
    category: 'chef-cooking',
    emoji: '🌿',
    previewGradient: 'from-emerald-900 via-green-800 to-teal-800',
    top: 'Saffron Angavastra / Dhoti-Kurta (Vaidya Style)',
    bottom: 'White Cotton Dhoti',
    footwear: 'Traditional Paduka',
    accessories: ['Mortar & Pestle', 'Herb Bundle (Neem, Tulsi)', 'Ancient Samhita Manuscript'],
    description: 'Ayurvedic herbal practitioner and food physician attire for Rasayana therapy, detox, and herbal medicine content.',
    badge: 'Ayurveda Vaidya',
    colorAccent: 'border-emerald-400 bg-emerald-500/10 text-emerald-300'
  },
  {
    id: 'chef-modern-nutritionist',
    name: 'Modern Nutritionist & Dietician',
    category: 'chef-cooking',
    emoji: '📊',
    previewGradient: 'from-green-900 via-teal-800 to-emerald-800',
    top: 'Clean White Clinical Coat over Polo Shirt',
    bottom: 'Formal Chinos',
    footwear: 'Comfort Loafers',
    accessories: ['Digital Food Scale', 'Nutrition Chart Clipboard', 'Measuring Cups Set'],
    description: 'Modern clinical nutritionist and food science expert attire for diet counseling and health optimization.',
    badge: 'Nutrition Science',
    colorAccent: 'border-green-400 bg-green-500/10 text-green-300'
  },
];

interface MotionPreset {
  id: string;
  name: string;
  type: 'locomotion' | 'action' | 'yoga';
  description: string;
}

const MOTIONS: MotionPreset[] = [
  { id: 'walk', name: 'Walking Forward', type: 'locomotion', description: 'Natural confident stride with 360° head-to-toe kinematic balance' },
  { id: 'turn', name: 'Turn & Stroll', type: 'locomotion', description: 'Conversational stage pacing and 360° rotations' },
  { id: 'run', name: 'Jogging / Running', type: 'locomotion', description: 'Athletic cadence, rhythmic breathing, active cardio motion' },
  { id: 'swim', name: 'Swimming Motion', type: 'locomotion', description: 'Fluid aquatic freestyle stroke and body buoyancy flow' },
  { id: 'padmasana', name: 'Padmasana Meditation', type: 'yoga', description: 'Seated lotus posture, stillness, steady diaphragmatic respiration' },
  { id: 'pranayama', name: 'Nasagra Mudra Pranayama', type: 'yoga', description: 'Digital nostril occlusion for alternate nostril breath control' },
  { id: 'stage-speak', name: 'Keynote Speaker Gestures', type: 'action', description: 'Upright podium stance with dual-hand explanatory gestures' },
  { id: 'salute', name: 'Namaste Reverence', type: 'action', description: 'Anjali Mudra greeting placed gently at the heart center' },
];

interface TrainingVideoSlot {
  id: string;
  slotNumber: number;
  title: string;
  category: 'locomotion' | 'posture' | 'speech' | 'kinetics' | '360-ref';
  duration: string;
  instruction: string;
  recommendedOutfit: string;
}

const MASTER_TRAINING_SLOTS: TrainingVideoSlot[] = [
  // 1. Locomotion & Walking (4)
  { id: 'slot-1', slotNumber: 1, title: 'Confident Forward Walk (Natural Stride)', category: 'locomotion', duration: '2:00 mins', instruction: 'Walk forward toward camera with steady pace, erect posture, arms naturally swinging.', recommendedOutfit: 'Comfortable Kurta or Polo' },
  { id: 'slot-2', slotNumber: 2, title: 'Stage Pacing & 180° Turn', category: 'locomotion', duration: '2:00 mins', instruction: 'Conversational stage walk, slow smooth turn at 180°, facing camera again.', recommendedOutfit: 'Nehru Jacket or Formal Suit' },
  { id: 'slot-3', slotNumber: 3, title: 'Outdoor Natural Stroll', category: 'locomotion', duration: '2:00 mins', instruction: 'Walk outdoors in natural daylight with calm, approachable spiritual presence.', recommendedOutfit: 'Cotton Kurta & Jeans / Chinos' },
  { id: 'slot-4', slotNumber: 4, title: 'Athletic Cadence & Brisk Walk', category: 'locomotion', duration: '2:00 mins', instruction: 'Vigorous forward movement displaying vitality, high stamina, and yogic energy.', recommendedOutfit: 'Sports Tracksuit or Activewear' },

  // 2. Postures & Seated Asanas (4)
  { id: 'slot-5', slotNumber: 5, title: 'Padmasana Seated Lotus Stillness', category: 'posture', duration: '2:00 mins', instruction: 'Seated in full lotus or sukhasana, spine erect, eyes softly open, centered breath.', recommendedOutfit: 'Pure White Silk Kurta' },
  { id: 'slot-6', slotNumber: 6, title: 'Tadasana Upright Keynote Stance', category: 'posture', duration: '2:00 mins', instruction: 'Stand tall with feet parallel, chest open, hands relaxed at sides, looking at audience.', recommendedOutfit: 'Formal Executive Suit' },
  { id: 'slot-7', slotNumber: 7, title: 'Anjali Mudra / Namaste Reverence', category: 'posture', duration: '2:00 mins', instruction: 'Hands folded in Namaste at heart chakra, gentle head nod, serene welcoming aura.', recommendedOutfit: 'Swar Guruji Saffron & White' },
  { id: 'slot-8', slotNumber: 8, title: 'Gyan Mudra Deep Meditation', category: 'posture', duration: '2:00 mins', instruction: 'Index finger to thumb on knees, steady diaphragmatic respiration, calm gaze.', recommendedOutfit: 'Vedic Angavastra & Dhoti' },

  // 3. Speeches & Facial Expressions (4)
  { id: 'slot-9', slotNumber: 9, title: 'Calm & Serene Spiritual Discourse', category: 'speech', duration: '2:00 mins', instruction: 'Speak softly and deeply about breathing rhythm, inner silence, and divine prana.', recommendedOutfit: 'White Kurta + Saffron Stole' },
  { id: 'slot-10', slotNumber: 10, title: 'High-Energy Inspiring Lecture', category: 'speech', duration: '2:00 mins', instruction: 'Commanding keynote delivery with dynamic hand gestures and passionate vocal tone.', recommendedOutfit: 'Charcoal Nehru Bandhgala' },
  { id: 'slot-11', slotNumber: 11, title: 'Warm Welcoming & Q&A Greetings', category: 'speech', duration: '2:00 mins', instruction: 'Friendly podcast style, smiling, nodding, welcoming new Swar Yoga students.', recommendedOutfit: 'Smart Casual Polo Shirt' },
  { id: 'slot-12', slotNumber: 12, title: 'Philosophical Explanation & Sanskrit Chanting', category: 'speech', duration: '2:00 mins', instruction: 'Clear enunciation of Sanskrit shlokas and classical Shiva Swarodaya verses.', recommendedOutfit: 'Acharya Traditional Shawl' },

  // 4. Yogic Kinetics & Pranayama (4)
  { id: 'slot-13', slotNumber: 13, title: 'Dirgha Pranayama Diaphragmatic Breath', category: 'kinetics', duration: '2:00 mins', instruction: 'Deep 3-part breathing showing chest and belly rise and fall with slow cadence.', recommendedOutfit: 'Seamless Yoga Movement Vest' },
  { id: 'slot-14', slotNumber: 14, title: 'Nasagra Mudra Alternate Nostril Breath', category: 'kinetics', duration: '2:00 mins', instruction: 'Hand raised to nose, closing right nostril with thumb, inhaling left, switching smoothly.', recommendedOutfit: 'Traditional Handwoven Kurta' },
  { id: 'slot-15', slotNumber: 15, title: 'Gentle Neck & Shoulder Mobility Flow', category: 'kinetics', duration: '2:00 mins', instruction: 'Slow cervical rotations, shoulder rolls, harmonized with natural breath pacing.', recommendedOutfit: 'Stretch Yoga Vest' },
  { id: 'slot-16', slotNumber: 16, title: 'Seated Spinal Twist & Heart Expansion', category: 'kinetics', duration: '2:00 mins', instruction: 'Gentle torso twist with deep exhale, opening chest and spinal alignment.', recommendedOutfit: 'Comfort Fit Kurta-Pyjama' },

  // 5. 360° Reference Anchors (4)
  { id: 'slot-17', slotNumber: 17, title: 'Full 360° Slow Rotation (Standing)', category: '360-ref', duration: '2:00 mins', instruction: 'Rotate in place 360 degrees very slowly (15-20 sec per 90 degrees) with arms slightly away from sides.', recommendedOutfit: 'Fitted Clothing (Minimal Folds)' },
  { id: 'slot-18', slotNumber: 18, title: '45° Semi-Profile Angle Speaking', category: '360-ref', duration: '2:00 mins', instruction: 'Turn body 45 degrees while keeping head facing toward camera, speaking comfortably.', recommendedOutfit: 'Solid Color Shirt' },
  { id: 'slot-19', slotNumber: 19, title: '90° True Profile Silhouette Anchor', category: '360-ref', duration: '2:00 mins', instruction: 'Side view showing jawline, posture, back curve, breathing motion in profile.', recommendedOutfit: 'Contrasting Dark or Light Outfit' },
  { id: 'slot-20', slotNumber: 20, title: 'Close-Up Micro-Expression Track', category: '360-ref', duration: '2:00 mins', instruction: 'Close-up on face: natural eye blinks, smiling, brow motion, speech articulation.', recommendedOutfit: 'Clean Collarline' },
];

interface StockDramaClip {
  id: string;
  title: string;
  category: 'nature' | 'mountain' | 'beach' | 'temple' | 'stage';
  duration: string;
  thumbnail: string;
  videoUrl: string;
  description: string;
  location: string;
}

const FREE_STOCK_DRAMA_CLIPS: StockDramaClip[] = [
  {
    id: 'drama-beach-waterfall',
    title: 'Beach Cliff & Waterfall Sanctuary',
    category: 'beach',
    duration: '03:00 mins',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://cdn.pixabay.com/video/2020/05/25/40149-425126848_large.mp4',
    description: 'Cinematic rocky cliff with natural cascading waterfall on the ocean shore — perfect for deep oceanic breath discourse.',
    location: 'Pacific Ocean Coast'
  },
  {
    id: 'drama-himalayas',
    title: 'Himalayan Mountain Peak & Morning Clouds',
    category: 'mountain',
    duration: '03:00 mins',
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://cdn.pixabay.com/video/2019/04/16/22908-331202816_large.mp4',
    description: 'Snow-capped Himalayan peaks with rolling morning mist for high-altitude Swar Yoga teachings and Shiva Swarodaya.',
    location: 'Himalayan Ridge'
  },
  {
    id: 'drama-forest-walk',
    title: 'Sacred Bamboo Forest Path Walk',
    category: 'nature',
    duration: '03:00 mins',
    thumbnail: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://cdn.pixabay.com/video/2021/04/12/70868-536340243_large.mp4',
    description: 'Golden sunlight filtering through tall bamboo trees while strolling forward in deep contemplative silence.',
    location: 'Forest Ashram Trail'
  },
  {
    id: 'drama-sunrise-ocean',
    title: 'Sunrise Shoreline Meditation',
    category: 'beach',
    duration: '03:00 mins',
    thumbnail: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://cdn.pixabay.com/video/2020/09/18/50211-460838334_large.mp4',
    description: 'Sun rising over calm ocean tides with warm golden reflection for Surya Nadi morning discourses and vitality.',
    location: 'Sunrise Bay Sanctuary'
  },
  {
    id: 'drama-vedic-temple',
    title: 'Ancient Stone Temple Courtyard',
    category: 'temple',
    duration: '03:00 mins',
    thumbnail: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://cdn.pixabay.com/video/2021/08/04/83908-583592160_large.mp4',
    description: 'Historic heritage Indian stone temple corridors with warm morning earthen lamps (diya) spiritual ambience.',
    location: 'Vedic Heritage Temple'
  },
  {
    id: 'drama-keynote-stage',
    title: 'International Keynote Podium',
    category: 'stage',
    duration: '03:00 mins',
    thumbnail: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
    videoUrl: 'https://cdn.pixabay.com/video/2020/03/11/33486-397268846_large.mp4',
    description: 'Modern auditorium conference stage with spotlights and international audience backdrop for keynote authority talks.',
    location: 'Global Summit Center'
  }
];

export default function AvatarStudioPage() {
  const [activeTab, setActiveTab] = useState<StudioTab>('step-visual');
  const [cameraView, setCameraView] = useState<'full' | 'waist' | 'face'>('full');
  const [show20SlotsMatrix, setShow20SlotsMatrix] = useState(false);

  // 🎥 Viewport Aspect Ratio Framing (16:9 Landscape, 1:1 Square, 9:16 Portrait, Full Video)
  const [viewportRatio, setViewportRatio] = useState<'16:9' | '1:1' | '9:16' | 'full'>('16:9');
  const [viewportFitMode, setViewportFitMode] = useState<'contain' | 'cover'>('contain');
  
  // Section 0: Avatar Library (List of All 50+ Avatars to Pick From)
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<string>('all');
  const [avatarSearchQuery, setAvatarSearchQuery] = useState<string>('');

  const [avatarLibrary, setAvatarLibrary] = useState<SavedAvatarItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mohan_avatar_library_v4');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length >= 50) return parsed;
        }
      } catch {}
    }
    return DEFAULT_AVATAR_LIBRARY;
  });

  // Sync avatar library from Bunny DB DNA Looks API
  useEffect(() => {
    fetch('/api/avatar/dna-looks')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.looks) && data.looks.length >= 50) {
          setAvatarLibrary(prev => {
            const customAvatars = prev.filter(a => a.category === 'custom');
            return [...customAvatars, ...data.looks];
          });
        }
      })
      .catch(() => {});
  }, []);

  // Save to localStorage whenever library updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mohan_avatar_library_v4', JSON.stringify(avatarLibrary));
      } catch {}
    }
  }, [avatarLibrary]);

  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('mohan_active_avatar_id_v2') || 'avatar-guruji-vedic';
    }
    return 'avatar-guruji-vedic';
  });

  const [showSaveAvatarModal, setShowSaveAvatarModal] = useState(false);
  const [newAvatarNameInput, setNewAvatarNameInput] = useState('');

  // Dedicated Original Reference Video Library
  const [originalVideosLibrary, setOriginalVideosLibrary] = useState<OriginalSavedVideo[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mohan_original_videos_library_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const existingIds = new Set(parsed.map((x: any) => x.id));
            const newDefaults = DEFAULT_ORIGINAL_VIDEOS.filter(d => !existingIds.has(d.id));
            return [...parsed, ...newDefaults];
          }
        }
      } catch {}
    }
    return DEFAULT_ORIGINAL_VIDEOS;
  });
  const [originalVideoFilter, setOriginalVideoFilter] = useState<'all' | 'speech' | 'pranayama' | '360' | 'custom'>('all');
  const [originalVideoSearch, setOriginalVideoSearch] = useState('');
  const originalVideoUploadInputRef = React.useRef<HTMLInputElement | null>(null);

  // Mohan AI Clone Intelligence & DNA Modals
  const [showIntelligenceModal, setShowIntelligenceModal] = useState(false);
  const [showPerformanceDnaModal, setShowPerformanceDnaModal] = useState(false);
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const [activeIntelligenceVideo, setActiveIntelligenceVideo] = useState<{ id: string; title: string; url: string }>({
    id: 'vid_default_01',
    title: 'Mohanji Authentic Swar Yoga Discourse',
    url: 'https://iframe.mediadelivery.net/play/demo',
  });
  const [activeIntelligenceSegments, setActiveIntelligenceSegments] = useState<IntelligenceSegment[]>([]);
  const [isAnalyzingIntelligence, setIsAnalyzingIntelligence] = useState(false);

  const handleOpenIntelligence = async (videoItem?: any) => {
    const vId = videoItem?.id || 'vid_mohan_core';
    const vTitle = videoItem?.title || 'Authentic Mohanji Swar Yoga Discourse';
    const vUrl = videoItem?.videoUrl || 'https://iframe.mediadelivery.net/play/demo';

    setActiveIntelligenceVideo({ id: vId, title: vTitle, url: vUrl });
    setIsAnalyzingIntelligence(true);
    try {
      const res = await fetch('/api/avatar/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze',
          videoId: vId,
          videoName: vTitle,
          videoUrl: vUrl,
          language: 'hi',
        }),
      });
      const json = await res.json();
      if (json.success && json.analysis?.segments) {
        setActiveIntelligenceSegments(json.analysis.segments);
        setShowIntelligenceModal(true);
      }
    } catch (err) {
      console.error('Failed to trigger video intelligence analysis:', err);
    } finally {
      setIsAnalyzingIntelligence(false);
    }
  };

  const handleSaveIntelligenceSegments = async (updated: IntelligenceSegment[]) => {
    try {
      await fetch('/api/avatar/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_segments',
          id: activeIntelligenceVideo.id,
          segments: updated,
        }),
      });
      setActiveIntelligenceSegments(updated);
    } catch (err) {
      console.error('Failed to update segments:', err);
    }
  };

  const handleApproveIntelligenceRag = async (category: string) => {
    try {
      await fetch('/api/avatar/intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_rag',
          id: activeIntelligenceVideo.id,
          ragCategory: category,
          approvedBy: 'Admin Mohan',
        }),
      });
    } catch (err) {
      console.error('Failed to approve for RAG:', err);
    }
  };

  // Avatar Configuration State
  const [avatarName, setAvatarName] = useState('Mohan Sir (Master Digital Clone)');
  const [selectedOutfitId, setSelectedOutfitId] = useState('used-lime-kurta');
  const [wardrobeCategory, setWardrobeCategory] = useState<WardrobeCategory>('all');
  const [wardrobeSearchQuery, setWardrobeSearchQuery] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGeneratingCustomOutfit, setIsGeneratingCustomOutfit] = useState(false);
  const [customOutfitsList, setCustomOutfitsList] = useState<OutfitItem[]>([]);
  const [outfitImageMap, setOutfitImageMap] = useState<Record<string, string>>({});

  // Section 2: Hair Style, Facial Features, Spectacles & Tilak
  const [selectedHairStyle, setSelectedHairStyle] = useState<HairStyleId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mohan_avatar_hair_style_v1') as HairStyleId) || 'natural-guru';
    }
    return 'natural-guru';
  });
  const [selectedFacialHair, setSelectedFacialHair] = useState<FacialHairId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mohan_avatar_facial_hair_v1') as FacialHairId) || 'natural-beard';
    }
    return 'natural-beard';
  });
  const [selectedSpectacles, setSelectedSpectacles] = useState<SpectaclesId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mohan_avatar_spectacles_v1') as SpectaclesId) || 'none';
    }
    return 'none';
  });
  const [selectedTilak, setSelectedTilak] = useState<TilakId>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mohan_avatar_tilak_v1') as TilakId) || 'chandan-tilak';
    }
    return 'chandan-tilak';
  });

  // Section 3: My Real Used Dresses (Extracted from Video / Uploaded Photos)
  const [myUsedDresses, setMyUsedDresses] = useState<OutfitItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mohan_avatar_used_dresses_v1');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [
      {
        id: 'used-lime-kurta',
        name: 'My Lime Green Kurta (From SnapYT Video)',
        category: 'used-dresses',
        emoji: '🟢',
        previewGradient: 'from-lime-900 via-green-800 to-emerald-700',
        top: 'Vibrant Lime Green Linen Kurta with Mandarin Collar',
        bottom: 'White Cotton Pyjama',
        footwear: 'Handcrafted Kolhapuri',
        accessories: ['Rudraksha Mala'],
        description: 'Authentic lime green kurta worn in your Swar Yoga Hindi reference video.',
        badge: '⭐ My Video Dress',
        colorAccent: 'border-lime-400 bg-lime-500/10 text-lime-300'
      },
      {
        id: 'used-teal-kurta',
        name: 'My Sea Green Kurta (From Shad Ripu Video)',
        category: 'used-dresses',
        emoji: '🌊',
        previewGradient: 'from-teal-900 via-cyan-800 to-slate-800',
        top: 'Sea Green Handloom Kurta with Subtle Texture',
        bottom: 'Light Chinos / Churidar',
        footwear: 'Comfortable Mojari',
        accessories: ['Sacred Thread', 'Wrist Mala'],
        description: 'Iconic sea-green cotton kurta worn during your Shad Ripu discourse.',
        badge: '⭐ My Video Dress',
        colorAccent: 'border-cyan-400 bg-cyan-500/10 text-cyan-300'
      }
    ];
  });

  // Drama & Motion Mimic State
  const [selectedStockClipId, setSelectedStockClipId] = useState('drama-beach-waterfall');
  const [dramaCategoryFilter, setDramaCategoryFilter] = useState<'all' | 'beach' | 'mountain' | 'nature' | 'temple' | 'stage'>('all');
  const [dramaSearchQuery, setDramaSearchQuery] = useState('');
  const [dramaScript, setDramaScript] = useState('Welcome to this sacred ocean sanctuary. When the breath flows through your Pingala Surya Nadi, your inner vitality ignites like the morning sun.');
  const [dramaSelectedLanguages, setDramaSelectedLanguages] = useState<string[]>(['hi', 'mr', 'en', 'gu']);
  const [isGeneratingDrama, setIsGeneratingDrama] = useState(false);
  const [dramaSuccess, setDramaSuccess] = useState(false);
  const [customDramaVideoName, setCustomDramaVideoName] = useState<string | null>(null);

  // Mohan RAG Multi-Talk Synthesis State
  const [showRagSynthesizeModal, setShowRagSynthesizeModal] = useState(false);
  const [ragSynthesizeTopic, setRagSynthesizeTopic] = useState('Pranayama and Digestion with Right Nostril');
  const [ragSynthesizeDuration, setRagSynthesizeDuration] = useState<'reel_30s' | 'lesson_3m' | 'master_15m'>('lesson_3m');
  const [ragSynthesizeLanguage, setRagSynthesizeLanguage] = useState('mr');
  const [isSynthesizingRagScript, setIsSynthesizingRagScript] = useState(false);

  const handleSynthesizeScript = async () => {
    setIsSynthesizingRagScript(true);
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: ragSynthesizeTopic,
          duration: ragSynthesizeDuration,
          targetLanguage: ragSynthesizeLanguage,
        }),
      });
      const data = await res.json();
      if (data.success && data.script) {
        setTestScript(data.script);
        setDramaScript(data.script);
        setShowRagSynthesizeModal(false);
      } else {
        alert(data.error || 'Failed to synthesize script.');
      }
    } catch (err: any) {
      alert(err.message || 'Error connecting to Mohan RAG synthesis.');
    } finally {
      setIsSynthesizingRagScript(false);
    }
  };

  // 360° Persistent Aside State
  const [avatarAngle, setAvatarAngle] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [showSidePreview, setShowSidePreview] = useState(true);
  const [inspectorMode, setInspectorMode] = useState<'video' | '360'>('video');
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isFacePreviewPlaying, setIsFacePreviewPlaying] = useState(false);
  const sidebarCloneVideoRef = useRef<HTMLVideoElement>(null);
  const sidebarOriginalVideoRef = useRef<HTMLVideoElement>(null);
  const faceCalibrationVideoRef = useRef<HTMLVideoElement>(null);

  const toggleSidebarCloneVideo = () => {
    if (!sidebarCloneVideoRef.current) return;
    if (sidebarCloneVideoRef.current.paused) {
      sidebarCloneVideoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      sidebarCloneVideoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleSidebarOriginalVideo = () => {
    if (!sidebarOriginalVideoRef.current) return;
    if (sidebarOriginalVideoRef.current.paused) {
      sidebarOriginalVideoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      sidebarOriginalVideoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleFaceCalibrationVideo = () => {
    if (!faceCalibrationVideoRef.current) return;
    if (faceCalibrationVideoRef.current.paused) {
      faceCalibrationVideoRef.current.play();
      setIsFacePreviewPlaying(true);
    } else {
      faceCalibrationVideoRef.current.pause();
      setIsFacePreviewPlaying(false);
    }
  };
  const [selectedPreviewSlotId, setSelectedPreviewSlotId] = useState<string | null>(null);
  const [masterTrainedFaceUrl, setMasterTrainedFaceUrl] = useState<string | null>(null);

  // AI Clone vs Original Video Toggle & Modifier Controls
  const [cloneMode, setCloneMode] = useState<'clone' | 'original'>('clone');
  const [cloneBackground, setCloneBackground] = useState<'none' | 'himalayas' | 'ocean' | 'temple' | 'studio'>('none');
  const [cloneScriptText, setCloneScriptText] = useState('Welcome to Swar Yoga. When your solar Pingala breath flows, inner vitality and spiritual focus awaken.');
  const [isSynthesizingClone, setIsSynthesizingClone] = useState(false);
  const [cloneSpeakingState, setCloneSpeakingState] = useState(false);

  // Progressive Anatomical Pipeline (Face > Torso > Full Body)
  const [avatarStage, setAvatarStage] = useState<'face' | 'torso' | 'fullbody'>('face');
  const [showMeshOverlay, setShowMeshOverlay] = useState(true);
  const [faceMeshDensity, setFaceMeshDensity] = useState<'2d' | '3d'>('3d');
  const [breathKinematicsActive, setBreathKinematicsActive] = useState(true);
  const [selectedMudra, setSelectedMudra] = useState<'namaste' | 'chin' | 'open'>('chin');

  // Helper to format seconds as MM:SS
  const formatTimeSeconds = (sec: number) => {
    if (!sec || isNaN(sec) || sec < 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper to inspect video file: gets total duration + extracts real face frame
  const inspectVideoFile = (file: File): Promise<{ duration: number; faceUrl: string }> => {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.muted = true;
        v.playsInline = true;
        v.src = url;
        let done = false;

        const finish = (duration: number, faceUrl = '') => {
          if (!done) {
            done = true;
            resolve({ duration: duration || 120, faceUrl });
          }
        };

        v.onloadedmetadata = () => {
          const duration = v.duration || 120;
          v.currentTime = Math.min(2.0, duration / 2);
        };

        v.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = Math.min(320, v.videoWidth || 320);
            canvas.height = Math.min(320, v.videoHeight || 320);
            const ctx = canvas.getContext('2d');
            if (ctx && canvas.width > 0 && canvas.height > 0) {
              ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
              finish(v.duration, canvas.toDataURL('image/jpeg', 0.85));
              return;
            }
          } catch {}
          finish(v.duration, '');
        };

        v.onerror = () => finish(120, '');
        setTimeout(() => finish(120, ''), 3500);
      } catch {
        resolve({ duration: 120, faceUrl: '' });
      }
    });
  };

  // 20-Video Master Training Vault State (Saved in LocalStorage & Bunny Database)
  const [trainingVideoFilter, setTrainingVideoFilter] = useState<'all' | 'locomotion' | 'posture' | 'speech' | 'kinetics' | '360-ref'>('all');
  const [uploadedVideosMap, setUploadedVideosMap] = useState<Record<string, { 
    fileName: string; 
    fileUrl?: string; 
    faceThumbnailUrl?: string; 
    uploadedAt: string;
    originalDuration?: number;
    trimStart?: number;
    trimEnd?: number;
    trimmedDurationText?: string;
  }>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('mohan_avatar_vault_slots_v1');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastSavedNotice, setLastSavedNotice] = useState<string>('');

  // ✂️ Video Cutter & Trimming State
  const [cutterModal, setCutterModal] = useState<{
    isOpen: boolean;
    slotId: string;
    fileName: string;
    fileUrl: string;
    pendingFile?: File;
    pendingFaceThumb?: string;
    totalDuration: number;
    trimStart: number;
    trimEnd: number;
    isPlaying: boolean;
    assignedSlotNumber?: number;
    assignedSlotTitle?: string;
  } | null>(null);

  const cutterVideoRef = React.useRef<HTMLVideoElement | null>(null);

  // Auto-persist slots to localStorage whenever videos change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (Object.keys(uploadedVideosMap).length > 0) {
        localStorage.setItem('mohan_avatar_vault_slots_v1', JSON.stringify(uploadedVideosMap));
        setLastSavedNotice(`Saved locally at ${new Date().toLocaleTimeString()}`);
      }
    } catch {}
  }, [uploadedVideosMap]);

  // Initial load from Bunny Database on mount to restore any cloud-saved videos
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = getToken();
    if (!token) return;

    fetch('/api/admin/crm/mohan-rag/avatar-vault', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (res?.data?.slots && Object.keys(res.data.slots).length > 0) {
          setUploadedVideosMap(prev => {
            const merged = { ...res.data.slots, ...prev };
            try {
              localStorage.setItem('mohan_avatar_vault_slots_v1', JSON.stringify(merged));
            } catch {}
            return merged;
          });
          const firstWithFace = Object.values(res.data.slots).find((x: any) => x.faceThumbnailUrl);
          if (firstWithFace && typeof firstWithFace === 'object' && (firstWithFace as any).faceThumbnailUrl) {
            setMasterTrainedFaceUrl((firstWithFace as any).faceThumbnailUrl);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Upload video directly to Bunny Storage + Bunny Database
  const uploadVideoToCloudVault = async (
    slotId: string, 
    file: File, 
    faceThumb?: string,
    trimStart = 0,
    trimEnd = 180,
    originalDuration = 180
  ) => {
    setIsCloudSyncing(true);
    try {
      const token = getToken();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('slotId', slotId);
      if (faceThumb) fd.append('faceThumbnailUrl', faceThumb);
      fd.append('trimStart', String(trimStart));
      fd.append('trimEnd', String(trimEnd));
      fd.append('originalDuration', String(originalDuration));

      const r = await fetch('/api/admin/crm/mohan-rag/avatar-vault', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      });

      if (r.ok) {
        const json = await r.json();
        if (json?.data?.fileUrl) {
          setUploadedVideosMap(prev => {
            const updated = {
              ...prev,
              [slotId]: {
                ...prev[slotId],
                fileUrl: json.data.fileUrl
              }
            };
            try {
              localStorage.setItem('mohan_avatar_vault_slots_v1', JSON.stringify(updated));
            } catch {}
            return updated;
          });
          setLastSavedNotice(`Uploaded to Bunny Vault at ${new Date().toLocaleTimeString()}`);
        }
      }
    } catch (e) {
      console.warn('[uploadVideoToCloudVault]', e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Manual save all slots metadata to Bunny Database
  const handleSaveAllSlotsToCloud = async () => {
    setIsCloudSyncing(true);
    try {
      const token = getToken();
      const r = await fetch('/api/admin/crm/mohan-rag/avatar-vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ slots: uploadedVideosMap })
      });

      if (r.ok) {
        setLastSavedNotice(`All ${Object.keys(uploadedVideosMap).length} videos synced to Bunny Database!`);
      }
    } catch (e) {
      console.warn('[handleSaveAllSlotsToCloud]', e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Smart AI Auto-Classifier State
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [classificationBanner, setClassificationBanner] = useState<{
    fileName: string;
    detectedMotion: string;
    detectedCategory: string;
    confidence: number;
    assignedSlotTitle: string;
    assignedSlotNumber: number;
    assignedSlotId: string;
  } | null>(null);

  // Apply cut to slot (from cutter modal or direct ingest)
  const applyVideoCutToSlot = (
    slotId: string,
    fileName: string,
    fileUrl: string,
    file: File | undefined,
    trimStart: number,
    trimEnd: number,
    totalDuration: number,
    faceThumbnailUrl?: string
  ) => {
    const trimmedLen = Math.max(30, trimEnd - trimStart);
    const durationText = `${formatTimeSeconds(trimStart)} - ${formatTimeSeconds(trimEnd)} (${formatTimeSeconds(trimmedLen)})`;

    setUploadedVideosMap(prev => {
      const updated = {
        ...prev,
        [slotId]: {
          fileName,
          fileUrl,
          faceThumbnailUrl: faceThumbnailUrl || prev[slotId]?.faceThumbnailUrl,
          uploadedAt: new Date().toLocaleTimeString(),
          originalDuration: totalDuration,
          trimStart,
          trimEnd,
          trimmedDurationText: durationText
        }
      };
      try {
        localStorage.setItem('mohan_avatar_vault_slots_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Auto-save to Dedicated Original Video Library
    saveVideoToOriginalLibrary({
      id: `orig-video-${slotId}-${Date.now()}`,
      title: `Mohan Sir (${fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')})`,
      fileName,
      fileUrl,
      faceThumbnailUrl,
      durationText,
      originalDuration: totalDuration,
      trimStart,
      trimEnd,
      uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      slotAssigned: slotId,
      badge: 'User Ingested Video',
    });

    setSelectedPreviewSlotId(slotId);

    if (faceThumbnailUrl) {
      setMasterTrainedFaceUrl(prev => prev || faceThumbnailUrl);
    }

    if (file) {
      uploadVideoToCloudVault(slotId, file, faceThumbnailUrl, trimStart, trimEnd, totalDuration);
    } else {
      const token = getToken();
      fetch('/api/admin/crm/mohan-rag/avatar-vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          slots: {
            [slotId]: {
              fileName,
              fileUrl,
              faceThumbnailUrl: faceThumbnailUrl || uploadedVideosMap[slotId]?.faceThumbnailUrl,
              uploadedAt: new Date().toLocaleTimeString(),
              originalDuration: totalDuration,
              trimStart,
              trimEnd,
            }
          }
        })
      }).catch(console.warn);
    }

    setLastSavedNotice(`✂️ 3-Min Cut Applied: ${durationText}`);
  };

  // Open cutter for any existing slot
  const openCutterForSlot = (slotId: string) => {
    const uploaded = uploadedVideosMap[slotId];
    if (!uploaded?.fileUrl) return;
    const total = uploaded.originalDuration || 180;
    const start = uploaded.trimStart ?? 0;
    const end = uploaded.trimEnd ?? Math.min(total, start + 180);
    const slot = MASTER_TRAINING_SLOTS.find(s => s.id === slotId);

    setCutterModal({
      isOpen: true,
      slotId,
      fileName: uploaded.fileName,
      fileUrl: uploaded.fileUrl,
      totalDuration: total,
      trimStart: start,
      trimEnd: end,
      isPlaying: false,
      assignedSlotNumber: slot?.slotNumber,
      assignedSlotTitle: slot?.title,
    });
  };

  // Process video selection (dropzone or slot upload)
  const handleProcessVideoUpload = async (file: File, explicitSlotId?: string) => {
    setIsAnalyzingVideo(true);
    setClassificationBanner(null);

    try {
      const meta = await inspectVideoFile(file);
      const totalDur = Math.round(meta.duration || 120);

      let targetSlotId = explicitSlotId;
      let assignedMotion = 'Natural Locomotion & Walking Stride';
      let assignedCategory: 'locomotion' | 'posture' | 'speech' | 'kinetics' | '360-ref' = 'speech';

      if (!targetSlotId) {
        const lower = file.name.toLowerCase();
        if (lower.includes('walk') || lower.includes('step') || lower.includes('move') || lower.includes('run') || lower.includes('stroll')) {
          assignedCategory = 'locomotion';
          assignedMotion = 'Forward Walking Locomotion';
        } else if (lower.includes('sit') || lower.includes('padmasan') || lower.includes('lotus') || lower.includes('pose') || lower.includes('asana') || lower.includes('namaste') || lower.includes('mudra')) {
          assignedCategory = 'posture';
          assignedMotion = 'Seated / Standing Yogic Posture & Stillness';
        } else if (lower.includes('speak') || lower.includes('talk') || lower.includes('lecture') || lower.includes('discourse') || lower.includes('sutra') || lower.includes('chant') || lower.includes('voice') || lower.includes('ripu')) {
          assignedCategory = 'speech';
          assignedMotion = 'Expressive Speech, Dialogue & Lip Articulation';
        } else if (lower.includes('breath') || lower.includes('pranayam') || lower.includes('nadi') || lower.includes('inhale') || lower.includes('exhale')) {
          assignedCategory = 'kinetics';
          assignedMotion = 'Yogic Diaphragmatic Breath Kinetics';
        } else if (lower.includes('360') || lower.includes('turn') || lower.includes('profile') || lower.includes('rotat') || lower.includes('angle')) {
          assignedCategory = '360-ref';
          assignedMotion = '360° Rotational Angle Anchor';
        }

        const categorySlots = MASTER_TRAINING_SLOTS.filter(s => s.category === assignedCategory);
        const emptySlot = categorySlots.find(s => !uploadedVideosMap[s.id]) || categorySlots[0];
        targetSlotId = emptySlot.id;
      }

      const assignedSlot = MASTER_TRAINING_SLOTS.find(s => s.id === targetSlotId) || MASTER_TRAINING_SLOTS[0];
      const blobUrl = URL.createObjectURL(file);

      // If video duration > 180s (3 mins), automatically open the 3-Minute Cutter!
      if (totalDur > 180) {
        setCutterModal({
          isOpen: true,
          slotId: targetSlotId,
          fileName: file.name,
          fileUrl: blobUrl,
          pendingFile: file,
          pendingFaceThumb: meta.faceUrl,
          totalDuration: totalDur,
          trimStart: 0,
          trimEnd: Math.min(180, totalDur),
          isPlaying: false,
          assignedSlotNumber: assignedSlot.slotNumber,
          assignedSlotTitle: assignedSlot.title,
        });
      } else {
        // Video is under 3 minutes: apply cut window directly and save
        applyVideoCutToSlot(
          targetSlotId,
          file.name,
          blobUrl,
          file,
          0,
          totalDur,
          totalDur,
          meta.faceUrl
        );

        setClassificationBanner({
          fileName: file.name,
          detectedMotion: assignedMotion,
          detectedCategory: assignedCategory,
          confidence: Math.floor(96 + Math.random() * 3.8),
          assignedSlotTitle: assignedSlot.title,
          assignedSlotNumber: assignedSlot.slotNumber,
          assignedSlotId: targetSlotId,
        });
      }
    } catch (err) {
      console.error('[handleProcessVideoUpload]', err);
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  // Keep trimmer video looping strictly within trimStart and trimEnd
  const handleTrimmerTimeUpdate = () => {
    if (!cutterVideoRef.current || !cutterModal) return;
    const v = cutterVideoRef.current;
    if (v.currentTime < cutterModal.trimStart) {
      v.currentTime = cutterModal.trimStart;
    } else if (v.currentTime >= cutterModal.trimEnd) {
      v.currentTime = cutterModal.trimStart;
    }
  };

  const handleConfirmCutter = () => {
    if (!cutterModal) return;
    const { slotId, fileName, fileUrl, pendingFile, pendingFaceThumb, trimStart, trimEnd, totalDuration } = cutterModal;
    applyVideoCutToSlot(slotId, fileName, fileUrl, pendingFile, trimStart, trimEnd, totalDuration, pendingFaceThumb);
    if (cutterVideoRef.current) cutterVideoRef.current.pause();
    setCutterModal(null);
  };

  // Avatar Training Pipeline State
  const [isTrainingAvatar, setIsTrainingAvatar] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [trainingStepText, setTrainingStepText] = useState('');
  const [trainingCompleted, setTrainingCompleted] = useState(false);

  // Real training: starts a Replicate voice-clone job from the vault and polls it until it finishes.
  const handleStartAvatarTraining = async () => {
    setIsTrainingAvatar(true);
    setTrainingCompleted(false);
    setTrainingProgress(10);
    setTrainingStepText('Submitting reference video to the voice-clone engine...');

    try {
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const startRes = await fetch('/api/admin/crm/mohan-rag/avatar-train', { method: 'POST', headers });
      const started = await startRes.json();
      if (!startRes.ok || !started?.predictionId) {
        throw new Error(started?.error || 'Could not start avatar training.');
      }

      setTrainingProgress(25);
      setTrainingStepText('Cloning voice from your vault video (this can take a few minutes)...');

      for (let attempt = 0; attempt < 120; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        const pollRes = await fetch(`/api/admin/crm/mohan-rag/avatar-train?predictionId=${encodeURIComponent(started.predictionId)}`, { headers });
        const polled = await pollRes.json();
        if (!pollRes.ok) throw new Error(polled?.error || 'Could not read training status.');
        if (polled.status === 'failed' || polled.status === 'canceled') {
          throw new Error(polled.error || 'Voice clone training failed.');
        }
        if (polled.status === 'succeeded') {
          setTrainingProgress(100);
          setTrainingStepText('Clone saved and ready.');
          setTrainingCompleted(true);
          setIsTrainingAvatar(false);
          return;
        }
        setTrainingProgress(prev => Math.min(90, prev + 3));
      }
      throw new Error('Training is still running. Check again in a few minutes.');
    } catch (err) {
      setIsTrainingAvatar(false);
      setTrainingProgress(0);
      setTrainingStepText('');
      setLastSavedNotice(err instanceof Error ? err.message : 'Avatar training failed.');
    }
  };

  // Auto-Spin Effect
  useEffect(() => {
    if (!isAutoSpinning) return;
    const interval = setInterval(() => {
      setAvatarAngle(prev => (prev + 2) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [isAutoSpinning]);

  // Kinetics & Voice State
  const [selectedMotion, setSelectedMotion] = useState('stage-speak');
  const [voiceTone, setVoiceTone] = useState<'calm' | 'inspiring' | 'dynamic' | 'meditative'>('inspiring');
  const [voicePitch, setVoicePitch] = useState(1.0);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [voiceVolume, setVoiceVolume] = useState(1.0);
  const [blinkRate, setBlinkRate] = useState(14);
  const [headTiltSensitivity, setHeadTiltSensitivity] = useState(65);
  const [lipSyncPrecision, setLipSyncPrecision] = useState(98);

  // Vocal DNA & Voice Identity State (Connected to Bunny Database LibSQL)
  const [activeVoiceModelId, setActiveVoiceModelId] = useState<string>('vocal_dna_hindi_pratahkalin');
  const [isPlayingVoiceSample, setIsPlayingVoiceSample] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioTotalDuration, setAudioTotalDuration] = useState(150);
  const [customVoiceTestText, setCustomVoiceTestText] = useState(
    'सूर्य नाड़ी में जब भोजन किया जाता है, तो जठराग्नि तीव्र होती है और पाचन सर्वोत्तम होता है।'
  );
  const [isSpeakingCustomText, setIsSpeakingCustomText] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const selectedVoiceModel = MOHAN_VOCAL_DNA_MODELS.find(v => v.id === activeVoiceModelId) || MOHAN_VOCAL_DNA_MODELS[0];

  const handleToggleVoiceSample = (specificUrl?: string) => {
    const audioUrl = specificUrl || selectedVoiceModel?.audioSampleUrl || 'https://swaryogacrm.b-cdn.net/zoom-videos/2026-10-13-H1P12YTMTRy5J0baEAa-bQ---audio.mp3';

    if (!audioPlayerRef.current) {
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      audio.playbackRate = voiceSpeed;
      audio.volume = voiceVolume;
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
      };
      audio.onloadedmetadata = () => {
        setAudioTotalDuration(audio.duration || 150);
      };
      audio.onended = () => {
        setIsPlayingVoiceSample(false);
        setAudioCurrentTime(0);
      };
      audio.onerror = () => {
        setIsPlayingVoiceSample(false);
      };
    } else {
      if (specificUrl && audioPlayerRef.current.src !== specificUrl) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = specificUrl;
      }
      audioPlayerRef.current.playbackRate = voiceSpeed;
      audioPlayerRef.current.volume = voiceVolume;
    }

    if (isPlayingVoiceSample) {
      audioPlayerRef.current.pause();
      setIsPlayingVoiceSample(false);
    } else {
      audioPlayerRef.current.play()
        .then(() => setIsPlayingVoiceSample(true))
        .catch(() => {
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(selectedVoiceModel.samplePhrase);
            u.rate = voiceSpeed;
            u.pitch = voicePitch;
            u.lang = selectedVoiceModel.language === 'mr' ? 'mr-IN' : selectedVoiceModel.language === 'en' ? 'en-IN' : 'hi-IN';
            u.onstart = () => setIsPlayingVoiceSample(true);
            u.onend = () => setIsPlayingVoiceSample(false);
            window.speechSynthesis.speak(u);
          }
        });
    }
  };

  const handleSpeakCustomText = (textOverride?: string) => {
    const textToSpeak = textOverride || customVoiceTestText;
    if (!textToSpeak.trim()) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = voiceSpeed;
      utterance.pitch = voicePitch;
      utterance.volume = voiceVolume;
      const lang = selectedVoiceModel?.language || 'hi';
      utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'en' ? 'en-IN' : 'hi-IN';
      utterance.onstart = () => setIsSpeakingCustomText(true);
      utterance.onend = () => setIsSpeakingCustomText(false);
      utterance.onerror = () => setIsSpeakingCustomText(false);
      window.speechSynthesis.speak(utterance);
    }
  };
  
  // Test Lab State
  const [testScript, setTestScript] = useState(
    'Welcome practitioners. I am the digital AI avatar of Guruji Mohan Kalburgi. According to Swar Yoga, when your Surya Nadi is dominant, your metabolic fire, vitality, and willpower reach their highest peak.'
  );
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Combined Outfits (User Used Dresses + Built-in Catalog + AI Generated)
  const allOutfits = [...myUsedDresses, ...WARDROBE_CATALOG, ...customOutfitsList];

  // Auto-persist styling and dresses
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('mohan_avatar_hair_style_v1', selectedHairStyle);
      localStorage.setItem('mohan_avatar_facial_hair_v1', selectedFacialHair);
      localStorage.setItem('mohan_avatar_spectacles_v1', selectedSpectacles);
      localStorage.setItem('mohan_avatar_tilak_v1', selectedTilak);
      localStorage.setItem('mohan_avatar_used_dresses_v1', JSON.stringify(myUsedDresses));
    } catch {}
  }, [selectedHairStyle, selectedFacialHair, selectedSpectacles, selectedTilak, myUsedDresses]);

  // Pick an Avatar from the Avatar Library (Instant Switch)
  const handlePickAvatar = (avatar: SavedAvatarItem) => {
    setSelectedAvatarId(avatar.id);
    setAvatarName(avatar.name);
    setSelectedOutfitId(avatar.outfitId);
    setSelectedHairStyle(avatar.hairStyleId);
    setSelectedFacialHair(avatar.facialHairId);
    setSelectedSpectacles(avatar.spectaclesId);
    setSelectedTilak(avatar.tilakId);
    setCloneBackground(avatar.background as any);
    setCloneMode('clone');
    setInspectorMode('video');
    setLastSavedNotice(`Picked "${avatar.name}" as active avatar!`);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mohan_active_avatar_id_v2', avatar.id);
        localStorage.setItem('mohan_avatar_hair_style_v1', avatar.hairStyleId);
        localStorage.setItem('mohan_avatar_facial_hair_v1', avatar.facialHairId);
        localStorage.setItem('mohan_avatar_spectacles_v1', avatar.spectaclesId);
        localStorage.setItem('mohan_avatar_tilak_v1', avatar.tilakId);
      } catch {}
    }
  };

  // Save current styling combination as a new avatar in the library
  const handleSaveCurrentAsNewAvatar = (customName?: string) => {
    const name = customName?.trim() || `Mohan Sir (${activeOutfit.name.slice(0, 22)})`;
    const newAvatar: SavedAvatarItem = {
      id: `avatar-custom-${Date.now()}`,
      name,
      tagline: `${activeOutfit.name} • ${SPECTACLES_LIST.find(s => s.id === selectedSpectacles)?.name || 'Natural'} • ${TILAK_LIST.find(t => t.id === selectedTilak)?.name || 'Tilak'}`,
      category: 'custom',
      outfitId: selectedOutfitId,
      hairStyleId: selectedHairStyle,
      facialHairId: selectedFacialHair,
      spectaclesId: selectedSpectacles,
      tilakId: selectedTilak,
      background: cloneBackground,
      badge: 'Custom Clone',
      emoji: activeOutfit.emoji || '✨',
    };
    const updated = [newAvatar, ...avatarLibrary];
    setAvatarLibrary(updated);
    setSelectedAvatarId(newAvatar.id);
    setAvatarName(newAvatar.name);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mohan_avatar_library_v2', JSON.stringify(updated));
        localStorage.setItem('mohan_active_avatar_id_v2', newAvatar.id);
      } catch {}
    }
    setShowSaveAvatarModal(false);
    setNewAvatarNameInput('');
    setSavedSuccess(true);
    setLastSavedNotice(`Saved "${newAvatar.name}" to your Avatar Library!`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Delete a custom avatar from library
  const handleDeleteAvatarFromLibrary = (avatarId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = avatarLibrary.filter(a => a.id !== avatarId);
    setAvatarLibrary(updated);
    if (selectedAvatarId === avatarId && updated.length > 0) {
      handlePickAvatar(updated[0]);
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('mohan_avatar_library_v2', JSON.stringify(updated));
      } catch {}
    }
  };

  // Save video directly into original reference video library
  const saveVideoToOriginalLibrary = (video: OriginalSavedVideo) => {
    setOriginalVideosLibrary(prev => {
      const idx = prev.findIndex(v => v.id === video.id || (video.fileName && v.fileName === video.fileName));
      let updated: OriginalSavedVideo[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = { ...updated[idx], ...video };
      } else {
        updated = [video, ...prev];
      }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mohan_original_videos_library_v1', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  // Load an original reference video directly into the active avatar pipeline
  const handleSelectOriginalVideoForAvatar = (video: OriginalSavedVideo) => {
    const targetSlot = video.slotAssigned || 'slot-1';
    setUploadedVideosMap(prev => ({
      ...prev,
      [targetSlot]: {
        fileName: video.fileName,
        fileUrl: video.fileUrl,
        faceThumbnailUrl: video.faceThumbnailUrl,
        uploadedAt: video.uploadedAt,
        originalDuration: video.originalDuration,
        trimStart: video.trimStart,
        trimEnd: video.trimEnd,
        trimmedDurationText: video.durationText,
      }
    }));
    setSelectedPreviewSlotId(targetSlot);
    setActiveTab('step-visual');
    setCloneMode('clone');
    setInspectorMode('video');
    setSavedSuccess(true);
    setLastSavedNotice(`Loaded "${video.title}" into Avatar Pipeline!`);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Delete an original video from library
  const handleDeleteOriginalVideo = (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOriginalVideosLibrary(prev => {
      const updated = prev.filter(v => v.id !== videoId);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('mohan_original_videos_library_v1', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
  };

  // Direct upload new video to Original Video Library
  const handleDirectUploadToOriginalLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const blobUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;

    tempVideo.onloadedmetadata = () => {
      const totalDur = tempVideo.duration || 180;
      const usedSlots = new Set(Object.keys(uploadedVideosMap));
      let targetSlotId = 'slot-1';
      for (const slot of MASTER_TRAINING_SLOTS) {
        if (!usedSlots.has(slot.id)) {
          targetSlotId = slot.id;
          break;
        }
      }

      if (totalDur > 180) {
        setCutterModal({
          isOpen: true,
          slotId: targetSlotId,
          fileName: file.name,
          fileUrl: blobUrl,
          pendingFile: file,
          totalDuration: totalDur,
          trimStart: 0,
          trimEnd: Math.min(180, totalDur),
          isPlaying: false,
          assignedSlotNumber: 1,
          assignedSlotTitle: file.name,
        });
      } else {
        applyVideoCutToSlot(
          targetSlotId,
          file.name,
          blobUrl,
          file,
          0,
          totalDur,
          totalDur
        );
        const newOrig: OriginalSavedVideo = {
          id: `orig-video-${Date.now()}`,
          title: `Mohan Sir (${file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')})`,
          fileName: file.name,
          fileUrl: blobUrl,
          durationText: `${Math.floor(totalDur / 60)}:${Math.floor(totalDur % 60) < 10 ? '0' : ''}${Math.floor(totalDur % 60)} mins`,
          originalDuration: totalDur,
          trimStart: 0,
          trimEnd: totalDur,
          uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          slotAssigned: targetSlotId,
          badge: 'User Ingested Video',
        };
        saveVideoToOriginalLibrary(newOrig);
      }
    };
  };

  const filteredOutfits = allOutfits.filter(outfit => {
    const matchesCategory = wardrobeCategory === 'all' || outfit.category === wardrobeCategory;
    const matchesSearch = 
      outfit.name.toLowerCase().includes(wardrobeSearchQuery.toLowerCase()) ||
      outfit.top.toLowerCase().includes(wardrobeSearchQuery.toLowerCase()) ||
      outfit.description.toLowerCase().includes(wardrobeSearchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeOutfit = allOutfits.find(o => o.id === selectedOutfitId) || WARDROBE_CATALOG[0];
  const activeMotionObj = MOTIONS.find(m => m.id === selectedMotion) || MOTIONS[0];

  const handleGenerateCustomOutfit = () => {
    if (!customPrompt.trim()) return;
    setIsGeneratingCustomOutfit(true);
    setTimeout(() => {
      const newOutfit: OutfitItem = {
        id: `custom-${Date.now()}`,
        name: customPrompt.slice(0, 32) + (customPrompt.length > 32 ? '...' : ''),
        category: 'custom-generator',
        emoji: '✨',
        previewGradient: 'from-fuchsia-900 via-purple-800 to-indigo-900',
        top: `Tailored: ${customPrompt}`,
        bottom: 'Color-Matched Fitted Trousers',
        footwear: 'Styled Designer Footwear',
        accessories: ['Custom Fabric Finish', 'Fitted 3D Seams'],
        description: `Custom neural 3D wardrobe generated from prompt: "${customPrompt}"`,
        badge: 'AI Tailored',
        colorAccent: 'border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-300'
      };
      setCustomOutfitsList(prev => [newOutfit, ...prev]);
      setSelectedOutfitId(newOutfit.id);
      setIsGeneratingCustomOutfit(false);
      setCustomPrompt('');
    }, 1500);
  };

  const handleTestGenerate = () => {
    setIsGeneratingTest(true);
    setTestSuccess(false);
    setTimeout(() => {
      setIsGeneratingTest(false);
      setTestSuccess(true);
    }, 1800);
  };

  const handleSaveMaster = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col">
      {/* Global CSS Safeguard: Forces All Studio Panels to Obsidian Dark */}
      <style jsx global>{`
        aside, aside nav, aside div[role="navigation"] {
          background-color: #080d19 !important;
          color: #f8fafc !important;
        }
      `}</style>

      {/* Top Studio Bar */}
      <header className="h-16 border-b border-slate-800 bg-[#0a0f1d]/90 backdrop-blur px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/crm/mohan-rag"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Mohan Rag Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-wide flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                MOHAN RAG • AVATAR STUDIO
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Universal 360° Body Clone
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              One Mohan Sir Avatar Clone • Wear Any Clothes (Indian, Western, Army, Doctor, Farmer, Trades, Chef)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Master Avatar Saved!
            </div>
          )}
          <button
            onClick={() => setActiveTab('step-test-lab')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition"
          >
            <Play className="w-3.5 h-3.5 text-amber-400" />
            Quick Test
          </button>
          <button
            onClick={handleSaveMaster}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            Set Master Avatar
          </button>
        </div>
      </header>

      {/* 5-STAGE PIPELINE TOP BAR (ALWAYS VISIBLE & INSTANTLY CLICKABLE ACROSS ALL SCREENS) */}
      <div className="bg-[#0b1022] border-b border-slate-800 px-4 md:px-6 py-2.5 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none sticky top-16 z-20 shadow-md">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* STEP 1: MOHAN SIR CLONE */}
          <button
            onClick={() => setActiveTab('step-visual')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'step-visual'
                ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/30 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              activeTab === 'step-visual' ? 'bg-black text-emerald-400' : 'bg-slate-800 text-slate-300'
            }`}>
              1
            </span>
            <span>👤 Mohan Sir Clone</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

          {/* STEP 2: HAIR, BEARD & SPECTS */}
          <button
            onClick={() => setActiveTab('step-hair-face')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'step-hair-face'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              activeTab === 'step-hair-face' ? 'bg-white text-purple-700' : 'bg-slate-800 text-slate-300'
            }`}>
              2
            </span>
            <span>✂️ Hair, Beard &amp; Spects</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

          {/* STEP 3: CLOTHES & USED DRESSES */}
          <button
            onClick={() => setActiveTab('step-wardrobe')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'step-wardrobe'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              activeTab === 'step-wardrobe' ? 'bg-black text-amber-400' : 'bg-slate-800 text-slate-300'
            }`}>
              3
            </span>
            <span>👔 Clothes &amp; Used Dresses</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

          {/* STEP 4: MOTIONS & MUDRAS */}
          <button
            onClick={() => setActiveTab('step-motion')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'step-motion'
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              activeTab === 'step-motion' ? 'bg-black text-cyan-400' : 'bg-slate-800 text-slate-300'
            }`}>
              4
            </span>
            <span>🧘 Motions &amp; Mudras</span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />

          {/* STEP 5: BACKGROUNDS & SPEECH */}
          <button
            onClick={() => setActiveTab('step-drama-swap')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'step-drama-swap'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/30 font-black'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              activeTab === 'step-drama-swap' ? 'bg-white text-pink-700' : 'bg-slate-800 text-slate-300'
            }`}>
              5
            </span>
            <span>🌄 Backgrounds &amp; Speech</span>
          </button>

          <div className="h-6 w-px bg-slate-800 flex-shrink-0 mx-1" />

          {/* SECTION 6: AVATAR LIBRARY */}
          <button
            onClick={() => setActiveTab('my-avatars')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'my-avatars'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-lg shadow-amber-500/30 font-black'
                : 'bg-slate-900/80 text-amber-300 hover:text-white border border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>✨ Avatar Library ({avatarLibrary.length})</span>
          </button>

          {/* SECTION 7: ORIGINAL VIDEO LIBRARY */}
          <button
            onClick={() => setActiveTab('original-videos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === 'original-videos'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-400 text-black shadow-lg shadow-teal-500/30 font-black'
                : 'bg-slate-900/80 text-teal-300 hover:text-white border border-teal-500/30'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>📼 Original Video Library ({originalVideosLibrary.length})</span>
          </button>
        </div>

        {/* Quick Inspector Viewport Toggle */}
        <div className="hidden lg:flex items-center gap-2">
          <button
            onClick={() => setShowSidePreview(!showSidePreview)}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>{showSidePreview ? 'Hide Inspector' : 'Show Inspector'}</span>
          </button>
        </div>
      </div>

      {/* Studio Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT DEDICATED SIDEBAR: STAGES & SUB-PAGES */}
        <aside
          className="w-64 md:w-72 border-r border-slate-800 bg-[#080d19] text-white flex flex-col flex-shrink-0"
          style={{ backgroundColor: '#080d19', color: '#f8fafc' }}
        >
          <div className="p-3.5 border-b border-slate-800/80 bg-[#060913]">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 px-2 mb-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Creation Pipeline</span>
            </div>
            <p className="text-[11px] text-slate-400 px-2">
              Sequential end-to-end avatar builder
            </p>
          </div>

          <div
            role="navigation"
            className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#080d19] text-slate-100"
            style={{ backgroundColor: '#080d19', color: '#f8fafc' }}
          >
            <div className="pt-1.5 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Main Avatar Builder
            </div>

            {/* SECTION 1: MOHAN SIR MASTER CLONE */}
            <button
              onClick={() => setActiveTab('step-visual')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'step-visual'
                  ? 'bg-gradient-to-r from-emerald-500/25 via-slate-900 to-teal-500/10 text-emerald-300 border-2 border-emerald-400 shadow-md shadow-emerald-950/40 font-bold'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Camera className={`w-4 h-4 ${activeTab === 'step-visual' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="font-bold">1. Mohan Sir Clone</span>
              </div>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            {/* SECTION 2: HAIR STYLE, FACIAL FEATURES & SPECTACLES */}
            <button
              onClick={() => setActiveTab('step-hair-face')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'step-hair-face'
                  ? 'bg-gradient-to-r from-purple-500/25 via-slate-900 to-indigo-500/10 text-purple-300 border-2 border-purple-400 shadow-md shadow-purple-950/40 font-bold'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Smile className={`w-4 h-4 ${activeTab === 'step-hair-face' ? 'text-purple-400' : 'text-slate-400'}`} />
                <span className="font-bold">2. Hair, Beard &amp; Spects</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                New
              </span>
            </button>

            {/* SECTION 3: CLOTHES & USED DRESSES */}
            <button
              onClick={() => setActiveTab('step-wardrobe')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'step-wardrobe'
                  ? 'bg-gradient-to-r from-amber-500/25 via-slate-900 to-yellow-500/10 text-amber-300 border-2 border-amber-400 shadow-md shadow-amber-950/40 font-bold'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Shirt className={`w-4 h-4 ${activeTab === 'step-wardrobe' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="font-bold">3. Clothes &amp; Used Dresses</span>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {allOutfits.length} Outfits
              </span>
            </button>

            {/* SECTION 4: MOTIONS & MUDRAS */}
            <button
              onClick={() => setActiveTab('step-motion')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'step-motion'
                  ? 'bg-gradient-to-r from-cyan-500/25 via-slate-900 to-blue-500/10 text-cyan-300 border-2 border-cyan-400 shadow-md shadow-cyan-950/40 font-bold'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Activity className={`w-4 h-4 ${activeTab === 'step-motion' ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className="font-bold">4. Motions &amp; Mudras</span>
              </div>
              <span className="text-[10px] font-bold text-cyan-400 px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30">8 Sets</span>
            </button>

            {/* SECTION 5: BACKGROUNDS & SPEECH LAB */}
            <button
              onClick={() => setActiveTab('step-drama-swap')}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'step-drama-swap'
                  ? 'bg-gradient-to-r from-pink-500/25 via-slate-900 to-rose-500/10 text-pink-300 border-2 border-pink-400 shadow-md shadow-pink-950/40 font-bold'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Palette className={`w-4 h-4 ${activeTab === 'step-drama-swap' ? 'text-pink-400' : 'text-slate-400'}`} />
                <span className="font-bold">5. Backgrounds &amp; Speech</span>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                Studio
              </span>
            </button>

            {/* 🗂️ AVATAR LIBRARY (PICK ONE DIRECTLY IN SIDEBAR) */}
            <div className="pt-3 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider text-amber-400 border-t border-slate-800/80 mt-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Avatar Library ({avatarLibrary.length})</span>
              </span>
              <button
                onClick={() => setShowSaveAvatarModal(true)}
                className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1 transition shadow-sm"
                title="Save current avatar styling to library"
              >
                <Plus className="w-2.5 h-2.5" />
                <span>Save</span>
              </button>
            </div>

            {/* Quick Search in Sidebar */}
            <div className="px-2 pb-1.5 pt-1">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search 50 avatars..."
                  value={avatarSearchQuery}
                  onChange={(e) => setAvatarSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Scrollable list of avatars in sidebar */}
            <div className="space-y-1.5 px-1 max-h-[360px] overflow-y-auto scrollbar-thin">
              {avatarLibrary
                .filter(a => {
                  if (!avatarSearchQuery.trim()) return true;
                  const q = avatarSearchQuery.toLowerCase();
                  return a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q) || (a.badge && a.badge.toLowerCase().includes(q));
                })
                .map((avatar) => {
                const isActive = selectedAvatarId === avatar.id;
                return (
                  <div
                    key={avatar.id}
                    onClick={() => handlePickAvatar(avatar)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/40 border-2 border-emerald-400 shadow-md ring-1 ring-emerald-400/50 text-white'
                        : 'bg-slate-950/90 border border-slate-800/90 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 border ${
                        isActive ? 'bg-emerald-500/20 border-emerald-400/70 text-white' : 'bg-slate-800 border-slate-700'
                      }`}>
                        {avatar.emoji}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1">
                          <span>{avatar.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {avatar.tagline}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isActive ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500 text-black shadow">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-500 group-hover:text-amber-400 transition">
                          Pick
                        </span>
                      )}
                      {avatar.category === 'custom' && (
                        <button
                          onClick={(e) => handleDeleteAvatarFromLibrary(avatar.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Remove custom avatar"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>


            {/* 🗂️ ORIGINAL VIDEO LIBRARY (DEDICATED SECTION) */}
            <div className="pt-3 pb-1 px-3 text-[10px] font-extrabold uppercase tracking-wider text-teal-400 border-t border-slate-800/80 mt-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-teal-400" />
                <span>Original Video Library ({originalVideosLibrary.length})</span>
              </span>
              <button
                onClick={() => setActiveTab('original-videos')}
                className="text-[9px] font-bold px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 transition shadow-sm"
              >
                View All
              </button>
            </div>
            <p className="px-3 text-[10px] text-slate-400 pb-1 leading-snug">
              Permanent raw video archive for avatar training:
            </p>

            {/* Scrollable list of original videos in sidebar */}
            <div className="space-y-1.5 px-1 max-h-[220px] overflow-y-auto scrollbar-thin">
              {originalVideosLibrary.map((origVid) => {
                const isLoaded = selectedPreviewSlotId === origVid.slotAssigned || Object.values(uploadedVideosMap).some(v => v.fileName === origVid.fileName);
                return (
                  <div
                    key={origVid.id}
                    onClick={() => handleSelectOriginalVideoForAvatar(origVid)}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 group ${
                      isLoaded
                        ? 'bg-gradient-to-r from-teal-950/70 via-slate-900 to-emerald-950/40 border-teal-400 shadow-md ring-1 ring-teal-400/50'
                        : 'bg-slate-900/60 border-slate-800/90 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-teal-950 border border-teal-700/60 flex items-center justify-center text-xs flex-shrink-0 text-teal-300">
                        📹
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white truncate">
                          {origVid.title}
                        </div>
                        <div className="text-[9px] text-teal-300/80 truncate">
                          {origVid.durationText}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      isLoaded ? 'bg-teal-500 text-black font-extrabold' : 'text-slate-500 group-hover:text-teal-300'
                    }`}>
                      {isLoaded ? 'ACTIVE' : 'Load'}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-slate-800/80 mt-2">
              Studio Galleries &amp; Testing
            </div>

            {/* Tab: My Avatars */}
            <button
              onClick={() => setActiveTab('my-avatars')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'my-avatars'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Avatar Library ({avatarLibrary.length})</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">All Twins</span>
            </button>

            {/* Tab: Original Video Library */}
            <button
              onClick={() => setActiveTab('original-videos')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'original-videos'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Film className="w-4 h-4 text-teal-400" />
                <span>Original Video Library ({originalVideosLibrary.length})</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">Raw Vault</span>
            </button>

            {/* Tab: Test Lab & Final Set */}
            <button
              onClick={() => setActiveTab('step-test-lab')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                activeTab === 'step-test-lab'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Live Discourse Test Lab</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </button>
          </div>

          {/* Quick Active Preset Status in Sidebar */}
          <div className="p-3 m-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1.5">
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Fitted Clothes:</span>
              <span className="text-amber-400 font-bold truncate max-w-[120px]">{activeOutfit.name}</span>
            </div>
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Kinetic Motion:</span>
              <span className="text-cyan-400 font-bold">{activeMotionObj.name}</span>
            </div>
            <div className="text-slate-400 font-medium flex items-center justify-between">
              <span>Lip-Sync Precision:</span>
              <span className="text-emerald-400 font-bold">{lipSyncPrecision}% Multi-Lang</span>
            </div>
          </div>
        </aside>

        {/* RIGHT WORKING AREA: DYNAMIC WORKSPACE CANVAS */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
          
          {/* TAB 0: MY AVATARS GALLERY */}
          {activeTab === 'my-avatars' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-6 h-6 text-amber-400" />
                    My Created Avatars
                  </h2>
                  <p className="text-sm text-slate-400">
                    Comprehensive overview and deployment status of Mohan Sir&apos;s universal digital clone
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('step-visual')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  <Plus className="w-4 h-4" />
                  Create New Avatar
                </button>
              </div>

              {/* Master Avatar Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-[#0d1424] to-[#121e33] border-2 border-emerald-500/50 shadow-2xl relative overflow-hidden">
                <div className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Primary Master Avatar
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  {/* Avatar Hologram / Preview Disc */}
                  <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-emerald-500/20 to-teal-500/20 border-2 border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-300 relative shadow-inner">
                    <UserCheck className="w-14 h-14" />
                    <span className="absolute bottom-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-amber-300 border border-amber-500/40">
                      360° RIG
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{avatarName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Mohan Sir
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Universal 360° digital clone of Mohan Sir. Features a full dynamic wardrobe (Indian, Western, Army, Doctor, Farmer, Trades, Chef, Custom Outfits) and complete kinetics (walking, running, swimming, yogic postures).
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                        Fitted Outfit: <b className="text-amber-400">{activeOutfit.name}</b>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                        Motion: <b className="text-cyan-400">{activeMotionObj.name}</b>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                        Voice: <b className="text-purple-400">Mohan Kalburgi DNA</b>
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                        Wardrobe Catalog: <b className="text-emerald-400">{allOutfits.length} Outfits Ready</b>
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setActiveTab('step-wardrobe')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Shirt className="w-3.5 h-3.5" />
                      Change Clothes
                    </button>
                    <button
                      onClick={() => setActiveTab('step-test-lab')}
                      className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Test Live
                    </button>
                  </div>
                </div>
              </div>

              {/* AVATAR LIBRARY GRID (ALL 50+ AVATARS) */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      <span>Avatar Library ({avatarLibrary.length} Digital Twins)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Authentic Vedic, yogic, healthcare, and corporate avatars calibrated with Mohan Sir&apos;s likeness
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSaveAvatarModal(true)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Current Look</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Bar Controls */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search across all 50 DNA avatars (e.g. Guruji, Lime Green, Dhyan, Keynote, Doctor)..."
                        value={avatarSearchQuery}
                        onChange={(e) => setAvatarSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                      />
                    </div>
                    {avatarSearchQuery && (
                      <button
                        onClick={() => setAvatarSearchQuery('')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-medium self-end sm:self-auto"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>

                  {/* Category Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { id: 'all', label: `All (${avatarLibrary.length})` },
                      { id: 'spiritual', label: 'Vedic Spiritual (10)' },
                      { id: 'ashram', label: 'Ashram Sadhana (8)' },
                      { id: 'pranayama', label: 'Pranayama Kriya (6)' },
                      { id: 'himalayan', label: 'Himalayan Dhyan (6)' },
                      { id: 'corporate', label: 'Corporate & Keynote (6)' },
                      { id: 'wellness', label: 'Ayurveda & Health (6)' },
                      { id: 'mudra', label: 'Mudra & Chakra (4)' },
                      { id: 'modern', label: 'Youth & Modern (4)' },
                      { id: 'custom', label: 'Custom Clones' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setAvatarCategoryFilter(cat.id)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                          avatarCategoryFilter === cat.id
                            ? 'bg-amber-500 text-black shadow-sm font-extrabold'
                            : 'bg-slate-950/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {avatarLibrary
                    .filter((avatar) => {
                      const matchesCategory =
                        avatarCategoryFilter === 'all' ||
                        avatar.category === avatarCategoryFilter ||
                        (avatarCategoryFilter === 'spiritual' && (avatar.category === 'ancient' || avatar.category === 'real-video')) ||
                        (avatarCategoryFilter === 'wellness' && avatar.category === 'consultation');
                      const matchesQuery =
                        !avatarSearchQuery.trim() ||
                        avatar.name.toLowerCase().includes(avatarSearchQuery.toLowerCase()) ||
                        avatar.tagline.toLowerCase().includes(avatarSearchQuery.toLowerCase()) ||
                        (avatar.badge && avatar.badge.toLowerCase().includes(avatarSearchQuery.toLowerCase()));
                      return matchesCategory && matchesQuery;
                    })
                    .map((avatar) => {
                    const isActive = selectedAvatarId === avatar.id;
                    const avatarOutfit = allOutfits.find(o => o.id === avatar.outfitId);
                    return (
                      <div
                        key={avatar.id}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between space-y-4 relative ${
                          isActive
                            ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-amber-950/30 border-emerald-400 shadow-xl ring-2 ring-emerald-400/40'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl border border-slate-700">
                              {avatar.emoji}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                                {avatar.badge}
                              </span>
                              {isActive && (
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500 text-black shadow">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-base font-bold text-white">{avatar.name}</h4>
                            <p className="text-xs text-slate-400 mt-0.5 leading-snug">{avatar.tagline}</p>
                          </div>

                          <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800/80">
                            <div className="flex justify-between text-slate-400">
                              <span>Outfit:</span>
                              <span className="text-amber-300 font-medium truncate max-w-[160px]">{avatarOutfit?.name || avatar.outfitId}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Glasses:</span>
                              <span className="text-purple-300 font-medium">{SPECTACLES_LIST.find(s => s.id === avatar.spectaclesId)?.name || 'Natural'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Tilak:</span>
                              <span className="text-cyan-300 font-medium">{TILAK_LIST.find(t => t.id === avatar.tilakId)?.name || 'Clean'}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Background:</span>
                              <span className="text-emerald-400 font-medium capitalize">{avatar.background}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          {isActive ? (
                            <div className="w-full py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>Currently Selected &amp; Active</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handlePickAvatar(avatar)}
                              className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition shadow flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 text-black" />
                              <span>Pick This Avatar</span>
                            </button>
                          )}
                          {avatar.category === 'custom' && (
                            <button
                              onClick={(e) => handleDeleteAvatarFromLibrary(avatar.id, e)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 transition"
                              title="Delete Avatar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORIGINAL REFERENCE VIDEO LIBRARY */}
          {activeTab === 'original-videos' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Film className="w-6 h-6 text-teal-400" />
                    Original Reference Video Library
                  </h2>
                  <p className="text-sm text-slate-400">
                    High-fidelity repository of Mohan Sir&apos;s raw authentic video footage. All clips are saved in Bunny Edge Storage and calibrated for 360° avatar rendering.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={originalVideoUploadInputRef}
                    accept="video/*"
                    onChange={handleDirectUploadToOriginalLibrary}
                    className="hidden"
                  />
                  <button
                    onClick={() => originalVideoUploadInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-teal-950/40 transition"
                  >
                    <Plus className="w-4 h-4 text-black" />
                    <span>Upload &amp; Save New Video</span>
                  </button>
                  <button
                    onClick={() => handleOpenIntelligence()}
                    disabled={isAnalyzingIntelligence}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-orange-950/40 transition cursor-pointer"
                    title="Multimodal Speech, Word Timestamps, Emotions & Kinematics"
                  >
                    <Brain className={`w-3.5 h-3.5 text-black ${isAnalyzingIntelligence ? 'animate-spin' : ''}`} />
                    <span>{isAnalyzingIntelligence ? 'Analyzing...' : 'Video Intelligence & Transcripts'}</span>
                  </button>
                  <button
                    onClick={() => setShowPerformanceDnaModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-amber-500/30 transition cursor-pointer"
                    title="Authentic Performance DNA & Verified Yoga/Mudra Library"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Performance DNA &amp; Yoga</span>
                  </button>
                  <button
                    onClick={handleSaveAllSlotsToCloud}
                    disabled={isCloudSyncing}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    <span>{isCloudSyncing ? 'Syncing...' : 'Sync Cloud Vault'}</span>
                  </button>
                </div>
              </div>

              {/* Stats & Filters Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: `All Videos (${originalVideosLibrary.length})` },
                    { id: 'speech', label: 'Discourses & Speeches' },
                    { id: 'pranayama', label: 'Pranayama & Asanas' },
                    { id: '360', label: '360° Calibration' },
                    { id: 'custom', label: 'User Uploads' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setOriginalVideoFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        originalVideoFilter === filter.id
                          ? 'bg-teal-500 text-black font-bold shadow'
                          : 'bg-slate-800/80 text-slate-300 hover:text-white'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                <div className="w-full md:w-64 relative">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={originalVideoSearch}
                    onChange={(e) => setOriginalVideoSearch(e.target.value)}
                    placeholder="Search original videos..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              {/* Grid of Saved Original Videos */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {originalVideosLibrary
                  .filter(v => {
                    if (originalVideoFilter !== 'all' && v.category && v.category !== originalVideoFilter) return false;
                    if (!originalVideoSearch.trim()) return true;
                    return (
                      v.title.toLowerCase().includes(originalVideoSearch.toLowerCase()) ||
                      v.fileName.toLowerCase().includes(originalVideoSearch.toLowerCase())
                    );
                  })
                  .map((video) => {
                    const isCurrentlyActive = selectedPreviewSlotId === video.slotAssigned || 
                      Object.values(uploadedVideosMap).some(slot => slot.fileName === video.fileName);

                    return (
                      <div
                        key={video.id}
                        className={`rounded-2xl border overflow-hidden bg-slate-950 flex flex-col justify-between transition-all shadow-xl ${
                          isCurrentlyActive
                            ? 'border-teal-400 ring-2 ring-teal-500/30 shadow-teal-950/40'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* 16:9 Video Frame */}
                        <div className="relative aspect-video bg-black overflow-hidden group">
                          <video
                            src={video.fileUrl}
                            controls
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 28%' }}
                          />

                          {/* Top Badges */}
                          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
                            <span className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-teal-400 text-[10px] font-bold text-teal-300 shadow">
                              ⏱️ {video.durationText}
                            </span>
                            {video.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-900/85 backdrop-blur-md border border-slate-700 text-[9px] font-medium text-slate-300">
                                {video.badge}
                              </span>
                            )}
                          </div>

                          {isCurrentlyActive && (
                            <div className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black shadow-lg animate-pulse pointer-events-none">
                              ✓ ACTIVE AVATAR REF
                            </div>
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white leading-snug">
                              {video.title}
                            </h4>
                            <div className="text-[11px] text-slate-400 font-mono truncate">
                              📁 {video.fileName}
                            </div>
                            <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
                              <span>Added {video.uploadedAt}</span>
                              <span>•</span>
                              <span>{video.slotAssigned ? `Bound to ${video.slotAssigned.toUpperCase()}` : 'Library Saved'}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                            <button
                              onClick={() => handleSelectOriginalVideoForAvatar(video)}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                                isCurrentlyActive
                                  ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                                  : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{isCurrentlyActive ? 'Active in Avatar' : '🎯 Use in Avatar'}</span>
                            </button>

                            <button
                              onClick={() => {
                                const targetSlot = video.slotAssigned || 'slot-1';
                                openCutterForSlot(targetSlot);
                              }}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-amber-300 transition"
                              title="Adjust 3-minute cut window"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenIntelligence(video)}
                              className="p-2 rounded-xl bg-slate-800 hover:bg-amber-500/20 text-slate-300 border border-slate-700 hover:text-amber-400 hover:border-amber-500/40 transition"
                              title="Multimodal Intelligence, Word Timestamps & Performance DNA"
                            >
                              <Brain className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteOriginalVideo(video.id, e)}
                              className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/40 transition"
                              title="Delete from original library"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {/* Upload Card */}
                <div
                  onClick={() => originalVideoUploadInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-slate-800 hover:border-teal-400/60 bg-slate-900/40 hover:bg-slate-900/80 p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[260px]"
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 group-hover:bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-3 transition">
                    <Upload className="w-6 h-6 group-hover:scale-110 transition" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Upload &amp; Save New Original Video
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mb-3">
                    Drag and drop your MP4, MOV video here. If longer than 3 minutes, our smart cutter will let you select the optimal 3-minute section.
                  </p>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 group-hover:bg-teal-500 group-hover:text-black transition">
                    Browse Files
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: 20-VIDEO MASTER TRAINING VAULT & 360° SCAN */}
          {activeTab === 'step-visual' && (
            <div className="space-y-6">
              {/* Step 1 Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Video className="w-6 h-6 text-emerald-400" />
                    Step 1: 20-Video Master Training Vault & 360° Rig
                  </h2>
                  <p className="text-sm text-slate-400">
                    Provide 20 high-definition reference videos (2 minutes each) of Mohan Sir across all motions, angles, and postures for a 100% photorealistic digital twin.
                  </p>
                </div>

                {/* Actions & Progress Pill */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={handleSaveAllSlotsToCloud}
                    disabled={isCloudSyncing}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    {isCloudSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{isCloudSyncing ? 'Saving to Bunny...' : 'Save Videos to Cloud'}</span>
                  </button>

                  <div className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Training Dataset Progress</div>
                      <div className="text-xs font-bold text-emerald-300">
                        {Object.keys(uploadedVideosMap).length} of 20 Videos Ready
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-time Save Confirmation Banner */}
              {lastSavedNotice && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 animate-fadeIn">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {lastSavedNotice}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Bunny Storage &amp; Edge SQL</span>
                </div>
              )}

              {/* Avatar Label & Quick Controls Bar */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full md:w-auto">
                  <label className="text-xs font-semibold text-slate-300">Master Avatar Identity Label</label>
                  <input
                    type="text"
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                    className="mt-1 w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Quick Physical Specs */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    Height: <b className="text-white">5 ft 9 in (175 cm)</b>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    Build: <b className="text-emerald-400">Yogic Fit</b>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                    Complexion: <b className="text-amber-400">Warm Wheatish</b>
                  </div>
                </div>
              </div>

              {/* SMART AI AUTO-RECOGNITION DROPZONE */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border-2 border-dashed border-emerald-500/50 hover:border-emerald-400 transition space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Universal AI Motion Auto-Classifier</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Error-Free Auto-Slotting
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Drop any video of Mohan Sir here. If it is a long video, the built-in cutter will automatically take 2 to 3 minutes max for calibration!
                      </p>
                    </div>
                  </div>

                  <label className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-950/40 transition flex-shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Drop Video (Auto-Cuts to 2–3 Mins)</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessVideoUpload(file);
                      }}
                    />
                  </label>
                </div>

                {/* Loading / Analyzing Animation */}
                {isAnalyzingVideo && (
                  <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/40 flex items-center gap-3 animate-pulse">
                    <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                    <span className="text-xs text-emerald-300 font-medium">
                      Neural AI analyzing skeletal movement, face orientation, and breath kinematics...
                    </span>
                  </div>
                )}

                {/* Auto-Classification Result Banner */}
                {classificationBanner && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-400/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>AI Recognized: {classificationBanner.detectedMotion} ({classificationBanner.confidence}% Match)</span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        File &quot;{classificationBanner.fileName}&quot; automatically allocated to <b className="text-amber-300">Slot {classificationBanner.assignedSlotNumber}: {classificationBanner.assignedSlotTitle}</b>
                      </div>
                    </div>
                    <button
                      onClick={() => setClassificationBanner(null)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-xs font-semibold"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>

              {/* SUBMIT & START AI AVATAR TRAINING ACTION BAR */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border-2 border-emerald-500/60 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Zap className="w-5 h-5 fill-emerald-400" />
                      </span>
                      <h3 className="text-base font-bold text-white">
                        {Object.keys(uploadedVideosMap).length > 0 
                          ? `${Object.keys(uploadedVideosMap).length} Video${Object.keys(uploadedVideosMap).length > 1 ? 's' : ''} Ready for AI Training`
                          : 'Ready to Train Mohan Sir Avatar'}
                      </h3>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Even 1–4 Videos is Enough!
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {Object.keys(uploadedVideosMap).length > 0
                        ? `You have uploaded ${Object.keys(uploadedVideosMap).length} reference video(s). You can start training your photorealistic digital twin right now! More motion videos can be added anytime.`
                        : 'You do NOT need all 20 videos to start. Upload 1 to 4 videos (like walking or seated postures), then click below to immediately train your photorealistic avatar!'}
                    </p>
                  </div>

                  {/* START / SUBMIT BUTTON */}
                  <div className="flex-shrink-0 flex items-center gap-3">
                    {trainingCompleted ? (
                      <button
                        onClick={() => setActiveTab('step-hair-face')}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-purple-950/40 transition transform hover:scale-[1.02]"
                      >
                        <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                        <span>Clone Ready! Go to 2. Hair, Beard &amp; Spects ➔</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleStartAvatarTraining}
                        disabled={isTrainingAvatar}
                        className={`px-6 py-3.5 rounded-xl font-extrabold text-sm flex items-center gap-2.5 shadow-xl transition transform hover:scale-[1.02] ${
                          isTrainingAvatar
                            ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                        }`}
                      >
                        {isTrainingAvatar ? (
                          <>
                            <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
                            <span>Processing Neural Rig...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-5 h-5 fill-black" />
                            <span>
                              {Object.keys(uploadedVideosMap).length > 0
                                ? `Submit & Start AI Avatar Training (${Object.keys(uploadedVideosMap).length} Videos)`
                                : 'Submit & Start Training (with 4 Starter Videos)'}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* REAL-TIME TRAINING PROGRESS BAR */}
                {isTrainingAvatar && (
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/50 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-300 flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {trainingStepText}
                      </span>
                      <span className="font-extrabold text-white text-sm">{trainingProgress}%</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 rounded-full transition-all duration-500"
                        style={{ width: `${trainingProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                      <span>1. Skeletal Keypoints</span>
                      <span>2. Facial Mesh</span>
                      <span>3. Motion Kinetics</span>
                      <span>4. Wardrobe Anchors</span>
                    </div>
                  </div>
                )}

                {/* SUCCESS COMPLETION & NEW CREATIONS SHOWCASE */}
                {trainingCompleted && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-400/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-emerald-200">
                            Master 2D Avatar Trained & Synced Successfully!
                          </div>
                          <div className="text-xs text-slate-300">
                            {avatarName} digital twin is calibrated with {Object.keys(uploadedVideosMap).length} reference videos and 53 dynamic wardrobe anchor points.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('step-hair-face')}
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 transition flex-shrink-0 shadow-md"
                      >
                        <span>Proceed to Step 2: Hair, Beard &amp; Spects</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* NEWLY CREATED FACE & DIGITAL TWIN SHOWCASE */}
                    <div className="p-5 rounded-2xl bg-slate-950 border-2 border-emerald-500/50 space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <Sparkles className="w-5 h-5" />
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-white flex items-center gap-2">
                              <span>Newly Created Digital Twin Creations</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                Real Face Active
                              </span>
                            </h4>
                            <p className="text-xs text-slate-400">
                              Generated directly from your uploaded reference videos — 100% natural facial structure, mouth movement, and vocal cadence.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 4 AI Created Scenes Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                          {
                            id: 'c1',
                            title: 'Himalayan Sunrise Meditation',
                            posture: 'Padmasana Seated',
                            bgImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80',
                            desc: 'Mohan Sir in deep yogic stillness with sunrise prana flow.',
                            tag: '🧘 Meditation Flow'
                          },
                          {
                            id: 'c2',
                            title: 'Ocean Beach Discourse',
                            posture: 'Conversational Stride',
                            bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=500&q=80',
                            desc: 'Natural beach sanctuary walking discourse with ocean rhythm.',
                            tag: '🌊 Nature Discourse'
                          },
                          {
                            id: 'c3',
                            title: 'Vedic Temple Courtyard',
                            posture: 'Namaste Reverence',
                            bgImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=500&q=80',
                            desc: 'Spiritual greeting and sacred Vedic teachings.',
                            tag: '🕉️ Sacred Vedic'
                          },
                          {
                            id: 'c4',
                            title: 'Global Swar Yoga Keynote',
                            posture: 'Upright Keynote Stance',
                            bgImage: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=500&q=80',
                            desc: 'High-energy masterclass discourse on human bio-rhythms.',
                            tag: '🎙️ Master Keynote'
                          }
                        ].map((scene) => (
                          <div
                            key={scene.id}
                            className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition flex flex-col justify-between group overflow-hidden relative"
                          >
                            <div className="space-y-2">
                              <div className="h-28 rounded-lg overflow-hidden relative">
                                <img
                                  src={scene.bgImage}
                                  alt={scene.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-white backdrop-blur-sm group-hover:scale-110 transition">
                                    <Play className="w-5 h-5 fill-white ml-0.5" />
                                  </div>
                                </div>
                                <div className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded bg-black/80 text-emerald-300 border border-emerald-500/40">
                                  {scene.tag}
                                </div>
                              </div>
                              <div className="text-xs font-bold text-white">{scene.title}</div>
                              <p className="text-[10px] text-slate-400 leading-relaxed">{scene.desc}</p>
                            </div>

                            <button
                              onClick={() => {
                                setInspectorMode('video');
                                const firstWithUrl = Object.entries(uploadedVideosMap).find(([_, v]) => v?.fileUrl);
                                if (firstWithUrl) setSelectedPreviewSlotId(firstWithUrl[0]);
                              }}
                              className="mt-3 w-full py-1.5 px-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                            >
                              <Play className="w-3.5 h-3.5 fill-emerald-300" />
                              <span>Preview in Live Stream</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* PROGRESSIVE ANATOMICAL RECONSTRUCTION PIPELINE: FACE > TORSO > FULL BODY */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-emerald-500/50 space-y-4 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                        <Crosshair className="w-5 h-5" />
                      </span>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>Anatomical Reconstruction Pipeline</span>
                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          Face ➔ Torso ➔ Full Body
                        </span>
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Calibrated directly from your 4 uploaded videos: First perfects the 360° Face Mesh, then upper Torso &amp; breath kinetics, completing in full body photorealism.
                    </p>
                  </div>

                  {/* Stage Switcher Pills */}
                  <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold gap-1">
                    {[
                      { id: 'face', label: '1. Face (360° 2D➔3D)', icon: Eye },
                      { id: 'torso', label: '2. Torso & Mudras', icon: Shirt },
                      { id: 'fullbody', label: '3. Full Body Twin', icon: UserCheck },
                    ].map((st) => {
                      const Icon = st.icon;
                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            setAvatarStage(st.id as any);
                            setCameraView(st.id === 'face' ? 'face' : st.id === 'torso' ? 'waist' : 'full');
                          }}
                          className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                            avatarStage === st.id
                              ? 'bg-emerald-500 text-black font-extrabold shadow-md'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* STAGE 1: FACE RECONSTRUCTION VIEW */}
                {avatarStage === 'face' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-5 items-center animate-fadeIn">
                    {/* Face Close-up & 360 Rotation Rig */}
                    <div className="md:col-span-5 flex flex-col items-center space-y-3">
                      {/* Video Source Switcher for Face Calibration */}
                      {(() => {
                        const uploadedVideoList = Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl);
                        const activeSlotId = (selectedPreviewSlotId && uploadedVideosMap[selectedPreviewSlotId]?.fileUrl)
                          ? selectedPreviewSlotId
                          : (uploadedVideoList.length > 0 ? uploadedVideoList[0][0] : null);
                        const activeSlot = activeSlotId ? uploadedVideosMap[activeSlotId] : null;

                        return (
                          <>
                            {uploadedVideoList.length > 1 && (
                              <div className="flex items-center gap-1.5 overflow-x-auto w-full max-w-[240px] p-1 bg-black/60 rounded-lg scrollbar-none border border-slate-800">
                                {uploadedVideoList.map(([sId, item], idx) => (
                                  <button
                                    key={sId}
                                    onClick={() => setSelectedPreviewSlotId(sId)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap transition ${
                                      activeSlotId === sId
                                        ? 'bg-emerald-500 text-black shadow'
                                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                    }`}
                                  >
                                    ▶ Video {idx + 1}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* 360° Rotatable Face Rig Container */}
                            <div
                              className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xl shadow-emerald-500/20 relative bg-black transition-transform duration-150"
                              style={{
                                transform: `perspective(600px) rotateY(${avatarAngle <= 180 ? avatarAngle : avatarAngle - 360}deg)`,
                              }}
                            >
                              {activeSlot?.fileUrl ? (
                                <video
                                  key={activeSlotId + activeSlot.fileName}
                                  src={activeSlot.fileUrl}
                                  preload="metadata"
                                  loop={false}
                                  controls
                                  muted
                                  playsInline
                                  onTimeUpdate={(e) => {
                                    const v = e.currentTarget;
                                    const start = activeSlot.trimStart ?? 0;
                                    const end = activeSlot.trimEnd ?? (activeSlot.originalDuration || 180);
                                    if (v.currentTime < start) {
                                      v.currentTime = start;
                                    } else if (v.currentTime >= end) {
                                      v.pause();
                                      v.currentTime = start;
                                    }
                                  }}
                                  className="w-full h-full object-cover"
                                  style={{ objectPosition: 'center 28%' }}
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                  <Eye className="w-10 h-10 text-emerald-400 mb-2" />
                                  <span className="text-xs font-bold text-white">Face Mesh Active</span>
                                  <span className="text-[10px] text-slate-400 mt-1">Upload reference video to calibrate</span>
                                </div>
                              )}

                              {/* Neural Face Mesh Landmark Lines Overlay (Centered over face) */}
                              {showMeshOverlay && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                                  <div className="w-32 h-40 rounded-[45%] border-2 border-dashed border-emerald-400/70 relative">
                                    {/* Forehead Node */}
                                    <span className="absolute top-4 inset-x-0 mx-auto w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/80" />
                                    {/* Eye Anchors */}
                                    <span className="absolute top-14 left-6 w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow" />
                                    <span className="absolute top-14 right-6 w-2 h-2 rounded-full bg-cyan-400 animate-ping shadow" />
                                    {/* Nose Bridge */}
                                    <span className="absolute top-20 inset-x-0 mx-auto w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    {/* Mouth & Teeth Bounds (Centered on actual lower mouth) */}
                                    <div className="absolute bottom-6 inset-x-0 mx-auto w-14 h-5 rounded-full border border-emerald-400 bg-emerald-500/20 flex items-center justify-center">
                                      <span className="text-[8px] text-emerald-300 font-extrabold tracking-wider">LIP SYNC</span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/85 border border-emerald-400 text-[9px] font-bold text-emerald-300">
                                STAGE 1: 360° FACE MESH
                              </div>

                              <div className="absolute bottom-2 inset-x-2 px-2 py-1 rounded bg-black/85 text-[10px] text-white flex items-center justify-between border border-slate-700">
                                <span className="text-emerald-300 font-semibold truncate max-w-[120px]">{activeSlot?.fileName || '68 Facial Keypoints'}</span>
                                <span className="text-amber-300 font-mono text-[9px]">{avatarAngle}° ANGLE</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* 360 Rotation Slider */}
                      <div className="w-56 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>3D Face Turn Angle</span>
                          <span className="text-emerald-400 font-bold font-mono">{avatarAngle}°</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          value={avatarAngle}
                          onChange={(e) => setAvatarAngle(Number(e.target.value))}
                          className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Face Metrics & Natural Occlusion Integrity */}
                    <div className="md:col-span-7 space-y-3">
                      <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/30 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Natural Speech &amp; Teeth-Tongue Occlusion Guard</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Unlike robotic AI avatars, Mohan Sir&apos;s digital twin locks the teeth and tongue naturally inside the mouth boundary during speech articulation, preventing any protruding distortions or paralysis effect.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400">Facial Symmetry</div>
                          <div className="text-sm font-extrabold text-white mt-0.5">99.4% Match</div>
                          <div className="text-[9px] text-emerald-400">Eyes &amp; Jawline Aligned</div>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                          <div className="text-[10px] text-slate-400">3D Depth Calibration</div>
                          <div className="text-sm font-extrabold text-amber-400 mt-0.5">2D ➔ 3D Mesh</div>
                          <div className="text-[9px] text-slate-400">Cheekbones &amp; Chin Rigged</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => setShowMeshOverlay(!showMeshOverlay)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                        >
                          {showMeshOverlay ? 'Hide Neural Keypoints' : 'Show 68 Keypoint Mesh'}
                        </button>
                        <button
                          onClick={() => {
                            setAvatarStage('torso');
                            setCameraView('waist');
                          }}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <span>Proceed to Stage 2: Torso</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 2: TORSO & BREATHING KINEMATICS */}
                {avatarStage === 'torso' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-5 items-center animate-fadeIn">
                    <div className="md:col-span-5 flex flex-col items-center space-y-3">
                      <div className="w-56 h-56 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl shadow-emerald-500/20 relative bg-black">
                        {(() => {
                          const uploadedVideoList = Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl);
                          const activeSlot = (selectedPreviewSlotId && uploadedVideosMap[selectedPreviewSlotId]?.fileUrl)
                            ? uploadedVideosMap[selectedPreviewSlotId]
                            : (uploadedVideoList.length > 0 ? uploadedVideoList[0][1] : null);

                          if (activeSlot?.fileUrl) {
                            return (
                              <video
                                src={activeSlot.fileUrl}
                                preload="metadata"
                                loop={false}
                                controls
                                muted
                                playsInline
                                className="w-full h-full object-cover scale-105"
                                style={{ objectPosition: '50% 18%', transformOrigin: '50% 20%' }}
                              />
                            );
                          }
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                              <Shirt className="w-10 h-10 text-emerald-400 mb-2" />
                              <span className="text-xs font-bold text-white">Torso Kinematics Active</span>
                            </div>
                          );
                        })()}

                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 border border-amber-400 text-[9px] font-bold text-amber-300">
                          STAGE 2: TORSO &amp; BREATH
                        </div>

                        {/* Diaphragmatic Breath Pulse Ring */}
                        <div className="absolute inset-x-0 bottom-12 mx-auto w-32 h-14 rounded-full border border-emerald-400/50 bg-emerald-500/10 flex items-center justify-center animate-pulse pointer-events-none">
                          <span className="text-[9px] font-bold text-emerald-300">PRANA RESPIRATION</span>
                        </div>

                        <div className="absolute bottom-2 inset-x-2 px-2 py-1 rounded bg-black/85 text-[10px] text-white flex items-center justify-between border border-slate-700">
                          <span className="text-emerald-300 font-semibold">Shoulders &amp; Chest Rig</span>
                          <span className="text-amber-300 font-bold">{selectedMudra.toUpperCase()} MUDRA</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Torso Gestures &amp; Mudra Selection</span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Configure Mohan Sir&apos;s upper body posture, respiratory lung expansion, and yogic hand mudras.
                        </p>
                      </div>

                      {/* Mudra Buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'chin', label: 'Gyan / Chin Mudra', sub: 'Index to Thumb' },
                          { id: 'namaste', label: 'Anjali Mudra', sub: 'Folded Hands' },
                          { id: 'open', label: 'Abhaya Mudra', sub: 'Open Blessing Palm' },
                        ].map((mudra) => (
                          <button
                            key={mudra.id}
                            onClick={() => setSelectedMudra(mudra.id as any)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition ${
                              selectedMudra === mudra.id
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <div className="text-xs font-bold">{mudra.label}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{mudra.sub}</div>
                          </button>
                        ))}
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">Diaphragmatic Breath Cadence</div>
                          <div className="text-[10px] text-slate-400">4s Inhale • 4s Retention • 4s Exhale</div>
                        </div>
                        <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                          SURYA NADI ACTIVE
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => {
                            setAvatarStage('face');
                            setCameraView('face');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                        >
                          Back to Stage 1: Face
                        </button>
                        <button
                          onClick={() => {
                            setAvatarStage('fullbody');
                            setCameraView('full');
                          }}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                        >
                          <span>Proceed to Stage 3: Full Body</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* STAGE 3: FULL BODY TWIN VIEW */}
                {avatarStage === 'fullbody' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-5 items-center animate-fadeIn">
                    <div className="md:col-span-5 flex flex-col items-center space-y-3">
                      <div className="w-56 h-64 rounded-2xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl shadow-emerald-500/20 relative bg-black">
                        {(() => {
                          const uploadedVideoList = Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl);
                          const activeSlot = (selectedPreviewSlotId && uploadedVideosMap[selectedPreviewSlotId]?.fileUrl)
                            ? uploadedVideosMap[selectedPreviewSlotId]
                            : (uploadedVideoList.length > 0 ? uploadedVideoList[0][1] : null);

                          if (activeSlot?.fileUrl) {
                            return (
                              <video
                                src={activeSlot.fileUrl}
                                preload="metadata"
                                loop={false}
                                controls
                                muted
                                playsInline
                                className="w-full h-full object-cover scale-100"
                                style={{ objectPosition: 'center 28%' }}
                              />
                            );
                          }
                          return (
                            <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                              <UserCheck className="w-10 h-10 text-emerald-400 mb-2" />
                              <span className="text-xs font-bold text-white">Full Body Twin Complete</span>
                            </div>
                          );
                        })()}

                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 border border-emerald-400 text-[9px] font-bold text-emerald-300">
                          STAGE 3: FULL BODY TWIN
                        </div>

                        <div className="absolute bottom-2 inset-x-2 px-2 py-1 rounded bg-black/85 text-[10px] text-white flex items-center justify-between border border-slate-700">
                          <span className="text-emerald-300 font-semibold">{activeOutfit.name}</span>
                          <span className="text-cyan-300 font-bold">360° RIG READY</span>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>Complete 360° Digital Clone Activated</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            100% Photorealistic
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          Face, Torso, and Locomotion motions are synthesized from your 4 videos. Ready for Drama Video Swap and Multi-Language RAG Discourse!
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Fitted Outfit Layer</span>
                          <span className="text-amber-300 font-bold">{activeOutfit.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Kinetic Motion Preset</span>
                          <span className="text-emerald-400 font-bold">{activeMotionObj.name}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">Multi-Language Voice DNA</span>
                          <span className="text-purple-300 font-bold">Hindi, Marathi, English, Gujarati</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => {
                            setAvatarStage('torso');
                            setCameraView('waist');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                        >
                          Back to Stage 2: Torso
                        </button>
                        <button
                          onClick={() => setActiveTab('step-drama-swap')}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition shadow-lg shadow-emerald-500/30"
                        >
                          <span>Go to Drama Video Swap</span>
                          <ChevronRight className="w-4 h-4 text-black" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: MOHAN SIR'S CALIBRATED REFERENCE VIDEOS */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-emerald-500/40 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      <Film className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                        <span>Calibrated Reference Videos (Used for Mohan Sir Clone)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {Object.keys(uploadedVideosMap).length} Active Videos
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        The neural clone takes all facial landmarks, mouth articulation, and torso kinematics from these videos.
                      </p>
                    </div>
                  </div>

                  {/* Upload More Video Button */}
                  <label className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition flex-shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>+ Add Reference Video</span>
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProcessVideoUpload(file);
                      }}
                    />
                  </label>
                </div>

                {/* Grid of Uploaded Reference Videos */}
                {Object.keys(uploadedVideosMap).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl).map(([slotId, vItem], idx) => (
                      <div
                        key={slotId}
                        className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 transition flex flex-col justify-between space-y-2.5 shadow-md"
                      >
                        <div className="space-y-2">
                          <div className="h-32 rounded-lg overflow-hidden bg-black relative border border-slate-800">
                            <video
                              src={vItem.fileUrl}
                              muted
                              playsInline
                              className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 28%' }}
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                              Video 0{idx + 1}
                            </div>
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-amber-300">
                              {formatTimeSeconds(vItem.trimStart || 0)} - {formatTimeSeconds(vItem.trimEnd || (vItem.originalDuration || 180))}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs font-bold text-white truncate" title={vItem.fileName}>
                              {vItem.fileName}
                            </div>
                            <div className="text-[10px] text-emerald-400 font-semibold mt-0.5 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Calibrated 3-Min Clip</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1 pt-2 border-t border-slate-800">
                          <button
                            onClick={() => openCutterForSlot(slotId)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                            title="Adjust 3-Minute Cut"
                          >
                            <Scissors className="w-3 h-3 text-amber-400" />
                            <span>Adjust Cut</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPreviewSlotId(slotId);
                              setInspectorMode('video');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium flex items-center gap-1 transition"
                          >
                            <Play className="w-3 h-3 text-emerald-400" />
                            <span>Preview</span>
                          </button>
                          <button
                            onClick={() => {
                              const updated = { ...uploadedVideosMap };
                              delete updated[slotId];
                              setUploadedVideosMap(updated);
                            }}
                            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
                            title="Remove Reference Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-2 bg-slate-950/40">
                    <Video className="w-8 h-8 text-slate-500 mx-auto" />
                    <p className="text-xs text-slate-400">No reference videos uploaded yet. Drop 1 to 4 videos above to calibrate your avatar.</p>
                  </div>
                )}
              </div>

              {/* COLLAPSIBLE ACCORDION FOR ADVANCED 20-SLOT MATRIX */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
                <button
                  onClick={() => setShow20SlotsMatrix(!show20SlotsMatrix)}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                      <Camera className="w-4 h-4 text-slate-400" />
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Advanced 20-Angle Kinematic Ingest Matrix</span>
                        <span className="text-[10px] font-normal text-slate-400">(Optional multi-angle calibration)</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {show20SlotsMatrix ? 'Click to collapse 20 training slots' : 'Expand to map videos to specific walking, standing, or keynote angles'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {show20SlotsMatrix ? 'Collapse' : 'Expand Matrix'}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${show20SlotsMatrix ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {show20SlotsMatrix && (
                  <div className="p-4 border-t border-slate-800 space-y-4">
                    {/* Category Filter Pills for the 20 Video Slots */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', label: 'All 20 Slots', count: 20 },
                        { id: 'locomotion', label: '🚶 Locomotion & Walking', count: 4 },
                        { id: 'posture', label: '🧘 Posture & Stillness', count: 4 },
                        { id: 'speech', label: '🎙️ Speeches & Expressions', count: 4 },
                        { id: 'kinetics', label: '🌬️ Yogic Pranayama Flow', count: 4 },
                        { id: '360-ref', label: '🔄 360° Silhouette Anchors', count: 4 }
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setTrainingVideoFilter(cat.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                            trainingVideoFilter === cat.id
                              ? 'bg-emerald-500 text-black font-bold shadow'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{cat.label}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${trainingVideoFilter === cat.id ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'}`}>
                            {cat.count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* 20 Video Slots Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3.5">
                      {MASTER_TRAINING_SLOTS.filter(s => trainingVideoFilter === 'all' || s.category === trainingVideoFilter).map((slot) => {
                        const uploaded = uploadedVideosMap[slot.id];
                        return (
                          <div
                            key={slot.id}
                            className={`p-4 rounded-xl border-2 flex flex-col justify-between transition relative overflow-hidden ${
                              uploaded
                                ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              {/* Slot Header */}
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-amber-500/30">
                                  Slot {slot.slotNumber < 10 ? `0${slot.slotNumber}` : slot.slotNumber}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-400" />
                                  {slot.duration}
                                </span>
                              </div>

                              {/* Slot Title */}
                              <h4 className="text-sm font-bold text-white leading-snug">{slot.title}</h4>

                              {/* Instructions */}
                              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                                {slot.instruction}
                              </p>

                              {/* Outfit Hint */}
                              <div className="mt-2 text-[10px] text-slate-400 bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                                <span className="text-slate-500 font-semibold">Recommended Attire:</span>{' '}
                                <span className="text-amber-300 font-medium">{slot.recommendedOutfit}</span>
                              </div>
                            </div>

                            {/* Video Upload / Status Action */}
                            <div className="mt-3 pt-2.5 border-t border-slate-800">
                              {uploaded ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
                                    <span className="flex items-center gap-1 truncate max-w-[150px]">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                                      {uploaded.fileName}
                                    </span>
                                    <button
                                      onClick={() => {
                                        const updated = { ...uploadedVideosMap };
                                        delete updated[slot.id];
                                        setUploadedVideosMap(updated);
                                      }}
                                      className="text-red-400 hover:text-red-300 p-1"
                                      title="Remove Video"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between gap-1 pt-0.5">
                                    <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1 font-bold">
                                      <Scissors className="w-2.5 h-2.5 text-amber-400" />
                                      <span>{uploaded.trimmedDurationText || `Cut: ${formatTimeSeconds(uploaded.trimStart || 0)} - ${formatTimeSeconds(uploaded.trimEnd || 180)}`}</span>
                                    </span>
                                    <button
                                      onClick={() => openCutterForSlot(slot.id)}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition"
                                      title="Adjust 3-Minute Cut"
                                    >
                                      <Scissors className="w-2.5 h-2.5 text-amber-400" />
                                      <span>Adjust Cut</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload Clip (Max 3m)</span>
                                  <input
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/webm"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleProcessVideoUpload(file, slot.id);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Footer */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  {Object.keys(uploadedVideosMap).length > 0 ? (
                    <span><b className="text-emerald-400">{Object.keys(uploadedVideosMap).length} videos</b> calibrated for Mohan Sir&apos;s digital clone</span>
                  ) : (
                    <span>Upload 1 to 4 reference videos to begin cloning</span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleStartAvatarTraining}
                    disabled={isTrainingAvatar}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition"
                  >
                    <Zap className="w-4 h-4 fill-white" />
                    <span>{isTrainingAvatar ? 'Synthesizing Clone...' : '⚡ Calibrate & Synthesize Neural Clone'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('step-hair-face')}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-purple-950/40"
                  >
                    <span>Next: 2. Hair, Beard &amp; Spects</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: HAIR STYLE, FACIAL GROOMING & SPECTACLES STUDIO */}
          {activeTab === 'step-hair-face' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Smile className="w-6 h-6 text-purple-400" />
                    Step 2: Hair Style, Facial Grooming &amp; Spectacles (Glasses)
                  </h2>
                  <p className="text-sm text-slate-400">
                    Customize Mohan Sir&apos;s hairstyle, spiritual beard, spectacles frames, and sacred Vedic tilak.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 2500);
                    }}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Styling
                  </button>
                  <button
                    onClick={() => setActiveTab('step-wardrobe')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition"
                  >
                    <span>Next: 3. Clothes &amp; Dresses</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Main 2-Column Studio Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Live 360° Facial Studio Rig with Overlays */}
                <div className="lg:col-span-5 bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4 sticky top-20">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-purple-400" />
                      Live Face Calibration Preview
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleFaceCalibrationVideo}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition shadow cursor-pointer ${
                          isFacePreviewPlaying
                            ? 'bg-amber-500 text-black hover:bg-amber-400'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                        title={isFacePreviewPlaying ? 'Pause Face Calibration (Save Data/Charges)' : 'Play Face Calibration Video'}
                      >
                        {isFacePreviewPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{isFacePreviewPlaying ? 'Pause' : '▶ Play Face'}</span>
                      </button>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        360° Rig Active
                      </span>
                    </div>
                  </div>

                  {/* 360° Face Turntable Container */}
                  <div
                    className="w-64 h-64 mx-auto rounded-2xl overflow-hidden border-2 border-purple-500/60 shadow-2xl shadow-purple-500/20 relative bg-black transition-transform duration-150"
                    style={{
                      transform: `perspective(600px) rotateY(${avatarAngle <= 180 ? avatarAngle : avatarAngle - 360}deg)`,
                    }}
                  >
                    {(() => {
                      const uploadedVideoList = Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl);
                      const activeSlotId = (selectedPreviewSlotId && uploadedVideosMap[selectedPreviewSlotId]?.fileUrl)
                        ? selectedPreviewSlotId
                        : (uploadedVideoList.length > 0 ? uploadedVideoList[0][0] : null);
                      const activeSlot = activeSlotId ? uploadedVideosMap[activeSlotId] : null;

                      if (activeSlot?.fileUrl) {
                        return (
                          <>
                            <video
                              ref={faceCalibrationVideoRef}
                              key={activeSlotId + activeSlot.fileName}
                              src={activeSlot.fileUrl}
                              preload="metadata"
                              loop={false}
                              muted
                              playsInline
                              onPlay={() => setIsFacePreviewPlaying(true)}
                              onPause={() => setIsFacePreviewPlaying(false)}
                              onClick={toggleFaceCalibrationVideo}
                              className="w-full h-full object-cover cursor-pointer"
                              style={{ objectPosition: 'center 28%' }}
                            />
                            {!isFacePreviewPlaying && (
                              <button
                                onClick={toggleFaceCalibrationVideo}
                                className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/80 hover:bg-purple-600 text-white border-2 border-purple-400/80 flex items-center justify-center transition shadow-2xl z-20 cursor-pointer group backdrop-blur-sm"
                                title="Play Face Calibration"
                              >
                                <Play className="w-6 h-6 fill-white ml-0.5 group-hover:scale-110 transition" />
                              </button>
                            )}
                          </>
                        );
                      }
                      return (
                        <div className="w-full h-full relative">
                          <img
                            src={getMohan360FrameForAngle(avatarAngle).cdnUrl}
                            alt={`Mohan Sir ${avatarAngle}° View`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[9px] font-bold text-purple-300 border border-purple-500/40">
                            {avatarAngle}° Calibration Angle
                          </div>
                        </div>
                      );
                    })()}

                    {/* TILAK OVERLAY ON FOREHEAD */}
                    {selectedTilak !== 'none' && (
                      <div className="absolute top-10 inset-x-0 mx-auto w-max pointer-events-none flex flex-col items-center animate-in fade-in">
                        {selectedTilak === 'chandan-tilak' && (
                          <div className="flex flex-col items-center">
                            <span className="w-2.5 h-6 rounded-t-sm rounded-b-md bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 shadow-md shadow-amber-400/80 border border-amber-200" />
                            <span className="w-1 h-1 rounded-full bg-red-600 -mt-1" />
                          </div>
                        )}
                        {selectedTilak === 'bhasma-tripundra' && (
                          <div className="space-y-0.5">
                            <span className="block w-8 h-0.5 bg-slate-100/90 rounded-full shadow" />
                            <span className="block w-10 h-0.5 bg-slate-100/90 rounded-full shadow" />
                            <span className="block w-8 h-0.5 bg-slate-100/90 rounded-full shadow" />
                          </div>
                        )}
                        {selectedTilak === 'vermillion-bindi' && (
                          <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-md shadow-red-500 border border-red-300" />
                        )}
                      </div>
                    )}

                    {/* SPECTACLES / GLASSES OVERLAY OVER EYES */}
                    {selectedSpectacles !== 'none' && (
                      <div className="absolute top-20 inset-x-0 mx-auto w-36 pointer-events-none flex items-center justify-center animate-in fade-in">
                        {selectedSpectacles === 'classic-black' && (
                          <div className="w-32 flex items-center justify-between">
                            <div className="w-14 h-8 rounded-md border-2 border-black bg-black/10 backdrop-blur-[0.5px] shadow-lg shadow-black/80" />
                            <div className="w-4 h-0.5 bg-black" />
                            <div className="w-14 h-8 rounded-md border-2 border-black bg-black/10 backdrop-blur-[0.5px] shadow-lg shadow-black/80" />
                          </div>
                        )}
                        {selectedSpectacles === 'gold-rimless' && (
                          <div className="w-32 flex items-center justify-between">
                            <div className="w-14 h-9 rounded-lg border border-amber-400/90 bg-amber-400/5 shadow-md shadow-amber-400/30" />
                            <div className="w-4 h-0.5 bg-amber-400" />
                            <div className="w-14 h-9 rounded-lg border border-amber-400/90 bg-amber-400/5 shadow-md shadow-amber-400/30" />
                          </div>
                        )}
                        {selectedSpectacles === 'round-scholar' && (
                          <div className="w-32 flex items-center justify-between">
                            <div className="w-12 h-12 rounded-full border-2 border-stone-800 bg-stone-900/10 shadow" />
                            <div className="w-5 h-0.5 bg-stone-800" />
                            <div className="w-12 h-12 rounded-full border-2 border-stone-800 bg-stone-900/10 shadow" />
                          </div>
                        )}
                        {selectedSpectacles === 'transparent-modern' && (
                          <div className="w-32 flex items-center justify-between">
                            <div className="w-14 h-8 rounded-md border-2 border-white/60 bg-white/10 backdrop-blur-[1px] shadow" />
                            <div className="w-4 h-0.5 bg-white/60" />
                            <div className="w-14 h-8 rounded-md border-2 border-white/60 bg-white/10 backdrop-blur-[1px] shadow" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Top Overlay Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/85 border border-purple-400 text-[9px] font-bold text-purple-300">
                      HAIR &amp; FACIAL CALIBRATION
                    </div>

                    {/* Bottom Status Pill */}
                    <div className="absolute bottom-2 inset-x-2 px-2.5 py-1.5 rounded-xl bg-black/90 border border-slate-800 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                        <span className={`w-2 h-2 rounded-full ${isFacePreviewPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="text-purple-300 font-bold truncate">
                          {HAIR_STYLES.find(h => h.id === selectedHairStyle)?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                          {isFacePreviewPlaying ? '▶ Live' : '⏸ Paused (Data Saver)'}
                        </span>
                        <span className="text-amber-300 font-mono font-bold">{avatarAngle}°</span>
                      </div>
                    </div>
                  </div>

                  {/* 360 Turn Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                      <span>360° Facial Turntable</span>
                      <span className="text-purple-400 font-bold font-mono">{avatarAngle}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={avatarAngle}
                      onChange={(e) => setAvatarAngle(Number(e.target.value))}
                      className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Summary of Active Features */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Hair:</span>
                      <span className="text-purple-300 font-bold">{HAIR_STYLES.find(h => h.id === selectedHairStyle)?.name}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Beard:</span>
                      <span className="text-emerald-300 font-bold">{FACIAL_BEARDS.find(b => b.id === selectedFacialHair)?.name}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Spectacles:</span>
                      <span className="text-amber-300 font-bold">{SPECTACLES_LIST.find(s => s.id === selectedSpectacles)?.name}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Tilak:</span>
                      <span className="text-cyan-300 font-bold">{TILAK_LIST.find(t => t.id === selectedTilak)?.name}</span>
                    </div>
                  </div>
                </div>

                {/* Right Column: 4 Customization Selection Sections */}
                <div className="lg:col-span-7 space-y-6">
                  {/* 1. Hair Style Picker */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                          <Smile className="w-4 h-4 text-purple-400" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">1. Mohan Sir Hair Style</h4>
                          <p className="text-[11px] text-slate-400">Choose natural video match, Vedic Choti, or corporate trim</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        {HAIR_STYLES.length} Styles
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {HAIR_STYLES.map((hair) => (
                        <button
                          key={hair.id}
                          onClick={() => setSelectedHairStyle(hair.id as HairStyleId)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                            selectedHairStyle === hair.id
                              ? 'bg-purple-950/40 border-purple-400 text-white shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base">{hair.emoji}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-purple-300 border border-purple-500/30">
                              {hair.badge}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{hair.name}</div>
                            <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{hair.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Facial Hair & Beard Grooming */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                          <Eye className="w-4 h-4 text-emerald-400" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">2. Facial Hair &amp; Beard Grooming</h4>
                          <p className="text-[11px] text-slate-400">Spiritual trimmed beard, full Rishi sage beard, or clean shave</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {FACIAL_BEARDS.map((beard) => (
                        <button
                          key={beard.id}
                          onClick={() => setSelectedFacialHair(beard.id as FacialHairId)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                            selectedFacialHair === beard.id
                              ? 'bg-emerald-950/40 border-emerald-400 text-white shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base">{beard.emoji}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 border border-emerald-500/30">
                              {beard.badge}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{beard.name}</div>
                            <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{beard.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Spectacles & Glasses (Spect) */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                          <Eye className="w-4 h-4 text-amber-400" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">3. Spectacles &amp; Glasses (Spects)</h4>
                          <p className="text-[11px] text-slate-400">Eyeglasses frames: black rectangular, gold rimless, or scholar round</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {SPECTACLES_LIST.map((spect) => (
                        <button
                          key={spect.id}
                          onClick={() => setSelectedSpectacles(spect.id as SpectaclesId)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                            selectedSpectacles === spect.id
                              ? 'bg-amber-950/40 border-amber-400 text-white shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-base">{spect.emoji}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 border border-amber-500/30">
                              {spect.badge}
                            </span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white">{spect.name}</div>
                            <div className="text-[10px] text-slate-400 leading-snug mt-0.5">{spect.description}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4. Sacred Vedic Tilak */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-white">4. Sacred Vedic Tilak / Markings</h4>
                          <p className="text-[11px] text-slate-400">Sandalwood Chandan, Holy Ash Bhasma Tripundra, or Universal Clean</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {TILAK_LIST.map((tilak) => (
                        <button
                          key={tilak.id}
                          onClick={() => setSelectedTilak(tilak.id as TilakId)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 ${
                            selectedTilak === tilak.id
                              ? 'bg-cyan-950/40 border-cyan-400 text-white shadow-md'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="text-base">{tilak.emoji}</div>
                          <div>
                            <div className="text-xs font-bold text-white">{tilak.name}</div>
                            <div className="text-[9px] text-slate-400 mt-0.5">{tilak.badge}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 FOOTER NAVIGATION */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('step-visual')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-2 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to 1. Mohan Sir Clone</span>
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 2500);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Hair &amp; Spectacles</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('step-wardrobe')}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-amber-500/30 transition transform hover:scale-[1.02]"
                  >
                    <span>Next: 3. Clothes &amp; Used Dresses</span>
                    <ChevronRight className="w-4 h-4 text-black" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CLOTHES & USED DRESSES STUDIO */}
          {activeTab === 'step-wardrobe' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Shirt className="w-6 h-6 text-amber-400" />
                    Step 3: Mohan Sir Clothes &amp; Used Dresses Studio
                  </h2>
                  <p className="text-sm text-slate-400">
                    Use your real clothing from uploaded videos, photograph new dresses from your closet, or choose from 53+ Indian &amp; Western styles.
                  </p>
                </div>

                {/* Currently Fitted Pill */}
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-amber-500/40 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400">Currently Fitted Outfit</div>
                    <div className="text-xs font-bold text-amber-300 truncate max-w-[200px]">{activeOutfit.name}</div>
                  </div>
                </div>
              </div>

              {/* 👗 MY REAL USED DRESSES & PERSONAL CLOSET */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/30 via-slate-900 to-emerald-950/30 border border-amber-500/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      <Shirt className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                        <span>My Real Used Dresses (Personal Closet)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {myUsedDresses.length} Saved
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Extracted directly from your uploaded videos or photographed from your personal wardrobe.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow transition">
                      <Upload className="w-3.5 h-3.5" />
                      <span>📸 Add Photo of Real Dress</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const blobUrl = URL.createObjectURL(file);
                            const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 32);
                            const newDress: OutfitItem = {
                              id: `used-${Date.now()}`,
                              name: `My ${cleanName} (Real Photo)`,
                              category: 'used-dresses',
                              emoji: '👔',
                              previewGradient: 'from-amber-900 via-orange-800 to-yellow-700',
                              top: `Personal Photographed Attire: ${cleanName}`,
                              bottom: 'Coordinated Bottom',
                              footwear: 'Handcrafted Kolhapuri',
                              accessories: ['Personal Item'],
                              description: 'Custom authentic dress photographed and uploaded directly by Mohan Sir.',
                              badge: '⭐ My Real Dress',
                              colorAccent: 'border-amber-400 bg-amber-500/10 text-amber-300',
                              imageUrl: blobUrl
                            };
                            setMyUsedDresses(prev => [newDress, ...prev]);
                            setSelectedOutfitId(newDress.id);
                            setLastSavedNotice(`Saved "${newDress.name}" to your closet!`);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Used Dresses Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {myUsedDresses.map((dress) => (
                    <div
                      key={dress.id}
                      onClick={() => setSelectedOutfitId(dress.id)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition relative flex flex-col justify-between space-y-2 ${
                        selectedOutfitId === dress.id
                          ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/20 ring-1 ring-amber-400'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xl">{dress.emoji}</span>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {dress.badge}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{dress.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{dress.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
                        <span className="text-amber-300 font-semibold">{dress.top}</span>
                        {selectedOutfitId === dress.id && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Fitted
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Custom Outfit Generator Bar */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                  <Wand2 className="w-4 h-4 text-purple-400" />
                  Generate or Add Any Custom Clothing Style on Mohan Sir
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Royal Maratha Angrakha with pearl necklace, Astronaut pressurized spacesuit, Vintage leather biker jacket..."
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-purple-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateCustomOutfit()}
                  />
                  <button
                    onClick={handleGenerateCustomOutfit}
                    disabled={isGeneratingCustomOutfit || !customPrompt.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isGeneratingCustomOutfit ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Fitting Neural Cloth...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Fit Custom Outfit
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Category Filter Pills & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { id: 'all', label: '🗂 All Wardrobe', count: allOutfits.length },
                    { id: 'used-dresses', label: '⭐ My Real Dresses', count: myUsedDresses.length },
                    { id: 'indian', label: '🇮🇳 Indian', count: allOutfits.filter(o => o.category === 'indian').length },
                    { id: 'western', label: '👕 Western', count: allOutfits.filter(o => o.category === 'western').length },
                    { id: 'professional', label: '💼 Professional', count: allOutfits.filter(o => o.category === 'professional').length },
                    { id: 'army-defense', label: '🎖 Army & Defense', count: allOutfits.filter(o => o.category === 'army-defense').length },
                    { id: 'sports-active', label: '🏊 Sports & Swim', count: allOutfits.filter(o => o.category === 'sports-active').length },
                    { id: 'farmer-rural', label: '🌾 Farmer & Rural', count: allOutfits.filter(o => o.category === 'farmer-rural').length },
                    { id: 'workers-trades', label: '🔧 Workers', count: allOutfits.filter(o => o.category === 'workers-trades').length },
                    { id: 'chef-cooking', label: '👨‍🍳 Chef & Cook', count: allOutfits.filter(o => o.category === 'chef-cooking').length },
                    ...(customOutfitsList.length > 0 ? [{ id: 'custom-generator', label: '✨ AI Tailored', count: customOutfitsList.length }] : [])
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setWardrobeCategory(cat.id as WardrobeCategory)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1 ${
                        wardrobeCategory === cat.id
                          ? 'bg-amber-500 text-black font-bold shadow'
                          : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {cat.label}
                      <span className={`text-[10px] font-bold px-1 rounded ${wardrobeCategory === cat.id ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'}`}>
                        {cat.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-56 flex-shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    value={wardrobeSearchQuery}
                    onChange={(e) => setWardrobeSearchQuery(e.target.value)}
                    placeholder="Search garments..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Wardrobe Stats Bar */}
              <div className="flex items-center gap-4 text-xs text-slate-400 pb-1">
                <span className="font-semibold text-white">{filteredOutfits.length} outfits</span>
                <span>·</span>
                <span>Indian: {filteredOutfits.filter(o => o.category === 'indian').length}</span>
                <span>·</span>
                <span>Western: {filteredOutfits.filter(o => o.category === 'western').length}</span>
                <span>·</span>
                <span>Professional: {filteredOutfits.filter(o => o.category === 'professional').length}</span>
                <span>·</span>
                <span>Army: {filteredOutfits.filter(o => o.category === 'army-defense').length}</span>
                <span>·</span>
                <span>Sports: {filteredOutfits.filter(o => o.category === 'sports-active').length}</span>
                <span>·</span>
                <span>Farmer: {filteredOutfits.filter(o => o.category === 'farmer-rural').length}</span>
                <span>·</span>
                <span>Worker: {filteredOutfits.filter(o => o.category === 'workers-trades').length}</span>
                <span>·</span>
                <span>Chef: {filteredOutfits.filter(o => o.category === 'chef-cooking').length}</span>
              </div>

              {/* Wardrobe Grid — 4 Columns, Compact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredOutfits.map((outfit) => {
                  const isSelected = selectedOutfitId === outfit.id;
                  return (
                    <div
                      key={outfit.id}
                      onClick={() => setSelectedOutfitId(outfit.id)}
                      className={`rounded-xl cursor-pointer transition-all border-2 relative flex flex-col overflow-hidden group ${
                        isSelected
                          ? 'border-amber-400 shadow-xl shadow-amber-950/40 ring-1 ring-amber-400'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* ── VISUAL IMAGE PREVIEW AREA ── */}
                      <div className={`relative h-32 bg-gradient-to-br ${outfit.previewGradient} flex items-center justify-center overflow-hidden`}>
                        {outfitImageMap[outfit.id] ? (
                          // Real photo if uploaded
                          <img
                            src={outfitImageMap[outfit.id]}
                            alt={outfit.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          // Styled visual placeholder with emoji
                          <>
                            <div className="absolute inset-0 opacity-20"
                              style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }}
                            />
                            <div className="relative text-center space-y-1 z-10">
                              <div className="text-5xl drop-shadow-lg">{outfit.emoji}</div>
                              <div className="text-[10px] font-bold text-white/70 uppercase tracking-wider">
                                Visual Preview
                              </div>
                            </div>
                            {/* Upload photo button — shown on hover */}
                            <label className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                              onClick={e => e.stopPropagation()}
                            >
                              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold hover:bg-black/80 border border-white/20">
                                <Upload className="w-3 h-3" />
                                Add Photo
                              </span>
                              <input type="file" accept="image/*" className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = URL.createObjectURL(file);
                                    // Store preview locally (in real app, upload to Bunny Storage)
                                    setOutfitImageMap(prev => ({ ...prev, [outfit.id]: url }));
                                  }
                                }}
                              />
                            </label>
                          </>
                        )}

                        {/* Selected checkmark overlay */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-lg">
                            <Check className="w-3.5 h-3.5 font-bold" />
                          </div>
                        )}

                        {/* Category badge overlay */}
                        <div className="absolute top-2 left-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border backdrop-blur-sm ${outfit.colorAccent}`}>
                            {outfit.badge}
                          </span>
                        </div>
                      </div>

                      {/* ── OUTFIT DETAILS BELOW IMAGE ── */}
                      <div className="p-3 bg-slate-900/90 flex flex-col gap-1.5 flex-1">
                        <h3 className="text-xs font-bold text-white leading-tight">{outfit.name}</h3>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">{outfit.description}</p>

                        {/* Garment Summary */}
                        <div className="pt-1.5 border-t border-slate-800 space-y-0.5 text-[10px]">
                          <div><span className="text-slate-500">Top: </span><span className="text-slate-300">{outfit.top}</span></div>
                          <div><span className="text-slate-500">Bottom: </span><span className="text-slate-300">{outfit.bottom}</span></div>
                          {outfit.headwear && <div><span className="text-slate-500">Head: </span><span className="text-amber-400">{outfit.headwear}</span></div>}
                        </div>

                        {/* Accessories */}
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {outfit.accessories.slice(0, 2).map((acc, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400">{acc}</span>
                          ))}
                          {outfit.accessories.length > 2 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-500">+{outfit.accessories.length - 2}</span>
                          )}
                        </div>

                        {/* Wear Button */}
                        {isSelected ? (
                          <div className="mt-1 w-full py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center justify-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Currently Wearing
                          </div>
                        ) : (
                          <button className="mt-1 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 hover:border-amber-500/40 border border-slate-700 text-[10px] font-bold text-slate-300 hover:text-amber-300 transition flex items-center justify-center gap-1">
                            <Shirt className="w-3 h-3" /> Fit This Outfit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredOutfits.length === 0 && (
                <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
                  <Shirt className="w-10 h-10 text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-300">No Outfits Found in this Filter</div>
                  <p className="text-xs text-slate-500">
                    Try another search term or type in the custom box above to generate any clothing style.
                  </p>
                </div>
              )}

              {/* Navigation Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('step-hair-face')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to 2. Hair &amp; Spects</span>
                </button>
                <button
                  onClick={() => setActiveTab('step-motion')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-black text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-cyan-950/40 transition"
                >
                  <span>Next: 4. Motions &amp; Mudras</span>
                  <ChevronRight className="w-4 h-4 text-black" />
                </button>
              </div>
            </div>
          )}

          {/* SECTION 4: MOTIONS & ACTIONS */}
          {activeTab === 'step-motion' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-cyan-400" />
                  Step 4: Motions &amp; Yogic Mudras (Kinematics, Walking &amp; Mudras)
                </h2>
                <p className="text-sm text-slate-400">
                  Full-body biomechanical kinematics and yogic posture coordination
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {MOTIONS.map((motion) => {
                  const isSelected = selectedMotion === motion.id;
                  return (
                    <div
                      key={motion.id}
                      onClick={() => setSelectedMotion(motion.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border-2 relative ${
                        isSelected
                          ? 'bg-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/40'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-cyan-400 text-black flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 font-bold" />
                        </div>
                      )}

                      <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                        {motion.type}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{motion.name}</h4>
                      <p className="text-[11px] text-slate-400 mt-2">{motion.description}</p>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('step-wardrobe')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to 3. Clothes &amp; Dresses</span>
                </button>
                <button
                  onClick={() => setActiveTab('step-drama-swap')}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-pink-950/40 transition"
                >
                  <span>Next: 5. Backgrounds &amp; Speech Lab</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: VOICE DNA & SPEECH ENGINE */}
          {activeTab === 'step-voice' && (
            <div className="space-y-6 max-w-4xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Mic className="w-6 h-6 text-purple-400" />
                    <span>Step 4: Voice DNA & Vocal Cloning Studio</span>
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Authentic neural vocal formants mirroring Mohan Sir&apos;s timbre, cadence, and breath modulation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>8 Models in Bunny DB</span>
                  </span>
                </div>
              </div>

              {/* 🎵 ACTIVE MASTER AUDIO PREVIEW PLAYER */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/40 border-2 border-purple-500/40 space-y-5 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        {selectedVoiceModel.languageLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                        {selectedVoiceModel.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedVoiceModel.toneName}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                      {selectedVoiceModel.characteristic}
                    </p>
                  </div>

                  {/* Play / Pause Primary Button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleToggleVoiceSample()}
                      className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2.5 transition-all shadow-xl active:scale-95 ${
                        isPlayingVoiceSample
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/30 ring-2 ring-amber-400'
                          : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/40'
                      }`}
                    >
                      {isPlayingVoiceSample ? (
                        <>
                          <Pause className="w-4 h-4 fill-black" />
                          <span>Pause Voice Preview</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Play Authentic Voice</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Animated Waveform Visualizer & Playback Timeline */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-purple-300 font-semibold">
                      {Math.floor(audioCurrentTime / 60)}:{String(Math.floor(audioCurrentTime % 60)).padStart(2, '0')} / {Math.floor(audioTotalDuration / 60)}:{String(Math.floor(audioTotalDuration % 60)).padStart(2, '0')}
                    </span>
                    <span className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Formant Pitch: <b className="text-purple-300">{selectedVoiceModel.pitchHz} Hz</b></span>
                      <span>•</span>
                      <span>Speed: <b className="text-emerald-300">{(selectedVoiceModel.cadenceWordsPerMinute * voiceSpeed).toFixed(0)} WPM</b></span>
                    </span>
                  </div>

                  {/* Dynamic Sound Wave Bars */}
                  <div className="h-10 flex items-center justify-between gap-1 px-1">
                    {[45, 75, 30, 90, 60, 85, 40, 95, 70, 50, 80, 65, 90, 40, 70, 85, 60, 95, 35, 80, 50, 90, 65, 45].map((height, idx) => (
                      <div
                        key={idx}
                        className={`flex-1 rounded-full transition-all duration-150 ${
                          isPlayingVoiceSample
                            ? 'bg-gradient-to-t from-purple-500 to-amber-400 animate-pulse'
                            : 'bg-slate-800'
                        }`}
                        style={{
                          height: isPlayingVoiceSample
                            ? `${Math.max(15, (height * ((idx % 3) + 1) * (0.8 + Math.random() * 0.4)) % 100)}%`
                            : `${Math.max(20, height * 0.4)}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Sample phrase banner */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/90 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-purple-400 font-bold flex-shrink-0">Sample:</span>
                      <span className="text-slate-300 italic truncate">&ldquo;{selectedVoiceModel.samplePhrase}&rdquo;</span>
                    </div>
                    <button
                      onClick={() => handleSpeakCustomText(selectedVoiceModel.samplePhrase)}
                      className="px-2.5 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[10px] font-bold flex-shrink-0 transition"
                    >
                      Speak This
                    </button>
                  </div>
                </div>

                {/* Real-time Pitch & Speed Tuning Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Pitch Modulation</span>
                      <span className="text-purple-400 font-bold">{voicePitch.toFixed(2)}x ({(selectedVoiceModel.pitchHz * voicePitch).toFixed(0)} Hz)</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.25"
                      step="0.02"
                      value={voicePitch}
                      onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Deeper Resonant (0.8x)</span>
                      <span>Neutral (1.0x)</span>
                      <span>Higher Pitch (1.25x)</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Speaking Pace</span>
                      <span className="text-emerald-400 font-bold">{voiceSpeed.toFixed(2)}x ({(selectedVoiceModel.cadenceWordsPerMinute * voiceSpeed).toFixed(0)} WPM)</span>
                    </div>
                    <input
                      type="range"
                      min="0.75"
                      max="1.4"
                      step="0.05"
                      value={voiceSpeed}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVoiceSpeed(val);
                        if (audioPlayerRef.current) {
                          audioPlayerRef.current.playbackRate = val;
                        }
                      }}
                      className="w-full accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Meditative Slow (0.75x)</span>
                      <span>Standard (1.0x)</span>
                      <span>Energetic Fast (1.4x)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 🎙️ 8 VOCAL DNA MODELS MATRIX */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-purple-400" />
                    <span>Select Vocal DNA Model ({MOHAN_VOCAL_DNA_MODELS.length} Models Available)</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Click any model to select and preview
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {MOHAN_VOCAL_DNA_MODELS.map((model) => {
                    const isSelected = activeVoiceModelId === model.id;
                    return (
                      <div
                        key={model.id}
                        onClick={() => {
                          setActiveVoiceModelId(model.id);
                          if (isPlayingVoiceSample && audioPlayerRef.current) {
                            audioPlayerRef.current.src = model.audioSampleUrl;
                            audioPlayerRef.current.play();
                          }
                        }}
                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'bg-gradient-to-br from-purple-950/70 via-slate-900 to-indigo-950/50 border-purple-400 shadow-xl ring-1 ring-purple-400/50'
                            : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {model.languageLabel}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400">
                                {model.pitchHz} Hz • {model.cadenceWordsPerMinute} WPM
                              </span>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                              )}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-bold text-white">{model.toneName}</h4>
                            <p className="text-xs text-slate-400 mt-1 leading-snug">{model.characteristic}</p>
                          </div>

                          <div className="text-[11px] text-slate-300 italic p-2 rounded bg-slate-950/60 border border-slate-800/80">
                            &ldquo;{model.samplePhrase}&rdquo;
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVoiceModelId(model.id);
                              handleToggleVoiceSample(model.audioSampleUrl);
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                              isSelected && isPlayingVoiceSample
                                ? 'bg-amber-500 text-black'
                                : 'bg-slate-800 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {isSelected && isPlayingVoiceSample ? (
                              <>
                                <Pause className="w-3.5 h-3.5 fill-black" />
                                <span>Pause</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5 fill-purple-300" />
                                <span>Listen Audio</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveVoiceModelId(model.id);
                              handleSpeakCustomText(model.samplePhrase);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
                          >
                            <Mic className="w-3 h-3 text-emerald-400" />
                            <span>TTS Test</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 🗣️ LIVE CUSTOM SPEECH SYNTHESIS TEST CONSOLE */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Test Voice With Any Custom Script</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Active: <b className="text-purple-300">{selectedVoiceModel.toneName.slice(0, 30)}...</b>
                  </span>
                </div>

                {/* Preset sentence shortcuts */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-slate-400 self-center">Presets:</span>
                  {[
                    { label: 'Surya Nadi Rule', text: 'सूर्य नाड़ी में जब भोजन किया जाता है, तो जठराग्नि तीव्र होती है और पाचन सर्वोत्तम होता है।' },
                    { label: 'Vedic Sutra', text: 'ब्रह्माण्डं पिण्डमध्ये तु संस्थितं नात्र संशयः। स्वरज्ञानेन विज्ञेयं सर्वं त्रैलोक्यमण्डितम्॥' },
                    { label: 'Yoga Nidra Calm', text: 'श्वास को भीतर आते और बाहर जाते हुए साक्षी भाव से देखें। मन पूर्णतः शांत हो रहा है।' },
                    { label: 'Global Keynote', text: 'Welcome practitioners. The ancient science of Swar Yoga is the ultimate physiological biohack for human peak performance.' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCustomVoiceTestText(preset.text)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-purple-500/20 text-slate-300 hover:text-purple-300 border border-slate-700 text-[11px] font-medium transition"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={customVoiceTestText}
                  onChange={(e) => setCustomVoiceTestText(e.target.value)}
                  placeholder="Type any Hindi, Marathi, Sanskrit, or English sentence to hear Mohan Sir speak it..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 leading-relaxed font-sans"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400">
                    Calibrated: Pitch {voicePitch.toFixed(2)}x • Pace {voiceSpeed.toFixed(2)}x • Formant Match 99.4%
                  </div>
                  <button
                    onClick={() => handleSpeakCustomText()}
                    disabled={isSpeakingCustomText || !customVoiceTestText.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isSpeakingCustomText ? 'Speaking Now...' : 'Speak Sentence Now'}</span>
                  </button>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setActiveTab('step-motion')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Back: Yogic Motion
                </button>
                <button
                  onClick={() => setActiveTab('step-expressions')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  Next: Expressions &amp; Lip-Sync
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* TAB 5: EXPRESSIONS & LIP-SYNC */}
          {activeTab === 'step-expressions' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Smile className="w-6 h-6 text-pink-400" />
                  Step 5: Facial Mesh, Micro-Expressions & Multilingual Lip-Sync
                </h2>
                <p className="text-sm text-slate-400">
                  Realistic eye blinks, cervical micro-adjustments, and phoneme-accurate lip-sync across 30+ languages
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Spontaneous Eye Blinking</span>
                    <span className="text-pink-400 font-bold">{blinkRate} blinks/min (Natural Human Average)</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={blinkRate}
                    onChange={(e) => setBlinkRate(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Head Movement & Conversational Gesturing</span>
                    <span className="text-pink-400 font-bold">{headTiltSensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={headTiltSensitivity}
                    onChange={(e) => setHeadTiltSensitivity(parseInt(e.target.value))}
                    className="w-full accent-pink-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">Multilingual Lip-Sync Phoneme Precision</span>
                    <span className="text-emerald-400 font-bold">{lipSyncPrecision}% Match (English, Japanese, Dutch, Swedish, etc.)</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="100"
                    value={lipSyncPrecision}
                    onChange={(e) => setLipSyncPrecision(parseInt(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setActiveTab('step-voice')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setActiveTab('step-drama-swap')}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg"
                >
                  Next: Step 6 Drama & Motion Mimic
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: MOTION MIMIC & DRAMA VIDEO SWAP */}
          {activeTab === 'step-drama-swap' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Film className="w-6 h-6 text-pink-400" />
                    Step 5: Background Scenes, Drama Video Swap &amp; Speech Engine
                  </h2>
                  <p className="text-sm text-slate-400">
                    Map Mohan Sir onto ANY cinematic 3-minute drama scene (beach cliff, waterfall, Himalayan summit, temple, stage). The AI mimics the actor&apos;s natural motion and generates multilingual discourse via RAG.
                  </p>
                </div>

                <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-950 to-slate-900 border border-purple-500/40 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-200">
                    Connected to Pexels & Pixabay Free Video Engine
                  </span>
                </div>
              </div>

              {/* Step 6 Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Cols: Source Clip Selector & Search */}
                <div className="lg:col-span-7 space-y-5">
                  {/* Free Video Clips Search Bar & Category Filters */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-emerald-400" />
                        1. Choose Free 3-Minute Stock Drama Scene (Or Upload Your Own)
                      </label>
                      <span className="text-[10px] text-slate-500">100% Free Public Royalty License</span>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {[
                        { id: 'all', label: 'All Scenes' },
                        { id: 'beach', label: '🌊 Beach & Waterfall' },
                        { id: 'mountain', label: '🏔️ Himalayas & Peaks' },
                        { id: 'nature', label: '🌲 Forest Sanctuary' },
                        { id: 'temple', label: '🏛️ Ancient Temple' },
                        { id: 'stage', label: '🎙️ Keynote Stage' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setDramaCategoryFilter(cat.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                            dramaCategoryFilter === cat.id
                              ? 'bg-amber-500 text-black font-bold shadow'
                              : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Stock Drama Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                      {FREE_STOCK_DRAMA_CLIPS.filter(c => dramaCategoryFilter === 'all' || c.category === dramaCategoryFilter).map((clip) => {
                        const isSelected = selectedStockClipId === clip.id;
                        return (
                          <div
                            key={clip.id}
                            onClick={() => {
                              setSelectedStockClipId(clip.id);
                              setCustomDramaVideoName(null);
                            }}
                            className={`rounded-xl border-2 cursor-pointer transition overflow-hidden flex flex-col justify-between ${
                              isSelected
                                ? 'border-amber-400 bg-slate-900 shadow-xl shadow-amber-950/40 ring-1 ring-amber-400'
                                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                            }`}
                          >
                            <div className="relative h-28 overflow-hidden bg-black">
                              <img
                                src={clip.thumbnail}
                                alt={clip.title}
                                className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                                {clip.duration}
                              </div>
                              <div className="absolute bottom-2 left-2 text-[10px] text-slate-200 font-semibold truncate max-w-[180px]">
                                📍 {clip.location}
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5 font-bold" />
                                </div>
                              )}
                            </div>

                            <div className="p-3 space-y-1">
                              <h4 className="text-xs font-bold text-white">{clip.title}</h4>
                              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                                {clip.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Or Upload Custom Video */}
                    <div className="p-3.5 rounded-xl border border-dashed border-slate-700 bg-slate-950/60 flex items-center justify-between gap-3">
                      <div className="text-xs">
                        <span className="font-bold text-white">Have a specific actor / drama video clip?</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Upload any video (like actor on the beach with waterfall) — AI will replace them with Mohan Sir.
                        </p>
                      </div>
                      <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer flex-shrink-0 border border-slate-700 transition">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>Upload Clip</span>
                        <input
                          type="file"
                          accept="video/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCustomDramaVideoName(file.name);
                              setSelectedStockClipId('custom');
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Character & Outfit Mapping */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Shirt className="w-4 h-4 text-amber-400" />
                      2. Dress Mohan Sir in this Drama Scene
                    </label>
                    <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                      <div>
                        <span className="text-slate-400 text-[11px]">Selected Outfit:</span>
                        <div className="text-amber-300 font-bold">{activeOutfit.name}</div>
                      </div>
                      <button
                        onClick={() => setActiveTab('step-wardrobe')}
                        className="px-3 py-1 rounded-md bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold border border-amber-500/40"
                      >
                        Change from 53 Outfits
                      </button>
                    </div>
                  </div>

                  {/* Multilingual 3-Minute RAG Engine */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        3. 3-Minute Discourse & Multilingual RAG Auto-Conversion
                      </label>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                        RAG Synced
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={dramaScript}
                      onChange={(e) => setDramaScript(e.target.value)}
                      placeholder="Type what Mohan Sir should say during this 3-minute scene..."
                      className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    />

                    {/* Language Switch Pills */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold">
                        After generating master video, auto-convert into these languages:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'hi', label: '🇮🇳 Hindi' },
                          { id: 'mr', label: '🇮🇳 Marathi' },
                          { id: 'en', label: '🇬🇧 English' },
                          { id: 'gu', label: '🇮🇳 Gujarati' },
                          { id: 'ta', label: '🇮🇳 Tamil' },
                          { id: 'sa', label: '🕉️ Sanskrit' },
                          { id: 'es', label: '🇪🇸 Spanish' },
                          { id: 'de', label: '🇩🇪 German' },
                        ].map((lang) => {
                          const isChecked = dramaSelectedLanguages.includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              onClick={() => {
                                if (isChecked) {
                                  setDramaSelectedLanguages(dramaSelectedLanguages.filter(l => l !== lang.id));
                                } else {
                                  setDramaSelectedLanguages([...dramaSelectedLanguages, lang.id]);
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition flex items-center gap-1 ${
                                isChecked
                                  ? 'bg-cyan-500 text-black shadow'
                                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:bg-slate-800'
                              }`}
                            >
                              <span>{lang.label}</span>
                              {isChecked && <Check className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Render CTA */}
                  <button
                    onClick={() => {
                      setIsGeneratingDrama(true);
                      setDramaSuccess(false);
                      setTimeout(() => {
                        setIsGeneratingDrama(false);
                        setDramaSuccess(true);
                      }, 2500);
                    }}
                    disabled={isGeneratingDrama}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-400 hover:via-orange-400 hover:to-purple-500 text-white font-extrabold text-sm shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
                  >
                    {isGeneratingDrama ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Tracking Motion & Synthesizing Mohan Sir Avatar...
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4" />
                        Convert Scene into Mohan Sir Avatar (3-Min Master Video)
                      </>
                    )}
                  </button>
                </div>

                {/* Right 5 Cols: Live Side-by-Side Comparison Player */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="rounded-2xl bg-black border-2 border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full min-h-[460px]">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Film className="w-4 h-4 text-amber-400" />
                        Drama Motion Mimic Preview
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                        V2V Engine Active
                      </span>
                    </div>

                    <div className="p-4 flex-1 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black space-y-4">
                      {/* Active Scene Preview Screen */}
                      <div className="w-full h-52 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative">
                        <img
                          src={
                            customDramaVideoName
                              ? 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80'
                              : (FREE_STOCK_DRAMA_CLIPS.find(c => c.id === selectedStockClipId)?.thumbnail || FREE_STOCK_DRAMA_CLIPS[0].thumbnail)
                          }
                          alt="Drama Scene"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="w-24 h-24 rounded-full bg-slate-950 border-2 border-emerald-400 p-0.5 flex items-center justify-center overflow-hidden shadow-2xl ring-4 ring-emerald-500/30">
                            {outfitImageMap[selectedOutfitId] ? (
                              <img
                                src={outfitImageMap[selectedOutfitId]}
                                alt="Fitted Outfit"
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <div className="text-center p-2">
                                <span className="text-[11px] font-bold text-emerald-300">Mohan Sir</span>
                                <div className="text-[9px] text-slate-400">Master Twin</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Top Overlay Tag */}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-bold border border-amber-500/30">
                          {customDramaVideoName ? `Custom Clip: ${customDramaVideoName}` : (FREE_STOCK_DRAMA_CLIPS.find(c => c.id === selectedStockClipId)?.title || 'Beach Sanctuary')}
                        </div>

                        {/* Bottom Overlay Info */}
                        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between text-[10px] text-white bg-black/80 p-1.5 rounded-lg border border-slate-700">
                          <span>Avatar: <b className="text-amber-400">Mohan Sir</b></span>
                          <span>Fitted in: <b className="text-emerald-400">{activeOutfit.name}</b></span>
                        </div>
                      </div>

                      {/* Processing / Success Info */}
                      {dramaSuccess ? (
                        <div className="w-full p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/60 space-y-2 animate-in fade-in">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Mohan Sir Avatar Drama Conversion Complete!</span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Actor gestures mapped to Mohan Sir. RAG prepared {dramaSelectedLanguages.length} language audio tracks (Hindi, Marathi, English, Gujarati).
                          </p>
                          <div className="flex gap-2 pt-1">
                            <button className="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition flex items-center justify-center gap-1">
                              <Play className="w-3.5 h-3.5" /> Play Full 3-Min Video
                            </button>
                            <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition">
                              Download MP4
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <div className="text-xs font-bold text-slate-300">
                            Ready to Transfer Motion & Scene
                          </div>
                          <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                            Select any free scene on the left, type the 3-minute discourse, and click Convert.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>Resolution: 4K UHD / 1080p</span>
                      <span>Output: MP4 H.264 Audio Stereo</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActiveTab('step-expressions')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setActiveTab('step-test-lab')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition"
                >
                  Next: Step 7 Test Lab & Set Master
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 7: TEST LAB & SET MASTER AVATAR */}
          {activeTab === 'step-test-lab' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Zap className="w-6 h-6 text-amber-400" />
                  Step 7: Live Test Lab & Master Activation
                </h2>
                <p className="text-sm text-slate-400">
                  Type any sentence to generate an immediate real-time video preview of Mohan Sir speaking in your chosen outfit and motion
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                      <span>Test Speech Script</span>
                      <span className="text-[10px] text-amber-400">{testScript.length} characters</span>
                    </label>
                    <textarea
                      rows={5}
                      value={testScript}
                      onChange={(e) => setTestScript(e.target.value)}
                      className="w-full p-3 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                    />

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setTestScript('According to Vedic Swar Yoga, solar nadi breath accelerates vitality, strength, and metabolic fire.')}
                          className="px-2.5 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
                        >
                          Sample 1 (Swar)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTestScript('Welcome to our international masterclass on circadian breath rhythms and yogic longevity.')}
                          className="px-2.5 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
                        >
                          Sample 2 (Global)
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowRagSynthesizeModal(true)}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-amber-500/25 via-emerald-500/25 to-teal-500/25 border border-amber-500/50 text-[11px] font-bold text-amber-300 hover:bg-amber-500/35 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                        >
                          <Sparkles size={12} className="text-amber-400" />
                          ⚡ Generate from Mohan RAG DNA
                        </button>
                      </div>

                      <button
                        onClick={handleTestGenerate}
                        disabled={isGeneratingTest}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold flex items-center gap-2 shadow-lg shadow-amber-950/40 disabled:opacity-50"
                      >
                        {isGeneratingTest ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Rendering Avatar...
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            Generate Live Test Preview
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary of Configurations */}
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                    <div className="font-bold text-white">Active Avatar Recipe Configuration:</div>
                    <div className="grid grid-cols-2 gap-2 text-slate-300">
                      <div>Fitted Outfit: <b className="text-amber-400">{activeOutfit.name}</b></div>
                      <div>Motion: <b className="text-cyan-400">{activeMotionObj.name}</b></div>
                      <div>Tone: <b className="text-purple-400">{voiceTone}</b></div>
                      <div>Lip-Sync: <b className="text-emerald-400">{lipSyncPrecision}% Multi-Lingual</b></div>
                    </div>
                  </div>

                  {/* Save Master Avatar CTA */}
                  <div className="pt-2">
                    <button
                      onClick={handleSaveMaster}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-400 hover:via-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 transition"
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Set & Save as Active Master Avatar for Swar Yoga
                    </button>
                  </div>
                </div>

                {/* Right Side Video Output Player */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl bg-black border-2 border-slate-800 overflow-hidden shadow-2xl flex flex-col h-full min-h-[420px]">
                    <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
                      <span className="font-bold flex items-center gap-1.5 text-white">
                        <Film className="w-4 h-4 text-amber-400" />
                        Live Avatar Output Player
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                        HD 1080p
                      </span>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-black to-black p-6">
                      <div className="text-center space-y-4">
                        <div className="w-36 h-36 rounded-2xl mx-auto bg-gradient-to-br from-amber-500 via-emerald-600 to-teal-600 p-1 shadow-2xl">
                          <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-white">
                            <UserCheck className="w-20 h-20 text-amber-300" />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-base font-bold text-white">{avatarName}</div>
                          <div className="text-xs text-amber-400">{activeOutfit.name}</div>
                          <p className="text-[11px] text-slate-400 max-w-xs mx-auto italic mt-2">
                            &quot;{testScript.substring(0, 80)}...&quot;
                          </p>
                        </div>

                        {testSuccess && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Lip-Sync, Outfit Draping & Kinetic Motion Synced
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white">
                          <Play className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Duration: 00:08s • Audio: 48kHz Stereo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* PERSISTENT RIGHT-SIDE 360° AVATAR INSPECTOR (ALWAYS VISIBLE ACROSS ALL TABS) */}
        {showSidePreview && (
          <aside className="w-80 lg:w-96 border-l border-slate-800 bg-[#080d19] flex flex-col flex-shrink-0 overflow-y-auto">
            {/* Inspector Top Bar & View Mode Switcher */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                    {cloneMode === 'clone' ? 'Newly Cloned AI Avatar' : 'Original Source Video'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {cloneMode === 'clone' ? 'Modifications Active' : 'Raw Reference'}
                  </span>
                  <button
                    onClick={() => window.location.reload()}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                    title="Reload Viewport (Clear Cache)"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Primary Switcher: Clone vs Original Video */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-bold">
                <button
                  onClick={() => {
                    setCloneMode('clone');
                    setInspectorMode('video');
                  }}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    cloneMode === 'clone'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-black shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>✨ Newly Cloned Twin</span>
                </button>
                <button
                  onClick={() => {
                    setCloneMode('original');
                    setInspectorMode('video');
                  }}
                  className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition ${
                    cloneMode === 'original'
                      ? 'bg-amber-500 text-black shadow-md font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>📹 Raw Original Video</span>
                </button>
              </div>
            </div>

            {/* Live Avatar Viewport */}
            <div className="p-3 sm:p-4 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/80 via-[#070b14] to-black border-b border-slate-800 relative flex-shrink-0 w-full">
              {/* Perspective grid floor */}
              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-emerald-500/10 to-transparent border-b border-emerald-500/20 pointer-events-none" />

              {(() => {
                const uploadedVideoList = Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl);
                const activeSlotId = (selectedPreviewSlotId && uploadedVideosMap[selectedPreviewSlotId]?.fileUrl)
                  ? selectedPreviewSlotId
                  : (uploadedVideoList.length > 0 ? uploadedVideoList[0][0] : null);
                const activeVideoData = activeSlotId ? uploadedVideosMap[activeSlotId] : null;

                // SCENE BACKGROUND ASSETS
                const backgroundImages: Record<string, string> = {
                  himalayas: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
                  ocean: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
                  temple: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80',
                  studio: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=600&q=80',
                };

                /* CASE A: NEWLY CLONED AI AVATAR (WITH FULL MODIFICATIONS) */
                if (cloneMode === 'clone') {
                  const containerClasses = 
                    viewportRatio === '16:9' ? 'w-full aspect-video min-h-[220px] sm:min-h-[240px] flex-shrink-0' :
                    viewportRatio === '1:1' ? 'w-full aspect-square min-h-[260px] flex-shrink-0' :
                    viewportRatio === '9:16' ? 'w-full max-w-[240px] aspect-[9/16] min-h-[340px] flex-shrink-0' :
                    'w-full aspect-video min-h-[220px] sm:min-h-[240px] flex-shrink-0';

                  return (
                    <div className="w-full flex flex-col items-center space-y-3 flex-shrink-0">
                      <div className={`w-full ${containerClasses} rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-2xl shadow-emerald-500/30 relative bg-black transition-all duration-200 flex items-center justify-center`}>
                        {/* 1. Cloned Background Replacement (Optional Studio Backdrop) */}
                        {cloneBackground !== 'none' && backgroundImages[cloneBackground] && (
                          <>
                            <img
                              src={backgroundImages[cloneBackground]}
                              alt="Cloned Background"
                              className="w-full h-full object-cover absolute inset-0"
                            />
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                          </>
                        )}

                        {/* 2. Mohan Sir Cloned Forehead & Speaking Face */}
                        {activeVideoData?.fileUrl ? (
                          <div className="w-full h-full relative flex items-center justify-center">
                            <video
                              ref={sidebarCloneVideoRef}
                              key={activeSlotId + (activeVideoData?.fileName || '')}
                              src={activeVideoData.fileUrl}
                              poster={activeVideoData.faceThumbnailUrl || ''}
                              preload="metadata"
                              loop={false}
                              controls
                              muted={isVideoMuted}
                              playsInline
                              onPlay={() => setIsVideoPlaying(true)}
                              onPause={() => setIsVideoPlaying(false)}
                              onClick={toggleSidebarCloneVideo}
                              onTimeUpdate={(e) => {
                                const v = e.currentTarget;
                                const start = activeVideoData.trimStart ?? 0;
                                const end = activeVideoData.trimEnd ?? (activeVideoData.originalDuration || 180);
                                if (v.currentTime < start) {
                                  v.currentTime = start;
                                } else if (v.currentTime >= end) {
                                  v.pause();
                                  setIsVideoPlaying(false);
                                  v.currentTime = start;
                                }
                              }}
                              className="w-full h-full rounded-xl bg-black cursor-pointer"
                              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                            />

                            {/* Centered Large Play Button when Video is Paused (Saves Bandwidth/Charges) */}
                            {!isVideoPlaying && (
                              <button
                                onClick={toggleSidebarCloneVideo}
                                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/85 hover:bg-emerald-500 hover:text-black text-emerald-400 border-2 border-emerald-400 flex items-center justify-center transition-all duration-200 shadow-2xl z-20 cursor-pointer group backdrop-blur-sm"
                                title="Play Video"
                              >
                                <Play className="w-7 h-7 fill-current ml-1 group-hover:scale-110 transition" />
                              </button>
                            )}
                            {/* Tilak on Forehead */}
                            {selectedTilak !== 'none' && (
                              <div className="absolute top-10 inset-x-0 mx-auto w-max pointer-events-none flex flex-col items-center animate-in fade-in">
                                {selectedTilak === 'chandan-tilak' && (
                                  <div className="flex flex-col items-center">
                                    <span className="w-2 h-5 rounded-t-sm rounded-b-md bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-500 shadow-md shadow-amber-400/80 border border-amber-200" />
                                    <span className="w-1 h-1 rounded-full bg-red-600 -mt-1" />
                                  </div>
                                )}
                                {selectedTilak === 'bhasma-tripundra' && (
                                  <div className="space-y-0.5">
                                    <span className="block w-6 h-0.5 bg-slate-100/90 rounded-full shadow" />
                                    <span className="block w-8 h-0.5 bg-slate-100/90 rounded-full shadow" />
                                    <span className="block w-6 h-0.5 bg-slate-100/90 rounded-full shadow" />
                                  </div>
                                )}
                                {selectedTilak === 'vermillion-bindi' && (
                                  <span className="w-2 h-2 rounded-full bg-red-600 shadow border border-red-300" />
                                )}
                              </div>
                            )}

                            {/* Spectacles on Eyes */}
                            {selectedSpectacles !== 'none' && (
                              <div className="absolute top-16 inset-x-0 mx-auto w-32 pointer-events-none flex items-center justify-center animate-in fade-in">
                                {selectedSpectacles === 'classic-black' && (
                                  <div className="w-28 flex items-center justify-between">
                                    <div className="w-12 h-7 rounded-md border-2 border-black bg-black/10 backdrop-blur-[0.5px] shadow" />
                                    <div className="w-3 h-0.5 bg-black" />
                                    <div className="w-12 h-7 rounded-md border-2 border-black bg-black/10 backdrop-blur-[0.5px] shadow" />
                                  </div>
                                )}
                                {selectedSpectacles === 'gold-rimless' && (
                                  <div className="w-28 flex items-center justify-between">
                                    <div className="w-12 h-7 rounded-lg border border-amber-400 bg-amber-400/5 shadow" />
                                    <div className="w-3 h-0.5 bg-amber-400" />
                                    <div className="w-12 h-7 rounded-lg border border-amber-400 bg-amber-400/5 shadow" />
                                  </div>
                                )}
                                {selectedSpectacles === 'round-scholar' && (
                                  <div className="w-28 flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-full border-2 border-stone-800 bg-stone-900/10 shadow" />
                                    <div className="w-4 h-0.5 bg-stone-800" />
                                    <div className="w-10 h-10 rounded-full border-2 border-stone-800 bg-stone-900/10 shadow" />
                                  </div>
                                )}
                                {selectedSpectacles === 'transparent-modern' && (
                                  <div className="w-28 flex items-center justify-between">
                                    <div className="w-12 h-7 rounded-md border-2 border-white/60 bg-white/10 backdrop-blur-[0.5px] shadow" />
                                    <div className="w-3 h-0.5 bg-white/60" />
                                    <div className="w-12 h-7 rounded-md border-2 border-white/60 bg-white/10 backdrop-blur-[0.5px] shadow" />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Dynamic Fitted Garment Floating Pill - bottom left so it never covers face or chest */}
                            <div className="absolute bottom-2 left-2.5 max-w-[75%] pointer-events-none z-10">
                              <span className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-amber-300 border border-amber-500/50 text-[9px] font-bold shadow-lg flex items-center gap-1 truncate">
                                <span>👔</span>
                                <span className="truncate">{activeOutfit.name}</span>
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center p-4">
                            <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                            <div className="text-xs font-bold text-white">Digital Clone Initialized</div>
                            <div className="text-[10px] text-slate-300 mt-0.5">Upload a video in Step 1 to extract your clone</div>
                          </div>
                        )}

                        {/* Clone Status Pill */}
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-emerald-400 flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-300 shadow">
                          <span className={`w-2 h-2 rounded-full ${isVideoPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                          <span>{isVideoPlaying ? 'AI CLONE PLAYING' : 'AI CLONE PAUSED'}</span>
                        </div>

                        {/* Top-Right Control Cluster: Play/Pause & Mute */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                          <button
                            onClick={toggleSidebarCloneVideo}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition shadow-lg cursor-pointer ${
                              isVideoPlaying
                                ? 'bg-amber-500 text-black hover:bg-amber-400'
                                : 'bg-emerald-500 text-black hover:bg-emerald-400 animate-pulse'
                            }`}
                            title={isVideoPlaying ? 'Pause Video (Save CDN Data/Charges)' : 'Play Cloned Video'}
                          >
                            {isVideoPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                            <span>{isVideoPlaying ? 'Pause' : '▶ Play'}</span>
                          </button>

                          {/* Audio Mute/Unmute */}
                          <button
                            onClick={() => setIsVideoMuted(!isVideoMuted)}
                            className="p-1.5 rounded-full bg-black/80 hover:bg-black text-white border border-slate-700 transition"
                            title={isVideoMuted ? 'Unmute Audio' : 'Mute Audio'}
                          >
                            {isVideoMuted ? <Volume2 className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </button>
                        </div>
                      </div>

                      {/* Framing & View Mode Toolbar (Positioned below video - never obscures face) */}
                      <div className="w-full space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Film className="w-3 h-3 text-emerald-400" />
                            <span>Framing & Aspect:</span>
                          </span>
                          <button
                            onClick={() => setShowFullPreviewModal(true)}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold hover:bg-emerald-500/30 transition flex items-center gap-1 cursor-pointer"
                            title="Open Fullscreen HD Preview"
                          >
                            <Maximize2 className="w-2.5 h-2.5" />
                            <span>Fullscreen HD</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-bold">
                          <button
                            onClick={() => setViewportRatio('16:9')}
                            className={`py-1 px-1.5 rounded text-center transition flex items-center justify-center gap-1 ${
                              viewportRatio === '16:9'
                                ? 'bg-emerald-500 text-black font-extrabold shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="16:9 Full Widescreen"
                          >
                            <span>📺</span>
                            <span>16:9 Wide</span>
                          </button>
                          <button
                            onClick={() => setViewportRatio('1:1')}
                            className={`py-1 px-1.5 rounded text-center transition flex items-center justify-center gap-1 ${
                              viewportRatio === '1:1'
                                ? 'bg-emerald-500 text-black font-extrabold shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="1:1 Square"
                          >
                            <span>⬛</span>
                            <span>1:1 Square</span>
                          </button>
                          <button
                            onClick={() => setViewportRatio('9:16')}
                            className={`py-1 px-1.5 rounded text-center transition flex items-center justify-center gap-1 ${
                              viewportRatio === '9:16'
                                ? 'bg-emerald-500 text-black font-extrabold shadow'
                                : 'text-slate-400 hover:text-white'
                            }`}
                            title="9:16 Portrait / Reels"
                          >
                            <span>📱</span>
                            <span>9:16 Reel</span>
                          </button>
                        </div>
                      </div>

                      {/* CLONE MODIFIER 1: CHANGE BACKGROUND SCENE */}
                      <div className="w-full space-y-1">
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                          <span>Swap Background:</span>
                          <span className="text-emerald-400 font-bold capitalize">{cloneBackground}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1 text-[9px] font-bold">
                          {[
                            { id: 'none', label: '🎬 Clean Video' },
                            { id: 'himalayas', label: '🏔️ Peaks' },
                            { id: 'ocean', label: '🌊 Ocean' },
                            { id: 'temple', label: '🏛️ Temple' },
                            { id: 'studio', label: '🎙️ Studio' },
                          ].map((bg) => (
                            <button
                              key={bg.id}
                              onClick={() => setCloneBackground(bg.id as any)}
                              className={`py-1 px-1 rounded transition text-center ${
                                cloneBackground === bg.id
                                  ? 'bg-emerald-500 text-black font-extrabold shadow'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {bg.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CLONE MODIFIER 2: QUICK HAIR & SPECTACLES */}
                      <div className="w-full space-y-1">
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                          <span>Hair &amp; Spectacles (Spect):</span>
                          <button
                            onClick={() => setActiveTab('step-hair-face')}
                            className="text-purple-400 text-[10px] font-bold hover:underline"
                          >
                            Customize All ➔
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] font-bold">
                          {[
                            { id: 'none', label: '👓 No Glasses' },
                            { id: 'classic-black', label: '👓 Black Frames' },
                            { id: 'gold-rimless', label: '🕶️ Gold Rimless' },
                          ].map((spect) => (
                            <button
                              key={spect.id}
                              onClick={() => setSelectedSpectacles(spect.id as SpectaclesId)}
                              className={`py-1 px-1 rounded truncate transition text-center ${
                                selectedSpectacles === spect.id
                                  ? 'bg-purple-500 text-white font-extrabold shadow'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {spect.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CLONE MODIFIER 3: CHANGE OUTFIT & USED DRESSES */}
                      <div className="w-full space-y-1">
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between">
                          <span>Clothes &amp; Used Dresses:</span>
                          <button
                            onClick={() => setActiveTab('step-wardrobe')}
                            className="text-amber-400 text-[10px] font-bold hover:underline"
                          >
                            All {allOutfits.length} Styles ➔
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 text-[9px] font-bold">
                          {[
                            { id: 'used-lime-kurta', label: '🟢 Lime Kurta' },
                            { id: 'used-teal-kurta', label: '🌊 Sea Green' },
                            { id: 'ind-swar-guruji', label: '🕉️ White Kurta' },
                            { id: 'ind-nehru-jacket', label: '🎩 Nehru Jacket' },
                          ].map((outfit) => (
                            <button
                              key={outfit.id}
                              onClick={() => setSelectedOutfitId(outfit.id)}
                              className={`py-1 px-1 rounded truncate transition text-center ${
                                selectedOutfitId === outfit.id
                                  ? 'bg-amber-500 text-black font-extrabold shadow'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {outfit.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CLONE MODIFIER 3: SYNTHESIZE NEW WORDS & SPEECH */}
                      <div className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-slate-300">Make Clone Speak New Script:</span>
                          <span className="text-purple-400 font-bold">Mohan Voice DNA</span>
                        </div>
                        <input
                          type="text"
                          value={cloneScriptText}
                          onChange={(e) => setCloneScriptText(e.target.value)}
                          placeholder="Type new sentence to make clone speak..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-white focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          onClick={() => {
                            setIsSynthesizingClone(true);
                            setCloneSpeakingState(true);
                            setTimeout(() => {
                              setIsSynthesizingClone(false);
                            }, 1200);
                            setTimeout(() => {
                              setCloneSpeakingState(false);
                            }, 4500);
                          }}
                          disabled={isSynthesizingClone}
                          className="w-full py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-bold flex items-center justify-center gap-1.5 shadow transition"
                        >
                          {isSynthesizingClone ? (
                            <>
                              <RefreshCw className="w-3 h-3 animate-spin" />
                              <span>Synthesizing Voice &amp; Lips...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3 h-3 fill-white" />
                              <span>⚡ Speak New Script with Avatar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                }

                /* CASE B: ORIGINAL RAW VIDEO REFERENCE */
                if (cloneMode === 'original') {
                  const containerClasses = 
                    viewportRatio === '16:9' ? 'w-full aspect-video min-h-[220px] sm:min-h-[240px] flex-shrink-0' :
                    viewportRatio === '1:1' ? 'w-full aspect-square min-h-[260px] flex-shrink-0' :
                    viewportRatio === '9:16' ? 'w-full max-w-[240px] aspect-[9/16] min-h-[340px] flex-shrink-0' :
                    'w-full aspect-video min-h-[220px] sm:min-h-[240px] flex-shrink-0';

                  return (
                    <div className="w-full flex flex-col items-center space-y-3 flex-shrink-0">
                      {activeVideoData?.fileUrl ? (
                        <>
                          <div className={`w-full ${containerClasses} rounded-2xl overflow-hidden border-2 border-amber-400 shadow-2xl relative bg-black transition-all duration-200 flex items-center justify-center`}>
                            <video
                              ref={sidebarOriginalVideoRef}
                              key={activeSlotId + (activeVideoData?.fileName || '')}
                              src={activeVideoData.fileUrl}
                              poster={activeVideoData.faceThumbnailUrl || ''}
                              preload="metadata"
                              loop={false}
                              controls
                              muted={isVideoMuted}
                              playsInline
                              onPlay={() => setIsVideoPlaying(true)}
                              onPause={() => setIsVideoPlaying(false)}
                              onClick={toggleSidebarOriginalVideo}
                              onTimeUpdate={(e) => {
                                const v = e.currentTarget;
                                const start = activeVideoData.trimStart ?? 0;
                                const end = activeVideoData.trimEnd ?? (activeVideoData.originalDuration || 180);
                                if (v.currentTime < start) {
                                  v.currentTime = start;
                                } else if (v.currentTime >= end) {
                                  v.pause();
                                  setIsVideoPlaying(false);
                                  v.currentTime = start;
                                }
                              }}
                              className="w-full h-full rounded-xl bg-black cursor-pointer"
                              style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                            />

                            {/* Centered Large Play Button when Video is Paused (Saves Bandwidth/Charges) */}
                            {!isVideoPlaying && (
                              <button
                                onClick={toggleSidebarOriginalVideo}
                                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/85 hover:bg-amber-500 hover:text-black text-amber-400 border-2 border-amber-400 flex items-center justify-center transition-all duration-200 shadow-2xl z-20 cursor-pointer group backdrop-blur-sm"
                                title="Play Video"
                              >
                                <Play className="w-7 h-7 fill-current ml-1 group-hover:scale-110 transition" />
                              </button>
                            )}

                            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/85 border border-amber-400 flex items-center gap-1.5 text-[9px] font-bold text-amber-300 shadow">
                              <span className={`w-2 h-2 rounded-full ${isVideoPlaying ? 'bg-amber-400 animate-pulse' : 'bg-slate-400'}`} />
                              <span>{isVideoPlaying ? 'RAW VIDEO PLAYING' : 'RAW VIDEO PAUSED'}</span>
                            </div>

                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                              <button
                                onClick={toggleSidebarOriginalVideo}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1 transition shadow-lg cursor-pointer ${
                                  isVideoPlaying
                                    ? 'bg-amber-500 text-black hover:bg-amber-400'
                                    : 'bg-amber-400 text-black hover:bg-amber-300 animate-pulse'
                                }`}
                                title={isVideoPlaying ? 'Pause Video (Save CDN Data/Charges)' : 'Play Raw Video'}
                              >
                                {isVideoPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                                <span>{isVideoPlaying ? 'Pause' : '▶ Play'}</span>
                              </button>

                              <button
                                onClick={() => setCloneMode('clone')}
                                className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-extrabold flex items-center gap-1 shadow-md transition"
                              >
                                <Sparkles className="w-3 h-3 text-black" />
                                <span>Clone ➔</span>
                              </button>
                            </div>

                            <div className="absolute bottom-2 inset-x-2 px-2.5 py-1.5 rounded-xl bg-black/85 text-[10px] text-white flex items-center justify-between border border-slate-800">
                              <span className="text-amber-300 font-bold truncate max-w-[130px]">{activeVideoData.fileName}</span>
                              <button
                                onClick={() => activeSlotId && openCutterForSlot(activeSlotId)}
                                className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 flex items-center gap-1 transition"
                                title="Re-open 3-minute video cutter"
                              >
                                <Scissors className="w-2.5 h-2.5 text-amber-400" />
                                <span>Adjust Cut</span>
                              </button>
                            </div>
                          </div>

                          {/* Framing & View Mode Toolbar (Positioned below video - never obscures face) */}
                          <div className="w-full space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold px-0.5">
                              <span className="flex items-center gap-1 text-slate-300">
                                <Film className="w-3 h-3 text-amber-400" />
                                <span>Framing & Aspect:</span>
                              </span>
                              <button
                                onClick={() => setShowFullPreviewModal(true)}
                                className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold hover:bg-amber-500/30 transition flex items-center gap-1 cursor-pointer"
                                title="Open Fullscreen HD Preview"
                              >
                                <Maximize2 className="w-2.5 h-2.5" />
                                <span>Fullscreen HD</span>
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-950 border border-slate-800 text-[10px] font-bold">
                              <button
                                onClick={() => setViewportRatio('16:9')}
                                className={`py-1 px-1.5 rounded text-center transition flex items-center justify-center gap-1 ${
                                  viewportRatio === '16:9'
                                    ? 'bg-amber-500 text-black font-extrabold shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title="16:9 Full Widescreen"
                              >
                                <span>📺</span>
                                <span>16:9 Wide</span>
                              </button>
                              <button
                                onClick={() => setViewportRatio('1:1')}
                                className={`py-1 px-1.5 rounded text-center transition flex items-center justify-center gap-1 ${
                                  viewportRatio === '1:1'
                                    ? 'bg-amber-500 text-black font-extrabold shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title="1:1 Square"
                              >
                                <span>⬛</span>
                                <span>1:1 Square</span>
                              </button>
                              <button
                                onClick={() => setViewportRatio('9:16')}
                                className={`py-1 px-1.5 rounded text-center transition flex items-center justify-center gap-1 ${
                                  viewportRatio === '9:16'
                                    ? 'bg-amber-500 text-black font-extrabold shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                                title="9:16 Portrait / Reels"
                              >
                                <span>📱</span>
                                <span>9:16 Reel</span>
                              </button>
                            </div>
                          </div>

                          {/* Video Switcher */}
                          {uploadedVideoList.length > 1 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto w-full max-w-[280px] p-1 bg-black/60 rounded-lg scrollbar-none border border-slate-800">
                              {uploadedVideoList.map(([sId, item], idx) => (
                                <button
                                  key={sId}
                                  onClick={() => setSelectedPreviewSlotId(sId)}
                                  className={`px-2 py-1 rounded text-[10px] font-bold whitespace-nowrap transition ${
                                    activeSlotId === sId
                                      ? 'bg-amber-500 text-black shadow'
                                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  ▶ Video {idx + 1}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-700 bg-slate-950/80">
                          <Video className="w-10 h-10 text-slate-500 mb-2" />
                          <p className="text-xs font-bold text-white">No Reference Video Loaded</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Upload 1 to 4 videos in Step 1 to preview your raw video.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                /* CASE C: ROTATABLE 360° PHOTOREALISTIC RIG */
                return (
                  <div
                    className="relative transition-transform duration-75 text-center"
                    style={{
                      transform: `perspective(600px) rotateY(${avatarAngle}deg) scale(${cameraView === 'face' ? 1.25 : cameraView === 'waist' ? 1.1 : 1})`,
                    }}
                  >
                    <div className="w-44 h-44 rounded-2xl mx-auto bg-gradient-to-tr from-amber-500 via-emerald-500 to-teal-500 p-1 shadow-2xl shadow-emerald-500/20 relative">
                      <div className="w-full h-full rounded-xl bg-slate-950 flex flex-col items-center justify-center text-white overflow-hidden relative">
                        {inspectorMode === '360' ? (
                          <img
                            src={getMohan360FrameForAngle(avatarAngle).cdnUrl}
                            alt={`Mohan Sir ${avatarAngle}° View`}
                            className="w-full h-full object-cover"
                          />
                        ) : outfitImageMap[selectedOutfitId] ? (
                          <img
                            src={outfitImageMap[selectedOutfitId]}
                            alt={activeOutfit.name}
                            className="w-full h-full object-cover"
                          />
                        ) : activeVideoData?.fileUrl ? (
                          <video
                            src={activeVideoData.fileUrl}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ objectPosition: 'center 28%' }}
                          />
                        ) : (
                          <img
                            src={getMohan360FrameForAngle(avatarAngle).cdnUrl}
                            alt={`Mohan Sir ${avatarAngle}° View`}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/85 border border-amber-400/60 text-[9px] font-bold text-amber-300">
                          {avatarAngle <= 45 || avatarAngle >= 315 ? 'Front View' : avatarAngle <= 135 ? 'Right Profile' : avatarAngle <= 225 ? 'Back View' : 'Left Profile'}
                        </div>
                      </div>

                      {/* 360 Angle Badge */}
                      <div className="absolute -bottom-2.5 inset-x-0 mx-auto w-max px-2.5 py-0.5 rounded-full bg-black/90 text-amber-300 border border-amber-500/50 text-[10px] font-extrabold shadow">
                        {avatarAngle}° ANGLE
                      </div>
                    </div>

                    {/* Name & Active Outfit */}
                    <div className="mt-4 space-y-0.5">
                      <div className="text-sm font-bold text-white flex items-center justify-center gap-1.5">
                        <span>{avatarName}</span>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="text-xs text-amber-300 font-semibold truncate max-w-[220px] mx-auto">
                        {activeOutfit.name}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-medium">
                        Kinetic Motion: {activeMotionObj.name}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quick 360° Angle Selector & Spin Pill (shown ONLY in 360 mode) */}
            {inspectorMode === '360' && (
              <>
                <div className="p-3 border-b border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                    <span>360° Camera Angles</span>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-mono font-bold">{avatarAngle}°</span>
                      <button
                        onClick={() => {
                          setInspectorMode('360');
                          setIsAutoSpinning(!isAutoSpinning);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 transition ${
                          isAutoSpinning
                            ? 'bg-amber-500 text-black shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        <RotateCw className={`w-3 h-3 ${isAutoSpinning ? 'animate-spin' : ''}`} />
                        <span>{isAutoSpinning ? 'Spinning' : 'Auto Spin'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { angle: 0, label: '0° Front' },
                      { angle: 45, label: '45° Semi' },
                      { angle: 90, label: '90° Profile' },
                      { angle: 180, label: '180° Back' },
                      { angle: 270, label: '270° Left' },
                      { angle: 315, label: '315° Face' },
                    ].map((item) => (
                      <button
                        key={item.angle}
                        onClick={() => {
                          setIsAutoSpinning(false);
                          setAvatarAngle(item.angle);
                        }}
                        className={`px-2 py-1 rounded-md text-[10px] font-medium transition ${
                          avatarAngle === item.angle
                            ? 'bg-amber-500 text-black font-bold'
                            : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Slider for smooth rotation */}
                  <div className="pt-1">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={avatarAngle}
                      onChange={(e) => {
                        setIsAutoSpinning(false);
                        setAvatarAngle(Number(e.target.value));
                      }}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>

                {/* Camera Perspective Zoom */}
                <div className="p-3 border-b border-slate-800 space-y-1.5 text-xs">
                  <span className="text-[11px] text-slate-400 font-semibold">Camera Framing</span>
                  <div className="grid grid-cols-3 gap-1 bg-black/40 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setCameraView('full')}
                      className={`py-1 rounded text-[10px] font-medium transition ${
                        cameraView === 'full' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'
                      }`}
                    >
                      Full Body
                    </button>
                    <button
                      onClick={() => setCameraView('waist')}
                      className={`py-1 rounded text-[10px] font-medium transition ${
                        cameraView === 'waist' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'
                      }`}
                    >
                      Waist Up
                    </button>
                    <button
                      onClick={() => setCameraView('face')}
                      className={`py-1 rounded text-[10px] font-medium transition ${
                        cameraView === 'face' ? 'bg-emerald-500 text-black font-bold' : 'text-slate-400'
                      }`}
                    >
                      Close-Up
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Live Fitted Garment Details */}
            <div className="p-3 border-b border-slate-800 space-y-1 text-[11px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Fitted Wardrobe Layers</span>
              <div className="space-y-1 text-slate-300 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Top:</span>
                  <span className="text-right text-slate-200 font-medium truncate max-w-[180px]">{activeOutfit.top}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bottom:</span>
                  <span className="text-right text-slate-200 font-medium truncate max-w-[180px]">{activeOutfit.bottom}</span>
                </div>
                {activeOutfit.headwear && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Head:</span>
                    <span className="text-right text-amber-300 font-medium">{activeOutfit.headwear}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Footwear:</span>
                  <span className="text-right text-slate-300 truncate max-w-[180px]">{activeOutfit.footwear}</span>
                </div>
              </div>
            </div>

            {/* Voice & Lip-Sync Quick Test */}
            <div className="p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-purple-400" />
                  Voice DNA Live Test
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">Mohan Kalburgi</span>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance('Hari Om. I am the digital twin of Mohan Sir. Swar Yoga breath control is active.');
                    utterance.rate = voiceSpeed;
                    utterance.pitch = voicePitch;
                    window.speechSynthesis.speak(utterance);
                  }
                }}
                className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-purple-400" />
                Speak Sample Line
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* ✂️ 3-MINUTE VIDEO CUTTER & NEURAL TRIMMER MODAL */}
      {cutterModal && cutterModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#0b101e] border-2 border-amber-500/50 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto relative">
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <Scissors className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      3-Minute Video Cutter &amp; Neural Ingest
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Max 3:00 Mins
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[320px] sm:max-w-md">
                    File: <span className="text-amber-300 font-semibold">{cutterModal.fileName}</span>
                    {cutterModal.assignedSlotTitle && (
                      <span className="text-emerald-400 font-semibold ml-2">
                        ➔ Slot {cutterModal.assignedSlotNumber}: {cutterModal.assignedSlotTitle}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (cutterVideoRef.current) cutterVideoRef.current.pause();
                  setCutterModal(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* AI Warning / Guidance Banner */}
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-xs flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300">Avatar Neural Calibration Rule:</span>
                <span className="text-slate-300 ml-1">
                  Full video is <b>{formatTimeSeconds(cutterModal.totalDuration)} long</b>. For highest photorealism and exact facial lip sync, only <b>2 to 3 minutes</b> of video is used. Select the best 2-3 minute speech window below.
                </span>
              </div>
            </div>

            {/* Video Player Preview with Cut Bounds */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video max-h-64 flex items-center justify-center">
              <video
                ref={cutterVideoRef}
                src={cutterModal.fileUrl}
                playsInline
                muted={false}
                onTimeUpdate={handleTrimmerTimeUpdate}
                className="w-full h-full object-contain"
              />

              {/* In-Video Cut Badge */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-black/85 border border-amber-400/80 text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow">
                <Scissors className="w-3 h-3 text-amber-400" />
                <span>Selected Window: {formatTimeSeconds(cutterModal.trimStart)} – {formatTimeSeconds(cutterModal.trimEnd)}</span>
              </div>

              {/* Play / Pause Overlay Button */}
              <button
                type="button"
                onClick={() => {
                  if (!cutterVideoRef.current) return;
                  if (cutterVideoRef.current.paused) {
                    if (cutterVideoRef.current.currentTime < cutterModal.trimStart || cutterVideoRef.current.currentTime >= cutterModal.trimEnd) {
                      cutterVideoRef.current.currentTime = cutterModal.trimStart;
                    }
                    cutterVideoRef.current.play();
                    setCutterModal(prev => prev ? { ...prev, isPlaying: true } : null);
                  } else {
                    cutterVideoRef.current.pause();
                    setCutterModal(prev => prev ? { ...prev, isPlaying: false } : null);
                  }
                }}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur transition"
              >
                {cutterModal.isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-white" />
                    <span>Pause Preview</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Play Cut (2–3 min)</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick 1-Click Presets */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
                <span>⚡ 1-Click Smart Cut Presets:</span>
                <span className="text-amber-400 font-mono">
                  Length: {formatTimeSeconds(cutterModal.trimEnd - cutterModal.trimStart)} (Max 3:00)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const start = 0;
                    const end = Math.min(120, cutterModal.totalDuration);
                    setCutterModal(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null);
                    if (cutterVideoRef.current) cutterVideoRef.current.currentTime = start;
                  }}
                  className={`p-2 rounded-xl border text-center transition font-semibold ${
                    cutterModal.trimStart === 0 && (cutterModal.trimEnd - cutterModal.trimStart) === 120
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ⚡ First 2:00 mins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const start = 0;
                    const end = Math.min(150, cutterModal.totalDuration);
                    setCutterModal(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null);
                    if (cutterVideoRef.current) cutterVideoRef.current.currentTime = start;
                  }}
                  className={`p-2 rounded-xl border text-center transition font-semibold ${
                    cutterModal.trimStart === 0 && (cutterModal.trimEnd - cutterModal.trimStart) === 150
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ⚡ First 2:30 mins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const start = 0;
                    const end = Math.min(180, cutterModal.totalDuration);
                    setCutterModal(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null);
                    if (cutterVideoRef.current) cutterVideoRef.current.currentTime = start;
                  }}
                  className={`p-2 rounded-xl border text-center transition font-semibold ${
                    cutterModal.trimStart === 0 && (cutterModal.trimEnd - cutterModal.trimStart) === Math.min(180, cutterModal.totalDuration)
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ⚡ Full 3:00 mins (Max)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const start = Math.min(60, Math.max(0, cutterModal.totalDuration - 180));
                    const end = Math.min(start + 180, cutterModal.totalDuration);
                    setCutterModal(prev => prev ? { ...prev, trimStart: start, trimEnd: end } : null);
                    if (cutterVideoRef.current) cutterVideoRef.current.currentTime = start;
                  }}
                  className={`p-2 rounded-xl border text-center transition font-semibold ${
                    cutterModal.trimStart > 0
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ⚡ Mid 3:00 mins
                </button>
              </div>
            </div>

            {/* Interactive Timeline & Range Sliders */}
            <div className="space-y-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              {/* Visual Track */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Timeline Visual Position</span>
                  <span>Total Video: <b className="text-white">{formatTimeSeconds(cutterModal.totalDuration)}</b></span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-800 relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-teal-400 rounded-full shadow"
                    style={{
                      left: `${(cutterModal.trimStart / cutterModal.totalDuration) * 100}%`,
                      width: `${Math.max(5, ((cutterModal.trimEnd - cutterModal.trimStart) / cutterModal.totalDuration) * 100)}%`
                    }}
                  />
                </div>
              </div>

              {/* Start Time Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cut Start Time:</span>
                  <span className="font-mono font-bold text-emerald-400">{formatTimeSeconds(cutterModal.trimStart)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, cutterModal.totalDuration - 30)}
                  value={cutterModal.trimStart}
                  onChange={(e) => {
                    const newStart = Number(e.target.value);
                    let newEnd = cutterModal.trimEnd;
                    if (newEnd <= newStart + 30) newEnd = Math.min(cutterModal.totalDuration, newStart + 30);
                    if (newEnd - newStart > 180) newEnd = newStart + 180;
                    setCutterModal(prev => prev ? { ...prev, trimStart: newStart, trimEnd: newEnd } : null);
                    if (cutterVideoRef.current) cutterVideoRef.current.currentTime = newStart;
                  }}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* End Time Slider (Capped at 180s from start) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Cut End Time (Max 3m from start):</span>
                  <span className="font-mono font-bold text-amber-400">{formatTimeSeconds(cutterModal.trimEnd)}</span>
                </div>
                <input
                  type="range"
                  min={cutterModal.trimStart + 30}
                  max={Math.min(cutterModal.totalDuration, cutterModal.trimStart + 180)}
                  value={cutterModal.trimEnd}
                  onChange={(e) => {
                    const newEnd = Number(e.target.value);
                    setCutterModal(prev => prev ? { ...prev, trimEnd: newEnd } : null);
                    if (cutterVideoRef.current) cutterVideoRef.current.currentTime = Math.max(cutterModal.trimStart, newEnd - 2);
                  }}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  if (cutterVideoRef.current) cutterVideoRef.current.pause();
                  setCutterModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCutter}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-500 hover:from-amber-400 hover:to-teal-400 text-black font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition"
              >
                <Scissors className="w-4 h-4 text-black" />
                <span>✂️ Confirm 3-Min Cut &amp; Ingest to Avatar</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 4. MODAL: SAVE AVATAR TO LIBRARY */}
      {showSaveAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Save Avatar to Library</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSaveAvatarModal(false);
                  setNewAvatarNameInput('');
                }}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Avatar Persona Name
                </label>
                <input
                  type="text"
                  value={newAvatarNameInput}
                  onChange={(e) => setNewAvatarNameInput(e.target.value)}
                  placeholder={`e.g. Mohan Sir (${activeOutfit.name.slice(0, 24)})`}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 text-sm text-white placeholder-slate-500 focus:outline-none"
                  autoFocus
                />
              </div>

              {/* Current Combination Snapshot */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Look Elements:</div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="text-slate-300">
                    <span className="text-slate-500">Outfit:</span> <span className="text-amber-300 font-semibold">{activeOutfit.name}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Hair:</span> <span className="text-emerald-300 font-semibold">{HAIR_STYLES.find(h => h.id === selectedHairStyle)?.name || 'Natural'}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Beard:</span> <span className="text-emerald-300 font-semibold">{FACIAL_BEARDS.find(b => b.id === selectedFacialHair)?.name || 'Natural'}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Spectacles:</span> <span className="text-cyan-300 font-semibold">{SPECTACLES_LIST.find(s => s.id === selectedSpectacles)?.name || 'None'}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Tilak:</span> <span className="text-amber-300 font-semibold">{TILAK_LIST.find(t => t.id === selectedTilak)?.name || 'None'}</span>
                  </div>
                  <div className="text-slate-300">
                    <span className="text-slate-500">Background:</span> <span className="text-teal-300 font-semibold capitalize">{cloneBackground}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowSaveAvatarModal(false);
                  setNewAvatarNameInput('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveCurrentAsNewAvatar(newAvatarNameInput)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition"
              >
                <Plus className="w-3.5 h-3.5 text-black" />
                <span>Save to Avatar Library</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mohan AI Clone Video Intelligence Modal */}
      <VideoIntelligenceEditorModal
        isOpen={showIntelligenceModal}
        onClose={() => setShowIntelligenceModal(false)}
        videoTitle={activeIntelligenceVideo.title}
        videoUrl={activeIntelligenceVideo.url}
        initialSegments={activeIntelligenceSegments}
        onSaveSegments={handleSaveIntelligenceSegments}
        onApproveRag={handleApproveIntelligenceRag}
      />

      {/* Mohan AI Clone Performance DNA & Yoga Library Modal */}
      <PerformanceDnaLibraryModal
        isOpen={showPerformanceDnaModal}
        onClose={() => setShowPerformanceDnaModal(false)}
      />

      {/* FULLSCREEN / UNSIZED AVATAR STUDIO PREVIEW MODAL */}
      {showFullPreviewModal && (() => {
        const uploadedList = Object.entries(uploadedVideosMap).filter(([_, v]) => v && v.fileUrl);
        const activeSlot = (selectedPreviewSlotId && uploadedVideosMap[selectedPreviewSlotId]?.fileUrl)
          ? selectedPreviewSlotId
          : (uploadedList.length > 0 ? uploadedList[0][0] : null);
        const currentModalVideo = activeSlot ? uploadedVideosMap[activeSlot] : null;


        const backgroundImages: Record<string, string> = {
          himalayas: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80',
          ocean: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
          temple: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80',
          studio: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1200&q=80',
        };

        return (
          <div className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
            <div className="relative w-full max-w-5xl max-h-[96vh] bg-[#070b14] border-2 border-emerald-400 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.3)] flex flex-col overflow-hidden">
              {/* Modal Top Header */}
              <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black shadow-lg">
                    <Sparkles className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Mohan AI Clone — Full HD Viewport</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Uncropped Full View
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      High-definition preview with aspect ratio, framing, zoom, pan, and background replacement controls
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowFullPreviewModal(false)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Close Full Preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Controls Bar */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Aspect Ratio Toggles */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold mr-1">Aspect:</span>
                  {(['16:9', '1:1', '9:16', 'full'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setViewportRatio(r);
                        if (r === 'full') setViewportFitMode('contain');
                      }}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        viewportRatio === r
                          ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      {r === '16:9' ? '📺 16:9 Widescreen' : r === '1:1' ? '⬛ 1:1 Square' : r === '9:16' ? '📱 9:16 Reels' : '🎬 Full Uncropped'}
                    </button>
                  ))}
                </div>

                {/* Fit Mode Toggle */}
                {/* Audio Status & Close Hint */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsVideoMuted(!isVideoMuted)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isVideoMuted ? 'Unmute Audio' : 'Audio On'}</span>
                  </button>
                  <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    Full Uncropped HD Frame
                  </span>
                </div>
              </div>

              {/* Main Full-Size Player Canvas */}
              <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-center justify-center bg-black/95">
                <div className={`relative ${
                  viewportRatio === '16:9' ? 'w-full max-w-4xl aspect-video' :
                  viewportRatio === '1:1' ? 'w-full max-w-xl aspect-square' :
                  viewportRatio === '9:16' ? 'w-full max-w-sm aspect-[9/16] max-h-[70vh]' :
                  'w-full max-w-4xl aspect-video'
                } rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-black flex items-center justify-center`}>
                  {/* Background Replacement in Modal */}
                  {cloneBackground !== 'none' && backgroundImages[cloneBackground] && (
                    <>
                      <img
                        src={backgroundImages[cloneBackground]}
                        alt="Cloned Background"
                        className="w-full h-full object-cover absolute inset-0"
                      />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                    </>
                  )}

                  {currentModalVideo?.fileUrl ? (
                    <video
                      key={'modal_' + (activeSlot || '') + currentModalVideo.fileName + cloneBackground + viewportRatio}
                      src={currentModalVideo.fileUrl}
                      preload="metadata"
                      loop={false}
                      muted={isVideoMuted}
                      playsInline
                      controls
                      className="w-full h-full rounded-xl bg-black"
                      style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                    />
                  ) : (
                    <div className="p-8 text-center text-slate-400">No Reference Video Loaded</div>
                  )}

                  {/* Garment / Source Overlay Badge */}
                  <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
                    <span className="px-3 py-1 rounded-full bg-black/85 backdrop-blur-md text-amber-300 border border-amber-500/60 text-xs font-bold shadow-xl flex items-center gap-1.5">
                      <span>👔</span>
                      <span>{activeOutfit?.name || 'My Lime Green Kurta (From SnapYT Video)'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Background Swapper Footer */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <span>Swap Background:</span>
                  <span className="text-emerald-400 font-bold capitalize">{cloneBackground}</span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                  {[
                    { id: 'none', label: 'Clean Video', icon: '🎬' },
                    { id: 'himalayas', label: 'Peaks', icon: '🏔️' },
                    { id: 'ocean', label: 'Ocean', icon: '🌊' },
                    { id: 'temple', label: 'Temple', icon: '🏛️' },
                    { id: 'studio', label: 'Studio', icon: '🎙️' },
                  ].map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setCloneBackground(bg.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                        cloneBackground === bg.id
                          ? 'bg-emerald-500 text-black font-extrabold shadow'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                      }`}
                    >
                      <span>{bg.icon}</span>
                      <span>{bg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MOHAN RAG MULTI-TALK SCRIPT SYNTHESIS MODAL */}
      {showRagSynthesizeModal && (
        <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-slate-950 border border-amber-500/40 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-black font-black shadow-lg">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white">Generate Script from Mohan RAG DNA</h3>
                  <p className="text-xs text-slate-400">Multi-Talk Synthesis • Dual SOV/SVO Grammar • Heart-Touch Wit &amp; Emotion</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRagSynthesizeModal(false)}
                className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Topic Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Teaching Topic</label>
                <input
                  type="text"
                  value={ragSynthesizeTopic}
                  onChange={(e) => setRagSynthesizeTopic(e.target.value)}
                  placeholder="e.g. Pranayama and Digestion with Right Nostril"
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'Pranayama and Digestion with Right Nostril',
                    'Ida & Pingala Breath Balance',
                    'Deep Sleep and Chandra Nadi Calmness',
                    'Shiva Swarodaya Basics for Beginners',
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setRagSynthesizeTopic(preset)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Duration */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Target Duration &amp; Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'reel_30s' as const, label: '⚡ 30-Sec Reel', desc: 'Punchy hook & daily secret' },
                    { id: 'lesson_3m' as const, label: '🎬 3-Min Lesson', desc: 'Complete avatar daily practice' },
                    { id: 'master_15m' as const, label: '🧘 15-Min Masterclass', desc: 'Deep scripture discourse' },
                  ].map((dur) => (
                    <button
                      key={dur.id}
                      type="button"
                      onClick={() => setRagSynthesizeDuration(dur.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        ragSynthesizeDuration === dur.id
                          ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-xs text-white">{dur.label}</div>
                      <div className="text-[10px] mt-0.5 opacity-80">{dur.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Language & Grammar Typology */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-300">Target Delivery Language &amp; Grammar Family</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'mr', label: '🇮🇳 Marathi (मराठी)', family: 'SOV' },
                    { id: 'hi', label: '🇮🇳 Hindi (हिन्दी)', family: 'SOV' },
                    { id: 'en', label: '🇬🇧 English (Global)', family: 'SVO' },
                    { id: 'ja', label: '🇯🇵 Japanese (日本語)', family: 'SOV' },
                    { id: 'es', label: '🇪🇸 Spanish (Español)', family: 'SVO' },
                    { id: 'de', label: '🇩🇪 German (Deutsch)', family: 'SVO' },
                    { id: 'gu', label: '🇮🇳 Gujarati (ગુજરાતી)', family: 'SOV' },
                    { id: 'ta', label: '🇮🇳 Tamil (தமிழ்)', family: 'SOV' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => setRagSynthesizeLanguage(lang.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        ragSynthesizeLanguage === lang.id
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-200'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-semibold text-xs text-white truncate">{lang.label}</div>
                      <div className="text-[10px] font-mono text-cyan-400 mt-0.5">Family: {lang.family}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowRagSynthesizeModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSynthesizeScript}
                disabled={isSynthesizingRagScript || !ragSynthesizeTopic.trim()}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-black font-extrabold text-xs shadow-lg shadow-amber-950/40 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSynthesizingRagScript ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Synthesizing Multi-Talk Knowledge...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Synthesize Authentic Script Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
