// lib/communityColorSystem.ts
// Professional color design system for Swar Yoga communities
// Uses Lucide icons + professional color palette based on yoga philosophy

import {
  Globe,
  Music,
  Eye,
  Lightbulb,
  Zap,
  Activity,
  Heart,
  Baby,
  Users,
  Sparkles,
  Leaf,
  Sun,
  Moon,
  Flower2,
  PersonStanding,
  LucideIcon,
} from 'lucide-react';

export interface CommunityDesign {
  id: string;
  name: string;
  icon: LucideIcon;
  description: string;
  color: {
    light: string;      // Light background (50)
    main: string;       // Main color (500-600)
    dark: string;       // Dark color (700-800)
    gradient: string;   // Tailwind gradient classes
  };
  philosophy: string;   // Why this color/icon
  members?: number;
  isPublic?: boolean;
  category?: 'common' | 'health' | 'married-life' | 'youth' | 'children' | 'yogasana';
}

// Community Groups for sidebar dropdown
export const COMMUNITY_GROUPS = [
  { id: 'common', name: 'Common', icon: Globe },
  { id: 'health', name: 'Health Communities', icon: Heart },
  { id: 'married-life', name: 'Married Life Communities', icon: Heart },
  { id: 'youth', name: 'Youth Community', icon: Sparkles },
  { id: 'children', name: 'Children Community', icon: Baby },
  { id: 'yogasana', name: 'Yogasana Community', icon: PersonStanding },
];

