'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Loader, ArrowRight, Droplets, Wind, Thermometer, AlertCircle, RefreshCw } from 'lucide-react';
import { locationData } from '@/lib/locationData';
import { getClimateRitu, getRituBySeason } from '@/lib/ritucharya/seasons';

interface WeatherData {
  temp: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  description: string;
  windSpeed: number;
  climate: string;
  ritu: string;
  rituId: string;
}

export default function RitucharyaCRMPage() {
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Editable weather fields
  const [editableTemp, setEditableTemp] = useState<number>(25);
  const [editableTempMin, setEditableTempMin] = useState<number>(20);
  const [editableTempMax, setEditableTempMax] = useState<number>(30);
  const [editableHumidity, setEditableHumidity] = useState<number>(50);
  const [editableWindSpeed, setEditableWindSpeed] = useState<number>(15);
  const [editableAQI, setEditableAQI] = useState<number>(50);
  const [editableDescription, setEditableDescription] = useState<string>('Partly cloudy');

  // Get AQI quality status
  const getAQIStatus = (aqi: number): string => {
    if (aqi <= 50) return '🟢 Good';
    if (aqi <= 100) return '🟡 Moderate';
    if (aqi <= 150) return '🟠 Unhealthy (Sensitive)';
    if (aqi <= 200) return '🔴 Unhealthy';
    if (aqi <= 300) return '🔴🔴 Very Unhealthy';
    return '⚫ Hazardous';
  };

  // Check for expired saved weather data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('ritucharya_weather_analysis');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        const expiresAt = new Date(data.expiresAt);
        const now = new Date();

        if (now > expiresAt) {
          // Data has expired - remove it
          localStorage.removeItem('ritucharya_weather_analysis');
          console.log('Weather data expired (30 days passed)');
        }
      } catch (err) {
        console.log('Error checking saved data expiration:', err);
      }
    }
  }, []);

  // Initialize countries
  useEffect(() => {
    const countryNames = locationData.map(c => c.name).sort();
    setCountries(countryNames);
  }, []);

  // Update states when country changes
  useEffect(() => {
    if (country) {
      const selectedCountry = locationData.find(c => c.name === country);
      const stateNames = selectedCountry?.states.map(s => s.name).sort() || [];
      setStates(stateNames);
      setState('');
      setCities([]);
      setCity('');
    }
  }, [country]);

  // Update cities when state changes
  useEffect(() => {
    if (country && state) {
      const selectedCountry = locationData.find(c => c.name === country);
      const selectedState = selectedCountry?.states.find(s => s.name === state);
      const cityList = selectedState?.cities || [];
      setCities(cityList);
      setCity('');
    }
  }, [country, state]);

  // Detect climate based on weather data
  const detectClimate = (temp: number, humidity: number, description: string): string => {
    if (temp > 32) return 'Hot';
    if (temp < 10) return 'Cold';
    if (humidity > 75 && description.toLowerCase().includes('rain')) return 'Heavy Rainy';
    if (humidity > 60 && description.toLowerCase().includes('rain')) return 'Rainy';
    if (humidity < 40) return 'Dry';
    return 'Moderate';
  };

  // Detect Ritu (season) based on actual weather conditions
  const detectRitu = (temp: number, humidity: number, description: string): string => {
    const rituId = getClimateRitu(temp, humidity, description);
    const ritu = getRituBySeason(rituId);
    return ritu ? `${ritu.nameHi} (${ritu.nameEn})` : 'Unknown';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!country || !state || !city) {
      setError('Please select country, state, and city');
      return;
    }

    setLoading(true);
    setError('');
    setWeather(null);

    try {
      // Get coordinates
      const selectedCountry = locationData.find(c => c.name === country);
      const selectedState = selectedCountry?.states.find(s => s.name === state);
      const selectedCity = selectedState?.cities.find(c => c.name === city);

      if (!selectedCity) {
        throw new Error('City coordinates not found');
      }

      // Save location to localStorage for today page
      localStorage.setItem('ritucharya_location', JSON.stringify({
        country, state, city,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude
      }));

      // Fetch weather data from Open-Meteo (free, no API key needed)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
      );

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const data = await response.json();
      const current = data.current;

      // Get weather description from weather code
      const getWeatherDescription = (code: number): string => {
        if (code === 0) return 'Clear sky';
        if (code === 1 || code === 2) return 'Partly cloudy';
        if (code === 3) return 'Overcast';
        if ([45, 48].includes(code)) return 'Foggy';
        if ([51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82].includes(code)) return 'Rain';
        if ([85, 86].includes(code)) return 'Heavy rain';
        return 'Unknown';
      };

      // Parse weather data
      const description = getWeatherDescription(current.weather_code);
      const climate = detectClimate(current.temperature_2m, current.relative_humidity_2m, description);
      const rituId = getClimateRitu(current.temperature_2m, current.relative_humidity_2m, description);
      const ritu = detectRitu(current.temperature_2m, current.relative_humidity_2m, description);

      const weatherData: WeatherData = {
        temp: Math.round(current.temperature_2m),
        tempMin: Math.round(current.temperature_2m - 2), // Approximate
        tempMax: Math.round(current.temperature_2m + 2), // Approximate
        humidity: current.relative_humidity_2m,
        description,
        windSpeed: current.wind_speed_10m,
        climate,
        ritu,
        rituId,
      };

      setWeather(weatherData);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">ऋतुचर्या (Ritucharya)</h1>
          <p className="text-gray-600">Seasonal Ayurvedic Routine Based on Real-Time Weather</p>
        </div>

        {!submitted ? (
          /* Form Section */
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Select Your Location</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Country Dropdown */}
              <div>
                <label className="block text-gray-700 font-semibold mb-3">
                  <MapPin className="inline mr-2" size={20} />
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Country</option>
                  {countries.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* State Dropdown */}
              {country && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">
                    State / Region
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select State</option>
                    {states.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* City Dropdown */}
              {country && state && (
                <div>
                  <label className="block text-gray-700 font-semibold mb-3">
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 text-gray-900 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select City</option>
                    {cities.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 text-red-700 flex items-start gap-3">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Analyzing Weather...
                  </>
                ) : (
                  <>
                    Get My Ritucharya Plan
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          </div>
        ) : null}

        {/* Weather Data Display */}
        {submitted && weather && (
          <div className="space-y-8">
            {/* Editable Weather Data */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Weather Analysis (Editable)</h2>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setWeather(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
                >
                  <RefreshCw size={18} />
                  Fetch Again
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Temperature Current */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    <Thermometer size={20} className="text-red-500" />
                    Current Temp
                  </label>
                  <input
                    type="number"
                    value={editableTemp}
                    onChange={(e) => {
                      const newTemp = parseFloat(e.target.value);
                      setEditableTemp(newTemp);
                      const climate = detectClimate(newTemp, editableHumidity, editableDescription);
                      const rituId = getClimateRitu(newTemp, editableHumidity, editableDescription);
                      const ritu = detectRitu(newTemp, editableHumidity, editableDescription);
                      setWeather(prev => prev ? {
                        ...prev,
                        temp: newTemp,
                        tempMin: editableTempMin,
                        tempMax: editableTempMax,
                        climate,
                        ritu,
                        rituId
                      } : null);
                    }}
                    className="w-full px-4 py-2 text-2xl font-bold bg-white border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                  <div className="text-xs text-gray-600 mt-2">Today's temp</div>
                </div>

                {/* Temperature Minimum */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    📉 Min Temp
                  </label>
                  <input
                    type="number"
                    value={editableTempMin}
                    onChange={(e) => {
                      const newMin = parseFloat(e.target.value);
                      setEditableTempMin(newMin);
                      const climate = detectClimate(editableTemp, editableHumidity, editableDescription);
                      const rituId = getClimateRitu(editableTemp, editableHumidity, editableDescription);
                      const ritu = detectRitu(editableTemp, editableHumidity, editableDescription);
                      setWeather(prev => prev ? {
                        ...prev,
                        tempMin: newMin,
                        climate,
                        ritu,
                        rituId
                      } : null);
                    }}
                    className="w-full px-4 py-2 text-2xl font-bold bg-white border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                  <div className="text-xs text-gray-600 mt-2">Lowest today</div>
                </div>

                {/* Temperature Maximum */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    📈 Max Temp
                  </label>
                  <input
                    type="number"
                    value={editableTempMax}
                    onChange={(e) => {
                      const newMax = parseFloat(e.target.value);
                      setEditableTempMax(newMax);
                      const climate = detectClimate(editableTemp, editableHumidity, editableDescription);
                      const rituId = getClimateRitu(editableTemp, editableHumidity, editableDescription);
                      const ritu = detectRitu(editableTemp, editableHumidity, editableDescription);
                      setWeather(prev => prev ? {
                        ...prev,
                        tempMax: newMax,
                        climate,
                        ritu,
                        rituId
                      } : null);
                    }}
                    className="w-full px-4 py-2 text-2xl font-bold bg-white border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900"
                  />
                  <div className="text-xs text-gray-600 mt-2">Highest today</div>
                </div>

                {/* Humidity Input */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg border-2 border-cyan-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    <Droplets size={20} className="text-blue-500" />
                    Humidity (%)
                  </label>
                  <input
                    type="number"
                    value={editableHumidity}
                    onChange={(e) => {
                      const newHumidity = parseFloat(e.target.value);
                      setEditableHumidity(newHumidity);
                      const climate = detectClimate(editableTemp, newHumidity, editableDescription);
                      const rituId = getClimateRitu(editableTemp, newHumidity, editableDescription);
                      const ritu = detectRitu(editableTemp, newHumidity, editableDescription);
                      setWeather(prev => prev ? {
                        ...prev,
                        humidity: newHumidity,
                        climate,
                        ritu,
                        rituId
                      } : null);
                    }}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 text-2xl font-bold bg-white border-2 border-cyan-300 rounded-lg focus:outline-none focus:border-cyan-500 text-gray-900"
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    {editableDescription}
                  </div>
                </div>

                {/* Wind Speed Input */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border-2 border-orange-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    💨 Wind Speed
                  </label>
                  <input
                    type="number"
                    value={editableWindSpeed}
                    onChange={(e) => {
                      const newWind = parseFloat(e.target.value);
                      setEditableWindSpeed(newWind);
                      setWeather(prev => prev ? {
                        ...prev,
                        windSpeed: newWind
                      } : null);
                    }}
                    min="0"
                    className="w-full px-4 py-2 text-2xl font-bold bg-white border-2 border-orange-300 rounded-lg focus:outline-none focus:border-orange-500 text-gray-900"
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    {editableWindSpeed > 20 && '🌪️ High Vata'}
                    {editableWindSpeed >= 10 && editableWindSpeed <= 20 && '🌬️ Moderate Vata'}
                    {editableWindSpeed < 10 && '🍃 Low Vata'}
                  </div>
                </div>

                {/* Air Quality Input */}
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border-2 border-red-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    🌫️ Air Quality (AQI)
                  </label>
                  <input
                    type="number"
                    value={editableAQI}
                    onChange={(e) => {
                      const newAQI = parseFloat(e.target.value);
                      setEditableAQI(newAQI);
                      setWeather(prev => prev ? {
                        ...prev,
                        humidity: prev.humidity
                      } : null);
                    }}
                    min="0"
                    max="500"
                    className="w-full px-4 py-2 text-2xl font-bold bg-white border-2 border-red-300 rounded-lg focus:outline-none focus:border-red-500 text-gray-900"
                  />
                  <div className="text-xs text-gray-600 mt-2">
                    {getAQIStatus(editableAQI)}
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border-2 border-purple-200">
                  <label className="flex items-center gap-2 text-gray-700 mb-3 font-semibold text-sm">
                    <Wind size={20} className="text-purple-500" />
                    Description
                  </label>
                  <input
                    type="text"
                    value={editableDescription}
                    onChange={(e) => {
                      setEditableDescription(e.target.value);
                      const climate = detectClimate(editableTemp, editableHumidity, e.target.value);
                      const rituId = getClimateRitu(editableTemp, editableHumidity, e.target.value);
                      const ritu = detectRitu(editableTemp, editableHumidity, e.target.value);
                      setWeather(prev => prev ? {
                        ...prev,
                        description: e.target.value,
                        climate,
                        ritu,
                        rituId
                      } : null);
                    }}
                    placeholder="Cloudy, Rainy"
                    className="w-full px-4 py-2 font-semibold bg-white border-2 border-purple-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900 text-sm"
                  />
                  <div className="text-xs text-gray-600 mt-2">Clear, Cloudy, Rainy</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border-2 border-green-200">
                  <div className="text-gray-700 font-semibold mb-3 text-sm">Climate Type</div>
                  <div className="text-2xl font-bold text-green-700">
                    {weather.climate}
                  </div>
                  <div className="text-xs text-gray-600 mt-2">Auto-calculated</div>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={() => {
                  const now = new Date();
                  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

                  localStorage.setItem('ritucharya_weather_analysis', JSON.stringify({
                    temp: editableTemp,
                    tempMin: editableTempMin,
                    tempMax: editableTempMax,
                    humidity: editableHumidity,
                    windSpeed: editableWindSpeed,
                    aqi: editableAQI,
                    description: editableDescription,
                    climate: weather.climate,
                    ritu: weather.ritu,
                    rituId: weather.rituId,
                    savedAt: now.toISOString(),
                    expiresAt: expiresAt.toISOString()
                  }));
                  alert('✅ Weather data saved successfully!\n\n📅 Valid for 30 days (Until ' + expiresAt.toLocaleDateString() + ')');
                }}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Weather Analysis (30 Days)
              </button>
            </div>

            {/* Detected Season */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-green-500">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">
                Detected Season (Ritu)
              </h2>
              <div className="text-center py-8 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border-2 border-green-300 mb-6">
                <div className="text-4xl font-bold text-green-700 mb-3">
                  {weather.ritu}
                </div>
                <p className="text-gray-600">
                  Based on current temperature, humidity, and climate conditions
                </p>
              </div>

              {/* Next Button */}
              <a
                href="/admin/crm/planner-dashboard/ritucharya/dashboard"
                className="block w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                Next: View Season Dashboard
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Next Steps */}
            <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-blue-500">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Next Steps</h2>
              <div className="space-y-3">
                <p className="text-gray-700">
                  ✅ Your location and seasonal information has been saved.
                </p>
                <p className="text-gray-700">
                  👉 Visit the <strong>Today's Recommendations</strong> page to plan your daily meals based on this Ritu.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  Change Location
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
