/**
 * Master Yogic Asana, Pranayama & Mudra Motion Catalog
 * 
 * Strict anatomical, breath-synchronized specifications.
 * No synthetic or anatomically implausible yoga postures permitted.
 */

export interface YogaMotionSpec {
  id: string;
  category: 'asana' | 'pranayama' | 'mudra';
  sanskritName: string;
  englishName: string;
  icon: string;
  postureDescription: string;
  breathingRatio: {
    inhaleSeconds: number;
    kumbhakaSeconds: number;
    exhaleSeconds: number;
    repetitionCount: number;
  };
  swarAlignment: 'surya_nadi' | 'chandra_nadi' | 'sushumna' | 'tridosha_neutral';
  contraindications: string[];
  anatomicalFocus: string[];
  isVerified: boolean;
  reviewStatus?: 'pending' | 'verified_safe' | 'rejected';
}

export const YOGA_MOTION_CATALOG: YogaMotionSpec[] = [
  // ── 1. ASANAS ──
  {
    id: 'asana_tadasana',
    category: 'asana',
    sanskritName: 'ताड़ासन',
    englishName: 'Tadasana (Mountain Pose)',
    icon: '🏔️',
    postureDescription: 'Feet grounded hip-width apart, tailbone tucked, spine lengthened upward, arms active by the sides, crown reaching for the sky.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 2, exhaleSeconds: 4, repetitionCount: 5 },
    swarAlignment: 'sushumna',
    contraindications: ['Severe low blood pressure', 'Dizziness'],
    anatomicalFocus: ['Spinal axial elongation', 'Ankle stability', 'Core engagement'],
    isVerified: false,
  },
  {
    id: 'asana_vrikshasana',
    category: 'asana',
    sanskritName: 'वृक्षासन',
    englishName: 'Vrikshasana (Tree Pose)',
    icon: '🌳',
    postureDescription: 'Standing on left leg, right sole placed on inner left thigh (avoiding knee joint), hands joined in Anjali Mudra at heart or overhead.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 0, exhaleSeconds: 4, repetitionCount: 6 },
    swarAlignment: 'tridosha_neutral',
    contraindications: ['Recent knee surgery', 'Vertigo'],
    anatomicalFocus: ['Single-leg balance', 'Hip external rotation', 'Drishti focus'],
    isVerified: false,
  },
  {
    id: 'asana_padmasana',
    category: 'asana',
    sanskritName: 'पद्मासन',
    englishName: 'Padmasana (Full Lotus Pose)',
    icon: '🪷',
    postureDescription: 'Seated on floor, each foot placed on the opposite thigh with soles facing upward, spine erect, hands in Chin or Gyan Mudra.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 4, exhaleSeconds: 6, repetitionCount: 10 },
    swarAlignment: 'sushumna',
    contraindications: ['Knee ligament injury', 'Sciatica', 'Tight ankles'],
    anatomicalFocus: ['Pelvic floor stability', 'Deep hip flexion', 'Sushumna prana ascent'],
    isVerified: false,
  },
  {
    id: 'asana_sukhasana',
    category: 'asana',
    sanskritName: 'सुखासन',
    englishName: 'Sukhasana (Easy Meditative Pose)',
    icon: '🧘',
    postureDescription: 'Comfortable cross-legged seat with both sit-bones grounded, relaxed shoulders, chest open, hands resting gently on knees.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 0, exhaleSeconds: 4, repetitionCount: 12 },
    swarAlignment: 'tridosha_neutral',
    contraindications: ['Acute knee inflammation'],
    anatomicalFocus: ['Thoracic openness', 'Relaxed diaphragm'],
    isVerified: false,
  },
  {
    id: 'asana_vajrasana',
    category: 'asana',
    sanskritName: 'वज्रासन',
    englishName: 'Vajrasana (Diamond / Thunderbolt Pose)',
    icon: '⚡',
    postureDescription: 'Kneeling with big toes touching and heels spread apart, hips resting comfortably in the cup formed by heels, palms resting on thighs.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 0, exhaleSeconds: 4, repetitionCount: 8 },
    swarAlignment: 'surya_nadi',
    contraindications: ['Severe knee arthritis', 'Foot arch stiffness'],
    anatomicalFocus: ['Digestive activation (Kanda)', 'Knee ligament stretch'],
    isVerified: false,
  },
  {
    id: 'asana_bhujangasana',
    category: 'asana',
    sanskritName: 'भुजंगासन',
    englishName: 'Bhujangasana (Cobra Pose)',
    icon: '🐍',
    postureDescription: 'Prone position, palms beneath shoulders, elbows tucked close to ribs, inhale to lift chest smoothly using back muscles without jamming lumbar.',
    breathingRatio: { inhaleSeconds: 3, kumbhakaSeconds: 2, exhaleSeconds: 3, repetitionCount: 4 },
    swarAlignment: 'surya_nadi',
    contraindications: ['Herniated disc', 'Pregnancy', 'Carpal tunnel'],
    anatomicalFocus: ['Spinal extensor strength', 'Chest expansion'],
    isVerified: false,
  },
  {
    id: 'asana_shashankasana',
    category: 'asana',
    sanskritName: 'शशांकासन',
    englishName: 'Shashankasana (Hare / Child Pose)',
    icon: '🐇',
    postureDescription: 'From Vajrasana, raise arms on inhale, fold forward from hips on exhale resting forehead on ground and palms extended softly forward.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 2, exhaleSeconds: 6, repetitionCount: 5 },
    swarAlignment: 'chandra_nadi',
    contraindications: ['Severe vertigo', 'Slipped disc'],
    anatomicalFocus: ['Parasympathetic cooling', 'Spinal lumbar decompression'],
    isVerified: false,
  },
  {
    id: 'asana_trikonasana',
    category: 'asana',
    sanskritName: 'त्रिकोणासन',
    englishName: 'Trikonasana (Triangle Pose)',
    icon: '📐',
    postureDescription: 'Wide stance, right foot out 90°, torso hinging laterally over right leg, right hand resting on shin/block, left arm extending vertically.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 0, exhaleSeconds: 4, repetitionCount: 4 },
    swarAlignment: 'tridosha_neutral',
    contraindications: ['Neck strain', 'High blood pressure (look down)'],
    anatomicalFocus: ['Hamstring length', 'Thoracic rotation', 'Pelvic stability'],
    isVerified: false,
  },
  {
    id: 'asana_surya_namaskar',
    category: 'asana',
    sanskritName: 'सूर्य नमस्कार',
    englishName: 'Surya Namaskar (12 Classical Vinyasa Steps)',
    icon: '☀️',
    postureDescription: 'Continuous, fluid 12-posture sequence synchronized with solar breath: Pranamasana → Hastauttanasana → Padahastasana → Ashwa Sanchalanasana → Dandasana → Ashtanga Namaskara → Bhujangasana → Parvatasana.',
    breathingRatio: { inhaleSeconds: 3, kumbhakaSeconds: 0, exhaleSeconds: 3, repetitionCount: 6 },
    swarAlignment: 'surya_nadi',
    contraindications: ['Active fever', 'Cardiac conditions without guidance'],
    anatomicalFocus: ['Full-body cardiovascular flow', 'Pranic solar activation'],
    isVerified: false,
  },

  // ── 2. PRANAYAMA ──
  {
    id: 'pranayama_anulom_vilom',
    category: 'pranayama',
    sanskritName: 'अनुलोम विलोम',
    englishName: 'Anulom Vilom (Alternate Nostril Flow)',
    icon: '🌬️',
    postureDescription: 'Sitting in Padmasana/Sukhasana. Right hand in Nasika Mudra. Inhale through left nostril (Ida), switch and exhale through right (Pingala). Inhale right, exhale left.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 0, exhaleSeconds: 6, repetitionCount: 15 },
    swarAlignment: 'sushumna',
    contraindications: ['Blocked nasal passage during acute cold (gentle practice only)'],
    anatomicalFocus: ['Autonomic nervous system balancing', 'Hemispheric synchronization'],
    isVerified: false,
  },
  {
    id: 'pranayama_nadi_shodhana',
    category: 'pranayama',
    sanskritName: 'नाड़ी शोधन',
    englishName: 'Nadi Shodhana (Purification with Kumbhaka)',
    icon: '🌀',
    postureDescription: 'Advanced pranayama incorporating internal breath retention (Antar Kumbhaka) in 1:4:2 ratio with Bandhas (Jalandhara, Mula).',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 16, exhaleSeconds: 8, repetitionCount: 10 },
    swarAlignment: 'sushumna',
    contraindications: ['Hypertension', 'Heart conditions', 'Pregnancy'],
    anatomicalFocus: ['Nadi purification', 'Pranic reserve elevation'],
    isVerified: false,
  },
  {
    id: 'pranayama_bhramari',
    category: 'pranayama',
    sanskritName: 'भ्रामरी',
    englishName: 'Bhramari (Humming Bee Breath)',
    icon: '🐝',
    postureDescription: 'Thumbs closing ear tragus, fingers gently over eyes (Shanmukhi Mudra). Inhale deeply, exhale while producing a steady, resonant humming vibration in the skull.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 0, exhaleSeconds: 8, repetitionCount: 7 },
    swarAlignment: 'chandra_nadi',
    contraindications: ['Severe ear infection'],
    anatomicalFocus: ['Nitric oxide release in paranasal sinuses', 'Vagus nerve stimulation'],
    isVerified: false,
  },
  {
    id: 'pranayama_bhastrika',
    category: 'pranayama',
    sanskritName: 'भस्त्रिका',
    englishName: 'Bhastrika (Bellows Breath)',
    icon: '🔥',
    postureDescription: 'Forceful, rhythmic inhalations and exhalations powered by diaphragmatic expansion and contraction, building immense internal tapas and solar heat.',
    breathingRatio: { inhaleSeconds: 1, kumbhakaSeconds: 0, exhaleSeconds: 1, repetitionCount: 20 },
    swarAlignment: 'surya_nadi',
    contraindications: ['High blood pressure', 'Glaucoma', 'Hernia'],
    anatomicalFocus: ['Metabolic fire stimulation (Agni)', 'Lobe oxygenation'],
    isVerified: false,
  },
  {
    id: 'pranayama_ujjayi',
    category: 'pranayama',
    sanskritName: 'उज्जयी',
    englishName: 'Ujjayi (Victorious Ocean Breath)',
    icon: '🌊',
    postureDescription: 'Gentle constriction of the glottis at the back of throat producing a soft oceanic hiss on both smooth inhalation and exhalation.',
    breathingRatio: { inhaleSeconds: 5, kumbhakaSeconds: 0, exhaleSeconds: 5, repetitionCount: 12 },
    swarAlignment: 'sushumna',
    contraindications: ['None when practiced gently'],
    anatomicalFocus: ['Laryngeal regulation', 'Mindful meditative anchoring'],
    isVerified: false,
  },

  // ── 3. MUDRAS ──
  {
    id: 'mudra_chin',
    category: 'mudra',
    sanskritName: 'चिन् मुद्रा',
    englishName: 'Chin Mudra (Gesture of Consciousness)',
    icon: '👌',
    postureDescription: 'Tip of index finger touching tip of thumb forming a circle; remaining three fingers extended straight; palms facing downward on knees.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 2, exhaleSeconds: 4, repetitionCount: 10 },
    swarAlignment: 'chandra_nadi',
    contraindications: ['None'],
    anatomicalFocus: ['Rooting prana downward', 'Calming sensory dissipation'],
    isVerified: false,
  },
  {
    id: 'mudra_gyan',
    category: 'mudra',
    sanskritName: 'ज्ञान मुद्रा',
    englishName: 'Gyan Mudra (Gesture of Knowledge)',
    icon: '✨',
    postureDescription: 'Identical finger placement as Chin Mudra, but palms facing upward toward sky, receiving cosmic prana and stimulating intellect.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 2, exhaleSeconds: 4, repetitionCount: 10 },
    swarAlignment: 'sushumna',
    contraindications: ['None'],
    anatomicalFocus: ['Pituitary / Ajna chakra stimulation', 'Memory enhancement'],
    isVerified: false,
  },
  {
    id: 'mudra_dhyana',
    category: 'mudra',
    sanskritName: 'ध्यान मुद्रा',
    englishName: 'Dhyana Mudra (Meditation Seal)',
    icon: '🤲',
    postureDescription: 'Hands resting in lap, right palm resting on top of left palm, tips of both thumbs touching gently to form a spiritual triangle.',
    breathingRatio: { inhaleSeconds: 5, kumbhakaSeconds: 0, exhaleSeconds: 5, repetitionCount: 15 },
    swarAlignment: 'sushumna',
    contraindications: ['None'],
    anatomicalFocus: ['Equilibrium of left and right hemispheres', 'Samadhi entry'],
    isVerified: false,
  },
  {
    id: 'mudra_nasika',
    category: 'mudra',
    sanskritName: 'नासिका मुद्रा',
    englishName: 'Nasika / Vishnu Mudra',
    icon: '👃',
    postureDescription: 'Right index and middle fingers folded toward palm root; thumb operates right nostril, ring and little finger operate left nostril.',
    breathingRatio: { inhaleSeconds: 4, kumbhakaSeconds: 4, exhaleSeconds: 6, repetitionCount: 10 },
    swarAlignment: 'sushumna',
    contraindications: ['None'],
    anatomicalFocus: ['Precise unilateral nostril valve control during Swar Yoga'],
    isVerified: false,
  },
];

