'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText,
  Copy,
  Download,
  ArrowRight,
  Sparkles,
  BookOpen,
  Search,
  Check,
  Edit3,
  Eye,
  Share2,
} from 'lucide-react';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';
import {
  WORKSHOP_OPTIONS,
  DAY_OPTIONS,
  TOPIC_OPTIONS,
  getLibraryCorpusText,
  stripToPurePlainText,
} from './masterLibraryCorpus';

interface PlainTextWorkspaceProps {
  token: string | null;
  selectedLang: string;
  onLanguageSelect: (lang: string) => void;
  selectedWorkshop: string;
  onWorkshopChange: (workshop: string) => void;
  selectedDay: string;
  onDayChange: (day: string) => void;
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  text: string;
  onTextChange: (text: string) => void;
  onProceedToHumor?: () => void;
}

export default function PlainTextWorkspace({
  token,
  selectedLang,
  onLanguageSelect,
  selectedWorkshop,
  onWorkshopChange,
  selectedDay,
  onDayChange,
  selectedTopic,
  onTopicChange,
  text,
  onTextChange,
  onProceedToHumor,
}: PlainTextWorkspaceProps) {
  const [langSearch, setLangSearch] = useState('');
  const [viewMode, setViewMode] = useState<'reader' | 'editor'>('reader');
  const [savingCorpus, setSavingCorpus] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [dbLibraryTopics, setDbLibraryTopics] = useState<Array<{ id: string; label: string; count: number; sourceId?: string }>>([]);
  const [dbSources, setDbSources] = useState<Array<{ id: string; title: string; topic: string; charCount: number; originalFileName?: string }>>([]);

  // Dynamically load actual topics and sources from the Library Database
  React.useEffect(() => {
    if (!token) return;
    let isCancelled = false;
    const fetchDbTopics = async () => {
      try {
        const params = new URLSearchParams();
        if (selectedWorkshop !== 'all') params.set('module', selectedWorkshop);
        if (selectedLang) params.set('language', selectedLang);
        const queryStr = params.toString() ? `?${params.toString()}` : '';
        const res = await fetch(`/api/admin/crm/mohan-rag/knowledge${queryStr}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const sources = Array.isArray(data.sources) ? data.sources : [];
        const sourcesList = sources.map((s: any) => ({
          id: String(s.id),
          title: String(s.title || 'Untitled Lecture'),
          topic: String(s.topic || ''),
          charCount: Number(s.contentLength || s.content?.length || 0),
          originalFileName: String(s.originalFileName || ''),
          language: String(s.language || selectedLang),
        }));
        const topicMap = new Map<string, { count: number; sourceId: string; maxLen: number }>();
        for (const s of sources) {
          const tName = (s.topic || s.title || 'Uncategorized').trim();
          const sLen = Number(s.contentLength || s.content?.length || 0);
          const existing = topicMap.get(tName);
          if (existing) {
            existing.count += 1;
            if (sLen > existing.maxLen) {
              existing.maxLen = sLen;
              existing.sourceId = s.id;
            }
          } else {
            topicMap.set(tName, { count: 1, sourceId: s.id, maxLen: sLen });
          }
        }
        const topicsList: Array<{ id: string; label: string; count: number; sourceId?: string }> = [];
        for (const [name, meta] of topicMap.entries()) {
          topicsList.push({
            id: name,
            label: name,
            count: meta.count,
            sourceId: meta.sourceId,
          });
        }
        if (!isCancelled) {
          setDbSources(sourcesList);
          setDbLibraryTopics(topicsList);

          // AUTO-LOAD REAL VIDEO LECTURE DATA IN THE MATCHING LANGUAGE ONLY
          if (sources.length > 0 && selectedTopic === 'all' && (!text || text.includes('सर्व कार्यशाळा व १६ दिवसांचा संपूर्ण अभ्यासक्रम') || text.includes('मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)'))) {
            // Find real video lecture matching this language
            const realSources = sourcesList.filter(s => s.charCount > 2000 && !s.title.toLowerCase().includes('syllabus'));
            realSources.sort((a, b) => b.charCount - a.charCount);
            const topSource = realSources[0] || sourcesList.find(s => s.charCount > 600) || sourcesList[0];
            if (topSource && topSource.charCount > 600) {
              try {
                const sRes = await fetch(`/api/admin/crm/mohan-rag/knowledge/${topSource.id}`, { headers: { Authorization: `Bearer ${token}` } });
                const sData = await sRes.json();
                const clean = stripToPurePlainText(sData.source?.content || '');
                if (clean && clean.length > 500) {
                  onTextChange(clean);
                  onTopicChange(`src_${topSource.id}`);
                  setStatusMsg(`✅ Loaded authentic video lecture speech "${topSource.title}" (${clean.length.toLocaleString()} characters) from Library Database.`);
                }
              } catch {}
            }
          }
        }
      } catch {}
    };
    fetchDbTopics();
    return () => { isCancelled = true; };
  }, [token, selectedWorkshop, selectedLang]);

  // Pure plain text: ALWAYS strip any emotion/hummer tags or cues
  const purePlainText = useMemo(() => stripToPurePlainText(text), [text]);

  const currentLangObj = ELEARNING_LANGUAGES.find(l => l.code === selectedLang) || ELEARNING_LANGUAGES[0];
  const currentWorkshopLabel = WORKSHOP_OPTIONS.find(w => w.id === selectedWorkshop)?.label || 'All Workshops';
  const currentDayLabel = DAY_OPTIONS.find(d => d.id === selectedDay)?.label || 'All Days';
  const currentTopicList = TOPIC_OPTIONS[selectedWorkshop] || TOPIC_OPTIONS.all;
  const currentDbTopic = dbLibraryTopics.find(t => 
    t.id === selectedTopic || 
    t.label === selectedTopic || 
    `lib_topic_${t.label}` === selectedTopic ||
    selectedTopic.replace(/^lib_topic_/, '') === t.label
  );
  const currentTopicLabel = currentDbTopic 
    ? currentDbTopic.label 
    : (currentTopicList.find(t => t.id === selectedTopic)?.label || currentTopicList[0]?.label || selectedTopic || 'All Topics');

  const wordCount = purePlainText.trim() ? purePlainText.trim().split(/\s+/).length : 0;
  const charCount = purePlainText.length;
  const paragraphCount = purePlainText.trim() ? purePlainText.trim().split(/\n\n+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 130));

  const filteredLanguages = ELEARNING_LANGUAGES.filter(lang => {
    if (!langSearch.trim()) return true;
    const q = langSearch.toLowerCase();
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.nativeName.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const handleLanguageClick = (code: string) => {
    onLanguageSelect(code);
    const newCorpus = getLibraryCorpusText(code, selectedWorkshop, selectedDay, selectedTopic);
    const clean = stripToPurePlainText(newCorpus);
    onTextChange(clean);
    const langObj = ELEARNING_LANGUAGES.find(l => l.code === code);
    setStatusMsg(`Loaded ${langObj?.name || code} pure plain text.`);
  };

  const handleSelectTopic = async (topicId: string) => {
    onTopicChange(topicId);

    let targetSourceId = '';
    let targetLabel = '';

    if (topicId.startsWith('src_')) {
      targetSourceId = topicId.replace(/^src_/, '');
      const sObj = dbSources.find(s => s.id === targetSourceId);
      targetLabel = sObj?.title || 'Selected Source';
    } else {
      const directSource = dbSources.find(s => s.id === topicId || s.title === topicId);
      if (directSource) {
        targetSourceId = directSource.id;
        targetLabel = directSource.title;
      } else {
        const match = dbLibraryTopics.find(t => 
          t.id === topicId || 
          t.label === topicId || 
          `lib_topic_${t.label}` === topicId ||
          topicId.replace(/^lib_topic_/, '') === t.label
        );
        if (match?.sourceId) {
          targetSourceId = match.sourceId;
          targetLabel = match.label;
        }
      }
    }

    if (targetSourceId) {
      try {
        setStatusMsg(`Loading "${targetLabel}" from Library Database...`);
        const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${targetSourceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const d = await res.json();
        const raw = d.source?.content || '';
        const clean = stripToPurePlainText(raw);
        if (clean) {
          onTextChange(clean);
          setStatusMsg(`✅ Loaded "${targetLabel}" (${clean.length.toLocaleString()} characters) from Library.`);
          return;
        }
      } catch (err: any) {
        setStatusMsg(`Failed to load from library: ${err.message}`);
      }
    }

    // If 'all' or no specific source was selected, prioritize the real video lecture data from dbSources!
    if (dbSources.length > 0) {
      const realSources = dbSources.filter(s => s.charCount > 2000 && !s.title.toLowerCase().includes('syllabus'));
      realSources.sort((a, b) => b.charCount - a.charCount);
      const topSource = realSources[0] || dbSources.find(s => s.charCount > 600) || dbSources[0];
      if (topSource && topSource.charCount > 600) {
        try {
          setStatusMsg(`Loading real video lecture speech "${topSource.title}" from Library Database...`);
          const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${topSource.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const d = await res.json();
          const raw = d.source?.content || '';
          const clean = stripToPurePlainText(raw);
          if (clean && clean.length > 500) {
            onTextChange(clean);
            onTopicChange(`src_${topSource.id}`);
            setStatusMsg(`✅ Loaded real video lecture speech "${topSource.title}" (${clean.length.toLocaleString()} characters) from Library.`);
            return;
          }
        } catch {}
      }
    }

    const newCorpus = getLibraryCorpusText(selectedLang, selectedWorkshop, selectedDay, topicId);
    const clean = stripToPurePlainText(newCorpus);
    onTextChange(clean);
    const chosenTopic = currentTopicList.find(t => t.id === topicId)?.label || topicId;
    setStatusMsg(`Loaded "${chosenTopic}" in pure plain text.`);
  };

  const handleSubmitNavigation = async () => {
    await handleSelectTopic(selectedTopic);
  };

  const handleAutoTranslate = async () => {
    if (!purePlainText.trim()) return;
    setTranslating(true);
    setStatusMsg(`Converting plain text to ${currentLangObj.name} (${currentLangObj.nativeName})...`);
    try {
      const res = await fetch('/api/avatar/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: purePlainText, targetLang: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      const translated = data.cleanText || data.translatedText || data.translatedScript;
      if (translated) {
        const clean = stripToPurePlainText(translated);
        onTextChange(clean);
        setStatusMsg(`✅ Pure plain text converted to ${currentLangObj.name} with sacred terms preserved.`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Conversion notice: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(purePlainText);
    setCopied(true);
    setStatusMsg('✅ Plain text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([purePlainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SwarYoga_${selectedLang}_${selectedWorkshop}_${selectedDay}_PlainText.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('✅ Plain text downloaded as .TXT file.');
  };

  const handleSaveToCorpus = async () => {
    if (!token) {
      setStatusMsg('ℹ️ Saved locally. Log in as admin to save to cloud database.');
      return;
    }
    if (!purePlainText.trim()) return;

    setSavingCorpus(true);
    setStatusMsg('Saving approved plain text master to Bunny Database...');
    try {
      const validModule = ['why', 'level1', 'level2', 'level3', 'general', 'research'].includes(selectedWorkshop)
        ? selectedWorkshop
        : 'level1';
      const res = await fetch('/api/admin/crm/mohan-rag/knowledge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: validModule,
          title: `[Plain Text Master] ${currentLangObj.name} - ${currentTopicLabel}`.slice(0, 150),
          topic: currentTopicLabel.slice(0, 150),
          content: purePlainText,
          language: ['hi', 'mr', 'en'].includes(selectedLang) ? selectedLang : 'auto',
          sourceReference: `Plain Text Master [${selectedWorkshop} • ${selectedDay} • ${selectedTopic}]`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setStatusMsg(`✅ Approved Plain Text Master saved to Bunny Database successfully!`);
    } catch (err: any) {
      setStatusMsg(`❌ Save notice: ${err.message}`);
    } finally {
      setSavingCorpus(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: 27+ Languages */}
      <div className="w-full lg:w-80 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-base">🌐</span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Language Library
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Plain Text
          </span>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search language..."
            value={langSearch}
            onChange={e => setLangSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
          />
        </div>

        {/* Language List */}
        <div className="mt-3 space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {filteredLanguages.map(lang => {
            const isSelected = selectedLang === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageClick(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{lang.flag || '🌐'}</span>
                  <div className="truncate">
                    <span className="block truncate">{lang.name}</span>
                    <span className={`text-[10px] block ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {lang.nativeName}
                    </span>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Workspace: ONLY Pure Plain Text */}
      <div className="flex-1 w-full space-y-5">
        {/* Navigation Selector Bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Workshop Dropdown */}
            <div className="flex flex-col gap-1 min-w-[180px] flex-1 sm:flex-initial">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>📚</span> Workshop Name
              </label>
              <select
                value={selectedWorkshop}
                onChange={e => onWorkshopChange(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {WORKSHOP_OPTIONS.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </div>

            {/* Day Dropdown */}
            <div className="flex flex-col gap-1 min-w-[140px] flex-1 sm:flex-initial">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>📅</span> Select Day
              </label>
              <select
                value={selectedDay}
                onChange={e => onDayChange(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {DAY_OPTIONS.map(d => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Topic Dropdown */}
            <div className="flex flex-col gap-1 min-w-[200px] flex-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                <span>🎯</span> Select Topic
              </label>
              <select
                value={selectedTopic}
                onChange={e => handleSelectTopic(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {dbSources.length > 0 && (
                  <optgroup label={`📹 All Saved Video Lectures & Sources (${dbSources.length} from Library)`}>
                    {dbSources.map(s => (
                      <option key={s.id} value={`src_${s.id}`}>
                        📹 {s.title} {s.topic && s.topic !== s.title ? `· [${s.topic}]` : ''} ({Math.round(s.charCount / 5)} words)
                      </option>
                    ))}
                  </optgroup>
                )}
                {dbLibraryTopics.length > 0 && (
                  <optgroup label={`📁 Library Topic Categories (${dbLibraryTopics.length} groups)`}>
                    {dbLibraryTopics.map(t => (
                      <option key={t.id} value={t.id}>
                        📁 {t.label} ({t.count} {t.count === 1 ? 'source' : 'sources'})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="📖 Master Teaching Syllabus Reference">
                  {(TOPIC_OPTIONS[selectedWorkshop] || TOPIC_OPTIONS.all).map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col gap-1 self-end">
              <label className="text-[10px] font-black uppercase tracking-wider text-transparent select-none hidden sm:block">
                Submit
              </label>
              <button
                type="button"
                onClick={handleSubmitNavigation}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition active:scale-95 shadow-md shadow-emerald-700/25 ring-1 ring-emerald-500 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Load Topic</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Clean Master Header Card */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 flex-wrap">
                <span className="text-emerald-700 font-extrabold">▶ {currentLangObj.name}</span>
                <span>&gt;</span>
                <span>{currentWorkshopLabel}</span>
                {selectedDay !== 'all' && (
                  <>
                    <span>&gt;</span>
                    <span>{currentDayLabel}</span>
                  </>
                )}
                <span>&gt;</span>
                <span className="text-slate-800">{currentTopicLabel}</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>{currentTopicLabel}</span>
              </h2>
              <p className="text-xs text-slate-500">
                Teacher: <strong className="text-slate-700">Shri Mohan Kalburgi (श्री मोहन कालबुर्गी)</strong> • 100% Verbatim Master Knowledge (No summarization, no omission)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                {wordCount} words • {paragraphCount} paragraphs • ~{readTime}m read
              </span>

              {/* View Switcher: Reader vs Editor */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('reader')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    viewMode === 'reader'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Reader</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                    viewMode === 'editor'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Header & Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copied ? 'Copied!' : 'Copy Plain Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download .TXT</span>
            </button>

            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={translating}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>{translating ? 'Translating...' : `Auto-Convert to ${currentLangObj.name}`}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToCorpus}
              disabled={savingCorpus}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>{savingCorpus ? 'Saving...' : 'Save Plain Text Master'}</span>
            </button>

            {onProceedToHumor && (
              <button
                type="button"
                onClick={onProceedToHumor}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Add Humor &amp; Emotion</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
            <span>{statusMsg}</span>
            <button type="button" onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        {/* PURE PLAIN TEXT CONTAINER */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Pure Master Plain Text (Clean Approved Script)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Zero Tags • 100% Knowledge Intact
            </span>
          </div>

          {viewMode === 'reader' ? (
            /* Clean Document Reader Mode: High legibility, paper feel, pure plain text */
            <div className="p-8 md:p-10 bg-gradient-to-b from-stone-50/40 to-white max-w-none">
              <article className="prose prose-slate max-w-none">
                <div className="space-y-5 text-slate-900 text-base md:text-lg leading-relaxed font-sans">
                  {purePlainText ? (
                    purePlainText.split(/\n\n+/).map((para, idx) => {
                      const trimmed = para.trim();
                      if (!trimmed) return null;
                      if (trimmed.startsWith('#') || trimmed.startsWith('===') || trimmed.startsWith('---') || trimmed.startsWith('【')) {
                        return (
                          <h3 key={idx} className="text-lg md:text-xl font-black text-slate-900 pt-3 border-b border-slate-200 pb-1">
                            {trimmed.replace(/^[#=\-—\s]+/, '')}
                          </h3>
                        );
                      }
                      return (
                        <p key={idx} className="whitespace-pre-line text-slate-800 leading-8">
                          {trimmed}
                        </p>
                      );
                    })
                  ) : (
                    <p className="text-slate-400 italic">No plain text content available. Select a workshop topic above.</p>
                  )}
                </div>
              </article>
            </div>
          ) : (
            /* Editor Mode: Direct plain text editing */
            <div className="p-6">
              <textarea
                rows={22}
                value={purePlainText}
                onChange={e => onTextChange(stripToPurePlainText(e.target.value))}
                className="w-full text-base font-mono text-slate-900 bg-slate-50/40 border border-slate-200 rounded-xl p-5 leading-relaxed focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner resize-y"
                placeholder="Plain text content..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

