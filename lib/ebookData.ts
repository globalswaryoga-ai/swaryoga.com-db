export type EBookPillar = 'health' | 'wealth' | 'spiritual' | 'parenting' | 'pregnancy';

export interface LocalizedString {
  hi: string;
  en: string;
  mr: string;
  kn?: string;
}

export interface EBookChapter {
  id: string;
  pillar: EBookPillar;
  chapterNumber: number;
  shortName: LocalizedString;
  title: LocalizedString;
  excerpt: LocalizedString;
  readTime: LocalizedString;
  image: string;
  publishedDate: string;
  author: string;
  content: {
    hi: string;
    en: string;
    mr: string;
    kn?: string;
    [lang: string]: string | undefined;
  };
  tags: string[];
}

export interface PillarMeta {
  id: EBookPillar;
  name: LocalizedString;
  shortName: LocalizedString;
  iconName: string;
  iconEmoji: string;
  badgeBg: string;
  badgeBorder: string;
  color: string;
  description: LocalizedString;
}

export interface PillarTopic {
  id: string;
  pillar: EBookPillar;
  topicName: LocalizedString;
  shortName: LocalizedString;
  description: LocalizedString;
  iconEmoji: string;
  gradient: string;
  borderColor: string;
  accentColor: string;
  chapterCount: number;
  linkedChapterId?: string;
}

