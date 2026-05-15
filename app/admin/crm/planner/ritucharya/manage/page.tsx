'use client';

import React, { useState, useEffect } from 'react';
import { Save, Loader, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface WeatherData {
  currentTemp: number;
  minTemp: number;
  maxTemp: number;
  humidity: number;
  windSpeed: number;
  airQuality: number;
  description: string;
  climateType: string;
}

interface LocationData {
  country: string;
  state: string;
  city: string;
}

export default function ManageFormPage() {
  const [location, setLocation] = useState<LocationData>({ country: '', state: '', city: '' });
  const [weather, setWeather] = useState<WeatherData>({
    currentTemp: 0,
    minTemp: 0,
    maxTemp: 0,
    humidity: 0,
    windSpeed: 0,
    airQuality: 50,
    description: 'Partly cloudy',
    climateType: 'Hot',
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('ritucharya_location');
    if (savedLocation) {
      setLocation(JSON.parse(savedLocation));
      loadWeatherData();
    }
  }, []);

  const loadWeatherData = () => {
    const savedWeather = localStorage.getItem('ritucharya_weather');
    if (savedWeather) {
      setWeather(JSON.parse(savedWeather));
    }
  };

  const handleWeatherChange = (field: keyof WeatherData, value: string | number) => {
    setWeather(prev => ({
      ...prev,
      [field]: typeof value === 'string' && field !== 'description' && field !== 'climateType'
        ? parseInt(value)
        : value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      localStorage.setItem('ritucharya_weather', JSON.stringify(weather));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving weather data:', error);
      alert('Error saving weather data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">⚙️ Manage Weather Form</h1>
        <Link
          href="/admin/crm/planner?section=ritucharya"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-300 text-gray-800 hover:bg-gray-400 transition-colors font-semibold"
        >
          <ArrowLeft size={18} />
          Back
        </Link>
      </div>

      {/* Location Display */}
      {location.country && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-6">
          <h2 className="text-xl font-bold text-emerald-700 mb-4">📍 User Selected Location</h2>
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-gray-600">Country</p>
              <p className="text-lg font-bold text-emerald-700">{location.country}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">State/Region</p>
              <p className="text-lg font-bold text-emerald-700">{location.state}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">City</p>
              <p className="text-lg font-bold text-emerald-700">{location.city}</p>
            </div>
          </div>
        </div>
      )}

      {/* Weather Data Form */}
      <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-8">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">☁️ Editable Weather Blocks</h2>

        {/* Weather Boxes Grid - 4 columns */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Current Temp */}
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">🌡️ Current Temp</p>
            <input
              type="number"
              value={weather.currentTemp}
              onChange={(e) => handleWeatherChange('currentTemp', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">Today's temp</p>
          </div>

          {/* Min Temp */}
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">❄️ Min Temp</p>
            <input
              type="number"
              value={weather.minTemp}
              onChange={(e) => handleWeatherChange('minTemp', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">Lowest today</p>
          </div>

          {/* Max Temp */}
          <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
            <p className="text-xs text-gray-600 mb-2">🔥 Max Temp</p>
            <input
              type="number"
              value={weather.maxTemp}
              onChange={(e) => handleWeatherChange('maxTemp', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-blue-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">Highest today</p>
          </div>

          {/* Humidity */}
          <div className="bg-cyan-100 rounded-xl p-4 border border-cyan-300">
            <p className="text-xs text-gray-600 mb-2">💧 Humidity (%)</p>
            <input
              type="number"
              value={weather.humidity}
              onChange={(e) => handleWeatherChange('humidity', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-cyan-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">Air moisture</p>
          </div>

          {/* Wind Speed */}
          <div className="bg-yellow-100 rounded-xl p-4 border border-yellow-300">
            <p className="text-xs text-gray-600 mb-2">💨 Wind Speed</p>
            <input
              type="number"
              value={weather.windSpeed}
              onChange={(e) => handleWeatherChange('windSpeed', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-yellow-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">Air movement</p>
          </div>

          {/* Air Quality */}
          <div className="bg-red-100 rounded-xl p-4 border border-red-300">
            <p className="text-xs text-gray-600 mb-2">💨 Air Quality (AQI)</p>
            <input
              type="number"
              value={weather.airQuality}
              onChange={(e) => handleWeatherChange('airQuality', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-red-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">🟡 Moderate</p>
          </div>

          {/* Description */}
          <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
            <p className="text-xs text-gray-600 mb-2">📝 Description</p>
            <select
              value={weather.description}
              onChange={(e) => handleWeatherChange('description', e.target.value)}
              className="w-full text-sm font-bold bg-white text-slate-900 outline-none border-2 border-purple-300 rounded px-3 py-2"
            >
              <option value="Clear">Clear</option>
              <option value="Partly cloudy">Partly cloudy</option>
              <option value="Cloudy">Cloudy</option>
              <option value="Rainy">Rainy</option>
              <option value="Stormy">Stormy</option>
              <option value="Foggy">Foggy</option>
            </select>
            <p className="text-xs text-gray-500 mt-2">Clear, Cloudy, Rainy</p>
          </div>

          {/* Climate Type */}
          <div className="bg-green-100 rounded-xl p-4 border border-green-300">
            <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
            <input
              type="text"
              value={weather.climateType}
              onChange={(e) => handleWeatherChange('climateType', e.target.value)}
              className="w-full text-2xl font-bold bg-white text-slate-900 outline-none border-2 border-green-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-2">Auto-calculated</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-bold flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="animate-spin" size={20} />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              {saved ? '✓ Saved!' : 'Save Weather Data'}
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>💡 Note:</strong> Edit the 6 weather parameters above to manage the weather analysis data for the selected location.
        </p>
      </div>
    </div>
  );
}
