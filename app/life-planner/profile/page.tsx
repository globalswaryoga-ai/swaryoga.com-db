'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Briefcase, Calendar } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  country: string;
  state: string;
  gender: string;
  age: number;
  profession: string;
}

export default function LifePlannerProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    countryCode: '+91',
    country: '',
    state: '',
    gender: '',
    age: '',
    profession: '',
  });

  useEffect(() => {
    setMounted(true);
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get user email from localStorage session
      const userSession = localStorage.getItem('lifePlannerUser');
      if (!userSession) {
        setError('Please sign in to view your profile');
        setIsLoading(false);
        return;
      }

      const { email } = JSON.parse(userSession);
      
      // Fetch profile data using email
      const response = await fetch(`/api/user/profile-by-email?email=${encodeURIComponent(email)}`);
      
      if (!response.ok) {
        throw new Error('Failed to load profile');
      }

      const data = await response.json();
      setProfile(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        countryCode: data.countryCode || '+91',
        country: data.country || '',
        state: data.state || '',
        gender: data.gender || '',
        age: data.age ? data.age.toString() : '',
        profession: data.profession || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      // Get user email from localStorage session
      const userSession = localStorage.getItem('lifePlannerUser');
      if (!userSession) {
        setError('Session expired. Please sign in again.');
        return;
      }

      const { email } = JSON.parse(userSession);

      const response = await fetch('/api/user/profile-update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...formData }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updated = await response.json();
      setProfile(updated);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        countryCode: profile.countryCode || '+91',
        country: profile.country || '',
        state: profile.state || '',
        gender: profile.gender || '',
        age: profile.age ? profile.age.toString() : '',
        profession: profile.profession || '',
      });
    }
    setIsEditing(false);
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white py-12">
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
              <p className="text-gray-600 mt-2">View and manage your personal information</p>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all"
              >
                Edit Profile
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {isEditing ? (
            // Edit Mode
            <div className="bg-white border border-pink-200 rounded-2xl p-8 shadow-lg">
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                    placeholder="Your name"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Email (Cannot be changed)
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Country Code
                    </label>
                    <input
                      type="text"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                      placeholder="+91"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                      placeholder="Your phone number"
                    />
                  </div>
                </div>

                {/* Country & State */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                      placeholder="Your country"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                      placeholder="Your state"
                    />
                  </div>
                </div>

                {/* Gender & Age */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer-not-to-say">Prefer not to say</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                      placeholder="Your age"
                      min="13"
                      max="150"
                    />
                  </div>
                </div>

                {/* Profession */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Profession
                  </label>
                  <input
                    type="text"
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-pink-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
                    placeholder="Your profession"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-4 pt-6">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:from-red-600 hover:to-pink-600 transition-all"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 border border-pink-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-pink-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // View Mode
            <div className="space-y-6">
              {/* Basic Info Card */}
              <div className="bg-white border border-pink-200 rounded-2xl p-8 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Basic Information</h2>
                
                <div className="space-y-4">
                  {/* Name */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <User className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Full Name</p>
                      <p className="text-lg font-semibold text-gray-900">{profile.name}</p>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <Mail className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-lg font-semibold text-gray-900">{profile.email}</p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <Phone className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {profile.countryCode} {profile.phone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-white border border-pink-200 rounded-2xl p-8 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Location</h2>
                
                <div className="space-y-4">
                  {/* Country */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <MapPin className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Country</p>
                      <p className="text-lg font-semibold text-gray-900">{profile.country}</p>
                    </div>
                  </div>

                  {/* State */}
                  <div className="flex items-center gap-4">
                    <div className="h-6 w-6 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">State</p>
                      <p className="text-lg font-semibold text-gray-900">{profile.state}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info Card */}
              <div className="bg-white border border-pink-200 rounded-2xl p-8 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Additional Information</h2>
                
                <div className="space-y-4">
                  {/* Gender */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <User className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Gender</p>
                      <p className="text-lg font-semibold text-gray-900 capitalize">
                        {profile.gender === 'prefer-not-to-say' ? 'Prefer not to say' : profile.gender}
                      </p>
                    </div>
                  </div>

                  {/* Age */}
                  <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                    <Calendar className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Age</p>
                      <p className="text-lg font-semibold text-gray-900">{profile.age} years</p>
                    </div>
                  </div>

                  {/* Profession */}
                  <div className="flex items-center gap-4">
                    <Briefcase className="h-6 w-6 text-red-600 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Profession</p>
                      <p className="text-lg font-semibold text-gray-900">{profile.profession}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
