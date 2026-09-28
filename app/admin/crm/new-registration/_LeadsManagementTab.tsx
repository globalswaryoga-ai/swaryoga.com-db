import React, { useState } from 'react';
import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';

const SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText },
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck },
  { id: 'rejected_leads', label: 'Rejected leads', icon: XCircle },
];

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Kannada'];

export function LeadsManagementTab({ 
  workshops,
  selectedDashboardLang = 'English',
  selectedWorkshop = null,
  leadsData = []
}: { 
  workshops: any[];
  selectedDashboardLang?: string;
  selectedWorkshop?: any;
  leadsData?: any[];
}) {
  const toast = useToast();
  
  const [selectedLanguage, setSelectedLanguage] = useState(selectedDashboardLang);
  const [selectedBatchId, setSelectedBatchId] = useState(selectedWorkshop?.id?.startsWith('batch_') ? selectedWorkshop.id : '');
  const [activeBatchId, setActiveBatchId] = useState('');
  const [activeTab, setActiveTab] = useState('new_leads');

  type FilterCondition = { question: string; keyword: string };
  const [aiSettings, setAiSettings] = useState<Record<string, FilterCondition[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai_settings_v3');
      if (saved) return JSON.parse(saved);
      const oldSettings = localStorage.getItem('crm_ai4_settings');
      if (oldSettings) {
         const parsed = JSON.parse(oldSettings);
         return { 'AI-4': [
            { question: parsed.q1 || '', keyword: parsed.f1 || parsed.filter1 || '' },
            { question: parsed.q2 || '', keyword: parsed.f2 || parsed.filter2 || '' }
         ] };
      }
    }
    return { 'AI-4': [{ question: '', keyword: '' }, { question: '', keyword: '' }] };
  });

  const [activeModal, setActiveModal] = useState<'AI-4' | 'AI-4A' | 'AI-4B' | null>(null);
  const [modalConditions, setModalConditions] = useState<FilterCondition[]>([]);

  const openAiModal = (type: 'AI-4' | 'AI-4A' | 'AI-4B') => {
    const current = aiSettings[type] || [{ question: '', keyword: '' }];
    setModalConditions(current.map(c => ({...c})));
    setActiveModal(type);
  };

  const [batchDecisions, setBatchDecisions] = useState<Record<string, { status: string; reason: string }>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai4_decisions');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const saveAiFilter = (type: 'AI-4' | 'AI-4A' | 'AI-4B', conditions: FilterCondition[]) => {
    const newSettings = { ...aiSettings, [type]: conditions };
    setAiSettings(newSettings);
    if (typeof window !== 'undefined') localStorage.setItem('crm_ai_settings_v3', JSON.stringify(newSettings));
    
    const hasValidCondition = conditions.some(c => c.keyword.trim() || c.question.toLowerCase().includes('age'));
    
    if (!hasValidCondition) {
      const newDecisions = { ...batchDecisions };
      activeBatchLeads.forEach(lead => {
        const currentDec = batchDecisions[lead.id];
        if (!currentDec) return;
        const currentStatus = currentDec.status || 'new_leads';
        if (type === 'AI-4' && ['approval_1', 'pending_leads_1'].includes(currentStatus)) {
          if (currentDec.isRegistered) {
            newDecisions[lead.id] = { ...currentDec, status: 'new_leads', reason: 'Reset' };
          } else {
            delete newDecisions[lead.id];
          }
        }
        if (type === 'AI-4A' && ['approval_2', 'pending_leads_2'].includes(currentStatus)) {
          newDecisions[lead.id] = { ...currentDec, status: 'approval_1', reason: 'Reset' };
        }
        if (type === 'AI-4B' && (currentDec.isRegistered || currentStatus === 'pending_leads_3')) {
          newDecisions[lead.id] = { ...currentDec, isRegistered: false, status: 'approval_2', reason: 'Reset' };
        }
      });
      setBatchDecisions(newDecisions);
      if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
      toast.success(`🤖 ${type} filters cleared. Leads reset!`);
      setActiveModal(null);
      return;
    }

    const newDecisions = { ...batchDecisions };
    let approvedCount = 0;
    let pendingCount = 0;
    
    let targetApprove = '';
    let targetPending = '';
    if (type === 'AI-4') { targetApprove = 'approval_1'; targetPending = 'pending_leads_1'; }
    if (type === 'AI-4A') { targetApprove = 'approval_2'; targetPending = 'pending_leads_2'; }
    if (type === 'AI-4B') { targetApprove = 'registered'; targetPending = 'pending_leads_3'; }

    const targetLeads = activeBatchLeads.filter(lead => {
      const currentStatus = batchDecisions[lead.id]?.status || 'new_leads';
      const dec = batchDecisions[lead.id] || {};
      if (dec.isRejected) return false; // Ignore rejected
      if (type !== 'AI-4B' && dec.isRegistered) return false; // Already registered
      
      if (type === 'AI-4') return ['new_leads', 'approval_1', 'pending_leads_1'].includes(currentStatus);
      if (type === 'AI-4A') return ['approval_1', 'approval_2', 'pending_leads_2'].includes(currentStatus);
      if (type === 'AI-4B') return ['new_leads', 'approval_1', 'approval_2', 'pending_leads_1', 'pending_leads_2', 'pending_leads_3'].includes(currentStatus) || dec.isRegistered;
      return false;
    });

      targetLeads.forEach(lead => {
        const raw = lead._rawRecord || {};
        const allText = JSON.stringify(raw).toLowerCase();
        
        const reasons: string[] = [];
        let passed = true;

        conditions.forEach(c => {
          const isAge = c.question.toLowerCase().includes('age');
          if (!c.keyword.trim() && !isAge) return;

          const textToSearch = c.question ? String(raw[c.question] || '').toLowerCase() : allText;
          
          if (isAge) {
            const ageVal = parseInt(textToSearch.replace(/\D/g, ''), 10);
            if (!isNaN(ageVal) && ageVal >= 30 && ageVal <= 64) {
              // passes background check
            } else {
              passed = false;
              reasons.push(`Age not 30-64 (Found: ${textToSearch || 'None'})`);
            }
            return;
          }

          const kw = c.keyword.toLowerCase().trim();
          const subKeywords = kw.split(',').map(k => k.trim()).filter(Boolean);
          
          const matchedAny = subKeywords.some(subKw => textToSearch.includes(subKw));
          
          if (!matchedAny) {
            passed = false;
            const shortQ = c.question ? c.question.substring(0, 35) + '...' : `Keyword "${c.keyword}"`;
            reasons.push(`Failed: ${shortQ}`);
          }
        });

        if (passed) {
          if (type === 'AI-4B') {
            newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: 'approval_2', isRegistered: true, reason: 'Passed filters' };
          } else {
            newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: targetApprove, reason: 'Passed filters' };
          }
          approvedCount++;
        } else {
          if (type === 'AI-4B') {
            newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: 'pending_leads_3', isRegistered: false, reason: reasons.join(' | ') };
          } else {
            newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: targetPending, isRegistered: false, reason: reasons.join(' | ') };
          }
          pendingCount++;
        }
      });
      
      setBatchDecisions(newDecisions);
      if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
      toast.success(`🤖 ${type} Evaluated! ${approvedCount} Approved, ${pendingCount} Pending.`);
    
    setActiveModal(null);
  };

  // Filter batches by language to populate the dropdown (Only show batches moved by AI-2)
  const filteredBatches = (workshops || []).filter(
    (w) => w.id.startsWith('batch_') && 
           (w.language || 'English').toLowerCase() === selectedLanguage.toLowerCase() &&
           w.isMovedToLeadsManagement
  );

  const handleSubmit = () => {
    if (!selectedBatchId) {
      toast.error('Please select a batch first');
      return;
    }
    setActiveBatchId(selectedBatchId);
    toast.success('Batch selected. Ready to load leads...');
  };

  const activeBatch = workshops?.find(w => w.id === activeBatchId);
  const activeBatchName = activeBatch?.name || '';

  // Calculate leads for this batch based on the exact logic used in WorkshopFormTab
  const activeBatchLeads = React.useMemo(() => {
    if (!activeBatch || !activeBatch.formFilterKeyword || !leadsData) return [];
    
    const keywords = activeBatch.formFilterKeyword.toLowerCase().split('|').map((k: string) => k.trim()).filter(Boolean);
    const ai7MappedQuestion = activeBatch?.metadata?.googleFormMapping?.['AI-7'] || activeBatch?.metadata?.googleFormMapping?.['ai7'];
    
    return leadsData.filter(lead => {
      if (lead._rawRecord) {
        if (ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
          return keywords.some((k: string) => String(lead._rawRecord[ai7MappedQuestion]).toLowerCase().includes(k));
        } else {
          return keywords.some((k: string) => Object.values(lead._rawRecord).some(val => String(val).toLowerCase().includes(k)));
        }
      }
      return true;
    });
  }, [activeBatch, leadsData]);

  const availableQuestions = React.useMemo(() => {
    const questions = new Set<string>();
    (leadsData || []).forEach(lead => {
      if (lead._rawRecord) {
        Object.keys(lead._rawRecord).forEach(k => questions.add(k));
      }
    });
    return Array.from(questions);
  }, [leadsData]);



  const currentTabLeads = React.useMemo(() => {
    if (activeTab === 'new_leads' || activeTab === 'approval_1') {
      return activeBatchLeads.filter(l => !batchDecisions[l.id]?.isRejected);
    }
    if (activeTab === 'registered_leads') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered);
    }
    if (activeTab === 'rejected_leads') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRejected);
    }
    return activeBatchLeads.filter(l => batchDecisions[l.id]?.status === activeTab && !batchDecisions[l.id]?.isRejected);
  }, [activeBatchLeads, activeTab, batchDecisions]);

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-140px)] animate-fade-in">
      
      {/* Sidebar Section */}
      <aside className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-black text-slate-900 text-lg">
            Categories
          </h2>
        </div>
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          {SIDEBAR_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
              {tab.label}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Header Section */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="text-indigo-600" size={24} />
            Leads Management
          </h2>
          
          <div className="flex items-center gap-3">
            <select
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedLanguage}
              onChange={(e) => {
                setSelectedLanguage(e.target.value);
                setSelectedBatchId('');
              }}
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>

            <select
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 min-w-[320px] max-w-lg truncate"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
            >
              <option value="">-- Select Batch Name --</option>
              {filteredBatches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>

            <button
              onClick={handleSubmit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
            >
              Submit
            </button>
          </div>
        </header>

        {/* Working Area Section */}
        <main className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
          {activeBatchId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {SIDEBAR_TABS.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Showing batch-wise private data for: <strong className="text-slate-700">{activeBatchName}</strong>
                  </p>
                </div>
                {activeTab === 'new_leads' && (
                  <button
                    onClick={() => openAiModal('AI-4')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4'] || []).some(c => c.keyword) ? `AI-4 Active` : 'Configure AI-4'}
                  </button>
                )}
                {activeTab === 'approval_1' && (
                  <button
                    onClick={() => openAiModal('AI-4A')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4A'] || []).some(c => c.keyword) ? `AI-4A Active` : 'Configure AI-4A'}
                  </button>
                )}
                {activeTab === 'approval_2' && (
                  <button
                    onClick={() => openAiModal('AI-4B')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4B'] || []).some(c => c.keyword) ? `AI-4B Active` : 'Configure AI-4B'}
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Name</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">WhatsApp</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">Gender</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">City</th>
                        <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">Submitted At</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentTabLeads.length > 0 ? (
                        currentTabLeads.map((lead, i) => {
                          const leadStatus = batchDecisions[lead.id]?.status || '';
                          const rowBg = leadStatus.includes('approval') || leadStatus.includes('aprovel') || leadStatus === 'registered_leads'
                            ? 'bg-emerald-50/70 hover:bg-emerald-100/70'
                            : leadStatus.includes('pending')
                            ? 'bg-yellow-50/70 hover:bg-yellow-100/70'
                            : 'hover:bg-slate-50 transition-colors';

                          return (
                            <tr key={lead.id || i} className={rowBg}>
                              <td className="px-4 py-3 font-medium text-slate-900">{lead.name || 'Unknown'}</td>
                            <td className="px-4 py-3">
                              {lead.phone && (
                                <a href={`https://wa.me/${String(lead.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1">
                                  {lead.phone}
                                </a>
                              )}
                            </td>
                            <td className="px-4 py-3">{lead.gender || '-'}</td>
                            <td className="px-4 py-3">{lead.city || '-'}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {activeTab !== 'new_leads' && batchDecisions[lead.id]?.reason ? (
                                <span className={batchDecisions[lead.id]?.status.includes('pending') ? 'text-red-500 font-medium' : 'text-emerald-600 font-medium'}>
                                  {batchDecisions[lead.id]?.reason}
                                </span>
                              ) : (
                                lead._rawRecord?.['Timestamp'] || '-'
                              )}
                            </td>
                            <td className="px-4 py-3 text-right flex justify-end gap-2">
                              {!batchDecisions[lead.id]?.isRegistered && !batchDecisions[lead.id]?.isRejected && (
                                <>
                                  <button
                                    onClick={() => {
                                      const currentDec = batchDecisions[lead.id] || { status: 'new_leads', reason: '' };
                                      const newDecisions = { ...batchDecisions, [lead.id]: { ...currentDec, isRegistered: true, isRejected: false } };
                                      setBatchDecisions(newDecisions);
                                      if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
                                      toast.success('Lead marked as Registered!');
                                    }}
                                    className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-100 transition-colors"
                                  >
                                    Register
                                  </button>
                                  <button
                                    onClick={() => {
                                      const currentDec = batchDecisions[lead.id] || { status: 'new_leads', reason: '' };
                                      const newDecisions = { ...batchDecisions, [lead.id]: { ...currentDec, isRejected: true, isRegistered: false } };
                                      setBatchDecisions(newDecisions);
                                      if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
                                      toast.success('Lead marked as Rejected!');
                                    }}
                                    className="text-xs bg-red-50 text-red-700 font-bold px-2 py-1 rounded hover:bg-red-100 transition-colors"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {batchDecisions[lead.id]?.isRegistered && (
                                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded flex items-center gap-1">
                                  <CheckCircle size={12} /> Registered
                                </span>
                              )}
                              {batchDecisions[lead.id]?.isRejected && (
                                <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-1 rounded flex items-center gap-1">
                                  <XCircle size={12} /> Rejected
                                </span>
                              )}
                              <button className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded hover:bg-indigo-100 transition-colors">
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Users size={32} className="text-slate-300" />
                              <p>No leads found in {SIDEBAR_TABS.find(t => t.id === activeTab)?.label}.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 flex-col gap-3">
              <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-100 mb-2">
                <FileText size={24} className="text-slate-300" />
              </div>
              <p className="font-medium text-slate-500 text-lg">No batch selected</p>
              <p className="text-sm">Please select a language and batch name from the header, then click Submit.</p>
            </div>
          )}
        </main>
      </div>

      {/* AI Modal (Dynamic) */}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                🤖 {activeModal} Configurable Filter
              </h2>
              <button 
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 bg-slate-50 flex-1">
              <div className="text-sm text-slate-500 mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <strong className="text-indigo-600">Tip:</strong> Use commas to match multiple keywords (e.g. <code>job, business, housewife</code>). It acts as an <strong>OR</strong> filter!
              </div>

              {modalConditions.map((condition, idx) => (
                <div key={idx} className="space-y-3 border border-slate-200 rounded-xl p-4 bg-white shadow-sm relative transition-all">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                      Filter {idx + 1}
                    </label>
                    {modalConditions.length > 1 && (
                      <button 
                        onClick={() => setModalConditions(modalConditions.filter((_, i) => i !== idx))}
                        className="text-red-500 hover:text-red-700 font-bold text-xs bg-red-50 hover:bg-red-100 transition-colors px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <select 
                    value={condition.question}
                    onChange={(e) => {
                       const updated = [...modalConditions];
                       updated[idx].question = e.target.value;
                       setModalConditions(updated);
                    }}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">-- Search across all questions --</option>
                    {availableQuestions.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="Keyword(s) to match (e.g. 14 days OR yes, sure, okay)" 
                    value={condition.keyword}
                    onChange={(e) => {
                       const updated = [...modalConditions];
                       updated[idx].keyword = e.target.value;
                       setModalConditions(updated);
                    }}
                    className="w-full text-sm font-medium border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
                  />
                </div>
              ))}

              <button
                onClick={() => setModalConditions([...modalConditions, { question: '', keyword: '' }])}
                className="w-full border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 font-bold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
              >
                + Add Another Filter
              </button>
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => saveAiFilter(activeModal, modalConditions)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              >
                Save & Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
