'use client';
import React from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Settings, Save, Database, Plus, X, Edit2, ArrowLeftRight } from 'lucide-react';

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
    leadsFilter, leadsSubFilter, leadsSubSubFilter, refreshLeadsCounter, setRefreshLeadsCounter,
    setIsLoadingGoogleForms, setGoogleFormsList, setNeedsGoogleAuth, setActiveTab, Users, leadsData, isLoadingLeads, selectedRowIds, renderBulkActions, handleAi7Categorize, isAi7Processing, handleApproveBulk, filterOptions, crmLeadIds, tab2SortOrder, setSelectedRowIds, showDynamicColumns, dynamicColumns, colWidths, setColWidths, setTab2SortOrder, setLeadsData, handleApprove,
    setLeadsFilter, setLeadsSubFilter, setLeadsSubSubFilter,
    selectedDashboardLang,
  } = props;

  const [isMergeModalOpen, setIsMergeModalOpen] = React.useState(false);
  const [mergeTargetId, setMergeTargetId] = React.useState('');
  const [mergeSourceIds, setMergeSourceIds] = React.useState<string[]>([]);

  let effectiveLeads = (leadsData || []).filter(Boolean);
  
  if (p.activeTab === 'my_batches' && p.selectedWorkshop?.formFilterKeyword && p.selectedWorkshop.formFilterKeyword.trim() !== '') {
    const keywords = p.selectedWorkshop.formFilterKeyword.toLowerCase().split('|').map((k: string) => k.trim()).filter(Boolean);
    const ai7MappedQuestion = p.selectedWorkshop?.metadata?.googleFormMapping?.['AI-7'] || p.selectedWorkshop?.metadata?.googleFormMapping?.['ai7'];
    effectiveLeads = effectiveLeads.filter((lead: any) => {
      if (lead._rawRecord) {
        if (ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
          return keywords.some((k: string) => String(lead._rawRecord[ai7MappedQuestion]).toLowerCase().includes(k));
        } else {
          return keywords.some((k: string) => Object.values(lead._rawRecord).some(val => String(val).toLowerCase().includes(k)));
        }
      }
      return true;
    });
  }

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
    // Auto-run AI-2 on load and every 5 minutes
    if (setWorkshops) {
      // Sync immediately on mount
      setWorkshops((prev: any[]) => prev.map(w => w && w.id ? { ...w, isMovedToLeadsManagement: true } : w));
      
      // And sync every 5 minutes
      const interval = setInterval(() => {
        setWorkshops((prev: any[]) => prev.map(w => w && w.id ? { ...w, isMovedToLeadsManagement: true } : w));
      }, 5 * 60 * 1000); 
      
      return () => clearInterval(interval);
    }
  }, [setWorkshops]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {p.activeTab === 'all_leads' && (
          <>
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

                    <div className="flex items-center gap-6 mb-2 bg-slate-100 p-2 rounded-lg inline-flex">
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="radio"
                          name="formSource"
                          value="internal"
                          checked={formSource === 'internal'}
                          onChange={() => setFormSource('internal')}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-bold text-slate-700">Add leads form - CRM</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-white transition-colors">
                        <input
                          type="radio"
                          name="formSource"
                          value="google"
                          checked={formSource === 'google'}
                          onChange={() => setFormSource('google')}
                          className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-bold text-slate-700">Upload leads form - Google Form</span>
                      </label>
                    </div>

                    {formSource === 'internal' ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <label className="text-sm font-bold text-slate-700">Select CRM Form</label>
                        <p className="text-xs text-slate-500 mb-2">Create forms in <a href="/admin/crm/form-questions" className="text-indigo-600 hover:underline" target="_blank">Settings &gt; Forms Setup</a></p>
                        <select
                          className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                          value={selectedFormId}
                          onChange={(e) => setSelectedFormId(e.target.value)}
                        >
                          <option value="">Select a form to fetch data fields...</option>
                          {isLoadingForms ? (
                            <option disabled>Loading forms...</option>
                          ) : (
                            fetchedForms.map((f: any) => (
                              <option key={f.formId} value={f.formId}>{f.workshopName || f.formId}</option>
                            ))
                          )}
                        </select>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
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
                                  const origin = window.location.origin;
                                  const res = await fetch(`/api/admin/google-form-oauth?token=${token}&origin=${encodeURIComponent(origin)}`);
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

                        <div className="flex items-center gap-2">
                          <select
                            className={`w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white ${isManualFormId ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={googleFormUrl}
                            onChange={(e) => setGoogleFormUrl(e.target.value)}
                            disabled={isManualFormId}
                          >
                            <option value="">Select a form from your Google Drive...</option>
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
                                const res = await fetch('/api/admin/google-forms/list', {
                                  headers: token ? { Authorization: `Bearer ${token}` } : {}
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
                                const origin = window.location.origin;
                                const res = await fetch(`/api/admin/google-form-oauth?token=${token}&origin=${encodeURIComponent(origin)}`);
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
                          {googleFormUrl && (
                            <button
                              onClick={saveWorkshopSettings}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                              title="Save selected form"
                            >
                              <Save size={14} /> Save
                            </button>
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
                              onClick={() => {
                                if (formSource === 'google') {
                                  setLinkedFormId(googleFormUrl);
                                } else {
                                  setLinkedFormId(selectedFormId);
                                }

                                toast.success('Form configuration saved & mapped!');
                                setRefreshLeadsCounter(prev => prev + 1);

                                // Make sure we go to my_data tab as requested
                                setActiveTab('my_data');
                                setIsFormSetupCollapsed(true);
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg text-sm transition-all shadow-md flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                              Save & Map Data
                            </button>
                          </div>
                        </div>

                        {/* Mapping UI will be rendered below when a form is selected and its fields are fetched */}
                        {(Object.keys(googleFormQuestionMap).length > 0 || isManualFormId) && formSource === 'google' && (
                          <div className="mt-6 pt-4 border-t border-slate-200">

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
                                        <option key={qId} value={qTitle}>{qTitle}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {needsGoogleAuth && (
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
                    {googleAuthError && (
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
                      onClick={async () => {
                        if (formSource === 'internal' && !selectedFormId) {
                          toast.error('Please select a form first');
                          return;
                        }
                        if (formSource === 'google' && !googleFormUrl) {
                          toast.error('Please enter a Google Form URL');
                          return;
                        }

                        if (p.saveWorkshopSettings) {
                          await p.saveWorkshopSettings();
                        }
                        toast.success('Form saved! Mapping fields and fetching leads...');
                        if (p.setActiveTab) {
                          p.setActiveTab('my_data');
                        }
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-lg transition-colors flex items-center gap-2 shadow-md transform hover:scale-105 active:scale-95 duration-200"
                    >
                      <Users size={18} /> Save & Map Data
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}


        {/* Render Fetched Leads Inline in Forms Tab */}
        {linkedFormId && p.activeTab !== 'all_leads' && (
          <div className="border-t border-slate-200">
            <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-800">
                  Linked Leads {effectiveLeads.length > 0 && <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full ml-2">{effectiveLeads.length} leads</span>}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                {p.activeTab === 'my_batches' && (
                  <div className="flex items-center gap-2">
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
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </div>
                )}
                {selectedRowIds.length > 0 && (
                  <>
                    {renderBulkActions()}
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </>
                )}

                {p.activeTab !== 'my_batches' && (
                  <>
                    <button 
                      onClick={() => {
                        if (p.handleAi1BatchCreate) p.handleAi1BatchCreate();
                      }}
                      disabled={p.isAi1Processing}
                      className="flex items-center gap-2 bg-purple-50 hover:bg-purple-100 transition-colors px-3 py-1.5 rounded-lg border border-purple-200 shadow-sm mr-2 cursor-pointer disabled:opacity-50"
                      title="Click to instantly run Auto-Sync, or let it run every 5 minutes"
                    >
                      <span className="text-xs font-bold text-purple-700">🤖 AI-1A Auto-Sync {p.isAi1Processing ? '...' : ''}</span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                    </button>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 mr-2">
                      <span className="text-xs font-bold text-indigo-700">AI-1</span>
                      <input
                        type="text"
                        placeholder="Col # or Name"
                        className="w-24 text-xs border border-indigo-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={p.ai1ColumnInput || ''}
                        onChange={(e) => {
                          if (p.setAi1ColumnInput) p.setAi1ColumnInput(e.target.value);
                        }}
                      />
                      <button
                        onClick={() => {
                          if (p.saveAi1Column) p.saveAi1Column();
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-1"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          if (p.handleAi1BatchCreate) p.handleAi1BatchCreate();
                        }}
                        disabled={p.isAi1Processing}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1 rounded text-xs font-bold transition-colors shadow-sm ml-1"
                        title="Automatically create batches from mapped dates"
                      >
                        {p.isAi1Processing ? '⏳ Generating...' : 'Create Batches'}
                      </button>
                    </div>
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

                  return tab2SortOrder === 'asc'
                    ? a.originalIndex - b.originalIndex
                    : b.originalIndex - a.originalIndex;
                });

                return (
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
                        <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>
                        <th className="px-4 py-3 font-bold text-slate-500 w-[110px] min-w-[110px] sticky left-[200px] z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">WhatsApp</th>
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
                        <th className="px-4 py-3 font-bold text-slate-500">
                          <button onClick={() => setTab2SortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                            Submitted At
                            <ChevronDown size={14} className={`transform transition-transform ${tab2SortOrder === 'asc' ? 'rotate-180' : ''}`} />
                          </button>
                        </th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {isLoadingLeads ? (
                        <tr>
                          <td colSpan={10 + dynamicColumns.length} className="p-8 text-center text-slate-500">Loading leads...</td>
                        </tr>
                      ) : tab2Leads.length === 0 ? (
                        <tr>
                          <td colSpan={10 + dynamicColumns.length} className="p-12 text-center text-slate-500">
                            <h3 className="font-bold text-slate-700">No new forms found</h3>
                            <p className="text-sm text-slate-500 mt-1">All available forms have been moved to Leads Management.</p>
                          </td>
                        </tr>
                      ) : (
                        tab2Leads.map((lead, i) => {
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
                              <td className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[50px] z-20 ${bgClass} transition-colors`}>
                                <div className="truncate w-full" title={lead.name}>{lead.name || '-'}</div>
                              </td>
                              <td className={`px-4 py-3 whitespace-nowrap w-[110px] min-w-[110px] sticky left-[200px] z-20 ${bgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                <div className="truncate w-full" title={lead.mobile || lead.phoneNumber}>{lead.mobile || lead.phoneNumber || '-'}</div>
                              </td>
                              {showDynamicColumns && dynamicColumns.map(col => {
                                const val = (lead.dynamicAnswers && lead.dynamicAnswers[col]) || (lead._rawRecord && lead._rawRecord[col]) || '-';
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
                                <div className="truncate w-full" title={lead.email}>{lead.email || '-'}</div>
                              </td>
                              <td className="px-4 py-3 capitalize whitespace-nowrap min-w-[100px]">{lead.gender || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap min-w-[100px]">{lead.age || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap min-w-[150px]">{lead.city || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap min-w-[150px]">{lead.country || '-'}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '-'}</td>
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
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Merge Batches Modal */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <ArrowLeftRight className="text-indigo-500" />
                Merge Batches
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
                <label className="text-sm font-bold text-slate-700">2. Select Source Batches / Forms (Move leads FROM these)</label>
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
                onClick={() => {
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
                    
                    setWorkshops(newWorkshops);
                    
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('crm_workshops', JSON.stringify(newWorkshops));
                      const t = localStorage.getItem('crm_token');
                      if (t) {
                        fetch('/api/admin/crm/new-registration/state', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                          body: JSON.stringify({ crm_workshops: JSON.stringify(newWorkshops) })
                        }).catch(console.error);
                      }
                    }
                    
                    setIsMergeModalOpen(false);
                    setMergeTargetId('');
                    setMergeSourceIds([]);
                    
                    if (mergeSourceIds.includes(selectedWorkshop?.id)) {
                      setSelectedWorkshop(newWorkshops.find((w: any) => w.id === mergeTargetId) || null);
                    }
                    
                    toast.success('Batches merged successfully!');
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
    </div>
  );
}
