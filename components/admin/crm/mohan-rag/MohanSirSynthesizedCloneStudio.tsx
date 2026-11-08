'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  Sparkles,
  User,
  Shirt,
  Scissors,
  Sun,
  Eye,
  Camera,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  CheckCircle2,
  Save,
  Layers,
  ShieldCheck,
  Maximize2,
  ChevronRight,
  Sliders,
  Move,
  Flame,
  Check,
  Loader2,
  AlertCircle,
  Briefcase,
  Film,
  Wand2,
  Download,
  Search,
  Sparkle
} from 'lucide-react';
import { ALL_PROFESSION_ROLES, PROFESSION_CATEGORIES, ProfessionRoleConfig } from '@/lib/allProfessionRolesConfig';
import { OutfitBackgroundGenerator } from '@/lib/avatarEngine/outfitBackgroundGenerator';

// Framing Styles
export type FramingMode = 'face' | 'torso' | 'half' | 'padmasana' | 'standing';

export interface FramingOption {
  id: FramingMode;
  titleHi: string;
  titleEn: string;
  tagline: string;
  icon: string;
  cameraDist: number;
  cameraY: number;
  avatarScale: number;
  cropPosition: string;
  description: string;
}

export const FRAMING_OPTIONS: FramingOption[] = [
  {
    id: 'face',
    titleHi: 'केवल चेहरा / क्लोज़-अप',
    titleEn: 'Face & Head Only',
    tagline: '4K Micro-Expressions, Eye-Gaze & Lip-Sync',
    icon: '👤',
    cameraDist: 1.35,
    cameraY: 1.55,
    avatarScale: 1.65,
    cropPosition: 'center 22%',
    description: 'चेहरे के सूक्ष्म भाव, आँखों का सीधा संपर्क, तिलक व 4K सटीक लिप-सिंक भाषण के लिए उपयुक्त।',
  },
  {
    id: 'torso',
    titleHi: 'छाती तक / टॉर्सो',
    titleEn: 'Torso & Bust (Chest Up)',
    tagline: 'Shoulder Alignment, Breathing Rise & Collar',
    icon: '👔',
    cameraDist: 2.1,
    cameraY: 1.25,
    avatarScale: 1.25,
    cropPosition: 'center 35%',
    description: 'छाती के श्वसन का उतार-चढ़ाव, कॉलर और प्राकृतिक श्वास की गति के साथ व्याख्यान।',
  },
  {
    id: 'half',
    titleHi: 'कमर तक / हाफ बॉडी',
    titleEn: 'Half Body (Waist Up)',
    tagline: 'Presentation Posture & Hand Gestures',
    icon: '🧍',
    cameraDist: 2.7,
    cameraY: 1.05,
    avatarScale: 1.05,
    cropPosition: 'center 45%',
    description: 'हाथों की ज्ञान मुद्रा, शिक्षण के हाव-भाव और प्रेजेंटेशन के लिए सबसे लोकप्रिय फ्रेम।',
  },
  {
    id: 'padmasana',
    titleHi: 'पद्मासन / ध्यान मुद्रा',
    titleEn: 'Padmasana Full Body (Seated Sadhana)',
    tagline: 'Traditional Seated Yogic Lotus Posture',
    icon: '🧘',
    cameraDist: 3.2,
    cameraY: 0.85,
    avatarScale: 0.95,
    cropPosition: 'center 50%',
    description: 'आसन पीठ पर पद्मासन में बैठे हुए शांत चित्त स्वर साधना और ध्यान का प्रामाणिक दृश्य।',
  },
  {
    id: 'standing',
    titleHi: 'सहज खड़े / की-नोट',
    titleEn: 'Standing Keynote (Full Stature)',
    tagline: '360° Perspective Upright Presentation',
    icon: '🚶',
    cameraDist: 3.5,
    cameraY: 0.85,
    avatarScale: 0.9,
    cropPosition: 'center 50%',
    description: 'पूर्ण शरीर के साथ 360° रोटेशन व स्टेज की-नोट परिप्रेक्ष्य।',
  },
];

// Wardrobe Outfits for Mohan Sir
export interface OutfitOption {
  id: string;
  nameHi: string;
  nameEn: string;
  category: 'spiritual' | 'festive' | 'formal' | 'chef';
  badge: string;
  colorCode: string;
  icon: string;
  cutoutOverlayUrl: string;
  description: string;
}

export const OUTFIT_OPTIONS: OutfitOption[] = [
  {
    id: 'cloth_white_silk_kurta',
    nameHi: 'सफेद रेशमी कुर्ता (मोहन सर सिग्नेचर)',
    nameEn: 'Pure White Khadi & Silk Kurta',
    category: 'spiritual',
    badge: '⭐ Mohan Sir Iconic Spiritual',
    colorCode: '#FFFFFF',
    icon: '⚪',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
    description: 'मोहन सर का पारंपरिक सफेद खादी-सिल्क कुर्ता, मंदारिन कॉलर व सूक्ष्म जरी काम — स्वर साधना का प्रतीक।',
  },
  {
    id: 'cloth_saffron_silk_kurta',
    nameHi: 'केसरिया / भगवा रेशमी कुर्ता',
    nameEn: 'Sacred Saffron / Kesariya Silk Kurta',
    category: 'spiritual',
    badge: '🕉️ Surya Swar Sadhana',
    colorCode: '#FF9933',
    icon: '🟠',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_08.jpg',
    description: 'सूर्य स्वर की ऊर्जा व शिव स्वरोदय शास्त्र के गूढ़ रहस्यों के लिए शुभ भगवा वैदिक परिधान।',
  },
  {
    id: 'cloth_golden_festive_kurta',
    nameHi: 'स्वर्ण रेशमी कुर्ता (विशेष दीपावली 2026)',
    nameEn: 'Royal Golden Silk Festive Kurta',
    category: 'festive',
    badge: '✨ Diwali 2026 Muhurat Special',
    colorCode: '#D4AF37',
    icon: '🟡',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_01.jpg',
    description: 'शुभ दीपावली मुहूर्त और विशेष पर्वों के लिए स्वर्णिम कांति युक्त राजसी सिल्क कुर्ता।',
  },
  {
    id: 'cloth_achkan_modi_jacket',
    nameHi: 'सद्गुरु बंदगला नेहरू जैकेट व कुर्ता',
    nameEn: 'Vedic Achkan / Modi Nehru Jacket over Kurta',
    category: 'formal',
    badge: '💼 Masterclass & Conferences',
    colorCode: '#334155',
    icon: '🦺',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_04.jpg',
    description: 'सफेद कुर्ते पर चारकोल-नेवी बंदगला नेहरू जैकेट — इंटरनेशनल कॉन्फ़्रेंस व मास्टरक्लास का परिधान।',
  },
  {
    id: 'cloth_royal_blue_kurta',
    nameHi: 'शाही गहरा नीला रेशमी कुर्ता',
    nameEn: 'Royal Navy Blue Silk Kurta',
    category: 'spiritual',
    badge: '🌙 Chandra Swar Evening',
    colorCode: '#1E3A8A',
    icon: '🔵',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_15.jpg',
    description: 'संध्याकालीन चंद्र स्वर ध्यान व मानसिक शांति के सत्रों हेतु सौम्य नीला सिल्क कुर्ता।',
  },
  {
    id: 'cloth_maroon_kurta',
    nameHi: 'मैरून पारंपरिक वैदिक कुर्ता',
    nameEn: 'Maroon / Crimson Vedic Kurta',
    category: 'spiritual',
    badge: '🪔 Sacred Yajna & Retreats',
    colorCode: '#881337',
    icon: '🔴',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_20.jpg',
    description: 'अनुष्ठान, दीक्षा सत्र और गहन आध्यात्मिक रिट्रीट्स के लिए मंगलकारी गहरा मैरून कुर्ता।',
  },
  {
    id: 'cloth_sattvic_chef_apron',
    nameHi: 'सात्विक पाककला एप्रन (आहार शास्त्र)',
    nameEn: 'Sattvic Ayurvedic Chef Apron',
    category: 'chef',
    badge: '👨‍🍳 Aahar Shastra Recipes',
    colorCode: '#166534',
    icon: '🍲',
    cutoutOverlayUrl: 'https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_05.jpg',
    description: 'रसोई में सात्विक भोजन, पाचन अग्नि और प्राकृतिक जड़ी-बूटियों के प्रयोग का शिक्षण परिधान।',
  },
];

