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
}

export const COMMUNITY_DESIGNS: CommunityDesign[] = [
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
    philosophy: 'Teal represents universal connection, unity, and infinite possibilities. It connects all communities.',
    members: 4,
    isPublic: true
  },
  
  {
    id: 'swar-yoga',
    name: 'Swar Yoga',
    icon: Music,
    description: 'Swar Yoga practitioners',
    color: {
      light: 'bg-emerald-50 border-emerald-200',
      main: 'text-emerald-600 bg-emerald-100',
      dark: 'from-emerald-600 to-emerald-700',
      gradient: 'from-emerald-500 to-teal-500'
    },
    philosophy: 'Green represents the heart chakra, grounding, and earth energy - the core foundation of Swar Yoga practice.',
    members: 1,
    isPublic: false
  },

  {
    id: 'aham-bramhasmi',
    name: 'Aham Brahmasmi',
    icon: Eye,
    description: 'Self-realization journey',
    color: {
      light: 'bg-indigo-50 border-indigo-200',
      main: 'text-indigo-600 bg-indigo-100',
      dark: 'from-indigo-600 to-indigo-700',
      gradient: 'from-indigo-500 to-purple-500'
    },
    philosophy: 'Indigo represents the third eye chakra, inner wisdom, intuition, and self-realization.',
    members: 0,
    isPublic: false
  },

  {
    id: 'astavakra',
    name: 'Astavakra',
    icon: Lightbulb,
    description: 'Advanced yoga training',
    color: {
      light: 'bg-amber-50 border-amber-200',
      main: 'text-amber-600 bg-amber-100',
      dark: 'from-amber-600 to-amber-700',
      gradient: 'from-amber-500 to-orange-500'
    },
    philosophy: 'Amber/Yellow represents wisdom, enlightenment, and higher knowledge - perfect for advanced training.',
    members: 0,
    isPublic: false
  },

  {
    id: 'shivoham',
    name: 'Shivoham',
    icon: Zap,
    description: 'Shiva consciousness',
    color: {
      light: 'bg-slate-100 border-slate-300',
      main: 'text-slate-700 bg-slate-200',
      dark: 'from-slate-700 to-slate-800',
      gradient: 'from-slate-600 to-slate-700'
    },
    philosophy: 'Deep slate represents transcendence, cosmic consciousness, and meditative depth - the essence of Shiva.',
    members: 0,
    isPublic: false
  },

  {
    id: 'i-am-fit',
    name: 'I am Fit',
    icon: Activity,
    description: 'Fitness and wellness',
    color: {
      light: 'bg-lime-50 border-lime-200',
      main: 'text-lime-600 bg-lime-100',
      dark: 'from-lime-600 to-lime-700',
      gradient: 'from-lime-500 to-green-500'
    },
    philosophy: 'Bright lime/green represents vitality, energy, health, and active wellness practice.',
    members: 0,
    isPublic: false
  }
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
