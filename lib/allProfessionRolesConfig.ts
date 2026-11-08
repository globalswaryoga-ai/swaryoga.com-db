/**
 * SWAR YOGA AI AVATAR VIDEO ENGINE - HIGH-QUALITY PROFESSIONAL OUTFITS & VIDEOS
 * Real Mohan Sir Face + Real Cloned Voice + Curated Professional Clothing (Suits, Blazers, Kurtas)
 */

export interface ProfessionRoleConfig {
  id: string;
  nameHi: string;
  nameEn: string;
  icon: string;
  category: 'corporate' | 'education' | 'spiritual' | 'conference';
  cameraFraming: 'close_up' | 'chest_up' | 'torso';
  lightingPreset: 'cinematic' | '5600k_daylight' | 'vedic_warm';
  speakingStyle: string;
  gestures: string;
  defaultOutfit: {
    titleHi: string;
    titleEn: string;
    description: string;
    promptText: string;
    colors: string[];
    icon: string;
  };
  defaultBackground: {
    id: string;
    titleHi: string;
    titleEn: string;
    description: string;
    promptText: string;
    imageUrl: string;
    icon: string;
  };
  sampleTopics: {
    hi: string;
    mr: string;
    en: string;
  };
  videoUrl: string;
  avatarImageUrl: string;
}

