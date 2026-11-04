'use client';

import React, { useState } from 'react';
import {
  X, Sparkles, Mic, PlusCircle, Check, Loader2, Image as ImageIcon,
  UserCheck, ShieldCheck, Flame, Compass, Brain, Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import {
  PodcastEpisode,
  DialogueTurn,
  HOST_CLONE_PRESETS,
  MOHAN_CLONE_PRESETS,
  PODCAST_BACKGROUND_PRESETS,
  type HostClonePreset,
  type MohanClonePreset,
  type PodcastBackgroundPreset,
} from '@/lib/mohanRag/podcastTypes';

interface ManualPodcastCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (episode: PodcastEpisode) => void;
}

export default function ManualPodcastCreatorModal({
  isOpen,
  onClose,
  onCreated,
}: ManualPodcastCreatorModalProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<string>('water_digestion');
  const [language, setLanguage] = useState<'hi' | 'mr' | 'en'>('hi');

  // Core User Fields
  const [studentQuestion, setStudentQuestion] = useState('');
  const [mohanSirAnswer, setMohanSirAnswer] = useState('');

  // Clones and Background
  const [hostCloneId, setHostCloneId] = useState<string>('priya_seeker');
  const [mohanCloneId, setMohanCloneId] = useState<string>('mohan_pearl_white_khadi');
  const [backgroundId, setBackgroundId] = useState<string>('bg_himalayan_zen');
  const [customBgUrl, setCustomBgUrl] = useState<string>('');

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const buildDialogueTurns = (
    q: string,
    a: string,
    host: HostClonePreset,
    mohan: MohanClonePreset,
    lang: 'mr' | 'hi' | 'en'
  ): DialogueTurn[] => {
    const cleanQ = q.trim();
    const cleanA = a.trim();
    const mohanName = lang === 'mr' ? 'मोहन सर (Mohan Kalburgi)' : lang === 'hi' ? 'मोहन सर (Mohan Kalburgi)' : 'Mohan Sir';

    const sentences = cleanA.split(/(?<=[.!?।\n])\s+/).filter(Boolean);

    if (sentences.length >= 4) {
      const half = Math.ceil(sentences.length / 2);
      const part1 = sentences.slice(0, half).join(' ');
      const part2 = sentences.slice(half).join(' ');

      const hostReflection =
        lang === 'mr'
          ? 'हे खूप महत्त्वाचे सूत्र आहे सर. यात साधकाने सर्वात मुख्य गोष्ट कोणती लक्षात ठेवली पाहिजे?'
          : lang === 'hi'
          ? 'यह बहुत ही अद्भुत और गहरा ज्ञान है गुरुजी. इसमें साधक को सबसे मुख्य बात क्या याद रखनी चाहिए?'
          : 'That explains the core science so clearly, Mohan Sir! What is the primary golden rule students must remember?';

      return [
        {
          turnNumber: 1,
          speaker: 'host',
          speakerName: host.name,
          text: cleanQ,
          toneCue: '[curious:85]',
        },
        {
          turnNumber: 2,
          speaker: 'mohan_sir',
          speakerName: mohanName,
          text: part1,
          toneCue: '[compassionate:90]',
        },
        {
          turnNumber: 3,
          speaker: 'host',
          speakerName: host.name,
          text: hostReflection,
          toneCue: '[thoughtful:80]',
        },
        {
          turnNumber: 4,
          speaker: 'mohan_sir',
          speakerName: mohanName,
          text: part2,
          toneCue: '[inspiring:95]',
        },
      ];
    }

    const hostGratitude =
      lang === 'mr'
        ? 'धन्यवाद मोहन सर! अत्यंत सोप्या भाषेत हा गूढ स्वर योग नियम समजावून सांगितल्याबद्दल आभार.'
        : lang === 'hi'
        ? 'कोटि-कोटि धन्यवाद मोहन सर! इस गूढ़ स्वर विज्ञान को इतने सरल और प्रामाणिक रूप से समझाने के लिए आभार।'
        : 'Thank you Mohan Sir for sharing this authentic Vedic Swar Yoga clarity with us!';

    return [
      {
        turnNumber: 1,
        speaker: 'host',
        speakerName: host.name,
        text: cleanQ,
        toneCue: '[curious:85]',
      },
      {
        turnNumber: 2,
        speaker: 'mohan_sir',
        speakerName: mohanName,
        text: cleanA,
        toneCue: '[compassionate:90]',
      },
      {
        turnNumber: 3,
        speaker: 'host',
        speakerName: host.name,
        text: hostGratitude,
        toneCue: '[grateful:90]',
      },
    ];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentQuestion.trim()) {
      setError('Please enter the AI Seeker / Sadhak Question.');
      return;
    }
    if (!mohanSirAnswer.trim()) {
      setError('Please enter Mohan Sir Answer Text.');
      return;
    }

    const host = HOST_CLONE_PRESETS.find((h) => h.id === hostCloneId) || HOST_CLONE_PRESETS[0];
    const mohan = MOHAN_CLONE_PRESETS.find((m) => m.id === mohanCloneId) || MOHAN_CLONE_PRESETS[0];
    const bg = PODCAST_BACKGROUND_PRESETS.find((b) => b.id === backgroundId) || PODCAST_BACKGROUND_PRESETS[0];

    const finalTitle = title.trim() || `${studentQuestion.trim().slice(0, 60)}…`;
    const finalTopic = topic.trim() || 'Classroom Q&A';

    const turns = buildDialogueTurns(studentQuestion, mohanSirAnswer, host, mohan, language);

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          topic: finalTopic,
          category,
          language,
          hostName: host.name,
          hostGender: host.gender,
          studentQuestion: studentQuestion.trim(),
          mohanSirAnswer: mohanSirAnswer.trim(),
          hostCloneId: host.id,
          mohanCloneId: mohan.id,
          backgroundId: bg.id,
          backgroundUrl: customBgUrl.trim() || bg.previewUrl,
          dialogueTurns: turns,
          durationSeconds: Math.max(90, Math.min(300, turns.length * 35)),
          tags: ['Swar Yoga', 'Manual Studio', category],
          isPublished: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create manual podcast episode');

      if (data.episode) {
        onCreated(data.episode);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Error creating podcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl my-8 rounded-3xl border border-emerald-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6 pb-4 border-b border-slate-800 flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
            <Mic className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider">
                Manual Studio Creator
              </span>
              <span className="text-xs text-slate-400">• 2-Speaker AI Visual Podcast</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
              Add Podcast Discussion Manually
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Specify the Sadhak Question, Mohan Sir Answer Text, AI Model Clone, Mohan Sir Clone, and Background.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs text-rose-200 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 1. EPISODE METADATA & LANGUAGE */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <Layers className="w-4 h-4" />
              <span>Step 1: Discussion Topic & Language</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Episode Title <span className="text-slate-500 font-normal">(Optional, auto-generated if blank)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Why Avoid Chilled Water? Mohan Sir Digestion Masterclass"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Curriculum Topic / Keyword
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Jatharagni, Water Therapy, 3 Sips Rule"
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Podcast Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="water_digestion">💧 Water Therapy & Digestion (आहार व जलशास्त्र)</option>
                  <option value="gas_sleep_health">🌙 Gas, Sleep & Health (वायू, झोप व आरोग्य)</option>
                  <option value="nadi_breath_mechanics">🌬️ Nadi Breath Mechanics (इडा, पिंगळा, सुषुम्ना)</option>
                  <option value="level2_samyama">⚡ Level 2: Samyama (संयम व आंतरिक ध्यान)</option>
                  <option value="level3_ashtavakra">✨ Level 3: Ashtavakra (अष्टावक्र गीता ध्यान)</option>
                  <option value="mind_emotions">🧠 Mind & Emotions (चित्तशुद्धी व मनःशांती)</option>
                  <option value="weight_loss_metabolism">🔥 Weight Loss & Metabolism (वजन नियंत्रण)</option>
                  <option value="garbh_sanskar">🤰 Garbh Sanskar (गर्भ संस्कार स्वर ज्ञान)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Dialogue Speech Language
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'hi', label: '🕉️ Hindi (हिंदी)' },
                    { id: 'mr', label: '🚩 Marathi (मराठी)' },
                    { id: 'en', label: '🇬🇧 English' },
                  ].map((l) => (
                    <button
                      type="button"
                      key={l.id}
                      onClick={() => setLanguage(l.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        language === l.id
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                          : 'border-slate-800 text-slate-400 hover:text-white bg-slate-900/60'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 2. QUESTION & ANSWER TEXTS */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Mic className="w-4 h-4" />
              <span>Step 2: Add AI Sadhak Question & Mohan Sir Answer</span>
            </div>

            {/* AI (Sadhak) Question */}
            <div>
              <label className="block text-xs font-extrabold text-amber-300 mb-1.5">
                1. AI (Sadhak) Question <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={studentQuestion}
                onChange={(e) => setStudentQuestion(e.target.value)}
                placeholder="e.g. मोहन सर, क्लासमध्ये विद्यार्थी नेहमी विचारतात: जेवताना थंड पाणी का पिऊ नये? त्यामुळे जठराग्नीवर काय परिणाम होतो?"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 leading-relaxed"
              />
            </div>

            {/* Mohan Sir Answer Text */}
            <div>
              <label className="block text-xs font-extrabold text-emerald-400 mb-1.5">
                2. Mohan Sir Answer Text (Exact Yogic Guidance) <span className="text-rose-400">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={mohanSirAnswer}
                onChange={(e) => setMohanSirAnswer(e.target.value)}
                placeholder="e.g. मी मोहन काळबुर्गी (Mohan Kalburgi)... स्वर शास्त्रानुसार जेवताना जठराग्नी प्रदीप्त झालेली असते. त्यावर जेव्हा आपण थंड पाणी टाकता, तेव्हा ती अग्नी विझून जाते आणि अन्नाचे पचन न होता आमवात आणि विष तयार होते. म्हणून जेवताना फक्त घोटभर कोमट पाणी प्यावे, तेही उजव्या सूर्य नाडीमध्ये!"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed font-mono"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Tip: Enter Mohan Sir’s verbatim authentic answer. The studio will automatically align dialogue turns with realistic studio pauses and expressive tone cues.
              </p>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 3. SELECT AI MODEL - CLONE (SEEKER) */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-400">
                <UserCheck className="w-4 h-4" />
                <span>Step 3: Select AI Model - Clone (Sadhak / Host)</span>
              </div>
              <span className="text-[11px] text-slate-400">Choose voice persona & demeanor</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {HOST_CLONE_PRESETS.map((host) => (
                <div
                  key={host.id}
                  onClick={() => setHostCloneId(host.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    hostCloneId === host.id
                      ? 'border-sky-500 bg-sky-950/30 ring-2 ring-sky-500/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">{host.avatarIcon}</span>
                      {hostCloneId === host.id && (
                        <Check className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white">{host.name}</h4>
                    <p className="text-[11px] text-sky-300 font-medium">{host.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                      {host.description}
                    </p>
                  </div>
                  <span className="mt-2 text-[9px] font-mono text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    {host.voiceStyle.split('(')[0].trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 4. SELECT MOHAN SIR - CLONE */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Step 4: Select Mohan Sir - Clone (Avatar Look & Cadence)</span>
              </div>
              <span className="text-[11px] text-slate-400">Authentic digital twin preset</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {MOHAN_CLONE_PRESETS.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setMohanCloneId(m.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    mohanCloneId === m.id
                      ? 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/40'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-emerald-500/40">
                        <img src={m.avatarUrl} alt={m.name} className="h-full w-full object-cover" />
                      </div>
                      {mohanCloneId === m.id && (
                        <Check className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      {m.badge}
                    </span>
                    <h4 className="text-xs font-bold text-white mt-0.5">{m.name.split('(')[0]}</h4>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                      {m.description}
                    </p>
                  </div>
                  <span className="mt-2 text-[9px] font-mono text-emerald-300/80 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    {m.toneName.split('(')[0].trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 5. SELECT BACKGROUNDS */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                <ImageIcon className="w-4 h-4" />
                <span>Step 5: Select Podcast Studio Background</span>
              </div>
              <span className="text-[11px] text-slate-400">Scenic visual atmosphere</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {PODCAST_BACKGROUND_PRESETS.map((bg) => (
                <div
                  key={bg.id}
                  onClick={() => {
                    setBackgroundId(bg.id);
                    setCustomBgUrl('');
                  }}
                  className={`p-2.5 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                    backgroundId === bg.id && !customBgUrl
                      ? 'border-purple-500 ring-2 ring-purple-500/40'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="h-16 w-full rounded-xl overflow-hidden mb-2 relative">
                    <img src={bg.previewUrl} alt={bg.name} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent" />
                    {backgroundId === bg.id && !customBgUrl && (
                      <div className="absolute top-1.5 right-1.5 p-1 rounded-full bg-purple-600 text-white shadow-md">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-[11px] font-bold text-white truncate">{bg.name}</h4>
                  <p className="text-[9px] text-slate-400 line-clamp-1">{bg.badge}</p>
                </div>
              ))}
            </div>

            {/* Custom Background URL input */}
            <div className="pt-2">
              <label className="block text-[11px] font-bold text-slate-400 mb-1">
                Or Custom Background Image URL (Optional):
              </label>
              <input
                type="url"
                value={customBgUrl}
                onChange={(e) => setCustomBgUrl(e.target.value)}
                placeholder="https://example.com/my-custom-studio-background.jpg"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* 6. SUBMIT AND CREATE */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-400">
              Creates the full 2-speaker episode and immediately launches playback on the Studio Stage.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !studentQuestion.trim() || !mohanSirAnswer.trim()}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-xl shadow-emerald-950/60 active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Podcast...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Submit and Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

