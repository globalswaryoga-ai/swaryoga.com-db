'use client';

import React from 'react';
import { Moon, Star, Sparkles, Zap, Wind } from 'lucide-react';
import { PanchangData } from '@/lib/panchang';

interface PanchangDisplayProps {
  panchang: PanchangData;
  isAuspicious: boolean;
  festivals?: string[];
}

export const PanchangDisplay: React.FC<PanchangDisplayProps> = ({
  panchang,
  isAuspicious,
  festivals = [],
}) => {
  const getYogaColor = (type: string) => {
    switch (type) {
      case 'auspicious':
        return 'bg-emerald-50 border-emerald-500 text-emerald-900';
      case 'inauspicious':
        return 'bg-red-50 border-red-500 text-red-900';
      default:
        return 'bg-amber-50 border-amber-500 text-amber-900';
    }
  };

  const getRaasiElement = (element: string) => {
    const elementMap: Record<string, { icon: string; color: string }> = {
      'Fire': { icon: '🔥', color: 'text-orange-600' },
      'Earth': { icon: '🌍', color: 'text-amber-700' },
      'Air': { icon: '💨', color: 'text-cyan-600' },
      'Water': { icon: '💧', color: 'text-blue-600' },
    };
    return elementMap[element] || { icon: '○', color: 'text-gray-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header with Date Info */}
      <div className="bg-gradient-to-r from-[#2D6A4F] to-[#4ECDC4] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-bold mb-2">{panchang.date}</h2>
            <p className="text-xl opacity-90">{panchang.day}</p>
          </div>
          <div className="text-right">
            <div className={`text-lg font-semibold px-4 py-2 rounded-full ${
              isAuspicious 
                ? 'bg-white/20 backdrop-blur-sm border border-white/30' 
                : 'bg-white/10 backdrop-blur-sm border border-white/20'
            }`}>
              {isAuspicious ? '✨ Auspicious' : '⚡ Mixed'}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Panchang Elements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Tithi */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#E07B69] p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-3">
            <Moon className="w-5 h-5 text-[#E07B69] mr-2" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Tithi</h3>
          </div>
          <p className="text-2xl font-bold text-[#E07B69] mb-1">{panchang.tithi.name}</p>
          <p className="text-xs text-gray-600">{panchang.tithi.paksha}</p>
          <p className="text-xs text-gray-500 mt-2">{panchang.tithi.number}/30</p>
        </div>

        {/* Nakshatra */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#4ECDC4] p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-3">
            <Star className="w-5 h-5 text-[#4ECDC4] mr-2" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Nakshatra</h3>
          </div>
          <p className="text-2xl font-bold text-[#4ECDC4] mb-1">{panchang.nakshatra.name}</p>
          <p className="text-xs text-gray-600">{panchang.nakshatra.deity}</p>
          <p className="text-xs text-gray-500 mt-2">{panchang.nakshatra.number}/27</p>
        </div>

        {/* Yoga */}
        <div className={`rounded-xl shadow-lg border-t-4 p-6 hover:shadow-xl transition-shadow ${getYogaColor(panchang.yoga.type)}`}>
          <div className="flex items-center mb-3">
            <Sparkles className={`w-5 h-5 mr-2 ${
              panchang.yoga.type === 'auspicious' ? 'text-emerald-600' :
              panchang.yoga.type === 'inauspicious' ? 'text-red-600' : 'text-amber-600'
            }`} />
            <h3 className="font-semibold text-sm uppercase tracking-wide">Yoga</h3>
          </div>
          <p className="text-2xl font-bold mb-1">{panchang.yoga.name}</p>
          <p className="text-xs capitalize">{panchang.yoga.type}</p>
          <p className="text-xs mt-2 opacity-75">{panchang.yoga.number}/27</p>
        </div>

        {/* Karana */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#6F4E37] p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-3">
            <Zap className="w-5 h-5 text-[#6F4E37] mr-2" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Karana</h3>
          </div>
          <p className="text-2xl font-bold text-[#6F4E37] mb-1">{panchang.karana.name}</p>
          <p className="text-xs text-gray-600 capitalize">{panchang.karana.type}</p>
        </div>

        {/* Raasi */}
        <div className="bg-white rounded-xl shadow-lg border-t-4 border-[#2D6A4F] p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-center mb-3">
            <Wind className="w-5 h-5 text-[#2D6A4F] mr-2" />
            <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Raasi</h3>
          </div>
          <p className="text-2xl font-bold text-[#2D6A4F] mb-1">{panchang.raasi.name}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-lg ${getRaasiElement(panchang.raasi.element).color}`}>
              {getRaasiElement(panchang.raasi.element).icon}
            </span>
            <span className="text-xs text-gray-600">{panchang.raasi.element}</span>
          </div>
        </div>
      </div>

      {/* Festival Suggestions */}
      {festivals.length > 0 && (
        <div className="bg-gradient-to-r from-[#FFE8E0] to-[#E8F5E9] rounded-xl p-6 border border-[#E07B69]/30">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center">
            <span className="text-2xl mr-2">🎉</span>
            Auspicious Activities
          </h3>
          <div className="flex flex-wrap gap-2">
            {festivals.map((festival, idx) => (
              <span
                key={idx}
                className="bg-white px-4 py-2 rounded-full text-sm font-medium text-[#2D6A4F] border border-[#2D6A4F]/20 shadow-sm hover:shadow-md transition-shadow"
              >
                {festival}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Day of Week */}
        <div className="bg-[#E8F5E9] rounded-xl p-4 border border-[#2D6A4F]/20">
          <p className="text-xs uppercase text-gray-600 font-semibold mb-1">Day of Week</p>
          <p className="text-xl font-bold text-[#2D6A4F]">{panchang.vaara.name}</p>
        </div>

        {/* Ayanamsa */}
        <div className="bg-[#E8FFFE] rounded-xl p-4 border border-[#4ECDC4]/20">
          <p className="text-xs uppercase text-gray-600 font-semibold mb-1">Ayanamsa</p>
          <p className="text-xl font-bold text-[#4ECDC4]">{typeof panchang.ayanamsa === 'number' && isFinite(panchang.ayanamsa) ? panchang.ayanamsa.toFixed(2) : '0.00'}°</p>
        </div>
      </div>

      {/* Time Ranges */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Time Boundaries</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-600 font-medium mb-1">Tithi Ends</p>
            <p className="text-gray-800 font-semibold">{panchang.tithi.endTime}</p>
          </div>
          <div>
            <p className="text-gray-600 font-medium mb-1">Nakshatra Ends</p>
            <p className="text-gray-800 font-semibold">{panchang.nakshatra.endTime}</p>
          </div>
          <div>
            <p className="text-gray-600 font-medium mb-1">Yoga Ends</p>
            <p className="text-gray-800 font-semibold">{panchang.yoga.endTime}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PanchangDisplay;
