'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronDown, AlertCircle, ArrowRight } from 'lucide-react';

interface WorkshopDate {
  id: string;
  date: Date;
  mode?: string; // online, offline, hybrid
  language?: string;
  availableSeats: number;
  price: number;
  currency: string;
  instructors?: string[];
}

interface WorkshopDateBookingProps {
  workshopName: string;
  workshopSlug: string;
  availableDates?: WorkshopDate[];
  onBooking?: (selectedDate: WorkshopDate) => void;
}

export default function WorkshopDateBooking({
  workshopName,
  workshopSlug,
  availableDates = [],
  onBooking,
}: WorkshopDateBookingProps) {
  const [selectedDate, setSelectedDate] = useState<WorkshopDate | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  // Fetch dates from registernow API
  const [fetchedDates, setFetchedDates] = useState<WorkshopDate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/workshops/schedules?workshopSlug=${encodeURIComponent(workshopSlug)}`, { 
          cache: 'no-store' 
        });
        const json = await res.json().catch(() => null);
        
        if (!cancelled && res.ok && json?.data) {
          const schedules = Array.isArray(json.data) ? json.data : [];
          const convertedDates: WorkshopDate[] = schedules.map((s: any, idx: number) => ({
            id: s.id || s._id || `schedule-${idx}`,
            date: s.startDate ? new Date(s.startDate) : new Date(),
            mode: s.mode || 'online',
            language: s.language || 'English',
            availableSeats: Number(s.seatsTotal) || 20,
            price: Number(s.price) || 5000,
            currency: s.currency || 'INR',
            instructors: s.instructors || ['Guru Ji', 'Yoga Master'],
          }));
          if (!cancelled) setFetchedDates(convertedDates);
        }
      } catch (e) {
        console.error('Failed to fetch workshop dates:', e);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    
    return () => {
      cancelled = true;
    };
  }, [workshopSlug]);

  // Use fetched dates, fallback to provided dates
  const workshopDates = useMemo(() => {
    if (fetchedDates.length > 0) return fetchedDates;
    if (availableDates.length > 0) return availableDates;
    return [];
  }, [fetchedDates, availableDates]);

  const handlePayNow = (date: WorkshopDate) => {
    setSelectedDate(date);
    if (onBooking) {
      onBooking(date);
    } else {
      // Redirect to checkout
      const params = new URLSearchParams({
        workshop: workshopSlug,
        date: date.date.toISOString(),
        mode: date.mode || 'online',
        price: date.price.toString(),
      });
      window.location.href = `/checkout?${params.toString()}`;
    }
  };

  const handleEnquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-fill with user info from form
    const enquiryData = {
      workshop: workshopName,
      workshopSlug,
      ...enquiryForm,
      timestamp: new Date().toISOString(),
    };

    console.log('Enquiry submitted:', enquiryData);

    // Send to enquiry API
    fetch('/api/enquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enquiryData),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert('✅ Enquiry submitted! We will contact you soon.');
          setShowEnquiryForm(false);
          setEnquiryForm({ name: '', email: '', phone: '', message: '' });
        } else {
          alert('❌ Failed to submit enquiry');
        }
      })
      .catch((err) => {
        console.error('Enquiry submission error:', err);
        alert('❌ Error submitting enquiry');
      });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-swar-700 mb-2">📅 Book Your Workshop</h2>
        <p className="text-swar-text-secondary">Select a date to begin your journey</p>
      </div>

      {/* Show Dates if Available */}
      {isLoading ? (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">⏳ Loading workshop dates...</h3>
          <p className="text-sm text-blue-800">Fetching available dates from the registration system</p>
        </div>
      ) : workshopDates.length > 0 ? (
        <>
          <div className="mb-6">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="w-full p-4 border-2 border-swar-200 rounded-lg hover:bg-swar-50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2 text-lg font-semibold">
                <Calendar className="w-5 h-5 text-swar-600" />
                {selectedDate
                  ? `Selected: ${selectedDate.date.toLocaleDateString()} (${selectedDate.mode})`
                  : 'Select a date below...'}
              </span>
              <ChevronDown className={`w-5 h-5 transition ${showDatePicker ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Date Grid */}
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 transition-all ${
              showDatePicker ? 'block' : 'hidden'
            }`}
          >
            {workshopDates.map((dateOption) => (
              <div
                key={dateOption.id}
                onClick={() => {
                  setSelectedDate(dateOption);
                  setShowDatePicker(false);
                }}
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  selectedDate?.id === dateOption.id
                    ? 'border-swar-600 bg-swar-100'
                    : 'border-swar-200 hover:border-swar-400'
                }`}
              >
                <div className="font-semibold text-swar-700 mb-2">
                  {dateOption.date.toLocaleDateString('en-IN', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-sm text-swar-600 space-y-1 mb-3">
                  <div>📍 {dateOption.mode?.toUpperCase() || 'Online'}</div>
                  <div>🗣️ {dateOption.language?.toUpperCase() || 'English'}</div>
                  <div>👥 {dateOption.availableSeats} seats available</div>
                  <div className="font-bold text-swar-700">₹{dateOption.price.toLocaleString()}</div>
                </div>
                {dateOption.instructors && (
                  <div className="text-xs text-swar-text-secondary">
                    Instructors: {dateOption.instructors.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pay Now Button */}
          {selectedDate && (
            <div className="bg-swar-50 border-l-4 border-swar-600 p-4 rounded mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-swar-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-swar-700 mb-1">Ready to Book?</h3>
                  <p className="text-sm text-swar-text-secondary mb-3">
                    You have selected <strong>{workshopName}</strong> on{' '}
                    <strong>{selectedDate.date.toLocaleDateString()}</strong> for ₹
                    {selectedDate.price.toLocaleString()}
                  </p>
                  <button
                    onClick={() => handlePayNow(selectedDate)}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-swar-600 text-white rounded-lg hover:bg-swar-700 transition font-semibold"
                  >
                    💳 Pay Now
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* No Dates Available - Show Enquiry Form */
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">ℹ️ No dates available yet</h3>
          <p className="text-sm text-yellow-800 mb-4">
            This workshop doesn't have scheduled dates at the moment. Submit an enquiry and we'll contact you with
            available dates!
          </p>
        </div>
      )}

      {/* Enquiry Form Button/Form */}
      <div className="border-t-2 border-swar-200 pt-6">
        <button
          onClick={() => setShowEnquiryForm(!showEnquiryForm)}
          className="w-full px-6 py-3 bg-swar-100 text-swar-700 rounded-lg hover:bg-swar-200 transition font-semibold flex items-center justify-between"
        >
          📧 {showEnquiryForm ? 'Hide' : 'Submit'} Enquiry Form
          <ChevronDown className={`w-5 h-5 transition ${showEnquiryForm ? 'rotate-180' : ''}`} />
        </button>

        {/* Enquiry Form */}
        {showEnquiryForm && (
          <form onSubmit={handleEnquirySubmit} className="mt-4 p-4 bg-swar-50 rounded-lg space-y-4">
            <div>
              <label className="block text-sm font-semibold text-swar-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={enquiryForm.name}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-swar-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-600"
                placeholder="Your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={enquiryForm.email}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                className="w-full px-3 py-2 border border-swar-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-600"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={enquiryForm.phone}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                className="w-full px-3 py-2 border border-swar-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-600"
                placeholder="+91 9XXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-swar-700 mb-1">Message (Optional)</label>
              <textarea
                value={enquiryForm.message}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                className="w-full px-3 py-2 border border-swar-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-600"
                placeholder="Tell us more about your interest..."
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2"
            >
              ✉️ Send Enquiry
            </button>
          </form>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-8 border-t border-swar-200">
        <div className="text-center p-4">
          <div className="text-3xl mb-2">🎯</div>
          <h4 className="font-semibold text-swar-700 mb-1">Expert Guidance</h4>
          <p className="text-sm text-swar-text-secondary">Learn from experienced Swar Yoga instructors</p>
        </div>
        <div className="text-center p-4">
          <div className="text-3xl mb-2">🌍</div>
          <h4 className="font-semibold text-swar-700 mb-1">Online & Offline</h4>
          <p className="text-sm text-swar-text-secondary">Choose what works best for you</p>
        </div>
        <div className="text-center p-4">
          <div className="text-3xl mb-2">🔄</div>
          <h4 className="font-semibold text-swar-700 mb-1">Flexible Scheduling</h4>
          <p className="text-sm text-swar-text-secondary">Multiple dates available every month</p>
        </div>
      </div>
    </div>
  );
}
