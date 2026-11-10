/**
 * SWAR YOGA - MOHAN SIR AI DIGITAL TWIN MASTER CATALOG
 * Comprehensive catalog of 34 professions, curated wardrobes, verified environments,
 * camera framing presets, vocal DNA profiles, and AI model registry.
 */

export interface ProfessionConfig {
  id: string;
  nameEn: string;
  nameHi: string;
  category: 'education' | 'spiritual' | 'corporate' | 'healthcare' | 'media' | 'legal_public' | 'trades_tech';
  icon: string;
  descriptionEn: string;
  descriptionHi: string;
  recommendedOutfitId: string;
  recommendedEnvId: string;
  cameraFraming: 'chest_up' | 'face_closeup' | 'waist_up' | 'seated_desk';
  presentationStyle: string;
  sampleTopic: {
    hi: string;
    mr: string;
    en: string;
    ne: string;
  };
  promptConditioning: string;
  captionPreset: string;
}

export interface WardrobePreset {
  id: string;
  nameEn: string;
  nameHi: string;
  category: 'formal' | 'vedic' | 'uniform' | 'traditional';
  icon: string;
  description: string;
  promptConditioning: string;
  primaryColors: string[];
  referenceImageUrl: string;
}

export interface EnvironmentPreset {
  id: string;
  nameEn: string;
  nameHi: string;
  category: 'indoor_formal' | 'spiritual_ashram' | 'studio' | 'nature' | 'workplace';
  icon: string;
  description: string;
  promptConditioning: string;
  lightingStyle: string;
  referenceImageUrl: string;
}

export interface CameraFramingPreset {
  id: 'chest_up' | 'face_closeup' | 'waist_up' | 'seated_desk' | 'full_body' | 'presenter_slides' | 'split_screen' | 'pip';
  nameEn: string;
  nameHi: string;
  icon: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  description: string;
  fieldOfView: string;
  ensuresHeadAndShoulders: boolean;
}

export interface VoiceProfile {
  id: string;
  name: string;
  type: 'mohan_authentic_clone' | 'indic_f5_clone' | 'neural_tts_draft';
  language: 'hi' | 'mr' | 'en' | 'ne';
  audioSampleUrl: string;
  description: string;
  truthfulStatus: 'AUTHENTIC_VERIFIED' | 'SYNTHESIZED_PROTOTYPE' | 'DRAFT_NEURAL';
}

export interface AnchorVideo {
  id: string;
  title: string;
  language: string;
  durationSeconds: number;
  resolution: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  framing: string;
  isPrimaryMaster: boolean;
}

// ─────────────────────────────────────────────
// 1. MASTER ANCHOR TALKING VIDEOS (Bunny CDN Verified)
// ─────────────────────────────────────────────
export const MASTER_ANCHOR_VIDEOS: AnchorVideo[] = [
  {
    id: 'anchor_whiteboard_lecture',
    title: 'Mohan Sir Academic Presentation (Charcoal Waistcoat & Whiteboard)',
    language: 'Hindi & Marathi',
    durationSeconds: 180,
    resolution: '1080p',
    videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
    description: 'Executive waistcoat, collared shirt, direct teaching eye contact, clear articulation.',
    framing: 'Chest-Up Seated / Standing at Board',
    isPrimaryMaster: true,
  },
  {
    id: 'anchor_hindi_lecture',
    title: 'Mohan Sir Swar Shastra Masterclass (Hindi Authentic)',
    language: 'Hindi',
    durationSeconds: 154,
    resolution: '1080p',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
    description: 'Deep authoritative lecture on Swar Shastra and Prana activation.',
    framing: 'Chest-Up Seated',
    isPrimaryMaster: false,
  },
  {
    id: 'anchor_marathi_lecture',
    title: 'Mohan Sir Swar Yoga Workshop (Marathi Authentic)',
    language: 'Marathi',
    durationSeconds: 165,
    resolution: '1080p',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
    description: 'Warm, conversational Marathi teaching on health and breath rhythm.',
    framing: 'Chest-Up Seated',
    isPrimaryMaster: false,
  },
  {
    id: 'anchor_shad_ripu_master',
    title: 'Shad Ripu Explained – 6 Enemies of the Mind (Philosophical Master)',
    language: 'Hindi',
    durationSeconds: 240,
    resolution: '1080p',
    videoUrl: 'https://swaryogacrm.b-cdn.net/users/mohan-rag-avatar/training-vault/1793151988088-hgfwl8-Shad_Ripu_Explained___6_Enemies_of_the_Mind_That_Destroy_Peace.mp4',
    thumbnailUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
    description: 'Spiritual discourse with hand mudras and calm facial expressions.',
    framing: 'Chest-Up Presenter',
    isPrimaryMaster: false,
  },
];

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// 2. VOCAL DNA PROFILES (ALL 39 REAL MOHAN SIR WORKSHOP LECTURES)
// ─────────────────────────────────────────────
export const MASTER_VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "vocal_dna_04f6e33e",
    name: "Mohan Sir - Swar yoga intro clip-3 - 4K (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_04f6e33e.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - स्वर विज्ञान व नाड़ी परिचय (प्रामाणिक ऑडियो)।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_0e55351e",
    name: "Mohan Sir - Swar-yoga-hindi (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_0e55351e.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - इड़ा व पिंगला संतुलन।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_107fce87",
    name: "Mohan Sir - Hindi Oct-26 Mor Swar Yoga L-1 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_107fce87.mp3",
    description: "मोहन सर का वास्तविक प्रातःकालीन व्याख्यान - दैनिक स्वर परीक्षा।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_137b14ff",
    name: "Mohan Sir - Swar Aahar Shastra - जठराग्नि (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_137b14ff.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - भोजन और जठराग्नि का विज्ञान।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_22f3e9d3",
    name: "Mohan Sir - Swar Aahar Shastra - ऋतु चक्र (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_22f3e9d3.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - ऋतु अनुसार भोजन व स्वर चक्र।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_2368fa4f",
    name: "Mohan Sir - Swar Aahar Shastra - पाचन (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_2368fa4f.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - अन्न व प्राण का संबंध।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_247e9982",
    name: "Mohan Sir - Swar yoga intro1 - 4K (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_247e9982.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - शिव स्वरोदय शास्त्र के प्रमाण।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_250f6db9",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 1 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_250f6db9.mp3",
    description: "मोहन सर का वास्तविक कार्यशाला उद्बोधन - 7 दिवसीय यात्रा।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_3246a191",
    name: "Mohan Sir - Marathi-Oct-Eve-Swar Yoga L-1 (Marathi)",
    type: 'mohan_authentic_clone' as const,
    language: "mr" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_3246a191.mp3",
    description: "मोहन सर यांचे मूळ अस्खलित मराठी व्याख्यान - नाडी व श्वास विज्ञान।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_33b599f9",
    name: "Mohan Sir - Meditation workshop (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_33b599f9.mp3",
    description: "मोहन सर का शांत ध्यान मार्गदर्शन - सुषुम्ना नाड़ी प्रवाह।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_4cd25a86",
    name: "Mohan Sir - Eng Morning Swar Yoga (English)",
    type: 'mohan_authentic_clone' as const,
    language: "en" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_4cd25a86.mp3",
    description: "Mohan Sir authentic English lecture on breath biorhythms and autonomous nervous system.",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_4e3dfe2f",
    name: "Mohan Sir - Marathi-Oct-Eve-Swar Yoga L-1 (Marathi)",
    type: 'mohan_authentic_clone' as const,
    language: "mr" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_4e3dfe2f.mp3",
    description: "मोहन सर यांचे मूळ मराठी व्याख्यान - संध्याकालीन स्वर बदलण्याची पद्धत।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_5fd3882c",
    name: "Mohan Sir - Swar yoga Day-1 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_5fd3882c.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - प्रथम दिवस की साधना।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_62803d4f",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 2 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_62803d4f.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - चंद्र नाड़ी का मानसिक प्रभाव।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_6902ac81",
    name: "Mohan Sir - Eng Morning Swar Yoga (English)",
    type: 'mohan_authentic_clone' as const,
    language: "en" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_6902ac81.mp3",
    description: "Mohan Sir real keynote speech on respiration and sympathetic regulation.",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_74f27512",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 3 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_74f27512.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - सूर्य नाड़ी की क्रियाशीलता।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_7d0e63ef",
    name: "Mohan Sir - GMT20260917-133158 Avo (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_7d0e63ef.mp3",
    description: "मोहन सर का वास्तविक स्टूडियो रिकॉर्डिंग व्याख्यान।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_8123359c",
    name: "Mohan Sir - Swar Aahar Shastra - निद्रा (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_8123359c.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - रात्रि भोजन व विश्राम।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_8a676611",
    name: "Mohan Sir - Swar Yoga Evening Batch 06-10 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_8a676611.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - सांध्यकालीन प्राणायाम।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_9789b24f",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 4 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_9789b24f.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - तिथि और पंचांग स्वर मिलान।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_9ced540f",
    name: "Mohan Sir - Hindi Oct-26 Mor Swar Yoga L-1 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_9ced540f.mp3",
    description: "मोहन सर का वास्तविक प्रातःकालीन व्याख्यान - ऊर्जा संचार।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_9dcae30a",
    name: "Mohan Sir - Swar Yoga Evening Batch 06-09 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_9dcae30a.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - संध्या ध्यान।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_a09f45d0",
    name: "Mohan Sir - Swar Aahar Shastra - जल तत्व (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_a09f45d0.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - जल पीने का सही समय और स्वर।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_a269f15c",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 5 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_a269f15c.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - पंचमहाभूत तत्व शुद्धि।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_b17ecd51",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 6 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_b17ecd51.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - सुषुम्ना नाड़ी का जागरण।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_ba06f3a9",
    name: "Mohan Sir - Swar yoga intro part-2 - 4K (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_ba06f3a9.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - दैनिक जीवन में स्वर के चमत्कार।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_baedb88d",
    name: "Mohan Sir - Marathi-Oct-Eve-Swar Yoga L-1 (Marathi)",
    type: 'mohan_authentic_clone' as const,
    language: "mr" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_baedb88d.mp3",
    description: "मोहन सर यांचे मूळ अस्खलित मराठी व्याख्यान - शिव स्वरोदयाचे नियम।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_bb595ddc",
    name: "Mohan Sir - Day-1 all introduction (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_bb595ddc.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - नए साधकों के लिए परिचय।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_c16ba961",
    name: "Mohan Sir - Day 1 all introduction (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_c16ba961.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - श्वास की लंबाई व गणना।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_c828f318",
    name: "Mohan Sir - sadhana - april 26 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_c828f318.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - गहन कुंभक व ध्यान।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_d06767ad",
    name: "Mohan Sir - Global Community (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_d06767ad.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - विश्व कल्याण हेतु स्वर योग।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_d6ec2903",
    name: "Mohan Sir - GMT20260917 Gvo Session (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_d6ec2903.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - सोऽहं साधना।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_e2a50b54",
    name: "Mohan Sir - Swar-Yoga-Hindi (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_e2a50b54.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - ज्ञान मुद्रा व एकाग्रता।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_ec4e44cd",
    name: "Mohan Sir - 7 days Swar Yoga Hindi - Day 7 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_ec4e44cd.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - कार्यशाला का समापन व संकल्प।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_f1c34f2e",
    name: "Mohan Sir - Swar Aahar Shastra - मसाले (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_f1c34f2e.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - त्रिकटु व कफ निवारण।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_f41134e9",
    name: "Mohan Sir - Swar-yoga-hindi Part 2 (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_f41134e9.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - अनिद्रा व सिरदर्द का उपचार।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_f7efb8bc",
    name: "Mohan Sir - Marathi-Oct-Eve-Swar Yoga L-1 (Marathi)",
    type: 'mohan_authentic_clone' as const,
    language: "mr" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_f7efb8bc.mp3",
    description: "मोहन सर यांचे मूळ अस्खलित मराठी व्याख्यान - स्वतःचे वैद्य स्वतः व्हा।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_f9fc9a30",
    name: "Mohan Sir - Water therapy, Hunger, Gasses (Hindi)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_f9fc9a30.mp3",
    description: "मोहन सर का वास्तविक व्याख्यान - उषापान व वात रोग निवारण।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
  {
    id: "vocal_dna_fc1ce7fd",
    name: "Mohan Sir - Vedic Shastra Chants (Hindi/Sanskrit)",
    type: 'mohan_authentic_clone' as const,
    language: "hi" as any,
    audioSampleUrl: "/voice-clones/dna-39/dna_voice_fc1ce7fd.mp3",
    description: "मोहन सर का वास्तविक वैदिक शांति पाठ व स्वर कंपन।",
    truthfulStatus: 'AUTHENTIC_VERIFIED' as const,
  },
];

