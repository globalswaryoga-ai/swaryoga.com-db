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
  RotateCcw,
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

const DEFAULT_WORKSHOP_FILTER_OPTIONS = [
  { id: 'all', label: 'All Workshops (सर्व कार्यशाळा)' },
  { id: 'level1', label: 'Level 1: Basic Swar Yoga (स्वर योग L-1 व डेमो)' },
  { id: 'level2', label: 'Level 2: Aham Brahmasmi (स्वर योग L-2 व डेमो)' },
  { id: 'level3', label: 'Level 3: Ashtavakra Dhyan (अष्टावक्र ध्यान)' },
  { id: 'level4', label: 'Level 4: Shiva Swarodaya (शिव स्वरोदय ज्ञान)' },
  { id: 'aahar_shastra', label: 'Aahar Shastra (आहार शास्त्र - Diet & Digestion)' },
  { id: 'children', label: 'Children Yoga (बाल संस्कार योग)' },
  { id: 'youth', label: 'Youth Yoga (युवा योग)' },
  { id: 'garbh_sanskar', label: 'Pregnancy (Garbh Sanskar / गर्भसंस्कार)' },
  { id: 'weight_loss', label: 'Weight Loss Program (वजन घटवणे)' },
  { id: 'meditation_sadhana', label: 'Meditation Sadhana (ध्यान साधना व ओंकार)' },
  { id: 'why', label: 'Why Swar Yoga? (डेमो व परिचयात्मक सत्रे)' },
  { id: 'research', label: 'Research & Evidence (वैज्ञानिक संशोधन)' },
];

const DUMMY_WORKSHOP_IDS = new Set(['master-l1-d1', 'master-l1-d2', 'master-l1-d3', 'master-l2-d1']);

