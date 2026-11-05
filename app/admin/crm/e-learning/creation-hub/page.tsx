'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  Video,
  Presentation,
  Film,
  Languages,
  User,
  Wand2,
  CheckCircle2,
  Clock,
  Play,
  Share2,
  Download,
  Settings,
  ChevronRight,
  Flame,
  Globe2,
  BookOpen,
  FolderSync,
  Bot,
  Zap,
  Boxes,
  PlusCircle,
  FileText,
  Sliders,
  Check,
  Search,
  Eye,
  Edit3,
  Send,
  Trash2,
  X,
  Copy,
  Plus,
} from 'lucide-react';
import { ELEARNING_LANGUAGES, ElearningLanguage } from '@/lib/elearningLanguages';

// Child Studio Modules
import ModulePptStudio from '../rag-video/_components/ModulePptStudio';
import CustomAnimationStudio from '../rag-video/_components/CustomAnimationStudio';
import Module1VideoAvatar from '../rag-video/_components/Module1VideoAvatar';
import AvatarEditStudio from '../rag-video/_components/AvatarEditStudio';
import Module7MultilingualText from '../rag-video/_components/Module7MultilingualText';
import Module8VideoProductionStudio from '../rag-video/_components/Module8VideoProductionStudio';
import Module9Animation10sStudio from '../rag-video/_components/Module9Animation10sStudio';

export type FactoryStep =
  | 'pipeline'
  | 'master-copy'
  | 'languages'
  | 'avatar'
  | 'ppt'
  | 'animation'
  | 'final-video';

interface MasterWorkshopCopy {
  id: string;
  level: string; // 'L-1', 'L-2', 'L-3', 'L-4'
  day: string; // 'Day 1', 'Day 2' ... 'Day 14'
  title: string;
  sourceLanguage: 'hi' | 'mr' | 'en';
  durationMinutes: number;
  sourceVideoUrl?: string;
  transcript: string;
  keyPoints: string[];
  blueprintSovPlain?: string;
  blueprintSovHummer?: string;
  blueprintSvoPlain?: string;
  blueprintSvoHummer?: string;
  adminNotes?: string;
}

const DEFAULT_MASTER_WORKSHOPS: MasterWorkshopCopy[] = [
  {
    id: 'master-l1-d1',
    level: 'L-1',
    day: 'Day 1',
    title: 'Introduction to Swara & Five Elements (पंचतत्व विज्ञान)',
    sourceLanguage: 'hi',
    durationMinutes: 45,
    sourceVideoUrl: 'https://swaryogacrm.b-cdn.net/materials/mohan_sir_hindi_real.mp4',
    transcript:
      'नमस्ते साधकों, आज हम स्वर योग के पहले दिन में पंचतत्व - पृथ्वी, जल, अग्नि, वायु और आकाश का अपने श्वास के साथ संबंध समझेंगे। जब नासिका का दायाँ स्वर चलता है तो सूर्य नाड़ी सक्रिय होती है, और बायाँ स्वर चंद्र नाड़ी।',
    keyPoints: [
      'सूर्य नाड़ी (Pingala) और चंद्र नाड़ी (Ida) का मूल सिद्धांत',
      'दाहिनी नासिका - पित्त, अग्नि और क्रियाशीलता',
      'बाईं नासिका - कफ, शीतलता और विश्राम',
      'स्वर परिवर्तन का शरीर और मनोदशा पर प्रभाव',
    ],
  },
  {
    id: 'master-l1-d2',
    level: 'L-1',
    day: 'Day 2',
    title: 'Ida & Pingala Breath Balance & Energy Cycles',
    sourceLanguage: 'mr',
    durationMinutes: 40,
    transcript:
      'मित्रांनो, आपले शरीर हे निसर्गाचे एक अद्भुत यंत्र आहे. दर ६० ते ९० मिनिटांनी आपली नाकपुडी बदलते. यालाच स्वरोदय म्हणतात. या तालाचा योग्य वापर कसा करायचा हे आज आपण प्रत्यक्ष शिकूया.',
    keyPoints: [
      'नाकपुडी बदलण्याचे नैसर्गिक कालचक्र',
      'सुषुम्ना स्वर - ध्यानाची सर्वोत्तम वेळ',
      'दैनंदिन दिनचर्येनुसार स्वराचे नियोजन',
    ],
  },
  {
    id: 'master-l1-d3',
    level: 'L-1',
    day: 'Day 3',
    title: 'Food Science & Tattva Timing for Digestion',
    sourceLanguage: 'hi',
    durationMinutes: 50,
    transcript:
      'भोजन करते समय हमेशा सूर्य स्वर यानी दाहिना स्वर चलना चाहिए ताकि जठराग्नि प्रदीप्त रहे और भोजन का उचित पाचन हो। पानी पीते समय चंद्र स्वर शुभ माना गया है।',
    keyPoints: [
      'भोजन और सूर्य स्वर का संबंध (Digestive Fire)',
      'जलपान और चंद्र स्वर का संतुलन',
      'रोग मुक्ति के लिए स्वर के सरल नियम',
    ],
  },
  {
    id: 'master-l2-d1',
    level: 'L-2',
    day: 'Day 1',
    title: 'Shiva Swarodaya Deep Sutras & Prana Awakening',
    sourceLanguage: 'hi',
    durationMinutes: 60,
    transcript:
      'शिव स्वरोदय शास्त्र में भगवान शिव माता पार्वती को स्वर का गोपनीय ज्ञान देते हैं। ब्रह्मांड की उत्पत्ति और गति श्वास के सूक्ष्म तत्वों पर आधारित है।',
    keyPoints: [
      'शिव स्वरोदय के 395 श्लोकों का गूढ़ सार',
      'नाड़ी चक्र और प्राण का उर्ध्वगमन',
      'सूक्ष्म तत्व पहचान की विधियाँ',
    ],
  },
];

