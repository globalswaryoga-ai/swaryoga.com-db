'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  UserCheck, 
  Brain,
  Video, 
  Globe2, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Zap, 
  ShieldCheck,
  Flame,
  Activity,
  Play,
  Mic
} from 'lucide-react';

export default function MohanRagHubPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 md:p-8">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-emerald-500/15 to-teal-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              MOHAN RAG PLATFORM • NEXT-GEN AI
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Mohan Rag
              <span className="text-sm font-medium px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                v1.0 Master
              </span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 max-w-3xl">
              Your comprehensive digital AI clone and multi-content creation hub. A full-body avatar capable of walking, running, swimming, performing yogic asanas, and adapting across every profession (Guruji, Doctor, Army Officer, Corporate Leader).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/podcasts"
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-black shadow-lg shadow-teal-500/20 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Mic className="w-5 h-5 text-slate-950" />
              🎙️ Q&A Podcast Hub
            </Link>
            <Link
              href="/admin/crm/mohan-rag/creation-hub"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-black font-black shadow-lg shadow-amber-500/20 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5 text-black" />
              🏭 Creation Hub (Factory)
            </Link>
            <Link
              href="/admin/crm/mohan-rag/monitor"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <Activity className="w-5 h-5 text-emerald-400" />
              🩺 Health Monitor
            </Link>
            <Link
              href="/admin/crm/mohan-rag/management"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 font-semibold transition-colors"
            >
              <Brain className="w-5 h-5" />
              RAG Management
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/admin/crm/mohan-rag/avatar-studio"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/30 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              <UserCheck className="w-5 h-5" />
              Open Avatar Studio
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Highlight Banner / Master Capabilities */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur">
            <div className="text-xs text-slate-400 font-medium">Avatar Form</div>
            <div className="text-lg font-bold text-amber-400 mt-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Head-to-Toe (Full Body)
            </div>
            <div className="text-[11px] text-slate-500 mt-1">360° Photorealistic Rig</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur">
            <div className="text-xs text-slate-400 font-medium">Dynamics & Kinematics</div>
            <div className="text-lg font-bold text-emerald-400 mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-400" />
              Walk, Run, Swim, Yoga
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Full kinetic motion set</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur">
            <div className="text-xs text-slate-400 font-medium">Roles & Attires</div>
            <div className="text-lg font-bold text-teal-400 mt-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              6+ Profession Costumes
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Guruji, Doctor, Army, Corporate</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800/80 backdrop-blur">
            <div className="text-xs text-slate-400 font-medium">Speech & Lip-Sync</div>
            <div className="text-lg font-bold text-sky-400 mt-1 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Mohan Sir Voice DNA
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Natural breathing & multi-lang sync</div>
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between pt-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Mohan Rag Modules & Portals
            </h2>
            <p className="text-xs text-slate-400">Select a module to launch its dedicated studio workspace</p>
          </div>
        </div>

        {/* Main Modular Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1: AVATAR STUDIO (PRIMARY ACTIVE CARD) */}
          <div className="group relative rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-[#121b2d] border-2 border-emerald-500/40 hover:border-emerald-400 shadow-2xl p-6 md:p-8 transition-all duration-300">
            {/* Active Pill */}
            <div className="absolute top-6 right-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Core Engine
            </div>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0 text-emerald-400">
                <UserCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-extrabold text-white group-hover:text-amber-300 transition-colors">
                  Avatar Studio
                </h3>
                <p className="text-sm text-slate-300 font-medium">
                  Head-to-Toe Master AI Avatar Creator
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-400 mt-4 leading-relaxed">
              Design and train Mohan Sir&apos;s complete 3D and video avatar from head to toe. Full locomotion and kinetic control (walking, turning, running, swimming), yogic mudras, pranayama gestures, voice DNA cloning, and multi-profession costumes (Guruji, Doctor, Army Officer, Corporate Leader).
            </p>

            {/* Feature Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>360° Full-Body Head-to-Toe Mesh</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Walking, Running, Swimming & Asanas</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Guruji, Doctor, Army & Corporate Wardrobe</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Mohan Kalburgi Voice DNA Cloning</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Micro-Blinking, Head Tilts & Lip-Sync</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Real-Time 5s Test Lab & Master Activation</span>
              </div>
            </div>

            <div className="mt-6 pt-4 flex items-center justify-between">
              <span className="text-xs text-emerald-400 font-semibold">
                ● 7-Step Dedicated Pipeline Ready
              </span>
              <Link
                href="/admin/crm/mohan-rag/avatar-studio"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-600 to-teal-600 hover:from-amber-400 hover:via-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/40 transition-all duration-200"
              >
                Launch Avatar Studio
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* CARD 2: MULTI-CONTENT CREATION HUB (NEXT PHASE) */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 md:p-8 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-6 right-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-xs font-semibold">
              Step 2 • Next Phase
            </div>

            <div>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
                  <Video className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-200">
                    Multi-Content Creation Hub
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Generate 10 Content Formats from a Single Avatar
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                Once the master avatar is configured, this hub automatically produces viral 10s–60s reels, full structured e-learning masterclasses, guided pranayama sessions, and podcasts without re-recording.
              </p>

              <div className="space-y-2 mt-5">
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                  <span>Viral Reels & Shorts (Dynamic word-by-word captions)</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                  <span>E-Learning Masterclasses (Synchronized slides & 3D diagrams)</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Play className="w-3.5 h-3.5 text-purple-400" />
                  <span>Pranayama & Sadhana Sessions (Breathing cadence timer & audio)</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Activates upon Master Avatar setup
              </span>
              <button
                disabled
                className="px-4 py-2 rounded-lg bg-slate-800/60 text-slate-500 text-xs font-medium cursor-not-allowed"
              >
                Unlocks After Avatar Setup
              </button>
            </div>
          </div>

          {/* CARD 3: SWAR RAG BRAIN (KNOWLEDGE ENGINE) */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 text-amber-400">
                  <Brain className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-200">
                    Swar Knowledge RAG Brain
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">
                    Swar Shastra & Mohan Sir Vedic Knowledge Repository
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                An authoritative vector repository containing Swar Yoga scriptures, nadi rhythms, planetary tithis, ayurvedic principles, and historical discourse transcripts ensuring authentic, grounded avatar responses.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Knowledge Ingestion & Script Engine
              </span>
              <span className="text-xs text-amber-500/70 font-medium">
                Connected to Avatar
              </span>
            </div>
          </div>

          {/* CARD 4: GLOBAL MULTILINGUAL DUBBER */}
          <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 md:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0 text-teal-400">
                  <Globe2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-200">
                    Global Multilingual Studio
                  </h3>
                  <p className="text-sm text-slate-400 font-medium">
                    30+ Foreign Languages Covering 178 Countries
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-4 leading-relaxed">
                Seamlessly dub any video into Japanese, Dutch, Swedish, German, French, Polish, Hebrew, and other global languages with synchronized lip movement matching each target language phonetically.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                30+ Global Languages • Phoneme Lip-Sync
              </span>
              <span className="text-xs text-teal-500/70 font-medium">
                Integrated Pipeline
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
