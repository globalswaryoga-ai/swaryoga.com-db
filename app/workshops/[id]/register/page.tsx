'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft, Calendar, Clock, Users, MapPin, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Schedule {
  id: string;
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  startDate: string;
  endDate: string;
  time: string;
  seats: number;
  price: number;
  currency: string;
  location?: string;
}

// Workshop data with 6 months of schedules
const workshopDetails: Record<string, any> = {
  'swar-yoga-basic': {
    id: 1,
    name: 'Swar Yoga Basic Workshop',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    duration: '3 days',
    level: 'Beginner',
    price: '₹2,999',
    schedules: [
      // Online
      { id: 'o1', mode: 'online', startDate: '2025-01-15', endDate: '2025-01-17', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'o2', mode: 'online', startDate: '2025-02-10', endDate: '2025-02-12', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'o3', mode: 'online', startDate: '2025-03-05', endDate: '2025-03-07', time: '5:00 PM - 7:00 PM', seats: 45, price: 2999, currency: 'INR' },
      { id: 'o4', mode: 'online', startDate: '2025-04-12', endDate: '2025-04-14', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      { id: 'o5', mode: 'online', startDate: '2025-05-20', endDate: '2025-05-22', time: '5:00 PM - 7:00 PM', seats: 40, price: 2999, currency: 'INR' },
      { id: 'o6', mode: 'online', startDate: '2025-06-15', endDate: '2025-06-17', time: '6:00 AM - 8:00 AM', seats: 50, price: 2999, currency: 'INR' },
      // Offline
      { id: 'of1', mode: 'offline', startDate: '2025-01-20', endDate: '2025-01-22', time: '7:00 AM - 9:00 AM', seats: 30, price: 3999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of2', mode: 'offline', startDate: '2025-02-15', endDate: '2025-02-17', time: '7:00 AM - 9:00 AM', seats: 28, price: 3999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of3', mode: 'offline', startDate: '2025-03-10', endDate: '2025-03-12', time: '6:00 AM - 8:00 AM', seats: 25, price: 3999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'of4', mode: 'offline', startDate: '2025-04-18', endDate: '2025-04-20', time: '7:00 AM - 9:00 AM', seats: 30, price: 3999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of5', mode: 'offline', startDate: '2025-05-25', endDate: '2025-05-27', time: '6:00 AM - 8:00 AM', seats: 22, price: 3999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of6', mode: 'offline', startDate: '2025-06-20', endDate: '2025-06-22', time: '7:00 AM - 9:00 AM', seats: 30, price: 3999, currency: 'INR', location: 'Bangalore Center' },
      // Residential
      { id: 'r1', mode: 'residential', startDate: '2025-01-25', endDate: '2025-01-27', time: 'Full Day', seats: 20, price: 5999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r2', mode: 'residential', startDate: '2025-02-22', endDate: '2025-02-24', time: 'Full Day', seats: 18, price: 5999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r3', mode: 'residential', startDate: '2025-03-18', endDate: '2025-03-20', time: 'Full Day', seats: 20, price: 5999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r4', mode: 'residential', startDate: '2025-04-25', endDate: '2025-04-27', time: 'Full Day', seats: 15, price: 5999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r5', mode: 'residential', startDate: '2025-05-30', endDate: '2025-06-01', time: 'Full Day', seats: 20, price: 5999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r6', mode: 'residential', startDate: '2025-06-28', endDate: '2025-06-30', time: 'Full Day', seats: 18, price: 5999, currency: 'INR', location: 'Goa Retreat Center' },
    ]
  },
  'swar-yoga-level-1': {
    id: 2,
    name: 'Swar Yoga Level-1 Workshop',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    duration: '15 days',
    level: 'Beginner',
    price: '₹9,999',
    schedules: [
      // Online
      { id: 'o1', mode: 'online', startDate: '2025-01-10', endDate: '2025-01-24', time: '5:00 PM - 7:00 PM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'o2', mode: 'online', startDate: '2025-02-05', endDate: '2025-02-19', time: '5:00 PM - 7:00 PM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'o3', mode: 'online', startDate: '2025-03-01', endDate: '2025-03-15', time: '6:00 AM - 8:00 AM', seats: 35, price: 9999, currency: 'INR' },
      { id: 'o4', mode: 'online', startDate: '2025-04-08', endDate: '2025-04-22', time: '5:00 PM - 7:00 PM', seats: 40, price: 9999, currency: 'INR' },
      { id: 'o5', mode: 'online', startDate: '2025-05-15', endDate: '2025-05-29', time: '5:00 PM - 7:00 PM', seats: 38, price: 9999, currency: 'INR' },
      { id: 'o6', mode: 'online', startDate: '2025-06-10', endDate: '2025-06-24', time: '6:00 AM - 8:00 AM', seats: 40, price: 9999, currency: 'INR' },
      // Offline
      { id: 'of1', mode: 'offline', startDate: '2025-01-15', endDate: '2025-01-29', time: '7:00 AM - 9:00 AM', seats: 25, price: 12999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of2', mode: 'offline', startDate: '2025-02-10', endDate: '2025-02-24', time: '7:00 AM - 9:00 AM', seats: 20, price: 12999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of3', mode: 'offline', startDate: '2025-03-05', endDate: '2025-03-19', time: '6:00 AM - 8:00 AM', seats: 22, price: 12999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'of4', mode: 'offline', startDate: '2025-04-12', endDate: '2025-04-26', time: '7:00 AM - 9:00 AM', seats: 25, price: 12999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of5', mode: 'offline', startDate: '2025-05-18', endDate: '2025-06-01', time: '6:00 AM - 8:00 AM', seats: 18, price: 12999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of6', mode: 'offline', startDate: '2025-06-15', endDate: '2025-06-29', time: '7:00 AM - 9:00 AM', seats: 25, price: 12999, currency: 'INR', location: 'Bangalore Center' },
      // Residential
      { id: 'r1', mode: 'residential', startDate: '2025-01-20', endDate: '2025-02-03', time: 'Full Day', seats: 15, price: 16999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r2', mode: 'residential', startDate: '2025-02-18', endDate: '2025-03-04', time: 'Full Day', seats: 12, price: 16999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r3', mode: 'residential', startDate: '2025-03-22', endDate: '2025-04-05', time: 'Full Day', seats: 15, price: 16999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r4', mode: 'residential', startDate: '2025-04-28', endDate: '2025-05-12', time: 'Full Day', seats: 10, price: 16999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r5', mode: 'residential', startDate: '2025-05-25', endDate: '2025-06-08', time: 'Full Day', seats: 15, price: 16999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r6', mode: 'residential', startDate: '2025-06-22', endDate: '2025-07-06', time: 'Full Day', seats: 12, price: 16999, currency: 'INR', location: 'Goa Retreat Center' },
    ]
  },
  'swar-yoga-youth': {
    id: 3,
    name: 'Swar Yoga Youth Program',
    image: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg',
    duration: '10 days',
    level: 'All Levels',
    price: '₹4,999',
    schedules: [
      // Online
      { id: 'o1', mode: 'online', startDate: '2025-01-12', endDate: '2025-01-21', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'o2', mode: 'online', startDate: '2025-02-08', endDate: '2025-02-17', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'o3', mode: 'online', startDate: '2025-03-03', endDate: '2025-03-12', time: '5:00 PM - 7:00 PM', seats: 55, price: 4999, currency: 'INR' },
      { id: 'o4', mode: 'online', startDate: '2025-04-10', endDate: '2025-04-19', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      { id: 'o5', mode: 'online', startDate: '2025-05-12', endDate: '2025-05-21', time: '7:00 AM - 9:00 AM', seats: 58, price: 4999, currency: 'INR' },
      { id: 'o6', mode: 'online', startDate: '2025-06-12', endDate: '2025-06-21', time: '7:00 AM - 9:00 AM', seats: 60, price: 4999, currency: 'INR' },
      // Offline
      { id: 'of1', mode: 'offline', startDate: '2025-01-18', endDate: '2025-01-27', time: '8:00 AM - 10:00 AM', seats: 35, price: 5999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of2', mode: 'offline', startDate: '2025-02-12', endDate: '2025-02-21', time: '8:00 AM - 10:00 AM', seats: 32, price: 5999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of3', mode: 'offline', startDate: '2025-03-08', endDate: '2025-03-17', time: '5:00 PM - 7:00 PM', seats: 30, price: 5999, currency: 'INR', location: 'Bangalore Center' },
      { id: 'of4', mode: 'offline', startDate: '2025-04-15', endDate: '2025-04-24', time: '8:00 AM - 10:00 AM', seats: 35, price: 5999, currency: 'INR', location: 'Mumbai Center' },
      { id: 'of5', mode: 'offline', startDate: '2025-05-20', endDate: '2025-05-29', time: '8:00 AM - 10:00 AM', seats: 30, price: 5999, currency: 'INR', location: 'Delhi Center' },
      { id: 'of6', mode: 'offline', startDate: '2025-06-18', endDate: '2025-06-27', time: '8:00 AM - 10:00 AM', seats: 35, price: 5999, currency: 'INR', location: 'Bangalore Center' },
      // Residential
      { id: 'r1', mode: 'residential', startDate: '2025-01-28', endDate: '2025-02-06', time: 'Full Day', seats: 25, price: 8999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r2', mode: 'residential', startDate: '2025-02-25', endDate: '2025-03-06', time: 'Full Day', seats: 22, price: 8999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r3', mode: 'residential', startDate: '2025-03-25', endDate: '2025-04-03', time: 'Full Day', seats: 25, price: 8999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r4', mode: 'residential', startDate: '2025-04-30', endDate: '2025-05-09', time: 'Full Day', seats: 20, price: 8999, currency: 'INR', location: 'Goa Retreat Center' },
      { id: 'r5', mode: 'residential', startDate: '2025-06-02', endDate: '2025-06-11', time: 'Full Day', seats: 25, price: 8999, currency: 'INR', location: 'Rishikesh Ashram' },
      { id: 'r6', mode: 'residential', startDate: '2025-07-01', endDate: '2025-07-10', time: 'Full Day', seats: 22, price: 8999, currency: 'INR', location: 'Goa Retreat Center' },
    ]
  },
};

const modeConfig = {
  online: { label: 'Online', color: 'from-blue-600 to-blue-700', icon: '💻' },
  offline: { label: 'Offline', color: 'from-purple-600 to-purple-700', icon: '📍' },
  residential: { label: 'Residential', color: 'from-green-600 to-green-700', icon: '🏨' },
  recorded: { label: 'Recorded Class', color: 'from-orange-600 to-orange-700', icon: '🎥' }
};

export default function RegisterPage() {
  const params = useParams();
  const workshopSlug = params.id as string;
  const workshop = workshopDetails[workshopSlug];
  const [selectedMode, setSelectedMode] = useState<'online' | 'offline' | 'residential' | 'recorded'>('online');

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-gray-600">Workshop not found</p>
      </div>
    );
  }

  const schedules = useMemo(() => {
    if (selectedMode === 'recorded') {
      return [];
    }
    return (workshop.schedules || []).filter((s: Schedule) => s.mode === selectedMode);
  }, [workshop, selectedMode]);

  const handlePayNow = (schedule: Schedule) => {
    // In a real app, this would redirect to payment gateway
    alert(`Payment for ${workshop.name} - ${modeConfig[selectedMode].label} on ${schedule.startDate}`);
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4 md:px-6 max-w-7xl">
          {/* Back Button */}
          <Link
            href={`/workshops/${workshopSlug}`}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold mb-8 group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Workshop
          </Link>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {workshop.name}
            </h1>
            <div className="flex flex-wrap gap-6 text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-600" />
                <span>{workshop.duration}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-600" />
                <span>{workshop.level}</span>
              </div>
              <div className="text-2xl font-bold text-primary-600">{workshop.price}</div>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {Object.entries(modeConfig).map(([mode, config]) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode as any)}
                className={`p-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                  selectedMode === mode
                    ? `bg-gradient-to-r ${config.color} text-white shadow-lg scale-105`
                    : 'bg-white text-gray-800 border-2 border-gray-200 hover:border-gray-400'
                }`}
              >
                <span className="text-2xl mr-2">{config.icon}</span>
                {config.label}
              </button>
            ))}
          </div>

          {/* Recorded Class Special Section */}
          {selectedMode === 'recorded' && (
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl shadow-2xl p-12 text-center mb-12">
              <div className="text-5xl mb-4">🎥</div>
              <h2 className="text-3xl font-bold text-white mb-4">Recorded Class Access</h2>
              <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
                Get lifetime access to high-quality recorded classes. Learn at your own pace, anytime, anywhere.
              </p>
              <div className="bg-white/20 rounded-lg p-6 mb-8 max-w-2xl mx-auto">
                <p className="text-white text-lg font-semibold">Price: {workshop.price}</p>
                <p className="text-orange-100 mt-2">One-time payment for lifetime access</p>
              </div>
              <button
                onClick={() => handlePayNow({ mode: 'recorded' } as any)}
                className="bg-white hover:bg-gray-100 text-orange-600 px-10 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-bold text-lg inline-flex items-center gap-2"
              >
                Get Lifetime Access
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* Schedules Grid */}
          {selectedMode !== 'recorded' && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Available {modeConfig[selectedMode].label} Sessions (Next 6 Months)
              </h2>
              
              {schedules.length === 0 ? (
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <p className="text-xl text-gray-600">No sessions available for this mode</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schedules.map((schedule: Schedule) => (
                    <div
                      key={schedule.id}
                      className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden"
                    >
                      {/* Header */}
                      <div className={`bg-gradient-to-r ${modeConfig[selectedMode].color} text-white p-4`}>
                        <h3 className="text-lg font-bold">Batch Starting</h3>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        {/* Date */}
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-600 uppercase">Start Date</p>
                          <p className="text-xl font-bold text-gray-900">
                            {new Date(schedule.startDate).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>

                        {/* Duration */}
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-600 uppercase">Duration</p>
                          <p className="text-sm text-gray-700">
                            {new Date(schedule.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(schedule.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>

                        {/* Time */}
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-gray-600 uppercase">Time</p>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4" />
                            <span>{schedule.time}</span>
                          </div>
                        </div>

                        {/* Location (if offline/residential) */}
                        {schedule.location && (
                          <div className="mb-4">
                            <p className="text-sm font-semibold text-gray-600 uppercase">Location</p>
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-4 h-4" />
                              <span>{schedule.location}</span>
                            </div>
                          </div>
                        )}

                        {/* Seats */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-600 uppercase">Available Seats</p>
                          <p className={`text-lg font-bold ${schedule.seats > 10 ? 'text-green-600' : 'text-orange-600'}`}>
                            {schedule.seats} seats left
                          </p>
                        </div>

                        {/* Price and CTA */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Price</p>
                            <p className="text-2xl font-bold text-primary-600">
                              ₹{schedule.price.toLocaleString('en-IN')}
                            </p>
                          </div>
                          <button
                            onClick={() => handlePayNow(schedule)}
                            className={`bg-gradient-to-r ${modeConfig[selectedMode].color} hover:opacity-90 text-white px-4 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 font-bold flex items-center gap-2 whitespace-nowrap`}
                          >
                            Pay Now
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
