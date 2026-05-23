'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Cloud,
  UtensilsCrossed,
  Calendar,
  ChevronRight,
  Leaf
} from 'lucide-react';

export default function RitucharyaHubPage() {
  const router = useRouter();

  const sections = [
    {
      id: 'logic',
      title: '🌡️ Ritucharya Logic',
      description: 'Set weather ranges and map to Ritu seasons',
      icon: Cloud,
      color: 'from-blue-500 to-blue-600',
      path: '/admin/crm/ritucharya/logic',
      tips: ['Temperature ranges', 'Humidity levels', 'Sky conditions', 'Ritu mapping']
    },
    {
      id: 'dietary',
      title: '🍽️ Dietary Recommendations',
      description: 'Add tastes & avoid recommendations for each Ritu+Phase',
      icon: UtensilsCrossed,
      color: 'from-green-500 to-green-600',
      path: '/admin/crm/ritucharya/dietary-recommendations',
      tips: ['Taste percentages', 'Avoid items', 'Descriptions', 'Emojis']
    },
    {
      id: 'diet',
      title: '🍱 Diet Plan & Meals',
      description: 'Create meal plans and daily routines for each Ritu+Phase',
      icon: Calendar,
      color: 'from-orange-500 to-orange-600',
      path: '/admin/crm/ritucharya/diet-plan',
      tips: ['Meal slots', 'Foods', 'Herbs', 'Lifestyle tips']
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Leaf className="w-8 h-8 text-emerald-600" />
            <h1 className="text-4xl font-bold text-gray-900">ऋतुचर्या (Ritucharya) Management</h1>
          </div>
          <p className="text-gray-600 text-lg">Manage seasonal Ayurvedic routines based on weather</p>

          {/* Flow Diagram */}
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p className="text-sm text-emerald-900 font-semibold mb-3">📋 Admin Setup Flow:</p>
            <div className="flex items-center gap-2 text-sm text-emerald-800 flex-wrap">
              <span className="px-3 py-1 bg-white rounded border border-emerald-300">1. Set Logic</span>
              <span className="text-emerald-400">→</span>
              <span className="px-3 py-1 bg-white rounded border border-emerald-300">2. Add Dietary</span>
              <span className="text-emerald-400">→</span>
              <span className="px-3 py-1 bg-white rounded border border-emerald-300">3. Create Meals</span>
              <span className="text-emerald-400">→</span>
              <span className="px-3 py-1 bg-white rounded border border-emerald-300">Frontend Uses Data</span>
            </div>
          </div>
        </div>

        {/* Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div
                key={section.id}
                onClick={() => router.push(section.path)}
                className="group cursor-pointer"
              >
                <div className="h-full bg-white rounded-xl border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all p-6">
                  {/* Color Bar */}
                  <div className={`h-1 w-12 bg-gradient-to-r ${section.color} rounded-full mb-4`}></div>

                  {/* Icon & Title */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">
                        {section.title}
                      </h2>
                      <p className="text-sm text-gray-600">{section.description}</p>
                    </div>
                    <Icon className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 transition-colors mt-1 shrink-0" />
                  </div>

                  {/* Tips/Features */}
                  <div className="mt-4 space-y-2">
                    {section.tips.map((tip, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Arrow */}
                  <div className="mt-6 flex items-center text-emerald-600 font-semibold text-sm group-hover:gap-2 transition-all">
                    <span>Manage</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-bold text-blue-900 mb-3">ℹ️ How It Works</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>✓ Admin creates Ritu logic (weather → season mapping)</li>
              <li>✓ Admin adds dietary recommendations per Ritu+Phase</li>
              <li>✓ Admin creates meal plans with food schedules</li>
              <li>✓ Frontend automatically shows user recommendations based on their weather</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="font-bold text-green-900 mb-3">🎯 6 Ritus × 3 Phases</h3>
            <ul className="text-sm text-green-800 space-y-2">
              <li>✓ <strong>Shishir</strong> (Winter), <strong>Vasant</strong> (Spring)</li>
              <li>✓ <strong>Grishma</strong> (Summer), <strong>Varsha</strong> (Monsoon)</li>
              <li>✓ <strong>Sharad</strong> (Autumn), <strong>Hemant</strong> (Early Winter)</li>
              <li>✓ Each with <strong>Begin, Peak, Last</strong> phases</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
