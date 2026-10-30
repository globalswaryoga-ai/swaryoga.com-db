'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sliders,
  Palette,
  Shirt,
  Volume2,
  Film,
  RotateCw,
  Move,
  ZoomIn,
  FlipHorizontal,
  Check,
  Save,
  CheckCircle2,
  RefreshCw,
  Box,
  Eye,
  Camera,
  Layers,
  ChefHat,
  BookOpen,
  ArrowRight,
  UploadCloud,
  User,
  Play,
  Video,
  Download,
  AlertCircle,
  Loader2,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  X,
  Upload,
  Link as LinkIcon,
  Sun,
  Wand2,
  Heart,
  Cpu,
  ShieldCheck,
} from 'lucide-react';
import Avatar3DCanvas from './Avatar3DCanvas';
import {
  MASTER_BACKGROUNDS,
  MASTER_CLOTHING,
  MASTER_POSTURES,
  BackgroundItem,
  ClothingItem,
  AvatarPostureItem,
} from '@/lib/avatarStudioMasterConfig';
import {
  VideoAvatar,
  VoiceAvatar,
  FinalAvatar,
} from '@/lib/bunnyAvatarStudioRepository';

export interface AvatarVideoPresetItem {
  id: string;
  name: string;
  badge?: string;
  url: string;
  videoUrl: string;
  recommendedClothId?: string;
  description?: string;
  isCustom?: boolean;
}

// Cutout & Video Presets for Mohan Sir
export const MOHAN_SIR_CUTOUT_PRESETS: AvatarVideoPresetItem[] = [
  {
    id: 'cutout_heygen_hd_official',
    name: 'Mohan Kalburgi (Vedic Twin - Hindi Sadhana)',
    badge: '⭐ 1080p Real Hindi Voice',
    url: 'https://resource2.heygen.ai/best_frame_selection/candidates/6252d07df49247eaa5413ebbbb35fcd0.jpg',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    recommendedClothId: 'cloth_white_kurta',
    description: 'Authentic 1080p digital twin speaking fluent Hindi Vedic wisdom with natural lip synchronization.',
  },
  {
    id: 'cutout_white_kurta_master',
    name: 'Vedic Master (Pure White Khadi Kurta - Marathi)',
    badge: 'Clean Cutout • Marathi Voice',
    url: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
    recommendedClothId: 'cloth_white_kurta',
    description: 'Pure transparent alpha cutout speaking fluent Marathi for ashram and nature backgrounds.',
  },
  {
    id: 'cutout_chef_apron',
    name: 'Ayurvedic Chef (Kitchen Host with Apron)',
    badge: 'Ayurvedic Cooking',
    url: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    recommendedClothId: 'cloth_chef_apron',
    description: 'Ideal for Sattvic recipe demonstrations and Ayurvedic dietary wisdom.',
  },
  {
    id: 'cutout_saffron_vedic',
    name: 'Saffron Dhyana (Deep Meditation)',
    badge: 'Sadhana & Pranayama',
    url: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    recommendedClothId: 'cloth_saffron_vedic',
    description: 'Specialized for morning sadhana, guided dhyana, and silent retreats.',
  },
];

// HeyGen Indian & Cloned Voice Options
export const HEYGEN_VOICE_PRESETS = [
  {
    id: '158e3393fea441679e6ecb87b03b8921',
    name: 'Mohan Sir - Cloned Voice (Psychosomatic Wisdom)',
    badge: 'Official Voice Clone',
    lang: 'Hindi',
  },
  {
    id: 'd8494a975dfb4e48afee6169675d7611',
    name: 'Mohan Sir - Masterclass Lecture Voice',
    badge: 'HD Recording Clone',
    lang: 'Hindi',
  },
  {
    id: '84c48528a3ee436c9dcf2c968584d97c',
    name: 'Sunny Sahil (Energetic Hindi Host)',
    badge: 'HeyGen Neural Voice',
    lang: 'Hindi',
  },
  {
    id: '1dd92b1106f8428fa8e70a7dadbaf465',
    name: 'Manu (Warm Conversational)',
    badge: 'HeyGen Neural Voice',
    lang: 'Hindi',
  },
];

export const SWAR_MULTILINGUAL_LANGUAGES = [
  {
    code: 'hi',
    name: 'Hindi (हिन्दी)',
    flag: '🇮🇳',
    defaultVoice: 'onyx',
    sample:
      'नमस्ते! मैं मोहन कलबुर्गी हूँ। स्वर योग के इस विशेष सत्र में आपका स्वागत है। आज हम सीखेंगे कि कैसे अपने श्वास के प्रवाह को नियंत्रित करके स्वास्थ्य और चेतना को जागृत किया जा सकता है।',
  },
  {
    code: 'mr',
    name: 'Marathi (मराठी)',
    flag: '🇮🇳',
    defaultVoice: 'echo',
    sample:
      'नमस्कार! मी मोहन कलबुर्गी आहे. स्वर योगाच्या या विशेष सत्रात आपले सहर्ष स्वागत आहे. आज आपण शिकणार आहोत की श्वासाच्या प्रवाहाचे नियमन करून आपण निरोगी आणि चैतन्यमय जीवन कसे जगू शकतो.',
  },
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧',
    defaultVoice: 'alloy',
    sample:
      'Namaste! I am Mohan Kalburgi. Welcome to this special session of Swar Yoga. Today, we will explore the profound science of breath and how to awaken higher consciousness.',
  },
  {
    code: 'gu',
    name: 'Gujarati (ગુજરાતી)',
    flag: '🇮🇳',
    defaultVoice: 'fable',
    sample:
      'નમસ્કાર! હું મોહન કાલબુર્ગી છું. સ્વર યોગના આ વિશેષ સત્રમાં આપનું હાર્દિક સ્વાગત છે. આજે આપણે શીખીશું કે કેવી રીતે શ્વાસના પ્રવાહને નિયંત્રિત કરી શકાય છે.',
  },
  {
    code: 'kn',
    name: 'Kannada (ಕನ್ನಡ)',
    flag: '🇮🇳',
    defaultVoice: 'onyx',
    sample:
      'ನಮಸ್ಕಾರ! ನಾನು ಮೋಹನ್ ಕಲ್ಬುರ್ಗಿ. ಸ್ವರ ಯೋಗದ ಈ ವಿಶೇಷ ಅಧಿವೇಶನಕ್ಕೆ ನಿಮಗೆ ಹೃತ್ಪೂರ್ವಕ ಸ್ವಾಗತ. ಇಂದು ನಾವು ಉಸಿರಾಟದ ನಿಯಂತ್ರಣದ ಮೂಲಕ ಜೀವನೋತ್ಸಾಹವನ್ನು ಹೆಚ್ಚಿಸುವ ರಹಸ್ಯವನ್ನು ತಿಳಿಯೋಣ.',
  },
];

export const SWAR_VOICE_STYLES = [
  { id: 'onyx', name: 'Mohan Sir - Calm Vedic Guru (गंभीर व शांत)', desc: 'Deep, resonant, meditative tone' },
  { id: 'echo', name: 'Mohan Sir - Masterclass Lecturer (व्याख्यान)', desc: 'Clear, authoritative, engaging cadence' },
  { id: 'alloy', name: 'Mohan Sir - Universal Narrator (सरल संवाद)', desc: 'Balanced, conversational, warm tone' },
  { id: 'nova', name: 'Mohan Sir - High Energy Prana (ऊर्जायुक्त)', desc: 'Uplifting, spirited, inspiring tone' },
  { id: 'fable', name: 'Mohan Sir - Puranic Storyteller (कथा वाचन)', desc: 'Rhythmic, melodious Vedic storytelling' },
];

export const SWAR_POSTURE_MODES = [
  {
    id: 'posture_sitting',
    key: 'sitting' as const,
    label: 'Sitting (पद्मासन)',
    icon: '🧘',
    desc: 'Seated Lotus with Chin Mudra',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
  },
  {
    id: 'posture_standing',
    key: 'standing' as const,
    label: 'Standing (सहज खड़े)',
    icon: '🧍',
    desc: 'Upright Keynote & Teaching Gestures',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4',
  },
  {
    id: 'posture_walking',
    key: 'walking' as const,
    label: 'Walking (प्राकृतिक चलना)',
    icon: '🚶',
    desc: 'Mindful Garden & Stage Pacing Flow',
    videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
  },
  {
    id: 'posture_running',
    key: 'running' as const,
    label: 'Running (ऊर्जावान दौड़ना)',
    icon: '🏃',
    desc: 'Active Outdoor Motion & Vitality',
    videoUrl: 'https://swaryogacrm.b-cdn.net/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4',
  },
  {
    id: 'posture_yoga',
    key: 'yoga' as const,
    label: 'Yoga Asana (सूर्य नमस्कार / प्राणायाम)',
    icon: '🕉️',
    desc: 'Breath & Asana Demonstration Flow',
    videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
  },
];

interface AvatarEditStudioProps {
  token?: string | null;
  initialVideoAvatarId?: string | null;
  onNavigateToProduction?: (finalAvatar: FinalAvatar) => void;
  onNavigateToFinalLibrary?: () => void;
}