export const ALL_PROFESSION_ROLES: ProfessionRoleConfig[] = [
  // 1. Executive Corporate Blazer & Suit (बिजनेसमैन / की-नोट एक्जीक्यूटिव सूट)
  {
    id: 'businessman_entrepreneur',
    nameHi: 'व्यवसायी व की-नोट लीडर (Executive Business Suit)',
    nameEn: 'Executive Businessman & Keynote Founder',
    icon: '💼',
    category: 'corporate',
    cameraFraming: 'torso',
    lightingPreset: 'cinematic',
    speakingStyle: 'दृढ़, दूरदर्शी, आत्मविश्वासी और नेतृत्वकारी स्वर',
    gestures: 'मजबूत व्यावसायिक हाव-भाव, सीधा आत्मविश्वासी पोश्चर, स्पष्ट दृष्टिसंपर्क',
    videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    avatarImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_businessman_suit.jpg',
    defaultOutfit: {
      titleHi: 'प्रीमियम बिज़नेस सूट व कोट (Navy Suit & Tie)',
      titleEn: 'Tailored Bespoke Executive Suit & Tie',
      description: 'डार्क नेवी टेलर्ड बिज़नेस कोट, सफेद कॉलर शर्ट व सिल्क टाई — उच्च कॉर्पोरेट प्रेजेंटेशन के लिए।',
      promptText: 'Professional Indian executive in tailored navy suit coat and crisp white shirt',
      colors: ['#0F172A', '#1E293B', '#FFFFFF'],
      icon: '👔',
    },
    defaultBackground: {
      id: 'bg_founder_suite',
      titleHi: 'कॉर्पोरेट बोर्डरूम व एग्जीक्यूटिव सुइट',
      titleEn: 'Modern Corporate Boardroom',
      description: 'आधुनिक कॉर्पोरेट बोर्डरूम व कॉन्फ्रेंस हॉल परिप्रेक्ष्य।',
      promptText: 'Modern luxury corporate boardroom with soft ambient depth',
      imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_businessman_suit.jpg',
      icon: '🏙️',
    },
    sampleTopics: {
      hi: 'बिज़नेस ग्रोथ, रिस्क मैनेजमेंट और हाई-स्ट्रेस डील्स में स्थिर मन का विज्ञान।',
      mr: 'व्यवसाय वाढ, जोखीम व्यवस्थापन आणि मोठ्या निर्णयांमध्ये शांत बुद्धीचे महत्त्व.',
      en: 'Executive presence, emotional equilibrium, and strategic clarity for business leaders.',
    },
  },

  // 2. Charcoal Bandhgala / Modi Achkan (मास्टरक्लास व इंटरनेशनल कॉन्फ्रेंस)
  {
    id: 'charcoal_bandhgala_master',
    nameHi: 'मास्टरक्लास व इंटरनेशनल कॉन्फ्रेंस (Charcoal Bandhgala)',
    nameEn: 'International Keynote Bandhgala Achkan',
    icon: '✨',
    category: 'conference',
    cameraFraming: 'chest_up',
    lightingPreset: 'cinematic',
    speakingStyle: 'प्रभावी, अधिकारपूर्ण, संतुलित व ओजस्वी स्वर',
    gestures: 'ज्ञान मुद्रा, सहज हस्तसंकेत और शांत गरिमापूर्ण शिक्षण शैली',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    avatarImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
    defaultOutfit: {
      titleHi: 'सद्गुरु चारकोल बंदगला नेहरू जैकेट व कुर्ता',
      titleEn: 'Charcoal Bandhgala Nehru Jacket over Kurta',
      description: 'क्लासिक चारकोल-नेवी बंदगला नेहरू जैकेट — इंटरनेशनल समिट्स व प्रतिष्ठित सम्मेलनों के लिए।',
      promptText: 'Distinguished Indian keynote speaker wearing charcoal Nehru bandhgala coat',
      colors: ['#334155', '#1E293B', '#F8FAFC'],
      icon: '🦺',
    },
    defaultBackground: {
      id: 'bg_conference_hall',
      titleHi: 'ग्रैंड कॉन्फ्रेंस ऑडिटोरियम',
      titleEn: 'Grand Auditorium Stage',
      description: 'अंतर्राष्ट्रीय योग व स्वास्थ्य शिखर सम्मेलन की-नोट मंच।',
      promptText: 'Grand auditorium stage with warm subtle spotlights',
      imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
      icon: '🏛️',
    },
    sampleTopics: {
      hi: 'वैश्विक मंच पर स्वर योग: मानव चेतना और न्यूरोसाइंस का संगम।',
      mr: 'जागतिक स्तरावर स्वर योग: मानवी मन आणि न्यूरोसायन्सचा समन्वय.',
      en: 'Swar Yoga on the global stage: Bridging ancient wisdom with modern neuroscience.',
    },
  },

  // 3. Pure White Khadi Kurta & Rudraksha (प्राणायाम व ध्यान मास्टर)
  {
    id: 'vedic_white_khadi_master',
    nameHi: 'स्वर योग गुरु व प्राणायाम आचार्य (Pure White Khadi)',
    nameEn: 'Vedic Swar Guru & Pranayama Master',
    icon: '🧘',
    category: 'spiritual',
    cameraFraming: 'chest_up',
    lightingPreset: 'vedic_warm',
    speakingStyle: 'शांत, गंभीर, शास्त्रीय प्रवाह व आध्यात्मिक मिठास',
    gestures: 'चिन मुद्रा, शांत श्वसन गति, स्थिर आँखें',
    videoUrl: 'https://swaryogacrm.b-cdn.net/users/mohan-rag-avatar/training-vault/1793151988088-hgfwl8-Shad_Ripu_Explained___6_Enemies_of_the_Mind_That_Destroy_Peace.mp4',
    avatarImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
    defaultOutfit: {
      titleHi: 'पवित्र श्वेत खादी कुर्ता व रुद्राक्ष (White Khadi & Rudraksha)',
      titleEn: 'Pure White Handspun Khadi Kurta & Rudraksha',
      description: 'मोहन सर का सिग्नेचर सफेद खादी कुर्ता, मंदारिन कॉलर व प्राकृतिक रुद्राक्ष माला।',
      promptText: 'Spiritual yoga master wearing pure white khadi kurta and rudraksha mala',
      colors: ['#FFFFFF', '#F1F5F9', '#78350F'],
      icon: '⚪',
    },
    defaultBackground: {
      id: 'bg_ashram_sanctum',
      titleHi: 'वैदिक आश्रम व हिमालयन साधना पीठ',
      titleEn: 'Himalayan Ashram Sanctum',
      description: 'शांत आश्रम, प्राकृतिक प्रकाश और सात्विक साधना कक्ष।',
      promptText: 'Serene Himalayan ashram room with morning sunrise glow',
      imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
      icon: '🕉️',
    },
    sampleTopics: {
      hi: 'प्रातःकाल में इड़ा व पिंगला नाड़ी को संतुलित करने की गोपनीय विधि।',
      mr: 'सकाळच्या वेळी चंद्र व सूर्य स्वर संतुलित करण्याचे शास्त्रशुद्ध रहस्य.',
      en: 'Mastering Ida and Pingala Nadis: Morning breath alchemy for peak focus.',
    },
  },

  // 4. University Professor & Scholar (विश्वविद्यालय प्राध्यापक व शोधकर्ता)
  {
    id: 'university_professor',
    nameHi: 'विश्वविद्यालय व्याख्याता (Academic University Scholar)',
    nameEn: 'Academic University Scholar',
    icon: '🎓',
    category: 'education',
    cameraFraming: 'chest_up',
    lightingPreset: '5600k_daylight',
    speakingStyle: 'अकादमिक स्पष्टता, शोधपरक तर्क और गंभीर शिक्षण स्वर',
    gestures: 'तर्कसंगत हस्तसंकेत, स्पष्ट आरेख निरूपण, स्थिर दृष्टि',
    videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    avatarImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_businessman_suit.jpg',
    defaultOutfit: {
      titleHi: 'अकादमिक ट्वीड ब्लेज़र व फॉर्मल शर्ट (Academic Tweed Blazer)',
      titleEn: 'Academic Tweed Blazer & Pressed Shirt',
      description: 'नेवी-चारकोल ब्लेज़र, फॉर्मल शर्ट — विश्वविद्यालय व्याख्यान के लिए उत्तम।',
      promptText: 'Distinguished university professor in tailored tweed blazer and pressed shirt',
      colors: ['#1E293B', '#334155', '#E2E8F0'],
      icon: '🧥',
    },
    defaultBackground: {
      id: 'bg_academic_hall',
      titleHi: 'विश्वविद्यालय व्याख्यान कक्ष व लाइब्रेरी',
      titleEn: 'University Lecture Hall & Library',
      description: 'क्लासिकल लाइब्रेरी व एकेडमिक पोडियम।',
      promptText: 'Grand university lecture hall with classical oak bookshelves',
      imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
      icon: '📚',
    },
    sampleTopics: {
      hi: 'स्वर विज्ञान और न्यूरो-बायोलॉजी: मस्तिष्क के बाएं व दाएं गोलार्ध का संतुलन।',
      mr: 'स्वर विज्ञान आणि न्यूरो-बायोलॉजी: मेंदूच्या डाव्या व उजव्या भागाचे संतुलन.',
      en: 'Swar Science and Neurobiology: Hemispheric synchronization through breath cycles.',
    },
  },

  // 5. Royal Saffron Silk (केसरिया राजसी सिल्क - शिव स्वरोदय मीमांसा)
  {
    id: 'royal_saffron_silk_acharya',
    nameHi: 'शिव स्वरोदय मीमांसा (Royal Saffron Silk)',
    nameEn: 'Shiva Swarodaya Scriptural Acharya',
    icon: '🕉️',
    category: 'spiritual',
    cameraFraming: 'chest_up',
    lightingPreset: 'vedic_warm',
    speakingStyle: 'गहरा, शास्त्रीय संस्कृत श्लोक वाचन और ओजस्वी व्याख्यान',
    gestures: 'शास्त्र निर्देश, शांत मुस्कान, गंभीर वैदिक उपदेश',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    avatarImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_close_blackbeard.jpg',
    defaultOutfit: {
      titleHi: 'केसरिया रेशमी कुर्ता व स्वर्ण बॉर्डर (Saffron Silk with Gold Zari)',
      titleEn: 'Sacred Saffron Silk with Gold Border',
      description: 'सूर्य स्वर की शक्ति व शिव स्वरोदय शास्त्र के लिए शुभ केसरिया सिल्क कुर्ता।',
      promptText: 'Vedic scholar wearing rich saffron silk kurta with gold border',
      colors: ['#EA580C', '#C2410C', '#FDE047'],
      icon: '🟠',
    },
    defaultBackground: {
      id: 'bg_vedic_temple',
      titleHi: 'प्राचीन वैदिक मंदिर प्रांगण',
      titleEn: 'Ancient Vedic Sanctum',
      description: 'शिव स्वरोदय शास्त्र व्याख्यान के लिए पावन मंदिर वातावरण।',
      promptText: 'Ancient stone temple courtyard with brass oil lamps',
      imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_close_blackbeard.jpg',
      icon: '🛕',
    },
    sampleTopics: {
      hi: 'सूर्य स्वर में भोजन, यात्रा व पुरुषार्थ के अचूक फल।',
      mr: 'सूर्य स्वरात भोजन, प्रवास आणि महत्त्वाची कामे करण्याचे लाभ.',
      en: 'Surya Nadi activation: Timing nutrition and decisive actions with solar rhythm.',
    },
  },

  // 6. Classroom Swar Teacher (आश्रम क्लासरूम व आहार शास्त्र)
  {
    id: 'classroom_swar_teacher',
    nameHi: 'आहार व दिनचर्या विशेषज्ञ (Classroom Swar Teacher)',
    nameEn: 'Classroom Swar & Diet Educator',
    icon: '🌿',
    category: 'education',
    cameraFraming: 'chest_up',
    lightingPreset: '5600k_daylight',
    speakingStyle: 'सरल, व्यावहारिक, आत्मीय और रोजमर्रा के उदाहरणों से भरपूर',
    gestures: 'सहज क्लासरूम हाथ के इशारे, गर्मजोशी भरी मुस्कान',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    avatarImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
    defaultOutfit: {
      titleHi: 'वैदिक नेचुरल खादी कुर्ता व लिनेन स्टोल (Natural Khadi & Linen Stole)',
      titleEn: 'Natural Cream Khadi Kurta & Linen Stole',
      description: 'आरामदेह सात्विक खादी कुर्ता व लिनेन स्टोल — आहार शास्त्र व दैनिक आदतों के शिक्षण के लिए।',
      promptText: 'Welcoming Indian teacher in clean cream khadi kurta with linen stole',
      colors: ['#F5F5DC', '#D4AF37', '#FFFFFF'],
      icon: '🤍',
    },
    defaultBackground: {
      id: 'bg_classroom_studio',
      titleHi: 'स्वर योग विद्यापीठ क्लासरूम स्टूडियो',
      titleEn: 'Swar Yoga Classroom Studio',
      description: 'इंटरैक्टिव क्लासरूम बोर्ड, लाइव स्टूडेंट इंटरेक्शन सेटअप।',
      promptText: 'Bright minimalist classroom studio with interactive white board',
      imageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
      icon: '🏫',
    },
    sampleTopics: {
      hi: 'जठराग्नि और स्वर का संबंध: कब क्या खाएं जिससे कभी गैस व अपच न हो।',
      mr: 'जठराग्नी आणि स्वर: पचनशक्ती वाढवण्यासाठी जेवणाची योग्य वेळ.',
      en: 'Digestive fire and breath rhythm: What and when to eat for effortless digestion.',
    },
  },
];

export const PROFESSION_CATEGORIES = [
  { id: 'all', nameHi: 'सभी प्रीमियम रोल्स (All Videos)', icon: '🌟' },
  { id: 'corporate', nameHi: 'एक्जीक्यूटिव व बिज़नेस (Corporate & Suit)', icon: '💼' },
  { id: 'conference', nameHi: 'कॉन्फ्रेंस व की-नोट (Keynote Bandhgala)', icon: '✨' },
  { id: 'spiritual', nameHi: 'स्वर योग व साधना (Vedic Khadi & Silk)', icon: '🧘' },
  { id: 'education', nameHi: 'एकेडमिक व क्लासरूम (University & Diet)', icon: '🎓' },
];