export const PILLAR_TOPICS: PillarTopic[] = [
  // ── HEALTH TOPICS (6 Colorful Topics - 2 rows of 3) ──
  {
    id: 'health_topic_1',
    pillar: 'health',
    topicName: {
      hi: 'नासिका चक्र व इड़ा-पिंगला शुद्धि',
      en: 'Nostril Cycle & Ida-Pingala Detox',
      mr: 'श्वास चक्र व इडा-पिंगळा शुद्धी',
      kn: 'ಉಸಿರಾಟದ ಲಯ ಮತ್ತು ನಾಡಿ ಶುದ್ಧಿ'
    },
    shortName: { hi: 'इड़ा-पिंगला चक्र', en: 'Ida-Pingala Flow', mr: 'इडा-पिंगळा', kn: 'ಇಡಾ-ಪಿಂಗಳ' },
    description: {
      hi: 'प्रत्येक 60 से 90 मिनट में बदलने वाले नासिका प्रवाह का शरीर के अंगों और जीवन शक्ति पर प्रभाव।',
      en: 'Understanding the 90-minute bio-clock of nostril dominance for biological repair and cellular vitality.',
      mr: 'दर ९० मिनिटांनी बदलणाऱ्या श्वास चक्राचा शरीरावर होणारा नैसर्गिक प्रभाव.',
      kn: '೯೦ ನಿಮಿಷಗಳ ಉಸಿರಾಟದ ಬದಲಾವಣೆ ಮತ್ತು ಆರೋಗ್ಯ ರಕ್ಷಣೆ.'
    },
    iconEmoji: '🌿',
    gradient: 'from-emerald-950/80 via-emerald-900/40 to-teal-950/80',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    accentColor: '#10b981',
    chapterCount: 3,
    linkedChapterId: 'ebook_health_ch1'
  },
  {
    id: 'health_topic_2',
    pillar: 'health',
    topicName: {
      hi: 'अनिद्रा, रक्तचाप व चंद्र स्वर साधना',
      en: 'Insomnia & Blood Pressure Healing',
      mr: 'शांत झोप, रक्तदाब व चंद्र स्वर',
      kn: 'ನಿದ್ರಾಹೀನತೆ ಮತ್ತು ರಕ್ತದೊತ್ತಡ ನಿಯಂತ್ರಣ'
    },
    shortName: { hi: 'अनिद्रा व शांति', en: 'Deep Sleep & BP', mr: 'शांत झोप', kn: 'ಗಾಢ ನಿದ್ರೆ' },
    description: {
      hi: 'बाईं नासिका सक्रिय करके मेलाटोनिन बढ़ाना, उच्च रक्तचाप नियंत्रित करना और 5 मिनट में गहरी नींद पाना।',
      en: 'Activating Chandra Swar to lower cortisol, stabilize arterial pressure, and induce restorative sleep.',
      mr: 'डावा स्वर चालू करून उच्च रक्तदाब नियंत्रित करणे आणि शांत झोप मिळवणे.',
      kn: 'ಎಡ ನಾಸಿಕ ಉಸಿರಾಟದಿಂದ ನಿದ್ರಾಹೀನತೆಯ ಶಾಶ್ವತ ಪರಿಹಾರ.'
    },
    iconEmoji: '🌙',
    gradient: 'from-indigo-950/80 via-indigo-900/40 to-blue-950/80',
    borderColor: 'border-indigo-500/50 hover:border-indigo-400',
    accentColor: '#6366f1',
    chapterCount: 3,
    linkedChapterId: 'ebook_health_ch2'
  },
  {
    id: 'health_topic_3',
    pillar: 'health',
    topicName: {
      hi: 'ऋतुचर्या, जठराग्नि व आहार नियम',
      en: 'Vedic Diet & Digestive Agni',
      mr: 'ऋतुचर्या, जठराग्नी व आहार नियम',
      kn: 'ಆಹಾರ ನಿಯಮ ಮತ್ತು ಜಠರಾಗ್ನಿ'
    },
    shortName: { hi: 'आहार व ऋतुचर्या', en: 'Diet & Seasons', mr: 'ऋतुचर्या आहार', kn: 'ಋತುಚರ್ಯ ಆಹಾರ' },
    description: {
      hi: 'सूर्य स्वर में भोजन करने से 100% पाचन, गैस-एसिडिटी से मुक्ति और 6 ऋतुओं में त्रिदोष संतुलन।',
      en: 'Eating exclusively under Surya Swar to ignite digestive enzymes and eliminate metabolic toxins.',
      mr: 'सूर्य स्वरामध्ये भोजन केल्याने अपचन, ॲसिडिटी दूर होऊन आरोग्य लाभते.',
      kn: 'ಸೂರ್ಯ ಸ್ವರದಲ್ಲಿ ಆಹಾರ ಸೇವನೆಯಿಂದ ಸಂಪೂರ್ಣ ಜೀರ್ಣಕ್ರಿಯೆ.'
    },
    iconEmoji: '🍲',
    gradient: 'from-amber-950/80 via-amber-900/40 to-orange-950/80',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    accentColor: '#f59e0b',
    chapterCount: 3,
    linkedChapterId: 'ebook_health_ch3'
  },
  {
    id: 'health_topic_4',
    pillar: 'health',
    topicName: {
      hi: 'प्राणायाम, फेफड़े व श्वास रोग निवारण',
      en: 'Pranayama & Respiratory Defense',
      mr: 'प्राणायाम व श्वसन संस्था रक्षण',
      kn: 'ಪ್ರಾಣಾಯಾಮ ಮತ್ತು ಶ್ವಾಸಕೋಶದ ಆರೋಗ್ಯ'
    },
    shortName: { hi: 'फेफड़े व प्राणायाम', en: 'Lungs & Immunity', mr: 'श्वसन संस्था', kn: 'ಶ್ವಾಸಕೋಶ ರಕ್ಷಣೆ' },
    description: {
      hi: 'दमा, एलर्जी और साइनस की स्थायी चिकित्सा हेतु स्वर परिवर्तन और फेफड़ों की क्षमता विस्तार।',
      en: 'Reversing asthma, seasonal allergies, and sinus blockages through targeted nostril breathing.',
      mr: 'दमा आणि ॲलर्जीवर मात करण्यासाठी स्वर योगाचे अचूक प्राणायाम नियम.',
      kn: 'ಅಲರ್ಜಿ ಮತ್ತು ಸೈನಸ್ ಸಮಸ್ಯೆಗೆ ಶಾಶ್ವತ ಪರಿಹಾರ.'
    },
    iconEmoji: '🫁',
    gradient: 'from-teal-950/80 via-teal-900/40 to-cyan-950/80',
    borderColor: 'border-teal-500/50 hover:border-teal-400',
    accentColor: '#14b8a6',
    chapterCount: 3,
    linkedChapterId: 'ebook_health_ch1'
  },
  {
    id: 'health_topic_5',
    pillar: 'health',
    topicName: {
      hi: 'रीढ़ की हड्डी, मुद्रा व वात विकार',
      en: 'Spine, Posture & Vata Balance',
      mr: 'पाठीचा कणा व वात विकार निवारण',
      kn: 'ಬೆನ್ನುಮೂಳೆ ಮತ್ತು ವಾತ ದೋಷ ಪರಿಹಾರ'
    },
    shortName: { hi: 'रीढ़ व वात रक्षा', en: 'Spine & Posture', mr: 'पाठीचा कणा', kn: 'ಬೆನ್ನುಮೂಳೆ ಆರೋಗ್ಯ' },
    description: {
      hi: 'बैठने और सोने की सही करवट से मेरुदंड का प्राकृतिक संरेखण और जोड़ों के दर्द से मुक्ति।',
      en: 'Vedic postural ergonomics to realign the spine, drain lymphatic toxins, and soothe joints.',
      mr: 'झोपण्याच्या आणि बसण्याच्या योग्य मुद्रांमुळे सांधेदुखी आणि मणक्याचे विकार टळतात.',
      kn: 'ಸರಿಯಾದ ನಿದ್ರಾ ಭಂಗಿಯಿಂದ ಕೀಲು ನೋವು ಮತ್ತು ಬೆನ್ನು ನೋವಿನ ನಿವಾರಣೆ.'
    },
    iconEmoji: '🧘',
    gradient: 'from-rose-950/80 via-rose-900/40 to-pink-950/80',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    accentColor: '#f43f5e',
    chapterCount: 3,
    linkedChapterId: 'ebook_health_ch2'
  },
  {
    id: 'health_topic_6',
    pillar: 'health',
    topicName: {
      hi: 'जल सेवन, चंद्र विषहरण व कायाकल्प',
      en: 'Hydration & Lunar Detox',
      mr: 'जल सेवन व चंद्र विषहरण',
      kn: 'ಜಲ ಸೇವನೆ ಮತ್ತು ಚಂದ್ರ ಡಿಟಾಕ್ಸ್'
    },
    shortName: { hi: 'जल व चंद्र अमृत', en: 'Water & Detox', mr: 'जल चिकित्सा', kn: 'ಜಲ ಚಿಕಿತ್ಸೆ' },
    description: {
      hi: 'चंद्र स्वर में जल पीने से कोशिकाओं का कायाकल्प और गुर्दे व आंतों का संपूर्ण शुद्धिकरण।',
      en: 'Drinking water strictly under Chandra Swar to optimize intracellular hydration and kidney cleansing.',
      mr: 'चंद्र स्वरामध्ये पाणी पिल्याने शरीरातील विषद्रव्ये बाहेर पडून कायाकल्प होतो.',
      kn: 'ಚಂದ್ರ ಸ್ವರದಲ್ಲಿ ನೀರು ಕುಡಿಯುವುದರಿಂದ ಜೀವಕೋಶಗಳ ನವಚೈತನ್ಯ.'
    },
    iconEmoji: '💧',
    gradient: 'from-blue-950/80 via-cyan-900/40 to-sky-950/80',
    borderColor: 'border-cyan-500/50 hover:border-cyan-400',
    accentColor: '#06b6d4',
    chapterCount: 3,
    linkedChapterId: 'ebook_health_ch3'
  },

  // ── WEALTH TOPICS (6 Colorful Topics) ──
  {
    id: 'wealth_topic_1',
    pillar: 'wealth',
    topicName: {
      hi: 'व्यापारिक सौदे व अनुबंध विजय',
      en: 'Business Contracts & Deals',
      mr: 'व्यापारी करार व विजय',
      kn: 'ವ್ಯವಹಾರ ಒಪ್ಪಂದಗಳು'
    },
    shortName: { hi: 'व्यापार व सौदे', en: 'Deals & Contracts', mr: 'व्यापारी करार', kn: 'ವ್ಯವಹಾರ ಒಪ್ಪಂದ' },
    description: {
      hi: 'सूर्य स्वर में हस्ताक्षर और क्लाइंट बातचीत से 100% सफलता और वाणी में सम्मोहन प्रभाव।',
      en: 'Leveraging Pingala energy to dominate high-value negotiations and contract signings.',
      mr: 'सूर्य स्वरामध्ये स्वाक्षरी आणि क्लायंट भेट घेतल्यास १००% यश लाभते.',
      kn: 'ಸೂರ್ಯ ಸ್ವರದಲ್ಲಿ ವ್ಯವಹಾರ ಮಾತುಕತೆಗಳಿಂದ ಗರಿಷ್ಠ ಲಾಭ.'
    },
    iconEmoji: '💼',
    gradient: 'from-amber-950/80 via-yellow-900/40 to-orange-950/80',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    accentColor: '#f59e0b',
    chapterCount: 3,
    linkedChapterId: 'ebook_wealth_ch1'
  },
  {
    id: 'wealth_topic_2',
    pillar: 'wealth',
    topicName: {
      hi: 'भूमि, भवन, स्वर्ण क्रय व संपत्ति स्थिरता',
      en: 'Real Estate & Gold Acquisition',
      mr: 'जमीन, घर व सोने खरेदी',
      kn: 'ಆಸ್ತಿ ಮತ್ತು ಬಂಗಾರ ಖರೀದಿ'
    },
    shortName: { hi: 'स्थायी संपत्ति', en: 'Land & Gold', mr: 'स्थिर संपत्ती', kn: 'ಸ್ಥಿರಾಸ್ತಿ' },
    description: {
      hi: 'चंद्र स्वर में की गई खरीदारी पीढ़ियों तक स्थिर रहती है और उसमें कभी विवाद नहीं होता।',
      en: 'Acquiring long-term tangible assets under Chandra Swar to ensure permanent prosperity.',
      mr: 'चंद्र स्वरामध्ये खरेदी केलेली संपत्ती पिढ्यानपिढ्या टिकून राहते.',
      kn: 'ಚಂದ್ರ ಸ್ವರದಲ್ಲಿ ಆಸ್ತಿ ಖರೀದಿಯಿಂದ ಶಾಶ್ವತ ಸಮೃದ್ಧಿ.'
    },
    iconEmoji: '🏰',
    gradient: 'from-emerald-950/80 via-emerald-900/40 to-green-950/80',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    accentColor: '#10b981',
    chapterCount: 3,
    linkedChapterId: 'ebook_wealth_ch2'
  },
  {
    id: 'wealth_topic_3',
    pillar: 'wealth',
    topicName: {
      hi: 'प्रातःकाल स्वर दर्शन व धन आकर्षण',
      en: 'Morning Tithi Wealth Magnet',
      mr: 'प्रातःकालीन स्वर दर्शन व धन प्राप्ती',
      kn: 'ಮುಂಜಾನೆಯ ಧನ ಆಕರ್ಷಣಾ ರಹಸ್ಯ'
    },
    shortName: { hi: 'धन आकर्षण', en: 'Wealth Magnet', mr: 'धन प्राप्ती', kn: 'ಧನ ಆಕರ್ಷಣೆ' },
    description: {
      hi: 'शुक्ल पक्ष की प्रतिपदा को प्रातः चंद्र स्वर दर्शन वर्ष भर धन के भंडार भरता है।',
      en: 'Syncing morning awakening with lunar calendar phases to magnetize financial abundance.',
      mr: 'सकाळी उठल्यावर चालू स्वराचे दर्शन घेणे हे दारिद्र्य नाशाचे अमोघ साधन आहे.',
      kn: 'ಮುಂಜಾನೆ ಎದ್ದ ತಕ್ಷಣ ಸ್ವರ ಪರೀಕ್ಷೆಯಿಂದ ದಾರಿದ್ರ್ಯ ನಾಶ.'
    },
    iconEmoji: '🪙',
    gradient: 'from-purple-950/80 via-violet-900/40 to-indigo-950/80',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    accentColor: '#8b5cf6',
    chapterCount: 3,
    linkedChapterId: 'ebook_wealth_ch3'
  },
  {
    id: 'wealth_topic_4',
    pillar: 'wealth',
    topicName: {
      hi: 'उधार वसूली, वाद विजय व सम्मोहन',
      en: 'Debt Recovery & Assertive Power',
      mr: 'उधार वसुली व वाद विजय',
      kn: 'ಸಾಲ ವಸೂಲಾತಿ ಮತ್ತು ವಿಜಯ'
    },
    shortName: { hi: 'उधार वसूली', en: 'Debt Recovery', mr: 'उधार वसुली', kn: 'ಸಾಲ ವಸೂಲಿ' },
    description: {
      hi: 'रुके हुए धन की वापसी के लिए सूर्य स्वर में यात्रा और व्यक्ति को सक्रिय दिशा में रखना।',
      en: 'Commanding frozen receivables and legal resolution using Surya Swar directional laws.',
      mr: 'अडकलेले पैसे परत मिळवण्यासाठी सूर्य स्वराचा अचूक वापर करा.',
      kn: 'ಬಾಕಿ ಇರುವ ಹಣವನ್ನು ಮರಳಿ ಪಡೆಯಲು ಸೂರ್ಯ ಸ್ವರದ ಬಳಕೆ.'
    },
    iconEmoji: '⚖️',
    gradient: 'from-red-950/80 via-rose-900/40 to-amber-950/80',
    borderColor: 'border-red-500/50 hover:border-red-400',
    accentColor: '#ef4444',
    chapterCount: 3,
    linkedChapterId: 'ebook_wealth_ch1'
  },
  {
    id: 'wealth_topic_5',
    pillar: 'wealth',
    topicName: {
      hi: 'शेयर बाजार, निवेश व निर्णय मुहूर्त',
      en: 'Market Trading & Timing',
      mr: 'शेअर बाजार व गुंतवणूक मुहूर्त',
      kn: 'ಮಾರುಕಟ್ಟೆ ಹೂಡಿಕೆ ಮತ್ತು ಮುಹೂರ್ತ'
    },
    shortName: { hi: 'शेयर व निवेश', en: 'Trading Timing', mr: 'गुंतवणूक मुहूर्त', kn: 'ಹೂಡಿಕೆ ಸಮಯ' },
    description: {
      hi: 'अचानक आवेग में नुकसान से बचने और सही समय पर एंट्री-एग्जिट लेने का स्वर नियम।',
      en: 'Eliminating impulsive trading errors by aligning portfolio decisions with stable breath.',
      mr: 'शेअर बाजारात नुकसान टाळण्यासाठी आणि नफा मिळवण्यासाठी स्वर तंत्र.',
      kn: 'ವ್ಯವಹಾರದಲ್ಲಿ ಆತುರದ ನಿರ್ಧಾರಗಳನ್ನು ತಪ್ಪಿಸಲು ಸ್ವರ ಮಾರ್ಗದರ್ಶನ.'
    },
    iconEmoji: '📈',
    gradient: 'from-blue-950/80 via-indigo-900/40 to-teal-950/80',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    accentColor: '#3b82f6',
    chapterCount: 3,
    linkedChapterId: 'ebook_wealth_ch2'
  },
  {
    id: 'wealth_topic_6',
    pillar: 'wealth',
    topicName: {
      hi: 'तिजोरी स्थापना व महालक्ष्मी संरेखण',
      en: 'Vault Placement & Lakshmi Swar',
      mr: 'तिजोरी स्थापना व लक्ष्मी कृपा',
      kn: 'ಖಜಾನೆ ಸ್ಥಾಪನೆ ಮತ್ತು ಲಕ್ಷ್ಮೀ ಕೃಪೆ'
    },
    shortName: { hi: 'तिजोरी व लक्ष्मी', en: 'Vault & Lakshmi', mr: 'तिजोरी स्थापना', kn: 'ಖಜಾನೆ ಸ್ಥಾಪನೆ' },
    description: {
      hi: 'घर या दुकान की तिजोरी में पहली बार धन रखते समय बायां स्वर होने से निरंतर बरकत रहती है।',
      en: 'Depositing wealth into reserves under Chandra Swar to invite perpetual abundance.',
      mr: 'तिजोरीत धन ठेवताना डावा स्वर चालू असल्यास घरात धन-धान्याची बरकत राहते.',
      kn: 'ಖಜಾನೆಯಲ್ಲಿ ಹಣ ಇಡುವಾಗ ಚಂದ್ರ ಸ್ವರವಿದ್ದರೆ ಸದಾ ಲಕ್ಷ್ಮೀ ಕೃಪೆ.'
    },
    iconEmoji: '👑',
    gradient: 'from-yellow-950/80 via-amber-900/40 to-rose-950/80',
    borderColor: 'border-yellow-500/50 hover:border-yellow-400',
    accentColor: '#eab308',
    chapterCount: 3,
    linkedChapterId: 'ebook_wealth_ch3'
  },

  // ── SPIRITUAL TOPICS (6 Colorful Topics) ──
  {
    id: 'spiritual_topic_1',
    pillar: 'spiritual',
    topicName: {
      hi: 'सुषुम्ना नाड़ी जागरण व समाधि',
      en: 'Sushumna Awakening & Samadhi',
      mr: 'सुषुम्ना नाडी जागरण व समाधी',
      kn: 'ಸುಷುಮ್ನಾ ಜಾಗೃತಿ ಮತ್ತು ಸಮಾಧಿ'
    },
    shortName: { hi: 'सुषुम्ना जागरण', en: 'Sushumna Flow', mr: 'सुषुम्ना', kn: 'ಸುಷುಮ್ನಾ' },
    description: {
      hi: 'जब दोनों नथुनों से समान श्वास बहे, तब काल का चक्र ठहरता है और ध्यान समाधि में बदलता है।',
      en: 'Transcending duality when breath equalizes across both nostrils into cosmic stillness.',
      mr: 'दोन्ही स्वरांमधून समान श्वास वाहताना ध्यान केल्यास आत्मसाक्षात्कार घडतो.',
      kn: 'ಉಭಯ ನಾಸಿಕ ಸಮತೋಲನದಿಂದ ಸಮಾಧಿ ಸ್ಥಿತಿಯ ಅನುಭವ.'
    },
    iconEmoji: '🕉️',
    gradient: 'from-purple-950/80 via-purple-900/40 to-fuchsia-950/80',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    accentColor: '#a855f7',
    chapterCount: 3,
    linkedChapterId: 'ebook_spiritual_ch1'
  },
  {
    id: 'spiritual_topic_2',
    pillar: 'spiritual',
    topicName: {
      hi: 'पंच महाभूत तत्व व भविष्य दर्शन',
      en: 'Five Elements & Intuitive Vision',
      mr: 'पंच महाभूत तत्व व अंतर्ज्ञान',
      kn: 'ಪಂಚಭೂತಗಳು ಮತ್ತು ಅಂತರ್ಜ್ಞಾನ'
    },
    shortName: { hi: 'पंचतत्व विज्ञान', en: 'Five Elements', mr: 'पंचतत्व', kn: 'ಪಂಚತತ್ವ' },
    description: {
      hi: 'पृथ्वी, जल, अग्नि, वायु और आकाश तत्व की नासिका में पहचान कर भविष्य का पूर्वानुमान।',
      en: 'Deciphering elemental geometry on mirrors to unlock intuitive foresight.',
      mr: 'आरशावर श्वासाची आकृती पाहून पंचतत्व ओळखण्याचे प्राचीन विज्ञान.',
      kn: 'ಉಸಿರಾಟದಲ್ಲಿ ಪಂಚತತ್ವಗಳನ್ನು ಗುರುತಿಸಿ ಭವಿಷ್ಯದ ಅರಿವು.'
    },
    iconEmoji: '🔮',
    gradient: 'from-blue-950/80 via-cyan-900/40 to-teal-950/80',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    accentColor: '#3b82f6',
    chapterCount: 3,
    linkedChapterId: 'ebook_spiritual_ch2'
  },
  {
    id: 'spiritual_topic_3',
    pillar: 'spiritual',
    topicName: {
      hi: 'श्वासों की बचत व 120 वर्ष दीर्घायु',
      en: 'Prana Conservation & 120+ Longevity',
      mr: 'श्वासांची बचत व १२० वर्षे आयुष्य',
      kn: 'ಪ್ರಾಣ ರಕ್ಷಣೆ ಮತ್ತು ದೀರ್ಘಾಯುಷ್ಯ'
    },
    shortName: { hi: 'दीर्घायु रहस्य', en: 'Longevity Prana', mr: 'दीर्घायुष्य', kn: 'ದೀರ್ಘಾಯುಷ್ಯ' },
    description: {
      hi: 'प्रति मिनट श्वास की गति को 15 से 8 पर लाकर कोशिकाओं की आयु दुगनी करने का विज्ञान।',
      en: 'Slowing respiratory rate to tortoise frequency to radically double biological longevity.',
      mr: 'श्वासाचा वेग मंदावून आयुष्य शतकापार नेण्याचे वैदिक योग रहस्य.',
      kn: 'ಉಸಿರಾಟದ ಗತಿ ನಿಯಂತ್ರಿಸಿ ನೂರು ವರ್ಷಗಳ ನಿರೋಗಿ ಜೀವನ.'
    },
    iconEmoji: '⏳',
    gradient: 'from-teal-950/80 via-emerald-900/40 to-cyan-950/80',
    borderColor: 'border-teal-500/50 hover:border-teal-400',
    accentColor: '#14b8a6',
    chapterCount: 3,
    linkedChapterId: 'ebook_spiritual_ch3'
  },
  {
    id: 'spiritual_topic_4',
    pillar: 'spiritual',
    topicName: {
      hi: 'कुंडलिनी शक्ति व षट्-चक्र भेदन',
      en: 'Kundalini & 6 Chakra Ascent',
      mr: 'कुंडलिनी शक्ती व षट्चक्र भेदन',
      kn: 'ಕುಂಡಲಿನಿ ಮತ್ತು ಷಟ್ ಚಕ್ರ ಜಾಗೃತಿ'
    },
    shortName: { hi: 'कुंडलिनी व चक्र', en: 'Kundalini Energy', mr: 'कुंडलिनी', kn: 'ಕುಂಡಲಿನಿ' },
    description: {
      hi: 'मूलाधार से आज्ञा चक्र तक प्राण ऊर्जा को ऊर्ध्वगामी करने का प्रामाणिक स्वर अभ्यास।',
      en: 'Elevating serpent prana from root to crown through specialized bandhas and breath holds.',
      mr: 'मूलाधारापासून आज्ञा चक्रापर्यंत ऊर्जा ऊर्ध्वगामी करण्याचे स्वर तंत्र.',
      kn: 'ಮೂಲಾಧಾರದಿಂದ ಆಜ್ಞಾ ಚಕ್ರದವರೆಗೆ ಪ್ರಾಣ ಶಕ್ತಿಯ ಉನ್ನತೀಕರಣ.'
    },
    iconEmoji: '⚡',
    gradient: 'from-amber-950/80 via-orange-900/40 to-red-950/80',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    accentColor: '#f59e0b',
    chapterCount: 3,
    linkedChapterId: 'ebook_spiritual_ch1'
  },
  {
    id: 'spiritual_topic_5',
    pillar: 'spiritual',
    topicName: {
      hi: 'शिव स्वरोदय गुप्त सूत्र व मंत्र सिद्धि',
      en: 'Shiva Swarodaya Mantra Siddhi',
      mr: 'शिव स्वरोदय गुप्त सूत्र व मंत्र सिद्धी',
      kn: 'ಶಿವ ಸ್ವರೋದಯ ಮಂತ್ರ ಸಿದ್ಧಿ'
    },
    shortName: { hi: 'मंत्र सिद्धि', en: 'Mantra Siddhi', mr: 'मंत्र सिद्धी', kn: 'ಮಂತ್ರ ಸಿದ್ಧಿ' },
    description: {
      hi: 'अनुकूल स्वर में गुरु मंत्र का जप करने से 10 गुना तेज सिद्धि और आध्यात्मिक सुरक्षा।',
      en: 'Chanting sacred japa during resonant breath cycles to awaken lightning-fast mantra siddhi.',
      mr: 'योग्य स्वरामध्ये मंत्र जप केल्याने दहापट जलद फलप्राप्ती होते.',
      kn: 'ಸೂಕ್ತ ಸ್ವರದಲ್ಲಿ ಮಂತ್ರ ಜಪದಿಂದ ಶೀಘ್ರ ಫಲಸಿದ್ಧಿ.'
    },
    iconEmoji: '📿',
    gradient: 'from-indigo-950/80 via-blue-900/40 to-purple-950/80',
    borderColor: 'border-indigo-500/50 hover:border-indigo-400',
    accentColor: '#6366f1',
    chapterCount: 3,
    linkedChapterId: 'ebook_spiritual_ch2'
  },
  {
    id: 'spiritual_topic_6',
    pillar: 'spiritual',
    topicName: {
      hi: 'नाद योग, ओंकार व अंतर-ध्वनि',
      en: 'Nada Yoga & Inner Sound Current',
      mr: 'नाद योग व अनाहत ध्वनी',
      kn: 'ನಾದ ಯೋಗ ಮತ್ತು ಅನಾಹತ ಧ್ವನಿ'
    },
    shortName: { hi: 'नाद योग', en: 'Nada Yoga', mr: 'नाद योग', kn: 'ನಾದ ಯೋಗ' },
    description: {
      hi: 'कर्ण बंद कर हृदय के अनाहत नाद को सुनना और ब्रह्मांडीय ध्वनि के साथ एकाकार होना।',
      en: 'Tuning into the uncaused inner sound (Anahata Nada) for dissolution into supreme bliss.',
      mr: 'हृदयातील अनाहत नाद ऐकून ब्रह्मानंदात लीन होण्याची साधना.',
      kn: 'ಅಂತರಂಗದ ನಾದವನ್ನು ಆಲಿಸಿ ಪರಮಾನಂದವನ್ನು ಪಡೆಯುವುದು.'
    },
    iconEmoji: '🔔',
    gradient: 'from-violet-950/80 via-purple-900/40 to-pink-950/80',
    borderColor: 'border-violet-500/50 hover:border-violet-400',
    accentColor: '#8b5cf6',
    chapterCount: 3,
    linkedChapterId: 'ebook_spiritual_ch3'
  },

  // ── PARENTING TOPICS (6 Colorful Topics) ──
  {
    id: 'parenting_topic_1',
    pillar: 'parenting',
    topicName: {
      hi: 'बच्चों की एकाग्रता, स्मरण शक्ति व पढ़ाई',
      en: 'Kids Hyper-Focus & Memory',
      mr: 'मुलांची एकाग्रता व अभ्यास',
      kn: 'ಮಕ್ಕಳ ಏಕಾಗ್ರತೆ ಮತ್ತು ಅಧ್ಯಯನ'
    },
    shortName: { hi: 'एकाग्रता व पढ़ाई', en: 'Study Focus', mr: 'मुलांचा अभ्यास', kn: 'ಮಕ್ಕಳ ಅಭ್ಯಾಸ' },
    description: {
      hi: 'पढ़ने बैठने से पूर्व बायां स्वर सक्रिय करने से याददाश्त 400% बढ़ती है और परीक्षा का भय मिटता है।',
      en: 'Engaging Chandra Swar prior to study to induce alpha brainwaves and hyper-retention.',
      mr: 'अभ्यासाला बसण्यापूर्वी डावा स्वर चालू केल्यास स्मरणशक्ती प्रचंड वाढते.',
      kn: 'ಓದುವ ಮುನ್ನ ಎಡ ನಾಸಿಕ ಉಸಿರಾಟದಿಂದ ನೆನಪಿನ ಶಕ್ತಿ ವೃದ್ಧಿ.'
    },
    iconEmoji: '📚',
    gradient: 'from-blue-950/80 via-sky-900/40 to-cyan-950/80',
    borderColor: 'border-blue-500/50 hover:border-blue-400',
    accentColor: '#3b82f6',
    chapterCount: 3,
    linkedChapterId: 'ebook_parenting_ch1'
  },
  {
    id: 'parenting_topic_2',
    pillar: 'parenting',
    topicName: {
      hi: 'बच्चों की जिद, गुस्सा व माता-पिता का स्वर',
      en: 'Tantrum Diffusion & Peaceful Tone',
      mr: 'मुलांचा हट्ट, राग व पालकांचा स्वर',
      kn: 'ಮಕ್ಕಳ ಹಠ ಮತ್ತು ಸಿಟ್ಟು ನಿವಾರಣೆ'
    },
    shortName: { hi: 'जिद व गुस्सा नियंत्रण', en: 'Tantrum Control', mr: 'हट्ट नियंत्रण', kn: 'ಹಠ ನಿಯಂತ್ರಣ' },
    description: {
      hi: 'जब बच्चा चीखे, तब माता-पिता चंद्र स्वर में बोलें। स्वर रेजोनेंस से बच्चा 2 मिनट में शांत होता है।',
      en: 'Neutralizing child aggression through bio-resonant cooling vocal harmonics in Chandra Swar.',
      mr: 'मुलगा हट्ट करत असताना पालकांनी डाव्या स्वरात बोलल्यास वाद लगेच शांत होतो.',
      kn: 'ಮಕ್ಕಳ ಸಿಟ್ಟನ್ನು ಶಾಂತಗೊಳಿಸಲು ಪೋಷಕರ ಶ್ವಾಸ ನಿಯಂತ್ರಣ.'
    },
    iconEmoji: '🕊️',
    gradient: 'from-emerald-950/80 via-teal-900/40 to-green-950/80',
    borderColor: 'border-emerald-500/50 hover:border-emerald-400',
    accentColor: '#10b981',
    chapterCount: 3,
    linkedChapterId: 'ebook_parenting_ch2'
  },
  {
    id: 'parenting_topic_3',
    pillar: 'parenting',
    topicName: {
      hi: 'खेल, स्टैमिना व शारीरिक विकास',
      en: 'Athletic Stamina & Growth',
      mr: 'खेळ, स्टॅमिना व शारीरिक विकास',
      kn: 'ಕ್ರೀಡೆ ಮತ್ತು ದೈಹಿಕ ಬೆಳವಣಿಗೆ'
    },
    shortName: { hi: 'खेल व ऊर्जा', en: 'Sports & Stamina', mr: 'खेळ व ऊर्जा', kn: 'ಆಟ ಮತ್ತು ಶಕ್ತಿ' },
    description: {
      hi: 'मैदान पर उतरते समय सूर्य स्वर का चलना बच्चे को असीम ऊर्जा देता है और चोटों से बचाता है।',
      en: 'Igniting Surya Swar during physical athletics to optimize oxygenation and prevent strain.',
      mr: 'खेळताना उजवा स्वर चालू ठेवल्यास ऊर्जा टिकून राहते व दुखापत टळते.',
      kn: 'ಕ್ರೀಡೆಯಲ್ಲಿ ಸೂರ್ಯ ಸ್ವರವು ಅತ್ಯುನ್ನತ ಸಾಮರ್ಥ್ಯವನ್ನು ನೀಡುತ್ತದೆ.'
    },
    iconEmoji: '⚽',
    gradient: 'from-amber-950/80 via-orange-900/40 to-yellow-950/80',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    accentColor: '#f59e0b',
    chapterCount: 3,
    linkedChapterId: 'ebook_parenting_ch3'
  },
  {
    id: 'parenting_topic_4',
    pillar: 'parenting',
    topicName: {
      hi: 'किशोर मानसिक संतुलन व स्क्रीन एडिक्शन',
      en: 'Teen Mental Balance & Screen Detox',
      mr: 'किशोरवयीन मानसिक संतुलन व मोबाईल व्यसन',
      kn: 'ಹದಿಹರೆಯದ ಮಾನಸಿಕ ಸಮತೋಲನ'
    },
    shortName: { hi: 'स्क्रीन डिटॉक्स', en: 'Screen Detox', mr: 'स्क्रीन व्यसनमुक्ती', kn: 'ಸ್ಕ್ರೀನ್ ಡಿಟಾಕ್ಸ್' },
    description: {
      hi: 'मोबाइल और गेमिंग की लत छुड़ाने के लिए भ्रामरी और चंद्र स्वर का जादुई डोपामाइन रीसेट।',
      en: 'Resetting teen dopamine receptors and gadget addiction via gentle nostril cycles.',
      mr: 'मोबाईलचे व्यसन कमी करण्यासाठी भ्रामरी आणि चंद्र स्वराचा प्रभावी उपाय.',
      kn: 'ಮೊಬೈಲ್ ವ್ಯಸನ ಮುಕ್ತಿಗೆ ಮತ್ತು ಮಾನಸಿಕ ಶಾಂತಿಗೆ ಸ್ವರ ನಿಯಮಗಳು.'
    },
    iconEmoji: '📵',
    gradient: 'from-violet-950/80 via-purple-900/40 to-indigo-950/80',
    borderColor: 'border-violet-500/50 hover:border-violet-400',
    accentColor: '#8b5cf6',
    chapterCount: 3,
    linkedChapterId: 'ebook_parenting_ch1'
  },
  {
    id: 'parenting_topic_5',
    pillar: 'parenting',
    topicName: {
      hi: 'पारिवारिक प्रेम, आभा-मंडल व गृह शांति',
      en: 'Family Aura Harmony & Domestic Peace',
      mr: 'कौटुंबिक प्रेम व गृह शांतता',
      kn: 'ಕೌಟುಂಬಿಕ ಪ್ರೇಮ ಮತ್ತು ಗೃಹ ಶಾಂತಿ'
    },
    shortName: { hi: 'गृह शांति', en: 'Home Harmony', mr: 'गृह शांतता', kn: 'ಗೃಹ ಶಾಂತಿ' },
    description: {
      hi: 'घर में कलह और तनाव समाप्त कर पूरे परिवार के आभा-मंडल को प्रेममय बनाने की विधि।',
      en: 'Harmonizing household aura frequencies through collective rhythmic evening breathing.',
      mr: 'घरातील वादविवाद संपवून प्रेम आणि शांतता निर्माण करण्याचे तंत्र.',
      kn: 'ಮನೆಯಲ್ಲಿ ಶಾಂತಿ ಮತ್ತು ಪ್ರೀತಿಯ ವಾತಾವರಣ ಸೃಷ್ಟಿಸಲು ಸ್ವರ ಸಾಧನೆ.'
    },
    iconEmoji: '🏡',
    gradient: 'from-pink-950/80 via-rose-900/40 to-red-950/80',
    borderColor: 'border-pink-500/50 hover:border-pink-400',
    accentColor: '#ec4899',
    chapterCount: 3,
    linkedChapterId: 'ebook_parenting_ch2'
  },
  {
    id: 'parenting_topic_6',
    pillar: 'parenting',
    topicName: {
      hi: 'बाल संस्कार, वैदिक मूल्य व सेवा भाव',
      en: 'Vedic Character & Compassion',
      mr: 'बाल संस्कार व नैतिक मूल्ये',
      kn: 'ಮಕ್ಕಳ ಸಂಸ್ಕಾರ ಮತ್ತು ನೈತಿಕ ಮೌಲ್ಯಗಳು'
    },
    shortName: { hi: 'बाल संस्कार', en: 'Vedic Values', mr: 'संस्कार', kn: 'ಸಂಸ್ಕಾರ' },
    description: {
      hi: 'बच्चों में माता-पिता, गुरु और प्रकृति के प्रति कृतज्ञता और सत्यनिष्ठा रोपने का विज्ञान।',
      en: 'Inculcating gratitude, humility, and noble character in children through breath awareness.',
      mr: 'लहान मुलांमध्ये आदर आणि नम्रतेचे संस्कार रुजवण्यासाठी मार्गदर्शन.',
      kn: 'ಮಕ್ಕಳಲ್ಲಿ ಸದ್ಗುಣಗಳನ್ನು ಮತ್ತು ನೈತಿಕತೆಯನ್ನು ಬೆಳೆಸುವ ಕಲೆ.'
    },
    iconEmoji: '🌱',
    gradient: 'from-cyan-950/80 via-teal-900/40 to-blue-950/80',
    borderColor: 'border-cyan-500/50 hover:border-cyan-400',
    accentColor: '#06b6d4',
    chapterCount: 3,
    linkedChapterId: 'ebook_parenting_ch3'
  },

  // ── PREGNANCY TOPICS (6 Colorful Topics) ──
  {
    id: 'pregnancy_topic_1',
    pillar: 'pregnancy',
    topicName: {
      hi: 'दिव्य संतान गर्भाधान व स्वर मुहूर्त',
      en: 'Divine Conception & Astrological Swar',
      mr: 'दिव्य संतती गर्भाधान व स्वर मुहूर्त',
      kn: 'ದಿವ್ಯ ಗರ್ಭಧಾರಣೆ ಮತ್ತು ಸ್ವರ ಮುಹೂರ್ತ'
    },
    shortName: { hi: 'गर्भाधान मुहूर्त', en: 'Conception Timing', mr: 'गर्भाधान मुहूर्त', kn: 'ಗರ್ಭಧಾರಣೆ ಮುಹೂರ್ತ' },
    description: {
      hi: 'पति का सूर्य स्वर और पत्नी का चंद्र स्वर सक्रिय होने पर तेजस्वी और निरोगी संतान का जन्म।',
      en: 'Solar/lunar polarity harmonization at conception to invite an enlightened soul.',
      mr: 'पतीचा सूर्य आणि पत्नीचा चंद्र स्वर चालू असताना केलेले गर्भाधान श्रेष्ठ ठरते.',
      kn: 'ಸೂಕ್ತ ಸ್ವರದಲ್ಲಿ ಗರ್ಭಧಾರಣೆಯಿಂದ ತೇಜಸ್ವಿ ಮತ್ತು ಆರೋಗ್ಯವಂತ ಮಗು.'
    },
    iconEmoji: '✨',
    gradient: 'from-rose-950/80 via-pink-900/40 to-purple-950/80',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
    accentColor: '#f43f5e',
    chapterCount: 3,
    linkedChapterId: 'ebook_pregnancy_ch1'
  },
  {
    id: 'pregnancy_topic_2',
    pillar: 'pregnancy',
    topicName: {
      hi: 'गर्भावस्था के 9 माह: शिशु मस्तिष्क विकास',
      en: '9 Months Fetal Brain Mastery',
      mr: 'गरोदरपणातील ९ महिने: बुद्धी विकास',
      kn: 'ಗರ್ಭಾವಸ್ಥೆಯ 9 ತಿಂಗಳುಗಳಲ್ಲಿ ಮೆದುಳಿನ ಬೆಳವಣಿಗೆ'
    },
    shortName: { hi: 'शिशु मस्तिष्क विकास', en: 'Fetal Brain Bliss', mr: 'बुद्धी विकास', kn: 'ಮೆದುಳಿನ ಬೆಳವಣಿಗೆ' },
    description: {
      hi: 'माता के चंद्र स्वर में रहने से गर्भस्थ शिशु तनावमुक्त रहता है और उसकी बुद्धि प्रखर होती है।',
      en: 'Protecting the fetal neural architecture from maternal cortisol via tranquil Chandra breathing.',
      mr: 'मातेने चंद्र स्वरात राहिल्याने बाळाची बुद्धिमत्ता आणि एकाग्रता वाढते.',
      kn: 'ತಾಯಿಯ ಶಾಂತ ಉಸಿರಾಟದಿಂದ ಮಗುವಿನ ಬುದ್ಧಿಮತ್ತೆ ತೀವ್ರವಾಗಿ ಬೆಳೆಯುತ್ತದೆ.'
    },
    iconEmoji: '🧠',
    gradient: 'from-purple-950/80 via-indigo-900/40 to-violet-950/80',
    borderColor: 'border-purple-500/50 hover:border-purple-400',
    accentColor: '#8b5cf6',
    chapterCount: 3,
    linkedChapterId: 'ebook_pregnancy_ch2'
  },
  {
    id: 'pregnancy_topic_3',
    pillar: 'pregnancy',
    topicName: {
      hi: 'प्राकृतिक, भयमुक्त व सुखद प्रसव रहस्य',
      en: 'Effortless Natural Childbirth',
      mr: 'भयमुक्त नैसर्गिक प्रसूती रहस्य',
      kn: 'ನೋವುರಹಿತ ನೈಸರ್ಗಿಕ ಹೆರಿಗೆ'
    },
    shortName: { hi: 'प्राकृतिक प्रसव', en: 'Natural Childbirth', mr: 'नैसर्गिक प्रसूती', kn: 'ನೈಸರ್ಗಿಕ ಹೆರಿಗೆ' },
    description: {
      hi: 'प्रसव पीड़ा में चंद्र स्वर मांसपेशियों को शिथिल करता है और अपान वायु सहज प्रसव कराती है।',
      en: 'Deploying pelvic relaxation breathing during active labor for smooth, trauma-free birth.',
      mr: 'प्रसूती वेदनांच्या वेळी योग्य श्वास घेतल्यास शस्त्रक्रियेविना नैसर्गिक प्रसूती होते.',
      kn: 'ಹೆರಿಗೆಯ ಸಮಯದಲ್ಲಿ ಸೂಕ್ತ ಉಸಿರಾಟದಿಂದ ಸುಲಭ ನೈಸರ್ಗಿಕ ಹೆರಿಗೆ ಸಾಧ್ಯ.'
    },
    iconEmoji: '🌸',
    gradient: 'from-teal-950/80 via-emerald-900/40 to-cyan-950/80',
    borderColor: 'border-teal-500/50 hover:border-teal-400',
    accentColor: '#14b8a6',
    chapterCount: 3,
    linkedChapterId: 'ebook_pregnancy_ch3'
  },
  {
    id: 'pregnancy_topic_4',
    pillar: 'pregnancy',
    topicName: {
      hi: 'गर्भ संवाद, वेदमंत्र व संगीत चिकित्सा',
      en: 'Garbh Samvad & Vedic Sound Waves',
      mr: 'गर्भ संवाद व वेदमंत्र संगीत',
      kn: 'ಗರ್ಭ ಸಂವಾದ ಮತ್ತು ವೇದಮಂತ್ರ'
    },
    shortName: { hi: 'गर्भ संवाद व मंत्र', en: 'Garbh Samvad', mr: 'गर्भ संवाद', kn: 'ಗರ್ಭ ಸಂವಾದ' },
    description: {
      hi: 'नित्य 20 मिनट शांत मन से शिशु से संवाद करने से अभिमन्यु के समान जन्मजात ज्ञान की प्राप्ति।',
      en: 'Directing conscious vibrations and ancient stotras to imprint noble virtues before birth.',
      mr: 'बाळाशी रोज शांत मनाने संवाद साधल्यास उच्च संस्कार निर्माण होतात.',
      kn: 'ಮಗುವಿನೊಂದಿಗೆ ದಿನನಿತ್ಯದ ಸಂವಾದ ಮತ್ತು ದೈವಿಕ ಸಂಸ್ಕಾರ.'
    },
    iconEmoji: '🎶',
    gradient: 'from-amber-950/80 via-yellow-900/40 to-orange-950/80',
    borderColor: 'border-amber-500/50 hover:border-amber-400',
    accentColor: '#f59e0b',
    chapterCount: 3,
    linkedChapterId: 'ebook_pregnancy_ch2'
  },
  {
    id: 'pregnancy_topic_5',
    pillar: 'pregnancy',
    topicName: {
      hi: 'प्रसवोपरांत माता का स्वास्थ्य व शांति',
      en: 'Postnatal Rejuvenation & Calm',
      mr: 'प्रसूतीनंतर मातेचे आरोग्य व शांती',
      kn: 'ಹೆರಿಗೆಯ ನಂತರ ತಾಯಿಯ ಪುನಶ್ಚೇತನ'
    },
    shortName: { hi: 'प्रसवोपरांत स्वास्थ्य', en: 'Postnatal Recovery', mr: 'प्रसूतीनंतर आरोग्य', kn: 'ತಾಯಿಯ ಆರೋಗ್ಯ' },
    description: {
      hi: 'प्रसव के बाद शरीर के अंगों को पुनः संकुचित कर पूर्ववत शक्ति पाने का स्वर विज्ञान।',
      en: 'Restoring pelvic tone, hormone equilibrium, and spinal vigor in the fourth trimester.',
      mr: 'प्रसूतीनंतर शरीराची झीज भरून काढण्यासाठी वैदिक स्वर उपाय.',
      kn: 'ಹೆರಿಗೆಯ ನಂತರ ಶರೀರಕ್ಕೆ ನವಚೈತನ್ಯ ಮತ್ತು ಶಕ್ತಿಯನ್ನು ಮರಳಿ ಪಡೆಯುವುದು.'
    },
    iconEmoji: '🌺',
    gradient: 'from-cyan-950/80 via-blue-900/40 to-sky-950/80',
    borderColor: 'border-cyan-500/50 hover:border-cyan-400',
    accentColor: '#06b6d4',
    chapterCount: 3,
    linkedChapterId: 'ebook_pregnancy_ch3'
  },
  {
    id: 'pregnancy_topic_6',
    pillar: 'pregnancy',
    topicName: {
      hi: 'मातृ दुग्ध पोषण, अमृत तत्व व शिशु सुरक्षा',
      en: 'Lactation Abundance & Mother Milk',
      mr: 'मातृ दुग्ध पोषण व अमृत तत्व',
      kn: 'ತಾಯಿಯ ಎದೆಹಾಲು ಮತ್ತು ಅಮೃತ ಪೋಷಣೆ'
    },
    shortName: { hi: 'मातृ दुग्ध पोषण', en: 'Lactation & Milk', mr: 'स्तनपान पोषण', kn: 'ಎದೆಹಾಲು ಪೋಷಣೆ' },
    description: {
      hi: 'चंद्र स्वर में स्तनपान कराने से दूध में अमृत तत्व बढ़ता है और शिशु को गैस-उल्टी नहीं होती।',
      en: 'Nursing under calm Chandra breath to deliver bio-immune oxytocin-rich nourishment.',
      mr: 'शांत मनाने आणि चंद्र स्वरात स्तनपान दिल्यास बाळाची पचनशक्ती उत्तम राहते.',
      kn: 'ಶಾಂತ ಮನಸ್ಸಿನಿಂದ ಎದೆಹಾಲು ಉಣಿಸುವುದರಿಂದ ಮಗುವಿನ ರೋಗನಿರೋಧಕ ಶಕ್ತಿ ವೃದ್ಧಿ.'
    },
    iconEmoji: '🤱',
    gradient: 'from-violet-950/80 via-fuchsia-900/40 to-pink-950/80',
    borderColor: 'border-fuchsia-500/50 hover:border-fuchsia-400',
    accentColor: '#d946ef',
    chapterCount: 3,
    linkedChapterId: 'ebook_pregnancy_ch1'
  }
];


