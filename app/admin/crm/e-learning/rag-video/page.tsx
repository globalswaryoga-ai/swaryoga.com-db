'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Sparkles, ShieldAlert, Loader2, CheckCircle2, XCircle, Settings as SettingsIcon, Pencil, Trash2, User, Image as ImageIcon, Video as VideoIcon, Zap, Scissors, Download, Layers, AlertTriangle } from 'lucide-react';
import Mp4ToMp3Converter from './_components/Mp4ToMp3Converter';
import { compressAudioForWhisper } from '@/lib/clientAudioCompressor';

const LANGUAGE_OPTIONS = [
  { code: 'hi', name: 'Hindi' },
  { code: 'en', name: 'English' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ne', name: 'Nepali' },
  { code: 'zh', name: 'Mandarin' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ar', name: 'Arabic' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'tr', name: 'Turkish' },
];

interface AiVideoScript {
  language: string;
  text: string;
  approved: boolean;
}

interface AiVideoRender {
  language: string;
  heygenVideoId?: string;
  heygenStatus?: string;
  status: 'pending' | 'rendering' | 'uploading' | 'completed' | 'failed';
  bunnyVideoId?: string;
  bunnyEmbedUrl?: string;
  courseVideoId?: string;
  errorMessage?: string;
}

interface EbookChapter {
  language: string;
  text: string;
}

interface AiVideoJob {
  _id: string;
  sourceYoutubeUrl?: string;
  sourceLanguage: string;
  topicTitle: string;
  workshopName?: string;
  dayOrder?: number;
  targetLanguages: string[];
  status: string;
  transcript?: string;
  correctedTranscript?: string;
  scripts: AiVideoScript[];
  renders: AiVideoRender[];
  ebookChapters?: EbookChapter[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  _id: string;
  content: { en: { title: string } };
}

interface Section {
  _id: string;
  title?: string;
  name?: string;
}

const AVATAR_SETTINGS_KEY = 'ragVideoAvatarSettings';

function loadAvatarSettings(): Record<string, { avatarId: string; voiceId: string }> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(AVATAR_SETTINGS_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function RagAndVideoPage() {
  const token = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const [jobs, setJobs] = useState<AiVideoJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<AiVideoJob | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [sourceMode, setSourceMode] = useState<'audio' | 'text' | 'url'>('audio');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isAutoCompressing, setIsAutoCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [compressedInfo, setCompressedInfo] = useState<{ originalMB: number; newMB: number } | null>(null);
  
  // Audio split state (for audio > 24MB)
  const [splitBatchId, setSplitBatchId] = useState<string | null>(null);
  const [splitParts, setSplitParts] = useState<Array<{
    partNumber: number;
    topicTitle: string;
    fileName: string;
    sizeBytes: number;
    sizeMB: number;
    durationSeconds: number;
    downloadUrl: string;
  }>>([]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [activePartNumber, setActivePartNumber] = useState<number | null>(null);
  const [isBatchCreating, setIsBatchCreating] = useState(false);
  const [batchCreateSuccess, setBatchCreateSuccess] = useState<string | null>(null);

  const [sourceText, setSourceText] = useState('');
  const [referenceLink, setReferenceLink] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('hi');
  const [workshopName, setWorkshopName] = useState('');
  const [dayOrder, setDayOrder] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['hi', 'en']);
  const [correctedDraft, setCorrectedDraft] = useState('');
  const [condensing, setCondensing] = useState(false);
  const [generatingChapter, setGeneratingChapter] = useState('');

  const [compileWorkshop, setCompileWorkshop] = useState('');
  const [compileLanguage, setCompileLanguage] = useState('hi');
  const [compiling, setCompiling] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [avatarSettings, setAvatarSettings] = useState<Record<string, { avatarId: string; voiceId: string }>>({});

  const [courses, setCourses] = useState<Course[]>([]);
  const [sectionsByCourse, setSectionsByCourse] = useState<Record<string, Section[]>>({});
  const [attachChoice, setAttachChoice] = useState<Record<string, { courseId: string; sectionId: string }>>({});
  const [attaching, setAttaching] = useState<string>('');

  const [editingJobId, setEditingJobId] = useState<string>('');
  const [editDraft, setEditDraft] = useState({ topicTitle: '', workshopName: '', dayOrder: '', sourceLanguage: 'hi' });
  const [deletingJobId, setDeletingJobId] = useState<string>('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let pv2: any = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = u?.userId || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        pv2 = u?.permissionsV2 || null;
      } catch {}
    }
    setIsSuperAdmin(resolvedUserId === 'admin' || resolvedUserId === 'admincrm' || legacyPerms.includes('all') || pv2?.isSuperAdmin === true);
    setAuthChecked(true);
    setAvatarSettings(loadAvatarSettings());
  }, []);

async function safeJson(res: Response): Promise<{ ok: boolean; data: any; error?: string }> {
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { ok: res.ok, data, error: data?.error || (!res.ok ? `Request failed with status ${res.status}` : undefined) };
  } catch {
    const cleanSnippet = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
    return {
      ok: false,
      data: null,
      error: cleanSnippet ? `${cleanSnippet}` : `Request failed with status ${res.status}`,
    };
  }
}

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/jobs', { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await safeJson(res);
      if (parsed.ok && parsed.data?.success) {
        setJobs(parsed.data.data || []);
      } else if (!parsed.ok && parsed.error) {
        console.warn('Jobs fetch notice:', parsed.error);
      }
    } catch (e: any) {
      console.warn('Network error fetching jobs:', e?.message);
    }
  }, [token]);

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await safeJson(res);
      if (parsed.ok && parsed.data?.success) {
        setCourses(parsed.data.courses || parsed.data.data || []);
      }
    } catch (e) {
      console.warn('Could not fetch courses');
    }
  }, [token]);

  useEffect(() => {
    fetchJobs();
    fetchCourses();
  }, [fetchJobs, fetchCourses]);

  const fetchSections = useCallback(async (courseId: string) => {
    if (!token || !courseId || sectionsByCourse[courseId]) return;
    try {
      const res = await fetch(`/api/admin/recorded-courses/sections?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await safeJson(res);
      if (parsed.ok && parsed.data?.success) {
        setSectionsByCourse((prev) => ({ ...prev, [courseId]: parsed.data.sections || [] }));
      }
    } catch (e: any) {
      console.warn('Could not fetch sections:', e?.message);
    }
  }, [token, sectionsByCourse]);

  const refreshSelectedJob = useCallback(async (jobId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
      const parsed = await safeJson(res);
      if (parsed.ok && parsed.data?.success) {
        setSelectedJob(parsed.data.data);
        setCorrectedDraft(parsed.data.data?.correctedTranscript || '');
        return parsed.data.data as AiVideoJob;
      }
    } catch (e: any) {
      console.warn('Could not refresh job:', e?.message);
    }
    return undefined;
  }, [token]);

  // Poll while any render is in progress on the open job.
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (!selectedJob) return;
    const hasPendingRender = selectedJob.renders?.some((r) => r.status === 'rendering' || r.status === 'uploading');
    if (!hasPendingRender) return;

    pollRef.current = setInterval(async () => {
      const updated = await refreshSelectedJob(selectedJob._id);
      const stillPending = updated?.renders?.some((r) => r.status === 'rendering' || r.status === 'uploading');
      if (!stillPending && pollRef.current) {
        clearInterval(pollRef.current);
        fetchJobs();
      }
    }, 6000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedJob, refreshSelectedJob, fetchJobs]);

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const handleCompressCurrentAudio = async () => {
    if (!audioFile) return;
    setIsAutoCompressing(true);
    setCompressProgress(0);
    setCreateError('');
    try {
      const originalSize = audioFile.size / (1024 * 1024);
      const compressed = await compressAudioForWhisper(audioFile, audioFile.name, (p) => setCompressProgress(p));
      setAudioFile(compressed);
      setCompressedInfo({ originalMB: originalSize, newMB: compressed.size / (1024 * 1024) });
      setCreateError('');
    } catch (err: any) {
      console.error('Compression error:', err);
      setCreateError(`Audio compression failed: ${err?.message || err}. Please try using the converter modal above.`);
    } finally {
      setIsAutoCompressing(false);
    }
  };

  const handleSplitCurrentAudio = async () => {
    if (!audioFile || !token) return;
    setIsSplitting(true);
    setCreateError('');
    setBatchCreateSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('topicTitle', topicTitle.trim());
      formData.append('targetPartMB', '22'); // 64MB / 22MB = 3 parts of ~21.4MB (< 24MB Whisper limit)

      const res = await fetch('/api/admin/e-learning/ai-video/split-audio', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.success) {
        throw new Error(parsed.error || parsed.data?.error || 'Failed to split audio');
      }

      setSplitBatchId(parsed.data.batchId);
      setSplitParts(parsed.data.parts || []);
      setCreateError('');
    } catch (err: any) {
      console.error('Audio split error:', err);
      setCreateError(err.message || 'Failed to split audio file');
    } finally {
      setIsSplitting(false);
    }
  };

  const selectPartToWorkOn = async (part: { partNumber: number; topicTitle: string; fileName: string }) => {
    if (!splitBatchId) return;
    setIsSplitting(true);
    setCreateError('');
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/split-audio?batchId=${splitBatchId}&part=${part.partNumber}`);
      if (!res.ok) throw new Error('Failed to load audio part');
      const blob = await res.blob();
      const partFile = new File([blob], part.fileName, { type: 'audio/mp4' });
      setAudioFile(partFile);
      setActivePartNumber(part.partNumber);
      const baseTitle = topicTitle.replace(/ - Part \d+$/i, '').trim();
      const newTitle = baseTitle ? `${baseTitle} - Part ${part.partNumber}` : `Part ${part.partNumber}`;
      setTopicTitle(newTitle);
      setCompressedInfo(null);
    } catch (e: any) {
      setCreateError(`Failed to load part: ${e.message}`);
    } finally {
      setIsSplitting(false);
    }
  };

  const handleCreateAllJobs = async () => {
    if (!splitBatchId || !token) return;
    if (!topicTitle.trim()) {
      setCreateError('Please enter a Topic title before creating jobs');
      return;
    }
    if (!selectedLanguages.length) {
      setCreateError('Please select at least one target language');
      return;
    }

    setIsBatchCreating(true);
    setCreateError('');
    setBatchCreateSuccess(null);
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/jobs/batch-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          batchId: splitBatchId,
          topicTitle: topicTitle.replace(/ - Part \d+$/i, '').trim(),
          sourceLanguage,
          targetLanguages: selectedLanguages,
          workshopName: workshopName.trim() || undefined,
          dayOrder: dayOrder.trim() ? Number(dayOrder.trim()) : undefined,
        }),
      });

      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.success) {
        throw new Error(parsed.error || parsed.data?.error || 'Batch creation failed');
      }

      setBatchCreateSuccess(
        `Successfully created and transcribed ${parsed.data.createdCount} jobs (${splitParts.map(p => `Part-${p.partNumber}`).join(', ')})! Select each one from the jobs list below to work on them one by one.`
      );
      setAudioFile(null);
      setSplitParts([]);
      setSplitBatchId(null);
      setActivePartNumber(null);
      setTopicTitle('');
      fetchJobs();
      if (parsed.data.jobs?.[0]) {
        setSelectedJob(parsed.data.jobs[0]);
        setCorrectedDraft(parsed.data.jobs[0].correctedTranscript || '');
      }
    } catch (err: any) {
      setCreateError(err.message || 'Batch job creation failed');
    } finally {
      setIsBatchCreating(false);
    }
  };

  const handleCreateJob = async () => {
    const hasSource = sourceMode === 'audio' ? Boolean(audioFile) : sourceMode === 'text' ? Boolean(sourceText.trim()) : Boolean(referenceLink.trim());
    if (!token || !hasSource || !topicTitle.trim() || !selectedLanguages.length) return;

    let targetAudioFile = audioFile;
    if (sourceMode === 'audio' && audioFile) {
      const maxAudioBytes = 24 * 1024 * 1024; // 24 MB limit for Whisper transcription payload
      if (audioFile.size > maxAudioBytes) {
        setCreating(true);
        setIsAutoCompressing(true);
        setCompressProgress(0);
        setCreateError(`Audio file is ${(audioFile.size / (1024 * 1024)).toFixed(1)}MB. Auto-compressing to lightweight speech MP3 for Whisper...`);
        try {
          const originalSize = audioFile.size / (1024 * 1024);
          const compressed = await compressAudioForWhisper(audioFile, audioFile.name, (p) => setCompressProgress(p));
          setAudioFile(compressed);
          targetAudioFile = compressed;
          setCompressedInfo({ originalMB: originalSize, newMB: compressed.size / (1024 * 1024) });
          setCreateError('');
        } catch (compressionErr: any) {
          setIsAutoCompressing(false);
          setCreating(false);
          setCreateError(`Audio compression failed: ${compressionErr?.message || compressionErr}. Please click "Open MP4 to MP3 Converter" above or paste text.`);
          return;
        } finally {
          setIsAutoCompressing(false);
        }
      }
    }

    setCreating(true);
    setCreateError('');
    try {
      const formData = new FormData();
      formData.append('sourceMode', sourceMode);
      if (sourceMode === 'audio' && targetAudioFile) {
        formData.append('audioFile', targetAudioFile);
      } else if (sourceMode === 'text') {
        formData.append('sourceText', sourceText.trim());
      }
      formData.append('topicTitle', topicTitle.trim());
      formData.append('sourceLanguage', sourceLanguage);
      formData.append('targetLanguages', selectedLanguages.join(','));
      if (referenceLink.trim()) formData.append('sourceYoutubeUrl', referenceLink.trim());
      if (workshopName.trim()) formData.append('workshopName', workshopName.trim());
      if (dayOrder.trim()) formData.append('dayOrder', dayOrder.trim());

      const res = await fetch('/api/admin/e-learning/ai-video/jobs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.success) {
        throw new Error(parsed.error || parsed.data?.error || `Failed to create job (${res.status})`);
      }
      setSelectedJob(parsed.data.data);
      setCorrectedDraft(parsed.data.data.correctedTranscript || '');
      setAudioFile(null);
      setSourceText('');
      setReferenceLink('');
      setTopicTitle('');
      fetchJobs();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const updateScript = (language: string, patch: Partial<AiVideoScript>) => {
    if (!selectedJob) return;
    setSelectedJob({
      ...selectedJob,
      scripts: selectedJob.scripts.map((s) => (s.language === language ? { ...s, ...patch } : s)),
    });
  };

  const saveScript = async (language: string) => {
    if (!token || !selectedJob) return;
    const script = selectedJob.scripts.find((s) => s.language === language);
    if (!script) return;
    await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ language, text: script.text, approved: script.approved }),
    });
    fetchJobs();
  };

  const insertAvatarMarker = (language: string) => {
    const script = selectedJob?.scripts.find((s) => s.language === language);
    if (!script) return;
    updateScript(language, { text: `${script.text}\n\n[AVATAR]\n` });
  };

  const markerFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingMarker, setPendingMarker] = useState<{ language: string; mode: 'slide' | 'video' } | null>(null);
  const [insertingMarkerFor, setInsertingMarkerFor] = useState<string>('');

  const triggerMarkerUpload = (language: string, mode: 'slide' | 'video') => {
    setPendingMarker({ language, mode });
    markerFileInputRef.current?.click();
  };

  const handleMarkerFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !pendingMarker || !token) return;
    const { language, mode } = pendingMarker;
    setPendingMarker(null);
    setInsertingMarkerFor(language);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/bunny/upload-material', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.url) throw new Error(parsed.error || parsed.data?.error || 'Upload failed');
      const script = selectedJob?.scripts.find((s) => s.language === language);
      if (!script) return;
      const marker = mode === 'slide' ? `[SLIDE: ${parsed.data.url}]` : `[VIDEO: ${parsed.data.url}]`;
      updateScript(language, { text: `${script.text}\n\n${marker}\n` });
    } catch (err: any) {
      setCreateError(err.message || 'Failed to upload slide/video');
    } finally {
      setInsertingMarkerFor('');
    }
  };

  const handleSaveCorrection = async () => {
    if (!token || !selectedJob) return;
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ correctedTranscript: correctedDraft }),
      });
      const parsed = await safeJson(res);
      if (parsed.ok && parsed.data?.data) setSelectedJob(parsed.data.data);
    } catch (e: any) {
      console.warn('Could not save transcript correction:', e?.message);
    }
  };

  const handleCondense = async () => {
    if (!token || !selectedJob) return;
    setCondensing(true);
    setCreateError('');
    try {
      await handleSaveCorrection();
      const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}/condense`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.data) throw new Error(parsed.error || parsed.data?.error || 'Failed to condense');
      setSelectedJob(parsed.data.data);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to condense');
    } finally {
      setCondensing(false);
    }
  };

  const handleGenerateChapter = async (language: string) => {
    if (!token || !selectedJob) return;
    setGeneratingChapter(language);
    setCreateError('');
    try {
      await handleSaveCorrection();
      const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}/ebook-chapter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language }),
      });
      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.data) throw new Error(parsed.error || parsed.data?.error || 'Failed to generate chapter');
      setSelectedJob(parsed.data.data);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to generate chapter');
    } finally {
      setGeneratingChapter('');
    }
  };

  const handleCompileEbook = async () => {
    if (!token || !compileWorkshop.trim()) return;
    setCompiling(true);
    setCreateError('');
    try {
      const res = await fetch('/api/admin/e-learning/ai-video/ebook/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ workshopName: compileWorkshop.trim(), language: compileLanguage }),
      });
      if (!res.ok) {
        const parsed = await safeJson(res);
        throw new Error(parsed.error || parsed.data?.error || 'Failed to compile e-book');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${compileWorkshop.trim()}-${compileLanguage}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to compile e-book');
    } finally {
      setCompiling(false);
    }
  };

  const startEditJob = (job: AiVideoJob) => {
    setEditingJobId(job._id);
    setEditDraft({
      topicTitle: job.topicTitle,
      workshopName: job.workshopName || '',
      dayOrder: job.dayOrder !== undefined ? String(job.dayOrder) : '',
      sourceLanguage: job.sourceLanguage,
    });
  };

  const handleSaveJobEdit = async () => {
    if (!token || !editingJobId) return;
    const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${editingJobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editDraft),
    });
    const parsed = await safeJson(res);
    if (parsed.ok && parsed.data?.data) {
      if (selectedJob?._id === editingJobId) setSelectedJob(parsed.data.data);
      setEditingJobId('');
      fetchJobs();
    } else {
      setCreateError(parsed.error || parsed.data?.error || 'Failed to save changes');
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!token) return;
    if (!window.confirm('Delete this job? This does not remove any video already attached to a course.')) return;
    setDeletingJobId(jobId);
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const parsed = await safeJson(res);
        throw new Error(parsed.error || parsed.data?.error || 'Failed to delete job');
      }
      if (selectedJob?._id === jobId) setSelectedJob(null);
      fetchJobs();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to delete job');
    } finally {
      setDeletingJobId('');
    }
  };

  const saveAvatarSettings = (language: string, patch: Partial<{ avatarId: string; voiceId: string }>) => {
    const next = { ...avatarSettings, [language]: { ...avatarSettings[language], ...patch } };
    setAvatarSettings(next);
    if (typeof window !== 'undefined') localStorage.setItem(AVATAR_SETTINGS_KEY, JSON.stringify(next));
  };

  const handleRender = async () => {
    if (!token || !selectedJob) return;
    const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}/render`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatarByLanguage: avatarSettings }),
    });
    const parsed = await safeJson(res);
    if (parsed.data?.data) setSelectedJob(parsed.data.data);
    if (parsed.data?.errors?.length) setCreateError(parsed.data.errors.join('; '));
    else if (!parsed.ok) setCreateError(parsed.error || 'Render request failed');
    fetchJobs();
  };

  const handleAttach = async (language: string) => {
    if (!token || !selectedJob) return;
    const choice = attachChoice[language];
    if (!choice?.courseId) return;
    setAttaching(language);
    try {
      const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}/attach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ language, courseId: choice.courseId, sectionId: choice.sectionId }),
      });
      const parsed = await safeJson(res);
      if (!parsed.ok || !parsed.data?.success) throw new Error(parsed.error || parsed.data?.error || 'Failed to attach');
      await refreshSelectedJob(selectedJob._id);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to attach video to course');
    } finally {
      setAttaching('');
    }
  };

  if (!token || !authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">RAG and Video requires super admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <input
        type="file"
        ref={markerFileInputRef}
        accept={pendingMarker?.mode === 'video' ? 'video/*' : 'image/*'}
        onChange={handleMarkerFileSelected}
        className="hidden"
      />
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/crm/e-learning" className="w-10 h-10 bg-gray-900/50 border border-gray-800 rounded-xl flex items-center justify-center hover:border-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">RAG and Video</h1>
            <p className="text-sm text-gray-400">Audio → correction → condensed script → AI clone video → E-Learning</p>
          </div>
        </div>
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors text-sm"
        >
          <SettingsIcon size={16} />
          Avatar Settings
        </button>
      </div>

      <div className="mb-8">
        <Mp4ToMp3Converter
          onConverted={(file) => {
            const prevSize = audioFile ? audioFile.size / (1024 * 1024) : 0;
            setAudioFile(file);
            setSourceMode('audio');
            setCreateError('');
            if (prevSize > 0) {
              setCompressedInfo({ originalMB: prevSize, newMB: file.size / (1024 * 1024) });
            }
          }}
        />
      </div>

      {showSettings && (
        <div className="mb-6 bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1">HeyGen Avatar / Voice IDs per Language</h2>
          <p className="text-xs text-gray-500 mb-4">
            Create your avatar and voice clone in HeyGen&apos;s own dashboard first (one-time, manual step) — then paste the IDs here per language. Stored only in this browser.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LANGUAGE_OPTIONS.filter((l) => selectedLanguages.includes(l.code) || avatarSettings[l.code]).map((l) => (
              <div key={l.code} className="bg-black/40 border border-gray-800 rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-2">{l.name}</div>
                <input
                  placeholder="Avatar ID"
                  value={avatarSettings[l.code]?.avatarId || ''}
                  onChange={(e) => saveAvatarSettings(l.code, { avatarId: e.target.value })}
                  className="w-full mb-2 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                />
                <input
                  placeholder="Voice ID"
                  value={avatarSettings[l.code]?.voiceId || ''}
                  onChange={(e) => saveAvatarSettings(l.code, { voiceId: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: job list + create form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">New Job</h2>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSourceMode('audio')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  sourceMode === 'audio' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-black border-gray-700 text-gray-400'
                }`}
              >
                Audio file
              </button>
              <button
                onClick={() => setSourceMode('text')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  sourceMode === 'text' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-black border-gray-700 text-gray-400'
                }`}
              >
                Paste text
              </button>
              <button
                onClick={() => setSourceMode('url')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  sourceMode === 'url' ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-black border-gray-700 text-gray-400'
                }`}
              >
                Bunny URL
              </button>
            </div>
            {sourceMode === 'audio' ? (
              <>
                <label className="block text-xs text-gray-500 mb-1">Audio file (export from Final Cut or any tool)</label>
                <input
                  type="file"
                  accept="audio/*,video/mp4,video/quicktime,video/webm"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setAudioFile(f);
                    setCompressedInfo(null);
                    setCreateError('');
                  }}
                  className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 file:mr-3 file:px-2 file:py-1 file:rounded file:border-0 file:bg-purple-500 file:text-white"
                />

                {audioFile && audioFile.size > 24 * 1024 * 1024 && (
                  <div className="mb-4 p-4 bg-gradient-to-b from-amber-500/15 to-purple-500/10 border border-amber-500/40 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>File is {(audioFile.size / (1024 * 1024)).toFixed(1)}MB</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30">
                          Whisper Limit: 24MB
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 mb-3 leading-relaxed">
                      This recording exceeds Whisper’s 24MB limit. Split this <span className="text-white font-semibold">{(audioFile.size / (1024 * 1024)).toFixed(1)}MB</span> file into{' '}
                      <span className="text-emerald-400 font-bold">
                        {Math.max(2, Math.ceil((audioFile.size / (1024 * 1024)) / 21))} parts (~{((audioFile.size / (1024 * 1024)) / Math.max(2, Math.ceil((audioFile.size / (1024 * 1024)) / 21))).toFixed(1)}MB each)
                      </span>{' '}
                      to work on them one by one with added subjects (<span className="text-purple-300 font-mono text-[11px]">Part-1, Part-2, Part-3</span>).
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Split Button */}
                      <button
                        type="button"
                        disabled={isSplitting || isAutoCompressing}
                        onClick={handleSplitCurrentAudio}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
                      >
                        {isSplitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Splitting into {Math.max(2, Math.ceil((audioFile.size / (1024 * 1024)) / 21))} Parts (FFmpeg)...</span>
                          </>
                        ) : (
                          <>
                            <Scissors className="w-3.5 h-3.5" />
                            <span>Split into {Math.max(2, Math.ceil((audioFile.size / (1024 * 1024)) / 21))} Parts (~{((audioFile.size / (1024 * 1024)) / Math.max(2, Math.ceil((audioFile.size / (1024 * 1024)) / 21))).toFixed(1)}MB each)</span>
                          </>
                        )}
                      </button>

                      {/* Compress as 1 single file button */}
                      <button
                        type="button"
                        disabled={isAutoCompressing || isSplitting}
                        onClick={handleCompressCurrentAudio}
                        className="px-3.5 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                        title="Alternatively compress to a single lightweight 32kbps MP3"
                      >
                        {isAutoCompressing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{compressProgress > 0 ? `${compressProgress}%` : 'Compressing...'}</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Compress to 1 File</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isAutoCompressing && compressProgress > 0 && (
                      <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div className="bg-emerald-500 h-1.5 transition-all duration-200" style={{ width: `${compressProgress}%` }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Display Split Parts if available */}
                {splitParts.length > 0 && (
                  <div className="mb-4 p-4 bg-purple-950/25 border border-purple-500/40 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-purple-400" />
                        <h4 className="text-xs font-bold text-white">
                          Split into {splitParts.length} Parts (<span className="text-emerald-400 font-mono">All &lt; 24MB</span>)
                        </h4>
                      </div>
                      <span className="text-[10px] text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                        Whisper Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mb-3">
                      Select each part to work on one by one, or click &ldquo;Create All {splitParts.length} Jobs&rdquo; to auto-create and transcribe:
                    </p>

                    <div className="space-y-2 mb-3">
                      {splitParts.map((part) => {
                        const isCurrent = activePartNumber === part.partNumber;
                        const subjectName = topicTitle.replace(/ - Part \d+$/i, '').trim() || 'Subject';
                        const displayPartTitle = `${subjectName} - Part ${part.partNumber}`;

                        return (
                          <div
                            key={part.partNumber}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                              isCurrent
                                ? 'bg-purple-600/25 border-purple-500 text-white shadow-md'
                                : 'bg-black/40 border-gray-800 text-gray-300 hover:border-gray-700'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                isCurrent ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-300'
                              }`}>
                                {part.partNumber}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate max-w-[170px] sm:max-w-xs">
                                  {displayPartTitle}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono">
                                  {part.sizeMB}MB • {Math.floor(part.durationSeconds / 60)}m {part.durationSeconds % 60}s
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => selectPartToWorkOn(part)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                                  isCurrent
                                    ? 'bg-emerald-500 text-black shadow-sm'
                                    : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                                }`}
                              >
                                {isCurrent ? 'Active Part' : `Work on Part ${part.partNumber}`}
                              </button>
                              <a
                                href={part.downloadUrl}
                                download={part.fileName}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                title={`Download Part ${part.partNumber}`}
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Batch create all jobs in one shot */}
                    <button
                      type="button"
                      disabled={isBatchCreating}
                      onClick={handleCreateAllJobs}
                      className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      {isBatchCreating ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Creating & Transcribing All {splitParts.length} Jobs...</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Create All {splitParts.length} Jobs ({splitParts.map(p => `Part-${p.partNumber}`).join(', ')})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activePartNumber && (
                  <div className="mb-3 px-3 py-2 bg-purple-500/15 border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-200">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Active: Part {activePartNumber} ({audioFile ? (audioFile.size / (1024 * 1024)).toFixed(1) : ''}MB &lt; 24MB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePartNumber(null);
                        setAudioFile(null);
                        setSplitParts([]);
                        setSplitBatchId(null);
                      }}
                      className="text-[11px] text-gray-400 hover:text-white underline"
                    >
                      Reset
                    </button>
                  </div>
                )}

                {compressedInfo && audioFile && audioFile.size <= 24 * 1024 * 1024 && !activePartNumber && (
                  <div className="mb-3 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between text-xs text-emerald-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Compressed: {compressedInfo.originalMB.toFixed(1)}MB ➔ {(audioFile.size / (1024 * 1024)).toFixed(1)}MB
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-300 font-semibold">Whisper Ready</span>
                  </div>
                )}
              </>
            ) : sourceMode === 'text' ? (
              <>
                <label className="block text-xs text-gray-500 mb-1">Source text (already-transcribed or written content — skips audio transcription, goes straight to correction)</label>
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={6}
                  placeholder="Paste raw transcript or draft text here…"
                  className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </>
            ) : (
              <>
                <label className="block text-xs text-gray-500 mb-1">Video URL (Bunny, YouTube, Zoom). You MUST manually transcribe and paste text later.</label>
              </>
            )}
            <label className="block text-xs text-gray-500 mb-1">Source language (what was actually spoken/written)</label>
            <select
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value)}
              className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <input
              placeholder="Reference link (optional, e.g. the original YouTube URL)"
              value={referenceLink}
              onChange={(e) => setReferenceLink(e.target.value)}
              className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <input
              placeholder="Topic title (e.g. L-1 Day 3: Pranayama Basics)"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <div className="flex gap-2 mb-3">
              <input
                placeholder="Workshop (e.g. L-1) — groups chapters for the e-book"
                value={workshopName}
                onChange={(e) => setWorkshopName(e.target.value)}
                className="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <input
                placeholder="Day #"
                type="number"
                value={dayOrder}
                onChange={(e) => setDayOrder(e.target.value)}
                className="w-20 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {LANGUAGE_OPTIONS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => toggleLanguage(l.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    selectedLanguages.includes(l.code)
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                      : 'bg-black border-gray-700 text-gray-400'
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            {batchCreateSuccess && (
              <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-start gap-2 text-xs text-emerald-400">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>{batchCreateSuccess}</span>
              </div>
            )}
            {createError && <p className="text-xs text-red-400 mb-3">{createError}</p>}
            <button
              onClick={handleCreateJob}
              disabled={creating || !(sourceMode === 'audio' ? audioFile : sourceMode === 'text' ? sourceText.trim() : referenceLink.trim()) || !topicTitle.trim() || !selectedLanguages.length}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {creating ? 'Transcribing & correcting...' : 'Transcribe & Correct'}
            </button>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-4">Jobs</h2>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {jobs.map((job) =>
                editingJobId === job._id ? (
                  <div key={job._id} className="px-3 py-2.5 rounded-lg border border-purple-500 bg-purple-500/10 space-y-2">
                    <input
                      value={editDraft.topicTitle}
                      onChange={(e) => setEditDraft((d) => ({ ...d, topicTitle: e.target.value }))}
                      placeholder="Topic title"
                      className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-sm text-white"
                    />
                    <div className="flex gap-2">
                      <input
                        value={editDraft.workshopName}
                        onChange={(e) => setEditDraft((d) => ({ ...d, workshopName: e.target.value }))}
                        placeholder="Workshop"
                        className="flex-1 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white"
                      />
                      <input
                        value={editDraft.dayOrder}
                        onChange={(e) => setEditDraft((d) => ({ ...d, dayOrder: e.target.value }))}
                        placeholder="Day #"
                        type="number"
                        className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <select
                      value={editDraft.sourceLanguage}
                      onChange={(e) => setEditDraft((d) => ({ ...d, sourceLanguage: e.target.value }))}
                      className="w-full bg-black border border-gray-700 rounded px-2 py-1 text-xs text-white"
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <option key={l.code} value={l.code}>{l.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button onClick={handleSaveJobEdit} className="flex-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-semibold rounded">Save</button>
                      <button onClick={() => setEditingJobId('')} className="flex-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div
                    key={job._id}
                    className={`group flex items-center gap-1 px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedJob?._id === job._id ? 'bg-purple-500/10 border-purple-500' : 'bg-black border-gray-800 hover:border-gray-600'
                    }`}
                  >
                    <button onClick={() => refreshSelectedJob(job._id)} className="flex-1 text-left min-w-0">
                      <div className="text-sm text-white truncate">{job.topicTitle}</div>
                      <div className="text-xs text-gray-500">{job.status} · {job.targetLanguages.join(', ')}</div>
                    </button>
                    <button onClick={() => startEditJob(job)} className="p-1.5 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity" title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job._id)}
                      disabled={deletingJobId === job._id}
                      className="p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-100"
                      title="Delete"
                    >
                      {deletingJobId === job._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                )
              )}
              {!jobs.length && <p className="text-sm text-gray-500">No jobs yet.</p>}
            </div>
          </div>

          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold mb-1">Compile Workshop E-book</h2>
            <p className="text-xs text-gray-500 mb-3">Combines every topic's chapter for a workshop + language into one PDF, ordered by Day #.</p>
            <input
              placeholder="Workshop name (e.g. L-1)"
              value={compileWorkshop}
              onChange={(e) => setCompileWorkshop(e.target.value)}
              className="w-full mb-2 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            />
            <select
              value={compileLanguage}
              onChange={(e) => setCompileLanguage(e.target.value)}
              className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <button
              onClick={handleCompileEbook}
              disabled={compiling || !compileWorkshop.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-black font-semibold rounded-lg transition-colors text-sm"
            >
              {compiling ? 'Compiling...' : 'Compile & Download PDF'}
            </button>
          </div>
        </div>

        {/* Right: selected job detail */}
        <div className="lg:col-span-2">
          {!selectedJob && (
            <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-10 text-center text-gray-500">
              Create or select a job to review its script and render status.
            </div>
          )}

          {selectedJob && (
            <div className="space-y-6">
              <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-white font-semibold">{selectedJob.topicTitle}</h2>
                {selectedJob.sourceYoutubeUrl && <p className="text-xs text-gray-500 break-all">{selectedJob.sourceYoutubeUrl}</p>}
                <p className="text-xs text-gray-400 mt-1">Status: <span className="text-purple-300">{selectedJob.status}</span></p>
                {selectedJob.status === 'failed' && selectedJob.errorMessage && (
                  <p className="text-xs text-red-400 mt-2">{selectedJob.errorMessage}</p>
                )}
              </div>

              {(selectedJob.correctedTranscript !== undefined || selectedJob.status === 'awaiting_correction_review') && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-1">Corrected transcript ({LANGUAGE_OPTIONS.find((l) => l.code === selectedJob.sourceLanguage)?.name || selectedJob.sourceLanguage})</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Grammar/filler fixed only — nothing added beyond what was said. Review and fix anything wrong (mispronounced names, terms) before condensing — condensing only cuts material from this text, so anything wrong here carries through to every language.
                  </p>
                  <textarea
                    value={correctedDraft}
                    onChange={(e) => setCorrectedDraft(e.target.value)}
                    rows={14}
                    className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 mb-3"
                  />
                  {createError && <p className="text-xs text-red-400 mb-3">{createError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCorrection}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCondense}
                      disabled={condensing}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      {condensing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {condensing ? 'Condensing & translating...' : 'Condense & Translate →'}
                    </button>
                  </div>
                </div>
              )}

              {selectedJob.correctedTranscript !== undefined && (
                <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-white font-semibold mb-1">E-book chapters</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Rewritten as book prose from the corrected transcript above (not the spoken/condensed script) — same content, no 30-min cap, no spoken-style framing.
                  </p>
                  <div className="space-y-3">
                    {selectedJob.targetLanguages.map((lang) => {
                      const chapter = selectedJob.ebookChapters?.find((c) => c.language === lang);
                      const languageName = LANGUAGE_OPTIONS.find((l) => l.code === lang)?.name || lang;
                      return (
                        <div key={lang} className="bg-black/40 border border-gray-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-300">{languageName}</span>
                            <button
                              onClick={() => handleGenerateChapter(lang)}
                              disabled={generatingChapter === lang}
                              className="flex items-center gap-1.5 px-3 py-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                              {generatingChapter === lang ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              {chapter ? 'Regenerate' : 'Generate chapter'}
                            </button>
                          </div>
                          {chapter && (
                            <textarea
                              defaultValue={chapter.text}
                              rows={6}
                              className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300"
                              readOnly
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedJob.scripts?.map((script) => {
                const render = selectedJob.renders?.find((r) => r.language === script.language);
                const languageName = LANGUAGE_OPTIONS.find((l) => l.code === script.language)?.name || script.language;
                return (
                  <div key={script.language} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">{languageName} script</h3>
                      <label className="flex items-center gap-2 text-xs text-gray-300">
                        <input
                          type="checkbox"
                          checked={script.approved}
                          onChange={(e) => updateScript(script.language, { approved: e.target.checked })}
                        />
                        Approved
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Mark visual changes inline: place the cursor at the end and click a button below to append a marker. Between markers, the avatar talks full-frame; after a Slide/Video marker, the avatar shrinks to a corner while that image/video fills the background.
                    </p>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => insertAvatarMarker(script.language)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <User size={13} /> Avatar
                      </button>
                      <button
                        onClick={() => triggerMarkerUpload(script.language, 'slide')}
                        disabled={insertingMarkerFor === script.language}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {insertingMarkerFor === script.language ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />} + Slide
                      </button>
                      <button
                        onClick={() => triggerMarkerUpload(script.language, 'video')}
                        disabled={insertingMarkerFor === script.language}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {insertingMarkerFor === script.language ? <Loader2 size={13} className="animate-spin" /> : <VideoIcon size={13} />} + Video
                      </button>
                    </div>
                    <textarea
                      value={script.text}
                      onChange={(e) => updateScript(script.language, { text: e.target.value })}
                      rows={8}
                      className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 mb-3 font-mono"
                    />
                    <button
                      onClick={() => saveScript(script.language)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      Save
                    </button>

                    {render && (
                      <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-2 text-sm">
                        {render.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        {render.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                        {(render.status === 'rendering' || render.status === 'uploading') && <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />}
                        <span className="text-gray-300">{render.status}</span>
                        {render.errorMessage && <span className="text-red-400 text-xs">{render.errorMessage}</span>}
                      </div>
                    )}

                    {render?.status === 'completed' && !render.courseVideoId && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={attachChoice[script.language]?.courseId || ''}
                          onChange={(e) => {
                            const courseId = e.target.value;
                            setAttachChoice((prev) => ({ ...prev, [script.language]: { courseId, sectionId: '' } }));
                            fetchSections(courseId);
                          }}
                          className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white"
                        >
                          <option value="">Select course...</option>
                          {courses.map((c) => (
                            <option key={c._id} value={c._id}>{c.content?.en?.title || c._id}</option>
                          ))}
                        </select>
                        {attachChoice[script.language]?.courseId && (
                          <select
                            value={attachChoice[script.language]?.sectionId || ''}
                            onChange={(e) => setAttachChoice((prev) => ({ ...prev, [script.language]: { ...prev[script.language], sectionId: e.target.value } }))}
                            className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white"
                          >
                            <option value="">No section</option>
                            {(sectionsByCourse[attachChoice[script.language]?.courseId] || []).map((s) => (
                              <option key={s._id} value={s._id}>{s.title || s.name || s._id}</option>
                            ))}
                          </select>
                        )}
                        <button
                          onClick={() => handleAttach(script.language)}
                          disabled={!attachChoice[script.language]?.courseId || attaching === script.language}
                          className="px-4 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-40 text-black text-sm font-semibold rounded-lg transition-colors"
                        >
                          {attaching === script.language ? 'Attaching...' : 'Attach to course'}
                        </button>
                      </div>
                    )}
                    {render?.courseVideoId && <p className="mt-3 text-xs text-green-400">Attached to course as video {render.courseVideoId}</p>}
                  </div>
                );
              })}

              {selectedJob.scripts?.some((s) => s.approved) && (
                <button
                  onClick={handleRender}
                  className="px-5 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Render approved scripts with HeyGen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
