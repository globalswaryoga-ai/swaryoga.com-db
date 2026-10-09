'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { WorkshopFormTab } from '../_WorkshopFormTab';
import { MetaLeadsTab } from '../_MetaLeadsTab';
import { LeadsManagementTab } from '../_LeadsManagementTab';
import { WhatsAppMessengerTab } from '../_WhatsAppMessengerTab';
import { useToast } from '@/components/admin/crm/ui/Toast';


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
import {
  FileText, Plus, Users, Handshake, MessageSquare, QrCode, Mail, Share2, Target, Calendar, CheckSquare, Square,
  UserPlus, X, Edit2, Trash2, ArrowLeftRight, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight, ChevronUp, ExternalLink, Database, Save, Settings, Folder
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';


const safeStringify = (obj: any) => {
  try {
    return JSON.stringify(obj, (key, value) => {
      // Avoid stringifying DOM elements or circular React internal objects
      if (value instanceof Element || value instanceof Event) return undefined;
      return value;
    });
  } catch (e) {
    return "[]";
  }
};

export default function NewRegistrationPage() {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'all_leads' | 'my_data' | 'our_workshops' | 'my_batches' | 'leads_management' | 'whatsapp_messenger' | 'setup' | 'workshop_details' | 'leads' | 'closing' | 'templates' | 'forms' | 'details'>('all_leads');
  const [leadSubTab, setLeadSubTab] = useState<'new' | 'approved' | 'pending' | 'pending2' | 'registered' | 'student_kota'>('new');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<any>(null); // State for the selected workshop

  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('left');
  const [selectedDashboardLang, setSelectedDashboardLang] = useState<string>('Marathi Workshop');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMapDataCollapsed, setIsMapDataCollapsed] = useState(false);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);

  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchLanguage, setNewBatchLanguage] = useState('');
  const [newBatchWorkshopName, setNewBatchWorkshopName] = useState('');

  const [formSource, setFormSource] = useState<'internal' | 'google'>('google');
  const [isManualFormId, setIsManualFormId] = useState(false);
  const [fetchedForms, setFetchedForms] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [linkedFormId, setLinkedFormId] = useState<string>('');
  const [activeLinkedSheetId, setActiveLinkedSheetId] = useState<string>('');
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [isFormSetupCollapsed, setIsFormSetupCollapsed] = useState(true);
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

  const displayLeads = useMemo(() => {
    if (!selectedWorkshop) {
      const currentBaseLang = getBaseLanguage(selectedDashboardLang);
      return (leadsData || []).filter(l => {
        if (!l) return false;
        const leadLang = l.language || l.workshopName || l.formName;
        if (!leadLang) return true;
        return getBaseLanguage(leadLang) === currentBaseLang;
      });
    }

    if (selectedWorkshop.formFilterKeyword && formSource === 'google') {
      const keywords = String(selectedWorkshop.formFilterKeyword).toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
      const ai7MappedQuestion = selectedWorkshop.metadata?.googleFormMapping?.['AI-7'] || selectedWorkshop.metadata?.googleFormMapping?.['ai7'];
      return (leadsData || []).filter((lead: any) => {
        if (lead._rawRecord && ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
          return keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k));
        }
        return false;
      });
    }

    return leadsData || [];
  }, [leadsData, selectedDashboardLang, selectedWorkshop, formSource]);

  const getDynamicBatchLeads = (batch: any) => {
    if (!batch) return 0;
    if (!batch.formFilterKeyword) return batch.leads || 0;
    
    const keywords = String(batch.formFilterKeyword).toLowerCase().split('|').map(k => k.trim()).filter(Boolean);
    
    const ai7MappedQuestion = batch.metadata?.googleFormMapping?.['AI-7'] || batch.metadata?.googleFormMapping?.['ai7'];
    
    const matchedCount = (leadsData || []).filter((l: any) => {
      if (!l) return false;
      if (l._rawRecord && ai7MappedQuestion && l._rawRecord[ai7MappedQuestion]) {
        return keywords.some((k: string) => isLeadMatchingKeyword(l._rawRecord[ai7MappedQuestion], k));
      }
      return false;
    }).length;
    
    const totalCount = batch.leads || 0;
    return `${matchedCount} / ${totalCount}`;
  };
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isAiWorkerActive, setIsAiWorkerActive] = useState(false);
  const [approvedLeadIds, setApprovedLeadIds] = useState<string[]>([]);
  const [pendingLeadIds, setPendingLeadIds] = useState<string[]>([]);
  const [pending2LeadIds, setPending2LeadIds] = useState<string[]>([]);
  const [registeredLeadIds, setRegisteredLeadIds] = useState<string[]>([]);
  const [rejectedLeadIds, setRejectedLeadIds] = useState<string[]>([]);
  const [studentKotaLeadIds, setStudentKotaLeadIds] = useState<string[]>([]);
  const [closedLeadIds, setClosedLeadIds] = useState<string[]>([]);
  const [crmLeadIds, setCrmLeadIds] = useState<string[]>([]);
  const [sentCongratsLeadIds, setSentCongratsLeadIds] = useState<string[]>([]);
  const [tab2SortOrder, setTab2SortOrder] = useState<'asc' | 'desc'>('desc');
  const [leadsFilter, setLeadsFilter] = useState('');
  const [leadsSubFilter, setLeadsSubFilter] = useState('');
  const [leadsSubSubFilter, setLeadsSubSubFilter] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('');
  const [isApprovedAiWorkerActive, setIsApprovedAiWorkerActive] = useState(false);
  const [isRegisteredAiWorkerActive, setIsRegisteredAiWorkerActive] = useState(false);
  const [isAi7Active, setIsAi7Active] = useState(true);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isAi7Processing, setIsAi7Processing] = useState(false);
  const [isAi1Processing, setIsAi1Processing] = useState(false);
  const [ai1ColumnInput, setAi1ColumnInput] = useState('');
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);
  const [showDynamicColumns, setShowDynamicColumns] = useState(true);
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [globalLangLinks, setGlobalLangLinks] = useState<any>(null);
  const [googleFormsList, setGoogleFormsList] = useState<any[]>([]);
  const [isLoadingGoogleForms, setIsLoadingGoogleForms] = useState(false);
  const [googleFormQuestionMap, setGoogleFormQuestionMap] = useState<Record<string, string>>({});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [approvalAiInsights, setApprovalAiInsights] = useState<Record<string, string>>({});
  const [pendingAiInsights, setPendingAiInsights] = useState<Record<string, string>>({});
  const [registeredAiInsights, setRegisteredAiInsights] = useState<Record<string, string>>({});
  const [crmFields, setCrmFields] = useState<{ id: string, label: string }[]>([
    { id: 'Name', label: 'NAME' },
    { id: 'Email', label: 'EMAIL' },
    { id: 'Mobile', label: 'MOBILE' },
    { id: 'City', label: 'CITY' },
    { id: 'Country', label: 'COUNTRY' },
    { id: 'Gender', label: 'GENDER' },
    { id: 'AI-7', label: 'AI-7' }
  ]);
  const [mapDataFields, setMapDataFields] = useState<string[]>([
    'Name', 'Email', 'WhatsApp Number', 'Age', 'Profession', 'Country', 'City', 'Health Issues', 'Workshop Date', 'AI-7'
  ]);

  const [columnOrder, setColumnOrder] = useState<string[]>(['name', 'whatsapp', 'email', 'gender', 'city', 'payment', 'submittedAt']);
  const [rowDensity, setRowDensity] = useState<'compact' | 'normal' | 'comfortable'>('compact');
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [rowHeights, setRowHeights] = useState<Record<string, number>>({});

  const token = useAuth();

  const dynamicColumns = useMemo(() => {
    const keyCounts = new Map<string, number>();
    leadsData.forEach(lead => {
      const answers = lead.dynamicAnswers || lead._rawRecord;
      if (answers) {
        Object.keys(answers).forEach(k => {
          if (k !== 'Timestamp' && k !== 'Email Address') {
            const val = answers[k];
            if (val !== undefined && val !== null && String(val).trim() !== '') {
              keyCounts.set(k, (keyCounts.get(k) || 0) + 1);
            }
          }
        });
      }
    });
    const allKeys = Array.from(keyCounts.keys());

    const mapping = selectedWorkshop?.metadata?.googleFormMapping || {};
    const standardCrmKeys = ['Name', 'Email', 'Mobile', 'City', 'Country', 'Gender', 'NAME', 'EMAIL', 'MOBILE', 'CITY', 'COUNTRY', 'GENDER'];
    const hiddenMappedValues = standardCrmKeys.map(key => mapping[key]).filter(Boolean);

    // Always exclude keys that we already render as standard columns, regardless of mapping
    const exactStandardKeys = ['NAME', 'WHATSAPP', 'MOBILE', 'PHONE', 'EMAIL'];
    const filteredKeys = allKeys.filter(k => 
      !hiddenMappedValues.includes(k) && 
      !exactStandardKeys.includes(k.toUpperCase())
    );

    // Sort logic to prioritize MAPPED questions first
    const mappingValues = Object.values(mapping);

    const priority = (k: string) => {
      // 1. Exact match with a mapped question
      const mapIdx = mappingValues.findIndex(v => v === k);
      if (mapIdx !== -1) return mapIdx;

      // 2. Fallback to old keyword priority for unmapped but important questions
      const lower = k.toLowerCase();
      if (lower.includes('workshop date') || lower.includes('workshop month') || lower.includes('which workshop')) return 50;
      if (lower.includes('14 day') || lower.includes('14-day') || lower.includes('ready to do')) return 51;
      if (lower.includes('video')) return 52;
      if (lower.includes('donation')) return 53;

      return 100;
    };

    filteredKeys.sort((a, b) => priority(a) - priority(b));
    return filteredKeys;
  }, [leadsData, selectedWorkshop?.metadata?.googleFormMapping]);

  const filterOptions = useMemo(() => {
    const options = new Set<string>();

    // Add all 22 questions from the form map
    Object.values(googleFormQuestionMap).forEach(q => {
      if (q && typeof q === 'string') options.add(q);
    });

    // Add unique answers from leads
    leadsData.forEach(lead => {
      Object.values(lead).forEach(val => {
        if (typeof val === 'string' && val.length < 50 && val.length > 0) options.add(val);
      });
      if (lead.dynamicAnswers) {
        Object.values(lead.dynamicAnswers).forEach(val => {
          if (typeof val === 'string' && val.length < 100 && val.length > 0) options.add(val);
        });
      }
      if (lead._rawRecord) {
        Object.values(lead._rawRecord).forEach(val => {
          if (typeof val === 'string' && val.length < 100 && val.length > 0) options.add(val);
        });
      }
    });
    return Array.from(options).sort();
  }, [leadsData, googleFormQuestionMap]);

  const handleApprove = (id: string) => {
    setCrmLeadIds(prev => [...prev, id]);
    toast.success('Moved 1 lead to Leads Management!');
    setSelectedRowIds(prev => prev.filter(i => i !== id));
  };

  const handleApproveBulk = () => {
    if (selectedRowIds.length === 0) return;
    setCrmLeadIds(prev => [...prev, ...selectedRowIds]);
    toast.success(`Moved ${selectedRowIds.length} leads to Leads Management!`);
    setSelectedRowIds([]);
  };

  const handleAi7Categorize = () => {
    let activeLeads = leadsData;
    if (leadsFilter || leadsSubFilter || leadsSubSubFilter) {
      activeLeads = activeLeads.filter(lead => {
        const str = safeStringify(lead).toLowerCase();
        const f1 = !leadsFilter || str.includes(leadsFilter.toLowerCase());
        const f2 = !leadsSubFilter || str.includes(leadsSubFilter.toLowerCase());
        const f3 = !leadsSubSubFilter || str.includes(leadsSubSubFilter.toLowerCase());
        return f1 && f2 && f3;
      });
    }

    const targetLeads = selectedRowIds.length > 0 ? selectedRowIds : activeLeads.map(l => l?.id).filter(Boolean);
    if (targetLeads.length === 0) {
      toast.error('No leads available to categorize.');
      return;
    }

    setIsAi7Processing(true);
    toast.info(`🤖 AI-7 processing ${targetLeads.length} leads...`);

    setTimeout(() => {
      const tagData: Record<string, { count: number, month: string, batch: string }> = {};

      setLeadsData(prev => prev.map(lead => {
        if (!lead || !targetLeads.includes(lead.id)) return lead;

        const str = safeStringify(lead).toLowerCase();

        let batch = '';
        if (str.includes('morning') || str.includes('mor') || str.includes('morn')) batch = 'Morning';
        else if (str.includes('evening') || str.includes('eve')) batch = 'Evening';
        else if (str.includes('afternoon') || str.includes('aft')) batch = 'Afternoon';

        let month = '';
        const months = [
          { key: 'jan', val: 'Jan' }, { key: 'feb', val: 'Feb' }, { key: 'mar', val: 'Mar' },
          { key: 'apr', val: 'Apr' }, { key: 'may', val: 'May' }, { key: 'jun', val: 'Jun' },
          { key: 'jul', val: 'Jul' }, { key: 'aug', val: 'Aug' }, { key: 'sep', val: 'Sep' },
          { key: 'oct', val: 'Oct' }, { key: 'nov', val: 'Nov' }, { key: 'dec', val: 'Dec' }
        ];
        for (const m of months) {
          if (str.includes(m.key)) {
            month = m.val;
            break;
          }
        }

        const tagParts: string[] = [];
        if (month) tagParts.push(month);
        if (batch) tagParts.push(batch);
        let tag = tagParts.join('-');
        if (tag) tag += ' Eng Batch';

        const finalTag = tag || lead['AI-7'] || '';
        if (finalTag) {
          if (!tagData[finalTag]) tagData[finalTag] = { count: 0, month, batch };
          tagData[finalTag].count += 1;
        }

        return {
          ...lead,
          'AI-7': finalTag
        };
      }));

      if (Object.keys(tagData).length > 0) {
        const newWorkshops = [...workshops];
        let hasChanges = false;

        Object.entries(tagData).forEach(([tag, info]) => {
          const existing = newWorkshops.find(w => w.name.toLowerCase() === tag.toLowerCase());
          if (existing) {
            existing.leads = (existing.leads || 0) + info.count;
            hasChanges = true;
          } else {
            newWorkshops.unshift({
              id: 'ws-' + Date.now() + Math.random().toString(36).substring(7),
              name: tag,
              language: selectedWorkshop?.language || 'English',
              status: 'Upcoming',
              leads: info.count,
              date: new Date().toISOString().split('T')[0],
              time: 'TBD',
              formId: selectedWorkshop?.formId || linkedFormId,
              googleFormMapping: selectedWorkshop?.metadata?.googleFormMapping,
              metadata: {
                mainFilter: info.batch,
                subFilter: info.month
              }
            });
            hasChanges = true;
          }
        });

        if (hasChanges) {
          setWorkshops(newWorkshops);
          localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
          fetch('/api/admin/crm/new-registration/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
          }).catch(console.error);
        }
      }

      setIsAi7Processing(false);
      setActiveTab('my_data');
      toast.success(`🤖 AI-7 categorized ${targetLeads.length} leads and sent all data to My Data!`);
    }, 1500);
  };

  useEffect(() => {
    if (selectedWorkshop?.metadata) {
      if (selectedWorkshop.metadata.mainFilter !== undefined) setLeadsFilter(selectedWorkshop.metadata.mainFilter);
      if (selectedWorkshop.metadata.subFilter !== undefined) setLeadsSubFilter(selectedWorkshop.metadata.subFilter);
    }
  }, [selectedWorkshop?.metadata]);

  useEffect(() => {
    if (!isAiWorkerActive || leadsData.length === 0) return;

    const interval = setInterval(() => {
      const unapproved = leadsData.filter(l => crmLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !pendingLeadIds.includes(l.id) && !pending2LeadIds.includes(l.id));
      if (unapproved.length > 0) {
        const toProcess = unapproved.slice(0, 5);
        const toApprove: string[] = [];
        const toPending: string[] = [];
        const newPendingInsights: Record<string, string> = {};

        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasDonation = false;

          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();

              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');

              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('donation') || qLower.includes('contribute')) && (isPositive || !isNaN(parseInt(aLower)))) hasDonation = true;
            });
          }

          if (has14Days && hasVideo && hasDonation) {
            toApprove.push(lead.id);
          } else {
            toPending.push(lead.id);
            let reason = '';
            if (!has14Days) reason += 'Missed 14 Days commitment. ';
            if (!hasVideo) reason += 'Missed Video On commitment. ';
            if (!hasDonation) reason += 'Missed Donation commitment. ';
            newPendingInsights[lead.id] = reason.trim() || 'Did not meet all AI-1 conditions.';
          }
        });

        if (toApprove.length > 0) setApprovedLeadIds(prev => [...prev, ...toApprove]);
        if (toPending.length > 0) {
          setPendingLeadIds(prev => [...prev, ...toPending]);
          setPendingAiInsights(prev => ({ ...prev, ...newPendingInsights }));
        }

        toast.success(`🤖 AI-1 processed ${toProcess.length} forms: ${toApprove.length} Approved, ${toPending.length} Pending-1.`);
      }
    }, 5 * 60 * 1000); // 5 minutes (300000ms)

    return () => clearInterval(interval);
  }, [isAiWorkerActive, leadsData, approvedLeadIds, pendingLeadIds, crmLeadIds]);

  // NEW RULE: AI-1 Automatic Lead Sync (Create/Sync batches every 5 minutes)
  useEffect(() => {
    if (!isAiWorkerActive || leadsData.length === 0 || !selectedWorkshop) return;

    const interval = setInterval(async () => {
      let formField = '';
      const manualCol = selectedWorkshop.metadata?.ai1Column;
      if (manualCol) {
        if (!isNaN(Number(manualCol)) && leadsData.length > 0) {
          const firstLead = leadsData[0];
          const rawAnswers = firstLead._rawRecord || firstLead.dynamicAnswers || {};
          const keys = Object.keys(rawAnswers);
          const idx = parseInt(manualCol) - 1;
          if (idx >= 0 && idx < keys.length) formField = keys[idx];
        } else {
          const firstLead = leadsData[0] || {};
          const rawAnswers = firstLead._rawRecord || firstLead.dynamicAnswers || {};
          const keys = Object.keys(rawAnswers);
          if (keys.includes(manualCol)) formField = manualCol;
          else {
            const partialMatch = keys.find(k => k.toLowerCase().includes(manualCol.toLowerCase()));
            if (partialMatch) formField = partialMatch;
            else formField = manualCol;
          }
        }
      }

      if (!formField) {
        const dateMappingKey = Object.keys(fieldMapping).find(k => k.toUpperCase().includes('DATE') || k.toUpperCase().includes('BATCH'));
        if (dateMappingKey && fieldMapping[dateMappingKey]) {
          formField = fieldMapping[dateMappingKey];
        }
      }
      
      if (!formField) return; // Cannot sync if field is unknown
      
      // Find all unique dates from the leads
      const uniqueDates = new Set<string>();
      leadsData.forEach((lead: any) => {
        let dateVal: any = undefined;
        const searchCol = formField.toLowerCase();
        
        const findVal = (obj: any) => {
          if (!obj) return undefined;
          if (obj[formField] !== undefined) return obj[formField];
          const key = Object.keys(obj).find(k => k.toLowerCase().includes(searchCol));
          return key ? obj[key] : undefined;
        };
        
        dateVal = findVal(lead._rawRecord);
        if (dateVal === undefined) dateVal = findVal(lead.dynamicAnswers);

        if (dateVal && String(dateVal).trim() !== '') {
          uniqueDates.add(String(dateVal).trim());
        }
      });

      if (uniqueDates.size === 0 && manualCol) {
        const searchWord = manualCol.toLowerCase();
        leadsData.forEach((lead: any) => {
          const findAnswer = (obj: any) => {
            if (!obj) return undefined;
            for (const k of Object.keys(obj)) {
              const v = String(obj[k]);
              if (v.toLowerCase().includes(searchWord)) return v;
            }
            return undefined;
          };
          let val = findAnswer(lead._rawRecord);
          if (val === undefined) val = findAnswer(lead.dynamicAnswers);
          if (val && String(val).trim() !== '') {
            uniqueDates.add(String(val).trim());
          }
        });
      }

      if (uniqueDates.size === 0) return;

      setWorkshops(prevWorkshops => {
        let newWorkshops = [...prevWorkshops];
        let addedCount = 0;

        uniqueDates.forEach(date => {
          // Check if a batch for this exact date and language already exists (or is part of a merged batch)
          const exists = newWorkshops.some(w =>
            w.id.startsWith('batch_') &&
            matchesLanguage(w, selectedDashboardLang) &&
            (w.formFilterKeyword === date || (w.formFilterKeyword || '').split('|').includes(date))
          );

          if (!exists) {
            const newBatch = {
              id: `batch_${selectedDashboardLang.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              name: `${selectedDashboardLang} - ${date.substring(0, 30)}${date.length > 30 ? '...' : ''}`,
              language: selectedDashboardLang,
              formId: selectedWorkshop.formId,
              formFilterKeyword: date,
              metadata: {
                batchDate: date,
                googleFormMapping: selectedWorkshop.metadata?.googleFormMapping,
                formSource: selectedWorkshop.metadata?.formSource
              },
              leads: leadsData.filter((l: any) => l._rawRecord && String(l._rawRecord[formField]).trim() === date).length
            };
            newWorkshops.push(newBatch);
            addedCount++;
          } else {
            // Optional: Update leads count for existing batch
            const batchIndex = newWorkshops.findIndex(w => 
              w.id.startsWith('batch_') &&
              matchesLanguage(w, selectedDashboardLang) &&
              (w.formFilterKeyword === date || (w.formFilterKeyword || '').split('|').includes(date))
            );
            if (batchIndex !== -1) {
              const currentLeadsCount = leadsData.filter((l: any) => l._rawRecord && String(l._rawRecord[formField]).trim() === date).length;
              if (newWorkshops[batchIndex].leads !== currentLeadsCount) {
                newWorkshops[batchIndex] = { ...newWorkshops[batchIndex], leads: currentLeadsCount };
                addedCount++; // Count as a change to trigger save
              }
            }
          }
        });

        if (addedCount > 0) {
          localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
          // Sync to backend
          fetch('/api/admin/crm/new-registration/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
          }).catch(err => console.error('Auto-sync error:', err));
          
          toast.success(`🤖 AI-1A Auto-Worker: Created or updated batches from new leads!`);
          return newWorkshops;
        }
        return prevWorkshops;
      });
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [isAiWorkerActive, leadsData, selectedWorkshop, selectedDashboardLang, fieldMapping, token]);

  useEffect(() => {
    if (!isApprovedAiWorkerActive || leadsData.length === 0) return;

    const interval = setInterval(() => {
      // Find leads that are approved but not yet in registered or pending-2
      const unevaluated = leadsData.filter(l =>
        approvedLeadIds.includes(l.id) &&
        !registeredLeadIds.includes(l.id) &&
        !pending2LeadIds.includes(l.id) &&
        !closedLeadIds.includes(l.id)
      );

      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newRegistered: string[] = [];
        const newPending2: string[] = [];
        const newInsights: Record<string, string> = {};

        toProcess.forEach(lead => {
          let hasValidEducation = false;
          let hasValidProfession = false;
          let hasValidAge = false;
          let isAI3Reject = false;
          let reason = '';

          if (!lead.dynamicAnswers) {
            reason = 'No form data available.';
          } else {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();

              // AI-2 checks
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'hsc', 'degree', 'grad', 'post', 'phd', 'b.', 'm.', 'bca', 'mca', 'btech', 'mtech', 'ca', 'cs'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
                if (aLower.includes('student')) isAI3Reject = true; // AI-3 check
              }

              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed', 'professional'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;

                const rejectProfKeywords = ['jobless', 'job less', 'no job', 'retired', 'student', 'housewife'];
                if (rejectProfKeywords.some(kw => aLower.includes(kw))) isAI3Reject = true; // AI-3 check
              }

              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age)) {
                  if (age >= 34 && age <= 64) hasValidAge = true;
                  if (age < 30 || age > 64) isAI3Reject = true; // AI-3 check
                }
              }
            });

            if (isAI3Reject) {
              reason = "AI-3 Rule: Jobless, student, retired, or age out of bounds (<30 or >64).";
            } else {
              if (!hasValidEducation) reason += 'Education does not meet 12th-PhD criteria. ';
              if (!hasValidProfession) reason += 'Profession is not job/business/self-employed. ';
              if (!hasValidAge) reason += 'Age is not between 34-64. ';
            }
          }

          if (reason === '') {
            newRegistered.push(lead.id);
          } else {
            newPending2.push(lead.id);
            newInsights[lead.id] = reason.trim();
          }
        });

        if (newRegistered.length > 0) setRegisteredLeadIds(prev => [...prev, ...newRegistered]);
        if (newPending2.length > 0) {
          setPending2LeadIds(prev => [...prev, ...newPending2]);
          setApprovalAiInsights(prev => ({ ...prev, ...newInsights }));
        }
      }
    }, 5 * 60 * 1000); // 5 minutes (300000ms)

    return () => clearInterval(interval);
  }, [isApprovedAiWorkerActive, leadsData, approvedLeadIds, registeredLeadIds, pending2LeadIds, closedLeadIds, approvalAiInsights]);

  useEffect(() => {
    if (!isRegisteredAiWorkerActive || leadsData.length === 0) return;

    const interval = setInterval(() => {
      // Find leads that are registered but not yet evaluated by this AI (not closed)
      const unevaluated = leadsData.filter(l =>
        registeredLeadIds.includes(l.id) &&
        !closedLeadIds.includes(l.id)
      );

      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newClosed: string[] = [];
        const newInsights: Record<string, string> = {};

        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasDonation = false;
          let hasValidEducation = false;
          let hasValidProfession = false;
          let hasValidAge = false;
          let isAI3Reject = false;

          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();

              // AI-1 Checks
              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');

              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('donation') || qLower.includes('contribute')) && (isPositive || !isNaN(parseInt(aLower)))) hasDonation = true;

              // AI-2 Checks
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'hsc', 'degree', 'grad', 'post', 'phd', 'b.', 'm.', 'bca', 'mca', 'btech', 'mtech', 'ca', 'cs'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
                if (aLower.includes('student')) isAI3Reject = true;
              }
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed', 'professional'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;
                const rejectProfKeywords = ['jobless', 'job less', 'no job', 'retired', 'student', 'housewife'];
                if (rejectProfKeywords.some(kw => aLower.includes(kw))) isAI3Reject = true;
              }
              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age)) {
                  if (age >= 34 && age <= 64) hasValidAge = true;
                  if (age < 30 || age > 64) isAI3Reject = true;
                }
              }
            });
          }

          if (has14Days && hasVideo && hasDonation && hasValidEducation && hasValidProfession && hasValidAge && !isAI3Reject) {
            newClosed.push(lead.id);
          } else {
            newInsights[lead.id] = 'Failed AI-5 final combined verification.';
          }
        });

        if (newClosed.length > 0) setClosedLeadIds(prev => [...prev, ...newClosed]);
        if (Object.keys(newInsights).length > 0) setRegisteredAiInsights(prev => ({ ...prev, ...newInsights }));
      }
    }, 5 * 60 * 1000); // 5 minutes (300000ms)

    return () => clearInterval(interval);
  }, [isRegisteredAiWorkerActive, leadsData, registeredLeadIds, closedLeadIds, registeredAiInsights]);

  useEffect(() => {
    // Automated Congratulatory Message logic
    if (registeredLeadIds.length === 0 || leadsData.length === 0) return;

    const unsentIds = registeredLeadIds.filter(id => !sentCongratsLeadIds.includes(id));
    if (unsentIds.length > 0) {
      unsentIds.forEach(id => {
        const lead = leadsData.find(l => l.id === id);
        if (lead) {
          toast.success(`Automated Meta/Email sent to ${lead.name || 'Lead'}: "Congratulations, your form has been selected and approved, now final a small zoom meeting is needed for the class, so let me your date and time select any one slot and join for it."`);
        }
      });
      setSentCongratsLeadIds(prev => [...prev, ...unsentIds]);
    }
  }, [registeredLeadIds, sentCongratsLeadIds, leadsData]);

  useEffect(() => {
    async function loadForms() {
      if (!token) return;
      setIsLoadingForms(true);
      setIsLoadingGoogleForms(true);
      try {
        const res = await fetch('/api/admin/enquiry-forms', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setFetchedForms(json.data || []);
          }
        }

        const gRes = await fetch('/api/admin/google-forms/list', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const gJson = await gRes.json();
        if (gRes.ok) {
          if (gJson.forms) {
            setGoogleFormsList(gJson.forms);
            setNeedsGoogleAuth(false);
          }
        } else {
          if (gJson.needsAuth) {
            setNeedsGoogleAuth(true);
          } else {
            toast.error(gJson.error || 'Failed to load Google Forms');
          }
        }
      } catch (err) {
        console.error('Error fetching forms:', err);
      } finally {
        setIsLoadingForms(false);
        setIsLoadingGoogleForms(false);
      }
    }
    loadForms();
  }, [token]);

  const [refreshLeadsCounter, setRefreshLeadsCounter] = useState(0);

  // Auto-sync leads from Google Form / CRM every 10 minutes
  useEffect(() => {
    if (!linkedFormId) return;
    const interval = setInterval(() => {
      setRefreshLeadsCounter(prev => prev + 1);
    }, 10 * 60 * 1000); // 10 minutes
    return () => clearInterval(interval);
  }, [linkedFormId]);

  useEffect(() => {
    async function loadLeads() {
      if (!linkedFormId) return;
      setIsLoadingLeads(true);
      try {
        if (linkedFormId.includes('docs.google.com/spreadsheets')) {
          const res = await fetch(`/api/admin/google-form-csv?url=${encodeURIComponent(linkedFormId)}`);
          if (res.ok) {
            const json = await res.json();
            const fetchedLeads = json.data || [];
            setLeadsData(fetchedLeads);
            setWorkshops(prev => (prev || []).map(w => w?.formId === linkedFormId ? { ...w, leads: fetchedLeads.length } : w));
            setSelectedWorkshop(prev => prev && prev.formId === linkedFormId ? { ...prev, leads: fetchedLeads.length } : prev);
          } else {
            const errorData = await res.json().catch(() => null);
            toast.error(errorData?.error || 'Failed to load Google Sheets CSV');
          }
        } else if (formSource === 'google' || linkedFormId === 'google-form-sync' || linkedFormId.includes('docs.google.com/forms') || linkedFormId) {
          let fetchedLeads = [];
          setNeedsGoogleAuth(false);

          const syncHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
          // Check Google Forms OAuth Sync first
          const syncRes = await fetch(`/api/admin/google-forms/sync?url=${encodeURIComponent(linkedFormId)}`, {
            headers: syncHeaders
          });

          if (syncRes.ok) {
            const json = await syncRes.json();
            let mappedLeads = json.data || [];
            const ws = selectedWorkshop;
            const mapping = ws?.metadata?.googleFormMapping;
            if (mapping && mappedLeads.length > 0) {
              mappedLeads = mappedLeads.map((lead: any) => {
                const raw = lead._rawRecord || {};
                return {
                  ...lead,
                  name: raw[mapping['NAME']] || raw[mapping['Name']] || lead.name,
                  email: raw[mapping['EMAIL']] || raw[mapping['Email']] || lead.email,
                  mobile: raw[mapping['MOBILE']] || raw[mapping['Mobile']] || lead.mobile,
                  phoneNumber: raw[mapping['MOBILE']] || raw[mapping['Mobile']] || lead.phoneNumber,
                  city: raw[mapping['CITY']] || raw[mapping['City']] || lead.city,
                  country: raw[mapping['COUNTRY']] || raw[mapping['Country']] || lead.country,
                  gender: raw[mapping['GENDER']] || raw[mapping['Gender']] || lead.gender,
                  language: ws?.language || selectedDashboardLang,
                  workshopName: ws?.name || '',
                };
              });
            } else {
              mappedLeads = mappedLeads.map((lead: any) => ({
                ...lead,
                language: ws?.language || selectedDashboardLang,
                workshopName: ws?.name || '',
              }));
            }

            fetchedLeads = mappedLeads;
            if (json.linkedSheetId) setActiveLinkedSheetId(json.linkedSheetId);
            if (json.questionMap) setGoogleFormQuestionMap(json.questionMap);
            if (ws?.metadata?.googleFormMapping) setFieldMapping(ws.metadata.googleFormMapping);
          } else if (syncRes.status === 401) {
            setNeedsGoogleAuth(true);
          } else {
            const err = await syncRes.json().catch(() => ({}));
            setGoogleAuthError(err.error || 'Failed to sync form');
            toast.error("Google Forms Sync Failed: " + (err.error || 'Invalid Form ID'));
            // Fallback to webhook checking
            const res = await fetch(`/api/admin/enquiries?workshopId=${encodeURIComponent(linkedFormId)}`, {
              headers: syncHeaders
            });
            if (res.ok) {
              const json = await res.json();
              fetchedLeads = json.data || [];
            }
          }

          // Update leads data
          setLeadsData(fetchedLeads);
          setWorkshops(prev => {
            const updated = (prev || []).map(w => {
              if (w.id.startsWith('batch_') && w.formId === linkedFormId) {
                if (w.formFilterKeyword) {
                  const keywords = w.formFilterKeyword.toLowerCase().split('|').map((k: string) => k.trim()).filter(Boolean);
                  const ai7MappedQuestion = w.metadata?.googleFormMapping?.['AI-7'] || w.metadata?.googleFormMapping?.['ai7'];
                  const count = fetchedLeads.filter((lead: any) => {
                    if (lead._rawRecord) {
                      if (ai7MappedQuestion && lead._rawRecord[ai7MappedQuestion]) {
                        return keywords.some((k: string) => isLeadMatchingKeyword(lead._rawRecord[ai7MappedQuestion], k));
                      } else {
                        return keywords.some((k: string) => Object.values(lead._rawRecord).some(val => isLeadMatchingKeyword(val as string, k)));
                      }
                    }
                    return true;
                  }).length;
                  return { ...w, leads: count };
                }
              } else if (w.formId === linkedFormId) {
                return { ...w, leads: fetchedLeads.length };
              }
              return w;
            });
            // Also update selectedWorkshop if it's currently selected
            if (selectedWorkshop) {
              const updatedSelected = updated.find(w => w.id === selectedWorkshop.id);
              if (updatedSelected) {
                setSelectedWorkshop(updatedSelected);
              }
            }
            return updated;
          });
        } else {
          const res = await fetch(`/api/admin/enquiries?workshopId=${linkedFormId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const json = await res.json();
            const fetchedLeads = json.data || [];
            setLeadsData(fetchedLeads);
            setWorkshops(prev => (prev || []).map(w => w?.id === selectedWorkshop?.id ? { ...w, leads: fetchedLeads.length } : w));
            setSelectedWorkshop(prev => prev && prev.id === selectedWorkshop?.id ? { ...prev, leads: fetchedLeads.length } : prev);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingLeads(false);
      }
    }
    loadLeads();
  }, [linkedFormId, token, refreshLeadsCounter]);

  const [workshops, setWorkshops] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const workshopsRef = React.useRef(workshops);
  const leadsFilterRef = React.useRef(leadsFilter);
  const leadsSubFilterRef = React.useRef(leadsSubFilter);
  const leadsSubSubFilterRef = React.useRef(leadsSubSubFilter);

  React.useEffect(() => { workshopsRef.current = workshops; }, [workshops]);
  React.useEffect(() => { leadsFilterRef.current = leadsFilter; }, [leadsFilter]);
  React.useEffect(() => { leadsSubFilterRef.current = leadsSubFilter; }, [leadsSubFilter]);
  React.useEffect(() => { leadsSubSubFilterRef.current = leadsSubSubFilter; }, [leadsSubSubFilter]);

  useEffect(() => {
    if (!isAi7Active) return;

    let isFetching = false;

    const interval = setInterval(async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const currentWorkshops = workshopsRef.current || [];
        const formsToSync = Array.from(new Set(currentWorkshops.filter((w: any) => w.formId && (w.formId.includes('docs.google.com') || w.formSource === 'google')).map((w: any) => w.formId)));
        if (formsToSync.length === 0 && linkedFormId && linkedFormId.includes('docs.google.com')) {
          formsToSync.push(linkedFormId);
        }

        for (const currentFormId of formsToSync) {
          const mapping = currentWorkshops.find((w: any) => w.formId === currentFormId)?.metadata?.googleFormMapping;
          const currentWorkshop = currentWorkshops.find((w: any) => w.formId === currentFormId);
          let fetchedLeads: any[] = [];
          let newQuestionMap: any = null;

          const fetchWithRetry = async (url: string, options: any, retries = 3): Promise<Response> => {
            let lastErr: any;
            for (let i = 0; i < retries; i++) {
              try {
                const res = await fetch(url, options);
                if (res.ok) return res;
                if (res.status >= 500) throw new Error('Server error');
                return res;
              } catch (e) {
                lastErr = e;
                if (i < retries - 1) {
                  await new Promise(r => setTimeout(r, 1000 * (i + 1)));
                }
              }
            }
            throw lastErr;
          };

          if (currentFormId.includes('docs.google.com/forms') || currentFormId) {
            const syncHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
            const syncRes = await fetchWithRetry(`/api/admin/google-forms/sync?url=${encodeURIComponent(currentFormId)}`, {
              headers: syncHeaders
            });
            if (syncRes.ok) {
              const json = await syncRes.json();
              let mappedLeads: any[] = json.data || [];
              if (mapping && mappedLeads.length > 0) {
                  mappedLeads = mappedLeads.map((lead: any) => {
                  const raw = lead._rawRecord || {};
                  return {
                    ...lead,
                    name: raw[mapping['NAME']] || raw[mapping['Name']] || lead.name,
                    email: raw[mapping['EMAIL']] || raw[mapping['Email']] || lead.email,
                    mobile: raw[mapping['MOBILE']] || raw[mapping['Mobile']] || lead.mobile,
                    phoneNumber: raw[mapping['MOBILE']] || raw[mapping['Mobile']] || lead.phoneNumber,
                    city: raw[mapping['CITY']] || raw[mapping['City']] || lead.city,
                    country: raw[mapping['COUNTRY']] || raw[mapping['Country']] || lead.country,
                    gender: raw[mapping['GENDER']] || raw[mapping['Gender']] || lead.gender,
                    language: currentWorkshop?.language || selectedDashboardLang,
                    workshopName: currentWorkshop?.name || '',
                  };
                });
              } else {
                mappedLeads = mappedLeads.map((lead: any) => ({
                  ...lead,
                  language: currentWorkshop?.language || selectedDashboardLang,
                  workshopName: currentWorkshop?.name || '',
                }));
              }

              fetchedLeads = mappedLeads;
              if (json.questionMap) newQuestionMap = json.questionMap;
            } else if (syncRes.status === 401) {
              setNeedsGoogleAuth(true);
            }
          }

          if (fetchedLeads.length > 0) {
            setLeadsData((prevLeads: any[]) => {
              const existingIds = new Set((prevLeads || []).filter(Boolean).map((l: any) => l?.id).filter(Boolean));
              const newLeads = fetchedLeads.filter((l: any) => l && l.id && !existingIds.has(l.id));

              if (newLeads.length > 0) {
                const ws = (workshopsRef.current || []).find((w: any) => w.formId === linkedFormId);
                let leadsToMove = newLeads;
                const effectiveF1 = leadsFilterRef.current || ws?.metadata?.mainFilter || '';
                const effectiveF2 = leadsSubFilterRef.current || ws?.metadata?.subFilter || '';
                const effectiveF3 = leadsSubSubFilterRef.current || '';

                if (effectiveF1 || effectiveF2 || effectiveF3) {
                  leadsToMove = newLeads.filter((lead: any) => {
                    const f1 = !effectiveF1 || (() => {
                      const vals = [
                        lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                        ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : []),
                        ...(lead._rawRecord ? Object.values(lead._rawRecord) : [])
                      ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                      return vals.some((v: any) => v.includes(effectiveF1.toLowerCase()));
                    })();
                    const f2 = !effectiveF2 || (() => {
                      const vals = [
                        lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                        ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : []),
                        ...(lead._rawRecord ? Object.values(lead._rawRecord) : [])
                      ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                      return vals.some((v: any) => v.includes(effectiveF2.toLowerCase()));
                    })();
                    const f3 = !effectiveF3 || (() => {
                      const vals = [
                        lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                        ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : []),
                        ...(lead._rawRecord ? Object.values(lead._rawRecord) : [])
                      ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                      return vals.some((v: any) => v.includes(effectiveF3.toLowerCase()));
                    })();
                    return f1 && f2 && f3;
                  });
                }

                if (leadsToMove.length > 0) {
                  setCrmLeadIds((prevCrm: string[]) => {
                    const idsToMove = leadsToMove.map((l: any) => l?.id).filter(Boolean);
                    const newCrmIds = Array.from(new Set([...prevCrm, ...idsToMove]));
                    toast.success(`🤖 AI-4: Found ${newLeads.length} new leads, moved ${leadsToMove.length} matching your filter to CRM!`);
                    return newCrmIds;
                  });
                }

                setWorkshops((prev: any[]) => {
                  return (prev || []).map((w: any) => {
                    if (w?.formId === currentFormId) {
                      const f1 = w.formFilterKeyword || w.metadata?.mainFilter || '';
                      const f2 = w.metadata?.subFilter || '';
                      
                      if (String(w.id).startsWith('master_')) {
                        const matchedLangs = newLeads.filter((l: any) => matchesLanguage({ language: currentWorkshop?.language || selectedDashboardLang }, w.language));
                        return { ...w, leads: (w.leads || 0) + matchedLangs.length };
                      }

                      if (!f1 && !f2) {
                        return { ...w, leads: (w.leads || 0) + newLeads.length };
                      }

                      const matched = newLeads.filter((lead: any) => {
                        const vals = [
                          lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                          ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : []),
                          ...(lead._rawRecord ? Object.values(lead._rawRecord) : [])
                        ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                        
                        const keywords = f1.toLowerCase().split('|').map((k: string) => k.trim()).filter(Boolean);
                        const m1 = keywords.length === 0 || keywords.some((k: string) => vals.some((v: any) => isLeadMatchingKeyword(v, k)));
                        const m2 = !f2 || vals.some((v: any) => v.includes(f2.toLowerCase()));
                        return m1 && m2;
                      });
                      
                      return { ...w, leads: (w.leads || 0) + matched.length };
                    }
                    return w;
                  });
                });

                return [...(prevLeads || []).filter(Boolean), ...newLeads];
              }

              return prevLeads;
            });

            if (newQuestionMap) setGoogleFormQuestionMap(newQuestionMap);
          }
        }
      } catch (err) {
        console.error("AI4 Fetch error", err);
      } finally {
        isFetching = false;
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAi7Active, linkedFormId, token, formSource]);


  useEffect(() => {
    const defaultBatch = {
      id: 'w_marathi_swar_yoga',
      name: 'Marathi swar yoga',
      formId: '',
      googleFormUrl: '',
      leads: 0,
      language: 'Marathi'
    };

    const saved = localStorage.getItem('crm_marathi_workshops');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkshops(parsed);
        } else {
          setWorkshops([defaultBatch]);
        }
      } catch (e) {
        setWorkshops([defaultBatch]);
      }
    } else {
      setWorkshops([defaultBatch]);
    }

    // Restore last selected workshop/form
    const savedWorkshop = localStorage.getItem('crm_marathi_selected_workshop');
    if (savedWorkshop) {
      try {
        const sw = JSON.parse(savedWorkshop);
        if (sw?.id) setSelectedWorkshop(sw);
      } catch (_) {}
    }
    // Form settings are now handled in a separate useEffect reacting to selectedDashboardLang

    const savedAiState = localStorage.getItem('crm_marathi_ai_worker_active');
    if (savedAiState) setIsAiWorkerActive(savedAiState === 'true');

    const savedApprovedAiState = localStorage.getItem('crm_marathi_approved_ai_active');
    if (savedApprovedAiState) setIsApprovedAiWorkerActive(savedApprovedAiState === 'true');

    const savedRegisteredAiState = localStorage.getItem('crm_marathi_registered_ai_active');
    if (savedRegisteredAiState) setIsRegisteredAiWorkerActive(savedRegisteredAiState === 'true');

    const savedAi7State = localStorage.getItem('crm_marathi_ai_7_active');
    if (savedAi7State !== null) setIsAi7Active(savedAi7State === 'true');
    else setIsAi7Active(true);

    try {
      const loadFromApi = async () => {
        try {
          const res = await fetch('/api/admin/crm/new-registration/state');
          if (res.ok) {
            const data = await res.json();
            if (data) {
              if (data.crm_workshops) {
                try {
                  const parsed = typeof data.crm_workshops === 'string' ? JSON.parse(data.crm_workshops) : data.crm_workshops;
                  if (Array.isArray(parsed)) setWorkshops(parsed);
                } catch (_) {}
              }
              if (data.crm_ai_worker_active) setIsAiWorkerActive(data.crm_ai_worker_active === 'true');
              if (data.crm_approved_ai_active) setIsApprovedAiWorkerActive(data.crm_approved_ai_active === 'true');
              if (data.crm_registered_ai_active) setIsRegisteredAiWorkerActive(data.crm_registered_ai_active === 'true');
              if (data.crm_ai_7_active) setIsAi7Active(data.crm_ai_7_active === 'true');
              // Restore selected form/workshop from DB (overrides localStorage if present)
              const langSuffixStr = `_${selectedDashboardLang}`;
              if (data['crm_marathi_selected_workshop' + langSuffixStr]) {
                try {
                  const sw = JSON.parse(data['crm_marathi_selected_workshop' + langSuffixStr]);
                  if (sw?.id) setSelectedWorkshop(sw);
                } catch (_) {}
              }
              // Form settings loaded via general loop and then picked up by language-specific useEffect
              if (data.crm_ai1_column) {
                setAi1ColumnInput(data.crm_ai1_column);
              }
              // Sync all keys back to localStorage so the rest of the app doesn't break
              for (const [k, v] of Object.entries(data)) {
                if (typeof v === 'string') localStorage.setItem(k, v);
              }
            }
          }
        } catch (e) {
          console.error('API load failed, falling back to local', e);
        }
      };

      loadFromApi();
    } catch (e) {
      console.error('Error loading crm states', e);
    }

    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams?.get('success') === 'google_forms_connected') {
          const defaultUrl = '';
          toast.success('🎉 Google Account connected! Swar Yoga Form saved & data loaded automatically.');
          setFormSource('google');
          setGoogleFormUrl(defaultUrl);
          setLinkedFormId(defaultUrl);
          setActiveTab('forms');
          setIsFormSetupCollapsed(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (searchParams?.get('error')) {
          toast.error(`Google Login: ${searchParams?.get('error')}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) { }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    
    const langSuffix = `_${selectedDashboardLang}`;
    const savedFormSource = localStorage.getItem('crm_marathi_form_source' + langSuffix) ;
    if (savedFormSource === 'internal' || savedFormSource === 'google') {
      setFormSource(savedFormSource as 'internal' | 'google');
    } else {
      setFormSource('google');
    }

    const savedGoogleFormUrl = localStorage.getItem('crm_marathi_google_form_url' + langSuffix);
    if (savedGoogleFormUrl) {
      setGoogleFormUrl(savedGoogleFormUrl);
      setLinkedFormId(savedGoogleFormUrl);
    } else {
      const isOffer = selectedDashboardLang.includes('Offer');
      const baseLang = selectedDashboardLang.replace(' Workshop', '').replace(' Offer', '').trim();
      const mappedUrl = globalLangLinks?.[baseLang]?.[isOffer ? 'offer' : 'workshop'];
      
      const defaultUrl = mappedUrl  || '';
      setGoogleFormUrl(defaultUrl);
      setLinkedFormId(defaultUrl);
    }

    const savedSelectedFormId = localStorage.getItem('crm_marathi_selected_form_id' + langSuffix) ;
    if (savedSelectedFormId) {
      setSelectedFormId(savedSelectedFormId);
    } else {
      setSelectedFormId('');
    }
  }, [selectedDashboardLang, isLoaded, globalLangLinks]);

  useEffect(() => {
    if (isLoaded) {
      const stateObj: Record<string, string> = {};

      const langSuffix = `_${selectedDashboardLang}`;
      const setAndCollect = (k: string, v: string) => {
        localStorage.setItem(k, v);
        stateObj[k] = v;
      };

      setAndCollect('crm_marathi_workshops', safeStringify(workshops));
      setAndCollect('crm_marathi_ai_worker_active', String(isAiWorkerActive));
      setAndCollect('crm_marathi_approved_ai_active', String(isApprovedAiWorkerActive));
      setAndCollect('crm_marathi_registered_ai_active', String(isRegisteredAiWorkerActive));
      // Persist selected form/workshop to BOTH localStorage AND DB (via stateObj → API)
      if (selectedWorkshop) setAndCollect('crm_marathi_selected_workshop' + langSuffix, safeStringify(selectedWorkshop));
      
      if (googleFormUrl) setAndCollect('crm_marathi_google_form_url' + langSuffix, googleFormUrl);
      if (formSource) setAndCollect('crm_marathi_form_source' + langSuffix, formSource);
      if (selectedFormId) setAndCollect('crm_marathi_selected_form_id' + langSuffix, selectedFormId);

      if (selectedWorkshop) {
        const suffix = `_${selectedWorkshop?.id}`;
        setAndCollect('crm_marathi_lead_ids' + suffix, safeStringify(crmLeadIds));
        setAndCollect('crm_marathi_approved_ids' + suffix, safeStringify(approvedLeadIds));
        setAndCollect('crm_marathi_pending_ids' + suffix, safeStringify(pendingLeadIds));
        setAndCollect('crm_marathi_pending2_ids' + suffix, safeStringify(pending2LeadIds));
        setAndCollect('crm_marathi_registered_ids' + suffix, safeStringify(registeredLeadIds));
        setAndCollect('crm_marathi_rejected_ids' + suffix, safeStringify(rejectedLeadIds));
        setAndCollect('crm_marathi_student_kota_ids' + suffix, safeStringify(studentKotaLeadIds));
        setAndCollect('crm_marathi_closed_ids' + suffix, safeStringify(closedLeadIds));
        setAndCollect('crm_marathi_sent_congrats_ids' + suffix, safeStringify(sentCongratsLeadIds));
        setAndCollect('crm_marathi_approval_insights' + suffix, safeStringify(approvalAiInsights));
        setAndCollect('crm_marathi_pending_insights' + suffix, safeStringify(pendingAiInsights));
        setAndCollect('crm_marathi_registered_insights' + suffix, safeStringify(registeredAiInsights));
      }

      const timeoutId = setTimeout(() => {
        // Collect any other crm_ keys from localStorage that weren't just set
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('crm_marathi_') && !stateObj[key]) {
            stateObj[key] = localStorage.getItem(key) || '';
          }
        }

        fetch('/api/admin/crm/new-registration/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeStringify(stateObj)
        }).catch(e => console.error('Failed to sync state to Bunny', e));
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [workshops, isAiWorkerActive, crmLeadIds, approvedLeadIds, pendingLeadIds, pending2LeadIds, registeredLeadIds, rejectedLeadIds, studentKotaLeadIds, closedLeadIds, sentCongratsLeadIds, isApprovedAiWorkerActive, isRegisteredAiWorkerActive, approvalAiInsights, pendingAiInsights, registeredAiInsights, isLoaded, selectedWorkshop, googleFormUrl, formSource, selectedFormId]);

  useEffect(() => {
    if (selectedWorkshop?.formId) {
      setLinkedFormId(selectedWorkshop.formId);
      setSelectedFormId(selectedWorkshop.formId);

      const source = selectedWorkshop.metadata?.formSource ||
        (selectedWorkshop.metadata?.googleFormMapping ? 'google' :
          (selectedWorkshop.formId.includes('docs.google.com') || selectedWorkshop.formId.includes('forms.gle') ? 'google' : 'internal'));

      setFormSource(source);
      if (source === 'google') {
        setGoogleFormUrl(selectedWorkshop.formId);
      } else {
        setSelectedFormId(selectedWorkshop.formId);
      }

      if (selectedWorkshop.metadata?.googleFormMapping) {
        setFieldMapping(selectedWorkshop.metadata.googleFormMapping);
      } else {
        setFieldMapping(prev => Object.keys(prev).length === 0 ? prev : {});
      }

      setLeadsFilter(selectedWorkshop.metadata?.mainFilter || '');
      setLeadsSubFilter(selectedWorkshop.metadata?.subFilter || '');

      const suffix = `_${selectedWorkshop?.id}`;

      const loadList = (key: string) => {
        const str = localStorage.getItem(key + suffix);
        return str ? JSON.parse(str) : [];
      };
      const loadObj = (key: string) => {
        const str = localStorage.getItem(key + suffix);
        return str ? JSON.parse(str) : {};
      };

      setCrmLeadIds(loadList('crm_marathi_lead_ids'));
      setApprovedLeadIds(loadList('crm_marathi_approved_ids'));
      setPendingLeadIds(loadList('crm_marathi_pending_ids'));
      setRegisteredLeadIds(loadList('crm_marathi_registered_ids'));
      setRejectedLeadIds(loadList('crm_marathi_rejected_ids'));
      setStudentKotaLeadIds(loadList('crm_marathi_student_kota_ids'));
      setClosedLeadIds(loadList('crm_marathi_closed_ids'));
      setSentCongratsLeadIds(loadList('crm_marathi_sent_congrats_ids'));

      setApprovalAiInsights(loadObj('crm_marathi_approval_insights'));
      setPendingAiInsights(loadObj('crm_marathi_pending_insights'));
      setRegisteredAiInsights(loadObj('crm_marathi_registered_insights'));
    } else {
      // CLEAR linkedFormId to enforce strict data isolation between languages/workshops.
      // If a workshop is not mapped to a form, it must not show another workshop's leads.
      setLinkedFormId('');
      setSelectedFormId('');
      setGoogleFormUrl('');
      setFormSource('internal');
      setLeadsData([]);
      setFieldMapping({});
      setLeadsFilter('');
      setLeadsSubFilter('');
      setLeadsSubSubFilter('');

      // We no longer fall back to the English default form URL if linkedFormId is empty.
      // This ensures 100% data privacy between different language workshops.

      // Reset selection and insights when switching away from a batch
      setCrmLeadIds([]);
      setApprovedLeadIds([]);
      setPendingLeadIds([]);
      setRegisteredLeadIds([]);
      setRejectedLeadIds([]);
      setStudentKotaLeadIds([]);
      setClosedLeadIds([]);
      setSentCongratsLeadIds([]);

      setApprovalAiInsights({});
      setPendingAiInsights({});
      setRegisteredAiInsights({});
    }
  }, [selectedWorkshop?.id, selectedWorkshop?.formId]);

  const saveWorkshopSettings = async (overrideWorkshop?: any) => {
    let targetWorkshop = overrideWorkshop || selectedWorkshop || workshops.find(w => (w.language || "English").toLowerCase() === selectedDashboardLang.toLowerCase());

    let currentWorkshops = [...workshops];
    if (!targetWorkshop) {
      targetWorkshop = {
        id: `master_${selectedDashboardLang.toLowerCase()}_${Date.now()}`,
        name: `Master List - ${selectedDashboardLang}`,
        language: selectedDashboardLang,
        formId: formSource === 'google' ? googleFormUrl : selectedFormId,
        metadata: {},
        leads: 0
      };
      currentWorkshops = [...currentWorkshops, targetWorkshop];
    }

    const currentFormSource = overrideWorkshop?.metadata?.formSource || formSource;

    const updatedMetadata = {
      ...targetWorkshop.metadata,
      formSource: currentFormSource,
      googleFormMapping: fieldMapping,
      crmFields: crmFields,
      formFilterKeyword: targetWorkshop?.formFilterKeyword || '',
      mainFilter: leadsFilter,
      subFilter: leadsSubFilter
    };

    const updatedWorkshop = {
      ...targetWorkshop,
      formId: currentFormSource === 'google' ? googleFormUrl : targetWorkshop.formId,
      metadata: updatedMetadata
    };

    const newWorkshops = (currentWorkshops || []).map(w => w?.id === targetWorkshop.id ? updatedWorkshop : w);
    setWorkshops(newWorkshops);
    setSelectedWorkshop(updatedWorkshop);
    setLinkedFormId(updatedWorkshop.formId);

    localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
    fetch('/api/admin/crm/new-registration/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
    }).catch(console.error);

    if (/^[0-9a-fA-F]{24}$/.test(targetWorkshop.id)) {
      try {
        await fetch('/api/admin/crm/workshop-management', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: safeStringify({
            cohortId: targetWorkshop.id,
            googleFormLink: googleFormUrl,
            metadata: updatedMetadata
          })
        });
      } catch (e) {
        console.error('Failed to sync to workshop-management backend:', e);
      }
    }

    toast.success('Workshop settings saved successfully!');
  };

  const handleDetailChange = (field: string, value: string) => {
    if (!selectedWorkshop) return;
    const updated = {
      ...selectedWorkshop,
      [field]: value
    };
    setSelectedWorkshop(updated);
    const newWorkshops = (workshops || []).map(w => w?.id === updated.id ? updated : w);
    setWorkshops(newWorkshops);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
      if (token) {
        fetch('/api/admin/crm/new-registration/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
        }).catch(console.error);
      }
    }
  };

  const handleDeleteBatch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this batch?')) {
      setWorkshops((workshops || []).filter(w => w && w.id !== id));
      if (selectedWorkshop?.id === id) {
        setSelectedWorkshop(null);
        setActiveTab('details');
      }
      toast.success('Batch deleted');
    }
  };

  const handleEditBatch = (e: React.MouseEvent, w: any) => {
    e.stopPropagation();
    toast.success(`Editing batch: ${w.name}`);
    setIsAddBatchModalOpen(true);
    // In a real app we'd populate the modal with 'w' data
  };

  const handleMoveBatchUp = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === 0) return;
    const newWorkshops = [...workshops];
    const temp = newWorkshops[index];
    newWorkshops[index] = newWorkshops[index - 1];
    newWorkshops[index - 1] = temp;
    setWorkshops(newWorkshops);

    localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
    try {
      await fetch('/api/admin/crm/new-registration/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
      });
    } catch (err) { }
  };

  const handleMoveBatchDown = async (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (index === workshops.length - 1) return;
    const newWorkshops = [...workshops];
    const temp = newWorkshops[index];
    newWorkshops[index] = newWorkshops[index + 1];
    newWorkshops[index + 1] = temp;
    setWorkshops(newWorkshops);

    localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
    try {
      await fetch('/api/admin/crm/new-registration/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
      });
    } catch (err) { }
  };

  // State for Zoom meetings & message numbers per lead (used in Closing tab)
  const [meetingSchedule, setMeetingSchedule] = useState<Record<string, string>>({});
  const [messageNumber, setMessageNumber] = useState<Record<string, number>>({});
  const [zoomMeetingId, setZoomMeetingId] = useState<string>('');

  const handleZoomRegister = async (leadIds: string[]) => {
    if (!zoomMeetingId) {
      toast.error('Please enter a Zoom Meeting ID in the bulk actions bar above first.');
      return;
    }
    const leadsToRegister = leadsData.filter(l => leadIds.includes(l.id));
    if (leadsToRegister.length === 0) return;

    let successCount = 0;
    toast.info(`Starting Zoom registration for ${leadsToRegister.length} lead(s)...`);

    for (const lead of leadsToRegister) {
      try {
        const res = await fetch('/api/webhooks/google-forms/zoom-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: safeStringify({
            meetingId: zoomMeetingId,
            email: lead.email,
            firstName: lead.name?.split(' ')[0] || 'Unknown',
            lastName: lead.name?.split(' ').slice(1).join(' ') || '',
            phone: lead.mobile || lead.phoneNumber || ''
          })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error('Zoom Reg Error for lead:', lead.id, err);
      }
    }
    toast.success(`Successfully registered ${successCount}/${leadsToRegister.length} leads in Zoom!`);
  };

  const handleBulkAction = (action: string) => {
    if (action === 'Delete') {
      if (selectedRowIds.length === 0) {
        toast.error('Please select at least one lead to delete.');
        return;
      }
      if (confirm(`Are you sure you want to delete ${selectedRowIds.length} leads?`)) {
        const newLeads = leadsData.filter(l => !selectedRowIds.includes(l.id));
        setLeadsData(newLeads);
        setWorkshops(prev => (prev || []).map(w => w?.id === selectedWorkshop?.id ? { ...w, leads: newLeads.length } : w));
        setSelectedWorkshop(prev => prev ? { ...prev, leads: newLeads.length } : prev);
        setApprovedLeadIds(approvedLeadIds.filter(id => !selectedRowIds.includes(id)));
        toast.success(`Deleted ${selectedRowIds.length} leads successfully!`);
        setSelectedRowIds([]);
      }
    } else {
      // For Meta/Email/QR actions we include the selected message number (1‑4) per lead
      selectedRowIds.forEach(id => {
        const msgNum = messageNumber[id] ?? 1; // default to 1 if not set
        // Placeholder: In a real app you would call the broadcast endpoint with msgNum and optional meeting time.
        toast.success(`${action} sent for lead ${id} (Message #${msgNum})`);
      });
    }
  };

  const TopTabs = [
    { id: 'meta_leads', label: 'Meta Leads', icon: Users },
    { id: 'all_leads', label: 'All Leads Data', icon: Users },
    { id: 'my_data', label: 'My Data', icon: Database },
    { id: 'our_workshops', label: 'Our Workshops', icon: Target },
    { id: 'leads_management', label: 'Leads Management', icon: Users },
    { id: 'whatsapp_messenger', label: 'WhatsApp Messenger', icon: MessageSquare },
  ] as const;

  const LeadSubTabs = [
    { id: 'new', label: 'New Forms' },
    { id: 'approved', label: 'Approved Forms' },
    { id: 'pending', label: 'Pending-1' },
    { id: 'pending2', label: 'Pending-2' },
    { id: 'registered', label: 'Registered Forms' },
    { id: 'student_kota', label: 'Student Kota' },
  ] as const;

  const segmentCounts = useMemo(() => {
    return {
      new: leadsData.filter(l => crmLeadIds.includes(l.id)).length,
      approved: leadsData.filter(l => crmLeadIds.includes(l.id) && (approvedLeadIds.includes(l.id) || registeredLeadIds.includes(l.id))).length,
      pending: leadsData.filter(l => crmLeadIds.includes(l.id) && pendingLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !registeredLeadIds.includes(l.id)).length,
      pending2: leadsData.filter(l => crmLeadIds.includes(l.id) && pending2LeadIds.includes(l.id)).length,
      registered: leadsData.filter(l => crmLeadIds.includes(l.id) && registeredLeadIds.includes(l.id)).length,
      student_kota: leadsData.filter(l => crmLeadIds.includes(l.id) && studentKotaLeadIds.includes(l.id)).length
    };
  }, [leadsData, crmLeadIds, approvedLeadIds, pendingLeadIds, pending2LeadIds, registeredLeadIds, studentKotaLeadIds]);

  const canAccessTab = (tabId: string) => {
    if (tabId === "meta_leads" || tabId === "all_leads" || tabId === "my_data" || tabId === "our_workshops") return true;
    return !!selectedWorkshop;
  };

  // Render Bulk Action Bar
  const renderBulkActions = () => (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-slate-500 mr-2">
        Bulk Actions {selectedRowIds.length > 0 ? `(${selectedRowIds.length} selected)` : ''}:
      </span>
      {leadSubTab === 'pending' && selectedRowIds.length > 0 && (
        <button
          onClick={() => {
            if (confirm('Move selected leads back to Registered Forms?')) {
              setPendingLeadIds(prev => prev.filter(id => !selectedRowIds.includes(id)));
              setRegisteredLeadIds(prev => Array.from(new Set([...prev, ...selectedRowIds])));
              setSelectedRowIds([]);
              toast.success('Leads restored to Registered Forms!');
            }
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-xs font-bold transition-colors"
        >
          Restore to Registered ({selectedRowIds.length})
        </button>
      )}
      {activeTab === 'closing' && (
        <>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <input
            type="text"
            placeholder="Zoom Meeting ID..."
            value={zoomMeetingId}
            onChange={(e) => setZoomMeetingId(e.target.value)}
            className="w-32 border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            onClick={() => handleZoomRegister(selectedRowIds)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors"
          >
            Bulk Zoom Reg
          </button>
          <button
            onClick={() => {
              if (selectedRowIds.length === 0) return;
              setClosedLeadIds(prev => Array.from(new Set([...prev, ...selectedRowIds])));
              setSelectedRowIds([]);
              toast.success('Leads Submitted & Moved to Workshop!');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-xs font-bold transition-colors ml-1"
          >
            <CheckSquare size={14} /> Submit & Move
          </button>
        </>
      )}
      <button onClick={() => handleBulkAction('QR Code')} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">
        <QrCode size={14} /> QR
      </button>
      <button onClick={() => handleBulkAction('Meta')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors">
        <Share2 size={14} /> Meta
      </button>
      <button onClick={() => handleBulkAction('Email')} className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors">
        <Mail size={14} /> Email
      </button>
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      <button
        onClick={() => {
          if (selectedRowIds.length === 0) { toast.error("Select leads first"); return; }
          setStudentKotaLeadIds(prev => Array.from(new Set([...prev, ...selectedRowIds])));
          setSelectedRowIds([]);
          toast.success("Moved to Student Kota!");
        }}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
      >
        <Users size={14} /> Move to Student Kota
      </button>
      <button onClick={() => handleBulkAction('Delete')} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
        <Trash2 size={14} /> Delete {selectedRowIds.length > 0 ? `(${selectedRowIds.length})` : ''}
      </button>
    </div>
  );

  useEffect(() => {
    if (selectedWorkshop?.metadata?.ai1Column) {
      setAi1ColumnInput(selectedWorkshop.metadata.ai1Column);
    }
  }, [selectedWorkshop?.id]);

  const saveAi1Column = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_marathi_ai1_column', ai1ColumnInput);
      fetch('/api/admin/crm/new-registration/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: safeStringify({ crm_ai1_column: ai1ColumnInput })
      }).catch(console.error);
    }
    
    // Also save to workshop if one is active
    if (selectedWorkshop) {
      const updatedMetadata = { ...selectedWorkshop.metadata, ai1Column: ai1ColumnInput };
      const updatedWorkshop = { ...selectedWorkshop, metadata: updatedMetadata };
      setSelectedWorkshop(updatedWorkshop);
      setWorkshops(prev => {
        const newWorkshops = prev.map(w => w.id === selectedWorkshop.id ? updatedWorkshop : w);
        if (typeof window !== 'undefined') {
          localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
          fetch('/api/admin/crm/new-registration/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
          }).catch(console.error);
        }
        return newWorkshops;
      });
    }
    toast.success('AI-1 Column setting saved permanently!');
  };

  const handleAi1BatchCreate = async () => {
    // Auto-select the first available workshop if none is selected
    let activeWorkshop = selectedWorkshop;
    if (!activeWorkshop && workshops.length > 0) {
      activeWorkshop = workshops.find(w => w && w.id) || workshops[0];
      if (activeWorkshop) setSelectedWorkshop(activeWorkshop);
    }
    if (!activeWorkshop) {
      toast.error('No workshop found. Please create a batch first.');
      return;
    }

    // Look for a specific column or default to WORKSHOP DATE mapping
    let formField = '';

    // First, try the manual column input from the UI or workshop metadata
    const manualCol = (activeWorkshop?.metadata?.ai1Column || ai1ColumnInput || '').trim();

    // Collect all available column headers across ALL leads
    const allLeadKeys = new Set<string>();
    leadsData.forEach((lead: any) => {
      if (lead._rawRecord) Object.keys(lead._rawRecord).forEach(k => allLeadKeys.add(k));
      if (lead.dynamicAnswers) Object.keys(lead.dynamicAnswers).forEach(k => allLeadKeys.add(k));
    });
    const keyList = Array.from(allLeadKeys);

    if (manualCol) {
      // 1. If they typed a number (1-based index)
      if (!isNaN(Number(manualCol)) && keyList.length > 0) {
        const idx = parseInt(manualCol) - 1;
        if (idx >= 0 && idx < keyList.length) {
          formField = keyList[idx];
        }
      } else {
        // 2. Exact match (case-insensitive)
        const exactMatch = keyList.find(k => k.toLowerCase() === manualCol.toLowerCase());
        if (exactMatch) {
          formField = exactMatch;
        } else {
          // 3. Partial match
          const partialMatch = keyList.find(k =>
            k.toLowerCase().includes(manualCol.toLowerCase()) ||
            manualCol.toLowerCase().includes(k.toLowerCase())
          );
          if (partialMatch) {
            formField = partialMatch;
          } else {
            // 4. Word-by-word match
            const words = manualCol.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            const wordMatch = keyList.find(k => words.some(w => k.toLowerCase().includes(w)));
            if (wordMatch) {
              formField = wordMatch;
            } else {
              formField = manualCol;
            }
          }
        }
      }
    }

    // Fallback to mapped field logic
    if (!formField) {
      const dateMappingKey = Object.keys(fieldMapping).find(k => k.toUpperCase().includes('DATE') || k.toUpperCase().includes('BATCH') || k.toUpperCase().includes('WORKSHOP'));
      if (dateMappingKey && fieldMapping[dateMappingKey]) {
        formField = fieldMapping[dateMappingKey];
      }
    }

    // Fallback: auto-detect standard date/batch question in keyList
    if (!formField || !keyList.includes(formField)) {
      const autoDateKey = keyList.find(k => {
        const lk = k.toLowerCase();
        return lk.includes('workshop date') || lk.includes('batch name') || (lk.includes('batch') && lk.includes('join')) || (lk.includes('date') && !lk.includes('birth'));
      });
      if (autoDateKey) {
        formField = autoDateKey;
      }
    }

    if (!formField) {
      toast.error('Please type a valid Column Number or Name, and hit Save first!');
      return;
    }

    setIsAi1Processing(true);

    try {
      // Find all unique dates from the leads
      const uniqueDates = new Set<string>();
      leadsData.forEach((lead: any) => {
        let dateVal: any = undefined;
        const searchCol = formField.toLowerCase();
        
        const findVal = (obj: any) => {
          if (!obj) return undefined;
          if (obj[formField] !== undefined) return obj[formField];
          const key = Object.keys(obj).find(k => k.toLowerCase().includes(searchCol) || searchCol.includes(k.toLowerCase()));
          return key ? obj[key] : undefined;
        };
        
        dateVal = findVal(lead._rawRecord);
        if (dateVal === undefined) dateVal = findVal(lead.dynamicAnswers);

        if (dateVal && String(dateVal).trim().length > 2) {
          uniqueDates.add(String(dateVal).trim());
        }
      });

      // If uniqueDates is still 0, check candidate column across all keyList
      if (uniqueDates.size === 0) {
        const candidateKey = keyList.find(k => {
          const lk = k.toLowerCase();
          return lk.includes('date') || lk.includes('batch') || lk.includes('join') || lk.includes('time') || lk.includes('workshop');
        });
        if (candidateKey) {
          formField = candidateKey;
          leadsData.forEach((lead: any) => {
            const v = lead._rawRecord?.[candidateKey] || lead.dynamicAnswers?.[candidateKey];
            if (v && String(v).trim().length > 2) {
              uniqueDates.add(String(v).trim());
            }
          });
        }
      }

      if (uniqueDates.size === 0 && manualCol) {
        const searchWord = manualCol.toLowerCase();
        leadsData.forEach((lead: any) => {
          const findAnswer = (obj: any) => {
            if (!obj) return undefined;
            for (const k of Object.keys(obj)) {
              const v = String(obj[k]);
              if (v.toLowerCase().includes(searchWord) && v.trim().length > 2) return v;
            }
            return undefined;
          };
          let val = findAnswer(lead._rawRecord);
          if (val === undefined) val = findAnswer(lead.dynamicAnswers);
          if (val && String(val).trim().length > 2) {
            uniqueDates.add(String(val).trim());
          }
        });
      }

      if (uniqueDates.size === 0) {
        toast.error('No valid answers found for the current leads matching your input.');
        setIsAi1Processing(false);
        return;
      }

      let newWorkshops = [...workshops];
      let addedCount = 0;

      uniqueDates.forEach(date => {
        // Check if a batch for this exact date and language already exists (or is part of a merged batch)
        const exists = newWorkshops.some(w =>
          w.id.startsWith('batch_') &&
          matchesLanguage(w, selectedDashboardLang) &&
          (w.formFilterKeyword === date || (w.formFilterKeyword || '').split('|').includes(date))
        );

        if (!exists) {
          const newBatch = {
            id: `batch_${selectedDashboardLang.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: `${selectedDashboardLang} - ${date.substring(0, 30)}${date.length > 30 ? '...' : ''}`,
            language: selectedDashboardLang,
            formId: activeWorkshop.formId,
            formFilterKeyword: date,
            metadata: {
              batchDate: date,
              googleFormMapping: activeWorkshop.metadata?.googleFormMapping,
              formSource: activeWorkshop.metadata?.formSource
            },
            leads: leadsData.filter((l: any) => l._rawRecord && String(l._rawRecord[formField]).trim() === date).length
          };
          newWorkshops.push(newBatch);
          addedCount++;
        }
      });

      if (addedCount > 0) {
        setWorkshops(newWorkshops);
        localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));

        // Sync to backend
        await fetch('/api/admin/crm/new-registration/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
        });

        toast.success(`AI-1A created ${addedCount} new batches successfully!`);
      } else {
        toast.success('All batches for the current dates already exist.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to create batches.');
    }

    setIsAi1Processing(false);
  };

  // Render Stats Card with Progress Bar
  const StatCard = ({ title, value, target, progress }: { title: string, value: number, target: number, progress: number }) => (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-500 uppercase">{title}</h3>
        <Target size={14} className="text-indigo-400" />
      </div>
      <div className="flex items-end gap-2 mb-3">
        <span className="text-2xl font-black text-slate-800">{value}</span>
        <span className="text-xs font-medium text-slate-400 mb-1">/ {target} Target</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
      </div>
      <span className="text-[10px] font-bold text-indigo-600">{progress}% Completed</span>
    </div>
  );


  const renderWorkshopForm = () => (
    <WorkshopFormTab
      activeTab={activeTab} setActiveTab={setActiveTab}
      selectedWorkshop={selectedWorkshop} setSelectedWorkshop={setSelectedWorkshop}
      workshops={workshops} setWorkshops={setWorkshops}
      linkedFormId={linkedFormId} setLinkedFormId={setLinkedFormId}
      selectedFormId={selectedFormId} setSelectedFormId={setSelectedFormId}
      googleFormUrl={googleFormUrl} setGoogleFormUrl={setGoogleFormUrl}
      activeLinkedSheetId={activeLinkedSheetId}
      formSource={formSource} setFormSource={setFormSource}
      isManualFormId={isManualFormId} setIsManualFormId={setIsManualFormId}
      fetchedForms={fetchedForms} isLoadingForms={isLoadingForms}
      isLoadingGoogleForms={isLoadingGoogleForms} googleFormsList={googleFormsList}
      googleFormQuestionMap={googleFormQuestionMap} setGoogleFormQuestionMap={setGoogleFormQuestionMap}
      fieldMapping={fieldMapping} setFieldMapping={setFieldMapping}
      needsGoogleAuth={needsGoogleAuth} googleAuthError={googleAuthError}
      isFormSetupCollapsed={isFormSetupCollapsed} setIsFormSetupCollapsed={setIsFormSetupCollapsed}
      crmFields={crmFields} setCrmFields={setCrmFields}
      mapDataFields={mapDataFields}
      isMapDataCollapsed={isMapDataCollapsed} setIsMapDataCollapsed={setIsMapDataCollapsed}
      saveWorkshopSettings={saveWorkshopSettings} handleDetailChange={handleDetailChange}
      token={token} toast={toast}
      isAi7Active={isAi7Active} setIsAi7Active={setIsAi7Active}
      handleAi1BatchCreate={handleAi1BatchCreate} isAi1Processing={isAi1Processing}
      ai1ColumnInput={ai1ColumnInput} setAi1ColumnInput={setAi1ColumnInput} saveAi1Column={saveAi1Column}
      isWebhookModalOpen={isWebhookModalOpen} setIsWebhookModalOpen={setIsWebhookModalOpen}
      leadsFilter={leadsFilter} leadsSubFilter={leadsSubFilter}
      leadsSubSubFilter={leadsSubSubFilter}
      refreshLeadsCounter={refreshLeadsCounter} setRefreshLeadsCounter={setRefreshLeadsCounter}
      setIsLoadingGoogleForms={setIsLoadingGoogleForms} setGoogleFormsList={setGoogleFormsList}
      setNeedsGoogleAuth={setNeedsGoogleAuth}
      setLeadsFilter={setLeadsFilter} setLeadsSubFilter={setLeadsSubFilter} setLeadsSubSubFilter={setLeadsSubSubFilter}
      Users={Users} 
      leadsData={displayLeads} 
      isLoadingLeads={isLoadingLeads}
      selectedRowIds={selectedRowIds} renderBulkActions={renderBulkActions}
      handleAi7Categorize={handleAi7Categorize} isAi7Processing={isAi7Processing}
      handleApproveBulk={handleApproveBulk} filterOptions={filterOptions}
      crmLeadIds={crmLeadIds} tab2SortOrder={tab2SortOrder} setSelectedRowIds={setSelectedRowIds}
      showDynamicColumns={showDynamicColumns} dynamicColumns={dynamicColumns}
      colWidths={colWidths} setColWidths={setColWidths} setTab2SortOrder={setTab2SortOrder}
      setLeadsData={setLeadsData} handleApprove={handleApprove}
      selectedDashboardLang={selectedDashboardLang}
    />
  );

  return (
    <div className={`flex h-screen bg-slate-50 font-sans overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>

      {/* Global Sidebar for Batch Selection */}
      {(activeTab !== 'leads_management' && activeTab !== 'whatsapp_messenger') && (
        <aside className={`bg-white flex flex-col flex-shrink-0 z-20 transition-all duration-300 ${sidebarPosition === 'right' ? 'border-l border-slate-200' : 'border-r border-slate-200'} ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed && (
                <h2 className="font-black text-slate-900 text-lg flex items-center gap-2">
                  Workshops
                </h2>
              )}
              <div className={`flex items-center gap-1 ${isSidebarCollapsed ? 'w-full justify-center flex-col' : ''}`}>
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
                <button
                  onClick={() => setSidebarPosition(p => p === 'left' ? 'right' : 'left')}
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  title={`Move sidebar to ${sidebarPosition === 'left' ? 'right' : 'left'}`}
                >
                  <ArrowLeftRight size={16} />
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              {!isSidebarCollapsed ? (
                <>
                  <button
                    onClick={() => setIsAddBatchModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm w-full"
                  >
                    <Plus size={16} /> Add Folder +
                  </button>
                  <a
                    href="/admin/crm/form-questions"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm w-full transition-colors border border-slate-200"
                  >
                    <Database size={16} /> CRM Form
                  </a>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsAddBatchModalOpen(true)}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform text-white font-bold p-2.5 rounded-lg flex items-center justify-center shadow-sm w-full"
                    title="Add Folder +"
                  >
                    <Plus size={16} />
                  </button>
                  <a
                    href="/admin/crm/form-questions"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium p-2.5 rounded-lg flex items-center justify-center shadow-sm w-full transition-colors border border-slate-200"
                    title="CRM Form"
                  >
                    <Database size={16} />
                  </a>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Languages Sidebar (Always visible) */}
            {(activeTab === 'all_leads' || activeTab === 'my_data' || activeTab === 'my_batches' || activeTab === 'our_workshops') && (
              <div className="mb-3 px-1">
                {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Languages</div>}
                <div className="grid grid-cols-2 gap-1.5">
                  {['English Workshop', 'Hindi Workshop', 'Marathi Workshop', 'Kannada Workshop'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => router.push(`/admin/crm/new-registration/${lang.split(' ')[0].toLowerCase()}`)}
                      className={`w-full text-center px-2 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedDashboardLang === lang 
                          ? 'bg-blue-600 text-white border border-blue-600 shadow-sm' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                      title={lang}
                    >
                      {isSidebarCollapsed ? lang.substring(0, 2) : lang.split(' ')[0]}
                    </button>
                  ))}
                </div>

                {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 mb-1.5 px-1">Offer Forms</div>}
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {['English Offer', 'Hindi Offer', 'Marathi Offer', 'Kannada Offer'].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => router.push(`/admin/crm/new-registration/${lang.split(' ')[0].toLowerCase()}`)}
                      className={`w-full text-center px-2 py-2 rounded-xl text-xs font-bold transition-all ${
                        selectedDashboardLang === lang 
                          ? 'bg-purple-600 text-white border border-purple-600 shadow-sm' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                      title={lang}
                    >
                      {isSidebarCollapsed ? lang.substring(0, 2) : lang.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}

                {/* Batches list only for My Batches and Our Workshops */}
                {(activeTab === 'my_batches' || activeTab === 'our_workshops') && !isSidebarCollapsed && (
                  <div className="mt-6 animate-fade-in">
                    <hr className="my-4 border-slate-200" />
                    <div className="text-[13px] font-bold text-slate-700 uppercase tracking-wider px-2 mb-3">
                      Workshop Details
                    </div>
                    <div className="flex items-center justify-between mb-2 px-2 border-t border-slate-100 pt-4">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {selectedDashboardLang} Batches
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {displayLeads.length} Leads
                        </span>
                        {workshops.filter((w: any) => w && w.id && matchesLanguage(w, selectedDashboardLang) && !String(w.id).startsWith('master_')).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete ALL ${selectedDashboardLang} batches? This will not delete the leads data, only the batch folders.`)) {
                                const newWorkshops = workshops.filter((w: any) => !matchesLanguage(w, selectedDashboardLang) || String(w?.id).startsWith('master_'));
                                setWorkshops(newWorkshops);
                                localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
                                fetch('/api/admin/crm/new-registration/state', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
                                }).catch(console.error);
                                
                                if (selectedWorkshop) setSelectedWorkshop(null);
                                toast.success(`Cleared all ${selectedDashboardLang} batches!`);
                              }
                            }}
                            className="text-[10px] font-bold text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded"
                          >
                            <Trash2 size={10} /> Clear All
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      {workshops.filter((w: any) => w && w.id && matchesLanguage(w, selectedDashboardLang) && !String(w.id).startsWith('master_')).length === 0 && (
                        <div className="px-2 py-3 text-xs text-slate-400 italic">No batches created yet. Go to My Data and click AI-1.</div>
                      )}
                      {workshops.filter((w: any) => w && w.id && matchesLanguage(w, selectedDashboardLang) && !String(w.id).startsWith('master_')).map((batch: any) => (
                        <div
                          key={batch.id}
                          onClick={() => {
                            setSelectedWorkshop(batch);
                            setActiveTab('my_batches');
                          }}
                          className={`p-2 rounded-lg border cursor-pointer transition-all text-xs flex justify-between items-center ${selectedWorkshop?.id === batch.id
                            ? 'border-indigo-300 bg-indigo-50 text-indigo-800 font-bold shadow-sm'
                            : 'border-transparent hover:bg-slate-100 text-slate-600'
                            }`}
                        >
                          <span className="break-words w-full pr-2 leading-tight" title={batch.name}>{batch.name}</span>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="bg-white rounded-full px-2 py-0.5 border shadow-sm text-[10px]">{getDynamicBatchLeads(batch)}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkshops(prev => {
                                  const copy = [...prev];
                                  const batchIndices = copy.map((w, i) => w && w.id && matchesLanguage(w, selectedDashboardLang) ? i : -1).filter(i => i !== -1);
                                  const currentI = batchIndices.findIndex(idx => copy[idx].id === batch.id);
                                  if (currentI > 0) {
                                    const prevIdx = batchIndices[currentI - 1];
                                    const currIdx = batchIndices[currentI];
                                    [copy[prevIdx], copy[currIdx]] = [copy[currIdx], copy[prevIdx]];
                                  }
                                  return copy;
                                });
                              }}
                              className="text-slate-300 hover:text-indigo-500 transition-colors p-0.5 rounded hover:bg-indigo-50"
                              title="Move Up"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setWorkshops(prev => {
                                  const copy = [...prev];
                                  const batchIndices = copy.map((w, i) => w && w.id && matchesLanguage(w, selectedDashboardLang) ? i : -1).filter(i => i !== -1);
                                  const currentI = batchIndices.findIndex(idx => copy[idx].id === batch.id);
                                  if (currentI < batchIndices.length - 1) {
                                    const nextIdx = batchIndices[currentI + 1];
                                    const currIdx = batchIndices[currentI];
                                    [copy[nextIdx], copy[currIdx]] = [copy[currIdx], copy[nextIdx]];
                                  }
                                  return copy;
                                });
                              }}
                              className="text-slate-300 hover:text-indigo-500 transition-colors p-0.5 rounded hover:bg-indigo-50"
                              title="Move Down"
                            >
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = window.prompt("Rename Batch. To MERGE with another batch, type the exact name of the target batch:", batch.name);
                                if (newName && newName !== batch.name) {
                                  const targetBatch = workshops.find((w: any) => w && w.id && w.name === newName);
                                  if (targetBatch) {
                                    if (window.confirm(`Merge "${batch.name}" into "${targetBatch.name}"? The source batch "${batch.name}" will be merged and removed.`)) {
                                      const newFilters = Array.from(new Set([
                                        ...(targetBatch.formFilterKeyword || '').split('|'),
                                        ...(batch.formFilterKeyword || '').split('|'),
                                        batch.name || '',
                                      ])).filter(Boolean).join('|');
                                      
                                      const newWorkshops = workshops
                                        .filter((w: any) => w.id !== batch.id)
                                        .map((w: any) => {
                                          if (w.id === targetBatch.id) {
                                            return { ...w, formFilterKeyword: newFilters, leads: (w.leads || 0) + (batch.leads || 0) };
                                          }
                                          return w;
                                        });

                                      setWorkshops(newWorkshops);
                                      if (typeof window !== 'undefined') {
                                        localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
                                        const t = localStorage.getItem('crm_token');
                                        if (t) {
                                          fetch('/api/admin/crm/new-registration/state', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                                            body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
                                          }).catch(console.error);
                                        }
                                      }
                                      if (selectedWorkshop?.id === batch.id) {
                                        setSelectedWorkshop(newWorkshops.find((w: any) => w.id === targetBatch.id) || null);
                                      }
                                    }
                                  } else {
                                    setWorkshops(prev => prev.map((w: any) => w.id === batch.id ? { ...w, name: newName } : w));
                                    if (selectedWorkshop?.id === batch.id) setSelectedWorkshop(prev => prev ? { ...prev, name: newName } : prev);
                                  }
                                }
                              }}
                              className="text-slate-300 hover:text-indigo-500 transition-colors p-0.5 rounded hover:bg-indigo-50"
                              title="Rename or Merge Batch"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Are you sure you want to delete ${batch.name}?`)) {
                                  const newWorkshops = workshops.filter((w: any) => w.id !== batch.id);
                                  setWorkshops(newWorkshops);
                                  localStorage.setItem('crm_marathi_workshops', safeStringify(newWorkshops));
                                  fetch('/api/admin/crm/new-registration/state', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: safeStringify({ crm_workshops: safeStringify(newWorkshops) })
                                  }).catch(console.error);
                                  
                                  if (selectedWorkshop?.id === batch.id) setSelectedWorkshop(null);
                                  toast.success(`Deleted batch ${batch.name}`);
                                }
                              }}
                              className="text-slate-300 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50"
                              title="Delete Batch"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
              </div>
            )}

          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">

        {/* Header for Tabs */}
        <header className="bg-white px-6 pt-5 pb-0 border-b border-slate-200 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                {selectedWorkshop ? selectedWorkshop.name : 'Select a Batch to begin'}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                {selectedWorkshop ? 'Manage leads, workflow, and settings' : 'Choose from the sidebar on the left'}
              </p>
            </div>
          </div>

          {/* Top Navigation Tabs */}
          <div className="flex gap-6 overflow-x-auto no-scrollbar border-b-2 border-transparent">
            {TopTabs.map(tab => {
              let count = null;

              const isOurWorkshopsSubTab = tab.id === 'our_workshops' && ['my_batches', 'setup', 'workshop_details', 'leads', 'closing', 'templates', 'forms', 'details'].includes(activeTab);
              const isActive = activeTab === tab.id || isOurWorkshopsSubTab;

              return (
                <button
                  key={tab.id}
                  disabled={!canAccessTab(tab.id)}
                  onClick={() => {
                    if (tab.id === 'all_leads') {
                      setSelectedWorkshop(null);
                      setIsFormSetupCollapsed(false);
                      setLeadsFilter('');
                      setLeadsSubFilter('');
                      setLeadsSubSubFilter('');
                    }
                    if (tab.id === 'my_data') {
                      setLeadsFilter('');
                      setLeadsSubFilter('');
                      setLeadsSubSubFilter('');
                    }
                    setActiveTab(tab.id as any);
                  }}
                  className={`pb-4 text-sm font-bold border-b-[3px] transition-all flex items-center gap-2 whitespace-nowrap ${isActive
                    ? 'border-blue-600 text-blue-700'
                    : canAccessTab(tab.id)
                      ? 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                      : 'border-transparent text-slate-300 cursor-not-allowed'
                    }`}
                >
                  <tab.icon size={16} className={isActive ? "text-blue-600" : (canAccessTab(tab.id) ? "text-slate-400" : "text-slate-300")} />
                  {tab.label} {count !== null && `- ${count}`}
                </button>
              )
            })}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {(activeTab === "all_leads" || activeTab === "my_data" || activeTab === "our_workshops" || activeTab === "my_batches") && (
            <div className="flex-1 min-w-0 overflow-y-auto space-y-6 animate-fade-in">
              {renderWorkshopForm()}
            </div>
          )}
          {activeTab === 'meta_leads' && (
            <MetaLeadsTab
              selectedWorkshop={selectedWorkshop}
              saveWorkshopSettings={saveWorkshopSettings}
              leadsData={displayLeads}
            />
          )}
          {activeTab === 'leads_management' && (
            <LeadsManagementTab
              workshops={workshops}
              selectedDashboardLang={selectedDashboardLang}
              selectedWorkshop={selectedWorkshop}
              leadsData={displayLeads}
            />
          )}
          {activeTab === 'whatsapp_messenger' && (
            <WhatsAppMessengerTab workshops={workshops} leadsData={displayLeads} />
          )}
        </main>
      </div>
    </div>
  );
}