export const COMMUNITY_DESIGNS: CommunityDesign[] = [
  // ============ COMMON ============
  {
    id: 'global',
    name: 'Global Community',
    icon: Globe,
    description: 'Open to everyone - share your yoga journey with the world',
    color: {
      light: 'bg-teal-50 border-teal-200',
      main: 'text-teal-600 bg-teal-100',
      dark: 'from-teal-600 to-teal-700',
      gradient: 'from-teal-500 to-cyan-500'
    },
    philosophy: 'Teal represents universal connection, unity, and infinite possibilities.',
    members: 0,
    isPublic: true,
    category: 'common'
  },
  
  // ============ HEALTH COMMUNITIES ============
  {
    id: 'swar-yoga-l1',
    name: 'Swar Yoga L-1',
    icon: Music,
    description: 'Level 1 - Introduction to Swar Yoga',
    color: {
      light: 'bg-emerald-50 border-emerald-200',
      main: 'text-emerald-600 bg-emerald-100',
      dark: 'from-emerald-600 to-emerald-700',
      gradient: 'from-emerald-500 to-teal-500'
    },
    philosophy: 'Foundation level for Swar Yoga practice.',
    members: 0,
    isPublic: false,
    category: 'health'
  },
  {
    id: 'swar-yoga-l2',
    name: 'Swar Yoga L-2',
    icon: Music,
    description: 'Level 2 - Intermediate Swar Yoga',
    color: {
      light: 'bg-green-50 border-green-200',
      main: 'text-green-600 bg-green-100',
      dark: 'from-green-600 to-green-700',
      gradient: 'from-green-500 to-emerald-500'
    },
    philosophy: 'Intermediate level deepening practice.',
    members: 0,
    isPublic: false,
    category: 'health'
  },
  {
    id: 'swar-yoga-l3',
    name: 'Swar Yoga L-3',
    icon: Music,
    description: 'Level 3 - Advanced Swar Yoga',
    color: {
      light: 'bg-teal-50 border-teal-200',
      main: 'text-teal-600 bg-teal-100',
      dark: 'from-teal-600 to-teal-700',
      gradient: 'from-teal-500 to-green-500'
    },
    philosophy: 'Advanced level mastering techniques.',
    members: 0,
    isPublic: false,
    category: 'health'
  },
  {
    id: 'swar-yoga-l4',
    name: 'Swar Yoga L-4',
    icon: Music,
    description: 'Level 4 - Expert Swar Yoga',
    color: {
      light: 'bg-cyan-50 border-cyan-200',
      main: 'text-cyan-600 bg-cyan-100',
      dark: 'from-cyan-600 to-cyan-700',
      gradient: 'from-cyan-500 to-teal-500'
    },
    philosophy: 'Expert level achieving mastery.',
    members: 0,
    isPublic: false,
    category: 'health'
  },
  {
    id: 'swar-yoga-l5',
    name: 'Swar Yoga L-5',
    icon: Music,
    description: 'Level 5 - Master Swar Yoga',
    color: {
      light: 'bg-sky-50 border-sky-200',
      main: 'text-sky-600 bg-sky-100',
      dark: 'from-sky-600 to-sky-700',
      gradient: 'from-sky-500 to-cyan-500'
    },
    philosophy: 'Master level spiritual awakening.',
    members: 0,
    isPublic: false,
    category: 'health'
  },
  {
    id: 'aahar',
    name: 'Aahar (Diet & Nutrition)',
    icon: Leaf,
    description: 'Yoga-based diet and nutrition guidance',
    color: {
      light: 'bg-lime-50 border-lime-200',
      main: 'text-lime-600 bg-lime-100',
      dark: 'from-lime-600 to-lime-700',
      gradient: 'from-lime-500 to-green-500'
    },
    philosophy: 'Proper nutrition for yoga practitioners.',
    members: 0,
    isPublic: false,
    category: 'health'
  },
  {
    id: 'i-am-fit',
    name: 'I am Fit',
    icon: Activity,
    description: 'Fitness and wellness community',
    color: {
      light: 'bg-orange-50 border-orange-200',
      main: 'text-orange-600 bg-orange-100',
      dark: 'from-orange-600 to-orange-700',
      gradient: 'from-orange-500 to-amber-500'
    },
    philosophy: 'Vitality, energy, health, and active wellness.',
    members: 0,
    isPublic: false,
    category: 'health'
  },

  // ============ MARRIED LIFE COMMUNITIES ============
  {
    id: 'pre-planning-garbh-sankar',
    name: 'Pre Planning Garbh Sankar',
    icon: Heart,
    description: 'Preparation for parenthood through yoga',
    color: {
      light: 'bg-pink-50 border-pink-200',
      main: 'text-pink-600 bg-pink-100',
      dark: 'from-pink-600 to-pink-700',
      gradient: 'from-pink-500 to-rose-500'
    },
    philosophy: 'Preparing body and mind for parenthood.',
    members: 0,
    isPublic: false,
    category: 'married-life'
  },
  {
    id: '9-month-garbha-sanskar',
    name: '9 Month Garbha Sanskar Sadhana',
    icon: Baby,
    description: 'Complete pregnancy yoga journey',
    color: {
      light: 'bg-rose-50 border-rose-200',
      main: 'text-rose-600 bg-rose-100',
      dark: 'from-rose-600 to-rose-700',
      gradient: 'from-rose-500 to-pink-500'
    },
    philosophy: 'Nurturing mother and child through yoga.',
    members: 0,
    isPublic: false,
    category: 'married-life'
  },

  // ============ YOUTH COMMUNITY ============
  {
    id: 'youth',
    name: 'Youth Swar Yoga',
    icon: Sparkles,
    description: 'Yoga for young minds and bodies',
    color: {
      light: 'bg-violet-50 border-violet-200',
      main: 'text-violet-600 bg-violet-100',
      dark: 'from-violet-600 to-violet-700',
      gradient: 'from-violet-500 to-purple-500'
    },
    philosophy: 'Empowering youth through yoga practice.',
    members: 0,
    isPublic: false,
    category: 'youth'
  },

  // ============ CHILDREN COMMUNITY ============
  {
    id: 'children',
    name: 'Children Yoga',
    icon: Sun,
    description: 'Fun yoga for kids',
    color: {
      light: 'bg-amber-50 border-amber-200',
      main: 'text-amber-600 bg-amber-100',
      dark: 'from-amber-600 to-amber-700',
      gradient: 'from-amber-500 to-yellow-500'
    },
    philosophy: 'Building healthy habits from childhood.',
    members: 0,
    isPublic: false,
    category: 'children'
  },

  // ============ YOGASANA COMMUNITY ============
  {
    id: 'yogasana',
    name: 'Yogasana Practice',
    icon: PersonStanding,
    description: 'Master traditional yoga postures',
    color: {
      light: 'bg-indigo-50 border-indigo-200',
      main: 'text-indigo-600 bg-indigo-100',
      dark: 'from-indigo-600 to-indigo-700',
      gradient: 'from-indigo-500 to-blue-500'
    },
    philosophy: 'Perfecting asanas for physical and spiritual growth.',
    members: 0,
    isPublic: false,
    category: 'yogasana'
  },
];

