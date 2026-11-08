'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  Video,
  Download,
  Copy,
  Check,
  Search,
  Filter,
  Sparkles,
  Maximize2,
  X,
  Volume2,
  VolumeX,
  Layers,
  Film,
  Zap,
  Globe2,
  Share2
} from 'lucide-react';

export interface GeneratedAvatarItem {
  id: string;
  title: string;
  category: string;
  look_name: string;
  color: string;
  lecture_no: number;
  is_primary?: boolean;
  resolution: string;
  audio_rate: string;
  filename: string;
  size_mb: string;
  cdn_url: string;
  description: string;
  topics: string[];
}

export const ALL_MOHAN_AI_AVATARS: GeneratedAvatarItem[] = [
  {
    "id": "avatar_green_look_01",
    "title": "Mohan sir- Green Look (Swar Yoga Day-1)",
    "category": "green_look",
    "look_name": "Forest Green Kurta (\u0939\u0930\u093f\u0924 \u0915\u0941\u0930\u094d\u0924\u093e)",
    "color": "#15803D",
    "lecture_no": 0,
    "is_primary": true,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_avatar_green_look_2K_1794164086.mp4",
    "size_mb": "24.2",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_avatar_green_look_2K_1794164086.mp4",
    "description": "100% Front-Facing sitting pose, white textured brick wall backdrop, crisp single natural mouth and sharp eye pupils.",
    "topics": [
      "Swar Yoga Day-1 Foundation",
      "Elemental Balance",
      "Green Sadhana Look"
    ]
  },
  {
    "id": "avatar_closeup_master_04",
    "title": "Mohan Sir - 1080p Studio Close-Up Master",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Robe (\u092a\u0940\u0924\u093e\u0902\u092c\u0930 \u091a\u094b\u0932\u093e)",
    "color": "#D97706",
    "lecture_no": 4,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_4_2K_closeup_1794157356.mp4",
    "size_mb": "17.3",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_4_2K_closeup_1794157356.mp4",
    "description": "Chest-up studio framing with 700px facial detail, zero blur, and natural blinking eye pupils.",
    "topics": [
      "Close-Up Studio Master",
      "Jatharagni & Surya Swar",
      "High-Definition Lip-Sync"
    ]
  },
  {
    "id": "avatar_herbal_lime_master_04",
    "title": "Mohan Sir - Herbal Lime Ayurvedic Master",
    "category": "herbal_lime",
    "look_name": "Herbal Lime Kurta (\u0906\u092f\u0941\u0930\u094d\u0935\u0947\u0926\u093f\u0915 \u0939\u0930\u093f\u0924)",
    "color": "#65A30D",
    "lecture_no": 4,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_4_2K_herbal_lime_master.mp4",
    "size_mb": "57.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_4_2K_herbal_lime_master.mp4",
    "description": "Herbal lime attire for Swar Aahar Shastra and Ayurvedic digestive lecture sequences.",
    "topics": [
      "Swar Aahar Shastra",
      "Jatharagni",
      "Ayurvedic Diet"
    ]
  },
  {
    "id": "avatar_dna_01",
    "title": "Mohan Sir - DNA #01: Swar Yoga Foundation & Pranic Inhalation (Hindi 4K Master)",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 1,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_1_2K_golden_ochre_angavastram.mp4",
    "size_mb": "17.4",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_1_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #1",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_02",
    "title": "Mohan Sir - DNA #02: Swar Yoga Sheetala & Chandra Swar Awakening (Hindi)",
    "category": "white_khadi",
    "look_name": "Vedic Pure White Khadi (\u0936\u0941\u0926\u094d\u0927 \u0936\u094d\u0935\u0947\u0924 \u0916\u093e\u0926\u0940)",
    "color": "#F8FAFC",
    "lecture_no": 2,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_2_2K_pure_white_khadi.mp4",
    "size_mb": "23.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_2_2K_pure_white_khadi.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #2",
      "Vedic Pure White Khadi (\u0936\u0941\u0926\u094d\u0927 \u0936\u094d\u0935\u0947\u0924 \u0916\u093e\u0926\u0940)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_03",
    "title": "Mohan Sir - DNA #03: Ida & Pingala Nadi Dynamics - Morning Sadhana",
    "category": "ashram_navy",
    "look_name": "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
    "color": "#1E3A8A",
    "lecture_no": 3,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_3_2K_ashram_navy_koti.mp4",
    "size_mb": "25.3",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_3_2K_ashram_navy_koti.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #3",
      "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_05",
    "title": "Mohan Sir - DNA #05: Ritu Charya & Seasonal Diet with Swar Vigyan",
    "category": "herbal_lime",
    "look_name": "Herbal Lime Kurta (\u0906\u092f\u0941\u0930\u094d\u0935\u0947\u0926\u093f\u0915 \u0939\u0930\u093f\u0924)",
    "color": "#65A30D",
    "lecture_no": 5,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_5_2K_herbal_lime_ayurvedic.mp4",
    "size_mb": "54.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_5_2K_herbal_lime_ayurvedic.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #5",
      "Herbal Lime Kurta (\u0906\u092f\u0941\u0930\u094d\u0935\u0947\u0926\u093f\u0915 \u0939\u0930\u093f\u0924)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_06",
    "title": "Mohan Sir - DNA #06: Metabolism, Agni Tatva & Digestive Fire Activation",
    "category": "herbal_lime",
    "look_name": "Herbal Lime Kurta (\u0906\u092f\u0941\u0930\u094d\u0935\u0947\u0926\u093f\u0915 \u0939\u0930\u093f\u0924)",
    "color": "#65A30D",
    "lecture_no": 6,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_6_2K_herbal_lime_ayurvedic.mp4",
    "size_mb": "57.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_6_2K_herbal_lime_ayurvedic.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #6",
      "Herbal Lime Kurta (\u0906\u092f\u0941\u0930\u094d\u0935\u0947\u0926\u093f\u0915 \u0939\u0930\u093f\u0924)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_07",
    "title": "Mohan Sir - DNA #07: Swar Yoga Introduction & Breath Awakening 4K",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 7,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_7_2K_golden_ochre_angavastram.mp4",
    "size_mb": "17.6",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_7_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #7",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_08",
    "title": "Mohan Sir - DNA #08: Tri-Nadi Shuddhi & Kundalini Pranic Circuit",
    "category": "ashram_navy",
    "look_name": "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
    "color": "#1E3A8A",
    "lecture_no": 8,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_8_2K_ashram_navy_koti.mp4",
    "size_mb": "23.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_8_2K_ashram_navy_koti.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #8",
      "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_09",
    "title": "Mohan Sir - DNA #09: Sushumna Sandhya Dhyan & Inner Stillness",
    "category": "ashram_navy",
    "look_name": "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
    "color": "#1E3A8A",
    "lecture_no": 9,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_9_2K_ashram_navy_koti.mp4",
    "size_mb": "23.7",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_9_2K_ashram_navy_koti.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #9",
      "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_10",
    "title": "Mohan Sir - DNA #10: Brahma Muhurta Sheetala Pranayama (Pure White Khadi)",
    "category": "white_khadi",
    "look_name": "Vedic Pure White Khadi (\u0936\u0941\u0926\u094d\u0927 \u0936\u094d\u0935\u0947\u0924 \u0916\u093e\u0926\u0940)",
    "color": "#F8FAFC",
    "lecture_no": 10,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_10_2K_pure_white_khadi.mp4",
    "size_mb": "24.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_10_2K_pure_white_khadi.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #10",
      "Vedic Pure White Khadi (\u0936\u0941\u0926\u094d\u0927 \u0936\u094d\u0935\u0947\u0924 \u0916\u093e\u0926\u0940)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_11",
    "title": "Mohan Sir - DNA #11: Corporate Executive Swar Decision Making (Executive Suit)",
    "category": "corporate_suit",
    "look_name": "Corporate Executive Suit (\u0915\u0949\u0930\u094d\u092a\u094b\u0930\u0947\u091f \u0938\u0942\u091f)",
    "color": "#0F172A",
    "lecture_no": 11,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_11_2K_corporate_executive_suit.mp4",
    "size_mb": "40.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_11_2K_corporate_executive_suit.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #11",
      "Corporate Executive Suit (\u0915\u0949\u0930\u094d\u092a\u094b\u0930\u0947\u091f \u0938\u0942\u091f)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_12",
    "title": "Mohan Sir - DNA #12: Tatva Vigyan - Prithvi, Jal, Agni, Vayu, Akash Breakdown",
    "category": "ashram_navy",
    "look_name": "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
    "color": "#1E3A8A",
    "lecture_no": 12,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_12_2K_ashram_navy_koti.mp4",
    "size_mb": "23.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_12_2K_ashram_navy_koti.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #12",
      "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_13",
    "title": "Mohan Sir - DNA #13: Nadi Pariksha & Daily Nasal Dominance Testing",
    "category": "ashram_navy",
    "look_name": "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
    "color": "#1E3A8A",
    "lecture_no": 13,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_13_2K_ashram_navy_koti.mp4",
    "size_mb": "23.1",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_13_2K_ashram_navy_koti.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #13",
      "Ashram Sadra & Navy Waistcoat (\u0906\u0936\u094d\u0930\u092e \u0938\u0926\u0930\u093e \u0935 \u0915\u094b\u091f)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_14",
    "title": "Mohan Sir - DNA #14: Swar Sadhana Level-2 - Deep Scriptural Analysis",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 14,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_14_2K_golden_ochre_angavastram.mp4",
    "size_mb": "17.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_14_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #14",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_15",
    "title": "Mohan Sir - DNA #15: Pranic Energy Currents & Mind Control",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 15,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_15_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_15_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #15",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_16",
    "title": "Mohan Sir - DNA #16: Surya Swar Health & Vitality Dynamics",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 16,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_16_2K_golden_ochre_angavastram.mp4",
    "size_mb": "17.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_16_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #16",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_17",
    "title": "Mohan Sir - DNA #17: Chandra Swar Cooling & Stress Elimination",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 17,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_17_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_17_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #17",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_18",
    "title": "Mohan Sir - DNA #18: Shiva Swarodaya Secret Shlokas Revealed",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 18,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_18_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.2",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_18_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #18",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_19",
    "title": "Mohan Sir - DNA #19: Breath Mechanics & Diaphragmatic Expansion",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 19,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_19_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_19_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #19",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_20",
    "title": "Mohan Sir - DNA #20: Mudra Vigyan - Hand Energy Seals & Nadis",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 20,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_20_2K_golden_ochre_angavastram.mp4",
    "size_mb": "17.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_20_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #20",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_21",
    "title": "Mohan Sir - DNA #21: Asana Alignment Synchronized with Nasal Flow",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 21,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_21_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_21_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #21",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_22",
    "title": "Mohan Sir - DNA #22: Healing Chronic Disorders through Swar Shastra",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 22,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_22_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_22_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #22",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_23",
    "title": "Mohan Sir - DNA #23: Swar Yoga for Sleep, Insomnia & Restorative States",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 23,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_23_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.5",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_23_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #23",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_24",
    "title": "Mohan Sir - DNA #24: Mental Focus, Memory & Student Concentration",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 24,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_24_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_24_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #24",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_25",
    "title": "Mohan Sir - DNA #25: Spiritual Awakening & Higher Consciousness",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 25,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_25_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_25_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #25",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_26",
    "title": "Mohan Sir - DNA #26: Swar Aahar Niyam - When to Eat & When to Fast",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 26,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_26_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_26_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #26",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_27",
    "title": "Mohan Sir - DNA #27: Water Therapy (Ushapan) with Nasal Coordination",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 27,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_27_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_27_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #27",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_28",
    "title": "Mohan Sir - DNA #28: Vata, Pitta, Kapha Harmonization via Swar",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 28,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_28_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_28_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #28",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_29",
    "title": "Mohan Sir - DNA #29: Emotional Mastery & Anger Dissolution via Pingala",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 29,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_29_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_29_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #29",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_30",
    "title": "Mohan Sir - DNA #30: Heart Center (Anahata) Awakening & Compassion",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 30,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_30_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_30_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #30",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_31",
    "title": "Mohan Sir - DNA #31: Throat Center (Vishuddhi) & Speech Purification",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 31,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_31_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_31_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #31",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_32",
    "title": "Mohan Sir - DNA #32: Third Eye (Ajna) Activation & Intuitive Guidance",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 32,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_32_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_32_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #32",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_33",
    "title": "Mohan Sir - DNA #33: Crown (Sahasrara) Union & Samadhi States",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 33,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_33_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_33_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #33",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_34",
    "title": "Mohan Sir - DNA #34: Daily Routine (Dinacharya) Aligned with Swar",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 34,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_34_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_34_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #34",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_35",
    "title": "Mohan Sir - DNA #35: Longevity & Cellular Regeneration through Prana",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 35,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_35_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_35_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #35",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_36",
    "title": "Mohan Sir - DNA #36: Navel Center (Manipura) & Core Solar Energy",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 36,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_36_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.8",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_36_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #36",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_37",
    "title": "Mohan Sir - DNA #37: Root Center (Muladhara) Grounding & Sthirata",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 37,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_37_2K_golden_ochre_angavastram.mp4",
    "size_mb": "17.0",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_37_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #37",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_38",
    "title": "Mohan Sir - DNA #38: Sacred Shiva-Shakti Dynamic Balance in Daily Life",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 38,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_38_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.7",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_38_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #38",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  },
  {
    "id": "avatar_dna_39",
    "title": "Mohan Sir - DNA #39: Aham Brahmasmi - The Ultimate Swar Realization",
    "category": "golden_ochre",
    "look_name": "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
    "color": "#D97706",
    "lecture_no": 39,
    "is_primary": false,
    "resolution": "2K Quad HD (2560x1440)",
    "audio_rate": "48,000 Hz Hi-Fi",
    "filename": "mohan_dna_39_2K_golden_ochre_angavastram.mp4",
    "size_mb": "16.9",
    "cdn_url": "https://swaryogacrm.b-cdn.net/avatar-studio/generated/mohan_dna_39_2K_golden_ochre_angavastram.mp4",
    "description": "Complete 2K Quad-HD AI Avatar with verified bilabial phonetic lip-sync and crystal master audio.",
    "topics": [
      "Lecture #39",
      "Golden Ochre Angavastram (\u092a\u0940\u0924\u093e\u0902\u092c\u0930)",
      "2K Master"
    ]
  }
];

export default function MohanSirGeneratedAvatarLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalVideo, setActiveModalVideo] = useState<GeneratedAvatarItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const categories = useMemo(() => [
    { id: 'all', label: 'All Avatars', count: ALL_MOHAN_AI_AVATARS.length },
    { id: 'green_look', label: 'Mohan sir- Green Look', count: ALL_MOHAN_AI_AVATARS.filter(a => a.category === 'green_look').length, color: '#15803D' },
    { id: 'golden_ochre', label: 'Golden Ochre Pitambar', count: ALL_MOHAN_AI_AVATARS.filter(a => a.category === 'golden_ochre').length, color: '#D97706' },
    { id: 'ashram_navy', label: 'Ashram Navy Waistcoat', count: ALL_MOHAN_AI_AVATARS.filter(a => a.category === 'ashram_navy').length, color: '#1E3A8A' },
    { id: 'white_khadi', label: 'Vedic White Khadi', count: ALL_MOHAN_AI_AVATARS.filter(a => a.category === 'white_khadi').length, color: '#F8FAFC' },
    { id: 'herbal_lime', label: 'Herbal Lime Ayurvedic', count: ALL_MOHAN_AI_AVATARS.filter(a => a.category === 'herbal_lime').length, color: '#65A30D' },
    { id: 'corporate_suit', label: 'Corporate Executive Suit', count: ALL_MOHAN_AI_AVATARS.filter(a => a.category === 'corporate_suit').length, color: '#0F172A' },
  ], []);

  const filteredAvatars = useMemo(() => {
    return ALL_MOHAN_AI_AVATARS.filter(item => {
      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q ||
        item.title.toLowerCase().includes(q) ||
        item.look_name.toLowerCase().includes(q) ||
        item.topics.some(t => t.toLowerCase().includes(q)) ||
        (item.lecture_no > 0 && item.lecture_no.toString().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [searchQuery, selectedCategory]);

  const copyToClipboard = (item: GeneratedAvatarItem) => {
    navigator.clipboard.writeText(item.cdn_url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-6 border border-emerald-500/20 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Official Swar Yoga AI Avatar Studio</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Mohan Sir AI Avatar Library
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                {ALL_MOHAN_AI_AVATARS.length} Live 2K Videos
              </span>
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Every digital twin is generated in <strong className="text-emerald-400">2K Quad HD (2560×1440)</strong> with 100% bilabial phonetic precision (P, M, A, B), single natural mouth, crystal 48kHz audio, and multi-wardrobe styling.
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-center">
              <div className="text-xs text-slate-400 font-medium">Total Avatars</div>
              <div className="text-xl font-bold text-emerald-400">{ALL_MOHAN_AI_AVATARS.length}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-center">
              <div className="text-xs text-slate-400 font-medium">Resolution</div>
              <div className="text-xl font-bold text-amber-400">2K Quad HD</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 text-center col-span-2 sm:col-span-1">
              <div className="text-xs text-slate-400 font-medium">Wardrobe Looks</div>
              <div className="text-xl font-bold text-sky-400">8 Styles</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search avatar by lecture #, topic, or wardrobe look..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-emerald-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {cat.color && (
                <span
                  className="w-2 h-2 rounded-full inline-block border border-white/30"
                  style={{ backgroundColor: cat.color }}
                />
              )}
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCategory === cat.id ? 'bg-black/30 text-slate-950' : 'bg-slate-800 text-slate-400'
              }`}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Avatars Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredAvatars.map(item => {
          const isPlaying = playingVideoId === item.id;
          const isCopied = copiedId === item.id;

          return (
            <div
              key={item.id}
              className={`group relative rounded-2xl bg-slate-900/90 border transition-all duration-300 flex flex-col overflow-hidden ${
                item.is_primary
                  ? 'border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-xl shadow-emerald-500/10'
                  : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
              }`}
            >
              {/* Video Player / Preview Area */}
              <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                <video
                  src={item.cdn_url}
                  controls
                  preload="metadata"
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Badges Overlay */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                  <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/40">
                    2K Quad HD
                  </span>
                  {item.is_primary && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-extrabold shadow-sm">
                      FEATURED LOOK
                    </span>
                  )}
                </div>

                <div className="absolute top-2.5 right-2.5 z-10">
                  <button
                    onClick={() => setActiveModalVideo(item)}
                    className="p-1.5 rounded-lg bg-black/70 backdrop-blur-md text-slate-300 hover:text-white border border-white/20 transition hover:scale-105"
                    title="Play Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Size & Audio Badge */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 pointer-events-none">
                  <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-slate-300 font-mono">
                    {item.size_mb} MB
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  {/* Wardrobe Look Badge */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-slate-300">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block border border-white/30"
                        style={{ backgroundColor: item.color }}
                      />
                      {item.look_name}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.audio_rate}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-emerald-300 transition">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(item)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                      isCopied
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy CDN Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={item.cdn_url}
                    download={item.filename}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    title="Download 2K Video File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Video Playback Modal */}
      {activeModalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-4xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full inline-block border border-white/30"
                  style={{ backgroundColor: activeModalVideo.color }}
                />
                <h3 className="text-base font-bold text-white">
                  {activeModalVideo.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveModalVideo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player in Modal */}
            <div className="relative aspect-video bg-black w-full">
              <video
                src={activeModalVideo.cdn_url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                  {activeModalVideo.resolution}
                </span>
                <span>{activeModalVideo.look_name}</span>
                <span className="text-slate-500">•</span>
                <span className="font-mono text-slate-400">{activeModalVideo.size_mb} MB</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => copyToClipboard(activeModalVideo)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Direct 2K Link</span>
                </button>
                <a
                  href={activeModalVideo.cdn_url}
                  download={activeModalVideo.filename}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download MP4</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