export const EBOOK_PILLARS: PillarMeta[] = [
  {
    id: 'health',
    name: {
      hi: 'स्वास्थ्य एवं नाड़ी शुद्धि',
      en: 'Health & Vitality',
      mr: 'आरोग्य आणि नाडी शुद्धी',
      kn: 'ಆರೋಗ್ಯ ಮತ್ತು ನಾಡಿ ಶುದ್ಧಿ'
    },
    shortName: {
      hi: 'स्वास्थ्य',
      en: 'Health',
      mr: 'आरोग्य',
      kn: 'ಆರೋಗ್ಯ'
    },
    iconName: 'Activity',
    iconEmoji: '🌿',
    badgeBg: 'bg-emerald-500/20 text-emerald-300',
    badgeBorder: 'border-emerald-500/40',
    color: '#10b981',
    description: {
      hi: 'स्वर योग द्वारा रोग निवारण, पाचन शक्ति, अनिद्रा मुक्ति और दीर्घायु का विज्ञान',
      en: 'Ancient science of breath for disease prevention, digestion, deep sleep and longevity',
      mr: 'स्वर योगाद्वारे रोग निवारण, पचनशक्ती आणि दीर्घायुष्याचे विज्ञान',
      kn: 'ರೋಗ ತಡೆಗಟ್ಟುವಿಕೆ ಮತ್ತು ದೀರ್ಘಾಯುಷ್ಯಕ್ಕಾಗಿ ಉಸಿರಾಟದ ಪ್ರಾಚೀನ ವಿಜ್ಞಾನ'
    }
  },
  {
    id: 'wealth',
    name: {
      hi: 'समृद्धि, व्यापार एवं धन लाभ',
      en: 'Wealth & Prosperity',
      mr: 'समृद्धी, व्यापार आणि संपत्ती',
      kn: 'ಸಂಪತ್ತು ಮತ್ತು ಸಮೃದ್ಧಿ'
    },
    shortName: {
      hi: 'समृद्धि',
      en: 'Wealth',
      mr: 'समृद्धी',
      kn: 'ಸಂಪತ್ತು'
    },
    iconName: 'TrendingUp',
    iconEmoji: '💰',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    badgeBorder: 'border-amber-500/40',
    color: '#f59e0b',
    description: {
      hi: 'सूर्य स्वर में व्यापार, निवेश, निर्णय और वित्तीय सफलता के अचूक वैदिक नियम',
      en: 'Vedic rules for business, investments, high-stakes decisions and financial abundance via Surya Swar',
      mr: 'सूर्य स्वरामध्ये व्यापार, गुंतवणूक आणि आर्थिक यशाचे वैदिक नियम',
      kn: 'ವ್ಯವಹಾರ, ಹೂಡಿಕೆಗಳು ಮತ್ತು ಸೂರ್ಯ ಸ್ವರದ ಮೂಲಕ ಆರ್ಥಿಕ ಯಶಸ್ಸಿನ ನಿಯಮಗಳು'
    }
  },
  {
    id: 'spiritual',
    name: {
      hi: 'अध्यात्म एवं सुषुम्ना साधना',
      en: 'Spiritual & Kundalini',
      mr: 'अध्यात्म आणि सुषुम्ना साधना',
      kn: 'ಆಧ್ಯಾತ್ಮಿಕ ಮತ್ತು ಕುಂಡಲಿನಿ'
    },
    shortName: {
      hi: 'अध्यात्म',
      en: 'Spiritual',
      mr: 'अध्यात्म',
      kn: 'ಆಧ್ಯಾತ್ಮ'
    },
    iconName: 'Sparkles',
    iconEmoji: '🕉️',
    badgeBg: 'bg-purple-500/20 text-purple-300',
    badgeBorder: 'border-purple-500/40',
    color: '#8b5cf6',
    description: {
      hi: 'शिव स्वरोदय शास्त्र, सुषुम्ना नाड़ी जागरण, समाधि और आत्म-साक्षात्कार',
      en: 'Shiva Swarodaya secrets, Sushumna awakening, Samadhi, and higher consciousness',
      mr: 'शिव स्वरोदय शास्त्र, सुषुम्ना नाडी जागरण आणि आत्म-साक्षात्कार',
      kn: 'ಶಿವ ಸ್ವರೋದಯ ರಹಸ್ಯಗಳು ಮತ್ತು ಸುಷುಮ್ನಾ ನಾಡಿಯ ಜಾಗೃತಿ'
    }
  },
  {
    id: 'parenting',
    name: {
      hi: 'संस्कार, परवरिश एवं परिवार',
      en: 'Parenting & Harmony',
      mr: 'संस्कार, संगोपन आणि कुटुंब',
      kn: 'ಪಾಲನೆ ಮತ್ತು ಕೌಟುಂಬಿಕ ಸಾಮರಸ್ಯ'
    },
    shortName: {
      hi: 'परवरिश',
      en: 'Parenting',
      mr: 'संगोपन',
      kn: 'ಪಾಲನೆ'
    },
    iconName: 'Users',
    iconEmoji: '👨‍👩‍👧',
    badgeBg: 'bg-blue-500/20 text-blue-300',
    badgeBorder: 'border-blue-500/40',
    color: '#3b82f6',
    description: {
      hi: 'बच्चों की एकाग्रता, शांत मन, पारिवारिक प्रेम और सकारात्मक ऊर्जा संचार',
      en: 'Cultivating focus in children, emotional resilience, and family peace through breath resonance',
      mr: 'मुलांची एकाग्रता, शांत मन आणि कौटुंबिक प्रेम वाढवण्याचे स्वर तंत्र',
      kn: 'ಮಕ್ಕಳಲ್ಲಿ ಏಕಾಗ್ರತೆ ಮತ್ತು ಕುಟುಂಬ ಶಾಂತಿಯನ್ನು ಬೆಳೆಸುವುದು'
    }
  },
  {
    id: 'pregnancy',
    name: {
      hi: 'गर्भ संस्कार एवं मातृत्व योग',
      en: 'Garbh Sanskar & Pregnancy',
      mr: 'गर्भ संस्कार आणि मातृत्व योग',
      kn: 'ಗರ್ಭ ಸಂಸ್ಕಾರ ಮತ್ತು ತಾಯ್ತನ'
    },
    shortName: {
      hi: 'गर्भ संस्कार',
      en: 'Pregnancy',
      mr: 'गर्भ संस्कार',
      kn: 'ಗರ್ಭ ಸಂಸ್ಕಾರ'
    },
    iconName: 'Heart',
    iconEmoji: '🤰',
    badgeBg: 'bg-rose-500/20 text-rose-300',
    badgeBorder: 'border-rose-500/40',
    color: '#f43f5e',
    description: {
      hi: 'दिव्य संतान प्राप्ति, गर्भिणी स्वर नियम, प्रसव पूर्व शांति और शिशु मानसिक विकास',
      en: 'Conception astrology, prenatal breath harmony, stress-free birth, and divine child nurturing',
      mr: 'दिव्य संतती प्राप्ती, गर्भिणी स्वर नियम आणि बालकाचा सर्वांगीण विकास',
      kn: 'ದಿವ್ಯ ಮಗುವಿನ ಜನನ ಮತ್ತು ಗರ್ಭಿಣಿ ಸ್ವರ ಯೋಗದ ನಿಯಮಗಳು'
    }
  }
];