export default function CreationHubPage() {
  const router = useRouter();
  const token = useAuth();

  // Navigation & Step State
  const [activeStep, setActiveStep] = useState<FactoryStep>('pipeline');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('es');
  const [languageSearch, setLanguageSearch] = useState<string>('');
  const [languageRegionFilter, setLanguageRegionFilter] = useState<'all' | 'indian' | 'global'>('all');

  // Master Workshop Data State
  const [masterList, setMasterList] = useState<MasterWorkshopCopy[]>(DEFAULT_MASTER_WORKSHOPS);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('master-l1-d1');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('All');
  const [sourceLangFilter, setSourceLangFilter] = useState<'all' | 'mr' | 'hi' | 'en'>('all');
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('');
  const [isSyncingLibrary, setIsSyncingLibrary] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // View / Edit / Add Master Workshop Modals
  const [viewMaster, setViewMaster] = useState<MasterWorkshopCopy | null>(null);
  const [editMaster, setEditMaster] = useState<MasterWorkshopCopy | null>(null);
  const [isNewMaster, setIsNewMaster] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);

  // Edit / Add Form Fields
  const [formLevel, setFormLevel] = useState<string>('L-1');
  const [formDay, setFormDay] = useState<string>('Day 1');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formSourceLang, setFormSourceLang] = useState<'hi' | 'mr' | 'en'>('hi');
  const [formDuration, setFormDuration] = useState<number>(45);
  const [formVideoUrl, setFormVideoUrl] = useState<string>('');
  const [formTranscript, setFormTranscript] = useState<string>('');
  const [formKeyPoints, setFormKeyPoints] = useState<string>('');
  const [formAdminNotes, setFormAdminNotes] = useState<string>('');

  // Load saved master workshops from localStorage & Bunny Database
  useEffect(() => {
    try {
      const saved = localStorage.getItem('swar_creation_hub_master_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMasterList(parsed);
        }
      }
    } catch (e) {}

    // Also fetch topics saved from Mohan RAG 6-Step Pipeline in Bunny Edge SQL
    let cancelled = false;
    const fetchDbTopics = async () => {
      try {
        const res = await fetch('/api/admin/crm/e-learning/creation-hub/topics', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.topics) && data.topics.length > 0 && !cancelled) {
          const dbTopics: MasterWorkshopCopy[] = data.topics.map((t: any) => ({
            id: t.id,
            level: t.level || 'L-1',
            day: t.day || 'Day 1',
            title: t.title,
            sourceLanguage: (t.source_language || t.sourceLanguage || 'hi') as 'hi' | 'mr' | 'en',
            durationMinutes: Number(t.duration_minutes || t.durationMinutes || 45),
            sourceVideoUrl: t.source_video_url || t.sourceVideoUrl || undefined,
            transcript: t.transcript || '',
            keyPoints: Array.isArray(t.key_points) ? t.key_points : (Array.isArray(t.keyPoints) ? t.keyPoints : []),
            blueprintSovPlain: t.blueprint_sov_plain || t.blueprintSovPlain,
            blueprintSovHummer: t.blueprint_sov_hummer || t.blueprintSovHummer,
            blueprintSvoPlain: t.blueprint_svo_plain || t.blueprintSvoPlain,
            blueprintSvoHummer: t.blueprint_svo_hummer || t.blueprintSvoHummer,
            adminNotes: t.admin_notes || t.adminNotes || '',
          }));

          setMasterList((prev) => {
            const map = new Map<string, MasterWorkshopCopy>();
            // Database topics take priority
            dbTopics.forEach((item) => map.set(item.id, item));
            // Preserve local topics
            prev.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('swar_creation_hub_master_list', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      } catch (err) {
        console.warn('Could not fetch Creation Hub topics from DB:', err);
      }
    };

    fetchDbTopics();
    return () => { cancelled = true; };
  }, [token]);

  const saveMasterListToStorage = (updated: MasterWorkshopCopy[]) => {
    setMasterList(updated);
    try {
      localStorage.setItem('swar_creation_hub_master_list', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleSyncFromLibrary = async () => {
    setIsSyncingLibrary(true);
    setSyncStatusMsg('');
    try {
      const res = await fetch('/api/admin/crm/e-learning/creation-hub/sync-library', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync library');
      setSyncStatusMsg(`✅ ${data.message || `Synced ${data.syncedCount} lectures successfully!`}`);

      // Refresh list from DB
      const r = await fetch('/api/admin/crm/e-learning/creation-hub/topics', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const d = await r.json();
      if (d.success && Array.isArray(d.topics)) {
        setMasterList(d.topics);
        try {
          localStorage.setItem('swar_creation_hub_master_list', JSON.stringify(d.topics));
        } catch (e) {}
        if (d.topics.length > 0 && !selectedMasterId) {
          setSelectedMasterId(d.topics[0].id);
        }
      }
    } catch (err: any) {
      setSyncStatusMsg(`❌ Sync notice: ${err.message}`);
    } finally {
      setIsSyncingLibrary(false);
    }
  };

  const handleOpenViewModal = (item: MasterWorkshopCopy) => {
    setViewMaster(item);
  };

  const handleOpenEditModal = (item: MasterWorkshopCopy) => {
    setEditMaster(item);
    setIsNewMaster(false);
    setFormLevel(item.level);
    setFormDay(item.day);
    setFormTitle(item.title);
    setFormSourceLang(item.sourceLanguage);
    setFormDuration(item.durationMinutes);
    setFormVideoUrl(item.sourceVideoUrl || '');
    setFormTranscript(item.transcript);
    setFormKeyPoints((item.keyPoints || []).join('\n'));
    setFormAdminNotes(item.adminNotes || '');
  };

  const handleOpenAddModal = () => {
    setEditMaster(null);
    setIsNewMaster(true);
    setFormLevel(selectedLevelFilter !== 'All' ? selectedLevelFilter : 'L-1');
    setFormDay('Day ' + (masterList.length + 1));
    setFormTitle('');
    setFormSourceLang(sourceLangFilter !== 'all' ? sourceLangFilter : 'hi');
    setFormDuration(45);
    setFormVideoUrl('');
    setFormTranscript('');
    setFormKeyPoints('');
    setFormAdminNotes('');
  };

  const handleSaveMasterForm = async (andSubmit = false) => {
    if (!formTitle.trim()) {
      alert('Please enter a workshop title.');
      return;
    }

    const keyPointsArray = formKeyPoints
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    let updatedList: MasterWorkshopCopy[];
    let targetItem: MasterWorkshopCopy;

    if (isNewMaster || !editMaster) {
      const targetId = 'master-' + Date.now();
      targetItem = {
        id: targetId,
        level: formLevel,
        day: formDay,
        title: formTitle.trim(),
        sourceLanguage: formSourceLang,
        durationMinutes: formDuration || 45,
        sourceVideoUrl: formVideoUrl.trim() || undefined,
        transcript: formTranscript.trim(),
        keyPoints: keyPointsArray.length
          ? keyPointsArray
          : ['सूर्य-चंद्र नाड़ी मूल सिद्धांत', 'प्राणायाम व स्वर चक्र साधना'],
        adminNotes: formAdminNotes.trim(),
      };
      updatedList = [targetItem, ...masterList];
    } else {
      targetItem = {
        ...editMaster,
        level: formLevel,
        day: formDay,
        title: formTitle.trim(),
        sourceLanguage: formSourceLang,
        durationMinutes: formDuration || 45,
        sourceVideoUrl: formVideoUrl.trim() || undefined,
        transcript: formTranscript.trim(),
        keyPoints: keyPointsArray,
        adminNotes: formAdminNotes.trim(),
      };
      updatedList = masterList.map((m) => (m.id === editMaster.id ? targetItem : m));
    }

    saveMasterListToStorage(updatedList);
    setSelectedMasterId(targetItem.id);
    setEditMaster(null);
    setIsNewMaster(false);

    // Save to Bunny Edge SQL
    try {
      await fetch('/api/admin/crm/e-learning/creation-hub/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(targetItem),
      });
    } catch (e) {
      console.warn('Could not persist topic to DB:', e);
    }

    if (andSubmit) {
      setActiveStep('languages');
    }
  };

  const handleDeleteMaster = async (id: string) => {
    if (!confirm('Are you sure you want to remove this master workshop copy?')) return;
    const updated = masterList.filter((m) => m.id !== id);
    saveMasterListToStorage(updated.length ? updated : DEFAULT_MASTER_WORKSHOPS);
    if (selectedMasterId === id) {
      setSelectedMasterId(updated[0]?.id || DEFAULT_MASTER_WORKSHOPS[0].id);
    }
    setEditMaster(null);
    setViewMaster(null);

    // Delete from Bunny Edge SQL
    try {
      await fetch(`/api/admin/crm/e-learning/creation-hub/topics?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Could not delete topic from DB:', e);
    }
  };

  const handleSubmitMaster = (item: MasterWorkshopCopy) => {
    setSelectedMasterId(item.id);
    setActiveStep('languages');
  };

  // Working Scripts & Synthesis
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [translatedScripts, setTranslatedScripts] = useState<Record<string, string>>({});
  const [productionAvatarId, setProductionAvatarId] = useState<string>('avatar-vedic-mohan');

  // Active Master Workshop
  const activeMaster = useMemo(() => {
    return masterList.find((m) => m.id === selectedMasterId) || masterList[0];
  }, [masterList, selectedMasterId]);

  // Active Target Language
  const activeLanguage = useMemo(() => {
    return (
      ELEARNING_LANGUAGES.find((l) => l.code === selectedLanguageCode) ||
      ELEARNING_LANGUAGES[4] // Default Spanish
    );
  }, [selectedLanguageCode]);

  // Filtered Languages
  const filteredLanguages = useMemo(() => {
    return ELEARNING_LANGUAGES.filter((lang) => {
      const matchSearch =
        lang.name.toLowerCase().includes(languageSearch.toLowerCase()) ||
        lang.nativeName.toLowerCase().includes(languageSearch.toLowerCase()) ||
        lang.code.toLowerCase().includes(languageSearch.toLowerCase());

      if (languageRegionFilter === 'all') return matchSearch;
      if (languageRegionFilter === 'indian') return matchSearch && lang.region === 'indian';
      return matchSearch && lang.region === 'global';
    });
  }, [languageSearch, languageRegionFilter]);

  // Trigger Multilingual Synthesis for Target Language
  const handleSynthesizeTargetLanguage = async () => {
    if (!activeMaster) return;
    setIsSynthesizing(true);
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: `${activeMaster.title} - ${activeMaster.keyPoints.join(', ')}`,
          language: selectedLanguageCode,
          durationFormat: 'lesson_3m',
        }),
      });

      const data = await res.json();
      if (data.success && data.synthesized) {
        setTranslatedScripts((prev) => ({
          ...prev,
          [selectedLanguageCode]: data.synthesized.script,
        }));
      } else {
        // Fallback simulation for seamless preview
        setTranslatedScripts((prev) => ({
          ...prev,
          [selectedLanguageCode]: `[${activeLanguage.name} Master Class] ${activeMaster.title}\n\n${activeMaster.transcript}`,
        }));
      }
    } catch (e) {
      console.error('Synthesis error:', e);
      setTranslatedScripts((prev) => ({
        ...prev,
        [selectedLanguageCode]: `[${activeLanguage.name} Master Class] ${activeMaster.title}\n\n${activeMaster.transcript}`,
      }));
    } finally {
      setIsSynthesizing(false);
    }
  };

  const currentWorkingScript =
    translatedScripts[selectedLanguageCode] || activeMaster.transcript;

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* ========================================================================= */}
      {/* TOP HEADER & FACTORY CONTROL BAR */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#0d1322]/95 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/crm/e-learning"
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/60 transition-all hover:scale-105 active:scale-95"
            title="Back to E-Learning Management"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-purple-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40">
              <Boxes className="w-5 h-5 text-black font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                  CREATION HUB <span className="text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 uppercase tracking-widest font-bold">Factory</span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                1 Master Copy ➔ 27 Multilingual AI Clone Workshops & Videos
              </p>
            </div>
          </div>
        </div>

        {/* FACTORY PIPELINE STAGE CHIPS */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveStep('pipeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'pipeline'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30 scale-105'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Factory Overview</span>
          </button>

          <button
            onClick={() => setActiveStep('master-copy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'master-copy'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-105 ring-1 ring-purple-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-400" />
            <span>1. Factory Review ({activeMaster.level})</span>
          </button>

          <button
            onClick={() => setActiveStep('languages')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'languages'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105 ring-1 ring-blue-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <span className="text-sm">{activeLanguage.flag}</span>
            <span>2. {activeLanguage.name}</span>
          </button>

          <button
            onClick={() => setActiveStep('avatar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'avatar'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105 ring-1 ring-emerald-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5 text-emerald-400" />
            <span>3. Avatar & Voice</span>
          </button>

          <button
            onClick={() => setActiveStep('ppt')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'ppt'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 scale-105 ring-1 ring-amber-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Presentation className="w-3.5 h-3.5 text-amber-400" />
            <span>4. AI PPT</span>
          </button>

          <button
            onClick={() => setActiveStep('animation')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'animation'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 scale-105 ring-1 ring-pink-400'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-pink-400" />
            <span>5. Animation</span>
          </button>

          <button
            onClick={() => setActiveStep('final-video')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 ${
              activeStep === 'final-video'
                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/30 scale-105 ring-2 ring-red-400'
                : 'bg-gradient-to-r from-slate-900 to-slate-800 border border-red-500/40 text-red-400 hover:text-white hover:bg-red-950/40'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>6. Final Video</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* WORKSPACE LAYOUT: SIDEBAR + MAIN CANVAS */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT SIDEBAR: 27+ WORLD LANGUAGES ROSTER */}
        {/* ======================================================================= */}
        <aside className="w-full lg:w-80 bg-[#0a0f1d] border-b lg:border-b-0 lg:border-r border-slate-800/90 flex flex-col shrink-0">
          {/* Sidebar Top: Search & Tabs */}
          <div className="p-4 border-b border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Target Languages (27+)
                </span>
              </div>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                {ELEARNING_LANGUAGES.length} ACTIVE
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search language, code..."
                value={languageSearch}
                onChange={(e) => setLanguageSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Region Filters */}
            <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
              <button
                onClick={() => setLanguageRegionFilter('all')}
                className={`py-1 rounded-lg transition-all ${
                  languageRegionFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All (27)
              </button>
              <button
                onClick={() => setLanguageRegionFilter('indian')}
                className={`py-1 rounded-lg transition-all ${
                  languageRegionFilter === 'indian'
                    ? 'bg-slate-800 text-amber-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🇮🇳 Indic
              </button>
              <button
                onClick={() => setLanguageRegionFilter('global')}
                className={`py-1 rounded-lg transition-all ${
                  languageRegionFilter === 'global'
                    ? 'bg-slate-800 text-blue-400 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🌍 Global
              </button>
            </div>
          </div>

          {/* Languages Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[300px] lg:max-h-none scrollbar-thin scrollbar-thumb-slate-800">
            {filteredLanguages.map((lang) => {
              const isSelected = lang.code === selectedLanguageCode;
              const hasScript = Boolean(translatedScripts[lang.code]);

              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguageCode(lang.code);
                    if (activeStep === 'pipeline') {
                      setActiveStep('languages');
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all text-left group ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 border border-blue-500/80 shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/50'
                      : 'bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {lang.flag}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-white' : 'text-slate-200'
                          }`}
                        >
                          {lang.name}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-mono">
                          {lang.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {lang.nativeName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {hasScript ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Ready
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400">
                        Draft
                      </span>
                    )}
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sidebar Bottom: 1-Click Batch Synthesizer */}
          <div className="p-3.5 bg-slate-900/90 border-t border-slate-800/80">
            <button
              onClick={handleSynthesizeTargetLanguage}
              disabled={isSynthesizing}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
            >
              {isSynthesizing ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing ({activeLanguage.code.toUpperCase()})...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-black" />
                  <span>Translate to {activeLanguage.name}</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* MAIN WORKSPACE CANVAS */}
        {/* ======================================================================= */}
        <main className="flex-1 flex flex-col bg-[#070b14] overflow-y-auto">
          {/* ===================================================================== */}
          {/* VIEW 1: FACTORY PIPELINE OVERVIEW */}
          {/* ===================================================================== */}
          {activeStep === 'pipeline' && (
            <div className="p-6 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-300">
              {/* Hero Banner */}
              <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-[#070b14] border border-indigo-500/30 overflow-hidden shadow-2xl">
                <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative z-10 max-w-3xl space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Autonomous Multilingual Course Creation Engine</span>
                  </div>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    The Swar Yoga Creation Factory
                  </h2>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                    Input a single master workshop recording (Level 1–4, Day 1–14). The factory
                    synchronizes Mohan-RAG knowledge, translates into 27 languages using authentic
                    Vedic terminology, and generates AI clone avatars, PPT slides, and 3D
                    animations for automated publication into E-Learning.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setActiveStep('master-copy')}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-transform hover:scale-105"
                    >
                      <BookOpen className="w-4 h-4" />
                      <span>Select Master Class</span>
                    </button>
                    <button
                      onClick={() => setActiveStep('ppt')}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Presentation className="w-4 h-4 text-amber-400" />
                      <span>Open AI PPT Studio</span>
                    </button>
                    <button
                      onClick={() => setActiveStep('animation')}
                      className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700 flex items-center gap-2 transition-all hover:scale-105"
                    >
                      <Film className="w-4 h-4 text-pink-400" />
                      <span>Open Animation Creator</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Interactive Workflow */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-amber-400" />
                    <span>Factory Production Stages</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Click any stage to configure or execute
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Stage 1 */}
                  <div
                    onClick={() => setActiveStep('master-copy')}
                    className="cursor-pointer group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/60 transition-all hover:shadow-xl hover:shadow-purple-900/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-purple-400 uppercase tracking-wider">
                        Stage 01
                      </span>
                      <BookOpen className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      Master Workshop Copy
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Level 1–4, Day 1–14 transcripts and video recordings from Mohan Sir.
                    </p>
                    <div className="text-xs font-semibold text-purple-300 flex items-center gap-1">
                      <span>Selected: {activeMaster.level} • {activeMaster.day}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 2 */}
                  <div
                    onClick={() => setActiveStep('languages')}
                    className="cursor-pointer group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/60 transition-all hover:shadow-xl hover:shadow-blue-900/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-blue-400 uppercase tracking-wider">
                        Stage 02
                      </span>
                      <Globe2 className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      27+ Multilingual Translations
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Dual-Core SOV/SVO grammar engine locking sacred Vedic terminology.
                    </p>
                    <div className="text-xs font-semibold text-blue-300 flex items-center gap-1">
                      <span>Active: {activeLanguage.flag} {activeLanguage.name}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 3 */}
                  <div
                    onClick={() => setActiveStep('avatar')}
                    className="cursor-pointer group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/60 transition-all hover:shadow-xl hover:shadow-emerald-900/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                        Stage 03
                      </span>
                      <User className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      Mohan AI Avatar & Voice
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Natural face gestures, laughing pauses, spiritual robes, and cloned vocal timbre.
                    </p>
                    <div className="text-xs font-semibold text-emerald-300 flex items-center gap-1">
                      <span>Calibrated Model: Mohan Sir HD</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 4 */}
                  <div
                    onClick={() => setActiveStep('ppt')}
                    className="cursor-pointer group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-amber-500/60 transition-all hover:shadow-xl hover:shadow-amber-900/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                        Stage 04
                      </span>
                      <Presentation className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      AI PPT Slide Creator
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Generates synchronized presentation slides with Sanskrit sutras and graphics.
                    </p>
                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1">
                      <span>Launch PPT Studio</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 5 */}
                  <div
                    onClick={() => setActiveStep('animation')}
                    className="cursor-pointer group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-pink-500/60 transition-all hover:shadow-xl hover:shadow-pink-900/10"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-pink-400 uppercase tracking-wider">
                        Stage 05
                      </span>
                      <Film className="w-5 h-5 text-pink-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      AI Animation Creator
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      3D nostril breath flows, Ida/Pingala channels, and 10s procedural animations.
                    </p>
                    <div className="text-xs font-semibold text-pink-300 flex items-center gap-1">
                      <span>Open 3D Animation Engine</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Stage 6 */}
                  <div
                    onClick={() => setActiveStep('final-video')}
                    className="cursor-pointer group p-5 rounded-2xl bg-gradient-to-br from-red-950/40 via-slate-900/80 to-slate-900 border border-red-500/40 hover:border-red-400 transition-all hover:shadow-xl hover:shadow-red-900/20"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                        Stage 06
                      </span>
                      <Play className="w-5 h-5 text-red-400 fill-current group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-base font-bold text-white mb-1">
                      Final Video Production
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      Binds avatar speech, PPT overlays, animations, and publishes to E-Learning.
                    </p>
                    <div className="text-xs font-semibold text-red-300 flex items-center gap-1">
                      <span>Assemble Final Video</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 2: FACTORY REVIEW - TOPICS & MASTER WORKSHOPS */}
          {/* ===================================================================== */}
          {activeStep === 'master-copy' && (() => {
            const allCount = masterList.length;
            const mrCount = masterList.filter((m) => m.sourceLanguage === 'mr').length;
            const hiCount = masterList.filter((m) => m.sourceLanguage === 'hi').length;
            const enCount = masterList.filter((m) => m.sourceLanguage === 'en').length;

            const filteredList = masterList.filter((m) => {
              if (sourceLangFilter !== 'all' && m.sourceLanguage !== sourceLangFilter) return false;
              if (selectedLevelFilter !== 'All' && m.level !== selectedLevelFilter) return false;
              if (topicSearchQuery.trim()) {
                const q = topicSearchQuery.toLowerCase().trim();
                const matchTitle = m.title.toLowerCase().includes(q);
                const matchTranscript = (m.transcript || '').toLowerCase().includes(q);
                const matchKeyPoints = (m.keyPoints || []).some((k) => k.toLowerCase().includes(q));
                const matchNotes = (m.adminNotes || '').toLowerCase().includes(q);
                if (!matchTitle && !matchTranscript && !matchKeyPoints && !matchNotes) return false;
              }
              return true;
            });

            return (
              <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
                {/* Top Banner Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <span>Factory Review: Added Topics & Master Blueprints</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Filter topics by Source Language, edit transcripts or add custom notes, and submit to 27-language production.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950/60 text-purple-300 border border-purple-800">
                      {filteredList.length} of {masterList.length} Topics Showing
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncFromLibrary}
                      disabled={isSyncingLibrary}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-emerald-900/30 border border-emerald-400/30 cursor-pointer disabled:opacity-50"
                      title="Sync all authentic video lectures from Mohan RAG Library Database"
                    >
                      <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isSyncingLibrary ? 'animate-spin' : ''}`} />
                      <span>{isSyncingLibrary ? 'Syncing Library...' : '⚡ Sync RAG Library Lectures'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddModal}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-purple-900/30 border border-purple-400/30 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>+ Add Topic</span>
                    </button>
                  </div>
                </div>

                {syncStatusMsg && (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/60 p-3.5 text-xs font-bold text-emerald-200 flex items-center justify-between shadow-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{syncStatusMsg}</span>
                    </div>
                    <button type="button" onClick={() => setSyncStatusMsg('')} className="text-slate-400 hover:text-white text-xs">✕</button>
                  </div>
                )}

                {/* Two-Column Layout: Small Sidebar on Left + Main Area on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* ── LEFT SIDEBAR: SOURCE LANGUAGE & LEVEL FILTER ──────────── */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <aside className="lg:col-span-3 space-y-5">
                    {/* Source Language Filter Card */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Globe2 className="w-3.5 h-3.5 text-purple-400" />
                          Source Language
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          4 Modes
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {[
                          { id: 'all' as const, label: 'All Languages', count: allCount, icon: '🌐' },
                          { id: 'mr' as const, label: 'मराठी (Marathi)', count: mrCount, icon: '🚩' },
                          { id: 'hi' as const, label: 'हिन्दी (Hindi)', count: hiCount, icon: '🕉️' },
                          { id: 'en' as const, label: 'English', count: enCount, icon: '🇬🇧' },
                        ].map((lang) => {
                          const isActive = sourceLangFilter === lang.id;
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => setSourceLangFilter(lang.id)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                                isActive
                                  ? 'bg-purple-600 text-white shadow-md shadow-purple-900/30 ring-1 ring-purple-400'
                                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <span>{lang.icon}</span>
                                <span>{lang.label}</span>
                              </span>
                              <span
                                className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                                  isActive ? 'bg-purple-800 text-white' : 'bg-slate-800 text-slate-400'
                                }`}
                              >
                                {lang.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Course Level Filter Card */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-amber-400" />
                          Course Level
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        {['All', 'L-1', 'L-2', 'L-3', 'L-4'].map((lvl) => {
                          const isActive = selectedLevelFilter === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => setSelectedLevelFilter(lvl)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center ${
                                isActive
                                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                                  : 'bg-slate-950/60 text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/80'
                              }`}
                            >
                              {lvl === 'All' ? 'All Levels' : lvl}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Topic Search Box */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-sky-400" />
                        Search Topics
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={topicSearchQuery}
                          onChange={(e) => setTopicSearchQuery(e.target.value)}
                          placeholder="Search title, keywords..."
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                        />
                        {topicSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setTopicSearchQuery('')}
                            className="absolute right-2.5 top-2 text-slate-400 hover:text-white"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* RAG Pipeline Integration Note */}
                    <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 p-3.5 text-xs text-emerald-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                        <Sparkles size={14} />
                        <span>Mohan RAG Sync</span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                        When you click &quot;Finalize &amp; Send to Creation Hub&quot; in Step 6 of the RAG Blueprint Pipeline, topics appear here automatically.
                      </p>
                    </div>
                  </aside>

                  {/* ───────────────────────────────────────────────────────────── */}
                  {/* ── MAIN AREA: ALL ADDED TOPICS CARDS ─────────────────────── */}
                  {/* ───────────────────────────────────────────────────────────── */}
                  <main className="lg:col-span-9 space-y-4">
                    {filteredList.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
                        <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                        <h3 className="text-base font-bold text-white">No topics match your current filters</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Try switching source language, selecting &quot;All Levels&quot;, or click &quot;+ Add Topic&quot; to create a new master copy.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSourceLangFilter('all');
                            setSelectedLevelFilter('All');
                            setTopicSearchQuery('');
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition"
                        >
                          Reset Filters
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {filteredList.map((item) => {
                          const isSelected = item.id === selectedMasterId;
                          return (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMasterId(item.id)}
                              className={`p-5 sm:p-6 rounded-3xl cursor-pointer transition-all border flex flex-col justify-between ${
                                isSelected
                                  ? 'bg-purple-950/30 border-purple-500 shadow-xl shadow-purple-900/20 ring-1 ring-purple-400'
                                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div>
                                {/* Card Header Badges */}
                                <div className="flex items-center justify-between mb-2.5">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                      {item.level}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300">
                                      {item.day}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                      {item.sourceLanguage === 'mr' ? '🚩 मराठी' : item.sourceLanguage === 'hi' ? '🕉️ हिन्दी' : '🇬🇧 English'}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                                    {item.durationMinutes}m
                                  </span>
                                </div>

                                {/* Title / Heading */}
                                <h3 className="text-base sm:text-lg font-black text-white mb-2 leading-snug">
                                  {item.title}
                                </h3>

                                {/* Small Description / Transcript Excerpt */}
                                <p className="text-xs text-slate-300/90 line-clamp-3 mb-3 leading-relaxed italic bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                                  &ldquo;{item.transcript}&rdquo;
                                </p>

                                {/* Key Points */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 mb-3">
                                  {(item.keyPoints || []).slice(0, 4).map((kp, idx) => (
                                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span className="truncate">{kp}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Custom Additions / Admin Notes badge */}
                                {item.adminNotes && (
                                  <div className="mb-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-1.5">
                                    <span className="shrink-0 font-bold">📝</span>
                                    <span className="line-clamp-2">{item.adminNotes}</span>
                                  </div>
                                )}
                              </div>

                              {/* Card Action Buttons: View, Edit, Delete, Submit */}
                              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenViewModal(item);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 transition-all border border-slate-700/60 shadow-sm"
                                    title="View full transcript & workshop details"
                                  >
                                    <Eye size={13} className="text-sky-400" />
                                    <span>View</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenEditModal(item);
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center gap-1 transition-all border border-slate-700/60 shadow-sm"
                                    title="Edit transcript and add custom notes"
                                  >
                                    <Edit3 size={13} className="text-amber-400" />
                                    <span>Edit</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteMaster(item.id);
                                    }}
                                    className="p-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition border border-slate-700/60"
                                    title="Delete this topic"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSubmitMaster(item);
                                  }}
                                  className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md ${
                                    isSelected
                                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30'
                                      : 'bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                                  }`}
                                  title="Submit this master copy into the 27-language factory pipeline"
                                >
                                  <Send size={12} />
                                  <span>{isSelected ? 'Submit ➔' : 'Select & Submit'}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs text-slate-400">Selected Master Topic:</span>
                        <p className="text-sm font-bold text-white">
                          {activeMaster.level} • {activeMaster.day} — {activeMaster.title}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveStep('languages')}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                      >
                        <span>Proceed to 27 Languages</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </main>
                </div>
              </div>
            );
          })()}

          {/* ===================================================================== */}
          {/* VIEW 3: 27+ MULTILINGUAL TEXT ENGINE */}
          {/* ===================================================================== */}
          {activeStep === 'languages' && (
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
              <Module7MultilingualText
                token={token}
                initialSourceText={activeMaster.transcript}
                onSendToPptStudio={(script) => {
                  setTranslatedScripts((prev) => ({
                    ...prev,
                    [selectedLanguageCode]: script,
                  }));
                  setActiveStep('ppt');
                }}
                onSendToVideoStudio={(scripts) => {
                  setTranslatedScripts(scripts);
                  setActiveStep('final-video');
                }}
              />
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 4: MOHAN AI AVATAR & VOICE */}
          {/* ===================================================================== */}
          {activeStep === 'avatar' && (
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
              <AvatarEditStudio
                token={token}
                onNavigateToProduction={(avatar) => {
                  setProductionAvatarId(avatar.id || (avatar as any)._id || '');
                  setActiveStep('final-video');
                }}
              />
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 5: AI PPT STUDIO */}
          {/* ===================================================================== */}
          {activeStep === 'ppt' && (
            <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-base">📌</span>
                  <span><strong>Phase 2 Roadmap:</strong> Advanced PPT and 3D Animation refinement will be carried out in the next phase as planned. You can continue working on Master Copies and Multilingual Translation.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStep('final-video')}
                  className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 text-[11px] shrink-0"
                >
                  Proceed to Final Video ➔
                </button>
              </div>
              <ModulePptStudio
                token={token}
                initialScript={currentWorkingScript}
                onSendToVideoStudio={(slides) => {
                  setActiveStep('final-video');
                }}
              />
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 6: AI ANIMATION CREATOR */}
          {/* ===================================================================== */}
          {activeStep === 'animation' && (
            <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-4">
              <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-3.5 text-xs text-purple-200 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="text-base">📌</span>
                  <span><strong>Phase 2 Roadmap:</strong> 3D Anatomical Breath Animations will be refined in the next phase. You can preview existing animations or proceed to Final Video.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveStep('final-video')}
                  className="px-3 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold border border-purple-500/40 text-[11px] shrink-0"
                >
                  Proceed to Final Video ➔
                </button>
              </div>
              <CustomAnimationStudio />
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 7: FINAL VIDEO PRODUCTION STUDIO */}
          {/* ===================================================================== */}
          {activeStep === 'final-video' && (
            <div className="p-4 sm:p-6 flex-1 flex flex-col">
              <Module8VideoProductionStudio
                token={token}
                initialScript={currentWorkingScript}
                initialFinalAvatarId={productionAvatarId}
              />
            </div>
          )}
        </main>
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: VIEW MASTER WORKSHOP DETAILS */}
      {/* ===================================================================== */}
      {viewMaster && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1019] border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/40">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {viewMaster.level}
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                  {viewMaster.day}
                </span>
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  {viewMaster.durationMinutes} mins
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  {viewMaster.sourceLanguage === 'mr' ? 'मराठी' : viewMaster.sourceLanguage === 'hi' ? 'हिन्दी' : 'English'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewMaster(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div>
                <h3 className="text-xl font-extrabold text-white mb-2">{viewMaster.title}</h3>
                {viewMaster.sourceVideoUrl && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate">📹 Source Media: {viewMaster.sourceVideoUrl}</span>
                    <a
                      href={viewMaster.sourceVideoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:underline shrink-0 ml-2 font-bold"
                    >
                      Open Video ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Master Transcript */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText size={14} className="text-purple-400" />
                    Master Transcript Text
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewMaster.transcript);
                      setCopiedTranscript(true);
                      setTimeout(() => setCopiedTranscript(false), 2000);
                    }}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 transition"
                  >
                    {copiedTranscript ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedTranscript ? 'Copied!' : 'Copy Transcript'}</span>
                  </button>
                </div>
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-72 overflow-y-auto select-text">
                  {viewMaster.transcript}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Length: {viewMaster.transcript.length} characters • ~{viewMaster.transcript.split(/\s+/).filter(Boolean).length} words
                </p>
              </div>

              {/* Key Points */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Key Learning Points:
                </span>
                <div className="space-y-1.5">
                  {viewMaster.keyPoints.map((kp, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-200 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{kp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Additions / Admin Notes */}
              {viewMaster.adminNotes && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-200 space-y-1">
                  <span className="font-bold text-amber-400 block">📝 Custom Notes / Added Instructions:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{viewMaster.adminNotes}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const target = viewMaster;
                  setViewMaster(null);
                  handleOpenEditModal(target);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-slate-700 transition shadow-sm"
              >
                <Edit3 size={14} className="text-amber-400" />
                <span>Edit & Add More Text</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewMaster(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSubmitMaster(viewMaster);
                    setViewMaster(null);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  <Send size={13} />
                  <span>Submit to 27 Languages ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: EDIT OR ADD MASTER WORKSHOP COPY */}
      {/* ===================================================================== */}
      {(editMaster || isNewMaster) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b1019] border border-slate-700/80 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/40">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {isNewMaster ? 'Add New Master Workshop Copy' : `Edit Master Copy (${formLevel} • ${formDay})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditMaster(null);
                  setIsNewMaster(false);
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Row 1: Level, Day, Language, Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Level</label>
                  <select
                    value={formLevel}
                    onChange={(e) => setFormLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                  >
                    <option value="L-1">Level 1 (L-1)</option>
                    <option value="L-2">Level 2 (L-2)</option>
                    <option value="L-3">Level 3 (L-3)</option>
                    <option value="L-4">Level 4 (L-4)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Day</label>
                  <input
                    type="text"
                    placeholder="e.g. Day 1"
                    value={formDay}
                    onChange={(e) => setFormDay(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Source Language</label>
                  <select
                    value={formSourceLang}
                    onChange={(e) => setFormSourceLang(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                  >
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Duration (mins)</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={formDuration}
                    onChange={(e) => setFormDuration(Number(e.target.value) || 45)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Workshop Title</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Swara & Five Elements (पंचतत्व विज्ञान)"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Video URL (Optional) */}
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">
                  Source Video or Audio URL <span className="text-slate-500 font-normal">(Optional Bunny or YouTube link)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://swaryogacrm.b-cdn.net/materials/..."
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs font-mono focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Transcript Textarea (Add more text) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText size={14} className="text-purple-400" />
                    <span>Master Transcript (Add, expand or paste text)</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formTranscript.length} chars • ~{formTranscript.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                <textarea
                  rows={8}
                  placeholder="Type or paste the complete spoken workshop text here in Hindi, Marathi, or English. You can add as much text as you want..."
                  value={formTranscript}
                  onChange={(e) => setFormTranscript(e.target.value)}
                  className={`w-full px-3.5 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white text-xs sm:text-sm leading-relaxed focus:border-purple-500 focus:outline-none ${/[\u0900-\u097f]/.test(formTranscript) ? 'font-devanagari' : ''}`}
                />

                {/* Quick Helper to append more text */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] text-slate-400 font-medium">Quick Append:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTranscript((prev) =>
                        prev
                          ? prev + '\n\n[सूर्य नाड़ी अभ्यास]: दाहिनी नासिका से गहरा श्वास लें। सूर्य नाड़ी क्रियाशीलता और जठराग्नि को प्रदीप्त करती है।'
                          : '[सूर्य नाड़ी अभ्यास]: दाहिनी नासिका से गहरा श्वास लें...'
                      );
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    + सूर्य नाड़ी अभ्यास
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTranscript((prev) =>
                        prev
                          ? prev + '\n\n[चंद्र नाड़ी अभ्यास]: बाईं नासिका से शांत और शीतल श्वास का अनुभव करें। यह चित्त को शांत और स्थिर करती है।'
                          : '[चंद्र नाड़ी अभ्यास]: बाईं नासिका से शांत...'
                      );
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    + चंद्र नाड़ी अभ्यास
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormTranscript((prev) =>
                        prev
                          ? prev + '\n\n[सुषुम्ना ध्यान]: जब दोनों स्वर समान रूप से प्रवाहित हों, तब ध्यान और समाधि का समय होता है।'
                          : '[सुषुम्ना ध्यान]: दोनों स्वर समान रूप से...'
                      );
                    }}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    + सुषुम्ना ध्यान
                  </button>
                </div>
              </div>

              {/* Key Points */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Key Learning Points <span className="text-slate-500 font-normal">(One bullet point per line)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="सूर्य नाड़ी (Pingala) और चंद्र नाड़ी (Ida) का मूल सिद्धांत&#10;दाहिनी नासिका - पित्त, अग्नि और क्रियाशीलता"
                  value={formKeyPoints}
                  onChange={(e) => setFormKeyPoints(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              {/* Add Something / Custom Notes */}
              <div>
                <label className="text-xs font-bold text-amber-300 block mb-1 flex items-center gap-1.5">
                  <span>📝 Add Custom Additions / Teacher Notes</span>
                  <span className="text-slate-500 font-normal text-[11px]">(Specific examples, avatar emotions, punchlines)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Add any extra teaching notes, personal examples, wardrobe suggestions, or background cue for this topic..."
                  value={formAdminNotes}
                  onChange={(e) => setFormAdminNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-900/40 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between gap-3 flex-wrap">
              <div>
                {!isNewMaster && editMaster && (
                  <button
                    type="button"
                    onClick={() => handleDeleteMaster(editMaster.id)}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-500/10 transition"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditMaster(null);
                    setIsNewMaster(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMasterForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveMasterForm(true)}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-purple-600/30"
                >
                  <Send size={13} />
                  <span>Save & Submit ➔</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

