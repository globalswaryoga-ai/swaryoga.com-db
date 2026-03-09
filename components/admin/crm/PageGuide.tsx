'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Info, Lightbulb, CheckCircle, Star, HelpCircle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PageGuideData {
  title: string;
  description: string;
  icon?: LucideIcon;
  color?: string; // gradient classes e.g. 'from-indigo-600 to-indigo-600'
  steps?: string[];
  benefits?: string[];
  tips?: string[];
  freePlanNote?: string;
}

interface PageGuideProps {
  guide: PageGuideData;
  defaultExpanded?: boolean;
}

/** localStorage key for dismissed guides */
const DISMISSED_KEY = 'crm_page_guides_dismissed';

function getDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}

function setDismissedGuide(title: string) {
  const list = getDismissed();
  if (!list.includes(title)) { list.push(title); localStorage.setItem(DISMISSED_KEY, JSON.stringify(list)); }
}

export default function PageGuide({ guide, defaultExpanded = false }: PageGuideProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [dismissed, setDismissed] = useState(true); // hidden by default until hydration

  // Check localStorage on mount — if already dismissed, stay hidden
  useEffect(() => {
    const alreadyDismissed = getDismissed().includes(guide.title);
    setDismissed(alreadyDismissed);
  }, [guide.title]);

  // Auto-dismiss after 30 seconds and persist
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(() => {
      setDismissed(true);
      setDismissedGuide(guide.title);
    }, 30000);
    return () => clearTimeout(timer);
  }, [dismissed, guide.title]);

  if (dismissed) return null;

  const Icon = guide.icon || Info;
  const gradient = guide.color || 'from-indigo-600 to-purple-600';

  return (
    <div className="fixed top-14 right-4 z-40 w-80 sm:w-96 animate-in slide-in-from-right-5 fade-in duration-300">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Compact header */}
        <div
          className={`bg-gradient-to-r ${gradient} px-4 py-3 cursor-pointer`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-white min-w-0">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{guide.title}</h3>
                {!expanded && (
                  <p className="text-xs text-white/70 mt-0.5 truncate">{guide.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(true); setDismissedGuide(guide.title); }}
                className="p-1 text-white/60 hover:text-white transition rounded-md hover:bg-white/10"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="p-0.5 text-white/70">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable content */}
        {expanded && (
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-gray-500">{guide.description}</p>

            {/* How to use steps */}
            {guide.steps && guide.steps.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                  How to use
                </h4>
                <div className="space-y-1.5">
                  {guide.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs text-gray-600">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {guide.benefits && guide.benefits.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  Benefits
                </h4>
                <div className="space-y-1">
                  {guide.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-1.5 bg-green-50 rounded-lg">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {guide.tips && guide.tips.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-900 flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-500" />
                  Pro Tips
                </h4>
                <div className="space-y-1">
                  {guide.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-1.5 p-1.5 bg-amber-50 rounded-lg">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-600">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Free plan note */}
            {guide.freePlanNote && (
              <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                <p className="text-xs text-indigo-700 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                  <span><strong>Free Plan:</strong> {guide.freePlanNote}</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
