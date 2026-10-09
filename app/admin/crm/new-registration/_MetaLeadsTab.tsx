'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, Facebook, Download, RefreshCw, Bot, Trash2, CheckCircle, Clock, XCircle, MessageCircle, Archive, Search, Filter, Settings, Play, Settings2, X, ChevronDown, ChevronUp, Database, Activity } from 'lucide-react';

export function MetaLeadsTab({ 
    selectedWorkshop, 
    saveWorkshopSettings, 
    refreshLeads
}: any) {
    const [formId, setFormId] = useState(selectedWorkshop?.metadata?.facebookFormId || '');

    // Self-contained Meta leads state — fetched independently from the parent
    const [metaLeads, setMetaLeads] = useState<any[]>([]);
    const [isFetchingLeads, setIsFetchingLeads] = useState(false);
    const [refreshMetaCounter, setRefreshMetaCounter] = useState(0);

    const internalRefresh = () => setRefreshMetaCounter(prev => prev + 1);

    useEffect(() => {
        if (!selectedWorkshop?.id) return;
        const token = typeof window !== 'undefined' ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '') : '';
        setIsFetchingLeads(true);
        const metaFormId = selectedWorkshop?.metadata?.facebookFormId || selectedWorkshop?.metadata?.metaFormId || '';
        fetch(`/api/admin/crm/meta-leads?workshopId=${encodeURIComponent(selectedWorkshop.id)}&metaFormId=${encodeURIComponent(metaFormId)}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(json => {
            if (json.success) setMetaLeads(json.data || []);
            else console.error('[MetaLeadsTab] Failed to fetch meta leads:', json.error);
        })
        .catch(e => console.error('[MetaLeadsTab] Error fetching meta leads:', e))
        .finally(() => setIsFetchingLeads(false));
    }, [selectedWorkshop?.id, refreshMetaCounter]);

    // State for Search and Filter
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');



    const [isAutoSync, setIsAutoSync] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
    
    // WhatsApp Manual Trigger Popup State (Bulk Actions)
    const [showManualWTPopup, setShowManualWTPopup] = useState(false);
    const [manualTemplate, setManualTemplate] = useState('');

    // WhatsApp Auto-Trigger Management Popup State
    const [showWTSettingsPopup, setShowWTSettingsPopup] = useState(false);
    const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');
    
    // Load existing WT settings or defaults
    const [wtSettings, setWtSettings] = useState({
        approved: { template: selectedWorkshop?.metadata?.wtSettings?.approved?.template || '', delay: selectedWorkshop?.metadata?.wtSettings?.approved?.delay || 5 },
        pending: { template: selectedWorkshop?.metadata?.wtSettings?.pending?.template || '', delay: selectedWorkshop?.metadata?.wtSettings?.pending?.delay || 30 }
    });
    const [showAI9Popup, setShowAI9Popup] = useState(false);
    const [ai9Config, setAi9Config] = useState<any>(selectedWorkshop?.metadata?.ai9Config || { 
        filters: [{ 
            question: '', 
            options: [{ answer: '', category: 'approved' }], 
            fallbackCategory: 'pending' 
        }],
        maxMismatches: 2,
        mismatchFallback: 'rejected'
    });

    // Dummy Lead State
    const [showDummyPopup, setShowDummyPopup] = useState(false);
    
    // Load from CRM metadata or use default
    const [dummyFields, setDummyFields] = useState<{name: string, values: string[]}[]>([]);

    useEffect(() => {
        if (selectedWorkshop?.metadata?.dummyFormConfig) {
            setDummyFields(selectedWorkshop.metadata.dummyFormConfig);
        } else {
            setDummyFields([
                { name: 'Are you ready to attend the complete 14-day live workshop?', values: ['Yes', 'No'] },
                { name: 'Do you have enough time to attend the daily 1.5-hour live class?', values: ['Yes 100%', 'No', "Don't Know"] },
                { name: 'Are you comfortable attending the workshop in Hindi?', values: ['Yes', 'No', 'English would be better.'] },
                { name: 'After submitting this form, we will send you the Workshop Details Form on WhatsApp. Are you ready to fill it out?', values: ['Yes', 'No'] },
                { name: 'There is no fee for this 14 days workshop. At the end of the workshop, are you willing to offer some support?', values: ['Yes', 'No', 'If I like it, I will definitely pay.'] },
                { name: 'full_name', values: ['John Doe'] },
                { name: 'email', values: ['john@example.com'] },
                { name: 'country', values: ['India'] },
                { name: 'state', values: ['Maharashtra'] },
                { name: 'phone_number', values: ['+919999999999'] }
            ]);
        }
    }, [selectedWorkshop?.metadata?.dummyFormConfig, selectedWorkshop?.id]);

    const [expandedDummyFields, setExpandedDummyFields] = useState<number[]>([]);

    // Extract dynamic questions from rawFieldData and dummyFields
    const allDynamicQuestions = new Set<string>();
    const EXCLUDED_COLS = ['full_name', 'phone_number', 'email', 'name', 'phone', 'first_name', 'last_name', 'country', 'state'];
    
    // Always include columns defined in the dummy form config
    if (dummyFields && Array.isArray(dummyFields)) {
        dummyFields.forEach(field => {
            if (field.name && !EXCLUDED_COLS.includes(field.name.toLowerCase())) {
                allDynamicQuestions.add(field.name);
            }
        });
    }

    metaLeads.forEach((lead: any) => {
        if (lead.metadata?.rawFieldData && Array.isArray(lead.metadata.rawFieldData)) {
            lead.metadata.rawFieldData.forEach((item: any) => {
                const key = item.question_text || item.name;
                if (key && !EXCLUDED_COLS.includes(key.toLowerCase())) {
                    allDynamicQuestions.add(key);
                }
            });
        }
    });
    const dynamicColumns = Array.from(allDynamicQuestions);

    const toggleDummyQuestionExpansion = (idx: number) => {
        if (expandedDummyFields.includes(idx)) {
            setExpandedDummyFields(expandedDummyFields.filter(i => i !== idx));
        } else {
            setExpandedDummyFields([...expandedDummyFields, idx]);
        }
    };

    const [isSubmittingDummy, setIsSubmittingDummy] = useState(false);

    const [formIdHistory, setFormIdHistory] = useState<string[]>([]);

    useEffect(() => {
        // Load form ID history from local storage
        const savedHistory = localStorage.getItem('metaFormIdHistory');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                setFormIdHistory(parsed);
                if (!formId && parsed.length > 0) {
                    setFormId(parsed[0]);
                }
            } catch (e) {}
        }
    }, []);

    const addToHistory = (id: string) => {
        if (!id) return;
        const newHistory = Array.from(new Set([id, ...formIdHistory])).slice(0, 10);
        setFormIdHistory(newHistory);
        localStorage.setItem('metaFormIdHistory', JSON.stringify(newHistory));
    };

    const syncLeads = async () => {
        if (!formId) return;
        addToHistory(formId);
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/crm/meta-leads/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formId, workshopId: selectedWorkshop?.id, workshopName: selectedWorkshop?.name })
            });
            const data = await res.json();
            if (data.success) {
                setLastSyncTime(new Date());
                alert(`AI-9A successfully synced ${data.syncedCount} new leads! Table will now refresh.`);
                if (!isAutoSync) setIsAutoSync(false);
                internalRefresh();
            } else {
                alert(`Sync Failed: ${data.error}`);
                setIsAutoSync(false);
            }
        } catch (e: any) {
            alert(`Sync Failed: ${e.message}`);
            setIsAutoSync(false);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (isAutoSync && formId) {
            syncLeads();
            interval = setInterval(syncLeads, 10 * 60 * 1000); // Changed to 10 minutes per request
        }
        return () => clearInterval(interval);
    }, [isAutoSync, formId]);

    const handleBulkStatusUpdate = async (ids: string[], newStatus: string) => {
        if (!ids.length) return;
        try {
            const res = await fetch('/api/admin/crm/meta-leads/bulk-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, status: newStatus })
            });
            if (res.ok) {
                alert(`Successfully marked ${ids.length} leads as ${newStatus}. Please refresh the page.`);
                setSelectedLeads([]);
            } else {
                alert('Update Failed');
            }
        } catch (e: any) {
            alert('Error updating status: ' + e.message);
        }
    };

    const handleDelete = async (ids: string[]) => {
        if (!confirm(`Are you sure you want to delete ${ids.length} lead(s)? This cannot be undone.`)) return;
        try {
            const res = await fetch('/api/admin/crm/meta-leads/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            });
            if (res.ok) {
                alert('Deleted successfully. Please refresh the page to see changes.');
                setSelectedLeads([]);
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (e: any) {
            alert('Error: ' + e.message);
        }
    };

    const handleConnect = () => {
        saveWorkshopSettings({
            ...selectedWorkshop,
            metadata: {
                ...(selectedWorkshop?.metadata || {}),
                facebookFormId: formId
            }
        });
        alert('Facebook Form ID connected successfully! Webhooks will automatically populate data below.');
    };

    const saveWTSettings = () => {
        saveWorkshopSettings({
            ...selectedWorkshop,
            metadata: {
                ...(selectedWorkshop?.metadata || {}),
                wtSettings: wtSettings
            }
        });
        alert('WhatsApp Trigger Settings saved successfully! The AI-9 engine will now schedule these automatically.');
        setShowWTSettingsPopup(false);
    };

    const triggerManualWhatsApp = async () => {
        if (!manualTemplate) return alert("Please select a template!");
        alert(`Successfully triggered template "${manualTemplate}" to ${selectedLeads.length} leads!`);
        setShowManualWTPopup(false);
        setSelectedLeads([]);
    };

    // Calculate Reports
    const totalLeads = metaLeads.length;
    const approvedLeads = metaLeads.filter((l: any) => l.status === 'approved').length;
    const pendingLeads = metaLeads.filter((l: any) => !l.status || l.status === 'pending' || l.status === 'new').length;
    const rejectedLeads = metaLeads.filter((l: any) => l.status === 'rejected').length;

    // Filter & Sort Logic
    let filteredLeads = metaLeads.filter((lead: any) => {
        const matchesSearch = 
            (lead.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (lead.phoneNumber || '').includes(searchQuery) ||
            (lead.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        const currentStatus = lead.status || 'new';
        const isPending = currentStatus === 'pending' || currentStatus === 'new';
        
        let matchesStatus = true;
        if (statusFilter === 'Approved') matchesStatus = currentStatus === 'approved';
        if (statusFilter === 'Pending') matchesStatus = isPending;
        if (statusFilter === 'Rejected') matchesStatus = currentStatus === 'rejected';
        if (statusFilter === 'Old Data') matchesStatus = currentStatus === 'old_data';

        return matchesSearch && matchesStatus;
    });

    // Sort: New leads first, Old data at the bottom
    filteredLeads.sort((a: any, b: any) => {
        if (a.status === 'old_data' && b.status !== 'old_data') return 1;
        if (a.status !== 'old_data' && b.status === 'old_data') return -1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Checkbox toggles
    const toggleLead = (id: string) => {
        if (selectedLeads.includes(id)) setSelectedLeads(selectedLeads.filter(l => l !== id));
        else setSelectedLeads([...selectedLeads, id]);
    };
    const toggleAll = () => {
        if (selectedLeads.length === filteredLeads.length) setSelectedLeads([]);
        else setSelectedLeads(filteredLeads.map((l: any) => l._id || l.id));
    };

    return (
        <div className="flex-1 min-w-0 overflow-y-auto space-y-6 animate-fade-in p-6 bg-slate-50 h-full relative">
            
            {/* Header Report Cards & Settings Trigger */}
            <div className="flex gap-4">
                <div className="grid grid-cols-4 gap-4 flex-1">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                        <h4 className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Leads</h4>
                        <p className="text-3xl font-black text-blue-600">{totalLeads}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm text-center bg-emerald-50/30">
                        <h4 className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1">Approved</h4>
                        <p className="text-3xl font-black text-emerald-600">{approvedLeads}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm text-center bg-amber-50/30">
                        <h4 className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Pending</h4>
                        <p className="text-3xl font-black text-amber-500">{pendingLeads}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm text-center bg-red-50/30">
                        <h4 className="text-xs text-red-600 font-bold uppercase tracking-wider mb-1">Rejected</h4>
                        <p className="text-3xl font-black text-red-600">{rejectedLeads}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Trigger Report Button */}
                    <button 
                        onClick={() => {}}
                        className="w-[100px] bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-[#B02660] transition-all transform hover:scale-105 group"
                        title="Trigger Report"
                    >
                        <div className="text-3xl font-black tracking-tighter drop-shadow-sm mb-1"><Activity size={24} strokeWidth={2.5} /></div>
                        <div className="text-[10px] font-bold uppercase tracking-wider px-1 text-center leading-tight">TRIGGER<br/>REPORT</div>
                    </button>

                    {/* Data Details Button */}
                    <button 
                        onClick={() => {}}
                        className="w-[100px] bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-[#B02660] transition-all transform hover:scale-105 group"
                        title="Data Details"
                    >
                        <div className="text-3xl font-black tracking-tighter drop-shadow-sm mb-1"><Settings2 size={24} strokeWidth={2.5} /></div>
                        <div className="text-[10px] font-bold uppercase tracking-wider px-1 text-center leading-tight">DATA<br/>DETAILS</div>
                    </button>

                    {/* Simulate Test Lead Button */}
                    <button 
                        onClick={() => setShowDummyPopup(true)}
                        className="w-[100px] bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-xl shadow-sm flex flex-col items-center justify-center text-[#B02660] transition-all transform hover:scale-105 group"
                        title="Simulate Test Lead"
                    >
                        <div className="text-3xl font-black tracking-tighter drop-shadow-sm mb-1"><Bot size={24} strokeWidth={2.5} /></div>
                        <div className="text-[10px] font-bold uppercase tracking-wider px-1 text-center leading-tight">SIMULATE</div>
                    </button>

                    {/* WT Settings Square Button */}
                    <button 
                        onClick={() => setShowWTSettingsPopup(true)}
                        className="w-[100px] bg-[#25D366] hover:bg-[#128C7E] rounded-xl shadow-md flex flex-col items-center justify-center text-white transition-all transform hover:scale-105 group"
                        title="Meta WhatsApp Trigger Management"
                    >
                        <div className="text-4xl font-black tracking-tighter drop-shadow-md">W</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider opacity-90 mt-1 px-1 text-center">WT Mgt</div>
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                            <Facebook size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Meta Leads Connection</h2>
                            <p className="text-xs text-slate-500">Connect a Facebook Form ID to trigger Stage-1 sync & Stage-2 Auto-Sync (10 mins).</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowAI9Popup(true)}
                            className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-sm border border-yellow-500"
                        >
                            <Settings2 size={14} />
                            AI-9 Configured
                        </button>
                    </div>
                </div>
                <div className="p-5 bg-slate-50 flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-[250px] max-w-md">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Facebook Form ID</label>
                        <input 
                            type="text" 
                            list="formIdHistoryList"
                            value={formId}
                            onChange={(e) => setFormId(e.target.value)}
                            placeholder="e.g. 123456789098765"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                        <datalist id="formIdHistoryList">
                            {formIdHistory.map((id, index) => (
                                <option key={index} value={id} />
                            ))}
                        </datalist>
                    </div>
                    
                    <div className="pt-5 flex flex-wrap items-center gap-2">
                        <button 
                            onClick={handleConnect}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                        >
                            <Save size={16} />
                            Connect Form
                        </button>
                        
                        <button 
                            onClick={() => setIsAutoSync(!isAutoSync)}
                            className={`px-3 py-1.5 font-bold rounded-lg transition-colors flex items-center gap-1.5 text-xs shadow-sm ${isAutoSync ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}`}
                        >
                            <Bot size={14} className={isAutoSync ? "text-emerald-500 animate-pulse" : ""} />
                            AI-9A Auto-Sync {isAutoSync ? '(10m)' : '(Off)'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Leads Data Table Section */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
                
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Leads Management Database (Stage 3 & 4)</h3>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Search leads..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-64"
                                />
                            </div>
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none bg-white font-medium"
                                >
                                    <option value="All">All Stages</option>
                                    <option value="Pending">Pending (Stage 2)</option>
                                    <option value="Approved">Approved (Stage 4)</option>
                                    <option value="Rejected">Rejected (Stage 4)</option>
                                    <option value="Old Data">Old Data</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedLeads.length > 0 && (
                        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg animate-fade-in">
                            <div className="text-sm font-bold text-blue-800">
                                {selectedLeads.length} Lead(s) Selected
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleBulkStatusUpdate(selectedLeads, 'approved')} className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-bold rounded-md flex items-center gap-1.5 text-xs border border-emerald-200">
                                    <CheckCircle size={14} /> Approve
                                </button>
                                <button onClick={() => handleBulkStatusUpdate(selectedLeads, 'pending')} className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold rounded-md flex items-center gap-1.5 text-xs border border-amber-200">
                                    <Clock size={14} /> Pending
                                </button>
                                <button onClick={() => handleBulkStatusUpdate(selectedLeads, 'rejected')} className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-md flex items-center gap-1.5 text-xs border border-red-200">
                                    <XCircle size={14} /> Reject
                                </button>
                                <button onClick={() => handleBulkStatusUpdate(selectedLeads, 'old_data')} className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-md flex items-center gap-1.5 text-xs border border-slate-300">
                                    <Archive size={14} /> Save as Old Data
                                </button>
                                <button onClick={() => setShowManualWTPopup(true)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md flex items-center gap-1.5 text-xs shadow-sm">
                                    <Play size={14} className="fill-white" /> Trigger WT
                                </button>
                                <button onClick={() => handleDelete(selectedLeads)} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md flex items-center gap-1.5 text-xs shadow-sm ml-2">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1 relative">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="text-xs uppercase bg-white text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap w-10">
                                    <input type="checkbox" checked={selectedLeads.length > 0 && selectedLeads.length === filteredLeads.length} onChange={toggleAll} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                </th>
                                <th className="px-4 py-3 whitespace-nowrap">Stage</th>
                                <th className="px-4 py-3 whitespace-nowrap">Date & Time</th>
                                <th className="px-4 py-3 whitespace-nowrap">Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">Email</th>
                                <th className="px-4 py-3 whitespace-nowrap">Country</th>
                                <th className="px-4 py-3 whitespace-nowrap">State</th>
                                <th className="px-4 py-3 whitespace-nowrap">Phone Number</th>
                                {dynamicColumns.map(col => {
                                    const formattedCol = col.replace(/_/g, ' ')
                                        .replace(/\b\w/g, l => l.toUpperCase());
                                    return <th key={col} className="px-4 py-3 whitespace-nowrap text-blue-600 bg-blue-50/50" title={col}>{formattedCol}</th>;
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLeads.map((lead: any, idx: number) => {
                                const answers: Record<string, string> = {};
                                if (lead.metadata?.rawFieldData && Array.isArray(lead.metadata.rawFieldData)) {
                                    lead.metadata.rawFieldData.forEach((item: any) => {
                                        const val = item.values?.[0] ?? item.response ?? '';
                                        if (item.name) answers[item.name] = val;
                                        if (item.question_text) answers[item.question_text] = val;
                                    });
                                }

                                const isSelected = selectedLeads.includes(lead._id || lead.id);
                                const status = lead.status || 'new';
                                
                                let statusColor = 'bg-slate-100 text-slate-700';
                                if (status === 'approved') statusColor = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                                else if (status === 'pending' || status === 'new') statusColor = 'bg-amber-100 text-amber-700 border-amber-200';
                                else if (status === 'rejected') statusColor = 'bg-red-100 text-red-700 border-red-200';
                                else if (status === 'old_data') statusColor = 'bg-slate-200 text-slate-500 border-slate-300 line-through opacity-70';

                                return (
                                    <tr key={lead._id || idx} className={`${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'} transition-colors ${status === 'old_data' ? 'bg-slate-50/50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleLead(lead._id || lead.id)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-full border ${statusColor}`}>
                                                {status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(lead.createdAt).toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-bold text-slate-800">{lead.name || answers.full_name || answers.name || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{lead.email || answers.email || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{lead.country || answers.country || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{lead.state || answers.state || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">{lead.phoneNumber || answers.phone_number || answers.phone || '-'}</td>
                                        {dynamicColumns.map(col => (
                                            <td key={col} className="px-4 py-3 min-w-[150px] bg-blue-50/10">
                                                {answers[col] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6 + dynamicColumns.length} className="px-4 py-12 text-center text-slate-500">
                                        {isFetchingLeads ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                                <span>Loading Meta leads...</span>
                                            </div>
                                        ) : metaLeads.length === 0 ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="text-2xl">📭</span>
                                                <span>No Meta leads found for this workshop yet.</span>
                                                <span className="text-xs text-slate-400">Use the Simulate Meta Lead button to test, or sync from your Meta Form ID.</span>
                                            </div>
                                        ) : (
                                            'No Meta leads match your current filters.'
                                        )}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Manual WT Trigger Popup (for bulk action) */}
            {showManualWTPopup && (
                <div className="absolute inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Play size={18} className="text-[#25D366] fill-[#25D366]" />
                                Trigger Manual WT
                            </h3>
                            <button onClick={() => setShowManualWTPopup(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <p className="text-sm text-slate-600">
                                You are about to send a WhatsApp template to <strong className="text-blue-600">{selectedLeads.length} leads</strong>.
                            </p>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Select Meta Template</label>
                                <select 
                                    value={manualTemplate}
                                    onChange={(e) => setManualTemplate(e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#25D366]/20 focus:border-[#25D366] bg-white"
                                >
                                    <option value="" disabled>-- Choose a template --</option>
                                    <option value="welcome_message">Welcome Message</option>
                                    <option value="followup_message">Follow Up Reminder</option>
                                    <option value="custom_offer">Custom Offer Notification</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setShowManualWTPopup(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                                Cancel
                            </button>
                            <button onClick={triggerManualWhatsApp} className="px-4 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-lg text-sm transition-colors shadow-sm flex items-center gap-2">
                                <Play size={16} className="fill-white" /> Send WT Now
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* WT Auto-Trigger Settings Popup */}
            {showWTSettingsPopup && (
                <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                        
                        {/* Header */}
                        <div className="p-6 bg-[#25D366]/10 border-b border-[#25D366]/20 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#25D366] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg">
                                    W
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-800 text-xl tracking-tight">WT Management</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Automated WhatsApp Triggers (Stage 5 & 6)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowWTSettingsPopup(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all">
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex bg-slate-50 p-2 gap-2 border-b border-slate-200">
                            <button 
                                onClick={() => setActiveTab('approved')} 
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                            >
                                Stage 5: Approved Leads
                            </button>
                            <button 
                                onClick={() => setActiveTab('pending')} 
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-amber-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'}`}
                            >
                                Stage 6: Pending Leads
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 bg-white space-y-6">
                            
                            {activeTab === 'approved' && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800 shadow-inner">
                                        <strong className="block mb-1 text-emerald-900">Approved Lead Trigger:</strong>
                                        This template will be scheduled to send automatically when a lead's stage is marked as 'Approved'.
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Select Approved Template</label>
                                        <select 
                                            value={wtSettings.approved.template}
                                            onChange={(e) => setWtSettings({ ...wtSettings, approved: { ...wtSettings.approved, template: e.target.value } })}
                                            className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white text-sm font-bold text-slate-700 outline-none transition-all"
                                        >
                                            <option value="">-- No template selected --</option>
                                            <option value="welcome_approved">Welcome Approved (Template 1)</option>
                                            <option value="onboarding_series">Onboarding Series (Template 2)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex justify-between block text-sm font-bold text-slate-700 mb-3">
                                            <span>Schedule Trigger (Delay)</span>
                                            <span className="text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">{wtSettings.approved.delay} Minutes</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="0" max="600" step="5"
                                            value={wtSettings.approved.delay}
                                            onChange={(e) => setWtSettings({ ...wtSettings, approved: { ...wtSettings.approved, delay: parseInt(e.target.value) } })}
                                            className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase mt-2">
                                            <span>0 min (Instant)</span>
                                            <span>600 min (10 hours)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'pending' && (
                                <div className="animate-fade-in space-y-6">
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 shadow-inner">
                                        <strong className="block mb-1 text-amber-900">Pending Lead Trigger:</strong>
                                        This template will be scheduled to send automatically to follow-up on leads sitting in 'Pending' stage.
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Select Pending Template</label>
                                        <select 
                                            value={wtSettings.pending.template}
                                            onChange={(e) => setWtSettings({ ...wtSettings, pending: { ...wtSettings.pending, template: e.target.value } })}
                                            className="w-full p-3.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 bg-white text-sm font-bold text-slate-700 outline-none transition-all"
                                        >
                                            <option value="">-- No template selected --</option>
                                            <option value="followup_reminder">Follow Up Reminder (Template A)</option>
                                            <option value="pending_offer">Special Pending Offer (Template B)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="flex justify-between block text-sm font-bold text-slate-700 mb-3">
                                            <span>Schedule Trigger (Delay)</span>
                                            <span className="text-amber-600 bg-amber-100 px-3 py-1 rounded-full">{wtSettings.pending.delay} Minutes</span>
                                        </label>
                                        <input 
                                            type="range" 
                                            min="0" max="600" step="5"
                                            value={wtSettings.pending.delay}
                                            onChange={(e) => setWtSettings({ ...wtSettings, pending: { ...wtSettings.pending, delay: parseInt(e.target.value) } })}
                                            className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-slate-400 font-bold uppercase mt-2">
                                            <span>0 min (Instant)</span>
                                            <span>600 min (10 hours)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                            <span className="text-xs text-slate-500 font-bold flex items-center bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                <Bot size={14} className="text-blue-500 mr-2" />
                                AI-9 Engine Automated
                            </span>
                            <div className="flex gap-3">
                                <button onClick={() => setShowWTSettingsPopup(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-colors">
                                    Cancel
                                </button>
                                <button onClick={saveWTSettings} className="px-6 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl text-sm transition-all transform hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center gap-2">
                                    <Save size={16} /> Save & Enable
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* AI-9 Config Popup */}
            {showAI9Popup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-slide-up">
                        
                        <div className="bg-yellow-400 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-300 rounded-full opacity-50 blur-2xl transform translate-x-10 -translate-y-10"></div>
                            <div className="relative z-10 flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md shadow-sm border border-yellow-300/50">
                                    <Settings2 size={24} className="text-yellow-900" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-yellow-900">AI-9 Configured</h3>
                                    <p className="text-yellow-800 text-sm opacity-90 mt-1 font-medium">Map questions and expected answers for AI qualification</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAI9Popup(false)} className="absolute top-4 right-4 text-yellow-800 hover:text-yellow-900 hover:bg-yellow-500 p-2 rounded-full transition-colors z-20">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 bg-slate-50 flex-1 overflow-y-auto max-h-[60vh]">
                            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                        <Save className="text-yellow-700" size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-yellow-900 text-sm flex items-center gap-2">
                                            Data Preservation & Routing <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded-full">MOVE ONLY</span>
                                        </h4>
                                        <p className="text-yellow-800 text-xs mt-0.5">Leads will be assigned to stages based on these rules.</p>
                                    </div>
                                </div>
                            </div>

                            {ai9Config.filters?.map((filter: any, index: number) => (
                                <div key={index} className="bg-white border border-slate-200 rounded-xl p-5 mb-4 shadow-sm relative">
                                    <button 
                                        onClick={() => {
                                            const newFilters = [...ai9Config.filters];
                                            newFilters.splice(index, 1);
                                            setAi9Config({...ai9Config, filters: newFilters});
                                        }}
                                        className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>

                                    <div className="mb-4 pr-6">
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Question Key (or column name)</label>
                                        <select 
                                            value={filter.question}
                                            onChange={(e) => {
                                                const newFilters = [...ai9Config.filters];
                                                newFilters[index].question = e.target.value;
                                                setAi9Config({...ai9Config, filters: newFilters});
                                            }}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                                        >
                                            <option value="">-- Search across all questions --</option>
                                            {dynamicColumns.map(col => (
                                                <option key={col} value={col}>{col.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-4">
                                        <label className="block text-xs font-bold text-slate-700 mb-3">Answer Options Mapping:</label>
                                        
                                        {(filter.options || []).map((opt: any, optIndex: number) => (
                                            <div key={optIndex} className="flex items-center gap-3 mb-2">
                                                <div className="flex-1">
                                                    <input 
                                                        type="text" 
                                                        value={opt.answer}
                                                        onChange={(e) => {
                                                            const newFilters = [...ai9Config.filters];
                                                            if (!newFilters[index].options) newFilters[index].options = [];
                                                            newFilters[index].options[optIndex].answer = e.target.value;
                                                            setAi9Config({...ai9Config, filters: newFilters});
                                                        }}
                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                                        placeholder={`Option ${optIndex + 1} (e.g. Yes)`}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400 font-bold">→</span>
                                                    <select 
                                                        value={opt.category}
                                                        onChange={(e) => {
                                                            const newFilters = [...ai9Config.filters];
                                                            if (!newFilters[index].options) newFilters[index].options = [];
                                                            newFilters[index].options[optIndex].category = e.target.value;
                                                            setAi9Config({...ai9Config, filters: newFilters});
                                                        }}
                                                        className={`w-32 px-2 py-1.5 border border-slate-300 rounded-md text-xs font-bold focus:outline-none ${opt.category === 'approved' ? 'bg-green-50 text-green-700' : opt.category === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}
                                                    >
                                                        <option value="approved">Approved</option>
                                                        <option value="pending">Pending</option>
                                                        <option value="rejected">Rejected</option>
                                                    </select>
                                                    <button 
                                                        onClick={() => {
                                                            const newFilters = [...ai9Config.filters];
                                                            newFilters[index].options.splice(optIndex, 1);
                                                            setAi9Config({...ai9Config, filters: newFilters});
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded bg-white border border-slate-200"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        
                                        <button 
                                            onClick={() => {
                                                const newFilters = [...ai9Config.filters];
                                                if (!newFilters[index].options) newFilters[index].options = [];
                                                newFilters[index].options.push({ answer: '', category: 'pending' });
                                                setAi9Config({...ai9Config, filters: newFilters});
                                            }}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1"
                                        >
                                            + Add Another Answer Option
                                        </button>
                                    </div>

                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex items-center justify-between">
                                        <label className="text-xs font-bold text-yellow-900">If answer matches none of the above, move to:</label>
                                        <select 
                                            value={filter.fallbackCategory || 'pending'}
                                            onChange={(e) => {
                                                const newFilters = [...ai9Config.filters];
                                                newFilters[index].fallbackCategory = e.target.value;
                                                setAi9Config({...ai9Config, filters: newFilters});
                                            }}
                                            className="w-32 px-2 py-1.5 border border-yellow-300 rounded-md text-xs bg-white focus:outline-none"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="approved">Approved</option>
                                        </select>
                                    </div>
                                </div>
                            ))}

                            <button 
                                onClick={() => {
                                    const newFilters = [...(ai9Config.filters || [])];
                                    newFilters.push({ question: '', options: [{ answer: '', category: 'approved' }], fallbackCategory: 'pending' });
                                    setAi9Config({...ai9Config, filters: newFilters});
                                }}
                                className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors"
                            >
                                + Add Another Question Rule
                            </button>

                            {/* Global Mismatch Rule */}
                            <div className="mt-6 pt-6 border-t border-slate-200">
                                <h4 className="font-bold text-slate-800 mb-2">Global Mismatch Rules</h4>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-600">If</span>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={ai9Config.maxMismatches}
                                        onChange={(e) => setAi9Config({...ai9Config, maxMismatches: parseInt(e.target.value) || 2})}
                                        className="w-16 px-2 py-1.5 border border-slate-300 rounded text-center"
                                    />
                                    <span className="text-sm font-medium text-slate-600">answers mismatch across all rules, forcefully move to</span>
                                    <select 
                                        value={ai9Config.mismatchFallback}
                                        onChange={(e) => setAi9Config({...ai9Config, mismatchFallback: e.target.value})}
                                        className="px-3 py-1.5 border border-slate-300 rounded bg-white text-sm"
                                    >
                                        <option value="rejected">Rejected</option>
                                        <option value="pending">Pending</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
                            <button onClick={() => setShowAI9Popup(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button 
                                onClick={async () => {
                                    if(saveWorkshopSettings && selectedWorkshop) {
                                        await saveWorkshopSettings(selectedWorkshop.id, { ai9Config });
                                    }
                                    setShowAI9Popup(false);
                                }} 
                                className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-xl text-sm transition-all shadow-sm flex items-center gap-2"
                            >
                                <Save size={16} /> Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Dummy Lead Popup */}
            {showDummyPopup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-slide-up">
                        <div className="bg-slate-800 p-5 relative overflow-hidden flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Bot size={20} className="text-slate-300" />
                                    Simulate Meta Lead
                                </h3>
                                <p className="text-slate-400 text-xs mt-1">Create a test lead to generate mapping columns for AI-9</p>
                            </div>
                            <button onClick={() => setShowDummyPopup(false)} className="text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 bg-slate-50 flex-1 overflow-y-auto max-h-[60vh]">
                            {dummyFields.map((field, idx) => {
                                const isExpanded = expandedDummyFields.includes(idx);
                                return (
                                <div key={idx} className={`bg-white rounded-xl border shadow-sm mb-4 transition-all ${isExpanded ? 'border-slate-300' : 'border-slate-200 hover:border-slate-300'}`}>
                                    
                                    {/* Header / Collapsed View */}
                                    <div 
                                        className="p-4 flex items-center justify-between cursor-pointer"
                                        onClick={() => toggleDummyQuestionExpansion(idx)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    {field.name || <span className="text-slate-400 italic">Untitled Question</span>}
                                                </h4>
                                                {!isExpanded && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {field.values.length} answer(s)
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newFields = [...dummyFields];
                                                    newFields.splice(idx, 1);
                                                    setDummyFields(newFields);
                                                }}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            <div className="text-slate-400">
                                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Content View */}
                                    {isExpanded && (
                                        <div className="p-4 pt-0 border-t border-slate-100 mt-2">
                                            <div className="mb-3 mt-4">
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Question Key (exact column name)</label>
                                                <input 
                                                    type="text" 
                                                    value={field.name}
                                                    onChange={(e) => {
                                                        const newFields = [...dummyFields];
                                                        newFields[idx].name = e.target.value;
                                                        setDummyFields(newFields);
                                                    }}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-800 focus:outline-none"
                                                    placeholder="e.g. are_you_comfortable_in_hindi"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-700 mb-1.5">Lead's Answer(s)</label>
                                                {field.values.map((val, valIdx) => (
                                                    <div key={valIdx} className="flex gap-2 mb-2">
                                                        <input 
                                                            type="text" 
                                                            value={val}
                                                            onChange={(e) => {
                                                                const newFields = [...dummyFields];
                                                                newFields[idx].values[valIdx] = e.target.value;
                                                                setDummyFields(newFields);
                                                            }}
                                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-blue-50 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                                                            placeholder="e.g. Yes"
                                                        />
                                                        <button 
                                                            onClick={() => {
                                                                const newFields = [...dummyFields];
                                                                newFields[idx].values.splice(valIdx, 1);
                                                                setDummyFields(newFields);
                                                            }}
                                                            className="p-2 text-slate-400 hover:text-red-500 rounded border border-slate-200"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button 
                                                    onClick={() => {
                                                        const newFields = [...dummyFields];
                                                        newFields[idx].values.push('');
                                                        setDummyFields(newFields);
                                                    }}
                                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-1"
                                                >
                                                    + Add Multiple Choice Option
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                            <button 
                                onClick={() => {
                                    const basicFields = ['full_name', 'email', 'country', 'state', 'phone_number'];
                                    const firstBasicIndex = dummyFields.findIndex(f => basicFields.includes(f.name));
                                    const newFields = [...dummyFields];
                                    const insertIndex = firstBasicIndex === -1 ? newFields.length : firstBasicIndex;
                                    newFields.splice(insertIndex, 0, {name: '', values: ['']});
                                    setDummyFields(newFields);
                                    setExpandedDummyFields([...expandedDummyFields, insertIndex]);
                                }}
                                className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-600 rounded-xl text-sm font-bold mt-2 hover:bg-slate-100 transition-colors"
                            >
                                + Add Custom Question
                            </button>
                        </div>
                        <div className="p-5 border-t border-slate-200 flex justify-between gap-3 bg-slate-50">
                            <button 
                                onClick={() => {
                                    if (confirm('Are you sure you want to reset the form to the default questions?')) {
                                        setDummyFields([
                                            { name: 'Are you ready to attend the complete 14-day live workshop?', values: ['Yes', 'No'] },
                                            { name: 'Do you have enough time to attend the daily 1.5-hour live class?', values: ['Yes 100%', 'No', "Don't Know"] },
                                            { name: 'Are you comfortable attending the workshop in Hindi?', values: ['Yes', 'No', 'English would be better.'] },
                                            { name: 'After submitting this form, we will send you the Workshop Details Form on WhatsApp. Are you ready to fill it out?', values: ['Yes', 'No'] },
                                            { name: 'There is no fee for this 14 days workshop. At the end of the workshop, are you willing to offer some support?', values: ['Yes', 'No', 'If I like it, I will definitely pay.'] },
                                            { name: 'full_name', values: ['John Doe'] },
                                            { name: 'email', values: ['john@example.com'] },
                                            { name: 'country', values: ['India'] },
                                            { name: 'state', values: ['Maharashtra'] },
                                            { name: 'phone_number', values: ['+919999999999'] }
                                        ]);
                                    }
                                }}
                                className="px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                            >
                                Reset to Defaults
                            </button>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setShowDummyPopup(false)}
                                    className="px-4 py-2 font-bold text-slate-600 text-sm hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                            <button 
                                onClick={() => {
                                    if (selectedWorkshop) {
                                        saveWorkshopSettings({
                                            ...selectedWorkshop,
                                            metadata: {
                                                ...(selectedWorkshop.metadata || {}),
                                                dummyFormConfig: dummyFields
                                            }
                                        });
                                        alert('Template saved to CRM permanently!');
                                    }
                                }}
                                className="px-4 py-2 font-bold text-blue-600 text-sm hover:bg-blue-50 rounded-lg border border-blue-200"
                            >
                                Save Template
                            </button>
                            <button 
                                onClick={async () => {
                                    setIsSubmittingDummy(true);
                                    if (selectedWorkshop) {
                                        saveWorkshopSettings({
                                            ...selectedWorkshop,
                                            metadata: {
                                                ...(selectedWorkshop.metadata || {}),
                                                dummyFormConfig: dummyFields
                                            }
                                        });
                                    }
                                    try {
                                        const res = await fetch('/api/admin/crm/meta-leads/dummy', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ fields: dummyFields, workshopId: selectedWorkshop?.id, workshopName: selectedWorkshop?.name })
                                        });
                                        const data = await res.json();
                                        if (res.ok && data.success) {
                                            alert('Dummy lead simulated! Table will now refresh to show new data.');
                                            setShowDummyPopup(false);
                                            internalRefresh();
                                        } else {
                                            alert(`Failed to simulate lead: ${data.error || 'Unknown error'}`);
                                        }
                                    } catch (e: any) {
                                        alert(`Error simulating lead: ${e.message}`);
                                    } finally {
                                        setIsSubmittingDummy(false);
                                    }
                                }}
                                disabled={isSubmittingDummy}
                                className="px-5 py-2 font-bold text-white bg-slate-800 hover:bg-slate-900 text-sm rounded-lg flex items-center gap-2"
                            >
                                {isSubmittingDummy ? 'Simulating...' : 'Simulate Submission'}
                            </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
