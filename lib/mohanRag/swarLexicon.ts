/**
 * Swar Yoga Sacred Lexicon & Colloquial Vocabulary Dictionary
 * 
 * Protects ancient Shiva Swarodaya terms from automated mistranslations,
 * while enforcing simple, warm, everyday conversational phrasing.
 */

export interface SacredTerm {
  canonical: string;
  sanskritDevanagari: string;
  hindiSpoken: string;
  marathiSpoken: string;
  englishPhonetic: string;
  simpleExplanation: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const SWAR_YOGA_SACRED_LEXICON: Record<string, SacredTerm> = {
  ida: {
    canonical: 'Ida',
    sanskritDevanagari: 'इडा',
    hindiSpoken: 'इड़ा नाड़ी (बायां स्वर)',
    marathiSpoken: 'इडा नाडी (डावा स्वर / चंद्र नाडी)',
    englishPhonetic: 'Ida Nadi (Left Nostril / Lunar Breath)',
    simpleExplanation: {
      en: 'The cool, calming left breath that relaxes your mind and brings peace.',
      hi: 'बायां ठंडा स्वर जो मन को शांत, शीतल और स्थिर रखता है।',
      mr: 'डावा शीतल स्वर जो मनाला शांत, थंड आणि स्थिर ठेवतो.',
    },
  },
  pingala: {
    canonical: 'Pingala',
    sanskritDevanagari: 'पिङ्गला',
    hindiSpoken: 'पिंगला नाड़ी (दायां स्वर / सूर्य नाड़ी)',
    marathiSpoken: 'पिंगळा नाडी (उजवा स्वर / सूर्य नाडी)',
    englishPhonetic: 'Pingala Nadi (Right Nostril / Solar Breath)',
    simpleExplanation: {
      en: 'The warm, energizing right breath that fires up your digestion and active power.',
      hi: 'दायां गर्म स्वर जो पाचन को तेज करता है और शरीर में ऊर्जा जगाता है।',
      mr: 'उजवा उष्ण स्वर जो पचनक्रिया जलद करतो आणि शरीरात उत्साह आणतो.',
    },
  },
  sushumna: {
    canonical: 'Sushumna',
    sanskritDevanagari: 'सुषुम्णा',
    hindiSpoken: 'सुषुम्ना नाड़ी (मध्यम स्वर)',
    marathiSpoken: 'सुषुम्ना नाडी (मध्य स्वर / शून्य अवस्था)',
    englishPhonetic: 'Sushumna Nadi (Central Spiritual Channel)',
    simpleExplanation: {
      en: 'When both nostrils flow equally, bringing deep meditation and stillness.',
      hi: 'जब दोनों स्वर एक साथ चलें, तब ध्यान और समाधि का समय होता है।',
      mr: 'जेव्हा दोन्ही नाकपुड्यांमधून सारखाच श्वास चालतो, तेव्हा ध्यानाची वेळ असते.',
    },
  },
  shiva_swarodaya: {
    canonical: 'Shiva Swarodaya',
    sanskritDevanagari: 'शिव स्वरोदय',
    hindiSpoken: 'शिव स्वरोदय शास्त्र',
    marathiSpoken: 'शिव स्वरोदय शास्त्र',
    englishPhonetic: 'Shiva Swarodaya Scripture',
    simpleExplanation: {
      en: 'The sacred dialogue between Lord Shiva and Goddess Parvati on the secrets of breath.',
      hi: 'भगवान शिव और माता पार्वती का पवित्र ज्ञान जो श्वास के रहस्यों को सिखाता है।',
      mr: 'भगवान शिव आणि माता पार्वती यांचा पवित्र संवाद जो श्वासाचे रहस्य शिकवतो.',
    },
  },
  swara: {
    canonical: 'Swar',
    sanskritDevanagari: 'स्वर',
    hindiSpoken: 'स्वर (श्वास का प्रवाह)',
    marathiSpoken: 'स्वर (श्वासाचा प्रवाह)',
    englishPhonetic: 'Swar (The Flow of Breath)',
    simpleExplanation: {
      en: 'The living breath flowing through your nostrils.',
      hi: 'नाक से बहने वाली प्राण वायु का प्रवाह।',
      mr: 'नाकातून वाहणाऱ्या श्वासाची जिवंत लय.',
    },
  },
  prana: {
    canonical: 'Prana',
    sanskritDevanagari: 'प्राण',
    hindiSpoken: 'प्राण शक्ति (जीवन ऊर्जा)',
    marathiSpoken: 'प्राण शक्ती (जीवन ऊर्जा)',
    englishPhonetic: 'Prana (Life-Force Energy)',
    simpleExplanation: {
      en: 'The vital life energy inside you.',
      hi: 'हमारे अंदर की जीवन शक्ति।',
      mr: 'आपल्या शरीरातील जीवन ऊर्जा.',
    },
  },
  tattva: {
    canonical: 'Tattva',
    sanskritDevanagari: 'तत्त्व',
    hindiSpoken: 'पंच तत्त्व (पृथ्वी, जल, अग्नि, वायु, आकाश)',
    marathiSpoken: 'पंच तत्त्व (पृथ्वी, आप, तेज, वायू, आकाश)',
    englishPhonetic: 'Five Elements (Earth, Water, Fire, Air, Space)',
    simpleExplanation: {
      en: 'The five natural building blocks of the body and breath.',
      hi: 'शरीर और श्वास के पांच मूल तत्त्व।',
      mr: 'शरीर आणि श्वासाची पाच मूलभूत तत्त्वे.',
    },
  },
  bhojan_pachan: {
    canonical: 'Bhojan Pachan',
    sanskritDevanagari: 'भोजन पाचन',
    hindiSpoken: 'खाना पचाना',
    marathiSpoken: 'अन्न पचन',
    englishPhonetic: 'Digestion of Food',
    simpleExplanation: {
      en: 'Eating during right nostril (Sun breath) to easily digest your food.',
      hi: 'दाएं सूर्य स्वर में भोजन करना ताकि खाना मक्खन की तरह आसानी से पच जाए।',
      mr: 'उजव्या सूर्य स्वरामध्ये जेवण करणे, जेणेकरून अन्न अगदी सहज पचते.',
    },
  },
};

/**
 * Words that should NEVER be used in public avatar speeches (too academic / bookish)
 * and their warm, local, everyday spoken replacements.
 */
export const COLLOQUIAL_REPLACEMENTS: Record<string, { en: string; hi: string; mr: string }> = {
  'respiratory equilibrium': {
    en: 'calm and steady breathing',
    hi: 'शांत और सहज श्वास',
    mr: 'शांत आणि संथ श्वास',
  },
  'contralateral nasal airflow': {
    en: 'breathing through the opposite nostril',
    hi: 'दूसरी नाकपुड़ी से श्वास लेना',
    mr: 'दुसऱ्या नाकपुडीतून श्वास घेणे',
  },
  'metabolic acceleration': {
    en: 'good digestion and natural energy',
    hi: 'पाचन की अच्छी ताकत और ऊर्जा',
    mr: 'चांगली पचनशक्ती आणि उत्साह',
  },
  'circadian biometric cadence': {
    en: 'daily natural body clock',
    hi: 'शरीर की कुदरती घड़ी',
    mr: 'शरीराचे नैसर्गिक चक्र',
  },
  'metaphysical introspection': {
    en: 'closing your eyes and looking inside yourself',
    hi: 'आंखें बंद करके अपने अंदर देखना',
    mr: 'डोळे मिटून स्वतःच्या आत डोकावणे',
  },
};

/**
 * Ensures text uses only simple, everyday, colloquial language
 */
export function simplifyForSpokenDelivery(text: string, language: 'en' | 'hi' | 'mr'): string {
  let simplified = text;
  for (const [academic, replacement] of Object.entries(COLLOQUIAL_REPLACEMENTS)) {
    const regex = new RegExp(`\\b${academic}\\b`, 'gi');
    simplified = simplified.replace(regex, replacement[language] || replacement.en);
  }
  return simplified;
}

