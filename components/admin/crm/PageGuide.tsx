'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info, Lightbulb, CheckCircle, Star, HelpCircle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface PageGuideData {
  title: string;
  description: string;
  icon?: LucideIcon;
  color?: string; // gradient classes e.g. 'from-blue-600 to-indigo-600'
  steps?: string[];
  benefits?: string[];
  tips?: string[];
  freePlanNote?: string;
}

interface PageGuideProps {
  guide: PageGuideData;
  defaultExpanded?: boolean;
}

export default function PageGuide({ guide, defaultExpanded = false }: PageGuideProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const Icon = guide.icon || Info;
  const gradient = guide.color || 'from-indigo-600 to-purple-600';

  return (
    <div className="mx-4 sm:mx-6 mt-4 mb-2">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header - always visible */}
        <div
          className={`bg-gradient-to-r ${gradient} p-4 sm:p-5 cursor-pointer`}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <div className="p-2 bg-white/20 rounded-xl">
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base sm:text-lg">{guide.title}</h3>
                <p className="text-sm text-white/80 mt-0.5 line-clamp-1">{guide.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
                className="p-1 text-white/60 hover:text-white/90 transition"
                title="Dismiss guide"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-1 text-white/80">
                {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable content */}
        {expanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* How to use steps */}
            {guide.steps && guide.steps.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <HelpCircle className="w-4 h-4 text-indigo-500" />
                  How to use this page
                </h4>
                <div className="space-y-2">
                  {guide.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-sm text-gray-700">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {guide.benefits && guide.benefits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-amber-500" />
                  Benefits
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {guide.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-green-50 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            {guide.tips && guide.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  Pro Tips
                </h4>
                <div className="space-y-2">
                  {guide.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-amber-50 rounded-xl">
                      <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Free plan note */}
            {guide.freePlanNote && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
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
