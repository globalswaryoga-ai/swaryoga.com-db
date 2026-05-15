'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Loader, Plus, X, Save, Trash2, Calendar, Zap } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { locationData } from '@/lib/locationData';
import { getClimateRitu, getRituBySeason } from '@/lib/ritucharya/seasons';
import { foodDatabase, searchFood, RASAS } from '@/lib/ritucharya/foodDatabase';
import { analyzeWeatherAndRecommendRasas, getSeasonalDetails } from '@/lib/ritucharya/seasonalAnalysis';

interface MealInput {
  foodNames: string[];
  notes: string;
  suggestions: string[];
}

export default function TodayRecommendationsPage() {
  const [location, setLocation] = useState({ country: '', state: '', city: '' });
  const [weather, setWeather] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

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

  // Fetch weather based on location from localStorage or session
  useEffect(() => {
    const storedLocation = localStorage.getItem('ritucharya_location');
    if (storedLocation) {
      const parsed = JSON.parse(storedLocation);
      setLocation(parsed);
      fetchWeatherData(parsed);
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

  const mealSlots = [
    { id: 'gond_pani_4am', timeHi: '4:00 AM', timeEn: 'Gond Pani', category: 'drink' },
    { id: 'herbal_drink_6am', timeHi: '6:00 AM', timeEn: 'Herbal Drink', category: 'herbal' },
    { id: 'breakfast_830_930', timeHi: '8:30-9:30 AM', timeEn: 'Breakfast', category: 'breakfast' },
    { id: 'lunch_1130', timeHi: '11:30 AM', timeEn: 'Lunch', category: 'lunch' },
    { id: 'dinner_7pm', timeHi: '7:00 PM', timeEn: 'Dinner', category: 'dinner' },
    { id: 'before_sleep', timeHi: 'Before Sleep', timeEn: 'Night Drink', category: 'drink' },
  ];

  const getRecipesByCategory = (category: string) => {
    return recipes.filter(r => r.category === category || r.category === 'salad');
  };

  if (!initialized && loading) {
    return (
      <>
        <Navigation />
        <main style={{ backgroundColor: '#000000', color: '#FFFFFF' }} className="min-h-screen pt-24 pb-16 flex items-center justify-center">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4" size={40} style={{ color: '#00FF00' }} />
            <p>Loading today's data...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main style={{ backgroundColor: '#000000', color: '#FFFFFF' }} className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: '#00FF00' }}>
              आज की सिफारिशें (Today's Recommendations)
            </h1>
            <p style={{ color: '#AAAAAA' }}>{today}</p>
          </div>

          {/* Weather & Ritu Summary */}
          {weather && (
            <div className="space-y-4 mb-8">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-6 rounded-lg" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}>
                  <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>🌡️ Today's Weather</h3>
                  <div className="space-y-2" style={{ color: '#FFFFFF' }}>
                    <div>Temperature: {weather.temp}°C ({weather.tempMin}°-{weather.tempMax}°)</div>
                    <div>Humidity: {weather.humidity}%</div>
                    <div>Climate: {weather.climate}</div>
                  </div>
                </div>
                <div className="p-6 rounded-lg" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}>
                  <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>🌸 Today's Ritu</h3>
                  <div className="text-2xl font-bold" style={{ color: '#FFFF00' }}>{weather.ritu}</div>
                  <p style={{ color: '#AAAAAA' }} className="mt-2">Adjust diet based on this season</p>
                </div>
              </div>

              {/* Seasonal Analysis & Nature Realities */}
              {analysis && (
                <div className="p-6 rounded-lg" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}>
                  <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: '#00FF00' }}>
                    ⚡ Season's Nature & Characteristics
                  </h3>

                  {/* Nature Phenomena */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-3 text-sm" style={{ color: '#FFFF00' }}>🌿 Natural Phenomena:</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.naturalPhenomena.map((phenomenon: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-3 py-1 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: 'rgba(0, 255, 0, 0.2)',
                            color: '#00FF00',
                            border: '1px solid #00FF00',
                            fontFamily: phenomenon.match(/[^\x00-\x7F]/) ? "'Noto Sans Devanagari', serif" : 'inherit',
                          }}
                        >
                          {phenomenon}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Dosha Imbalance Info */}
                  <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'rgba(26, 26, 26, 0.8)', border: '2px solid #FFFF00' }}>
                    <h4 className="font-semibold mb-3" style={{ color: '#FFFF00' }}>⚡ Dosha Status This Season:</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', borderLeft: '4px solid #FF6B6B' }}>
                        <div className="font-bold" style={{ color: '#FF6B6B' }}>💨 Vata (वात)</div>
                        <div className="text-sm mt-1" style={{ color: '#FFFFFF' }}>
                          {analysis.seasonalData.doshaImbalance.vata}% Aggravated
                        </div>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 165, 0, 0.2)', borderLeft: '4px solid #FFA500' }}>
                        <div className="font-bold" style={{ color: '#FFA500' }}>🔥 Pitta (पित्त)</div>
                        <div className="text-sm mt-1" style={{ color: '#FFFFFF' }}>
                          {analysis.seasonalData.doshaImbalance.pitta}% Aggravated
                        </div>
                      </div>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(0, 150, 255, 0.2)', borderLeft: '4px solid #0096FF' }}>
                        <div className="font-bold" style={{ color: '#0096FF' }}>💧 Kapha (कफ)</div>
                        <div className="text-sm mt-1" style={{ color: '#FFFFFF' }}>
                          {analysis.seasonalData.doshaImbalance.kapha}% Aggravated
                        </div>
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
              box-shadow: 0 8px 20px rgba(255, 255, 0, 0.15);
              transform: translateY(-2px);
              transition: all 0.3s ease;
            }
          `}</style>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
            {mealSlots.map((slot, idx) => (
              <div
                key={slot.id}
                className="meal-card p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                style={{
                  border: '2px solid #FFFF00',
                  backgroundColor: 'rgba(26, 26, 26, 0.7)',
                  animationDelay: `${idx * 30}ms`,
                  backdropFilter: 'blur(5px)',
                }}
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
                  <h4 className="text-xs font-bold" style={{ color: '#00FF00' }}>{slot.timeHi.split(' ')[0]}</h4>
                  <p className="text-xs" style={{ color: '#AAAAAA' }}>{slot.timeEn}</p>
                </div>

                {/* Food Items - Small Pills */}
                {meals[slot.id as keyof typeof meals].foodNames.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2 pb-2" style={{ borderBottom: '1px solid rgba(255, 255, 0, 0.2)' }}>
                    {meals[slot.id as keyof typeof meals].foodNames.map((food, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full group hover:shadow-md transition-all"
                        style={{ backgroundColor: 'rgba(0, 255, 0, 0.2)', border: '1px solid #00FF00' }}
                      >
                        <span className="text-xs font-medium" style={{ color: '#00FF00' }}>✓ {food.slice(0, 6)}</span>
                        <button
                          onClick={() => removeFoodItem(slot.id, idx)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: '#FF6B6B' }}
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
                  className="w-full px-2 py-1 text-xs rounded-lg focus:outline-none"
                  style={{
                    borderWidth: '2px',
                    borderColor: '#FFFF00',
                    backgroundColor: 'rgba(26, 26, 26, 0.9)',
                    color: '#FFFFFF',
                  }}
                />

                {/* Suggestions Dropdown */}
                {meals[slot.id as keyof typeof meals].suggestions.length > 0 && (
                  <div
                    className="absolute mt-1 w-40 space-y-1 max-h-32 overflow-y-auto rounded-lg p-1 shadow-lg z-50"
                    style={{ backgroundColor: 'rgba(26, 26, 26, 0.95)', border: '1px solid #FFFF00' }}
                  >
                    {meals[slot.id as keyof typeof meals].suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => addFoodItem(slot.id, suggestion)}
                        className="block w-full text-left px-2 py-1 text-xs rounded transition-colors"
                        style={{
                          backgroundColor: 'rgba(26, 26, 26, 0.7)',
                          color: '#FFFFFF',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.backgroundColor = 'rgba(26, 26, 26, 0.7)';
                        }}
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
            <div className="mb-8 p-4 rounded-lg" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(100, 50, 200, 0.15)', backdropFilter: 'blur(5px)' }}>
              <h2 className="text-lg font-bold mb-4" style={{ color: '#00FF00', fontFamily: "'Noto Sans Devanagari', serif" }}>
                🎯 Recommended Rasas for {weather?.ritu}
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {/* Top Row - Use These Tastes */}
                {analysis.recommendedRasas.map((rasa, idx) => {
                  const rasaKey = rasa.includes('(Sweet)') ? 'sweet' : rasa.includes('(Sour)') ? 'sour' : rasa.includes('(Salty)') ? 'salty' : rasa.includes('(Pungent)') ? 'pungent' : rasa.includes('(Bitter)') ? 'bitter' : 'astringent';
                  const targetPercentage = analysis.seasonalData.recommendedPercentages[rasaKey as keyof typeof analysis.seasonalData.recommendedPercentages] || 0;
                  return (
                    <div key={`use-${idx}`} className="p-4 rounded-lg text-center hover:shadow-lg transition-shadow" style={{ backgroundColor: 'rgba(0, 255, 0, 0.2)', border: '2px solid #00FF00' }}>
                      <p className="font-bold text-sm" style={{ color: '#00FF00', fontFamily: "'Noto Sans Devanagari', serif" }}>
                        {rasa}
                      </p>
                      <p className="text-lg font-bold mt-2" style={{ color: '#FFFFFF' }}>{targetPercentage}%</p>
                      <p className="text-xs mt-1" style={{ color: '#AAAAAA' }}>← Use This</p>
                    </div>
                  );
                })}
                {/* Bottom Row - Avoid These Tastes */}
                {analysis.avoidRasas.map((rasa, idx) => (
                  <div key={`avoid-${idx}`} className="p-4 rounded-lg text-center hover:shadow-lg transition-shadow" style={{ backgroundColor: 'rgba(255, 107, 107, 0.2)', border: '2px solid #FF6B6B' }}>
                    <p className="font-bold text-sm" style={{ color: '#FF6B6B', fontFamily: "'Noto Sans Devanagari', serif" }}>
                      {rasa}
                    </p>
                    <p className="text-xs mt-1" style={{ color: '#AAAAAA' }}>⚠️ Avoid</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Foods Display */}
          {Object.values(meals).some(meal => meal.foodNames.length > 0) && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#00FF00' }}>📋 Today's Meal Plan</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealSlots.map((slot) => {
                  const mealData = meals[slot.id as keyof typeof meals];
                  if (mealData.foodNames.length === 0) return null;

                  return (
                    <div
                      key={slot.id}
                      className="p-5 rounded-xl shadow-lg hover:shadow-xl transition-all"
                      style={{
                        border: '2px solid #FFFF00',
                        backgroundColor: 'rgba(26, 26, 26, 0.8)',
                        backdropFilter: 'blur(5px)',
                      }}
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
                          <h3 className="font-bold" style={{ color: '#00FF00' }}>{slot.timeEn}</h3>
                          <p className="text-xs" style={{ color: '#AAAAAA' }}>{slot.timeHi}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {mealData.foodNames.map((food, idx) => {
                          const foodData = foodDatabase.find(f => f.nameEn === food);
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-lg"
                              style={{
                                backgroundColor: 'rgba(26, 26, 26, 0.7)',
                                borderLeft: '4px solid #00FF00',
                              }}
                            >
                              <div>
                                <p className="font-semibold text-sm" style={{ color: '#FFFFFF' }}>{food}</p>
                                {foodData && (
                                  <p className="text-xs" style={{ color: '#AAAAAA' }}>
                                    Taste: <span className="font-medium" style={{ color: '#00FF00' }}>{foodData.primaryRasaHi}</span>
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => removeFoodItem(slot.id, idx)}
                                className="font-bold hover:scale-110 transition-transform"
                                style={{ color: '#FF6B6B' }}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {mealData.notes && (
                        <div
                          className="mt-3 pt-3"
                          style={{ borderTop: '2px solid rgba(255, 255, 0, 0.2)' }}
                        >
                          <p className="text-xs" style={{ color: '#FFFFFF' }}>
                            <span className="font-semibold" style={{ color: '#FFFF00' }}>Note:</span> {mealData.notes}
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
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
              <div className="bg-black max-w-3xl w-full rounded-lg p-8" style={{ border: '2px solid #FFFF00' }}>
                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="float-right font-bold text-2xl"
                  style={{ color: '#FFFF00' }}
                >
                  ×
                </button>

                <h2 className="text-3xl font-bold mb-4" style={{ color: '#00FF00' }}>
                  {selectedRecipe.name} ({selectedRecipe.nameHi})
                </h2>

                {/* Recipe Images */}
                {selectedRecipe.images && selectedRecipe.images.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>📸 Images</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedRecipe.images.map((img: any, idx: number) => (
                        <div key={idx}>
                          <img src={img.url} alt={img.caption || `Recipe ${idx + 1}`} className="w-full h-40 object-cover rounded-lg" />
                          {img.caption && <p style={{ color: '#AAAAAA' }} className="text-sm mt-2">{img.caption}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Video */}
                {selectedRecipe.videoUrl && (
                  <div className="mb-6">
                    <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>🎥 Video</h3>
                    <video width="100%" height="300" controls className="rounded-lg" style={{ backgroundColor: '#1a1a1a' }}>
                      <source src={selectedRecipe.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Recipe Details */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 0, 0.1)' }}>
                    <div style={{ color: '#AAAAAA' }} className="text-sm">Servings</div>
                    <div style={{ color: '#FFFFFF' }} className="font-bold">{selectedRecipe.servings}</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 0, 0.1)' }}>
                    <div style={{ color: '#AAAAAA' }} className="text-sm">Prep Time</div>
                    <div style={{ color: '#FFFFFF' }} className="font-bold">{selectedRecipe.prepTime} min</div>
                  </div>
                  <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 0, 0.1)' }}>
                    <div style={{ color: '#AAAAAA' }} className="text-sm">Cook Time</div>
                    <div style={{ color: '#FFFFFF' }} className="font-bold">{selectedRecipe.cookTime} min</div>
                  </div>
                </div>

                {/* Ingredients */}
                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>Ingredients</h3>
                    <ul style={{ color: '#FFFFFF' }} className="space-y-2">
                      {selectedRecipe.ingredients.map((ing: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span>{ing.name}</span>
                          <span style={{ color: '#AAAAAA' }}>{ing.quantity} {ing.unit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-bold mb-3" style={{ color: '#00FF00' }}>Instructions</h3>
                    <ol style={{ color: '#FFFFFF' }} className="space-y-2 list-decimal list-inside">
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
                      className="inline-block font-bold py-2 px-4 rounded-lg"
                      style={{ backgroundColor: '#00FF00', color: '#000000' }}
                    >
                      📄 Download PDF Recipe
                    </a>
                  </div>
                )}

                {/* Dosha Impact */}
                <div className="grid grid-cols-3 gap-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 0, 0.1)', border: '1px solid #FFFF00' }}>
                  <div>
                    <div style={{ color: '#FF6B6B' }} className="font-bold">💨 Vata</div>
                    <div style={{ color: '#AAAAAA' }} className="text-sm">{selectedRecipe.doshaImpact.vata}</div>
                  </div>
                  <div>
                    <div style={{ color: '#FFA500' }} className="font-bold">🔥 Pitta</div>
                    <div style={{ color: '#AAAAAA' }} className="text-sm">{selectedRecipe.doshaImpact.pitta}</div>
                  </div>
                  <div>
                    <div style={{ color: '#4ECDC4' }} className="font-bold">💧 Kapha</div>
                    <div style={{ color: '#AAAAAA' }} className="text-sm">{selectedRecipe.doshaImpact.kapha}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recipe Recommendations Section */}
          <div className="p-6 rounded-lg mb-8" style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}>
            <h2 className="text-2xl font-bold mb-6" style={{ color: '#00FF00' }}>
              🍽️ Recipe Suggestions
            </h2>
            <p style={{ color: '#AAAAAA' }} className="mb-4">
              Click on any meal slot to see recipe suggestions with videos and PDFs
            </p>

            {recipesLoading ? (
              <p style={{ color: '#AAAAAA' }}>Loading recipes...</p>
            ) : recipes.length === 0 ? (
              <p style={{ color: '#AAAAAA' }}>No recipes available yet. Check back soon!</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {recipes.slice(0, 6).map(recipe => (
                  <button
                    key={recipe._id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className="p-4 rounded-lg text-left transition-all hover:scale-105"
                    style={{ border: '2px solid #FFFF00', backgroundColor: 'rgba(26, 26, 26, 0.5)' }}
                  >
                    {recipe.thumbnailUrl && (
                      <img src={recipe.thumbnailUrl} alt={recipe.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                    )}
                    <h3 style={{ color: '#00FF00' }} className="font-bold text-sm">{recipe.name}</h3>
                    <p style={{ color: '#AAAAAA' }} className="text-xs">{recipe.nameHi}</p>
                    <div className="flex gap-2 mt-2 text-xs">
                      {recipe.videoUrl && <span style={{ color: '#FFA500' }}>🎥</span>}
                      {recipe.pdfUrl && <span style={{ color: '#00FF00' }}>📄</span>}
                      {recipe.images?.length > 0 && <span style={{ color: '#FF6B6B' }}>📸</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              className="font-bold py-3 px-8 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: '#00FF00', color: '#000000' }}
            >
              <Save size={20} />
              Save Today's Plan
            </button>
            <button
              className="font-bold py-3 px-8 rounded-lg flex items-center gap-2"
              style={{ backgroundColor: '#666666', color: '#FFFFFF' }}
            >
              <Trash2 size={20} />
              Clear All
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
