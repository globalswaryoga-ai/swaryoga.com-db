/**
 * Swar Yoga Sacred Terminology & Concept Preservation Dictionary
 *
 * Ensures that during automated multilingual translation (Hindi, Marathi, English,
 * Sanskrit, Nepali), sacred Vedic & Swar Yoga terms are NEVER distorted, Anglicized,
 * or stripped of their authentic spiritual context.
 */

export interface TermDefinition {
  sanskritHindi: string;
  transliteration: string;
  approvedEnglish: string;
  approvedMarathi: string;
  approvedNepali: string;
  forbiddenTranslations: string[];
  contextNote: string;
}

export const SWAR_YOGA_DICTIONARY: Record<string, TermDefinition> = {
  swar_yoga: {
    sanskritHindi: 'स्वर योग',
    transliteration: 'Swar Yoga',
    approvedEnglish: 'Swar Yoga (Science of Breath & Nadis)',
    approvedMarathi: 'स्वर योग',
    approvedNepali: 'स्वर योग',
    forbiddenTranslations: ['Voice Yoga', 'Sound Yoga', 'Musical Yoga', 'Singing Yoga'],
    contextNote: 'The esoteric science of prana flow through Ida, Pingala, and Sushumna nadis linked with lunar tithis.',
  },
  ida_nadi: {
    sanskritHindi: 'इड़ा नाड़ी',
    transliteration: 'Ida Nadi',
    approvedEnglish: 'Ida Nadi (Chandra / Left Lunar Channel)',
    approvedMarathi: 'इडा नाडी (चंद्र स्वर)',
    approvedNepali: 'इडा नाडी (चन्द्र स्वर)',
    forbiddenTranslations: ['Left breath tube', 'Left air pipe', 'Moon vein'],
    contextNote: 'Cools the body, activates parasympathetic calm, nourishing mental energies.',
  },
  pingala_nadi: {
    sanskritHindi: 'पिंगला नाड़ी',
    transliteration: 'Pingala Nadi',
    approvedEnglish: 'Pingala Nadi (Surya / Right Solar Channel)',
    approvedMarathi: 'पिंगळा नाडी (सूर्य स्वर)',
    approvedNepali: 'पिङ्गला नाडी (सूर्य स्वर)',
    forbiddenTranslations: ['Right breath tube', 'Right air pipe', 'Sun vein'],
    contextNote: 'Heats the body, activates metabolic fire, digestion, and physical vitality.',
  },
  sushumna_nadi: {
    sanskritHindi: 'सुषुम्ना नाड़ी',
    transliteration: 'Sushumna Nadi',
    approvedEnglish: 'Sushumna Nadi (Central Spiritual Channel)',
    approvedMarathi: 'सुषुम्ना नाडी (मध्य स्वर)',
    approvedNepali: 'सुषुम्ना नाडी',
    forbiddenTranslations: ['Spinal tube', 'Spinal air vein', 'Center pipe'],
    contextNote: 'Neutral state when both nostrils flow equally; ideal for meditation and samadhi.',
  },
  kumbhaka: {
    sanskritHindi: 'कुम्भक',
    transliteration: 'Kumbhaka',
    approvedEnglish: 'Kumbhaka (Conscious Breath Retention)',
    approvedMarathi: 'कुंभक (श्वास रोखून धरणे)',
    approvedNepali: 'कुम्भक',
    forbiddenTranslations: ['Suffocation', 'Breath holding', 'Stopping breathing'],
    contextNote: 'Internal (Antar) or external (Bahya) retention of vital prana.',
  },
  rutucharya: {
    sanskritHindi: 'ऋतुचर्या',
    transliteration: 'Rutucharya',
    approvedEnglish: 'Rutucharya (Ayurvedic Seasonal Lifestyle Regimen)',
    approvedMarathi: 'ऋतुचर्या (हंगामी दिनचर्या)',
    approvedNepali: 'ऋतुचर्या',
    forbiddenTranslations: ['Weather habit', 'Season routine'],
    contextNote: 'Harmonizing dietary and breath practices with the 6 seasonal cycles.',
  },
  tithi: {
    sanskritHindi: 'तिथि',
    transliteration: 'Tithi',
    approvedEnglish: 'Tithi (Lunar Phase)',
    approvedMarathi: 'तिथी',
    approvedNepali: 'तिथि',
    forbiddenTranslations: ['Date', 'Day of month', 'Calendar tick'],
    contextNote: 'One of the 30 lunar days that determines the auspicious active nostril at sunrise.',
  },
  sadhana: {
    sanskritHindi: 'साधना',
    transliteration: 'Sadhana',
    approvedEnglish: 'Sadhana (Dedicated Spiritual Practice)',
    approvedMarathi: 'साधना',
    approvedNepali: 'साधना',
    forbiddenTranslations: ['Exercise', 'Workout', 'Hobby training'],
    contextNote: 'Disciplined yogic practice undertaken for spiritual and vital self-mastery.',
  },
  pranayama: {
    sanskritHindi: 'प्राणायाम',
    transliteration: 'Pranayama',
    approvedEnglish: 'Pranayama (Vital Breath Regulation)',
    approvedMarathi: 'प्राणायाम',
    approvedNepali: 'प्राणायाम',
    forbiddenTranslations: ['Breathing drill', 'Aerobics'],
    contextNote: 'Extension and conscious control of universal prana.',
  },
  mudra: {
    sanskritHindi: 'मुद्रा',
    transliteration: 'Mudra',
    approvedEnglish: 'Mudra (Energetic Gesture / Seal)',
    approvedMarathi: 'मुद्रा',
    approvedNepali: 'मुद्रा',
    forbiddenTranslations: ['Hand sign', 'Finger pose'],
    contextNote: 'Neurological and energetic circuit seals directing prana in the body.',
  },
};

/**
 * Enforces Swar Yoga terminology rules on any target translation
 */
export function applyTerminologyGuard(text: string, targetLanguage: 'en' | 'mr' | 'ne' | 'sa' | 'hi'): string {
  let cleaned = text;

  for (const [key, def] of Object.entries(SWAR_YOGA_DICTIONARY)) {
    // 1. Replace any forbidden translation terms with approved representation
    for (const forbidden of def.forbiddenTranslations) {
      const reg = new RegExp(`\\b${forbidden}\\b`, 'gi');
      if (reg.test(cleaned)) {
        const replacement = targetLanguage === 'en' ? def.approvedEnglish :
                            targetLanguage === 'mr' ? def.approvedMarathi :
                            targetLanguage === 'ne' ? def.approvedNepali :
                            def.transliteration;
        cleaned = cleaned.replace(reg, replacement);
      }
    }
  }

  return cleaned;
}

