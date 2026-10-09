'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Save, Facebook, Download, RefreshCw, Bot } from 'lucide-react';



export function MetaLeadsTab({ 
    selectedWorkshop, 
    saveWorkshopSettings, 
    leadsData 
}: any) {
    const [formId, setFormId] = useState(selectedWorkshop?.metadata?.facebookFormId || '');
    
    // Filter only meta leads
    const metaLeads = (leadsData || []).filter((lead: any) => lead.source === 'meta_instant_form' || lead.formSource === 'facebook_instagram_ads' || lead.labels?.includes('meta_instant_form'));

    // Extract dynamic questions from rawFieldData
    const allDynamicQuestions = new Set<string>();
    metaLeads.forEach((lead: any) => {
        if (lead.metadata?.rawFieldData && Array.isArray(lead.metadata.rawFieldData)) {
            lead.metadata.rawFieldData.forEach((item: any) => {
                if (item.question_text) allDynamicQuestions.add(item.question_text);
                if (item.name) allDynamicQuestions.add(item.name);
            });
        }
    });
    const dynamicColumns = Array.from(allDynamicQuestions);

    
    const [isAutoSync, setIsAutoSync] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

    const syncLeads = async () => {
        if (!formId) return;
        setIsSyncing(true);
        try {
            const res = await fetch('/api/admin/crm/meta-leads/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formId, workshopId: selectedWorkshop?.id, workshopName: selectedWorkshop?.name })
            });
            const data = await res.json();
            if (data.success) {
                console.log('Synced', data.syncedCount, 'new leads');
                setLastSyncTime(new Date());
            } else {
                console.error('Sync failed', data.error);
                alert(`Sync Failed: ${data.error}`);
                setIsAutoSync(false); // Turn off auto-sync if it's failing
            }
        } catch (e: any) {
            console.error(e);
            alert(`Sync Failed: ${e.message}`);
            setIsAutoSync(false);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        let interval: any;
        if (isAutoSync && formId) {
            syncLeads(); // Sync immediately on toggle
            interval = setInterval(syncLeads, 5 * 60 * 1000); // Every 5 minutes
        }
        return () => clearInterval(interval);
    }, [isAutoSync, formId]);

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

    return (
        <div className="flex-1 min-w-0 overflow-y-auto space-y-6 animate-fade-in p-6 bg-slate-50 h-full">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                        <Facebook size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Meta Leads Connection</h2>
                        <p className="text-xs text-slate-500">Connect a Facebook/Instagram Form ID to this workshop.</p>
                    </div>
                </div>
                <div className="p-5 bg-slate-50 flex items-center gap-4">
                    <div className="flex-1 max-w-md">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Facebook Form ID</label>
                        <input 
                            type="text" 
                            value={formId}
                            onChange={(e) => setFormId(e.target.value)}
                            placeholder="e.g. 123456789098765"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                    
                    <div className="pt-5 flex items-center gap-2">
                        <button 
                            onClick={handleConnect}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm"
                        >
                            <Save size={16} />
                            Connect Form
                        </button>

                        <button 
                            onClick={() => setIsAutoSync(!isAutoSync)}
                            className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm ${isAutoSync ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}`}
                        >
                            <Bot size={16} className={isAutoSync ? "text-emerald-500 animate-pulse" : ""} />
                            AI-9A Auto-Sync
                        </button>
                        
                        <label className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-bold rounded-lg transition-colors flex items-center gap-2 text-sm shadow-sm cursor-pointer ml-auto">
                            <Download size={16} className="rotate-180" />
                            Import CSV
                            <input 
                                type="file" 
                                accept=".csv" 
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsSyncing(true);
                                    try {
                                        const formData = new FormData();
                                        formData.append('file', file);
                                        formData.append('workshopId', selectedWorkshop?.id || '');
                                        formData.append('workshopName', selectedWorkshop?.name || '');
                                        
                                        const res = await fetch('/api/admin/crm/meta-leads/import-csv', {
                                            method: 'POST',
                                            body: formData
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert(`Successfully imported ${data.syncedCount} new leads!`);
                                        } else {
                                            alert(`Import failed: ${data.error}`);
                                        }
                                    } catch (err: any) {
                                        alert(`Error uploading file: ${err.message}`);
                                    } finally {
                                        setIsSyncing(false);
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </label>

                        {isSyncing && <RefreshCw size={16} className="text-blue-500 animate-spin ml-2" />}
                    </div>

                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800">Meta Leads Data</h3>
                        <p className="text-xs text-slate-500">Auto-populated from Facebook Webhooks</p>
                    </div>
                    <div className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full">
                        {metaLeads.length} Leads
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">Sr.No</th>
                                <th className="px-4 py-3 whitespace-nowrap">Submitted Date & Time</th>
                                <th className="px-4 py-3 whitespace-nowrap">Form ID</th>
                                <th className="px-4 py-3 whitespace-nowrap">Name</th>
                                <th className="px-4 py-3 whitespace-nowrap">WhatsApp Number</th>
                                <th className="px-4 py-3 whitespace-nowrap">Email</th>
                                {dynamicColumns.map(col => (
                                    <th key={col} className="px-4 py-3 whitespace-nowrap text-blue-600">{col}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {metaLeads.map((lead: any, idx: number) => {
                                // Extract dynamic answers
                                const answers: Record<string, string> = {};
                                if (lead.metadata?.rawFieldData && Array.isArray(lead.metadata.rawFieldData)) {
                                    lead.metadata.rawFieldData.forEach((item: any) => {
                                        if (item.question_text) answers[item.question_text] = item.response || '';
                                        if (item.name) answers[item.name] = item.values?.[0] || '';
                                    });
                                }

                                return (
                                    <tr key={lead._id || idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-900">{idx + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(lead.createdAt).toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{lead.metadata?.metaFormId || lead.metadata?.formId || formId || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium">{lead.name || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{lead.phoneNumber || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{lead.email || '-'}</td>
                                        {dynamicColumns.map(col => (
                                            <td key={col} className="px-4 py-3 min-w-[150px]">
                                                {answers[col] || '-'}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                            {metaLeads.length === 0 && (
                                <tr>
                                    <td colSpan={6 + dynamicColumns.length} className="px-4 py-8 text-center text-slate-500">
                                        No Meta leads found. Make sure the webhook is firing and the form is connected.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
