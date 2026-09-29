import React, { useState, useEffect } from 'react';
import { Calendar, Repeat, MessageSquare, Send, CheckCircle, Clock, Save, Zap, X } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

export function AITriggersPanel({ workshops, leadsData }: { workshops: any[]; leadsData: any[] }) {
  const toast = useToast();
  const token = useAuth();
  
  // Form State
  const [channel, setChannel] = useState<'meta' | 'qr' | 'group'>('meta');
  const [template, setTemplate] = useState('');
  const [targetLang, setTargetLang] = useState('English');
  const [targetBatch, setTargetBatch] = useState('');
  const [targetCategory, setTargetCategory] = useState('All Leads');
  
  // Schedule State
  const [selectedDates, setSelectedDates] = useState<number[]>([]);
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [repeatMode, setRepeatMode] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('monthly');

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Trigger List
  const [triggers, setTriggers] = useState<any[]>([]);

  useEffect(() => {
    if (token) fetchTemplates();
  }, [token]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const url = new URL('/api/admin/crm/templates', typeof window !== 'undefined' ? window.location.origin : '');
      url.searchParams.append('limit', '100');
      
      const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.templates) setTemplates(data.templates);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const toggleDate = (date: number) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const handleSaveTrigger = () => {
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date in the calendar.');
      return;
    }
    if (!template) {
      toast.error('Please select a template to send.');
      return;
    }
    
    const batchName = targetBatch ? workshops?.find(w => w.id === targetBatch)?.name || targetBatch : 'All Batches';
    const finalAudience = `${targetLang} | ${batchName} | ${targetCategory}`;
    
    const newTrigger = {
      id: Date.now().toString(),
      channel,
      template,
      audience: finalAudience,
      dates: selectedDates,
      time: scheduleTime,
      repeat: repeatMode,
      status: 'active'
    };
    
    setTriggers([newTrigger, ...triggers]);
    toast.success('AI Trigger scheduled successfully!');
    
    // Reset form
    setSelectedDates([]);
    setTemplate('');
  };

  return (
    <div className="p-6 bg-white min-h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6">
      
      {/* ── Left Side: Create Trigger Form ── */}
      <div className="w-full lg:w-1/2 flex flex-col gap-6">
        <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl p-6 border border-indigo-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <Zap size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Create AI Trigger</h2>
              <p className="text-xs text-gray-500">Schedule automatic recurring broadcasts</p>
            </div>
          </div>

          <div className="space-y-5">
            {/* Channel Selection */}
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><MessageSquare size={14}/> Channel</label>
              <div className="flex gap-2">
                {(['meta', 'qr', 'group'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
                      channel === c 
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {c === 'meta' ? 'Meta' : c === 'qr' ? 'QR Bridge' : 'Group'}
                  </button>
                ))}
              </div>
            </div>

            {/* Template & Target Selection (Two Rows) */}
            <div className="flex flex-col gap-4">
              {/* Row 1: Template Name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Template Name</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 flex items-center">
                    {template || 'No template selected'}
                  </div>
                  <button 
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Select Template
                  </button>
                </div>
              </div>

              {/* Row 2: Target Audience Filters */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Language</label>
                  <select 
                    value={targetLang}
                    onChange={e => setTargetLang(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Marathi">Marathi</option>
                    <option value="Kannada">Kannada</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Batch</label>
                  <select 
                    value={targetBatch}
                    onChange={e => setTargetBatch(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition"
                  >
                    <option value="">All Batches</option>
                    {workshops?.map(w => (
                      <option key={w.id} value={w.id} title={w.name}>{w.name.length > 20 ? w.name.substring(0, 20) + '...' : w.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">Category</label>
                  <select 
                    value={targetCategory}
                    onChange={e => setTargetCategory(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition"
                  >
                    <option value="All Leads">All Leads</option>
                    <option value="New Leads">New Leads</option>
                    <option value="Pending Leads">Pending Leads</option>
                    <option value="Pending Leads-1">Pending Leads-1</option>
                    <option value="Pending Leads-2">Pending Leads-2</option>
                    <option value="Pending Leads-3">Pending Leads-3</option>
                    <option value="Aprovel-1">Aprovel-1</option>
                    <option value="Aprovel-2">Aprovel-2</option>
                    <option value="Registerd leads">Registerd leads</option>
                    <option value="Set zoom meeting">Set zoom meeting</option>
                    <option value="Take Zoom Meeting">Take Zoom Meeting</option>
                    <option value="Rejected leads">Rejected leads</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Scheduling & Recurrence */}
            <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mt-2">
              <div className="flex items-center justify-between mb-4">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5"><Calendar size={14} className="text-violet-500"/> Schedule Dates</label>
                <div className="flex items-center gap-2">
                  <Repeat size={14} className="text-gray-400" />
                  <select 
                    value={repeatMode}
                    onChange={e => setRepeatMode(e.target.value as any)}
                    className="text-xs font-semibold bg-gray-50 border-none rounded-lg px-2 py-1 text-gray-700 outline-none"
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              {/* Mini Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5 mb-4">
                {Array.from({ length: 31 }, (_, i) => i + 1).map(date => {
                  const isSelected = selectedDates.includes(date);
                  return (
                    <button
                      key={date}
                      onClick={() => toggleDate(date)}
                      className={`
                        h-8 w-full rounded-md text-xs font-bold transition-all duration-200
                        ${isSelected 
                          ? 'bg-violet-600 text-white shadow-md scale-105 ring-2 ring-violet-200 ring-offset-1' 
                          : 'bg-gray-50 text-gray-600 hover:bg-violet-100 hover:text-violet-700'
                        }
                      `}
                    >
                      {date}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Clock size={14}/> Time</label>
                <input 
                  type="time" 
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-800 outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleSaveTrigger}
              className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> Save AI Trigger
            </button>
          </div>
        </div>
      </div>

      {/* ── Right Side: Active Triggers ── */}
      <div className="w-full lg:w-1/2 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-2">
          <Clock size={16} className="text-indigo-500"/> Scheduled Triggers
        </h3>
        
        {triggers.length === 0 ? (
          <div className="flex-1 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
              <Calendar className="text-gray-300 w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-gray-600">No triggers scheduled</p>
            <p className="text-xs text-gray-400 mt-1">Create an AI trigger on the left to automate your broadcasts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {triggers.map(trigger => (
              <div key={trigger.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition group">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ${
                      trigger.channel === 'meta' ? 'bg-blue-500' : trigger.channel === 'qr' ? 'bg-emerald-500' : 'bg-orange-500'
                    }`}>
                      <Send size={14} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">{trigger.template}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <Users size={12} /> {trigger.audience}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-4">
                    <span className="text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                      <Calendar size={12} /> Dates: {trigger.dates.sort((a: number, b: number) => a - b).join(', ')}
                    </span>
                    <span className="text-gray-600 flex items-center gap-1">
                      <Clock size={12} /> {trigger.time}
                    </span>
                  </div>
                  <span className="text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md">
                    <Repeat size={12} /> {trigger.repeat}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>

      {/* ── Template Selector Modal ── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg">Select a Template</h3>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              {loadingTemplates ? (
                <div className="text-center py-10 text-gray-500 text-sm">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No templates found.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div 
                    onClick={() => { setTemplate('custom_message'); setIsTemplateModalOpen(false); }}
                    className={`cursor-pointer border p-4 rounded-xl transition-all ${
                      template === 'custom_message' ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-300'
                    }`}
                  >
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">custom_message</h4>
                    <p className="text-xs text-gray-500">(Manual)</p>
                  </div>
                  {templates.map(t => {
                    const tName = t.templateName || t.name;
                    return (
                      <div 
                        key={t._id || t.id || tName}
                        onClick={() => { setTemplate(tName); setIsTemplateModalOpen(false); }}
                        className={`cursor-pointer border p-4 rounded-xl transition-all ${
                          template === tName ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-300'
                        }`}
                      >
                        <h4 className="font-semibold text-gray-900 text-sm mb-1">{tName}</h4>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md">{t.language || 'en'}</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md capitalize">{t.provider || 'unknown'}</span>
                          <span className={`px-2 py-0.5 rounded-md ${t.status === 'APPROVED' || t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {t.status || 'unknown'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
