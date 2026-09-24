'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/admin/crm/ui/Toast';
import { 
  FileText, Plus, Users, Handshake, MessageSquare, QrCode, Mail, Share2, Target, Calendar, CheckSquare, Square,
  UserPlus, X, Edit2, Trash2, ArrowLeftRight, PanelLeftClose, PanelLeftOpen, ChevronDown, ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function NewRegistrationPage() {
  const router = useRouter();
  const toast = useToast();
  
  const [activeTab, setActiveTab] = useState<'details'|'forms'|'leads'|'closing'|'templates'>('details');
  const [leadSubTab, setLeadSubTab] = useState<'new'|'approved'|'pending'|'registered'|'student_kota'>('new');
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<any>(null); // State for the selected workshop
  
  const [sidebarPosition, setSidebarPosition] = useState<'left'|'right'>('left');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMapDataCollapsed, setIsMapDataCollapsed] = useState(false);
  const [isFormSetupCollapsed, setIsFormSetupCollapsed] = useState(true);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(false);
  
  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  
  const [formSource, setFormSource] = useState<'internal'|'google'>('google');
  const [fetchedForms, setFetchedForms] = useState<any[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);
  
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [linkedFormId, setLinkedFormId] = useState<string>('https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit');
  const [leadsData, setLeadsData] = useState<any[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isAiWorkerActive, setIsAiWorkerActive] = useState(false);
  const [approvedLeadIds, setApprovedLeadIds] = useState<string[]>([]);
  const [pendingLeadIds, setPendingLeadIds] = useState<string[]>([]);
  const [registeredLeadIds, setRegisteredLeadIds] = useState<string[]>([]);
  const [rejectedLeadIds, setRejectedLeadIds] = useState<string[]>([]);
  const [studentKotaLeadIds, setStudentKotaLeadIds] = useState<string[]>([]);
  const [closedLeadIds, setClosedLeadIds] = useState<string[]>([]);
  const [crmLeadIds, setCrmLeadIds] = useState<string[]>([]);
  const [sentCongratsLeadIds, setSentCongratsLeadIds] = useState<string[]>([]);
  const [tab2SortOrder, setTab2SortOrder] = useState<'asc' | 'desc'>('desc');
  const [leadsFilter, setLeadsFilter] = useState('');
  const [googleFormUrl, setGoogleFormUrl] = useState('https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit');
  const [isApprovedAiWorkerActive, setIsApprovedAiWorkerActive] = useState(false);
  const [isRegisteredAiWorkerActive, setIsRegisteredAiWorkerActive] = useState(false);
  const [isAi4Active, setIsAi4Active] = useState(false);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isAi4RulesOpen, setIsAi4RulesOpen] = useState(false);
  const [ai4Interval, setAi4Interval] = useState(10);
  const [ai4FormatRules, setAi4FormatRules] = useState('');
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [googleFormsList, setGoogleFormsList] = useState<any[]>([]);
  const [isLoadingGoogleForms, setIsLoadingGoogleForms] = useState(false);
  const [googleFormQuestionMap, setGoogleFormQuestionMap] = useState<Record<string, string>>({});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [approvalAiInsights, setApprovalAiInsights] = useState<Record<string, string>>({});
  const [pendingAiInsights, setPendingAiInsights] = useState<Record<string, string>>({});
  const [registeredAiInsights, setRegisteredAiInsights] = useState<Record<string, string>>({});
  
  const token = useAuth();
  
  const dynamicColumns = useMemo(() => {
    const keys = new Set<string>();
    leadsData.forEach(lead => {
      if (lead.dynamicAnswers) {
        Object.keys(lead.dynamicAnswers).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [leadsData]);

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

  useEffect(() => {
    if (!isAiWorkerActive || leadsData.length === 0) return;
    
    const interval = setInterval(() => {
      const unapproved = leadsData.filter(l => crmLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !pendingLeadIds.includes(l.id));
      if (unapproved.length > 0) {
        const toProcess = unapproved.slice(0, 5);
        const toApprove: string[] = [];
        const toPending: string[] = [];
        const newPendingInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasOffer = false;
          
          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');
              
              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('offer') || qLower.includes('commitment')) && isPositive) hasOffer = true;
            });
          }
          
          if (has14Days && hasVideo && hasOffer) {
            toApprove.push(lead.id);
          } else {
            toPending.push(lead.id);
            let reason = '';
            if (!has14Days) reason += 'Missed 14 Days commitment. ';
            if (!hasVideo) reason += 'Missed Video On commitment. ';
            if (!hasOffer) reason += 'Missed Offer commitment. ';
            newPendingInsights[lead.id] = reason.trim() || 'Did not meet all conditions.';
          }
        });

        if (toApprove.length > 0) setApprovedLeadIds(prev => [...prev, ...toApprove]);
        if (toPending.length > 0) {
          setPendingLeadIds(prev => [...prev, ...toPending]);
          setPendingAiInsights(prev => ({ ...prev, ...newPendingInsights }));
        }
        
        toast.success(`🤖 AI Worker processed ${toProcess.length} forms: ${toApprove.length} Approved, ${toPending.length} Pending.`);
      }
    }, 10000); // Temporarily 10 seconds so the user can see it work!
    
    return () => clearInterval(interval);
  }, [isAiWorkerActive, leadsData, approvedLeadIds, pendingLeadIds, crmLeadIds]);

  useEffect(() => {
    if (!isApprovedAiWorkerActive || leadsData.length === 0) return;
    
    const interval = setInterval(() => {
      // Find leads that are approved but not yet evaluated by this AI (not in registered and not already having an insight)
      const unevaluated = leadsData.filter(l => 
        approvedLeadIds.includes(l.id) && 
        !registeredLeadIds.includes(l.id) && 
        !approvalAiInsights[l.id]
      );
      
      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newRegistered: string[] = [];
        const newInsights: Record<string, string> = {};
        
        toProcess.forEach(lead => {
          let reason = '';
          
          if (!lead.dynamicAnswers) {
            reason = 'No form data available.';
          } else {
            let hasValidEducation = false;
            let hasValidProfession = false;
            let hasValidAge = false;
            
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'degree', 'grad', 'post', 'phd', 'b.', 'm.'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
              }
              
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;
              }
              
              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age) && age >= 34 && age <= 60) {
                  hasValidAge = true;
                } else {
                  reason += `Age is ${aLower} (must be 34-60). `;
                }
              }
            });
            
            if (!hasValidEducation) reason += 'Education does not meet criteria. ';
            if (!hasValidProfession) reason += 'Profession does not meet criteria. ';
            if (reason === '' && (!hasValidAge)) reason += 'Age not specified or invalid. ';
          }
          
          if (reason === '') {
            newRegistered.push(lead.id);
          } else {
            newInsights[lead.id] = reason.trim();
          }
        });
        
        if (newRegistered.length > 0) {
          setRegisteredLeadIds(prev => [...prev, ...newRegistered]);
        }
        if (Object.keys(newInsights).length > 0) {
          setApprovalAiInsights(prev => ({ ...prev, ...newInsights }));
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isApprovedAiWorkerActive, leadsData, approvedLeadIds, registeredLeadIds, approvalAiInsights]);

  useEffect(() => {
    if (!isRegisteredAiWorkerActive || leadsData.length === 0) return;
    
    const interval = setInterval(() => {
      // Find leads that are registered but not yet evaluated by this final AI (not closed and no insight yet)
      const unevaluated = leadsData.filter(l => 
        registeredLeadIds.includes(l.id) && 
        !closedLeadIds.includes(l.id) &&
        !registeredAiInsights[l.id]
      );
      
      if (unevaluated.length > 0) {
        const toProcess = unevaluated.slice(0, 5);
        const newClosed: string[] = [];
        const newInsights: Record<string, string> = {};
              const MAX_CLASS_SIZE = 150; // Total batch size. Quotas are applied per 150 leads (and effectively every 10 leads the bucket check repeats).
        
        // 1. Calculate current demographic counts from already closed leads
        const currentClosedCounts: Record<string, number> = {
          'F_Jobless': 0, 'F_Under30': 0, 'F_Over60_Work': 0, 'F_Work': 0,
          'M_Jobless': 0, 'M_Under30': 0, 'M_Over60_Work': 0, 'M_Work': 0,
        };
        
        const getDemographicBucket = (l: any): string | null => {
          let age = 0;
          let prof = '';
          const gender = String(l.gender || '').toLowerCase();
          const isFemale = gender.includes('f');
          const isMale = gender.includes('m') && !isFemale;
          
          if (!isFemale && !isMale) return null;
          
          if (l.dynamicAnswers) {
            Object.entries(l.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              if (qLower.includes('age')) {
                const parsedAge = parseInt(aLower);
                if (!isNaN(parsedAge)) age = parsedAge;
              }
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                prof = aLower;
              }
            });
          }
          
          const isJobless = prof.includes('jobless') || prof.includes('retired') || prof.includes('housewife');
          const isWorking = prof.includes('job') || prof.includes('business') || prof.includes('self employed') || prof.includes('self-employed');
          
          if (isFemale) {
            if (age > 0 && age < 30) return 'F_Under30';
            if (age > 60 && isWorking) return 'F_Over60_Work';
            if (isJobless) return 'F_Jobless';
            return 'F_Work';
          } else {
            if (age > 0 && age < 30) return 'M_Under30';
            if (age > 60 && isWorking) return 'M_Over60_Work';
            if (isJobless) return 'M_Jobless';
            return 'M_Work';
          }
        };
        
        // Pre‑fill counts from already closed leads
        leadsData.forEach(l => {
          if (closedLeadIds.includes(l.id)) {
            const b = getDemographicBucket(l);
            if (b) currentClosedCounts[b]++;
          }
        });
        
        // Quota limits based on percentages of MAX_CLASS_SIZE
        const quotaLimits: Record<string, number> = {
          'F_Jobless': Math.round(MAX_CLASS_SIZE * 0.10),
          'F_Under30': Math.round(MAX_CLASS_SIZE * 0.10),
          'F_Over60_Work': Math.round(MAX_CLASS_SIZE * 0.10),
          'F_Work': Math.round(MAX_CLASS_SIZE * 0.20),
          'M_Jobless': Math.round(MAX_CLASS_SIZE * 0.10),
          'M_Under30': Math.round(MAX_CLASS_SIZE * 0.10),
          'M_Over60_Work': Math.round(MAX_CLASS_SIZE * 0.10),
          'M_Work': Math.round(MAX_CLASS_SIZE * 0.20),
        };

        toProcess.forEach(lead => {
          let has14Days = false;
          let hasVideo = false;
          let hasOffer = false;
          let hasValidEducation = false;
          let hasValidProfession = false;
          let hasValidAge = false;
          
          if (lead.dynamicAnswers) {
            Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
              const qLower = q.toLowerCase();
              const aLower = String(a).toLowerCase().trim();
              
              // AI-1 Checks
              const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
              const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');
              
              if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
              if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
              if ((qLower.includes('offer') || qLower.includes('commitment')) && isPositive) hasOffer = true;
              
              // AI-2 Checks
              if (qLower.includes('education') || qLower.includes('qualification')) {
                const validEduKeywords = ['10th', 'ssc', '12th', 'degree', 'grad', 'post', 'phd', 'b.', 'm.'];
                if (validEduKeywords.some(kw => aLower.includes(kw))) hasValidEducation = true;
              }
              if (qLower.includes('profession') || qLower.includes('occupation') || qLower.includes('work')) {
                const validProfKeywords = ['job', 'business', 'self employed', 'self-employed'];
                if (validProfKeywords.some(kw => aLower.includes(kw))) hasValidProfession = true;
              }
              if (qLower.includes('age')) {
                const age = parseInt(aLower);
                if (!isNaN(age) && age >= 34 && age <= 60) {
                  hasValidAge = true;
                }
              }
            });
          }
          
          if (has14Days && hasVideo && hasOffer && hasValidEducation && hasValidProfession && hasValidAge) {
            const bucket = getDemographicBucket(lead);
            if (bucket) {
              if (currentClosedCounts[bucket] < quotaLimits[bucket]) {
                newClosed.push(lead.id);
                currentClosedCounts[bucket]++; // Occupy the slot for the next lead in toProcess
              } else {
                newInsights[lead.id] = `Quota Full for ${bucket.replace('_', ' ')} (${quotaLimits[bucket]} max)`;
              }
            } else {
              // Could not determine bucket, maybe missing gender/age. Pass them anyway or hold?
              newInsights[lead.id] = 'Missing demographic data for quota';
            }
          } else {
            let reason = '';
            if (!has14Days) reason += 'Missed 14 Days. ';
            if (!hasVideo) reason += 'Missed Video On. ';
            if (!hasOffer) reason += 'Missed Offer. ';
            if (!hasValidEducation) reason += 'Invalid Education. ';
            if (!hasValidProfession) reason += 'Invalid Profession. ';
            if (!hasValidAge) reason += 'Invalid Age. ';
            newInsights[lead.id] = reason.trim();
          }
        });
        
        if (newClosed.length > 0) {
          setClosedLeadIds(prev => [...prev, ...newClosed]);
        }
        if (Object.keys(newInsights).length > 0) {
          setRegisteredAiInsights(prev => ({ ...prev, ...newInsights }));
        }
      }
    }, 5000);
    
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
          toast.success(`Automated Meta/Email sent to ${lead.name || 'Lead'}: "Congratulations, your form has been selected and approved, now final a small zoom meeting is needed for the class, so let me your date and time select any one slot and join for it."`, {
            duration: 6000,
          });
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

  useEffect(() => {
    async function loadLeads() {
      if (!linkedFormId) return;
      if (linkedFormId !== 'google-form-sync' && !linkedFormId.includes('docs.google.com') && !token) return;
      setIsLoadingLeads(true);
      try {
        if (linkedFormId.includes('docs.google.com/spreadsheets')) {
          const res = await fetch(`/api/admin/google-form-csv?url=${encodeURIComponent(linkedFormId)}`);
          if (res.ok) {
            const json = await res.json();
            const fetchedLeads = json.data || [];
            setLeadsData(fetchedLeads);
            setWorkshops(prev => prev.map(w => w.formId === linkedFormId ? { ...w, leads: fetchedLeads.length } : w));
            setSelectedWorkshop(prev => prev && prev.formId === linkedFormId ? { ...prev, leads: fetchedLeads.length } : prev);
          } else {
            toast.error('Failed to load Google Sheets CSV');
          }
        } else if (linkedFormId === 'google-form-sync' || linkedFormId.includes('docs.google.com/forms')) {
          let fetchedLeads = [];
          setNeedsGoogleAuth(false);
          
          if (token) {
            // Check Google Forms OAuth Sync first
            const syncRes = await fetch(`/api/admin/google-forms/sync?url=${encodeURIComponent(linkedFormId)}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (syncRes.ok) {
              const json = await syncRes.json();
              let mappedLeads = json.data || [];
              const ws = workshops.find((w: any) => w.formId === linkedFormId);
              if (ws?.googleFormMapping && mappedLeads.length > 0) {
                mappedLeads = mappedLeads.map((lead: any) => {
                  const raw = lead._rawRecord || {};
                  return {
                    ...lead,
                    name: raw[ws.googleFormMapping['Name']] || lead.name,
                    email: raw[ws.googleFormMapping['Email']] || lead.email,
                    mobile: raw[ws.googleFormMapping['Mobile']] || lead.mobile,
                    phoneNumber: raw[ws.googleFormMapping['Mobile']] || lead.phoneNumber,
                    city: raw[ws.googleFormMapping['City']] || lead.city,
                    country: raw[ws.googleFormMapping['Country']] || lead.country,
                    gender: raw[ws.googleFormMapping['Gender']] || lead.gender,
                  };
                });
              }
              fetchedLeads = mappedLeads;
              if (json.questionMap) setGoogleFormQuestionMap(json.questionMap);
              if (ws?.googleFormMapping) setFieldMapping(ws.googleFormMapping);
            } else if (syncRes.status === 401) {
              setNeedsGoogleAuth(true);
            } else {
              const err = await syncRes.json();
              setGoogleAuthError(err.error || 'Failed to sync form');
              // Fallback to webhook checking
              const res = await fetch(`/api/admin/enquiries?workshopId=${encodeURIComponent(linkedFormId)}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (res.ok) {
                const json = await res.json();
                fetchedLeads = json.data || [];
              }
            }
          }
          
          // No mock fallback — if API returned no data, show empty state
          
          setLeadsData(fetchedLeads);
          setWorkshops(prev => prev.map(w => w.formId === linkedFormId ? { ...w, leads: fetchedLeads.length } : w));
          setSelectedWorkshop(prev => prev && prev.formId === linkedFormId ? { ...prev, leads: fetchedLeads.length } : prev);
        } else {
          const res = await fetch(`/api/admin/enquiries?workshopId=${linkedFormId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const json = await res.json();
            const fetchedLeads = json.data || [];
            setLeadsData(fetchedLeads);
            setWorkshops(prev => prev.map(w => w.formId === linkedFormId ? { ...w, leads: fetchedLeads.length } : w));
            setSelectedWorkshop(prev => prev && prev.formId === linkedFormId ? { ...prev, leads: fetchedLeads.length } : prev);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingLeads(false);
      }
    }
    loadLeads();
  }, [linkedFormId, token]);

  const [workshops, setWorkshops] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!isAi4Active || !linkedFormId) return;
    
    let isFetching = false;
    const mapping = workshops.find((w: any) => w.formId === linkedFormId)?.googleFormMapping;
    
    const interval = setInterval(async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        let fetchedLeads: any[] = [];
        let newQuestionMap: any = null;
        
        if (linkedFormId.includes('docs.google.com/forms') || formSource === 'google') {
           if (token) {
             const syncRes = await fetch(`/api/admin/google-forms/sync?url=${encodeURIComponent(linkedFormId)}`, {
               headers: { Authorization: `Bearer ${token}` }
             });
             if (syncRes.ok) {
               const json = await syncRes.json();
               let mappedLeads: any[] = json.data || [];
               if (mapping && mappedLeads.length > 0) {
                 mappedLeads = mappedLeads.map((lead: any) => {
                   const raw = lead._rawRecord || {};
                   return {
                     ...lead,
                     name: raw[mapping['Name']] || lead.name,
                     email: raw[mapping['Email']] || lead.email,
                     mobile: raw[mapping['Mobile']] || lead.mobile,
                     phoneNumber: raw[mapping['Mobile']] || lead.phoneNumber,
                     city: raw[mapping['City']] || lead.city,
                     country: raw[mapping['Country']] || lead.country,
                     gender: raw[mapping['Gender']] || lead.gender,
                   };
                 });
               }
               fetchedLeads = mappedLeads;
               if (json.questionMap) newQuestionMap = json.questionMap;
             }
           }
        } else {
           const res = await fetch(`/api/admin/enquiry-forms/sync?formId=${encodeURIComponent(linkedFormId)}`, {
             headers: { Authorization: `Bearer ${token}` }
           });
           if (res.ok) {
             const json = await res.json();
             fetchedLeads = json.data || [];
           }
        }

        if (fetchedLeads.length > 0) {
          setLeadsData((prevLeads: any[]) => {
            const existingIds = new Set(prevLeads.map((l: any) => l.id));
            const newLeads = fetchedLeads.filter((l: any) => !existingIds.has(l.id));
            
            if (newLeads.length > 0) {
               let leadsToMove = newLeads;
               if (leadsFilter) {
                 const lowerFilter = leadsFilter.toLowerCase();
                 leadsToMove = newLeads.filter((lead: any) => {
                   const valuesToSearch = [
                     lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                     ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : [])
                   ].filter(Boolean).map((v: any) => String(v).toLowerCase());
                   return valuesToSearch.some((v: any) => v.includes(lowerFilter));
                 });
               }

               if (leadsToMove.length > 0) {
                 setCrmLeadIds((prevCrm: string[]) => {
                   const idsToMove = leadsToMove.map((l: any) => l.id);
                   const newCrmIds = Array.from(new Set([...prevCrm, ...idsToMove]));
                   toast.success(`🤖 AI-4: Found ${newLeads.length} new leads, moved ${leadsToMove.length} matching your filter to CRM!`);
                   return newCrmIds;
                 });
               } else {
                 toast.success(`🤖 AI-4: Found ${newLeads.length} new leads, but none matched your filter.`);
               }

               setWorkshops((prev: any[]) => prev.map((w: any) => w.formId === linkedFormId ? { ...w, leads: (w.leads || 0) + newLeads.length } : w));
               setSelectedWorkshop((prev: any) => prev && prev.formId === linkedFormId ? { ...prev, leads: (prev.leads || 0) + newLeads.length } : prev);
               
               return [...prevLeads, ...newLeads];
            }
            
            return prevLeads;
          });
          
          if (newQuestionMap) setGoogleFormQuestionMap(newQuestionMap);
        }
      } catch (err) {
        console.error("AI4 Fetch error", err);
      } finally {
        isFetching = false;
      }
    }, (ai4Interval || 600) * 1000); 
    
    return () => clearInterval(interval);
  }, [isAi4Active, linkedFormId, ai4Interval, token, formSource, leadsFilter, workshops]);

  // AI-4: Auto-reconnect Google every 2 minutes to keep token fresh and reload forms
  useEffect(() => {
    if (!isAi4Active) return;

    const refreshGoogleForms = async () => {
      try {
        const res = await fetch('/api/admin/google-forms/list', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (res.ok && data.forms && data.forms.length > 0) {
          setGoogleFormsList(data.forms);
          setNeedsGoogleAuth(false);
          console.log(`[AI-4] Google reconnect: ${data.forms.length} forms refreshed`);
        } else if (data.needsAuth) {
          setNeedsGoogleAuth(true);
          console.warn('[AI-4] Google token expired, needs reconnect');
        }
      } catch (err) {
        console.error('[AI-4] Google refresh error:', err);
      }
    };

    // Refresh immediately when AI-4 is turned on
    refreshGoogleForms();

    // Then refresh every 2 minutes
    const googleRefreshInterval = setInterval(refreshGoogleForms, 2 * 60 * 1000);
    return () => clearInterval(googleRefreshInterval);
  }, [isAi4Active, token]);

  useEffect(() => {
    const defaultBatch = {
      id: 'w_english_swar_yoga',
      name: 'English swar yoga',
      formId: 'https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit',
      googleFormUrl: 'https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit',
      leads: 0,
      language: 'English'
    };

    const saved = localStorage.getItem('crm_workshops');
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
    
    const savedAiState = localStorage.getItem('crm_ai_worker_active');
    if (savedAiState) setIsAiWorkerActive(savedAiState === 'true');
    
    const savedApprovedAiState = localStorage.getItem('crm_approved_ai_active');
    if (savedApprovedAiState) setIsApprovedAiWorkerActive(savedApprovedAiState === 'true');
    
    const savedRegisteredAiState = localStorage.getItem('crm_registered_ai_active');
    if (savedRegisteredAiState) setIsRegisteredAiWorkerActive(savedRegisteredAiState === 'true');
    
    try {
      const savedCrm = localStorage.getItem('crm_lead_ids');
      if (savedCrm) setCrmLeadIds(JSON.parse(savedCrm));
      
      const savedApproved = localStorage.getItem('crm_approved_ids');
      if (savedApproved) setApprovedLeadIds(JSON.parse(savedApproved));
      
      const savedPending = localStorage.getItem('crm_pending_ids');
      if (savedPending) setPendingLeadIds(JSON.parse(savedPending));
      
      const savedRegistered = localStorage.getItem('crm_registered_ids');
      if (savedRegistered) setRegisteredLeadIds(JSON.parse(savedRegistered));
      
      const savedRejected = localStorage.getItem('crm_rejected_ids');
      if (savedRejected) setRejectedLeadIds(JSON.parse(savedRejected));
      
      const savedClosed = localStorage.getItem('crm_closed_ids');
      if (savedClosed) setClosedLeadIds(JSON.parse(savedClosed));
      
      const savedSent = localStorage.getItem('crm_sent_congrats_ids');
      if (savedSent) setSentCongratsLeadIds(JSON.parse(savedSent));
      
      const loadFromApi = async () => {
        try {
          const res = await fetch('/api/admin/crm/new-registration/state');
          if (res.ok) {
            const data = await res.json();
            if (data) {
              if (data.crm_workshops) setWorkshops(JSON.parse(data.crm_workshops));
              if (data.crm_ai_worker_active) setIsAiWorkerActive(data.crm_ai_worker_active === 'true');
              if (data.crm_approved_ai_active) setIsApprovedAiWorkerActive(data.crm_approved_ai_active === 'true');
              if (data.crm_registered_ai_active) setIsRegisteredAiWorkerActive(data.crm_registered_ai_active === 'true');
              // We also save to localStorage so the rest of the app doesn't break
              for (const [k, v] of Object.entries(data)) {
                if (typeof v === 'string') localStorage.setItem(k, v);
              }
            }
          }
        } catch (e) {
          console.error('API load failed, falling back to local', e);
        }
      };

      loadFromApi().then(() => {
        const savedInsights = localStorage.getItem('crm_approval_insights');
        if (savedInsights) setApprovalAiInsights(JSON.parse(savedInsights));
        
        const savedPendingInsights = localStorage.getItem('crm_pending_insights');
        if (savedPendingInsights) setPendingAiInsights(JSON.parse(savedPendingInsights));
        
        const savedRegInsights = localStorage.getItem('crm_registered_insights');
        if (savedRegInsights) setRegisteredAiInsights(JSON.parse(savedRegInsights));
      });
    } catch (e) {
      console.error('Error loading crm states', e);
    }
    
    try {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('success') === 'google_forms_connected') {
          const defaultUrl = 'https://docs.google.com/forms/d/18NZAYl-2pLr3arpopo0hTxVi2Jyd8iKUY6YApscnhv0/edit';
          toast.success('🎉 Google Account connected! Swar Yoga Form saved & data loaded automatically.');
          setFormSource('google');
          setGoogleFormUrl(defaultUrl);
          setLinkedFormId(defaultUrl);
          setActiveTab('forms');
          setIsFormSetupCollapsed(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (searchParams.get('error')) {
          toast.error(`Google Login: ${searchParams.get('error')}`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    } catch (e) {}

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const stateObj: Record<string, string> = {};
      
      const setAndCollect = (k: string, v: string) => {
        localStorage.setItem(k, v);
        stateObj[k] = v;
      };

      setAndCollect('crm_workshops', JSON.stringify(workshops));
      setAndCollect('crm_ai_worker_active', String(isAiWorkerActive));
      setAndCollect('crm_approved_ai_active', String(isApprovedAiWorkerActive));
      setAndCollect('crm_registered_ai_active', String(isRegisteredAiWorkerActive));

      if (selectedWorkshop) {
        const suffix = `_${selectedWorkshop.id}`;
        setAndCollect('crm_lead_ids' + suffix, JSON.stringify(crmLeadIds));
        setAndCollect('crm_approved_ids' + suffix, JSON.stringify(approvedLeadIds));
        setAndCollect('crm_pending_ids' + suffix, JSON.stringify(pendingLeadIds));
        setAndCollect('crm_registered_ids' + suffix, JSON.stringify(registeredLeadIds));
        setAndCollect('crm_rejected_ids' + suffix, JSON.stringify(rejectedLeadIds));
        setAndCollect('crm_student_kota_ids' + suffix, JSON.stringify(studentKotaLeadIds));
        setAndCollect('crm_closed_ids' + suffix, JSON.stringify(closedLeadIds));
        setAndCollect('crm_sent_congrats_ids' + suffix, JSON.stringify(sentCongratsLeadIds));
        setAndCollect('crm_approval_insights' + suffix, JSON.stringify(approvalAiInsights));
        setAndCollect('crm_pending_insights' + suffix, JSON.stringify(pendingAiInsights));
        setAndCollect('crm_registered_insights' + suffix, JSON.stringify(registeredAiInsights));
      }

      const timeoutId = setTimeout(() => {
        // Collect any other crm_ keys from localStorage that weren't just set
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('crm_') && !stateObj[key]) {
            stateObj[key] = localStorage.getItem(key) || '';
          }
        }
        
        fetch('/api/admin/crm/new-registration/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stateObj)
        }).catch(e => console.error('Failed to sync state to Bunny', e));
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [workshops, isAiWorkerActive, crmLeadIds, approvedLeadIds, pendingLeadIds, registeredLeadIds, rejectedLeadIds, studentKotaLeadIds, closedLeadIds, sentCongratsLeadIds, isApprovedAiWorkerActive, isRegisteredAiWorkerActive, approvalAiInsights, pendingAiInsights, registeredAiInsights, isLoaded]);

  useEffect(() => {
    if (selectedWorkshop?.formId) {
      setLinkedFormId(selectedWorkshop.formId);
      setSelectedFormId(selectedWorkshop.formId);
    } else {
      setLinkedFormId('');
      setSelectedFormId('');
      setLeadsData([]);
    }
  }, [selectedWorkshop]);

  const handleDetailChange = (field: string, value: string) => {
    if (!selectedWorkshop) return;
    const updated = {
      ...selectedWorkshop,
      [field]: value
    };
    setSelectedWorkshop(updated);
    setWorkshops(workshops.map(w => w.id === updated.id ? updated : w));
  };

  const handleDeleteBatch = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this batch?')) {
      setWorkshops(workshops.filter(w => w.id !== id));
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

  // State for Zoom meetings & message numbers per lead (used in Closing tab)
  const [meetingSchedule, setMeetingSchedule] = useState<Record<string, string>>({});
  const [messageNumber, setMessageNumber] = useState<Record<string, number>>({});

  const handleBulkAction = (action: string) => {
    if (action === 'Delete') {
      if (selectedRowIds.length === 0) {
        toast.error('Please select at least one lead to delete.');
        return;
      }
      if (confirm(`Are you sure you want to delete ${selectedRowIds.length} leads?`)) {
        const newLeads = leadsData.filter(l => !selectedRowIds.includes(l.id));
        setLeadsData(newLeads);
        setWorkshops(prev => prev.map(w => w.id === selectedWorkshop?.id ? { ...w, leads: newLeads.length } : w));
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
    { id: 'details', label: 'Workshop Details', icon: Calendar },
    { id: 'forms', label: 'Workshop Forms', icon: FileText },
    { id: 'leads', label: 'Leads Management', icon: Users },
    { id: 'closing', label: 'Leads Closing', icon: Handshake },
    { id: 'templates', label: 'Message Templates', icon: MessageSquare },
  ] as const;

  const LeadSubTabs = [
    { id: 'new', label: 'New Forms' },
    { id: 'approved', label: 'Approved Forms' },
    { id: 'pending', label: 'Pending Forms' },
    { id: 'registered', label: 'Registered Forms' },
    { id: 'student_kota', label: 'Student Kota' },
  ] as const;

  const canAccessTab = (tabId: string) => {
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
      <button onClick={() => handleBulkAction('QR Code')} className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">
        <QrCode size={14}/> QR
      </button>
      <button onClick={() => handleBulkAction('Meta')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold transition-colors">
        <Share2 size={14}/> Meta
      </button>
      <button onClick={() => handleBulkAction('Email')} className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors">
        <Mail size={14}/> Email
      </button>
      <div className="w-px h-6 bg-slate-200 mx-1"></div>
      <button 
        onClick={() => {
          if(selectedRowIds.length === 0) { toast.error("Select leads first"); return; }
          setStudentKotaLeadIds(prev => Array.from(new Set([...prev, ...selectedRowIds])));
          setSelectedRowIds([]);
          toast.success("Moved to Student Kota!");
        }}
        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors"
      >
        <Users size={14}/> Move to Student Kota
      </button>
      <button onClick={() => handleBulkAction('Delete')} className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold transition-colors">
        <Trash2 size={14}/> Delete {selectedRowIds.length > 0 ? `(${selectedRowIds.length})` : ''}
      </button>
    </div>
  );

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

  return (
    <div className={`flex h-screen bg-slate-50 font-sans overflow-hidden ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
      
      {/* Global Sidebar for Batch Selection */}
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
          
          {!isSidebarCollapsed ? (
            <button 
              onClick={() => setIsAddBatchModalOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform text-white font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-sm w-full"
            >
              <Plus size={16} /> Add New Batch
            </button>
          ) : (
            <button 
              onClick={() => setIsAddBatchModalOpen(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform text-white font-bold p-2.5 rounded-lg flex items-center justify-center shadow-sm w-full"
              title="Add New Batch"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!isSidebarCollapsed && <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">Your Batches</div>}
          {workshops.map((w) => (
            <div 
              key={w.id}
              onClick={() => {
                setSelectedWorkshop(w);
                if (activeTab === 'forms') setActiveTab('leads');
                toast.success(`Selected ${w.name}`);
              }}
              className={`p-3 rounded-xl border cursor-pointer transition-all relative group flex items-center ${
                selectedWorkshop?.id === w.id 
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500/20' 
                  : 'border-transparent hover:border-slate-200 bg-white hover:bg-slate-50'
              } ${isSidebarCollapsed ? 'justify-center' : ''}`}
              title={isSidebarCollapsed ? w.name : undefined}
            >
              {isSidebarCollapsed ? (
                <div className="w-10 h-10 flex items-center justify-center bg-indigo-100 text-indigo-700 font-bold rounded-lg text-lg">
                  {w.name.charAt(0)}
                </div>
              ) : (
                <>
                  <div className="flex-1 pr-12">
                    <h3 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedWorkshop?.id === w.id ? 'text-indigo-900' : 'text-slate-800'}`}>{w.name}</h3>
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Users size={12}/> {w.leads} Leads
                    </p>
                  </div>
                  
                  {/* Hover Actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 p-1 rounded-lg">
                    <button 
                      onClick={(e) => handleEditBatch(e, w)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteBatch(e, w.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </aside>

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
            {TopTabs.map(tab => (
              <button
                key={tab.id}
                disabled={!canAccessTab(tab.id)}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-bold border-b-[3px] transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-indigo-600 text-indigo-700' 
                    : canAccessTab(tab.id)
                      ? 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                      : 'border-transparent text-slate-300 cursor-not-allowed'
                }`}
              >
                <tab.icon size={16} className={activeTab === tab.id ? "text-indigo-600" : (canAccessTab(tab.id) ? "text-slate-400" : "text-slate-300")} />
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          
          {!selectedWorkshop ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="bg-slate-100 p-6 rounded-full mb-6 text-slate-300">
                  <Handshake size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-600 mb-2">No Batch Selected</h3>
                <p className="text-sm font-medium text-slate-500 max-w-sm text-center">
                  Please select a batch from the sidebar or create a new one to access the workspace.
                </p>
             </div>
          ) : (
            <>
              {/* TAB 1: Workshop Details */}
              {activeTab === 'details' && (
                <div className="max-w-4xl mx-auto animate-fade-in space-y-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                      <h2 className="text-lg font-bold text-slate-800">Workshop Details</h2>
                    </div>
                    <div className="p-6 grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Workshop Name</label>
                        <input type="text" value={selectedWorkshop.name || ''} onChange={(e) => handleDetailChange('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Language</label>
                        <input type="text" value={selectedWorkshop.language || ''} onChange={(e) => handleDetailChange('language', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                        <input type="date" value={selectedWorkshop.startDate || ''} onChange={(e) => handleDetailChange('startDate', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                        <input type="date" value={selectedWorkshop.endDate || ''} onChange={(e) => handleDetailChange('endDate', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                        <input type="time" value={selectedWorkshop.startTime || ''} onChange={(e) => handleDetailChange('startTime', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">End Time</label>
                        <input type="time" value={selectedWorkshop.endTime || ''} onChange={(e) => handleDetailChange('endTime', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Duration</label>
                        <input type="text" value={selectedWorkshop.duration || ''} onChange={(e) => handleDetailChange('duration', e.target.value)} placeholder="e.g. 2 hours" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">WhatsApp Link</label>
                        <input type="url" value={selectedWorkshop.whatsappLink || ''} onChange={(e) => handleDetailChange('whatsappLink', e.target.value)} placeholder="https://chat.whatsapp.com/..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Zoom Link</label>
                        <input type="url" value={selectedWorkshop.zoomLink || ''} onChange={(e) => handleDetailChange('zoomLink', e.target.value)} placeholder="https://zoom.us/j/..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Registration Link</label>
                        <input type="url" value={selectedWorkshop.registrationLink || ''} onChange={(e) => handleDetailChange('registrationLink', e.target.value)} placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                      </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      {renderBulkActions()}
                      <button 
                        onClick={() => toast.success('Workshop details saved successfully!')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg transition-colors"
                      >
                        Save Workshop Details
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Workshop Forms */}
              {activeTab === 'forms' && (
                <div className="w-full max-w-7xl mx-auto space-y-6 animate-fade-in">
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
                                className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                value={googleFormUrl}
                                onChange={(e) => setGoogleFormUrl(e.target.value)}
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
                                title="Reconnect Google account"
                              >
                                🔗 Reconnect
                              </button>
                            </div>
                            
                            <details className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                              <summary className="cursor-pointer hover:text-slate-800 font-medium">Or enter Form ID manually</summary>
                              <div className="flex items-center gap-2 mt-3">
                                <input 
                                  type="text" 
                                  value={googleFormUrl} 
                                  onChange={(e) => setGoogleFormUrl(e.target.value)}
                                  placeholder="Google Form ID"
                                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </details>
                            
                            {/* Mapping UI will be rendered below when a form is selected and its fields are fetched */}
                            {Object.keys(googleFormQuestionMap).length > 0 && formSource === 'google' && (
                              <div className="mt-6 pt-4 border-t border-slate-200">
                                <h4 className="font-bold text-slate-800 mb-3 text-sm">Map Google Form Fields to CRM</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {['Name', 'Email', 'Mobile', 'City', 'Country', 'Gender'].map(crmField => (
                                    <div key={crmField} className="space-y-1">
                                      <label className="text-xs font-bold text-slate-500 uppercase">{crmField}</label>
                                      <select
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 bg-white"
                                        value={fieldMapping[crmField] || ''}
                                        onChange={(e) => setFieldMapping({...fieldMapping, [crmField]: e.target.value})}
                                      >
                                        <option value="">-- Ignore --</option>
                                        {Object.entries(googleFormQuestionMap).map(([qId, qTitle]) => (
                                          <option key={qId} value={qTitle}>{qTitle}</option>
                                        ))}
                                      </select>
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
                      
                      {/* Fetched Fields Section */}
                      <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4">
                          <button 
                            onClick={() => setIsMapDataCollapsed(!isMapDataCollapsed)}
                            className="flex items-center gap-2 font-bold text-slate-800 hover:text-indigo-600 transition-colors"
                          >
                            {isMapDataCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                            Map Data to Leads
                          </button>
                          
                          {!isMapDataCollapsed && (
                            <label className="flex items-center gap-2 text-sm text-indigo-600 font-bold cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded text-indigo-600" />
                              Select All
                            </label>
                          )}
                        </div>
                        
                        {!isMapDataCollapsed && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-2 gap-3 animate-fade-in">
                            {['Name', 'Email', 'WhatsApp Number', 'Age', 'Profession', 'Country', 'City', 'Health Issues', 'Workshop Date'].map((field) => (
                              <label key={field} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                                <input type="checkbox" defaultChecked className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                                <span className="text-sm font-bold text-slate-700">{field}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => {
                          if (formSource === 'internal' && !selectedFormId) {
                            toast.error('Please select a form first');
                            return;
                          }
                          if (formSource === 'google' && !googleFormUrl) {
                            toast.error('Please enter a Google Form URL');
                            return;
                          }
                          
                          if (selectedWorkshop) {
                            const updated = { 
                              ...selectedWorkshop, 
                              formId: formSource === 'google' ? googleFormUrl : selectedFormId,
                              googleFormMapping: formSource === 'google' ? fieldMapping : undefined
                            };
                            setSelectedWorkshop(updated);
                            setWorkshops(workshops.map(w => w.id === updated.id ? updated : w));
                          }
                          
                          setLinkedFormId(formSource === 'google' ? googleFormUrl : selectedFormId);
                          toast.success('Form linked & saved! Fetching leads...');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                      >
                        <Users size={16} /> Link Form & Fetch Data
                      </button>
                    </div>
                    </>
                    )}
                    
                    {/* Render Fetched Leads Inline in Forms Tab */}
                    {linkedFormId && (
                      <div className="border-t border-slate-200">
                        <div className="px-6 py-4 bg-slate-50 flex items-center justify-between border-b border-slate-200">
                          <div className="flex items-center gap-4">
                            <h3 className="font-bold text-slate-800">
                              Linked Leads {leadsData.length > 0 && <span className="text-sm font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full ml-2">{leadsData.length} leads</span>}
                            </h3>
                            {linkedFormId && (
                              <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                                <span className="text-xs font-bold text-slate-500">AI-4</span>
                                <button 
                                  onClick={() => {
                                    setIsAi4Active(!isAi4Active);
                                    if (!isAi4Active) toast.success(`🤖 AI-4 activated! Following your instructions on every fetch.`);
                                  }}
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAi4Active ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAi4Active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                                <button 
                                  onClick={() => setIsAi4RulesOpen(true)}
                                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors ml-1"
                                  title="AI-4 Instructions & Rules"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </div>
                            )}
                          </div>
                          {selectedRowIds.length > 0 && (
                            <div className="flex items-center gap-3">
                              {renderBulkActions()}
                              <div className="w-px h-6 bg-slate-200 mx-1"></div>
                              <button 
                                onClick={handleApproveBulk}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
                              >
                                Move to CRM ({selectedRowIds.length})
                              </button>
                            </div>
                          )}
                          </div>
                        <div className="px-6 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
                          <input 
                            type="text" 
                            placeholder="Filter by Workshop Name, Batch, Date, Time, Gender, Name..." 
                            value={leadsFilter}
                            onChange={e => setLeadsFilter(e.target.value)}
                            className="w-full max-w-md border border-slate-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                          {leadsFilter && (
                            <span className="text-xs text-slate-500">{leadsData.filter(lead => JSON.stringify(lead).toLowerCase().includes(leadsFilter.toLowerCase())).length} results found</span>
                          )}
                        </div>
                        <div className="overflow-x-auto min-h-[300px] bg-white">
                          {(() => {
                            let tab2Leads = leadsData.map((lead, index) => ({ ...lead, originalIndex: index }));
                            
                            if (leadsFilter) {
                              const lowerFilter = leadsFilter.toLowerCase();
                              tab2Leads = tab2Leads.filter(lead => {
                                // Search through all values including dynamic answers
                                const valuesToSearch = [
                                  lead.name, lead.email, lead.mobile, lead.city, lead.country, lead.gender,
                                  ...(lead.dynamicAnswers ? Object.values(lead.dynamicAnswers) : [])
                                ].filter(Boolean).map(v => String(v).toLowerCase());
                                return valuesToSearch.some(v => v.includes(lowerFilter));
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
                              <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 sticky top-0 z-30 border-b border-slate-200 uppercase text-xs whitespace-nowrap shadow-sm">
                                  <tr>
                                    <th className="px-4 py-3 font-bold text-slate-500 text-center w-[50px] min-w-[50px] sticky left-0 z-30 bg-slate-50">
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={tab2Leads.length > 0 && selectedRowIds.length === tab2Leads.length}
                                        onChange={(e) => {
                                          if (e.target.checked) setSelectedRowIds(tab2Leads.map(l => l.id));
                                          else setSelectedRowIds([]);
                                        }}
                                      />
                                    </th>
                                <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>
                                <th className="px-4 py-3 font-bold text-slate-500 w-[200px] min-w-[200px] sticky left-[200px] z-30 bg-slate-50">Email</th>
                                <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[400px] z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">WhatsApp</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Gender</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Age</th>
                                <th className="px-4 py-3 font-bold text-slate-500">City</th>
                                <th className="px-4 py-3 font-bold text-slate-500">Country</th>
                                {dynamicColumns.map(col => (
                                  <th key={col} className="px-4 py-3 font-bold text-slate-500">{col}</th>
                                ))}
                                <th className="px-4 py-3 font-bold text-slate-500">
                                  <button onClick={() => setTab2SortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                    Submitted At
                                    <ChevronDown size={14} className={`transform transition-transform ${tab2SortOrder === 'asc' ? 'rotate-180' : ''}`} />
                                  </button>
                                </th>
                                <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
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
                                  const bgClass = isProcessed ? 'bg-slate-50 opacity-60' : isSelected ? 'bg-indigo-50 group-hover:bg-indigo-100/50' : 'bg-white group-hover:bg-slate-50';
                                  
                                  return (
                                    <tr key={lead.id || i} className={`group transition-colors ${bgClass}`}>
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
                                        <div className="truncate w-full">{lead.name || '-'}</div>
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap w-[200px] min-w-[200px] sticky left-[200px] z-20 ${bgClass} transition-colors`}>
                                        <div className="truncate w-full">{lead.email || '-'}</div>
                                      </td>
                                      <td className={`px-4 py-3 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[400px] z-20 ${bgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                        {lead.mobile || lead.phoneNumber || '-'}
                                      </td>
                                      <td className="px-4 py-3 capitalize whitespace-nowrap">{lead.gender || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.age || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.city || '-'}</td>
                                    <td className="px-4 py-3 whitespace-nowrap">{lead.country || '-'}</td>
                                    {dynamicColumns.map(col => (
                                      <td key={col} className="px-4 py-3 whitespace-nowrap text-slate-500">
                                        {lead.dynamicAnswers?.[col] || '-'}
                                      </td>
                                    ))}
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
                </div>
              )}

        {/* TAB 3: Leads Management */}
        {activeTab === 'leads' && (
          <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
            
            {/* Stats Grid Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <button 
                onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
                className="w-full text-left px-6 py-4 bg-slate-50/50 hover:bg-slate-100 transition-colors flex items-center justify-between"
              >
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Dashboard Overview</h2>
                  <p className="text-sm text-slate-500">View real-time statistics and funnel progress.</p>
                </div>
                <div className="text-slate-400">
                  {isStatsCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                </div>
              </button>
              
              {!isStatsCollapsed && (
                <div className="p-6 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {(() => {
                      const totalLeads = workshops.reduce((sum, w) => sum + (w.leads || 0), 0);
                const targetLeads = 2000;
                const progress = totalLeads > 0 ? Math.min(100, Math.round((totalLeads / targetLeads) * 100)) : 0;
                
                const todayLeads = Math.floor(totalLeads * 0.1);
                const weekLeads = Math.floor(totalLeads * 0.4);
                const monthLeads = Math.floor(totalLeads * 0.8);
                
                return (
                  <>
                    <StatCard title="Total Leads" value={totalLeads} target={targetLeads} progress={progress} />
                    <StatCard title="Today" value={todayLeads} target={100} progress={Math.min(100, Math.round((todayLeads/100)*100))} />
                    <StatCard title="This Week" value={weekLeads} target={500} progress={Math.min(100, Math.round((weekLeads/500)*100))} />
                    <StatCard title="This Month" value={monthLeads} target={1500} progress={Math.min(100, Math.round((monthLeads/1500)*100))} />
                    
                    <StatCard 
                      title="New Forms" 
                      value={leadsData.filter(l => crmLeadIds.includes(l.id) && !approvedLeadIds.includes(l.id) && !pendingLeadIds.includes(l.id)).length} 
                      target={totalLeads} 
                      progress={0} 
                    />
                    <StatCard 
                      title="Approved" 
                      value={leadsData.filter(l => approvedLeadIds.includes(l.id)).length} 
                      target={totalLeads} 
                      progress={0} 
                    />
                    <StatCard 
                      title="Pending" 
                      value={leadsData.filter(l => pendingLeadIds.includes(l.id)).length} 
                      target={totalLeads} 
                      progress={0} 
                    />
                    <StatCard 
                      title="Registered" 
                      value={leadsData.filter(l => registeredLeadIds.includes(l.id)).length} 
                      target={totalLeads} 
                      progress={0} 
                    />
                    </>
                  );
                })()}
                  </div>
                </div>
              )}
            </div>
            
            <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex h-[600px] ${sidebarPosition === 'right' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Inner Sidebar */}
              <div className={`w-64 bg-slate-50 flex flex-col flex-shrink-0 ${sidebarPosition === 'right' ? 'border-l border-slate-200' : 'border-r border-slate-200'}`}>
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800">Leads Segments</h3>
                </div>
                <div className="flex-1 p-3 space-y-1 overflow-y-auto">
                  {LeadSubTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setLeadSubTab(tab.id as any)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                        leadSubTab === tab.id 
                          ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Area */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white">
                  <h3 className="font-bold text-slate-800 text-lg">{LeadSubTabs.find(t => t.id === leadSubTab)?.label}</h3>
                  <div className="flex items-center gap-2">
                    {renderBulkActions()}
                    {leadSubTab === 'new' && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                        <span className="text-xs font-bold text-slate-500">AI WORKER</span>
                        <button 
                          onClick={() => {
                            setIsAiWorkerActive(!isAiWorkerActive);
                            if (!isAiWorkerActive) toast.success('AI Worker activated! Checking every 5 mins.');
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAiWorkerActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAiWorkerActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}
                    {leadSubTab === 'approved' && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                        <span className="text-xs font-bold text-slate-500">AI WORKER</span>
                        <button 
                          onClick={() => {
                            setIsApprovedAiWorkerActive(!isApprovedAiWorkerActive);
                            if (!isApprovedAiWorkerActive) toast.success('Approved AI Worker activated! Checking eligibility.');
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isApprovedAiWorkerActive ? 'bg-emerald-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isApprovedAiWorkerActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}
                    {leadSubTab === 'registered' && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-4 ml-2">
                        <span className="text-xs font-bold text-slate-500">AI WORKER</span>
                        <button 
                          onClick={() => {
                            setIsRegisteredAiWorkerActive(!isRegisteredAiWorkerActive);
                            if (!isRegisteredAiWorkerActive) toast.success('Registered AI Worker activated! Running final audit.');
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isRegisteredAiWorkerActive ? 'bg-purple-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isRegisteredAiWorkerActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto min-h-[300px] bg-white">
                  {(() => {
                    let filteredLeads = leadsData.filter(lead => {
                      if (!crmLeadIds.includes(lead.id)) return false;
                      if (leadSubTab === 'new') return true;
                      if (leadSubTab === 'approved') return approvedLeadIds.includes(lead.id);
                      if (leadSubTab === 'pending') return pendingLeadIds.includes(lead.id);
                      if (leadSubTab === 'registered') return registeredLeadIds.includes(lead.id);
                      if (leadSubTab === 'student_kota') return studentKotaLeadIds.includes(lead.id);
                      return false;
                    });
                    
                    filteredLeads = [...filteredLeads].sort((a, b) => {
                      const aRejected = rejectedLeadIds.includes(a.id);
                      const bRejected = rejectedLeadIds.includes(b.id);
                      
                      if (leadSubTab === 'pending') {
                        if (aRejected !== bRejected) return aRejected ? 1 : -1;
                      }
                      
                      if (leadSubTab === 'new') {
                        const getStatus = (id: string) => registeredLeadIds.includes(id) ? 3 : approvedLeadIds.includes(id) ? 2 : pendingLeadIds.includes(id) ? 1 : 0;
                        return getStatus(a.id) - getStatus(b.id);
                      }
                      
                      return 0;
                    });
                    
                    return (
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 sticky top-0 z-30 border-b border-slate-200 uppercase text-xs whitespace-nowrap shadow-sm">
                          <tr>
                            <th className="px-4 py-3 font-bold text-slate-500 text-center w-[50px] min-w-[50px] sticky left-0 z-30 bg-slate-50">
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={filteredLeads.length > 0 && selectedRowIds.length === filteredLeads.length}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedRowIds(filteredLeads.map(l => l.id));
                                  else setSelectedRowIds([]);
                                }}
                              />
                            </th>
                            <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[50px] z-30 bg-slate-50">Name</th>
                            <th className="px-4 py-3 font-bold text-slate-500 w-[150px] min-w-[150px] sticky left-[200px] z-30 bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">WhatsApp</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Email</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Gender</th>
                            <th className="px-4 py-3 font-bold text-slate-500">City</th>
                            {dynamicColumns.map(col => (
                              <th key={col} className="px-4 py-3 font-bold text-slate-500">{col}</th>
                            ))}
                            <th className="px-4 py-3 font-bold text-slate-500">Payment</th>
                            <th className="px-4 py-3 font-bold text-slate-500">Submitted At</th>
                            <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {isLoadingLeads ? (
                            <tr>
                              <td colSpan={10 + dynamicColumns.length} className="p-8 text-center text-slate-500">Loading leads...</td>
                            </tr>
                          ) : !linkedFormId ? (
                            <tr>
                              <td colSpan={10 + dynamicColumns.length} className="p-12 text-center">
                                <div className="text-slate-300 mb-2 flex justify-center"><Users size={32} /></div>
                                <h3 className="font-bold text-slate-700">No form linked</h3>
                                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">Go to the Workshop Forms tab and link a form to see its leads here.</p>
                              </td>
                            </tr>
                          ) : filteredLeads.length === 0 ? (
                            <tr>
                              <td colSpan={10 + dynamicColumns.length} className="p-12 text-center text-slate-500">
                                <h3 className="font-bold text-slate-700">No leads found</h3>
                                <p className="text-sm text-slate-500 mt-1">There are no leads in this section.</p>
                              </td>
                            </tr>
                          ) : (
                            filteredLeads.map((lead, i) => {
                              const isSelected = selectedRowIds.includes(lead.id);
                              const isApproved = approvedLeadIds.includes(lead.id);
                              const isPending = pendingLeadIds.includes(lead.id);
                              const isRegistered = registeredLeadIds.includes(lead.id);
                              const isRejected = rejectedLeadIds.includes(lead.id);
                              const isClosed = closedLeadIds.includes(lead.id);
                              
                              let baseBgClass = 'bg-white hover:bg-slate-50';
                              
                              if (leadSubTab === 'new') {
                                if (isRegistered || isApproved) baseBgClass = 'bg-emerald-50/60 hover:bg-emerald-100/60';
                                else if (isPending) baseBgClass = 'bg-fuchsia-50/60 hover:bg-fuchsia-100/60';
                              } else if (leadSubTab === 'approved') {
                                if (isRegistered) baseBgClass = 'bg-emerald-50/60 hover:bg-emerald-100/60';
                              } else if (leadSubTab === 'pending') {
                                if (isRejected) baseBgClass = 'bg-red-50/60 hover:bg-red-100/60';
                                else baseBgClass = 'bg-yellow-50/60 hover:bg-yellow-100/60';
                              } else if (leadSubTab === 'registered' || leadSubTab === 'student_kota') {
                                if (isClosed) baseBgClass = 'bg-emerald-50/60 hover:bg-emerald-100/60';
                                else if (registeredAiInsights[lead.id]) baseBgClass = 'bg-yellow-50/60 hover:bg-yellow-100/60';
                              }

                              if (isSelected) baseBgClass = 'bg-indigo-50/80 hover:bg-indigo-100/80';

                              let cellBgClass = 'bg-white group-hover:bg-slate-50';
                              if (leadSubTab === 'new') {
                                if (isRegistered || isApproved) cellBgClass = 'bg-emerald-50/60 group-hover:bg-emerald-100/60';
                                else if (isPending) cellBgClass = 'bg-fuchsia-50/60 group-hover:bg-fuchsia-100/60';
                              } else if (leadSubTab === 'approved') {
                                if (isRegistered) cellBgClass = 'bg-emerald-50/60 group-hover:bg-emerald-100/60';
                              } else if (leadSubTab === 'pending') {
                                if (isRejected) cellBgClass = 'bg-red-50/60 group-hover:bg-red-100/60';
                                else cellBgClass = 'bg-yellow-50/60 group-hover:bg-yellow-100/60';
                              } else if (leadSubTab === 'registered') {
                                if (isClosed) cellBgClass = 'bg-emerald-50/60 group-hover:bg-emerald-100/60';
                                else if (registeredAiInsights[lead.id]) cellBgClass = 'bg-yellow-50/60 group-hover:bg-yellow-100/60';
                              }
                              if (isSelected) cellBgClass = 'bg-indigo-50/80 group-hover:bg-indigo-100/80';

                              return (
                                <tr key={lead.id || i} className={`group transition-colors ${baseBgClass}`}>
                                  <td className={`px-4 py-3 text-center w-[50px] min-w-[50px] sticky left-0 z-20 ${cellBgClass} transition-colors`}>
                                    <input 
                                      type="checkbox" 
                                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedRowIds(prev => [...prev, lead.id]);
                                        else setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                      }}
                                    />
                                  </td>
                                  <td className={`px-4 py-3 font-medium text-slate-800 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[50px] z-20 ${cellBgClass} transition-colors`}>
                                    <div className="truncate w-full">{lead.name || '-'}</div>
                                  </td>
                                  <td className={`px-4 py-3 whitespace-nowrap w-[150px] min-w-[150px] sticky left-[200px] z-20 ${cellBgClass} transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]`}>
                                    {lead.mobile || lead.phoneNumber || '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">{lead.email || '-'}</td>
                                  <td className="px-4 py-3 capitalize whitespace-nowrap">{lead.gender || '-'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">{lead.city || '-'}</td>
                                  {dynamicColumns.map(col => (
                                    <td key={col} className="px-4 py-3 whitespace-nowrap text-slate-500">
                                      {lead.dynamicAnswers?.[col] || '-'}
                                    </td>
                                  ))}
                                  <td className="px-4 py-3">
                                    {lead.payment?.status ? (
                                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${lead.payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {lead.payment.status}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">{lead.submittedAt ? new Date(lead.submittedAt).toLocaleDateString() : '-'}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-right">
                                    {leadSubTab === 'pending' && !isRejected && (
                                      <div className="flex flex-col items-end gap-2">
                                        {(() => {
                                          let insight = pendingAiInsights[lead.id];
                                          if (!insight) {
                                            // Fallback computation for leads that were manually moved or moved before the AI logic update
                                            let has14Days = false;
                                            let hasVideo = false;
                                            let hasOffer = false;
                                            if (lead.dynamicAnswers) {
                                              Object.entries(lead.dynamicAnswers).forEach(([q, a]) => {
                                                const qLower = q.toLowerCase();
                                                const aLower = String(a).toLowerCase().trim();
                                                const isNegative = aLower === 'no' || aLower === 'n' || aLower.startsWith('no ');
                                                const isPositive = !isNegative && (aLower.includes('yes') || aLower.includes('ready') || aLower.includes('noted') || aLower.includes('will') || aLower.includes('agree') || aLower.includes('ok') || aLower === 'y');
                                                if ((qLower.includes('14 days') || qLower.includes('attend_all')) && isPositive) has14Days = true;
                                                if ((qLower.includes('video') || qLower.includes('video_on')) && isPositive) hasVideo = true;
                                                if ((qLower.includes('offer') || qLower.includes('commitment')) && isPositive) hasOffer = true;
                                              });
                                            }
                                            let reason = '';
                                            if (!has14Days) reason += 'Missed 14 Days commitment. ';
                                            if (!hasVideo) reason += 'Missed Video On commitment. ';
                                            if (!hasOffer) reason += 'Missed Offer commitment. ';
                                            insight = reason.trim() || 'Manually moved to pending.';
                                          }
                                          return (
                                            <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded p-1.5 max-w-[200px] text-left break-words">
                                              <span className="font-bold block">AI Flagged:</span>
                                              {insight}
                                            </div>
                                          );
                                        })()}
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => {
                                            setPendingLeadIds(prev => prev.filter(id => id !== lead.id));
                                            setApprovedLeadIds(prev => [...prev, lead.id]);
                                          }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">Approve</button>
                                          <button onClick={() => {
                                            setRejectedLeadIds(prev => [...prev, lead.id]);
                                          }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">Reject</button>
                                        </div>
                                      </div>
                                    )}
                                    {leadSubTab === 'pending' && isRejected && (
                                      <div className="flex items-center justify-end gap-2">
                                        <button onClick={() => {
                                          setPendingLeadIds(prev => prev.filter(id => id !== lead.id));
                                          setRejectedLeadIds(prev => prev.filter(id => id !== lead.id));
                                        }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">Archive</button>
                                        <button onClick={() => {
                                          setCrmLeadIds(prev => prev.filter(id => id !== lead.id));
                                          setPendingLeadIds(prev => prev.filter(id => id !== lead.id));
                                          setRejectedLeadIds(prev => prev.filter(id => id !== lead.id));
                                        }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">Delete</button>
                                      </div>
                                    )}
                                    {leadSubTab === 'approved' && !isRegistered && (
                                      <div className="flex flex-col items-end gap-2">
                                        {approvalAiInsights[lead.id] && (
                                          <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded p-1.5 max-w-[200px] text-left break-words">
                                            <span className="font-bold block">AI Flagged:</span>
                                            {approvalAiInsights[lead.id]}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          {approvalAiInsights[lead.id] && (
                                            <button onClick={() => {
                                              setApprovedLeadIds(prev => prev.filter(id => id !== lead.id));
                                              setPendingLeadIds(prev => [...prev, lead.id]);
                                              const newInsights = { ...approvalAiInsights };
                                              delete newInsights[lead.id];
                                              setApprovalAiInsights(newInsights);
                                            }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">Move to Pending</button>
                                          )}
                                          <button onClick={() => {
                                            setApprovedLeadIds(prev => prev.filter(id => id !== lead.id));
                                            setRegisteredLeadIds(prev => [...prev, lead.id]);
                                            if (approvalAiInsights[lead.id]) {
                                              const newInsights = { ...approvalAiInsights };
                                              delete newInsights[lead.id];
                                              setApprovalAiInsights(newInsights);
                                            }
                                          }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors">
                                            {approvalAiInsights[lead.id] ? 'Force Register' : 'Register'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {leadSubTab === 'approved' && isRegistered && (
                                      <div className="flex items-center justify-end">
                                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400">Registered</span>
                                      </div>
                                    )}
                                    {leadSubTab === 'registered' && !isClosed && (
                                      <div className="flex flex-col items-end gap-2">
                                        {registeredAiInsights[lead.id] && (
                                          <div className="text-[10px] text-red-600 bg-red-50 border border-red-100 rounded p-1.5 max-w-[200px] text-left break-words">
                                            <span className="font-bold block">AI Flagged:</span>
                                            {registeredAiInsights[lead.id]}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <button onClick={() => {
                                            setClosedLeadIds(prev => [...prev, lead.id]);
                                            if (registeredAiInsights[lead.id]) {
                                              const newInsights = { ...registeredAiInsights };
                                              delete newInsights[lead.id];
                                              setRegisteredAiInsights(newInsights);
                                            }
                                          }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                                            Approve
                                          </button>
                                          <button onClick={() => {
                                            setRegisteredLeadIds(prev => prev.filter(id => id !== lead.id));
                                            setPendingLeadIds(prev => [...prev, lead.id]);
                                            if (registeredAiInsights[lead.id]) {
                                              const newInsights = { ...registeredAiInsights };
                                              delete newInsights[lead.id];
                                              setRegisteredAiInsights(newInsights);
                                            }
                                          }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                                            Reject
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                    {leadSubTab === 'registered' && isClosed && (
                                      <div className="flex items-center justify-end">
                                        <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400">Closed</span>
                                      </div>
                                    )}
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
            </div>
          </div>
        )}

        {/* TAB 4: Leads Closing */}
        {activeTab === 'closing' && (
          <div className="max-w-7xl mx-auto animate-fade-in space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px]">
              
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Handshake size={18} className="text-emerald-500" />
                  Approved Leads Closing
                </h2>
                {renderBulkActions()}
              </div>

              {/* Data Table (5 Limited Columns) */}
              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-500 w-12">
                        <input 
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={leadsData.filter(l => registeredLeadIds.includes(l.id)).length > 0 && selectedRowIds.length === leadsData.filter(l => registeredLeadIds.includes(l.id)).length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRowIds(leadsData.filter(l => registeredLeadIds.includes(l.id)).map(l => l.id));
                            } else {
                              setSelectedRowIds([]);
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 font-bold text-slate-500">Name</th>
                      <th className="px-4 py-3 font-bold text-slate-500">WhatsApp</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Email</th>
                      <th className="px-4 py-3 font-bold text-slate-500">Country</th>
                      <th className="px-4 py-3 font-bold text-slate-500">City</th>
                      <th className="px-4 py-3 font-bold text-slate-500 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leadsData.filter(l => registeredLeadIds.includes(l.id)).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                          <h3 className="font-bold text-slate-700">No registered leads</h3>
                          <p className="text-sm text-slate-500 mt-1">Move leads to the Registered stage to see them here.</p>
                        </td>
                      </tr>
                    ) : (
                      leadsData.filter(l => registeredLeadIds.includes(l.id)).map(lead => {
                        const isClosed = closedLeadIds.includes(lead.id);
                        return (
                          <tr key={lead.id} className={`transition-colors ${isClosed ? 'bg-emerald-50/60 hover:bg-emerald-100/60' : 'bg-white hover:bg-slate-50'}`}>
                            <td className="px-4 py-4">
                              <input 
                                type="checkbox"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                checked={selectedRowIds.includes(lead.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedRowIds(prev => [...prev, lead.id]);
                                  } else {
                                    setSelectedRowIds(prev => prev.filter(id => id !== lead.id));
                                  }
                                }}
                              />
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-800">{lead.name || '-'}</td>
                            <td className="px-4 py-4 text-slate-600">{lead.mobile || lead.phoneNumber || '-'}</td>
                            <td className="px-4 py-4 text-slate-600">{lead.email || '-'}</td>
                            <td className="px-4 py-4 text-slate-600">{lead.country || '-'}</td>
                            <td className="px-4 py-4 text-slate-600">{lead.city || '-'}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex flex-col items-end gap-2">
                                <input
                                  type="datetime-local"
                                  className="rounded border px-2 py-1 text-sm bg-white"
                                  value={meetingSchedule[lead.id] || ''}
                                  onChange={e => setMeetingSchedule(prev => ({ ...prev, [lead.id]: e.target.value }))}
                                  placeholder="Zoom Date & Time"
                                />
                                <div className="flex items-center gap-2 w-full justify-end">
                                  <input
                                    type="number"
                                    min={1}
                                    className="w-16 rounded border px-2 py-1.5 text-xs bg-white"
                                    value={messageNumber[lead.id] ?? ''}
                                    onChange={e => setMessageNumber(prev => ({ ...prev, [lead.id]: Number(e.target.value) }))}
                                    placeholder="Msg #"
                                  />
                                  <button onClick={() => {
                                    setRegisteredLeadIds(prev => prev.filter(id => id !== lead.id));
                                    setPendingLeadIds(prev => [...prev, lead.id]);
                                    setClosedLeadIds(prev => prev.filter(id => id !== lead.id));
                                  }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">Pending</button>
                                  <button onClick={() => {
                                    if (isClosed) {
                                      setClosedLeadIds(prev => prev.filter(id => id !== lead.id));
                                    } else {
                                      if (!meetingSchedule[lead.id]) {
                                        toast.error("Please add a Zoom meeting date & time before closing.");
                                        return;
                                      }
                                      setClosedLeadIds(prev => [...prev, lead.id]);
                                    }
                                  }} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isClosed ? 'bg-slate-100 text-slate-400 hover:bg-slate-200' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                                    {isClosed ? 'Unclose' : 'Close'}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Message Templates */}
        {activeTab === 'templates' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">Create & Save Messages</h2>
                <button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105 transition-transform text-white font-bold px-5 py-2 rounded-lg flex items-center gap-2">
                  <Plus size={16} /> New Template
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors cursor-pointer">
                    <h3 className="font-bold text-slate-800 mb-2">Welcome Template {i}</h3>
                    <p className="text-sm text-slate-500 line-clamp-3">Hello [Name], welcome to our workshop! We are excited to have you onboard. Here is your zoom link...</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

            </>
          )}
        </main>
      </div>
      
      {/* Add New Batch Modal */}
      {isAddBatchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Add New Batch</h2>
              <button onClick={() => setIsAddBatchModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Batch Name</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  placeholder="e.g. Advanced Yoga Oct 2026" 
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Language</label>
                  <input type="text" placeholder="e.g. English" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Workshop Name</label>
                  <input type="text" placeholder="e.g. Morning Flow" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                  <input type="date" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Time</label>
                  <input type="time" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Duration</label>
                <input type="text" placeholder="e.g. 21 Days, 1 Month" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button onClick={() => setIsAddBatchModalOpen(false)} className="px-4 py-2 font-bold text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              <button 
                onClick={() => {
                  if (!newBatchName.trim()) {
                    toast.error('Please enter a batch name');
                    return;
                  }
                  const newBatch = {
                    id: `w${Date.now()}`,
                    name: newBatchName,
                    formId: '',
                    leads: 0
                  };
                  setWorkshops([newBatch, ...workshops]);
                  setNewBatchName('');
                  toast.success('New batch created successfully!');
                  setIsAddBatchModalOpen(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg transition-colors"
              >
                Create Batch
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Webhook Setup Modal */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Google Form Webhook Setup</h3>
                <p className="text-sm text-slate-500 mt-1">Get real-time submissions instantly.</p>
              </div>
              <button onClick={() => setIsWebhookModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Step 1: Open Google Form Script Editor</h4>
                <p className="text-sm text-slate-600">Open your Google Form. Click the three dots (More) in the top right, and select <strong>Script editor</strong>.</p>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Step 2: Paste this code</h4>
                <p className="text-sm text-slate-600">Replace the default code with this snippet. Be sure to replace the `WORKSHOP_ID` placeholder with your actual form ID (e.g. {linkedFormId || 'YOUR_FORM_ID'}).</p>
                <pre className="bg-slate-900 text-slate-50 p-4 rounded-xl text-xs overflow-x-auto">
{`function onFormSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var latestResponse = responses[responses.length - 1];
  var itemResponses = latestResponse.getItemResponses();
  
  var payload = {
    email: latestResponse.getRespondentEmail()
  };
  
  for (var i = 0; i < itemResponses.length; i++) {
    var title = itemResponses[i].getItem().getTitle();
    var response = itemResponses[i].getResponse();
    payload[title] = response;
  }
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };
  
  // Update with your live server domain when deploying
  var webhookUrl = "https://app.swaryoga.com/api/admin/webhooks/google-form?workshopId=${encodeURIComponent(linkedFormId || 'YOUR_FORM_ID')}";
  UrlFetchApp.fetch(webhookUrl, options);
}`}
                </pre>
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800">Step 3: Set up the Trigger</h4>
                <p className="text-sm text-slate-600">Click the clock icon (Triggers) on the left sidebar. Click <strong>Add Trigger</strong>. Choose <code>onFormSubmit</code> for the function, and <code>On form submit</code> for the event type. Save and grant permissions.</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setIsWebhookModalOpen(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* AI-4 Instructions Modal */}
      {isAi4RulesOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setIsAi4RulesOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">🤖 AI-4 Instructions</h3>
                <p className="text-sm text-slate-500 mt-1">Tell AI-4 what to do when processing leads</p>
              </div>
              <button onClick={() => setIsAi4RulesOpen(false)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">⏱ Auto-Fetch Interval</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={ai4Interval}
                    onChange={(e) => setAi4Interval(Number(e.target.value))}
                    className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    min={1}
                  />
                  <span className="text-sm text-slate-500">seconds between each fetch</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">📋 Instructions for AI-4</label>
                <p className="text-xs text-slate-400">Write your rules here. AI-4 will follow these instructions when processing incoming leads.</p>
                <textarea 
                  value={ai4FormatRules}
                  onChange={(e) => setAi4FormatRules(e.target.value)}
                  placeholder={"Example instructions:\n• Ignore leads without phone numbers\n• Capitalize all names\n• Mark leads from India as priority\n• Auto-reject if age < 18\n• Add tag 'VIP' if profession is Doctor\n• Send WhatsApp welcome message to new leads"}
                  className="w-full border border-slate-300 rounded-lg px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[180px] font-mono"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <strong>💡 Tip:</strong> Be specific! Write each rule on a new line. AI-4 will apply these rules every time it fetches or processes leads.
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button 
                onClick={() => {
                  setAi4FormatRules('');
                  toast.success('Instructions cleared');
                }}
                className="text-sm text-slate-500 hover:text-red-600 transition-colors"
              >
                Clear All
              </button>
              <button 
                onClick={() => {
                  toast.success('✅ AI-4 Instructions saved!');
                  setIsAi4RulesOpen(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-lg transition-colors"
              >
                Save Instructions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
