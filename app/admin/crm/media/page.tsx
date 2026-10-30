'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Film,
  Video,
  Play,
  Plus,
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  Edit3,
  Trash2,
  Check,
  X,
  RefreshCw,
  Eye,
  Layers,
  Share2,
  GraduationCap,
  Users,
  Clock,
  ThumbsUp,
  Tag,
  AlertCircle,
  Copy,
  Sliders,
  CheckCircle2,
  Tv,
  ListMusic,
  Zap,
  ArrowUpRight,
  Filter,
  Flame,
  LayoutGrid,
  List,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

// Supported Languages for Swar Yoga Multi-Language Engine
export const ALL_LANGUAGES = [
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳', region: 'Indian' },
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧', region: 'Global' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', flag: '🇮🇳', region: 'Indian' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', flag: '🇮🇳', region: 'Indian' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', flag: '🇮🇳', region: 'Indian' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', flag: '🇮🇳', region: 'Indian' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', flag: '🇮🇳', region: 'Indian' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', flag: '🇮🇳', region: 'Indian' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', flag: '🇮🇳', region: 'Indian' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', flag: '🇮🇳', region: 'Indian' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', flag: '🇳🇵', region: 'Indian' },
  { code: 'sa', name: 'Sanskrit', native: 'संस्कृतम्', flag: '🕉️', region: 'Indian' },
  { code: 'zh', name: 'Mandarin', native: '中文', flag: '🇨🇳', region: 'Global' },
  { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸', region: 'Global' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷', region: 'Global' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦', region: 'Global' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪', region: 'Global' },
  { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺', region: 'Global' },
  { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵', region: 'Global' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷', region: 'Global' },
];

export type MediaType = 'video' | 'shorts' | 'playlist' | 'post' | 'live';
export type MediaDestination = 'media' | 'e-learning' | 'community' | 'social-media';

export interface MultiLangTranslation {
  title: string;
  description: string;
  mediaUrl?: string;
  transcript?: string;
  caption?: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  destinations: MediaDestination[];
  title: string;
  description: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  sourceLanguage: string;
  targetLanguages: string[];
  translations: Record<string, MultiLangTranslation>;
  category?: string;
  tags?: string[];
  viewsCount?: number;
  likesCount?: number;
  status: 'published' | 'draft' | 'scheduled';
  overlayStrip?: {
    enabled: boolean;
    stripText: string;
    stripLinkText?: string;
    stripLinkUrl?: string;
    position?: 'top' | 'bottom';
  };
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All Categories' },
  { id: 'swar_yoga', label: 'Swar Yoga & Breath Science' },
  { id: 'ayurveda_recipe', label: 'Ayurveda Recipes & Diet' },
  { id: 'sadhana', label: 'Morning Sadhana & Meditations' },
  { id: 'workshop', label: 'Live Workshops & Masterclasses' },
  { id: 'general', label: 'Healing & General Guidance' },
];

function getYouTubeEmbedUrl(url?: string): string | null {
  if (!url) return null;
  if (url.includes('youtube.com/embed/')) {
    return url.includes('?') ? url : `${url}?autoplay=1&rel=0`;
  }
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) {
    return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
  }
  return null;
}

function getYouTubeThumbnail(url?: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  if (match && match[1]) {
    return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
  }
  return null;
}