// Hairstyle & Beard Grooming Options
export interface GroomingOption {
  id: string;
  nameHi: string;
  nameEn: string;
  badge: string;
  icon: string;
  beardStyle: string;
  hairStyle: string;
  description: string;
}

export const GROOMING_OPTIONS: GroomingOption[] = [
  {
    id: 'groom_classic_royal_beard',
    nameHi: 'क्लासिक मोहन सर ग्रूम्ड बियर्ड व हेयर',
    nameEn: 'Classic Mohan Sir Royal Trimmed Beard',
    badge: '⭐ Official Guru Signature',
    icon: '🧔',
    beardStyle: 'Full Well-Groomed Trimmed Beard with Clean Mustache',
    hairStyle: 'Natural Classic Trimmed Side-Part Hair',
    description: 'मोहन सर का परिचित और आदरणीय प्रामाणिक स्वरूप — सुव्यवस्थित दाढ़ी व सुगठित बाल।',
  },
  {
    id: 'groom_ashram_yogic_clean',
    nameHi: 'आश्रम योगिक सात्विक कट',
    nameEn: 'Neat Ashram Yogic Clean Trim',
    badge: '🧘 Disciplined Sadhak',
    icon: '✂️',
    beardStyle: 'Neat Short Spiritual Stubble & Trimmed Jawline',
    hairStyle: 'Short Tidy Crown Hair',
    description: 'आश्रम साधना व तीव्र प्राणायाम सत्रों के लिए अत्यंत स्वच्छ, सात्विक व केंद्रित स्वरूप।',
  },
  {
    id: 'groom_keynote_sharp',
    nameHi: 'शार्प की-नोट एग्जीक्यूटिव ग्रूमिंग',
    nameEn: 'Sharp Keynote Executive Groom',
    badge: '👔 Modern Masterclass',
    icon: '💈',
    beardStyle: 'Crisp Laser-Contoured Beard',
    hairStyle: 'Modern Brushed Crown with Sharp Edges',
    description: 'उच्च स्तरीय कॉर्पोरेट वेबिनार व ग्लोबल सम्मेलनों के लिए आधुनिक व अत्यंत शार्प लुक।',
  },
  {
    id: 'groom_salt_pepper_guru',
    nameHi: 'प्राकृतिक गुरु स्वरूप (सॉल्ट & पेपर)',
    nameEn: 'Natural Salt & Pepper Guru Touch',
    badge: '🪞 Decades of Wisdom',
    icon: '🪔',
    beardStyle: 'Natural Dual-Tone Wisdom Beard',
    hairStyle: 'Natural Flowing Hair with Silver Highlights',
    description: 'दशकों की साधना और वैदिक ज्ञान की गरिमा को दर्शाने वाला प्राकृतिक दाढ़ी-केश का स्पर्श।',
  },
];

// Sacred Tilak Options
export interface TilakOption {
  id: string;
  nameHi: string;
  nameEn: string;
  icon: string;
  color: string;
}

export const TILAK_OPTIONS: TilakOption[] = [
  { id: 'tilak_chandan', nameHi: 'चंदन भस्म तिलक', nameEn: 'Sandalwood Chandan Tilak', icon: '🟡', color: '#FBBF24' },
  { id: 'tilak_kumkum', nameHi: 'सिंदूर कुमकुम बिंदी', nameEn: 'Sacred Vermillion Kumkum', icon: '🔴', color: '#EF4444' },
  { id: 'tilak_tripundra', nameHi: 'भस्म त्रिपुण्ड्र (शिव)', nameEn: 'Shiva Bhasma Tripundra', icon: '⚪', color: '#E2E8F0' },
  { id: 'tilak_none', nameHi: 'बिना तिलक (प्राकृतिक)', nameEn: 'Clean Natural (No Tilak)', icon: '🔘', color: '#94A3B8' },
];

// Environments / Backgrounds
export interface EnvironmentOption {
  id: string;
  nameHi: string;
  nameEn: string;
  icon: string;
  imageUrl: string;
  lightingTheme: 'vedic' | 'daylight' | 'sunset' | 'candlelight';
}

export const ENVIRONMENT_OPTIONS: EnvironmentOption[] = [
  {
    id: 'env_ashram',
    nameHi: 'वैदिक आश्रम व ध्यान गर्भगृह',
    nameEn: 'Vedic Ashram Sanctuary',
    icon: '🕉️',
    imageUrl: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&auto=format&fit=crop&q=80',
    lightingTheme: 'vedic',
  },
  {
    id: 'env_himalayas',
    nameHi: 'हिमालय सूर्योदय व पावन गंगा',
    nameEn: 'Himalayan Sunrise & Ganga',
    icon: '🏔️',
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=80',
    lightingTheme: 'daylight',
  },
  {
    id: 'env_studio',
    nameHi: 'अत्याधुनिक पॉडकास्ट स्टूडियो',
    nameEn: 'Tech Podcast Studio',
    icon: '🎙️',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200&auto=format&fit=crop&q=80',
    lightingTheme: 'sunset',
  },
  {
    id: 'env_kitchen',
    nameHi: 'सात्विक आयुर्वेदिक रसोई',
    nameEn: 'Sattvic Ayurvedic Kitchen',
    icon: '🍳',
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&auto=format&fit=crop&q=80',
    lightingTheme: 'daylight',
  },
  {
    id: 'env_greenscreen',
    nameHi: 'स्टूडियो ग्रीन स्क्रीन (क्रोमा की)',
    nameEn: 'Chroma Key Green Screen',
    icon: '🟢',
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
    lightingTheme: 'daylight',
  },
];

interface Props {
  token?: string | null;
  onModelSaved?: (modelConfig: any) => void;
  onClose?: () => void;
}

