'use client';

import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface TasteRecommendation {
  name: string;
  percentage: number;
  emoji: string;
  description: string;
}

interface AvoidRecommendation {
  name: string;
  emoji: string;
  description: string;
}

interface DietaryRecommendationsChartProps {
  tasteRecommendations?: TasteRecommendation[];
  avoidRecommendations?: AvoidRecommendation[];
  title?: string;
}

export default function DietaryRecommendationsChart({
  tasteRecommendations = [],
  avoidRecommendations = [],
  title = 'Dietary Recommendations'
}: DietaryRecommendationsChartProps) {
  // Default data if not provided
  const tastes = tasteRecommendations.length > 0 ? tasteRecommendations : [
    { name: 'Mita', percentage: 60, emoji: '🍶', description: 'Mild / Balanced' },
    { name: 'Kasela', percentage: 40, emoji: '🍋', description: 'Astringent' },
    { name: 'Kadawa', percentage: 30, emoji: '☕', description: 'Bitter' },
  ];

  const avoids = avoidRecommendations.length > 0 ? avoidRecommendations : [
    { name: 'Salty', emoji: '🧂', description: 'Namkeen' },
    { name: 'Sour', emoji: '🍈', description: 'Amla' },
    { name: 'Spicy', emoji: '🌶️', description: 'Teekha' },
  ];

  return (
    <div className="w-full bg-gradient-to-b from-blue-50 to-white border-2 border-blue-200 rounded-2xl p-6 mb-6">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-blue-900">{title}</h2>
      </div>

      {/* Two Row Layout */}
      <div className="space-y-6">
        {/* Row 1: What to Eat (with percentages) */}
        <div className="bg-white border-2 border-green-300 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✅</span>
            <h3 className="text-lg font-bold text-green-700">What to Eat</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {tastes.map((taste, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-b from-green-50 to-green-100 border-2 border-green-400 rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-2">{taste.emoji}</div>
                <div className="font-bold text-green-800 text-lg">{taste.name}</div>
                <div className="text-sm text-green-700 mb-2">{taste.description}</div>
                <div className="flex items-center justify-center gap-1">
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${taste.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold text-green-800 mt-1">{taste.percentage}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: What to Avoid */}
        <div className="bg-white border-2 border-red-300 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-bold text-red-700">What to Avoid</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {avoids.map((avoid, idx) => (
              <div
                key={idx}
                className="bg-gradient-to-b from-red-50 to-red-100 border-2 border-red-400 rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-2">{avoid.emoji}</div>
                <div className="font-bold text-red-800 text-lg">{avoid.name}</div>
                <div className="text-sm text-red-700">{avoid.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="mt-6 bg-blue-100 border-l-4 border-blue-600 p-4 rounded">
        <p className="text-sm text-blue-800">
          <strong>💡 Tip:</strong> Follow these dietary recommendations based on your Ritu and phase for optimal health and wellness.
        </p>
      </div>
    </div>
  );
}
