'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Globe, ChevronDown, AlertCircle } from 'lucide-react';
import { LocationData } from '@/types/calendar';
import {
  getAllCountries,
  getStatesByCountry,
  getCapitalByState,
  getCitiesByState,
  getCoordinatesByCity
} from '@/lib/globalLocationData';

interface LocationFormProps {
  onSubmit: (data: LocationData) => void;
  loading: boolean;
}

const LocationForm: React.FC<LocationFormProps> = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState<LocationData>({
    date: new Date().toISOString().split('T')[0],
    country: 'India',
    state: 'Maharashtra',
    capitalCity: 'Mumbai',
    latitude: 19.0760,
    longitude: 72.8777
  });

  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [timezone, setTimezone] = useState<number>(5.5);
  const [error, setError] = useState<string | null>(null);

  // Load countries on mount
  useEffect(() => {
    const countryList = getAllCountries();
    setCountries(countryList);
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (formData.country) {
      const stateList = getStatesByCountry(formData.country);
      setStates(stateList);
      
      // Reset state and capital when country changes
      if (stateList.length > 0) {
        const firstState = stateList[0];
        const capital = getCapitalByState(formData.country, firstState);
        
        setFormData(prev => ({
          ...prev,
          state: firstState,
          capitalCity: capital || '',
          latitude: 0,
          longitude: 0
        }));
        
        // Load cities for the first state
        const cityList = getCitiesByState(formData.country, firstState);
        setCities(cityList.map(c => c.city));
        
        // Set coordinates and timezone
        if (capital) {
          const coords = getCoordinatesByCity(formData.country, firstState, capital);
          if (coords) {
            setFormData(prev => ({
              ...prev,
              latitude: coords.latitude,
              longitude: coords.longitude
            }));
            setTimezone(coords.timezone);
          }
        }
      } else {
        setStates([]);
        setCities([]);
        setError('No states found for this country');
      }
    }
  }, [formData.country]);

  // Load cities when state changes
  useEffect(() => {
    if (formData.country && formData.state) {
      const cityList = getCitiesByState(formData.country, formData.state);
      setCities(cityList.map(c => c.city));
      
      // Auto-select capital city
      const capital = getCapitalByState(formData.country, formData.state);
      if (capital && cityList.some(c => c.city === capital)) {
        setFormData(prev => ({
          ...prev,
          capitalCity: capital
        }));
        
        // Set coordinates and timezone
        const coords = getCoordinatesByCity(formData.country, formData.state, capital);
        if (coords) {
          setFormData(prev => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude
          }));
          setTimezone(coords.timezone);
        }
      } else if (cityList.length > 0) {
        // Select first city if capital not found
        setFormData(prev => ({
          ...prev,
          capitalCity: cityList[0].city
        }));
        
        const coords = getCoordinatesByCity(formData.country, formData.state, cityList[0].city);
        if (coords) {
          setFormData(prev => ({
            ...prev,
            latitude: coords.latitude,
            longitude: coords.longitude
          }));
          setTimezone(coords.timezone);
        }
      }
    }
  }, [formData.state, formData.country]);

  // Update coordinates when city changes
  useEffect(() => {
    if (formData.country && formData.state && formData.capitalCity) {
      const coords = getCoordinatesByCity(formData.country, formData.state, formData.capitalCity);
      if (coords) {
        setFormData(prev => ({
          ...prev,
          latitude: coords.latitude,
          longitude: coords.longitude
        }));
        setTimezone(coords.timezone);
      }
    }
  }, [formData.capitalCity, formData.country, formData.state]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null);
    setFormData(prev => ({
      ...prev,
      country: e.target.value
    }));
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null);
    setFormData(prev => ({
      ...prev,
      state: e.target.value
    }));
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null);
    setFormData(prev => ({
      ...prev,
      capitalCity: e.target.value
    }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      date: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.country || !formData.state || !formData.capitalCity) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.latitude === 0 && formData.longitude === 0) {
      setError('Unable to get coordinates for selected location');
      return;
    }

    setError(null);
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl shadow-lg border border-blue-100"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Globe className="w-6 h-6 text-indigo-600" />
        <h3 className="text-2xl font-bold text-swar-text">Select Location & Date</h3>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-swar-primary font-medium">{error}</p>
        </div>
      )}

      {/* Date Input */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-swar-text font-semibold">
          <Calendar className="w-5 h-5 text-indigo-600" />
          Select Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={handleDateChange}
          className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
        />
      </div>

      {/* Country Selector */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-swar-text font-semibold">
          <Globe className="w-5 h-5 text-indigo-600" />
          Country
        </label>
        <div className="relative">
          <select
            value={formData.country}
            onChange={handleCountryChange}
            className="w-full px-4 py-3 border border-indigo-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white"
          >
            <option value="">Select a country</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-indigo-600 pointer-events-none" />
        </div>
      </div>

      {/* State Selector */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-swar-text font-semibold">
          <MapPin className="w-5 h-5 text-indigo-600" />
          State / Province
        </label>
        <div className="relative">
          <select
            value={formData.state}
            onChange={handleStateChange}
            disabled={states.length === 0}
            className="w-full px-4 py-3 border border-indigo-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white disabled:bg-swar-primary-light disabled:text-swar-text-secondary"
          >
            <option value="">Select a state/province</option>
            {states.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-indigo-600 pointer-events-none" />
        </div>
      </div>

      {/* City/Capital Selector */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-swar-text font-semibold">
          <MapPin className="w-5 h-5 text-indigo-600" />
          City / Capital
        </label>
        <div className="relative">
          <select
            value={formData.capitalCity}
            onChange={handleCityChange}
            disabled={cities.length === 0}
            className="w-full px-4 py-3 border border-indigo-300 rounded-lg appearance-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition bg-white disabled:bg-swar-primary-light disabled:text-swar-text-secondary"
          >
            <option value="">Select a city</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-4 top-3.5 w-5 h-5 text-indigo-600 pointer-events-none" />
        </div>
      </div>

      {/* Location Info Box */}
      <div className="bg-white rounded-lg p-4 border border-indigo-200">
        <h4 className="text-sm font-semibold text-swar-text mb-3">Location Details</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-swar-text-secondary font-medium">Latitude</p>
            <p className="text-indigo-600 font-mono font-bold">{typeof formData.latitude === 'number' && isFinite(formData.latitude) ? formData.latitude.toFixed(4) : '0.0000'}°</p>
          </div>
          <div>
            <p className="text-swar-text-secondary font-medium">Longitude</p>
            <p className="text-indigo-600 font-mono font-bold">{typeof formData.longitude === 'number' && isFinite(formData.longitude) ? formData.longitude.toFixed(4) : '0.0000'}°</p>
          </div>
          <div>
            <p className="text-swar-text-secondary font-medium">Timezone</p>
            <p className="text-indigo-600 font-mono font-bold">UTC{timezone >= 0 ? '+' : ''}{(typeof timezone === 'number' && isFinite(timezone) ? timezone.toFixed(1) : '0.0')}</p>
          </div>
          <div>
            <p className="text-swar-text-secondary font-medium">Location</p>
            <p className="text-indigo-600 font-mono font-bold truncate">
              {formData.capitalCity}, {formData.country}
            </p>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !formData.date || !formData.country || !formData.state || !formData.capitalCity}
        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-bold rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <Calendar className="w-5 h-5" />
            Calculate Calendar
          </>
        )}
      </button>

      {/* Info Text */}
      <p className="text-xs text-swar-text-secondary text-center">
        Coordinates and timezone are automatically populated from our global database of {countries.length}+ countries
      </p>
    </form>
  );
};

export default LocationForm;
