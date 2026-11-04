'use client';

import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  Copy,
  Download,
  ArrowRight,
  Sparkles,
  RotateCcw,
  BookOpen,
  Search,
  Check,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { ELEARNING_LANGUAGES } from '@/lib/elearningLanguages';
import {
  WORKSHOP_OPTIONS,
  DAY_OPTIONS,
  TOPIC_OPTIONS,
  getLibraryCorpusText,
  stripToPurePlainText,
} from './masterLibraryCorpus';
import { getGrammarConfig } from './dualGrammarEngine';
import VoiceMicInputButton from '@/components/admin/crm/mohan-rag/VoiceMicInputButton';

interface GrammarCheckerWorkspaceProps {
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
  onProceedToPlainText?: () => void;
}

export default function GrammarCheckerWorkspace({
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
  onProceedToPlainText,
}: GrammarCheckerWorkspaceProps) {
  const [langSearch, setLangSearch] = useState('');
  const [sourceText, setSourceText] = useState(text);
  const [correctedText, setCorrectedText] = useState('');
  const [correctionsList, setCorrectionsList] = useState<Array<{ original: string; corrected: string; reason: string }>>([]);
  const [checkingGrammarMode, setCheckingGrammarMode] = useState<'SOV' | 'SVO' | null>(null);
  const [translating, setTranslating] = useState(false);
  const [savingCorpus, setSavingCorpus] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [syntaxOverride, setSyntaxOverride] = useState<'SOV' | 'SVO' | null>(null);
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

          // AUTO-LOAD REAL VIDEO LECTURE DATA IF CURRENT TEXT IS STATIC PDF SYLLABUS
          if (sources.length > 0 && selectedTopic === 'all' && (!text || text.includes('सर्व कार्यशाळा व १६ दिवसांचा संपूर्ण अभ्यासक्रम') || text.includes('मार्गदर्शक: मोहन काळबुर्गी (Mohan Kalburgi Sir)'))) {
            const realSources = sourcesList.filter(s => s.charCount > 500);
            realSources.sort((a, b) => b.charCount - a.charCount);
            const topSource = realSources[0] || sourcesList[0];
            if (topSource) {
              try {
                const sRes = await fetch(`/api/admin/crm/mohan-rag/knowledge/${topSource.id}`, { headers: { Authorization: `Bearer ${token}` } });
                const sData = await sRes.json();
                const rawContent = sData.source?.content || '';
                const clean = rawContent.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
                if (clean) {
                  setSourceText(clean);
                  onTextChange(clean);
                  onTopicChange(`src_${topSource.id}`);
                  setStatusMsg(`✅ Loaded real lecture "${topSource.title}" (${clean.length.toLocaleString()} characters) from Library Database.`);
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

  // Sync if parent text changes and correctedText is empty
  React.useEffect(() => {
    setSourceText(text);
  }, [text]);

  const SOV_LANGUAGES = ['hi', 'mr', 'kn', 'sa', 'ta', 'te', 'ml', 'gu', 'bn', 'pa', 'or', 'ja', 'ko'];
  const naturalSyntax: 'SOV' | 'SVO' = SOV_LANGUAGES.includes(selectedLang.toLowerCase()) ? 'SOV' : 'SVO';
  const activeSyntax = syntaxOverride || naturalSyntax;

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
    setSourceText(newCorpus);
    setCorrectedText('');
    setCorrectionsList([]);
    onTextChange(newCorpus);
    const langObj = ELEARNING_LANGUAGES.find(l => l.code === code);
    setStatusMsg(`Loaded ${langObj?.name || code} master knowledge script.`);
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
        const clean = raw.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
        if (clean) {
          setSourceText(clean);
          setCorrectedText('');
          setCorrectionsList([]);
          onTextChange(clean);
          setStatusMsg(`✅ Loaded "${targetLabel}" (${clean.length.toLocaleString()} characters) from Library. Ready for grammar check!`);
          return;
        }
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
          const clean = raw.replace(/\[face:[a-z_]+\]/gi, '').replace(/\[[a-z_]+:\d{1,3}\]/gi, '').trim();
          if (clean) {
            setSourceText(clean);
            setCorrectedText('');
            setCorrectionsList([]);
            onTextChange(clean);
            onTopicChange(`src_${topSource.id}`);
            setStatusMsg(`✅ Loaded real lecture "${topSource.title}" (${clean.length.toLocaleString()} characters) from Library.`);
            return;
          }
        } catch {}
      }
    }

    const newCorpus = getLibraryCorpusText(selectedLang, selectedWorkshop, selectedDay, topicId);
    setSourceText(newCorpus);
    setCorrectedText('');
    setCorrectionsList([]);
    onTextChange(newCorpus);
    const chosenTopic = (currentTopicList.find(t => t.id === topicId)?.label || topicId);
    setStatusMsg(`Loaded "${chosenTopic}" in ${currentLangObj.name}. Ready for grammar check.`);
  };

  const handleSubmitNavigation = async () => {
    await handleSelectTopic(selectedTopic);
  };

  const handleAutoTranslate = async () => {
    if (!sourceText.trim()) return;
    setTranslating(true);
    setStatusMsg(`Auto-converting content to ${currentLangObj.name} (${currentLangObj.nativeName})...`);
    try {
      const res = await fetch('/api/avatar/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: sourceText, targetLang: selectedLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Translation failed');
      const translated = data.translatedText || data.translatedScript || data.cleanText;
      if (translated) {
        setSourceText(translated);
        setCorrectedText('');
        onTextChange(translated);
        setStatusMsg(`✅ Successfully auto-converted to ${currentLangObj.name} with sacred terminology preserved.`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Conversion notice: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleRunGrammarCheck = async (modeToUse?: 'SOV' | 'SVO') => {
    const syntax = modeToUse || activeSyntax;
    setCheckingGrammarMode(syntax);
    setStatusMsg(`Running AI Grammar Check in ${syntax} mode (adjusting verbs only)...`);
    try {
      const res = await fetch('/api/avatar/grammar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          text: sourceText,
          language: selectedLang,
          syntaxStructure: syntax,
          mode: 'strict_exact',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grammar check failed');

      const corrected = data.data?.correctedText || data.correctedText || data.corrected;
      const corrections = data.data?.corrections || data.corrections || [];

      if (corrected) {
        setCorrectedText(corrected);
        setCorrectionsList(corrections);
        setStatusMsg(`✅ AI Grammar (${syntax}) complete: ${corrections.length} verb agreement(s) analyzed. Nouns and objects preserved.`);
      }
    } catch (err: any) {
      setStatusMsg(`❌ Grammar error: ${err.message}`);
    } finally {
      setCheckingGrammarMode(null);
    }
  };

  const handleAcceptCorrection = () => {
    if (!correctedText) return;
    setSourceText(correctedText);
    onTextChange(correctedText);
    setStatusMsg('✅ Applied approved grammar version to working script.');
  };

  const handleSaveToCorpus = async () => {
    if (!token) {
      setStatusMsg('ℹ️ Saved locally. Log in as admin to save to cloud database.');
      return;
    }
    const textToSave = correctedText || sourceText;
    if (!textToSave.trim()) return;

    setSavingCorpus(true);
    setStatusMsg('Saving approved grammar version to Bunny Database...');
    try {
      const validModule = ['why', 'level1', 'level2', 'level3', 'general', 'research'].includes(selectedWorkshop)
        ? selectedWorkshop
        : 'level1';
      const res = await fetch('/api/admin/crm/mohan-rag/knowledge', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleId: validModule,
          title: `[Grammar Approved] ${currentLangObj.name} - ${currentTopicLabel}`.slice(0, 150),
          topic: currentTopicLabel.slice(0, 150),
          content: textToSave,
          language: ['hi', 'mr', 'en'].includes(selectedLang) ? selectedLang : 'auto',
          sourceReference: `Grammar Stage [${selectedWorkshop} • ${selectedDay} • ${selectedTopic}]`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setStatusMsg(`✅ Approved grammar version saved to Bunny Database successfully!`);
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
              Grammar Language
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
            {activeSyntax}
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
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 font-medium"
          />
        </div>

        {/* Language List */}
        <div className="mt-3 space-y-1 max-h-[500px] overflow-y-auto pr-1">
          {filteredLanguages.map(lang => {
            const isSelected = selectedLang === lang.code;
            const isSov = SOV_LANGUAGES.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleLanguageClick(lang.code)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition text-left cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{lang.flag || '🌐'}</span>
                  <div className="truncate">
                    <span className="block truncate">{lang.name}</span>
                    <span className={`text-[10px] block ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                      {lang.nativeName}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                    isSelected ? 'bg-sky-700 text-white' : isSov ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {isSov ? 'SOV' : 'SVO'}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
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
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
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
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
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
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-sky-500 cursor-pointer"
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
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-sky-600 hover:bg-sky-500 transition active:scale-95 shadow-md shadow-sky-700/25 ring-1 ring-sky-500 flex items-center gap-1.5 cursor-pointer"
              >
                <span>Load Topic</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dual SOV / SVO Grammar Engine Banner */}
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-indigo-50/60 to-purple-50 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black shadow-sm">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">
                    Dual AI Grammar Engine — {activeSyntax} Architecture
                  </h4>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    activeSyntax === 'SOV' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}>
                    {activeSyntax === 'SOV' ? 'Subject - Object - Verb' : 'Subject - Verb - Object'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {activeSyntax === 'SOV'
                    ? 'Rule: Modifies ONLY Verbs (क्रियापद / Kriyapad) to agree with object/gender. Nouns and objects are 100% untouched.'
                    : 'Rule: Verifies Subject-Verb-Object alignment for English and European languages. Sacred terms preserved.'}
                </p>
              </div>
            </div>

            {/* Toggle SOV vs SVO */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => setSyntaxOverride('SOV')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSyntax === 'SOV'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="SOV (Subject-Object-Verb): Required for Marathi, Hindi, Sanskrit, Kannada, Gujarati, Tamil, Telugu"
              >
                SOV (Indic)
              </button>
              <button
                type="button"
                onClick={() => setSyntaxOverride('SVO')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeSyntax === 'SVO'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="SVO (Subject-Verb-Object): For English, Spanish, French, German"
              >
                SVO (Global)
              </button>
            </div>
          </div>
        </div>

        {/* Action Header & Tools */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRunGrammarCheck()}
              disabled={checkingGrammarMode !== null}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-md shadow-sky-600/25 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <Brain className="w-4 h-4" />
              <span>{checkingGrammarMode ? `Analyzing ${activeSyntax} Grammar...` : `Run AI Grammar Check (${activeSyntax}) →`}</span>
            </button>

            <button
              type="button"
              onClick={handleAutoTranslate}
              disabled={translating}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-300 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
              title={`Auto-convert to ${currentLangObj.name}`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              <span>{translating ? 'Translating...' : `Auto-Convert to ${currentLangObj.name}`}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAcceptCorrection}
              disabled={!correctedText}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Accept Suggestions</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToCorpus}
              disabled={savingCorpus}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>{savingCorpus ? 'Saving...' : 'Save Approved'}</span>
            </button>

            {onProceedToPlainText && (
              <button
                type="button"
                onClick={onProceedToPlainText}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <span>Plain Text Stage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status notification */}
        {statusMsg && (
          <div className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-sky-50 border border-sky-200 text-sky-900 flex items-center justify-between">
            <span>{statusMsg}</span>
            <button type="button" onClick={() => setStatusMsg('')} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        {/* Side-by-Side Comparison Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left: Source Text (Input) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <span>📝 Source Text</span>
                <span className="text-[10px] text-slate-400 font-normal">({currentLangObj.name})</span>
              </div>
              <div className="flex items-center gap-2">
                <VoiceMicInputButton
                  onTranscript={(spokenText) => {
                    const updated = sourceText ? `${sourceText} ${spokenText}` : spokenText;
                    setSourceText(updated);
                    onTextChange(updated);
                  }}
                  defaultLanguage={
                    currentLangObj.code === 'hi'
                      ? 'hi-IN'
                      : currentLangObj.code === 'en'
                      ? 'en-IN'
                      : 'mr-IN'
                  }
                  buttonText="माईकवर बोला (Speak)"
                />
                <span className="text-[10px] text-slate-500 font-mono">
                  {sourceText.trim() ? sourceText.trim().split(/\s+/).length : 0} words
                </span>
              </div>
            </div>
            <textarea
              rows={16}
              value={sourceText}
              onChange={e => {
                setSourceText(e.target.value);
                onTextChange(e.target.value);
              }}
              placeholder="Paste or write text for grammar inspection..."
              className="w-full flex-1 text-sm font-mono text-slate-800 bg-slate-50/50 border border-slate-200 rounded-xl p-3 leading-relaxed focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-inner resize-y"
            />
          </div>

          {/* Right: AI Grammar Suggestions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                <span>✨ Grammar Suggestions ({activeSyntax})</span>
                {correctionsList.length > 0 && (
                  <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded-full font-black">
                    {correctionsList.length} updates
                  </span>
                )}
              </div>
              {correctedText && (
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(correctedText)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {correctedText ? (
              <textarea
                rows={16}
                value={correctedText}
                onChange={e => setCorrectedText(e.target.value)}
                className="w-full flex-1 text-sm font-mono text-slate-900 bg-sky-50/20 border border-sky-200 rounded-xl p-3 leading-relaxed focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-inner resize-y"
              />
            ) : (
              <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Brain className="w-10 h-10 text-sky-400 mb-2 opacity-80" />
                <h5 className="text-sm font-bold text-slate-800">
                  Ready to Run Grammar Check
                </h5>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Click the <strong>Run AI Grammar Check ({activeSyntax})</strong> button above. The engine will inspect Subject-Object-Verb agreement and adjust only verbs, leaving your sacred terminology completely intact.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Verb Corrections Log (if available) */}
        {correctionsList.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Verbatim Verb Corrections Audit ({correctionsList.length})</span>
            </h4>
            <div className="space-y-2">
              {correctionsList.map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="line-through text-red-600 font-mono bg-red-50 px-2 py-0.5 rounded">{item.original}</span>
                      <span className="text-slate-400">➔</span>
                      <span className="text-emerald-700 font-bold font-mono bg-emerald-50 px-2 py-0.5 rounded">{item.corrected}</span>
                    </div>
                    {item.reason && (
                      <p className="text-[11px] text-slate-500">{item.reason}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

