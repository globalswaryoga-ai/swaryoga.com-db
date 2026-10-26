'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Video,
  Film,
  Radio,
  Share2,
  Globe,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ExternalLink,
  Play,
  Layers,
  Calendar,
  Eye,
  MessageSquare,
  Users,
  Tv,
  Check,
  Plus,
  RefreshCw,
  X,
  Zap,
  ThumbsUp,
  Heart,
  Search,
  Edit3,
  Settings,
  Link2,
  Copy,
  Pin,
  ShieldAlert,
  Smartphone,
  ArrowRight,
  ListMusic,
  Clock,
  Filter,
  Sliders,
  Send,
  HelpCircle
} from 'lucide-react';

const WORKSHOP_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi (हिंदी)', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi (मराठी)', flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada (ಕನ್ನಡ)', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali (नेपाली)', flag: '🇳🇵' },
  { code: 'zh', name: 'Mandarin (中文)', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸' },
  { code: 'fr', name: 'French (Français)', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦' },
  { code: 'de', name: 'German (Deutsch)', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese (Português)', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese (日本語)', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean (한국어)', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian (Русский)', flag: '🇷🇺' },
  { code: 'it', name: 'Italian (Italiano)', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish (Türkçe)', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch (Nederlands)', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish (Svenska)', flag: '🇸🇪' },
  { code: 'th', name: 'Thai (ไทย)', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian (Bahasa)', flag: '🇮🇩' },
];

const DESTINATIONS = [
  { id: 'media', label: 'Media Page', subtitle: 'Public YouTube-style website & app', icon: Tv, color: 'from-rose-600 to-red-600' },
  { id: 'e-learning', label: 'E-Learning', subtitle: 'Course & workshop catalog', icon: Layers, color: 'from-purple-600 to-indigo-600' },
  { id: 'community', label: 'Community', subtitle: 'Sadhana private feeds & posts', icon: Users, color: 'from-emerald-600 to-teal-600' },
  { id: 'social-media', label: 'Social Media', subtitle: 'YouTube, Facebook, Insta, X', icon: Share2, color: 'from-amber-600 to-orange-600' },
];

const MEDIA_TYPES = [
  { id: 'video', label: 'Video (16:9)', icon: Video, desc: 'High-res horizontal video' },
  { id: 'shorts', label: 'Shorts (9:16)', icon: Zap, desc: 'Vertical video up to 2 mins' },
  { id: 'playlist', label: 'Playlist', icon: Film, desc: 'Curated series of episodes' },
  { id: 'post', label: 'Community Post', icon: MessageSquare, desc: 'Image & text announcement' },
  { id: 'live', label: 'Live Session', icon: Radio, desc: 'Live stream or recorded replay' },
];

const SOCIAL_CHANNELS = [
  { id: 'youtube', label: 'YouTube', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'facebook', label: 'Facebook', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'instagram', label: 'Instagram', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { id: 'twitter', label: 'Twitter / X', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
];

export type MediaStudioTab =
  | 'm-creation'
  | 'create'
  | 'videos'
  | 'shorts'
  | 'playlists'
  | 'live'
  | 'comments'
  | 'likes-shares';

interface MediaCreationViewProps {
  token: string | null;
}

export default function MediaCreationView({ token }: MediaCreationViewProps) {
  // Top Header Pages (Defaults to 1st page: 'm-creation' - One Language to Many Languages Video System)
  const [activeTab, setActiveTab] = useState<MediaStudioTab>('m-creation');

  // Language filter for Videos & Shorts sidebar
  const [selectedLang, setSelectedLang] = useState<string>('all');

  // Search by word or number in studio working area
  const [searchQuery, setSearchQuery] = useState('');

  // Media Library state
  const [existingItems, setExistingItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Comments state for Comment Moderation Tab
  const [commentsList, setCommentsList] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentFilter, setCommentFilter] = useState<'all' | 'approved' | 'pinned' | 'flagged'>('all');
  const [commentSearch, setCommentSearch] = useState('');

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showOverlayModal, setShowOverlayModal] = useState(false);
  const [selectedItemForOverlay, setSelectedItemForOverlay] = useState<any | null>(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  // ── ORIGINAL CREATION FORM STATE ──────────────────────────────────
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(['media', 'e-learning']);
  const [mediaType, setMediaType] = useState<'video' | 'shorts' | 'playlist' | 'post' | 'live'>('video');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [shortsSeconds, setShortsSeconds] = useState<number>(60);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; label: string }>>([
    { id: 'swar_yoga', label: 'Swar Yoga & Pranayama' },
    { id: 'ayurveda_recipe', label: 'Ayurveda Recipe & Diet' },
    { id: 'sadhana', label: 'Daily Sadhana' },
    { id: 'workshop', label: 'Workshops & Retreats' },
    { id: 'general', label: 'General Guidance' },
  ]);
  const [category, setCategory] = useState('swar_yoga');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [tagsList, setTagsList] = useState<string[]>(['yoga', 'pranayama', 'health', 'swaryoga']);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [liveStatus, setLiveStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [liveScheduledAt, setLiveScheduledAt] = useState('');
  const [selectedSocials, setSelectedSocials] = useState<string[]>(['youtube', 'facebook']);
  const [sourceLang, setSourceLang] = useState('hi');
  const [targetLangs, setTargetLangs] = useState<string[]>([
    'en', 'hi', 'mr', 'kn', 'ne', 'zh', 'es', 'fr', 'ar', 'de',
    'pt', 'ja', 'ko', 'ru', 'it', 'tr', 'nl', 'sv', 'th', 'id'
  ]);
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Live Strip & Popup Overlay Form State
  const [overlayForm, setOverlayForm] = useState({
    enabled: false,
    stripText: '🔴 Join Swar Yoga Live Workshop • Special Sadhak Discount',
    stripLinkText: 'Register Now',
    stripLinkUrl: '/workshops',
    position: 'top' as 'top' | 'bottom',
    popupEnabled: false,
    popupSeconds: 20,
    popupTitle: 'Download Free Daily Sadhana Chart',
    popupMessage: 'Master the science of left and right nostril breathing with our official chart.',
    popupLinkText: 'Download PDF',
    popupLinkUrl: '/blog',
  });

  // Playlist Builder Form State
  const [playlistForm, setPlaylistForm] = useState({
    id: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    selectedVideoIds: [] as string[],
  });

  // Uploading state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Protected share selected video
  const [shareVideoId, setShareVideoId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const thumbInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Toggle Destination
  const toggleDestination = (id: string) => {
    setSelectedDestinations((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  // Toggle Social Channel
  const toggleSocial = (channel: string) => {
    setSelectedSocials((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  // Toggle Target Language
  const toggleTargetLang = (code: string) => {
    setTargetLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  // Select all / clear all target languages
  const selectAllTargetLangs = () => {
    setTargetLangs(WORKSHOP_LANGUAGES.map((l) => l.code));
  };
  const clearAllTargetLangs = () => {
    setTargetLangs([]);
  };

  // Add Custom Category
  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const catId = newCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const newCat = { id: catId, label: newCategoryName.trim() };
    setCategoriesList((prev) => [...prev, newCat]);
    setCategory(catId);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  // Add Tag
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const cleanTag = newTagInput.trim().toLowerCase().replace(/#/g, '');
    if (!tagsList.includes(cleanTag)) {
      setTagsList((prev) => [...prev, cleanTag]);
    }
    setNewTagInput('');
    setShowAddTag(false);
  };

  const handleRemoveTag = (t: string) => {
    setTagsList((prev) => prev.filter((tag) => tag !== t));
  };

  // 1. Fetch Media Items
  const loadExistingItems = async () => {
    try {
      setLoadingItems(true);
      const res = await fetch('/api/media?limit=100&status=published');
      const data = await res.json();
      if (data.success && data.data?.items) {
        setExistingItems(data.data.items);
        if (!shareVideoId && data.data.items.length > 0) {
          setShareVideoId(data.data.items[0].id);
        }
      }
    } catch (e) {
      console.warn('Failed to load media items:', e);
    } finally {
      setLoadingItems(false);
    }
  };

  // 2. Fetch Comments
  const loadComments = async () => {
    try {
      setLoadingComments(true);
      const res = await fetch('/api/media/comments?limit=100');
      const data = await res.json();
      if (data.success && data.data?.comments) {
        setCommentsList(data.data.comments);
      }
    } catch (e) {
      console.warn('Failed to load comments:', e);
    } finally {
      setLoadingComments(false);
    }
  };

  useEffect(() => {
    loadExistingItems();
    loadComments();
  }, []);

  // Filter items by active tab (videos, shorts, playlists, live)
  const tabFilteredItems = useMemo(() => {
    if (activeTab === 'videos') {
      return existingItems.filter((i) => i.type === 'video');
    }
    if (activeTab === 'shorts') {
      return existingItems.filter((i) => i.type === 'shorts');
    }
    if (activeTab === 'playlists') {
      return existingItems.filter((i) => i.type === 'playlist');
    }
    if (activeTab === 'live') {
      return existingItems.filter((i) => i.type === 'live');
    }
    return existingItems;
  }, [existingItems, activeTab]);

  // Language count map for the sidebar
  const languageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of tabFilteredItems) {
      const src = item.sourceLanguage || 'en';
      counts[src] = (counts[src] || 0) + 1;
      if (item.translations) {
        for (const lang of Object.keys(item.translations)) {
          counts[lang] = (counts[lang] || 0) + 1;
        }
      }
    }
    return counts;
  }, [tabFilteredItems]);

  // Filter working area by language & search query (Word and Number)
  const workingAreaItems = useMemo(() => {
    return tabFilteredItems.filter((item) => {
      // Language filter
      if (selectedLang !== 'all') {
        const matchesLang =
          item.sourceLanguage === selectedLang ||
          Boolean(item.translations && item.translations[selectedLang]);
        if (!matchesLang) return false;
      }

      // Search Query filter (Word & Number)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = q.match(/\d+/);
        const searchNum = numMatch ? parseInt(numMatch[0], 10) : null;

        const titleMatch = item.title.toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some((t: string) => t.toLowerCase().includes(q));
        const categoryMatch = (item.category || '').toLowerCase().includes(q);
        const idMatch = item.id.toLowerCase().includes(q);

        const durationMatch =
          searchNum !== null &&
          item.durationSeconds &&
          (Math.round(item.durationSeconds / 60) === searchNum ||
            item.durationSeconds === searchNum);

        return titleMatch || descMatch || tagMatch || categoryMatch || idMatch || durationMatch;
      }

      return true;
    });
  }, [tabFilteredItems, selectedLang, searchQuery]);

  // File Uploader Handler
  const handleFileUpload = async (file: File, isThumb = false) => {
    if (!token) {
      showToast('⚠️ Please login as admin to upload');
      return;
    }
    setIsUploading(true);
    setUploadPercent(0);

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('folder', isThumb ? 'media-thumbnails' : 'media-videos');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/media-upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadPercent(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.url) {
            if (isThumb) {
              setThumbnailUrl(resp.url);
            } else {
              setMediaUrl(resp.url);
              if (!title) {
                setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
              }
            }
            showToast('✅ Upload complete!');
          }
        } catch {}
      } else {
        showToast('❌ Upload failed. Please try again.');
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      showToast('❌ Network error during upload');
    };

    xhr.send(formDataUpload);
  };

  // Submit Primary Media Creation (Our Original Complete Form)
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setPublishStatus({ success: false, message: 'Please provide a Title for this media item.' });
      return;
    }

    try {
      setIsPublishing(true);
      setPublishStatus(null);

      const payload = {
        type: mediaType,
        destinations: selectedDestinations,
        title: title.trim(),
        description: description.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
        thumbnailUrl: thumbnailUrl.trim() || undefined,
        durationSeconds: mediaType === 'shorts' ? shortsSeconds : durationMinutes * 60,
        sourceLanguage: sourceLang,
        targetLanguages: targetLangs,
        autoTranslate,
        socialChannels: selectedDestinations.includes('social-media') ? selectedSocials : [],
        liveStatus: mediaType === 'live' ? liveStatus : undefined,
        liveScheduledAt: mediaType === 'live' ? liveScheduledAt : undefined,
        category,
        tags: tagsList,
        status: 'published',
      };

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to publish media item');
      }

      setPublishStatus({
        success: true,
        message: `🎉 Successfully created and published across ${selectedDestinations.length} destination(s) and translated to ${targetLangs.length} language(s)!`,
      });

      // Clear form
      setTitle('');
      setDescription('');
      setMediaUrl('');
      setThumbnailUrl('');

      loadExistingItems();
    } catch (err: any) {
      setPublishStatus({ success: false, message: err.message || 'An error occurred during publishing.' });
    } finally {
      setIsPublishing(false);
    }
  };

  // Open Edit Modal for existing video/short
  const openEditModal = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || '');
    setMediaUrl(item.mediaUrl || '');
    setThumbnailUrl(item.thumbnailUrl || '');
    setMediaType(item.type);
    setCategory(item.category || 'swar_yoga');
    setTagsList(item.tags || []);
    setShowAddModal(true);
  };

  // Open Live Strip & Overlay Modal
  const openOverlayModal = (item: any) => {
    setSelectedItemForOverlay(item);
    const existing = item.overlayStrip || {};
    setOverlayForm({
      enabled: existing.enabled ?? true,
      stripText: existing.stripText || '🔴 Join Swar Yoga Live Workshop • Special Sadhak Discount',
      stripLinkText: existing.stripLinkText || 'Register Now',
      stripLinkUrl: existing.stripLinkUrl || '/workshops',
      position: existing.position || 'top',
      popupEnabled: existing.popupEnabled ?? false,
      popupSeconds: existing.popupSeconds ?? 20,
      popupTitle: existing.popupTitle || 'Download Free Daily Sadhana Chart',
      popupMessage:
        existing.popupMessage ||
        'Master the science of left and right nostril breathing with our official chart.',
      popupLinkText: existing.popupLinkText || 'Download PDF',
      popupLinkUrl: existing.popupLinkUrl || '/blog',
    });
    setShowOverlayModal(true);
  };

  // Save Live Strip & Popup Overlay
  const handleSaveOverlay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemForOverlay) return;

    try {
      setIsSubmitting(true);
      const updatedItem = {
        ...selectedItemForOverlay,
        overlayStrip: overlayForm,
      };

      const res = await fetch('/api/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatedItem),
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save overlay');

      showToast('🎬 Live Strip & Overlay Popup updated!');
      setShowOverlayModal(false);
      loadExistingItems();
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Media Item
  const handleDeleteMedia = async (id: string, itemTitle?: string) => {
    if (!confirm(`Are you sure you want to delete this media item?`)) return;
    try {
      const res = await fetch(`/api/media?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setExistingItems((prev) => prev.filter((i) => i.id !== id));
        showToast('🗑️ Media item deleted');
      } else {
        showToast('❌ Failed to delete');
      }
    } catch (e) {
      showToast('❌ Error deleting item');
    }
  };

  // Delete Comment Action
  const handleDeleteComment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;
    try {
      const res = await fetch(`/api/media/comments?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCommentsList((prev) => prev.filter((c) => c.id !== id));
        showToast('🗑️ Comment deleted from platform');
      } else {
        showToast('❌ Failed to delete comment');
      }
    } catch (e) {
      showToast('❌ Network error deleting comment');
    }
  };

  // Pin/Flag Comment Action
  const handleUpdateCommentStatus = async (id: string, newStatus: 'approved' | 'pinned' | 'flagged') => {
    try {
      const res = await fetch('/api/media/comments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        setCommentsList((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
        );
        showToast(`⭐ Comment status updated to ${newStatus}`);
      }
    } catch (e) {
      showToast('❌ Error updating comment status');
    }
  };

  // Filtered comments
  const filteredComments = useMemo(() => {
    return commentsList.filter((c) => {
      if (commentFilter !== 'all' && c.status !== commentFilter) return false;
      if (commentSearch.trim()) {
        const q = commentSearch.toLowerCase();
        return (
          c.authorName.toLowerCase().includes(q) ||
          c.commentText.toLowerCase().includes(q) ||
          (c.mediaTitle || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [commentsList, commentFilter, commentSearch]);

  // Protected Share URL calculation
  const protectedShareUrl = useMemo(() => {
    if (!shareVideoId) return 'https://swaryoga.com/media';
    return `https://swaryoga.com/media?v=${shareVideoId}&ref=share`;
  }, [shareVideoId]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-cyan-500 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* STUDIO HEADER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <Sparkles className="w-3.5 h-3.5" />
              <span>Swar Yoga Media Studio &bull; One Language to Many Languages Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              M-Creation &bull; Auto-Distribution System
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Create once in one language, auto-translate into all 20 standardized languages, and publish directly across your Public Media Page, E-Learning Courses, Community Feed, and Social Media channels.
            </p>
          </div>

          <a
            href="/media"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Open Public Media Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-blue-200" />
          </a>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          7 HEADER PAGES TABS:
          1. M-Creation (1st Page: One Language to Many Languages)
          2. Videos
          3. Shorts
          4. Playlists
          5. Live
          6. Comments
          7. Likes & Share
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-md">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
          {/* TAB 1: 1ST PAGE M-CREATION */}
          <button
            type="button"
            onClick={() => setActiveTab('m-creation')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'm-creation' || activeTab === 'create'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg ring-2 ring-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300 fill-cyan-300/30" />
            <span>M-Creation</span>
          </button>

          {/* TAB 2: VIDEOS */}
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Videos</span>
          </button>

          {/* TAB 3: SHORTS */}
          <button
            type="button"
            onClick={() => setActiveTab('shorts')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'shorts'
                ? 'bg-red-600 text-white shadow-lg ring-2 ring-red-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Shorts (9:16)</span>
          </button>

          {/* TAB 4: PLAYLISTS */}
          <button
            type="button"
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'playlists'
                ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Film className="w-4 h-4" />
            <span>Playlists</span>
          </button>

          {/* TAB 5: LIVE */}
          <button
            type="button"
            onClick={() => setActiveTab('live')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'live'
                ? 'bg-rose-600 text-white shadow-lg ring-2 ring-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Live Stream</span>
          </button>

          {/* TAB 6: COMMENTS */}
          <button
            type="button"
            onClick={() => setActiveTab('comments')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer relative ${
              activeTab === 'comments'
                ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Comments</span>
            {commentsList.length > 0 && (
              <span className="px-1.5 py-0.2 bg-black/40 text-[10px] rounded-full">
                {commentsList.length}
              </span>
            )}
          </button>

          {/* TAB 7: LIKES & SHARE */}
          <button
            type="button"
            onClick={() => setActiveTab('likes-shares')}
            className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === 'likes-shares'
                ? 'bg-amber-600 text-white shadow-lg ring-2 ring-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Share2 className="w-4 h-4" />
            <span>Likes &amp; Share</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HEADER PAGE 1: M-CREATION (ONE LANGUAGE TO MANY LANGUAGES SYSTEM)
      ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'm-creation' || activeTab === 'create') && (
        <div className="space-y-6">
          {/* TOP: Target Destination Selectors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Target Destinations (Select Where This Publishes)</span>
              </label>
              <span className="text-xs text-slate-400">
                {selectedDestinations.length} destination(s) selected
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DESTINATIONS.map((dest) => {
                const Icon = dest.icon;
                const isSelected = selectedDestinations.includes(dest.id);
                return (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => toggleDestination(dest.id)}
                    className={`relative p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-500/50 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${dest.color} flex items-center justify-center text-white shadow-md`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                        isSelected ? 'bg-cyan-500 border-cyan-400 text-black' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{dest.label}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{dest.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Social Channels Selector if Social Media destination is enabled */}
          {selectedDestinations.includes('social-media') && (
            <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Select Connected Social Media Channels
              </label>
              <div className="flex flex-wrap gap-2">
                {SOCIAL_CHANNELS.map((ch) => {
                  const isCh = selectedSocials.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleSocial(ch.id)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCh ? ch.color : 'bg-slate-950 text-slate-500 border-slate-800'
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isCh ? 'opacity-100' : 'opacity-20'}`} />
                      <span>{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Creation Form & Live Preview */}
          <form onSubmit={handlePublish} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Form Details & Assets */}
            <div className="lg:col-span-2 space-y-6 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              {/* Media Type Tabs */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Select Media Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                  {MEDIA_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isCurrent = mediaType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setMediaType(t.id as any);
                          if (t.id === 'shorts') setAspectRatio('9:16');
                          else setAspectRatio('16:9');
                        }}
                        className={`flex items-center gap-1.5 justify-center px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Swar Yoga Morning Sadhana: Balancing Ida & Pingala"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Description / Caption
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description, practice steps, or lecture notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                />
              </div>

              {/* Media File Upload & URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Video / Audio URL</span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Bunny CDN</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://... or upload file"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center justify-between">
                    <span>Cover Thumbnail URL</span>
                    <button
                      type="button"
                      onClick={() => thumbInputRef.current?.click()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Image</span>
                    </button>
                  </label>
                  <input
                    type="text"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://... or upload image"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-500 placeholder-slate-600"
                  />
                  <input
                    ref={thumbInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                  />
                </div>
              </div>

              {/* Upload Progress Bar */}
              {isUploading && (
                <div className="space-y-1.5 bg-slate-950 p-3 rounded-xl border border-cyan-500/30">
                  <div className="flex items-center justify-between text-xs text-cyan-400 font-bold">
                    <span>Uploading directly to Bunny CDN storage...</span>
                    <span>{uploadPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Duration Settings */}
              {mediaType === 'shorts' ? (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    Shorts Duration (Max 2 minutes / 120s)
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[15, 30, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setShortsSeconds(sec)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          shortsSeconds === sec
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-slate-950 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Estimated Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={360}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">
                      Aspect Ratio
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAspectRatio('16:9')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          aspectRatio === '16:9'
                            ? 'bg-blue-600 text-white shadow'
                            : 'bg-slate-950 text-slate-400'
                        }`}
                      >
                        16:9 Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => setAspectRatio('9:16')}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          aspectRatio === '9:16'
                            ? 'bg-red-600 text-white shadow'
                            : 'bg-slate-950 text-slate-400'
                        }`}
                      >
                        9:16 Vertical
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category & Tags Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">Category</label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-xs text-cyan-400 hover:underline cursor-pointer"
                    >
                      + Add New Category
                    </button>
                  </div>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>

                  {showAddCategory && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Tags Management */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">Tags / Search Keywords</label>
                    <button
                      type="button"
                      onClick={() => setShowAddTag(!showAddTag)}
                      className="text-xs text-cyan-400 hover:underline cursor-pointer"
                    >
                      + Add Tag
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 bg-slate-950 border border-slate-800 rounded-xl">
                    {tagsList.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:text-rose-400 ml-0.5"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  {showAddTag && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Tag name (e.g. nostril, sleep)..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleAddTag}
                        className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Language Auto-Translation Controls */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span>1-Click Multi-Language Translation (20 Languages)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Automatically translate title and description into selected target languages upon publishing.
                    </p>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoTranslate}
                      onChange={(e) => setAutoTranslate(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <span className="text-xs font-bold text-purple-300">Enable AI Translation</span>
                  </label>
                </div>

                {autoTranslate && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Target Languages ({targetLangs.length} selected):</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllTargetLangs}
                          className="text-cyan-400 hover:underline font-semibold"
                        >
                          Select All (20)
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={clearAllTargetLangs}
                          className="text-slate-400 hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto pr-1 no-scrollbar">
                      {WORKSHOP_LANGUAGES.map((lang) => {
                        const isTarget = targetLangs.includes(lang.code);
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => toggleTargetLang(lang.code)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                              isTarget
                                ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold'
                                : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}
                          >
                            <span>{lang.flag}</span>
                            <span className="truncate">{lang.name.split(' ')[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Publishing Status Banner */}
              {publishStatus && (
                <div
                  className={`p-4 rounded-2xl flex items-center gap-3 text-xs ${
                    publishStatus.success
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {publishStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span>{publishStatus.message}</span>
                </div>
              )}

              {/* Big Publish Button */}
              <button
                type="submit"
                disabled={isPublishing}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl transition-all active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing &amp; Auto-Translating Across {targetLangs.length} Languages...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Publish &amp; Distribute to {selectedDestinations.length} Destination(s)</span>
                  </>
                )}
              </button>
            </div>

            {/* Right Column: Live Card Preview */}
            <div className="space-y-4">
              <div className="sticky top-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Live Public Card Preview</span>
                  </label>
                  <span className="text-[11px] text-cyan-400 font-bold uppercase">
                    {mediaType}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-3 p-3">
                  {/* Thumbnail / Aspect Preview */}
                  <div
                    className={`relative ${
                      mediaType === 'shorts' ? 'aspect-[9/16] max-h-80 mx-auto' : 'aspect-video'
                    } w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center`}
                  >
                    {thumbnailUrl ? (
                      <img src={thumbnailUrl} alt={title || 'Preview'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-600 space-y-2">
                        {mediaType === 'shorts' ? <Zap className="w-10 h-10" /> : <Play className="w-10 h-10" />}
                        <span className="text-xs">No Thumbnail Uploaded</span>
                      </div>
                    )}

                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-[10px] font-bold text-white rounded">
                      {mediaType === 'shorts' ? `${shortsSeconds}s` : `${durationMinutes}:00`}
                    </span>
                  </div>

                  {/* Title & Preview info */}
                  <div className="p-1 space-y-1.5">
                    <h4 className="text-sm font-bold text-white line-clamp-2">
                      {title || 'Your Video Title will appear here...'}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {description || 'Detailed video lecture description or instructions...'}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      {selectedDestinations.map((d) => (
                        <span
                          key={d}
                          className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold"
                        >
                          {d}
                        </span>
                      ))}
                      {autoTranslate && targetLangs.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                          🌐 {targetLangs.length} Langs
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>

          {/* Published Media Library at bottom */}
          <div className="space-y-4 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-purple-400" />
                <h3 className="text-lg font-bold text-white">Live Published Media Library</h3>
                <span className="text-xs text-slate-400">({existingItems.length} items)</span>
              </div>
              <button
                type="button"
                onClick={loadExistingItems}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {loadingItems ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>Loading published media...</span>
              </div>
            ) : existingItems.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-500 text-xs">
                No media items published yet. Fill out the form above to publish your first video or post!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {existingItems.map((item) => {
                  const langCount = Object.keys(item.translations || {}).length + 1;
                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative aspect-video bg-black">
                          {item.thumbnailUrl ? (
                            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600">
                              <Play className="w-8 h-8" />
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-bold text-white">
                            {item.type.toUpperCase()}
                          </div>
                        </div>
                        <div className="p-4 space-y-1.5">
                          <h4 className="text-sm font-bold text-white line-clamp-2">{item.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {(item.destinations || []).map((d: string) => (
                              <span
                                key={d}
                                className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold"
                              >
                                {d}
                              </span>
                            ))}
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                              🌐 {langCount} Langs
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <a
                          href={`/media?v=${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Watch</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id, item.title)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HEADER PAGE 2 & 3: VIDEOS OR SHORTS (With Language Sidebar + Working Area)
      ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'videos' || activeTab === 'shorts') && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* LEFT SIDEBAR: All 20 Languages with Video Count */}
          <div className="lg:col-span-1 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3 sticky top-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Languages</span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold">20 Supported</span>
            </div>

            {/* All Languages button */}
            <button
              type="button"
              onClick={() => setSelectedLang('all')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedLang === 'all'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>🌐</span>
                <span>All Languages</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px]">
                {tabFilteredItems.length}
              </span>
            </button>

            {/* 20 Languages List */}
            <div className="space-y-1 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
              {WORKSHOP_LANGUAGES.map((lang) => {
                const count = languageCounts[lang.code] || 0;
                const isSelected = selectedLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelectedLang(lang.code)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 text-white font-bold shadow-md'
                        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{lang.flag}</span>
                      <span className="truncate">{lang.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        count > 0 ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT WORKING AREA: Search bar, +Add Button, and Media Cards */}
          <div className="lg:col-span-3 space-y-4">
            {/* Working Area Toolbar */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar (Word & Number) */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab} by word or number (e.g. Swar, Day 1, #2, 10m)...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Direct Add New Button */}
              <button
                type="button"
                onClick={() => {
                  setMediaType(activeTab === 'shorts' ? 'shorts' : 'video');
                  setActiveTab('m-creation');
                }}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer shrink-0 ${
                  activeTab === 'shorts' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>+ Add New {activeTab === 'shorts' ? 'Short' : 'Video'}</span>
              </button>
            </div>

            {/* Results Count Banner */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing {workingAreaItems.length} {activeTab} in{' '}
                <span className="text-white font-bold">
                  {selectedLang === 'all'
                    ? 'All Languages'
                    : WORKSHOP_LANGUAGES.find((l) => l.code === selectedLang)?.name || selectedLang}
                </span>
                {searchQuery && ` matching "${searchQuery}"`}
              </span>
              <button
                type="button"
                onClick={loadExistingItems}
                className="flex items-center gap-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            {/* Working Area Media Cards Grid */}
            {loadingItems ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Loading {activeTab}...</span>
              </div>
            ) : workingAreaItems.length === 0 ? (
              <div className="py-20 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-6 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                  {activeTab === 'shorts' ? <Zap className="w-7 h-7" /> : <Play className="w-7 h-7" />}
                </div>
                <h3 className="text-base font-bold text-white">No {activeTab} found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  No {activeTab} found for this language or search term. Click "+ Add New" above to create one!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMediaType(activeTab === 'shorts' ? 'shorts' : 'video');
                    setActiveTab('m-creation');
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  + Add First {activeTab === 'shorts' ? 'Short' : 'Video'}
                </button>
              </div>
            ) : (
              <div
                className={`grid gap-4 ${
                  activeTab === 'shorts'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                }`}
              >
                {workingAreaItems.map((item) => {
                  const langCount = Object.keys(item.translations || {}).length + 1;
                  const hasOverlay = Boolean(item.overlayStrip?.enabled || item.overlayStrip?.stripText);

                  return (
                    <div
                      key={item.id}
                      className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-md flex flex-col justify-between group transition-all"
                    >
                      <div>
                        {/* Thumbnail */}
                        <div
                          className={`relative ${
                            activeTab === 'shorts' ? 'aspect-[9/16]' : 'aspect-video'
                          } bg-black overflow-hidden`}
                        >
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-600">
                              {activeTab === 'shorts' ? (
                                <Zap className="w-8 h-8 text-red-500" />
                              ) : (
                                <Play className="w-8 h-8 text-blue-500" />
                              )}
                            </div>
                          )}

                          {/* Duration Badge */}
                          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/85 rounded text-[10px] font-bold text-white">
                            {item.durationSeconds
                              ? activeTab === 'shorts'
                                ? `${item.durationSeconds}s`
                                : `${Math.floor(item.durationSeconds / 60)}:${String(
                                    item.durationSeconds % 60
                                  ).padStart(2, '0')}`
                              : 'Video'}
                          </span>

                          {/* Live Strip Indicator Badge if enabled */}
                          {hasOverlay && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-rose-600/90 backdrop-blur-md rounded-md text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1 shadow">
                              <Radio className="w-2.5 h-2.5 animate-pulse" />
                              <span>Live Strip On</span>
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="p-3.5 space-y-2">
                          <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {item.description || 'No description provided.'}
                          </p>

                          {/* Tags & Language Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-semibold">
                              🌐 {langCount} Langs
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                              {(item.viewsCount || 1000).toLocaleString()} views
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Working Area Action Buttons: Edit, Live Strip, Watch, Delete */}
                      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/40 grid grid-cols-4 gap-1 text-[11px]">
                        {/* 1. Edit */}
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
                          title="Edit Title & Keywords"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="hidden sm:inline">Edit</span>
                        </button>

                        {/* 2. Live Strip / Overlay */}
                        <button
                          type="button"
                          onClick={() => openOverlayModal(item)}
                          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 font-bold transition-all cursor-pointer"
                          title="Add Live Strip or Popup Banner (like YouTube)"
                        >
                          <Radio className="w-3.5 h-3.5 text-rose-400" />
                          <span className="hidden sm:inline">Strip</span>
                        </button>

                        {/* 3. Watch / Preview */}
                        <a
                          href={`/media?v=${item.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 border border-blue-800/40 font-bold transition-all cursor-pointer text-center"
                          title="Watch in Media Player"
                        >
                          <Play className="w-3.5 h-3.5 text-blue-400" />
                          <span className="hidden sm:inline">Watch</span>
                        </a>

                        {/* 4. Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteMedia(item.id, item.title)}
                          className="flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 font-bold transition-all cursor-pointer"
                          title="Delete Video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HEADER PAGE 4: PLAYLISTS (Create & Manage Curated Video Series)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'playlists' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                <span>Swar Yoga Playlists &amp; Series Builder</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Group videos into step-by-step masterclasses and practice playlists.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlaylistForm({
                  id: '',
                  title: '',
                  description: '',
                  thumbnailUrl: '',
                  selectedVideoIds: [],
                });
                setShowPlaylistModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Create New Playlist</span>
            </button>
          </div>

          {/* Playlist items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {tabFilteredItems.map((pl) => (
              <div
                key={pl.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-black">
                    {pl.thumbnailUrl ? (
                      <img src={pl.thumbnailUrl} alt={pl.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-indigo-950/40 text-purple-400">
                        <Layers className="w-8 h-8" />
                      </div>
                    )}
                    <div className="absolute right-0 inset-y-0 w-2/5 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-white border-l border-white/10">
                      <ListMusic className="w-5 h-5 mb-1 text-purple-400" />
                      <span className="text-xs font-bold">
                        {(pl.playlistItems || []).length || 8} Videos
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h4 className="text-sm font-bold text-white line-clamp-1">{pl.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {pl.description || 'Curated Swar Yoga official course series.'}
                    </p>
                  </div>
                </div>

                <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs">
                  <a
                    href={`/media?v=${pl.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1"
                  >
                    <span>View Playlist</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteMedia(pl.id, pl.title)}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HEADER PAGE 5: LIVE STREAM (Broadcaster, Schedule & Ticker Strip)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
                <span>Live Stream &amp; Daily Sadhana Broadcasts</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Schedule Zoom / YouTube / RTMP live broadcasts with custom live ticker strips.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setMediaType('live');
                setActiveTab('m-creation');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Schedule Live Broadcast</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tabFilteredItems.map((live) => (
              <div
                key={live.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>{live.liveStatus ? live.liveStatus.toUpperCase() : 'UPCOMING'}</span>
                  </span>
                  <span className="text-xs text-slate-400">
                    {live.liveScheduledAt ? new Date(live.liveScheduledAt).toLocaleString() : 'Daily 5:30 AM'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{live.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{live.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openOverlayModal(live)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Live Strip Settings</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMedia(live.id, live.title)}
                    className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HEADER PAGE 6: COMMENTS MODERATION (Card View with Delete/Pin Actions)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          {/* Comments Filter & Search Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(['all', 'approved', 'pinned', 'flagged'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCommentFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                    commentFilter === st
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                placeholder="Search comments by sadhak or keyword..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Comments Cards Grid */}
          {loadingComments ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Loading comments...</span>
            </div>
          ) : filteredComments.length === 0 ? (
            <div className="py-20 text-center bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-slate-500 text-xs">
              No comments found matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredComments.map((c) => (
                <div
                  key={c.id}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-lg space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Sadhak Info */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-xs shrink-0">
                          {c.authorAvatar ? (
                            <img src={c.authorAvatar} alt={c.authorName} className="w-full h-full object-cover" />
                          ) : (
                            c.authorName.slice(0, 1)
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">{c.authorName}</h4>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {c.status === 'pinned' && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5 fill-current" />
                          <span>Pinned</span>
                        </span>
                      )}
                    </div>

                    {/* Associated Video Badge */}
                    {c.mediaTitle && (
                      <div className="text-[10px] text-slate-400 bg-slate-950 px-2 py-1 rounded-md line-clamp-1 border border-slate-800/80">
                        📺 {c.mediaTitle}
                      </div>
                    )}

                    {/* Comment Content */}
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                      "{c.commentText}"
                    </p>
                  </div>

                  {/* Actions: Pin, Delete Non-relevant */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateCommentStatus(c.id, c.status === 'pinned' ? 'approved' : 'pinned')
                      }
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Pin className="w-3 h-3" />
                      <span>{c.status === 'pinned' ? 'Unpin' : 'Pin to Top'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Delete non-relevant or spam comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          HEADER PAGE 7: LIKES & PROTECTED SHARE (Platform-Only Player & App Install Trigger)
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'likes-shares' && (
        <div className="space-y-6">
          {/* Top Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Total Masterclasses</span>
              <div className="text-2xl font-black text-white mt-1">
                {existingItems.filter((i) => i.type === 'video').length}
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Vertical Shorts</span>
              <div className="text-2xl font-black text-red-400 mt-1">
                {existingItems.filter((i) => i.type === 'shorts').length}
              </div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Estimated Views</span>
              <div className="text-2xl font-black text-blue-400 mt-1">1.8M+</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <span className="text-xs text-slate-400 font-semibold">Total Sadhak Likes</span>
              <div className="text-2xl font-black text-amber-400 mt-1">142K+</div>
            </div>
          </div>

          {/* Protected Platform-Only Share Link Generator */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-2">
                <Share2 className="w-3.5 h-3.5" />
                <span>Protected Viral Share System</span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Generate Protected Platform-Only Share Links
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
                When a video is shared, recipients can <strong className="text-white">only watch it directly on our Swar Yoga platform</strong>. When opened, they receive an official branded banner and popup prompt to <strong className="text-amber-400">Download the Swar Yoga App</strong>.
              </p>
            </div>

            {/* Video Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Select Video or Short to Share</label>
              <select
                value={shareVideoId}
                onChange={(e) => setShareVideoId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {existingItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    [{item.type.toUpperCase()}] {item.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Generated Protected Link Box */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 truncate">
                <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-mono text-amber-200 truncate">{protectedShareUrl}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(protectedShareUrl);
                    showToast('📋 Protected share link copied to clipboard!');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>
                <a
                  href={protectedShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Test Link</span>
                </a>
              </div>
            </div>

            {/* Live Preview of App Download Popup & Logo */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Preview of What Shared External Viewers See on Our Platform
              </span>

              <div className="bg-slate-950 border border-amber-500/30 rounded-2xl p-5 max-w-lg shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xl shadow-lg shrink-0">
                    ॐ
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-extrabold text-white">Swar Yoga Official Platform</h4>
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">
                        ✓
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Vedic Swar Yoga &amp; Shiva Swarodaya Academy</p>
                  </div>
                </div>

                <div className="mt-3.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  📱 <strong>Download the Swar Yoga App</strong> for live daily sadhana sessions, nostril breath timer, and personalized health recommendations.
                </div>

                <div className="mt-3.5 flex items-center gap-2">
                  <button
                    type="button"
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-md text-center"
                  >
                    Download Swar Yoga App
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                  >
                    Continue on Web
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EDIT EXISTING VIDEO / SHORT METADATA
      ───────────────────────────────────────────────────────────── */}
      {showAddModal && editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Edit {editingItem.type.toUpperCase()}: {editingItem.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setIsSubmitting(true);
                  const payload = {
                    ...editingItem,
                    title: title.trim(),
                    description: description.trim(),
                    category,
                    tags: tagsList,
                  };
                  const res = await fetch('/api/media', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                  });
                  if (res.ok) {
                    showToast('✅ Video details updated successfully!');
                    setShowAddModal(false);
                    loadExistingItems();
                  }
                } catch (err: any) {
                  showToast(`❌ Error: ${err.message}`);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Search Keywords / Tags</label>
                <input
                  type="text"
                  value={tagsList.join(', ')}
                  onChange={(e) =>
                    setTagsList(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: LIVE STRIP & POPUP OVERLAY EDITOR (Like YouTube)
      ───────────────────────────────────────────────────────────── */}
      {showOverlayModal && selectedItemForOverlay && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-rose-800/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-400" />
                <span>Live Strip &amp; Popup Overlay Settings (Like YouTube)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowOverlayModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Configure an interactive ticker strip or mid-video popup for: <br />
              <strong className="text-white">"{selectedItemForOverlay.title}"</strong>
            </p>

            <form onSubmit={handleSaveOverlay} className="space-y-4">
              {/* Section 1: Live Strip Ticker */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-rose-300 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Live Strip Banner (Top / Bottom of Video)</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={overlayForm.enabled}
                    onChange={(e) => setOverlayForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 accent-rose-500 rounded cursor-pointer"
                  />
                </div>

                {overlayForm.enabled && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Banner Ticker Text
                      </label>
                      <input
                        type="text"
                        value={overlayForm.stripText}
                        onChange={(e) => setOverlayForm((prev) => ({ ...prev, stripText: e.target.value }))}
                        placeholder="e.g. 🔴 Next Swar Yoga Batch Starts Sunday • Flat 50% Off"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Action Button Label
                        </label>
                        <input
                          type="text"
                          value={overlayForm.stripLinkText}
                          onChange={(e) =>
                            setOverlayForm((prev) => ({ ...prev, stripLinkText: e.target.value }))
                          }
                          placeholder="Join Workshop"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Destination Link URL
                        </label>
                        <input
                          type="text"
                          value={overlayForm.stripLinkUrl}
                          onChange={(e) =>
                            setOverlayForm((prev) => ({ ...prev, stripLinkUrl: e.target.value }))
                          }
                          placeholder="/workshops"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">Strip Position</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['top', 'bottom'] as const).map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => setOverlayForm((prev) => ({ ...prev, position: pos }))}
                            className={`py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                              overlayForm.position === pos
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Mid-Video Popup Modal Trigger */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Interactive Mid-Video Popup Modal</span>
                  </label>
                  <input
                    type="checkbox"
                    checked={overlayForm.popupEnabled}
                    onChange={(e) =>
                      setOverlayForm((prev) => ({ ...prev, popupEnabled: e.target.checked }))
                    }
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                </div>

                {overlayForm.popupEnabled && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Trigger at Second
                        </label>
                        <input
                          type="number"
                          value={overlayForm.popupSeconds}
                          onChange={(e) =>
                            setOverlayForm((prev) => ({ ...prev, popupSeconds: Number(e.target.value) }))
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-slate-400 block mb-1">
                          Popup Heading
                        </label>
                        <input
                          type="text"
                          value={overlayForm.popupTitle}
                          onChange={(e) =>
                            setOverlayForm((prev) => ({ ...prev, popupTitle: e.target.value }))
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-400 block mb-1">
                        Popup Message
                      </label>
                      <input
                        type="text"
                        value={overlayForm.popupMessage}
                        onChange={(e) =>
                          setOverlayForm((prev) => ({ ...prev, popupMessage: e.target.value }))
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOverlayModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Live Strip Settings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE PLAYLIST
      ───────────────────────────────────────────────────────────── */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-purple-800/80 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                <span>Create New Playlist</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPlaylistModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!playlistForm.title.trim()) return;
                try {
                  setIsSubmitting(true);
                  const payload = {
                    type: 'playlist',
                    title: playlistForm.title.trim(),
                    description: playlistForm.description.trim(),
                    thumbnailUrl: playlistForm.thumbnailUrl.trim() || undefined,
                    playlistItems: playlistForm.selectedVideoIds.map((id, idx) => ({
                      title: `Episode ${idx + 1}`,
                      videoUrl: `/media?v=${id}`,
                      order: idx + 1,
                    })),
                    destinations: ['media'],
                    status: 'published',
                  };

                  const res = await fetch('/api/media', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                  });
                  if (res.ok) {
                    showToast('🎉 Playlist created successfully!');
                    setShowPlaylistModal(false);
                    loadExistingItems();
                  }
                } catch (err: any) {
                  showToast(`❌ Error: ${err.message}`);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Playlist Title</label>
                <input
                  type="text"
                  required
                  value={playlistForm.title}
                  onChange={(e) => setPlaylistForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Shiva Swarodaya 7-Day Complete Foundation"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              {/* Select Videos to include */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Select Videos to Include ({playlistForm.selectedVideoIds.length} selected)
                </label>
                <div className="max-h-52 overflow-y-auto space-y-1.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {existingItems
                    .filter((i) => i.type === 'video')
                    .map((v) => {
                      const isSelected = playlistForm.selectedVideoIds.includes(v.id);
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            setPlaylistForm((prev) => ({
                              ...prev,
                              selectedVideoIds: isSelected
                                ? prev.selectedVideoIds.filter((id) => id !== v.id)
                                : [...prev.selectedVideoIds, v.id],
                            }));
                          }}
                          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-purple-900/40 text-purple-200' : 'hover:bg-slate-900 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-3.5 h-3.5 accent-purple-500 rounded"
                          />
                          <span className="text-xs truncate">{v.title}</span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlaylistModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  Save Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
