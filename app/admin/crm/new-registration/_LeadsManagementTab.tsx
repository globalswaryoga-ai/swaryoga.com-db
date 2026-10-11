import { registrationFetch as fetch, saveRegistrationState } from '@/lib/registrationClient';
import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { ZoomMeetingSetupCalendar } from '@/components/admin/crm/ZoomMeetingSetupCalendar';
import { AITriggersPanel } from './_AITriggersPanel';
import { registrationBatchRows } from '@/lib/registrationLeads';
import { isCurrentRegistrationStage, isRegistrationStageCategory, registrationAiConfigKey, readRegistrationAiConfig, readRegistrationDecisions, registrationDecisionKey, validateRegistrationConditions, type RegistrationFilterCondition } from '@/lib/registrationAiConfig';
import { REGISTRATION_GATE_FIELDS, needsZoomReview, zoomGatePassed, type RegistrationGateAction } from '@/lib/registrationGates';
import { registrationPage } from '@/lib/registrationPagination';
import { RegistrationPagination, useRegistrationPage } from './_RegistrationPagination';
import { QuestionRulesEditor } from './_QuestionRulesEditor';


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

const DEFAULT_SIDEBAR_TABS = [
  { id: 'new_leads', label: 'All Batch Leads', icon: FileText, isSystem: true },
];