export const EBOOK_CHAPTERS: EBookChapter[] = [
  // ─────────────────────────────────────────────
  // 1. HEALTH (3 Chapters - Row 1)
  // ─────────────────────────────────────────────
  {
    id: 'ebook_health_ch1',
    pillar: 'health',
    chapterNumber: 1,
    shortName: {
      hi: 'नासिका लय व स्वास्थ्य',
      en: 'Nostril Cycle & Health',
      mr: 'श्वास चक्र व आरोग्य',
      kn: 'ಉಸಿರಾಟದ ಲಯ ಮತ್ತು ಆರೋಗ್ಯ'
    },
    title: {
      hi: 'अध्याय 1: इड़ा और पिंगला - शरीर की स्वचालित हीलिंग प्रणाली',
      en: 'Chapter 1: The Cosmic Rhythm of Ida and Pingala Breath',
      mr: 'प्रकरण 1: इडा आणि पिंगळा - शरीराची नैसर्गिक आरोग्य यंत्रणा',
      kn: 'ಅಧ್ಯಾಯ 1: ಇಡಾ ಮತ್ತು ಪಿಂಗಳ ನಾಡಿಗಳ ಚಿಕಿತ್ಸಾ ಶಕ್ತಿ'
    },
    excerpt: {
      hi: 'प्रत्येक 60 से 90 मिनट में हमारी नासिका का स्वर बदलता है। जब बायां स्वर (इड़ा) चलता है तो शरीर में ठंडक, शांति और पाचन रस सक्रिय होते हैं।',
      en: 'Every 60 to 90 minutes, your dominant nostril shifts. Discover how the left nostril (Ida) cools organs and regenerates vital tissues.',
      mr: 'दर 60 ते 90 मिनिटांनी आपला स्वर बदलतो. डावा स्वर (इडा) शरीराला थंडावा आणि मानसिक शांतता प्रदान करतो.',
      kn: 'ಪ್ರತಿ 60 ರಿಂದ 90 ನಿಮಿಷಗಳಲ್ಲಿ ನಿಮ್ಮ ಉಸಿರಾಟದ ನಾಡಿ ಬದಲಾಗುತ್ತದೆ.'
    },
    readTime: { hi: '6 मिनट पठन', en: '6 min read', mr: '6 मिनिटे वाचन', kn: '6 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-05',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['health', 'ida', 'healing', 'breath'],
    content: {
      hi: `### वैदिक श्लोक
> **"चन्द्रचारे स्थिराणि स्युः सूर्यचारे चराणि च।  
सुषुम्णायां गते प्राणे मुक्तिरेव न संशयः॥"**  
*(शिव स्वरोदय - श्लोक 64)*

### अध्याय का मूल तत्व
मानव शरीर कोई आकस्मिक मशीन नहीं है, यह ब्रह्मांडीय सौर और चंद्र ऊर्जा का एक अद्भुत संगम है। जब आप सांस लेते हैं, तो दोनों नथुनों से समान वायु प्रवाह नहीं होता। 

1. **बायां स्वर (इड़ा / चंद्र नाड़ी):** यह अमृत स्वरूप, शीतल, और पराsympathetic तंत्रिका तंत्र को संचालित करती है।
2. **दायां स्वर (पिंगला / सूर्य नाड़ी):** यह अग्नि स्वरूप, ऊर्जावान, और sympathetic तंत्रिका तंत्र को संचालित करती है।

### स्वास्थ्य रक्षा के स्वर्णिम नियम
- **भोजन करते समय:** हमेशा दायां स्वर (सूर्य) चलना चाहिए। जठराग्नि प्रज्वलित रहने से भोजन 100% पचता है और विषैले टॉक्सिन्स (आम) नहीं बनते।
- **जल पीते समय:** बायां स्वर (चंद्र) चलना चाहिए, जिससे शरीर में अमृत तत्व अवशोषित होता है।
- **निद्रा लेते समय:** बाईं करवट सोएं, ताकि दायां स्वर सक्रिय रहे और रात भर पाचन तथा रक्त शोधन अबाध चलता रहे।

### दैनिक अभ्यास (स्वर परिवर्तन विधि)
यदि भोजन के समय बायां स्वर चल रहा हो, तो दाईं करवट 3 मिनट लेट जाएं या बाएं नथुने में रुई का कोमल प्लग लगाएं। स्वर तुरंत दाहिने में परिवर्तित हो जाएगा।`,
      en: `### Vedic Sutra
> **"In the lunar breath perform steady deeds; in the solar breath execute dynamic action. When prana enters Sushumna, liberation is attained without doubt."**  
*(Shiva Swarodaya - Verse 64)*

### The Fundamental Principle
The human body is an exquisite bio-clock attuned to cosmic frequencies. At any moment, one nostril dominates:
- **Left Nostril (Ida / Chandra):** Governs parasympathetic calmness, cellular repair, deep cooling, and rejuvenation.
- **Right Nostril (Pingala / Surya):** Governs sympathetic metabolism, internal fire (Agni), and physical strength.

### Practical Health Injunctions
1. **Eating Food:** Always ensure your Right Nostril (Surya Swar) is active. The digestive fire (Jatharagni) will incinerate heavy proteins and fats, preventing toxic buildup (Ama).
2. **Drinking Water:** Ensure Left Nostril (Chandra) is flowing so cellular hydration is optimal.
3. **Restorative Sleep:** Lie on your left side to keep the right nostril open, warming your core and supporting overnight detoxification.`,
      mr: `### वैदिक सूत्र
> **"चन्द्रचारे स्थिराणि स्युः सूर्यचारे चराणि च।"**

### आरोग्याचे मूलभूत तत्त्व
आपल्या शरीरात डावा स्वर (इडा) आणि उजवा स्वर (पिंगळा) यांचे संतुलन म्हणजेच निरोगी जीवन.
- **जेवताना:** नेहमी उजवा स्वर चालू असावा जेणेकरून जठराग्नी प्रदीप्त राहील आणि पचन सुलभ होईल.
- **पाणी पिताना:** डावा स्वर चालू असावा.
- **झोपताना:** डाव्या कुशीवर झोपावे जेणेकरून उजवा स्वर सुरू राहील.`,
      kn: `### ವೈದಿಕ ಶ್ಲೋಕ
> **"ಚಂದ್ರಚಾರೇ ಸ್ಥಿರಾಣಿ ಸ್ಯುಃ ಸೂರ್ಯಚಾರೇ ಚರಾಣಿ ಚ।  
ಸುಷುಮ್ನಾಯಾಂ ಗತೇ ಪ್ರಾಣೇ ಮುಕ್ತಿರೇವ ನ ಸಂಶಯಃ॥"**  
*(ಶಿವ ಸ್ವರೋದಯ - ಶ್ಲೋಕ ೬೪)*

### ಅಧ್ಯಾಯದ ಮೂಲ ತತ್ವ
ಮಾನವ ಶರೀರವು ಸೌರ ಮತ್ತು ಚಂದ್ರ ಶಕ್ತಿಗಳ ಅದ್ಭುತ ಸಂಗಮವಾಗಿದೆ. ನಾಸಿಕದ ಉಸಿರಾಟದ ಲಯವು ನಮ್ಮ ಆರೋಗ್ಯವನ್ನು ನಿರ್ಧರಿಸುತ್ತದೆ.

1. **ಎಡ ಸ್ವರ (ಇಡಾ / ಚಂದ್ರ ನಾಡಿ):** ಶೀತಲತೆ, ಮಾನಸಿಕ ಶಾಂತಿ ಮತ್ತು ದೇಹದ ಜೀವಕೋಶಗಳ ನವಚೈತನ್ಯವನ್ನು ನೀಡುತ್ತದೆ.
2. **ಬಲ ಸ್ವರ (ಪಿಂಗಳ / ಸೂರ್ಯ ನಾಡಿ):** ಅಗ್ನಿ ಶಕ್ತಿ, ಜೀರ್ಣಕ್ರಿಯೆ ಮತ್ತು ದೈಹಿಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.

### ಆರೋಗ್ಯ ರಕ್ಷಣೆಯ ಪ್ರಮುಖ ನಿಯಮಗಳು
- **ಆಹಾರ ಸೇವಿಸುವಾಗ:** ಸದಾ ಬಲ ಸ್ವರ (ಸೂರ್ಯ) ಚಾಲನೆಯಲ್ಲಿರಬೇಕು. ಇದರಿಂದ ಜಠರಾಗ್ನಿ ಪ್ರಜ್ವಲಿಸಿ ಆಹಾರ ಸಂಪೂರ್ಣ ಜೀರ್ಣವಾಗುತ್ತದೆ.
- **ನೀರು ಕುಡಿಯುವಾಗ:** ಎಡ ಸ್ವರ (ಚಂದ್ರ) ಚಾಲನೆಯಲ್ಲಿರಬೇಕು.
- **ನಿದ್ರೆ ಮಾಡುವಾಗ:** ಎಡ ಮಗ್ಗುಲಿನಲ್ಲಿ ಮಲಗುವುದರಿಂದ ಬಲ ಸ್ವರ ಸಕ್ರಿಯವಾಗಿ ರಾತ್ರಿಯಿಡೀ ರಕ್ತ ಶುದ್ಧೀಕರಣ ಸುಗಮವಾಗಿರುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_health_ch2',
    pillar: 'health',
    chapterNumber: 2,
    shortName: {
      hi: 'अनिद्रा व तनाव मुक्ति',
      en: 'Insomnia & Deep Sleep',
      mr: 'शांत झोप व तणाव मुक्ती',
      kn: 'ನಿದ್ರಾಹೀನತೆ ಮತ್ತು ಶಾಂತಿ'
    },
    title: {
      hi: 'अध्याय 2: अनिद्रा और उच्च रक्तचाप का अचूक चंद्र स्वर विज्ञान',
      en: 'Chapter 2: Eradicating Insomnia & Hypertension through Chandra Swar',
      mr: 'प्रकरण 2: शांत झोप आणि रक्तदाब नियंत्रणासाठी चंद्र स्वर विज्ञान',
      kn: 'ಅಧ್ಯಾಯ 2: ಚಂದ್ರ ಸ್ವರದಿಂದ ನಿದ್ರಾಹೀನತೆಯ ನಿವಾರಣೆ'
    },
    excerpt: {
      hi: 'रात को यदि नींद न आ रही हो और मन में विचारों का बवंडर हो, तो केवल 5 मिनट में बाएं स्वर को सक्रिय करके गहरी नींद पाई जा सकती है।',
      en: 'If racing thoughts keep you awake, consciously switching to the left nostril activates sleep hormones and resets blood pressure within 5 minutes.',
      mr: 'झोप लागत नसेल तर उजवा नथुना बंद करून डाव्या स्वराने श्वास घेतल्यास ५ मिनिटात गाढ झोप लागते.',
      kn: 'ಎಡ ನಾಸಿಕ ಉಸಿರಾಟವನ್ನು ಸಕ್ರಿಯಗೊಳಿಸುವ ಮೂಲಕ ಗಾಢ ನಿದ್ರೆಯನ್ನು ಪಡೆಯಿರಿ.'
    },
    readTime: { hi: '8 मिनट पठन', en: '8 min read', mr: '8 मिनिटे वाचन', kn: '8 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-08',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['health', 'sleep', 'hypertension', 'stress'],
    content: {
      hi: `### अनिद्रा की जड़ क्या है?
जब रात को बिस्तर पर जाते समय आपका दायां स्वर (सूर्य) तीव्र चल रहा होता है, तो मस्तिष्क में एड्रेनालाईन और कोर्टिसोल का स्तर ऊंचा रहता है। नाड़ी की गति तेज रहती है और मन अतीत या भविष्य की चिंताओं में भटकता है।

### 3-चरण चंद्र स्वर निद्रा क्रिया
1. **आसन:** बिस्तर पर दाईं करवट (Right side down) लेट जाएं। इससे गुरुत्वाकर्षण से दायां नथुना संकुचित होगा और बायां नथुना खुल जाएगा।
2. **दायां नथुना अंगूठे से बंद करें:** केवल बाएं नथुने से 4 सेकंड में श्वास अंदर लें और 8 सेकंड में धीमी गति से बाहर निकालें।
3. **चंद्र नाद ध्यान:** प्रत्येक उच्छ्वास के साथ कल्पना करें कि सिर से पैरों तक शीतल चांदनी की किरणें पूरे तंत्रिका तंत्र को शांत कर रही हैं। 

मात्र 12 चक्रों के भीतर मेलाटोनिन स्रावित होने लगता है और गहरी, स्वप्नरहित निद्रा प्राप्त होती है।`,
      en: `### The Root Cause of Sleeplessness
If your right nostril (Pingala) is active when your head hits the pillow, your sympathetic system is in overdrive, keeping heart rate and mental adrenaline elevated.

### The 3-Step Chandra Sleep Technique
1. **Posture:** Lie down on your right side. Gravity naturally dilates the left nasal passage.
2. **Left-Nostril Rhythmic Breathing:** Block the right nostril softly. Inhale through the left for 4 counts, exhale smoothly for 8 counts.
3. **Cooling Visualisation:** With every out-breath, imagine a cascade of calming moonlight bathing the brainstem. Deep restorative sleep follows within minutes.`,
      mr: `### अनिद्रा मुक्तीची अचूक पद्धत
झोपण्यापूर्वी डावा स्वर चालू करणे हा अनिद्रा आणि उच्च रक्तदाबावर सर्वात मोठा नैसर्गिक उपाय आहे. उजव्या कुशीवर झोपल्याने डावा स्वर आपोआप सुरू होतो.`,
      kn: `### ನಿದ್ರಾಹೀನತೆಯ ಮೂಲ ಕಾರಣ
ರಾತ್ರಿ ಮಲಗುವಾಗ ಬಲ ಸ್ವರ (ಸೂರ್ಯ) ತೀವ್ರವಾಗಿದ್ದರೆ, ನರಮಂಡಲವು ಸಕ್ರಿಯವಾಗಿದ್ದು ನಿದ್ರೆ ಬರುವುದಿಲ್ಲ.

### ಚಂದ್ರ ಸ್ವರ ನಿದ್ರಾ ವಿಧಾನ
1. **ಆಸನ:** ಮಂಚದ ಮೇಲೆ ಬಲ ಮಗ್ಗುಲಿನಲ್ಲಿ ಮಲಗಿ. ಇದರಿಂದ ಎಡ ನಾಸಿಕವು ನೈಸರ್ಗಿಕವಾಗಿ ತೆರೆದುಕೊಳ್ಳುತ್ತದೆ.
2. **ಉಸಿರಾಟ:** ಎಡ ನಾಸಿಕದಿಂದ ೪ ಸೆಕೆಂಡು ಉಸಿರು ತೆಗೆದುಕೊಂಡು ೮ ಸೆಕೆಂಡು ನಿಧಾನವಾಗಿ ಬಿಡಿ.
3. ಕೇವಲ ೧೨ ಉಸಿರಾಟದ ಚಕ್ರಗಳಲ್ಲಿ ಗಾಢ ನಿದ್ರೆ ಆವರಿಸುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_health_ch3',
    pillar: 'health',
    chapterNumber: 3,
    shortName: {
      hi: 'ऋतुचर्या व आहार नियम',
      en: 'Vedic Diet & Seasons',
      mr: 'ऋतुचर्या व आहार नियम',
      kn: 'ಆಹಾರ ಮತ್ತು ಋತುಚರ್ಯ'
    },
    title: {
      hi: 'अध्याय 3: ऋतुचर्या और स्वर: कब, क्या और कैसे खाएं',
      en: 'Chapter 3: Ritucharya & Swar: Harmonizing Food with Breath Seasons',
      mr: 'प्रकरण 3: ऋतुचर्या आणि स्वर: आहाराचे प्राचीन वैदिक शास्त्र',
      kn: 'ಅಧ್ಯಾಯ 3: ಋತುಗಳಿಗೆ ಅನುಗುಣವಾಗಿ ಆಹಾರ ಮತ್ತು ಉಸಿರಾಟ'
    },
    excerpt: {
      hi: 'ग्रीष्म ऋतु में चंद्र स्वर की प्रधानता और शीत ऋतु में सूर्य स्वर की सक्रियता से कैसे आप 100 वर्ष तक पूर्ण स्वस्थ रह सकते हैं।',
      en: 'Aligning seasonal eating with your nostril dominance ensures optimal gut microbiota, weight management, and vibrant energy across all 6 seasons.',
      mr: 'उन्हाळ्यात चंद्र स्वर आणि हिवाळ्यात सूर्य स्वराचे संतुलन ठेवून आरोग्यसंपन्न जीवन जगा.',
      kn: 'ಋತುಗಳಿಗೆ ತಕ್ಕಂತೆ ಆಹಾರ ಸೇವನೆ ಮತ್ತು ಶ್ವಾಸ ಲಯದ ರಹಸ್ಯಗಳು.'
    },
    readTime: { hi: '7 मिनट पठन', en: '7 min read', mr: '7 मिनिटे वाचन', kn: '7 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-12',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['health', 'diet', 'ritucharya', 'ayurveda'],
    content: {
      hi: `### ऋतु और स्वर का नैसर्गिक संबंध
शिव स्वरोदय के अनुसार, वर्ष की 6 ऋतुओं में शरीर की ऊर्जा निरंतर परिवर्तित होती है:
- **ग्रीष्म व शरद:** पित्त बढ़ता है। इन ऋतुओं में चंद्र स्वर को अधिक समय तक चालू रखना चाहिए।
- **हेमंत व शिशिर:** कफ व वात बढ़ता है। सूर्य स्वर को प्राथमिकता देकर आंतरिक अग्नि को बलवान रखना चाहिए।

### भोजन के 5 अटल वैदिक नियम
1. भारी और तैलीय भोजन हमेशा दोपहर 12 से 2 के मध्य करें जब सूर्य स्वर स्वाभाविक रूप से शक्तिशाली हो।
2. भोजनोपरांत 10 मिनट वज्रासन में बैठें और दायां स्वर सक्रिय रखें।
3. कभी भी दोनों स्वर एक साथ (सुषुम्ना) चलते समय भोजन न करें, अन्यथा वह विष के समान अपचित रह जाता है।`,
      en: `### The Cosmic Rhythm of Seasons
In ancient Swar science, external seasons correspond to internal respiratory tides:
- **Summer & Autumn:** Pitta peaks. Cultivate Chandra Swar to prevent inflammation and acidity.
- **Winter & Spring:** Vata & Kapha dominate. Surya Swar must be activated to fuel digestion and metabolism.`,
      mr: `### ऋतुचर्या आणि आहार
ऋतूनुसार स्वर नियंत्रित करून योग्य आहार घेणे हीच दीर्घायुष्याची गुरुकिल्ली आहे.`,
      kn: `### ಜಲ ತತ್ವ ಮತ್ತು ಚಂದ್ರ ಸ್ವರ
ಚಂದ್ರ ಸ್ವರದಲ್ಲಿ ನೀರು ಕುಡಿಯುವುದರಿಂದ ದೇಹದ ಆಂತರಿಕ ಅಂಗಾಂಗಗಳು ಶುದ್ಧಿಗೊಳ್ಳುತ್ತವೆ.

### ಪ್ರಮುಖ ನಿಯಮಗಳು
- ಬಾಯಾರಿಕೆಯಾದಾಗ ಎಡ ಸ್ವರ ಪರೀಕ್ಷಿಸಿ ನೀರು ಕುಡಿಯಿರಿ.
- ಇದು ಮೂತ್ರಪಿಂಡ ಮತ್ತು ಜೀರ್ಣಾಂಗಗಳ ವಿಷಮುಕ್ತಿಗೆ ಅತ್ಯುತ್ತಮ.`
    }
  },

  // ─────────────────────────────────────────────
  // 2. WEALTH (3 Chapters - Row 2)
  // ─────────────────────────────────────────────
  {
    id: 'ebook_wealth_ch1',
    pillar: 'wealth',
    chapterNumber: 1,
    shortName: {
      hi: 'व्यापार व सूर्य स्वर',
      en: 'Business & Surya Swar',
      mr: 'व्यापार व सूर्य स्वर',
      kn: 'ವ್ಯವಹಾರ ಮತ್ತು ಸೂರ್ಯ ಸ್ವರ'
    },
    title: {
      hi: 'अध्याय 1: व्यापारिक सौदे, इंटरव्यू और सूर्य स्वर का विजय विज्ञान',
      en: 'Chapter 1: Sealing High-Stakes Deals & Career Triumph via Surya Swar',
      mr: 'प्रकरण 1: व्यापार, मुलाखती आणि सूर्य स्वराचा विजय मंत्र',
      kn: 'ಅಧ್ಯಾಯ 1: ವ್ಯವಹಾರ ಒಪ್ಪಂದಗಳು ಮತ್ತು ಸೂರ್ಯ ಸ್ವರದ ಜಯ'
    },
    excerpt: {
      hi: 'जब भी किसी बड़े क्लाइंट से डील फाइनल करनी हो या इंटरव्यू में जाना हो, तो दायां स्वर (सूर्य) चलना चाहिए। इससे आपका सम्मोहन और प्रभाव 10 गुना बढ़ जाता है।',
      en: 'Never enter a boardroom negotiation without your Surya Swar active. The solar current projects unshakable authority, magnetism, and conviction.',
      mr: 'मोठ्या व्यवसायाचे करार करताना उजवा स्वर चालू ठेवावा. यामुळे निर्णयक्षमता आणि प्रभाव वाढतो.',
      kn: 'ವ್ಯವಹಾರದ ಒಪ್ಪಂದಗಳಲ್ಲಿ ಯಶಸ್ಸು ಸಾಧಿಸಲು ಸೂರ್ಯ ಸ್ವರದ ಬಳಕೆ.'
    },
    readTime: { hi: '8 मिनट पठन', en: '8 min read', mr: '8 मिनिटे वाचन', kn: '8 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-15',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['wealth', 'business', 'deals', 'negotiation'],
    content: {
      hi: `### शास्त्रोक्त प्रमाण
> **"सूर्ये जयति युद्धेषु वादे द्यूते च विग्रहे।  
सर्वकार्येषु रौद्रेषु सूर्य एव प्रशस्यते॥"**  
*(शिव स्वरोदय - श्लोक 92)*

### सूर्य स्वर में धन प्राप्ति के कार्य
जब दायां नथुना सक्रिय होता है, तब आपकी वाणी में तेज, आंखों में आत्मविश्वास और निर्णय में दृढ़ता होती है। इस समय किए गए निम्न कार्य निश्चित सफलता देते हैं:
1. **व्यापारिक अनुबंध व सिग्नेचर:** किसी भी बड़े समझौते पर हस्ताक्षर करते समय दायां स्वर चलना चाहिए।
2. **मूल्य मोलभाव (Negotiation):** क्लाइंट से दर तय करते समय आपका सूर्य स्वर विपक्ष पर मानसिक दबाव बनाए रखता है।
3. **धन उगाही (Debt Recovery):** रुके हुए पैसे मांगने जाते समय दायां स्वर चलाएं और जिस व्यक्ति से बात करें, उसे अपने दाएं तरफ रखें।

### पहले कदम का स्वर्णिम रहस्य
घर से निकलते समय जो स्वर चल रहा हो, उसी पैर को सबसे पहले देहरी से बाहर निकालें। इससे उस दिन की यात्रा और कार्य में कभी विघ्न नहीं आता।`,
      en: `### The Injunction of Shiva Swarodaya
> **"In Surya Swar, one conquers in debates, competitive battles, and bold ventures. All assertive actions must be initiated under the solar current."**

### Master Injunctions for Wealth
- **Signatures & Contracts:** Never sign a business agreement unless the right nostril is flowing freely.
- **Client Pitching:** Position the counter-party on your active side to align your bio-electromagnetic field favorably.
- **The First Step Law:** When stepping out for business, advance the foot that matches the currently dominant nostril.`,
      mr: `### व्यापारातील यश
कोणत्याही महत्त्वाच्या कामासाठी घराबाहेर पडताना जो स्वर चालू असेल तोच पाय आधी पुढे टाकावा.`,
      kn: `### ಸೂರ್ಯ ಸ್ವರ ಮತ್ತು ವ್ಯಾಪಾರ ವಿಜಯ
> **"ಸೂರ್ಯಚಾರೇ ಕೃತಂ ಕರ್ಮ ಜಯದಂ ಭವತಿ ಧ್ರುವಂ॥"**

ವ್ಯಾಪಾರ ಒಪ್ಪಂದಗಳು, ಹೂಡಿಕೆ ನಿರ್ಧಾರಗಳು ಮತ್ತು ಗ್ರಾಹಕರ ಭೇಟಿಯನ್ನು ಸೂರ್ಯ (ಪಿಂಗಳ) ಸ್ವರದಲ್ಲಿ ನಿರ್ವಹಿಸುವುದರಿಂದ ಗರಿಷ್ಠ ಲಾಭ ಮತ್ತು ಯಶಸ್ಸು ದೊರೆಯುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_wealth_ch2',
    pillar: 'wealth',
    chapterNumber: 2,
    shortName: {
      hi: 'स्थायी संपत्ति व निवेश',
      en: 'Real Estate & Assets',
      mr: 'मालमत्ता व गुंतवणूक',
      kn: 'ಸ್ಥಿರಾಸ್ತಿ ಮತ್ತು ಹೂಡಿಕೆ'
    },
    title: {
      hi: 'अध्याय 2: भूमि, भवन, स्वर्ण क्रय और स्थायी संपत्ति का चंद्र नियम',
      en: 'Chapter 2: Long-Term Wealth: Buying Land, Gold & Assets via Chandra Swar',
      mr: 'प्रकरण 2: जमीन, सोने आणि कायमस्वरूपी संपत्ती खरेदीसाठी चंद्र स्वर',
      kn: 'ಅಧ್ಯಾಯ 2: ಭೂಮಿ ಮತ್ತು ಬಂಗಾರ ಖರೀದಿಗಾಗಿ ಚಂದ್ರ ಸ್ವರ'
    },
    excerpt: {
      hi: 'स्थायी संपत्ति जैसे मकान, जमीन, सोना या लंबी अवधि के शेयर्स खरीदते समय हमेशा बायां स्वर (चंद्र) चलना चाहिए, जिससे संपत्ति पीढ़ियों तक स्थिर रहती है।',
      en: 'For assets meant to endure for generations—land, gold, fixed deposits—initiate the transaction strictly under Chandra Swar for stability.',
      mr: 'दीर्घकालीन गुंतवणुकीसाठी आणि घर किंवा जमीन खरेदी करताना डावा स्वर चालू असणे शुभ मानले जाते.',
      kn: 'ದೀರ್ಘಕಾಲಿಕ ಹೂಡಿಕೆ ಮತ್ತು ಆಸ್ತಿ ಖರೀದಿಗಾಗಿ ಚಂದ್ರ ಸ್ವರದ ಬಳಕೆ.'
    },
    readTime: { hi: '6 मिनट पठन', en: '6 min read', mr: '6 मिनिटे वाचन', kn: '6 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-18',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['wealth', 'investment', 'gold', 'property'],
    content: {
      hi: `### चर और स्थिर कार्यों का भेद
शिव स्वरोदय में स्पष्ट विभाजन है:
- **सूर्य स्वर = चर कार्य** (जो गतिशील हैं: यात्रा, युद्ध, बेचना, मुकदमा)।
- **चंद्र स्वर = स्थिर कार्य** (जो स्थायी रहने चाहिए: खरीदना, निर्माण, तिजोरी में धन रखना, विवाह)।

### संपत्ति क्रय की व्यावहारिक विधि
1. जब आप रजिस्ट्री ऑफिस में बैनामा कराने जाएं, तो सुनिश्चित करें कि आपका बायां स्वर सक्रिय हो।
2. नए व्यापारिक बैंक खाते की पहली जमा राशि चंद्र स्वर में डालें। यह धन को कई गुना बढ़ाता है।
3. कभी भी सूर्य स्वर में जमीन या घर न खरीदें, अन्यथा वह संपत्ति शीघ्र बिक जाती है या विवादों में घिर जाती है।`,
      en: `### The Principle of Fixed vs. Mobile Wealth
- **Surya Swar (Mobile / Dynamic):** Suited for selling, trading, moving funds, or executing fast turnarounds.
- **Chandra Swar (Fixed / Enduring):** Suited for buying property, laying foundations, and opening wealth vaults.`,
      mr: `### संपत्ती टिकवण्याचे नियम
स्थिर संपत्ती खरेदी करताना डावा स्वर चालू असल्यास ती संपत्ती चिरकाल टिकते.`,
      kn: `### ಚಂದ್ರ ಸ್ವರ ಮತ್ತು ಸ್ಥಿರಾಸ್ತಿ ಖರೀದಿ
> **"ಚಂದ್ರಚಾರೇ ಸ್ಥಿರಾ ಕಾರ್ಯಾ ಜಯದಾ ಚಿರಕಾಲಿಕಾ॥"**

ಭೂಮಿ, ಮನೆ ಮತ್ತು ಬಂಗಾರವನ್ನು ಚಂದ್ರ ಸ್ವರದಲ್ಲಿ ಖರೀದಿಸುವುದರಿಂದ ಆ ಸಂಪತ್ತು ತಲೆಮಾರುಗಳವರೆಗೆ ಶಾಶ್ವತವಾಗಿ ನಿಲ್ಲುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_wealth_ch3',
    pillar: 'wealth',
    chapterNumber: 3,
    shortName: {
      hi: 'धन आकर्षण व तिथि',
      en: 'Wealth Attraction & Tithi',
      mr: 'धन आकर्षण व तिथी',
      kn: 'ಧನ ಆಕರ್ಷಣೆ ಮತ್ತು ತಿಥಿ'
    },
    title: {
      hi: 'अध्याय 3: शुक्ल पक्ष की प्रतिपदा और प्रातःकाल धन आकर्षण साधना',
      en: 'Chapter 3: Morning Tithi Synchronization: The Secret to Wealth Attraction',
      mr: 'प्रकरण 3: शुक्ल पक्ष प्रतिपदा आणि प्रातःकालीन धन आकर्षण साधना',
      kn: 'ಅಧ್ಯಾಯ 3: ಪ್ರಾತಃಕಾಲದ ಧನ ಆಕರ್ಷಣಾ ರಹಸ್ಯಗಳು'
    },
    excerpt: {
      hi: 'प्रातः आंख खुलते ही किस स्वर का दर्शन करना चाहिए? शुक्ल पक्ष की 1, 2, 3 तिथि को चंद्र स्वर का चलना वर्ष भर धन के भंडार भरता है।',
      en: 'Aligning morning awakening with lunar tithis creates a magnet for abundance, preventing sudden financial downturns.',
      mr: 'सकाळी उठल्या उठल्या स्वराचे दर्शन घेणे आणि तिथीनुसार स्वर चालू असणे हे समृद्धीचे लक्षण आहे.',
      kn: 'ಮುಂಜಾನೆ ಎದ್ದ ತಕ್ಷಣ ಸ್ವರ ಪರೀಕ್ಷೆ ಮತ್ತು ಸಂಪತ್ತು ವೃದ್ಧಿ.'
    },
    readTime: { hi: '7 मिनट पठन', en: '7 min read', mr: '7 मिनिटे वाचन', kn: '7 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-22',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['wealth', 'tithi', 'morning', 'abundance'],
    content: {
      hi: `### प्रातःकाल स्वर दर्शन साधना (करदर्शनम्)
बिस्तर से उठने से पूर्व सबसे पहला काम:
1. अपनी उंगली नथुनों के नीचे रखकर देखें कि कौन सा स्वर चल रहा है।
2. जो स्वर सक्रिय हो, उसी हाथ की हथेली का दर्शन करें और तीन बार श्वास भीतर खींचकर चेहरे पर हाथ फेरें।
3. **तिथी नियम:** शुक्ल पक्ष की 1, 2, 3, 7, 8, 9, 10, 11, 12, 13 तिथियों में प्रातः काल बायां स्वर चलना चाहिए। यदि ऐसा हो, तो उस माह में अकल्पनीय आर्थिक लाभ होता है।`,
      en: `### The Morning Palm Ritual
Before stepping onto the earth:
1. Check which nostril has dominant airflow.
2. Gaze at the corresponding palm, inhaling deeply three times.
3. On Shukla Paksha Tithis 1, 2, 3, Chandra Swar must awaken naturally at dawn for peak financial luck.`,
      mr: `### धन वृद्धीची साधना
सकाळी उठल्यावर चालू स्वराच्या हाताचे दर्शन घेऊन चेहऱ्यावरून हात फिरवावा.`,
      kn: `### ಪ್ರಾತಃಕಾಲದ ಸ್ವರ ದರ್ಶನ ಮತ್ತು ಲಕ್ಷ್ಮೀ ಕೃಪೆ
ಬೆಳಿಗ್ಗೆ ಎದ್ದ ತಕ್ಷಣ ಹಾಸಿಗೆಯಿಂದ ಕೆಳಗಿಳಿಯುವ ಮುನ್ನ ನಡೆಯುತ್ತಿರುವ ಸ್ವರದ ಭಾಗದ ಪಾದವನ್ನು ಮೊದಲು ಭೂಮಿಗೆ ಸ್ಪರ್ಶಿಸುವುದರಿಂದ ದಿನವಿಡೀ ಧನಾಕರ್ಷಣೆ ಮತ್ತು ಕಾರ್ಯಸಿದ್ಧಿ ಉಂಟಾಗುತ್ತದೆ.`
    }
  },

  // ─────────────────────────────────────────────
  // 3. SPIRITUAL (3 Chapters - Row 3)
  // ─────────────────────────────────────────────
  {
    id: 'ebook_spiritual_ch1',
    pillar: 'spiritual',
    chapterNumber: 1,
    shortName: {
      hi: 'सुषुम्ना व समाधि',
      en: 'Sushumna & Samadhi',
      mr: 'सुषुम्ना व समाधी',
      kn: 'ಸುಷುಮ್ನಾ ಮತ್ತು ಸಮಾಧಿ'
    },
    title: {
      hi: 'अध्याय 1: सुषुम्ना नाड़ी का रहस्य: जब दोनों स्वर एक साथ चलते हैं',
      en: 'Chapter 1: The Gateway to the Infinite: Activating Sushumna Nadi',
      mr: 'प्रकरण 1: सुषुम्ना नाडीचे गूढ: समाधी आणि आत्मज्ञान',
      kn: 'ಅಧ್ಯಾಯ 1: ಸುಷುಮ್ನಾ ನಾಡಿಯ ಜಾಗೃತಿ ಮತ್ತು ಧ್ಯಾನ'
    },
    excerpt: {
      hi: 'जब दोनों नथुनों से समान रूप से श्वास बहता है, तब काल का चक्र ठहर जाता है। उस समय किया गया ध्यान 10,000 गुना अधिक फलदायी होता है।',
      en: 'When both nostrils breathe equally, time stops. Sushumna awakens, turning ordinary meditation into profound spiritual ecstasy.',
      mr: 'जेव्हा दोन्ही स्वरांमधून सारखाच श्वास वाहतो, तेव्हा सुषुम्ना सुरू होते. ही ध्यानाची सर्वोत्तम वेळ आहे.',
      kn: 'ಉಭಯ ನಾಸಿಕಗಳಲ್ಲಿ ಉಸಿರಾಟ ಸಮತೋಲನಗೊಂಡಾಗ ಧ್ಯಾನದ ಪರಮ ಸ್ಥಿತಿ ಲಭಿಸುತ್ತದೆ.'
    },
    readTime: { hi: '10 मिनट पठन', en: '10 min read', mr: '10 मिनिटे वाचन', kn: '10 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-25',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['spiritual', 'sushumna', 'samadhi', 'kundalini'],
    content: {
      hi: `### शिव स्वरोदय का परम रहस्य
> **"विषं भवति तत्सर्वं विषुवत्संकल्पिते क्षणे।  
सुषुम्णायां यदा प्राणस्तदा मोक्षं विभावयेत्॥"**

### सुषुम्ना क्या है?
दिन भर में स्वर परिवर्तन के संधि-काल (संध्या काल, दोपहर 12 बजे, सूर्यास्त और अर्धरात्रि) में लगभग 2 से 4 मिनट के लिए दोनों नथुने एक साथ चलते हैं। इसे सुषुम्ना कहते हैं।
- **भौतिक कार्यों में शून्य:** सुषुम्ना में किया गया कोई भी संसारी कार्य (दुकान खोलना, यात्रा, लेन-देन) निष्फल होता है।
- **अध्यात्म में अनंत:** इस समय मात्र "सोऽहम्" या "ॐ" का मानसिक जप करने से कुंडलिनी ऊर्जा सुषुम्ना मार्ग से आज्ञा चक्र की ओर ऊर्ध्वगामी होने लगती है।`,
      en: `### The Timeless Portal of Sushumna
When the breath equalizes across both nostrils, the biological mind pauses. Worldly activities during Sushumna fail, but spiritual meditation yields infinite liberation.`,
      mr: `### सुषुम्ना साधना
सुषुम्ना नाडी सुरू असताना सर्व सांसारिक कामे सोडून केवळ ईश्वराचे ध्यान करावे.`,
      kn: `### ಸುಷುಮ್ನಾ ನಾಡಿ ಮತ್ತು ಕುಂಡಲಿನೀ ಜಾಗೃತಿ
> **"ಉಭಯೋಶ್ಚಾರೇ ಸುಷುಮ್ಣಾಯಾಂ ಧ್ಯಾನಂ ಸಮಾಧಿಲಕ್ಷಣಂ॥"**

ಸೂರ್ಯ ಮತ್ತು ಚಂದ್ರ ಎರಡೂ ನಾಸಿಕಗಳು ಸಮಾನವಾಗಿ ಹರಿಯುವಾಗ ಸುಷುಮ್ನಾ ನಾಡಿಯು ತೆರೆದುಕೊಳ್ಳುತ್ತದೆ. ಇದು ಆಧ್ಯಾತ್ಮಿಕ ಧ್ಯಾನ ಮತ್ತು ಸಮಾಧಿಗೆ ಪರಮ ಶ್ರೇಷ್ಠ ಸಮಯ.`
    }
  },
  {
    id: 'ebook_spiritual_ch2',
    pillar: 'spiritual',
    chapterNumber: 2,
    shortName: {
      hi: 'पंच महाभूत व श्वास',
      en: 'Five Elements & Breath',
      mr: 'पंच महाभूत व श्वास',
      kn: 'ಪಂಚಭೂತಗಳು ಮತ್ತು ಶ್ವಾಸ'
    },
    title: {
      hi: 'अध्याय 2: नासिका में 5 तत्वों की पहचान: पृथ्वी, जल, अग्नि, वायु, आकाश',
      en: 'Chapter 2: Deciphering the Five Elements within the Flow of Breath',
      mr: 'प्रकरण 2: श्वासातील पंचतत्व ओळखण्याचे विज्ञान',
      kn: 'ಅಧ್ಯಾಯ 2: ಉಸಿರಾಟದಲ್ಲಿ ಪಂಚಭೂತಗಳ ರಹಸ್ಯ'
    },
    excerpt: {
      hi: 'दर्पण पर श्वास छोड़कर आप जान सकते हैं कि इस समय पृथ्वी तत्व चल रहा है या अग्नि। तत्व ज्ञान से भविष्य की घटनाओं का सटीक पूर्वानुमान संभव है।',
      en: 'By breath geometry on a mirror, identify whether Earth, Water, Fire, Air, or Ether is flowing, unlocking intuitive foresight.',
      mr: 'आरशावर श्वास सोडून कोणता तत्व चालू आहे हे ओळखता येते.',
      kn: 'ಪಂಚತತ್ವಗಳ ಗುರುತಿಸುವಿಕೆ ಮತ್ತು ಭವಿಷ್ಯದ ಅರಿವು.'
    },
    readTime: { hi: '9 मिनट पठन', en: '9 min read', mr: '9 मिनिटे वाचन', kn: '9 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-01-28',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['spiritual', 'elements', 'tattvas', 'intuition'],
    content: {
      hi: `### पंच तत्वों की आकृति और लक्षण
1. **पृथ्वी तत्व:** चौकोर आकृति, मध्य भाग से श्वास बहती है, पीला रंग। स्थिरता और सिद्धि देता है।
2. **जल तत्व:** अर्धचंद्राकार, नीचे की ओर श्वास बहती है, श्वेत रंग। अमृत, तृप्ति और शांति देता है।
3. **अग्नि तत्व:** त्रिकोणाकार, ऊपर की ओर श्वास बहती है, लाल रंग। ऊर्जा, विजय लेकिन क्रोध देता है।
4. **वायु तत्व:** गोलाकार, तिरछी श्वास बहती है, हरा/नीला रंग। गति और चंचलता देता है।
5. **आकाश तत्व:** बिंदु रूप, सर्वव्यापी श्वास। केवल मोक्ष और समाधि हेतु उपयुक्त।`,
      en: `### The Geometry of the Elements
- **Earth (Prithvi):** Square condensation on glass; steady, centered flow.
- **Water (Jala):** Downward crescent; brings profound emotional healing.
- **Fire (Agni):** Upward heat; brings courageous dynamic drive.
- **Air (Vayu):** Diagonal movement; brings agility and rapid thought.
- **Ether (Akasha):** Subtle void; ideal solely for transcendent contemplation.`,
      mr: `### पंचतत्वांचे स्वरूप
पृथ्वी, आप, तेज, वायु आणि आकाश या पाच तत्वांचा श्वासावर होणारा प्रभाव अभ्यासा.`,
      kn: `### ಪಂಚ ಮಹಾಭೂತ ತತ್ವ ವಿಜ್ಞಾನ
ಪೃಥ್ವಿ, ಜಲ, ತೇಜ, ವಾಯು ಮತ್ತು ಆಕಾಶ - ಈ ಐದು ತತ್ವಗಳ ಸಮತೋಲನವೇ ಸ್ವರ ಯೋಗದ ಸಾರವಾಗಿದೆ. ಪ್ರತಿ ತತ್ವವು ದೇಹದ ವಿವಿಧ ಅಂಗಗಳನ್ನು ಪೋಷಿಸುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_spiritual_ch3',
    pillar: 'spiritual',
    chapterNumber: 3,
    shortName: {
      hi: 'प्राणायाम व आयु वृद्धि',
      en: 'Longevity Pranayama',
      mr: 'प्राणायाम व दीर्घायुष्य',
      kn: 'ಪ್ರಾಣಾಯಾಮ ಮತ್ತು ದೀರ್ಘಾಯುಷ್ಯ'
    },
    title: {
      hi: 'अध्याय 3: श्वासों की बचत: आयु को 120 वर्ष तक बढ़ाने की वैदिक कला',
      en: 'Chapter 3: Conserving the Prana: The Vedic Science of Living 120+ Years',
      mr: 'प्रकरण 3: श्वासांची बचत: दीर्घायुष्याची गुप्त वैदिक कला',
      kn: 'ಅಧ್ಯಾಯ 3: ಪ್ರಾಣ ರಕ್ಷಣೆ ಮತ್ತು ದೀರ್ಘಾಯುಷ್ಯ'
    },
    excerpt: {
      hi: 'मनुष्य को वर्षों के हिसाब से नहीं, बल्कि गिनी हुई श्वासों के आधार पर जीवन मिला है। प्रति मिनट श्वास की गति कम करके आयु कैसे बढ़ाई जाती है।',
      en: 'Life is measured not in calendar days, but in assigned breaths. Slowing breath from 15 to 6 per minute biologically extends lifespan.',
      mr: 'मानवी आयुष्य श्वासांवर मोजले जाते. श्वासाचा वेग मंदावून आयुष्य कसे वाढवावे ते शिका.',
      kn: 'ಉಸಿರಾಟದ ಗತಿಯನ್ನು ಕಡಿಮೆ ಮಾಡಿ ದೀರ್ಘಾಯುಷ್ಯವನ್ನು ಪಡೆಯುವುದು.'
    },
    readTime: { hi: '8 मिनट पठन', en: '8 min read', mr: '8 मिनिटे वाचन', kn: '8 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-02',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['spiritual', 'longevity', 'prana', 'slow-breathing'],
    content: {
      hi: `### कछुआ और श्वान का उदाहरण
- श्वान (कुत्ता) 1 मिनट में 40-50 बार श्वास लेता है, उसकी आयु 12-14 वर्ष होती है।
- कछुआ 1 मिनट में मात्र 3-4 बार श्वास लेता है, उसकी आयु 300 वर्ष होती है।
- साधारण मनुष्य 1 मिनट में 15-18 बार सांस लेता है। यदि अभ्यास से इसे 8 सांस प्रति मिनट पर लाया जाए, तो 100 वर्ष की निरोगी आयु अनायास प्राप्त होती है।`,
      en: `### The Tortoise Principle
A dog breathes 40 times a minute and lives 12 years. A tortoise breathes 3 to 4 times a minute and lives over 300 years. Conscious breath slowing doubles cellular longevity.`,
      mr: `### श्वास आणि आयुष्य
श्वासांची संख्या नियंत्रित करून आपले आयुष्य शतकापार नेण्याची योग पद्धत.`,
      kn: `### ಆಜ್ಞಾ ಚಕ್ರ ಮತ್ತು ದೈವಿಕ ಅಂತರ್ದೃಷ್ಟಿ
ಉಸಿರಾಟದ ನಿರಂತರ ಅಭ್ಯಾಸದಿಂದ ಆಜ್ಞಾ ಚಕ್ರವು ಜಾಗೃತವಾಗಿ ಅಂತಃಪ್ರಜ್ಞೆ ಮತ್ತು ಭವಿಷ್ಯದ ಒಳನೋಟಗಳು ಲಭಿಸುತ್ತವೆ.`
    }
  },

  // ─────────────────────────────────────────────
  // 4. PARENTING (3 Chapters - Row 4)
  // ─────────────────────────────────────────────
  {
    id: 'ebook_parenting_ch1',
    pillar: 'parenting',
    chapterNumber: 1,
    shortName: {
      hi: 'बच्चों की एकाग्रता व पढ़ाई',
      en: 'Kids Focus & Study',
      mr: 'मुलांची एकाग्रता व अभ्यास',
      kn: 'ಮಕ್ಕಳ ಏಕಾಗ್ರತೆ ಮತ್ತು ಅಧ್ಯಯನ'
    },
    title: {
      hi: 'अध्याय 1: पढ़ाई के समय चंद्र स्वर: बच्चों की स्मरण शक्ति और एकाग्रता',
      en: 'Chapter 1: Activating Peak Memory & Hyper-Focus in Children via Chandra Swar',
      mr: 'प्रकरण 1: अभ्यासाच्या वेळी चंद्र स्वर: मुलांची स्मरणशक्ती वाढवण्याचा मार्ग',
      kn: 'ಅಧ್ಯಾಯ 1: ಮಕ್ಕಳ ಏಕಾಗ್ರತೆ ಮತ್ತು ಸ್ಮರಣಶಕ್ತಿ ಹೆಚ್ಚಿಸುವ ಸ್ವರ ತಂತ್ರ'
    },
    excerpt: {
      hi: 'बच्चे को पढ़ते समय यदि बायां स्वर (चंद्र) चालू कराया जाए, तो पढ़ा हुआ पाठ तुरंत कंठस्थ होता है और परीक्षा का भय पूरी तरह समाप्त हो जाता है।',
      en: 'Engaging left-nostril flow during study sessions unlocks the brain\'s memory consolidation, eliminating ADHD restlessness and exam anxiety.',
      mr: 'अभ्यास करताना डावा स्वर चालू असल्यास मुलांचे लक्ष विचलित होत नाही.',
      kn: 'ಅಧ್ಯಯನದ ಸಮಯದಲ್ಲಿ ಎಡ ನಾಸಿಕ ಉಸಿರಾಟವು ಮಕ್ಕಳ ಸ್ಮರಣಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.'
    },
    readTime: { hi: '7 मिनट पठन', en: '7 min read', mr: '7 मिनिटे वाचन', kn: '7 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-05',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['parenting', 'kids', 'focus', 'memory', 'exams'],
    content: {
      hi: `### पढ़ाई का वैज्ञानिक नियम
अध्ययन एक "ग्रहणशील" (Receptive) कार्य है। 
- जब दायां स्वर चलता है, तो बच्चा चंचल रहता है, बार-बार पानी पीने या खेलने उठता है।
- जब बायां स्वर चलता है, तो मस्तिष्क की अल्फा तरंगें (Alpha Waves) सक्रिय होती हैं। इस समय पढ़ा हुआ विषय सीधा सबकॉन्शियस मेमोरी में दर्ज होता है।

### माता-पिता के लिए सरल अभ्यास
बच्चे को पढ़ाई पर बैठाने से 2 मिनट पूर्व उसे दाएं हाथ की छोटी अंगुली से दायां नथुना बंद कराएं और 10 गहरी सांसें बाएं से दिलवाएं। उसका चंचल मन तुरंत शांत और एकाग्र हो जाएगा।`,
      en: `### The Neurobiology of Receptive Learning
Studying requires parasympathetic alpha waves:
- When Surya Swar runs, kids are hyperactive and fidgety.
- When Chandra Swar runs, memory consolidation is 400% higher. A 2-minute left-nostril breathing warmup before homework transforms retention.`,
      mr: `### मुलांच्या अभ्यासाची सोपी पद्धत
अभ्यासाला बसण्यापूर्वी डावा स्वर चालू करून दिल्यास एकाग्रता वाढते.`,
      kn: `### ಮಕ್ಕಳ ಮೆದುಳಿನ ಸಮತೋಲನ ಮತ್ತು ಸ್ಮರಣಶಕ್ತಿ
ಮಕ್ಕಳು ಅಧ್ಯಯನ ಮಾಡುವಾಗ ಎಡ ಸ್ವರವು ಸಕ್ರಿಯವಾಗಿದ್ದರೆ ಏಕಾಗ್ರತೆ ಮತ್ತು ಗ್ರಹಣಶಕ್ತಿ ಅತ್ಯುನ್ನತವಾಗಿರುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_parenting_ch2',
    pillar: 'parenting',
    chapterNumber: 2,
    shortName: {
      hi: 'क्रोध व संवाद कला',
      en: 'Tantrums & Compassion',
      mr: 'राग नियंत्रण व सुसंवाद',
      kn: 'ಸಿಟ್ಟು ನಿಯಂತ್ರಣ ಮತ್ತು ಸಂವಾದ'
    },
    title: {
      hi: 'अध्याय 2: बच्चों की जिद और क्रोध पर शांत नियंत्रण: माता-पिता का स्वर संयम',
      en: 'Chapter 2: Transforming Tantrums & Rebelliousness through Parental Breath Tuning',
      mr: 'प्रकरण 2: मुलांचा हट्टीपणा आणि रागावर मात: पालकांसाठी स्वर नियम',
      kn: 'ಅಧ್ಯಾಯ 2: ಮಕ್ಕಳ ಹಠ ಮತ್ತು ಸಿಟ್ಟನ್ನು ಶಾಂತಗೊಳಿಸುವ ತಂತ್ರ'
    },
    excerpt: {
      hi: 'जब बच्चा जिद या गुस्सा करे, तो यदि माता-पिता अपना चंद्र स्वर चलाकर बात करें, तो बच्चा बिना चिल्लाए 2 मिनट में शांत हो जाता है।',
      en: 'When a child throws a tantrum, speaking to them while your Chandra Swar is flowing immediately neutralizes their emotional storm.',
      mr: 'मुलगा हट्ट करत असेल तर पालकांनी स्वतः शांत राहून डाव्या स्वरात संवाद साधावा.',
      kn: 'ಮಕ್ಕಳು ಹಠ ಮಾಡುವಾಗ ಪೋಷಕರು ಶಾಂತತೆಯಿಂದ ವ್ಯವಹರಿಸುವ ಕಲೆ.'
    },
    readTime: { hi: '6 मिनट पठन', en: '6 min read', mr: '6 मिनिटे वाचन', kn: '6 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-09',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['parenting', 'anger', 'peace', 'communication'],
    content: {
      hi: `### बायो-रेजोनेंस का नियम
माता-पिता और बच्चों का आभा-मंडल (Aura) आपस में गहराई से जुड़ा होता है। यदि बच्चा चिल्ला रहा है और आप भी सूर्य स्वर (क्रोध) में चिल्लाएंगे, तो घर का वातावरण विस्फोटक हो जाएगा।
- जब भी बच्चे को समझाना हो, अपना दायां स्वर बंद करें।
- चंद्र स्वर में बोले गए शब्द सीधे बच्चे के हृदय को छूते हैं और उसकी जिद पिघल जाती है।`,
      en: `### The Law of Bio-Resonance
A screaming child cannot be quelled with a solar (Surya) response. Switching to your left nostril cools the auditory frequency of your voice, grounding the child instantly.`,
      mr: `### सुसंवादाचे रहस्य
रागाच्या वेळी स्वतःचा डावा स्वर चालू करून संवाद साधल्यास वाद टळतात.`,
      kn: `### ಕೋಪ ನಿಯಂತ್ರಣ ಮತ್ತು ಚಂದ್ರ ಸ್ವರ
ಮಕ್ಕಳು ಹಠ ಮಾಡುವಾಗ ಅಥವಾ ಕೋಪಗೊಂಡಾಗ ಎಡ ನಾಸಿಕದಿಂದ ಉಸಿರಾಡಿಸುವುದರಿಂದ ತಕ್ಷಣ ಶಾಂತತೆ ಮೂಡುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_parenting_ch3',
    pillar: 'parenting',
    chapterNumber: 3,
    shortName: {
      hi: 'खेल, व्यायाम व ऊर्जा',
      en: 'Sports & Stamina',
      mr: 'खेळ, व्यायाम व ऊर्जा',
      kn: 'ಆಟ, ವ್ಯಾಯಾಮ ಮತ್ತು ಶಕ್ತಿ'
    },
    title: {
      hi: 'अध्याय 3: खेल-कूद और शारीरिक विकास में सूर्य स्वर की शक्ति',
      en: 'Chapter 3: Supercharging Athletic Stamina & Physical Growth with Surya Swar',
      mr: 'प्रकरण 3: खेळ आणि शारीरिक विकासात सूर्य स्वराची ताकद',
      kn: 'ಅಧ್ಯಾಯ 3: ಕ್ರೀಡೆ ಮತ್ತು ದೈಹಿಕ ಬೆಳವಣಿಗೆಯಲ್ಲಿ ಸೂರ್ಯ ಸ್ವರ'
    },
    excerpt: {
      hi: 'खेल के मैदान में उतरते समय, दौड़ते समय या व्यायाम करते समय सूर्य स्वर का चलना बच्चे को असीम ऊर्जा और चोटों से सुरक्षा प्रदान करता है।',
      en: 'Before stepping onto the sports field, activating Surya Swar primes muscles, sharpens reflexes, and prevents physical injuries.',
      mr: 'खेळताना किंवा व्यायाम करताना उजवा स्वर चालू असल्यास थकवा जाणवत नाही.',
      kn: 'ಆಟವಾಡುವಾಗ ಸೂರ್ಯ ಸ್ವರವು ಶಕ್ತಿಯನ್ನು ಮತ್ತು ರಕ್ಷಣೆಯನ್ನು ನೀಡುತ್ತದೆ.'
    },
    readTime: { hi: '7 मिनट पठन', en: '7 min read', mr: '7 मिनिटे वाचन', kn: '7 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-12',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['parenting', 'sports', 'stamina', 'energy'],
    content: {
      hi: `### खेल और शारीरिक बल का सूत्र
दौड़, तैराकी, फुटबॉल या योग अभ्यास करते समय यदि सूर्य स्वर चले, तो लैक्टिक एसिड कम बनता है और बच्चा बिना थके लंबे समय तक उत्कृष्ट प्रदर्शन कर पाता है।`,
      en: `### Musculoskeletal Output & Solar Prana
Athletic performance peaks when Pingala delivers oxygenated rush to major muscle groups without premature lactic acid buildup.`,
      mr: `### खेळातील यश
व्यायाम आणि खेळाच्या वेळी उजवा स्वर चालू ठेवल्यास ऊर्जा टिकून राहते.`,
      kn: `### ಕ್ರೀಡೆ ಮತ್ತು ಶಾರೀರಿಕ ಕ್ಷಮತೆ
ಆಟವಾಡುವಾಗ ಮತ್ತು ವ್ಯಾಯಾಮ ಮಾಡುವಾಗ ಬಲ (ಸೂರ್ಯ) ಸ್ವರವು ಶಕ್ತಿ ಮತ್ತು ಚುರುಕುತನವನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.`
    }
  },

  // ─────────────────────────────────────────────
  // 5. PREGNANCY (3 Chapters - Row 5)
  // ─────────────────────────────────────────────
  {
    id: 'ebook_pregnancy_ch1',
    pillar: 'pregnancy',
    chapterNumber: 1,
    shortName: {
      hi: 'गर्भधान व स्वर मुहूर्त',
      en: 'Conception Timing',
      mr: 'गर्भधान व स्वर मुहूर्त',
      kn: 'ಗರ್ಭಧಾರಣೆ ಮತ್ತು ಸ್ವರ ಮುಹೂರ್ತ'
    },
    title: {
      hi: 'अध्याय 1: दिव्य संतान प्राप्ति: गर्भाधान का अचूक वैदिक स्वर विज्ञान',
      en: 'Chapter 1: Divine Conception: The Vedic Science of Conception Timing & Swar',
      mr: 'प्रकरण 1: दिव्य संतती प्राप्ती: गर्भाधानाचा अचूक वैदिक स्वर नियम',
      kn: 'ಅಧ್ಯಾಯ 1: ದಿವ್ಯ ಮಗುವಿನ ಜನನಕ್ಕಾಗಿ ಗರ್ಭಧಾರಣೆಯ ಸ್ವರ ರಹಸ್ಯ'
    },
    excerpt: {
      hi: 'शिव स्वरोदय के अनुसार, गर्भाधान के समय पुरुष का सूर्य स्वर और स्त्री का चंद्र स्वर सक्रिय होना श्रेष्ठ, तेजस्वी और निरोगी संतान को जन्म देता है।',
      en: 'According to Shiva Swarodaya, when the male breathes through Surya Swar and female through Chandra Swar during union, a sublime soul is welcomed.',
      mr: 'गर्भाधानाच्या वेळी पुरुषाचा सूर्य स्वर आणि स्त्रीचा चंद्र स्वर चालू असणे अत्यंत शुभ असते.',
      kn: 'ಗರ್ಭಧಾರಣೆಯ ಸಮಯದಲ್ಲಿ ಪುರುಷನಲ್ಲಿ ಸೂರ್ಯ ಸ್ವರ ಮತ್ತು ಸ್ತ್ರೀಯಲ್ಲಿ ಚಂದ್ರ ಸ್ವರ ಇರಬೇಕು.'
    },
    readTime: { hi: '9 मिनट पठन', en: '9 min read', mr: '9 मिनिटे वाचन', kn: '9 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-15',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['pregnancy', 'garbhsanskar', 'conception', 'divine-child'],
    content: {
      hi: `### शिव स्वरोदय शास्त्र का स्पष्ट प्रमाण
> **"पुंसां सूर्येण संसारे नारीणां चन्द्रचारतः।  
ऋतौ संगमने काले पुत्रो भवति निश्चितम्॥"**  
*(शिव स्वरोदय - श्लोक 112)*

### गर्भाधान के गोपनीय सूत्र
1. **ऋतुकाल की सम तिथियां:** 6वीं, 8वीं, 10वीं, 12वीं रात्रि पुत्र प्राप्ति तथा 5वीं, 7वीं, 9वीं रात्रि कन्या प्राप्ति हेतु शुभ मानी गई हैं।
2. **स्वर सामंजस्य:** गर्भाधान के क्षण में पति का दायां स्वर (सूर्य) और पत्नी का बायां स्वर (चंद्र) सक्रिय रहना चाहिए। यह ऊर्जा ध्रुवीयता (Polarity) को पूर्ण संतुलित करता है।
3. **मन की पवित्रता:** उस समय कोई भी द्वेष, भय या वासना न होकर परमात्मा से एक दिव्य पुण्यात्मा के आगमन की प्रार्थना होनी चाहिए।`,
      en: `### The Classical Decree of Shiva Swarodaya
> **"When the male acts in the solar breath and the female in the lunar breath at the auspicious time of the cycle, a healthy child is undeniably conceived."**

### Inviolable Conception Rules
- **Solar/Lunar Polarity:** The father’s Pingala channel provides vigor and chromosome stability; the mother’s Ida channel offers nurturing womb receptivity.
- **Pure Sanctity:** Both partners must mentally invite an enlightened soul into the family lineage.`,
      mr: `### गर्भाधान नियम
पतीचा सूर्य स्वर आणि पत्नीचा चंद्र स्वर चालू असताना केलेले गर्भाधान तेजस्वी संतती प्रदान करते.`,
      kn: `### ಗರ್ಭ ಸಂಸ್ಕಾರ - ದಿವ್ಯ ಸಂತಾನ ಪ್ರಾಪ್ತಿ
ಪ್ರಾಚೀನ ಸ್ವರೋದಯ ವಿಜ್ಞಾನದ ಪ್ರಕಾರ ಸರಿಯಾದ ಸ್ವರದಲ್ಲಿ ಗರ್ಭಧಾರಣೆ ಮಾಡುವುದರಿಂದ ದೈವಿಕ ಮತ್ತು ಆರೋಗ್ಯವಂತ ಸಂತಾನ ಪ್ರಾಪ್ತಿಯಾಗುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_pregnancy_ch2',
    pillar: 'pregnancy',
    chapterNumber: 2,
    shortName: {
      hi: 'मातृ-शिशु स्वास्थ्य व शांति',
      en: 'Prenatal Peace & Nadi',
      mr: 'मातृ-शिशू आरोग्य व शांती',
      kn: 'ತಾಯಿ-ಮಗುವಿನ ಆರೋಗ್ಯ'
    },
    title: {
      hi: 'अध्याय 2: गर्भावस्था के 9 माह: गर्भस्थ शिशु के मस्तिष्क विकास का स्वर योग',
      en: 'Chapter 2: The 9 Months of Bliss: Fetal Brain Development through Chandra Swar',
      mr: 'प्रकरण 2: गरोदरपणातील ९ महिने: गर्भातील बाळाच्या बुद्धी विकासासाठी स्वर योग',
      kn: 'ಅಧ್ಯಾಯ 2: ಗರ್ಭಾವಸ್ಥೆಯ 9 ತಿಂಗಳುಗಳಲ್ಲಿ ಶಿಶುವಿನ ಮಾನಸಿಕ ಬೆಳವಣಿಗೆ'
    },
    excerpt: {
      hi: 'गर्भिणी माता के चंद्र स्वर में रहने से गर्भस्थ शिशु में तनाव हार्मोन नहीं पहुंचते, जिससे शिशु शांत, बुद्धिमान और उच्च चेतना वाला बनता है।',
      en: 'Maintaining predominantly cooling lunar breath shields the fetus from maternal cortisol, cultivating high emotional intelligence in the womb.',
      mr: 'गरोदरपणात मातेने शांत राहून चंद्र स्वराचा सराव केल्यास बाळ निरोगी आणि बुद्धिमान जन्माला येते.',
      kn: 'ಗರ್ಭಿಣಿ ತಾಯಿಯ ಶಾಂತ ಉಸಿರಾಟವು ಮಗುವಿನ ಬುದ್ಧಿಮತ್ತೆಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.'
    },
    readTime: { hi: '8 मिनट पठन', en: '8 min read', mr: '8 मिनिटे वाचन', kn: '8 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-18',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['pregnancy', 'prenatal', 'fetal-development', 'motherhood'],
    content: {
      hi: `### गर्भ में संस्कार कैसे जाते हैं?
वैज्ञानिक रूप से सिद्ध है कि माता की प्रत्येक श्वास और भावना का सीधा प्रभाव गर्भस्थ शिशु की धड़कनों पर पड़ता है।
- यदि माता दिन भर तनाव या क्रोध (असंतुलित सूर्य स्वर) में रहे, तो शिशु चिड़चिड़ा और कमजोर होता है।
- यदि माता नित्य 20 मिनट चंद्र स्वर में बैठकर ॐ का गुंजन या वेदमंत्र सुने, तो शिशु के न्यूरॉन्स अद्भुत गति से विकसित होते हैं।

### प्रतिदिन का 3-सूत्रीय अभ्यास
1. प्रातः 15 मिनट अनुलोम-विलोम प्राणायाम।
2. दोपहर के भोजन के पश्चात 20 मिनट बाईं करवट विश्राम।
3. सायंकाल शांत मन से शिशु से संवाद (गर्भ संवाद)।`,
      en: `### Cellular Imprinting in the Womb
Every maternal breath frequency modulates amniotic fluid chemistry:
- Prolonged sympathetic dominance passes cortisol to the placenta.
- Gentle Chandra Swar meditation enriches the fetal brain with oxytocin and serene alpha waves.`,
      mr: `### गर्भ संस्कार साधना
रोज २० मिनिटे अनुलोम विलोम आणि शांत मनाने बाळाशी संवाद साधणे हे सर्वोत्तम गर्भ संस्कार आहेत.`,
      kn: `### ಗರ್ಭಸ್ಥ ಶಿಶುವಿನ ಮೆದುಳಿನ ಬೆಳವಣಿಗೆ
ಗರ್ಭಿಣಿ ಸ್ತ್ರೀಯು ಶಾಂತಯುತ ಚಂದ್ರ ಸ್ವರದಲ್ಲಿ ಸಂಗೀತ ಮತ್ತು ಮಂತ್ರಗಳನ್ನು ಆಲಿಸುವುದರಿಂದ ಶಿಶುವಿನ ಮಾನಸಿಕ ವಿಕಾಸ ಶ್ರೇಷ್ಠವಾಗಿರುತ್ತದೆ.`
    }
  },
  {
    id: 'ebook_pregnancy_ch3',
    pillar: 'pregnancy',
    chapterNumber: 3,
    shortName: {
      hi: 'सुखद प्रसव व स्वर क्रिया',
      en: 'Smooth Natural Birth',
      mr: 'सहज प्रसूती व स्वर क्रिया',
      kn: 'ಸುಲಭ ನೈಸರ್ಗಿಕ ಹೆರಿಗೆ'
    },
    title: {
      hi: 'अध्याय 3: बिना भय और पीड़ा के प्राकृतिक प्रसव: प्रसव काल का स्वर रहस्य',
      en: 'Chapter 3: Effortless Natural Childbirth: Swar Breathing during Labor',
      mr: 'प्रकरण 3: भयमुक्त नैसर्गिक प्रसूती: प्रसूती वेळेचे स्वर रहस्य',
      kn: 'ಅಧ್ಯಾಯ 3: ನೋವುರಹಿತ ನೈಸರ್ಗಿಕ ಹೆರಿಗೆಗೆ ಸ್ವರ ಯೋಗ'
    },
    excerpt: {
      hi: 'प्रसव पीड़ा के समय किस स्वर को चलाने से मांसपेशियां शिथिल होती हैं और प्रसव अत्यंत सुगमता और प्राकृतिक रूप से संपन्न होता है।',
      en: 'Harmonizing pelvic relaxation breathing during early and active labor facilitates pain-free, smooth natural delivery.',
      mr: 'प्रसूतीच्या वेळी योग्य श्वास पद्धतीचा वापर केल्यास नैसर्गिक प्रसूती सुलभ होते.',
      kn: 'ಹೆರಿಗೆಯ ಸಮಯದಲ್ಲಿ ಸೂಕ್ತ ಉಸಿರಾಟದ ಮೂಲಕ ನೈಸರ್ಗಿಕ ಹೆರಿಗೆಯನ್ನು ಸಾಧಿಸುವುದು.'
    },
    readTime: { hi: '7 मिनट पठन', en: '7 min read', mr: '7 मिनिटे वाचन', kn: '7 ನಿಮಿಷ ಓದು' },
    image: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&auto=format&fit=crop&q=80',
    publishedDate: '2025-02-22',
    author: 'Yogacharya Mohan Kalburgi',
    tags: ['pregnancy', 'labor', 'natural-birth', 'delivery'],
    content: {
      hi: `### प्रसव के समय का स्वर प्रबंधन
1. **प्रसव वेदना शुरू होते ही:** बायां स्वर (चंद्र) चालू रखें। यह एंडोर्फिन (प्राकृतिक पेनकिलर) के स्राव को तेज करता है और गर्भाशय ग्रीवा (cervix) को कोमल बनाकर खुलने में सहायता करता है।
2. **अंतिम पुशिंग स्टेज:** जब चिकित्सक या दाई कहें, तब गहरी श्वास अंदर भरकर दायां स्वर (अपान वायु का बल) सक्रिय करें। इससे न्यूनतम समय में सुरक्षित प्रसव संपन्न होता है।`,
      en: `### Breath Phases of Labor
- **Dilation Stage:** Chandra Swar maximizes natural endorphin release, softening pelvic ligaments.
- **Expulsion Stage:** Channeling deep abdominal breath ensures strong, rhythmic, and safe delivery without trauma.`,
      mr: `### नैसर्गिक प्रसूतीचे रहस्य
प्रसूतीच्या वेळी श्वासावर नियंत्रण ठेवल्यास विनाअडथळा सुलभ प्रसूती होते.`,
      kn: `### ಸ್ವಾಭಾವಿಕ ಮತ್ತು ನೋವುರಹಿತ ಪ್ರಸವ
ಪ್ರಸವ ಸಮಯದಲ್ಲಿ ಸರಿಯಾದ ಉಸಿರಾಟದ ಲಯ ಮತ್ತು ಅಪಾನ ವಾಯುವಿನ ನಿಯಂತ್ರಣದಿಂದ ನೈಸರ್ಗಿಕ ಸುಲಭ ಹೆರಿಗೆ ಸಾಧ್ಯವಾಗುತ್ತದೆ.`
    }
  }
];
