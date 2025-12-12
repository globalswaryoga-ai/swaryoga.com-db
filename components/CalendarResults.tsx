'use client';

import React from 'react';
import { Calendar, Sun, Moon, Star, MapPin } from 'lucide-react';
import { CalendarData } from '@/types/calendar';

interface CalendarResultsProps {
  data: CalendarData;
}

const CalendarResults: React.FC<CalendarResultsProps> = ({ data }) => {
  const tithiNames = [
    'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
    'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
    'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima/Amavasya'
  ];

  const getTithiName = (tithi: number) => {
    return tithiNames[tithi - 1] || 'Unknown';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Date & Day */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <Calendar className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-800">Date & Day</h3>
        </div>
        <p className="text-2xl font-bold text-blue-600">{data.date}</p>
        <p className="text-gray-600 mt-1">{data.day}</p>
      </div>

      {/* Paksh (Moon Phase) */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-green-500 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <Moon className="w-6 h-6 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-800">Paksh</h3>
        </div>
        <p className="text-2xl font-bold text-green-600">{data.paksh}</p>
        <p className="text-gray-600 mt-1">
          {data.paksh === 'Shukla Paksha' ? '🌕 Waxing Moon' : '🌑 Waning Moon'}
        </p>
      </div>

      {/* Tithi (Lunar Day) */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <Star className="w-6 h-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-800">Tithi</h3>
        </div>
        <p className="text-2xl font-bold text-purple-600">{data.tithi}</p>
        <p className="text-gray-600 mt-1">{getTithiName(data.tithi)}</p>
      </div>

      {/* Sunrise Time */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-orange-500 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <Sun className="w-6 h-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-800">Sunrise</h3>
        </div>
        <p className="text-2xl font-bold text-orange-600">{data.sunrise}</p>
        <p className="text-gray-600 mt-1">Local Time</p>
      </div>

      {/* Nadi (Energy) */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          {data.nadi === 'Surya Nadi' ? (
            <Sun className="w-6 h-6 text-indigo-500" />
          ) : (
            <Moon className="w-6 h-6 text-indigo-500" />
          )}
          <h3 className="text-lg font-semibold text-gray-800">Nadi</h3>
        </div>
        <p className="text-2xl font-bold text-indigo-600">{data.nadi}</p>
        <p className="text-gray-600 mt-1">
          {data.nadi === 'Surya Nadi' ? '☀️ Sun Energy' : '🌙 Moon Energy'}
        </p>
      </div>

      {/* Location */}
      <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-teal-500 hover:shadow-xl transition-shadow">
        <div className="flex items-center space-x-2 mb-3">
          <MapPin className="w-6 h-6 text-teal-500" />
          <h3 className="text-lg font-semibold text-gray-800">Location</h3>
        </div>
        <p className="text-lg font-bold text-teal-600">{data.location}</p>
        <p className="text-gray-600 text-sm mt-1">
          {data.coordinates.latitude.toFixed(4)}°, {data.coordinates.longitude.toFixed(4)}°
        </p>
      </div>
    </div>
  );
};

export default CalendarResults;
