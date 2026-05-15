'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { getRituBySeason } from '@/lib/ritucharya/seasons';

interface SavedWeatherData {
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  windSpeed: number;
  aqi: number;
  description: string;
  climate: string;
  ritu: string;
  rituId: string;
  savedAt: string;
  expiresAt: string;
}

export default function RitucharyaDashboardPage() {
  const [weatherData, setWeatherData] = useState<SavedWeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('ritucharya_weather_analysis');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setWeatherData(data);
      } catch (err) {
        console.error('Error loading weather data:', err);
      }
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4 text-blue-400" size={40} />
          <p>Loading season dashboard...</p>
        </div>
      </main>
    );
  }

  if (!weatherData) {
    return (
      <main className="min-h-screen bg-black text-white pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link
            href="/admin/crm/planner-dashboard/ritucharya"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 font-semibold"
          >
            <ArrowLeft size={20} />
            Back to Weather Analysis
          </Link>

          <div className="bg-gray-900 border-l-4 border-yellow-400 p-8 rounded-lg">
            <h2 className="text-2xl font-bold text-yellow-400 mb-4">No Data Found</h2>
            <p className="text-gray-300 mb-6">
              Please go back to the Weather Analysis page, enter your weather data, and click "Save Weather Analysis" to continue.
            </p>
            <Link
              href="/admin/crm/planner-dashboard/ritucharya"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Go Back to Weather Analysis
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rituDetails = getRituBySeason(weatherData.rituId);
  const expiresDate = new Date(weatherData.expiresAt);
  const daysRemaining = Math.ceil(
    (expiresDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <main className="min-h-screen bg-black text-white pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back Button */}
        <Link
          href="/admin/crm/planner-dashboard/ritucharya"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8 font-semibold"
        >
          <ArrowLeft size={20} />
          Back to Weather Analysis
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-2" style={{ color: '#00FF00' }}>
            {weatherData.ritu}
          </h1>
          <p className="text-gray-400">Season Analysis Dashboard</p>
        </div>

        {/* Weather Summary */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div
            className="p-6 rounded-lg"
            style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}
          >
            <h3 className="font-bold mb-4" style={{ color: '#00FF00' }}>
              📊 Today's Weather
            </h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-bold">
                  {weatherData.temp}°C ({weatherData.tempMin}° - {weatherData.tempMax}°)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Humidity:</span>
                <span className="font-bold">{weatherData.humidity}%</span>
              </div>
              <div className="flex justify-between">
                <span>Wind Speed:</span>
                <span className="font-bold">{weatherData.windSpeed} kph</span>
              </div>
              <div className="flex justify-between">
                <span>Air Quality:</span>
                <span className="font-bold">{weatherData.aqi}</span>
              </div>
              <div className="flex justify-between">
                <span>Climate:</span>
                <span className="font-bold">{weatherData.climate}</span>
              </div>
            </div>
          </div>

          <div
            className="p-6 rounded-lg"
            style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}
          >
            <h3 className="font-bold mb-4" style={{ color: '#00FF00' }}>
              ⏰ Data Validity
            </h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex justify-between">
                <span>Saved:</span>
                <span className="font-bold">{new Date(weatherData.savedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Expires:</span>
                <span className="font-bold">{expiresDate.toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Days Remaining:</span>
                <span
                  className="font-bold px-3 py-1 rounded"
                  style={{
                    backgroundColor: daysRemaining > 10 ? '#00FF00' : '#FFFF00',
                    color: '#000000'
                  }}
                >
                  {daysRemaining} days
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ritu Details Section */}
        {rituDetails && (
          <div
            className="p-8 rounded-lg mb-12"
            style={{ border: '2px solid #00FF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}
          >
            <h2 className="text-3xl font-bold mb-6" style={{ color: '#00FF00' }}>
              {rituDetails.nameHi} ({rituDetails.nameEn})
            </h2>

            {/* Placeholder for content */}
            <div className="text-center py-16 border-2 border-dashed border-gray-600 rounded-lg">
              <p style={{ color: '#AAAAAA' }} className="text-lg mb-4">
                📋 Season Dashboard Content
              </p>
              <p style={{ color: '#666666' }} className="text-sm">
                Ready for your custom content...
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Link
            href="/admin/crm/planner-dashboard/ritucharya/today"
            className="font-bold py-3 px-8 rounded-lg flex items-center gap-2 transition-colors"
            style={{ backgroundColor: '#00FF00', color: '#000000' }}
          >
            Next: Daily Recommendations
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/admin/crm/planner-dashboard/ritucharya"
            className="font-bold py-3 px-8 rounded-lg transition-colors"
            style={{ backgroundColor: '#666666', color: '#FFFFFF' }}
          >
            Edit Weather
          </Link>
        </div>
      </div>
    </main>
  );
}