const INITIAL_CUSTOM_CATEGORIES = [
  { id: 'pending_leads_1', label: 'Pending-1', icon: Clock, isSystem: false, aiAssignment: 'AI-4A' },
  { id: 'pending_leads_2', label: 'Pending-2', icon: Clock, isSystem: false, aiAssignment: 'AI-4B' },
  { id: 'pending_leads_3', label: 'Pending-3', icon: Clock, isSystem: false, aiAssignment: 'AI-4C' },
  { id: 'pending_leads_4', label: 'Pending-4', icon: Clock, isSystem: false, aiAssignment: 'AI-4D' },
  { id: 'approval_1', label: 'Approval-1', icon: CheckCircle, isSystem: false, aiAssignment: 'AI-4E' },
  { id: 'approval_2', label: 'Approval-2', icon: CheckCircle, isSystem: false, aiAssignment: 'AI-4F' },
  { id: 'approval_3', label: 'Approval-3', icon: CheckCircle, isSystem: false, aiAssignment: 'AI-4G' },
  { id: 'approval_4', label: 'Approval-4', icon: CheckCircle, isSystem: false, aiAssignment: 'AI-4H' },
  { id: 'registered_leads', label: 'Registered leads', icon: UserCheck, isSystem: true },
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
  if (!w || !targetLang) return false;
  const wLang = String(w.language || w.name || '').toLowerCase();
  const tLang = String(targetLang).toLowerCase();
  const isWOffer = wLang.includes('offer') || String(w.id || '').toLowerCase().includes('offer');
  const isTOffer = tLang.includes('offer');
  if (isWOffer !== isTOffer) return false;
  return getBaseLanguage(wLang) === getBaseLanguage(tLang);
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
  const [savingGate, setSavingGate] = useState(false);
  const gateSaveRef = React.useRef(false);
  const gateVersionRef = React.useRef(0);


  const syncStateToBackend = (key: string, data: any) => {
    const patch: Record<string, unknown> = key === 'crm_ai4_decisions'
      ? Object.fromEntries(Object.entries(data).map(([id, value]) => [
        registrationDecisionKey(activeBatchId, id),
        Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([field, next]) =>
          !REGISTRATION_GATE_FIELDS.includes(field) && JSON.stringify(batchDecisions[id]?.[field]) !== JSON.stringify(next))),
      ]).filter(([, value]) => Object.keys(value).length))
      : { [key]: data };
    if (!Object.keys(patch).length) return;
    void saveRegistrationState(patch).catch(error => toast.error(error.message));
  };

  const [selectedLanguage, setSelectedLanguage] = useState(selectedDashboardLang);
  const [selectedBatchId, setSelectedBatchId] = useState(selectedWorkshop?.id ? selectedWorkshop.id : '');
  const [activeBatchId, setActiveBatchId] = useState('');
  const activeBatchRef = React.useRef(activeBatchId);
  activeBatchRef.current = activeBatchId;
  const [activeTab, setActiveTab] = useState('new_leads');
  const pagination = useRegistrationPage(`${activeBatchId}:${activeTab}`);
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

  const getCategoryLabel = React.useCallback((id: string) => {
    if (!id) return 'Unknown';
    const tab = SIDEBAR_TABS.find((t: any) => t.id === id);
    return tab ? tab.label : "Deleted Folder (" + String(id).replace(/_/g, ' ') + ")";
  }, [SIDEBAR_TABS]);
  
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

  // Ensure we get the latest state from backend, overriding stale local storage on mount
  useEffect(() => {
    fetch('/api/admin/crm/new-registration/state')
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Saved funnel settings are unavailable');
        return data;
      })
      .then(data => {
        if (data) {
          if (data.crm_custom_categories) {
            try {
              let parsed = typeof data.crm_custom_categories === 'string' ? JSON.parse(data.crm_custom_categories) : data.crm_custom_categories;
              
              if (!Array.isArray(parsed)) throw new Error('Saved categories are invalid');
              
              const missing = INITIAL_CUSTOM_CATEGORIES.filter(ic => !parsed.find((p: any) => p.id === ic.id));
              const finalCategories = [...parsed, ...missing];
              setCustomCategories(finalCategories);
              
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to restore categories');
            }
          } else {
             setCustomCategories(INITIAL_CUSTOM_CATEGORIES);
          }
          if (data.crm_ai4_decisions) {
            try {
              const parsed = typeof data.crm_ai4_decisions === 'string' ? JSON.parse(data.crm_ai4_decisions) : data.crm_ai4_decisions;
              setBatchDecisions(parsed);
            } catch (_) {}
          }
        }
      })
      .catch(error => toast.error(error.message));
  }, []);

  const activeBatch = workshops?.find(w => w.id === activeBatchId);
  const activeBatchName = activeBatch?.name || '';


  const activeBatchLeads = React.useMemo(() =>
    activeBatch ? registrationBatchRows(leadsData || [], activeBatch) : [],
    [activeBatch, leadsData]);

  useEffect(() => {
    if (!activeBatchId) return;
    const controller = new AbortController();
    let reportedError = false;
    const loadBookings = async () => {
      try {
        const response = await fetch('/api/admin/crm/new-registration/zoom-bookings?batchId=' + encodeURIComponent(activeBatchId), { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !Array.isArray(payload.data)) throw new Error(payload.error || 'Failed to load Zoom bookings');
        setBatchDecisions(previous => {
          const next = { ...previous };
          for (const booking of payload.data) {
            const lead = leadsData.find(candidate => String(candidate.leadId || candidate._id || candidate.id) === booking.leadId);
            if (!lead) continue;
            const existing = next[lead.id] || {};
            const unchanged = existing.zoomDate === booking.date && existing.zoomTime === booking.time && existing.zoomLink === booking.link;
            next[lead.id] = { ...existing, zoomDate: booking.date, zoomTime: booking.time, zoomLink: booking.link, zoomStatus: unchanged ? existing.zoomStatus : 'pending' };
          }
          return next;
        });
      } catch (error) {
        if (!controller.signal.aborted && !reportedError) {
          reportedError = true;
          toast.error(error instanceof Error ? error.message : 'Failed to load Zoom bookings');
        }
      }
    };
    void loadBookings();
    const interval = setInterval(loadBookings, 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [activeBatchId, leadsData]);

  const availableQuestions = React.useMemo(() => {
    const questions = new Set<string>();
    (leadsData || []).forEach(lead => {
      if (lead._rawRecord) {
        Object.keys(lead._rawRecord).forEach(k => questions.add(k));
      }
    });
    return Array.from(questions);
  }, [leadsData]);

  type FilterCondition = RegistrationFilterCondition;
  const [aiSettings, setAiSettings] = useState<Record<string, FilterCondition[]>>({});
  const [configLoaded, setConfigLoaded] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [runningConfig, setRunningConfig] = useState(false);
  const configSaveRef = React.useRef(false);

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [modalConditions, setModalConditions] = useState<FilterCondition[]>([]);
  const [selectedQueryLeadId, setSelectedQueryLeadId] = useState<string | null>(null);

  const [aiCopyModes, setAiCopyModes] = useState<Record<string, boolean>>({});
  const [modalCopyMode, setModalCopyMode] = useState<boolean>(true);

  const openAiModal = (type: string) => {
    const current = aiSettings[type] || [{ question: '', keyword: '' }];
    setModalConditions(current.map(c => ({ ...c })));
    setModalCopyMode(aiCopyModes[type] !== false); // Default to true (Save data here & forward copy ahead)
    setActiveModal(type);
  };

  const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai4_decisions');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const saveAiConfig = async (type: string, conditions: FilterCondition[]) => {
    if (!configLoaded) throw new Error('Wait for saved AI settings to load before changing them');
    validateRegistrationConditions(conditions);
    if (configSaveRef.current) throw new Error('A configuration save is already in progress');
    configSaveRef.current = true;
    setSavingConfig(true);
    try {
      await saveRegistrationState({
        [registrationAiConfigKey(activeBatchId, type)]: { conditions, copyMode: modalCopyMode, autoEnabled: conditions.some(condition => condition.question?.trim() || condition.directMoveCategory), matchMode: 'all_questions_any_answer' },
      });
      const newSettings = { ...aiSettings, [type]: conditions };
      setAiSettings(newSettings);
      const updatedCopyModes = { ...aiCopyModes, [type]: modalCopyMode };
      setAiCopyModes(updatedCopyModes);
      toast.success(`${type} configuration saved in Bunny Database until you change it.`);
    } finally {
      setSavingConfig(false);
      configSaveRef.current = false;
    }
  };


  const saveAiFilter = async (type: string, conditions: FilterCondition[]) => {
    if (runningConfig) throw new Error('A batch worker is already running');
    const batchId = activeBatchId;
    await saveAiConfig(type, conditions);
    setActiveModal(null);
    setRunningConfig(true);
    try {
    const response = await fetch('/api/admin/crm/new-registration/funnel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchId, worker: type, ids: selectedLeads }),
    });
    const result = await response.json();
    if (result.decisions && activeBatchRef.current === batchId) setBatchDecisions(result.decisions);
    if (!response.ok) throw new Error(result.errors?.join('; ') || result.error || 'AI processing failed');
    toast.success(type + ': ' + result.processed + ' decisions updated; ' + result.passed + ' approved, ' + result.pending + ' pending/review.');
    } finally {
      setRunningConfig(false);
    }
  };

  React.useEffect(() => {
    setConfigLoaded(false);
    if (!activeBatchId) return;
    const controller = new AbortController();
    fetch('/api/admin/crm/new-registration/state', { signal: controller.signal })
      .then(async response => {
        const state = await response.json();
        if (!response.ok) throw new Error(state.error || 'Failed to load saved AI configuration');
        const saved = readRegistrationAiConfig(state, activeBatchId, activeBatch?.metadata);
        if (!controller.signal.aborted) {
          setAiSettings(saved.settings);
          setAiCopyModes(saved.copyModes);
          setBatchDecisions(readRegistrationDecisions(state, activeBatchId));
          setConfigLoaded(true);
        }
      })
      .catch(error => { if (!controller.signal.aborted) toast.error(error.message); });
    return () => controller.abort();
  }, [activeBatchId]);


  useEffect(() => {
    if (!configLoaded || !activeBatchId) return;
    const controller = new AbortController();
    let refreshing = false;
    const refresh = async () => {
      if (document.hidden || gateSaveRef.current || configSaveRef.current || runningConfig || refreshing) return;
      refreshing = true;
      const gateVersion = gateVersionRef.current;
      try {
        const response = await fetch(`/api/admin/crm/new-registration/gates?batchId=${encodeURIComponent(activeBatchId)}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to refresh funnel decisions');
        if (!controller.signal.aborted && !gateSaveRef.current && gateVersion === gateVersionRef.current) setBatchDecisions(result.decisions);
      } catch (error) {
        if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : 'Failed to refresh funnel decisions');
      } finally {
        refreshing = false;
      }
    };
    const interval = setInterval(refresh, 30000);
    return () => { controller.abort(); clearInterval(interval); };
  }, [configLoaded, activeBatchId, runningConfig]);

  // Filter batches by language to populate the dropdown (Only show batches moved by AI-2)
  const filteredBatches = (workshops || []).filter(
    (w) => w && w.id && matchesLanguage(w, selectedLanguage)
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
      if (isRegistrationStageCategory(tab.id)) {
        count = activeBatchLeads.filter(l => isCurrentRegistrationStage(batchDecisions[l.id] || {}, tab.id)).length;
      } else if (tab.id === 'take_zoom_meeting') {
        count = activeBatchLeads.filter(l => needsZoomReview(batchDecisions[l.id] || {})).length;
      } else if (tab.id === 'new_leads') {
        count = activeBatchLeads.length;
      } else if (tab.id === 'pending_leads') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          return String(dec.status || '').startsWith('pending') && !dec.isRejected;
        }).length;
      } else if (tab.id === 'registered_leads') {
        count = activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered).length;
      } else if (tab.id === 'rejected_leads') {
        count = activeBatchLeads.filter(l => batchDecisions[l.id]?.isRejected).length;
      } else {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          const matches = dec.status === tab.id ||
            dec.history?.includes(tab.id) ||
            dec.copies?.includes(tab.id) ||
            (dec.sourceTabs && dec.sourceTabs.includes(tab.id)) ||
            getCategoryLabel(dec.status) === tab.label ||
            (dec.history || []).some((h: string) => getCategoryLabel(h) === tab.label) ||
            (dec.copies || []).some((c: string) => getCategoryLabel(c) === tab.label);
          return matches && !dec.isRejected;
        }).length;
      }
      counts[tab.id] = count;
    });
    return counts;
  }, [activeBatchLeads, batchDecisions]);

  const currentTabLeads = React.useMemo(() => {
    const activeTabLabel = getCategoryLabel(activeTab);
    if (isRegistrationStageCategory(activeTab)) {
      return activeBatchLeads.filter(l => isCurrentRegistrationStage(batchDecisions[l.id] || {}, activeTab));
    }
    if (activeTab === 'take_zoom_meeting') {
      return activeBatchLeads.filter(l => needsZoomReview(batchDecisions[l.id] || {}));
    }
    if (activeTab === 'new_leads') {
      return activeBatchLeads; // Show ALL forms here - all original data is preserved
    }
    if (activeTab === 'pending_leads') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        return String(dec.status || '').startsWith('pending') && !dec.isRejected;
      });
    }
    if (activeTab === 'registered_leads') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRegistered);
    }
    if (activeTab === 'rejected_leads') {
      return activeBatchLeads.filter(l => batchDecisions[l.id]?.isRejected);
    }
    return activeBatchLeads.filter(l => {
      const dec = batchDecisions[l.id] || {};
      const matches = dec.status === activeTab ||
        dec.history?.includes(activeTab) ||
        dec.copies?.includes(activeTab) ||
        (dec.sourceTabs && dec.sourceTabs.includes(activeTab)) ||
        getCategoryLabel(dec.status) === activeTabLabel ||
        (dec.history || []).some((h: string) => getCategoryLabel(h) === activeTabLabel) ||
        (dec.copies || []).some((c: string) => getCategoryLabel(c) === activeTabLabel);

      return matches && !dec.isRejected;
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

  const getMappedValue = (raw: any, standardKey: string, fallbackKeywords: string[]) => {
    const mapping = activeBatch?.metadata?.googleFormMapping || {};
    const mappedQuestion = mapping[standardKey] || mapping[standardKey.toUpperCase()];
    if (mappedQuestion && raw[mappedQuestion]) return raw[mappedQuestion];

    const guessedKey = Object.keys(raw || {}).find(k => fallbackKeywords.some(fk => k.toLowerCase().includes(fk)));
    return guessedKey ? raw[guessedKey] : '-';
  };

  const getEmail = (raw: any) => getMappedValue(raw, 'Email', ['email']);
  const getCountry = (raw: any) => getMappedValue(raw, 'Country', ['country']);
  const handleMoveSelected = (targetStatus: string) => {
    if (!targetStatus) return;
    const newDecisions = { ...batchDecisions };
    selectedLeads.forEach(leadId => {
      const current = newDecisions[leadId] || {};
      const oldStatus = current.status || 'new_leads';
      const history = Array.from(new Set([...(current.history || []), oldStatus, targetStatus]));
      newDecisions[leadId] = { ...current, status: targetStatus, reason: 'Manual Move', history };
    });
    setBatchDecisions(newDecisions);
    syncStateToBackend('crm_ai4_decisions', newDecisions);
    setSelectedLeads([]);
    toast.success(`Moved ${selectedLeads.length} leads!`);
  };

  const getAge = (raw: any) => getMappedValue(raw, 'Age', ['age']);
  const getProfession = (raw: any) => getMappedValue(raw, 'Profession', ['profession', 'occupation']);

  const updateZoomField = (leadId: string, field: string, val: string) => {
    setBatchDecisions(prev => {
      const nd = { ...prev, [leadId]: { ...(prev[leadId] || {}), [field]: val } };
      syncStateToBackend('crm_ai4_decisions', nd);
      return nd;
    });
  };

  const saveGate = async (leadId: string, action: RegistrationGateAction) => {
    if (gateSaveRef.current || !configLoaded) return;
    const confirmation = action === 'skip_zoom'
      ? 'Skip Zoom for this lead? This records an admin override, not Meeting Done.'
      : action === 'skip_group'
        ? 'Skip WhatsApp group admission for this lead? No member will be added.'
        : action === 'group_added'
          ? 'Confirm you have already added this lead to the WhatsApp group manually. This button only records admission; it does not add members.'
          : '';
    if (confirmation && !window.confirm(confirmation)) return;
    gateSaveRef.current = true;
    gateVersionRef.current++;
    setSavingGate(true);
    try {
      const response = await fetch('/api/admin/crm/new-registration/gates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: activeBatchId, id: leadId, action }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save registration gate.');
      setBatchDecisions(result.decisions);
      toast.success('Registration gate saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save registration gate.');
    } finally {
      gateSaveRef.current = false;
      gateVersionRef.current++;
      setSavingGate(false);
    }
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
    syncStateToBackend('crm_custom_categories', newCats);
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    toast.success('Category saved!');
  };

  const deleteCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this category?')) return;
    const newCats = customCategories.filter(c => c.id !== id);
    setCustomCategories(newCats);
    syncStateToBackend('crm_custom_categories', newCats);
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
    syncStateToBackend('crm_custom_categories', newCats);
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
                  <p className="mt-1 text-xs text-slate-500">Different questions must all pass; answers for the same question are alternatives. Funnel-stage tabs show each lead’s current stage, not historical copies; All Batch Leads is the total, not unprocessed leads. Zoom, final approval, and group admission remain separate gates.</p>
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    Current status: Total {activeBatchLeads.length}
                    {' · Unprocessed '}{activeBatchLeads.filter(lead => !batchDecisions[lead.id]?.status || batchDecisions[lead.id]?.status === 'new_leads').length}
                    {' · Pending '}{activeBatchLeads.filter(lead => String(batchDecisions[lead.id]?.status || '').startsWith('pending')).length}
                    {' · Approval '}{activeBatchLeads.filter(lead => String(batchDecisions[lead.id]?.status || '').startsWith('approval')).length}
                  </p>
                  {runningConfig && <p role="status" className="mt-2 text-sm font-semibold text-indigo-600">Configuration saved. Processing this batch in Bunny Database...</p>}
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
                          currentTabLeads.slice(registrationPage(currentTabLeads.length, pagination.page).offset, registrationPage(currentTabLeads.length, pagination.page).end).map((lead, i) => {
                            const leadDec = batchDecisions[lead.id] || {};
                            const leadStatus = leadDec.status || '';
                            const isRegistered = leadDec.isRegistered;
                            const isRejected = leadDec.isRejected;

                            const isPending = leadStatus.includes('pending');

                            const hasApproval = (leadStatus.includes('approval') || leadStatus.includes('aprovel') || (batchDecisions[lead.id]?.history || []).some((h: string) => h.includes('approval') || h.includes('aprovel'))) || leadStatus === 'registered_leads' || (leadDec.history || []).some((h: string) => h.includes('approval') || h.includes('aprovel') || h === 'registered_leads');
                            const hasPending = leadStatus.includes('pending') || (leadDec.history || []).some((h: string) => h.includes('pending'));
                            const rowBg = activeTab.includes('approval') || isRegistered || hasApproval
                              ? 'bg-emerald-50/70 hover:bg-emerald-100/70'
                              : isRejected
                                ? 'bg-purple-100/70 hover:bg-purple-200/70'
                                : hasPending
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
                                          <button disabled={savingGate || !configLoaded || zd.isRegistered || zd.isRejected} onClick={() => saveGate(lead.id, 'meeting_done')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors disabled:opacity-50 ${zd.zoomStatus === 'meeting_done' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>Meeting Done</button>
                                          <button disabled={savingGate || !configLoaded || zd.isRegistered || zd.isRejected} onClick={() => saveGate(lead.id, 'skip_zoom')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm disabled:opacity-50 ${zd.zoomStatus === 'skipped' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>Skip Zoom (Admin)</button>
                                          <button disabled={savingGate || !configLoaded || zd.isRegistered || zd.isRejected} onClick={() => saveGate(lead.id, 'pending')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors disabled:opacity-50 ${zd.zoomStatus === 'pending' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'}`}>Pending</button>
                                          <button disabled={savingGate || !configLoaded || zd.isRegistered} onClick={() => saveGate(lead.id, 'reject')} className={`text-xs font-bold px-2 py-1 rounded shadow-sm transition-colors disabled:opacity-50 ${zd.zoomStatus === 'rejected' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>Form Rejected</button>
                                          <button disabled={savingGate || !configLoaded || zd.isRegistered || zd.isRejected || !zoomGatePassed(zd)} onClick={() => saveGate(lead.id, 'approve')} className="text-xs font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-700 disabled:opacity-50">Final Approve</button>
                                          <span className="text-xs text-slate-600">Zoom: {zd.zoomStatus === 'skipped' ? 'Skipped by admin (no meeting)' : zd.zoomStatus || 'Not reviewed'}{zd.isRegistered ? ' · Final approved' : ''}</span>
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
                                  {leadStatus !== 'new_leads' && leadStatus !== '' && !batchDecisions[lead.id]?.isRegistered && !batchDecisions[lead.id]?.isRejected && (
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${
                                      (leadStatus.includes('approval') || leadStatus.includes('aprovel') || (batchDecisions[lead.id]?.history || []).some((h: string) => h.includes('approval') || h.includes('aprovel'))) 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                        : (leadStatus.includes('pending') || (batchDecisions[lead.id]?.history || []).some((h: string) => h.includes('pending'))) ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                          : 'bg-blue-50 text-blue-700 border-blue-100'
                                    }`}>
                                      {getCategoryLabel(leadStatus)}
                                    </span>
                                  )}
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
                                        disabled={savingGate || !configLoaded || !zoomGatePassed(batchDecisions[lead.id] || {})}
                                        title="Mark Meeting Done or explicitly Skip Zoom before final approval."
                                        onClick={() => saveGate(lead.id, 'approve')}
                                        className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                      >
                                        Final Approve
                                      </button>
                                      <button disabled={savingGate || !configLoaded} onClick={() => saveGate(lead.id, 'skip_zoom')} className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded disabled:opacity-50">Skip Zoom (Admin)</button>
                                      <button
                                        disabled={savingGate || !configLoaded}
                                        onClick={() => saveGate(lead.id, 'reject')}
                                        className="text-xs bg-red-50 text-red-700 font-bold px-2 py-1 rounded hover:bg-red-100 transition-colors"
                                      >
                                        Reject
                                      </button>
                                    </>
                                  )}
                                  {batchDecisions[lead.id]?.zoomStatus === 'skipped' && (
                                    <span className="text-xs text-indigo-700">Zoom skipped by admin</span>
                                  )}
                                  {batchDecisions[lead.id]?.isRegistered && (
                                    <>
                                      <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded flex items-center gap-1">
                                        <CheckCircle size={12} /> Final approved
                                      </span>
                                      <button disabled={savingGate || !configLoaded} onClick={() => saveGate(lead.id, 'group_added')} className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded disabled:opacity-50">Group Added (Manual)</button>
                                      <button disabled={savingGate || !configLoaded} onClick={() => saveGate(lead.id, 'skip_group')} className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded disabled:opacity-50">Skip Group (Admin)</button>
                                      <span className="text-xs text-slate-600">Group: {batchDecisions[lead.id]?.groupStatus === 'added_manually' ? 'Added manually' : batchDecisions[lead.id]?.groupStatus === 'skipped' ? 'Skipped by admin' : 'Pending admission'}</span>
                                    </>
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
                  <RegistrationPagination range={registrationPage(currentTabLeads.length, pagination.page)} onPage={pagination.onPage} />
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
              
              {/* Data Preservation & Copy Ahead Setting Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg text-amber-800 text-lg">
                    💾
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-amber-900">
                        Data Preservation & Routing
                      </h4>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        modalCopyMode 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        {modalCopyMode ? '✓ Save & Copy Ahead' : 'Move Only'}
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      {modalCopyMode 
                        ? 'All data will be saved here on this page, and a copy will go ahead in the mapped pages/categories.' 
                        : 'Leads will be removed from this page and moved to the mapped categories.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalCopyMode(!modalCopyMode)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    modalCopyMode 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {modalCopyMode ? '✓ Save & Copy Ahead ON' : 'Switch to Copy Ahead'}
                </button>
              </div>

              <QuestionRulesEditor conditions={modalConditions} onChange={setModalConditions} questions={availableQuestions} categories={SIDEBAR_TABS} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-between gap-2">
              <button onClick={() => setActiveModal(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  disabled={!configLoaded || savingConfig || runningConfig}
                  onClick={async () => {
                    try { await saveAiConfig(activeModal, modalConditions); }
                    catch (error) { toast.error(error instanceof Error ? error.message : 'AI configuration was not saved'); }
                  }}
                  className="px-5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
                  💾 Save Config
                </button>
                <button disabled={!configLoaded || savingConfig || runningConfig} onClick={async () => {
                  try { await saveAiFilter(activeModal, modalConditions); }
                  catch (error) { toast.error(error instanceof Error ? error.message : 'AI configuration was not saved'); }
                }} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors">
                  {savingConfig ? 'Saving configuration...' : runningConfig ? 'Processing batch...' : '▶ Submit Config & Run'}
                </button>
              </div>
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