// ─────────────────────────────────────────────
// 3. CAMERA & COMPOSITION PRESETS
// ─────────────────────────────────────────────
export const CAMERA_FRAMING_PRESETS: CameraFramingPreset[] = [
  {
    id: 'chest_up',
    nameEn: 'Chest-Up Presenter (Recommended)',
    nameHi: 'छाती तक प्रस्तुति (सर्वश्रेष्ठ)',
    icon: '👔',
    aspectRatio: '16:9',
    description: 'Full forehead, complete head, neck, shoulders, and upper chest visible. Ideal for educational lectures.',
    fieldOfView: '48mm Studio Lens',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'face_closeup',
    nameEn: 'Face Close-Up (Intense Focus)',
    nameHi: 'केवल चेहरा (सूक्ष्म भाव)',
    icon: '🎯',
    aspectRatio: '16:9',
    description: 'Forehead to collarbone. Focuses on eye contact and micro-expressions.',
    fieldOfView: '85mm Portrait Lens',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'waist_up',
    nameEn: 'Waist-Up / Torso (Hand Gestures)',
    nameHi: 'कमर तक (हस्त मुद्राएं व भाव)',
    icon: '🧍',
    aspectRatio: '16:9',
    description: 'Head to waist. Displays hand mudras and physical teaching gestures naturally.',
    fieldOfView: '35mm Narrative Lens',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'seated_desk',
    nameEn: 'Seated Executive / Anchor Desk',
    nameHi: 'कुर्सी व मेज पर आसीन (न्यूज व बोर्डरूम)',
    icon: '🪑',
    aspectRatio: '16:9',
    description: 'Presenter seated behind polished wood desk with microphone or laptop.',
    fieldOfView: '50mm Studio Lens',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'presenter_slides',
    nameEn: 'Presenter with Keynote Slides',
    nameHi: 'स्लाइड्स व व्याख्याता (60/40 लेआउट)',
    icon: '📊',
    aspectRatio: '16:9',
    description: 'Mohan Sir on right side (40% width) with slide content displayed prominently on left (60% width).',
    fieldOfView: 'Dynamic Studio Composite',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'full_body',
    nameEn: 'Full Standing Presenter',
    nameHi: 'पूर्ण शरीर (स्टेज व सेमिनार)',
    icon: '🧍‍♂️',
    aspectRatio: '16:9',
    description: 'Full height standing on stage, seminar floor, or ashram courtyard.',
    fieldOfView: '28mm Stage Lens',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'split_screen',
    nameEn: 'Interview Split-Screen (1:1)',
    nameHi: 'इंटरव्यू स्प्लिट स्क्रीन',
    icon: '👥',
    aspectRatio: '16:9',
    description: 'Two-box layout for host and guest dialogue.',
    fieldOfView: 'Dual 50mm Lens',
    ensuresHeadAndShoulders: true,
  },
  {
    id: 'pip',
    nameEn: 'Picture-in-Picture (Course Overlay)',
    nameHi: 'पिक्चर-इन-पिक्चर (कोर्स ओवरले)',
    icon: '🖼️',
    aspectRatio: '16:9',
    description: 'Circular or rounded rectangle presenter bubble overlaying full-screen tutorial.',
    fieldOfView: 'Compact Circle Crop',
    ensuresHeadAndShoulders: true,
  },
];