// Helper function to get design by community ID
export function getCommunityDesign(communityId: string): CommunityDesign {
  const design = COMMUNITY_DESIGNS.find(c => c.id === communityId);
  if (!design) {
    // Return a default design for dynamically created communities
    return getDefaultCommunityDesign(communityId);
  }
  return design;
}

// Get communities by category/group
export function getCommunitiesByCategory(category: string): CommunityDesign[] {
  return COMMUNITY_DESIGNS.filter(c => c.category === category);
}

// Get grouped communities for sidebar
export function getGroupedCommunities(): { group: typeof COMMUNITY_GROUPS[0]; communities: CommunityDesign[] }[] {
  return COMMUNITY_GROUPS.map(group => ({
    group,
    communities: COMMUNITY_DESIGNS.filter(c => c.category === group.id)
  })).filter(g => g.communities.length > 0);
}

// Default design for communities not in the predefined list
export function getDefaultCommunityDesign(communityId: string, communityName?: string): CommunityDesign {
  // Generate a consistent color based on the community ID hash
  const colorOptions = [
    { light: 'bg-purple-50 border-purple-200', main: 'text-purple-600 bg-purple-100', dark: 'from-purple-600 to-purple-700', gradient: 'from-purple-500 to-pink-500' },
    { light: 'bg-rose-50 border-rose-200', main: 'text-rose-600 bg-rose-100', dark: 'from-rose-600 to-rose-700', gradient: 'from-rose-500 to-red-500' },
    { light: 'bg-cyan-50 border-cyan-200', main: 'text-cyan-600 bg-cyan-100', dark: 'from-cyan-600 to-cyan-700', gradient: 'from-cyan-500 to-blue-500' },
    { light: 'bg-orange-50 border-orange-200', main: 'text-orange-600 bg-orange-100', dark: 'from-orange-600 to-orange-700', gradient: 'from-orange-500 to-amber-500' },
    { light: 'bg-violet-50 border-violet-200', main: 'text-violet-600 bg-violet-100', dark: 'from-violet-600 to-violet-700', gradient: 'from-violet-500 to-purple-500' },
    { light: 'bg-fuchsia-50 border-fuchsia-200', main: 'text-fuchsia-600 bg-fuchsia-100', dark: 'from-fuchsia-600 to-fuchsia-700', gradient: 'from-fuchsia-500 to-pink-500' },
  ];
  
  // Simple hash to pick a consistent color
  const hash = communityId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = hash % colorOptions.length;
  const color = colorOptions[colorIndex];

  return {
    id: communityId,
    name: communityName || communityId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    icon: Globe, // Default icon
    description: 'Custom yoga community',
    color,
    philosophy: 'Custom community created for specific yoga practice.',
    members: 0,
    isPublic: false
  };
}

// Helper function to get all community designs
export function getAllCommunityDesigns(): CommunityDesign[] {
  return COMMUNITY_DESIGNS;
}

// Design system documentation
export const DESIGN_PHILOSOPHY = `
# Swar Yoga Community Color Design System

## Design Principles

### 1. Yoga Philosophy Based
- Colors are mapped to Chakras (energy centers)
- Each color represents a spiritual/consciousness level
- Professional yet meaningful

### 2. Professional Standards
- WCAG AA contrast compliance
- Accessible color palette
- Enterprise-grade appearance
- No emojis - proper Lucide icons

### 3. Consistent & Memorable
- Each community has unique color + icon
- Easy to remember and identify
- Consistent across all pages
- Scalable for future communities

## Color Mapping

Global Community   → Teal      (Connection, Unity)
Swar Yoga         → Emerald   (Heart Chakra, Grounding)
Aham Bramhasmi    → Indigo    (Third Eye, Wisdom)
Astavakra         → Amber     (Solar Plexus, Knowledge)
Shivoham          → Slate     (Crown, Transcendence)
I am Fit          → Lime      (Vitality, Energy)

## Icon System (Lucide React)

All icons come from lucide-react library
Professional, consistent, scalable
Can be sized and styled appropriately
No external image dependencies

## Color Palette Structure

For each community:
- light: Subtle background (50 shade)
- main: Medium visibility (100-600 shade)
- dark: High contrast/buttons (600-700+ shade)
- gradient: Hero section (500-500 blend)

## Implementation

Import from lib/communityColorSystem.ts:
- CommunityDesign interface
- COMMUNITY_DESIGNS array
- Helper functions
- Philosophy documentation
`;
