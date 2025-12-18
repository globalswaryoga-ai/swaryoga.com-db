'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Search, Sun, Loader, Download, CalendarDays } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { 
  calculateHinduCalendar
} from '@/lib/calendarCalculations';
import { locationData } from '@/lib/locationData';

interface CalendarData {
  date: string;
  day: string;
  paksha: 'Shukla Paksha' | 'Krishna Paksha';
  tithi: number;
  tithiName: string;
  sunriseTime: string;
  nadi: {
    type: 'Sun' | 'Moon';
    symbol: string;
    name: string;
  };
  location: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface MonthlyCalendarData {
  date: string;
  day: string;
  paksha: 'Shukla Paksha' | 'Krishna Paksha';
  tithi: number;
  tithiName: string;
  sunriseTime: string;
  nadi: string;
}

const getCountryByName = (name: string) => locationData.find((country) => country.name === name);

const getCountryNames = () => locationData.map((country) => country.name);

const getStatesForCountry = (countryName: string): string[] => {
  const country = getCountryByName(countryName);
  return country ? country.states.map((state) => state.name) : [];
};

const getCitiesForState = (countryName: string, stateName: string): string[] => {
  const country = getCountryByName(countryName);
  const state = country?.states.find((stateItem) => stateItem.name === stateName);
  return state ? state.cities.map((city) => city.name) : [];
};

const getCityCoordinates = (
  countryName: string,
  stateName: string,
  cityName: string
): { latitude: number; longitude: number } | undefined => {
  const country = getCountryByName(countryName);
  const state = country?.states.find((stateItem) => stateItem.name === stateName);
  const city = state?.cities.find((cityItem) => cityItem.name === cityName);
  if (!city) return undefined;
  return { latitude: city.latitude, longitude: city.longitude };
};

const SwarCalendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [selectedState, setSelectedState] = useState<string>('Maharashtra');
  const [selectedCapital, setSelectedCapital] = useState<string>('Mumbai');
  const [latitude, setLatitude] = useState<number>(19.0760);
  const [longitude, setLongitude] = useState<number>(72.8777);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Download form states
  const [showDownloadForm, setShowDownloadForm] = useState<boolean>(false);
  const [downloadStartDate, setDownloadStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [downloadEndDate, setDownloadEndDate] = useState<string>('');
  const [downloadLoading, setDownloadLoading] = useState<boolean>(false);

  const availableCountries = getCountryNames();

  const updateCoordinates = (country: string, state: string, city: string) => {
    const coords = getCityCoordinates(country, state, city);
    if (coords) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      return;
    }

    setLatitude(0);
    setLongitude(0);
  };

  useEffect(() => {
    if (selectedCountry && selectedState && selectedCapital) {
      updateCoordinates(selectedCountry, selectedState, selectedCapital);
    }
  }, [selectedCountry, selectedState, selectedCapital]);

  // Set default end date to one month from start date
  useEffect(() => {
    if (downloadStartDate) {
      const startDate = new Date(downloadStartDate);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(endDate.getDate() - 1);
      setDownloadEndDate(endDate.toISOString().split('T')[0]);
    }
  }, [downloadStartDate]);

  // Handle country change
  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value;
    setSelectedCountry(country);

    const states = getStatesForCountry(country);
    const nextState = states[0] ?? '';
    setSelectedState(nextState);

    const cities = nextState ? getCitiesForState(country, nextState) : [];
    const nextCity = cities[0] ?? '';
    setSelectedCapital(nextCity);