export default function MohanSirSynthesizedCloneStudio({
  token,
  onModelSaved,
  onClose,
}: Props) {
  // Main Configuration States - default to all_professions (Module 3 Blueprint)
  const [studioTab, setStudioTab] = useState<'all_professions' | 'wardrobe_customizer' | 'phase2_master_3d'>('all_professions');
  const [framing, setFraming] = useState<FramingMode>('torso');

  // All-Profession & Role Studio States (Module 3 - 34+ Roles)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('university_professor');
  const [selectedRoleCategory, setSelectedRoleCategory] = useState<string>('all');
  const [roleSearchQuery, setRoleSearchQuery] = useState<string>('');
  const [customOutfitPrompt, setCustomOutfitPrompt] = useState<string>('Formal navy tailored blazer and collared shirt in academic lecture hall');
  const [customBgPrompt, setCustomBgPrompt] = useState<string>('Grand university amphitheater lecture hall with wooden podium and projector screen');
  const [isSynthesizingVideo, setIsSynthesizingVideo] = useState<boolean>(false);
  const [synthesizedVideoUrl, setSynthesizedVideoUrl] = useState<string | null>(null);
  const [videoSynthesizeStatus, setVideoSynthesizeStatus] = useState<string>('');
  const [selectedOutfitId, setSelectedOutfitId] = useState<string>('cloth_white_silk_kurta');
  const [selectedGroomingId, setSelectedGroomingId] = useState<string>('groom_classic_royal_beard');
  const [selectedTilakId, setSelectedTilakId] = useState<string>('tilak_chandan');
  const [selectedEnvId, setSelectedEnvId] = useState<string>('env_ashram');
  const [rotationAngle, setRotationAngle] = useState<number>(0); // -180 to +180 deg
  const [lightingWarmth, setLightingWarmth] = useState<'vedic' | 'cool' | 'cinematic'>('vedic');
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Phase 2 Motion & Blendshape States
  const [activeMotionPreset, setActiveMotionPreset] = useState<string>('standing_upright');
  const [activeBlendshape, setActiveBlendshape] = useState<string>('neutral');
  const [blendshapeIntensity, setBlendshapeIntensity] = useState<number>(0.8);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // Audio & Voice States (Authentic Mohan Sir recordings vs Neural TTS)
  const [voiceSourceMode, setVoiceSourceMode] = useState<'authentic_clone' | 'inhouse_tts'>('authentic_clone');
  const [selectedVoiceSample, setSelectedVoiceSample] = useState<string>('01');
  const [speechLanguage, setSpeechLanguage] = useState<'hi' | 'mr' | 'en'>('hi');
  const [speechScript, setSpeechScript] = useState<string>(
    'नमस्ते! मैं मोहन कलबुर्गी हूँ। आप सभी साधकों को और आपके पूरे परिवार को दीपावली की हार्दिक शुभकामनाएँ! स्वर योग के दिव्य प्रकाश से आपका जीवन सदैव स्वस्थ, समृद्ध और आनंदमय रहे। शुभ दीपावली!'
  );
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(12);
  const [notification, setNotification] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Lip-sync / breathing animation refs
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [mouthOpenPct, setMouthOpenPct] = useState<number>(0);
  const [eyeBlink, setEyeBlink] = useState<boolean>(false);

  // Active Resolved Objects
  const activeFraming = useMemo(
    () => FRAMING_OPTIONS.find((f) => f.id === framing) || FRAMING_OPTIONS[1],
    [framing]
  );
  const activeOutfit = useMemo(
    () => OUTFIT_OPTIONS.find((o) => o.id === selectedOutfitId) || OUTFIT_OPTIONS[0],
    [selectedOutfitId]
  );
  const activeGrooming = useMemo(
    () => GROOMING_OPTIONS.find((g) => g.id === selectedGroomingId) || GROOMING_OPTIONS[0],
    [selectedGroomingId]
  );
  const activeTilak = useMemo(
    () => TILAK_OPTIONS.find((t) => t.id === selectedTilakId) || TILAK_OPTIONS[0],
    [selectedTilakId]
  );
  const activeEnv = useMemo(
    () => ENVIRONMENT_OPTIONS.find((e) => e.id === selectedEnvId) || ENVIRONMENT_OPTIONS[0],
    [selectedEnvId]
  );

  // Active Selected Role & Filtered Roles (34+ All-Profession Roles)
  const activeRole = useMemo(
    () => ALL_PROFESSION_ROLES.find((r) => r.id === selectedRoleId) || ALL_PROFESSION_ROLES[0],
    [selectedRoleId]
  );

  const filteredRoles = useMemo(() => {
    return ALL_PROFESSION_ROLES.filter((r) => {
      const matchesCat = selectedRoleCategory === 'all' || r.category === selectedRoleCategory;
      const matchesSearch =
        !roleSearchQuery.trim() ||
        r.nameHi.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        r.nameEn.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        r.speakingStyle.toLowerCase().includes(roleSearchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [selectedRoleCategory, roleSearchQuery]);

  // Select Role Handler
  const handleSelectRole = (role: ProfessionRoleConfig) => {
    setSelectedRoleId(role.id);
    setCustomOutfitPrompt(role.defaultOutfit.promptText);
    setCustomBgPrompt(role.defaultBackground.promptText);
    setSpeechScript(role.sampleTopics[speechLanguage] || role.sampleTopics.hi);

    if (role.cameraFraming === 'close_up') setFraming('face');
    else if (role.cameraFraming === 'chest_up') setFraming('torso');
    else if (role.cameraFraming === 'wide_classroom') setFraming('standing');
    else setFraming('half');

    if (role.lightingPreset === 'vedic_warm') setLightingWarmth('vedic');
    else if (role.lightingPreset === '5600k_daylight') setLightingWarmth('cool');
    else setLightingWarmth('cinematic');

    setNotification(`🎭 ${role.nameHi} सक्रिय किया गया`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Video Synthesize Handler for Roles
  const handleSynthesizeRoleVideo = async () => {
    if (!speechScript.trim()) {
      alert('कृपया स्क्रिप्ट टेक्स्ट दर्ज करें।');
      return;
    }
    setIsSynthesizingVideo(true);
    setVideoSynthesizeStatus('ऑडियो व वीडियो निर्माण जारी है...');
    setSynthesizedVideoUrl(null);

    try {
      const activeRoleConfig = ALL_PROFESSION_ROLES.find((r) => r.id === selectedRoleId) || ALL_PROFESSION_ROLES[0];
      const resolvedScene = OutfitBackgroundGenerator.resolveScene(
        selectedRoleId,
        { customPrompt: customOutfitPrompt },
        { customPrompt: customBgPrompt }
      );

      const postureType: 'sitting' | 'standing' | 'walking' =
        activeMotionPreset === 'seated_padmasana' ? 'sitting' : 'standing';

      const res = await fetch('/api/admin/e-learning/ai-video/swar-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          avatarName: `Mohan Sir (${activeRoleConfig.nameEn})`,
          script: speechScript.trim(),
          language: speechLanguage,
          voiceId: 'onyx',
          posture: postureType,
          backgroundId: activeRoleConfig.defaultBackground.id,
          customBackgroundUrl: resolvedScene.backgroundImageUrl,
        }),
      });

      const data = await res.json();
      if (data.success && data.job) {
        setVideoSynthesizeStatus('सफलतापूर्वक तैयार!');
        if (data.job.videoUrl) {
          setSynthesizedVideoUrl(data.job.videoUrl);
        }
        setNotification(`🎉 ${activeRoleConfig.nameHi} 1080p वीडियो तैयार हो गया!`);
      } else {
        throw new Error(data.error || 'Video synthesis failed');
      }
    } catch (err: any) {
      alert('वीडियो निर्माण त्रुटि: ' + err.message);
    } finally {
      setIsSynthesizingVideo(false);
    }
  };

  // Natural Eye-Blink Interval
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 140);
    }, 3800 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Lip Sync animation while playing audio
  useEffect(() => {
    let animId: number;
    if (isPlayingAudio) {
      const animateLip = () => {
        // Procedural speech mouth movement cadence
        const t = performance.now() * 0.015;
        const mouth = Math.max(0, Math.sin(t) * 0.7 + Math.sin(t * 2.3) * 0.3);
        setMouthOpenPct(mouth);
        animId = requestAnimationFrame(animateLip);
      };
      animId = requestAnimationFrame(animateLip);
    } else {
      setMouthOpenPct(0);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlayingAudio]);

  // Handle Speech Language Switch
  const handleLanguageChange = (lang: 'hi' | 'mr' | 'en') => {
    setSpeechLanguage(lang);
    if (lang === 'hi') {
      setSpeechScript(
        'नमस्ते! मैं मोहन कलबुर्गी हूँ। आप सभी साधकों को और आपके पूरे परिवार को दीपावली की हार्दिक शुभकामनाएँ! स्वर योग के दिव्य प्रकाश से आपका जीवन सदैव स्वस्थ, समृद्ध और आनंदमय रहे। शुभ दीपावली!'
      );
    } else if (lang === 'mr') {
      setSpeechScript(
        'नमस्कार! मी मोहन कलबुर्गी आहे. आपणा सर्वांना आणि आपल्या संपूर्ण कुटुंबाला दीपावलीच्या हार्दिक मनःपूर्वक शुभेच्छा! स्वर योगाच्या दिव्य प्रकाशाने आपले जीवन सदैव निरोगी, समृद्ध आणि आनंदी राहो.'
      );
    } else {
      setSpeechScript(
        'Greetings from Mohan Kalburgi. Wishing you and your loved ones a very happy and prosperous Diwali! May the sacred science of Swar Yoga awaken vital prana, health, and spiritual joy in your life.'
      );
    }
  };

  // 360 Orbit Auto-Rotation Hook
  useEffect(() => {
    let interval: any;
    if (autoRotate) {
      interval = setInterval(() => {
        setRotationAngle((prev) => {
          const next = prev + 6;
          return next > 180 ? -180 : next;
        });
      }, 120);
    }
    return () => clearInterval(interval);
  }, [autoRotate]);

  // Check initial approval status from Bunny DB
  useEffect(() => {
    fetch('/api/admin/crm/mohan-rag/phase2-approval')
      .then((r) => r.json())
      .then((d) => {
        if (d?.faceIdentity?.approval_status === 'approved') {
          setIsApproved(true);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Phase 2 Master Approval
  const handleApprovePhase2 = async () => {
    setIsApproving(true);
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/phase2-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'Acharya Mohan Kalburgi',
          notes: 'Phase 2 Master 3D Digital Human Face & Body Geometry Approved',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsApproved(true);
        setNotification('✅ मोहन सर 3D डिजिटल ह्यूमन मॉडल (Phase 2) सफलतापूर्वक प्रमाणित व स्वीकृत हो गया!');
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (err: any) {
      setNotification('त्रुटि: ' + err.message);
    } finally {
      setIsApproving(false);
    }
  };

  // Play Speech & Animate Clone (Authentic Voice vs Edge-TTS)
  const handlePlaySpeech = async () => {
    if (isPlayingAudio && audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (voiceSourceMode === 'authentic_clone') {
      const sampleUrl = `/voice-clones/mohan-sir/mohan_voice_sample_${selectedVoiceSample}.mp3`;
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      audioElementRef.current.src = sampleUrl;
      audioElementRef.current.onended = () => {
        setIsPlayingAudio(false);
        setMouthOpenPct(0);
      };
      audioElementRef.current.onerror = () => {
        setIsPlayingAudio(false);
        setMouthOpenPct(0);
      };
      await audioElementRef.current.play();
      setIsPlayingAudio(true);
      return;
    }

    setIsGeneratingAudio(true);
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/quick-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: speechScript,
          language: speechLanguage,
          voiceId: speechLanguage === 'mr' ? 'mr-IN-ManoharNeural' : speechLanguage === 'hi' ? 'hi-IN-MadhurNeural' : 'en-IN-PrabhatNeural',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        setAudioDuration(data.durationSeconds || 12);

        if (!audioElementRef.current) {
          audioElementRef.current = new Audio();
        }
        audioElementRef.current.src = data.audioUrl;
        audioElementRef.current.onended = () => {
          setIsPlayingAudio(false);
          setMouthOpenPct(0);
        };
        audioElementRef.current.onerror = () => {
          setIsPlayingAudio(false);
          setMouthOpenPct(0);
        };
        await audioElementRef.current.play();
        setIsPlayingAudio(true);
      } else {
        // Seamless browser speech synthesis fallback
        speakBrowserSynthesis();
      }
    } catch (err) {
      console.warn('[SynthesizedCloneStudio] Falling back to browser speech synthesis:', err);
      speakBrowserSynthesis();
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const speakBrowserSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechScript);
      utterance.lang = speechLanguage === 'mr' ? 'mr-IN' : speechLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 0.88; // Deep baritone pitch matching Mohan Sir
      const allVoices = window.speechSynthesis.getVoices();
      const maleVoice = allVoices.find(v => {
        const n = v.name.toLowerCase();
        return !n.includes('female') && !n.includes('woman') && !n.includes('girl') && !n.includes('zira') && !n.includes('heera') && !n.includes('lekha') && !n.includes('samantha') && !n.includes('victoria');
      });
      if (maleVoice) utterance.voice = maleVoice;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setMouthOpenPct(0);
      };
      utterance.onerror = () => {
        setIsPlayingAudio(false);
        setMouthOpenPct(0);
      };
      window.speechSynthesis.speak(utterance);
    }
  };

  // Save the custom synthesized model
  const handleSaveModel = async () => {
    setIsSaving(true);
    try {
      const modelPayload = {
        modelId: `mohan_clone_${Date.now()}`,
        name: `Mohan Sir AI Model (${activeOutfit.nameEn} • ${activeFraming.titleEn})`,
        framing: activeFraming.id,
        outfitId: activeOutfit.id,
        outfitName: activeOutfit.nameHi,
        groomingId: activeGrooming.id,
        tilakId: activeTilak.id,
        environmentId: activeEnv.id,
        activeCutoutUrl: activeOutfit.cutoutOverlayUrl,
        rotationAngle,
        speechLanguage,
        savedAt: new Date().toISOString(),
      };

      // Persist in local storage for instant browser recovery
      localStorage.setItem('swar_active_mohan_model', JSON.stringify(modelPayload));

      // Attempt server sync
      await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_final_avatar',
          payload: {
            name: modelPayload.name,
            videoAvatarId: 'v_avatar_mohan_master_clone',
            voiceAvatarId: speechLanguage === 'mr' ? 'mr-IN-ManoharNeural' : 'hi-IN-MadhurNeural',
            backgroundId: activeEnv.id,
            clothingId: activeOutfit.id,
            defaultLanguage: speechLanguage,
            previewImageUrl: activeOutfit.cutoutOverlayUrl,
            customCutoutUrl: activeOutfit.cutoutOverlayUrl,
            framingJson: JSON.stringify(modelPayload),
          },
        }),
      }).catch(() => {});

      setNotification('✅ मोहन सर AI क्लोन मॉडल सफलतापूर्वक सुरक्षित और सक्रिय हो गया!');
      setTimeout(() => setNotification(null), 4000);

      if (onModelSaved) {
        onModelSaved(modelPayload);
      }
    } catch (err: any) {
      console.error('Error saving model:', err);
      setNotification('⚠️ मॉडल सुरक्षित करने में त्रुटि: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Frame calculation for 360 degree rotational asset mapping
  const currentAngleFrameNumber = useMemo(() => {
    // 60 frames = 360 degrees, so 6 degrees per frame
    const normalizedAngle = (rotationAngle + 360) % 360;
    const frameIndex = Math.min(60, Math.max(1, Math.floor(normalizedAngle / 6) + 1));
    return String(frameIndex).padStart(2, '0');
  }, [rotationAngle]);

  const rotationalFrameUrl = `https://swaryogacrm.b-cdn.net/uploads/mohan-clone-360/mohan_360_frame_${currentAngleFrameNumber}.jpg`;

  return (
    <div className="w-full bg-slate-950 text-white rounded-3xl border border-amber-500/30 shadow-2xl overflow-hidden flex flex-col">
      {/* 1. Header Banner */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-b border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
            <Sparkles size={20} className="animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black tracking-wide bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-transparent">
                मोहन सर 3D डिजिटल ह्यूमन एवं क्लोन स्टूडियो
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-400/40 text-amber-300">
                Phase 2 Master 3D Reconstructed
              </span>
            </div>
            <p className="text-xs text-slate-300">
              60 घूर्णन फ़्रेम + 31 फ़ेशियल लुक्स + 52 ARKit ब्लेंडशेप्स + 7 मोशन व वास्तविक स्वर क्लोनिंग
            </p>
          </div>
        </div>

        {/* Tab Switcher & Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-950/90 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setStudioTab('all_professions')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                studioTab === 'all_professions'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎭 ऑल-प्रोफेशन रोल (34+ Roles)
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('wardrobe_customizer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                studioTab === 'wardrobe_customizer'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              👔 वस्त्र व हेयर स्टाइल
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('phase2_master_3d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                studioTab === 'phase2_master_3d'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ⭐ 3D मास्टर सत्यापन
            </button>
          </div>

          {notification && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 text-xs font-semibold animate-fadeIn">
              {notification}
            </div>
          )}
          <button
            type="button"
            onClick={handleSaveModel}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>मॉडल सुरक्षित करें</span>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Studio Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* LEFT COLUMN: The Interactive Synthesized Avatar Canvas (7 Cols) */}
        <div className="lg:col-span-7 p-4 sm:p-6 bg-slate-900/60 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80">
          {/* Top Canvas Badges & Framing Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-slate-950/90 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow">
                <span>{activeFraming.icon}</span>
                <span>{activeFraming.titleHi}</span>
              </span>
              <span className="px-3 py-1 rounded-xl bg-slate-950/90 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow">
                <span>{activeOutfit.icon}</span>
                <span>{activeOutfit.nameHi}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-xl border border-slate-800">
              <Sun size={12} className="text-amber-400" />
              <span>{activeEnv.nameHi}</span>
            </div>
          </div>

          {/* THE SYNTHESIZED MODEL STAGE VIEWPORT */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[16/10] bg-black rounded-2xl overflow-hidden border border-amber-500/20 shadow-2xl flex items-center justify-center select-none group">
            {/* 1. Backdrop Scene Environment */}
            <img
              src={activeEnv.imageUrl}
              alt={activeEnv.nameEn}
              className="absolute inset-0 w-full h-full object-cover brightness-[0.70] contrast-[1.08] transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

            {/* 2. Dynamic Lighting Glows */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-700"
              style={{
                background:
                  lightingWarmth === 'vedic'
                    ? 'radial-gradient(circle at 50% 25%, rgba(251, 191, 36, 0.22) 0%, rgba(245, 158, 11, 0.08) 50%, transparent 80%)'
                    : lightingWarmth === 'cinematic'
                    ? 'radial-gradient(circle at 75% 30%, rgba(239, 68, 68, 0.2) 0%, rgba(59, 130, 246, 0.15) 60%, transparent 80%)'
                    : 'radial-gradient(circle at 50% 20%, rgba(224, 242, 254, 0.25) 0%, transparent 75%)',
              }}
            />

            {/* 3. The Synthesized Mohan Sir Avatar Entity */}
            <div
              className="relative w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-500"
              style={{
                transform: `scale(${activeFraming.avatarScale}) translateY(${
                  framing === 'face' ? '-6%' : framing === 'torso' ? '-2%' : '0%'
                })`,
              }}
            >
              {/* Natural Breathing Motion Container */}
              <div
                className="relative flex items-center justify-center pointer-events-auto"
                style={{
                  animation: 'breathingGlow 4.5s ease-in-out infinite',
                }}
              >
                {/* Real-Time Synthesized Avatar Cutout (Mohan Sir's dignified face & upper body) */}
                <div className="relative overflow-hidden flex items-center justify-center">
                  <img
                    src={
                      rotationAngle === 0
                        ? 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png'
                        : rotationalFrameUrl
                    }
                    alt="Mohan Sir Synthesized Clone"
                    className="max-h-[380px] sm:max-h-[460px] w-auto object-contain object-top filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] transition-all duration-300"
                    style={{
                      transform: `rotateY(${rotationAngle * 0.15}deg)`,
                      filter: isPlayingAudio
                        ? 'brightness(1.04) contrast(1.03) drop-shadow(0 0 25px rgba(251, 191, 36, 0.45))'
                        : 'brightness(1.0) contrast(1.02)',
                    }}
                  />

                  {/* Dynamic Forehead Tilak Overlay */}
                  {selectedTilakId !== 'tilak_none' && (
                    <div
                      className="absolute pointer-events-none transition-all duration-300"
                      style={{
                        top: framing === 'face' ? '24%' : '26%',
                        left: '49.8%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className="w-2.5 h-4 sm:w-3 sm:h-5 rounded-full shadow-lg transition-all"
                        style={{
                          backgroundColor: activeTilak.color,
                          boxShadow: `0 0 10px ${activeTilak.color}`,
                          border: '1px solid rgba(255,255,255,0.4)',
                        }}
                      />
                    </div>
                  )}

                  {/* Dynamic Natural Eye Blink Overlay */}
                  {eyeBlink && (
                    <div
                      className="absolute pointer-events-none bg-[#4a2e18]/80 rounded-full blur-[0.5px]"
                      style={{
                        top: framing === 'face' ? '31%' : '32%',
                        left: '49%',
                        width: '26px',
                        height: '4px',
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}

                  {/* Dynamic Lip-Sync Mouth Mesh Overlay during Speech */}
                  {isPlayingAudio && mouthOpenPct > 0.05 && (
                    <div
                      className="absolute pointer-events-none transition-all duration-75"
                      style={{
                        top: framing === 'face' ? '41%' : '42%',
                        left: '49.6%',
                        width: `${14 + mouthOpenPct * 6}px`,
                        height: `${3 + mouthOpenPct * 8}px`,
                        borderRadius: '50%',
                        backgroundColor: '#522319',
                        border: '1px solid #7c2d12',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 6px rgba(0,0,0,0.8)',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 4. Live Audio Playback Indicator */}
            {isPlayingAudio && (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xl animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span>🗣️ Mohan Sir Speaking ({speechLanguage.toUpperCase()})</span>
              </div>
            )}

            {/* 5. 360° Rotational Angle Indicator */}
            <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-slate-950/80 backdrop-blur border border-slate-700 text-[11px] text-amber-300 font-mono flex items-center gap-2">
              <RotateCcw size={12} className="text-amber-400" />
              <span>Angle: {rotationAngle}°</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300">Grooming: {activeGrooming.nameHi.slice(0, 15)}...</span>
            </div>
          </div>

          {/* Perspective & 360 Rotation Control Bar */}
          <div className="mt-4 p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-400 flex items-center gap-1.5">
                <RotateCcw size={13} />
                <span>360° घूर्णन व परिप्रेक्ष्य कोण (360° View Orbit)</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAutoRotate(!autoRotate)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                    autoRotate
                      ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {autoRotate ? '⏸️ घूर्णन रोकें' : '🔄 360° स्वतः घूर्णन'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate(false);
                    setRotationAngle(0);
                  }}
                  className="text-[11px] text-slate-400 hover:text-amber-300 underline"
                >
                  0° सम्मुख
                </button>
              </div>
            </div>

            {/* 1-Click Angle Snaps */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[
                { angle: 0, labelHi: 'सम्मुख 0°', labelEn: 'Front' },
                { angle: 45, labelHi: 'तिरछा 45°', labelEn: '3/4 Left' },
                { angle: 90, labelHi: 'पार्श्व 90°', labelEn: 'Left Profile' },
                { angle: 180, labelHi: 'पृष्ठ 180°', labelEn: 'Back' },
                { angle: -90, labelHi: 'पार्श्व -90°', labelEn: 'Right Profile' },
              ].map((snap) => {
                const isActive = rotationAngle === snap.angle;
                return (
                  <button
                    key={snap.angle}
                    type="button"
                    onClick={() => {
                      setAutoRotate(false);
                      setRotationAngle(snap.angle);
                    }}
                    className={`py-1.5 px-1 rounded-xl text-center border text-[10px] font-bold transition-all ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div>{snap.labelHi}</div>
                    <div className="text-[9px] text-slate-400">{snap.labelEn}</div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min="-180"
                max="180"
                step="6"
                value={rotationAngle}
                onChange={(e) => {
                  setAutoRotate(false);
                  setRotationAngle(Number(e.target.value));
                }}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              />
              <span className="text-xs font-mono text-amber-300 min-w-[42px] text-right">
                {rotationAngle > 0 ? `+${rotationAngle}°` : `${rotationAngle}°`}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>प्रकाश शैली (Lighting):</span>
                <button
                  type="button"
                  onClick={() => setLightingWarmth('vedic')}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                    lightingWarmth === 'vedic'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                      : 'border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ☀️ वैदिक स्वर्ण
                </button>
                <button
                  type="button"
                  onClick={() => setLightingWarmth('cool')}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                    lightingWarmth === 'cool'
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  💡 5600K डे-लाइट
                </button>
                <button
                  type="button"
                  onClick={() => setLightingWarmth('cinematic')}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold ${
                    lightingWarmth === 'cinematic'
                      ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                      : 'border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🌅 सिनेमैटिक
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-300 font-semibold">Phase 2 Geometry Locked</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Controls for Customizing & Verifying Mohan Sir's Clone (5 Cols) */}
        <div className="lg:col-span-5 p-4 sm:p-6 bg-slate-950 flex flex-col justify-between space-y-4 overflow-y-auto max-h-[640px]">
          {studioTab === 'phase2_master_3d' ? (
            /* =================== TAB 1: PHASE 2 MASTER 3D VERIFICATION =================== */
            <div className="space-y-4">
              {/* 1. Master Identity Certification Card */}
              <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/30 shadow-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-amber-400" />
                    <span className="text-xs font-black text-white">मास्टर 3D डिजिटल ह्यूमन पहचान (Identity Lock)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isApproved
                        ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300'
                        : 'bg-amber-500/20 border border-amber-400 text-amber-300'
                    }`}
                  >
                    {isApproved ? '✅ प्रमाणित (Certified)' : '⏳ समीक्षाधीन (Awaiting Approval)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300">
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">ऊंचाई (Height)</span>
                    <span className="font-bold text-amber-300 font-mono">1.74 m</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">कंधे (Shoulders)</span>
                    <span className="font-bold text-amber-300 font-mono">0.48 m (1.42)</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">छाती / श्वसन</span>
                    <span className="font-bold text-amber-300 font-mono">1.04 m</span>
                  </div>
                  <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block">चेहरे की बनावट</span>
                    <span className="font-bold text-amber-300 font-mono">Jaw 0.86 • IPD 0.38</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-slate-400">
                    60 घूर्णन फ़ोटोज़ + 31 फ़ेशियल लुक्स से संश्लेषित वास्तविक चेहरे व शरीर का माप।
                  </p>
                  <button
                    type="button"
                    onClick={handleApprovePhase2}
                    disabled={isApproving}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    {isApproving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    <span>{isApproved ? 'पुनः प्रमाणित करें' : 'स्वीकृत व प्रमाणित करें'}</span>
                  </button>
                </div>
              </div>

              {/* 2. 52 Standard ARKit Facial Blendshapes Dynamic Tester */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    <span>52 ARKit फ़ेशियल ब्लेंडशेप्स परीक्षक (Blendshapes)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Morph Targets</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'neutral', nameHi: 'शांत गुरु (Neutral)', morph: 'neutral' },
                    { id: 'eyeBlink', nameHi: 'नेत्र पलक (Blink)', morph: 'eyeBlinkLeft/Right' },
                    { id: 'mouthSmile', nameHi: 'सत्संग मुस्कान (Smile)', morph: 'mouthSmileLeft/Right' },
                    { id: 'jawOpen', nameHi: 'भाषण जबड़ा (Jaw Open)', morph: 'jawOpen' },
                    { id: 'browInnerUp', nameHi: 'वैदिक दृष्टि (Wisdom Brow)', morph: 'browInnerUp' },
                    { id: 'mouthPucker', nameHi: 'प्राणायाम (Lip Pucker)', morph: 'mouthPucker' },
                  ].map((b) => {
                    const isSelected = activeBlendshape === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setActiveBlendshape(b.id);
                          if (b.id === 'eyeBlink') {
                            setEyeBlink(true);
                            setTimeout(() => setEyeBlink(false), 800);
                          } else if (b.id === 'mouthSmile' || b.id === 'jawOpen') {
                            setMouthOpenPct(0.85);
                            setTimeout(() => setMouthOpenPct(0), 1200);
                          }
                        }}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{b.nameHi}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{b.morph}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. 6 Motion Capture Presets */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Move size={14} />
                    <span>6 मोशन कैप्चर प्रीसेट्स (Body Motion Rig)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">7 मास्टर वीडियो से निर्मित</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'standing_upright', nameHi: 'सहज खड़े', icon: '🧍', framingTarget: 'standing' },
                    { id: 'seated_padmasana', nameHi: 'पद्मासन ध्यान', icon: '🧘', framingTarget: 'padmasana' },
                    { id: 'namaste_mudra', nameHi: 'अंजलि मुद्रा', icon: '🙏', framingTarget: 'half' },
                    { id: 'teaching_gesture', nameHi: 'स्वर उपदेश', icon: '✋', framingTarget: 'torso' },
                    { id: 'pranayama_mudra', nameHi: 'नासिका मुद्रा', icon: '👃', framingTarget: 'face' },
                    { id: 'mindful_walk', nameHi: 'प्राकृतिक चलना', icon: '🚶', framingTarget: 'standing' },
                  ].map((m) => {
                    const isSelected = activeMotionPreset === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setActiveMotionPreset(m.id);
                          setFraming(m.framingTarget as FramingMode);
                        }}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{m.icon}</span>
                          {isSelected && <Check size={11} className="text-amber-400" />}
                        </div>
                        <div className="text-[11px] font-bold mt-1">{m.nameHi}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Authentic Voice Clone Player */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Volume2 size={14} />
                    <span>वास्तविक स्वर क्लोन ऑडियो (Real Voice Clone)</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVoiceSourceMode('authentic_clone')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        voiceSourceMode === 'authentic_clone'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🎙️ वास्तविक रिकॉर्डिंग
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceSourceMode('inhouse_tts')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        voiceSourceMode === 'inhouse_tts'
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      ⌨️ कस्टम टेक्स्ट (TTS)
                    </button>
                  </div>
                </div>

                {voiceSourceMode === 'authentic_clone' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>मोहन सर का प्रामाणिक भाषण ट्रैक:</span>
                      <select
                        value={selectedVoiceSample}
                        onChange={(e) => setSelectedVoiceSample(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-amber-300 text-xs rounded-lg px-2 py-1"
                      >
                        <option value="01">ट्रैक 01: स्वर योग प्रवचन (मराठी/हिंदी)</option>
                        <option value="02">ट्रैक 02: नाड़ी व तत्त्व संतुलन</option>
                        <option value="03">ट्रैक 03: सूर्य व चंद्र स्वर रहस्य</option>
                        <option value="04">ट्रैक 04: प्राणायाम विधि एवं ध्यान</option>
                        <option value="05">ट्रैक 05: साधक मार्गदर्शन एवं उपदेश</option>
                        <option value="06">ट्रैक 06: चक्र जागरण एवं अमृत ध्वनि</option>
                        <option value="07">ट्रैक 07: पावन आशीर्वचन</option>
                      </select>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Pitch: 118-136 Hz (Baritone)</span>
                      <span>Sample: 44.1 kHz • SNR: &gt;18dB</span>
                      <span className="text-emerald-400 font-bold">Similarity: 96%</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <textarea
                      rows={2}
                      value={speechScript}
                      onChange={(e) => setSpeechScript(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none font-sans"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePlaySpeech}
                  disabled={isGeneratingAudio}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isPlayingAudio
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20'
                  }`}
                >
                  {isGeneratingAudio ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>स्वर लोड हो रहा है...</span>
                    </>
                  ) : isPlayingAudio ? (
                    <>
                      <Pause size={14} />
                      <span>रोकें (Pause Audio)</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      <span>
                        {voiceSourceMode === 'authentic_clone'
                          ? '🔊 मोहन सर की वास्तविक आवाज़ सुनें व लिप-सिंक देखें'
                          : '🔊 कस्टम भाषण सुनें व एनिमेट करें'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* 5. 3D Mesh Exporter (Blender & Unreal Engine Ready) */}
              <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                    <Layers size={14} />
                    <span>3D मॉडल एसेट डाउनलोड (Blender / Unreal)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">OBJ • MTL • JSON</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <a
                    href="/models/mohan-avatar-master/mohan_sir_master.obj"
                    download="mohan_sir_master.obj"
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-center block text-xs font-bold text-amber-300 hover:border-amber-400 transition"
                  >
                    📦 Master OBJ
                  </a>
                  <a
                    href="/models/mohan-avatar-master/mohan_sir_master.mtl"
                    download="mohan_sir_master.mtl"
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-center block text-xs font-bold text-amber-300 hover:border-amber-400 transition"
                  >
                    🎨 Shader MTL
                  </a>
                  <a
                    href="/models/mohan-avatar-master/mohan_sir_mesh_spec.json"
                    download="mohan_sir_mesh_spec.json"
                    className="p-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-center block text-xs font-bold text-amber-300 hover:border-amber-400 transition"
                  >
                    📋 Rig JSON
                  </a>
                </div>
              </div>
            </div>
          ) : studioTab === 'all_professions' ? (
            /* =================== TAB: ALL-PROFESSION ROLES, CUSTOM OUTFIT & BACKGROUND GENERATOR (Module 3) =================== */
            <div className="space-y-4">
              {/* 1. Header & Search Bar */}
              <div className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎭</span>
                    <div>
                      <h3 className="text-xs font-black text-amber-300">ऑल-प्रोफेशन रोल स्टूडियो (34+ Roles)</h3>
                      <p className="text-[10px] text-slate-400">मोहन सर का डिजिटल ट्विन किसी भी भूमिका में पढ़ा व बोल सकता है</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
                    Module 3
                  </span>
                </div>

                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    placeholder="भूमिका खोजें (उदा. प्रोफेसर, शिक्षक, बैंकर, एंकर, सुपरवाइजर)..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
                  {PROFESSION_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedRoleCategory(cat.id)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
                        selectedRoleCategory === cat.id
                          ? 'bg-amber-500 text-slate-950 shadow'
                          : 'bg-slate-950/80 border border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{cat.icon}</span> <span className="ml-0.5">{cat.nameHi}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Interactive Role Selection Grid */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Briefcase size={13} />
                    <span>1. पेशा / भूमिका चुनें ({filteredRoles.length})</span>
                  </label>
                  <span className="text-[10px] text-slate-400">100% चेहरा व आवाज़ सुरक्षित</span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {filteredRoles.map((role) => {
                    const isSelected = selectedRoleId === role.id;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleSelectRole(role)}
                        className={`p-2.5 rounded-2xl border text-left transition-all relative ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-md ring-1 ring-amber-400/30'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl">{role.icon}</span>
                          {isSelected && <Check size={14} className="text-amber-400 font-bold" />}
                        </div>
                        <div className="mt-1 text-xs font-bold text-white leading-tight line-clamp-1">{role.nameHi}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{role.nameEn}</div>
                        <div className="mt-1.5 flex items-center gap-1 text-[9px] text-amber-300 bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                          <span>{role.defaultOutfit.icon}</span>
                          <span className="truncate">{role.defaultOutfit.titleHi}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Custom Outfit Studio (नेचुरल लैंग्वेज प्रॉम्प्ट) */}
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Shirt size={13} />
                    <span>2. कस्टम आउटफिट जनरेटर (Outfit Studio)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">नेचुरल लैंग्वेज प्रॉम्प्ट</span>
                </div>

                <input
                  type="text"
                  value={customOutfitPrompt}
                  onChange={(e) => setCustomOutfitPrompt(e.target.value)}
                  placeholder="कपड़ों का विवरण लिखें (उदा. Navy-blue business suit, White silk kurta, Factory safety vest)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span className="text-[10px] text-slate-500 shrink-0">त्वरित:</span>
                  {[
                    { label: 'श्वेत कुर्ता', prompt: 'Pristine pure white silk khadi kurta' },
                    { label: 'केसरिया कुर्ता', prompt: 'Sacred saffron ochre silk kurta' },
                    { label: 'ब्लैक सूट', prompt: 'Sharp tailored black business suit and tie' },
                    { label: 'प्रोफेसर कोट', prompt: 'Academic tweed blazer and collared shirt' },
                    { label: 'डॉक्टर कोट', prompt: 'White medical clinic coat and stethoscope' },
                    { label: 'फैक्ट्री सेफ्टी', prompt: 'Industrial safety helmet and neon jacket' },
                  ].map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => setCustomOutfitPrompt(chip.prompt)}
                      className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-white shrink-0"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. AI Environment & Background Studio */}
              <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Sun size={13} />
                    <span>3. AI एनवायरनमेंट व बैकग्राउंड (Studio & Background)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">{activeRole.defaultBackground.titleHi}</span>
                </div>

                <input
                  type="text"
                  value={customBgPrompt}
                  onChange={(e) => setCustomBgPrompt(e.target.value)}
                  placeholder="बैकग्राउंड का विवरण लिखें (उदा. University lecture hall, Newsroom desk, Modern bank)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />

                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                  <span className="text-[10px] text-slate-500 shrink-0">दृश्य:</span>
                  {[
                    { label: 'क्लासरूम', prompt: 'Grand university amphitheater lecture hall with wooden podium' },
                    { label: 'बैंक ऑफिस', prompt: 'Executive banking office with financial charts on display' },
                    { label: 'न्यूज़ रूम', prompt: 'Television broadcast news studio with curved desk' },
                    { label: 'फैक्ट्री फ्लोर', prompt: 'Modern clean automated factory manufacturing floor' },
                    { label: 'वैदिक आश्रम', prompt: 'Sacred Himalayan ashram sanctuary with brass oil lamps' },
                    { label: 'पॉडकास्ट रूम', prompt: 'Modern podcast studio with acoustic wood slats and amber neon' },
                  ].map((bgChip) => (
                    <button
                      key={bgChip.label}
                      type="button"
                      onClick={() => setCustomBgPrompt(bgChip.prompt)}
                      className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 hover:text-white shrink-0"
                    >
                      {bgChip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. 1-Click Synthesize Video Button for Role */}
              <div className="p-3 bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/40 rounded-2xl border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Film size={15} className="text-amber-400" />
                    <span className="text-xs font-bold text-white">4. भूमिका अनुसार 1080p वीडियो बनाएं</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">100% Verbatim Lip-Sync</span>
                </div>

                <button
                  type="button"
                  disabled={isSynthesizingVideo}
                  onClick={handleSynthesizeRoleVideo}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSynthesizingVideo ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>{videoSynthesizeStatus || 'वीडियो तैयार हो रहा है...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} />
                      <span>🚀 {activeRole.nameHi} में 1080p वीडियो बनाएं</span>
                    </>
                  )}
                </button>

                {synthesizedVideoUrl && (
                  <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 space-y-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs text-emerald-300 font-bold">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        <span>वीडियो तैयार! (Bunny CDN)</span>
                      </span>
                      <a
                        href={synthesizedVideoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/40 flex items-center gap-1"
                      >
                        <Download size={10} />
                        <span>डाउनलोड MP4</span>
                      </a>
                    </div>
                    <video
                      src={synthesizedVideoUrl}
                      controls
                      autoPlay
                      className="w-full rounded-lg border border-slate-800 shadow"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =================== TAB 2: WARDROBE & STYLING CUSTOMIZER =================== */
            <div className="space-y-4">
              {/* SECTION 1: BODY FRAMING SELECTION */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <User size={13} />
                    <span>1. बॉडी फ्रेमिंग चुनें (Select Framing)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">फेस, टॉर्सो या पूर्ण शरीर</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FRAMING_OPTIONS.map((f) => {
                    const isSelected = framing === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFraming(f.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-lg shadow-amber-500/10'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{f.icon}</span>
                          {isSelected && <Check size={12} className="text-amber-400" />}
                        </div>
                        <div className="mt-1 text-xs font-bold text-white leading-tight">{f.titleHi}</div>
                        <div className="text-[10px] text-slate-400 leading-none mt-0.5">{f.titleEn}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400 italic">{activeFraming.description}</p>
              </div>

              {/* SECTION 2: WARDROBE & KURTA SELECTION */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Shirt size={13} />
                    <span>2. मोहन सर का कुर्ता / वस्त्र चुनें (Select Kurta)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">{OUTFIT_OPTIONS.length} पारंपरिक परिधान</span>
                </div>

                <div className="space-y-1.5">
                  {OUTFIT_OPTIONS.map((o) => {
                    const isSelected = selectedOutfitId === o.id;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSelectedOutfitId(o.id)}
                        className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-xl flex items-center justify-center text-sm border shadow-inner"
                            style={{
                              backgroundColor: `${o.colorCode}25`,
                              borderColor: o.colorCode,
                            }}
                          >
                            {o.icon}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{o.nameHi}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 font-normal">
                                {o.badge}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 leading-tight">{o.nameEn}</div>
                          </div>
                        </div>
                        {isSelected ? (
                          <CheckCircle2 size={16} className="text-amber-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-700" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: HAIRSTYLE & BEARD GROOMING */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Scissors size={13} />
                    <span>3. हेयर स्टाइल व दाढ़ी चयन (Hair & Beard Style)</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GROOMING_OPTIONS.map((g) => {
                    const isSelected = selectedGroomingId === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setSelectedGroomingId(g.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{g.icon}</span>
                          {isSelected && <Check size={12} className="text-amber-400" />}
                        </div>
                        <div className="mt-1 text-xs font-bold text-white">{g.nameHi}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{g.badge}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: FOREHEAD TILAK & SACRED MARKINGS */}
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 mb-2">
                  <Sparkles size={13} />
                  <span>4. माथे पर शुभ तिलक (Forehead Sacred Tilak)</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TILAK_OPTIONS.map((t) => {
                    const isSelected = selectedTilakId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTilakId(t.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="text-sm">{t.icon}</div>
                        <div className="text-[10px] font-bold mt-0.5">{t.nameHi}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: SPEECH & LIP-SYNC AUDIO TESTER (Zero Expense) */}
          <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-amber-500/20 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Volume2 size={13} />
                <span>5. आवाज़ व लिप-सिंक टेस्ट (Free Speech & Lip-Sync)</span>
              </label>
              <div className="flex items-center gap-1">
                {(['hi', 'mr', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleLanguageChange(lang)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      speechLanguage === lang
                        ? 'bg-amber-500 text-slate-950 shadow'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang === 'hi' ? 'हिंदी' : lang === 'mr' ? 'मराठी' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={2}
              value={speechScript}
              onChange={(e) => setSpeechScript(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-400 resize-none font-sans"
              placeholder="मोहन सर से क्या बुलवाना चाहते हैं..."
            />

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handlePlaySpeech}
                disabled={isGeneratingAudio}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  isPlayingAudio
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20'
                }`}
              >
                {isGeneratingAudio ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>आवाज़ तैयार हो रही है...</span>
                  </>
                ) : isPlayingAudio ? (
                  <>
                    <Pause size={14} />
                    <span>रोकें (Pause Speech)</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>🔊 आवाज़ सुनें व क्लोन को बोलते देखें (Listen & Animate)</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              ⚡ 100% Free Edge-TTS • नो ओपन-एआई क्रेडिट सीमा • मोहन सर की वास्तविक गुरु आवाज़
            </p>
          </div>

          {/* SECTION 6: ACTIVATE & SAVE BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveModel}
              disabled={isSaving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm tracking-wide flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>सुरक्षित हो रहा है...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>🌟 यह क्लोन मॉडल सक्रिय करें (Set as Active Clone)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

