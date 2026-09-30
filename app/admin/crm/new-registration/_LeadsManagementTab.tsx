import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { ZoomMeetingSetupCalendar } from '@/components/admin/crm/ZoomMeetingSetupCalendar';
import { AITriggersPanel } from './_AITriggersPanel';


// Helper to prevent double counting on long overlapping form answers
const isLeadMatchingKeyword = (valStr: string, keyword: string) => {
  const v = String(valStr).toLowerCase().trim();
  const k = String(keyword).toLowerCase().trim();
  if (!v || !k) return false;
  if (v === k) return true;
  // If it's a short custom keyword (<= 3 words), allow substring matching
  if (k.split(/\s+/).length <= 3) return v.includes(k);
  return false;
};

const SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText },
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck },
  { id: 'set_zoom_meeting', label: 'Set zoom meeting', icon: Calendar },
  { id: 'take_zoom_meeting', label: 'Take Zoom Meeting', icon: Video },
  { id: 'rejected_leads', label: 'Rejected leads', icon: XCircle },
  { id: 'ai_triggers', label: 'AI Triggers-WT', icon: Zap },
];

const LANGUAGES = ['English Workshop', 'Hindi Workshop', 'Marathi Workshop', 'Kannada Workshop'];

const getBaseLanguage = (langStr?: string): string => {
  if (!langStr) return 'english';
  const lower = langStr.toLowerCase();
  if (lower.includes('hindi')) return 'hindi';
  if (lower.includes('marathi')) return 'marathi';
  if (lower.includes('kannada')) return 'kannada';
  return 'english';
};

