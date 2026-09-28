'use client';
import React, { useState, useEffect } from 'react';
import CrmSubNav from '@/components/admin/crm/CrmSubNav';
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Trash2, Link as LinkIcon, X } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';

// Helper to get days in a month
const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

interface ZoomSlot {
  time: string;
  link: string;
}

export default function ZoomMeetingSetupPage() {
  const toast = useToast();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedLang, setSelectedLang] = useState<string>('English');
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string>('');
  
  // Data for the selected batch: { "YYYY-MM-DD": [ {time: "10:00 AM", link: "..."} ] }
  const [setupData, setSetupData] = useState<Record<string, ZoomSlot[]>>({});

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Popup State
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [popupSlots, setPopupSlots] = useState<ZoomSlot[]>([]);

  useEffect(() => {
    const savedWorkshops = localStorage.getItem('crm_workshops');
    if (savedWorkshops) {
      try {
        setWorkshops(JSON.parse(savedWorkshops));
      } catch (e) {}
    }
  }, []);

  // Load data when workshop changes
  useEffect(() => {
    if (selectedWorkshopId) {
      const saved = localStorage.getItem('crm_zoom_setup_data');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSetupData(parsed[selectedWorkshopId] || {});
        } catch (e) {
          setSetupData({});
        }
      } else {
        setSetupData({});
      }
    }
  }, [selectedWorkshopId]);

  const languages = Array.from(new Set(workshops.map(w => w.language || 'English')));
  if (!languages.includes('English')) languages.unshift('English');

  const filteredWorkshops = workshops.filter(
    w => (w.language || 'English').toLowerCase() === selectedLang.toLowerCase() && w.id.startsWith('batch_')
  );

  const selectedWorkshop = workshops.find(w => w.id === selectedWorkshopId);

  // Calendar logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDateClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDateStr(dateStr);
    
    // Initialize 6 empty slots if none exist, else load existing
    const existingSlots = setupData[dateStr] || [];
    if (existingSlots.length > 0) {
      setPopupSlots(existingSlots);
    } else {
      setPopupSlots(Array(6).fill({ time: '', link: '' }));
    }
  };

  const handlePopupSave = () => {
    if (!selectedDateStr || !selectedWorkshopId) return;

    // Filter out empty slots
    const validSlots = popupSlots.filter(s => s.time.trim() !== '');

    const newSetupData = { ...setupData };
    if (validSlots.length > 0) {
      newSetupData[selectedDateStr] = validSlots;
    } else {
      delete newSetupData[selectedDateStr]; // Remove date if no slots
    }

    setSetupData(newSetupData);
    
    // Save to localStorage
    const saved = localStorage.getItem('crm_zoom_setup_data');
    const parsed = saved ? JSON.parse(saved) : {};
    parsed[selectedWorkshopId] = newSetupData;
    localStorage.setItem('crm_zoom_setup_data', JSON.stringify(parsed));
    
    toast.success('Slots saved for ' + selectedDateStr);
    setSelectedDateStr(null);
  };

  const updatePopupSlot = (index: number, field: 'time' | 'link', value: string) => {
    const newSlots = [...popupSlots];
    newSlots[index] = { ...newSlots[index], [field]: value };
    setPopupSlots(newSlots);
  };

  const addPopupSlot = () => {
    setPopupSlots([...popupSlots, { time: '', link: '' }]);
  };

  const removePopupSlot = (index: number) => {
    setPopupSlots(popupSlots.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <CrmSubNav 
        title="Zoom Meeting Setup" 
        icon={Calendar} 
        items={[]} 
      />
      
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-4">Zoom Meeting Setup</h2>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="w-full sm:w-1/3">
              <label className="block text-sm font-bold text-slate-600 mb-2">Language</label>
              <select 
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setSelectedWorkshopId('');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {languages.map(lang => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            
            <div className="w-full sm:w-2/3">
              <label className="block text-sm font-bold text-slate-600 mb-2">Workshop Batch</label>
              <select 
                value={selectedWorkshopId}
                onChange={(e) => setSelectedWorkshopId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Select a Batch --</option>
                {filteredWorkshops.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedWorkshopId && (
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-3 text-indigo-800">
              <LinkIcon size={20} className="text-indigo-600" />
              <div>
                <p className="text-sm font-bold">Public Booking Link for this batch</p>
                <p className="text-xs font-medium text-indigo-600/80">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/book-zoom/{selectedWorkshopId}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/book-zoom/${selectedWorkshopId}`;
                navigator.clipboard.writeText(link);
                toast.success('Public Booking Link copied to clipboard!');
              }}
              className="flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shrink-0"
            >
              Copy Link for WhatsApp
            </button>
          </div>
        )}

        {selectedWorkshopId ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Calendar className="text-indigo-600" /> 
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextMonth} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="h-24 bg-slate-50/50 rounded-xl border border-transparent" />
              ))}
              
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const hasSlots = setupData[dateStr] && setupData[dateStr].length > 0;
                
                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={`h-24 rounded-xl border p-2 flex flex-col items-start justify-start transition-all ${
                      hasSlots 
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className={`font-bold text-lg ${hasSlots ? 'text-blue-700' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    {hasSlots && (
                      <div className="mt-1 text-xs font-bold text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-full">
                        {setupData[dateStr].length} slots
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <Calendar size={48} className="text-slate-300 mb-4" />
            <h2 className="text-xl font-bold text-slate-700">Please select a batch</h2>
            <p className="text-sm mt-2 text-center max-w-sm">Select a language and a workshop batch from the filters above to configure Zoom dates and time slots.</p>
          </div>
        )}
      </main>

      {/* Date Configuration Popup */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Calendar className="text-indigo-600" />
                Time Slots for {selectedDateStr}
              </h3>
              <button onClick={() => setSelectedDateStr(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              <div className="space-y-4">
                {popupSlots.map((slot, index) => (
                  <div key={index} className="flex gap-4 items-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                    <button 
                      onClick={() => removePopupSlot(index)} 
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                      title="Remove Slot"
                    >
                      <Trash2 size={14} />
                    </button>
                    
                    <div className="w-1/3">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Time</label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="time"
                          value={slot.time}
                          onChange={(e) => updatePopupSlot(index, 'time', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                    
                    <div className="w-2/3">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zoom Meeting Link</label>
                      <div className="relative">
                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="url"
                          placeholder="https://zoom.us/j/..."
                          value={slot.link}
                          onChange={(e) => updatePopupSlot(index, 'link', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={addPopupSlot}
                className="mt-4 w-full py-3 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={18} /> Add Another Slot
              </button>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setSelectedDateStr(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePopupSave}
                className="px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all"
              >
                Save Slots
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
