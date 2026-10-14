'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Eye, Bot, Save as SaveIcon, Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, ArrowLeft, RefreshCw, Check, Users, ExternalLink, Zap } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { saveRegistrationWorkshop } from '@/lib/registrationClient';
import { getBaseLanguage, canonicalLanguage, matchesLanguage } from './_LeadsManagementTab';

export interface WhatsAppAutoTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshops: any[];
  setWorkshops?: React.Dispatch<React.SetStateAction<any[]>>;
  selectedLanguage: string;
  selectedBatchId?: string;
  onSaved?: (batchId: string, wtSettings: any) => void;
}

function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('crm_token') ||
    localStorage.getItem('adminToken') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token') ||
    ''
  );
}

export function WhatsAppAutoTriggerModal({
  isOpen,
  onClose,
  workshops = [],
  setWorkshops,
  selectedLanguage,
  selectedBatchId = '',
  onSaved,
}: WhatsAppAutoTriggerModalProps) {
  const toast = useToast();
  const [activeBatchId, setActiveBatchId] = useState(selectedBatchId);
  const [wtActiveSubTab, setWtActiveSubTab] = useState<'approved' | 'pending'>('approved');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [syncingTemplates, setSyncingTemplates] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [savingWTSettings, setSavingWTSettings] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  // View state: 'overview' | 'edit' | 'report'
  const [viewMode, setViewMode] = useState<'overview' | 'edit' | 'report'>('overview');
  const [connectedPhone, setConnectedPhone] = useState('919075358557');
  const [reportLeads, setReportLeads] = useState<any[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reAddingLeadId, setReAddingLeadId] = useState<string | null>(null);
  const [reAddingAll, setReAddingAll] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [reportBatchFilter, setReportBatchFilter] = useState('');

  const fetchTriggerReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/crm/new-registration/auto-add-group', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.connectedPhone) setConnectedPhone(data.connectedPhone);
        if (Array.isArray(data.leads)) setReportLeads(data.leads);
      }
    } catch (e) {
      console.warn('Failed to load trigger report:', e);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchTriggerReport();
    }
  }, [isOpen, fetchTriggerReport]);

  const handleReAddLead = async (lead: any) => {
    setReAddingLeadId(lead.id);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/crm/new-registration/auto-add-group', {
        method: 'POST',
        headers,
        body: JSON.stringify({ batchId: lead.batchId || activeBatchId, leadId: lead.id, force: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Re-added ${lead.name} to WhatsApp Group successfully!`);
        setReportLeads(prev => prev.map(l => l.id === lead.id ? { ...l, groupStatus: 'auto_added', autoAddedAt: new Date().toISOString() } : l));
      } else {
        toast.error(data.error || 'Failed to re-add participant');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error triggering group add');
    } finally {
      setReAddingLeadId(null);
    }
  };

  const handleReAddAll = async () => {
    setReAddingAll(true);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/admin/crm/new-registration/auto-add-group', {
        method: 'POST',
        headers,
        body: JSON.stringify({ batchId: reportBatchFilter || activeBatchId, force: true }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Auto-add trigger executed! Added ${data.totalAdded || 0} leads.`);
        await fetchTriggerReport();
      } else {
        toast.error(data.error || 'Failed to execute auto-add');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error triggering auto-add');
    } finally {
      setReAddingAll(false);
    }
  };

  const filteredBatches = React.useMemo(() => {
    return (workshops || []).filter(w => w && w.id && matchesLanguage(w, selectedLanguage) && !String(w.id).startsWith('master_'));
  }, [workshops, selectedLanguage]);

  const filteredReportLeads = React.useMemo(() => {
    return reportLeads.filter(lead => {
      if (reportBatchFilter && lead.batchId !== reportBatchFilter) return false;
      if (reportSearch) {
        const q = reportSearch.toLowerCase().trim();
        const matchesName = String(lead.name || '').toLowerCase().includes(q);
        const matchesPhone = String(lead.phone || '').includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [reportLeads, reportBatchFilter, reportSearch]);

  const activeBatch = React.useMemo(() => {
    return filteredBatches.find(w => w.id === activeBatchId) || filteredBatches[0] || null;
  }, [filteredBatches, activeBatchId]);

  useEffect(() => {
    if (selectedBatchId && filteredBatches.some(b => b.id === selectedBatchId)) {
      setActiveBatchId(selectedBatchId);
    } else if (filteredBatches.length > 0 && (!activeBatchId || !filteredBatches.some(b => b.id === activeBatchId))) {
      setActiveBatchId(filteredBatches[0].id);
    }
  }, [selectedBatchId, filteredBatches, activeBatchId]);

  const [wtSettings, setWtSettings] = useState<{
    approved: { template: string; delay: number };
    pending: { template: string; delay: number };
  }>({
    approved: { template: '', delay: 5 },
    pending: { template: '', delay: 30 }
  });
  const [whatsappGroupLink, setWhatsappGroupLink] = useState('');
  const [autoAdd24h, setAutoAdd24h] = useState(true);
  const [runningAutoAdd, setRunningAutoAdd] = useState(false);

  // Sync wtSettings when active batch changes
  useEffect(() => {
    if (activeBatch?.metadata?.wtSettings) {
      setWtSettings({
        approved: {
          template: activeBatch.metadata.wtSettings.approved?.template || '',
          delay: activeBatch.metadata.wtSettings.approved?.delay ?? 5
        },
        pending: {
          template: activeBatch.metadata.wtSettings.pending?.template || '',
          delay: activeBatch.metadata.wtSettings.pending?.delay ?? 30
        }
      });
    } else {
      setWtSettings({
        approved: { template: '', delay: 5 },
        pending: { template: '', delay: 30 }
      });
    }
    if (activeBatch) {
      setWhatsappGroupLink(activeBatch.whatsappGroupLink || activeBatch.metadata?.whatsappGroupLink || '');
      setAutoAdd24h(activeBatch.metadata?.autoAddGroupAfter24h ?? true);
    }
  }, [activeBatch]);

  // Fetch Meta WhatsApp Templates with proper token & fallback
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/admin/crm/templates?provider=meta&limit=200', { headers });
      const data = await res.json();
      const list = data.data?.templates || data.templates || [];
      if (Array.isArray(list) && list.length > 0) {
        setTemplates(list);
      } else {
        // Fallback without provider filter in case templates were saved with null provider
        const fallbackRes = await fetch('/api/admin/crm/templates?limit=200', { headers });
        const fallbackData = await fallbackRes.json();
        setTemplates(fallbackData.data?.templates || fallbackData.templates || []);
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
      toast.error('Could not load WhatsApp templates. Please check your connection.');
    } finally {
      setLoadingTemplates(false);
    }
  }, [toast]);

  // Load Meta WhatsApp Templates on modal open
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, fetchTemplates]);

  // Sync latest templates from Meta Cloud API
  const handleSyncMeta = async () => {
    setSyncingTemplates(true);
    try {
      const token = getStoredToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/admin/crm/templates/meta/sync?import=true', { headers });
      await fetchTemplates();
      toast.success('Synced latest Meta templates successfully!');
    } catch (e) {
      toast.error('Sync completed with partial updates.');
      await fetchTemplates();
    } finally {
      setSyncingTemplates(false);
    }
  };

  // Only display Approved templates in the dropdowns (Meta status === 'approved' or active)
  const approvedTemplates = React.useMemo(() => {
    if (!Array.isArray(templates) || templates.length === 0) return [];
    // Prioritize approved status
    const onlyApproved = templates.filter(t => {
      const s = String(t?.status || '').toLowerCase().trim();
      return s === 'approved' || s === 'active';
    });
    // If none are strictly marked 'approved', return all templates so user is never blocked
    return onlyApproved.length > 0 ? onlyApproved : templates;
  }, [templates]);

  const saveWTSettings = async () => {
    if (!activeBatch) {
      toast.error('No target batch selected. Please select a batch first.');
      return;
    }
    setSavingWTSettings(true);
    try {
      const listKey = `crm_${getBaseLanguage(activeBatch.language || selectedLanguage)}_workshops`;
      const trimmedLink = String(whatsappGroupLink || '').trim();
      const updatedWorkshop = {
        ...activeBatch,
        whatsappGroupLink: trimmedLink || null,
        metadata: {
          ...(activeBatch.metadata || {}),
          whatsappGroupLink: trimmedLink || null,
          autoAddGroupAfter24h: autoAdd24h,
          wtSettings: wtSettings
        }
      };
      const res = await saveRegistrationWorkshop(listKey, updatedWorkshop, activeBatch);
      const nextWorkshops = res?.workshops || (workshops || []).map(w => w?.id === activeBatch.id ? updatedWorkshop : w);
      if (setWorkshops) {
        setWorkshops(nextWorkshops);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('registration-batch-updated', {
          detail: { listKey, workshops: nextWorkshops }
        }));
      }
      if (onSaved) {
        onSaved(activeBatch.id, wtSettings);
      }
      toast.success(`WhatsApp Trigger template attached for "${activeBatch.name}"!`);
      // Return to overview after saving
      setViewMode('overview');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save WhatsApp settings');
    } finally {
      setSavingWTSettings(false);
    }
  };

  const deleteWTSettings = async (batch: any) => {
    if (!batch) return;
    const confirmDelete = window.confirm(`Clear and remove WhatsApp Auto-Trigger templates for "${batch.name}"?`);
    if (!confirmDelete) return;

    setDeletingBatchId(batch.id);
    try {
      const listKey = `crm_${getBaseLanguage(batch.language || selectedLanguage)}_workshops`;
      const clearedSettings = {
        approved: { template: '', delay: 5 },
        pending: { template: '', delay: 30 }
      };
      const updatedWorkshop = {
        ...batch,
        metadata: {
          ...(batch.metadata || {}),
          wtSettings: clearedSettings
        }
      };
      const res = await saveRegistrationWorkshop(listKey, updatedWorkshop, batch);
      const nextWorkshops = res?.workshops || (workshops || []).map(w => w?.id === batch.id ? updatedWorkshop : w);
      if (setWorkshops) {
        setWorkshops(nextWorkshops);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('registration-batch-updated', {
          detail: { listKey, workshops: nextWorkshops }
        }));
      }
      if (activeBatchId === batch.id) {
        setWtSettings(clearedSettings);
      }
      if (onSaved) {
        onSaved(batch.id, clearedSettings);
      }
      toast.success(`WhatsApp Trigger templates removed for "${batch.name}".`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove trigger template');
    } finally {
      setDeletingBatchId(null);
    }
  };

  const handleEditBatch = (batchId: string) => {
    setActiveBatchId(batchId);
    setViewMode('edit');
  };

  const configuredCount = filteredBatches.filter(b => b?.metadata?.wtSettings?.approved?.template || b?.metadata?.wtSettings?.pending?.template).length;

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-[#25D366]/15 via-emerald-50 to-[#25D366]/10 border-b border-[#25D366]/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 bg-[#25D366] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
                W
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-slate-800 text-lg tracking-tight">WhatsApp Auto-Trigger Management</h3>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {configuredCount} / {filteredBatches.length} Batches Active
                  </span>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100/90 text-emerald-950 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-black shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>QR: +{connectedPhone.replace(/^\+/, '')}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 font-medium truncate">
                  Attached Approved Templates · {canonicalLanguage(selectedLanguage)} Workshops ({filteredBatches.length} Batches)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <button
                type="button"
                onClick={handleSyncMeta}
                disabled={syncingTemplates || loadingTemplates}
                className="text-xs font-bold text-emerald-800 bg-white hover:bg-emerald-50 border border-emerald-300 px-2.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                title="Sync all approved templates from Meta Cloud"
              >
                <RefreshCw size={13} className={syncingTemplates ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">{syncingTemplates ? 'Syncing...' : 'Sync Meta'}</span>
              </button>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm hover:shadow transition-all"
                title="Close Modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Mode Switcher Banner */}
          <div className="bg-slate-50 px-5 sm:px-6 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold shrink-0 flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'overview'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                📋 All Batches Triggers ({filteredBatches.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'edit'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Edit2 size={12} />
                <span>Configure Trigger</span>
                {activeBatch && <span className="opacity-80 text-[11px] font-normal truncate max-w-[120px]">({activeBatch.name})</span>}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('report')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'report'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>📊 Trigger Report & Re-Add</span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {reportLeads.length}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/admin/crm/qr/group-scheduler"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all"
                title="Open Group Schedule in New Window"
              >
                <Clock size={12} className="text-emerald-600" />
                <span>Group Schedule</span>
                <ExternalLink size={10} />
              </a>

              {viewMode === 'overview' && (
                <button
                  type="button"
                  onClick={() => {
                    const unconfigured = filteredBatches.find(b => !b?.metadata?.wtSettings?.approved?.template);
                    if (unconfigured) {
                      setActiveBatchId(unconfigured.id);
                    }
                    setViewMode('edit');
                  }}
                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg text-xs font-black shadow-sm flex items-center gap-1.5 transition-all"
                  title="Add / Configure Trigger for Another Batch"
                >
                  <Plus size={14} /> Add Batch Trigger
                </button>
              )}

              {viewMode !== 'overview' && (
                <button
                  type="button"
                  onClick={() => setViewMode('overview')}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-200"
                >
                  <ArrowLeft size={13} /> Back
                </button>
              )}
            </div>
          </div>

          {/* OVERVIEW MODE: List of 6-12 Batches with Add, Edit, Delete */}
          {viewMode === 'overview' && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                <span>All {filteredBatches.length} batches for {canonicalLanguage(selectedLanguage)} with attached templates:</span>
                <span className="text-emerald-700 font-bold">{configuredCount} Configured</span>
              </div>

              {filteredBatches.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-600">No batches created for {canonicalLanguage(selectedLanguage)} yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Please create batches in My Data using AI-1 first.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  {filteredBatches.map((batch, index) => {
                    const wt = batch?.metadata?.wtSettings;
                    const approvedTemplate = wt?.approved?.template;
                    const approvedDelay = wt?.approved?.delay ?? 5;
                    const pendingTemplate = wt?.pending?.template;
                    const pendingDelay = wt?.pending?.delay ?? 30;
                    const hasTrigger = Boolean(approvedTemplate || pendingTemplate);
                    const isDeleting = deletingBatchId === batch.id;

                    return (
                      <div
                        key={batch.id || index}
                        className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors ${
                          hasTrigger ? 'bg-emerald-50/20' : 'bg-white'
                        }`}
                      >
                        {/* Batch Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                              {index + 1}
                            </span>
                            <h4 className="font-bold text-slate-800 text-sm truncate" title={batch.name}>
                              {batch.name}
                            </h4>
                            {hasTrigger ? (
                              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                <CheckCircle size={10} /> Active Trigger
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
                                No Trigger
                              </span>
                            )}
                          </div>

                          {/* Templates Summary */}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            {approvedTemplate ? (
                              <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 px-2.5 py-1 rounded-lg font-medium shadow-xs">
                                <span className="font-bold text-emerald-700">✓ Approved Template:</span>
                                <span className="font-bold text-emerald-950 truncate max-w-[200px]">{approvedTemplate}</span>
                                <span className="text-[10px] bg-emerald-200/70 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                  {approvedDelay}m
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No template attached</span>
                            )}

                            {pendingTemplate && (
                              <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-lg font-medium">
                                <span className="font-bold text-amber-700">⏱ Pending:</span>
                                <span className="font-semibold truncate max-w-[160px]">{pendingTemplate}</span>
                                <span className="text-[10px] bg-amber-200/70 text-amber-800 px-1.5 py-0.2 rounded font-black">
                                  {pendingDelay}m
                                </span>
                              </div>
                            )}

                            {/* WhatsApp Group Link badge */}
                            {(batch?.whatsappGroupLink || batch?.metadata?.whatsappGroupLink) ? (
                              <a
                                href={batch.whatsappGroupLink || batch.metadata.whatsappGroupLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 bg-emerald-100/80 border border-emerald-300 text-emerald-950 px-2.5 py-1 rounded-lg font-bold text-xs hover:bg-emerald-200 transition-colors"
                                title="Open WhatsApp Group"
                              >
                                <Users size={12} className="text-emerald-700" />
                                <span>WA Group Linked</span>
                                <ExternalLink size={10} />
                              </a>
                            ) : (
                              <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-lg">
                                No WA Group Link
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions: Add / Edit / Delete */}
                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {hasTrigger ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleEditBatch(batch.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 transition-all shadow-sm"
                                title="Edit Trigger Template for this Batch"
                              >
                                <Edit2 size={13} />
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => deleteWTSettings(batch)}
                                className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-xl border border-slate-200 transition-all shadow-sm disabled:opacity-50"
                                title="Delete / Clear Trigger Template"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEditBatch(batch.id)}
                              className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm"
                              title="Attach Approved Template to this Batch"
                            >
                              <Plus size={14} />
                              <span>+ Add Trigger</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* EDIT MODE: Configure Template and Delay for Selected Batch */}
          {viewMode === 'edit' && (
            <div className="flex-1 overflow-y-auto">
              {/* Target Batch Selector */}
              <div className="bg-slate-50/90 px-6 py-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Workshop Language</label>
                  <div className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-100 text-xs font-bold text-slate-700">
                    {canonicalLanguage(selectedLanguage)}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Target Batch</label>
                  <select
                    value={activeBatchId}
                    onChange={(e) => setActiveBatchId(e.target.value)}
                    className="w-full p-2.5 border-2 border-emerald-300 rounded-xl bg-white text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Target Batch --</option>
                    {filteredBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b?.metadata?.wtSettings?.approved?.template ? `(✓ ${b.metadata.wtSettings.approved.template})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* WhatsApp Group & 24h Auto-Addition Policy */}
              <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-emerald-50/90 px-6 py-4 border-b border-emerald-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Users size={15} className="text-emerald-600" />
                    WhatsApp Group Invite Link
                  </label>
                  {whatsappGroupLink && (
                    <a
                      href={whatsappGroupLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-950 underline flex items-center gap-1"
                    >
                      Open WhatsApp Group <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <input
                  type="url"
                  value={whatsappGroupLink}
                  onChange={(e) => setWhatsappGroupLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full p-2.5 border-2 border-emerald-300 rounded-xl bg-white text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400 shadow-xs"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="autoAdd24hCheck"
                      checked={autoAdd24h}
                      onChange={(e) => setAutoAdd24h(e.target.checked)}
                      className="mt-0.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="autoAdd24hCheck" className="text-xs text-slate-700 cursor-pointer select-none">
                      <strong className="text-emerald-950 font-bold block">Auto-Add to Group if Not Joined in 24 Hours:</strong>
                      If an approved lead has not joined within 24 hours of receiving the invite, system automatically adds them to the group.
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!activeBatch) return;
                      setRunningAutoAdd(true);
                      try {
                        const token = getStoredToken();
                        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
                        if (token) headers['Authorization'] = `Bearer ${token}`;
                        const res = await fetch('/api/admin/crm/new-registration/auto-add-group', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({ batchId: activeBatch.id, force: true }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Failed to auto-add leads');
                        toast.success(`Auto-Add executed: ${data.totalAdded || 0} leads processed for group.`);
                      } catch (err: any) {
                        toast.error(err.message || 'Auto-add failed');
                      } finally {
                        setRunningAutoAdd(false);
                      }
                    }}
                    disabled={runningAutoAdd || !whatsappGroupLink}
                    className="shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                    title="Check all leads and auto-add any pending participants to the WhatsApp group"
                  >
                    <Zap size={13} className={runningAutoAdd ? 'animate-spin' : ''} />
                    <span>{runningAutoAdd ? 'Adding...' : '⚡ Run Auto-Add Now'}</span>
                  </button>
                </div>
              </div>

              {/* Sub-tabs: Approved vs Pending */}
              <div className="flex bg-slate-50 p-2 gap-2 border-b border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setWtActiveSubTab('approved')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                    wtActiveSubTab === 'approved' ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  <CheckCircle size={15} />
                  <span>Approved Leads Trigger</span>
                  {wtSettings.approved.template && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setWtActiveSubTab('pending')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                    wtActiveSubTab === 'pending' ? 'bg-white text-amber-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  <Clock size={15} />
                  <span>Pending Leads Trigger</span>
                  {wtSettings.pending.template && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  )}
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 bg-white space-y-6">
                {wtActiveSubTab === 'approved' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-800">
                      <strong className="block mb-1 text-emerald-900 font-bold">Approved Leads Auto-Trigger:</strong>
                      When leads are moved into <strong>Approval-1..4</strong> or <strong>Registered leads</strong>, this Meta WhatsApp template is automatically scheduled and sent with the WhatsApp Group link.
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">
                          Select Approved Meta Template ({approvedTemplates.length} Available)
                        </label>
                        <button
                          type="button"
                          onClick={fetchTemplates}
                          disabled={loadingTemplates}
                          className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw size={11} className={loadingTemplates ? 'animate-spin' : ''} /> Refresh List
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <select
                          value={wtSettings.approved.template}
                          onChange={(e) => setWtSettings({ ...wtSettings, approved: { ...wtSettings.approved, template: e.target.value } })}
                          className="w-full p-3 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/20 text-sm font-bold text-slate-800 outline-none"
                        >
                          <option value="">✓ -- Select Approved Template --</option>
                          {loadingTemplates ? (
                            <option disabled>Loading approved templates...</option>
                          ) : approvedTemplates.length === 0 ? (
                            <option disabled>No approved templates found. Click Sync Meta.</option>
                          ) : (
                            approvedTemplates.map(t => (
                              <option key={t._id || t.id || t.templateName} value={t.templateName}>
                                ✓ {t.templateName} ({t.status || 'approved'})
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const t = templates.find(temp => temp.templateName === wtSettings.approved.template);
                            if (t) setPreviewTemplate(t);
                          }}
                          disabled={!wtSettings.approved.template}
                          className="p-3 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 rounded-xl text-slate-600 disabled:opacity-50 transition-all shrink-0"
                          title="Preview Template Content"
                        >
                          <Eye size={18} />
                        </button>
                      </div>

                      {wtSettings.approved.template && (
                        <div className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                          <Check size={14} className="text-emerald-600" />
                          <span>Selected template: <strong>{wtSettings.approved.template}</strong></span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Trigger Delay</label>
                        <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-xs font-black">
                          {wtSettings.approved.delay} Minutes
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="600"
                        step="5"
                        value={wtSettings.approved.delay}
                        onChange={(e) => setWtSettings({ ...wtSettings, approved: { ...wtSettings.approved, delay: parseInt(e.target.value, 10) } })}
                        className="w-full accent-emerald-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span>0 min (Instant)</span>
                        <span>600 min (10 hrs)</span>
                      </div>
                    </div>
                  </div>
                )}

                {wtActiveSubTab === 'pending' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800">
                      <strong className="block mb-1 text-amber-900 font-bold">Pending Leads Auto-Followup:</strong>
                      Optionally send a follow-up WhatsApp message to leads sitting in <strong>Pending-1..4</strong> stages to gather missing information or prompt action.
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Pending Meta Template</label>
                      <div className="flex gap-2">
                        <select
                          value={wtSettings.pending.template}
                          onChange={(e) => setWtSettings({ ...wtSettings, pending: { ...wtSettings.pending, template: e.target.value } })}
                          className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 bg-white text-sm font-bold text-slate-700 outline-none"
                        >
                          <option value="">-- No pending template selected --</option>
                          {approvedTemplates.map(t => (
                            <option key={t._id || t.id || t.templateName} value={t.templateName}>
                              {t.templateName} ({t.status || 'Active'})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const t = templates.find(temp => temp.templateName === wtSettings.pending.template);
                            if (t) setPreviewTemplate(t);
                          }}
                          disabled={!wtSettings.pending.template}
                          className="p-3 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 rounded-xl text-slate-600 disabled:opacity-50"
                          title="Preview Template"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Follow-up Delay</label>
                        <span className="text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-xs font-black">
                          {wtSettings.pending.delay} Minutes
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="600"
                        step="5"
                        value={wtSettings.pending.delay}
                        onChange={(e) => setWtSettings({ ...wtSettings, pending: { ...wtSettings.pending, delay: parseInt(e.target.value, 10) } })}
                        className="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase mt-1">
                        <span>0 min (Instant)</span>
                        <span>600 min (10 hrs)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORT MODE: Auto-Trigger Status & Re-Add */}
          {viewMode === 'report' && (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Report Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <input
                    type="text"
                    placeholder="Search participant by name or phone..."
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 w-full sm:w-60 shadow-xs"
                  />
                  <select
                    value={reportBatchFilter}
                    onChange={(e) => setReportBatchFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 shadow-xs font-semibold text-slate-700"
                  >
                    <option value="">All Batches ({filteredBatches.length})</option>
                    {filteredBatches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={fetchTriggerReport}
                    disabled={loadingReport}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                    title="Refresh Report Data"
                  >
                    <RefreshCw size={12} className={loadingReport ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReAddAll}
                    disabled={reAddingAll}
                    className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                    title="Re-Add all approved eligible participants to their WhatsApp Group"
                  >
                    <Zap size={13} className={reAddingAll ? 'animate-spin' : ''} />
                    <span>{reAddingAll ? 'Re-Adding...' : '⚡ Re-Add All Eligible'}</span>
                  </button>
                </div>
              </div>

              {/* Connected QR Banner */}
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-emerald-950">Active Connected WhatsApp QR:</span>
                  <span className="font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                    +{connectedPhone.replace(/^\+/, '')}
                  </span>
                </div>
                <a
                  href="/admin/crm/qr/group-scheduler"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1"
                >
                  <Clock size={12} /> Open Group Schedule <ExternalLink size={11} />
                </a>
              </div>

              {/* Report Table */}
              {loadingReport ? (
                <div className="p-12 text-center text-slate-400">
                  <RefreshCw className="animate-spin h-6 w-6 mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs font-bold">Loading trigger report...</p>
                </div>
              ) : filteredReportLeads.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                  <Bot className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-600">No approved leads registered for auto-trigger yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Approve leads or run AI Screen in Leads Management to populate auto-trigger reports.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-black border-b border-slate-200 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Participant</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">Batch Name</th>
                          <th className="py-2.5 px-3">Trigger Template</th>
                          <th className="py-2.5 px-3">Group Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReportLeads.map((lead, idx) => {
                          const isAutoAdded = lead.groupStatus === 'auto_added' || lead.groupStatus === 'joined';
                          const isReAdding = reAddingLeadId === lead.id;

                          return (
                            <tr key={lead.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                <div>{lead.name}</div>
                                {lead.autoAddedAt && (
                                  <div className="text-[10px] text-slate-400 font-normal">
                                    Added: {new Date(lead.autoAddedAt).toLocaleDateString()}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 font-semibold text-slate-600">
                                {lead.phone}
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                                  {lead.batchName}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700">
                                {lead.template ? (
                                  <span className="text-emerald-800 font-bold text-[11px]">
                                    ✓ {lead.template}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Default</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                {isAutoAdded ? (
                                  <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-black">
                                    <CheckCircle size={10} /> Auto-Added
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                    <Clock size={10} /> Pending Add
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleReAddLead(lead)}
                                  disabled={isReAdding}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
                                  title="Re-add this participant to the batch's WhatsApp group"
                                >
                                  <RefreshCw size={11} className={isReAdding ? 'animate-spin' : ''} />
                                  <span>{isReAdding ? 'Adding...' : 'Re-Add'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
            <span className="text-xs text-slate-500 font-bold flex items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 self-start sm:self-auto">
              <Bot size={14} className="text-emerald-500 mr-1.5" />
              Pipeline Auto-Sync Active (Every 2 mins)
            </span>
            <div className="flex gap-2 self-end sm:self-auto">
              {viewMode === 'edit' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setViewMode('overview')}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={savingWTSettings}
                    onClick={saveWTSettings}
                    className="px-5 py-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
                  >
                    <SaveIcon size={16} /> {savingWTSettings ? 'Saving...' : 'Save & Enable Auto-Trigger'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow-md"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">{previewTemplate.templateName}</h3>
              <button onClick={() => setPreviewTemplate(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border text-sm text-slate-700 whitespace-pre-wrap font-sans">
              {previewTemplate.body || previewTemplate.content || previewTemplate.text || 'No preview body text.'}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 bg-slate-800 text-white font-bold rounded-lg text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
