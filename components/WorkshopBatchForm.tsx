'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle, Loader2 } from 'lucide-react';

interface WorkshopBatchFormProps {
  workshopSlug: string;
  workshopName: string;
}

interface Schedule {
  _id: string;
  startDate: string;
  batch: string; // e.g., "Morning", "Evening"
  mode: string;
}

export default function WorkshopBatchForm({ workshopSlug, workshopName }: WorkshopBatchFormProps) {
  const router = useRouter();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string>('enquiry'); // 'enquiry' or scheduleId
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch(`/api/workshops/schedules?workshopSlug=${workshopSlug}`);
        if (res.ok) {
          const data = await res.json();
          // Filter only future schedules
          const future = (data.data || []).filter((s: any) => {
             const d = new Date(s.startDate);
             return d > new Date() || true; // Show all for now, maybe filter expired
          });
          setSchedules(future);
        }
      } catch (err) {
        console.error('Failed to load schedules', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedules();
  }, [workshopSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (selectedOption === 'enquiry') {
        // Send as generic enquiry
        const response = await fetch('/api/crm/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phoneNumber: formData.phone,
            source: 'workshop_page_form',
            workshopName: workshopName,
            status: 'lead',
            notes: `Interested in ${workshopName} (General Enquiry)`
          }),
        });

        if (response.ok) {
           alert('Thank you! We will contact you shortly.');
           setFormData({ name: '', email: '', phone: '' });
        } else {
           // If direct CRM fails, fallback or just alert
           alert('Something went wrong. Please try again.');
        }

      } else {
        // Selected a batch -> Redirect to register
        // Construct URL
        const batch = schedules.find(s => s._id === selectedOption);
        if (batch) {
             router.push(`/workshops/${workshopSlug}/register?scheduleId=${batch._id}&ref=page_form`);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Error submitting form');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to format date
  const formatMonth = (isoDate: string) => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100/50 backdrop-blur-sm bg-white/95">
      <h3 className="text-xl font-bold text-slate-800 mb-2">Join Upcoming Batch</h3>
      <p className="text-slate-500 text-sm mb-6">Select a schedule or enquire for details.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Batch Selection */}
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {/* Default Enquiry Option */}
          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
            selectedOption === 'enquiry' 
              ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
          }`}>
             <input 
               type="radio" 
               name="schedule" 
               value="enquiry"
               checked={selectedOption === 'enquiry'}
               onChange={(e) => setSelectedOption(e.target.value)}
               className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
             />
             <div>
               <div className="font-bold text-slate-700 text-sm">General Enquiry</div>
               <div className="text-xs text-slate-500">I'm interested but need more info</div>
             </div>
          </label>

          {loading ? (
             <div className="flex justify-center p-2"><Loader2 className="animate-spin text-slate-400 w-5 h-5"/></div>
          ) : (
             schedules.map((schedule) => (
                <label key={schedule._id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedOption === schedule._id 
                    ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
                    : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                }`}>
                  <input 
                    type="radio" 
                    name="schedule" 
                    value={schedule._id}
                    checked={selectedOption === schedule._id}
                    onChange={(e) => setSelectedOption(e.target.value)}
                    className="mt-1 w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
                  />
                  <div>
                    <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                       <Calendar className="w-3 h-3 text-slate-400"/>
                       {formatMonth(schedule.startDate)}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 font-medium">
                      {schedule.batch ? `Batch: ${schedule.batch}` : 'Standard Batch'}
                      {schedule.mode ? ` • ${schedule.mode}` : ''}
                    </div>
                  </div>
                </label>
             ))
          )}
        </div>

        {/* User Details */}
        <div className="pt-2 space-y-3">
          <input
            type="text"
            name="name"
            placeholder="Your Name *"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone Number *"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address (Optional)"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition-all ${
             selectedOption === 'enquiry' 
               ? 'bg-blue-600 hover:bg-blue-700' 
               : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="animate-spin w-4 h-4"/> Please wait...
            </span>
          ) : (
            selectedOption === 'enquiry' ? 'Send Enquiry' : 'Proceed to Book'
          )}
        </button>
        
        <p className="text-[10px] text-center text-slate-400">
           {selectedOption === 'enquiry' 
             ? 'Our team will contact you with details.' 
             : 'Secure checkout via our payment partner.'}
        </p>
      </form>
    </div>
  );
}