export default function AdminMediaStudioPage() {
  const hookToken = useAuth();
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    const activeToken =
      hookToken ||
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      '';
    setToken(activeToken);
  }, [hookToken]);

  // Main list state
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Edit / Add Modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'destinations' | 'translations' | 'overlay'>('details');
  const [activeTranslationLang, setActiveTranslationLang] = useState<string>('hi');
  const [saving, setSaving] = useState<boolean>(false);
  const [translating, setTranslating] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState<MediaType>('video');
  const [formDestinations, setFormDestinations] = useState<MediaDestination[]>(['media']);
  const [formMediaUrl, setFormMediaUrl] = useState('');
  const [formThumbnailUrl, setFormThumbnailUrl] = useState('');
  const [formDurationSeconds, setFormDurationSeconds] = useState(180);
  const [formSourceLang, setFormSourceLang] = useState('hi');
  const [formTargetLangs, setFormTargetLangs] = useState<string[]>(['en', 'mr', 'kn', 'gu']);
  const [formTranslations, setFormTranslations] = useState<Record<string, MultiLangTranslation>>({});
  const [formCategory, setFormCategory] = useState('swar_yoga');
  const [formTags, setFormTags] = useState('Swar Yoga, Breath, Meditation');
  const [formStatus, setFormStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  const [formOverlayEnabled, setFormOverlayEnabled] = useState(false);
  const [formOverlayText, setFormOverlayText] = useState('🌿 Join Swar Yoga Daily Live Sadhana & Workshops');
  const [formOverlayLinkText, setFormOverlayLinkText] = useState('Join Now');
  const [formOverlayLinkUrl, setFormOverlayLinkUrl] = useState('/workshops');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Fetch Items from /api/media
  const fetchMediaItems = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/media?limit=100&status=all');
      if (!res.ok) throw new Error('Failed to load media items');
      const data = await res.json();
      const list: MediaItem[] = data?.data?.items || data?.data?.posts || [];
      setItems(list);
    } catch (err: any) {
      console.error('Error fetching media:', err);
      setError(err?.message || 'Error loading media items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaItems();
  }, []);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesTags) return false;
      }
      // Destination
      if (selectedDestination !== 'all') {
        if (!item.destinations?.includes(selectedDestination as MediaDestination)) return false;
      }
      // Type
      if (selectedType !== 'all') {
        if (item.type !== selectedType) return false;
      }
      // Category
      if (selectedCategory !== 'all') {
        if (item.category !== selectedCategory) return false;
      }
      // Language
      if (selectedLanguage !== 'all') {
        const hasSource = item.sourceLanguage === selectedLanguage;
        const hasTrans = !!item.translations?.[selectedLanguage];
        if (!hasSource && !hasTrans) return false;
      }
      return true;
    });
  }, [items, searchTerm, selectedDestination, selectedType, selectedCategory, selectedLanguage]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormDescription('');
    setFormType('video');
    setFormDestinations(['media']);
    setFormMediaUrl('');
    setFormThumbnailUrl('');
    setFormDurationSeconds(180);
    setFormSourceLang('hi');
    setFormTargetLangs(['en', 'mr', 'kn', 'gu']);
    setFormTranslations({});
    setFormCategory('swar_yoga');
    setFormTags('Swar Yoga, Breath, Meditation');
    setFormStatus('published');
    setFormOverlayEnabled(false);
    setFormOverlayText('🌿 Join Swar Yoga Daily Live Sadhana & Workshops');
    setFormOverlayLinkText('Join Now');
    setFormOverlayLinkUrl('/workshops');
    setModalTab('details');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: MediaItem) => {
    setEditingItem(item);
    setFormTitle(item.title || '');
    setFormDescription(item.description || '');
    setFormType(item.type || 'video');
    setFormDestinations(item.destinations || ['media']);
    setFormMediaUrl(item.mediaUrl || '');
    setFormThumbnailUrl(item.thumbnailUrl || '');
    setFormDurationSeconds(item.durationSeconds || 180);
    setFormSourceLang(item.sourceLanguage || 'hi');
    setFormTargetLangs(item.targetLanguages || ['en', 'mr', 'kn']);
    setFormTranslations(item.translations || {});
    setFormCategory(item.category || 'swar_yoga');
    setFormTags((item.tags || []).join(', '));
    setFormStatus(item.status || 'published');
    setFormOverlayEnabled(item.overlayStrip?.enabled || false);
    setFormOverlayText(item.overlayStrip?.stripText || '🌿 Join Swar Yoga Daily Live Sadhana & Workshops');
    setFormOverlayLinkText(item.overlayStrip?.stripLinkText || 'Join Now');
    setFormOverlayLinkUrl(item.overlayStrip?.stripLinkUrl || '/workshops');
    setModalTab('details');
    setIsModalOpen(true);
  };

  // Auto-detect YouTube thumbnail when URL changes
  const handleMediaUrlChange = (url: string) => {
    setFormMediaUrl(url);
    if (!formThumbnailUrl) {
      const autoThumb = getYouTubeThumbnail(url);
      if (autoThumb) {
        setFormThumbnailUrl(autoThumb);
      }
    }
  };

  // 1-Click Multi-Language Translation via AI
  const handleAutoTranslate = async () => {
    if (!formTitle.trim()) {
      showToast('⚠️ Please enter a Title first before translating');
      return;
    }
    setTranslating(true);
    showToast(`⚡ Translating across ${formTargetLangs.length} languages...`);

    try {
      const newTranslations: Record<string, MultiLangTranslation> = { ...formTranslations };

      for (const langCode of formTargetLangs) {
        if (langCode === formSourceLang) continue;
        const langObj = ALL_LANGUAGES.find((l) => l.code === langCode);
        const langName = langObj?.name || langCode;

        try {
          const res = await fetch('/api/admin/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token ? `Bearer ${token}` : '',
            },
            body: JSON.stringify({
              text: `${formTitle}\n---SPLIT---\n${formDescription || ''}`,
              targetLanguage: langCode,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const translatedFull = data.translatedText || '';
            const parts = translatedFull.split('---SPLIT---');
            newTranslations[langCode] = {
              title: parts[0]?.trim() || formTitle,
              description: parts[1]?.trim() || formDescription,
              mediaUrl: formMediaUrl,
            };
          } else {
            // Fallback: simple copy
            if (!newTranslations[langCode]) {
              newTranslations[langCode] = {
                title: `${formTitle} (${langName})`,
                description: formDescription,
                mediaUrl: formMediaUrl,
              };
            }
          }
        } catch {
          if (!newTranslations[langCode]) {
            newTranslations[langCode] = {
              title: formTitle,
              description: formDescription,
              mediaUrl: formMediaUrl,
            };
          }
        }
      }

      setFormTranslations(newTranslations);
      showToast(`✅ Successfully translated to ${Object.keys(newTranslations).length} languages!`);
    } catch (err: any) {
      console.error('Translation error:', err);
      showToast(`❌ Translation error: ${err?.message || 'Failed'}`);
    } finally {
      setTranslating(false);
    }
  };

  // Save Media Item to Bunny Edge SQL via /api/media
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('⚠️ Title is required');
      return;
    }
    if (formDestinations.length === 0) {
      showToast('⚠️ Please select at least one page destination');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingItem?.id,
        title: formTitle.trim(),
        description: formDescription.trim(),
        type: formType,
        destinations: formDestinations,
        mediaUrl: formMediaUrl.trim(),
        thumbnailUrl: formThumbnailUrl.trim() || getYouTubeThumbnail(formMediaUrl) || '',
        durationSeconds: Number(formDurationSeconds) || 180,
        sourceLanguage: formSourceLang,
        targetLanguages: formTargetLangs,
        translations: formTranslations,
        category: formCategory,
        tags: formTags.split(',').map((t) => t.trim()).filter(Boolean),
        status: formStatus,
        overlayStrip: {
          enabled: formOverlayEnabled,
          stripText: formOverlayText,
          stripLinkText: formOverlayLinkText,
          stripLinkUrl: formOverlayLinkUrl,
        },
      };

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save media');

      showToast(`🎉 Media saved successfully! Synced to ${formDestinations.join(', ')}.`);
      setIsModalOpen(false);
      fetchMediaItems();
    } catch (err: any) {
      console.error('Error saving media:', err);
      showToast(`❌ Error: ${err?.message || 'Save failed'}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This will remove it from all connected pages.`)) return;

    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      if (!res.ok) throw new Error('Failed to delete media');
      showToast('🗑️ Media item deleted successfully');
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (previewItem?.id === id) setPreviewItem(null);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  // Toggle Destination Helper
  const toggleDestination = (dest: MediaDestination) => {
    setFormDestinations((prev) =>
      prev.includes(dest) ? prev.filter((d) => d !== dest) : [...prev, dest]
    );
  };

  // Toggle Target Language Helper
  const toggleTargetLang = (code: string) => {
    setFormTargetLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAllIndianLangs = () => {
    const indianCodes = ALL_LANGUAGES.filter((l) => l.region === 'Indian').map((l) => l.code);
    setFormTargetLangs(Array.from(new Set([...formTargetLangs, ...indianCodes])));
  };

  const selectAllGlobalLangs = () => {
    const allCodes = ALL_LANGUAGES.map((l) => l.code);
    setFormTargetLangs(allCodes);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[100] max-w-md bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 font-semibold text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <Sparkles className="w-5 h-5 text-amber-300 flex-shrink-0 animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER: Colorful Yogic Banner */}
      <header className="relative overflow-hidden bg-gradient-to-r from-[#064e3b] via-[#047857] to-[#0f766e] border-b border-emerald-500/30 p-5 md:p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.3),transparent_60%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-400/50 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>CENTRAL MEDIA ENGINE</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-[11px] font-bold text-amber-300">
                20+ LANGUAGES SUPPORTED
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>Media Studio &amp; Multi-Page Editor</span>
              <Film className="w-8 h-8 text-amber-400 hidden sm:inline-block" />
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm max-w-2xl mt-1 leading-relaxed">
              Create, edit, and syndicate videos, reels, and meditations across{' '}
              <span className="text-amber-300 font-bold">Public Media (/media)</span>,{' '}
              <span className="text-cyan-300 font-bold">E-Learning (/e-learning)</span>, and{' '}
              <span className="text-pink-300 font-bold">Community (/community)</span> in one place.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-slate-950 font-extrabold text-sm shadow-lg hover:shadow-amber-500/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New Media</span>
            </button>

            <Link
              href="/media"
              target="_blank"
              className="px-3.5 py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-400/40 text-emerald-200 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <span>View Public /media</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>

            <button
              onClick={fetchMediaItems}
              disabled={loading}
              className="p-2.5 rounded-xl bg-black/40 hover:bg-black/60 border border-white/10 text-white transition-all disabled:opacity-50"
              title="Refresh Media Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* QUICK STATS PILLS */}
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 relative z-10">
          <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white">{items.length}</div>
              <div className="text-[11px] text-emerald-200">Total Media Assets</div>
            </div>
          </div>

          <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white">
                {items.filter((i) => i.destinations?.includes('media')).length}
              </div>
              <div className="text-[11px] text-cyan-200">On Public /media</div>
            </div>
          </div>

          <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white">
                {items.filter((i) => i.destinations?.includes('e-learning')).length}
              </div>
              <div className="text-[11px] text-purple-200">Linked to E-Learning</div>
            </div>
          </div>

          <div className="bg-black/35 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-white">
                {
                  items.reduce((acc, item) => acc + Object.keys(item.translations || {}).length, 0)
                }
              </div>
              <div className="text-[11px] text-pink-200">Active Translations</div>
            </div>
          </div>
        </div>
      </header>

      {/* FILTER CONTROLS & SEARCH BAR */}
      <section className="bg-slate-900/90 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, description or tag..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Destination Filter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <span className="text-[10px] text-slate-500 font-bold px-1.5">PAGES:</span>
              {[
                { id: 'all', label: 'All Pages' },
                { id: 'media', label: '🎬 /media' },
                { id: 'e-learning', label: '🎓 /e-learning' },
                { id: 'community', label: '💬 /community' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDestination(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedDestination === d.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
              {[
                { id: 'all', label: 'All Types' },
                { id: 'video', label: '🎥 Videos' },
                { id: 'shorts', label: '⚡ Shorts' },
                { id: 'live', label: '🔴 Live' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedType === t.id
                      ? 'bg-amber-400 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500'}`}
                title="Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-slate-800 text-emerald-400' : 'text-slate-500'}`}
                title="List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-300">Loading Central Media Engine...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-red-950/40 border border-red-500/40 text-center max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-white mb-1">Failed to Load Media</div>
            <p className="text-xs text-red-300">{error}</p>
            <button
              onClick={fetchMediaItems}
              className="mt-4 px-4 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold"
            >
              Retry
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800/80 p-8">
            <Film className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Media Assets Found</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              {searchTerm
                ? `No media matches "${searchTerm}". Try another search or clear filters.`
                : 'No media items yet in this filter. Click below to add your first video!'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add First Media</span>
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const youtubeEmbed = getYouTubeEmbedUrl(item.mediaUrl);
              const thumb = item.thumbnailUrl || getYouTubeThumbnail(item.mediaUrl) || '/images/hero-bg.jpg';
              const transCount = Object.keys(item.translations || {}).length;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 shadow-xl overflow-hidden flex flex-col justify-between group transition-all duration-200 hover:-translate-y-0.5"
                >
                  {/* Thumbnail & Video Banner */}
                  <div className="relative aspect-video bg-black overflow-hidden">
                    <img
                      src={thumb}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Type Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-[10px] font-extrabold text-amber-300 uppercase flex items-center gap-1 shadow">
                        {item.type === 'shorts' ? (
                          <>
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Shorts</span>
                          </>
                        ) : item.type === 'live' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span>Live</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3 text-cyan-400" />
                            <span>Video</span>
                          </>
                        )}
                      </span>

                      {item.durationSeconds ? (
                        <span className="px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300">
                          {Math.floor(item.durationSeconds / 60)}:
                          {(item.durationSeconds % 60).toString().padStart(2, '0')}
                        </span>
                      ) : null}
                    </div>

                    {/* Play Overlay Button */}
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-emerald-500/90 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-2xl hover:scale-110 active:scale-95"
                      title="Play Preview"
                    >
                      <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                    </button>

                    {/* Status Pill */}
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          item.status === 'published'
                            ? 'bg-emerald-500/90 text-slate-950'
                            : 'bg-amber-500/90 text-slate-950'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Bottom strip in thumbnail: Connected Destinations */}
                    <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 flex-wrap">
                      {item.destinations?.map((dest) => (
                        <span
                          key={dest}
                          className="px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md text-[9px] font-bold border border-emerald-400/50 text-emerald-300"
                        >
                          {dest === 'media'
                            ? '🎬 /media'
                            : dest === 'e-learning'
                            ? '🎓 /e-learning'
                            : dest === 'community'
                            ? '💬 /community'
                            : '📱 Social'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] text-amber-400 font-semibold mb-1">
                        <span>{item.category?.replace(/_/g, ' ').toUpperCase() || 'SWAR YOGA'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-300 font-bold uppercase">{item.sourceLanguage}</span>
                          {transCount > 0 && (
                            <span className="text-emerald-400 font-medium">+{transCount} langs</span>
                          )}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-white line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 text-xs font-bold transition flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setPreviewItem(item)}
                          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="p-1.5 rounded-xl bg-slate-800/60 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Media</th>
                  <th className="py-3 px-4">Destinations</th>
                  <th className="py-3 px-4">Languages</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredItems.map((item) => {
                  const thumb = item.thumbnailUrl || getYouTubeThumbnail(item.mediaUrl) || '/images/hero-bg.jpg';
                  const transCount = Object.keys(item.translations || {}).length;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 flex items-center gap-3">
                        <img
                          src={thumb}
                          alt={item.title}
                          className="w-16 h-10 rounded-lg object-cover bg-black flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white truncate max-w-xs">{item.title}</div>
                          <div className="text-[10px] text-slate-400 uppercase">{item.type}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {item.destinations?.map((d) => (
                            <span
                              key={d}
                              className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-emerald-300 font-bold border border-slate-700"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-cyan-300 font-bold uppercase">{item.sourceLanguage}</span>
                        {transCount > 0 && (
                          <span className="text-slate-400 ml-1">+{transCount} langs</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 capitalize">{item.category}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 text-slate-200"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setPreviewItem(item)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.title)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL: ADD / EDIT MEDIA (MULTI-PAGE & MULTI-LANGUAGE) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  {editingItem ? 'EDITING MEDIA ASSET' : 'NEW MEDIA ASSET'}
                </span>
                <h2 className="text-xl font-extrabold text-white">
                  {editingItem ? editingItem.title : 'Add Media to Swar Yoga'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-1 px-5 pt-3 bg-slate-950 border-b border-slate-800 text-xs overflow-x-auto">
              {[
                { id: 'details', label: '1. Media Details', icon: Film },
                { id: 'destinations', label: '2. Connect Pages', icon: Layers },
                { id: 'translations', label: '3. Multi-Language (20+)', icon: Globe },
                { id: 'overlay', label: '4. Video Lead Banner', icon: Zap },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setModalTab(tab.id as any)}
                    className={`px-3.5 py-2 rounded-t-xl font-bold flex items-center gap-1.5 transition whitespace-nowrap ${
                      modalTab === tab.id
                        ? 'bg-slate-900 text-emerald-400 border-t-2 border-emerald-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveMedia} className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* TAB 1: MEDIA DETAILS */}
              {modalTab === 'details' && (
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Video Title (Master Language) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Swar Yoga Breathing Secret for Instant Peace"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {/* Video URL & Thumbnail */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Media / YouTube URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={formMediaUrl}
                        onChange={(e) => handleMediaUrlChange(e.target.value)}
                        placeholder="https://youtube.com/watch?v=... or bunny cdn"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Supports YouTube, Shorts, Bunny CDN, or MP4
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Thumbnail URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={formThumbnailUrl}
                        onChange={(e) => setFormThumbnailUrl(e.target.value)}
                        placeholder="Auto-detected from YouTube or enter image url"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                      />
                      {formThumbnailUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img
                            src={formThumbnailUrl}
                            alt="Preview"
                            className="w-16 h-10 rounded object-cover border border-slate-700"
                          />
                          <span className="text-[10px] text-emerald-400">Thumbnail Preview</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Type & Category & Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Media Type</label>
                      <select
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="video">🎥 Regular Video (16:9)</option>
                        <option value="shorts">⚡ Vertical Shorts (9:16)</option>
                        <option value="playlist">📑 Series / Playlist</option>
                        <option value="live">🔴 Live Stream</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Duration (Seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={formDurationSeconds}
                        onChange={(e) => setFormDurationSeconds(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Description</label>
                    <textarea
                      rows={3}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Enter detailed summary or transcript notes..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-400"
                    />
                  </div>

                  {/* Tags & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Tags (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="swar, pranayama, nostril, health"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Publishing Status
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      >
                        <option value="published">✅ Published (Live Immediately)</option>
                        <option value="draft">📝 Draft (Hidden from visitors)</option>
                        <option value="scheduled">⏱️ Scheduled for Later</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONNECT PAGES (DESTINATIONS) */}
              {modalTab === 'destinations' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-200">
                    💡 <b>Multi-Page Syndication:</b> Select which sections of Swar Yoga will display
                    this media item. It will immediately synchronize across all selected pages!
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: 'media' as MediaDestination,
                        name: 'Public Media Hub',
                        path: '/media',
                        desc: 'Shown on the main public Swar Yoga YouTube & Video player.',
                        icon: Tv,
                        badgeColor: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
                      },
                      {
                        id: 'e-learning' as MediaDestination,
                        name: 'E-Learning Portal',
                        path: '/e-learning',
                        desc: 'Included in courses, modules & Sadhak student curriculum.',
                        icon: GraduationCap,
                        badgeColor: 'border-purple-500/50 bg-purple-500/10 text-purple-300',
                      },
                      {
                        id: 'community' as MediaDestination,
                        name: 'Sadhak Community Feed',
                        path: '/community',
                        desc: 'Syndicated in the community forum for discussion and comments.',
                        icon: Users,
                        badgeColor: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300',
                      },
                      {
                        id: 'social-media' as MediaDestination,
                        name: 'Social Media Channels',
                        path: 'YouTube / Meta',
                        desc: 'Queued for social broadcasting across YouTube, Instagram & FB.',
                        icon: Share2,
                        badgeColor: 'border-pink-500/50 bg-pink-500/10 text-pink-300',
                      },
                    ].map((dest) => {
                      const isChecked = formDestinations.includes(dest.id);
                      const Icon = dest.icon;
                      return (
                        <div
                          key={dest.id}
                          onClick={() => toggleDestination(dest.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                            isChecked
                              ? `${dest.badgeColor} ring-2 ring-emerald-500/30`
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border ${
                              isChecked
                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                : 'border-slate-700'
                            }`}
                          >
                            {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                              <Icon className="w-4 h-4" />
                              <span>{dest.name}</span>
                              <span className="text-[10px] text-amber-300 font-mono font-normal">
                                ({dest.path})
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{dest.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: MULTI-LANGUAGE & 1-CLICK AI TRANSLATION */}
              {modalTab === 'translations' && (
                <div className="space-y-4">
                  {/* Master & Target Selection */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-300 block">
                          Master Source Language
                        </label>
                        <select
                          value={formSourceLang}
                          onChange={(e) => setFormSourceLang(e.target.value)}
                          className="mt-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                        >
                          {ALL_LANGUAGES.map((l) => (
                            <option key={l.code} value={l.code}>
                              {l.flag} {l.name} ({l.native})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 1-Click AI Translation Action */}
                      <button
                        type="button"
                        onClick={handleAutoTranslate}
                        disabled={translating}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-slate-950 font-extrabold text-xs shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                      >
                        <Sparkles className={`w-4 h-4 ${translating ? 'animate-spin' : ''}`} />
                        <span>{translating ? 'Translating...' : '⚡ 1-Click AI Auto-Translate'}</span>
                      </button>
                    </div>

                    {/* Target Language Selection Pills */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                        <span className="font-bold">Target Languages to Translate ({formTargetLangs.length}):</span>
                        <div className="flex items-center gap-2 text-[10px]">
                          <button
                            type="button"
                            onClick={selectAllIndianLangs}
                            className="text-amber-400 hover:underline"
                          >
                            + All Indian
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={selectAllGlobalLangs}
                            className="text-cyan-400 hover:underline"
                          >
                            + All 20 Languages
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                        {ALL_LANGUAGES.map((lang) => {
                          const isSelected = formTargetLangs.includes(lang.code);
                          return (
                            <button
                              key={lang.code}
                              type="button"
                              onClick={() => toggleTargetLang(lang.code)}
                              className={`px-2 py-0.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                isSelected
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Language Tab Inspector */}
                  <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
                    <div className="flex items-center gap-1 p-2 bg-slate-900 border-b border-slate-800 overflow-x-auto text-xs">
                      {formTargetLangs.map((code) => {
                        const langObj = ALL_LANGUAGES.find((l) => l.code === code);
                        const hasTrans = !!formTranslations[code]?.title;
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setActiveTranslationLang(code)}
                            className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition whitespace-nowrap ${
                              activeTranslationLang === code
                                ? 'bg-emerald-500 text-slate-950'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{langObj?.flag}</span>
                            <span>{langObj?.name}</span>
                            {hasTrans ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Active Language Editor */}
                    <div className="p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Translated Title ({ALL_LANGUAGES.find((l) => l.code === activeTranslationLang)?.name})
                        </label>
                        <input
                          type="text"
                          value={formTranslations[activeTranslationLang]?.title || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormTranslations((prev) => ({
                              ...prev,
                              [activeTranslationLang]: {
                                ...(prev[activeTranslationLang] || {}),
                                title: val,
                                description: prev[activeTranslationLang]?.description || '',
                              },
                            }));
                          }}
                          placeholder="Translated video title..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1">
                          Translated Description ({ALL_LANGUAGES.find((l) => l.code === activeTranslationLang)?.name})
                        </label>
                        <textarea
                          rows={3}
                          value={formTranslations[activeTranslationLang]?.description || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormTranslations((prev) => ({
                              ...prev,
                              [activeTranslationLang]: {
                                ...(prev[activeTranslationLang] || {}),
                                title: prev[activeTranslationLang]?.title || '',
                                description: val,
                              },
                            }));
                          }}
                          placeholder="Translated description..."
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: VIDEO LEAD BANNER (OVERLAY STRIP) */}
              {modalTab === 'overlay' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-white">In-Video Lead Capture Banner</div>
                        <p className="text-xs text-slate-400">
                          Displays a live clickable banner inside the video to collect registrations or workshop leads.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formOverlayEnabled}
                        onChange={(e) => setFormOverlayEnabled(e.target.checked)}
                        className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                      />
                    </div>

                    {formOverlayEnabled && (
                      <div className="space-y-3 pt-3 border-t border-slate-800">
                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">
                            Banner Text
                          </label>
                          <input
                            type="text"
                            value={formOverlayText}
                            onChange={(e) => setFormOverlayText(e.target.value)}
                            placeholder="e.g. 🌿 Join Swar Yoga Daily Live Sadhana & Masterclass"
                            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Button Label
                            </label>
                            <input
                              type="text"
                              value={formOverlayLinkText}
                              onChange={(e) => setFormOverlayLinkText(e.target.value)}
                              placeholder="Join Now"
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              Button Link URL
                            </label>
                            <input
                              type="text"
                              value={formOverlayLinkUrl}
                              onChange={(e) => setFormOverlayLinkUrl(e.target.value)}
                              placeholder="/workshops"
                              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 transition"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-slate-950 font-extrabold text-xs shadow-lg hover:shadow-emerald-500/30 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{saving ? 'Saving to Bunny Edge...' : 'Save & Syndicate Media'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIDEO PREVIEW MODAL */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center border border-white/20 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative aspect-video bg-black">
              {getYouTubeEmbedUrl(previewItem.mediaUrl) ? (
                <iframe
                  src={getYouTubeEmbedUrl(previewItem.mediaUrl)!}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : previewItem.mediaUrl ? (
                <video
                  src={previewItem.mediaUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  No video URL available
                </div>
              )}

              {/* Overlay Strip Preview */}
              {previewItem.overlayStrip?.enabled && (
                <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/85 backdrop-blur-md border border-amber-400/50 flex items-center justify-between text-xs text-white">
                  <span>{previewItem.overlayStrip.stripText}</span>
                  {previewItem.overlayStrip.stripLinkText && (
                    <Link
                      href={previewItem.overlayStrip.stripLinkUrl || '/workshops'}
                      target="_blank"
                      className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-[10px]"
                    >
                      {previewItem.overlayStrip.stripLinkText}
                    </Link>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950">
              <h3 className="font-bold text-base text-white">{previewItem.title}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-3">{previewItem.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
