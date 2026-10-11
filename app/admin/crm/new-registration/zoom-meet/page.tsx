'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { Calendar, Clock, CheckCircle2, User, Phone, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

function BookZoomPage() {
  const searchParams = useSearchParams();
  const batchId = searchParams.get('batchId');

  const [setupData, setSetupData] = useState<{ time: string; link: string }[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [batchSlots, setBatchSlots] = useState<Record<string, { time: string; link: string }[]>>({});
  const [joiningLink, setJoiningLink] = useState('');

  useEffect(() => {
    if (!batchId) return;
    const controller = new AbortController();
    fetch(`/api/registration/zoom-booking?batchId=${encodeURIComponent(batchId)}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load meeting slots');
        setBatchSlots(data.data);
        setAvailableDates(Object.keys(data.data).sort());
      })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [batchId]);

  useEffect(() => {
    if (selectedDate && batchId) {
      setSetupData(batchSlots[selectedDate] || []);
    } else {
      setSetupData([]);
    }
    setSelectedSlot('');
  }, [selectedDate, batchId, batchSlots]);

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !batchId) {
      setError('Please select a date and time.');
      return;
    }
    if (!name || !whatsapp || !email) {
      setError('Please fill in your Name, WhatsApp, and Email.');
      return;
    }

    setIsBooking(true);
    setError('');
    try {
      const response = await fetch('/api/registration/zoom-booking', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId, name, whatsapp, email, date: selectedDate, time: selectedSlot }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Booking was not saved');
      setJoiningLink(data.data.link);
      setIsSuccess(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Booking was not saved');
    } finally {
      setIsBooking(false);
    }
  };

  if (!batchId) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center p-6 bg-red-50 rounded-xl text-red-800 border border-red-200">
          <p className="font-bold">Invalid Link</p>
          <p className="text-sm mt-1">This link is missing the batch identifier. Please check the link and try again.</p>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <CheckCircle2 size={64} className="text-emerald-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-slate-800 mb-2">Booking Confirmed!</h1>
          <p className="text-slate-600 mb-6">
            Thank you, {name}! Your 10-minute Zoom meeting is scheduled for <br/>
            <strong className="text-slate-800">{selectedDate}</strong> at <strong className="text-slate-800">{selectedSlot}</strong>.
          </p>
          <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
            Your booking is saved. <a href={joiningLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Open your Zoom meeting</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 mb-3">Final Zoom Meeting</h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Thanks for showing interest in the Swar Yoga workshop. Your form has been 
            <strong className="text-emerald-600"> approved</strong> for the workshop!
            <br/><br/>
            We need a final 10-minute Zoom meeting for all queries and details. Please verify your details and select a slot.
          </p>
        </div>

        {availableDates.length === 0 ? (
          <div className="text-center p-6 bg-yellow-50 rounded-xl text-yellow-800 border border-yellow-200">
            <p className="font-bold">No slots available</p>
            <p className="text-sm mt-1">The administrator has not configured any time slots for this batch yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* User Details Form */}
            <div className="space-y-4 bg-slate-50 p-5 rounded-xl border border-slate-100">
              <h3 className="font-bold text-slate-700 mb-2">Your Details</h3>
              
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="WhatsApp Number (e.g. +91 9876543210)"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
              
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" /> Select Date
              </label>
              <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
                {availableDates.map((date, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedDate(date)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                      selectedDate === date 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    {date}
                  </button>
                ))}
              </div>
            </div>

            {selectedDate && setupData.length > 0 && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-500" /> Select Time Slot
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {setupData.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot.time)}
                      className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${
                        selectedSlot === slot.time 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm font-bold text-center">{error}</p>}

            <button
              onClick={handleBook}
              disabled={isBooking || !selectedDate || !selectedSlot || !name || !whatsapp || !email}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selectedDate && selectedSlot && name && whatsapp && email
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Confirm Booking
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ZoomBookingPage() {
  return <Suspense fallback={<div className="p-8 text-center">Loading meeting slots...</div>}><BookZoomPage /></Suspense>;
}
