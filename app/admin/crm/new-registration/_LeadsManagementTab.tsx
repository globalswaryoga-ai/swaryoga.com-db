import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
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

const DEFAULT_SIDEBAR_TABS = [
  { id: 'new_leads', label: 'New Leads', icon: FileText, isSystem: true },
];

const INITIAL_CUSTOM_CATEGORIES = [
  { id: 'pending_leads', label: 'Pending Leads', icon: Clock, isSystem: false },
  { id: 'pending_leads_1', label: 'Pending Leads-1', icon: Clock, isSystem: false, aiAssignment: 'AI-4A' },
  { id: 'pending_leads_2', label: 'Pending Leads-2', icon: Clock, isSystem: false, aiAssignment: 'AI-4B' },
  { id: 'pending_leads_3', label: 'Pending Leads-3', icon: Clock, isSystem: false, aiAssignment: 'AI-4C' },
  { id: 'approval_1', label: 'Aprovel-1', icon: CheckCircle, isSystem: false, aiAssignment: 'AI-4D' },
  { id: 'approval_2', label: 'Aprovel-2', icon: CheckCircle, isSystem: false, aiAssignment: 'AI-4E' },
  { id: 'registered_leads', label: 'Registerd leads', icon: UserCheck, isSystem: true },
  { id: 'set_zoom_meeting', label: 'Set zoom meeting', icon: Calendar, isSystem: true },
  { id: 'take_zoom_meeting', label: 'Take Zoom Meeting', icon: Video, isSystem: true },
  { id: 'rejected_leads', label: 'Rejected leads', icon: XCircle, isSystem: true },
  { id: 'ai_triggers', label: 'AI Triggers-WT', icon: Zap, isSystem: true },
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
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isDragging, setIsDragging] = useState(false);

  const sidebarRef = React.useRef<HTMLElement>(null);
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !sidebarRef.current) return;
      const sidebarLeft = sidebarRef.current.getBoundingClientRect().left;
      const newWidth = Math.max(200, Math.min(e.clientX - sidebarLeft, 600));
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const [customCategories, setCustomCategories] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all system tabs from INITIAL are present
        const missing = INITIAL_CUSTOM_CATEGORIES.filter(ic => !parsed.find((p: any) => p.id === ic.id));
        return [...parsed, ...missing];
      }
    }
    return INITIAL_CUSTOM_CATEGORIES;
  });
  
  const SIDEBAR_TABS = React.useMemo(() => [...DEFAULT_SIDEBAR_TABS, ...customCategories], [customCategories]);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);


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

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalConditions, setModalConditions] = useState<FilterCondition[]>([]);
  const [selectedQueryLeadId, setSelectedQueryLeadId] = useState<string | null>(null);

  const openAiModal = (type: string) => {
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

  const saveAiFilter = (type: string, conditions: FilterCondition[]) => {
    const newSettings = { ...aiSettings, [type]: conditions };
    setAiSettings(newSettings);
    if (typeof window !== 'undefined') localStorage.setItem('crm_ai_settings_v3', JSON.stringify(newSettings));

    if (activeBatchId && /^[0-9a-fA-F]{24}$/.test(activeBatchId)) {
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

    const targetLeads = activeBatchLeads.filter(lead => {
      const currentStatus = batchDecisions[lead.id]?.status || 'new_leads';
      if (batchDecisions[lead.id]?.isRejected) return false;
      return currentStatus === activeTab; // Process only leads in the current active tab
    });

    targetLeads.forEach(lead => {
      const raw = lead._rawRecord || {};
      const allText = JSON.stringify(raw).toLowerCase();
      
      let finalCategory = '';
      let finalReason = '';
      let isSuccess = false;

      for (const c of conditions) {
        if (!c.keyword || !c.keyword.trim()) continue;
        const textToSearch = c.question ? String(raw[c.question] || '').toLowerCase() : allText;
        const kw = c.keyword.toLowerCase().trim();
        const subKeywords = kw.split(',').map(k => k.trim()).filter(Boolean);
        
        let matchedAny = false;
        
        // Age check backward compatibility
        if (c.question && c.question.toLowerCase().includes('age')) {
          const ageVal = parseInt(textToSearch.replace(/\D/g, ''), 10);
          if (!isNaN(ageVal) && ageVal >= 30 && ageVal <= 64) {
             matchedAny = true;
          }
        } else {
          matchedAny = subKeywords.some(subKw => textToSearch.includes(subKw));
        }

        if (matchedAny) {
          if (c.successCategory) {
            finalCategory = c.successCategory;
            finalReason = `Matched: ${c.keyword}`;
            isSuccess = true;
            break;
          }
        } else {
          if (c.failCategory) {
            finalCategory = c.failCategory;
            finalReason = `Failed: ${c.keyword}`;
            isSuccess = false;
            break;
          }
        }
      }

      if (finalCategory) {
        const currentDec = batchDecisions[lead.id] || {};
        newDecisions[lead.id] = { ...currentDec, status: finalCategory, reason: finalReason };
        if (isSuccess) approvedCount++;
        else pendingCount++;
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
  const handleMoveSelected = (targetStatus: string) => {
    if (!targetStatus) return;
    const newDecisions = { ...batchDecisions };
    selectedLeads.forEach(leadId => {
      const current = newDecisions[leadId] || {};
      newDecisions[leadId] = { ...current, status: targetStatus, reason: 'Manual Move' };
    });
    setBatchDecisions(newDecisions);
    if (typeof window !== 'undefined') localStorage.setItem('crm_ai4_decisions', JSON.stringify(newDecisions));
    setSelectedLeads([]);
    toast.success(`Moved ${selectedLeads.length} leads!`);
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


  // Category Management Methods
  const saveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const label = formData.get('label') as string;
    const aiAssign = formData.get('aiAssign') as string;
    
    let newCats = [...customCategories];
    if (editingCategory?.id) {
      newCats = newCats.map(c => c.id === editingCategory.id ? { ...c, label, aiAssignment: aiAssign } : c);
    } else {
      newCats.push({
        id: 'custom_' + Date.now(),
        label,
        icon: Clock,
        isSystem: false,
        aiAssignment: aiAssign
      });
    }
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    toast.success('Category saved!');
  };

  const deleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this category?')) return;
    const newCats = customCategories.filter(c => c.id !== id);
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
    if (activeTab === id) setActiveTab('new_leads');
  };

  
  const moveCategory = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newCats = [...customCategories];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    }
    setCustomCategories(newCats);
    if (typeof window !== 'undefined') localStorage.setItem('crm_custom_categories', JSON.stringify(newCats));
  };

  // Render the Category Modal
  const renderCategoryModal = () => {
    if (!isCategoryModalOpen) return null;
    
    // Generate AI-4A to AI-4P
    const allAIs = Array.from({length: 16}, (_, i) => 'AI-4' + String.fromCharCode(65 + i));
    const usedAIs = customCategories.map(c => c.aiAssignment).filter(Boolean);
    const availableAIs = allAIs.filter(ai => !usedAIs.includes(ai) || editingCategory?.aiAssignment === ai);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-[400px] overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-bold text-gray-900">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={saveCategory} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
              <input type="text" name="label" defaultValue={editingCategory?.label} required className="w-full p-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign AI (Optional)</label>
              <select name="aiAssign" defaultValue={editingCategory?.aiAssignment || ''} className="w-full p-2 border rounded-lg">
                <option value="">None</option>
                {availableAIs.map(ai => (
                  <option key={ai} value={ai}>{ai}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg">Save</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-140px)] animate-fade-in">

      {/* Sidebar Section */}
      <aside ref={sidebarRef} className="bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0 relative transition-none select-none" style={{ width: sidebarWidth }}>
        <div 
          className="absolute right-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-50 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
        />
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-black text-slate-900 text-lg">
            Categories
          </h2>
        </div>
        <div className="p-3 flex-1 overflow-y-auto space-y-1">
          <div className="flex items-center justify-between px-2 mb-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dynamic</h3>
            <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {SIDEBAR_TABS.map(tab => {
            const TabIcon = typeof tab.icon === 'function' || (tab.icon && tab.icon.$$typeof) ? tab.icon : (
  tab.id.includes('pending') ? Clock :
  tab.id.includes('approval') ? CheckCircle :
  tab.id.includes('registered') ? UserCheck :
  tab.id.includes('set_zoom') ? Calendar :
  tab.id.includes('take_zoom') ? Video :
  tab.id.includes('rejected') ? XCircle :
  tab.id.includes('ai_triggers') ? Zap :
  tab.id.includes('new_leads') ? FileText : Clock
);
            const isSystem = tab.isSystem;
            const isCustom = !isSystem;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2.5 transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <TabIcon size={16} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
                <span className="flex-1 whitespace-nowrap truncate text-left">
                  {tab.label} ({tabCounts[tab.id] || 0})
                </span>
                <div className={`gap-0.5 ml-1 ${activeTab === tab.id ? 'flex opacity-100' : 'hidden'}`}>
                  {tab.id !== 'new_leads' && (
                    <>
                      <div onClick={(e) => moveCategory(customCategories.findIndex(c => c.id === tab.id), 'up', e)} className="p-1 hover:bg-slate-700 hover:text-white rounded text-slate-300 transition-colors cursor-pointer" title="Move Up">
                        <ChevronUp className="h-3 w-3" />
                      </div>
                      <div onClick={(e) => moveCategory(customCategories.findIndex(c => c.id === tab.id), 'down', e)} className="p-1 hover:bg-slate-700 hover:text-white rounded text-slate-300 transition-colors cursor-pointer" title="Move Down">
                        <ChevronDown className="h-3 w-3" />
                      </div>
                    </>
                  )}
                  {isCustom && (
                    <>
                      <div onClick={(e) => { e.stopPropagation(); setEditingCategory(tab); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-blue-700 hover:text-white rounded text-blue-200 transition-colors cursor-pointer" title="Edit">
                        <Edit2 className="h-3 w-3" />
                      </div>
                      <div onClick={(e) => deleteCategory(tab.id, e)} className="p-1 hover:bg-red-500 hover:text-white rounded text-red-200 transition-colors cursor-pointer">
                        <Trash2 className="h-3 w-3" />
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
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
                {(() => {
                  const activeCat = SIDEBAR_TABS.find(t => t.id === activeTab);
                  const assignedAi = activeCat?.aiAssignment;
                  return (
                    <div className="flex gap-2">
                      {assignedAi && (
                        <button
                          onClick={() => openAiModal(assignedAi)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                          🤖 {(aiSettings[assignedAi] || []).some((c: any) => c.keyword) ? `${assignedAi} Active` : `Configure ${assignedAi}`}
                        </button>
                      )}
                      {activeTab === 'new_leads' && (
                        <button
                          onClick={() => openAiModal('AI-4')}
                          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                          🤖 {(aiSettings['AI-4'] || []).some((c: any) => c.keyword) ? `AI-4 Active` : 'Configure AI-4'}
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
                      {selectedLeads.length > 0 && (
                        <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                          <span className="text-xs font-bold text-indigo-800">{selectedLeads.length} selected</span>
                          <select 
                            className="text-sm rounded border-indigo-200 py-1 pl-2 pr-6 outline-none bg-white"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleMoveSelected(e.target.value);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Move to...</option>
                            {SIDEBAR_TABS.map(t => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
      {renderCategoryModal()}
      
      {renderCategoryModal()}
      {activeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                🤖 {activeModal} Configuration | {activeBatchName} - {SIDEBAR_TABS.find(t => t.id === activeTab)?.label || activeTab}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              
              {modalConditions.map((condition, idx) => (
                <div key={idx} className="space-y-4 border border-slate-200 rounded-xl p-5 bg-white shadow-sm relative">
                  {/* Row 1: Question Key */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Question Key (or column name)</label>
                    <select
                      value={condition.question || ''}
                      onChange={(e) => {
                        const updated = [...modalConditions];
                        updated[idx].question = e.target.value;
                        setModalConditions(updated);
                      }}
                      className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 outline-none bg-white"
                    >
                      <option value="">-- Search across all questions --</option>
                      {availableQuestions.map(q => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </div>

                  {/* Row 2: Success Match */}
                  <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: condition.successColor || '#e6ffed' }}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">If Correct Answer Matches:</label>
                      <input
                        type="text"
                        placeholder="Keyword(s)"
                        value={condition.keyword || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].keyword = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">Move to Category:</label>
                      <select
                        value={condition.successCategory || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].successCategory = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none bg-white"
                      >
                        <option value="">-- Select --</option>
                        {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                      <input 
                        type="color" 
                        value={condition.successColor || '#e6ffed'}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].successColor = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border"
                      />
                    </div>
                  </div>

                  {/* Row 3: Failure Mismatch */}
                  <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: condition.failColor || '#fff3cd' }}>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-gray-700 mb-1">If Answer Mismatches, Move to:</label>
                      <select
                        value={condition.failCategory || ''}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].failCategory = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="w-full text-sm border border-slate-300 rounded-md px-2 py-1 outline-none bg-white"
                      >
                        <option value="">-- Select --</option>
                        {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                      <input 
                        type="color" 
                        value={condition.failColor || '#fff3cd'}
                        onChange={(e) => {
                          const updated = [...modalConditions];
                          updated[idx].failColor = e.target.value;
                          setModalConditions(updated);
                        }}
                        className="h-8 w-12 cursor-pointer rounded border"
                      />
                    </div>
                  </div>
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
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={() => saveAiFilter(activeModal, modalConditions)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                Submit Config & Run
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
