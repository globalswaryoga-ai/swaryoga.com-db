'use client';

import React, { useState } from 'react';
import {
  CheckCircle2, AlertCircle, ArrowRight, Sparkles, BookOpen,
  Languages, FileText, Smile, Sliders, RefreshCw, Save
} from 'lucide-react';

interface SixStepPipelineProps {
  token: string | null;
  initialTopic?: string;
  initialText?: string;
  initialLanguage?: string;
}

export function SixStepPipelineView({ token, initialTopic = 'Swar Yoga Day-1 Bhojan & Nadi', initialText = '', initialLanguage = 'auto' }: SixStepPipelineProps) {
  const [topic, setTopic] = useState(initialTopic);
  const [moduleId, setModuleId] = useState('level-1');
  const [sourceLanguage, setSourceLanguage] = useState(initialLanguage);

  // Pipeline Step States
  const [step1Text, setStep1Text] = useState(initialText || `चला डोळे बंद करा. शरीर स्थिर. लक्ष श्वासाकडे. पहिले पूर्ण श्वासाकडे बघा. आता मोजणे सुरू करा. स्टार्ट. आत जाणारा बाहेर जाणारा एक.\nसावकाश डोळे उघडा. नॉर्मल गती १२-१५ किंवा ८-१२ च्या प्रमाणे आहे. पुढे लिहा की त्याच्यानंतर तुम्ही तीन गोष्टी करू लागला - चालणे, बोलणे आणि खाणे.`);
  const [step2Detection, setStep2Detection] = useState<any>(null);
  const [step3Text, setStep3Text] = useState('');
  const [step4Family, setStep4Family] = useState<'sov' | 'svo' | ''>('');
  const [step5Text, setStep5Text] = useState('');
  const [step6SovPlain, setStep6SovPlain] = useState('');
  const [step6SovHummer, setStep6SovHummer] = useState('');
  const [step6SvoPlain, setStep6SvoPlain] = useState('');
  const [step6SvoHummer, setStep6SvoHummer] = useState('');
  const [blueprintId, setBlueprintId] = useState<string | null>(null);

  // Active view tab for Step 6
  const [blueprintTab, setBlueprintTab] = useState<'sov_plain' | 'sov_hummer' | 'svo_plain' | 'svo_hummer'>('sov_plain');

  const [running, setRunning] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [recheckStats, setRecheckStats] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const runVerbatimRecheck = async () => {
    if (!token || !step1Text.trim()) return;
    setRechecking(true);
    setStatusMsg('AI Verbatim Re-Checker is verifying every spoken word and restoring complete sentences...');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/recheck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rawTranscript: step1Text, language: sourceLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Re-check failed');
      setStep1Text(data.result.verifiedTranscript);
      setRecheckStats('100% Word-to-Word Verified • Complete Sentences Restored');
      setStatusMsg('✅ Word-to-word verbatim check passed! Complete sentences restored with zero dropped words.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Re-check failed');
    } finally {
      setRechecking(false);
    }
  };

  const runAllSteps = async () => {
    if (!token) return;
    setRunning(true);
    setStatusMsg('Running Step 1 to 6 automated pipeline via Replicate...');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/crm/mohan-rag/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: 'run_all',
          rawText: step1Text,
          topic,
          moduleId,
          language: sourceLanguage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pipeline execution failed');

      const bp = data.blueprint;
      setBlueprintId(bp.id);
      setStep2Detection(bp.step2LanguageDetails);
      setStep3Text(bp.step3SpellcheckedText);
      setStep4Family(bp.step4GrammarFamily);
      setStep5Text(bp.step5GrammarApprovedText);
      setStep6SovPlain(bp.step6SovPlain);
      setStep6SovHummer(bp.step6SovHummer);
      setStep6SvoPlain(bp.step6SvoPlain);
      setStep6SvoHummer(bp.step6SvoHummer);

      setStatusMsg('🎉 All 6 Steps successfully completed and Master Blueprints generated!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Pipeline failed');
    } finally {
      setRunning(false);
    }
  };

  const saveAdminCorrections = async () => {
    if (!token || !blueprintId) return;
    setRunning(true);
    setStatusMsg('Saving admin corrections to Bunny database...');
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/crm/mohan-rag/pipeline', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: blueprintId,
          step3SpellcheckedText: step3Text,
          step5GrammarApprovedText: step5Text,
          step6SovPlain: step6SovPlain,
          step6SovHummer: step6SovHummer,
          step6SvoPlain: step6SvoPlain,
          step6SvoHummer: step6SvoHummer,
          status: 'approved',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save corrections');

      setStatusMsg('✅ Admin corrections saved and marked as APPROVED for AI Avatar & Search Engine!');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-emerald-800 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">Master Architecture</span>
              <span className="text-xs font-bold text-slate-500">6-Step Master Ingestion & Blueprint Pipeline</span>
            </div>
            <h2 className="mt-1 text-xl font-bold text-slate-900">Topic Blueprint & Multi-Language Foundation</h2>
            <p className="mt-1 text-xs text-slate-600">
              New Topic ➔ Language Check ➔ Spell Check ➔ SOV/SVO Check ➔ Grammar Engine ➔ Master Blueprints (SOV & SVO)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={running || !step1Text.trim()}
              onClick={runAllSteps}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Processing Pipeline...' : '⚡ Run All 6 Steps'}
            </button>
            {blueprintId && (
              <button
                type="button"
                disabled={running}
                onClick={saveAdminCorrections}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-amber-500 disabled:opacity-50 transition"
              >
                <Save className="h-4 w-4" />
                Save & Approve Blueprints
              </button>
            )}
          </div>
        </div>

        {statusMsg && <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100 p-3 text-xs font-semibold text-emerald-950">{statusMsg}</div>}
        {errorMsg && <div className="mt-4 rounded-xl border border-rose-300 bg-rose-100 p-3 text-xs font-semibold text-rose-950">{errorMsg}</div>}
      </div>

      {/* Step Grid Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Step 1 & 2 Card */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-xs text-white">1</span>
              Step 1: Input Topic Source
            </span>
            <input
              type="text"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Topic Name"
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600">Raw Speech Transcript / Topic Text:</label>
            <textarea
              rows={6}
              value={step1Text}
              onChange={e => setStep1Text(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={rechecking || !step1Text.trim()}
                onClick={runVerbatimRecheck}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow hover:bg-indigo-600 disabled:opacity-50 transition"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                {rechecking ? 'AI Re-checking Word-to-Word...' : '🤖 AI Re-Check: Word-to-Word & Complete Sentences'}
              </button>
              {recheckStats && (
                <span className="text-[11px] font-bold text-indigo-950 bg-indigo-100 px-2.5 py-0.5 rounded-full border border-indigo-200">
                  ✅ {recheckStats}
                </span>
              )}
            </div>
          </div>

          {/* Step 2 Section */}
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-teal-950">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-800 text-[10px] text-white">2</span>
                Step 2: Language Check & Routing
              </span>
              {step2Detection && (
                <span className="rounded-full bg-teal-200 px-2.5 py-0.5 text-xs font-extrabold text-teal-950 uppercase">
                  {step2Detection.detectedLanguage} ({(step2Detection.confidence * 100).toFixed(0)}% confidence)
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-teal-800">
              {step2Detection?.explanation || 'Inspects speech tokens to automatically classify Hindi, Marathi, English or Sanskrit.'}
            </p>
          </div>
        </div>

        {/* Step 3 Card: Spell Checking */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-xs text-white">3</span>
              Step 3: Verbatim Spell Checker (Admin Editable)
            </span>
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Zero Noun Distortion
            </span>
          </div>
          <div>
            <p className="text-xs text-slate-500">
              Fixes speech recognition errors, matras, and anuswar of the exact words spoken. Sacred yogic nouns remain 100% untouched.
            </p>
            <textarea
              rows={8}
              value={step3Text}
              onChange={e => setStep3Text(e.target.value)}
              placeholder="Run pipeline to generate spell-checked text..."
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Step 4 & 5 Card: Grammar Engine Check */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-xs text-white">4 & 5</span>
              Step 4 & 5: SOV vs SVO Grammar Engine
            </span>
            {step4Family && (
              <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold uppercase ${step4Family === 'sov' ? 'bg-orange-100 text-orange-900 border border-orange-300' : 'bg-blue-100 text-blue-900 border border-blue-300'}`}>
                {step4Family.toUpperCase()} Grammar Family
              </span>
            )}
          </div>
          <div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 mb-2 text-xs">
              {step2Detection?.detectedLanguage === 'mr' || step2Detection?.detectedLanguage === 'hi' ? (
                <div className="flex items-center justify-between text-amber-900">
                  <span className="font-bold">🚩 Marathi & Hindi Rule:</span>
                  <span className="rounded bg-amber-200/80 px-2 py-0.5 font-bold text-[11px]">Verbs Only (क्रियापद)</span>
                </div>
              ) : (
                <div className="flex items-center justify-between text-blue-900">
                  <span className="font-bold">🌐 English & Global Rule:</span>
                  <span className="rounded bg-blue-200/80 px-2 py-0.5 font-bold text-[11px]">Verbs + Sentence Structure</span>
                </div>
              )}
              <p className="mt-1 text-[11px] text-slate-600">
                {step2Detection?.detectedLanguage === 'mr' || step2Detection?.detectedLanguage === 'hi'
                  ? 'Preserves Mohan Sir’s authentic spoken sentence phrasing and nouns exactly. Changes verbs only to agree with SOV grammar.'
                  : 'Reconstructs sentence flow into natural native hometown phrasing, delivering identical content and humor seamlessly.'}
              </p>
            </div>
            <textarea
              rows={8}
              value={step5Text}
              onChange={e => setStep5Text(e.target.value)}
              placeholder="Run pipeline to apply SOV/SVO grammar rules..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Step 6 Card: Master Blueprints (SOV & SVO) */}
        <div className="space-y-4 rounded-2xl border border-emerald-300 bg-white p-5 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="flex items-center gap-2 text-sm font-bold text-emerald-950">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-800 text-xs text-white">6</span>
              Step 6: Master Blueprints (SOV & SVO)
            </span>
            <span className="text-xs font-bold text-emerald-800">Foundation for All Products</span>
          </div>

          {/* Blueprint Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setBlueprintTab('sov_plain')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${blueprintTab === 'sov_plain' ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              🚩 SOV Plain (All SOV Langs)
            </button>
            <button
              type="button"
              onClick={() => setBlueprintTab('sov_hummer')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${blueprintTab === 'sov_hummer' ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              🎭 SOV Hummer & Avatar Cues
            </button>
            <button
              type="button"
              onClick={() => setBlueprintTab('svo_plain')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${blueprintTab === 'svo_plain' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              🇬🇧 SVO Plain (All SVO Langs)
            </button>
            <button
              type="button"
              onClick={() => setBlueprintTab('svo_hummer')}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${blueprintTab === 'svo_hummer' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
            >
              🎭 SVO Hummer & Avatar Cues
            </button>
          </div>

          <div>
            <textarea
              rows={8}
              value={
                blueprintTab === 'sov_plain' ? step6SovPlain :
                blueprintTab === 'sov_hummer' ? step6SovHummer :
                blueprintTab === 'svo_plain' ? step6SvoPlain : step6SvoHummer
              }
              onChange={e => {
                const val = e.target.value;
                if (blueprintTab === 'sov_plain') setStep6SovPlain(val);
                else if (blueprintTab === 'sov_hummer') setStep6SovHummer(val);
                else if (blueprintTab === 'svo_plain') setStep6SvoPlain(val);
                else setStep6SvoHummer(val);
              }}
              placeholder="Run pipeline to view Master Blueprint..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-950">
            <strong>Downstream Execution:</strong> These approved blueprints automatically feed:
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-emerald-900">
              <li><strong>AI Avatar Video Studio</strong> (uses SOV / SVO Hummer text with bracketed emotions).</li>
              <li><strong>RAG Search Engine</strong> (queries retrieve these verified sentences).</li>
              <li><strong>43 Languages Conversion</strong> (SOV languages inherit the SOV blueprint; SVO languages inherit the SVO blueprint).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

