'use client';
import { registrationFetch as fetch, saveRegistrationState, saveRegistrationSnapshot } from '@/lib/registrationClient';

import React from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Settings, Save, Database, Plus, X, Edit2, ArrowLeftRight, Sparkles, Download, RotateCcw, Check, CheckCircle, Trash2 } from 'lucide-react';
import { useGoogleFormSync } from '@/hooks/useGoogleFormSync';
import { completeGoogleFormMapping, unmappedCrmFields } from '@/lib/googleFormFieldMapping';
import { GoogleFormSyncStatusBanner } from './_GoogleFormSyncStatus';
import { matchesLanguage } from './_LeadsManagementTab';
import { readRegistrationDecisions, isRegistrationStageCategory, isRegistrationStageMember } from '@/lib/registrationAiConfig';
import { needsZoomReview } from '@/lib/registrationGates';
import { AITriggersPanel } from './_AITriggersPanel';
import { WhatsAppAutoTriggerModal } from './_WhatsAppAutoTriggerModal';
import {
  getLeadPhone,
  getLeadName,
  getLeadEmail,
  getLeadGender,
  getLeadAge,
  getLeadCity,
  getLeadCountry,
  getLeadTimestamp,
  getLeadAnswer,
} from '@/lib/crmTableColumns';


// Helper to prevent double counting on long overlapping form answers
const isLeadMatchingKeyword = (valStr: string, keyword: string) => {
  const v = String(valStr).toLowerCase().trim();
  const kStr = String(keyword).toLowerCase().trim();
  if (!v || !kStr) return false;
  
  // Handle multiple keywords separated by commas (OR logic)
  const keywords = kStr.split(',').map(k => k.trim()).filter(Boolean);
  
  return keywords.some(k => {
    if (v === k) return true;
    
    // Strict 100% word boundary match
    try {
      const escapedK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|\\W)${escapedK}(?:\\W|$)`, 'i');
      if (regex.test(v)) return true;
    } catch (e) {}
    
    // Safe substring fallback for long phrases (avoids the male/female issue while supporting long batch names)
    if (k.length > 15 && v.includes(k)) return true;
    
    return false; // Strict matching for short words
  });
};

import { registrationPage } from '@/lib/registrationPagination';
import { RegistrationPagination, useRegistrationPage } from './_RegistrationPagination';

export interface WorkshopFormTabProps {
  selectedDashboardLang: string;
  [key: string]: any;
}

export function WorkshopFormTab(props: WorkshopFormTabProps) {
  const p = props;
  // Destructure all props for use in JSX below
  const {
    selectedWorkshop, setSelectedWorkshop, workshops, setWorkshops,
    linkedFormId, setLinkedFormId, selectedFormId, setSelectedFormId,
    googleFormUrl, setGoogleFormUrl, formSource, setFormSource,
    isManualFormId, setIsManualFormId, fetchedForms, isLoadingForms,
    isLoadingGoogleForms, googleFormsList, googleFormQuestionMap,
    setGoogleFormQuestionMap, fieldMapping, setFieldMapping, needsGoogleAuth,
    googleAuthError, isFormSetupCollapsed, setIsFormSetupCollapsed,
    crmFields, setCrmFields, mapDataFields, isMapDataCollapsed, setIsMapDataCollapsed,
    saveWorkshopSettings, handleDetailChange, token, toast,
    isAi7Active, setIsAi7Active,
    isWebhookModalOpen, setIsWebhookModalOpen,
    leadsFilter = '', leadsSubFilter = '', leadsSubSubFilter = '', refreshLeadsCounter = 0, setRefreshLeadsCounter,
    setIsLoadingGoogleForms, setGoogleFormsList, setNeedsGoogleAuth, setActiveTab, Users, leadsData = [], isLoadingLeads = false, selectedRowIds = [], renderBulkActions = () => null, handleAi7Categorize, isAi7Processing = false, handleApproveBulk, filterOptions = [], crmLeadIds = [], tab2SortOrder = 'desc', setSelectedRowIds, showDynamicColumns = true, dynamicColumns = [], colWidths = {}, setColWidths, setTab2SortOrder, setLeadsData, handleApprove,
    setLeadsFilter, setLeadsSubFilter, setLeadsSubSubFilter,
    selectedDashboardLang,
  } = props;

  const [isMergeModalOpen, setIsMergeModalOpen] = React.useState(false);
  const [isSavingConnection, setIsSavingConnection] = React.useState(false);
  const [isCrmFormEditable, setIsCrmFormEditable] = React.useState(false);
  const [isGoogleFormEditable, setIsGoogleFormEditable] = React.useState(false);
  const [editingWaLeadId, setEditingWaLeadId] = React.useState<string | null>(null);
  const [editingWaVal, setEditingWaVal] = React.useState<string>('');
  const [waUndoStack, setWaUndoStack] = React.useState<Record<string, string>>({});
  const [isSavingLeadField, setIsSavingLeadField] = React.useState<string | null>(null);
  const [batchStageFilter, setBatchStageFilter] = React.useState<string>('');
  const [batchDecisions, setBatchDecisions] = React.useState<Record<string, any>>({});
  const [showWTSettingsModal, setShowWTSettingsModal] = React.useState(false);
  const [isDeletingDuplicates, setIsDeletingDuplicates] = React.useState(false);

  const activeWtTemplate = React.useMemo(() => {
    if (selectedWorkshop?.metadata?.wtSettings?.approved?.template) {
      return selectedWorkshop.metadata.wtSettings.approved.template;
    }
    const matching = (workshops || []).find((w: any) => w && matchesLanguage(w, selectedDashboardLang) && w.metadata?.wtSettings?.approved?.template);
    return matching?.metadata?.wtSettings?.approved?.template || '';
  }, [selectedWorkshop, workshops, selectedDashboardLang]);

  React.useEffect(() => {
    try {
      if (typeof window === 'undefined' || typeof globalThis.fetch !== 'function') return;
      const targetBatchId = selectedWorkshop?.id ? String(selectedWorkshop.id) : ((workshops || []).find((w: any) => matchesLanguage(w, selectedDashboardLang) && !String(w.id).startsWith('master_'))?.id || '');
      if (targetBatchId) {
        fetch(`/api/admin/crm/new-registration/gates?batchId=${encodeURIComponent(String(targetBatchId))}`)
          .then(async res => (res && res.ok ? res.json() : null))
          .then(data => {
            if (data?.decisions) {
              setBatchDecisions(data.decisions);
            } else {
              fetch('/api/admin/crm/new-registration/state')
                .then(r => r?.ok ? r.json() : null)
                .then(sd => {
                  if (sd) setBatchDecisions(readRegistrationDecisions(sd, String(targetBatchId)));
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      } else {
        fetch('/api/admin/crm/new-registration/state')
          .then(async res => (res && res.ok ? res.json() : null))
          .then(data => {
            if (data) setBatchDecisions(readRegistrationDecisions(data, ''));
          })
          .catch(() => {});
      }
    } catch (e) {}
  }, [selectedWorkshop?.id, selectedDashboardLang, workshops]);

  const saveLeadPhone = async (leadId: string, newPhone: string, currentCountry?: string) => {
    if (!leadId) return;
    setIsSavingLeadField(leadId);
    try {
      const res = await fetch('/api/admin/crm/new-registration/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          phone: newPhone,
          country: currentCountry || 'India',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update WhatsApp number');
      const savedPhone = data.phone || newPhone;
      setLeadsData((prev: any[]) => (prev || []).map((l: any) => {
        if (!l) return l;
        if (l.id === leadId) {
          return {
            ...l,
            phone: savedPhone,
            mobile: savedPhone,
            phoneNumber: savedPhone,
            whatsapp: savedPhone,
            WhatsApp: savedPhone,
            Contact: savedPhone,
            _rawRecord: l._rawRecord ? { ...l._rawRecord, 'WhatsApp': savedPhone, 'Phone': savedPhone, 'Mobile': savedPhone } : l._rawRecord,
          };
        }
        return l;
      }));
      toast?.success?.('WhatsApp updated & saved permanently: ' + savedPhone);
      setEditingWaLeadId(null);
    } catch (err: any) {
      toast?.error?.(err.message || 'Failed to save phone');
    } finally {
      setIsSavingLeadField(null);
    }
  };

  const undoLeadPhone = async (leadId: string) => {
    const prevPhone = waUndoStack[leadId];
    if (!prevPhone) return;
    await saveLeadPhone(leadId, prevPhone);
    setWaUndoStack(prev => {
      const next = { ...prev };
      delete next[leadId];
      return next;
    });
  };

  // The data section reads saved Bunny submissions, so an import must use the
  // form connection saved on this batch.
  const googleFormId = formSource === 'google'
    ? String(googleFormUrl || selectedWorkshop?.formId || '').trim()
    : '';
  const {
    status: googleSyncStatus,
    isSyncing: isImportingGoogleForm,
    isLoadingStatus: isLoadingGoogleSyncStatus,
    syncForm: syncGoogleForm,
  } = useGoogleFormSync(googleFormId);
  const unmappedCount = unmappedCrmFields(crmFields, fieldMapping).length;
  const saveConnection = async (openData = false) => {
    if (isSavingConnection) return;
    const formId = String(formSource === 'google' ? googleFormUrl : selectedFormId).trim();
    if (!formId) { toast.error('Select a registration form first.'); return; }
    setIsSavingConnection(true);
    try {
      const connectionBatch = selectedWorkshop?.id ? selectedWorkshop : null;
      await saveWorkshopSettings(connectionBatch ? {
        ...connectionBatch,
        formId,
        metadata: {
          ...connectionBatch.metadata,
          formSource,
          mainFilter: leadsFilter,
          subFilter: leadsSubFilter,
          // Without this the batch loses the mapping the user just configured,
          // which makes every mapped field fall back to "-- Ignore --".
          googleFormMapping: fieldMapping,
          crmFields,
        },
      } : undefined);
      toast.success(connectionBatch
        ? 'Form connection saved permanently for this batch.'
        : 'Form connection saved for all leads.');
      setRefreshLeadsCounter((previous: number) => previous + 1);
      if (openData) { setActiveTab('my_data'); setIsFormSetupCollapsed(true); }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save form connection. Please retry.');
    } finally { setIsSavingConnection(false); }
  };

  // Auto-fill a mapping whenever the selected form's questions change, so a newly
  // connected form never renders as all-ignored. Manual choices survive because
  // this only runs when the question set itself changes.
  const autoMappedQuestionSet = React.useRef('');
  React.useEffect(() => {
    const titles = Object.values(googleFormQuestionMap || {}).map(String).sort().join('\u0000');
    if (!titles || titles === autoMappedQuestionSet.current) return;
    autoMappedQuestionSet.current = titles;
    if (setFieldMapping) {
      setFieldMapping((current: Record<string, string>) => {
        const completed = completeGoogleFormMapping(crmFields, googleFormQuestionMap, current);
        return JSON.stringify(completed) === JSON.stringify(current) ? current : completed;
      });
    }
  }, [googleFormQuestionMap, crmFields, setFieldMapping]);

  const handleSyncLeads = async () => {
    if (!googleFormId) {
      toast.error('Connect and save a Google Form for this batch first.');
      return;
    }
    toast.info('Importing new responses from Google Forms...');
    try {
      const outcome = await syncGoogleForm({ name: selectedWorkshop?.name });
      if (Object.keys(outcome.questionMap).length > 0) setGoogleFormQuestionMap(outcome.questionMap);
      setRefreshLeadsCounter((previous: number) => previous + 1);
      const summary = outcome.summary;
      if (outcome.error) {
        toast.error(`Imported ${summary?.insertedSubmissions ?? 0} new response(s), but the run reported: ${outcome.error}`);
      } else if (summary) {
        toast.success(`Google Forms: ${summary.savedCount} of ${summary.responseCount} responses saved (${summary.insertedSubmissions} new).`);
      } else {
        toast.success('Google Forms import finished.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google Forms import failed.');
    }
  };

  const handleDeleteDuplicates = async () => {
    if (!confirm('Are you sure you want to delete all duplicate rows? This will remove duplicate submissions and keep the primary entry.')) return;
    setIsDeletingDuplicates(true);
    try {
      const activeFormId = googleFormId || selectedWorkshop?.formId || linkedFormId || '';
      const res = await fetch('/api/admin/crm/new-registration/dedup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ formId: activeFormId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove duplicates');

      const deletedSet = new Set(data.deletedIds || []);
      const seenKeys = new Set();
      setLeadsData((prev: any[]) => (prev || []).filter((l: any) => {
        if (!l) return false;
        if (deletedSet.has(l.id) || deletedSet.has(l._id)) return false;
        const p = String(l.phoneNumber || l.mobile || l.phone || l.whatsapp || l.WhatsApp || '').replace(/\D/g, '');
        const pKey = p.length >= 10 ? p.slice(-10) : '';
        const eKey = String(l.email || '').trim().toLowerCase();
        const key = pKey ? `p:${pKey}` : (eKey ? `e:${eKey}` : null);
        if (key) {
          if (seenKeys.has(key)) return false;
          seenKeys.add(key);
        }
        return true;
      }));

      if (setRefreshLeadsCounter) {
        setRefreshLeadsCounter((c: number) => c + 1);
      }
      if (data.deletedCount > 0) {
        toast.success(`Removed ${data.deletedCount} duplicate row(s) successfully!`);
      } else {
        toast.info('No duplicate rows found.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete duplicates');
    } finally {
      setIsDeletingDuplicates(false);
    }
  };
  const [mergeTargetId, setMergeTargetId] = React.useState('');
  const [mergeSourceIds, setMergeSourceIds] = React.useState<string[]>([]);
  const pagination = useRegistrationPage(`${p.activeTab}:${selectedWorkshop?.id}:${leadsFilter}:${leadsSubFilter}:${leadsSubSubFilter}:${tab2SortOrder}`);

  let effectiveLeads = (leadsData || []).filter(Boolean);
  
  if ((p.activeTab === 'my_batches' || p.activeTab === 'our_workshops' || p.activeTab === 'my_data') && p.selectedWorkshop?.formFilterKeyword && p.selectedWorkshop.formFilterKeyword.trim() !== '') {
    const keywords = p.selectedWorkshop.formFilterKeyword.toLowerCase().split('|').map((k: string) => k.trim()).filter(Boolean);
    const ai7MappedQuestion = p.selectedWorkshop?.metadata?.googleFormMapping?.['AI-7'] || p.selectedWorkshop?.metadata?.googleFormMapping?.['ai7'];
    effectiveLeads = effectiveLeads.filter((lead: any) => {
      if (lead._rawRecord) {
        if (ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
          return keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k));
        } else {
          return keywords.some((k: string) => Object.values(lead._rawRecord).some(val => isLeadMatchingKeyword(val as string, k)));
        }
      }
      return true;
    });
  }

  if ((p.activeTab === 'my_batches' || p.activeTab === 'our_workshops') && batchStageFilter) {
    if (isRegistrationStageCategory(batchStageFilter)) {
      if (batchStageFilter.startsWith('pending_')) {
        effectiveLeads = effectiveLeads.filter((l: any) => {
          const dec = batchDecisions[l.id] || {};
          const isApproved = dec.status?.startsWith('approval') ||
            dec.status === 'registered_leads' ||
            Boolean(dec.isRegistered) ||
            (dec.copies || []).some((c: string) => c.startsWith('approval') || c === 'registered_leads');
          if (isApproved) return false;
          return isRegistrationStageMember(dec, batchStageFilter);
        });
      } else {
        effectiveLeads = effectiveLeads.filter((l: any) => isRegistrationStageMember(batchDecisions[l.id] || {}, batchStageFilter));
      }
    } else if (batchStageFilter === 'ai_triggers') {
      effectiveLeads = effectiveLeads.filter((l: any) =>
        batchDecisions[l.id]?.wtTriggered || batchDecisions[l.id]?.whatsappSent || batchDecisions[l.id]?.triggeredAt || batchDecisions[l.id]?.status === 'ai_triggers' || batchDecisions[l.id]?.copies?.includes('ai_triggers')
      );
    } else if (batchStageFilter === 'take_zoom_meeting') {
      effectiveLeads = effectiveLeads.filter((l: any) => needsZoomReview(batchDecisions[l.id] || {}));
    } else if (batchStageFilter === 'set_zoom_meeting') {
      effectiveLeads = effectiveLeads.filter((l: any) => batchDecisions[l.id]?.zoomLink || batchDecisions[l.id]?.zoomDate);
    }
  }

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    const stages = [
      'approval_1', 'approval_2', 'approval_3', 'approval_4', 'registered_leads',
      'pending_leads_1', 'pending_leads_2', 'pending_leads_3', 'pending_leads_4', 'rejected_leads',
      'ai_triggers', 'take_zoom_meeting', 'set_zoom_meeting'
    ];
    for (const stage of stages) {
      if (isRegistrationStageCategory(stage)) {
        if (stage.startsWith('pending_')) {
          counts[stage] = (leadsData || []).filter((l: any) => {
            const dec = batchDecisions[l.id] || {};
            const isApproved = dec.status?.startsWith('approval') ||
              dec.status === 'registered_leads' ||
              Boolean(dec.isRegistered) ||
              (dec.copies || []).some((c: string) => c.startsWith('approval') || c === 'registered_leads');
            if (isApproved) return false;
            return isRegistrationStageMember(dec, stage);
          }).length;
        } else {
          counts[stage] = (leadsData || []).filter((l: any) => isRegistrationStageMember(batchDecisions[l.id] || {}, stage)).length;
        }
      } else if (stage === 'ai_triggers') {
        counts[stage] = (leadsData || []).filter((l: any) =>
          batchDecisions[l.id]?.wtTriggered || batchDecisions[l.id]?.whatsappSent || batchDecisions[l.id]?.triggeredAt || batchDecisions[l.id]?.status === 'ai_triggers' || batchDecisions[l.id]?.copies?.includes('ai_triggers')
        ).length;
      } else if (stage === 'take_zoom_meeting') {
        counts[stage] = (leadsData || []).filter((l: any) => needsZoomReview(batchDecisions[l.id] || {})).length;
      } else if (stage === 'set_zoom_meeting') {
        counts[stage] = (leadsData || []).filter((l: any) => batchDecisions[l.id]?.zoomLink || batchDecisions[l.id]?.zoomDate).length;
      }
    }
    return counts;
  }, [leadsData, batchDecisions]);

  const totalApprovedCount = React.useMemo(() => {
    return (tabCounts['approval_1'] || 0) +
      (tabCounts['approval_2'] || 0) +
      (tabCounts['approval_3'] || 0) +
      (tabCounts['approval_4'] || 0) +
      (tabCounts['registered_leads'] || 0);
  }, [tabCounts]);

  const totalPendingCount = React.useMemo(() => {
    return (tabCounts['pending_leads_1'] || 0) +
      (tabCounts['pending_leads_2'] || 0) +
      (tabCounts['pending_leads_3'] || 0) +
      (tabCounts['pending_leads_4'] || 0);
  }, [tabCounts]);

  const getBaseLanguage = (langStr?: string): string => {
    if (!langStr) return 'english';
    const lower = langStr.toLowerCase();
    if (lower.includes('hindi')) return 'hindi';
    if (lower.includes('marathi')) return 'marathi';
    if (lower.includes('kannada')) return 'kannada';
    return 'english';
  };

  const isBatchMatchingLanguage = (w: any) => {
    if (!w) return false;
    const wLang = w.language || w.name || '';
    return getBaseLanguage(wLang) === getBaseLanguage(selectedDashboardLang);
  };

  // Only show google form batches (not "master" or system batches) that match the language
  const availableMergeBatches = workshops.filter((w: any) => 
    w && w.id && isBatchMatchingLanguage(w) && !String(w.id).startsWith('master_')
  );

  React.useEffect(() => {
    // Auto-run on load and every 2 minutes
    if (setWorkshops) {
      // Sync immediately on mount
      setWorkshops((prev: any[]) => prev.map(w => w && w.id ? { ...w, isMovedToLeadsManagement: true } : w));
      
      // And sync every 2 minutes
      const interval = setInterval(() => {
        setWorkshops((prev: any[]) => prev.map(w => w && w.id ? { ...w, isMovedToLeadsManagement: true } : w));
      }, 2 * 60 * 1000); 
      
      return () => clearInterval(interval);
    }
  }, [setWorkshops]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-3 animate-fade-in">
      {p.activeTab === 'all_leads' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setIsFormSetupCollapsed(!isFormSetupCollapsed)}
            className="w-full text-left px-6 py-4 border-b border-slate-100 bg-slate-50/50 hover:bg-slate-100 transition-colors flex items-center justify-between"
          >
            <div>
              <h2 className="text-lg font-bold text-slate-800">Workshop Registration Form</h2>
              <p className="text-sm text-slate-500">Connect a form to capture leads for this workshop.</p>
            </div>
            <div className="text-slate-400">
              {isFormSetupCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </div>
          </button>

          {!isFormSetupCollapsed && (
              <>
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold text-slate-700">Workshop Registration Form</label>
                      <span className="text-xs text-slate-500 font-medium">Data Source Selection</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={isSavingConnection} onClick={() => setFormSource('internal')} className={`rounded-lg border px-4 py-2 text-sm font-bold ${formSource === 'internal' ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Connect CRM Form</button>
                      <button type="button" disabled={isSavingConnection} onClick={() => setFormSource('google')} className={`rounded-lg border px-4 py-2 text-sm font-bold ${formSource === 'google' ? 'bg-indigo-50 border-indigo-400 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Connect Google Form</button>
                    </div>
                    <p className="text-xs text-slate-500">Save connects this form to the selected batch or the language master list until you change it. All Leads Data reads saved Bunny submissions; existing records and workflow gates are preserved.</p>
                    {formSource === 'internal' && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <label htmlFor="registration-crm-form" className="text-sm font-bold text-slate-700">Select connected CRM form</label>
                          {selectedFormId && selectedWorkshop?.formId === selectedFormId && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                              Connected & Synced
                            </span>
                          )}
                        </div>

                        <select
                          id="registration-crm-form"
                          value={selectedFormId}
                          disabled={isLoadingForms || isSavingConnection || (selectedWorkshop?.formId === selectedFormId && !isCrmFormEditable)}
                          onChange={event => setSelectedFormId(event.target.value)}
                          className={`w-full border border-slate-300 rounded-lg px-4 py-3 text-sm bg-white transition-all ${
                            selectedWorkshop?.formId === selectedFormId && !isCrmFormEditable
                              ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                              : 'focus:ring-2 focus:ring-indigo-500'
                          }`}
                        >
                          <option value="">{isLoadingForms ? 'Loading saved forms...' : 'Select a saved CRM form...'}</option>
                          {selectedFormId && !(fetchedForms || []).some((form: any) => form.formId === selectedFormId) && <option value={selectedFormId}>Saved connection: {selectedFormId}</option>}
                          {(fetchedForms || []).map((form: any) => <option key={form.formId} value={form.formId}>{form.workshopName || form.formId}</option>)}
                        </select>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {/* Green Save Permanent button */}
                          <button
                            type="button"
                            aria-label={isSavingConnection ? 'Saving connection...' : 'Save & Connect CRM Form'}
                            disabled={isSavingConnection || !selectedFormId}
                            onClick={() => {
                              void saveConnection(true);
                              setIsCrmFormEditable(false);
                            }}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                              selectedWorkshop?.formId === selectedFormId && !isCrmFormEditable
                                ? 'bg-emerald-600 text-white cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                            }`}
                          >
                            <Save size={14} />
                            {isSavingConnection ? 'Saving connection...' : (selectedWorkshop?.formId === selectedFormId && !isCrmFormEditable ? '✓ Save Permanent' : 'Save Permanent')}
                          </button>

                          {/* Red Edit Now button */}
                          {(selectedWorkshop?.formId || selectedFormId) && (
                            <button
                              type="button"
                              onClick={() => setIsCrmFormEditable(!isCrmFormEditable)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                                isCrmFormEditable
                                  ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm'
                                  : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                              }`}
                            >
                              <Edit2 size={13} />
                              {isCrmFormEditable ? '✎ Editing Active (Red)' : '✎ Edit Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {formSource === 'google' && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                          Select Google Form
                          {googleFormsList.length > 0 && (
                            <span className="text-xs font-normal text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ {googleFormsList.length} forms loaded
                            </span>
                          )}
                        </label>

                        {/* Status Banner */}
                        {needsGoogleAuth && (
                          <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="font-bold text-orange-800 text-sm">⚠ Google not connected</p>
                              <p className="text-xs text-orange-700 mt-0.5">Click the button to connect your Google account and load all your forms automatically.</p>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '') : '');
                                  const origin = window.location.origin;
                                  const res = await fetch(`/api/admin/google-form-oauth?token=${encodeURIComponent(activeToken)}&origin=${encodeURIComponent(origin)}`, {
                                    headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
                                  });
                                  const data = await res.json();
                                  if (data.authUrl) window.location.href = data.authUrl;
                                  else toast.error(data.error || 'Failed to start Google login');
                                } catch { toast.error('Failed to initiate Google Login'); }
                              }}
                              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md whitespace-nowrap flex-shrink-0"
                            >
                              🔗 Connect Google Account
                            </button>
                          </div>
                        )}

                        {/* Import history: what Google holds vs. what Bunny has saved */}
                        <GoogleFormSyncStatusBanner
                          status={googleSyncStatus}
                          isLoading={isLoadingGoogleSyncStatus}
                          isSyncing={isImportingGoogleForm}
                          unmappedCount={unmappedCount}
                          onSync={() => void handleSyncLeads()}
                          disabled={isSavingConnection}
                        />

                        {/* Quick Switch Buttons */}
                        <div className="flex flex-wrap gap-2 mb-2 bg-indigo-50 p-2 rounded-xl border border-indigo-100">
                           <span className="text-xs font-bold text-indigo-800 self-center mr-2">Quick Switch:</span>
                           <button onClick={() => {
                             setIsManualFormId(true);
                           }} className="bg-white border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 shadow-sm transition-all">
                             📝 Paste Form URL
                           </button>
                           
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            className={`w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white ${
                              isManualFormId || (selectedWorkshop?.formId === googleFormUrl && !isGoogleFormEditable)
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                                : ''
                            }`}
                            value={googleFormUrl}
                            onChange={(e) => setGoogleFormUrl(e.target.value)}
                            disabled={isManualFormId || (Boolean(selectedWorkshop?.formId === googleFormUrl) && !isGoogleFormEditable)}
                          >
                            <option value="">Select a form from your Google Drive...</option>
                            {googleFormUrl && !googleFormsList.some((form: any) => form.id === googleFormUrl) && <option value={googleFormUrl}>Saved connection: {googleFormUrl}</option>}
                            {isLoadingGoogleForms ? (
                              <option disabled>Loading Google forms...</option>
                            ) : googleFormsList.length === 0 && !needsGoogleAuth ? (
                              <option disabled>No forms found — click Refresh or Connect Google</option>
                            ) : (
                              googleFormsList.map((f: any) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))
                            )}
                          </select>

                          {/* Refresh button — reloads forms without re-auth */}
                          <button
                            onClick={async () => {
                              setIsLoadingGoogleForms(true);
                              try {
                                const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || localStorage.getItem('crm_token') || localStorage.getItem('token') || '') : '');
                                const cleanToken = activeToken.trim().replace(/^Bearer\s+/i, '');
                                const res = await fetch('/api/admin/google-forms/list', {
                                  headers: cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}
                                });
                                const data = await res.json();
                                if (res.ok && data.forms) {
                                  setGoogleFormsList(data.forms);
                                  setNeedsGoogleAuth(false);
                                  toast.success(`Loaded ${data.forms.length} forms from Google Drive!`);
                                } else if (data.needsAuth) {
                                  setNeedsGoogleAuth(true);
                                  toast.error('Please connect your Google account first');
                                } else {
                                  toast.error(data.error || 'Failed to load forms');
                                }
                              } catch { toast.error('Failed to refresh forms'); }
                              finally { setIsLoadingGoogleForms(false); }
                            }}
                            disabled={isLoadingGoogleForms}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-4 py-3 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                            title="Reload forms from Google Drive"
                          >
                            {isLoadingGoogleForms ? '⏳' : '🔄'} Refresh
                          </button>

                          {/* Reconnect button */}
                          <button
                            onClick={async () => {
                              try {
                                const activeToken = token || (typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '') : '');
                                const origin = window.location.origin;
                                const res = await fetch(`/api/admin/google-form-oauth?token=${encodeURIComponent(activeToken)}&origin=${encodeURIComponent(origin)}`, {
                                  headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
                                });
                                const data = await res.json();
                                if (data.authUrl) window.location.href = data.authUrl;
                                else toast.error(data.error || 'Failed to start Google login');
                              } catch { toast.error('Failed to initiate Google Login'); }
                            }}
                            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-4 py-3 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                            title="Reconnect Google Account"
                          >
                            🔗 Reconnect
                          </button>

                          {/* Open Google Form Button */}
                          {googleFormUrl && (
                            <a
                              href={googleFormUrl.includes('docs.google.com') ? googleFormUrl : `https://docs.google.com/forms/d/${googleFormUrl}/edit#responses`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-3 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                              title="Open form responses in Google Forms"
                            >
                              <ExternalLink size={14} /> Open
                            </a>
                          )}
                          {/* Save Permanent and Edit Now Buttons for Google Form */}
                          {googleFormUrl && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  void saveConnection(true);
                                  setIsGoogleFormEditable(false);
                                }}
                                disabled={isSavingConnection}
                                className={`px-4 py-3 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap ${
                                  selectedWorkshop?.formId === googleFormUrl && !isGoogleFormEditable
                                    ? 'bg-emerald-600 text-white cursor-default'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                                }`}
                                title="Save form connection permanently"
                              >
                                <Save size={14} /> {isSavingConnection ? 'Saving connection...' : (selectedWorkshop?.formId === googleFormUrl && !isGoogleFormEditable ? '✓ Save Permanent' : 'Save Permanent')}
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsGoogleFormEditable(!isGoogleFormEditable)}
                                className={`px-3 py-3 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                                  isGoogleFormEditable
                                    ? 'bg-red-600 text-white border-red-600 hover:bg-red-700 shadow-sm'
                                    : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                                }`}
                                title="Enable editing of form connection"
                              >
                                <Edit2 size={13} /> {isGoogleFormEditable ? '✎ Editing Active (Red)' : '✎ Edit Now'}
                              </button>
                            </>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                            <input type="checkbox" checked={isManualFormId} onChange={(e) => setIsManualFormId(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            I want to map fields manually (e.g. if the form cannot be fetched via API)
                          </label>
                          {isManualFormId && (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={googleFormUrl}
                                onChange={(e) => setGoogleFormUrl(e.target.value)}
                                placeholder="Enter Google Form ID"
                                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                        </div>

                        {/* New Filter & Search Leads Section (Mock layout) */}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-1 w-1/4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Main Filter</span>
                              <input
                                type="text"
                                placeholder="Any word, city, batch..."
                                value={leadsFilter}
                                onChange={e => setLeadsFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div className="text-slate-300 text-sm mt-4">›</div>
                            <div className="flex flex-col gap-1 w-1/4">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Sub Filter</span>
                              <input
                                type="text"
                                placeholder="Gender, country, month..."
                                value={leadsSubFilter}
                                onChange={e => setLeadsSubFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                            <div className="text-slate-300 text-sm mt-4">›</div>
                            <div className="flex flex-col gap-1 flex-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Search (Name / Email / Phone)</span>
                              <input
                                type="text"
                                placeholder="Type name, email, phone..."
                                value={leadsSubSubFilter}
                                onChange={e => setLeadsSubSubFilter(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => void saveConnection(true)}
                              disabled={isSavingConnection}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg text-sm transition-all shadow-md flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                              Save & Map Data
                            </button>
                          </div>
                        </div>

                        {/* Mapping UI will be rendered below when a form is selected and its fields are fetched */}
                        {((Object.keys(googleFormQuestionMap).length > 0 || (leadsData && leadsData.length > 0 && leadsData[0]._rawRecord)) || isManualFormId) && formSource === 'google' && (
                          <div className="mt-6 pt-4 border-t border-slate-200">
                            {(() => {
                              if (Object.keys(googleFormQuestionMap).length === 0 && leadsData && leadsData.length > 0 && leadsData[0]._rawRecord) {
                                const rawKeys = Object.keys(leadsData[0]._rawRecord);
                                rawKeys.forEach(k => {
                                  googleFormQuestionMap[k] = k;
                                });
                              }
                              return null;
                            })()}

                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-slate-800 text-sm">Map Google Form Fields to CRM</h4>
                              <div className="flex gap-2">
                                <button onClick={saveWorkshopSettings} className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1 rounded font-bold transition-colors">
                                  Save Mapping
                                </button>
                                <button onClick={() => {
                                  const id = prompt('Enter new field name (e.g., Age, Profession):');
                                  if (id && id.trim()) {
                                    setCrmFields(prev => [...prev, { id: id.trim(), label: id.trim().toUpperCase() }]);
                                  }
                                }} className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded font-bold transition-colors">
                                  + Add Field
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {crmFields.map(field => (
                                <div key={field.id} className="space-y-1 group">
                                  <div className="flex items-center justify-between h-5">
                                    <label className="text-xs font-bold text-slate-500 uppercase">{field.label}</label>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                      <button onClick={() => {
                                        const newName = prompt('Edit field name:', field.id);
                                        if (newName && newName.trim()) {
                                          setCrmFields(prev => prev.map(f => f.id === field.id ? { id: newName.trim(), label: newName.trim().toUpperCase() } : f));
                                          if (fieldMapping[field.id]) {
                                            const newMapping = { ...fieldMapping };
                                            newMapping[newName.trim()] = newMapping[field.id];
                                            delete newMapping[field.id];
                                            setFieldMapping(newMapping);
                                          }
                                        }
                                      }} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Edit Field">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                      </button>
                                      <button onClick={() => {
                                        if (confirm(`Delete the "${field.id}" field?`)) {
                                          setCrmFields(prev => prev.filter(f => f.id !== field.id));
                                          const newMapping = { ...fieldMapping };
                                          delete newMapping[field.id];
                                          setFieldMapping(newMapping);
                                        }
                                      }} className="text-slate-400 hover:text-red-600 transition-colors" title="Delete Field">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                      </button>
                                    </div>
                                  </div>
                                  {isManualFormId ? (
                                    <input
                                      type="text"
                                      placeholder="Exact form question"
                                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                      value={fieldMapping[field.id] || ''}
                                      onChange={(e) => setFieldMapping({ ...fieldMapping, [field.id]: e.target.value })}
                                    />
                                  ) : (
                                    <select
                                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                      value={fieldMapping[field.id] || ''}
                                      onChange={(e) => setFieldMapping({ ...fieldMapping, [field.id]: e.target.value })}
                                    >
                                      <option value="">-- Ignore --</option>
                                      {Object.entries(googleFormQuestionMap).map(([qId, qTitle]) => (
                                        <option key={qId} value={String(qTitle)}>{String(qTitle)}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>}

                    {formSource === 'google' && needsGoogleAuth && (
                      <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-orange-800">Google Authentication Required</h4>
                          <p className="text-sm text-orange-700 mt-1">To pull your private Google Form responses securely, please sign in with Google.</p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const origin = window.location.origin;
                              const res = await fetch(`/api/admin/google-form-oauth?token=${token}&origin=${encodeURIComponent(origin)}`);
                              const data = await res.json();
                              if (data.authUrl) {
                                window.location.href = data.authUrl;
                              } else if (data.error) {
                                toast.error(data.error);
                              }
                            } catch (e) {
                              toast.error('Failed to initiate Google Login');
                            }
                          }}
                          className="bg-white border border-orange-300 hover:bg-orange-100 text-orange-800 font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                        >
                          Sign in with Google
                        </button>
                      </div>
                    )}
                    {formSource === 'google' && googleAuthError && (
                      <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                        <strong>Google API Error:</strong> {googleAuthError}
                      </div>
                    )}
                  </div>


                </div>


                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-4 shadow-inner z-10">

                  {/* Filter Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Level 1 — Main: Workshop / Form */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Main Filter</span>
                      <input
                        type="text"
                        list="filter-options"
                        placeholder="Any word, city, batch..."
                        value={leadsFilter}
                        onChange={e => setLeadsFilter(e.target.value)}
                        className="w-[180px] border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>

                    <div className="text-slate-300 text-lg">›</div>

                    {/* Level 2 — Sub: Gender / Country */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Sub Filter</span>
                      <input
                        type="text"
                        list="filter-options"
                        placeholder="Gender, country, month..."
                        value={leadsSubFilter}
                        onChange={e => setLeadsSubFilter(e.target.value)}
                        className="w-[160px] border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>

                    <div className="text-slate-300 text-lg">›</div>

                    {/* Level 3 — Sub-Sub: Free text search */}
                    <div className="flex flex-col gap-0.5 flex-1 min-w-[200px]">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Search (Name / Email / Phone)</span>
                      <input
                        type="text"
                        list="filter-options"
                        placeholder="Type name, email, phone..."
                        value={leadsSubSubFilter}
                        onChange={e => setLeadsSubSubFilter(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      />
                    </div>

                    {/* Clear all */}
                    {(leadsFilter || leadsSubFilter || leadsSubSubFilter) && (
                      <button
                        onClick={() => { setLeadsFilter(''); setLeadsSubFilter(''); setLeadsSubSubFilter(''); }}
                        className="mt-4 text-xs text-red-500 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => void saveConnection(true)}
                      disabled={isSavingConnection}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md transform hover:scale-105 active:scale-95 duration-200"
                    >
                      <Users size={18} /> Save & Map Data
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Render Fetched Leads Inline in Forms Tab */}
        {(linkedFormId || effectiveLeads.length > 0 || p.activeTab === 'my_data' || p.activeTab === 'all_leads' || p.activeTab === 'our_workshops' || p.activeTab === 'my_batches') && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                  All New Leads ({p.selectedDashboardLang || 'All Languages'})
                  <span className="text-sm font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                    <CheckCircle size={14} className="text-emerald-600" />
                    Total Approved: {totalApprovedCount}
                  </span>
                  {totalPendingCount > 0 && (
                    <span className="text-sm font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full inline-flex items-center gap-1.5 shadow-sm">
                      ⏱ Pending: {totalPendingCount}
                    </span>
                  )}
                  {effectiveLeads.length > 0 && <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{effectiveLeads.length} leads</span>}
                  {isLoadingLeads && (
                    <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                      Syncing...
                    </span>
                  )}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {(p.activeTab === 'my_batches' || p.activeTab === 'our_workshops') && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        const leadsToDownload = effectiveLeads.filter(Boolean);
                        if (!leadsToDownload.length) return alert("No leads to download");
                        const headers = ['Name', 'WhatsApp', 'Email'];
                        const rows = leadsToDownload.map((l: any) => {
                          const name = l.name || l.Name || '';
                          const phone = l.phoneNumber || l.whatsapp || l.WhatsApp || l.Contact || '';
                          const email = l.email || l.Email || '';
                          return [name, phone, email].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
                        });
                        const csvContent = [headers.join(','), ...rows].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `Batch_Leads_${new Date().toISOString().split('T')[0]}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <Download size={14} /> Download Selected Batch Leads
                    </button>
                    <button
                      onClick={() => setIsMergeModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeftRight size={14} /> Merge Data
                    </button>
                    <button
                      onClick={() => {
                        if (setWorkshops) {
                          setWorkshops((prev: any[]) => prev.map(w => w && w.id ? { ...w, isMovedToLeadsManagement: true } : w));
                          toast.success('🤖 AI-2: Successfully processed! All batches and forms are now available in Leads Management.');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                    >
                      🤖 AI-2
                    </button>
                    <button
                      onClick={handleDeleteDuplicates}
                      disabled={isDeletingDuplicates}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                      title="Remove all duplicate rows across this form"
                    >
                      <Trash2 size={13} className={isDeletingDuplicates ? 'animate-spin' : ''} />
                      {isDeletingDuplicates ? 'Deleting…' : 'Delete Duplicates'}
                    </button>

                    <div className="w-px h-6 bg-slate-200 mx-1"></div>

                    {/* 3 Header Dropdowns: 1. Approvals, 2. Pending & Rejected, 3. WhatsApp & Schedules */}
                    <div className="relative">
                      <select
                        aria-label="Approval and Registered filter"
                        className="bg-emerald-50 border-2 border-emerald-300 hover:border-emerald-400 text-emerald-800 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500"
                        value={batchStageFilter.startsWith('approval') || batchStageFilter === 'registered_leads' ? batchStageFilter : ''}
                        onChange={(e) => setBatchStageFilter(e.target.value)}
                      >
                        <option value="">✓ Total Approved: {totalApprovedCount} (1-4 & Reg)...</option>
                        <option value="approval_1">Approval-1 ({tabCounts['approval_1'] || 0})</option>
                        <option value="approval_2">Approval-2 ({tabCounts['approval_2'] || 0})</option>
                        <option value="approval_3">Approval-3 ({tabCounts['approval_3'] || 0})</option>
                        <option value="approval_4">Approval-4 ({tabCounts['approval_4'] || 0})</option>
                        <option value="registered_leads">Registered leads ({tabCounts['registered_leads'] || 0})</option>
                      </select>
                    </div>

                    <div className="relative">
                      <select
                        aria-label="Pending and Rejected filter"
                        className="bg-amber-50 border-2 border-amber-300 hover:border-amber-400 text-amber-900 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-amber-500"
                        value={batchStageFilter.startsWith('pending') || batchStageFilter === 'rejected_leads' ? batchStageFilter : ''}
                        onChange={(e) => setBatchStageFilter(e.target.value)}
                      >
                        <option value="">⏱ Pending (1-4 & Rej)...</option>
                        <option value="pending_leads_1">Pending-1 ({tabCounts['pending_leads_1'] || 0})</option>
                        <option value="pending_leads_2">Pending-2 ({tabCounts['pending_leads_2'] || 0})</option>
                        <option value="pending_leads_3">Pending-3 ({tabCounts['pending_leads_3'] || 0})</option>
                        <option value="pending_leads_4">Pending-4 ({tabCounts['pending_leads_4'] || 0})</option>
                        <option value="rejected_leads">Rejected leads ({tabCounts['rejected_leads'] || 0})</option>
                      </select>
                    </div>

                    <div className="relative">
                      <select
                        aria-label="WhatsApp and Schedule actions"
                        className="bg-emerald-50 border-2 border-[#25D366] text-emerald-900 rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-[#25D366]"
                        value={batchStageFilter === 'ai_triggers' || batchStageFilter === 'take_zoom_meeting' || batchStageFilter === 'set_zoom_meeting' ? batchStageFilter : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__trigger_modal__') {
                            setShowWTSettingsModal(true);
                          } else {
                            setBatchStageFilter(val);
                          }
                        }}
                      >
                        <option value="">⚡ WhatsApp & Schedule...</option>
                        <option value="__trigger_modal__">🟢 WhatsApp Trigger Settings</option>
                        <option value="ai_triggers">📊 WhatsApp Report / Triggers ({tabCounts['ai_triggers'] || 0})</option>
                        <option value="take_zoom_meeting">📅 Group Schedule / Zoom ({tabCounts['take_zoom_meeting'] || 0})</option>
                        <option value="set_zoom_meeting">⏰ Set Zoom Meeting ({tabCounts['set_zoom_meeting'] || 0})</option>
                      </select>
                    </div>



                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </div>
                )}
                {selectedRowIds.length > 0 && (
                  <>
                    {renderBulkActions()}
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </>
                )}

                {p.activeTab !== 'my_batches' && p.activeTab !== 'our_workshops' && (
                  <>
                    {/* AI-7 and AI-1A sync buttons hidden as they now run automatically from the backend */}
                    
                    <button
                      onClick={() => void handleSyncLeads()}
                      disabled={isImportingGoogleForm || !googleFormId}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1 shrink-0 mr-2"
                      title="Import new responses from Google Forms into Bunny, then refresh this list"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isImportingGoogleForm ? 'animate-spin' : ''}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                      {isImportingGoogleForm ? 'Importing…' : 'Sync Leads'}
                    </button>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 mr-2 shrink-0">
                      <span className="text-xs font-bold text-indigo-700 whitespace-nowrap">AI-1</span>
                      <input
                        type="text"
                        placeholder="Col # or Name"
                        className="w-28 text-xs border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 shrink-0"
                        value={p.ai1ColumnInput || ''}
                        onChange={(e) => {
                          if (p.setAi1ColumnInput) p.setAi1ColumnInput(e.target.value);
                        }}
                      />
                      <button
                        onClick={() => {
                          if (p.saveAi1Column) p.saveAi1Column();
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-1 shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          if (p.handleAi1BatchCreate) p.handleAi1BatchCreate();
                        }}
                        disabled={p.isAi1Processing}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm ml-1 shrink-0 whitespace-nowrap"
                        title="Automatically create batches from mapped dates"
                      >
                        {p.isAi1Processing ? '⏳ Generating...' : 'Create Batches'}
                      </button>
                    </div>

                    <button
                      onClick={handleDeleteDuplicates}
                      disabled={isDeletingDuplicates}
                      className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                      title="Remove all duplicate rows across this form"
                    >
                      <Trash2 size={13} className={isDeletingDuplicates ? 'animate-spin' : ''} />
                      {isDeletingDuplicates ? 'Deleting…' : 'Delete Duplicates'}
                    </button>
                  </>
                )}

                {selectedRowIds.length > 0 && (
                  <button
                    onClick={handleApproveBulk}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                  >
                    Move to CRM ({selectedRowIds.length})
                  </button>
                )}
              </div>
            </div>
            <div className="px-6 py-3 bg-white border-b border-slate-200 space-y-2">

              <datalist id="filter-options">
                {filterOptions.map((opt, i) => (
                  <option key={i} value={opt} />
                ))}
              </datalist>


              {/* Result count */}
              {(leadsFilter || leadsSubFilter || leadsSubSubFilter) && (
                <span className="mt-4 text-xs text-slate-500 whitespace-nowrap">
                  {effectiveLeads.filter((lead: any) => {
                    const f1 = !leadsFilter || JSON.stringify(lead).toLowerCase().includes(leadsFilter.toLowerCase());
                    const f2 = !leadsSubFilter || JSON.stringify(lead).toLowerCase().includes(leadsSubFilter.toLowerCase());
                    const f3 = !leadsSubSubFilter || JSON.stringify(lead).toLowerCase().includes(leadsSubSubFilter.toLowerCase());
                    return f1 && f2 && f3;
                  }).length} results
                </span>
              )}
            </div>
            <div className="overflow-x-auto min-h-[300px] bg-white">
              {(() => {
                let tab2Leads = effectiveLeads.map((lead: any, index: number) => ({ ...lead, originalIndex: index }));

                if (leadsFilter || leadsSubFilter || leadsSubSubFilter) {
                  tab2Leads = tab2Leads.filter(lead => {
                    // Level 1, 2, 3: Full string search across all fields
                    const f1 = !leadsFilter || JSON.stringify(lead).toLowerCase().includes(leadsFilter.toLowerCase());
                    const f2 = !leadsSubFilter || JSON.stringify(lead).toLowerCase().includes(leadsSubFilter.toLowerCase());
                    const f3 = !leadsSubSubFilter || JSON.stringify(lead).toLowerCase().includes(leadsSubSubFilter.toLowerCase());
                    return f1 && f2 && f3;
                  });
                }

                tab2Leads.sort((a, b) => {
                  const aProcessed = crmLeadIds.includes(a.id);
                  const bProcessed = crmLeadIds.includes(b.id);

                  if (aProcessed !== bProcessed) return aProcessed ? 1 : -1;

                  // Parse actual form fill date
                  const getTimestamp = (lead: any) => {
                    const ts = lead.createdAt || lead._rawRecord?.['Timestamp'] || lead._rawRecord?.['timestamp'];
                    return ts ? new Date(ts).getTime() : 0;
                  };

                  const aTime = getTimestamp(a);
                  const bTime = getTimestamp(b);

                  if (aTime && bTime && aTime !== bTime) {
                    return tab2SortOrder === 'asc' ? aTime - bTime : bTime - aTime;
                  }

                  return tab2SortOrder === 'asc'
                    ? a.originalIndex - b.originalIndex
                    : b.originalIndex - a.originalIndex;
                });

                const tsWidth = colWidths['t2_timestamp'] || 140;
                const nameWidth = colWidths['t2_name'] || 150;
                const waWidth = colWidths['t2_whatsapp'] || 110;
                const nameLeft = 50 + tsWidth;
                const waLeft = nameLeft + nameWidth;

                const range = registrationPage(tab2Leads.length, pagination.page);
                return (
                  <>
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 sticky top-0 z-30 border-b border-slate-200 uppercase text-xs shadow-sm">
                      <tr className="divide-x divide-slate-200">
                        <th className="px-4 py-3 font-bold text-slate-500 text-center w-[50px] min-w-[50px] sticky left-0 z-30 bg-slate-50">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            checked={tab2Leads.length > 0 && selectedRowIds.length === tab2Leads.length}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRowIds(tab2Leads.map(l => l?.id).filter(Boolean));
                              else setSelectedRowIds([]);
                            }}
                          />
                        </th>
                        <th style={{ width: `${tsWidth}px`, minWidth: `${tsWidth}px`, maxWidth: `${tsWidth}px`, left: '50px' }} className="px-4 py-3 font-bold text-slate-500 sticky z-30 bg-slate-50 group">
                          <button onClick={() => setTab2SortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                            Timestamp
                            <ChevronDown size={14} className={`transform transition-transform ${tab2SortOrder === 'asc' ? 'rotate-180' : ''}`} />
                          </button>
                          <div className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors" onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.pageX;
                            const onMouseMove = (moveEvent: MouseEvent) => setColWidths(prev => ({ ...prev, t2_timestamp: Math.max(50, tsWidth + moveEvent.pageX - startX) }));
                            const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
                            document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
                          }} />
                        </th>
                        <th style={{ width: `${nameWidth}px`, minWidth: `${nameWidth}px`, maxWidth: `${nameWidth}px`, left: `${nameLeft}px` }} className="px-4 py-3 font-bold text-slate-500 sticky z-30 bg-slate-50 group">
                          Name
                          <div className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors" onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.pageX;
                            const onMouseMove = (moveEvent: MouseEvent) => setColWidths(prev => ({ ...prev, t2_name: Math.max(50, nameWidth + moveEvent.pageX - startX) }));
                            const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
                            document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
                          }} />
                        </th>
                        <th style={{ width: `${waWidth}px`, minWidth: `${waWidth}px`, maxWidth: `${waWidth}px`, left: `${waLeft}px` }} className="px-4 py-3 font-bold text-slate-500 sticky z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] group">
                          WhatsApp
                          <div className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors" onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.pageX;
                            const onMouseMove = (moveEvent: MouseEvent) => setColWidths(prev => ({ ...prev, t2_whatsapp: Math.max(50, waWidth + moveEvent.pageX - startX) }));
                            const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
                            document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp);
                          }} />
                        </th>
                        {showDynamicColumns && dynamicColumns.map(col => {
                          const width = colWidths[`t2_${col}`] || 150;
                          return (
                            <th key={col} style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }} className="px-4 py-3 font-bold text-slate-500 whitespace-normal break-words leading-tight relative group">
                              <div className="line-clamp-4" title={col}>{col}</div>
                              <div className="absolute right-0 top-0 bottom-0 w-1 hover:w-2 bg-transparent hover:bg-indigo-400 cursor-col-resize z-50 transition-colors" onMouseDown={(e) => {
                                e.preventDefault();
                                const startX = e.pageX;
                                const onMouseMove = (moveEvent: MouseEvent) => {
                                  setColWidths(prev => ({ ...prev, [`t2_${col}`]: Math.max(50, width + moveEvent.pageX - startX) }));
                                };
                                const onMouseUp = () => {
                                  document.removeEventListener('mousemove', onMouseMove);
                                  document.removeEventListener('mouseup', onMouseUp);
                                };
                                document.addEventListener('mousemove', onMouseMove);
                                document.addEventListener('mouseup', onMouseUp);
                              }} />
                            </th>
                          )
                        })}
                        <th className="px-4 py-3 font-bold text-slate-500 w-[200px] min-w-[200px]">Email</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">Gender</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">Age</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">City</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Country</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {isLoadingLeads && tab2Leads.length === 0 ? (
                        <tr>
                          <td colSpan={10 + dynamicColumns.length} className="p-8 text-slate-500">
                            <div className="sticky left-12 inline-flex items-center gap-2 font-medium">
                              <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                              <span>Loading leads...</span>
                            </div>
                          </td>
                        </tr>
                      ) : tab2Leads.length === 0 ? (
                        <tr>
                          <td colSpan={10 + dynamicColumns.length} className="p-12 text-slate-500">
                            <div className="sticky left-12 inline-block">
                              <h3 className="font-bold text-slate-700">No leads found</h3>
                              <p className="text-sm text-slate-500 mt-1">
                                {effectiveLeads.length > 0
                                  ? `All ${effectiveLeads.length} leads have active search filters applied.`
                                  : 'Syncing form responses or no leads recorded yet.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tab2Leads.slice(range.offset, range.end).map((lead, i) => {
                          const isProcessed = crmLeadIds.includes(lead.id);
                          const isSelected = selectedRowIds.includes(lead.id);
                          const bgClass = isProcessed ? 'bg-slate-50 opacity-60' : isSelected ? 'bg-indigo-50 group-hover:bg-indigo-100' : 'bg-white group-hover:bg-slate-50';

                          return (
                            <tr key={lead.id || i} className={`group transition-colors ${bgClass} divide-x divide-slate-200`}>
                              <td className={`px-4 py-3 text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${bgClass} transition-colors`}>
                                <input
                                  type="checkbox"
                                  className={`rounded border-slate-300 focus:ring-indigo-500 ${isProcessed ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600'}`}
                                  checked={isProcessed || isSelected}
                                  disabled={isProcessed}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRowIds(prev => [...prev, lead.id]);
                                    } else {
                                      setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                    }
                                  }}
                                />
                              </td>
                              <td style={{ width: `${tsWidth}px`, minWidth: `${tsWidth}px`, maxWidth: `${tsWidth}px`, left: '50px' }} className={`px-4 py-3 whitespace-nowrap text-xs text-slate-600 sticky z-20 ${bgClass} transition-colors`}>
                                <div className="truncate w-full">{getLeadTimestamp(lead)}</div>
                              </td>
                              <td style={{ width: `${nameWidth}px`, minWidth: `${nameWidth}px`, maxWidth: `${nameWidth}px`, left: `${nameLeft}px` }} className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap sticky z-20 ${bgClass} transition-colors`}>
                                <div className="truncate w-full" title={getLeadName(lead)}>{getLeadName(lead)}</div>
                              </td>
                              <td style={{ width: `${waWidth}px`, minWidth: `${waWidth}px`, maxWidth: `${waWidth}px`, left: `${waLeft}px` }} className={`px-4 py-3 whitespace-nowrap sticky z-20 ${bgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                {(() => {
                                  const currentPhone = getLeadPhone(lead);
                                  const isEditingThis = editingWaLeadId === lead.id;
                                  const hasUndo = Boolean(waUndoStack[lead.id]);
                                  const isSavingThis = isSavingLeadField === lead.id;

                                  if (isEditingThis) {
                                    return (
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="text"
                                          autoFocus
                                          value={editingWaVal}
                                          onChange={(e) => setEditingWaVal(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              if (editingWaVal.trim() && editingWaVal !== currentPhone) {
                                                setWaUndoStack(prev => ({ ...prev, [lead.id]: currentPhone }));
                                                void saveLeadPhone(lead.id, editingWaVal.trim(), lead.country);
                                              } else {
                                                setEditingWaLeadId(null);
                                              }
                                            } else if (e.key === 'Escape') {
                                              setEditingWaLeadId(null);
                                            }
                                          }}
                                          className="w-36 text-xs px-2 py-1 border border-indigo-300 rounded font-mono focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                                          placeholder="Enter WhatsApp"
                                        />
                                        <button
                                          type="button"
                                          disabled={isSavingThis}
                                          onClick={() => {
                                            if (editingWaVal.trim() && editingWaVal !== currentPhone) {
                                              setWaUndoStack(prev => ({ ...prev, [lead.id]: currentPhone }));
                                              void saveLeadPhone(lead.id, editingWaVal.trim(), lead.country);
                                            } else {
                                              setEditingWaLeadId(null);
                                            }
                                          }}
                                          className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                                          title="Save (Auto-saves to database)"
                                        >
                                          <Check size={14} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingWaLeadId(null)}
                                          className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                          title="Cancel"
                                        >
                                          <X size={14} />
                                        </button>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center justify-between gap-1 group/wa">
                                      <div className="flex items-center gap-1.5 truncate">
                                        {currentPhone ? (
                                          <a
                                            href={`https://wa.me/${currentPhone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-emerald-700 hover:text-emerald-900 hover:underline font-mono text-xs"
                                            title={currentPhone}
                                          >
                                            {currentPhone}
                                          </a>
                                        ) : (
                                          <span className="text-xs text-slate-400 italic">-</span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-80 group-hover/wa:opacity-100">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingWaLeadId(lead.id);
                                            setEditingWaVal(currentPhone);
                                          }}
                                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                          title="Edit WhatsApp number"
                                        >
                                          <Edit2 size={12} />
                                        </button>
                                        {hasUndo && (
                                          <button
                                            type="button"
                                            disabled={isSavingThis}
                                            onClick={() => void undoLeadPhone(lead.id)}
                                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition-colors flex items-center gap-0.5"
                                            title={`Undo change (revert to ${waUndoStack[lead.id]})`}
                                          >
                                            <RotateCcw size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                              {showDynamicColumns && dynamicColumns.map(col => {
                                const val = getLeadAnswer(lead, col);
                                const width = colWidths[`t2_${col}`] || 150;
                                return (
                                  <td key={col} style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }} className="px-4 py-3 whitespace-normal break-words text-slate-500 text-xs">
                                    <div
                                      className="line-clamp-2 outline-none hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1 -mx-1"
                                      title={val}
                                      contentEditable
                                      suppressContentEditableWarning
                                      onBlur={(e) => {
                                        const newValue = e.currentTarget.textContent || '';
                                        if (newValue !== val && newValue !== '-') {
                                          setLeadsData(prev => (prev || []).filter(Boolean).map(l => {
                                            if (!l) return l;
                                            if (l.id === lead.id) {
                                              const updated = { ...l };
                                              if (updated.dynamicAnswers && col in updated.dynamicAnswers) updated.dynamicAnswers = { ...updated.dynamicAnswers, [col]: newValue };
                                              if (updated._rawRecord) updated._rawRecord = { ...updated._rawRecord, [col]: newValue };
                                              return updated;
                                            }
                                            return l;
                                          }));
                                        }
                                      }}
                                    >{val}</div>
                                  </td>
                                )
                              })}
                              <td className={`px-4 py-3 whitespace-nowrap w-[200px] min-w-[200px] ${bgClass} transition-colors`}>
                                <div className="truncate w-full text-xs" title={getLeadEmail(lead)}>{getLeadEmail(lead)}</div>
                              </td>
                              <td className="px-4 py-3 capitalize whitespace-nowrap min-w-[100px] text-xs">{getLeadGender(lead)}</td>
                              <td className="px-4 py-3 whitespace-nowrap min-w-[100px] text-xs">{getLeadAge(lead)}</td>
                              <td className="px-4 py-3 whitespace-nowrap min-w-[150px] text-xs">{getLeadCity(lead)}</td>
                              <td className="px-4 py-3 whitespace-nowrap min-w-[150px] text-xs">{getLeadCountry(lead)}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-right">
                                <button
                                  onClick={() => handleApprove(lead.id)}
                                  disabled={isProcessed}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isProcessed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100'}`}
                                >
                                  {isProcessed ? 'Moved' : 'Move to CRM'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  <RegistrationPagination range={range} onPage={pagination.onPage} />
                  </>
                );
              })()}
            </div>
          </div>
        )}

      {/* Merge Batches Modal */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="text-indigo-500" />
                Merge Batches
                <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-xs ml-2 font-bold">
                  {availableMergeBatches.reduce((acc, b) => acc + (b.leads || 0), 0)} Leads
                </span>
              </h3>
              <button onClick={() => { setIsMergeModalOpen(false); setMergeTargetId(''); setMergeSourceIds([]); }} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">1. Select Destination Batch / Form (Keep this one)</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                  value={mergeTargetId}
                  onChange={e => {
                    setMergeTargetId(e.target.value);
                    if (mergeSourceIds.includes(e.target.value)) {
                      setMergeSourceIds(prev => prev.filter(id => id !== e.target.value));
                    }
                  }}
                >
                  <option value="">Select destination form/batch...</option>
                  {availableMergeBatches.map((w: any) => (
                    <option key={w.id} value={w.id}>{w.name} ({w.leads || 0} leads)</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700">2. Select Source Batches / Forms (Move leads FROM these)</label>
                  {mergeSourceIds.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">
                      {availableMergeBatches.filter((w: any) => mergeSourceIds.includes(w.id)).reduce((acc, b) => acc + (b.leads || 0), 0)} Leads Selected
                    </span>
                  )}
                </div>
                <div className="w-full border border-slate-300 rounded-lg p-2 text-sm bg-white min-h-[120px] max-h-[200px] overflow-y-auto space-y-1">
                  {availableMergeBatches.filter((w: any) => w.id !== mergeTargetId).length === 0 ? (
                    <div className="text-slate-400 p-2 text-center italic">No other batches or forms available</div>
                  ) : (
                    availableMergeBatches.filter((w: any) => w.id !== mergeTargetId).map((w: any) => (
                      <label key={w.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={mergeSourceIds.includes(w.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setMergeSourceIds(prev => [...prev, w.id]);
                            } else {
                              setMergeSourceIds(prev => prev.filter(id => id !== w.id));
                            }
                          }}
                        />
                        <span className="text-slate-700 truncate">{w.name} ({w.leads || 0} leads)</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={() => { setIsMergeModalOpen(false); setMergeTargetId(''); setMergeSourceIds([]); }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={!mergeTargetId || mergeSourceIds.length === 0}
                onClick={async () => {
                  const target = workshops.find((w: any) => w.id === mergeTargetId);
                  const sources = workshops.filter((w: any) => mergeSourceIds.includes(w.id));
                  if (!target || sources.length === 0) return;

                  if (window.confirm(`Are you sure you want to merge ${mergeSourceIds.length} source item(s) into "${target.name}"? The source batch(es) will be merged into the target and removed.`)) {
                    let combinedKeywords = (target.formFilterKeyword || target.name || '').split('|');
                    let totalLeads = target.leads || 0;
                    
                    sources.forEach((src: any) => {
                      const srcKeywords = (src.formFilterKeyword || src.name || '').split('|');
                      combinedKeywords = [...combinedKeywords, ...srcKeywords];
                      totalLeads += (src.leads || 0);
                    });
                    
                    const finalKeywords = Array.from(new Set(combinedKeywords.map(k => k.trim()))).filter(Boolean).join('|');

                    const newWorkshops = workshops
                      .filter((w: any) => !mergeSourceIds.includes(w.id))
                      .map((w: any) => {
                        if (w.id === mergeTargetId) {
                          return { ...w, formFilterKeyword: finalKeywords, leads: totalLeads };
                        }
                        return w;
                      });
                    
                    if (typeof window !== 'undefined') {
                      const langMatch = (p.selectedDashboardLang || '').match(/^(English|Hindi|Marathi|Kannada)/i);
                      const langPrefix = langMatch ? langMatch[1].toLowerCase() : 'english';
                      try {
                        await saveRegistrationSnapshot(
                          { [`crm_${langPrefix}_workshops`]: JSON.stringify(newWorkshops) },
                          { [`crm_${langPrefix}_workshops`]: JSON.stringify(workshops) },
                          { allowBatchRemoval: true },
                        );
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'Batches were not merged.');
                        return;
                      }
                      localStorage.setItem(`crm_${langPrefix}_workshops`, JSON.stringify(newWorkshops));
                    }
                    setWorkshops(newWorkshops);
                    
                    setIsMergeModalOpen(false);
                    setMergeTargetId('');
                    setMergeSourceIds([]);
                    
                    const targetPayload = newWorkshops.find((w: any) => w.id === mergeTargetId);
                    if (targetPayload) {
                      fetch('/api/admin/crm/workshop-management', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...targetPayload, cohortId: mergeTargetId, _fullEdit: true })
                      }).catch(console.error);
                    }
                    sources.forEach((src: any) => {
                      fetch(`/api/admin/crm/workshop-management?cohortId=${src.id}`, {
                        method: 'DELETE'
                      }).catch(console.error);
                    });
                    
                    if (mergeSourceIds.includes(selectedWorkshop?.id)) {
                      setSelectedWorkshop(newWorkshops.find((w: any) => w.id === mergeTargetId) || null);
                    }
                    
                    toast.success('Batches merged successfully! Permanently saved to database.');
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg shadow-sm transition-all"
              >
                Merge Batches
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Auto-Trigger Settings Modal */}
      <WhatsAppAutoTriggerModal
        isOpen={showWTSettingsModal}
        onClose={() => setShowWTSettingsModal(false)}
        workshops={workshops}
        setWorkshops={setWorkshops}
        selectedLanguage={selectedDashboardLang}
        selectedBatchId={selectedWorkshop?.id || ''}
      />
    </div>
  );
}
