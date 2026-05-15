'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Loader, ArrowRight, Droplets, Wind, Thermometer, RefreshCw } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
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

export default function RitucharyaPage() {
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
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
    setWeatherData(null);

    try {
      // Get coordinates
      const selectedCountry = locationData.find(c => c.name === country);
      const selectedState = selectedCountry?.states.find(s => s.name === state);
      const selectedCity = selectedState?.cities.find(c => c.name === city);

      if (!selectedCity) {
        throw new Error('City coordinates not found');
      }

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

      const weather: WeatherData = {
        temp: Math.round(current.temperature_2m),
        tempMin: Math.round(current.temperature_2m - 2),
        tempMax: Math.round(current.temperature_2m + 2),
        humidity: current.relative_humidity_2m,
        description,
        windSpeed: current.wind_speed_10m,
        climate,
        ritu,
        rituId
      };

      setWeatherData(weather);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navigation />
      <main style={{ backgroundColor: '#000000', color: '#FFFFFF' }} className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#00FF00' }}>
              ऋतुचर्या (Ritucharya)
            </h1>
            <p className="text-lg" style={{ color: '#FFFFFF' }}>
              Seasonal Ayurvedic Routine Based on Real-Time Weather
            </p>
          </div>

          {!submitted ? (
            /* Form Section */
            <div className="rounded-lg p-8 mb-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
                Select Your Location
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Country Dropdown */}
                <div>
                  <label className="block font-semibold mb-3" style={{ color: '#FFFFFF' }}>
                    <MapPin className="inline mr-2" size={20} />
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg focus:outline-none"
                    style={{ backgroundColor: '#1a1a1a', borderWidth: '2px', borderColor: '#FFFF00', color: '#FFFFFF' }}
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
                    <label className="block font-semibold mb-3" style={{ color: '#FFFFFF' }}>
                      State / Region
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg focus:outline-none"
                      style={{ backgroundColor: '#1a1a1a', borderWidth: '2px', borderColor: '#FFFF00', color: '#FFFFFF' }}
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
                    <label className="block font-semibold mb-3" style={{ color: '#FFFFFF' }}>
                      City
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg focus:outline-none"
                      style={{ backgroundColor: '#1a1a1a', borderWidth: '2px', borderColor: '#FFFF00', color: '#FFFFFF' }}
                    >
                      <option value="">Select City</option>
                      {cities.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {error && (
                  <div className="p-4" style={{ backgroundColor: 'rgba(192, 0, 0, 0.2)', borderLeft: '4px solid #C00000', color: '#FF6B6B' }}>
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  style={{ backgroundColor: loading ? '#666666' : '#00FF00', color: '#000000' }}
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
          {submitted && weatherData && (
            <div className="space-y-8">
              {/* Editable Weather */}
              <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold" style={{ color: '#00FF00' }}>
                    Weather Analysis (Editable)
                  </h2>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setWeatherData(null);
                    }}
                    className="flex items-center gap-2 font-bold py-2 px-4 rounded-lg transition-colors"
                    style={{ border: '2px solid #FFFF00', color: '#FFFF00', backgroundColor: 'transparent' }}
                  >
                    <RefreshCw size={18} />
                    Fetch Again
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                  {/* Temperature Current */}
                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
                      <Thermometer size={16} className="text-red-400" />
                      <span>Current Temp</span>
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
                        setWeatherData(prev => prev ? {
                          ...prev,
                          temp: newTemp,
                          tempMin: editableTempMin,
                          tempMax: editableTempMax,
                          climate,
                          ritu,
                          rituId
                        } : null);
                      }}
                      className="w-full text-2xl font-bold p-2 rounded" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>Today's temp</div>
                  </div>

                  {/* Temperature Minimum */}
                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
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
                        setWeatherData(prev => prev ? {
                          ...prev,
                          tempMin: newMin,
                          climate,
                          ritu,
                          rituId
                        } : null);
                      }}
                      className="w-full text-2xl font-bold p-2 rounded" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>Lowest today</div>
                  </div>

                  {/* Temperature Maximum */}
                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
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
                        setWeatherData(prev => prev ? {
                          ...prev,
                          tempMax: newMax,
                          climate,
                          ritu,
                          rituId
                        } : null);
                      }}
                      className="w-full text-2xl font-bold p-2 rounded" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>Highest today</div>
                  </div>

                  {/* Humidity Input */}
                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
                      <Droplets size={16} className="text-blue-400" />
                      <span>Humidity</span>
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
                        setWeatherData(prev => prev ? {
                          ...prev,
                          humidity: newHumidity,
                          climate,
                          ritu,
                          rituId
                        } : null);
                      }}
                      min="0"
                      max="100"
                      className="w-full text-2xl font-bold p-2 rounded" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>
                      {editableDescription}
                    </div>
                  </div>

                  {/* Wind Speed Input */}
                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
                      💨 Wind Speed
                    </label>
                    <input
                      type="number"
                      value={editableWindSpeed}
                      onChange={(e) => {
                        const newWind = parseFloat(e.target.value);
                        setEditableWindSpeed(newWind);
                        setWeatherData(prev => prev ? {
                          ...prev,
                          windSpeed: newWind
                        } : null);
                      }}
                      min="0"
                      className="w-full text-2xl font-bold p-2 rounded" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>
                      {editableWindSpeed > 20 && '🌪️ High Vata'}
                      {editableWindSpeed >= 10 && editableWindSpeed <= 20 && '🌬️ Moderate Vata'}
                      {editableWindSpeed < 10 && '🍃 Low Vata'}
                    </div>
                  </div>

                  {/* Air Quality Input */}
                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
                      🌫️ Air Quality
                    </label>
                    <input
                      type="number"
                      value={editableAQI}
                      onChange={(e) => {
                        const newAQI = parseFloat(e.target.value);
                        setEditableAQI(newAQI);
                        setWeatherData(prev => prev ? {
                          ...prev,
                          humidity: prev.humidity
                        } : null);
                      }}
                      min="0"
                      max="500"
                      className="w-full text-2xl font-bold p-2 rounded" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>
                      {getAQIStatus(editableAQI)}
                    </div>
                  </div>

                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #FFFF00' }}>
                    <label className="flex items-center gap-2 mb-2 text-xs" style={{ color: '#CCCCCC' }}>
                      <Wind size={16} className="text-cyan-400" />
                      <span>Description</span>
                    </label>
                    <input
                      type="text"
                      value={editableDescription}
                      onChange={(e) => {
                        setEditableDescription(e.target.value);
                        const climate = detectClimate(editableTemp, editableHumidity, e.target.value);
                        const rituId = getClimateRitu(editableTemp, editableHumidity, e.target.value);
                        const ritu = detectRitu(editableTemp, editableHumidity, e.target.value);
                        setWeatherData(prev => prev ? {
                          ...prev,
                          description: e.target.value,
                          climate,
                          ritu,
                          rituId
                        } : null);
                      }}
                      placeholder="Cloudy, Rainy"
                      className="w-full font-semibold p-2 rounded text-sm" style={{ backgroundColor: '#1a1a1a', borderLeft: '2px solid #FFFF00', color: '#FFFFFF' }}
                    />
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>Clear, Cloudy, Rainy</div>
                  </div>

                  <div className="p-4" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', borderLeft: '4px solid #00FF00' }}>
                    <div style={{ color: '#CCCCCC' }} className="mb-2 text-xs">Climate Type</div>
                    <div className="text-2xl font-bold text-green-400">
                      {weatherData.climate}
                    </div>
                    <div className="text-xs mt-2" style={{ color: '#AAAAAA' }}>Auto-calculated</div>
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
                      climate: weatherData.climate,
                      ritu: weatherData.ritu,
                      rituId: weatherData.rituId,
                      savedAt: now.toISOString(),
                      expiresAt: expiresAt.toISOString()
                    }));
                    alert('✅ Weather data saved successfully!\n\n📅 Valid for 30 days (Until ' + expiresAt.toLocaleDateString() + ')');
                  }}
                  className="w-full mt-6 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
                  style={{ backgroundColor: '#00FF00', color: '#000000' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Weather Analysis (30 Days)
                </button>
              </div>

              {/* Detected Season */}
              <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <h2 className="text-2xl font-bold mb-4" style={{ color: '#00FF00' }}>
                  Detected Season (Ritu)
                </h2>
                <div className="text-center py-8 rounded-lg" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', border: '2px solid #FFFF00' }}>
                  <div className="text-4xl font-bold mb-2" style={{ color: '#FFFF00' }}>
                    {weatherData.ritu}
                  </div>
                  <p className="text-gray-300">
                    Based on current temperature, humidity, and climate conditions
                  </p>
                </div>
              </div>

              {/* Seasonal Details */}
              {weatherData && (() => {
                const seasonData = getRituBySeason(weatherData.rituId);
                if (!seasonData) return null;

                return (
                  <>
                    {/* Dosha Balance */}
                    <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
                        दोष संतुलन (Dosha Balance)
                      </h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', borderLeft: '4px solid #FF6B6B' }}>
                          <div className="font-bold mb-2" style={{ color: '#FF6B6B' }}>💨 वात (Vata)</div>
                          <div className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>{seasonData.doshas.vata}%</div>
                          <div className="w-full h-2 rounded-lg" style={{ backgroundColor: '#333' }}>
                            <div className="h-full rounded-lg" style={{ width: `${seasonData.doshas.vata}%`, backgroundColor: '#FF6B6B' }}></div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 165, 0, 0.2)', borderLeft: '4px solid #FFA500' }}>
                          <div className="font-bold mb-2" style={{ color: '#FFA500' }}>🔥 पित्त (Pitta)</div>
                          <div className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>{seasonData.doshas.pitta}%</div>
                          <div className="w-full h-2 rounded-lg" style={{ backgroundColor: '#333' }}>
                            <div className="h-full rounded-lg" style={{ width: `${seasonData.doshas.pitta}%`, backgroundColor: '#FFA500' }}></div>
                          </div>
                        </div>
                        <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(78, 205, 196, 0.2)', borderLeft: '4px solid #4ECDC4' }}>
                          <div className="font-bold mb-2" style={{ color: '#4ECDC4' }}>💧 कफ (Kapha)</div>
                          <div className="text-2xl font-bold mb-2" style={{ color: '#FFFFFF' }}>{seasonData.doshas.kapha}%</div>
                          <div className="w-full h-2 rounded-lg" style={{ backgroundColor: '#333' }}>
                            <div className="h-full rounded-lg" style={{ width: `${seasonData.doshas.kapha}%`, backgroundColor: '#4ECDC4' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tastes to Eat */}
                    <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
                        ✅ सेवन के लिए अनुकूल रस (Tastes to Eat)
                      </h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        {seasonData.tastesToEat.map((taste, idx) => (
                          <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', border: '2px solid #4CAF50' }}>
                            <div className="font-bold mb-2" style={{ color: '#4CAF50' }}>{taste.nameHi}</div>
                            <div style={{ color: '#AAAAAA' }}>{taste.nameEn}</div>
                            <div className="text-sm mt-2" style={{ color: '#FFFFFF' }}>उदाहरण: {taste.examples}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tastes to Avoid */}
                    <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
                        ❌ बचाव के लिए (Tastes to Avoid)
                      </h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        {seasonData.tastesToAvoid.map((taste, idx) => (
                          <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(192, 0, 0, 0.2)', border: '2px solid #C00000' }}>
                            <div className="font-bold mb-2" style={{ color: '#C00000' }}>{taste.nameHi}</div>
                            <div style={{ color: '#AAAAAA' }}>{taste.nameEn}</div>
                            <div className="text-sm mt-2" style={{ color: '#FFFFFF' }}>उदाहरण: {taste.examples}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Health Tips */}
                    <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
                        💡 स्वास्थ्य सुझाव (Health Tips)
                      </h2>
                      <ul className="space-y-2">
                        {seasonData.healthTips.map((tip, idx) => (
                          <li key={idx} className="flex gap-3 p-2">
                            <span style={{ color: '#00FF00' }}>✓</span>
                            <span style={{ color: '#FFFFFF' }}>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 24-Hour Time Cycle */}
                    <div className="rounded-lg p-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
                        ⏰ दिन का समय चक्र (Daily Time Cycle)
                      </h2>
                      <div className="grid md:grid-cols-2 gap-4">
                        {seasonData.timeCycle.map((cycle, idx) => (
                          <div key={idx} className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(26, 26, 26, 0.5)', border: '2px solid #FFFF00' }}>
                            <div className="font-bold mb-2" style={{ color: '#FFFF00' }}>{cycle.timeHi}</div>
                            <div className="text-sm space-y-1">
                              <div><span style={{ color: '#AAAAAA' }}>दोष:</span> <span style={{ color: '#FFFFFF' }}>{cycle.dosha}</span></div>
                              <div><span style={{ color: '#AAAAAA' }}>प्रभाव:</span> <span style={{ color: '#FFFFFF' }}>{cycle.effect}</span></div>
                              <div><span style={{ color: '#AAAAAA' }}>सुझाव:</span> <span style={{ color: '#FFFFFF' }}>{cycle.advice}</span></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Change Location Button */}
                    <div className="text-center">
                      <button
                        onClick={() => setSubmitted(false)}
                        className="font-bold py-3 px-8 rounded-lg transition-colors"
                        style={{ backgroundColor: '#00FF00', color: '#000000' }}
                      >
                        Change Location
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
