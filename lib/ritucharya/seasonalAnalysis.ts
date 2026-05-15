// Comprehensive Ayurveda Seasonal Analysis System
// Based on traditional Ayurvedic knowledge

interface TimeSlotRecommendation {
  time: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
}

interface SeasonalData {
  id: string;
  nameHi: string;
  nameEn: string;
  months: string;
  tempRange: string;
  humidity: string;
  dosha: {
    primary: string;
    secondary: string;
  };
  nature: {
    climate: string;
    foliage: string;
    skinEffect: string;
    naturalPhenomena: string[];
  };
  rasas: {
    use: string[];
    avoid: string[];
  };
  recommendedPercentages: {
    sweet: number;
    sour: number;
    salty: number;
    pungent: number;
    bitter: number;
    astringent: number;
  };
  doshaImbalance: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  timeSlotRecommendations?: TimeSlotRecommendation[];
}

export const seasonalDatabase: { [key: string]: SeasonalData } = {
  grisham: {
    id: 'grisham',
    nameHi: 'गर्मी (ग्रीष्म)',
    nameEn: 'Grisham (Summer)',
    months: 'May-Jun',
    tempRange: 'गर्म/Hot 32-45°C',
    humidity: 'कम (Low) 10-20%',
    dosha: {
      primary: 'Pitta ↑↑ Vata ↑',
      secondary: 'Kapha ↓↓',
    },
    nature: {
      climate: 'बहुत गर्म (Very Hot)',
      foliage: 'नई प्रतियां फूल खिलने लगते (New leaves, flowers bloom)',
      skinEffect: 'रूखी (Dry) और तीव्र (Intense)',
      naturalPhenomena: [
        'नई पत्तियां और फूल (New leaves and flowers)',
        'तेज धूप (Strong sun)',
        'कम बारिश (Low rainfall)',
        'रूखी हवा (Dry wind)',
      ],
    },
    rasas: {
      use: ['मीठा (Sweet)', 'कसैला (Astringent)', 'खट्टा (Sour)'],
      avoid: ['तीव्र (Pungent)', 'लवण (Salty)', 'कड़वा (Bitter)'],
    },
    recommendedPercentages: {
      sweet: 40,
      sour: 25,
      salty: 0,
      pungent: 0,
      bitter: 0,
      astringent: 35,
    },
    doshaImbalance: {
      vata: 40,
      pitta: 50,
      kapha: 10,
    },
  },

  varsha: {
    id: 'varsha',
    nameHi: 'वर्षा (वर्षाकाल)',
    nameEn: 'Varsha (Monsoon)',
    months: 'Jul-Aug',
    tempRange: 'गर्म-ठंडा (Warm-Cool) 25-32°C',
    humidity: 'बहुत अधिक (High) 75-95%',
    dosha: {
      primary: 'Kapha ↑↑ Vata ↑',
      secondary: 'Pitta ↓',
    },
    nature: {
      climate: 'चिपचिपी (Oily) और गीली (Damp)',
      foliage: 'पत्तियां बढ़ती हरियाली (Foliage green)',
      skinEffect: 'चिपचिपी (Oily) गीली (Damp)',
      naturalPhenomena: [
        'मूसलाधार बारिश (Heavy rain)',
        'नमी (Humidity)',
        'हरियाली (Greenery)',
        'ठंडी हवा (Cool wind)',
      ],
    },
    rasas: {
      use: ['मीठा (Sweet)', 'लवण (Salty)', 'खट्टा (Sour)'],
      avoid: ['तीव्र (Pungent)', 'कड़वा (Bitter)', 'कसैला (Astringent)'],
    },
    recommendedPercentages: {
      sweet: 40,
      sour: 30,
      salty: 30,
      pungent: 0,
      bitter: 0,
      astringent: 0,
    },
    doshaImbalance: {
      vata: 35,
      pitta: 20,
      kapha: 45,
    },
  },

  sharad: {
    id: 'sharad',
    nameHi: 'शरद (शरद ऋतु)',
    nameEn: 'Sharad (Autumn)',
    months: 'Sep-Oct',
    tempRange: 'निर्मित (Moderate) 20-28°C',
    humidity: 'कम (Low) 30-50%',
    dosha: {
      primary: 'Pitta ↑↑ Kapha ↓',
      secondary: 'Vata सामान्य',
    },
    nature: {
      climate: 'रूखी (Dry) शीतल (Calm)',
      foliage: 'फल पकते पत्तियां गिरना (Fruits ripen, Leaves fall)',
      skinEffect: 'रूखी (Dry) शांत (Calm)',
      naturalPhenomena: [
        'फल पकना (Fruits ripen)',
        'पत्तियां गिरना (Leaves fall)',
        'ठंडी हवा (Cool breeze)',
        'साफ आसमान (Clear sky)',
      ],
    },
    rasas: {
      use: ['कड़वा (Bitter)', 'कसैला (Astringent)', 'मीठा (Sweet)'],
      avoid: ['खट्टा (Sour)', 'लवण (Salty)', 'तीव्र (Pungent)'],
    },
    recommendedPercentages: {
      sweet: 30,
      sour: 0,
      salty: 0,
      pungent: 0,
      bitter: 35,
      astringent: 35,
    },
    doshaImbalance: {
      vata: 20,
      pitta: 50,
      kapha: 30,
    },
  },

  hemant: {
    id: 'hemant',
    nameHi: 'हेमंत (हेमंत ऋतु)',
    nameEn: 'Hemant (Pre-Winter)',
    months: 'Nov-Dec',
    tempRange: 'ठंडा (Cold) 10-20°C',
    humidity: 'बहुत कम (Very Low) 20-40%',
    dosha: {
      primary: 'Vata ↑↑ Pitta ↓',
      secondary: 'Kapha ↑',
    },
    nature: {
      climate: 'रूखी (Dry) ठंडी (Cold)',
      foliage: 'पत्तियां झिझिया बीज तैयार (Seeds ready Bare)',
      skinEffect: 'रूखी (Dry) ठंडी (Cold)',
      naturalPhenomena: [
        'ठंडी हवा (Cold wind)',
        'पत्तियां झड़ना (Leaves falling)',
        'बीज तैयार (Seeds sprouting)',
        'कम वर्षा (Low rainfall)',
      ],
    },
    rasas: {
      use: ['मीठा (Sweet)', 'खट्टा (Sour)', 'लवण (Salty)'],
      avoid: ['कड़वा (Bitter)', 'कसैला (Astringent)', 'तीव्र (Pungent)'],
    },
    recommendedPercentages: {
      sweet: 45,
      sour: 30,
      salty: 25,
      pungent: 0,
      bitter: 0,
      astringent: 0,
    },
    doshaImbalance: {
      vata: 45,
      pitta: 15,
      kapha: 40,
    },
  },

  shishir: {
    id: 'shishir',
    nameHi: 'शिशिर (शिशिर ऋतु)',
    nameEn: 'Shishir (Winter)',
    months: 'Jan-Feb',
    tempRange: 'बहुत ठंडा (Very Cold) 5-15°C',
    humidity: 'कम (Low) 25-45%',
    dosha: {
      primary: 'Vata ↑↑ Kapha ↑',
      secondary: 'Pitta ↓↓',
    },
    nature: {
      climate: 'बहुत रूखी (Very Dry) कड़ी ठंड (Harsh Cold)',
      foliage: 'सोए हुए पेड़ बीज अंकुरित (Seeds Sprouting)',
      skinEffect: 'बहुत रूखी (Very Dry) कड़ी ठंड (Harsh)',
      naturalPhenomena: [
        'कठोर ठंड (Harsh cold)',
        'सूखी हवा (Dry wind)',
        'कम नमी (Low moisture)',
        'बीज अंकुरित (Seeds sprouting)',
      ],
    },
    rasas: {
      use: ['मीठा (Sweet)', 'लवण (Salty)', 'खट्टा (Sour)'],
      avoid: ['कड़वा (Bitter)', 'कसैला (Astringent)', 'तीव्र (Pungent)'],
    },
    recommendedPercentages: {
      sweet: 40,
      sour: 30,
      salty: 30,
      pungent: 0,
      bitter: 0,
      astringent: 0,
    },
    doshaImbalance: {
      vata: 40,
      pitta: 10,
      kapha: 50,
    },
  },

  vasant: {
    id: 'vasant',
    nameHi: 'वसंत (वसंत ऋतु)',
    nameEn: 'Vasant (Spring)',
    months: 'Mar-Apr',
    tempRange: 'गर्म होना शुरू (Warming) 18-28°C',
    humidity: 'बढ़ता हुआ (Rising) 40-70%',
    dosha: {
      primary: 'Kapha ↑↑ Vata ↑',
      secondary: 'Pitta सामान्य',
    },
    nature: {
      climate: 'चिपचिपी (Slightly oily) मुद्र (Soft)',
      foliage: 'पत्तियां निकलना फूल खिलना (Flowers bloom)',
      skinEffect: 'चिपचिपी (Slightly oily) मुद्र (Soft)',
      naturalPhenomena: [
        'फूल खिलना (Flowers bloom)',
        'पत्तियां निकलना (New leaves)',
        'गर्मी बढ़ना (Warming)',
        'नमी बढ़ना (Rising moisture)',
      ],
    },
    rasas: {
      use: ['कड़वा (Bitter)', 'कसैला (Astringent)', 'तीव्र (Pungent)'],
      avoid: ['मीठा (Sweet)', 'लवण (Salty)', 'खट्टा (Sour)'],
    },
    recommendedPercentages: {
      sweet: 0,
      sour: 0,
      salty: 0,
      pungent: 30,
      bitter: 35,
      astringent: 35,
    },
    doshaImbalance: {
      vata: 30,
      pitta: 20,
      kapha: 50,
    },
  },
};

