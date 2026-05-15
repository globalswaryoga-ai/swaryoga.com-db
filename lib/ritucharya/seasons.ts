export interface RituSeason {
  id: string;
  nameHi: string;
  nameEn: string;
  emoji: string;
  monthsHi: string;
  monthsEn: string;
  tempRange: string;
  temperatureC: { min: number; max: number };
  humidityRange: string;
  humidityPercent: { min: number; max: number };
  naturePhase: {
    hi: string;
    en: string;
  };
  skinEffect: {
    type: string;
    description: string;
  };
  bodyEffect: {
    energy: string;
    digestion: string;
    sleep: string;
  };
  dayNightCycle: {
    day: string;
    night: string;
    bestTime: string;
  };
  doshas: {
    vata: number;
    pitta: number;
    kapha: number;
  };
  tastesToEat: {
    name: string;
    nameHi: string;
    nameEn: string;
    examples: string;
  }[];
  tastesToAvoid: {
    name: string;
    nameHi: string;
    nameEn: string;
    examples: string;
  }[];
  healthTips: string[];
  timeCycle: {
    time: string;
    timeHi: string;
    dosha: string;
    effect: string;
    advice: string;
  }[];
}

export const ritucharya_seasons: RituSeason[] = [
  {
    id: 'grisham',
    nameHi: 'गर्मी (ग्रीष्म)',
    nameEn: 'Grisham',
    emoji: '☀️',
    monthsHi: 'मई-जून',
    monthsEn: 'May-June',
    tempRange: '32-45°C',
    temperatureC: { min: 32, max: 45 },
    humidityRange: 'Low (10-20%)',
    humidityPercent: { min: 10, max: 20 },
    naturePhase: {
      hi: 'नई पत्तियां, फूल खिलने लगते हैं',
      en: 'New leaves, flowers blooming'
    },
    skinEffect: {
      type: 'Dry',
      description: 'Dry, tense, prone to irritation'
    },
    bodyEffect: {
      energy: 'Moderate',
      digestion: 'Fast (quick hunger)',
      sleep: 'Light, scattered'
    },
    dayNightCycle: {
      day: 'Very hot (intense sun)',
      night: 'Cool and pleasant',
      bestTime: 'Morning and evening'
    },
    doshas: {
      vata: 60,
      pitta: 85,
      kapha: 20
    },
    tastesToEat: [
      {
        name: 'मीठा',
        nameHi: 'Sweet (मीठा)',
        nameEn: 'Sweet',
        examples: 'Yogurt, milk, kheer'
      },
      {
        name: 'कसैला',
        nameHi: 'Astringent (कसैला)',
        nameEn: 'Astringent',
        examples: 'Pomegranate, papaya'
      },
      {
        name: 'खट्टा',
        nameHi: 'Sour (खट्टा)',
        nameEn: 'Sour',
        examples: 'Grapes, olives'
      }
    ],
    tastesToAvoid: [
      {
        name: 'तीव्र',
        nameHi: 'Pungent (तीव्र)',
        nameEn: 'Pungent',
        examples: 'Chili, garlic'
      },
      {
        name: 'लवण',
        nameHi: 'Salty (लवण)',
        nameEn: 'Salty',
        examples: 'Limit salt intake'
      },
      {
        name: 'कड़वा',
        nameHi: 'Bitter (कड़वा)',
        nameEn: 'Bitter',
        examples: 'Basil (in moderation)'
      }
    ],
    healthTips: [
      'नियमित तेल मालिश करें (नारियल का तेल सर्वश्रेष्ठ)',
      'ठंडा दूध और घी का सेवन करें',
      'सुबह जल्दी उठकर व्यायाम करें (धूप से बचें)',
      'दिन में 2-3 घंटे आराम करें',
      'पानी खूब पिएं (गुनगुना या ठंडा)',
      'चावल, मूंग, दही का सेवन अधिक करें',
      'तीव्र और तेल से युक्त भोजन कम करें',
      'शाम को योग और ध्यान करें'
    ],
    timeCycle: [
      {
        time: '6-9 AM',
        timeHi: 'प्रातः 6-9 AM',
        dosha: 'Kapha',
        effect: 'Peace, lightness',
        advice: 'Best time for exercise'
      },
      {
        time: '12-5 PM',
        timeHi: 'दोपहर 12-5 PM',
        dosha: 'Pitta (maximum)',
        effect: 'Intense, hot',
        advice: 'Eat cool, light food'
      },
      {
        time: '5-8 PM',
        timeHi: 'संध्या 5-8 PM',
        dosha: 'Vata',
        effect: 'Activity, lightness',
        advice: 'Rest and meditation'
      },
      {
        time: '8-11 PM',
        timeHi: 'रात 8-11 PM',
        dosha: 'Kapha',
        effect: 'Peace, heaviness',
        advice: 'Prepare for sleep'
      }
    ]
  },
  {
    id: 'varsha',
    nameHi: 'वर्षा (बारिश)',
    nameEn: 'Varsha',
    emoji: '🌧️',
    monthsHi: 'जुलाई-अगस्त',
    monthsEn: 'July-August',
    tempRange: '25-32°C',
    temperatureC: { min: 25, max: 32 },
    humidityRange: 'Very High (75-95%)',
    humidityPercent: { min: 75, max: 95 },
    naturePhase: {
      hi: 'पत्तियां बढ़ती, हरियाली',
      en: 'Leaves growing, greenery'
    },
    skinEffect: {
      type: 'Oily',
      description: 'Sticky, heavy, infection risk'
    },
    bodyEffect: {
      energy: 'Low (fatigue)',
      digestion: 'Weak, slow',
      sleep: 'More, deep'
    },
    dayNightCycle: {
      day: 'Wet and damp',
      night: 'Wet and cold',
      bestTime: 'Morning and evening'
    },
    doshas: {
      vata: 75,
      pitta: 30,
      kapha: 90
    },
    tastesToEat: [
      {
        name: 'मीठा',
        nameHi: 'Sweet (मीठा)',
        nameEn: 'Sweet',
        examples: 'Honey, wheat'
      },
      {
        name: 'लवण',
        nameHi: 'Salty (लवण)',
        nameEn: 'Salty',
        examples: 'Salt in moderation'
      },
      {
        name: 'खट्टा',
        nameHi: 'Sour (खट्टा)',
        nameEn: 'Sour',
        examples: 'Lemon water'
      }
    ],
    tastesToAvoid: [
      {
        name: 'तीव्र',
        nameHi: 'Pungent (तीव्र)',
        nameEn: 'Pungent',
        examples: 'Reduce spices'
      },
      {
        name: 'कड़वा',
        nameHi: 'Bitter (कड़वा)',
        nameEn: 'Bitter',
        examples: 'Basil, bitter melon'
      },
      {
        name: 'कसैला',
        nameHi: 'Astringent (कसैला)',
        nameEn: 'Astringent',
        examples: 'Raw mango'
      }
    ],
    healthTips: [
      'भारी और तैलीय भोजन से बचें',
      'हल्का, गर्म और आसानी से पचने वाला खाना खाएं',
      'तेल मालिश करते समय सूखे हर्ब्स का उपयोग करें',
      'व्यायाम नियमित रखें',
      'नमी से सुरक्षा के लिए सूखे कपड़े रखें',
      'जिंजर और शहद का सेवन अधिक करें',
      'बासी पानी न पिएं',
      'पाचन क्रिया सुधारने के लिए अदरक-शहद का पानी पिएं'
    ],
    timeCycle: [
      {
        time: '6-9 AM',
        timeHi: 'प्रातः 6-9 AM',
        dosha: 'Kapha',
        effect: 'Heavy, calm',
        advice: 'Do exercise'
      },
      {
        time: '12-5 PM',
        timeHi: 'दोपहर 12-5 PM',
        dosha: 'Pitta',
        effect: 'Heat (damp)',
        advice: 'Eat light food'
      },
      {
        time: '5-8 PM',
        timeHi: 'संध्या 5-8 PM',
        dosha: 'Vata (maximum)',
        effect: 'Light, activity',
        advice: 'Rest'
      },
      {
        time: '8-11 PM',
        timeHi: 'रात 8-11 PM',
        dosha: 'Kapha',
        effect: 'Heavy, sleep',
        advice: 'Sleep early'
      }
    ]
  },
  {
    id: 'sharad',
    nameHi: 'शरद (शरद)',
    nameEn: 'Sharad',
    emoji: '🍂',
    monthsHi: 'सितंबर-अक्टूबर',
    monthsEn: 'September-October',
    tempRange: '20-28°C',
    temperatureC: { min: 20, max: 28 },
    humidityRange: 'Low (30-50%)',
    humidityPercent: { min: 30, max: 50 },
    naturePhase: {
      hi: 'फल पकते, पत्तियां गिरना',
      en: 'Fruits ripening, leaves falling'
    },
    skinEffect: {
      type: 'Dry',
      description: 'Dry but calm'
    },
    bodyEffect: {
      energy: 'Good (balanced)',
      digestion: 'Fine, normal',
      sleep: 'Calm, deep'
    },
    dayNightCycle: {
      day: 'Pleasant and warm',
      night: 'Cool and comfortable',
      bestTime: 'All day pleasant'
    },
    doshas: {
      vata: 40,
      pitta: 75,
      kapha: 35
    },
    tastesToEat: [
      {
        name: 'कड़वा',
        nameHi: 'Bitter (कड़वा)',
        nameEn: 'Bitter',
        examples: 'Basil, neem'
      },
      {
        name: 'कसैला',
        nameHi: 'Astringent (कसैला)',
        nameEn: 'Astringent',
        examples: 'Pomegranate, green tea'
      },
      {
        name: 'मीठा',
        nameHi: 'Sweet (मीठा)',
        nameEn: 'Sweet',
        examples: 'Milk, yogurt'
      }
    ],
    tastesToAvoid: [
      {
        name: 'खट्टा',
        nameHi: 'Sour (खट्टा)',
        nameEn: 'Sour',
        examples: 'Reduce pickles'
      },
      {
        name: 'लवण',
        nameHi: 'Salty (लवण)',
        nameEn: 'Salty',
        examples: 'Limit salt'
      },
      {
        name: 'तीव्र',
        nameHi: 'Pungent (तीव्र)',
        nameEn: 'Pungent',
        examples: 'Reduce spices'
      }
    ],
    healthTips: [
      'पाचन अच्छा है - पौष्टिक भोजन लें',
      'कड़वे और कसैले खाद्य पदार्थों का सेवन बढ़ाएं',
      'नियमित व्यायाम और योग करें',
      'तेल मालिश हल्की-फुल्की रखें',
      'नीम और तुलसी का सेवन अधिक करें',
      'खुली हवा में समय बिताएं',
      'शरीर को साफ और सूखा रखें',
      'सेब, अनार और जामुन का सेवन करें'
    ],
    timeCycle: [
      {
        time: '6-9 AM',
        timeHi: 'प्रातः 6-9 AM',
        dosha: 'Kapha',
        effect: 'Peace',
        advice: 'Do sun salutations'
      },
      {
        time: '12-5 PM',
        timeHi: 'दोपहर 12-5 PM',
        dosha: 'Pitta',
        effect: 'Heat',
        advice: 'Eat lunch'
      },
      {
        time: '5-7 PM',
        timeHi: 'संध्या 5-7 PM',
        dosha: 'Pitta calming',
        effect: 'Pleasant',
        advice: 'Go for a walk'
      },
      {
        time: '8-11 PM',
        timeHi: 'रात 8-11 PM',
        dosha: 'Kapha',
        effect: 'Peace',
        advice: 'Rest and sleep'
      }
    ]
  },
  {
    id: 'hemant',
    nameHi: 'हेमंत (देर सर्दी)',
    nameEn: 'Hemant',
    emoji: '❄️',
    monthsHi: 'नवंबर-दिसंबर',
    monthsEn: 'November-December',
    tempRange: '10-20°C',
    temperatureC: { min: 10, max: 20 },
    humidityRange: 'Very Low (20-40%)',
    humidityPercent: { min: 20, max: 40 },
    naturePhase: {
      hi: 'पत्तियां झड़ना, बीज तैयार',
      en: 'Leaves falling, seeds preparing'
    },
    skinEffect: {
      type: 'Dry',
      description: 'Dry, pulled, use moisturizer'
    },
    bodyEffect: {
      energy: 'Good (cold-ready)',
      digestion: 'Fast, good hunger',
      sleep: 'Deep, long'
    },
    dayNightCycle: {
      day: 'Cold, pleasant',
      night: 'Very cold',
      bestTime: 'Daytime'
    },
    doshas: {
      vata: 85,
      pitta: 25,
      kapha: 70
    },
    tastesToEat: [
      {
        name: 'मीठा',
        nameHi: 'Sweet (मीठा)',
        nameEn: 'Sweet',
        examples: 'Kheer, jaggery'
      },
      {
        name: 'खट्टा',
        nameHi: 'Sour (खट्टा)',
        nameEn: 'Sour',
        examples: 'Pickles, yogurt'
      },
      {
        name: 'लवण',
        nameHi: 'Salty (लवण)',
        nameEn: 'Salty',
        examples: 'Normal salt'
      }
    ],
    tastesToAvoid: [
      {
        name: 'तीव्र',
        nameHi: 'Pungent (तीव्र)',
        nameEn: 'Pungent',
        examples: 'Limit spices'
      },
      {
        name: 'कड़वा',
        nameHi: 'Bitter (कड़वा)',
        nameEn: 'Bitter',
        examples: 'Reduce bitter melon'
      },
      {
        name: 'कसैला',
        nameHi: 'Astringent (कसैला)',
        nameEn: 'Astringent',
        examples: 'Reduce'
      }
    ],
    healthTips: [
      'गर्म तेल से पूरे शरीर की मालिश करें',
      'गर्म दूध में घी डालकर पिएं',
      'ठंड से बचाव के लिए गर्म कपड़े पहनें',
      'व्यायाम नियमित रखें',
      'तेलीय और पौष्टिक भोजन खाएं',
      'सूप और गर्म पेय का सेवन अधिक करें',
      'लहसुन और अदरक का उपयोग बढ़ाएं',
      'सूर्य के संपर्क में आएं'
    ],
    timeCycle: [
      {
        time: '6-9 AM',
        timeHi: 'प्रातः 6-9 AM',
        dosha: 'Vata calming',
        effect: 'Peace',
        advice: 'Light exercise'
      },
      {
        time: '12-2 PM',
        timeHi: 'दोपहर 12-2 PM',
        dosha: 'Digestion best',
        effect: 'Energy',
        advice: 'Main meal'
      },
      {
        time: '5-7 PM',
        timeHi: 'संध्या 5-7 PM',
        dosha: 'Vata',
        effect: 'Activity',
        advice: 'Light exercise'
      },
      {
        time: '8-11 PM',
        timeHi: 'रात 8-11 PM',
        dosha: 'Kapha',
        effect: 'Peace',
        advice: 'Drink warm milk'
      }
    ]
  },
  {
    id: 'shishir',
    nameHi: 'शिशिर (बहुत सर्दी)',
    nameEn: 'Shishir',
    emoji: '🥶',
    monthsHi: 'जनवरी-फरवरी',
    monthsEn: 'January-February',
    tempRange: '5-15°C',
    temperatureC: { min: 5, max: 15 },
    humidityRange: 'Low (25-45%)',
    humidityPercent: { min: 25, max: 45 },
    naturePhase: {
      hi: 'सोए हुए, बीज अंकुरित',
      en: 'Dormant, seeds sprouting'
    },
    skinEffect: {
      type: 'Very Dry',
      description: 'Cracked, pulled, needs dense moisturizer'
    },
    bodyEffect: {
      energy: 'Moderate (cold-protection)',
      digestion: 'Best (very fast)',
      sleep: 'Deep, long, calm'
    },
    dayNightCycle: {
      day: 'Cold but pleasant',
      night: 'Extremely cold',
      bestTime: 'Daytime'
    },
    doshas: {
      vata: 85,
      pitta: 20,
      kapha: 80
    },
    tastesToEat: [
      {
        name: 'मीठा',
        nameHi: 'Sweet (मीठा)',
        nameEn: 'Sweet',
        examples: 'Sesame, ghee'
      },
      {
        name: 'लवण',
        nameHi: 'Salty (लवण)',
        nameEn: 'Salty',
        examples: 'Normal salt'
      },
      {
        name: 'खट्टा',
        nameHi: 'Sour (खट्टा)',
        nameEn: 'Sour',
        examples: 'Yogurt, lemon'
      }
    ],
    tastesToAvoid: [
      {
        name: 'तीव्र',
        nameHi: 'Pungent (तीव्र)',
        nameEn: 'Pungent',
        examples: 'Very limited'
      },
      {
        name: 'कड़वा',
        nameHi: 'Bitter (कड़वा)',
        nameEn: 'Bitter',
        examples: 'Avoid'
      },
      {
        name: 'कसैला',
        nameHi: 'Astringent (कसैला)',
        nameEn: 'Astringent',
        examples: 'Minimize'
      }
    ],
    healthTips: [
      'तेल मालिश और गर्मी सर्वश्रेष्ठ है',
      'तिल का तेल सबसे अच्छा',
      'गर्म दूध और घी का खूब सेवन करें',
      'व्यायाम जारी रखें (शरीर गर्मी के लिए)',
      'तैलीय और पौष्टिक खाना खाएं',
      'सूप, स्टू और गर्म पेय का सेवन',
      'लहसुन, अदरक, तिल का अधिक उपयोग',
      'बीज और नट्स का सेवन अधिक करें'
    ],
    timeCycle: [
      {
        time: '6-10 AM',
        timeHi: 'प्रातः 6-10 AM',
        dosha: 'Cold needs heat',
        effect: 'Peace',
        advice: 'Warm massage and exercise'
      },
      {
        time: '12-3 PM',
        timeHi: 'दोपहर 12-3 PM',
        dosha: 'Digestion maximum',
        effect: 'Warmth',
        advice: 'Substantial meal'
      },
      {
        time: '5-7 PM',
        timeHi: 'संध्या 5-7 PM',
        dosha: 'Vata',
        effect: 'Cold increase',
        advice: 'Light activity'
      },
      {
        time: '8-11 PM',
        timeHi: 'रात 8-11 PM',
        dosha: 'Sleep time',
        effect: 'Very cold',
        advice: 'Warm milk, blankets'
      }
    ]
  },
  {
    id: 'vasant',
    nameHi: 'वसंत (वसंत)',
    nameEn: 'Vasant',
    emoji: '🌸',
    monthsHi: 'मार्च-अप्रैल',
    monthsEn: 'March-April',
    tempRange: '18-28°C',
    temperatureC: { min: 18, max: 28 },
    humidityRange: 'Moderate (40-60%)',
    humidityPercent: { min: 40, max: 60 },
    naturePhase: {
      hi: 'फूल खिलना, नई पत्तियां',
      en: 'Flowers blooming, new leaves'
    },
    skinEffect: {
      type: 'Balanced',
      description: 'Fresh, renewed'
    },
    bodyEffect: {
      energy: 'Optimal (maximum)',
      digestion: 'Balanced',
      sleep: 'Moderate, pleasant'
    },
    dayNightCycle: {
      day: 'Pleasant and warm',
      night: 'Cool and comfortable',
      bestTime: 'All day pleasant'
    },
    doshas: {
      vata: 35,
      pitta: 45,
      kapha: 75
    },
    tastesToEat: [
      {
        name: 'कड़वा',
        nameHi: 'Bitter (कड़वा)',
        nameEn: 'Bitter',
        examples: 'Turmeric, basil'
      },
      {
        name: 'तीव्र',
        nameHi: 'Pungent (तीव्र)',
        nameEn: 'Pungent',
        examples: 'Ginger, chili'
      },
      {
        name: 'कसैला',
        nameHi: 'Astringent (कसैला)',
        nameEn: 'Astringent',
        examples: 'Green vegetables'
      }
    ],
    tastesToAvoid: [
      {
        name: 'मीठा',
        nameHi: 'Sweet (मीठा)',
        nameEn: 'Sweet',
        examples: 'Heavy sweets'
      },
      {
        name: 'खट्टा',
        nameHi: 'Sour (खट्टा)',
        nameEn: 'Sour',
        examples: 'Fermented foods'
      },
      {
        name: 'लवण',
        nameHi: 'Salty (लवण)',
        nameEn: 'Salty',
        examples: 'Heavy salt'
      }
    ],
    healthTips: [
      'हल्के व्यायाम और योग करें',
      'पसीना बहाने वाली गतिविधियां करें',
      'कड़वे और तीव्र खाद्य पदार्थ बढ़ाएं',
      'नीम और तुलसी का नियमित सेवन',
      'साफ-सफाई पर ध्यान दें',
      'अलर्जी से सावधान रहें',
      'खुली हवा में समय बिताएं',
      'हल्के कपड़े पहनें'
    ],
    timeCycle: [
      {
        time: '6-9 AM',
        timeHi: 'प्रातः 6-9 AM',
        dosha: 'Kapha highest',
        effect: 'Heavy, calm',
        advice: 'Vigorous exercise'
      },
      {
        time: '9 AM-12 PM',
        timeHi: '9 AM-12 PM',
        dosha: 'Kapha calming',
        effect: 'Balanced',
        advice: 'Light breakfast'
      },
      {
        time: '12-5 PM',
        timeHi: 'दोपहर 12-5 PM',
        dosha: 'Pitta',
        effect: 'Warmth',
        advice: 'Nutritious lunch'
      },
      {
        time: '5-8 PM',
        timeHi: 'संध्या 5-8 PM',
        dosha: 'Vata increase',
        effect: 'Light, activity',
        advice: 'Light dinner'
      }
    ]
  }
];