// ─────────────────────────────────────────────
// 4. CURATED WARDROBE PRESETS
// ─────────────────────────────────────────────
export const MASTER_WARDROBES: WardrobePreset[] = [
  {
    id: 'wardrobe_corporate_suit',
    nameEn: 'Tailored Bespoke Business Suit & Tie',
    nameHi: 'प्रीमियम कॉर्पोरेट सूट व कोट',
    category: 'formal',
    icon: '👔',
    description: 'Sharp tailored navy blue blazer, crisp white shirt, silk tie. Proportionate slim athletic fit.',
    promptConditioning: 'wearing tailored navy blue executive business suit with crisp white collared shirt and elegant tie, slim athletic fit, immaculate tailoring',
    primaryColors: ['#0F172A', '#FFFFFF', '#1E3A8A'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
  },
  {
    id: 'wardrobe_charcoal_bandhgala',
    nameEn: 'Charcoal Nehru Bandhgala Jacket',
    nameHi: 'चारकोल बंदगला नेहरू जैकेट',
    category: 'formal',
    icon: '🦺',
    description: 'Sophisticated dark grey bandhgala jacket with Mandarin collar over light shirt. Mohan Sir keynote style.',
    promptConditioning: 'wearing charcoal grey tailored Indian bandhgala Nehru jacket over buttoned shirt, clean neck collar, dignified keynote speaker',
    primaryColors: ['#334155', '#475569', '#F8FAFC'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
  },
  {
    id: 'wardrobe_white_khadi',
    nameEn: 'Pure White Handspun Khadi Kurta & Rudraksha',
    nameHi: 'पवित्र श्वेत खादी कुर्ता व रुद्राक्ष माला',
    category: 'vedic',
    icon: '⚪',
    description: 'Signature handspun white khadi cotton kurta with natural 5-mukhi rudraksha mala. Serene Vedic yogi.',
    promptConditioning: 'wearing pure white cotton khadi kurta with mandarin collar, authentic rudraksha bead necklace around neck, pristine yogic attire',
    primaryColors: ['#FFFFFF', '#F8FAFC', '#78350F'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
  },
  {
    id: 'wardrobe_tweed_blazer',
    nameEn: 'Academic Tweed Blazer & Pressed Shirt',
    nameHi: 'अकादमिक ट्वीड ब्लेज़र व फॉर्मल शर्ट',
    category: 'formal',
    icon: '🧥',
    description: 'Scholarly navy/brown textured blazer over collared button-down shirt. Distinguished university academic.',
    promptConditioning: 'wearing distinguished academic textured navy blazer over light blue pressed dress shirt, scholarly look',
    primaryColors: ['#1E293B', '#3B82F6', '#CBD5E1'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
  },
  {
    id: 'wardrobe_saffron_silk',
    nameEn: 'Royal Saffron Silk Kurta with Gold Border',
    nameHi: 'केसरिया रेशमी कुर्ता व स्वर्ण बॉर्डर',
    category: 'vedic',
    icon: '🟠',
    description: 'Rich royal saffron silk kurta with subtle gold thread border. Symbolizes Surya Nadi solar mastery.',
    promptConditioning: 'wearing vibrant royal saffron silk kurta with gold zari trim on collar, radiant spiritual scholar',
    primaryColors: ['#EA580C', '#F59E0B', '#FEF3C7'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
  },
  {
    id: 'wardrobe_doctor_coat',
    nameEn: 'Clinical White Doctor Coat & Stethoscope',
    nameHi: 'व्हाइट डॉक्टर एप्रन व स्टेथोस्कोप',
    category: 'uniform',
    icon: '🩺',
    description: 'Crisp medical doctor consultation coat with professional ID badge and neck stethoscope.',
    promptConditioning: 'wearing clean pressed white medical doctor lab coat over formal shirt, medical stethoscope around neck',
    primaryColors: ['#FFFFFF', '#0284C7', '#0F172A'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
  },
  {
    id: 'wardrobe_lawyer_coat',
    nameEn: 'Advocate Black Coat with White Neck Bands',
    nameHi: 'अधिवक्ता काला कोट व सफेद नेक बैंड',
    category: 'formal',
    icon: '⚖️',
    description: 'Formal black legal coat and white barrister advocate neck tabs.',
    promptConditioning: 'wearing black advocate court coat with traditional white neck collar tabs, legal jurisprudence expert',
    primaryColors: ['#000000', '#18181B', '#FFFFFF'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
  },
  {
    id: 'wardrobe_traditional_farmer',
    nameEn: 'Natural Cotton Kurta & Farmer Turban / Gamcha',
    nameHi: 'पारंपरिक खादी कुर्ता व साफा / गमछा',
    category: 'traditional',
    icon: '🌾',
    description: 'Earthy unbleached khadi kurta with cotton shoulder towel (gamcha). Grounded agrarian expert.',
    promptConditioning: 'wearing simple earth-tone cotton kurta with cotton gamcha towel over shoulder, honest rural advisor',
    primaryColors: ['#F5F5DC', '#B45309', '#D97706'],
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
  },
];

// ─────────────────────────────────────────────
// 5. CURATED ENVIRONMENT / BACKGROUND PRESETS
// ─────────────────────────────────────────────
export const MASTER_ENVIRONMENTS: EnvironmentPreset[] = [
  {
    id: 'env_lecture_hall',
    nameEn: 'Grand University Lecture Amphitheater',
    nameHi: 'ग्रैंड यूनिवर्सिटी व्याख्यान कक्ष',
    category: 'indoor_formal',
    icon: '🏛️',
    description: 'Wood-paneled tiered university auditorium with soft ambient ceiling lighting and presentation podium.',
    promptConditioning: 'grand academic university lecture amphitheater with tiered seating, warm wood panels, blurred soft student seating in background, high-end 8k cinematography',
    lightingStyle: '5600K Clean Studio Daylight with Warm Accent Rims',
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
  },
  {
    id: 'env_himalayan_ashram',
    nameEn: 'Himalayan Ashram Meditation Sanctum',
    nameHi: 'हिमालयन आश्रम व ध्यान साधना पीठ',
    category: 'spiritual_ashram',
    icon: '🕉️',
    description: 'Sunlit stone and cedarwood ashram hall with brass oil lamps, mountain views through arched windows.',
    promptConditioning: 'serene Himalayan yoga ashram sanctum with hand-carved cedarwood arches, distant misty mountains, soft morning golden hour sunlight, subtle brass diya flame',
    lightingStyle: 'Vedic Warm Golden Hour (3200K)',
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
  },
  {
    id: 'env_corporate_boardroom',
    nameEn: 'Executive High-Rise Corporate Boardroom',
    nameHi: 'एग्जीक्यूटिव कॉर्पोरेट बोर्डरूम',
    category: 'indoor_formal',
    icon: '🏙️',
    description: 'Sleek glass high-rise boardroom overlooking city skyline with polished conference table.',
    promptConditioning: 'luxury executive boardroom on high-rise floor with panoramic city skyline window, modern minimalist interior, cinematic shallow depth of field',
    lightingStyle: 'Balanced Architectural Softbox & Cool Rim',
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_chest_up_master.jpg',
  },
  {
    id: 'env_interactive_classroom',
    nameEn: 'Swar Yoga Smart Classroom & Digital Board',
    nameHi: 'स्मार्ट क्लासरूम व डिजिटल इंटरैक्टिव बोर्ड',
    category: 'indoor_formal',
    icon: '🏫',
    description: 'Clean bright teaching studio with interactive digital blackboard displaying nadi anatomy charts.',
    promptConditioning: 'modern bright education studio with large digital whiteboard displaying scientific diagrams, professional clean lighting',
    lightingStyle: '5400K Even Broadcast Lighting',
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
  },
  {
    id: 'env_podcast_studio',
    nameEn: 'Acoustic Broadcast Studio & Shure SM7B Mic',
    nameHi: 'पॉडकास्ट ब्रॉडकास्ट स्टूडियो व माइक',
    category: 'studio',
    icon: '🎙️',
    description: 'Dark acoustic slat-wall studio with neon amber halo glow and broadcast boom microphone.',
    promptConditioning: 'modern high-end podcast studio with wooden acoustic slat walls, warm amber LED accent backlighting, broadcast studio boom mic',
    lightingStyle: 'Cinematic Moody Key + Amber Neon Backlight',
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_face_frontal_1080p.jpg',
  },
  {
    id: 'env_nature_grove',
    nameEn: 'Pristine Forest Bodhi Tree Grove',
    nameHi: 'प्राकृतिक वन व बोधिवृक्ष प्रांगण',
    category: 'nature',
    icon: '🌳',
    description: 'Lush green sacred grove with morning sunbeams piercing through ancient banyan leaves.',
    promptConditioning: 'ancient banyan tree sacred forest grove with morning sun rays piercing through lush foliage, peaceful natural sanctuary',
    lightingStyle: 'Natural Dappled Sunbeams',
    referenceImageUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/master-clone/mohan_pranayama_master.jpg',
  },
];

// ─────────────────────────────────────────────
// 6. ALL 34 SEARCH-READY PROFESSIONS
// ─────────────────────────────────────────────
export const ALL_34_PROFESSIONS: ProfessionConfig[] = [
  {
    id: 'university_professor',
    nameEn: 'University Professor',
    nameHi: 'विश्वविद्यालय प्राध्यापक',
    category: 'education',
    icon: '🎓',
    descriptionEn: 'Scholarly academic presenting peer-reviewed research on breath neuroscience and cognition.',
    descriptionHi: 'स्वर विज्ञान व न्यूरो-बायोलॉजी पर अकादमिक शोध व गहन व्याख्यान।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Authoritative, articulate, evidence-based, academic cadence.',
    sampleTopic: {
      hi: 'स्वर विज्ञान और न्यूरोबायोलॉजी: नासिका चक्र का मस्तिष्क के सेरेब्रल हेमिस्फियर्स से सीधा संबंध।',
      mr: 'स्वर विज्ञान आणि न्यूरोबायोलॉजी: श्वासाचा मेंदूच्या दोन्ही भागांवर होणारा वैज्ञानिक परिणाम.',
      en: 'The neurobiology of ultradian nasal cycles and hemispheric cerebral dominance.',
      ne: 'स्वर विज्ञान र न्यूरोबायोलोजी: श्वास चक्र र मस्तिष्कको सीधा वैज्ञानिक सम्बन्ध।',
    },
    promptConditioning: 'distinguished Indian university professor at lecture podium, academic tweed blazer',
    captionPreset: 'Academic Gold Highlights',
  },
  {
    id: 'school_teacher',
    nameEn: 'School Teacher',
    nameHi: 'विद्यालय शिक्षक',
    category: 'education',
    icon: '✏️',
    descriptionEn: 'Warm, encouraging school educator making breath control easy for students and young minds.',
    descriptionHi: 'बच्चों व किशोरों के लिए सरल भाषा में एकाग्रता व स्मरण शक्ति का शिक्षण।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_interactive_classroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Warm, engaging, storytelling, interactive gestures.',
    sampleTopic: {
      hi: 'परीक्षा के तनाव में चंद्र नाड़ी चलाकर 2 मिनट में मन को शांत करने की विधि।',
      mr: 'परीक्षेच्या वेळी भीती वाटल्यास डावा स्वर सुरू करून मन शांत करण्याची सोपी पद्धत.',
      en: 'Two-minute Ida Nadi breath reset for exam calmness and peak memory retention.',
      ne: 'परीक्षाको तनावमा २ मिनेटमै मन शान्त गर्ने सरल श्वास अभ्यास।',
    },
    promptConditioning: 'warm friendly Indian school teacher in classroom, engaging eye contact',
    captionPreset: 'Friendly Emerald Highlights',
  },
  {
    id: 'college_lecturer',
    nameEn: 'College Lecturer',
    nameHi: 'महाविद्यालय व्याख्याता',
    category: 'education',
    icon: '📚',
    descriptionEn: 'Dynamic college lecturer engaging undergraduate students with practical breath demonstrations.',
    descriptionHi: 'कॉलेज युवाओं को ऊर्जा, करियर फोकस और मानसिक स्थिरता का प्रशिक्षण।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Energetic, logical, youth-friendly analogies.',
    sampleTopic: {
      hi: 'सूर्य स्वर एक्टिवेशन: सुबह की सुस्ती हटाकर दिनभर उच्च फोकस कैसे बनाए रखें।',
      mr: 'सूर्य स्वर सक्रिय करून सकाळचा आळस कसा घालवावा आणि अभ्यासात लक्ष कसे वाढवावे.',
      en: 'Surya Nadi activation: Beating morning fatigue for sustained mental energy.',
      ne: 'सूर्य स्वर सक्रिय गरेर बिहानको अल्छीपना हटाउने र एकाग्रता बढाउने उपाय।',
    },
    promptConditioning: 'dynamic college lecturer in seminar hall, holding notes',
    captionPreset: 'Electric Blue Highlights',
  },
  {
    id: 'yoga_teacher',
    nameEn: 'Yoga Teacher',
    nameHi: 'योग शिक्षक',
    category: 'spiritual',
    icon: '🧘',
    descriptionEn: 'Vedic Hatha and Swar Yoga instructor guiding asana and pranayama alignment.',
    descriptionHi: 'आसन, प्राणायाम व श्वास संतुलन की यथार्थ वैज्ञानिक तकनीक।',
    recommendedOutfitId: 'wardrobe_white_khadi',
    recommendedEnvId: 'env_himalayan_ashram',
    cameraFraming: 'waist_up',
    presentationStyle: 'Serene, poised, centered breath guidance, rhythmic pauses.',
    sampleTopic: {
      hi: 'प्राणायाम करते समय स्वर की दिशा जांचना: कब कौन सा अभ्यास वर्जित है।',
      mr: 'प्राणायाम करताना स्वराची दिशा तपासणे: चुकीच्या स्वरात प्राणायाम करण्याचे तोटे.',
      en: 'Checking your active breath flow before pranayama: Golden rules of alignment.',
      ne: 'प्राणायाम गर्दा सक्रिय स्वर पहिचान गर्ने नियम र सावधानी।',
    },
    promptConditioning: 'revered Indian yoga master in pristine white khadi, chin mudra hands',
    captionPreset: 'Vedic Saffron Highlights',
  },
  {
    id: 'spiritual_teacher',
    nameEn: 'Spiritual Guru & Acharya',
    nameHi: 'आध्यात्मिक गुरु व आचार्य',
    category: 'spiritual',
    icon: '🕉️',
    descriptionEn: 'Enlightened guru expounding the profound mystery of Shiva Swarodaya Shastra.',
    descriptionHi: 'शिव स्वरोदय शास्त्र के गुप्त रहस्यों और आत्मज्ञान की मीमांसा।',
    recommendedOutfitId: 'wardrobe_saffron_silk',
    recommendedEnvId: 'env_himalayan_ashram',
    cameraFraming: 'chest_up',
    presentationStyle: 'Deep, resonant Sanskrit shloka cadence, transformative silence.',
    sampleTopic: {
      hi: 'शिव स्वरोदय श्लोक 5: नाड़ी भेद से जीवन के समस्त कर्मों की सिद्धि।',
      mr: 'शिव स्वरोदय श्लोक ५: नाडी भेद आणि जीवनातील यशाचे गूढ रहस्य.',
      en: 'Shiva Swarodaya Verse 5: Alchemizing life actions through nadi synchronization.',
      ne: 'शिव स्वरोदय श्लोक ५: नाडी भेदबाट जीवनका सम्पूर्ण कार्यको सिद्धि।',
    },
    promptConditioning: 'revered Vedic spiritual guru in royal saffron silk, compassionate smile',
    captionPreset: 'Golden Amber Highlights',
  },
  {
    id: 'doctor',
    nameEn: 'Doctor & Integrative Physician',
    nameHi: 'चिकित्सक (डॉक्टर)',
    category: 'healthcare',
    icon: '🩺',
    descriptionEn: 'Modern medical physician explaining autonomous nervous system balance via breath.',
    descriptionHi: 'आधुनिक चिकित्सा व स्वर विज्ञान का संगम: स्वायत्त तंत्रिका तंत्र का नियमन।',
    recommendedOutfitId: 'wardrobe_doctor_coat',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Clinical, precise, empathetic, diagnostic clarity.',
    sampleTopic: {
      hi: 'हाई ब्लड प्रेशर में बायां स्वर (चंद्र नाड़ी) एक्टिवेट करके बीपी को प्राकृतिक रूप से नियंत्रित करना।',
      mr: 'हाय ब्लड प्रेशरमध्ये डावा स्वर सुरू करून रक्तदाब नैसर्गिकरीत्या नियंत्रित करण्याची पद्धत.',
      en: 'Activating parasympathetic tone via left-nostril breathing for hypertension management.',
      ne: 'उच्च रक्तचापमा चन्द्र नाडी सक्रिय गरेर रक्तचाप नियन्त्रण गर्ने विधि।',
    },
    promptConditioning: 'distinguished Indian physician in clean white doctor coat with stethoscope',
    captionPreset: 'Medical Cyan Highlights',
  },
  {
    id: 'health_educator',
    nameEn: 'Health & Wellness Educator',
    nameHi: 'स्वास्थ्य व आरोग्य शिक्षक',
    category: 'healthcare',
    icon: '🥗',
    descriptionEn: 'Holistic health coach teaching digestive fire, sleep cycles, and daily circadian habits.',
    descriptionHi: 'जठराग्नि, निद्रा चक्र और दैनिक आदतों को स्वर चक्र से जोड़ने की विधि।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_interactive_classroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Practical, habit-oriented, encouraging, daily routines.',
    sampleTopic: {
      hi: 'भोजन हमेशा सूर्य स्वर में ही क्यों करें? एसिडिटी और अपच से आजीवन मुक्ति का रहस्य।',
      mr: 'जेवण नेहमी सूर्य स्वरातच का करावे? आम्लपित्त व अपचनापासून मुक्तीचा मार्ग.',
      en: 'Why you must only eat during Surya Nadi: Eradicating acid reflux and indigestion.',
      ne: 'भोजन सधैं सूर्य स्वरमा किन गर्ने? ग्यास्ट्रिक र अपचबाट मुक्तिको उपाय।',
    },
    promptConditioning: 'wellness educator in modern clinic, clean presentation backdrop',
    captionPreset: 'Healthy Lime Highlights',
  },
  {
    id: 'banker',
    nameEn: 'Banker & Financial Executive',
    nameHi: 'बैंकर व वित्तीय अधिकारी',
    category: 'corporate',
    icon: '🏦',
    descriptionEn: 'Astute financial officer guiding fiscal planning, investment timing, and stress resilience.',
    descriptionHi: 'निवेश, जोखिम प्रबंधन और आर्थिक निर्णयों में स्थिर बुद्धि का प्रयोग।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Sober, analytical, trustworthy, calculated pauses.',
    sampleTopic: {
      hi: 'बड़े आर्थिक निवेश व बैंक सौदों पर हस्ताक्षर करते समय शुभ स्वर का चयन।',
      mr: 'मोठ्या आर्थिक गुंतवणुकीवर आणि करारांवर स्वाक्षरी करताना योग्य स्वर कसा निवडावा.',
      en: 'Timing financial contracts and major investments with favorable lunar-solar rhythms.',
      ne: 'ठूला आर्थिक लगानी र हस्ताक्षर गर्दा शुभ स्वरको छनोट।',
    },
    promptConditioning: 'sharp Indian corporate banker in navy suit, boardroom desk background',
    captionPreset: 'Corporate Navy Highlights',
  },
  {
    id: 'businessman',
    nameEn: 'Businessman & Entrepreneur',
    nameHi: 'व्यवसायी व उद्यमी',
    category: 'corporate',
    icon: '💼',
    descriptionEn: 'High-growth founder balancing high-stakes negotiations, leadership, and emotional grit.',
    descriptionHi: 'व्यापार विस्तार, टीम नेतृत्व और कठिन सौदों में अडिग निर्णय क्षमता।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Bold, visionary, decisive, commanding presence.',
    sampleTopic: {
      hi: 'क्लाइंट नेगोशिएशन में जब आपका सूर्य स्वर चले तो आत्मविश्वास 10 गुना कैसे बढ़ जाता है।',
      mr: 'क्लायंट वाटाघाटीत सूर्य स्वर चालू असताना बोलल्यास आत्मविश्वासाचा कसा प्रभाव पडतो.',
      en: 'Dominating high-stakes negotiations: Harnessing solar energy for assertive leadership.',
      ne: 'व्यवसायिक छलफल र वार्तामा सूर्य स्वरको प्रभाव र सफलता।',
    },
    promptConditioning: 'successful Indian startup founder in bespoke navy suit, confident smile',
    captionPreset: 'Bold Gold Highlights',
  },
  {
    id: 'ceo',
    nameEn: 'Chief Executive Officer (CEO)',
    nameHi: 'मुख्य कार्यकारी अधिकारी (CEO)',
    category: 'corporate',
    icon: '👔',
    descriptionEn: 'Fortune-level corporate leader presenting board vision, corporate strategy, and culture.',
    descriptionHi: 'कॉर्पोरेट रणनीति, वैश्विक दृष्टि और संगठनात्मक चेतना का नेतृत्व।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'seated_desk',
    presentationStyle: 'Gravitas, strategic, measured, global corporate authority.',
    sampleTopic: {
      hi: 'संगठनात्मक तनाव के बीच मुख्य कार्यकारी अधिकारी का मानसिक संतुलन: सुष्मना नाड़ी की गुप्त साधना।',
      mr: 'कठीण परिस्थितीत CEO चे मानसिक संतुलन राखण्यासाठी सुपुम्ना नाडीचे महत्त्व.',
      en: 'Executive equanimity: Sushumna Nadi equilibrium during critical crises.',
      ne: 'ठूला संस्थागत संकटमा नेतृत्वको मानसिक सन्तुलन कायम राख्ने तरिका।',
    },
    promptConditioning: 'distinguished Indian CEO seated behind executive mahogany desk',
    captionPreset: 'Platinum Silver Highlights',
  },
  {
    id: 'marketing_manager',
    nameEn: 'Marketing Manager',
    nameHi: 'विपणन प्रबंधक',
    category: 'corporate',
    icon: '📈',
    descriptionEn: 'Creative growth marketer presenting viral campaigns and consumer psychology.',
    descriptionHi: 'उपभोक्ता मनोविज्ञान, ब्रांडिंग और वायरल अभियानों की योजना।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Persuasive, energetic, metric-focused, innovative.',
    sampleTopic: {
      hi: 'क्रिएटिव कॉपीराइटिंग और ब्रांड कैंपेन डिजाइन करते समय चंद्र स्वर का उपयोग।',
      mr: 'नवीन कल्पना आणि सर्जनशील कामांसाठी डाव्या स्वराचा उपयोग कसा करावा.',
      en: 'Leveraging right-brain creative flow for breakthrough marketing campaigns.',
      ne: 'रचनात्मक सोच र मार्केटिङ रणनीति बनाउँदा स्वरको उपयोग।',
    },
    promptConditioning: 'creative marketing director in stylish blazer presenting brand charts',
    captionPreset: 'Coral Orange Highlights',
  },
  {
    id: 'sales_manager',
    nameEn: 'Sales Manager',
    nameHi: 'बिक्री प्रबंधक',
    category: 'corporate',
    icon: '🤝',
    descriptionEn: 'High-energy sales director coaching revenue closing, client rapport, and target conquest.',
    descriptionHi: 'सेल्स टीम को क्लोजिंग, कस्टमर कनेक्शन और लक्ष्य हासिल करने की रणनीति।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'High-energy, relentless, motivating, rapport-driven.',
    sampleTopic: {
      hi: 'सेल्स कॉल करते समय स्वर की स्थिति: कब कॉल करें जिससे डील 100% क्लोज हो।',
      mr: 'सेल्स कॉलिंग करताना स्वराची स्थिती: यश मिळवण्यासाठी फोन कधी करावा.',
      en: 'Sales closing psychology: Aligning cold outreach with high-resonance breath cycles.',
      ne: 'ग्राहक सम्झौता र बिक्री बढाउन सही समय र स्वरको पहिचान।',
    },
    promptConditioning: 'charismatic sales director in corporate suit gesturing with hands',
    captionPreset: 'Electric Yellow Highlights',
  },
  {
    id: 'journalist',
    nameEn: 'Investigative Journalist',
    nameHi: 'खोजी पत्रकार',
    category: 'media',
    icon: '📰',
    descriptionEn: 'Incisive media correspondent reporting verified facts with intellectual rigor.',
    descriptionHi: 'सत्य, निष्पक्षता और साक्ष्यों के साथ राष्ट्रिय व अंतर्राष्ट्रीय मुद्दों की रिपोर्टिंग।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_podcast_studio',
    cameraFraming: 'chest_up',
    presentationStyle: 'Direct, sharp, fact-grounded, urgent cadence.',
    sampleTopic: {
      hi: 'प्राचीन भारतीय शास्त्रों का वैज्ञानिक सत्यापन: क्या स्वर विज्ञान एक सुपर-साइंस है?',
      mr: 'प्राचीन भारतीय विज्ञानाचे सत्य: स्वर विज्ञान खरोखरच न्यूरोसायन्स आहे का?',
      en: 'Investigating ancient Indian pranic texts: The verifiable neuroscience of Swar Yoga.',
      ne: 'प्राचीन ग्रन्थहरूको वैज्ञानिक प्रमाण: के स्वर विज्ञान वास्तविक सुपर-साइन्स हो?',
    },
    promptConditioning: 'focused Indian investigative journalist holding microphone, studio lighting',
    captionPreset: 'Headline Red Highlights',
  },
  {
    id: 'news_anchor',
    nameEn: 'News Anchor & Prime-Time Presenter',
    nameHi: 'समाचार वाचक (न्यूज़ एंकर)',
    category: 'media',
    icon: '📺',
    descriptionEn: 'Prime-time news anchor delivering breaking developments with poise and broadcast diction.',
    descriptionHi: 'प्राइम-टाइम स्टूडियो से स्पष्ट उच्चारण व प्रभावपूर्ण शैली में समाचार प्रस्तुति।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Crisp broadcast diction, rapid clarity, unflinching eye contact.',
    sampleTopic: {
      hi: 'प्राइम टाइम विशेष: तनाव और चिंता से ग्रस्त आधुनिक विश्व के लिए स्वर योग बना वैश्विक समाधान।',
      mr: 'प्राइम टाईम बातमी: वाढत्या तणावावर भारतीय स्वर योगाचा जगभरात स्वीकार.',
      en: 'Prime-time special: How Swar Yoga is transforming global executive mental health.',
      ne: 'विशेष समाचार: बढ्दो तनाव र चिन्ता विरुद्ध स्वर योग विश्वव्यापी समाधान।',
    },
    promptConditioning: 'prime time Indian news anchor in sharp navy suit behind newsroom desk',
    captionPreset: 'Broadcast Yellow-Red Highlights',
  },
  {
    id: 'lawyer',
    nameEn: 'High Court Advocate & Legal Counsel',
    nameHi: 'अधिवक्ता व कानून विशेषज्ञ',
    category: 'legal_public',
    icon: '⚖️',
    descriptionEn: 'Distinguished senior advocate framing constitutional arguments with unshakeable logic.',
    descriptionHi: 'न्यायालयीन बहस, कानूनी साक्ष्य और संविधान सम्मत तर्कों की सशक्त प्रस्तुति।',
    recommendedOutfitId: 'wardrobe_lawyer_coat',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Rigorous, constitutional, measured, sharp cross-examination tone.',
    sampleTopic: {
      hi: 'न्यायालय में बहस करते समय मानसिक एकाग्रता: कोर्ट रूम में सूर्य नाड़ी की स्थिरता।',
      mr: 'न्यायालयात युक्तिवाद करताना मानसिक एकाग्रता कशी टिकवून ठेवावी.',
      en: 'Courtroom advocacy: Maintaining cognitive composure under intense cross-examination.',
      ne: 'अदालतमा बहस गर्दा मानसिक एकाग्रता र तर्क क्षमता बढाउने विधि।',
    },
    promptConditioning: 'senior Indian High Court advocate wearing black lawyer coat with white neck bands',
    captionPreset: 'Legal Parchment Highlights',
  },
  {
    id: 'scientist',
    nameEn: 'Research Scientist & Physicist',
    nameHi: 'वैज्ञानिक व शोधकर्ता',
    category: 'trades_tech',
    icon: '🔬',
    descriptionEn: 'Rigorous empirical scientist bridging quantum mechanics, wave frequencies, and breath harmonics.',
    descriptionHi: 'क्वांटम भौतिकी, तरंग आवृत्ति और प्राण ऊर्जा का गणितीय व भौतिक विश्लेषण।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Empirical, scientific precision, equations, hypothesis verification.',
    sampleTopic: {
      hi: 'नाड़ी चक्र और विद्युत-चुंबकीय क्षेत्र: मानव शरीर के बायो-इलेक्ट्रोमैग्नेटिक वेव की माप।',
      mr: 'नाडी चक्र आणि मानवी शरीरातील बायो-इलेक्ट्रोमॅग्नेटिक लहरींचे विज्ञान.',
      en: 'Quantifying the bio-electromagnetic wave fields created by alternating nasal airflow.',
      ne: 'नाडी चक्र र विद्युत-चुम्बकीय क्षेत्रको वैज्ञानिक मापन र प्रभाव।',
    },
    promptConditioning: 'Indian research scientist in modern physics laboratory, holographic equations',
    captionPreset: 'Quantum Teal Highlights',
  },
  {
    id: 'researcher',
    nameEn: 'Data & Academic Researcher',
    nameHi: 'शोध विशेषज्ञ',
    category: 'trades_tech',
    icon: '📊',
    descriptionEn: 'Data scientist analyzing biometric correlations between nasal cycles and sleep quality.',
    descriptionHi: 'बायोमेट्रिक डेटा, स्लीप ट्रैकर्स और स्वर परिवर्तन का सांख्यिकीय विश्लेषण।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Structured, data-driven, percentage metrics, clean charts.',
    sampleTopic: {
      hi: '1000 साधकों पर 6 महीने का क्लिनिकल डेटा: स्वर योग से तनाव हार्मोन (कोर्टिसोल) में 42% गिरावट।',
      mr: '१००० लोकांवरील अभ्यास: स्वर योगामुळे तणाव संप्रेरक ४२% कमी झाल्याचे पुरावे.',
      en: 'Six-month clinical dataset: 42% decrease in salivary cortisol through targeted nasal switching.',
      ne: '१००० साधकहरूमा गरिएको अनुसन्धान: स्वर योगबाट तनावमा ४२% कमी भएको प्रमाण।',
    },
    promptConditioning: 'data researcher presenting clinical study charts on large screen',
    captionPreset: 'Data Violet Highlights',
  },
  {
    id: 'farmer',
    nameEn: 'Progressive Farmer & Agronomist',
    nameHi: 'प्रगतिशील किसान व कृषि विशेषज्ञ',
    category: 'trades_tech',
    icon: '🌾',
    descriptionEn: 'Wise agricultural mentor teaching planetary weather timing, soil vitality, and seasonal sowing.',
    descriptionHi: 'ऋतु चक्र, नक्षत्र, बीज बोने का शुभ समय और प्राकृतिक जैविक खेती का मार्गदर्शन।',
    recommendedOutfitId: 'wardrobe_traditional_farmer',
    recommendedEnvId: 'env_nature_grove',
    cameraFraming: 'waist_up',
    presentationStyle: 'Grounded, earthy, practical, weather-attuned, compassionate.',
    sampleTopic: {
      hi: 'शिव स्वरोदय के अनुसार बीज बोने, फसल काटने और कुआं खोदने के लिए पृथ्वी व जल तत्व की पहचान।',
      mr: 'शिव स्वरोदयानुसार शेतात बियाणे पेरणे आणि विहीर खोदण्यासाठी योग्य तत्त्व कसे ओळखावे.',
      en: 'Traditional agricultural wisdom: Timing sowing and irrigation with earth element breath.',
      ne: 'शिव स्वरोदय अनुसार खेतीपाती, बीउ छर्ने र सिंचाइको उत्तम समयको पहिचान।',
    },
    promptConditioning: 'wise Indian organic farmer in cotton kurta in lush green field, morning sun',
    captionPreset: 'Golden Harvest Highlights',
  },
  {
    id: 'factory_worker',
    nameEn: 'Factory Worker & Craftsman',
    nameHi: 'कुशल कामगार व कारीगर',
    category: 'trades_tech',
    icon: '⚙️',
    descriptionEn: 'Dedicated industrial craftsman emphasizing physical stamina, ergonomics, and safety reflexes.',
    descriptionHi: 'कारखाने में कार्य सुरक्षा, शारीरिक सहनशक्ति और थकान से बचाव के नियम।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_interactive_classroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Direct, safety-focused, grounded, hardworking spirit.',
    sampleTopic: {
      hi: 'भारी काम करते समय सांस की सही गति: पीठ दर्द और मांसपेशियों के खिंचाव से कैसे बचें।',
      mr: 'वजनदार काम करताना श्वास कसा ठेवावा जेणेकरून पाठदुखी आणि थकवा जाणवणार नाही.',
      en: 'Physical ergonomics: Coordinating breathing mechanics during heavy manual labor.',
      ne: 'शारीरिक श्रम गर्दा श्वासको सही ताल: ढाड दुखाइ र थकानबाट बच्ने उपाय।',
    },
    promptConditioning: 'Indian industrial worker in clean professional workshop, focused expression',
    captionPreset: 'Industrial Amber Highlights',
  },
  {
    id: 'factory_supervisor',
    nameEn: 'Factory Operations Supervisor',
    nameHi: 'संयंत्र संचालन पर्यवेक्षक',
    category: 'trades_tech',
    icon: '🏭',
    descriptionEn: 'Plant manager driving zero-accident safety, shift efficiency, and machine uptime.',
    descriptionHi: 'कारखाना सुरक्षा, शिफ्ट प्रबंधन और शून्य दुर्घटना लक्ष्य हासिल करने की रणनीति।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Commanding, vigilant, checklist-driven, operational rigor.',
    sampleTopic: {
      hi: 'नाइट शिफ्ट में काम करने वाले कर्मचारियों की जैविक घड़ी को स्वर प्राणायाम से रीसेट करना।',
      mr: 'रात्रपाळीत काम करणाऱ्या कामगारांचे आरोग्य स्वर योगाने कसे टिकवून ठेवावे.',
      en: 'Circadian shift-work resilience: Resetting biological rhythms for plant safety.',
      ne: 'रात्रिकालीन शिफ्टमा काम गर्ने कर्मचारीहरूको जैविक लय सन्तुलनमा राख्ने विधि।',
    },
    promptConditioning: 'competent factory floor supervisor reviewing production stats',
    captionPreset: 'High-Vis Yellow Highlights',
  },
  {
    id: 'engineer',
    nameEn: 'Chief Mechanical & Electrical Engineer',
    nameHi: 'मुख्य अभियंता (इंजीनियर)',
    category: 'trades_tech',
    icon: '📐',
    descriptionEn: 'Precision systems engineer designing high-efficiency thermodynamic and fluid networks.',
    descriptionHi: 'थर्मोडायनामिक्स, फ्लूइड डायनामिक्स और मानव श्वसन तंत्र का इंजीनियरिंग विश्लेषण।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Analytical, architectural, schematic clarity, formulaic rigor.',
    sampleTopic: {
      hi: 'इंजीनियरिंग परिप्रेक्ष्य: फेफड़े और नासिका मार्ग दोहरे वाल्व वाले न्यूमैटिक पंप के समान हैं।',
      mr: 'इंजिनिअरिंग दृष्टिकोन: मानवी श्वसन संस्था ही एक अत्यंत अचूक न्यूमॅटिक सिस्टीम कशी आहे.',
      en: 'Pneumatic engineering: Modeling the human respiratory tract as dual variable-flow valves.',
      ne: 'इन्जिनियरिङ दृष्टिकोण: फोक्सो र श्वास नलीको सटीक वैज्ञानिक संरचना।',
    },
    promptConditioning: 'distinguished Indian engineer reviewing blueprints on table',
    captionPreset: 'Blueprint Cyan Highlights',
  },
  {
    id: 'architect',
    nameEn: 'Vastu & Architectural Designer',
    nameHi: 'वास्तु व स्थापत्य शिल्पी (आर्किटेक्ट)',
    category: 'trades_tech',
    icon: '🏛️',
    descriptionEn: 'Master architect blending ancient Vedic Vastu Shastra with modern passive solar homes.',
    descriptionHi: 'वास्तु शास्त्र, प्राकृतिक वायु संचार और सकारात्मक ऊर्जा वाले भवनों का निर्माण।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Spatial, aesthetic, harmonious, geometry-centered.',
    sampleTopic: {
      hi: 'घर में शयन कक्ष और ध्यान कक्ष की दिशा: पूर्व व उत्तर दिशा का स्वर संतुलन पर वैज्ञानिक प्रभाव।',
      mr: 'घराची वास्तू आणि श्वासाचा प्रवाह: पूर्व आणि उत्तर दिशेचे वैज्ञानिक महत्त्व.',
      en: 'Bio-climatic architecture: Orienting bedroom acoustics for uninterrupted lunar breathing.',
      ne: 'घरको वास्तु र श्वास प्रवाह: पूर्व र उत्तर दिशाको वैज्ञानिक महत्व।',
    },
    promptConditioning: 'creative Indian architect in studio standing by building scale models',
    captionPreset: 'Terracotta Warm Highlights',
  },
  {
    id: 'software_developer',
    nameEn: 'Principal Software Engineer & AI Architect',
    nameHi: 'सॉफ्टवेयर इंजीनियर व एआई विशेषज्ञ',
    category: 'trades_tech',
    icon: '💻',
    descriptionEn: 'Tech lead explaining deep coding flow state, debugging stamina, and preventing burnout.',
    descriptionHi: 'कोडिंग में डीप वर्क, फोकस, बग समाधान और स्क्रीन बर्नआउट से मुक्ति।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_podcast_studio',
    cameraFraming: 'chest_up',
    presentationStyle: 'Algorithmic, pragmatic, witty, logic-first.',
    sampleTopic: {
      hi: 'प्रोग्रामर के लिए 4 घंटे का डीप वर्क फ्लो स्टेट: राइट ब्रेन डिबगिंग के लिए चंद्र स्वर एक्टिवेट करना।',
      mr: 'प्रोग्रामरसाठी डीप वर्क: अवघड बग शोधण्यासाठी मन कसे शांत व तीक्ष्ण ठेवावे.',
      en: 'Hacking the developer flow state: Alternating hemisphere dominance for code debugging.',
      ne: 'प्रोग्रामरका लागि डीप वर्क र कोडिंगमा उच्च एकाग्रता कायम राख्ने तरिका।',
    },
    promptConditioning: 'senior Indian software engineer in clean tech office with code monitors behind',
    captionPreset: 'Terminal Green Highlights',
  },
  {
    id: 'corporate_trainer',
    nameEn: 'Corporate Leadership Trainer',
    nameHi: 'कॉर्पोरेट ट्रेनर व लीडरशिप कोच',
    category: 'corporate',
    icon: '🎯',
    descriptionEn: 'Executive workshop trainer conducting Fortune 500 leadership seminars.',
    descriptionHi: 'कॉर्पोरेट अधिकारियों को तनाव मुक्ति, टीम सामंजस्य और कार्य क्षमता का प्रशिक्षण।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'chest_up',
    presentationStyle: 'Captivating, experiential, interactive, leadership charisma.',
    sampleTopic: {
      hi: 'कार्यस्थल पर भावनात्मक बुद्धिमत्ता (EQ): क्रोध आने पर तुरंत बायां स्वर शुरू करने की ट्रिक।',
      mr: 'रागावर नियंत्रण मिळवण्यासाठी डावा स्वर सुरू करण्याची त्वरित उपयोगी पडणारी पद्धत.',
      en: 'Mastering workplace emotional intelligence: The 60-second parasympathetic override.',
      ne: 'कार्यस्थलमा भावनात्मक सन्तुलन: रिस उठ्दा तुरुन्त मन शान्त पार्ने अभ्यास।',
    },
    promptConditioning: 'dynamic corporate trainer in sharp navy suit addressing seminar hall',
    captionPreset: 'Executive Royal Blue Highlights',
  },
  {
    id: 'motivational_speaker',
    nameEn: 'Keynote Motivational Speaker',
    nameHi: 'प्रेरक वक्ता (मोटिवेशनल स्पीकर)',
    category: 'corporate',
    icon: '🔥',
    descriptionEn: 'Electrifying stadium speaker awakening inner courage, discipline, and purpose.',
    descriptionHi: 'भीतर के भय को समाप्त कर अदम्य साहस और आत्मविश्वास का संचार।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_lecture_hall',
    cameraFraming: 'waist_up',
    presentationStyle: 'High-voltage passion, soul-stirring pauses, triumphant cadence.',
    sampleTopic: {
      hi: 'हार को जीत में बदलने की शक्ति: जब सूर्य स्वर चलता है तो दुनिया की कोई ताकत रोक नहीं सकती!',
      mr: 'अपयशावर मात करून यश मिळवण्याची ताकद: स्वतःमधील आंतरिक शक्ती जागृत करा!',
      en: 'Igniting the warrior within: Channeling the unstoppable vitality of Pingala Nadi.',
      ne: 'असफलतालाई सफलतामा बदल्ने शक्ति: आफ्नो भित्री सामर्थ्यलाई जगाउने उपाय।',
    },
    promptConditioning: 'inspirational Indian speaker on grand auditorium stage with spotlights',
    captionPreset: 'Blazing Flame Orange Highlights',
  },
  {
    id: 'podcast_host',
    nameEn: 'Podcast Host & Deep Conversationalist',
    nameHi: 'पॉडकास्ट होस्ट व संवादकर्ता',
    category: 'media',
    icon: '🎙️',
    descriptionEn: 'Intimate audio-video podcast host interviewing luminaries in consciousness and wellness.',
    descriptionHi: 'आत्मीय पॉडकास्ट चर्चा, गंभीर प्रश्न और जीवन के रहस्यों पर गहरा संवाद।',
    recommendedOutfitId: 'wardrobe_tweed_blazer',
    recommendedEnvId: 'env_podcast_studio',
    cameraFraming: 'chest_up',
    presentationStyle: 'Warm, probing, intimate, conversational, insightful.',
    sampleTopic: {
      hi: 'पॉडकास्ट विशेष: मोहन कलबुर्गी के साथ जानें श्वास की वह गुप्त कला जो स्कूलों में कभी नहीं सिखाई गई।',
      mr: 'पॉडकास्ट चर्चा: श्वासाची ती गुप्त कला जी आपल्याला कधीही शिकवली गेली नाही.',
      en: 'The Swar Yoga Podcast: Unlocking the hidden breath codes kept secret for centuries.',
      ne: 'विशेष पडकास्ट: मोहन कलबुर्गीसँग श्वासको त्यो गुप्त विज्ञान जो विद्यालयमा सिकाइएन।',
    },
    promptConditioning: 'charismatic Indian podcast host with headphones and studio boom mic',
    captionPreset: 'Acoustic Amber Highlights',
  },
  {
    id: 'youtube_presenter',
    nameEn: 'YouTube Tech & Health Presenter',
    nameHi: 'यूट्यूब एडुकेटर व क्रिएटर',
    category: 'media',
    icon: '▶️',
    descriptionEn: 'High-retention video creator delivering crisp, visually enriched life-hacks.',
    descriptionHi: 'रोचक विजुअल्स, स्पष्ट टिप्स और उच्च एंगेजमेंट के साथ स्वास्थ्य वीडियो प्रस्तुति।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_interactive_classroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Fast-paced, hook-driven, ultra-clear, visually engaging.',
    sampleTopic: {
      hi: 'रोजाना सिर्फ 5 मिनट यह काम कर लो: 30 दिनों में बाल झड़ना और अनिद्रा हमेशा के लिए खत्म!',
      mr: 'दररोज फक्त ५ मिनिटे हा उपाय करा: शांत झोप आणि उत्तम आरोग्यासाठी सोपी ट्रिक.',
      en: 'Do this for 5 minutes every night: Eradicating insomnia and fatigue with moon breathing.',
      ne: 'दैनिक ५ मिनेट मात्र यो अभ्यास गर्नुहोस्: अनिद्रा र थकानबाट सधैंका लागि मुक्ति।',
    },
    promptConditioning: 'popular Indian educational YouTuber presenting directly to 4k camera with smile',
    captionPreset: 'YouTube Red-White Highlights',
  },
  {
    id: 'government_officer',
    nameEn: 'IAS Officer & Public Administrator',
    nameHi: 'प्रशासनिक अधिकारी (IAS / डिस्ट्रिक्ट मजिस्ट्रेट)',
    category: 'legal_public',
    icon: '🇮🇳',
    descriptionEn: 'Senior district administrator guiding public welfare policy, civic ethics, and calm governance.',
    descriptionHi: 'प्रशासनिक संवेदनशीलता, जन कल्याण योजनाएं और कानून व्यवस्था की समीक्षा।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'seated_desk',
    presentationStyle: 'Dignified, impartial, constitutional, public service ethos.',
    sampleTopic: {
      hi: 'प्रशासनिक दबाव और संकट प्रबंधन में संतुलित निर्णय: शांत बुद्धि ही सच्चा शासन है।',
      mr: 'प्रशासकीय निर्णय घेताना मन स्थिर ठेवण्याचे तंत्र आणि जनसेवेचा मार्ग.',
      en: 'Crisis governance: Maintaining impartiality and equanimity under public pressure.',
      ne: 'प्रशासनिक दबाब र संकट व्यवस्थापनमा सन्तुलित निर्णय लिने क्षमता।',
    },
    promptConditioning: 'senior Indian civil service officer in bandhgala seated at official desk with tricolor lapel',
    captionPreset: 'National Tri-Color Highlights',
  },
  {
    id: 'police_officer',
    nameEn: 'Police Officer & Tactical Commander',
    nameHi: 'पुलिस अधिकारी (IPS / पुलिस कमिश्नर)',
    category: 'legal_public',
    icon: '🛡️',
    descriptionEn: 'Tactical law enforcement leader teaching situational alertness, rapid reflex, and de-escalation.',
    descriptionHi: 'त्वरित निर्णय क्षमता, सतर्कता और कठिन परिस्थितियों में शांति स्थापना।',
    recommendedOutfitId: 'wardrobe_charcoal_bandhgala',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Disciplined, sharp, uncompromising vigilance, calm fortitude.',
    sampleTopic: {
      hi: 'हाई-रिस्क ऑपरेशन में श्वास का नियंत्रण: दिल की धड़कन काबू में रखकर सटीक निशाना लगाना।',
      mr: 'कठीण प्रसंगात स्वतःवर ताबा कसा ठेवावा: पोलीस जवानांसाठी श्वास नियंत्रणाचे धडे.',
      en: 'Tactical breathing under fire: Regulating heart rate variability during critical engagements.',
      ne: 'जोखिमपूर्ण अभियानमा श्वास नियन्त्रण र मानसिक दृढता कायम राख्ने उपाय।',
    },
    promptConditioning: 'Indian police commissioner in crisp uniform, stern yet disciplined posture',
    captionPreset: 'Khaki Gold Highlights',
  },
  {
    id: 'hotel_manager',
    nameEn: 'Luxury Resort & Hospitality Director',
    nameHi: 'होटल प्रबंधक (हॉस्पिटैलिटी डायरेक्टर)',
    category: 'corporate',
    icon: '🏨',
    descriptionEn: 'Elite 5-star hotel manager ensuring guest wellness, royal etiquette, and holistic rejuvenation.',
    descriptionHi: 'अतिथि देवो भव: लक्जरी रिसॉर्ट, प्राकृतिक चिकित्सा और श्रेष्ठ अतिथि सत्कार।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Gracious, impeccable etiquette, welcoming warmth, hospitality elegance.',
    sampleTopic: {
      hi: 'स्वर योग वेलनेस रिट्रीट: 3 दिन में शरीर और आत्मा को पूरी तरह नवजीवन देने का अनुभव।',
      mr: 'स्वर योग वेलनेस रिट्रीट: ३ दिवसांत संपूर्ण आरोग्य आणि मानसिक शांतता देणारा अनुभव.',
      en: 'Luxury wellness retreats: Integrating Swar Yoga with restorative spa rejuvenation.',
      ne: 'स्वर योग वेलनेस रिट्रीट: ३ दिनमै शरीर र मनलाई पूर्ण ताजगी दिने अनुभव।',
    },
    promptConditioning: 'sophisticated luxury hotel general manager welcoming guests with namaste',
    captionPreset: 'Luxury Champagne Highlights',
  },
  {
    id: 'chef',
    nameEn: 'Master Ayurvedic Chef & Nutritionist',
    nameHi: 'आयुर्वेदिक शेफ व आहार विशेषज्ञ',
    category: 'healthcare',
    icon: '👨‍🍳',
    descriptionEn: 'Culinary artist preparing sattvic nourishment aligned with digestive fire and seasonal doshas.',
    descriptionHi: 'सात्विक पाक कला, 6 रसों का संतुलन और स्वर अनुकूल आहार विज्ञान।',
    recommendedOutfitId: 'wardrobe_white_khadi',
    recommendedEnvId: 'env_interactive_classroom',
    cameraFraming: 'waist_up',
    presentationStyle: 'Enthusiastic, appetizing, sensory, mindful eating guidance.',
    sampleTopic: {
      hi: 'अमृत आहार: दोपहर 12 से 2 बजे जब सूर्य स्वर तीव्र हो, तब क्या खाएं जिससे दीर्घायु मिले।',
      mr: 'अमृत आहार: दुपारच्या जेवणात काय असावे ज्यामुळे ऊर्जा आणि आरोग्य टिकून राहील.',
      en: 'Sattvic culinary science: Cooking meals tailored to midday solar digestive power.',
      ne: 'अमृत आहार: दिउँसो १२ देखि २ बजे सूर्य स्वर चल्दा कस्तो भोजन गर्ने?',
    },
    promptConditioning: 'smiling Indian master chef in clean white chef jacket with fresh herbs',
    captionPreset: 'Saffron Herb Highlights',
  },
  {
    id: 'financial_advisor',
    nameEn: 'Chartered Financial Planner',
    nameHi: 'वित्तीय सलाहकार व वेल्थ कोच',
    category: 'corporate',
    icon: '🪙',
    descriptionEn: 'Wealth consultant planning long-term financial freedom, passive income, and wealth preservation.',
    descriptionHi: 'पारिवारिक समृद्धि, लंबी अवधि का धन संचय और तनावमुक्त आर्थिक जीवन।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Prudent, step-by-step, trustworthy, prosperity-minded.',
    sampleTopic: {
      hi: 'धन का प्रवाह और चंद्र स्वर: कब धन बचाएं और कब निवेश करें जिससे लक्ष्मी स्थिर रहे।',
      mr: 'संपत्ती वाढवण्यासाठी आणि अनावश्यक खर्च टाळण्यासाठी श्वासाचे रहस्य.',
      en: 'Pranic wealth principles: Aligning expenditure and asset accumulation with breath cycles.',
      ne: 'धन संचय र लगानीको सही समय: आर्थिक समृद्धिका लागि स्वरको नियम।',
    },
    promptConditioning: 'professional Indian wealth advisor presenting investment portfolio on iPad',
    captionPreset: 'Gold Bullion Highlights',
  },
  {
    id: 'environmental_educator',
    nameEn: 'Ecologist & Environmentalist',
    nameHi: 'पर्यावरण व प्रकृति संरक्षण विशेषज्ञ',
    category: 'trades_tech',
    icon: '🌍',
    descriptionEn: 'Passionate ecologist connecting human respiratory health with forest preservation and clean air.',
    descriptionHi: 'प्राणवायु का संरक्षण: वन, जल, मिट्टी और मानव श्वसन स्वास्थ्य की अटूट कड़ी।',
    recommendedOutfitId: 'wardrobe_traditional_farmer',
    recommendedEnvId: 'env_nature_grove',
    cameraFraming: 'waist_up',
    presentationStyle: 'Passionate, nature-attuned, urgent, inspiring sustainability.',
    sampleTopic: {
      hi: 'पेड़ों से मिलने वाली प्राणवायु और हमारी नासिका: पीपल और तुलसी के पास चंद्र स्वर का रहस्य।',
      mr: 'वृक्ष आणि आपला श्वास: पिंपळ आणि तुळशीजवळ प्राणायाम करण्याचे अलौकिक फायदे.',
      en: 'The forest-breath connection: Why meditating near sacred peepal trees supercharges prana.',
      ne: 'रुख-बिरुवाबाट प्राप्त हुने प्राणवायु र हाम्रो श्वास: पिपल र तुलसीको वैज्ञानिक महत्व।',
    },
    promptConditioning: 'nature ecologist standing in sunlit organic forest speaking with passion',
    captionPreset: 'Forest Green Highlights',
  },
  {
    id: 'custom_profession',
    nameEn: 'Custom AI Digital Twin Profession',
    nameHi: 'कस्टम एआई प्रोफेशन (यूजर प्रॉम्प्ट)',
    category: 'corporate',
    icon: '✨',
    descriptionEn: 'Design any unique profession, role, or presentation style using custom prompts.',
    descriptionHi: 'अपनी पसंद का कोई भी नया पद, परिधान और वातावरण टेक्स्ट प्रॉम्प्ट द्वारा तैयार करें।',
    recommendedOutfitId: 'wardrobe_corporate_suit',
    recommendedEnvId: 'env_corporate_boardroom',
    cameraFraming: 'chest_up',
    presentationStyle: 'Custom user defined cadence and gestures.',
    sampleTopic: {
      hi: 'कस्टम टॉपिक: अपनी पसंद का कोई भी विषय यहाँ लिखें और मोहन सर के डिजिटल ट्विन से वीडियो तैयार करें।',
      mr: 'कस्टम विषय: तुमचा स्वतःचा विषय येथे लिहा आणि मोहन सरांच्या डिजिटल अवतारात व्हिडिओ मिळवा.',
      en: 'Custom topic: Enter any custom speech or lecture topic for Mohan Sir AI Digital Twin.',
      ne: 'कस्टम विषय: आफ्नो रोजाइको कुनै पनि विषय प्रविष्ट गर्नुहोस् र भिडियो बनाउनुहोस्।',
    },
    promptConditioning: 'custom Indian presenter tailored to user prompt',
    captionPreset: 'Custom Electric Violet',
  },
];

// Helper functions for easy lookup
export function getProfessionById(id: string): ProfessionConfig {
  return ALL_34_PROFESSIONS.find((p) => p.id === id) || ALL_34_PROFESSIONS[0];
}

export function getWardrobeById(id: string): WardrobePreset {
  return MASTER_WARDROBES.find((w) => w.id === id) || MASTER_WARDROBES[0];
}

export function getEnvironmentById(id: string): EnvironmentPreset {
  return MASTER_ENVIRONMENTS.find((e) => e.id === id) || MASTER_ENVIRONMENTS[0];
}

export function getCameraFramingById(id: string): CameraFramingPreset {
  return CAMERA_FRAMING_PRESETS.find((c) => c.id === id) || CAMERA_FRAMING_PRESETS[0];
}

// ─────────────────────────────────────────────
// 7. BASE 1-MINUTE 1080P PRESENTER VIDEOS (BUNNY CDN VERIFIED)
// ─────────────────────────────────────────────
export interface ProfessionBaseVideoInfo {
  url: string;
  title: string;
  duration: number;
  resolution: string;
  framing: string;
}

export function getProfessionBaseVideo(prof: { id?: string; category?: string }): ProfessionBaseVideoInfo {
  const CDN = 'https://swaryogacrm.b-cdn.net/avatar-studio/base-templates';
  
  if (prof.id === 'school_teacher' || prof.id === 'college_lecturer') {
    return {
      url: `${CDN}/master_educator_1min_1080p.mp4`,
      title: 'शिक्षक व व्याख्याता मास्टरक्लास (1-Min 1080p Full HD)',
      duration: 60,
      resolution: '1080p Full HD',
      framing: 'Standing Educator',
    };
  }

  switch (prof.category) {
    case 'education':
      return {
        url: `${CDN}/academic_lecture_1min_1080p.mp4`,
        title: 'विश्वविद्यालय प्राध्यापक अकादमिक व्याख्यान (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Chalkboard / Smartboard Lecture',
      };
    case 'spiritual':
      return {
        url: `${CDN}/spiritual_acharya_1min_1080p.mp4`,
        title: 'आध्यात्मिक गुरु व योग आचार्य प्रवचन (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Ashram Master Discourse',
      };
    case 'corporate':
      return {
        url: `${CDN}/executive_boardroom_1min_1080p.mp4`,
        title: 'कॉर्पोरेट एक्जीक्यूटिव व वित्तीय नेतृत्व (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Executive Boardroom Presenter',
      };
    case 'healthcare':
      return {
        url: `${CDN}/integrative_health_1min_1080p.mp4`,
        title: 'चिकित्सक व स्वास्थ्य परामर्श सत्र (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Clinical Healthcare Consultation',
      };
    case 'media':
      return {
        url: `${CDN}/media_broadcast_1min_1080p.mp4`,
        title: 'मीडिया ब्रॉडकास्ट व की-नोट प्रेजेंटेशन (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Studio Keynote Anchor',
      };
    case 'trades_tech':
      return {
        url: `${CDN}/science_research_1min_1080p.mp4`,
        title: 'वैज्ञानिक शोध व फिजियोलॉजी डेमो (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Research Laboratory Demo',
      };
    default:
      return {
        url: `${CDN}/executive_boardroom_1min_1080p.mp4`,
        title: 'प्रशासनिक व उच्च नेतृत्व प्रेजेंटेशन (1-Min 1080p Full HD)',
        duration: 60,
        resolution: '1080p Full HD',
        framing: 'Executive Presenter',
      };
  }
}

/**
 * MOHAN SIR MASTER IDENTITY - VERIFIED ANTHROPOMETRIC PROFILE
 * Authentic physical measurements provided directly by Mohan Sir.
 */
export interface MohanMasterPhysicalMeasurements {
  heightCm: number;
  weightKg: number;
  shouldersInches: number;
  chestInches: number;
  waistInches: number;
  buttocksInches: number;
  bodyType: string;
  defaultAttire: string;
  hairStyle: string;
  facialHair: string;
}

export const MOHAN_SIR_MASTER_ANTHROPOMETRICS: MohanMasterPhysicalMeasurements = {
  heightCm: 167.6, // 5' 6"
  weightKg: 80.0,
  shouldersInches: 18.5, // 47.0 cm
  chestInches: 38.0, // 96.5 cm
  waistInches: 32.0, // 81.3 cm
  buttocksInches: 38.0, // 96.5 cm
  bodyType: 'Natural, realistic proportionate Indian male body (measured & calibrated from authentic reference footage)',
  defaultAttire: 'White khadi kurta-pajama',
  hairStyle: 'Natural black hair with authentic side part',
  facialHair: 'Groomed natural black beard and moustache matching master identity reference',
};



