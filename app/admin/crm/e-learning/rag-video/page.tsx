'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Sparkles, ShieldAlert, Loader2, CheckCircle2, XCircle, Settings as SettingsIcon, Pencil, Trash2 } from 'lucide-react';

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

  const [sourceMode, setSourceMode] = useState<'audio' | 'text'>('audio');
  const [audioFile, setAudioFile] = useState<File | null>(null);
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

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/e-learning/ai-video/jobs', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setJobs(data.data);
  }, [token]);

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    const res = await fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setCourses(data.courses || data.data || []);
  }, [token]);

  useEffect(() => {
    fetchJobs();
    fetchCourses();
  }, [fetchJobs, fetchCourses]);

  const fetchSections = useCallback(async (courseId: string) => {
    if (!token || !courseId || sectionsByCourse[courseId]) return;
    const res = await fetch(`/api/admin/recorded-courses/sections?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setSectionsByCourse((prev) => ({ ...prev, [courseId]: data.sections || [] }));
  }, [token, sectionsByCourse]);

  const refreshSelectedJob = useCallback(async (jobId: string) => {
    if (!token) return;
    const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${jobId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) {
      setSelectedJob(data.data);
      setCorrectedDraft(data.data.correctedTranscript || '');
    }
    return data.data as AiVideoJob | undefined;
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

  const handleCreateJob = async () => {
    const hasSource = sourceMode === 'audio' ? Boolean(audioFile) : Boolean(sourceText.trim());
    if (!token || !hasSource || !topicTitle.trim() || !selectedLanguages.length) return;
    setCreating(true);
    setCreateError('');
    try {
      const formData = new FormData();
      if (sourceMode === 'audio' && audioFile) {
        formData.append('audioFile', audioFile);
      } else {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');
      setSelectedJob(data.data);
      setCorrectedDraft(data.data.correctedTranscript || '');
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

  const handleSaveCorrection = async () => {
    if (!token || !selectedJob) return;
    const res = await fetch(`/api/admin/e-learning/ai-video/jobs/${selectedJob._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ correctedTranscript: correctedDraft }),
    });
    const data = await res.json();
    if (data.data) setSelectedJob(data.data);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to condense');
      setSelectedJob(data.data);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate chapter');
      setSelectedJob(data.data);
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to compile e-book');
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
    const data = await res.json();
    if (res.ok) {
      if (selectedJob?._id === editingJobId) setSelectedJob(data.data);
      setEditingJobId('');
      fetchJobs();
    } else {
      setCreateError(data.error || 'Failed to save changes');
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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete job');
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
    const data = await res.json();
    if (data.data) setSelectedJob(data.data);
    if (data.errors?.length) setCreateError(data.errors.join('; '));
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach');
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
            </div>
            {sourceMode === 'audio' ? (
              <>
                <label className="block text-xs text-gray-500 mb-1">Audio file (export from Final Cut or any tool)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full mb-3 bg-black border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-300 file:mr-3 file:px-2 file:py-1 file:rounded file:border-0 file:bg-purple-500 file:text-white"
                />
              </>
            ) : (
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
            {createError && <p className="text-xs text-red-400 mb-3">{createError}</p>}
            <button
              onClick={handleCreateJob}
              disabled={creating || !(sourceMode === 'audio' ? audioFile : sourceText.trim()) || !topicTitle.trim() || !selectedLanguages.length}
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
                {selectedJob.errorMessage && <p className="text-xs text-red-400 mt-2">{selectedJob.errorMessage}</p>}
              </div>

              {selectedJob.correctedTranscript !== undefined && (
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
                    <textarea
                      value={script.text}
                      onChange={(e) => updateScript(script.language, { text: e.target.value })}
                      rows={8}
                      className="w-full bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 mb-3"
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
