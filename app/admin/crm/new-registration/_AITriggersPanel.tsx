import React, { useState, useEffect } from 'react';
import { Calendar, Repeat, MessageSquare, Send, CheckCircle, Clock, Save, Zap, X, Users, Edit2, Trash2 } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { useAuth } from '@/hooks/useAuth';

export function AITriggersPanel({ 
  workshops, 
  leadsData,
  selectedLanguage = 'English',
  selectedBatchId = '',
  batchDecisions = {}
}: { 
  workshops: any[]; 
  leadsData: any[];
  selectedLanguage?: string;
  selectedBatchId?: string;
  batchDecisions?: Record<string, any>;
}) {
  // If no batch is selected from the top header, show a blank or placeholder state as requested
  if (!selectedBatchId) {
    return <div className="p-6 text-center text-gray-500 mt-20">Please select a Language and Batch in the top header and click Submit.</div>;
  }
  const toast = useToast();
  const token = useAuth();
  
  // Form State
  const [channel, setChannel] = useState<'meta' | 'qr' | 'group'>('meta');
  
  const [template, setTemplate] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('crm_ai_draft_template') || '';
    return '';
  });
  
  const [targetCategory, setTargetCategory] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('crm_ai_draft_category') || 'All Leads';
    return 'All Leads';
  });
  
  // Group State
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  // Preview Modal
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  
  // Schedule State
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai_draft_dates');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [repeatMode, setRepeatMode] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Auto-save draft states
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_ai_draft_template', template);
      localStorage.setItem('crm_ai_draft_category', targetCategory);
      localStorage.setItem('crm_ai_draft_dates', JSON.stringify(selectedDates));
    }
  }, [template, targetCategory, selectedDates]);

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Trigger List
  const [triggers, setTriggers] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai_triggers');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_ai_triggers', JSON.stringify(triggers));
    }
  }, [triggers]);

  useEffect(() => {
    if (token) {
      fetchTemplates();
      fetchGroups();
    }
  }, [token]);

  // Background Worker for Executing Triggers
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // YYYY-MM-DD local timezone
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDateString = `${year}-${month}-${day}`;
      
      const currentHourStr = now.getHours().toString().padStart(2, '0');
      const currentMinStr = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHourStr}:${currentMinStr}`;

      setTriggers(prevTriggers => {
        let triggersUpdated = false;
        const newTriggers = [...prevTriggers];

        newTriggers.forEach((t) => {
          if (t.status !== 'active') return;
          if (t.lastRunTime === currentTime && t.lastRunDate === currentDateString) return;

          // Check if today is a valid date for this trigger
          let shouldRunToday = false;
          if (t.dates.includes(currentDateString)) {
             shouldRunToday = true;
          } else if (t.dates.length > 0) {
             const startDate = new Date(t.dates[0]);
             if (now.getTime() >= startDate.getTime()) {
                if (t.repeat === 'daily') shouldRunToday = true;
                else if (t.repeat === 'weekly' && now.getDay() === startDate.getDay()) shouldRunToday = true;
                else if (t.repeat === 'monthly' && now.getDate() === startDate.getDate()) shouldRunToday = true;
             }
          }

          if (shouldRunToday) {
            // Check if time matches
            if (t.time === currentTime) {
              console.log("EXECUTING AI TRIGGER:", t);
              t.lastRunTime = currentTime;
              t.lastRunDate = currentDateString;
              triggersUpdated = true;

              // Process trigger in background
              const runTrigger = async () => {
                  try {
                      // Filter leads based on targetCategory
                      const targetLeads = leadsData.filter(l => {
                        const dec = batchDecisions[l.id] || {};
                        const status = dec.status || 'new_leads';
                        
                        if (t.targetCategory === 'All Leads') return true;
                        if (t.targetCategory === 'New Leads') return true; 
                        if (t.targetCategory === 'Pending Leads') return status.includes('pending') && !dec.isRejected && !dec.isRegistered;
                        if (t.targetCategory === 'Pending Leads-1') return status === 'pending_leads_1' && !dec.isRejected && !dec.isRegistered;
                        if (t.targetCategory === 'Pending Leads-2') return status === 'pending_leads_2' && !dec.isRejected && !dec.isRegistered;
                        if (t.targetCategory === 'Pending Leads-3') return status === 'pending_leads_3' && !dec.isRegistered;
                        if (t.targetCategory === 'Aprovel-1') return dec.status && !['new_leads', 'pending_leads_1'].includes(dec.status);
                        if (t.targetCategory === 'Aprovel-2') return ['approval_2', 'pending_leads_3'].includes(status) && !dec.isRejected;
                        if (t.targetCategory === 'Registerd leads') return dec.isRegistered;
                        if (t.targetCategory === 'Rejected leads') return dec.isRejected;
                        
                        return false;
                      });

                      const validLeads = targetLeads.filter(l => {
                          const meta = l.metadata || {};
                          if (meta.wtLastTemplates && meta.wtLastTemplates[t.template]) {
                              const diff = Date.now() - new Date(meta.wtLastTemplates[t.template]).getTime();
                              if (diff < 48 * 60 * 60 * 1000) return false;
                          } else if (meta.wtStatus === 'sent' || meta.wtStatus === 'delivered') {
                              if (l.updatedAt) {
                                  const diff = Date.now() - new Date(l.updatedAt).getTime();
                                  if (diff < 48 * 60 * 60 * 1000) return false;
                              } else {
                                  return false;
                              }
                          }
                          return true;
                      });

                      const leadIds = validLeads.map(l => l.id || l._id).filter(Boolean);

                      if (leadIds.length > 0 && t.channel === 'meta') {
                         await fetch('/api/admin/crm/meta-leads/trigger-wt-now', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ids: leadIds, template: t.template })
                         });
                         console.log(`AI Trigger ${t.id} completed. Sent to ${leadIds.length} leads.`);
                      }
                  } catch (err) {
                      console.error("AI Trigger failed:", err);
                  }
              };
              
              runTrigger();
            }
          }
        });

        return triggersUpdated ? newTriggers : prevTriggers;
      });

    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, [leadsData, batchDecisions]);

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

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch('/api/admin/crm/whatsapp/groups', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const toggleDate = (date: string) => {
    setSelectedDates(prev => 
      prev.includes(date) 
        ? prev.filter(d => d !== date)
        : [...prev, date]
    );
  };

  const handleSaveTrigger = async () => {
    if (selectedDates.length === 0) {
      toast.error('Please select at least one date in the calendar.');
      return;
    }
    if (!template) {
      toast.error('Please select a template to send.');
      return;
    }
    if (channel === 'group' && !selectedGroupId) {
      toast.error('Please select a WhatsApp Group.');
      return;
    }
    
    let finalAudience = '';
    const batchName = selectedBatchId ? workshops?.find(w => w.id === selectedBatchId)?.name || selectedBatchId : 'All Batches';

    if (channel === 'group') {
      const gName = groups.find(g => (g.id || g._id) === selectedGroupId)?.subject || 'WhatsApp Group';
      finalAudience = `Group: ${gName}`;
    } else {
      finalAudience = `${selectedLanguage} | ${batchName} | ${targetCategory}`;
    }

    try {
        toast.info('Scheduling broadcasts...');
        for (const dateStr of selectedDates) {
            const [yyyy, mm, dd] = dateStr.split('-');
            const [hh, min] = scheduleTime.split(':');
            const scheduledAt = new Date(Number(yyyy), Number(mm)-1, Number(dd), Number(hh), Number(min)).toISOString();

            let targetStatus = undefined;
            if (targetCategory === 'All Leads') targetStatus = undefined;
            else if (targetCategory === 'New Leads') targetStatus = 'new';
            else if (targetCategory === 'Pending Leads') targetStatus = 'pending';
            else if (targetCategory === 'Pending Leads-1') targetStatus = 'stage_1_pending';
            else if (targetCategory === 'Pending Leads-2') targetStatus = 'stage_2_pending';
            else if (targetCategory === 'Pending Leads-3') targetStatus = 'stage_3_pending';
            else if (targetCategory === 'Aprovel-1') targetStatus = 'stage_1_approved';
            else if (targetCategory === 'Aprovel-2') targetStatus = 'stage_2_approved';
            else if (targetCategory === 'Rejected leads') targetStatus = 'rejected';
            else if (targetCategory === 'Registerd leads') targetStatus = 'registered';
            else if (targetCategory === 'Set zoom meeting') targetStatus = 'zoom_meeting';
            else if (targetCategory === 'Take Zoom Meeting') targetStatus = 'take_zoom_meeting';

            const payload = {
                name: `AI Trigger: ${template} (${dateStr} ${scheduleTime})`,
                templateId: templates.find(t => t.templateName === template)?.id || templates.find(t => t.templateName === template)?._id || template,
                provider: channel,
                mode: 'schedule',
                scheduleAt: scheduledAt,
                target: {
                    type: 'filters',
                    filters: {
                        workshopName: selectedBatchId ? batchName : undefined,
                        status: targetStatus
                    }
                }
            };
            
            const res = await fetch('/api/admin/crm/broadcast-runs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('token') || ''}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to schedule broadcast');
            }
        }

        const newTrigger = {
          id: Date.now().toString(),
          channel,
          template,
          audience: finalAudience,
          targetGroupId: channel === 'group' ? selectedGroupId : undefined,
          targetCategory,
          dates: selectedDates,
          time: scheduleTime,
          repeat: repeatMode,
          status: 'active'
        };
        
        setTriggers([newTrigger, ...triggers]);
        toast.success('AI Trigger scheduled successfully via Broadcast system!');
    } catch (e: any) {
        toast.error(`Error scheduling: ${e.message}`);
    }
  };

  const handleEditTrigger = (trigger: any) => {
    setChannel(trigger.channel);
    setTemplate(trigger.template);
    setTargetCategory(trigger.targetCategory || 'All Leads');
    if (trigger.channel === 'group' && trigger.targetGroupId) {
      setSelectedGroupId(trigger.targetGroupId);
    }
    setSelectedDates(trigger.dates);
    setScheduleTime(trigger.time);
    setRepeatMode(trigger.repeat);
    setTriggers(prev => prev.filter(t => t.id !== trigger.id));
  };

  const handleDeleteTrigger = (id: string) => {
    setTriggers(prev => prev.filter(t => t.id !== id));
    toast.success('Trigger deleted');
  };

  const filteredPreviewLeads = React.useMemo(() => {
    if (!targetCategory || targetCategory === 'All Leads') return leadsData;
    
    return leadsData.filter(l => {
      const dec = batchDecisions[l.id] || {};
      const status = dec.status || 'new_leads';
      
      if (targetCategory === 'New Leads') return true; 
      if (targetCategory === 'Pending Leads') return status.includes('pending') && !dec.isRejected && !dec.isRegistered;
      if (targetCategory === 'Pending Leads-1') return status === 'pending_leads_1' && !dec.isRejected && !dec.isRegistered;
      if (targetCategory === 'Pending Leads-2') return status === 'pending_leads_2' && !dec.isRejected && !dec.isRegistered;
      if (targetCategory === 'Pending Leads-3') return status === 'pending_leads_3' && !dec.isRegistered;
      if (targetCategory === 'Aprovel-1') return dec.status && !['new_leads', 'pending_leads_1'].includes(dec.status);
      if (targetCategory === 'Aprovel-2') return ['approval_2', 'pending_leads_3'].includes(status) && !dec.isRejected;
      if (targetCategory === 'Registerd leads') return dec.isRegistered;
      if (targetCategory === 'Rejected leads') return dec.isRejected;
      
      return false;
    });
  }, [leadsData, targetCategory, batchDecisions]);

  const filteredWorkshops = React.useMemo(() => {
    if (!workshops) return [];
    return workshops.filter(w => 
      (!w.language || w.language.toLowerCase() === selectedLanguage.toLowerCase()) &&
      w.id?.startsWith('batch_')
    );
  }, [workshops, selectedLanguage]);

  const filteredTemplates = React.useMemo(() => {
    if (!templates) return [];
    return templates;
  }, [templates]);

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
              
              {channel === 'group' && (
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1 block">WhatsApp Group (QR Bridge)</label>
                  <select 
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 outline-none transition"
                  >
                    <option value="">-- Select a Group --</option>
                    {loadingGroups ? (
                      <option value="" disabled>Loading groups...</option>
                    ) : (
                      groups.map(g => (
                        <option key={g.id || g._id} value={g.id || g._id}>{g.name || g.subject || 'Unnamed Group'}</option>
                      ))
                    )}
                  </select>
                </div>
              )}

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
              {channel !== 'group' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="col-span-1">
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
              )}
            </div>

              {/* Scheduling & Recurrence */}
              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mt-2">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5"><Calendar size={14} className="text-violet-500"/> Schedule Dates</label>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsPreviewModalOpen(true)}
                      className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 transition"
                    >
                      <Users size={12} /> Preview ({filteredPreviewLeads.length})
                    </button>
                    
                    <button 
                      onClick={handleSaveTrigger}
                      className="text-xs font-semibold bg-violet-600 text-white px-3 py-1 rounded-lg border border-violet-600 hover:bg-violet-700 shadow-sm hover:shadow transition flex items-center gap-1 ml-1"
                    >
                      <Save size={12} /> Save
                    </button>

                    <Repeat size={14} className="text-gray-400 ml-2" />
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
              <div className="flex justify-between items-center mb-2 px-1">
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 font-bold text-sm transition"
                >
                  &lt;
                </button>
                <span className="text-sm font-bold text-gray-800">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
                  className="p-1 hover:bg-gray-100 rounded text-gray-500 font-bold text-sm transition"
                >
                  &gt;
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1.5 mb-4">
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => {
                  const day = i + 1;
                  const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const isSelected = selectedDates.includes(dateStr);
                  return (
                    <button
                      key={dateStr}
                      onClick={() => toggleDate(dateStr)}
                      className={`
                        h-8 w-full rounded-md text-xs font-bold transition-all duration-200
                        ${isSelected 
                          ? 'bg-violet-600 text-white shadow-md scale-105 ring-2 ring-violet-200 ring-offset-1' 
                          : 'bg-gray-50 text-gray-600 hover:bg-violet-100 hover:text-violet-700'
                        }
                      `}
                    >
                      {day}
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
              className="w-full mt-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} /> Submit Trigger
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
                  <div className="flex flex-col gap-2 items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-green-100 text-green-700 rounded-full">Active</span>
                    <div className="flex gap-2 mt-1">
                      <button 
                        onClick={() => handleEditTrigger(trigger)}
                        className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-md transition"
                        title="Edit Trigger"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteTrigger(trigger.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"
                        title="Delete Trigger"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-4">
                    <span className="text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md text-xs">
                      <Calendar size={12} /> {trigger.dates.length} date(s)
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

      {/* ── Template Selector Modal ── */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsTemplateModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-gray-900 text-lg">Select a Template</h3>
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<span class="animate-spin inline-block mr-1">⟳</span> Syncing...';
                    btn.disabled = true;
                    try {
                      await fetch('/api/admin/crm/templates/meta/sync?import=true', {
                        headers: { authorization: `Bearer ${localStorage.getItem('token')}` }
                      });
                      await fetchTemplates();
                    } catch (err) {}
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                  }}
                  className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm flex items-center"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Sync Meta Templates
                </button>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              {loadingTemplates ? (
                <div className="text-center py-10 text-gray-500 text-sm">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No templates found for {selectedLanguage}.</div>
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
                  {filteredTemplates.map(t => {
                    const tName = t.templateName || t.name;
                    const tid = t._id || t.id || tName;
                    const isExpanded = expandedTemplateId === tid;
                    
                    return (
                      <div 
                        key={tid}
                        className={`border p-4 rounded-xl transition-all flex flex-col ${
                          template === tName ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-300'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1 cursor-pointer" onClick={() => { setTemplate(tName); setIsTemplateModalOpen(false); }}>
                          <h4 className="font-semibold text-gray-900 text-sm">{tName}</h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-2">
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md">{t.language || 'en'}</span>
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md capitalize">{t.provider || 'unknown'}</span>
                          <span className={`px-2 py-0.5 rounded-md ${t.status === 'APPROVED' || t.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {t.status || 'unknown'}
                          </span>
                        </div>
                        
                        <div className="mt-auto pt-2 border-t border-gray-100">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTemplateId(isExpanded ? null : tid);
                            }}
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            {isExpanded ? 'Hide Content ↑' : 'Show Full Content ↓'}
                          </button>
                        </div>
                        
                        {isExpanded && (() => {
                          const bodyText = t.components?.find((c: any) => c.type === 'BODY')?.text || t.body || t.content || t.message || 'No content preview available.';
                          const headerMediaUrl = t.headerMedia?.url || t.components?.find((c: any) => c.type === 'HEADER')?.example?.header_handle?.[0];
                          return (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap max-h-60 overflow-y-auto border border-gray-100">
                              {headerMediaUrl && (
                                <div className="mb-3 rounded-lg overflow-hidden border border-gray-200">
                                  {/* Use regular img tag since we don't know domains for next/image */}
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={headerMediaUrl} alt="Template Header" className="w-full h-auto object-cover max-h-32" />
                                </div>
                              )}
                              <div className="font-medium">{bodyText}</div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Leads Modal ── */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPreviewModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                <Users size={18} className="text-indigo-500" /> 
                Selected Leads ({filteredPreviewLeads.length})
              </h3>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              {filteredPreviewLeads.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">No leads match the selected Language and Batch.</div>
              ) : (
                <div className="space-y-2">
                  {filteredPreviewLeads.map((lead, idx) => {
                    const raw = lead._rawRecord || {};
                    const name = lead.name || raw['Name'] || raw['NAME'] || 'Unknown';
                    const mobile = lead.mobile || lead.phoneNumber || raw['Mobile'] || raw['MOBILE'] || 'No number';
                    
                    return (
                      <div key={lead.id || idx} className="bg-white border border-gray-100 rounded-lg p-3 flex justify-between items-center shadow-sm">
                        <div className="font-semibold text-sm text-gray-800">{name}</div>
                        <div className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-mono font-medium">{mobile}</div>
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