const matchesLanguage = (w: any, targetLang: string) => {
  if (!w) return false;
  const wLang = w.language || w.name || '';
  return getBaseLanguage(wLang) === getBaseLanguage(targetLang);
};

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
  const [selectedBatchId, setSelectedBatchId] = useState(selectedWorkshop?.id ? selectedWorkshop.id : '');
  const [activeBatchId, setActiveBatchId] = useState('');
  const [activeTab, setActiveTab] = useState('new_leads');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  // Auto-select 1st matching batch on mount
  useEffect(() => {
    if (!activeBatchId && workshops && workshops.length > 0) {
      const firstBatch = workshops.find(w => w && w.id && matchesLanguage(w, selectedLanguage || 'English Workshop'));
      if (firstBatch) {
        setSelectedBatchId(firstBatch.id);
        setActiveBatchId(firstBatch.id);
      }
    }
  }, [activeBatchId, workshops, selectedLanguage]);

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
          return keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k));
        } else {
          return keywords.some((k: string) => Object.values(lead._rawRecord).some(val => isLeadMatchingKeyword(val as string, k)));
        }
      }
      return true;
    });
  }, [activeBatch, leadsData]);

  // Sync public zoom bookings automatically
  useEffect(() => {
    if (!leadsData || leadsData.length === 0) return;

    const interval = setInterval(() => {
      const publicBookingsStr = localStorage.getItem('crm_public_zoom_bookings');
      if (!publicBookingsStr) return;

      try {
        let publicBookings = JSON.parse(publicBookingsStr);
        if (!Array.isArray(publicBookings) || publicBookings.length === 0) return;

        let changed = false;

        setBatchDecisions(prev => {
          const newDecisions = { ...prev };

          // Try to match each booking to a lead
          const remainingBookings = publicBookings.filter(booking => {
            // Find lead by email or exact whatsapp match
            const matchingLead = leadsData.find(lead => {
              const leadEmail = (lead.email || '').toLowerCase().trim();
              const leadRawEmail = (lead._rawRecord?.['Email Address'] || '').toLowerCase().trim();
              const leadPhone = String(lead.phone || '').replace(/\D/g, '');
              const leadRawPhone = String(lead._rawRecord?.['WhatsApp Number'] || lead._rawRecord?.['Mobile'] || '').replace(/\D/g, '');

              return (
                (booking.email && (booking.email === leadEmail || booking.email === leadRawEmail)) ||
                (booking.whatsapp && (booking.whatsapp === leadPhone || booking.whatsapp === leadRawPhone))
              );
            });

            if (matchingLead) {
              // Update zoom details for this lead
              newDecisions[matchingLead.id] = {
                ...(newDecisions[matchingLead.id] || {}),
                zoomDate: booking.date,
                zoomTime: booking.time,
                zoomLink: booking.link,
                zoomStatus: 'pending',
              };
              changed = true;
              return false; // Remove from queue
            }
            return true; // Keep in queue
          });

          if (changed) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
              localStorage.setItem('crm_public_zoom_bookings', JSON.stringify(remainingBookings));
            }
            toast.success('New public Zoom bookings synced successfully!');
            return newDecisions;
          }
          return prev;
        });
      } catch (e) {
        console.error('Error syncing public bookings', e);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [leadsData]);

  const availableQuestions = React.useMemo(() => {
    const questions = new Set<string>();
    (leadsData || []).forEach(lead => {
      if (lead._rawRecord) {
        Object.keys(lead._rawRecord).forEach(k => questions.add(k));
      }
    });
    return Array.from(questions);
  }, [leadsData]);

  type FilterCondition = { question: string; keyword: string };
  const [aiSettings, setAiSettings] = useState<Record<string, FilterCondition[]>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai_settings_v3');
      if (saved) return JSON.parse(saved);
      const oldSettings = localStorage.getItem('crm_ai4_settings');
      if (oldSettings) {
        const parsed = JSON.parse(oldSettings);
        return {
          'AI-4': [
            { question: parsed.q1 || '', keyword: parsed.f1 || parsed.filter1 || '' },
            { question: parsed.q2 || '', keyword: parsed.f2 || parsed.filter2 || '' }
          ]
        };
      }
    }
    return { 'AI-4': [{ question: '', keyword: '' }, { question: '', keyword: '' }] };
  });

  const [activeModal, setActiveModal] = useState<'AI-4' | 'AI-4A' | 'AI-4B' | 'AI-4C' | null>(null);
  const [modalConditions, setModalConditions] = useState<FilterCondition[]>([]);
  const [selectedQueryLeadId, setSelectedQueryLeadId] = useState<string | null>(null);

  const openAiModal = (type: 'AI-4' | 'AI-4A' | 'AI-4B' | 'AI-4C') => {
    const current = aiSettings[type] || [{ question: '', keyword: '' }];
    setModalConditions(current.map(c => ({ ...c })));
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

    if (activeBatchId) {
      const metadata = { ...(activeBatch?.metadata || {}), aiSettings: newSettings };
      fetch('/api/admin/crm/workshop-management', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId: activeBatchId, metadata })
      }).catch(console.error);
    }

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
    if (type === 'AI-4C') { targetApprove = 'new_leads'; targetPending = 'pending_leads_3'; }

    const targetLeads = activeBatchLeads.filter(lead => {
      const currentStatus = batchDecisions[lead.id]?.status || 'new_leads';
      const dec = batchDecisions[lead.id] || {};
      if (dec.isRejected) return false; // Ignore rejected
      if (type !== 'AI-4B' && dec.isRegistered) return false; // Already registered

      if (type === 'AI-4') return ['new_leads', 'approval_1', 'pending_leads_1'].includes(currentStatus);
      if (type === 'AI-4A') return ['approval_1', 'approval_2', 'pending_leads_2'].includes(currentStatus);
      if (type === 'AI-4B') return ['new_leads', 'approval_1', 'approval_2', 'pending_leads_3'].includes(currentStatus) || dec.isRegistered;
      if (type === 'AI-4C') return ['pending_leads_1', 'pending_leads_2'].includes(currentStatus);
      return false;
    });

    targetLeads.forEach(lead => {
      const raw = lead._rawRecord || {};
      const allText = JSON.stringify(raw).toLowerCase();

      const reasons: string[] = [];
      let passed = true;
      let hasAnyMatch = false;
      let evaluatedCount = 0;

      conditions.forEach(c => {
        const isAge = c.question.toLowerCase().includes('age');
        if (!c.keyword.trim() && !isAge) return;
        evaluatedCount++;

        const textToSearch = c.question ? String(raw[c.question] || '').toLowerCase() : allText;

        if (isAge) {
          const ageVal = parseInt(textToSearch.replace(/\D/g, ''), 10);
          if (!isNaN(ageVal) && ageVal >= 30 && ageVal <= 64) {
            // passes background check
            hasAnyMatch = true;
          } else {
            passed = false;
            reasons.push(`Age not 30-64 (Found: ${textToSearch || 'None'})`);
          }
          return;
        }

        const kw = c.keyword.toLowerCase().trim();
        const subKeywords = kw.split(',').map(k => k.trim()).filter(Boolean);

        const matchedAny = subKeywords.some(subKw => textToSearch.includes(subKw));

        if (matchedAny) {
          hasAnyMatch = true;
        } else {
          passed = false;
          const shortQ = c.question ? c.question.substring(0, 35) + '...' : `Keyword "${c.keyword}"`;
          reasons.push(`Failed: ${shortQ}`);
        }
      });

      if (type === 'AI-4C' && evaluatedCount > 0) {
        // For AI-4C, if ANY condition passes, the overall result passes. (OR logic)
        passed = hasAnyMatch;
      }

      if (passed) {
        if (type === 'AI-4B') {
          newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: 'approval_2', isRegistered: true, reason: 'Passed filters' };
        } else if (type === 'AI-4C') {
          // Keep their current pending status if they pass
        } else {
          newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: targetApprove, reason: 'Passed filters' };
        }
        approvedCount++;
      } else {
        if (type === 'AI-4B') {
          newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: 'pending_leads_3', isRegistered: false, reason: reasons.join(' | ') };
        } else if (type === 'AI-4C') {
          newDecisions[lead.id] = { ...(batchDecisions[lead.id] || {}), status: 'rejected_leads', isRejected: true, reason: '100% Failed: ' + reasons.join(' | ') };
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

  React.useEffect(() => {
    if (activeBatch?.metadata?.aiSettings) {
      setAiSettings(activeBatch.metadata.aiSettings);
    }
  }, [activeBatch]);

  // AI-4B Background Worker (Runs every 10 minutes)
  React.useEffect(() => {
    if (!activeBatchId || !activeBatchLeads || activeBatchLeads.length === 0) return;

    const conditions = aiSettings['AI-4B'];
    if (!conditions) return;

    const hasValidCondition = conditions.some(c => c.keyword.trim() || c.question.toLowerCase().includes('age'));
    if (!hasValidCondition) return;

    const intervalId = setInterval(() => {
      setBatchDecisions(prev => {
        const newDecisions = { ...prev };
        let hasChanges = false;
        let approvedCount = 0;
        let pendingCount = 0;

        const targetLeads = activeBatchLeads.filter(lead => {
          const dec = prev[lead.id] || {};
          const currentStatus = dec.status || 'new_leads';
          if (dec.isRejected) return false;
          if (dec.status === 'approval_2' && dec.isRegistered) return false;
          if (dec.status === 'pending_leads_3') return false;
          return ['new_leads', 'approval_1', 'approval_2'].includes(currentStatus);
        });

        if (targetLeads.length === 0) return prev;

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

          const currentStatus = newDecisions[lead.id]?.status || 'new_leads';
          const isCurrentlyRegistered = newDecisions[lead.id]?.isRegistered;

          if (passed) {
            if (currentStatus !== 'approval_2' || !isCurrentlyRegistered) {
              newDecisions[lead.id] = { ...(prev[lead.id] || {}), status: 'approval_2', isRegistered: true, reason: 'Passed filters' };
              approvedCount++;
              hasChanges = true;
            }
          } else {
            if (currentStatus !== 'pending_leads_3') {
              newDecisions[lead.id] = { ...(prev[lead.id] || {}), status: 'pending_leads_3', isRegistered: false, reason: reasons.join(' | ') };
              pendingCount++;
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
          setTimeout(() => toast.info(`🤖 AI-4B Auto-Worker processed ${approvedCount + pendingCount} new leads!`), 0);
          return newDecisions;
        }
        return prev;
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, [activeBatchId, activeBatchLeads, aiSettings, toast]);

  // Filter batches by language to populate the dropdown (Only show batches moved by AI-2)
  const filteredBatches = (workshops || []).filter(
    (w) => w && w.id && matchesLanguage(w, selectedLanguage) && w.isMovedToLeadsManagement
  );

  const handleSubmit = () => {
    if (!selectedBatchId) {
      toast.error('Please select a batch first');
      return;
    }
    setActiveBatchId(selectedBatchId);
    toast.success('Batch selected. Ready to load leads...');
  };

  const tabCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    if (!activeBatchLeads || activeBatchLeads.length === 0) return counts;

    SIDEBAR_TABS.forEach(tab => {
      let count = 0;
      if (tab.id === 'take_zoom_meeting') {
        count = activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered).length;
      } else if (tab.id === 'new_leads') {
        count = activeBatchLeads.length;
      } else if (tab.id === 'pending_leads') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return dec.status?.includes('pending') && !dec.isRejected && !dec.isRegistered;
        }).length;
      } else if (tab.id === 'approval_1') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return dec.status && !['new_leads', 'pending_leads_1'].includes(dec.status);
        }).length;
      } else if (tab.id === 'approval_2') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return ['approval_2', 'pending_leads_3'].includes(dec.status) && !dec.isRejected;
        }).length;
      } else if (tab.id === 'registered_leads') {
        count = activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered).length;
      } else if (tab.id === 'rejected_leads') {
        count = activeBatchLeads.filter(l => batchDecisions[l.id]?.isRejected).length;
      } else if (tab.id === 'pending_leads_3') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return dec.status === 'pending_leads_3' && !dec.isRegistered;
        }).length;
      } else {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return dec.status === tab.id && !dec.isRejected && !dec.isRegistered;
        }).length;
      }
      counts[tab.id] = count;
    });
    return counts;
  }, [activeBatchLeads, batchDecisions]);

  const currentTabLeads = React.useMemo(() => {
    if (activeTab === 'take_zoom_meeting') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered);
    }
    if (activeTab === 'new_leads') {
      return activeBatchLeads; // Show ALL forms here
    }
    if (activeTab === 'pending_leads') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        return dec.status?.includes('pending') && !dec.isRejected && !dec.isRegistered;
      });
    }
    if (activeTab === 'approval_1') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        // Keep a copy in approval_1 if it ever reached there (meaning it's not pending_leads_1)
        return dec.status && !['new_leads', 'pending_leads_1'].includes(dec.status);
      });
    }
    if (activeTab === 'approval_2') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        // The user specifically requested pending-3 to be shown in approval-2
        return ['approval_2', 'pending_leads_3'].includes(dec.status) && !dec.isRejected;
      });
    }
    if (activeTab === 'registered_leads') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered);
    }
    if (activeTab === 'rejected_leads') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRejected);
    }
    if (activeTab === 'pending_leads_3') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        return dec.status === 'pending_leads_3' && !dec.isRegistered;
      });
    }
    return activeBatchLeads.filter(l => {
      const dec = batchDecisions[l.id] || {};
      return dec.status === activeTab && !dec.isRejected && !dec.isRegistered;
    });
  }, [activeBatchLeads, activeTab, batchDecisions]);

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev =>
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === currentTabLeads.length && currentTabLeads.length > 0) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(currentTabLeads.map(l => l.id));
    }
  };

  const handleWhatsAppMessengerClick = () => {
    if (selectedLeads.length === 0) {
      toast.error('Please select at least one lead');
      return;
    }
    // Details will be provided later
    toast.success(`Opening WhatsApp Messenger for ${selectedLeads.length} leads...`);
  };

  const getEmail = (raw: any) => {
    const key = Object.keys(raw || {}).find(k => k.toLowerCase().includes('email'));
    return key ? raw[key] : '-';
  };
  const getCountry = (raw: any) => {
    const key = Object.keys(raw || {}).find(k => k.toLowerCase().includes('country'));
    return key ? raw[key] : '-';
  };
  const getAge = (raw: any) => {
    const key = Object.keys(raw || {}).find(k => k.toLowerCase().includes('age'));
    return key ? raw[key] : '-';
  };
  const getProfession = (raw: any) => {
    const key = Object.keys(raw || {}).find(k => k.toLowerCase().includes('profession') || k.toLowerCase().includes('occupation'));
    return key ? raw[key] : '-';
  };

  const updateZoomField = (leadId: string, field: string, val: string) => {
    setBatchDecisions(prev => {
      const nd = { ...prev, [leadId]: { ...(prev[leadId] || {}), [field]: val } };
      if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(nd));
      return nd;
    });
  };

  const markZoomStatus = (leadId: string, status: string) => {
    setBatchDecisions(prev => {
      const nd = { ...prev, [leadId]: { ...(prev[leadId] || {}), zoomStatus: status } };
      if (status === 'rejected') {
        nd[leadId].isRejected = true;
        nd[leadId].isRegistered = false;
      }
      if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(nd));
      return nd;
    });
    toast.success(`Zoom Meeting Status: ${status}`);
  };

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
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 transition-all ${activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
              <span className="flex-1">{tab.label}</span>
              {activeBatchId && tabCounts[tab.id] !== undefined && (
                <span className={`ml-auto text-[11px] font-black px-2 py-0.5 rounded-full ${activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-600'
                  }`}>
                  {tabCounts[tab.id]}
                </span>
              )}
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAiModal('AI-4')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                    >
                      🤖 {(aiSettings['AI-4'] || []).some(c => c.keyword) ? `AI-4 Active` : 'Configure AI-4'}
                    </button>
                  </div>
                )}
                {activeTab === 'approval_1' && (
                  <button
                    onClick={() => openAiModal('AI-4A')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4A'] || []).some(c => c.keyword) ? `AI-4A Active` : 'Configure AI-4A'}
                  </button>
                )}
                {activeTab === 'take_zoom_meeting' && (
                  <button
                    onClick={handleWhatsAppMessengerClick}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    💬 WhatsApp Messenger
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
                {activeTab === 'pending_leads_3' && (
                  <button
                    onClick={() => openAiModal('AI-4C')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4C'] || []).some(c => c.keyword) ? `AI-4C Active` : 'Configure AI-4C'}
                  </button>
                )}
              </div>

              {activeTab === 'set_zoom_meeting' ? (
                <div className="mt-4">
                  <ZoomMeetingSetupCalendar batchId={activeBatchId} />
                </div>
              ) : activeTab === 'ai_triggers' ? (
                <div className="mt-4">
                  <AITriggersPanel
                    workshops={workshops}
                    leadsData={activeBatchLeads}
                    selectedLanguage={selectedLanguage}
                    selectedBatchId={activeBatchId}
                    batchDecisions={batchDecisions}
                  />
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] tracking-wider">
                        {activeTab === 'take_zoom_meeting' ? (
                          <tr>
                            <th className="px-4 py-3 min-w-[50px]">
                              <input
                                type="checkbox"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                checked={selectedLeads.length > 0 && selectedLeads.length === currentTabLeads.length}
                                onChange={toggleSelectAll}
                              />
                            </th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Name</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">WhatsApp</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Email</th>
                            <th className="px-4 py-3 font-bold text-slate-500">City / Country</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Gender / Age</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Profession</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Name</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">WhatsApp</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">Gender</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">City</th>
                            <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">Submitted At</th>
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentTabLeads.length > 0 ? (
                          currentTabLeads.map((lead, i) => {
                            const leadDec = batchDecisions[lead.id] || {};
                            const leadStatus = leadDec.status || '';
                            const isRegistered = leadDec.isRegistered;
                            const isRejected = leadDec.isRejected;

                            const isPending = leadStatus.includes('pending');

                            const rowBg = activeTab.includes('approval') || isRegistered || leadStatus.includes('approval') || leadStatus.includes('aprovel') || leadStatus === 'registered_leads'
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/70'
                              : isRejected
                                ? 'bg-purple-100/70 hover:bg-purple-200/70'
                                : isPending
                                  ? 'bg-yellow-50/70 hover:bg-yellow-100/70'
                                  : 'hover:bg-slate-50 transition-colors';

                            if (activeTab === 'take_zoom_meeting') {
                              const zd = batchDecisions[lead.id] || {};
                              return (
                                <React.Fragment key={lead.id || i}>
                                  <tr className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                      <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={selectedLeads.includes(lead.id)}
                                        onChange={() => toggleLeadSelection(lead.id)}
                                      />
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{lead.name || 'Unknown'}</td>
                                    <td className="px-4 py-3">
                                      {lead.phone && (
                                        <a href={`https://wa.me/${String(lead.phone).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1">
                                          {lead.phone}
                                        </a>
                                      )}
                                    </td>
                                    <td className="px-4 py-3 truncate max-w-[150px]" title={getEmail(lead._rawRecord)}>{getEmail(lead._rawRecord)}</td>
                                    <td className="px-4 py-3">{lead.city || '-'} / {getCountry(lead._rawRecord)}</td>
                                    <td className="px-4 py-3">{lead.gender || '-'} / {getAge(lead._rawRecord)}</td>
                                    <td className="px-4 py-3 truncate max-w-[150px]" title={getProfession(lead._rawRecord)}>{getProfession(lead._rawRecord)}</td>
                                  </tr>
                                  <tr>
                                    <td colSpan={7} className="px-4 py-2 border-b-4 border-slate-100 bg-slate-50/50">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-slate-500">Date:</span>
                                          <input type="date" className="border border-slate-200 px-2 py-1 text-xs rounded shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={zd.zoomDate || ''} onChange={(e) => updateZoomField(lead.id, 'zoomDate', e.target.value)} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-slate-500">Time:</span>
                                          <input type="time" className="border border-slate-200 px-2 py-1 text-xs rounded shadow-sm focus:ring-1 focus:ring-indigo-500 outline-none" value={zd.zoomTime || ''} onChange={(e) => updateZoomField(lead.id, 'zoomTime', e.target.value)} />
                                        </div>
                                        <div className="flex flex-1 items-center gap-1 min-w-[200px]">
                                          <input type="text" placeholder="Paste Zoom Link here" className="border border-slate-200 px-2 py-1 text-xs rounded shadow-sm flex-1 focus:ring-1 focus:ring-indigo-500 outline-none" value={zd.zoomLink || ''} onChange={(e) => updateZoomField(lead.id, 'zoomLink', e.target.value)} />
                                          <button onClick={() => { navigator.clipboard.writeText(zd.zoomLink || ''); toast.success('Link copied'); }} className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded shadow-sm transition-colors flex items-center gap-1"><Copy size={12} /> Copy</button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => markZoomStatus(lead.id, 'meeting_done')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors ${zd.zoomStatus === 'meeting_done' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>Meeting Done</button>
                                          <button onClick={() => markZoomStatus(lead.id, 'pending')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors ${zd.zoomStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>Pending</button>
                                          <button onClick={() => markZoomStatus(lead.id, 'rejected')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors ${zd.zoomStatus === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Form Rejected</button>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            }

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
                                  {lead._rawRecord?.['Timestamp'] || '-'}
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                  {leadStatus.includes('pending') && batchDecisions[lead.id]?.reason && (
                                    <button
                                      onClick={() => setSelectedQueryLeadId(lead.id)}
                                      className="text-xs bg-yellow-100 text-yellow-800 font-bold px-2 py-1 rounded hover:bg-yellow-200 transition-colors whitespace-nowrap"
                                    >
                                      Query-{batchDecisions[lead.id].reason.split(' | ').length}
                                    </button>
                                  )}
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
              )}
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

      {selectedQueryLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" /> Pending Reason
              </h2>
              <button onClick={() => setSelectedQueryLeadId(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-slate-700 bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                {batchDecisions[selectedQueryLeadId]?.reason || 'No reason specified'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedQueryLeadId(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
