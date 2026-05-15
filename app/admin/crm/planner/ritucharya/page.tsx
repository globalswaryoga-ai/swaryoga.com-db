'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { MapPin, Cloud, Zap, Edit2, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { locationData } from '@/lib/locationData';
import Link from 'next/link';

function RitucharyaPageContent() {
  const [location, setLocation] = useState({ country: '', state: '', city: '' });
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);

  const countries = locationData;

  const handleCountryChange = (e: string) => {
    const country = countries.find(c => c.name === e);
    setLocation({ country: e, state: '', city: '' });
    setStates(country?.states || []);
    setCities([]);
  };

  const handleStateChange = (e: string) => {
    const country = countries.find(c => c.name === location.country);
    const state = country?.states.find(s => s.name === e);
    setLocation({ ...location, state: e, city: '' });
    setCities(state?.cities || []);
  };

  const handleCityChange = (e: string) => {
    setLocation({ ...location, city: e });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.country || !location.state || !location.city) {
      alert('Please select all fields');
      return;
    }

    setLoading(true);
    try {
      const country = countries.find(c => c.name === location.country);
      const state = country?.states.find(s => s.name === location.state);
      const city = state?.cities.find(c => c.name === location.city);

      if (!city) throw new Error('City not found');

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
      );

      const data = await response.json();
      setWeather(data.current);
      setSubmitted(true);
      localStorage.setItem('ritucharya_location', JSON.stringify(location));
    } catch (error) {
      console.error('Error fetching weather:', error);
      alert('Error fetching weather data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">🌿 Ritucharya</h1>
        <Link
          href="/admin/crm/planner/ritucharya/manage"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 transition-colors font-semibold"
        >
          <Edit2 size={18} />
          Manage Form
        </Link>
      </div>

      {!submitted ? (
        // Form Section
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-8">
          <h2 className="text-2xl font-bold text-emerald-700 mb-6">📍 Select Your Location</h2>
          <p className="text-gray-600 mb-6">Tell us where you are to get personalized seasonal recommendations</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Country */}
            <div>
              <label className="block text-sm font-semibold text-emerald-700 mb-2">
                Country
              </label>
              <select
                value={location.country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border-2 border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 font-medium"
              >
                <option value="">Select Country...</option>
                {countries.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* State */}
            <div>
              <label className="block text-sm font-semibold text-emerald-700 mb-2">
                State/Region
              </label>
              <select
                value={location.state}
                onChange={(e) => handleStateChange(e.target.value)}
                disabled={!location.country}
                className="w-full px-4 py-3 rounded-lg border-2 border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select State/Region...</option>
                {states.map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-sm font-semibold text-emerald-700 mb-2">
                City
              </label>
              <select
                value={location.city}
                onChange={(e) => handleCityChange(e.target.value)}
                disabled={!location.state}
                className="w-full px-4 py-3 rounded-lg border-2 border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-700 font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select City...</option>
                {cities.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-gray-400 transition-colors font-bold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Loading...
                </>
              ) : (
                <>
                  <MapPin size={20} />
                  Get Recommendations
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        // Results Section
        <div className="space-y-6">
          {/* Weather Analysis Card */}
          <div className="rounded-2xl border-2 border-blue-300 bg-blue-50 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-blue-700">☁️ Weather Analysis (Editable)</h2>
              <button className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-2">
                🔄 Fetch Again
              </button>
            </div>

            {/* Weather Boxes Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Current Temp */}
              <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
                <p className="text-xs text-gray-600 mb-2">🌡️ Current Temp</p>
                <input
                  type="number"
                  defaultValue={Math.round(weather?.temperature_2m || 0)}
                  className="w-full text-2xl font-bold bg-transparent text-blue-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Today's temp</p>
              </div>

              {/* Min Temp */}
              <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
                <p className="text-xs text-gray-600 mb-2">❄️ Min Temp</p>
                <input
                  type="number"
                  defaultValue={Math.round((weather?.temperature_2m || 0) - 5)}
                  className="w-full text-2xl font-bold bg-transparent text-blue-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Lowest today</p>
              </div>

              {/* Max Temp */}
              <div className="bg-blue-100 rounded-xl p-4 border border-blue-300">
                <p className="text-xs text-gray-600 mb-2">🔥 Max Temp</p>
                <input
                  type="number"
                  defaultValue={Math.round((weather?.temperature_2m || 0) + 5)}
                  className="w-full text-2xl font-bold bg-transparent text-blue-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Highest today</p>
              </div>

              {/* Humidity */}
              <div className="bg-cyan-100 rounded-xl p-4 border border-cyan-300">
                <p className="text-xs text-gray-600 mb-2">💧 Humidity (%)</p>
                <input
                  type="number"
                  defaultValue={weather?.relative_humidity_2m || 0}
                  className="w-full text-2xl font-bold bg-transparent text-cyan-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Air moisture</p>
              </div>

              {/* Wind Speed */}
              <div className="bg-yellow-100 rounded-xl p-4 border border-yellow-300">
                <p className="text-xs text-gray-600 mb-2">💨 Wind Speed</p>
                <input
                  type="number"
                  defaultValue={Math.round(weather?.wind_speed_10m || 0)}
                  className="w-full text-2xl font-bold bg-transparent text-yellow-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Air movement</p>
              </div>

              {/* Air Quality */}
              <div className="bg-red-100 rounded-xl p-4 border border-red-300">
                <p className="text-xs text-gray-600 mb-2">💨 Air Quality (AQI)</p>
                <input
                  type="number"
                  defaultValue="50"
                  className="w-full text-2xl font-bold bg-transparent text-red-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">🟡 Moderate</p>
              </div>

              {/* Description */}
              <div className="bg-purple-100 rounded-xl p-4 border border-purple-300">
                <p className="text-xs text-gray-600 mb-2">📝 Description</p>
                <input
                  type="text"
                  defaultValue="Partly cloudy"
                  className="w-full text-sm font-bold bg-transparent text-purple-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Clear, Cloudy, Rainy</p>
              </div>

              {/* Climate Type */}
              <div className="bg-green-100 rounded-xl p-4 border border-green-300">
                <p className="text-xs text-gray-600 mb-2">🌍 Climate Type</p>
                <input
                  type="text"
                  defaultValue="Hot"
                  className="w-full text-2xl font-bold bg-transparent text-green-700 outline-none"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-calculated</p>
              </div>
            </div>

            {/* Location */}
            <div className="p-4 rounded-lg bg-blue-200 text-blue-800 font-semibold mb-4">
              📍 {location.city}, {location.state}, {location.country}
            </div>

            {/* Save Button */}
            <button className="w-full px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold">
              ✓ Save Weather Analysis (30 Days)
            </button>
          </div>

          {/* Recommendations Section */}
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-8">
            <h2 className="text-2xl font-bold text-emerald-700 mb-6">🌿 Seasonal Recommendations</h2>
            <p className="text-gray-600 mb-6">
              Based on current weather conditions, here are your personalized Ayurvedic recommendations for optimal health.
            </p>

            {/* Links to detailed pages */}
            <div className="grid grid-cols-1 gap-4">
              <Link
                href="/admin/crm/planner-dashboard/ritucharya/today"
                className="p-6 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 hover:shadow-lg transition-all flex items-center justify-between group"
              >
                <div>
                  <h3 className="text-lg font-bold text-emerald-700">🍲 Today's Meals</h3>
                  <p className="text-sm text-gray-600">Time-based meal recommendations</p>
                </div>
                <ArrowRight className="text-emerald-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Change Location Button */}
          <button
            onClick={() => setSubmitted(false)}
            className="w-full px-6 py-3 rounded-lg border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 transition-colors font-bold"
          >
            ← Change Location
          </button>
        </div>
      )}
    </div>
  );
}

export default function RitucharyaPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Catch any errors that might occur during render
    const handleError = (e: ErrorEvent) => {
      if (e.message.includes('auth')) {
        setError('There was an issue loading this page. Please refresh.');
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-bold text-red-800">{error}</h3>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="text-center py-20">Loading...</div>}>
      <RitucharyaPageContent />
    </Suspense>
  );
}