// Function to analyze weather and recommend tastes
export function analyzeWeatherAndRecommendRasas(
  temp: number,
  humidity: number,
  windSpeed: number,
  aqi: number,
  rituId: string,
  cloudCover?: number
): {
  seasonalData: SeasonalData;
  recommendedRasas: string[];
  avoidRasas: string[];
  analysis: string;
  naturalPhenomena: string[];
} {
  const seasonal = seasonalDatabase[rituId] || seasonalDatabase.grisham;

  return {
    seasonalData: seasonal,
    recommendedRasas: seasonal.rasas.use,
    avoidRasas: seasonal.rasas.avoid,
    analysis: `Based on ${seasonal.nameEn} (${seasonal.nameHi}) with temperature ${temp}°C and humidity ${humidity}%,
    the ${seasonal.dosha.primary} dosha is imbalanced. Use ${seasonal.rasas.use.join(', ')} tastes to balance.`,
    naturalPhenomena: seasonal.nature.naturalPhenomena,
  };
}

// Function to get seasonal details for display
export function getSeasonalDetails(rituId: string) {
  return seasonalDatabase[rituId] || seasonalDatabase.grisham;
}

// Function to fetch time-slot recommendations from API
export async function getTimeSlotRecommendations(rituId: string): Promise<{
  time: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  pdfUrl?: string;
}[] | null> {
  try {
    const response = await fetch(`/api/ritucharya/time-recommendations?rituId=${rituId}`);
    if (response.ok) {
      const data = await response.json();
      return data?.timeSlots || null;
    }
  } catch (error) {
    console.error(`Failed to fetch time recommendations for ${rituId}:`, error);
  }
  return null;
}