export default function CreationHubPage() {
  const router = useRouter();
  const token = useAuth();

  // Navigation & Step State
  const [activeStep, setActiveStep] = useState<FactoryStep>('pipeline');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>('es');
  const [languageSearch, setLanguageSearch] = useState<string>('');
  const [languageRegionFilter, setLanguageRegionFilter] = useState<'all' | 'indian' | 'global'>('all');

  // Master Workshop Data State
  const [masterList, setMasterList] = useState<MasterWorkshopCopy[]>([]);
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('All');
  const [selectedWorkshopFilter, setSelectedWorkshopFilter] = useState<string>('all');
  const [sourceLangFilter, setSourceLangFilter] = useState<'all' | 'mr' | 'hi' | 'en'>('all');
  const [topicSearchQuery, setTopicSearchQuery] = useState<string>('');
  const [isSyncingLibrary, setIsSyncingLibrary] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');

  // Custom Workshops state (+ Add Workshop)
  const [customWorkshops, setCustomWorkshops] = useState<Array<{ id: string; label: string }>>([]);
  const [showAddWorkshopModal, setShowAddWorkshopModal] = useState<boolean>(false);
  const [newWorkshopName, setNewWorkshopName] = useState<string>('');
  const [newWorkshopLevel, setNewWorkshopLevel] = useState<string>('L-1');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('swar_custom_workshops');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCustomWorkshops(parsed);
        }
      }
    } catch {}
  }, []);

  const allWorkshopOptions = useMemo(() => {
    return [...DEFAULT_WORKSHOP_FILTER_OPTIONS, ...customWorkshops];
  }, [customWorkshops]);

  const handleCreateWorkshop = () => {
    if (!newWorkshopName.trim()) return;
    const cleanName = newWorkshopName.trim();
    const id = 'ws_' + cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `ws_${Date.now()}`;
    const newWs = { id, label: `${cleanName} (${newWorkshopLevel})` };
    const updated = [...customWorkshops.filter((w) => w.id !== id), newWs];
    setCustomWorkshops(updated);
    try {
      localStorage.setItem('swar_custom_workshops', JSON.stringify(updated));
    } catch {}
    setSelectedWorkshopFilter(id);
    setSelectedLevelFilter(newWorkshopLevel);
    setShowAddWorkshopModal(false);
    setNewWorkshopName('');
  };

  // Source language audio counts
  const { allCount, mrCount, hiCount, enCount } = useMemo(() => {
    const all = masterList.length;
    const mr = masterList.filter((m) => m.sourceLanguage === 'mr').length;
    const hi = masterList.filter((m) => m.sourceLanguage === 'hi').length;
    const en = masterList.filter((m) => m.sourceLanguage === 'en').length;
    return { allCount: all, mrCount: mr, hiCount: hi, enCount: en };
  }, [masterList]);

  // View / Edit / Add Master Workshop Modals
  const [viewMaster, setViewMaster] = useState<MasterWorkshopCopy | null>(null);
  const [editMaster, setEditMaster] = useState<MasterWorkshopCopy | null>(null);
  const [isNewMaster, setIsNewMaster] = useState<boolean>(false);
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

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

  // Helper to read deleted topic IDs from localStorage
  const getDeletedIds = (): Set<string> => {
    try {
      const raw = localStorage.getItem('swar_creation_hub_deleted_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  // Load saved master workshops from localStorage & Bunny Database
  useEffect(() => {
    const deletedSet = getDeletedIds();
    try {
      const saved = localStorage.getItem('swar_creation_hub_master_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (m: any) => !deletedSet.has(m.id) && !DUMMY_WORKSHOP_IDS.has(m.id)
          );
          if (cleaned.length > 0) {
            setMasterList(cleaned);
            if (!selectedMasterId) setSelectedMasterId(cleaned[0].id);
          }
        }
      }
    } catch (e) {}

    // Fetch topics from Bunny Edge SQL
    const fetchDbTopics = async () => {
      try {
        const res = await fetch('/api/admin/crm/e-learning/creation-hub/topics', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.topics) && data.topics.length > 0) {
          const freshDeleted = getDeletedIds();
          const dbTopics: MasterWorkshopCopy[] = data.topics
            .filter((t: any) => !freshDeleted.has(t.id) && !DUMMY_WORKSHOP_IDS.has(t.id))
            .map((t: any) => ({
              id: t.id,
              level: t.level || 'L-1',
              day: t.day || 'Day 1',
              title: t.title,
              sourceLanguage: (t.source_language || t.sourceLanguage || 'hi') as 'hi' | 'mr' | 'en',
              durationMinutes: Number(t.duration_minutes || t.durationMinutes || 45),
              sourceVideoUrl: t.source_video_url || t.sourceVideoUrl || undefined,
              transcript: t.transcript || '',
              keyPoints: Array.isArray(t.key_points) ? t.key_points : (Array.isArray(t.keyPoints) ? t.keyPoints : []),
              blueprintSovPlain: t.blueprint_sov_plain || t.blueprintSovHummer || undefined,
              blueprintSovHummer: t.blueprint_sov_hummer || undefined,
              blueprintSvoPlain: t.blueprint_svo_plain || undefined,
              blueprintSvoHummer: t.blueprint_svo_hummer || undefined,
              adminNotes: t.admin_notes || t.adminNotes || '',
            }));

          setMasterList(() => {
            const merged = dbTopics;
            try {
              localStorage.setItem('swar_creation_hub_master_list', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });

          setSelectedMasterId((currentId) => {
            if (currentId && !DUMMY_WORKSHOP_IDS.has(currentId) && dbTopics.some((d) => d.id === currentId)) {
              return currentId;
            }
            return dbTopics[0]?.id || '';
          });
        } else if (data.success && (!data.topics || data.topics.length === 0)) {
          // If DB is genuinely empty, fall back to default seeds
          setMasterList((prev) => (prev.length > 0 ? prev : DEFAULT_MASTER_WORKSHOPS));
        }
      } catch (err) {
        console.warn('Could not fetch Creation Hub topics from DB:', err);
      }
    };

    fetchDbTopics();
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

  const handleOpenViewModal = async (item: MasterWorkshopCopy) => {
    setViewMaster(item);
    try {
      const res = await fetch(`/api/admin/crm/e-learning/creation-hub/topics?id=${encodeURIComponent(item.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.topic) {
        setViewMaster(data.topic);
      }
    } catch (e) {}
  };

  const handleOpenEditModal = async (item: MasterWorkshopCopy) => {
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

    try {
      const res = await fetch(`/api/admin/crm/e-learning/creation-hub/topics?id=${encodeURIComponent(item.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.topic) {
        setEditMaster(data.topic);
        if (data.topic.transcript) {
          setFormTranscript(data.topic.transcript);
        }
      }
    } catch (e) {}
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
    setIsDeletingId(id);
    try {
      // 1. Immediately record in deleted set
      try {
        const deletedRaw = localStorage.getItem('swar_creation_hub_deleted_ids');
        const deletedArr: string[] = deletedRaw ? JSON.parse(deletedRaw) : [];
        if (!deletedArr.includes(id)) {
          deletedArr.push(id);
          localStorage.setItem('swar_creation_hub_deleted_ids', JSON.stringify(deletedArr));
        }
      } catch (e) {}

      // 2. Remove from state and localStorage immediately
      const updated = masterList.filter((m) => m.id !== id);
      setMasterList(updated);
      try {
        localStorage.setItem('swar_creation_hub_master_list', JSON.stringify(updated));
      } catch (e) {}

      if (selectedMasterId === id) {
        setSelectedMasterId(updated[0]?.id || '');
      }
      if (editMaster?.id === id) setEditMaster(null);
      if (viewMaster?.id === id) setViewMaster(null);
      setConfirmDeleteId(null);

      // 3. Delete from Bunny Edge SQL
      await fetch(`/api/admin/crm/e-learning/creation-hub/topics?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (e) {
      console.warn('Could not delete topic from DB:', e);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleSubmitMaster = async (item: MasterWorkshopCopy) => {
    setSelectedMasterId(item.id);
    setActiveStep('languages');
    try {
      const res = await fetch(`/api/admin/crm/e-learning/creation-hub/topics?id=${encodeURIComponent(item.id)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && data.topic) {
        setMasterList((prev) => prev.map((m) => (m.id === item.id ? { ...m, ...data.topic } : m)));
      }
    } catch (e) {}
  };

  // Working Scripts & Synthesis
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [translatedScripts, setTranslatedScripts] = useState<Record<string, string>>({});
  const [productionAvatarId, setProductionAvatarId] = useState<string>('final_avatar_vedic_ashram');

  // Active Master Workshop
  const activeMaster = useMemo(() => {
    return (
      masterList.find((m) => m.id === selectedMasterId) ||
      masterList[0] ||
      DEFAULT_MASTER_WORKSHOPS[0]
    );
  }, [masterList, selectedMasterId]);

  // Ensure full verbatim transcript is loaded for the active master topic
  useEffect(() => {
    if (!activeMaster || !activeMaster.id || DUMMY_WORKSHOP_IDS.has(activeMaster.id)) return;
    if (activeMaster.transcript && activeMaster.transcript.length > 600) return;
    let isCancelled = false;
    fetch(`/api/admin/crm/e-learning/creation-hub/topics?id=${encodeURIComponent(activeMaster.id)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isCancelled && data.success && data.topic?.transcript) {
          setMasterList((prev) =>
            prev.map((m) =>
              m.id === activeMaster.id ? { ...m, ...data.topic, transcript: data.topic.transcript } : m
            )
          );
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [activeMaster?.id, token]);

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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          topic: activeMaster.title,
          query: `${activeMaster.title} - ${(activeMaster.keyPoints || []).join(', ')}`,
          targetLanguage: selectedLanguageCode,
          language: selectedLanguageCode,
          duration: 'lesson_3m',
          durationFormat: 'lesson_3m',
          script: activeMaster.transcript,
        }),
      });

      const data = await res.json();
      const outputScript =
        data.synthesized?.script || data.script || data.translatedScript || data.translatedText;

      if (data.success && outputScript) {
        setTranslatedScripts((prev) => ({
          ...prev,
          [selectedLanguageCode]: outputScript,
        }));
        setActiveStep('languages');
      } else {
        // Also try direct translation endpoint as seamless fallback
        const transRes = await fetch('/api/avatar/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: activeMaster.transcript || activeMaster.title,
            targetLang: selectedLanguageCode,
            sourceLang: activeMaster.sourceLanguage,
            mode: 'strict_exact',
          }),
        });
        const transData = await transRes.json();
        const fallbackScript =
          transData.translatedScript ||
          transData.translatedText ||
          `[${activeLanguage.name} Master Class] ${activeMaster.title}\n\n${activeMaster.transcript}`;

        setTranslatedScripts((prev) => ({
          ...prev,
          [selectedLanguageCode]: fallbackScript,
        }));
        setActiveStep('languages');
      }
    } catch (e) {
      console.error('Synthesis error:', e);
      try {
        const transRes = await fetch('/api/avatar/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            script: activeMaster.transcript || activeMaster.title,
            targetLang: selectedLanguageCode,
            sourceLang: activeMaster.sourceLanguage,
            mode: 'strict_exact',
          }),
        });
        const transData = await transRes.json();
        if (transData.translatedScript || transData.translatedText) {
          setTranslatedScripts((prev) => ({
            ...prev,
            [selectedLanguageCode]: transData.translatedScript || transData.translatedText,
          }));
          setActiveStep('languages');
          return;
        }
      } catch {}
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

          {/* Source vs Target Indicator */}
          <div className="px-4 py-2 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-800/80 bg-slate-950/50">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
              3 Master Source Languages
            </span>
            <span className="text-slate-400 font-mono">24+ Targets to Convert</span>
          </div>

          {/* Languages Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 max-h-[300px] lg:max-h-none scrollbar-thin scrollbar-thumb-slate-800">
            {filteredLanguages.map((lang) => {
              const isSelected = lang.code === selectedLanguageCode;
              const hasScript = Boolean(translatedScripts[lang.code]);
              const isSourceLang = ['en', 'hi', 'mr'].includes(lang.code);
              const sourceCount = lang.code === 'mr' ? mrCount : lang.code === 'hi' ? hiCount : lang.code === 'en' ? enCount : 0;

              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguageCode(lang.code);
                    if (isSourceLang) {
                      setSourceLangFilter(lang.code as 'en' | 'hi' | 'mr');
                      setSelectedWorkshopFilter('all');
                      setSelectedLevelFilter('All');
                      setTopicSearchQuery('');
                      const firstMatching = masterList.find((m) => m.sourceLanguage === lang.code);
                      if (firstMatching) {
                        setSelectedMasterId(firstMatching.id);
                      }
                      setActiveStep('master-copy');
                    } else {
                      setActiveStep('languages');
                    }
                  }}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between transition-all text-left group ${
                    isSelected
                      ? isSourceLang
                        ? 'bg-emerald-600/30 border-2 border-emerald-400 text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400'
                        : 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 border-2 border-blue-500 shadow-lg shadow-blue-900/20 ring-1 ring-blue-400/50'
                      : isSourceLang
                      ? 'bg-emerald-950/35 hover:bg-emerald-900/50 border border-emerald-500/60 hover:border-emerald-400 text-emerald-200'
                      : 'bg-slate-900/40 hover:bg-slate-900 border border-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {lang.flag}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold truncate ${
                            isSelected ? 'text-white' : isSourceLang ? 'text-emerald-300 font-extrabold' : 'text-slate-200'
                          }`}
                        >
                          {lang.name}
                        </span>
                        <span className={`text-[10px] uppercase font-mono ${isSourceLang ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                          {lang.code}
                        </span>
                      </div>
                      <span className={`text-[11px] block truncate ${isSourceLang ? 'text-emerald-400/80 font-medium' : 'text-slate-400'}`}>
                        {lang.nativeName}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isSourceLang ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Source ({sourceCount})</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                        {hasScript ? 'Ready' : 'Convert ➔'}
                      </span>
                    )}
                    {isSelected && (
                      <div className={`w-2 h-2 rounded-full animate-pulse ${isSourceLang ? 'bg-emerald-400' : 'bg-blue-400'}`} />
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
              if (selectedWorkshopFilter !== 'all') {
                const levelStr = (m.level || '').toLowerCase();
                const titleStr = (m.title || '').toLowerCase();
                const notesStr = (m.adminNotes || '').toLowerCase();
                const transcriptStr = (m.transcript || '').toLowerCase();
                const full = `${levelStr} ${titleStr} ${notesStr} ${transcriptStr}`;
                if (selectedWorkshopFilter === 'level1' && !full.includes('l-1') && !full.includes('level 1') && !full.includes('level-1')) return false;
                if (selectedWorkshopFilter === 'level2' && !full.includes('l-2') && !full.includes('level 2') && !full.includes('level-2') && !full.includes('aham')) return false;
                if (selectedWorkshopFilter === 'level3' && !full.includes('l-3') && !full.includes('level 3') && !full.includes('level-3') && !full.includes('ashtavakra')) return false;
                if (selectedWorkshopFilter === 'level4' && !full.includes('l-4') && !full.includes('level 4') && !full.includes('shiva') && !full.includes('swarodaya')) return false;
                if (selectedWorkshopFilter === 'aahar_shastra' && !full.includes('aahar') && !full.includes('diet') && !full.includes('food') && !full.includes('पचन') && !full.includes('अन्न') && !full.includes('bhojan') && !full.includes('भोजन')) return false;
                if (selectedWorkshopFilter === 'children' && !full.includes('child') && !full.includes('बाल')) return false;
                if (selectedWorkshopFilter === 'youth' && !full.includes('youth') && !full.includes('युवा')) return false;
                if (selectedWorkshopFilter === 'garbh_sanskar' && !full.includes('garbh') && !full.includes('गर्भ') && !full.includes('pregnan')) return false;
                if (selectedWorkshopFilter === 'weight_loss' && !full.includes('weight') && !full.includes('वजन')) return false;
                if (selectedWorkshopFilter === 'meditation_sadhana' && !full.includes('meditation') && !full.includes('ध्यान') && !full.includes('sadhana') && !full.includes('साधना') && !full.includes('om') && !full.includes('ओंकार')) return false;
                if (selectedWorkshopFilter === 'why' && !full.includes('why') && !full.includes('परिचय') && !full.includes('intro') && !full.includes('महत्त्व')) return false;
                if (selectedWorkshopFilter === 'research' && !full.includes('research') && !full.includes('science') && !full.includes('वैज्ञानिक') && !full.includes('पुरावे')) return false;
              }
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
                      Select any workshop or search topics, edit transcripts, and submit into the 27-language production factory.
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

                {/* Header Control Toolbar: Search Engine + Select Workshop Dropdown + Level + Language Pills */}
                <div className="p-4 sm:p-5 rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl space-y-4">
                  {/* Top Row: Search Engine + Select Workshop + Course Level */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* 1. Search Engine */}
                    <div className="md:col-span-5 relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={topicSearchQuery}
                        onChange={(e) => setTopicSearchQuery(e.target.value)}
                        placeholder="🔍 Search topics, sutras, transcripts, keywords..."
                        className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-slate-950 border border-slate-700/80 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                      {topicSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setTopicSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* 2. Select Workshop Dropdown with + Add Button */}
                    <div className="md:col-span-4 flex items-center gap-1.5">
                      <select
                        value={selectedWorkshopFilter}
                        onChange={(e) => setSelectedWorkshopFilter(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700/80 text-xs text-white font-bold rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer truncate"
                      >
                        {allWorkshopOptions.map((w) => (
                          <option key={w.id} value={w.id} className="bg-slate-900 text-white py-1">
                            {w.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddWorkshopModal(true)}
                        className="p-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-md shadow-purple-900/30 border border-purple-400/30 transition hover:scale-105 active:scale-95 cursor-pointer"
                        title="Add New Workshop"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* 3. Course Level Dropdown */}
                    <div className="md:col-span-3 relative">
                      <select
                        value={selectedLevelFilter}
                        onChange={(e) => setSelectedLevelFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/80 text-xs text-amber-300 font-extrabold rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        <option value="All" className="bg-slate-900 text-white">All Course Levels</option>
                        <option value="L-1" className="bg-slate-900 text-white">Level 1 (L-1)</option>
                        <option value="L-2" className="bg-slate-900 text-white">Level 2 (L-2)</option>
                        <option value="L-3" className="bg-slate-900 text-white">Level 3 (L-3)</option>
                        <option value="L-4" className="bg-slate-900 text-white">Level 4 (L-4)</option>
                      </select>
                    </div>
                  </div>

                  {/* Bottom Row: Source Language Filter Pills with Real Video Counts */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mr-1">
                        <Globe2 className="w-3.5 h-3.5 text-emerald-400" />
                        Source Language:
                      </span>
                      {[
                        { id: 'all' as const, label: 'All Source Videos', count: allCount, icon: '🌐' },
                        { id: 'en' as const, label: 'English', count: enCount, icon: '🇬🇧' },
                        { id: 'hi' as const, label: 'हिन्दी (Hindi)', count: hiCount, icon: '🕉️' },
                        { id: 'mr' as const, label: 'मराठी (Marathi)', count: mrCount, icon: '🚩' },
                      ].map((lang) => {
                        const isActive = sourceLangFilter === lang.id;
                        return (
                          <button
                            key={lang.id}
                            type="button"
                            onClick={() => setSourceLangFilter(lang.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                              isActive
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-300'
                                : 'bg-slate-950/80 text-emerald-300 hover:text-white hover:bg-slate-800 border border-emerald-900/50'
                            }`}
                          >
                            <span>{lang.icon}</span>
                            <span>{lang.label}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                                isActive ? 'bg-emerald-800 text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                              }`}
                            >
                              {lang.count} videos
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {(sourceLangFilter !== 'all' || selectedLevelFilter !== 'All' || selectedWorkshopFilter !== 'all' || topicSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSourceLangFilter('all');
                          setSelectedLevelFilter('All');
                          setSelectedWorkshopFilter('all');
                          setTopicSearchQuery('');
                        }}
                        className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        <span>Reset Filters</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Content Area: Full-Width Single-Column Row Cards */}
                <div className="w-full space-y-4">
                  {filteredList.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
                      <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                      <h3 className="text-base font-bold text-white">No topics match your current filter selection</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        Active filters: {sourceLangFilter !== 'all' ? `Language: ${sourceLangFilter.toUpperCase()}` : 'All Languages'} • Level: {selectedLevelFilter} • Workshop: {selectedWorkshopFilter}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSourceLangFilter('all');
                          setSelectedLevelFilter('All');
                          setSelectedWorkshopFilter('all');
                          setTopicSearchQuery('');
                        }}
                        className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all shadow-lg shadow-emerald-900/40 cursor-pointer"
                      >
                        ⚡ Show All {masterList.length} Lectures (Reset Filters)
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

                                  {confirmDeleteId === item.id ? (
                                    <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-500/70 rounded-xl px-2 py-1 shadow-lg shadow-rose-950/50">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMaster(item.id);
                                        }}
                                        disabled={isDeletingId === item.id}
                                        className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow-md transition cursor-pointer disabled:opacity-50"
                                        title="Confirm: permanently remove this topic"
                                      >
                                        <Trash2 size={12} className={isDeletingId === item.id ? 'animate-spin' : ''} />
                                        <span>{isDeletingId === item.id ? 'Deleting...' : 'Delete?'}</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDeleteId(null);
                                        }}
                                        className="p-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                                        title="Cancel deletion"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteId(item.id);
                                      }}
                                      className="p-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition border border-slate-700/60 cursor-pointer"
                                      title="Delete this topic"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
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
                        onClick={() => handleSubmitMaster(activeMaster)}
                        className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
                      >
                        <span>Proceed to 27 Languages</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
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
                targetLang={selectedLanguageCode}
                sourceLangCode={activeMaster.sourceLanguage}
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
                  confirmDeleteId === editMaster.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteMaster(editMaster.id)}
                        disabled={isDeletingId === editMaster.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1 shadow transition cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 size={12} className={isDeletingId === editMaster.id ? 'animate-spin' : ''} />
                        <span>{isDeletingId === editMaster.id ? 'Deleting...' : 'Confirm Delete'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(editMaster.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-3 py-2 rounded-xl hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Delete Topic</span>
                    </button>
                  )
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
      {/* ========================================================================= */}
      {/* MODAL: ADD NEW WORKSHOP */}
      {/* ========================================================================= */}
      {showAddWorkshopModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-black text-white">Add New Workshop</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWorkshopModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Workshop Name (कार्यशाळेचे नाव)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kundalini Awakening, Pranayama Intensive..."
                  value={newWorkshopName}
                  onChange={(e) => setNewWorkshopName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-purple-500 focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Default Course Level (पातळी)
                </label>
                <select
                  value={newWorkshopLevel}
                  onChange={(e) => setNewWorkshopLevel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-bold focus:border-purple-500 focus:outline-none"
                >
                  <option value="L-1">Level 1 (L-1)</option>
                  <option value="L-2">Level 2 (L-2)</option>
                  <option value="L-3">Level 3 (L-3)</option>
                  <option value="L-4">Level 4 (L-4)</option>
                  <option value="Special">Special Workshop (विशेष कार्यशाळा)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddWorkshopModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateWorkshop}
                disabled={!newWorkshopName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-900/30 disabled:opacity-50 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Workshop</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