export function getRituBySeason(season: string): RituSeason | undefined {
  return ritucharya_seasons.find(r => r.id === season.toLowerCase());
}

export function getClimateRitu(temp: number, humidity: number, description: string): string {
  if (temp > 32) return 'grisham';
  if (temp < 10) return 'shishir';
  if (humidity > 75 && description.toLowerCase().includes('rain')) return 'varsha';
  if (temp >= 20 && temp <= 28 && humidity < 50) return 'sharad';
  if (temp >= 10 && temp < 20 && humidity < 50) return 'hemant';
  if (temp >= 18 && temp <= 28 && humidity >= 40 && humidity <= 70) return 'vasant';
  return 'vasant'; // default
}

export function getCurrentSeasonByDate(date: Date = new Date()): string {
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();

  // 6 Ayurvedic seasons with date ranges (approximate for Northern Hemisphere India)
  // Grishma (Summer): March 15 - May 15
  if ((month === 3 && day >= 15) || (month >= 4 && month < 5) || (month === 5 && day <= 15)) {
    return 'grisham';
  }
  // Varsha (Monsoon): May 15 - July 15
  if ((month === 5 && day >= 15) || (month === 6) || (month === 7 && day <= 15)) {
    return 'varsha';
  }
  // Sharad (Autumn): July 15 - September 15
  if ((month === 7 && day >= 15) || (month === 8) || (month === 9 && day <= 15)) {
    return 'sharad';
  }
  // Hemant (Early Winter): September 15 - November 15
  if ((month === 9 && day >= 15) || (month === 10) || (month === 11 && day <= 15)) {
    return 'hemant';
  }
  // Shishir (Winter): November 15 - January 15
  if ((month === 11 && day >= 15) || (month === 12) || (month === 1 && day <= 15)) {
    return 'shishir';
  }
  // Vasant (Spring): January 15 - March 15
  if ((month === 1 && day >= 15) || (month === 2) || (month === 3 && day <= 15)) {
    return 'vasant';
  }

  return 'vasant'; // default fallback
}