export default function AvatarEditStudio({
  token,
  initialVideoAvatarId,
  onNavigateToProduction,
  onNavigateToFinalLibrary,
}: AvatarEditStudioProps) {
  // Stage Mode: '2d' (Photographic Stage) vs '3d' (WebGL Rig) vs 'heygen_video' (Real Video)
  const [stageMode, setStageMode] = useState<'2d' | '3d' | 'heygen_video'>('2d');

  // Active Selections
  const [selectedBgId, setSelectedBgId] = useState<string>('bg_kitchen');
  const [selectedClothId, setSelectedClothId] = useState<string>('cloth_chef_apron');
  const [selectedPostureId, setSelectedPostureId] = useState<string>('posture_cooking_presenter');
  const [selectedCutoutPresetId, setSelectedCutoutPresetId] = useState<string>('cutout_heygen_hd_official');
  const [activeCutoutUrl, setActiveCutoutUrl] = useState<string>(
    'https://resource2.heygen.ai/best_frame_selection/candidates/6252d07df49247eaa5413ebbbb35fcd0.jpg'
  );
  const [activeVideoUrl, setActiveVideoUrl] = useState<string>(
    'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4'
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [customCutoutInput, setCustomCutoutInput] = useState<string>('');

  // Positioning & Framing Controls
  const [posX, setPosX] = useState<number>(0); // -50% to +50%
  const [posY, setPosY] = useState<number>(0); // -30% to +30%
  const [scale, setScale] = useState<number>(100); // 50% to 160%
  const [flipped, setFlipped] = useState<boolean>(false);

  // Metadata & Voice
  const [avatarName, setAvatarName] = useState<string>('Mohan Sir (Ayurvedic Chef & Vedic Master)');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('158e3393fea441679e6ecb87b03b8921');
  const [selectedLang, setSelectedLang] = useState<string>('hi');
  const [selectedStyle, setSelectedStyle] = useState<string>('conversational');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('smile:80');

  // HeyGen Direct Video Generation State
  const [heygenScript, setHeygenScript] = useState<string>(
    'नमस्ते! मैं मोहन कलबुर्गी हूँ। स्वर योग के इस विशेष सत्र में आपका स्वागत है। आज हम सीखेंगे कि कैसे अपने श्वास के प्रवाह को नियंत्रित करके स्वास्थ्य और चेतना को जागृत किया जा सकता है।'
  );
  const [isRenderingHeygen, setIsRenderingHeygen] = useState<boolean>(false);
  const [heygenJobId, setHeygenJobId] = useState<string | null>(null);
  const [heygenRenderStatus, setHeygenRenderStatus] = useState<string | null>(null);
  const [heygenRenderedVideoUrl, setHeygenRenderedVideoUrl] = useState<string | null>(null);
  const [heygenError, setHeygenError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // UI Tabs: 'heygen' | 'framing' | 'clothes' | 'posture' | 'background' | 'voice'
  const [activeTab, setActiveTab] = useState<'heygen' | 'framing' | 'clothes' | 'posture' | 'background' | 'voice'>('heygen');

  // Persistence status
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUpdatingMaster, setIsUpdatingMaster] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const activeBg = MASTER_BACKGROUNDS.find((b) => b.id === selectedBgId) || MASTER_BACKGROUNDS[0];
  const activeCloth = MASTER_CLOTHING.find((c) => c.id === selectedClothId) || MASTER_CLOTHING[0];
  const activePosture = MASTER_POSTURES.find((p) => p.id === selectedPostureId) || MASTER_POSTURES[0];

  // Quick Reset Framing
  const handleResetFraming = () => {
    setPosX(0);
    setPosY(0);
    setScale(100);
    setFlipped(false);
  };

  // Video Library State (Presets + Custom Database Videos)
  const [videoList, setVideoList] = useState<AvatarVideoPresetItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const deletedIds: string[] = JSON.parse(localStorage.getItem('swar_deleted_video_ids') || '[]');
        return MOHAN_SIR_CUTOUT_PRESETS.filter(
          (p) => !deletedIds.includes(p.id) && !deletedIds.includes(p.videoUrl)
        );
      } catch {}
    }
    return MOHAN_SIR_CUTOUT_PRESETS;
  });
  const [loadingVideos, setLoadingVideos] = useState<boolean>(false);

  // Add / Edit Video Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<AvatarVideoPresetItem | null>(null);

  // Modal Form Inputs
  const [formVideoTitle, setFormVideoTitle] = useState<string>('');
  const [formVideoUrl, setFormVideoUrl] = useState<string>('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState<string>('');
  const [formBadge, setFormBadge] = useState<string>('1080p Full HD');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formClothId, setFormClothId] = useState<string>('cloth_white_kurta');
  const [isUploadingVideoFile, setIsUploadingVideoFile] = useState<boolean>(false);
  const [isSavingVideoDb, setIsSavingVideoDb] = useState<boolean>(false);
  const [videoFileError, setVideoFileError] = useState<string | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved custom videos from Bunny Database
  const fetchSourceVideos = async () => {
    try {
      setLoadingVideos(true);
      const res = await fetch('/api/avatar/source-videos');
      const data = await res.json();

      let deletedIds: string[] = [];
      if (typeof window !== 'undefined') {
        try {
          deletedIds = JSON.parse(localStorage.getItem('swar_deleted_video_ids') || '[]');
        } catch {}
      }

      const filteredPresets = MOHAN_SIR_CUTOUT_PRESETS.filter(
        (p) => !deletedIds.includes(p.id) && !deletedIds.includes(p.videoUrl)
      );

      if (data.success && Array.isArray(data.videos)) {
        const dbMapped: AvatarVideoPresetItem[] = data.videos
          .filter((v: any) => !deletedIds.includes(v.id) && !deletedIds.includes(v.videoUrl) && !deletedIds.includes(v.video_url))
          .map((v: any) => ({
            id: v.id,
            name: v.name,
            badge: v.resolution || '1080p Full HD',
            url: v.thumbnailUrl || 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
            videoUrl: v.videoUrl || v.video_url,
            recommendedClothId: 'cloth_white_kurta',
            description: `Duration: ${Math.round(v.durationSeconds || 60)}s • Format: ${v.format || 'mp4'}`,
            isCustom: true,
          }));

        const merged = [...filteredPresets];
        for (const dbv of dbMapped) {
          if (!merged.some((m) => m.id === dbv.id || m.videoUrl === dbv.videoUrl)) {
            merged.push(dbv);
          }
        }
        setVideoList(merged);
      } else {
        setVideoList(filteredPresets);
      }
    } catch (err) {
      console.error('Failed to load source videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  // Master Twin AI Beauty & Face Glow Mode
  const [beautyFilterActive, setBeautyFilterActive] = useState<boolean>(true);
  const [glowLevel, setGlowLevel] = useState<number>(75);
  const [skinSmoothing, setSkinSmoothing] = useState<number>(80);
  const [studioLight, setStudioLight] = useState<string>('vedic_divine');

  // Master Digital Twin Feature Bank States
  const [isVaultGuideOpen, setIsVaultGuideOpen] = useState<boolean>(false);
  const [masterTwinStats, setMasterTwinStats] = useState({
    id: 'mohan_kalburgi_master_twin',
    name: 'Mohan Kalburgi',
    totalClips: 4,
    trainingMinutes: 12.5,
    usedVideoGB: 1.1,
    usedAudioHours: 0.3,
  });
  const [isFeedModalOpen, setIsFeedModalOpen] = useState<boolean>(false);
  const [feedCategory, setFeedCategory] = useState<'expression' | 'motion' | 'posture' | 'lecture'>('expression');
  const [feedSubType, setFeedSubType] = useState<string>('smile');
  const [feedTitle, setFeedTitle] = useState<string>('');
  const [feedVideoUrl, setFeedVideoUrl] = useState<string>('');
  const [feedDuration, setFeedDuration] = useState<number>(180);
  const [isUploadingFeedFile, setIsUploadingFeedFile] = useState<boolean>(false);
  const [isSubmittingFeed, setIsSubmittingFeed] = useState<boolean>(false);
  const feedFileInputRef = useRef<HTMLInputElement>(null);

  // Create New Avatar Form (Auto 9-Numerical Code, Multi-Videos & Briefs)
  interface MultiVideoItem {
    id: string;
    file?: File;
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    durationSeconds: number;
    brief: string;
    category: 'expression' | 'motion' | 'posture' | 'lecture';
    subType: string;
    isUploading?: boolean;
  }
  const [isCreateAvatarModalOpen, setIsCreateAvatarModalOpen] = useState(false);
  const [createAvatarCode, setCreateAvatarCode] = useState('');
  const [createAvatarName, setCreateAvatarName] = useState('');
  const [createMainLanguage, setCreateMainLanguage] = useState('hi');
  const [createOverallBrief, setCreateOverallBrief] = useState(
    'Vedic wisdom, Swar Yoga breath regulation, and Sattvic lifestyle guide. Speaks with peaceful cadence, natural smile, and calm gestures.'
  );
  const [multiVideos, setMultiVideos] = useState<MultiVideoItem[]>([]);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Load Master Twin profile
  const fetchMasterTwinProfile = async () => {
    try {
      const res = await fetch('/api/avatar/master-twin');
      const data = await res.json();
      if (data.success && data.profile) {
        setMasterTwinStats({
          id: data.profile.id,
          name: data.profile.name,
          totalClips: data.profile.totalClipsCount || 4,
          trainingMinutes: data.profile.totalTrainingMinutes || 12.5,
          usedVideoGB: data.profile.vaultStats?.usedVideoGB || 1.1,
          usedAudioHours: data.profile.vaultStats?.usedAudioHours || 0.3,
        });
        if (data.profile.beautySettings) {
          setGlowLevel(data.profile.beautySettings.glowLevel ?? 75);
          setSkinSmoothing(data.profile.beautySettings.skinSmoothing ?? 80);
          setStudioLight(data.profile.beautySettings.studioLight || 'vedic_divine');
          setBeautyFilterActive(data.profile.beautySettings.beautyFilterActive ?? true);
        }
      }
    } catch (err) {
      console.warn('Master twin profile fetch warning:', err);
    }
  };

  useEffect(() => {
    fetchSourceVideos();
    fetchMasterTwinProfile();
  }, []);

  // Upload 3-Minute Video to Bunny CDN for Master Twin
  const handleUploadFeedFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFeedFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatar-studio/master-twin-training');

      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Failed to upload video to Bunny CDN');
      }

      setFeedVideoUrl(data.url);
      if (!feedTitle) {
        const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setFeedTitle(`Mohan Sir - ${clean}`);
      }
    } catch (err: any) {
      alert('Upload error: ' + (err.message || err));
    } finally {
      setIsUploadingFeedFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Attach 3-Minute Video to Master Twin Feature Bank
  const handleSaveFeedRecording = async () => {
    if (!feedVideoUrl.trim() || !feedTitle.trim()) {
      alert('Please provide video title and video URL (or upload a 3-minute video).');
      return;
    }

    setIsSubmittingFeed(true);
    try {
      const res = await fetch('/api/avatar/master-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'feed_recording',
          category: feedCategory,
          subType: feedSubType,
          title: feedTitle.trim(),
          videoUrl: feedVideoUrl.trim(),
          durationSeconds: Number(feedDuration) || 180,
          description: `Master training clip for ${feedSubType} (${feedCategory})`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to attach clip to Master Twin');
      }

      const newPreset: AvatarVideoPresetItem = {
        id: data.clip?.id || `twin_clip_${Date.now()}`,
        name: feedTitle.trim(),
        badge: '⭐ Master Twin Trained',
        url: 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
        videoUrl: feedVideoUrl.trim(),
        recommendedClothId: 'cloth_white_kurta',
        description: `Training footage: ${feedSubType} • Duration: ${Math.round(feedDuration)}s`,
        isCustom: true,
      };

      setVideoList((prev) => [newPreset, ...prev]);
      handleSelectCutoutPreset(newPreset);
      setMasterTwinStats((prev) => ({
        ...prev,
        totalClips: prev.totalClips + 1,
        trainingMinutes: Math.round((prev.trainingMinutes + feedDuration / 60) * 10) / 10,
      }));

      setIsFeedModalOpen(false);
      setFeedTitle('');
      setFeedVideoUrl('');
      setNotification('🎉 New 3-Minute Recording Added to Master Twin! Identity Enhanced.');
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      alert('Error training Master Twin: ' + (err.message || err));
    } finally {
      setIsSubmittingFeed(false);
    }
  };

  // Open Create New Avatar Modal with Auto 9-Digit Code
  const handleOpenCreateAvatarModal = () => {
    const code = Math.floor(100000000 + Math.random() * 900000000).toString();
    setCreateAvatarCode(code);
    setCreateAvatarName(`Mohan Sir - ${code}`);
    setCreateMainLanguage('hi');
    setCreateOverallBrief(
      'Vedic wisdom, Swar Yoga breath regulation, and Sattvic lifestyle guide. Speaks with peaceful cadence, natural smile, and calm gestures.'
    );
    setMultiVideos([
      {
        id: `vid_${Date.now()}_1`,
        title: 'Mohan Sir - 3 Min Vedic Wisdom & Smile',
        videoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
        thumbnailUrl: 'https://resource2.heygen.ai/best_frame_selection/candidates/6252d07df49247eaa5413ebbbb35fcd0.jpg',
        durationSeconds: 180,
        brief: 'Seated teaching session with gentle smiling nuances and warm eye contact.',
        category: 'expression',
        subType: 'smile',
      },
    ]);
    setIsCreateAvatarModalOpen(true);
  };

  const generate9DigitCode = () => {
    const code = Math.floor(100000000 + Math.random() * 900000000).toString();
    setCreateAvatarCode(code);
    if (!createAvatarName || createAvatarName.startsWith('Avatar-') || createAvatarName.includes('Mohan Sir -')) {
      setCreateAvatarName(`Mohan Sir - ${code}`);
    }
  };

  const handleMultiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `file_${Date.now()}_${i}`;
      const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      const newItem: MultiVideoItem = {
        id: tempId,
        file,
        title: `Mohan Sir - ${cleanTitle}`,
        videoUrl: '',
        durationSeconds: 180,
        brief: `3-minute recording of ${cleanTitle}`,
        category: 'expression',
        subType: 'smile',
        isUploading: true,
      };

      setMultiVideos((prev) => [...prev, newItem]);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'avatar-studio/multi-training');

        const res = await fetch('/api/avatar/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          setMultiVideos((prev) =>
            prev.map((item) =>
              item.id === tempId ? { ...item, videoUrl: data.url, isUploading: false } : item
            )
          );
        } else {
          setMultiVideos((prev) =>
            prev.map((item) => (item.id === tempId ? { ...item, isUploading: false } : item))
          );
        }
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        setMultiVideos((prev) =>
          prev.map((item) => (item.id === tempId ? { ...item, isUploading: false } : item))
        );
      }
    }

    if (e.target) e.target.value = '';
  };

  const handleAddVideoSlot = () => {
    setMultiVideos((prev) => [
      ...prev,
      {
        id: `slot_${Date.now()}`,
        title: `Mohan Sir - 3 Min Recording ${prev.length + 1}`,
        videoUrl: '',
        durationSeconds: 180,
        brief: '3-minute feature clip for posture, walking gait, or expression training.',
        category: 'expression',
        subType: 'smile',
      },
    ]);
  };

  const handleRemoveVideoSlot = (id: string) => {
    setMultiVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUpdateVideoField = (id: string, field: keyof MultiVideoItem, value: any) => {
    setMultiVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleSaveCreateAvatar = async () => {
    if (!createAvatarName.trim()) {
      alert('Please provide an avatar name');
      return;
    }
    const validVideos = multiVideos.filter((v) => v.videoUrl.trim().length > 0);
    if (!validVideos.length) {
      alert('Please add or upload at least one 3-minute video recording with a valid URL');
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const res = await fetch('/api/avatar/master-twin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_new_avatar',
          avatarCode: createAvatarCode,
          avatarName: createAvatarName.trim(),
          mainLanguage: createMainLanguage,
          overallBrief: createOverallBrief.trim(),
          videos: validVideos.map((v) => ({
            title: v.title.trim(),
            videoUrl: v.videoUrl.trim(),
            thumbnailUrl: v.thumbnailUrl || '',
            durationSeconds: v.durationSeconds || 180,
            brief: v.brief.trim(),
            category: v.category,
            subType: v.subType,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create new avatar');
      }

      const newPreset: AvatarVideoPresetItem = {
        id: data.avatarId || `v_avatar_${createAvatarCode}`,
        name: createAvatarName.trim(),
        badge: `Code: ${createAvatarCode}`,
        url: validVideos[0]?.thumbnailUrl || 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
        videoUrl: validVideos[0]?.videoUrl || '',
        recommendedClothId: 'cloth_white_kurta',
        description: `Autonomous Avatar: ${createMainLanguage.toUpperCase()} • ${validVideos.length} Multi-Videos`,
        isCustom: true,
      };

      setVideoList((prev) => [newPreset, ...prev]);
      handleSelectCutoutPreset(newPreset);
      setNotification(`🎉 Avatar "${createAvatarName}" (Code: ${createAvatarCode}) Created! Continuous Training Initialized.`);
      setTimeout(() => setNotification(null), 5000);
      setIsCreateAvatarModalOpen(false);
      fetchSourceVideos();
    } catch (err: any) {
      alert('Error creating avatar: ' + (err.message || err));
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Switch Cutout / Video Preset
  const handleSelectCutoutPreset = (preset: AvatarVideoPresetItem) => {
    setSelectedCutoutPresetId(preset.id);
    setActiveCutoutUrl(preset.url);
    if (preset.videoUrl) {
      setActiveVideoUrl(preset.videoUrl);
    }
    if (preset.recommendedClothId) {
      setSelectedClothId(preset.recommendedClothId);
    }
  };

  // Open Add Video Modal
  const handleOpenAddModal = () => {
    setFormVideoTitle('');
    setFormVideoUrl('');
    setFormThumbnailUrl('https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png');
    setFormBadge('1080p Full HD');
    setFormDescription('High-definition lecture recording for Mohan Sir avatar');
    setFormClothId('cloth_white_kurta');
    setVideoFileError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Video Modal
  const handleOpenEditModal = (e: React.MouseEvent, item: AvatarVideoPresetItem) => {
    e.stopPropagation();
    setEditingItem(item);
    setFormVideoTitle(item.name);
    setFormVideoUrl(item.videoUrl);
    setFormThumbnailUrl(item.url);
    setFormBadge(item.badge || '1080p HD');
    setFormDescription(item.description || '');
    setFormClothId(item.recommendedClothId || 'cloth_white_kurta');
    setVideoFileError(null);
    setIsEditModalOpen(true);
  };

  // Upload Video File to Bunny CDN
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideoFile(true);
    setVideoFileError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'avatar-studio/videos');

      const res = await fetch('/api/avatar/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload video to Bunny CDN');
      }

      setFormVideoUrl(data.url);
      if (!formVideoTitle) {
        setFormVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setVideoFileError(err.message || 'Error uploading video');
    } finally {
      setIsUploadingVideoFile(false);
    }
  };

  // Save New Video to Bunny Database
  const handleSaveNewVideo = async () => {
    if (!formVideoTitle.trim() || !formVideoUrl.trim()) {
      alert('Please provide both video name and video URL (or upload a video file).');
      return;
    }

    setIsSavingVideoDb(true);
    try {
      const res = await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          name: formVideoTitle.trim(),
          videoUrl: formVideoUrl.trim(),
          thumbnailUrl: formThumbnailUrl.trim() || 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
          resolution: formBadge.trim() || '1080p Full HD',
          durationSeconds: 60,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save video to database');
      }

      const newItem: AvatarVideoPresetItem = {
        id: data.video?.id || `src_vid_${Date.now()}`,
        name: formVideoTitle.trim(),
        badge: formBadge.trim() || '1080p Full HD',
        url: formThumbnailUrl.trim() || 'https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/d99f90faf07d38394e0662fc419db063.png',
        videoUrl: formVideoUrl.trim(),
        recommendedClothId: formClothId,
        description: formDescription.trim() || 'Custom uploaded lecture video',
        isCustom: true,
      };

      setVideoList((prev) => [newItem, ...prev]);
      handleSelectCutoutPreset(newItem);
      setIsAddModalOpen(false);
      setNotification('🎉 New Video Added & Loaded Successfully!');
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert('Error saving video: ' + err.message);
    } finally {
      setIsSavingVideoDb(false);
    }
  };

  // Update Video in Bunny Database
  const handleSaveEditVideo = async () => {
    if (!editingItem || !formVideoTitle.trim() || !formVideoUrl.trim()) return;

    setIsSavingVideoDb(true);
    try {
      const res = await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          id: editingItem.id,
          name: formVideoTitle.trim(),
          videoUrl: formVideoUrl.trim(),
          thumbnailUrl: formThumbnailUrl.trim(),
          resolution: formBadge.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update video in database');
      }

      setVideoList((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: formVideoTitle.trim(),
                videoUrl: formVideoUrl.trim(),
                url: formThumbnailUrl.trim() || item.url,
                badge: formBadge.trim() || item.badge,
                description: formDescription.trim() || item.description,
                recommendedClothId: formClothId,
              }
            : item
        )
      );

      if (selectedCutoutPresetId === editingItem.id) {
        setActiveVideoUrl(formVideoUrl.trim());
        if (formThumbnailUrl.trim()) setActiveCutoutUrl(formThumbnailUrl.trim());
      }

      setIsEditModalOpen(false);
      setEditingItem(null);
      setNotification('✅ Video Details Updated Successfully!');
      setTimeout(() => setNotification(null), 3500);
    } catch (err: any) {
      alert('Error updating video: ' + err.message);
    } finally {
      setIsSavingVideoDb(false);
    }
  };

  // Delete Video from Bunny Database & Local Library
  const handleDeleteVideo = async (e: React.MouseEvent, item: AvatarVideoPresetItem) => {
    e.stopPropagation();
    const confirmed = window.confirm(`Are you sure you want to delete "${item.name}"?`);
    if (!confirmed) return;

    // 1. Immediately remove from local state so UI updates instantly
    const remaining = videoList.filter((v) => v.id !== item.id && v.videoUrl !== item.videoUrl);
    setVideoList(remaining);

    // 2. Persist deleted ID & URL in localStorage so presets or deleted videos never resurrect
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('swar_deleted_video_ids') || '[]');
      if (item.id && !deletedIds.includes(item.id)) deletedIds.push(item.id);
      if (item.videoUrl && !deletedIds.includes(item.videoUrl)) deletedIds.push(item.videoUrl);
      localStorage.setItem('swar_deleted_video_ids', JSON.stringify(deletedIds));
    } catch {}

    // 3. Switch active video if the deleted one was playing
    if (selectedCutoutPresetId === item.id || activeVideoUrl === item.videoUrl) {
      if (remaining.length > 0) {
        handleSelectCutoutPreset(remaining[0]);
      }
    }

    setNotification(`🗑️ Video "${item.name}" deleted from library!`);
    setTimeout(() => setNotification(null), 3500);

    // 4. Delete from Bunny Database
    try {
      await fetch('/api/avatar/source-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: item.id, videoUrl: item.videoUrl }),
      });
    } catch (err: any) {
      console.warn('Backend delete note:', err);
    }
  };

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Poll HeyGen video status
  const startPollingHeyGenStatus = (videoId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/avatar/heygen-render?videoId=${encodeURIComponent(videoId)}`);
        const data = await res.json();
        if (data.success) {
          setHeygenRenderStatus(data.status);
          if (data.status === 'completed' && data.videoUrl) {
            setHeygenRenderedVideoUrl(data.videoUrl);
            setActiveVideoUrl(data.videoUrl);
            setStageMode('heygen_video');
            setIsRenderingHeygen(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            setNotification('🎉 Real HeyGen 1080p HD Video Rendered Successfully!');
            setTimeout(() => setNotification(null), 5000);
          } else if (data.status === 'failed') {
            setIsRenderingHeygen(false);
            if (pollingRef.current) clearInterval(pollingRef.current);
            alert('HeyGen video render failed: ' + (data.errorMessage || 'Unknown error'));
          }
        }
      } catch (err) {
        console.error('Polling HeyGen error:', err);
      }
    }, 4000);
  };

  // Trigger Swar Yoga In-House Neural Video Synthesis
  const handleTriggerSwarRender = async () => {
    if (!heygenScript.trim()) {
      alert('Please enter a script text for Mohan Sir to speak.');
      return;
    }
    setIsRenderingHeygen(true);
    setHeygenRenderStatus('synthesizing_speech');
    setHeygenRenderedVideoUrl(null);
    setHeygenError(null);

    // Map active posture to 'sitting' | 'standing' | 'walking'
    const postureType: 'sitting' | 'standing' | 'walking' = selectedPostureId.includes('sit') || selectedPostureId.includes('padmasana') || selectedPostureId.includes('sukhasana')
      ? 'sitting'
      : selectedPostureId.includes('walk')
      ? 'walking'
      : 'standing';

    try {
      const res = await fetch('/api/admin/e-learning/ai-video/swar-engine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          avatarName,
          sourceAvatarUrl: activeCutoutUrl,
          cutoutUrl: activeCutoutUrl,
          posture: postureType,
          backgroundId: selectedBgId,
          script: heygenScript.trim(),
          language: selectedLang,
          voiceId: selectedVoiceId,
          framing: { posX, posY, scale, flipped },
        }),
      });

      const data = await res.json();
      if (data.success && data.job) {
        setHeygenRenderStatus('completed');
        if (data.job.videoUrl) {
          setHeygenRenderedVideoUrl(data.job.videoUrl);
          setActiveVideoUrl(data.job.videoUrl);
          setStageMode('heygen_video');
        }
        setIsRenderingHeygen(false);
        setNotification('🎉 Swar Yoga HD Avatar Video Synthesized Successfully!');
        setTimeout(() => setNotification(null), 5000);
      } else {
        setIsRenderingHeygen(false);
        setHeygenError(data.error || 'Failed to synthesize avatar video.');
      }
    } catch (err: any) {
      setIsRenderingHeygen(false);
      console.error('Submit Swar Video error:', err);
      setHeygenError(err.message || 'Error communicating with Swar Neural Engine.');
    }
  };

  // Instant Audio Synthesis (1-second preview in Hindi/Marathi)
  const handleListenQuickAudio = async () => {
    if (!heygenScript.trim()) {
      alert('Please enter a script text to preview audio.');
      return;
    }
    setIsPlayingAudio(true);
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/quick-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: heygenScript,
          language: selectedLang,
          voiceId: selectedVoiceId,
        }),
      });
      const data = await res.json();
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.onended = () => setIsPlayingAudio(false);
        audio.onerror = () => setIsPlayingAudio(false);
        await audio.play();
      } else {
        setIsPlayingAudio(false);
        alert(data.error || 'Failed to generate audio preview');
      }
    } catch (err: any) {
      setIsPlayingAudio(false);
      alert('Error playing audio: ' + err.message);
    }
  };

  // 1. Save as Final Avatar
  const handleSaveAsFinalAvatar = async () => {
    if (!avatarName.trim()) {
      alert('Please enter a name for your avatar.');
      return;
    }
    setIsSaving(true);
    try {
      const payload: Partial<FinalAvatar> = {
        name: avatarName.trim(),
        videoAvatarId: initialVideoAvatarId || 'v_avatar_mohan_sir',
        voiceAvatarId: selectedVoiceId,
        backgroundId: selectedBgId,
        clothingId: selectedClothId,
        defaultSpeakingStyle: selectedStyle,
        defaultEmotion: selectedEmotion,
        defaultLanguage: selectedLang,
        previewImageUrl: activeCutoutUrl,
        customCutoutUrl: activeCutoutUrl,
        framingJson: JSON.stringify({ posX, posY, scale, flipped, videoUrl: activeVideoUrl }),
      };

      const res = await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_final_avatar', payload }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification('✅ Final Avatar Saved Successfully to Library!');
        setTimeout(() => setNotification(null), 3500);
        if (onNavigateToFinalLibrary) {
          setTimeout(onNavigateToFinalLibrary, 1200);
        }
      } else {
        alert(data.error || 'Failed to save final avatar');
      }
    } catch (err: any) {
      console.error('Save final avatar error:', err);
      alert('Error saving avatar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 2. Update Mohan Sir Master Twin in Database
  const handleUpdateMasterTwin = async () => {
    setIsUpdatingMaster(true);
    try {
      const payload: Partial<VideoAvatar> = {
        id: 'v_avatar_mohan_sir',
        name: 'Mohan Kalburgi (Official HeyGen HD Avatar)',
        cutoutUrl: activeCutoutUrl,
        transparentAvatarUrl: activeCutoutUrl,
        thumbnailUrl: activeCutoutUrl,
        originalVideoUrl: activeVideoUrl,
        languageCapabilities: ['hi', 'mr', 'en', 'gu', 'kn', 'ta', 'te', 'bn'],
        status: 'ready',
      };

      const res = await fetch('/api/avatar/studio-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_video_avatar', payload }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification('🌟 Master Mohan Sir Digital Twin Updated to HeyGen HD!');
        setTimeout(() => setNotification(null), 3500);
      } else {
        alert(data.error || 'Failed to update master twin');
      }
    } catch (err: any) {
      console.error('Update master twin error:', err);
      alert('Error updating master avatar: ' + err.message);
    } finally {
      setIsUpdatingMaster(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-amber-950/60 via-purple-950/50 to-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow">
                <Sparkles size={11} />
                <span>Swar Yoga In-House AI Engine</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/40">
                1080p Digital Human • Zero 3rd-Party Fees
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Mohan Sir Digital Human Transformation Studio</span>
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl">
              Proprietary in-house digital avatar engine for Mohan Sir. Generated from authentic source footage with automatic background changing, posture rigging (Sitting, Standing, Walking), and multilingual neural speech synthesis.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
              title="Add a new custom video or lecture"
            >
              <Plus size={14} className="text-white" />
              <span>Add Video</span>
            </button>

            <button
              onClick={handleUpdateMasterTwin}
              disabled={isUpdatingMaster}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Save cutout as the default master avatar for Mohan Sir"
            >
              {isUpdatingMaster ? (
                <RefreshCw size={13} className="animate-spin text-amber-400" />
              ) : (
                <RefreshCw size={13} className="text-amber-400" />
              )}
              <span>Update Master Twin</span>
            </button>

            <button
              onClick={handleSaveAsFinalAvatar}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {isSaving ? (
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={13} />
              )}
              <span>Save Final Avatar ➔</span>
            </button>
          </div>
        </div>

        {notification && (
          <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Interactive Stage (Left) & Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Stage Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl relative">
            {/* Stage Toolbar */}
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera size={13} className="text-amber-400" />
                  <span>Viewport Mode</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                  {stageMode === 'heygen_video' ? '1080p HD Video Player' : stageMode === '2d' ? '2D Stage Composite' : '3D WebGL Rig'}
                </span>
              </div>

              {/* Viewport Mode Switch: 2D Stage vs 3D Rig vs Video */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setStageMode('2d')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    stageMode === '2d'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Photographic stage composite (Outfits, Backgrounds & Framing)"
                >
                  <Eye size={12} />
                  <span>2D Composite Avatar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageMode('3d')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    stageMode === '3d'
                      ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Three.js 3D viewport rig"
                >
                  <Box size={12} />
                  <span>3D Rig</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStageMode('heygen_video')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    stageMode === 'heygen_video'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title="Optional video playback preview"
                >
                  <Video size={12} />
                  <span>Video Preview</span>
                </button>
              </div>
            </div>

            {/* Quick Posture Selector Bar */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/60 gap-2 flex-wrap">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>Body Posture:</span>
              </span>
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {SWAR_POSTURE_MODES.map((pm) => {
                  const isSelected = selectedPostureId === pm.id || (pm.key === 'sitting' && selectedPostureId.includes('sit'));
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => {
                        setSelectedPostureId(pm.id);
                        if (pm.videoUrl) {
                          setActiveVideoUrl(pm.videoUrl);
                        }
                        if (pm.key === 'sitting') {
                          setPosY(5);
                          setScale(105);
                        } else if (pm.key === 'walking') {
                          setPosY(0);
                          setScale(95);
                        } else {
                          setPosY(0);
                          setScale(100);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800/80'
                      }`}
                    >
                      <span>{pm.icon}</span>
                      <span>{pm.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage Canvas */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-inner group">
              {/* MODE 1: 1080p Neural Video Player (Real Human) */}
              {stageMode === 'heygen_video' && (
                <div className="relative w-full h-full bg-black flex items-center justify-center">
                  <video
                    key={activeVideoUrl}
                    src={activeVideoUrl}
                    autoPlay
                    loop
                    playsInline
                    controls
                    style={{
                      filter: beautyFilterActive
                        ? `brightness(${1 + (glowLevel - 50) * 0.0035}) contrast(${1 + (glowLevel - 50) * 0.002}) saturate(${1 + (glowLevel - 50) * 0.003}) drop-shadow(0 0 ${glowLevel * 0.12}px rgba(251, 191, 36, ${glowLevel * 0.0035}))`
                        : undefined,
                    }}
                    className="w-full h-full object-contain transition-all duration-300"
                  />
                  {/* Floating Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
                    <div className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur text-[11px] text-amber-300 font-bold border border-amber-500/40 shadow flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Swar Yoga 1080p Neural Avatar: Mohan Kalburgi</span>
                    </div>
                    {beautyFilterActive && (
                      <div className="px-2 py-0.5 rounded-lg bg-amber-500/25 backdrop-blur text-[10px] text-amber-200 font-bold border border-amber-400/50 shadow flex items-center gap-1 animate-fadeIn">
                        <Sparkles size={11} className="text-amber-300" />
                        <span>AI Beauty Glow {glowLevel}% • {studioLight.replace('_', ' ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: 3D WebGL Rig */}
              {stageMode === '3d' && (
                <div className="w-full h-full">
                  <Avatar3DCanvas
                    avatarCutoutUrl={activeCutoutUrl}
                    clothingId={selectedClothId}
                    clothingName={activeCloth.name}
                    backgroundUrl={activeBg.imageUrl}
                    postureId={selectedPostureId}
                  />
                </div>
              )}

              {/* MODE 3: 2D Photographic Stage Composite */}
              {stageMode === '2d' && (
                <>
                  <img
                    src={activeBg.imageUrl}
                    alt={activeBg.name}
                    className="w-full h-full object-cover brightness-75 select-none transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  <div className="absolute inset-0 flex items-end justify-center pointer-events-none overflow-hidden">
                    <img
                      src={activeCutoutUrl}
                      alt="Mohan Sir Avatar"
                      style={{
                        transform: `translate(${posX}%, ${posY}%) scale(${scale / 100}) scaleX(${flipped ? -1 : 1})`,
                        transformOrigin: 'bottom center',
                        transition: 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
                      }}
                      className="w-72 h-80 sm:w-80 sm:h-96 md:w-[460px] md:h-[460px] object-contain object-bottom filter drop-shadow-[0_25px_45px_rgba(0,0,0,0.95)] select-none pointer-events-auto"
                    />
                  </div>

                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                    <span className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur text-[11px] text-amber-300 font-bold border border-amber-500/30 shadow flex items-center gap-1.5">
                      <span>{activeBg.badge}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-white">{activeBg.name}</span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-black/85 backdrop-blur text-[11px] text-slate-200 font-semibold border border-slate-700/60 shadow flex items-center gap-1.5">
                      <span>{activeCloth.icon}</span>
                      <span>{activeCloth.name}</span>
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Interactive Framing Sliders (Available in 2D Mode) */}
            {stageMode === '2d' && (
              <div className="mt-4 p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <Move size={13} />
                    <span>Avatar Framing & Position</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleResetFraming}
                    className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <RotateCw size={11} />
                    <span>Reset Center</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Horizontal (X)</span>
                      <span className="font-mono text-amber-300 font-bold">{posX}%</span>
                    </div>
                    <input
                      type="range"
                      min={-50}
                      max={50}
                      value={posX}
                      onChange={(e) => setPosX(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Vertical (Y)</span>
                      <span className="font-mono text-amber-300 font-bold">{posY}%</span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      value={posY}
                      onChange={(e) => setPosY(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Scale / Zoom</span>
                      <span className="font-mono text-amber-300 font-bold">{scale}%</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={160}
                      value={scale}
                      onChange={(e) => setScale(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setFlipped(!flipped)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      flipped
                        ? 'bg-purple-600/30 text-purple-300 border-purple-500'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    <FlipHorizontal size={13} />
                    <span>{flipped ? 'Mirrored (Flipped)' : 'Normal Orientation'}</span>
                  </button>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => { setPosX(-25); setPosY(0); setScale(105); }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Left 1/3
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPosX(0); setPosY(0); setScale(100); }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPosX(25); setPosY(0); setScale(105); }}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                    >
                      Right 1/3
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Customizer Tabs & HeyGen Generator (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-5">
            {/* Title / Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Custom Avatar Title
              </label>
              <input
                type="text"
                value={avatarName}
                onChange={(e) => setAvatarName(e.target.value)}
                placeholder="e.g. Mohan Sir - Ayurvedic Chef & Vedic Master"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
              />
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-950 rounded-2xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('heygen')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'heygen'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow'
                    : 'text-amber-400 hover:text-white'
                }`}
              >
                <span>🕉️ Swar Neural Engine</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('framing')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'framing'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>📹 Videos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                  {videoList.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('clothes')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                  activeTab === 'clothes'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Wardrobe
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('background')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                  activeTab === 'background'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Scene
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('voice')}
                className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center cursor-pointer ${
                  activeTab === 'voice'
                    ? 'bg-amber-500 text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Voice
              </button>
            </div>

            {/* TAB 0: Swar Yoga In-House Master Digital Twin & Neural Video Engine */}
            {activeTab === 'heygen' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Master Digital Twin Profile & Training Vault Card */}
                <div className="p-4 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-slate-950 border border-amber-500/40 rounded-2xl space-y-3 shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
                        <User size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white">Mohan Kalburgi (Master Twin)</h4>
                          <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                            ID: {masterTwinStats.id}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">Continuous Multi-Angle Training Vault</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleOpenCreateAvatarModal}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-[11px] shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95 ring-1 ring-amber-400/50"
                      >
                        <Sparkles size={12} className="stroke-[2.5]" />
                        <span>+ Create New Avatar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFeedModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[11px] border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <Plus size={12} className="stroke-[2.5]" />
                        <span>+ Feed 3-Min Video</span>
                      </button>
                    </div>
                  </div>

                  {/* Vault Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 block font-bold">10 GB Video Vault</span>
                      <span className="text-amber-300 font-extrabold text-xs">{masterTwinStats.usedVideoGB || 1.1} / 10 GB</span>
                      <span className="text-[9px] text-slate-500 block">{masterTwinStats.totalClips} / 20 Videos</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 block font-bold">Deep Audio Bank</span>
                      <span className="text-emerald-400 font-extrabold text-xs">{masterTwinStats.usedAudioHours || 0.3} / 3.0 Hrs</span>
                      <span className="text-[9px] text-slate-500 block">Lectures Nuance</span>
                    </div>
                    <div className="p-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
                      <span className="text-[9px] text-slate-400 block font-bold">Motion Bank</span>
                      <span className="text-purple-300 font-extrabold text-xs">Full-Body Rig</span>
                      <span className="text-[9px] text-slate-500 block">Padmasana, Walk, Run</span>
                    </div>
                  </div>

                  {/* 10 GB Capacity Bar & Blueprint Guide Trigger */}
                  <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-800/80">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                        <span>Vault Footage Capacity (10-20 Videos • 2-3 Hrs Voice)</span>
                        <span className="text-amber-400 font-mono">{Math.round((((masterTwinStats.usedVideoGB || 1.1) / 10) * 100))}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(8, ((masterTwinStats.usedVideoGB || 1.1) / 10) * 100))}%` }}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsVaultGuideOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-bold text-[10px] border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all shrink-0"
                    >
                      <Film size={11} />
                      <span>Nuance Guide</span>
                    </button>
                  </div>
                </div>

                {/* Section A: AI Face Glow & Beauty Engine (CodeFormer / GFPGAN) */}
                <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                      <Sparkles size={14} className="text-amber-400" />
                      <span>AI Face Glow & Beauty Mode (CodeFormer / GFPGAN)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={beautyFilterActive}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setBeautyFilterActive(val);
                          fetch('/api/avatar/master-twin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'update_settings',
                              beautySettings: {
                                beautyFilterActive: val,
                                glowLevel,
                                skinSmoothing,
                                studioLight,
                              },
                            }),
                          }).catch(() => {});
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                  </div>

                  {beautyFilterActive && (
                    <div className="space-y-3 pt-1 animate-fadeIn">
                      <div className="grid grid-cols-2 gap-3">
                        {/* Glow Slider */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                            <span className="text-slate-300">Face Glow & Radiance</span>
                            <span className="text-amber-400 font-mono">{glowLevel}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={glowLevel}
                            onChange={(e) => setGlowLevel(Number(e.target.value))}
                            onMouseUp={() => {
                              fetch('/api/avatar/master-twin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'update_settings',
                                  beautySettings: { beautyFilterActive: true, glowLevel, skinSmoothing, studioLight },
                                }),
                              }).catch(() => {});
                            }}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>

                        {/* Smoothing Slider */}
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1 font-bold">
                            <span className="text-slate-300">Wrinkle Smoothing</span>
                            <span className="text-amber-400 font-mono">{skinSmoothing}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={skinSmoothing}
                            onChange={(e) => setSkinSmoothing(Number(e.target.value))}
                            onMouseUp={() => {
                              fetch('/api/avatar/master-twin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'update_settings',
                                  beautySettings: { beautyFilterActive: true, glowLevel, skinSmoothing, studioLight },
                                }),
                              }).catch(() => {});
                            }}
                            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Studio Lighting Style */}
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold mb-1.5">Studio Light Atmosphere</span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                          {[
                            { id: 'vedic_divine', name: '☀️ Vedic Gold', desc: 'Warm temple radiance' },
                            { id: 'studio_softbox', name: '💡 Softbox HD', desc: 'Even neutral broadcast' },
                            { id: 'ashram_natural', name: '🌿 Ashram Sun', desc: 'Pure morning sunlight' },
                            { id: 'golden_hour', name: '🌅 Golden Hour', desc: 'Deep warm sunset' },
                          ].map((light) => {
                            const isCur = studioLight === light.id;
                            return (
                              <button
                                key={light.id}
                                type="button"
                                onClick={() => {
                                  setStudioLight(light.id);
                                  fetch('/api/avatar/master-twin', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'update_settings',
                                      beautySettings: {
                                        beautyFilterActive: true,
                                        glowLevel,
                                        skinSmoothing,
                                        studioLight: light.id,
                                      },
                                    }),
                                  }).catch(() => {});
                                }}
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                  isCur
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <span className="block">{light.name}</span>
                                <span className="text-[9px] text-slate-500 block truncate">{light.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section B & C: Body Posture & Motion Rigging (Sitting, Standing, Walking, Running, Yoga Asana) */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>Full-Body Motion & Asanas (5 Modes)</span>
                    <span className="text-[10px] text-amber-400 font-normal">Rigged with Master Motion Bank</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SWAR_POSTURE_MODES.map((pm) => {
                      const isSelected = selectedPostureId === pm.id || (pm.key === 'sitting' && selectedPostureId.includes('sit'));
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setSelectedPostureId(pm.id);
                            if (pm.videoUrl) {
                              setActiveVideoUrl(pm.videoUrl);
                            }
                            if (pm.key === 'sitting') {
                              setPosY(5);
                              setScale(105);
                            } else if (pm.key === 'walking') {
                              setPosY(0);
                              setScale(95);
                            } else if (pm.key === 'running') {
                              setPosY(0);
                              setScale(90);
                            } else if ((pm.key as string) === 'yoga_asana') {
                              setPosY(2);
                              setScale(100);
                            } else {
                              setPosY(0);
                              setScale(100);
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/70 text-white shadow ring-1 ring-amber-500/40'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                          }`}
                        >
                          <div className="text-base mb-1">{pm.icon}</div>
                          <div className="text-[11px] font-bold text-white leading-tight">{pm.label}</div>
                          <div className="text-[9px] text-slate-400 truncate mt-0.5">{pm.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Multilingual Language Tabs */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                    <span>4. Multilingual Speech & Language</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Real Hindi & Marathi Enabled</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    {SWAR_MULTILINGUAL_LANGUAGES.map((lang) => {
                      const isSelected = selectedLang === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => {
                            setSelectedLang(lang.code);
                            setSelectedVoiceId(lang.defaultVoice);
                            setHeygenScript(lang.sample);
                            // Immediately switch video and play in that language
                            if (lang.code === 'mr') {
                              setActiveVideoUrl('https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4');
                              setStageMode('heygen_video');
                            } else if (lang.code === 'hi') {
                              setActiveVideoUrl('https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4');
                              setStageMode('heygen_video');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md'
                              : 'text-slate-400 hover:text-white bg-slate-900/60'
                          }`}
                        >
                          <span>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Voice Style Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Mohan Sir Vocal Cadence & Tone
                  </label>
                  <select
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                  >
                    {SWAR_VOICE_STYLES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.desc})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Script Box with Instant Audio Test */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <span>Script for Mohan Sir to Speak</span>
                      <span className="text-[10px] text-amber-400 font-mono uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                        {selectedLang}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isPlayingAudio}
                        onClick={handleListenQuickAudio}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                        title="Hear Mohan Sir speak this exact text immediately"
                      >
                        {isPlayingAudio ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            <span>Playing...</span>
                          </>
                        ) : (
                          <>
                            <Volume2 size={12} />
                            <span>🔊 Listen Audio (Instant)</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStageMode('heygen_video');
                          if (selectedLang === 'mr') {
                            setActiveVideoUrl('https://swaryogacrm.b-cdn.net/materials/mohan_sir_marathi_real.mp4');
                          } else {
                            setActiveVideoUrl('https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4');
                          }
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-[11px] border border-emerald-500/40 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm"
                        title="Play Mohan Sir video in this language"
                      >
                        <Play size={12} />
                        <span>▶️ Play Video</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={heygenScript}
                    onChange={(e) => setHeygenScript(e.target.value)}
                    placeholder="Enter script text in Hindi, Marathi, English, Gujarati, or Kannada..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 font-sans leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1">
                    <span>1080p Full HD • Neural Lip-Sync Enabled</span>
                    <span>{heygenScript.length} characters</span>
                  </div>
                </div>

                {/* Render Button & Progress */}
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isRenderingHeygen}
                    onClick={handleTriggerSwarRender}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 text-black font-black text-xs rounded-xl shadow-xl active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isRenderingHeygen ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Synthesizing Video ({heygenRenderStatus})...</span>
                      </>
                    ) : (
                      <>
                        <Film size={16} />
                        <span>Synthesize Swar Yoga HD Avatar Video Now ➔</span>
                      </>
                    )}
                  </button>

                  {isRenderingHeygen && (
                    <div className="p-3.5 bg-slate-950 border border-amber-500/30 rounded-xl text-xs space-y-2 animate-fadeIn">
                      <div className="flex justify-between text-[11px] text-slate-300 font-semibold">
                        <span>Swar Neural Engine Processing</span>
                        <span className="font-mono text-amber-400 capitalize">{heygenRenderStatus}...</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-400 h-full w-3/4 animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-emerald-400">✓ 1. Multilingual Audio (TTS)</span>
                        <span className="flex items-center gap-1 text-amber-400 animate-pulse">⚙ 2. Posture & 3D Alignment</span>
                        <span className="flex items-center gap-1 text-slate-500">○ 3. Neural Lip-Sync</span>
                        <span className="flex items-center gap-1 text-slate-500">○ 4. Scene Compositing</span>
                      </div>
                    </div>
                  )}

                  {heygenError && (
                    <div className="p-3.5 bg-rose-950/70 border border-rose-500/50 rounded-xl text-xs space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                          <AlertCircle size={15} className="text-rose-400 shrink-0" />
                          <span>Synthesis Notice</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHeygenError(null)}
                          className="text-rose-400 hover:text-white text-xs px-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                        {heygenError}
                      </p>
                    </div>
                  )}

                  {heygenRenderedVideoUrl && (
                    <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/50 rounded-xl text-xs space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                          <CheckCircle2 size={15} />
                          <span>1080p Avatar Video Synthesized!</span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                          Ready on Bunny CDN
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStageMode('heygen_video');
                            setActiveVideoUrl(heygenRenderedVideoUrl);
                          }}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1 cursor-pointer shadow"
                        >
                          <Play size={12} />
                          <span>Play in Viewport</span>
                        </button>
                        <a
                          href={heygenRenderedVideoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-lg inline-flex items-center gap-1"
                        >
                          <Download size={12} />
                          <span>Download MP4</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: Persona & Cutout Presets */}
            {activeTab === 'framing' && (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>Mohan Sir Video Library</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                      {videoList.length} Videos
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={fetchSourceVideos}
                      disabled={loadingVideos}
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                      title="Refresh video list"
                    >
                      <RefreshCw size={12} className={loadingVideos ? 'animate-spin text-amber-400' : ''} />
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-[11px] flex items-center gap-1 shadow transition-all cursor-pointer active:scale-95"
                    >
                      <Plus size={12} />
                      <span>Add Video</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {videoList.map((preset) => {
                    const isSelected = selectedCutoutPresetId === preset.id || activeVideoUrl === preset.videoUrl;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => handleSelectCutoutPreset(preset)}
                        className={`group relative p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950/90'
                        }`}
                      >
                        {/* Thumbnail Preview with Play Overlay */}
                        <div className="relative w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <div className="w-5 h-5 rounded-full bg-black/70 backdrop-blur border border-amber-500/50 flex items-center justify-center">
                              <Play size={10} className="text-amber-400 ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                              {preset.name}
                            </h4>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-amber-300 font-mono flex-shrink-0">
                              {preset.badge || '1080p'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {preset.description || 'Authentic Mohan Sir master footage'}
                          </p>

                          {/* Action Toolbar on Item: Edit, Delete, Active Status */}
                          <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  Active in Player
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500 group-hover:text-slate-400">
                                  Click to load
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditModal(e, preset)}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-amber-500 hover:text-black text-slate-400 transition-colors cursor-pointer"
                                title="Edit video details"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteVideo(e, preset)}
                                className="p-1 rounded-lg bg-slate-900 hover:bg-rose-500 hover:text-white text-slate-400 transition-colors cursor-pointer"
                                title="Delete this video"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add New Video Dashed Drop-Card */}
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-800 hover:border-amber-500/50 bg-slate-950/40 hover:bg-amber-500/5 transition-all cursor-pointer flex items-center justify-center gap-2 text-slate-400 hover:text-amber-300 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-900 group-hover:bg-amber-500/20 border border-slate-800 group-hover:border-amber-500/30 flex items-center justify-center transition-colors">
                      <Plus size={14} className="text-slate-400 group-hover:text-amber-300" />
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-300 group-hover:text-white">
                        + Add Another Video
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Upload MP4 or paste video link
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: Wardrobe & Clothing */}
            {activeTab === 'clothes' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Select Wardrobe & Outfit</span>
                  <span className="text-[10px] text-amber-400">{MASTER_CLOTHING.length} Styles</span>
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                  {MASTER_CLOTHING.map((cloth) => {
                    const isSelected = selectedClothId === cloth.id;
                    return (
                      <div
                        key={cloth.id}
                        onClick={() => setSelectedClothId(cloth.id)}
                        className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 ring-1 ring-amber-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{cloth.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{cloth.name}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{cloth.description}</p>
                        </div>
                        {isSelected && <Check size={14} className="text-amber-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: Background Environment */}
            {activeTab === 'background' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Select Stage Environment</span>
                  <span className="text-[10px] text-emerald-400">{MASTER_BACKGROUNDS.length} Presets</span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {MASTER_BACKGROUNDS.map((bg) => {
                    const isSelected = selectedBgId === bg.id;
                    return (
                      <div
                        key={bg.id}
                        onClick={() => setSelectedBgId(bg.id)}
                        className={`relative rounded-xl overflow-hidden border aspect-video cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/50 scale-[1.02]'
                            : 'border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={bg.imageUrl} alt={bg.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[10px] font-bold text-white truncate">{bg.name}</span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center text-black">
                            <Check size={10} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: Voice & Speech */}
            {activeTab === 'voice' && (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>Voice Avatar & Speech Persona</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Voice Profile</label>
                    <select
                      value={selectedVoiceId}
                      onChange={(e) => setSelectedVoiceId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400 font-semibold"
                    >
                      {HEYGEN_VOICE_PRESETS.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Primary Language</label>
                    <select
                      value={selectedLang}
                      onChange={(e) => setSelectedLang(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="hi">🇮🇳 Hindi (हिंदी)</option>
                      <option value="mr">🚩 Marathi (मराठी)</option>
                      <option value="en">🇬🇧 English</option>
                      <option value="gu">🇮🇳 Gujarati (ગુજરાતી)</option>
                      <option value="kn">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                      <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Save & Production Buttons */}
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAsFinalAvatar}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-black font-extrabold text-xs rounded-xl shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Saving Final Avatar...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Save Final Avatar to Library</span>
                  </>
                )}
              </button>

              {onNavigateToProduction && (
                <button
                  type="button"
                  onClick={() => {
                    const tempFinal: FinalAvatar = {
                      id: `temp_${Date.now()}`,
                      name: avatarName,
                      videoAvatarId: '11236c340a0f4ece98638134c021b166',
                      voiceAvatarId: selectedVoiceId,
                      backgroundId: selectedBgId,
                      clothingId: selectedClothId,
                      defaultSpeakingStyle: selectedStyle,
                      defaultEmotion: selectedEmotion,
                      defaultLanguage: selectedLang,
                      previewImageUrl: activeCutoutUrl,
                      customCutoutUrl: activeCutoutUrl,
                      framingJson: JSON.stringify({ posX, posY, scale, flipped, videoUrl: activeVideoUrl }),
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    onNavigateToProduction(tempFinal);
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Film size={13} className="text-amber-400" />
                  <span>Use in Video Production Studio (Module 8) ➔</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Add New Video Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Video size={16} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Add New Avatar Video</h3>
                  <p className="text-[11px] text-slate-400">Upload MP4 file or connect direct Bunny CDN URL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Video Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video Title / Topic <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={formVideoTitle}
                  onChange={(e) => setFormVideoTitle(e.target.value)}
                  placeholder="e.g. Mohan Sir - Morning Pranayama & Swar Yoga Intro"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Upload to Bunny CDN */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Upload MP4 Video File
                </label>
                <input
                  type="file"
                  ref={videoFileInputRef}
                  accept="video/mp4,video/webm,video/quicktime,video/*"
                  onChange={handleVideoFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => !isUploadingVideoFile && videoFileInputRef.current?.click()}
                  className="p-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 hover:bg-slate-950 cursor-pointer flex flex-col items-center justify-center text-center transition-all group"
                >
                  {isUploadingVideoFile ? (
                    <div className="flex flex-col items-center gap-2 text-amber-400 py-2">
                      <Loader2 size={24} className="animate-spin text-amber-400" />
                      <span className="text-xs font-bold">Uploading to Bunny CDN...</span>
                      <span className="text-[10px] text-slate-400">Saving securely into Bunny Storage</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 py-1">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 group-hover:bg-amber-500/20 border border-slate-800 group-hover:border-amber-500/40 flex items-center justify-center transition-colors">
                        <Upload size={18} className="text-slate-400 group-hover:text-amber-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-200 group-hover:text-white">
                        Click to select MP4 / WebM video file
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Max file size: 100MB • Automatically hosted on Bunny CDN
                      </span>
                    </div>
                  )}
                </div>
                {videoFileError && (
                  <p className="mt-1 text-[11px] text-rose-400">{videoFileError}</p>
                )}
              </div>

              {/* Direct Video URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video URL (Direct MP4 / CDN Link) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <LinkIcon size={13} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="url"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    placeholder="https://swaryogacrm.b-cdn.net/avatar-studio/videos/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Thumbnail / Cutout Image */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Thumbnail / Cutout Preview URL
                </label>
                <input
                  type="url"
                  value={formThumbnailUrl}
                  onChange={(e) => setFormThumbnailUrl(e.target.value)}
                  placeholder="https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Resolution / Badge Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Resolution / Quality Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {['1080p Full HD', '4K Ultra HD', '720p HD', 'Zoom Master', 'Sitting Yoga'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormBadge(tag)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        formBadge === tag
                          ? 'bg-amber-500 text-black border-amber-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommended Wardrobe */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Associated Wardrobe / Attire
                </label>
                <select
                  value={formClothId}
                  onChange={(e) => setFormClothId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {MASTER_CLOTHING.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.description})
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description / Lecture Notes
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short notes about lighting, topics covered, or posture..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewVideo}
                disabled={isSavingVideoDb || isUploadingVideoFile}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSavingVideoDb ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-black" />
                    <span>Saving Video to Library...</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} />
                    <span>Save & Load in 1080p Player</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Video Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Pencil size={15} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Avatar Video</h3>
                  <p className="text-[11px] text-slate-400">Update video title, streaming link, or resolution</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Video Title */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video Title / Topic <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={formVideoTitle}
                  onChange={(e) => setFormVideoTitle(e.target.value)}
                  placeholder="e.g. Mohan Sir - Morning Pranayama"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Direct Video URL */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Video Streaming URL (MP4 / CDN) <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <LinkIcon size={13} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    type="url"
                    value={formVideoUrl}
                    onChange={(e) => setFormVideoUrl(e.target.value)}
                    placeholder="https://swaryogacrm.b-cdn.net/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Thumbnail / Cutout Image */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Thumbnail / Cutout Preview URL
                </label>
                <input
                  type="url"
                  value={formThumbnailUrl}
                  onChange={(e) => setFormThumbnailUrl(e.target.value)}
                  placeholder="https://swaryogacrm.b-cdn.net/uploads/content-cache/Images/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Resolution / Badge Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Resolution / Quality Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {['1080p Full HD', '4K Ultra HD', '720p HD', 'Zoom Master', 'Sitting Yoga'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setFormBadge(tag)}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                        formBadge === tag
                          ? 'bg-amber-500 text-black border-amber-500 shadow'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short notes about lighting, topics covered, or posture..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditVideo}
                disabled={isSavingVideoDb}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSavingVideoDb ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-black" />
                    <span>Updating Video...</span>
                  </>
                ) : (
                  <>
                    <Save size={13} />
                    <span>Update Video</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Feed 3-Min Recording into Master Digital Twin Vault */}
      {isFeedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300">
                  <User size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Train Master Digital Twin</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                      ID: {masterTwinStats.id}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Feed 3-minute video recordings of Mohan Sir to enhance expressions, gait, and asana motions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFeedModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 flex-1">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  1. Training Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                  {[
                    { id: 'expression', label: '😊 Expression', desc: 'Smile, Laugh, Eyes' },
                    { id: 'motion', label: '🚶 Motion', desc: 'Walking, Running' },
                    { id: 'posture', label: '🧘 Asana', desc: 'Padmasana, Asana' },
                    { id: 'lecture', label: '🎙️ Lecture', desc: 'Vedic Discourse' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setFeedCategory(cat.id as any);
                        if (cat.id === 'expression') setFeedSubType('smile');
                        else if (cat.id === 'motion') setFeedSubType('walking');
                        else if (cat.id === 'posture') setFeedSubType('padmasana');
                        else setFeedSubType('lecture');
                      }}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        feedCategory === cat.id
                          ? 'bg-amber-500 text-black border-amber-500 shadow-md font-extrabold'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs">{cat.label}</span>
                      <span className="text-[9px] block opacity-75">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-type quick presets */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  2. Specific Feature / Emotion Nuance
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {feedCategory === 'expression' &&
                    ['smile', 'gentle_smile', 'laugh', 'thoughtful', 'eye_blink', 'head_tilt'].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setFeedSubType(sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          feedSubType === sub
                            ? 'bg-amber-500 text-black border-amber-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {sub.replace('_', ' ')}
                      </button>
                    ))}
                  {feedCategory === 'motion' &&
                    ['mindful_walk', 'dynamic_walk', 'running', 'active_gestures', 'standing_shift'].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setFeedSubType(sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          feedSubType === sub
                            ? 'bg-amber-500 text-black border-amber-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {sub.replace('_', ' ')}
                      </button>
                    ))}
                  {feedCategory === 'posture' &&
                    ['padmasana', 'sukhasana', 'pranayama_flow', 'surya_namaskar', 'vrikshasana'].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setFeedSubType(sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          feedSubType === sub
                            ? 'bg-amber-500 text-black border-amber-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {sub.replace('_', ' ')}
                      </button>
                    ))}
                  {feedCategory === 'lecture' &&
                    ['swar_vigyan', 'prana_guidance', 'meditation_talk', 'qa_session'].map((sub) => (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => setFeedSubType(sub)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                          feedSubType === sub
                            ? 'bg-amber-500 text-black border-amber-500 shadow'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {sub.replace('_', ' ')}
                      </button>
                    ))}
                </div>
              </div>

              {/* Title Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  3. Video Clip Title
                </label>
                <input
                  type="text"
                  value={feedTitle}
                  onChange={(e) => setFeedTitle(e.target.value)}
                  placeholder="e.g. Mohan Sir - 3 Min Natural Smile & Head Movement"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              {/* Video Upload & Bunny CDN URL */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  4. 3-Minute Video Source (Upload MP4 or Paste Bunny URL)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={feedFileInputRef}
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    onChange={handleUploadFeedFile}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => feedFileInputRef.current?.click()}
                    disabled={isUploadingFeedFile}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-500/30 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUploadingFeedFile ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-amber-400" />
                        <span>Uploading Video to CDN...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={13} />
                        <span>Choose 3-Min MP4 File</span>
                      </>
                    )}
                  </button>
                  <span className="text-xs text-slate-500">or paste Bunny CDN URL below</span>
                </div>

                <input
                  type="url"
                  value={feedVideoUrl}
                  onChange={(e) => setFeedVideoUrl(e.target.value)}
                  placeholder="https://swaryogacrm.b-cdn.net/materials/mohan_sir_3min_video.mp4"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-[11px]"
                />
              </div>

              {/* Duration in Seconds */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                  <span>5. Video Duration</span>
                  <span className="text-amber-400 font-mono">{Math.round(feedDuration)}s ({Math.round((feedDuration / 60) * 10) / 10} min)</span>
                </div>
                <input
                  type="number"
                  min="10"
                  max="1800"
                  value={feedDuration}
                  onChange={(e) => setFeedDuration(Number(e.target.value))}
                  className="w-32 bg-slate-950 border border-slate-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFeedModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveFeedRecording}
                disabled={isSubmittingFeed || !feedVideoUrl || !feedTitle}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmittingFeed ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-black" />
                    <span>Calibrating Feature Bank...</span>
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    <span>Attach & Calibrate into Master Twin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Create New Avatar (Auto 9-Numerical Code, Multi-Videos & Briefs) */}
      {isCreateAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow">
                  <User size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-black text-white">
                      Create New Digital Avatar
                    </h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30 font-bold">
                      Autonomous Engine
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Auto 9-digit numerical code, multi 3-minute videos & briefs for day-by-day continuous learning.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateAvatarModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-5 flex-1 text-xs">
              {/* SECTION 1: 9-Numerical Code & Avatar Name */}
              <div className="space-y-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>1. Avatar Name & Auto 9-Numerical Code</span>
                  </label>
                  <button
                    type="button"
                    onClick={generate9DigitCode}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    title="Roll a fresh 9-digit code"
                  >
                    <RefreshCw size={11} />
                    <span>Regenerate Code</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">9-Digit Numerical Code</span>
                    <div className="p-2.5 bg-slate-900 border border-amber-500/50 rounded-xl font-mono text-sm font-black text-amber-300 text-center tracking-wider shadow-inner">
                      {createAvatarCode}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block font-bold mb-1">Avatar Display Name</span>
                    <input
                      type="text"
                      value={createAvatarName}
                      onChange={(e) => setCreateAvatarName(e.target.value)}
                      placeholder="e.g. Mohan Sir - 849201948"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Main Language */}
              <div className="space-y-2 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <label className="font-bold text-slate-300 block">
                  2. Main Language (प्राथमिक भाषा)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { code: 'hi', flag: '🇮🇳', name: 'Hindi (हिन्दी)' },
                    { code: 'mr', flag: '🇮🇳', name: 'Marathi (मराठी)' },
                    { code: 'en', flag: '🇬🇧', name: 'English' },
                    { code: 'gu', flag: '🇮🇳', name: 'Gujarati (ગુજરાતી)' },
                    { code: 'kn', flag: '🇮🇳', name: 'Kannada (ಕನ್ನಡ)' },
                    { code: 'ta', flag: '🇮🇳', name: 'Tamil (தமிழ்)' },
                    { code: 'te', flag: '🇮🇳', name: 'Telugu (తెలుగు)' },
                    { code: 'bn', flag: '🇮🇳', name: 'Bengali (বাংলা)' },
                    { code: 'sa', flag: '🇮🇳', name: 'Sanskrit (संस्कृतम्)' },
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setCreateMainLanguage(lang.code)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                        createMainLanguage === lang.code
                          ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-md'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="text-xs truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 3: Video Briefs / Persona Instructions (Helpful to our system) */}
              <div className="space-y-2 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-300 flex items-center gap-1.5">
                    <span>3. Video Briefs & Persona Instructions (Helpful to System)</span>
                    <span className="text-[10px] text-amber-400 font-normal bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                      AI Guidance
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateOverallBrief(
                        'Mohan Sir is a revered Swar Yoga Guru and Ayurvedic Nutritionist. Demeanor is serene, welcoming, and deeply insightful. Speaks with calm pauses and warm eye contact. Explains breath dynamics, nadis, and yogic lifestyle.'
                      )
                    }
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Insert Master Guru Brief
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={createOverallBrief}
                  onChange={(e) => setCreateOverallBrief(e.target.value)}
                  placeholder="Describe demeanor, speaking cadence, teaching style, or hand gestures. This will guide the AI in synthesizing natural speech and expressions."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* SECTION 4: Upload 3-Minute Multi-Videos */}
              <div className="space-y-3 p-4 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <label className="font-bold text-slate-300 block">
                      4. Upload 3-Minute Multi-Videos ({multiVideos.length} Added)
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Upload multiple 3-min clips (facial expressions, smiles, walks, runs, asanas) for training.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      ref={multiFileInputRef}
                      type="file"
                      multiple
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={handleMultiFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => multiFileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow"
                    >
                      <Upload size={13} />
                      <span>Upload Multi MP4s</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddVideoSlot}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <Plus size={13} />
                      <span>+ Add Video URL</span>
                    </button>
                  </div>
                </div>

                {/* Video Slots List */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {multiVideos.map((video, idx) => (
                    <div
                      key={video.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 relative group hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-amber-400 font-mono">
                          Video #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideoSlot(video.id)}
                          className="text-slate-500 hover:text-red-400 p-1 rounded-lg transition-all cursor-pointer"
                          title="Remove video"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Video Title</label>
                          <input
                            type="text"
                            value={video.title}
                            onChange={(e) => handleUpdateVideoField(video.id, 'title', e.target.value)}
                            placeholder="e.g. 3-Min Gentle Smile & Head Movement"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">
                            Bunny CDN Video URL {video.isUploading && '(Uploading...)'}
                          </label>
                          <input
                            type="url"
                            value={video.videoUrl}
                            onChange={(e) => handleUpdateVideoField(video.id, 'videoUrl', e.target.value)}
                            placeholder="https://swaryogacrm.b-cdn.net/materials/clip.mp4"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono text-[11px] focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      {/* Video Brief & Category for this specific clip */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">Category</label>
                          <select
                            value={video.category}
                            onChange={(e) => handleUpdateVideoField(video.id, 'category', e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          >
                            <option value="expression">😊 Facial Expression</option>
                            <option value="motion">🚶 Motion (Walk/Run)</option>
                            <option value="posture">🧘 Asana & Posture</option>
                            <option value="lecture">🎙️ Vedic Lecture</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block font-bold mb-0.5">
                            Specific Video Brief (Helpful for System)
                          </label>
                          <input
                            type="text"
                            value={video.brief}
                            onChange={(e) => handleUpdateVideoField(video.id, 'brief', e.target.value)}
                            placeholder="e.g. Seated in Padmasana smiling while talking about morning sun"
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 5: Day-by-Day Autonomous Learning Engine Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-amber-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 mt-0.5">
                  <Cpu size={16} />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <span>Day-by-Day Autonomous Build-up Engine</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                      Active
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Once you submit, our system indexes all uploaded 3-minute videos into the new avatar&apos;s persistent database. Day by day, the AI refines 468 facial landmarks, mouth shape visemes, and body postures in its own autonomous way.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2 sticky bottom-0">
              <button
                type="button"
                onClick={() => setIsCreateAvatarModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCreateAvatar}
                disabled={isSubmittingCreate || !createAvatarName.trim() || multiVideos.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmittingCreate ? (
                  <>
                    <RefreshCw size={14} className="animate-spin text-black" />
                    <span>Building Avatar & Training Vault...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Create Avatar & Start Day-by-Day Training</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: 10 GB Training Vault & Nuance Blueprint Guide */}
      {isVaultGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow">
                  <Film size={20} />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>10 GB Master Training Vault & Nuance Blueprint</span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-500/40 font-bold">
                      Storage & AI Pipeline
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    How to capture 10–20 3-minute video motions and 2–3 hours of audio lectures to capture Mohan Sir&apos;s style.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVaultGuideOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6 flex-1 text-xs text-slate-300">
              {/* Card 1: Storage Space Architecture */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" />
                    <span>Best Space & Storage Architecture (Bunny Edge Storage Zone)</span>
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                    Unlimited GB • Ultra Fast
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  For storing 10 GB of video per avatar across multiple identities, our system uses dedicated high-speed **Bunny CDN Edge Storage** connected to <span className="font-mono text-amber-300 font-bold">swaryogacrm.b-cdn.net</span>. Storing raw 10 GB videos on the Contabo VPS would quickly fill the server disk; by utilizing Bunny Storage, we get unlimited space, 0% VPS disk bottleneck, and instant 1080p streaming worldwide.
                </p>
                <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 font-mono text-[10px] text-amber-300 break-all">
                  📁 Dedicated Storage Path: swaryogacrm.b-cdn.net/avatar-studio/training-vault/mohan_kalburgi_master_twin/
                </div>
              </div>

              {/* Card 2: 10-20 Video Blueprint (3 Minutes Each = ~10 GB) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <Video size={14} className="text-amber-400" />
                    <span>The 20 Video Shooting Blueprint (3-Minute Multi-Videos)</span>
                  </h4>
                  <span className="text-[10px] text-amber-400 font-bold">10 GB Total Footage</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  {/* Category 1 */}
                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-300">
                      <span>😊 1. Facial Micro-Expressions (Clips 1–5)</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 text-[10px] list-disc list-inside">
                      <li><strong className="text-white">Clip 1:</strong> Welcoming Guru Smile with warm eye contact and gentle head nods.</li>
                      <li><strong className="text-white">Clip 2:</strong> Deep Philosophical Lecture with focused brow and serious intensity.</li>
                      <li><strong className="text-white">Clip 3:</strong> Joyful & Chuckling Nuances (lighthearted laugh during conversation).</li>
                      <li><strong className="text-white">Clip 4:</strong> Contemplative Listening Silence (natural eye blinks and subtle pauses).</li>
                      <li><strong className="text-white">Clip 5:</strong> Breath Inhalation & Facial Relaxation (subtle lip relaxing).</li>
                    </ul>
                  </div>

                  {/* Category 2 */}
                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-purple-300">
                      <span>🚶 2. Full-Body Motions & Postures (Clips 6–10)</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 text-[10px] list-disc list-inside">
                      <li><strong className="text-white">Clip 6:</strong> Seated Padmasana (Lotus Pose) with upright spine and Chin Mudra on knees.</li>
                      <li><strong className="text-white">Clip 7:</strong> Seated Sukhasana with active open-palm teaching gestures.</li>
                      <li><strong className="text-white">Clip 8:</strong> Standing Keynote Stance (speaking upright, chest-height mudras).</li>
                      <li><strong className="text-white">Clip 9:</strong> Mindful Garden Walk (slow rhythmic meditative walk, gentle turning).</li>
                      <li><strong className="text-white">Clip 10:</strong> Dynamic Energetic Walking / Vitality (lively outdoor movement).</li>
                    </ul>
                  </div>

                  {/* Category 3 */}
                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <span>🧘 3. Yoga Asanas & Pranayama (Clips 11–15)</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 text-[10px] list-disc list-inside">
                      <li><strong className="text-white">Clip 11:</strong> Nadi Shodhana Pranayama with Vishnu Mudra on right nostril.</li>
                      <li><strong className="text-white">Clip 12:</strong> Surya Bhedana & Chandra Bhedana breath demonstration.</li>
                      <li><strong className="text-white">Clip 13:</strong> Surya Namaskar flow (steady step-by-step posture transitions).</li>
                      <li><strong className="text-white">Clip 14:</strong> Gentle Neck & Shoulder Stretches for daily yogic relief.</li>
                      <li><strong className="text-white">Clip 15:</strong> Namaste & Closing Pranam (palms joined at Anahata chakra).</li>
                    </ul>
                  </div>

                  {/* Category 4 */}
                  <div className="p-3 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-300">
                      <span>💡 4. Wardrobe & Multi-Angle Lighting (Clips 16–20)</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 text-[10px] list-disc list-inside">
                      <li><strong className="text-white">Clip 16:</strong> Pure White Khadi Kurta under crisp 1080p Studio Softbox.</li>
                      <li><strong className="text-white">Clip 17:</strong> Saffron / Ochre Kurta in meditative Ashram room setting.</li>
                      <li><strong className="text-white">Clip 18:</strong> 45-Degree Profile Angle (gives the AI deep 3D facial mesh perspective).</li>
                      <li><strong className="text-white">Clip 19:</strong> Ayurvedic Kitchen / Host setting (dietary wisdom gestures).</li>
                      <li><strong className="text-white">Clip 20:</strong> Golden Hour Sunset / Natural morning sun for outdoor scenes.</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 3: 2-3 Hours Audio Lectures Blueprint */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-400" />
                    <span>2–3 Hours Audio Lectures Blueprint (Capturing Mohan Sir&apos;s Voice Nuances)</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">3.0 Hours Target</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-amber-300 font-bold block">Hour 1: Calm Meditative Resonant</span>
                    <p className="text-slate-400">
                      Slow pace (60–80 wpm), deep diaphragm resonance, purposeful pauses. Teaches the AI Mohan Sir&apos;s silent mastery.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-emerald-300 font-bold block">Hour 2: Masterclass Teaching</span>
                    <p className="text-slate-400">
                      Conversational pace (100–120 wpm), vocal inflection, questions, emphasis on key words and inspiring stories.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-purple-300 font-bold block">Hour 3: Sanskrit Sutras & Shlokas</span>
                    <p className="text-slate-400">
                      Flawless Vedic pronunciation of Sanskrit terms (Swar Vigyan, Ida, Pingala, Sushumna) for multilingual precision.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 4: Shooting Tips */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-[11px]">
                <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold text-amber-200">Recording Tip for Best AI Results:</span>
                  <p className="text-slate-300 leading-relaxed">
                    Shoot in 1080p 60fps with consistent soft front lighting. Use a collar microphone positioned 6 inches from the chest. Each clip should be exactly around 3 minutes.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between sticky bottom-0">
              <span className="text-[11px] text-slate-400">
                Current Vault: <strong className="text-amber-300">{masterTwinStats.totalClips} / 20 Videos Loaded</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVaultGuideOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsVaultGuideOpen(false);
                    setIsFeedModalOpen(true);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 text-black font-extrabold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  <Plus size={13} className="stroke-[2.5]" />
                  <span>Start Feeding 3-Min Videos</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
