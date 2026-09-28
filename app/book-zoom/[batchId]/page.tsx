'use client';
import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, User, Phone, Mail } from 'lucide-react';

export default function BookZoomPage({ params }: { params: { batchId: string } }) {
  const [setupData, setSetupData] = useState<{ time: string; link: string }[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Read the setup data from localStorage (For prototype)
    const saved = localStorage.getItem('crm_zoom_setup_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const batchData = parsed[params.batchId] || {};
        // batchData is { "YYYY-MM-DD": [ {time: "10:00 AM", link: "..."} ] }
        setAvailableDates(Object.keys(batchData).sort());
      } catch (e) {}
    }
  }, [params.batchId]);

  useEffect(() => {
    if (selectedDate) {
      const saved = localStorage.getItem('crm_zoom_setup_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const batchData = parsed[params.batchId] || {};
          setSetupData(batchData[selectedDate] || []);
        } catch (e) {}
      }
    } else {
      setSetupData([]);
    }
    setSelectedSlot('');
  }, [selectedDate, params.batchId]);

  const handleBook = () => {
    if (!selectedDate || !selectedSlot) {
      setError('Please select a date and time.');
      return;
    }
    if (!name || !whatsapp || !email) {
      setError('Please fill in your Name, WhatsApp, and Email.');
      return;
    }

    const slotInfo = setupData.find(s => s.time === selectedSlot);
    
    // Save to a public bookings queue in localStorage
    const savedBookings = localStorage.getItem('crm_public_zoom_bookings');
    const parsedBookings = savedBookings ? JSON.parse(savedBookings) : [];
    
    parsedBookings.push({
      batchId: params.batchId,
      name,
      whatsapp: whatsapp.replace(/\D/g, ''),
      email: email.toLowerCase().trim(),
      date: selectedDate,
      time: selectedSlot,
      link: slotInfo?.link || '',
      submittedAt: new Date().toISOString()
    });
    
    localStorage.setItem('crm_public_zoom_bookings', JSON.stringify(parsedBookings));
    
    setIsSuccess(true);
  };

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
            Please check your WhatsApp / Email. We will verify your details and send you the joining link shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full">
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
              disabled={!selectedDate || !selectedSlot || !name || !whatsapp || !email}
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
