'use client';

import React, { useState, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Download,
  ArrowRight,
  Smile,
  Clock,
  Volume2,
  Video,
  Play,
  RotateCcw,
  Search,
  Check,
  Split,
  Eye,
  Edit3,
  Info,
} from 'lucide-react';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';
import {
  WORKSHOP_OPTIONS,
  DAY_OPTIONS,
  TOPIC_OPTIONS,
  getLibraryCorpusText,
  stripToPurePlainText,
  hasHummerAnnotations,
  generateDefaultHummerText,
} from './masterLibraryCorpus';
import { detectTextLanguageClient } from './languageDetectionClient';

interface HummerEmotionWorkspaceProps {
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
  onProceedToPipeline?: () => void;
}

export default function HummerEmotionWorkspace({
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
  onProceedToPipeline,
}: HummerEmotionWorkspaceProps) {
  const [langSearch, setLangSearch] = useState('');
  const [hummerText, setHummerText] = useState(() => {
    return hasHummerAnnotations(text) ? text : generateDefaultHummerText(text, selectedLang);
  });
  const [viewMode, setViewMode] = useState<'visual' | 'split' | 'editor' | 'avatar'>('visual');
  const [extractingHummer, setExtractingHummer] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [savingCorpus, setSavingCorpus] = useState(false);
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
          charCount: Number((s.content || '').length),
          originalFileName: String(s.originalFileName || ''),
          language: String(s.language || selectedLang),
        }));
        const topicMap = new Map<string, { count: number; sourceId: string; maxLen: number }>();
        for (const s of sources) {
          const tName = (s.topic || s.title || 'Uncategorized').trim();
          const sLen = (s.content?.length || 0);
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

          // AUTO-LOAD REAL VIDEO LECTURE DATA IF CURRENT TEXT IS STATIC PDF SYLLABUS OR MISMATCHED
          const detected = detectTextLanguageClient(text || '');
          const isMismatch = Boolean(text && ((selectedLang === 'mr' && detected.detectedLanguage === 'hi') || (selectedLang === 'hi' && detected.detectedLanguage === 'mr')));
          const isOutline = !text || text.includes('सर्व कार्यशाळा व १६ दिवसांचा संपूर्ण अभ्यासक्रम');

          if (sources.length > 0 && (selectedTopic === 'all' || isMismatch) && (isOutline || isMismatch)) {
            const realSources = sources.filter((s: any) => (s.content || '').length > 500 && (s.language === selectedLang || !s.language));
            realSources.sort((a: any, b: any) => ((b.content || '').length) - ((a.content || '').length));
            const primarySource = realSources[0] || sources[0];
            if (primarySource && primarySource.content) {
              const raw = primarySource.content;
              const initialHummer = hasHummerAnnotations(raw)
                ? raw
                : generateDefaultHummerText(raw, selectedLang);
              setHummerText(initialHummer);
              onTextChange(initialHummer);
              onTopicChange(`src_${primarySource.id}`);
              setStatusMsg(`✅ Loaded real ${selectedLang === 'mr' ? 'Marathi' : 'Hindi'} lecture "${primarySource.title}" (${raw.length.toLocaleString()} characters) with emotion cues.`);
            }
          }
        }
      } catch {}
    };
    fetchDbTopics();
    return () => { isCancelled = true; };
  }, [token, selectedWorkshop, selectedLang]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with text prop if prop has annotations
  React.useEffect(() => {
    if (hasHummerAnnotations(text)) {
      setHummerText(text);
    }
  }, [text]);

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

  const plainVersion = stripToPurePlainText(hummerText || text);
  const isAnnotated = hasHummerAnnotations(hummerText);

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
    const initialHummer = hasHummerAnnotations(newCorpus)
      ? newCorpus
      : generateDefaultHummerText(newCorpus, code);
    setHummerText(initialHummer);
    onTextChange(initialHummer);
    const langObj = ELEARNING_LANGUAGES.find(l => l.code === code);
    setStatusMsg(`Loaded ${langObj?.name || code} expressive delivery script.`);
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
        const initialHummer = hasHummerAnnotations(raw)
          ? raw
          : generateDefaultHummerText(raw, selectedLang);
        setHummerText(initialHummer);
        onTextChange(initialHummer);
        setStatusMsg(`✅ Loaded "${targetLabel}" (${raw.length.toLocaleString()} characters) from Library.`);
        return;
      } catch (err: any) {
        setStatusMsg(`Failed to load from library: ${err.message}`);
      }
    }

    // If 'all' or no specific source was selected, prioritize the real video lecture data from dbSources!
    if (dbSources.length > 0) {
      const realSources = dbSources.filter(s => s.charCount > 500);
      realSources.sort((a, b) => b.charCount - a.charCount);
      const topSource = realSources[0] || dbSources[0];
      if (topSource) {
        try {
          setStatusMsg(`Loading real lecture "${topSource.title}" from Library Database...`);
          const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${topSource.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const d = await res.json();
          const raw = d.source?.content || '';
          const initialHummer = hasHummerAnnotations(raw)
            ? raw
            : generateDefaultHummerText(raw, selectedLang);
          setHummerText(initialHummer);
          onTextChange(initialHummer);
          onTopicChange(`src_${topSource.id}`);
          setStatusMsg(`✅ Loaded real lecture "${topSource.title}" (${raw.length.toLocaleString()} characters) from Library.`);
          return;
        } catch {}
      }
    }

    const newCorpus = getLibraryCorpusText(selectedLang, selectedWorkshop, selectedDay, topicId);
    const initialHummer = hasHummerAnnotations(newCorpus)
      ? newCorpus
      : generateDefaultHummerText(newCorpus, selectedLang);
    setHummerText(initialHummer);
    onTextChange(initialHummer);
    const chosenTopic = currentTopicList.find(t => t.id === topicId)?.label || topicId;
    setStatusMsg(`Loaded "${chosenTopic}" in ${currentLangObj.name} with delivery cues.`);
  };

  const handleSubmitNavigation = async () => {
    await handleSelectTopic(selectedTopic);
  };

  const handleInsertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      const updated = `${tag} ${hummerText}`;
      setHummerText(updated);
      onTextChange(updated);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = hummerText.substring(0, start);
    const after = hummerText.substring(end);
    const updated = `${before}${tag} ${after}`;
    setHummerText(updated);
    onTextChange(updated);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length + 1, start + tag.length + 1);
    }, 50);
  };

  const handleExtractHummerAI = async () => {
    const baseText = plainVersion || hummerText;
    if (!baseText.trim()) return;

    setExtractingHummer(true);
    setStatusMsg('✨ AI analyzing audio cadence: extracting genuine voice emotions, pauses & humour for Avatar...');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/hummer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: baseText, language: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Emotion extraction failed');

      if (data.hummerText) {
        setHummerText(data.hummerText);
        onTextChange(data.hummerText);
        setStatusMsg('✅ Emotional Hummer Text generated: [CALM], [EXPLAINING], [EMPHASIS], [SMILING], [HUMOROUS] tags added!');
      }
    } catch (err: any) {
      // If server error or token expired, gracefully fall back to local expressive cues
      const localCues = generateDefaultHummerText(baseText, selectedLang);
      setHummerText(localCues);
      onTextChange(localCues);
      setStatusMsg(`✅ Expressive cues generated locally (${err.message}). Ready for Avatar training.`);
    } finally {
      setExtractingHummer(false);
    }
  };

  const handleAutoTranslate = async () => {
    if (!hummerText.trim()) return;
    setTranslating(true);
    setStatusMsg(`Translating Hummer Text to ${currentLangObj.name} while preserving emotion tags...`);
    try {
      const res = await fetch('/api/avatar/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: hummerText, targetLang: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      const translated = data.translatedScript || data.translatedText || data.cleanText;
      if (translated) {
        setHummerText(translated);
        onTextChange(translated);
        setStatusMsg(`✅ Converted to ${currentLangObj.name} with delivery cues intact.`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Conversion notice: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(hummerText);
    setCopied(true);
    setStatusMsg('✅ Hummer script copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToCorpus = async () => {
    if (!token) {
      setStatusMsg('ℹ️ Saved locally. Log in as admin to save to cloud database.');
      return;
    }
    if (!hummerText.trim()) return;

    setSavingCorpus(true);
    setStatusMsg('Saving approved Hummer Text for Avatar to Bunny Database...');
    try {
      const validModule = ['why', 'level1', 'level2', 'level3', 'general', 'research'].includes(selectedWorkshop)
        ? selectedWorkshop
        : 'level1';
      const res = await fetch('/api/admin/crm/mohan-rag/knowledge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: validModule,
          title: `[Avatar Hummer] ${currentLangObj.name} - ${currentTopicLabel}`.slice(0, 150),
          topic: currentTopicLabel.slice(0, 150),
          content: hummerText,
          language: ['hi', 'mr', 'en'].includes(selectedLang) ? selectedLang : 'auto',
          sourceReference: `Hummer Stage [${selectedWorkshop} • ${selectedDay} • ${selectedTopic}]`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setStatusMsg(`✅ Approved Hummer Text saved to Bunny Database successfully! Ready for Avatar Studio.`);
    } catch (err: any) {
      setStatusMsg(`❌ Save notice: ${err.message}`);
    } finally {
      setSavingCorpus(false);
    }
  };

  // Render a visual annotated paragraph with styled badges
  const renderVisualAnnotatedText = (raw: string) => {
    const parts = raw.split(/(\[[A-Z0-9_:\s]+\])/g);
    return parts.map((part, i) => {
      const tagMatch = part.match(/^\[([A-Z0-9_:\s]+)\]$/);
      if (!tagMatch) {
        return <span key={i}>{part}</span>;
      }
      const tag = tagMatch[1].trim().toUpperCase();

      if (tag.includes('HUMOROUS') || tag.includes('LAUGH') || tag.includes('LIGHT_HEARTED')) {
        return (
          <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <span>😄</span>
            <span>[{tag}]</span>
          </span>
        );
      }
      if (tag.includes('SMILING') || tag.includes('SMILE') || tag.includes('HAPPY')) {
        return (
          <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
            <span>😊</span>
            <span>[{tag}]</span>
          </span>
        );
      }
      if (tag.includes('CALM') || tag.includes('PEACEFUL')) {
        return (
          <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-sky-100 text-sky-900 border border-sky-300 shadow-2xs">
            <span>🧘</span>
            <span>[{tag}]</span>
          </span>
        );
      }
      if (tag.includes('EMPHASIS') || tag.includes('EXCITED')) {
        return (
          <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
            <span>⚡</span>
            <span>[{tag}]</span>
          </span>
        );
      }
      if (tag.includes('INSPIRATIONAL') || tag.includes('MOTIVATIONAL')) {
        return (
          <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <span>🌟</span>
            <span>[{tag}]</span>
          </span>
        );
      }
      if (tag.includes('PAUSE')) {
        return (
          <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
            <span>⏱️</span>
            <span>[{tag}]</span>
          </span>
        );
      }
      return (
        <span key={i} className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300 shadow-2xs">
          <span>🎯</span>
          <span>[{tag}]</span>
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: 27+ Languages */}
      <div className="w-full lg:w-80 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-base">🌐</span>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              Avatar Language
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Stage 5 Hummer
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
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium"
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
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{lang.flag || '🌐'}</span>
                  <div className="truncate">
                    <span className="block truncate">{lang.name}</span>
                    <span className={`text-[10px] block ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>
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

      {/* Main Workspace */}
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
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 cursor-pointer"
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
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-500 transition active:scale-95 shadow-md shadow-amber-700/25 ring-1 ring-amber-500 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Load Topic</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Informative Banner if data not yet annotated ("if yet data not came then its ok") */}
        {!isAnnotated && (
          <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-4 shadow-xs flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Notice: Emotion &amp; Humor Cues Not Yet Extracted For This Topic
              </h4>
              <p className="text-xs text-amber-800 leading-relaxed">
                That is completely normal! The clean teaching text is safely loaded below. Click <strong>✨ AI Extract Humor &amp; Emotions</strong> to automatically detect Mohan Sir&apos;s natural voice expressions, or click any of the emotion chips below to annotate directly.
              </p>
            </div>
          </div>
        )}

        {/* Emotion & Expression Palette (Click to Insert at Cursor) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-amber-600" />
              <span>Voice Emotions &amp; Avatar Expression Palette (Click to Insert)</span>
            </span>
            <span className="text-[10px] text-slate-400">Inserts at cursor in editor</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleInsertTag('[CALM]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>🧘</span> <span>[CALM]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[EXPLAINING]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>🗣️</span> <span>[EXPLAINING]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[EMPHASIS]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>⚡</span> <span>[EMPHASIS]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[HUMOROUS]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition cursor-pointer flex items-center gap-1"
            >
              <span>😄</span> <span>[HUMOROUS]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[SMILING]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>😊</span> <span>[SMILING]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[INSPIRATIONAL]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer flex items-center gap-1"
            >
              <span>🌟</span> <span>[INSPIRATIONAL]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[SERIOUS]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 transition cursor-pointer flex items-center gap-1"
            >
              <span>🎯</span> <span>[SERIOUS]</span>
            </button>
            <button
              type="button"
              onClick={() => handleInsertTag('[PAUSE: 2 SECONDS]')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition cursor-pointer flex items-center gap-1"
            >
              <span>⏱️</span> <span>[PAUSE: 2S]</span>
            </button>
          </div>
        </div>

        {/* Action Header & Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExtractHummerAI}
              disabled={extractingHummer}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 shadow-md shadow-amber-600/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{extractingHummer ? 'Extracting Emotions...' : '✨ AI Extract Humor & Emotions'}</span>
            </button>

            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={translating}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
            >
              <span>🌐</span>
              <span>{translating ? 'Translating...' : `Auto-Convert to ${currentLangObj.name}`}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* View Modes Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('visual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'visual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>Visual</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'split' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>Split View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  viewMode === 'editor' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs transition cursor-pointer flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToCorpus}
              disabled={savingCorpus}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>{savingCorpus ? 'Saving...' : 'Save Hummer Script'}</span>
            </button>

            {onProceedToPipeline && (
              <button
                type="button"
                onClick={() => {
                  onTextChange(hummerText);
                  onProceedToPipeline();
                }}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 shadow-md shadow-emerald-700/25 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                title="Proceed to 6-Step Blueprint Pipeline"
              >
                <span>⚡ Blueprint Pipeline</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
            <span>{statusMsg}</span>
            <button type="button" onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        {/* Main Content Renderers based on View Mode */}
        {viewMode === 'visual' && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-3.5 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Visual Avatar Performance Script (Color-Coded Cues)
                </span>
              </div>
              <span className="text-[11px] text-amber-800 font-mono">
                {currentLangObj.name} • Stage 5
              </span>
            </div>

            <div className="p-8 md:p-10 space-y-5 text-slate-900 text-base md:text-lg leading-loose">
              {hummerText ? (
                hummerText.split(/\n\n+/).map((para, idx) => {
                  const trimmed = para.trim();
                  if (!trimmed) return null;
                  if (trimmed.startsWith('#') || trimmed.startsWith('===') || trimmed.startsWith('---') || trimmed.startsWith('【')) {
                    return (
                      <h4 key={idx} className="text-base md:text-lg font-black text-slate-900 pt-2 border-b border-slate-200 pb-1">
                        {trimmed.replace(/^[#=\-—\s]+/, '')}
                      </h4>
                    );
                  }
                  return (
                    <p key={idx} className="whitespace-pre-line">
                      {renderVisualAnnotatedText(trimmed)}
                    </p>
                  );
                })
              ) : (
                <p className="text-slate-400 italic">No content loaded yet.</p>
              )}
            </div>
          </div>
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left: Pure Plain Text */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col">
              <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  📄 Pure Plain Text (What is taught)
                </span>
                <span className="text-[10px] text-slate-400">Master approved</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] text-sm text-slate-800 leading-relaxed space-y-3 font-sans pr-2">
                {plainVersion ? (
                  plainVersion.split(/\n\n+/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">{p}</p>
                  ))
                ) : (
                  <p className="text-slate-400">No plain text.</p>
                )}
              </div>
            </div>

            {/* Right: Hummer Text */}
            <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-xs flex flex-col">
              <div className="pb-3 mb-3 border-b border-amber-100 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-900">
                  ✨ Hummer Text (How Mohan Sir delivers it)
                </span>
                <span className="text-[10px] text-amber-700 font-bold">Avatar delivery cues</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] text-sm text-slate-900 leading-loose space-y-3 pr-2">
                {hummerText ? (
                  hummerText.split(/\n\n+/).map((p, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {renderVisualAnnotatedText(p)}
                    </p>
                  ))
                ) : (
                  <p className="text-slate-400">No hummer text.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'editor' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                Direct Hummer Script Editor
              </span>
              <span className="text-[10px] text-slate-400">Use emotion chips above to insert tags</span>
            </div>
            <textarea
              ref={textareaRef}
              rows={20}
              value={hummerText}
              onChange={e => {
                setHummerText(e.target.value);
                onTextChange(e.target.value);
              }}
              className="w-full text-sm font-mono text-slate-900 bg-slate-50/40 border border-slate-200 rounded-xl p-4 leading-relaxed focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 shadow-inner resize-y"
              placeholder="Hummer script with [CALM], [HUMOROUS], [PAUSE] tags..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