    if (nextState && nextCity) {
      updateCoordinates(country, nextState, nextCity);
    } else {
      setLatitude(0);
      setLongitude(0);
    }
  };

  // Handle state change
  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const state = e.target.value;
    setSelectedState(state);

    const cities = state ? getCitiesForState(selectedCountry, state) : [];
    const nextCity = cities[0] ?? '';
    setSelectedCapital(nextCity);

    if (state && nextCity) {
      updateCoordinates(selectedCountry, state, nextCity);
    } else {
      setLatitude(0);
      setLongitude(0);
    }
  };

  // Handle capital change
  const handleCapitalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const capital = e.target.value;
    setSelectedCapital(capital);
    if (capital) {
      updateCoordinates(selectedCountry, selectedState, capital);
    }
  };

  // Generate monthly calendar data
  const generateMonthlyCalendarData = async (startDate: string, endDate: string, lat: number, lng: number): Promise<MonthlyCalendarData[]> => {
    const data: MonthlyCalendarData[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const maxDate = new Date(start);
    maxDate.setMonth(maxDate.getMonth() + 1);
    const actualEndDate = end > maxDate ? maxDate : end;
    
    let currentDate = new Date(start);
    
    while (currentDate <= actualEndDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const hinduData = await calculateHinduCalendar(dateString, lat, lng);
      
      data.push({
        date: dateString,
        day: hinduData.day,
        paksha: hinduData.paksha,
        tithi: hinduData.tithi,
        tithiName: hinduData.tithiName,
        sunriseTime: hinduData.sunriseTime12,
        nadi: hinduData.nadi.name
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return data;
  };

  // Download monthly calendar
  const handleDownloadMonthlyCalendar = async () => {
    if (!downloadStartDate || !downloadEndDate || !latitude || !longitude) {
      alert('Please fill in all required fields first');
      return;
    }
    
    const start = new Date(downloadStartDate);
    const end = new Date(downloadEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 31) {
      alert('Date range cannot exceed one month (31 days)');
      return;
    }
    
    setDownloadLoading(true);
    
    try {
      const monthlyData = await generateMonthlyCalendarData(downloadStartDate, downloadEndDate, latitude, longitude);
      
      const shuklaData = monthlyData.filter((item: MonthlyCalendarData) => item.paksha === 'Shukla Paksha');
      const krishnaData = monthlyData.filter((item: MonthlyCalendarData) => item.paksha === 'Krishna Paksha');
      
      const headers = 'Date,Day,Paksha,Tithi,Tithi Name,Sunrise Time,Nadi';
      
      const shuklaCSV = [
        '=== SHUKLA PAKSHA (Waxing Moon) ===',
        headers,
        ...shuklaData.map((row: MonthlyCalendarData) => 
          `${formatDate(row.date)},${row.day},${row.paksha},${row.tithi},${row.tithiName},${row.sunriseTime},${row.nadi}`
        )
      ];
      
      const krishnaCSV = [
        '',
        '=== KRISHNA PAKSHA (Waning Moon) ===',
        headers,
        ...krishnaData.map((row: MonthlyCalendarData) => 
          `${formatDate(row.date)},${row.day},${row.paksha},${row.tithi},${row.tithiName},${row.sunriseTime},${row.nadi}`
        )
      ];
      
      const csvContent = [
        `Hindu Calendar - ${selectedCapital}, ${selectedState}, ${selectedCountry}`,
        `Period: ${formatDate(downloadStartDate)} to ${formatDate(downloadEndDate)}`,
        `Location: Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`,
        `Generated on: ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}`,
        '',
        ...shuklaCSV,
        ...krishnaCSV,
        '',
        '=== NADI CALCULATION LOGIC ===',
        'Shukla Paksha: Tithi 1,2,3,7,8,9,13,14,15 = Chandra Nadi | Tithi 4,5,6,10,11,12 = Surya Nadi',
        'Krishna Paksha: Tithi 1,2,3,7,8,9,13,14,15 = Surya Nadi | Tithi 4,5,6,10,11,12 = Chandra Nadi',
        '',
        'Powered by Swar Yoga Science - Authentic Hindu Calendar Calculations'
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Hindu-Calendar-${downloadStartDate}-to-${downloadEndDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowDownloadForm(false);
    } catch (error) {
      console.error('Error generating monthly calendar:', error);
      alert('Error generating calendar. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedCountry || !selectedState || !selectedCapital || !latitude || !longitude) return;
    
    setLoading(true);
    setConnectionError(null);
    
    try {
      const hinduData = await calculateHinduCalendar(selectedDate, latitude, longitude);
      
      if (!hinduData) {
        throw new Error('Failed to calculate Hindu calendar data');
      }
      
      setCalendarData({
        date: selectedDate,
        day: hinduData.day,
        paksha: hinduData.paksha,
        tithi: hinduData.tithi,
        tithiName: hinduData.tithiName,
        sunriseTime: hinduData.sunriseTime12,
        nadi: hinduData.nadi,
        location: `${selectedCapital}, ${selectedState}, ${selectedCountry}`,
        coordinates: {
          latitude,
          longitude
        }
      });
      
      setShowResults(true);
    } catch (error) {
      console.error('Error calculating calendar data:', error);
      setConnectionError('Failed to calculate calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <>
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8 min-h-screen">
        {/* Hero Section */}
        <section className="text-center py-20 bg-gradient-to-r from-swar-primary via-swar-accent to-swar-primary text-white rounded-3xl shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full mix-blend-multiply filter blur-3xl"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-swar-primary-light rounded-full mix-blend-multiply filter blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <Calendar className="w-20 h-20 mx-auto mb-6 animate-pulse" />
            <h1 className="text-5xl md:text-6xl font-bold mb-4">Swar Calendar</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed">
              Discover the ancient wisdom of Hindu astrology and astronomy. Calculate Paksh, Tithi, Nadi, and sunrise times with precise astronomical accuracy.
            </p>
            <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
              <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white border-opacity-30">
                <Sun className="w-5 h-5" />
                <span>Sunrise Calculations</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white border-opacity-30">
                <Calendar className="w-5 h-5" />
                <span>Lunar Phases</span>
              </div>
              <div className="inline-flex items-center space-x-2 bg-white bg-opacity-20 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white border-opacity-30">
                <MapPin className="w-5 h-5" />
                <span>Location Based</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 bg-gradient-to-b from-gray-50 to-white rounded-3xl">
          <div className="space-y-12">
            <h2 className="text-4xl font-bold text-center text-swar-text">
              Powerful Astrological Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Sunrise Calculations */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-orange-500">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <Sun className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Sunrise Time</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Precise sunrise calculations based on your exact latitude and longitude coordinates.
                </p>
              </div>

              {/* Paksh & Tithi */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-blue-500">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Paksh & Tithi</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Accurate determination of Shukla/Krishna Paksh and detailed Tithi (lunar day) calculations.
                </p>
              </div>

              {/* Nadi Analysis */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-purple-500">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-6 h-6 text-purple-600 text-lg">☄️</div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Nadi Analysis</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Surya and Chandra Nadi calculations based on traditional Hindu astrology principles.
                </p>
              </div>

              {/* Location Based */}
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-4 border-green-500">
                <div className="w-12 h-12 bg-swar-primary-light rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-swar-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-swar-text">Global Coverage</h3>
                <p className="text-swar-text-secondary leading-relaxed">
                  Calculations tailored to 100+ countries and thousands of cities worldwide.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center space-x-2 mb-6">
            <MapPin className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-swar-text">Location & Date Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-swar-text mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  id="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                />
              </div>
              
              {/* Country */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-swar-text mb-1">
                  Country
                </label>
                <select
                  id="country"
                  value={selectedCountry}
                  onChange={handleCountryChange}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                >
                  <option value="">Select Country</option>
                  {availableCountries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* State */}
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-swar-text mb-1">
                  State/Region
                </label>
                <select
                  id="state"
                  value={selectedState}
                  onChange={handleStateChange}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                  disabled={!selectedCountry}
                >
                  <option value="">Select State/Region</option>
                  {selectedCountry && getStatesForCountry(selectedCountry).map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Capital City */}
              <div>
                <label htmlFor="capital" className="block text-sm font-medium text-swar-text mb-1">
                  Capital City
                </label>
                <select
                  id="capital"
                  value={selectedCapital}
                  onChange={handleCapitalChange}
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                  disabled={!selectedState}
                >
                  <option value="">Select Capital City</option>
                  {selectedState && getCitiesForState(selectedCountry, selectedState).map((capital) => (
                    <option key={capital} value={capital}>
                      {capital}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Latitude */}
              <div>
                <label htmlFor="latitude" className="block text-sm font-medium text-swar-text mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  id="latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  step="0.000001"
                  placeholder="e.g., 19.0760"
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                />
              </div>
              
              {/* Longitude */}
              <div>
                <label htmlFor="longitude" className="block text-sm font-medium text-swar-text mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  id="longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  step="0.000001"
                  placeholder="e.g., 72.8777"
                  className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  required
                />
                <p className="text-xs text-swar-text-secondary mt-1">
                  Coordinates auto-fill from the selected city so sunrise time reflects the exact location.
                </p>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading || !selectedDate || !selectedCountry || !selectedState || !selectedCapital || !latitude || !longitude}
              className="w-full bg-swar-primary hover:bg-swar-primary text-white py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin mr-2" />
                  Calculating...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Calculate Hindu Calendar
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Display */}
        {connectionError && (
          <div className="bg-red-50 border border-red-200 text-swar-primary px-4 py-3 rounded-lg">
            {connectionError}
          </div>
        )}

        {/* Results Section */}
        {showResults && calendarData && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                <Calendar className="w-6 h-6 text-swar-primary" />
                <span>Hindu Calendar Results</span>
              </h2>
              <button
                onClick={() => setShowDownloadForm(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                <Download className="w-4 h-4" />
                <span>Download Monthly Calendar</span>
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-swar-border overflow-hidden">
              <div className="bg-swar-primary text-white px-6 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Today's Hindu Calendar</h3>
                  <div className="text-sm">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {calendarData.location}
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-swar-bg">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-swar-text">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-swar-text">Day</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-swar-text">Paksha</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-swar-text">Tithi</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-swar-text">Sunrise Time</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-swar-text">Today's Nadi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="border-t border-swar-border">
                      <td className="px-6 py-4 text-sm text-swar-text font-medium">
                        {formatDate(calendarData.date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-swar-text">
                        {calendarData.day}
                      </td>
                      <td className="px-6 py-4 text-sm text-swar-text">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-swar-primary-light text-swar-primary">
                          {calendarData.paksha}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-swar-text">
                        <div>
                          <span className="font-semibold text-purple-600">{calendarData.tithi}</span>
                          <div className="text-xs text-swar-text-secondary">{calendarData.tithiName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-swar-text">
                        <div className="flex items-center">
                          <Sun className="w-4 h-4 text-orange-500 mr-1" />
                          <span className="font-medium">{calendarData.sunriseTime}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-swar-text">
                        <div className="flex items-center">
                          <span className="mr-2 text-lg">{calendarData.nadi.symbol}</span>
                          <div>
                            <span className="font-medium">{calendarData.nadi.name}</span>
                            <div className="text-xs text-swar-text-secondary">
                              {calendarData.nadi.type === 'Sun' ? 'Sun Energy' : 'Moon Energy'}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="px-6 py-4 bg-swar-bg border-t border-swar-border">
                <div className="text-sm text-swar-text-secondary">
                  <p><strong>Coordinates:</strong> Lat: {calendarData.coordinates.latitude.toFixed(6)}, Lng: {calendarData.coordinates.longitude.toFixed(6)}</p>
                  <p className="mt-1"><strong>Nadi Logic:</strong> In {calendarData.paksha}, Tithi {calendarData.tithi} corresponds to {calendarData.nadi.name}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Download Form Modal */}
        {showDownloadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-swar-text flex items-center space-x-2">
                  <CalendarDays className="w-6 h-6 text-blue-600" />
                  <span>Download Monthly Calendar</span>
                </h3>
                <button
                  onClick={() => setShowDownloadForm(false)}
                  className="text-swar-text-secondary hover:text-swar-text-secondary text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={downloadStartDate}
                    onChange={(e) => setDownloadStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-swar-text mb-1">
                    End Date (Max 1 Month)
                  </label>
                  <input
                    type="date"
                    value={downloadEndDate}
                    onChange={(e) => setDownloadEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">Download Features:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Separate sections for Shukla Paksha and Krishna Paksha</li>
                    <li>• Same table format as today's results</li>
                    <li>• Complete Nadi calculation logic included</li>
                    <li>• CSV format for easy viewing in Excel</li>
                    <li>• Maximum one month period allowed</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDownloadForm(false)}
                    className="flex-1 px-4 py-2 border border-swar-border text-swar-text rounded-lg hover:bg-swar-bg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDownloadMonthlyCalendar}
                    disabled={downloadLoading || !downloadStartDate || !downloadEndDate}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin mr-2" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center text-xs text-swar-text-secondary">
          <p>Calculations based on authentic Hindu Panchang and astronomical methods</p>
          <p>Powered by Swar Yoga Science</p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default SwarCalendar;
