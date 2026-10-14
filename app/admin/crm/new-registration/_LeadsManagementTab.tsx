import { registrationFetch as fetch, saveRegistrationState, saveRegistrationSnapshot } from '@/lib/registrationClient';
import { createRegistrationAutosave, type RegistrationSaveStatus } from '@/lib/registrationAutosave';
import { AutosaveStatus } from './_AutosaveStatus';
import React, { useState, useEffect } from 'react';
import { FileText, Clock, CheckCircle, UserCheck, Users, XCircle, Video, Copy, Calendar, ChevronLeft, ChevronRight, Plus, Trash2, Link as LinkIcon, X, Zap, ChevronUp, ChevronDown, Edit2, Layers, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { ZoomMeetingSetupCalendar } from '@/components/admin/crm/ZoomMeetingSetupCalendar';
import { AITriggersPanel } from './_AITriggersPanel';
import { registrationBatchRows } from '@/lib/registrationLeads';
import { copyRegistrationDecisionToCategory, isRegistrationStageCategory, isRegistrationStageMember, moveRegistrationDecisionToCategory, registrationAiConfigKey, readRegistrationAiConfig, readRegistrationAiDraft, readRegistrationDecisions, registrationDecisionKey, validateRegistrationConditions, isTechnicalCrmField, isQuestionMatchingLanguage, type RegistrationFilterCondition } from '@/lib/registrationAiConfig';
import { REGISTRATION_GATE_FIELDS, needsZoomReview, zoomGatePassed, type RegistrationGateAction } from '@/lib/registrationGates';
import { registrationPage } from '@/lib/registrationPagination';
import { RegistrationPagination, useRegistrationPage } from './_RegistrationPagination';
import { QuestionRulesEditor } from './_QuestionRulesEditor';
import { Bot, Save as SaveIcon, Eye, Check } from 'lucide-react';
import { saveRegistrationWorkshop } from '@/lib/registrationClient';
import { WhatsAppAutoTriggerModal } from './_WhatsAppAutoTriggerModal';
import {
  getCleanDynamicColumns,
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

const DEFAULT_SIDEBAR_TABS = [
  { id: 'new_leads', label: 'Total Leads', icon: FileText, isSystem: true },
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

export const LANGUAGES = ['English Workshop', 'Hindi Workshop', 'Marathi Workshop', 'Kannada Workshop'];

export const getBaseLanguage = (langStr?: string): string => {
  if (!langStr) return 'english';
  const lower = String(langStr).toLowerCase();
  if (lower.includes('hindi')) return 'hindi';
  if (lower.includes('marathi')) return 'marathi';
  if (lower.includes('kannada')) return 'kannada';
  if (lower.includes('english')) return 'english';
  return 'english';
};

export const canonicalLanguage = (lang?: string): string => {
  const base = getBaseLanguage(lang);
  if (base === 'hindi') return 'Hindi Workshop';
  if (base === 'marathi') return 'Marathi Workshop';
  if (base === 'kannada') return 'Kannada Workshop';
  return 'English Workshop';
};

export const getBatchBaseLanguage = (w: any): string => {
  if (!w) return '';
  const combined = `${w.language || ''} ${w.name || ''} ${w.id || ''}`.toLowerCase();
  if (combined.includes('hindi')) return 'hindi';
  if (combined.includes('marathi')) return 'marathi';
  if (combined.includes('kannada')) return 'kannada';
  if (combined.includes('english')) return 'english';
  if (w.language) return getBaseLanguage(w.language);
  return 'english';
};

export const matchesLanguage = (w: any, targetLang: string) => {
  if (!w || !targetLang) return false;
  const tBase = getBaseLanguage(targetLang);
  const wBase = getBatchBaseLanguage(w);
  const wLang = String(w.language || w.name || '').toLowerCase();
  const isWOffer = wLang.includes('offer') || String(w.id || '').toLowerCase().includes('offer');
  const isTOffer = String(targetLang).toLowerCase().includes('offer');
  if (isWOffer !== isTOffer) return false;
  return wBase === tBase;
};

export function LeadsManagementTab({
  workshops,
  selectedDashboardLang = 'English',
  selectedWorkshop = null,
  leadsData = [],
  googleFormQuestionMap = {},
  fieldMapping = {},
  dynamicColumns: propDynamicColumns,
}: {
  workshops: any[];
  selectedDashboardLang?: string;
  selectedWorkshop?: any;
  leadsData?: any[];
  googleFormQuestionMap?: Record<string, string>;
  fieldMapping?: Record<string, string>;
  dynamicColumns?: string[];
}) {
  const toast = useToast();
  const [savingGate, setSavingGate] = useState(false);
  const gateSaveRef = React.useRef(false);
  const gateVersionRef = React.useRef(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState<RegistrationSaveStatus>('idle');
  const [settingsError, setSettingsError] = useState('');
  const settingsSaver = React.useRef(createRegistrationAutosave(saveRegistrationSnapshot, (status, error) => {
    setSettingsStatus(status);
    setSettingsError(error || '');
  }));
  const aiStateRef = React.useRef<Record<string, unknown>>({});
  const [dbQuestions, setDbQuestions] = useState<string[]>([]);


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

  const [selectedLanguage, setSelectedLanguage] = useState(() => canonicalLanguage(selectedWorkshop?.language || selectedDashboardLang));
  const [selectedBatchId, setSelectedBatchId] = useState(selectedWorkshop?.id ? selectedWorkshop.id : '');
  const [activeBatchId, setActiveBatchId] = useState('');
  const activeBatchRef = React.useRef(activeBatchId);
  activeBatchRef.current = activeBatchId;

  // Keep selectedLanguage and activeBatchId synchronized when page language or selected form/workshop changes
  useEffect(() => {
    const target = canonicalLanguage(selectedWorkshop?.language || selectedDashboardLang);
    setSelectedLanguage(target);
    if (selectedWorkshop?.id) {
      setSelectedBatchId(selectedWorkshop.id);
      setActiveBatchId(selectedWorkshop.id);
    }
  }, [selectedDashboardLang, selectedWorkshop]);
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
        if (Array.isArray(parsed)) return parsed;
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

  // Edit Lead (Phone / Batch) State
  const [editingLead, setEditingLead] = useState<{ id: string; name: string; phone: string; country?: string; currentBatchId?: string; currentBatchName?: string } | null>(null);
  const [savingLeadEdit, setSavingLeadEdit] = useState(false);

  const saveLeadEdit = async (leadId: string, newPhone: string, country?: string, newBatchId?: string) => {
    setSavingLeadEdit(true);
    try {
      const targetBatch = (workshops || []).find(w => w.id === newBatchId);
      const res = await fetch('/api/admin/crm/new-registration/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: leadId,
          phone: newPhone,
          country: country,
          batchId: newBatchId,
          batchName: targetBatch?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');
      toast.success('Lead updated successfully! Corrected phone: ' + (data.phone || newPhone));
      // Update local state if phone changed
      if (data.phone) {
        const lead = leadsData.find(l => l.id === leadId);
        if (lead) {
          lead.phone = data.phone;
          lead.mobile = data.phone;
          lead.phoneNumber = data.phone;
        }
      }
      setEditingLead(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setSavingLeadEdit(false);
    }
  };


  // Auto-select 1st matching batch on mount or when language changes, ensuring 100% strict matching
  useEffect(() => {
    if (!workshops || workshops.length === 0) return;
    const currentActive = workshops.find(w => w && w.id === activeBatchId);
    if (!currentActive || !matchesLanguage(currentActive, selectedLanguage)) {
      const firstBatch = workshops.find(w => w && w.id && matchesLanguage(w, selectedLanguage));
      const nextId = firstBatch ? firstBatch.id : '';
      setSelectedBatchId(nextId);
      setActiveBatchId(nextId);
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
          settingsSaver.current.hydrate(data);
          if (data.crm_custom_categories) {
            try {
              let parsed = typeof data.crm_custom_categories === 'string' ? JSON.parse(data.crm_custom_categories) : data.crm_custom_categories;
              
              if (!Array.isArray(parsed)) throw new Error('Saved categories are invalid');
              
              const finalCategories = parsed;
              setCustomCategories(finalCategories);
              
            } catch (error) {
              toast.error(error instanceof Error ? error.message : 'Failed to restore categories');
            }
          } else {
             setCustomCategories(INITIAL_CUSTOM_CATEGORIES);
          }
          const categories = data.crm_custom_categories
            ? (typeof data.crm_custom_categories === 'string' ? JSON.parse(data.crm_custom_categories) : data.crm_custom_categories)
            : INITIAL_CUSTOM_CATEGORIES;
          void settingsSaver.current.save({ crm_custom_categories: categories });
          setSettingsLoaded(true);
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


  const activeBatchLeads = React.useMemo(() => {
    if (!activeBatch) return leadsData || [];
    const batchRows = registrationBatchRows(leadsData || [], activeBatch);
    if (activeBatch.formFilterKeyword || activeBatch.metadata?.formFilterKeyword) {
      return batchRows;
    }
    return batchRows.length > 0 ? batchRows : (leadsData || []);
  }, [activeBatch, leadsData]);

  const dynamicColumns = React.useMemo(() => {
    if (propDynamicColumns && propDynamicColumns.length > 0) return propDynamicColumns;
    return getCleanDynamicColumns(activeBatchLeads, fieldMapping);
  }, [propDynamicColumns, activeBatchLeads, fieldMapping]);

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

  // Fetch saved questions from form builder database for the active language/form.
  // We scope to the active batch's formId when available so only that form's questions appear.
  // NOTE: All questions in the Hindi workshop form are stored in label_en (label_hi is empty).
  // We fall back to label_en when the language-specific label is absent, and we skip the
  // isQuestionMatchingLanguage script-filter because the form builder is authoritative.
  useEffect(() => {
    async function loadFormQuestions() {
      try {
        if (typeof window === 'undefined' || typeof globalThis.fetch !== 'function') return;
        // Prefer the active batch's formId, then the selected workshop's formId.
        const activeFormId = activeBatch?.formId || selectedWorkshop?.formId || '';
        const url = activeFormId
          ? `/api/admin/form-questions?formId=${encodeURIComponent(activeFormId)}`
          : '/api/admin/form-questions';
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (data && Array.isArray(data.questions)) {
          const base = getBaseLanguage(selectedLanguage);
          const harvested: string[] = [];
          data.questions.forEach((q: any) => {
            // Pick the most-specific label; fall back to English label when the
            // language-specific slot is empty (common for bilingual Hindi forms).
            let label = '';
            if (base === 'hindi') label = q.label?.hi || q.label?.en || '';
            else if (base === 'marathi') label = q.label?.mr || q.label?.en || '';
            else if (base === 'kannada') label = q.label?.kn || q.label?.en || '';
            else label = q.label?.en || '';
            const trimmed = label.trim();
            if (trimmed && !isTechnicalCrmField(trimmed)) {
              harvested.push(trimmed);
            }
          });
          setDbQuestions(harvested.filter(Boolean));
        }
      } catch (_) {}
    }
    loadFormQuestions();
  }, [selectedLanguage, activeBatch?.formId, selectedWorkshop?.formId]);

  const availableQuestions = React.useMemo(() => {
    const questions = new Set<string>();

    // For questions from arbitrary sources (leads, workshop metadata) we enforce
    // the script-based language filter to avoid mixing scripts across language tabs.
    const addQuestionIfValid = (title: unknown) => {
      if (typeof title !== 'string') return;
      const t = title.trim();
      if (!t || isTechnicalCrmField(t)) return;
      if (isQuestionMatchingLanguage(t, selectedLanguage)) {
        questions.add(t);
      }
    };

    // For questions coming directly from the form builder DB we trust the form
    // association and skip the script filter (Hindi forms mix English + Devanagari).
    const addDbQuestion = (title: unknown) => {
      if (typeof title !== 'string') return;
      const t = title.trim();
      if (!t || isTechnicalCrmField(t)) return;
      questions.add(t);
    };

    // 1. From database questions configured for this language section (form-authoritative, no script filter)
    dbQuestions.forEach(q => addDbQuestion(q));

    // 2. From Google Form Question Maps & Mappings passed for this section (strictly matching this language)
    const isPropsBatchMatching = !selectedWorkshop || matchesLanguage(selectedWorkshop, selectedLanguage);
    if (isPropsBatchMatching) {
      if (googleFormQuestionMap && typeof googleFormQuestionMap === 'object') {
        Object.values(googleFormQuestionMap).forEach(title => addQuestionIfValid(title));
      }

      if (fieldMapping && typeof fieldMapping === 'object') {
        Object.values(fieldMapping).forEach(title => addQuestionIfValid(title));
      }
    }

    // 3. From leadsData (_rawRecord, dynamicAnswers, and formData answers) strictly for leads matching this language
    (leadsData || []).forEach(lead => {
      if (!lead || !matchesLanguage(lead, selectedLanguage)) return;
      if (lead._rawRecord && typeof lead._rawRecord === 'object') {
        Object.keys(lead._rawRecord).forEach(k => addQuestionIfValid(k));
      }
      if (lead.dynamicAnswers && typeof lead.dynamicAnswers === 'object') {
        Object.keys(lead.dynamicAnswers).forEach(k => addQuestionIfValid(k));
      }
      if (lead.formData && typeof lead.formData === 'object' && !Array.isArray(lead.formData)) {
        Object.keys(lead.formData).forEach(k => addQuestionIfValid(k));
      }
    });

    // 4. From Google Form Question Maps & Mappings across workshops of this language
    const harvestWorkshopQuestions = (w: any) => {
      if (!w || !matchesLanguage(w, selectedLanguage) || !w.metadata) return;
      const qMap = w.metadata.googleFormQuestionMap;
      if (qMap && typeof qMap === 'object') {
        Object.values(qMap).forEach(title => addQuestionIfValid(title));
      }
      const mapping = w.metadata.googleFormMapping;
      if (mapping && typeof mapping === 'object') {
        Object.values(mapping).forEach(title => addQuestionIfValid(title));
      }
      const cFields = w.metadata.crmFields;
      if (Array.isArray(cFields)) {
        cFields.forEach((cf: any) => {
          const lbl = cf?.label || cf?.id;
          addQuestionIfValid(lbl);
        });
      }
    };

    if (selectedWorkshop && matchesLanguage(selectedWorkshop, selectedLanguage)) {
      harvestWorkshopQuestions(selectedWorkshop);
    }
    if (activeBatch && matchesLanguage(activeBatch, selectedLanguage)) {
      harvestWorkshopQuestions(activeBatch);
    }
    (workshops || []).forEach(w => {
      if (matchesLanguage(w, selectedLanguage)) harvestWorkshopQuestions(w);
    });

    // 5. From saved AI configurations of this language
    Object.values(aiSettings).forEach(conds => {
      if (Array.isArray(conds)) {
        conds.forEach(c => {
          if (c.question) addQuestionIfValid(c.question);
        });
      }
    });

    // 6. From current modal conditions
    modalConditions.forEach(c => {
      if (c.question) addQuestionIfValid(c.question);
    });

    return Array.from(questions).filter(Boolean);
  }, [leadsData, dbQuestions, googleFormQuestionMap, fieldMapping, selectedWorkshop, activeBatch, workshops, selectedLanguage, aiSettings, modalConditions]);

  const openAiModal = (type: string) => {
    // 1. Try draft for activeBatchId with language check
    const draft = readRegistrationAiDraft(aiStateRef.current, activeBatchId, type, selectedLanguage);
    // 2. Try saved settings for activeBatchId
    let current = draft?.conditions?.length ? draft.conditions : aiSettings[type];

    // 3. If empty, check master list or sibling batches for this worker strictly within SAME language
    if (!current || current.length === 0 || (current.length === 1 && !current[0].question && !current[0].keyword)) {
      const baseLang = getBaseLanguage(selectedLanguage);
      const masterBatchId = `master_${baseLang}_workshop`;
      const masterDraft = readRegistrationAiDraft(aiStateRef.current, masterBatchId, type, selectedLanguage);
      if (masterDraft?.conditions?.length) {
        current = masterDraft.conditions;
      } else {
        for (const [key, value] of Object.entries(aiStateRef.current)) {
          if (key.startsWith('crm_ai_config_') && key.endsWith(`_${type}`)) {
            if (!key.toLowerCase().includes(baseLang)) continue;
            try {
              const parsed = typeof value === 'string' ? JSON.parse(value) : value;
              const conds = (parsed?.conditions?.length ? parsed.conditions : parsed?.draft?.conditions);
              if (Array.isArray(conds) && conds.length > 0 && conds.some((c: any) => c.question || c.keyword)) {
                current = conds;
                break;
              }
            } catch (_) {}
          }
        }
      }
    }

    const initialConditions = (current && current.length > 0)
      ? current.map(c => ({
          ...c,
          question: (c.question && isTechnicalCrmField(c.question))
            ? ''
            : (c.question || '')
        }))
      : [{ question: '', keyword: '' }];

    setModalConditions(initialConditions);
    setModalCopyMode(true);
    setActiveModal(type);
  };

  // WhatsApp Automation (Meta Templates) State
  const [showWTSettingsModal, setShowWTSettingsModal] = useState(false);
  const [wtActiveSubTab, setWtActiveSubTab] = useState<'approved' | 'pending'>('approved');
  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [savingWTSettings, setSavingWTSettings] = useState(false);
  const [wtSettings, setWtSettings] = useState({
    approved: { template: '', delay: 5 },
    pending: { template: '', delay: 30 }
  });

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
    }
  }, [activeBatchId, activeBatch]);

  // Load Meta WhatsApp Templates on modal open
  useEffect(() => {
    if (showWTSettingsModal && templates.length === 0) {
      setLoadingTemplates(true);
      fetch('/api/admin/crm/templates?provider=meta')
        .then(res => res.json())
        .then(data => {
          setTemplates(data.data?.templates || data.templates || []);
        })
        .catch(err => console.error('Failed to load templates:', err))
        .finally(() => setLoadingTemplates(false));
    }
  }, [showWTSettingsModal, templates.length]);

  const saveWTSettings = async () => {
    if (!activeBatch) {
      toast.error('No active batch selected.');
      return;
    }
    setSavingWTSettings(true);
    try {
      const listKey = `crm_${getBaseLanguage(activeBatch.language || selectedLanguage)}_workshops`;
      const updatedWorkshop = {
        ...activeBatch,
        metadata: {
          ...(activeBatch.metadata || {}),
          wtSettings: wtSettings
        }
      };
      await saveRegistrationWorkshop(listKey, updatedWorkshop, activeBatch);
      toast.success('WhatsApp Automation settings saved! Approved leads will receive automated messages.');
      setShowWTSettingsModal(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save WhatsApp settings');
    } finally {
      setSavingWTSettings(false);
    }
  };

  const [batchDecisions, setBatchDecisions] = useState<Record<string, any>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_ai4_decisions');
      return saved ? JSON.parse(saved) : {};
    }
    return {};
  });

  const saveAiConfig = async (type: string, conditions: FilterCondition[], automatic = false) => {
    if (!configLoaded) throw new Error('Wait for saved AI settings to load before changing them');
    let incomplete = false;
    try { validateRegistrationConditions(conditions); }
    catch (error) {
      incomplete = true;
    }
    if (configSaveRef.current) throw new Error('A configuration save is already in progress');
    configSaveRef.current = true;
    setSavingConfig(true);
    try {
      const baseLang = getBaseLanguage(activeBatch?.language || selectedLanguage);
      const allTargetBatchIds = new Set<string>([
        activeBatchId,
        `master_${baseLang}_workshop`,
        ...(workshops || []).filter(w => w && w.id && matchesLanguage(w, selectedLanguage)).map(w => w.id),
      ]);

      const patch: Record<string, unknown> = {};
      const previousMap: Record<string, unknown> = {};

      for (const bId of allTargetBatchIds) {
        if (!bId) continue;
        const key = registrationAiConfigKey(bId, type);
        const previous = aiStateRef.current[key];
        previousMap[key] = previous;
        const previousConfig = (typeof previous === 'string' ? JSON.parse(previous) : previous) as Record<string, unknown> | undefined;

        patch[key] = incomplete
          ? {
              ...previousConfig,
              conditions: previousConfig?.conditions || [],
              autoEnabled: previousConfig?.autoEnabled === true,
              draft: { conditions, copyMode: modalCopyMode },
            }
          : {
              conditions,
              copyMode: modalCopyMode,
              draft: { conditions, copyMode: modalCopyMode },
              autoEnabled: automatic ? previousConfig?.autoEnabled === true : conditions.some(condition => condition.question?.trim() || condition.directMoveCategory),
              matchMode: 'all_questions_any_answer',
            };
      }

      let saved: Record<string, unknown>;
      try {
        saved = await saveRegistrationSnapshot(patch, previousMap);
      } catch (err: any) {
        if (err?.message?.includes('another update') || err?.message?.includes('conflict') || err?.message?.includes('changed')) {
          const freshRes = await fetch('/api/admin/crm/new-registration/state');
          if (freshRes.ok) {
            const freshState = await freshRes.json();
            aiStateRef.current = { ...aiStateRef.current, ...freshState };
            const freshPreviousMap: Record<string, unknown> = {};
            for (const bId of allTargetBatchIds) {
              if (!bId) continue;
              const k = registrationAiConfigKey(bId, type);
              freshPreviousMap[k] = freshState[k];
            }
            saved = await saveRegistrationSnapshot(patch, freshPreviousMap);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      aiStateRef.current = { ...aiStateRef.current, ...saved };
      const newSettings = { ...aiSettings, [type]: conditions };
      if (!incomplete) setAiSettings(newSettings);
      const updatedCopyModes = { ...aiCopyModes, [type]: modalCopyMode };
      setAiCopyModes(updatedCopyModes);
      if (!automatic) toast.success(`${type} configuration saved permanently for all batches.`);
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
        const saved = readRegistrationAiConfig(state, activeBatchId, { ...(activeBatch?.metadata || {}), language: selectedLanguage });
        if (!controller.signal.aborted) {
          aiStateRef.current = state;
          setAiSettings(saved.settings);
          setAiCopyModes(saved.copyModes);
          setBatchDecisions(readRegistrationDecisions(state, activeBatchId));
          setConfigLoaded(true);
        }
      })
      .catch(error => { if (!controller.signal.aborted) toast.error(error.message); });
    return () => controller.abort();
  }, [activeBatchId]);

  const modalSnapshotRef = React.useRef('');
  useEffect(() => {
    const snapshot = JSON.stringify({ activeBatchId, activeModal, modalConditions, modalCopyMode });
    if (!activeModal || !configLoaded) {
      modalSnapshotRef.current = snapshot;
      return;
    }
    if (!modalSnapshotRef.current || JSON.parse(modalSnapshotRef.current).activeModal !== activeModal ||
        JSON.parse(modalSnapshotRef.current).activeBatchId !== activeBatchId) {
      modalSnapshotRef.current = snapshot;
      return;
    }
    if (snapshot === modalSnapshotRef.current) return;
    const timer = setTimeout(() => {
      if (configSaveRef.current) return;
      setSettingsStatus('saving');
      void saveAiConfig(activeModal, modalConditions, true).then(() => {
        modalSnapshotRef.current = snapshot;
        setSettingsStatus('saved');
        setSettingsError('');
      }).catch(error => {
        setSettingsStatus('error');
        setSettingsError(error.message);
        toast.error(error.message);
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [activeBatchId, activeModal, modalConditions, modalCopyMode, configLoaded, savingConfig]);

  const closeAiModal = async () => {
    try {
      const snapshot = JSON.stringify({ activeBatchId, activeModal, modalConditions, modalCopyMode });
      if (activeModal && snapshot !== modalSnapshotRef.current) await saveAiConfig(activeModal, modalConditions, true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The edited rules were not saved.');
    } finally {
      setActiveModal(null);
    }
  };


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
        if (tab.id.startsWith('pending_')) {
          count = activeBatchLeads.filter(l => {
            const dec = batchDecisions[l.id] || {};
            const isApproved = dec.status?.startsWith('approval') ||
              dec.status === 'registered_leads' ||
              Boolean(dec.isRegistered) ||
              (dec.copies || []).some((c: string) => c.startsWith('approval') || c === 'registered_leads');
            if (isApproved) return false;
            return isRegistrationStageMember(dec, tab.id);
          }).length;
        } else {
          count = activeBatchLeads.filter(l => isRegistrationStageMember(batchDecisions[l.id] || {}, tab.id)).length;
        }
      } else if (tab.id === 'take_zoom_meeting') {
        count = activeBatchLeads.filter(l => needsZoomReview(batchDecisions[l.id] || {})).length;
      } else if (tab.id === 'new_leads') {
        count = activeBatchLeads.length;
      } else if (tab.id === 'pending_leads') {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          const isApproved = dec.status?.startsWith('approval') ||
            dec.status === 'registered_leads' ||
            Boolean(dec.isRegistered) ||
            (dec.copies || []).some((c: string) => c.startsWith('approval') || c === 'registered_leads');
          if (isApproved) return false;
          return (String(dec.status || '').startsWith('pending') ||
            (dec.copies || []).some((category: string) => category.startsWith('pending'))) && !dec.isRejected;
        }).length;
      } else if (tab.id === 'registered_leads') {
        count = activeBatchLeads.filter(l =>
          batchDecisions[l.id]?.isRegistered || batchDecisions[l.id]?.status === tab.id || batchDecisions[l.id]?.copies?.includes(tab.id)
        ).length;
      } else if (tab.id === 'rejected_leads') {
        count = activeBatchLeads.filter(l =>
          batchDecisions[l.id]?.isRejected || batchDecisions[l.id]?.status === tab.id || batchDecisions[l.id]?.copies?.includes(tab.id)
        ).length;
      } else {
        count = activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          const matches = dec.status === tab.id ||
            dec.copies?.includes(tab.id) ||
            getCategoryLabel(dec.status) === tab.label ||
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
      if (activeTab.startsWith('pending_')) {
        return activeBatchLeads.filter(l => {
          const dec = batchDecisions[l.id] || {};
          const isApproved = dec.status?.startsWith('approval') ||
            dec.status === 'registered_leads' ||
            Boolean(dec.isRegistered) ||
            (dec.copies || []).some((c: string) => c.startsWith('approval') || c === 'registered_leads');
          if (isApproved) return false;
          return isRegistrationStageMember(dec, activeTab);
        });
      }
      return activeBatchLeads.filter(l => isRegistrationStageMember(batchDecisions[l.id] || {}, activeTab));
    }
    if (activeTab === 'take_zoom_meeting') {
      return activeBatchLeads.filter(l => {
        const decision = batchDecisions[l.id] || {};
        return needsZoomReview(decision) || decision.status === activeTab || decision.copies?.includes(activeTab);
      });
    }
    if (activeTab === 'new_leads') {
      return activeBatchLeads; // Show ALL forms here - all original data is preserved
    }
    if (activeTab === 'pending_leads') {
      return activeBatchLeads.filter(l => {
        const dec = batchDecisions[l.id] || {};
        const isApproved = dec.status?.startsWith('approval') ||
          dec.status === 'registered_leads' ||
          Boolean(dec.isRegistered) ||
          (dec.copies || []).some((c: string) => c.startsWith('approval') || c === 'registered_leads');
        if (isApproved) return false;
        return (String(dec.status || '').startsWith('pending') ||
          (dec.copies || []).some((category: string) => category.startsWith('pending'))) && !dec.isRejected;
      });
    }
    if (activeTab === 'registered_leads') {
      return activeBatchLeads.filter(l =>
        batchDecisions[l.id]?.isRegistered || batchDecisions[l.id]?.status === activeTab || batchDecisions[l.id]?.copies?.includes(activeTab)
      );
    }
    if (activeTab === 'rejected_leads') {
      return activeBatchLeads.filter(l =>
        batchDecisions[l.id]?.isRejected || batchDecisions[l.id]?.status === activeTab || batchDecisions[l.id]?.copies?.includes(activeTab)
      );
    }
    return activeBatchLeads.filter(l => {
      const dec = batchDecisions[l.id] || {};
      const matches = dec.status === activeTab ||
        dec.copies?.includes(activeTab) ||
        getCategoryLabel(dec.status) === activeTabLabel ||
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
      newDecisions[leadId] = moveRegistrationDecisionToCategory(current, targetStatus, activeTab);
    });
    setBatchDecisions(newDecisions);
    syncStateToBackend('crm_ai4_decisions', newDecisions);
    setSelectedLeads([]);
    toast.success(`Moved ${selectedLeads.length} leads!`);
  };
  const handleCopySelected = (targetCategory: string) => {
    if (!targetCategory) return;
    const newDecisions = { ...batchDecisions };
    selectedLeads.forEach(leadId => {
      const current = newDecisions[leadId] || {};
      newDecisions[leadId] = copyRegistrationDecisionToCategory(current, targetCategory);
    });
    setBatchDecisions(newDecisions);
    syncStateToBackend('crm_ai4_decisions', newDecisions);
    setSelectedLeads([]);
    toast.success(`Copied ${selectedLeads.length} leads to ${getCategoryLabel(targetCategory)}!`);
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
  const saveCategories = async (categories: typeof customCategories) => {
    if (!settingsLoaded) throw new Error('Wait for saved categories to load before editing.');
    setCustomCategories(categories);
    await settingsSaver.current.save({ crm_custom_categories: categories });
  };
  const categoryDraftId = React.useRef('');
  useEffect(() => { categoryDraftId.current = editingCategory?.id || `custom_${Date.now()}`; }, [isCategoryModalOpen, editingCategory?.id]);
  const saveCategory = async (e: React.FormEvent, close = true) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const label = formData.get('label') as string;
    const aiAssign = formData.get('aiAssign') as string;
    if (!label.trim()) {
      setSettingsStatus('error');
      setSettingsError('Enter a category name before it can be saved.');
      return;
    }
    
    let newCats = [...customCategories];
    const id = editingCategory?.id || categoryDraftId.current;
    if (newCats.some(c => c.id === id)) {
      newCats = newCats.map(c => c.id === id ? { ...c, label, aiAssignment: aiAssign } : c);
    } else {
      newCats.push({
        id,
        label,
        icon: Clock,
        isSystem: false,
        aiAssignment: aiAssign
      });
    }
    try {
      await saveCategories(newCats);
      if (close) {
        setIsCategoryModalOpen(false);
        setEditingCategory(null);
        toast.success('Category saved!');
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Category was not saved.'); }
  };

  const deleteCategory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this category?')) return;
    const newCats = customCategories.filter(c => c.id !== id);
    try {
      await saveCategories(newCats);
      if (activeTab === id) setActiveTab('new_leads');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Category was not removed.'); }
  };

  
  const moveCategory = async (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newCats = [...customCategories];
    if (direction === 'up' && index > 0) {
      [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    } else if (direction === 'down' && index < newCats.length - 1) {
      [newCats[index + 1], newCats[index]] = [newCats[index], newCats[index + 1]];
    }
    try { await saveCategories(newCats); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Category order was not saved.'); }
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
          <form onSubmit={saveCategory} onChange={event => { void saveCategory(event, false); }} className="p-4 space-y-4">
            <p className="text-xs text-slate-500">Category edits save automatically. Closing does not undo saved changes.</p>
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
    <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-full min-h-[520px] animate-fade-in">

      {/* Sidebar Section */}
      <aside ref={sidebarRef} className="bg-slate-50 border-r border-slate-200 flex flex-col z-10 flex-shrink-0 relative transition-none select-none" style={{ width: sidebarWidth }}>
        <div 
          className="absolute right-[-4px] top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 z-50 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
        />
        

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Categories in Sidebar */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-blue-600" />
                Categories
              </h3>
              <button aria-label="Add category" onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors" title="Add category">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
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
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <TabIcon size={14} className={activeTab === tab.id ? 'text-white' : 'text-slate-400'} />
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
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header Section with 3 Categorized Dropdowns */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 whitespace-nowrap">
              <Users className="text-indigo-600" size={22} />
              Leads Management
            </h2>
            <span className="hidden sm:inline-block px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-lg truncate max-w-[220px]" title={activeBatchName}>
              {activeBatchName || 'Select Batch'}
            </span>
          </div>

          {/* Autosave in header */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs rounded-lg">
              {canonicalLanguage(selectedLanguage)}
            </span>
            <AutosaveStatus status={settingsStatus} error={settingsError} retry={() => {
              const retry = activeModal ? saveAiConfig(activeModal, modalConditions, true) : settingsSaver.current.retry();
              void retry.then(() => { setSettingsStatus('saved'); setSettingsError(''); }).catch(error => {
                setSettingsStatus('error'); setSettingsError(error.message); toast.error(error.message);
              });
            }} />
          </div>
        </header>

        {/* Working Area Section */}
        <main className="flex-1 p-6 bg-slate-50/50 overflow-y-auto">
          {(activeBatchId || (leadsData && leadsData.length > 0) || (workshops && workshops.length > 0)) ? (
            <div className="space-y-4">
              {/* Upper Side Status Cards: Total, Approved, Triggered, Pending, Rejected */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Total Leads Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('new_leads')}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all shadow-sm flex flex-col justify-between ${
                    activeTab === 'new_leads'
                      ? 'border-blue-600 bg-blue-50/80 ring-2 ring-blue-400'
                      : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">Total Leads</span>
                    <FileText size={16} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">{activeBatchLeads.length}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium truncate" title={activeBatch ? activeBatchName : 'All Leads'}>
                    {activeBatch ? `${activeBatchName}` : `All Leads (${leadsData?.length || 0})`}
                  </div>
                </button>

                {/* 2. Approved-4 Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('approval_4')}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all shadow-sm flex flex-col justify-between ${
                    activeTab === 'approval_4' || activeTab.startsWith('approval') || activeTab === 'registered_leads'
                      ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-400'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Approved-4</span>
                    <CheckCircle size={16} className="text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700">
                    {tabCounts['approval_4'] || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Approval-4 leads</div>
                </button>

                {/* 3. Triggered Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('ai_triggers')}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all shadow-sm flex flex-col justify-between ${
                    activeTab === 'ai_triggers'
                      ? 'border-purple-600 bg-purple-50/80 ring-2 ring-purple-400'
                      : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">Triggered</span>
                    <Zap size={16} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700">
                    {activeBatchLeads.filter(l => batchDecisions[l.id]?.wtTriggered || batchDecisions[l.id]?.whatsappSent || batchDecisions[l.id]?.triggeredAt || batchDecisions[l.id]?.status === 'ai_triggers' || batchDecisions[l.id]?.copies?.includes('ai_triggers')).length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium">WhatsApp Triggered</div>
                </button>

                {/* 4. Pending-4 Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('pending_leads_4')}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all shadow-sm flex flex-col justify-between ${
                    activeTab === 'pending_leads_4' || activeTab.startsWith('pending')
                      ? 'border-amber-600 bg-amber-50/80 ring-2 ring-amber-400'
                      : 'border-slate-200 bg-white hover:border-amber-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Pending-4</span>
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div className="text-2xl font-black text-amber-700">
                    {tabCounts['pending_leads_4'] || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Pending-4 review</div>
                </button>

                {/* 5. Rejected Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab('rejected_leads')}
                  className={`text-left p-3.5 rounded-2xl border-2 transition-all shadow-sm flex flex-col justify-between ${
                    activeTab === 'rejected_leads'
                      ? 'border-rose-600 bg-rose-50/80 ring-2 ring-rose-400'
                      : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow'
                  }`}
                >
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">Rejected</span>
                    <XCircle size={16} className="text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-700">
                    {tabCounts['rejected_leads'] || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-medium">Rejected leads</div>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">
                    {SIDEBAR_TABS.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Showing leads data for: <strong className="text-slate-700">{selectedLanguage}</strong>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Different questions must all pass; answers for the same question are alternatives. Funnel-stage tabs include the current stage and explicit copies, so counts can overlap; Total Leads is the total. Zoom, final approval, and group admission remain separate gates.</p>
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
                      <button
                        onClick={() => setShowWTSettingsModal(true)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors ${
                          wtSettings.approved.template
                            ? 'bg-[#25D366] hover:bg-[#128C7E] text-white'
                            : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                        }`}
                        title="Configure WhatsApp Auto-Trigger for Approved Leads"
                      >
                        <span className="text-base">🟢</span> {wtSettings.approved.template ? `Auto-WhatsApp (${wtSettings.approved.template})` : 'Auto-WhatsApp Trigger'}
                      </button>
                      {Boolean(activeBatch?.whatsappGroupLink || activeBatch?.metadata?.whatsappGroupLink) && (
                        <a
                          href={activeBatch?.whatsappGroupLink || activeBatch?.metadata?.whatsappGroupLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          title={`WhatsApp Group: ${activeBatch?.whatsappGroupLink || activeBatch?.metadata?.whatsappGroupLink}`}
                        >
                          <Users size={15} className="text-emerald-600" />
                          <span>WA Group</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                      {selectedLeads.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                          <span className="text-xs font-bold text-indigo-800">{selectedLeads.length} selected</span>
                          <label className="sr-only" htmlFor="copy-selected-category">Copy selected leads</label>
                          <select
                            id="copy-selected-category"
                            className="text-sm rounded border-indigo-200 py-1 pl-2 pr-6 outline-none bg-white"
                            value=""
                            onChange={e => handleCopySelected(e.target.value)}
                          >
                            <option value="">Copy to...</option>
                            {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                          </select>
                          <label className="sr-only" htmlFor="move-selected-category">Move selected leads</label>
                          <select
                            id="move-selected-category"
                            className="text-sm rounded border-indigo-200 py-1 pl-2 pr-6 outline-none bg-white"
                            value=""
                            onChange={e => handleMoveSelected(e.target.value)}
                          >
                            <option value="">Move to...</option>
                            {SIDEBAR_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
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
                    categoryOptions={customCategories}
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
                        <tr>
                          <th className="px-4 py-3 min-w-[50px] w-[50px]">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              checked={selectedLeads.length > 0 && selectedLeads.length === currentTabLeads.length}
                              onChange={toggleSelectAll}
                            />
                          </th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[140px]">Timestamp</th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[150px]">Name</th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[140px]">WhatsApp</th>
                          {dynamicColumns.map(col => (
                            <th key={col} className="px-4 py-3 font-bold text-slate-500 min-w-[160px] max-w-[260px] whitespace-normal break-words leading-tight">
                              <div className="line-clamp-4" title={col}>{col}</div>
                            </th>
                          ))}
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[180px]">Email</th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[100px]">Gender</th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[90px]">Age</th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">City</th>
                          <th className="px-4 py-3 font-bold text-slate-500 min-w-[120px]">Country</th>
                          <th className="px-4 py-3 font-bold text-slate-500 text-right min-w-[140px]">Actions</th>
                        </tr>
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
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{getLeadTimestamp(lead)}</td>
                                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{getLeadName(lead)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5">
                                        {getLeadPhone(lead) ? (
                                          <a href={`https://wa.me/${getLeadPhone(lead).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 font-mono text-xs">
                                            {getLeadPhone(lead)}
                                          </a>
                                        ) : (
                                          <span className="text-xs text-slate-400 italic">No phone</span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => setEditingLead({
                                            id: lead.id,
                                            name: getLeadName(lead),
                                            phone: getLeadPhone(lead),
                                            country: getLeadCountry(lead),
                                            currentBatchId: activeBatchId,
                                            currentBatchName: activeBatchName,
                                          })}
                                          className="p-1 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                          title="Edit Phone Number or Switch Batch"
                                        >
                                          <Edit2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                    {dynamicColumns.map(col => {
                                      const val = getLeadAnswer(lead, col);
                                      return (
                                        <td key={col} className="px-4 py-3 whitespace-normal break-words text-slate-500 text-xs min-w-[160px] max-w-[260px]">
                                          <div className="line-clamp-2" title={val}>{val}</div>
                                        </td>
                                      );
                                    })}
                                    <td className="px-4 py-3 truncate max-w-[180px] text-xs" title={getLeadEmail(lead)}>{getLeadEmail(lead) || '-'}</td>
                                    <td className="px-4 py-3 capitalize whitespace-nowrap text-xs">{getLeadGender(lead) || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs">{getLeadAge(lead) || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs">{getLeadCity(lead) || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs">{getLeadCountry(lead) || '-'}</td>
                                    <td className="px-4 py-3 text-right">
                                      <span className="text-xs text-slate-500 font-medium">
                                        {zd.zoomStatus === 'meeting_done' ? '✓ Done' : zd.zoomStatus === 'skipped' ? 'Skipped' : zd.zoomStatus || 'Pending'}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={10 + dynamicColumns.length} className="px-4 py-2 border-b-4 border-slate-100 bg-slate-50/50">
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
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{getLeadTimestamp(lead)}</td>
                                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{getLeadName(lead)}</td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    {getLeadPhone(lead) ? (
                                      <a href={`https://wa.me/${getLeadPhone(lead).replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 hover:underline flex items-center gap-1 font-mono text-xs">
                                        {getLeadPhone(lead)}
                                      </a>
                                    ) : (
                                      <span className="text-xs text-slate-400 italic">No phone</span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => setEditingLead({
                                        id: lead.id,
                                        name: getLeadName(lead),
                                        phone: getLeadPhone(lead),
                                        country: getLeadCountry(lead),
                                        currentBatchId: activeBatchId,
                                        currentBatchName: activeBatchName,
                                      })}
                                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                                      title="Edit Phone Number or Switch Batch"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                  </div>
                                </td>
                                {dynamicColumns.map(col => {
                                  const val = getLeadAnswer(lead, col);
                                  return (
                                    <td key={col} className="px-4 py-3 whitespace-normal break-words text-slate-500 text-xs min-w-[160px] max-w-[260px]">
                                      <div className="line-clamp-2" title={val}>{val}</div>
                                    </td>
                                  );
                                })}
                                <td className="px-4 py-3 truncate max-w-[180px] text-xs" title={getLeadEmail(lead)}>{getLeadEmail(lead) || '-'}</td>
                                <td className="px-4 py-3 capitalize whitespace-nowrap text-xs">{getLeadGender(lead) || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">{getLeadAge(lead) || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">{getLeadCity(lead) || '-'}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-xs">{getLeadCountry(lead) || '-'}</td>
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
                                      <span className="text-xs text-slate-600">Group: {batchDecisions[lead.id]?.groupStatus === 'added_manually' ? 'Added manually' : batchDecisions[lead.id]?.groupStatus === 'auto_added' ? 'Auto-added (24h)' : batchDecisions[lead.id]?.groupStatus === 'skipped' ? 'Skipped by admin' : 'Pending admission'}</span>
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
                            <td colSpan={10 + dynamicColumns.length} className="px-4 py-12 text-center text-slate-500">
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
                onClick={() => { void closeAiModal(); }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50 flex-1">
              <QuestionRulesEditor conditions={modalConditions} onChange={setModalConditions} questions={availableQuestions} categories={SIDEBAR_TABS} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-white flex justify-between gap-2">
              <button onClick={() => { void closeAiModal(); }} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <div className="flex gap-2">
                <button
                  disabled={!configLoaded || savingConfig || runningConfig}
                  onClick={async () => {
                    try {
                      await saveAiConfig(activeModal, modalConditions);
                      setActiveModal(null);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'AI configuration was not saved');
                    }
                  }}
                  className="px-5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
                  {savingConfig ? 'Saving...' : '💾 Save Config'}
                </button>
                <button
                  disabled={!configLoaded || savingConfig || runningConfig}
                  onClick={async () => {
                    try {
                      await saveAiFilter(activeModal, modalConditions);
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'AI configuration was not saved');
                    }
                  }}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
                >
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

      {/* WhatsApp Auto-Trigger Settings Modal */}
      <WhatsAppAutoTriggerModal
        isOpen={showWTSettingsModal}
        onClose={() => setShowWTSettingsModal(false)}
        workshops={workshops}
        selectedLanguage={selectedDashboardLang || selectedLanguage}
        selectedBatchId={activeBatchId}
        onSaved={(batchId, newSettings) => {
          if (batchId === activeBatchId) {
            setWtSettings(newSettings);
          }
        }}
      />
      {/* Edit Lead (Phone / Batch) Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Edit Participant Details</h3>
                <p className="text-xs text-slate-500 font-medium">{editingLead.name}</p>
              </div>
              <button onClick={() => setEditingLead(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const phoneInput = (form.elements.namedItem('phone') as HTMLInputElement).value;
                const countryInput = (form.elements.namedItem('country') as HTMLInputElement).value;
                const batchSelect = (form.elements.namedItem('batchId') as HTMLSelectElement).value;
                void saveLeadEdit(editingLead.id, phoneInput, countryInput, batchSelect);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Participant Country (Global Dialing Code Resolution)
                </label>
                <input
                  type="text"
                  name="country"
                  defaultValue={editingLead.country || 'India'}
                  placeholder="e.g. India, USA, UK, Canada, Australia, UAE, Singapore..."
                  className="w-full p-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-xs font-bold text-slate-800 outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  The system checks this country name to attach the right international code (USA: +1, UK: +44, Australia: +61, UAE: +971, India: +91, etc.).
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  WhatsApp Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingLead.phone}
                    required
                    placeholder="e.g. +1 555-0199 or 9876543210"
                    className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-mono font-bold text-slate-800 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Automatically removes 00 or leading 0, and prefixes the participant country dialing code.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Assigned Batch
                </label>
                <select
                  name="batchId"
                  defaultValue={editingLead.currentBatchId || activeBatchId}
                  className="w-full p-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white text-sm font-bold text-slate-700 outline-none"
                >
                  {filteredBatches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                  Move or merge this lead to another batch so they trigger the correct batch message.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLeadEdit}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingLeadEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
