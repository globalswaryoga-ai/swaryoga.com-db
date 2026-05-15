'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Loader, Plus, X, Save, Trash2, Calendar, AlertCircle, Zap } from 'lucide-react';
import { locationData } from '@/lib/locationData';
import { getClimateRitu, getRituBySeason } from '@/lib/ritucharya/seasons';
import { foodDatabase, searchFood, RASAS } from '@/lib/ritucharya/foodDatabase';
import { analyzeWeatherAndRecommendRasas, getSeasonalDetails } from '@/lib/ritucharya/seasonalAnalysis';

interface MealInput {
  foodNames: string[];
  notes: string;
  suggestions: string[];
}

export default function CRMRitucharyaTodayPage() {
  const [location, setLocation] = useState({ country: '', state: '', city: '' });
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const [meals, setMeals] = useState({
    gond_pani_4am: { foodNames: [] as string[], notes: '', suggestions: [] as string[] },
    herbal_drink_6am: { foodNames: [] as string[], notes: '', suggestions: [] as string[] },
    breakfast_830_930: { foodNames: [] as string[], notes: '', suggestions: [] as string[] },
    lunch_1130: { foodNames: [] as string[], notes: '', suggestions: [] as string[] },
    dinner_7pm: { foodNames: [] as string[], notes: '', suggestions: [] as string[] },
    before_sleep: { foodNames: [] as string[], notes: '', suggestions: [] as string[] },
  });

  const [searchInputs, setSearchInputs] = useState({
    gond_pani_4am: '',
    herbal_drink_6am: '',
    breakfast_830_930: '',
    lunch_1130: '',
    dinner_7pm: '',
    before_sleep: '',
  });

  const [rasaBreakdown, setRasaBreakdown] = useState({
    sweet: 0,
    sour: 0,
    salty: 0,
    pungent: 0,
    bitter: 0,
    astringent: 0,
  });

  const [recipes, setRecipes] = useState<any[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  // Get today's date
  const today = new Date().toISOString().split('T')[0];

  // Fetch weather based on location from localStorage
  useEffect(() => {
    const storedLocation = localStorage.getItem('ritucharya_location');
    const storedWeather = localStorage.getItem('ritucharya_weather');

    if (storedLocation) {
      const parsed = JSON.parse(storedLocation);
      setLocation(parsed);

      // If admin has edited weather data in manage form, use that instead of API
      if (storedWeather) {
        const parsedWeather = JSON.parse(storedWeather);
        loadSavedWeatherData(parsed, parsedWeather);
      } else {
        fetchWeatherData(parsed);
      }
    }
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      setRecipesLoading(true);
      const response = await fetch('/api/ritucharya/recipes?published=true');
      const data = await response.json();
      if (data.success) {
        setRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadSavedWeatherData = (loc: any, savedWeather: any) => {
    try {
      setLoading(true);
      const selectedCountry = locationData.find(c => c.name === loc.country);
      const selectedState = selectedCountry?.states.find(s => s.name === loc.state);
      const selectedCity = selectedState?.cities.find(c => c.name === loc.city);

      if (!selectedCity) throw new Error('City not found');

      // Use saved weather data from manage form
      const weatherData = {
        temp: savedWeather.currentTemp || 28,
        tempMin: savedWeather.minTemp || 24,
        tempMax: savedWeather.maxTemp || 35,
        humidity: savedWeather.humidity || 61,
        windSpeed: savedWeather.windSpeed || 10,
        airQuality: savedWeather.airQuality || 50,
        description: savedWeather.description || 'Partly cloudy',
        climate: savedWeather.climateType || 'Moderate',
        ritu: getRituBySeason(getClimateRitu(savedWeather.currentTemp, savedWeather.humidity, savedWeather.description))?.nameHi || 'Unknown',
        rituId: getClimateRitu(savedWeather.currentTemp, savedWeather.humidity, savedWeather.description),
        lat: selectedCity.latitude,
        lon: selectedCity.longitude,
      };

      setWeather(weatherData);

      // Analyze and get taste recommendations
      const tasteAnalysis = analyzeWeatherAndRecommendRasas(
        weatherData.temp,
        weatherData.humidity,
        weatherData.windSpeed || 0,
        0,
        weatherData.rituId
      );
      setAnalysis(tasteAnalysis);

      setInitialized(true);
    } catch (error) {
      console.error('Error loading saved weather:', error);
      // Fallback to API fetch if something goes wrong
      fetchWeatherData(loc);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherData = async (loc: any) => {
    try {
      setLoading(true);
      const selectedCountry = locationData.find(c => c.name === loc.country);
      const selectedState = selectedCountry?.states.find(s => s.name === loc.state);
      const selectedCity = selectedState?.cities.find(c => c.name === loc.city);

      if (!selectedCity) throw new Error('City not found');

      // Use Open-Meteo (free, no API key needed)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.latitude}&longitude=${selectedCity.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=celsius`
      );

      if (!response.ok) throw new Error('Weather API error');

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

      const description = getWeatherDescription(current.weather_code);
      const climate = detectClimate(current.temperature_2m, current.relative_humidity_2m, description);
      const rituId = getClimateRitu(current.temperature_2m, current.relative_humidity_2m, description);

      const weatherData = {
        temp: Math.round(current.temperature_2m),
        tempMin: Math.round(current.temperature_2m - 2),
        tempMax: Math.round(current.temperature_2m + 2),
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        climate,
        ritu: getRituBySeason(rituId)?.nameHi || 'Unknown',
        rituId,
        lat: selectedCity.latitude,
        lon: selectedCity.longitude,
      };

      setWeather(weatherData);

      // Analyze and get taste recommendations
      const tasteAnalysis = analyzeWeatherAndRecommendRasas(
        weatherData.temp,
        weatherData.humidity,
        weatherData.windSpeed || 0,
        0,
        rituId
      );
      setAnalysis(tasteAnalysis);

      setInitialized(true);
    } catch (error) {
      console.error('Error fetching weather:', error);
    } finally {
      setLoading(false);
    }
  };

  const detectClimate = (temp: number, humidity: number, description: string): string => {
    if (temp > 32) return 'Hot';
    if (temp < 10) return 'Cold';
    if (humidity > 75 && description.toLowerCase().includes('rain')) return 'Heavy Rainy';
    if (humidity > 60 && description.toLowerCase().includes('rain')) return 'Rainy';
    if (humidity < 40) return 'Dry';
    return 'Moderate';
  };

  const handleFoodSearch = (mealType: string, query: string) => {
    setSearchInputs(prev => ({ ...prev, [mealType]: query }));
    const results = searchFood(query);
    const suggestions = results.map(f => f.nameEn).slice(0, 5);
    setMeals(prev => ({
      ...prev,
      [mealType]: { ...prev[mealType as keyof typeof meals], suggestions }
    }));
  };

  const addFoodItem = (mealType: string, foodName: string) => {
    setMeals(prev => {
      const meal = prev[mealType as keyof typeof meals];
      return {
        ...prev,
        [mealType]: {
          ...meal,
          foodNames: [...meal.foodNames, foodName],
          suggestions: []
        }
      };
    });
    setSearchInputs(prev => ({ ...prev, [mealType]: '' }));
    calculateRasaBreakdown();
  };

  const removeFoodItem = (mealType: string, index: number) => {
    setMeals(prev => {
      const meal = prev[mealType as keyof typeof meals];
      return {
        ...prev,
        [mealType]: {
          ...meal,
          foodNames: meal.foodNames.filter((_, i) => i !== index)
        }
      };
    });
    calculateRasaBreakdown();
  };

  const calculateRasaBreakdown = () => {
    const rasaCounts = {
      sweet: 0,
      sour: 0,
      salty: 0,
      pungent: 0,
      bitter: 0,
      astringent: 0,
    };

    let totalCount = 0;

    Object.values(meals).forEach(meal => {
      meal.foodNames.forEach(foodName => {
        const food = foodDatabase.find(f => f.nameEn === foodName);
        if (food) {
          const rasaKey = food.primaryRasa.toLowerCase() as keyof typeof rasaCounts;
          rasaCounts[rasaKey]++;
          totalCount++;
        }
      });
    });

    if (totalCount > 0) {
      setRasaBreakdown({
        sweet: Math.round((rasaCounts.sweet / totalCount) * 100),
        sour: Math.round((rasaCounts.sour / totalCount) * 100),
        salty: Math.round((rasaCounts.salty / totalCount) * 100),
        pungent: Math.round((rasaCounts.pungent / totalCount) * 100),
        bitter: Math.round((rasaCounts.bitter / totalCount) * 100),
        astringent: Math.round((rasaCounts.astringent / totalCount) * 100),
      });
    }
  };

  const saveTodaysPlan = async () => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/ritucharya/daily-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          location,
          weather,
          meals,
          rasaBreakdown,
        }),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      setSaveStatus('idle');
    }
  };

  const clearAll = () => {
    setMeals({
      gond_pani_4am: { foodNames: [], notes: '', suggestions: [] },
      herbal_drink_6am: { foodNames: [], notes: '', suggestions: [] },
      breakfast_830_930: { foodNames: [], notes: '', suggestions: [] },
      lunch_1130: { foodNames: [], notes: '', suggestions: [] },
      dinner_7pm: { foodNames: [], notes: '', suggestions: [] },
      before_sleep: { foodNames: [], notes: '', suggestions: [] },
    });
    setRasaBreakdown({
      sweet: 0,
      sour: 0,
      salty: 0,
      pungent: 0,
      bitter: 0,
      astringent: 0,
    });
  };

  const mealSlots = [
    { id: 'gond_pani_4am', timeHi: '4:00 AM', timeEn: 'Gond Pani', category: 'drink' },
    { id: 'herbal_drink_6am', timeHi: '6:00 AM', timeEn: 'Herbal Drink', category: 'herbal' },
    { id: 'breakfast_830_930', timeHi: '8:30-9:30 AM', timeEn: 'Breakfast', category: 'breakfast' },
    { id: 'lunch_1130', timeHi: '11:30 AM', timeEn: 'Lunch', category: 'lunch' },
    { id: 'dinner_7pm', timeHi: '7:00 PM', timeEn: 'Dinner', category: 'dinner' },
    { id: 'before_sleep', timeHi: 'Before Sleep', timeEn: 'Night Drink', category: 'drink' },
  ];

  if (!initialized && loading) {
    return (
      <main className="min-h-screen pt-24 pb-16 flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-blue-600" size={40} />
          <p className="text-gray-700">Loading today's data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-gray-900">
            आज की सिफारिशें (Today's Recommendations)
          </h1>
          <p className="text-gray-600">{today}</p>
        </div>

        {!location.city && (
          <div className="mb-8 p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-50 flex items-start gap-3">
            <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
            <div className="text-yellow-800">
              <p className="font-semibold">Location Not Selected</p>
              <p className="text-sm">Please go to the Ritucharya form page and select your location first.</p>
            </div>
          </div>
        )}

        {/* Weather & Ritu Summary */}
        {weather && (
          <div className="space-y-4 mb-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-6 rounded-lg border-2 border-blue-500 bg-blue-50">
                <h3 className="font-bold mb-3 text-gray-900 flex items-center gap-2">
                  <span>🌡️</span> Today's Weather
                </h3>
                <div className="space-y-2 text-gray-700 text-sm">
                  <div><strong>Temperature:</strong> {weather.temp}°C ({weather.tempMin}°-{weather.tempMax}°)</div>
                  <div><strong>Humidity:</strong> {weather.humidity}%</div>
                  <div><strong>Wind Speed:</strong> {weather.windSpeed} km/h</div>
                  <div><strong>Air Quality (AQI):</strong> {weather.airQuality}</div>
                  <div><strong>Description:</strong> {weather.description}</div>
                  <div><strong>Climate:</strong> {weather.climate}</div>
                </div>
              </div>
              <div className="p-6 rounded-lg border-2 border-green-500 bg-green-50">
                <h3 className="font-bold mb-3 text-gray-900 flex items-center gap-2">
                  <span>🌸</span> Today's Ritu
                </h3>
                <div className="text-2xl font-bold text-green-700">{weather.ritu}</div>
                <p className="text-gray-600 mt-2 text-sm">Adjust diet based on this season</p>
              </div>
            </div>

            {/* Seasonal Analysis & Nature Realities */}
            {analysis && (
              <div className="p-6 rounded-lg border-2 border-purple-500 bg-purple-50">
                <h3 className="font-bold mb-4 text-gray-900 flex items-center gap-2">
                  <Zap size={20} className="text-purple-600" /> Season's Nature & Characteristics
                </h3>

                {/* Nature Phenomena */}
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-3 text-sm">🌿 Natural Phenomena:</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.naturalPhenomena.map((phenomenon: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-purple-200 text-gray-800 text-sm font-medium"
                        style={{ fontFamily: phenomenon.match(/[^\x00-\x7F]/) ? "'Noto Sans Devanagari', serif" : 'inherit' }}
                      >
                        {phenomenon}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Dosha Imbalance Info */}
                <div className="mb-6 p-4 rounded-lg bg-white border-2 border-purple-300">
                  <h4 className="font-semibold text-gray-800 mb-3">⚡ Dosha Status This Season:</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-red-50 border-l-4 border-red-500">
                      <div className="font-bold text-red-700">💨 Vata (वात)</div>
                      <div className="text-sm text-gray-700 mt-1">{analysis.seasonalData.doshaImbalance.vata}% Aggravated</div>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-50 border-l-4 border-orange-500">
                      <div className="font-bold text-orange-700">🔥 Pitta (पित्त)</div>
                      <div className="text-sm text-gray-700 mt-1">{analysis.seasonalData.doshaImbalance.pitta}% Aggravated</div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500">
                      <div className="font-bold text-blue-700">💧 Kapha (कफ)</div>
                      <div className="text-sm text-gray-700 mt-1">{analysis.seasonalData.doshaImbalance.kapha}% Aggravated</div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Meal Slots - Compact Cards */}
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .meal-card {
            animation: slideUp 0.3s ease-out;
          }
          .meal-card:hover {
            box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
            transform: translateY(-2px);
            transition: all 0.3s ease;
          }
        `}</style>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {mealSlots.map((slot, idx) => (
            <div
              key={slot.id}
              className="meal-card p-3 rounded-xl bg-gradient-to-br from-blue-50 to-white border-2 border-blue-300 shadow-md hover:shadow-lg transition-all duration-300"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              {/* Icon + Time */}
              <div className="text-center mb-2">
                <div className="text-2xl mb-1">
                  {slot.timeHi.includes('4:00') && '🌙'}
                  {slot.timeHi.includes('6:00') && '🌄'}
                  {slot.timeHi.includes('8:30') && '🍳'}
                  {slot.timeHi.includes('11:30') && '🍽️'}
                  {slot.timeHi.includes('7:00') && '🌆'}
                  {slot.timeHi.includes('Before') && '🌛'}
                </div>
                <h4 className="text-xs font-bold text-gray-900">{slot.timeHi.split(' ')[0]}</h4>
                <p className="text-xs text-gray-600">{slot.timeEn}</p>
              </div>

              {/* Food Items - Small Pills */}
              {meals[slot.id as keyof typeof meals].foodNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 pb-2 border-b border-blue-200">
                  {meals[slot.id as keyof typeof meals].foodNames.map((food, idx) => (
                    <div key={idx} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-500 group hover:bg-green-200 transition-colors">
                      <span className="text-xs text-gray-900 font-medium">✓ {food.slice(0, 6)}</span>
                      <button
                        onClick={() => removeFoodItem(slot.id, idx)}
                        className="opacity-0 group-hover:opacity-100 text-red-600 transition-opacity"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Quick Input */}
              <input
                type="text"
                placeholder="Add..."
                value={searchInputs[slot.id as keyof typeof searchInputs]}
                onChange={(e) => handleFoodSearch(slot.id, e.target.value)}
                className="w-full px-2 py-1 text-xs rounded-lg border-2 border-blue-300 focus:outline-none focus:border-blue-500 bg-white text-gray-900"
              />

              {/* Suggestions Dropdown */}
              {meals[slot.id as keyof typeof meals].suggestions.length > 0 && (
                <div className="absolute mt-1 w-40 space-y-1 max-h-32 overflow-y-auto rounded-lg bg-blue-50 p-1 border border-blue-200 shadow-lg z-50">
                  {meals[slot.id as keyof typeof meals].suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => addFoodItem(slot.id, suggestion)}
                      className="block w-full text-left px-2 py-1 text-xs rounded bg-white hover:bg-blue-100 text-gray-900 transition-colors"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recommended Rasas Section - 2x3 Grid */}
        {analysis && (
          <div className="mb-8 p-4 rounded-lg border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50">
            <h2 className="text-lg font-bold mb-4 text-gray-900">🎯 Recommended Rasas for {weather?.ritu}</h2>
            <div className="grid grid-cols-3 gap-3">
              {/* Top Row - Use These Tastes */}
              {analysis.recommendedRasas.map((rasa, idx) => {
                const rasaKey = rasa.includes('(Sweet)') ? 'sweet' : rasa.includes('(Sour)') ? 'sour' : rasa.includes('(Salty)') ? 'salty' : rasa.includes('(Pungent)') ? 'pungent' : rasa.includes('(Bitter)') ? 'bitter' : 'astringent';
                const targetPercentage = analysis.seasonalData.recommendedPercentages[rasaKey as keyof typeof analysis.seasonalData.recommendedPercentages] || 0;
                return (
                  <div key={`use-${idx}`} className="p-4 rounded-lg bg-white border-2 border-green-500 text-center hover:shadow-lg transition-shadow">
                    <p className="font-bold text-green-700 text-sm" style={{ fontFamily: "'Noto Sans Devanagari', serif" }}>
                      {rasa}
                    </p>
                    <p className="text-lg font-bold text-gray-900 mt-2">{targetPercentage}%</p>
                    <p className="text-xs text-gray-600 mt-1">← Use This</p>
                  </div>
                );
              })}
              {/* Bottom Row - Avoid These Tastes */}
              {analysis.avoidRasas.map((rasa, idx) => (
                <div key={`avoid-${idx}`} className="p-4 rounded-lg bg-white border-2 border-red-500 text-center hover:shadow-lg transition-shadow">
                  <p className="font-bold text-red-700 text-sm" style={{ fontFamily: "'Noto Sans Devanagari', serif" }}>
                    {rasa}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">⚠️ Avoid</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Foods Display */}
        {Object.values(meals).some(meal => meal.foodNames.length > 0) && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">📋 Today's Meal Plan</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealSlots.map((slot) => {
                const mealData = meals[slot.id as keyof typeof meals];
                if (mealData.foodNames.length === 0) return null;

                return (
                  <div
                    key={slot.id}
                    className="p-5 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-400 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">
                        {slot.timeHi.includes('4:00') && '🌙'}
                        {slot.timeHi.includes('6:00') && '🌄'}
                        {slot.timeHi.includes('8:30') && '🍳'}
                        {slot.timeHi.includes('11:30') && '🍽️'}
                        {slot.timeHi.includes('7:00') && '🌆'}
                        {slot.timeHi.includes('Before') && '🌛'}
                      </span>
                      <div>
                        <h3 className="font-bold text-gray-900">{slot.timeEn}</h3>
                        <p className="text-xs text-gray-600">{slot.timeHi}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {mealData.foodNames.map((food, idx) => {
                        const foodData = foodDatabase.find(f => f.nameEn === food);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border-l-4 border-green-500">
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{food}</p>
                              {foodData && (
                                <p className="text-xs text-gray-600">
                                  Taste: <span className="font-medium text-green-700">{foodData.primaryRasaHi}</span>
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeFoodItem(slot.id, idx)}
                              className="text-red-500 hover:text-red-700 font-bold hover:scale-110 transition-transform"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {mealData.notes && (
                      <div className="mt-3 pt-3 border-t-2 border-green-200">
                        <p className="text-xs text-gray-700">
                          <span className="font-semibold">Note:</span> {mealData.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Recipe Suggestions Modal */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white max-w-3xl w-full rounded-lg p-8 border-2 border-blue-500 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setSelectedRecipe(null)}
                className="float-right font-bold text-2xl text-blue-600 hover:text-blue-800"
              >
                ×
              </button>

              <h2 className="text-3xl font-bold mb-4 text-gray-900">
                {selectedRecipe.name} ({selectedRecipe.nameHi})
              </h2>

              {/* Recipe Images */}
              {selectedRecipe.images && selectedRecipe.images.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold mb-3 text-gray-900">📸 Images</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRecipe.images.map((img: any, idx: number) => (
                      <div key={idx}>
                        <img src={img.url} alt={img.caption || `Recipe ${idx + 1}`} className="w-full h-40 object-cover rounded-lg" />
                        {img.caption && <p className="text-gray-600 text-sm mt-2">{img.caption}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video */}
              {selectedRecipe.videoUrl && (
                <div className="mb-6">
                  <h3 className="font-bold mb-3 text-gray-900">🎥 Video</h3>
                  <video width="100%" height="300" controls className="rounded-lg bg-gray-100">
                    <source src={selectedRecipe.videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* Recipe Details */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-300">
                  <div className="text-gray-600 text-sm">Servings</div>
                  <div className="text-gray-900 font-bold">{selectedRecipe.servings}</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-300">
                  <div className="text-gray-600 text-sm">Prep Time</div>
                  <div className="text-gray-900 font-bold">{selectedRecipe.prepTime} min</div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-300">
                  <div className="text-gray-600 text-sm">Cook Time</div>
                  <div className="text-gray-900 font-bold">{selectedRecipe.cookTime} min</div>
                </div>
              </div>

              {/* Ingredients */}
              {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold mb-3 text-gray-900">Ingredients</h3>
                  <ul className="space-y-2 text-gray-700">
                    {selectedRecipe.ingredients.map((ing: any, idx: number) => (
                      <li key={idx} className="flex justify-between">
                        <span>{ing.name}</span>
                        <span className="text-gray-600">{ing.quantity} {ing.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Instructions */}
              {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold mb-3 text-gray-900">Instructions</h3>
                  <ol className="space-y-2 list-decimal list-inside text-gray-700">
                    {selectedRecipe.instructions.map((inst: string, idx: number) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* PDF Download */}
              {selectedRecipe.pdfUrl && (
                <div className="mb-6">
                  <a
                    href={selectedRecipe.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-bold py-2 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                  >
                    📄 Download PDF Recipe
                  </a>
                </div>
              )}

              {/* Dosha Impact */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-blue-50 border border-blue-300">
                <div>
                  <div className="text-red-600 font-bold">💨 Vata</div>
                  <div className="text-gray-600 text-sm">{selectedRecipe.doshaImpact.vata}</div>
                </div>
                <div>
                  <div className="text-orange-600 font-bold">🔥 Pitta</div>
                  <div className="text-gray-600 text-sm">{selectedRecipe.doshaImpact.pitta}</div>
                </div>
                <div>
                  <div className="text-teal-600 font-bold">💧 Kapha</div>
                  <div className="text-gray-600 text-sm">{selectedRecipe.doshaImpact.kapha}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Recommendations Section */}
        <div className="p-6 rounded-lg mb-8 border-2 border-blue-500 bg-blue-50">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            🍽️ Recipe Suggestions
          </h2>
          <p className="text-gray-600 mb-4">
            Click on any recipe to see videos and PDFs
          </p>

          {recipesLoading ? (
            <p className="text-gray-600">Loading recipes...</p>
          ) : recipes.length === 0 ? (
            <p className="text-gray-600">No recipes available yet. Check back soon!</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {recipes.slice(0, 6).map(recipe => (
                <button
                  key={recipe._id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="p-4 rounded-lg text-left transition-all hover:scale-105 border-2 border-blue-300 bg-white hover:border-blue-500"
                >
                  {recipe.thumbnailUrl && (
                    <img src={recipe.thumbnailUrl} alt={recipe.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                  )}
                  <h3 className="text-gray-900 font-bold text-sm">{recipe.name}</h3>
                  <p className="text-gray-600 text-xs">{recipe.nameHi}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    {recipe.videoUrl && <span>🎥</span>}
                    {recipe.pdfUrl && <span>📄</span>}
                    {recipe.images?.length > 0 && <span>📸</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={saveTodaysPlan}
            disabled={saveStatus === 'saving'}
            className="font-bold py-3 px-8 rounded-lg flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white transition-colors"
          >
            <Save size={20} />
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : "Save Today's Plan"}
          </button>
          <button
            onClick={clearAll}
            className="font-bold py-3 px-8 rounded-lg flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white transition-colors"
          >
            <Trash2 size={20} />
            Clear All
          </button>
        </div>
      </div>
    </main>
  );
}
