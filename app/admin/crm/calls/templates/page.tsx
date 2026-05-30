'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  PhoneIncoming, PhoneOutgoing, Plus,
  Edit3, Trash2, X, ChevronRight,
  Save, RefreshCw, ArrowLeft, Bot, Loader2,
  Mic, FileText, Shield, ShieldCheck, ShieldAlert,
  Send, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle,
  Upload, Volume2, Play, Pause, Square, ThumbsUp,
  MessageCircle, CalendarClock, Zap, Copy, ChevronDown,
} from 'lucide-react';

// ── Colors ──
const C = {
  indigo:  { main: '#6366F1', light: '#818CF8', bg: 'rgba(99,102,241,0.08)' },
  blue:    { main: '#3B82F6', light: '#60A5FA', bg: 'rgba(59,130,246,0.08)' },
  emerald: { main: '#10B981', light: '#34D399', bg: 'rgba(16,185,129,0.08)' },
  amber:   { main: '#F59E0B', light: '#FBBF24', bg: 'rgba(245,158,11,0.08)' },
  orange:  { main: '#F97316', light: '#FB923C', bg: 'rgba(249,115,22,0.08)' },
  pink:    { main: '#EC4899', light: '#F472B6', bg: 'rgba(236,72,153,0.08)' },
  violet:  { main: '#8B5CF6', light: '#A78BFA', bg: 'rgba(139,92,246,0.08)' },
  red:     { main: '#EF4444', light: '#F87171', bg: 'rgba(239,68,68,0.08)' },
  gray:    { main: '#6B7280', light: '#9CA3AF', bg: 'rgba(107,114,128,0.08)' },
};

const LANGUAGES = [
  { key: 'hi', label: 'Hindi',      flag: '🇮🇳', color: C.orange },
  { key: 'en', label: 'English',    flag: '🇬🇧', color: C.blue },
  { key: 'mr', label: 'Marathi',    flag: '🇮🇳', color: C.emerald },
  { key: 'ne', label: 'Nepali',     flag: '🇳🇵', color: C.pink },
  { key: 'zh', label: 'Mandarin',   flag: '🇨🇳', color: C.red },
  { key: 'es', label: 'Spanish',    flag: '🇪🇸', color: C.amber },
  { key: 'fr', label: 'French',     flag: '🇫🇷', color: C.indigo },
  { key: 'ar', label: 'Arabic',     flag: '🇸🇦', color: C.emerald },
  { key: 'de', label: 'German',     flag: '🇩🇪', color: C.gray },
  { key: 'pt', label: 'Portuguese', flag: '🇧🇷', color: C.emerald },
  { key: 'ja', label: 'Japanese',   flag: '🇯🇵', color: C.red },
  { key: 'ko', label: 'Korean',     flag: '🇰🇷', color: C.blue },
  { key: 'ru', label: 'Russian',    flag: '🇷🇺', color: C.indigo },
  { key: 'it', label: 'Italian',    flag: '🇮🇹', color: C.emerald },
  { key: 'tr', label: 'Turkish',    flag: '🇹🇷', color: C.red },
  { key: 'nl', label: 'Dutch',      flag: '🇳🇱', color: C.orange },
  { key: 'sv', label: 'Swedish',    flag: '🇸🇪', color: C.blue },
  { key: 'th', label: 'Thai',       flag: '🇹🇭', color: C.violet },
  { key: 'id', label: 'Indonesian', flag: '🇮🇩', color: C.red },
  { key: 'multi', label: 'Multi',   flag: '🌐', color: C.violet },
];

// Subset for header tabs (most used)
const HEADER_LANGUAGES = ['hi', 'en', 'mr', 'ne', 'multi'];

// All languages for dropdown in form
const ALL_LANGUAGES = LANGUAGES;

const OUTBOUND_STAGES = [
  { order: 1, key: 'ob_welcome',   name: 'Welcome Call',      icon: '👋' },
  { order: 2, key: 'ob_follow_up', name: 'Follow-Up',         icon: '🔄' },
  { order: 3, key: 'ob_answer',    name: 'Answer Questions',  icon: '💬' },
  { order: 4, key: 'ob_workshop',  name: 'Workshop Reminder', icon: '🧘' },
  { order: 5, key: 'ob_collect',   name: 'Collect Info',      icon: '📋' },
  { order: 6, key: 'ob_payment',   name: 'Payment Reminder',  icon: '💰' },
  { order: 7, key: 'ob_info',      name: 'Information Call',  icon: 'ℹ️' },
];

const INBOUND_STAGES = [
  { order: 1, key: 'ib_greeting',   name: 'Greeting',    icon: '🙏' },
  { order: 2, key: 'ib_enquiry',    name: 'Enquiry',     icon: '❓' },
  { order: 3, key: 'ib_support',    name: 'Support',     icon: '🛟' },
  { order: 4, key: 'ib_booking',    name: 'Booking',     icon: '📅' },
  { order: 5, key: 'ib_feedback',   name: 'Feedback',    icon: '⭐' },
  { order: 6, key: 'ib_escalation', name: 'Escalation',  icon: '🚨' },
];

const APPROVAL_BADGES: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
  draft:    { label: 'Draft',    color: C.gray.main,    bg: C.gray.bg,    Icon: Edit3 },
  pending:  { label: 'Pending',  color: C.amber.main,   bg: C.amber.bg,   Icon: Clock },
  approved: { label: 'Approved', color: C.emerald.main, bg: C.emerald.bg, Icon: CheckCircle },
  rejected: { label: 'Rejected', color: C.red.main,     bg: C.red.bg,     Icon: XCircle },
};

interface Template {
  _id: string;
  key: string;
  name: string;
  description: string;
  category: 'outbound' | 'inbound';
  language: string;
  stageOrder: number;
  promptText: string;
  callMode: 'info_only' | 'interactive' | 'qa_interactive';
  voiceRecordingUrl: string;
  voiceRecordingName: string;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected';
  approvalNote: string;
  approvedBy?: string;
  approvedAt?: string;
  submittedAt?: string;
  isActive: boolean;
  isDefault: boolean;
  variables: string[];
  tags: string[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function CallTemplatesPage() {
  const token = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [activeLang, setActiveLang] = useState('hi');
  const [activeCategory, setActiveCategory] = useState<'outbound' | 'inbound'>('outbound');

  // Selection & editing
  const [selectedId, setSelectedId] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editStage1, setEditStage1] = useState('');
  const [editStage2, setEditStage2] = useState('');
  const [editStage3, setEditStage3] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editCallMode, setEditCallMode] = useState<'info_only' | 'interactive' | 'qa_interactive'>('interactive');
  const [approvalNote, setApprovalNote] = useState('');

  // Test call
  const [showTestCall, setShowTestCall] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testCalling, setTestCalling] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Add new head modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHead, setNewHead] = useState({ name: '', category: 'outbound' as 'outbound' | 'inbound', icon: '📞' });

  // Sidebar active item
  const [activeSidebarKey, setActiveSidebarKey] = useState('');

  // Detail split-pane view state
  const [detailTemplateKey, setDetailTemplateKey] = useState('');
  const [userQueries, setUserQueries] = useState<Array<{
    _id?: string; query: string; response: string; scheduledAt: string;
    status: 'pending' | 'scheduled' | 'completed' | 'cancelled'; createdAt?: string;
  }>>([]);
  const [newQuery, setNewQuery] = useState('');
  const [newResponse, setNewResponse] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [queriesLoading, setQueriesLoading] = useState(false);

  // ── New Head Form Fields ──
  const [formLang, setFormLang] = useState('hi');
  const [formCallingNumber, setFormCallingNumber] = useState('');
  const [formAIAgent, setFormAIAgent] = useState('');
  const [formDos, setFormDos] = useState<string[]>([
    'Greet the lead warmly by name',
    'Introduce yourself and Swar Yoga clearly',
    'Listen actively and let the lead speak',
    'Ask open-ended questions to understand their needs',
    'Highlight benefits relevant to their situation',
    'Use a calm, friendly and professional tone',
    'Confirm understanding by summarizing key points',
    'Offer a clear next step (demo, workshop, trial)',
    'Thank them for their time at the end',
    'Log call notes immediately after the call',
  ]);
  const [formDonts, setFormDonts] = useState<string[]>([
    'Do not interrupt the lead while they are speaking',
    'Do not use aggressive or pushy sales language',
    'Do not make false promises or guarantees',
    'Do not argue or get defensive with objections',
    'Do not share pricing without proper context',
    'Do not badmouth competitors',
    'Do not skip the greeting or introduction',
    'Do not read the script robotically — be natural',
    'Do not share personal opinions on unrelated topics',
  ]);
  const [formRules, setFormRules] = useState<string[]>([
    'Always verify lead identity before sharing details',
    'Follow the 3-stage script: Opening → Main → Closing',
    'Record call outcome in CRM within 5 minutes',
    'All calls must be made from KYC verified numbers only',
    '── CALLING SCHEDULE ──',
    '1st Call: Call immediately (scheduled or now). If picked up → mark as DONE ✅',
    '2nd Call: If 1st not picked up → retry after 2 MINUTES',
    '3rd Call: If 2nd not picked up → retry after 3 HOURS',
    '4th Call: If 3rd not picked up → retry after 3 HOURS again',
    'After 4 failed attempts → auto-convert lead to INACTIVE status',
    'Admin can manually reschedule an inactive lead for calling again',
    '── GENERAL RULES ──',
    'System can only place calls between 9:00 AM – 8:00 PM IST (Asia/Kolkata)',
    'Escalate unresolved queries to senior within 24 hours',
    'Get verbal consent before sending WhatsApp messages',
    'Report any abusive or threatening leads immediately',
    'Review and follow admin-approved script versions only',
  ]);
  const [formDraft1, setFormDraft1] = useState(`Hello {{leadName}}, this is Sakshi from Swar Yoga.
Thank you so much for filling out our form on social media — we really appreciate your interest!
I'm calling to personally welcome you and help you get started on your yoga journey with us.`);
  const [formDraft2, setFormDraft2] = useState(`We have added you in our system and you're all set to explore what Swar Yoga has to offer.
We offer personalized yoga sessions, wellness programs, and workshops designed for all levels — whether you're a complete beginner or experienced practitioner.
Based on your form, I'd love to understand what you're looking for — are you interested in daily practice, stress relief, flexibility, or something specific?
[Listen and respond accordingly]
We have an upcoming free trial session / workshop that I think would be perfect for you. Can I share the details?`);
  const [formDraft3, setFormDraft3] = useState(`Thank you for your time, {{leadName}}. It was wonderful speaking with you!
I'll send you the details on WhatsApp shortly — feel free to reach out to us anytime if you have any questions.
We're excited to have you as part of the Swar Yoga family. Namaste! 🙏`);
  const [formVoiceUrl, setFormVoiceUrl] = useState('');
  const [formVoiceName, setFormVoiceName] = useState('');
  const [formAdminApproval, setFormAdminApproval] = useState(false);
  const [formNextInstructions, setFormNextInstructions] = useState('');
  const [voiceGenerating, setVoiceGenerating] = useState(false);
  const [voiceGenStatus, setVoiceGenStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [voiceGenError, setVoiceGenError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceApproved, setVoiceApproved] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Duplicate modal state ──
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Template | null>(null);
  const [dupName, setDupName] = useState('');
  const [dupLang, setDupLang] = useState('hi');
  const [dupAgent, setDupAgent] = useState('');
  const [dupSaving, setDupSaving] = useState(false);
  const [dupTranslating, setDupTranslating] = useState(false);
  const [dupTranslatedPrompt, setDupTranslatedPrompt] = useState('');
  const [dupTranslatedDesc, setDupTranslatedDesc] = useState('');
  const [dupTranslatedName, setDupTranslatedName] = useState('');

  // KYC verified calling numbers (system numbers)
  const CALLING_NUMBERS = [
    { value: '+19562537676', label: '+1 (956) 253-7676', tag: 'Retell AI — US', verified: true },
    { value: '+919779006820', label: '+91 97790 06820', tag: 'WhatsApp — India', verified: true },
    { value: '+919779006820', label: '+91 97790 06820', tag: 'PC Calling — India', verified: true },
    { value: '09513886363', label: '095-138-86363', tag: 'Exotel TTS — India (Info Only)', verified: true },
  ];

  // AI Voice Agents (fetched from Retell AI + fallback defaults)
  const [retellAgents, setRetellAgents] = useState<Array<{ agent_id: string; agent_name: string; language?: string; voice_id?: string; [key: string]: any }>>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Fetch Retell AI agents
  const fetchRetellAgents = useCallback(async () => {
    if (!token) return;
    setAgentsLoading(true);
    try {
      const res = await fetch('/api/admin/crm/calls?action=list_agents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.agents) {
        setRetellAgents(Array.isArray(data.data.agents) ? data.data.agents : []);
      }
    } catch (err) {
      console.error('Failed to fetch Retell agents:', err);
    } finally {
      setAgentsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchRetellAgents();
  }, [token, fetchRetellAgents]);

  // Auto-select agent from URL query param or first agent
  useEffect(() => {
    if (retellAgents.length === 0) return;
    const agentFromUrl = searchParams.get('agent');
    if (agentFromUrl) {
      const found = retellAgents.find(a => a.agent_id === agentFromUrl);
      if (found) setFormAIAgent(agentFromUrl);
    } else if (!formAIAgent) {
      // Auto-select first agent if none selected
      setFormAIAgent(retellAgents[0].agent_id);
    }
  }, [searchParams, retellAgents]);

  // Helper to reset form
  const resetForm = () => {
    setNewHead({ name: '', category: 'outbound', icon: '📞' });
    setFormLang('hi');
    setFormCallingNumber('');
    setFormAIAgent('');
    setFormDos([
      'Greet the lead warmly by name',
      'Introduce yourself and Swar Yoga clearly',
      'Listen actively and let the lead speak',
      'Ask open-ended questions to understand their needs',
      'Highlight benefits relevant to their situation',
      'Use a calm, friendly and professional tone',
      'Confirm understanding by summarizing key points',
      'Offer a clear next step (demo, workshop, trial)',
      'Thank them for their time at the end',
      'Log call notes immediately after the call',
    ]);
    setFormDonts([
      'Do not interrupt the lead while they are speaking',
      'Do not use aggressive or pushy sales language',
      'Do not make false promises or guarantees',
      'Do not argue or get defensive with objections',
      'Do not share pricing without proper context',
      'Do not badmouth competitors',
      'Do not skip the greeting or introduction',
      'Do not read the script robotically — be natural',
      'Do not share personal opinions on unrelated topics',
    ]);
    setFormRules([
      'Always verify lead identity before sharing details',
      'Follow the 3-stage script: Opening → Main → Closing',
      'Record call outcome in CRM within 5 minutes',
      'All calls must be made from KYC verified numbers only',
      '── CALLING SCHEDULE ──',
      '1st Call: Call immediately (scheduled or now). If picked up → mark as DONE ✅',
      '2nd Call: If 1st not picked up → retry after 2 MINUTES',
      '3rd Call: If 2nd not picked up → retry after 3 HOURS',
      '4th Call: If 3rd not picked up → retry after 3 HOURS again',
      'After 4 failed attempts → auto-convert lead to INACTIVE status',
      'Admin can manually reschedule an inactive lead for calling again',
      '── GENERAL RULES ──',
      'System can only place calls between 9:00 AM – 8:00 PM IST (Asia/Kolkata)',
      'Escalate unresolved queries to senior within 24 hours',
      'Get verbal consent before sending WhatsApp messages',
      'Report any abusive or threatening leads immediately',
      'Review and follow admin-approved script versions only',
    ]);
    setFormDraft1(`Hello {{leadName}}, this is Sakshi from Swar Yoga.
Thank you so much for filling out our form on social media — we really appreciate your interest!
I'm calling to personally welcome you and help you get started on your yoga journey with us.`);
    setFormDraft2(`We have added you in our system and you're all set to explore what Swar Yoga has to offer.
We offer personalized yoga sessions, wellness programs, and workshops designed for all levels — whether you're a complete beginner or experienced practitioner.
Based on your form, I'd love to understand what you're looking for — are you interested in daily practice, stress relief, flexibility, or something specific?
[Listen and respond accordingly]
We have an upcoming free trial session / workshop that I think would be perfect for you. Can I share the details?`);
    setFormDraft3(`Thank you for your time, {{leadName}}. It was wonderful speaking with you!
I'll send you the details on WhatsApp shortly — feel free to reach out to us anytime if you have any questions.
We're excited to have you as part of the Swar Yoga family. Namaste! 🙏`);
    setFormVoiceUrl('');
    setFormVoiceName('');
    setFormAdminApproval(false);
    setFormNextInstructions('');
    setVoiceGenerating(false);
    setVoiceGenStatus('idle');
    setVoiceGenError('');
    setIsPlaying(false);
    setVoiceApproved(false);
    if (speechRef.current) window.speechSynthesis.cancel();
  };

  // ── Generate AI Voice from draft text ──
  const handleGenerateVoice = async () => {
    if (!token) return;
    const fullText = [formDraft1, formDraft2, formDraft3].filter(Boolean).join('\n\n');
    if (!fullText.trim()) { alert('Please write at least one draft message stage first.'); return; }
    setVoiceGenerating(true);
    setVoiceGenStatus('generating');
    setVoiceGenError('');
    try {
      const langLabel = ALL_LANGUAGES.find(l => l.key === formLang)?.label || 'Hindi';
      const res = await fetch('/api/admin/crm/calls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_voice',
          leadId: 'demo_template_preview',
          purpose: 'template_voice_generation',
          text: fullText,
          language: formLang,
          languageLabel: langLabel,
          callingNumber: formCallingNumber,
          templateName: newHead.name || 'Untitled',
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.voiceUrl) {
        setFormVoiceUrl(data.data.voiceUrl);
        const selectedAgent = retellAgents.find(a => a.agent_id === formAIAgent);
        const voiceLabel = selectedAgent?.voice_id ? selectedAgent.voice_id.split('-').slice(1).join('-') : '';
        const agentVoiceName = selectedAgent?.agent_name
          ? `${selectedAgent.agent_name}${voiceLabel ? ` • ${voiceLabel}` : ''} — ${langLabel}`
          : `AI Voice — ${langLabel}`;
        setFormVoiceName(data.data.voiceName || agentVoiceName);
        setVoiceGenStatus('success');
      } else {
        setVoiceGenStatus('error');
        setVoiceGenError(data.error || 'Voice generation not available yet. Use manual URL for now.');
      }
    } catch (err) {
      console.error(err);
      setVoiceGenStatus('error');
      setVoiceGenError('Network error. Try again or add voice recording URL manually.');
    } finally {
      setVoiceGenerating(false);
    }
  };

  // Checkbox selection
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const checkedCount = checkedIds.size;



  // ── Fetch ──
  const fetchTemplates = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/crm/calls/templates?language=${activeLang}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTemplates(data.data.templates || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, activeLang]);

  useEffect(() => { fetchTemplates(); }, [token, activeLang]);

  // ── Derived ──
  const outbound = templates.filter(t => t.category === 'outbound').sort((a, b) => a.stageOrder - b.stageOrder);
  const inbound = templates.filter(t => t.category === 'inbound').sort((a, b) => a.stageOrder - b.stageOrder);
  const predefinedStages = activeCategory === 'outbound' ? OUTBOUND_STAGES : INBOUND_STAGES;
  const stageTemplates = activeCategory === 'outbound' ? outbound : inbound;
  const selected = templates.find(t => t._id === selectedId) || null;

  // Merge predefined stages with any custom templates that don't match predefined keys
  const predefinedKeys = new Set(predefinedStages.map(s => s.key));
  const customStages = stageTemplates
    .filter(t => !predefinedKeys.has(t.key))
    .map(t => ({ key: t.key, name: t.name, icon: '📞' }));
  const stages = [...predefinedStages, ...customStages];

  // Custom templates dropdown open/close
  const [customDropdownOpen, setCustomDropdownOpen] = useState(true);



  // ── Parse 3-stage prompt into individual stages ──
  const parseStages = (prompt: string) => {
    const s1 = prompt.match(/--- STAGE 1: OPENING ---\n([\s\S]*?)(?=\n\n--- STAGE 2:|$)/);
    const s2 = prompt.match(/--- STAGE 2: MAIN CONTENT ---\n([\s\S]*?)(?=\n\n--- STAGE 3:|$)/);
    const s3 = prompt.match(/--- STAGE 3: CLOSING ---\n([\s\S]*?)$/);
    return {
      stage1: s1?.[1]?.trim() || (prompt && !s1 ? prompt : ''),
      stage2: s2?.[1]?.trim() || '',
      stage3: s3?.[1]?.trim() || '',
    };
  };

  // ── Combine 3 stages into promptText ──
  const combineStages = (s1: string, s2: string, s3: string) => {
    const parts = [s1, s2, s3].filter(Boolean);
    if (parts.length === 0) return '';
    return `--- STAGE 1: OPENING ---\n${s1}\n\n--- STAGE 2: MAIN CONTENT ---\n${s2}\n\n--- STAGE 3: CLOSING ---\n${s3}`;
  };

  // ── Select template ──
  const selectTemplate = (t: Template, openEdit = false) => {
    setSelectedId(t._id);
    const prompt = t.promptText || '';
    setEditPrompt(prompt);
    const { stage1, stage2, stage3 } = parseStages(prompt);
    setEditStage1(stage1);
    setEditStage2(stage2);
    setEditStage3(stage3);
    setEditCallMode((t.callMode as any) || 'interactive');
    setEditMode(openEdit);
    setApprovalNote('');
    setActiveCategory(t.category);
  };

  // ── Open template in the Add/Edit form (pre-filled) ──
  const openTemplateForm = (t: Template) => {
    setSelectedId('');
    setActiveSidebarKey(t.key);
    setNewHead({ name: t.name, category: t.category, icon: '📞' });
    setFormLang(t.language || 'hi');
    setActiveCategory(t.category);

    // Parse description for dos/donts/rules
    const desc = t.description || '';
    const dosMatch = desc.match(/DO'S:\n([\s\S]*?)(?=\n\nDON'TS:|\n\nRULES:|\n\nCALLING NUMBER:|\n\nNEXT INSTRUCTIONS:|$)/);
    const dontsMatch = desc.match(/DON'TS:\n([\s\S]*?)(?=\n\nRULES:|\n\nCALLING NUMBER:|\n\nNEXT INSTRUCTIONS:|$)/);
    const rulesMatch = desc.match(/RULES:\n([\s\S]*?)(?=\n\nCALLING NUMBER:|\n\nNEXT INSTRUCTIONS:|$)/);
    const callingMatch = desc.match(/CALLING NUMBER:\s*(.+)/);
    const nextMatch = desc.match(/NEXT INSTRUCTIONS:\n([\s\S]*?)$/);

    const parseBullets = (text: string | undefined) => {
      if (!text) return [''];
      const items = text.split('\n').map(l => l.replace(/^[✅❌📋]\s*\d+\.\s*/, '').trim()).filter(Boolean);
      return items.length > 0 ? items : [''];
    };

    setFormDos(parseBullets(dosMatch?.[1]));
    setFormDonts(parseBullets(dontsMatch?.[1]));
    setFormRules(parseBullets(rulesMatch?.[1]));
    setFormCallingNumber(callingMatch?.[1]?.trim() || '');
    setFormNextInstructions(nextMatch?.[1]?.trim() || '');

    // Parse promptText for 3 stages
    const prompt = t.promptText || '';
    const stage1Match = prompt.match(/--- STAGE 1: OPENING ---\n([\s\S]*?)(?=\n\n--- STAGE 2:|$)/);
    const stage2Match = prompt.match(/--- STAGE 2: MAIN CONTENT ---\n([\s\S]*?)(?=\n\n--- STAGE 3:|$)/);
    const stage3Match = prompt.match(/--- STAGE 3: CLOSING ---\n([\s\S]*?)$/);
    setFormDraft1(stage1Match?.[1]?.trim() || (prompt && !stage1Match ? prompt : ''));
    setFormDraft2(stage2Match?.[1]?.trim() || '');
    setFormDraft3(stage3Match?.[1]?.trim() || '');

    setFormVoiceUrl(t.voiceRecordingUrl || '');
    setFormVoiceName(t.voiceRecordingName || '');
    setFormAdminApproval(false);
    setVoiceGenStatus('idle');
    setVoiceGenError('');

    setShowAddModal(true);
  };

  // ── Test Call (Exotel TTS) ──
  const handleTestCall = async () => {
    if (!token || !selected || !testPhone.trim()) return;
    setTestCalling(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/crm/calls/exotel/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: testPhone.trim(), templateId: selected._id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setTestResult({ ok: true, msg: json.data?.message || 'Call initiated!' });
      } else {
        setTestResult({ ok: false, msg: json.error?.message || json.message || 'Call failed' });
      }
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message });
    }
    setTestCalling(false);
  };

  // ── Save text ──
  const handleSaveText = async () => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      // Combine the 3 stages into final promptText
      const combinedPrompt = combineStages(editStage1, editStage2, editStage3);
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, promptText: combinedPrompt, callMode: editCallMode }),
      });
      const data = await res.json();
      if (data.success) {
        // Sync editPrompt with the saved value
        setEditPrompt(combinedPrompt);
        await fetchTemplates();
        setEditMode(false);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Submit for approval ──
  const handleSubmit = async () => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, action: 'submit' }),
      });
      await fetchTemplates();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Approve / Reject ──
  const handleApproval = async (decision: 'approve' | 'reject') => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, action: decision, approvalNote }),
      });
      await fetchTemplates();
      setApprovalNote('');
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Voice recording URL save ──
  const handleSaveVoice = async (url: string, name: string) => {
    if (!selected || !token) return;
    setSaving(true);
    try {
      await fetch('/api/admin/crm/calls/templates', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected._id, voiceRecordingUrl: url, voiceRecordingName: name }),
      });
      await fetchTemplates();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Delete template ──
  const handleDeleteTemplate = async (id: string) => {
    if (!token) return;
    if (!confirm('Are you sure you want to delete this calling head?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        if (selectedId === id) setSelectedId('');
        checkedIds.delete(id);
        setCheckedIds(new Set(checkedIds));
        await fetchTemplates();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Bulk delete checked ──
  const handleBulkDelete = async () => {
    if (!token || checkedCount === 0) return;
    if (!confirm(`Delete ${checkedCount} selected head(s)?`)) return;
    setSaving(true);
    try {
      for (const id of checkedIds) {
        await fetch('/api/admin/crm/calls/templates', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
      }
      setCheckedIds(new Set());
      setSelectedId('');
      await fetchTemplates();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Edit checked (open first checked item in edit mode) ──
  const handleEditChecked = () => {
    if (checkedCount === 0) return;
    const firstId = Array.from(checkedIds)[0];
    const tmpl = templates.find(t => t._id === firstId);
    if (tmpl) {
      selectTemplate(tmpl, true);
      setCheckedIds(new Set());
    }
  };

  // ── Create new calling head ──
  const handleCreateHead = async () => {
    if (!token || !newHead.name.trim()) return;
    setSaving(true);
    try {
      const key = newHead.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const prefix = newHead.category === 'outbound' ? 'ob' : 'ib';
      const fullKey = `${prefix}_${key}`;
      const catTemplates = templates.filter(t => t.category === newHead.category);
      const stageOrder = catTemplates.length + 1;

      // Combine draft messages into full prompt text
      const draftParts = [formDraft1, formDraft2, formDraft3].filter(Boolean);
      const promptText = draftParts.length > 0
        ? `--- STAGE 1: OPENING ---\n${formDraft1}\n\n--- STAGE 2: MAIN CONTENT ---\n${formDraft2}\n\n--- STAGE 3: CLOSING ---\n${formDraft3}`
        : '';

      // Build description from dos/donts/rules
      const dosText = formDos.filter(Boolean).map((d, i) => `✅ ${i + 1}. ${d}`).join('\n');
      const dontsText = formDonts.filter(Boolean).map((d, i) => `❌ ${i + 1}. ${d}`).join('\n');
      const rulesText = formRules.filter(Boolean).map((r, i) => `📋 ${i + 1}. ${r}`).join('\n');
      const guidelines = [
        dosText && `DO'S:\n${dosText}`,
        dontsText && `DON'TS:\n${dontsText}`,
        rulesText && `RULES:\n${rulesText}`,
        formCallingNumber && `CALLING NUMBER: ${formCallingNumber}`,
        formNextInstructions && `NEXT INSTRUCTIONS:\n${formNextInstructions}`,
      ].filter(Boolean).join('\n\n');

      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: fullKey,
          name: newHead.name.trim(),
          category: newHead.category,
          language: formLang,
          stageOrder,
          description: guidelines,
          promptText,
          voiceRecordingUrl: formVoiceUrl || '',
          voiceRecordingName: formVoiceName || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        // If admin approval checkbox checked, submit for approval
        if (formAdminApproval && data.data?._id) {
          await fetch('/api/admin/crm/calls/templates', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: data.data._id, action: 'submit' }),
          });
        }
        // Auto-select the newly created template
        const newId = data.data?._id;
        setActiveLang(formLang);
        setActiveCategory(newHead.category);
        // Fetch with correct language (fetchTemplates uses activeLang from closure,
        // so fetch directly with the form language)
        try {
          const fetchRes = await fetch(`/api/admin/crm/calls/templates?language=${formLang}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const fetchData = await fetchRes.json();
          if (fetchData.success) {
            setTemplates(fetchData.data.templates || []);
            if (newId) {
              setSelectedId(newId);
              const created = (fetchData.data.templates || []).find((t: any) => t._id === newId);
              if (created) {
                const prompt = created.promptText || '';
                setEditPrompt(prompt);
                const { stage1, stage2, stage3 } = parseStages(prompt);
                setEditStage1(stage1);
                setEditStage2(stage2);
                setEditStage3(stage3);
              }
            }
          }
        } catch { await fetchTemplates(); }
        setShowAddModal(false);
        resetForm();
      } else {
        alert(data.error || 'Failed to create');
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Duplicate a template ──
  const openDuplicateModal = (t: Template) => {
    setDuplicateSource(t);
    setDupName(`${t.name} (Copy)`);
    setDupLang(t.language || 'hi');
    setDupAgent(formAIAgent || (retellAgents.length > 0 ? retellAgents[0].agent_id : ''));
    setDupTranslatedPrompt('');
    setDupTranslatedDesc('');
    setDupTranslatedName('');
    setShowDuplicateModal(true);
  };

  // Auto-translate when language changes in duplicate modal
  useEffect(() => {
    if (!showDuplicateModal || !duplicateSource || !token) return;
    // Same language → use original
    if (dupLang === duplicateSource.language) {
      setDupTranslatedPrompt('');
      setDupTranslatedDesc('');
      setDupTranslatedName('');
      setDupName(`${duplicateSource.name} (Copy)`);
      return;
    }
    // Translate prompt, description, and name
    const translateAll = async () => {
      setDupTranslating(true);
      try {
        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const body = (text: string) => JSON.stringify({ text, sourceLang: duplicateSource.language, targetLang: dupLang });
        const calls: Promise<any>[] = [];
        // Translate prompt text
        if (duplicateSource.promptText) {
          calls.push(fetch('/api/cloud-translate', { method: 'POST', headers, body: body(duplicateSource.promptText) }).then(r => r.json()));
        } else { calls.push(Promise.resolve({ translatedText: '' })); }
        // Translate description (dos/donts/rules)
        if (duplicateSource.description) {
          calls.push(fetch('/api/cloud-translate', { method: 'POST', headers, body: body(duplicateSource.description) }).then(r => r.json()));
        } else { calls.push(Promise.resolve({ translatedText: '' })); }
        // Translate name
        calls.push(fetch('/api/cloud-translate', { method: 'POST', headers, body: body(duplicateSource.name) }).then(r => r.json()));

        const [promptRes, descRes, nameRes] = await Promise.all(calls);
        if (promptRes.translatedText) setDupTranslatedPrompt(promptRes.translatedText);
        if (descRes.translatedText) setDupTranslatedDesc(descRes.translatedText);
        if (nameRes.translatedText) {
          const translated = nameRes.translatedText;
          setDupTranslatedName(translated);
          setDupName(`${translated} (Copy)`);
        }
      } catch (err) { console.error('Translation failed:', err); }
      finally { setDupTranslating(false); }
    };
    translateAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dupLang, showDuplicateModal]);

  const handleDuplicate = async () => {
    if (!token || !duplicateSource || !dupName.trim()) return;
    setDupSaving(true);
    try {
      const key = dupName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const prefix = duplicateSource.category === 'outbound' ? 'ob' : 'ib';
      const fullKey = `${prefix}_${key}_${Date.now().toString(36)}`;
      const catTemplates = templates.filter(t => t.category === duplicateSource.category);
      const stageOrder = catTemplates.length + 1;

      const res = await fetch('/api/admin/crm/calls/templates', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: fullKey,
          name: dupName.trim(),
          category: duplicateSource.category,
          language: dupLang,
          stageOrder,
          description: dupTranslatedDesc || duplicateSource.description || '',
          promptText: dupTranslatedPrompt || duplicateSource.promptText || '',
          voiceRecordingUrl: duplicateSource.voiceRecordingUrl || '',
          voiceRecordingName: duplicateSource.voiceRecordingName || '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveLang(dupLang);
        setActiveCategory(duplicateSource.category);
        await fetchTemplates();
        setShowDuplicateModal(false);
        setDuplicateSource(null);
      } else {
        alert(data.error || 'Failed to duplicate');
      }
    } catch (err) { console.error(err); }
    finally { setDupSaving(false); }
  };

  // ── Fetch call workflows (user queries) for a template ──
  const fetchQueriesForTemplate = useCallback(async (templateKey: string) => {
    if (!token) return;
    setQueriesLoading(true);
    try {
      const direction = activeCategory;
      const res = await fetch(`/api/admin/crm/call-workflows?direction=${direction}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const workflows = data.data?.workflows || [];
        // Map workflows to query format
        const queries = workflows.map((w: any) => ({
          _id: w._id,
          query: w.lastQuery || w.transcribedText || w.notes || '',
          response: w.preparedAnswer || w.scriptText || '',
          scheduledAt: w.scheduledAt || '',
          status: (w.workflowStatus === 'cancelled' ? 'cancelled' : w.workflowStatus === 'completed' ? 'completed' : w.scheduledAt ? 'scheduled' : 'pending') as 'pending' | 'scheduled' | 'completed' | 'cancelled',
          createdAt: w.createdAt,
          leadName: w.leadSnapshot?.name || '',
          leadPhone: w.leadSnapshot?.phone || '',
        }));
        setUserQueries(queries);
      }
    } catch (err) { console.error('Failed to fetch queries:', err); }
    finally { setQueriesLoading(false); }
  }, [token, activeCategory]);

  // ── Open detail split-pane view for a template key ──
  const openDetailView = (stageKey: string) => {
    setDetailTemplateKey(stageKey);
    setActiveSidebarKey(stageKey);
    setShowAddModal(false);
    setSelectedId('');
    setNewQuery('');
    setNewResponse('');
    setNewScheduleTime('');
    fetchQueriesForTemplate(stageKey);
  };

  // ── Add a new query/response ──
  const handleAddQuery = async () => {
    if (!token || (!newQuery.trim() && !newResponse.trim())) return;
    setSaving(true);
    try {
      // Create a workflow entry for this query
      const res = await fetch('/api/admin/crm/call-workflows', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: ['000000000000000000000000'], // placeholder — general query, not lead-specific
          direction: activeCategory,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Now update the created workflow with query/response
        // We'll use the call-workflows PUT endpoint
        // But since we created with placeholder, we need another approach
        // Instead — append to local queries and save to template description
        const q = {
          query: newQuery.trim(),
          response: newResponse.trim(),
          scheduledAt: newScheduleTime,
          status: (newScheduleTime ? 'scheduled' : 'pending') as 'pending' | 'scheduled' | 'completed' | 'cancelled',
          createdAt: new Date().toISOString(),
        };
        setUserQueries(prev => [q, ...prev]);
        // Save queries to template description as part of template update
        const tmpl = stageTemplates.find(t => t.key === detailTemplateKey);
        if (tmpl) {
          const existingQueries = userQueries.map(uq => `Q: ${uq.query}\nA: ${uq.response}${uq.scheduledAt ? `\nScheduled: ${uq.scheduledAt}` : ''}`).join('\n---\n');
          const newQueryText = `Q: ${q.query}\nA: ${q.response}${q.scheduledAt ? `\nScheduled: ${q.scheduledAt}` : ''}`;
          const allQueries = newQueryText + (existingQueries ? '\n---\n' + existingQueries : '');

          // Update template with queries in a special field via notes/description update
          await fetch('/api/admin/crm/calls/templates', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: tmpl._id,
              tags: [...(tmpl.tags || []).filter(t => !t.startsWith('query:')),
                `query:${JSON.stringify({ q: q.query, a: q.response, s: q.scheduledAt, d: q.createdAt })}`
              ],
            }),
          });
        }
        setNewQuery('');
        setNewResponse('');
        setNewScheduleTime('');
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  // ── Cancel a scheduled query ──
  const handleCancelScheduled = async (index: number, queryItem: { _id?: string; query: string; response: string; scheduledAt: string; status: string; createdAt?: string }) => {
    if (!token) return;
    const confirmCancel = confirm(`Cancel this scheduled call?\n\nQuery: ${queryItem.query || '(no query)'}\nScheduled: ${queryItem.scheduledAt ? new Date(queryItem.scheduledAt).toLocaleString('en-IN') : 'N/A'}`);
    if (!confirmCancel) return;
    setSaving(true);
    try {
      // 1. If it has a workflow _id, update via API
      if (queryItem._id) {
        await fetch('/api/admin/crm/call-workflows', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: queryItem._id,
            updates: { workflowStatus: 'cancelled', scheduledAt: null },
          }),
        });
      }

      // 2. Update the tag in template (remove scheduledAt, mark cancelled)
      const tmpl = stageTemplates.find(t => t.key === detailTemplateKey);
      if (tmpl) {
        const updatedTags = (tmpl.tags || []).map(t => {
          if (!t.startsWith('query:')) return t;
          try {
            const parsed = JSON.parse(t.replace('query:', ''));
            if (parsed.q === queryItem.query && parsed.a === queryItem.response && parsed.s === queryItem.scheduledAt) {
              return `query:${JSON.stringify({ ...parsed, s: '', cancelled: true })}`;
            }
          } catch {}
          return t;
        });
        await fetch('/api/admin/crm/calls/templates', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: tmpl._id, tags: updatedTags }),
        });
      }

      // 3. Update local state
      setUserQueries(prev => prev.map((q, i) => i === index ? { ...q, status: 'cancelled' as any, scheduledAt: '' } : q));
      await fetchTemplates();
    } catch (err) { console.error('Cancel failed:', err); }
    finally { setSaving(false); }
  };

  // ── Parse queries from template tags ──
  const getStoredQueries = useCallback((tmpl: Template | null | undefined) => {
    if (!tmpl?.tags?.length) return [];
    return tmpl.tags
      .filter(t => t.startsWith('query:'))
      .map(t => {
        try {
          const parsed = JSON.parse(t.replace('query:', ''));
          return {
            query: parsed.q || '',
            response: parsed.a || '',
            scheduledAt: parsed.s || '',
            status: (parsed.cancelled ? 'cancelled' : parsed.s ? 'scheduled' : 'pending') as 'pending' | 'scheduled' | 'completed' | 'cancelled',
            createdAt: parsed.d || '',
          };
        } catch { return null; }
      })
      .filter(Boolean) as Array<{ query: string; response: string; scheduledAt: string; status: 'pending' | 'scheduled' | 'completed' | 'cancelled'; createdAt: string }>;
  }, []);

  // ── Loading ──
  if (!token || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="text-gray-500 text-sm">Loading call scripts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      {/* ═══ TOP HEADER ═══ */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        {/* Title row */}
        <div className="px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/admin/crm/calls')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.orange.main}, ${C.amber.main})` }}>
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Call Scripts & Templates</h1>
              <p className="text-[11px] text-gray-400">Sakshi AI — Text, Voice Recording, Approval Workflow</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/crm/ai-agents"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 transition border border-violet-200"
            >
              <Bot className="h-3.5 w-3.5" /> AI Agents
            </Link>
            <button
              onClick={() => { setShowAddModal(true); setSelectedId(''); resetForm(); }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
              style={{ background: `linear-gradient(135deg, ${C.indigo.main}, ${C.violet.main})` }}
            >
              <Plus className="h-4 w-4" /> Add Call Template
            </button>
            <button onClick={fetchTemplates} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ═══ CALLING HEADS + LANGUAGES + CATEGORY — single row ═══ */}
        <div className="px-5 pb-2 flex items-center gap-4">
          <span className="text-sm font-bold whitespace-nowrap bg-gradient-to-r from-indigo-600 via-violet-500 to-pink-500 bg-clip-text text-transparent">📞 Calling Heads</span>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center justify-center gap-1.5 flex-1 overflow-x-auto no-scrollbar">
            {LANGUAGES.filter(l => HEADER_LANGUAGES.includes(l.key)).map(lang => {
              const isActive = activeLang === lang.key;
              return (
                <button
                  key={lang.key}
                  onClick={() => { setActiveLang(lang.key); setSelectedId(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-white shadow-md'
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                  }`}
                  style={isActive ? { background: `linear-gradient(135deg, ${lang.color.main}, ${lang.color.light})`, boxShadow: `0 4px 14px ${lang.color.main}30` } : {}}
                >
                  <span className="text-sm">{lang.flag}</span>
                  {lang.label}
                </button>
              );
            })}
          </div>
          <div className="h-5 w-px bg-gray-200" />
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setActiveCategory('outbound'); setSelectedId(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeCategory === 'outbound'
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <PhoneOutgoing className="h-3.5 w-3.5" /> Outbound
            </button>
            <button
              onClick={() => { setActiveCategory('inbound'); setSelectedId(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeCategory === 'inbound'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <PhoneIncoming className="h-3.5 w-3.5" /> Inbound
            </button>
          </div>
        </div>
      </div>

      {/* ═══ BODY: SIDEBAR + MAIN ═══ */}
      <div className="flex" style={{ height: 'calc(100vh - 110px)' }}>

        {/* ═══ LEFT SIDEBAR (fixed, scrolls independently) ═══ */}
        <aside className="w-[260px] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto sticky top-[110px] self-start" style={{ height: 'calc(100vh - 110px)' }}>
          {/* Sidebar Outbound / Inbound toggle */}
          <div className="mx-3 mt-3 mb-2">
            <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
              <button
                onClick={() => { setActiveCategory('outbound'); setSelectedId(''); setActiveSidebarKey(''); setShowAddModal(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'outbound'
                    ? 'text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                }`}
                style={activeCategory === 'outbound' ? { background: `linear-gradient(135deg, ${C.emerald.main}, ${C.emerald.light})` } : {}}
              >
                <PhoneOutgoing className="h-3.5 w-3.5" /> Outbound
              </button>
              <button
                onClick={() => { setActiveCategory('inbound'); setSelectedId(''); setActiveSidebarKey(''); setShowAddModal(false); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeCategory === 'inbound'
                    ? 'text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-white/60'
                }`}
                style={activeCategory === 'inbound' ? { background: `linear-gradient(135deg, ${C.blue.main}, ${C.blue.light})` } : {}}
              >
                <PhoneIncoming className="h-3.5 w-3.5" /> Inbound
              </button>
            </div>
          </div>
          {/* ── Stage List (synced with active category) ── */}
          <div className="px-3 pb-3">
            {/* Predefined stages */}
            {predefinedStages.map(stage => {
              const tmpl = stageTemplates.find(t => t.key === stage.key);
              const isActive = activeSidebarKey === stage.key;
              const hasContent = !!(tmpl?.promptText || tmpl?.voiceRecordingUrl);
              const status = tmpl?.approvalStatus || 'draft';
              const badge = APPROVAL_BADGES[status];
              const BadgeIcon = badge.Icon;
              const catColor = activeCategory === 'outbound' ? C.emerald : C.blue;

              return (
                <div
                  key={stage.key}
                  onClick={() => {
                    setActiveSidebarKey(stage.key);
                    if (tmpl && hasContent) {
                      openDetailView(stage.key);
                    } else {
                      setSelectedId('');
                      setDetailTemplateKey('');
                      setShowAddModal(false);
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all cursor-pointer ${
                    isActive
                      ? 'shadow-sm border'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                  style={isActive ? { background: catColor.bg, borderColor: catColor.main + '40' } : {}}
                >
                  <span className="text-lg flex-shrink-0">{stage.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold truncate`} style={isActive ? { color: catColor.main } : { color: '#374151' }}>
                      {stage.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <BadgeIcon className="h-2.5 w-2.5 flex-shrink-0" style={{ color: badge.color }} />
                      <span className="text-[9px] font-medium" style={{ color: badge.color }}>{badge.label}</span>
                      {tmpl?.promptText && <FileText className="h-2.5 w-2.5 text-emerald-400" />}
                      {tmpl?.voiceRecordingUrl && <Mic className="h-2.5 w-2.5 text-violet-400" />}
                      {hasContent && <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: catColor.main }}>Added</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isActive ? catColor.main : '#D1D5DB' }} />
                </div>
              );
            })}

            {/* Custom Templates Dropdown */}
            {customStages.length > 0 && (() => {
              const catColor = activeCategory === 'outbound' ? C.emerald : C.blue;
              return (
                <>
                  <div
                    onClick={() => setCustomDropdownOpen(prev => !prev)}
                    className="flex items-center gap-2.5 px-3 py-2 mt-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 border border-dashed border-gray-200"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: catColor.bg }}>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${customDropdownOpen ? '' : '-rotate-90'}`} style={{ color: catColor.main }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-600">Custom Templates</span>
                      <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: catColor.main }}>{customStages.length}</span>
                    </div>
                  </div>
                  {customDropdownOpen && customStages.map(stage => {
                    const tmpl = stageTemplates.find(t => t.key === stage.key);
                    const isActive = activeSidebarKey === stage.key;
                    const hasContent = !!(tmpl?.promptText || tmpl?.voiceRecordingUrl);
                    const status = tmpl?.approvalStatus || 'draft';
                    const badge = APPROVAL_BADGES[status];
                    const BadgeIcon = badge.Icon;

                    return (
                      <div
                        key={stage.key}
                        onClick={() => {
                          setActiveSidebarKey(stage.key);
                          if (tmpl && hasContent) {
                            openDetailView(stage.key);
                          } else {
                            setSelectedId('');
                            setDetailTemplateKey('');
                            setShowAddModal(false);
                          }
                        }}
                        className={`flex items-center gap-3 pl-6 pr-3 py-2 rounded-xl mb-0.5 transition-all cursor-pointer ${
                          isActive
                            ? 'shadow-sm border'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                        style={isActive ? { background: catColor.bg, borderColor: catColor.main + '40' } : {}}
                      >
                        <span className="text-base flex-shrink-0">{stage.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold truncate" style={isActive ? { color: catColor.main } : { color: '#374151' }}>
                            {stage.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <BadgeIcon className="h-2.5 w-2.5 flex-shrink-0" style={{ color: badge.color }} />
                            <span className="text-[9px] font-medium" style={{ color: badge.color }}>{badge.label}</span>
                            {tmpl?.promptText && <FileText className="h-2.5 w-2.5 text-emerald-400" />}
                            {tmpl?.voiceRecordingUrl && <Mic className="h-2.5 w-2.5 text-violet-400" />}
                            {hasContent && <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: catColor.main }}>Added</span>}
                          </div>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" style={{ color: isActive ? catColor.main : '#D1D5DB' }} />
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </aside>

        {/* ═══ MAIN CONTENT (scrolls independently) ═══ */}
        <main className="flex-1 overflow-y-auto" style={{ height: 'calc(100vh - 110px)' }}>

          {/* ════════ ADD NEW CALLING HEAD FORM ════════ */}
          {showAddModal ? (
            <div className="max-w-3xl mx-auto p-6 space-y-6 pb-20">
              {/* Form Header */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-4 mb-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.indigo.main}, ${C.violet.main})` }}>
                    <Plus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Add New Calling Head</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Fill all details to create a new calling script template</p>
                  </div>
                </div>
              </div>

              {/* ── Section 1: Basic Info ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.indigo.main }}>1</div>
                  <span className="text-sm font-bold text-gray-700">Basic Information</span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Calling Head Name */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Calling Head Name <span className="text-red-400">*</span></label>
                    <input
                      value={newHead.name}
                      onChange={e => setNewHead({ ...newHead, name: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none"
                      placeholder="e.g. Welcome Call, Course Upsell, Payment Reminder..."
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Inbound / Outbound Dropdown */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Message Type <span className="text-red-400">*</span></label>
                      <select
                        value={newHead.category}
                        onChange={e => setNewHead({ ...newHead, category: e.target.value as 'outbound' | 'inbound' })}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-white appearance-none cursor-pointer"
                      >
                        <option value="outbound">📤 Outbound Message</option>
                        <option value="inbound">📥 Inbound Message</option>
                      </select>
                    </div>

                    {/* Language Dropdown */}
                    <div>
                      <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Language <span className="text-red-400">*</span></label>
                      <select
                        value={formLang}
                        onChange={e => setFormLang(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-white appearance-none cursor-pointer"
                      >
                        {ALL_LANGUAGES.map(lang => (
                          <option key={lang.key} value={lang.key}>{lang.flag} {lang.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Calling Number — KYC Verified */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Calling Number <span className="text-emerald-500 text-[10px] font-medium">(KYC Verified)</span></label>
                    <select
                      value={formCallingNumber}
                      onChange={e => setFormCallingNumber(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none bg-white appearance-none cursor-pointer"
                    >
                      <option value="">Select a verified number...</option>
                      {CALLING_NUMBERS.map(num => (
                        <option key={num.value} value={num.value}>
                          {num.verified ? '✅' : '⏳'} {num.label} — {num.tag}
                        </option>
                      ))}
                    </select>
                    {formCallingNumber && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600 font-medium">KYC verified number selected</span>
                      </div>
                    )}
                    {!formCallingNumber && (
                      <p className="text-[10px] text-gray-400 mt-1">Only KYC verified numbers can be used for calling</p>
                    )}
                  </div>

                  {/* AI Agent Selection */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2">
                      AI Agent <span className="text-violet-500 text-[10px] font-medium">(Retell AI Voice Assistant)</span>
                      <Link
                        href="/admin/crm/ai-agents"
                        className="ml-auto text-[10px] text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1"
                      >
                        Manage Agents →
                      </Link>
                      <button
                        type="button"
                        onClick={fetchRetellAgents}
                        className="text-[10px] text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1"
                      >
                        <RefreshCw className={`h-2.5 w-2.5 ${agentsLoading ? 'animate-spin' : ''}`} /> Refresh
                      </button>
                    </label>
                    <select
                      value={formAIAgent}
                      onChange={e => setFormAIAgent(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none bg-white appearance-none cursor-pointer"
                    >
                      <option value="">Select an AI Agent...</option>
                      {retellAgents.length > 0 ? (
                        retellAgents.map(agent => {
                          const voiceName = agent.voice_id?.split('-').slice(1).join('-') || 'Unknown';
                          const langCode = agent.language || 'en';
                          const langLabel = langCode.startsWith('hi') ? 'Hindi' : langCode.startsWith('en') ? 'English' : langCode.startsWith('mr') ? 'Marathi' : langCode;
                          const agentType = agent.response_engine?.type === 'conversation-flow' ? 'Flow' : 'Prompt';
                          return (
                            <option key={agent.agent_id} value={agent.agent_id}>
                              🤖 {agent.agent_name || 'Unnamed'} — {langLabel} • {voiceName} • {agentType}
                            </option>
                          );
                        })
                      ) : (
                        <option value="" disabled>No agents found — check Retell AI connection</option>
                      )}
                    </select>
                    {formAIAgent && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Bot className="h-3 w-3 text-violet-500" />
                        <span className="text-[10px] text-violet-600 font-medium">
                          {retellAgents.find(a => a.agent_id === formAIAgent)?.agent_name || formAIAgent} — Connected to Retell AI
                        </span>
                      </div>
                    )}
                    {agentsLoading && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Loader2 className="h-3 w-3 text-violet-400 animate-spin" />
                        <span className="text-[10px] text-violet-400">Loading agents from Retell AI...</span>
                      </div>
                    )}
                    {!agentsLoading && retellAgents.length > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1">{retellAgents.length} agent{retellAgents.length > 1 ? 's' : ''} found in Retell AI</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.emerald.main }}>2</div>
                  <span className="text-sm font-bold text-gray-700">Do&apos;s, Don&apos;ts & Rules</span>
                </div>
                <div className="p-5 space-y-5">
                  {/* DO'S */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5" /> Do&apos;s
                      </label>
                      <button
                        onClick={() => setFormDos([...formDos, ''])}
                        className="text-[10px] font-bold text-emerald-500 hover:text-emerald-700 px-2 py-0.5 rounded-lg hover:bg-emerald-50 transition"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formDos.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-emerald-400 text-xs font-bold w-5 text-right">{i + 1}.</span>
                          <input
                            value={item}
                            onChange={e => { const arr = [...formDos]; arr[i] = e.target.value; setFormDos(arr); }}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-emerald-300 outline-none"
                            placeholder="e.g. Be polite and greet the customer warmly"
                          />
                          {formDos.length > 1 && (
                            <button onClick={() => setFormDos(formDos.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* DON'TS */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" /> Don&apos;ts
                      </label>
                      <button
                        onClick={() => setFormDonts([...formDonts, ''])}
                        className="text-[10px] font-bold text-red-400 hover:text-red-600 px-2 py-0.5 rounded-lg hover:bg-red-50 transition"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formDonts.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-red-400 text-xs font-bold w-5 text-right">{i + 1}.</span>
                          <input
                            value={item}
                            onChange={e => { const arr = [...formDonts]; arr[i] = e.target.value; setFormDonts(arr); }}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-300 outline-none"
                            placeholder="e.g. Don't interrupt the customer while speaking"
                          />
                          {formDonts.length > 1 && (
                            <button onClick={() => setFormDonts(formDonts.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RULES */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-amber-600 flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5" /> Rules
                      </label>
                      <button
                        onClick={() => setFormRules([...formRules, ''])}
                        className="text-[10px] font-bold text-amber-500 hover:text-amber-700 px-2 py-0.5 rounded-lg hover:bg-amber-50 transition"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {formRules.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-amber-500 text-xs font-bold w-5 text-right">{i + 1}.</span>
                          <input
                            value={item}
                            onChange={e => { const arr = [...formRules]; arr[i] = e.target.value; setFormRules(arr); }}
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-amber-300 outline-none"
                            placeholder="e.g. Call duration must not exceed 5 minutes"
                          />
                          {formRules.length > 1 && (
                            <button onClick={() => setFormRules(formRules.filter((_, idx) => idx !== i))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 3: Draft Messages (3 Stages) ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.violet.main }}>3</div>
                  <span className="text-sm font-bold text-gray-700">Draft Message — 3 Stages</span>
                </div>
                <div className="p-5 space-y-5">
                  {/* Stage 1: Opening */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: C.blue.main }}>1</span>
                      Stage 1 — Opening Script
                    </label>
                    <textarea
                      value={formDraft1}
                      onChange={e => setFormDraft1(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-y font-mono leading-relaxed"
                      placeholder="Hello {{leadName}}, this is Sakshi from Swar Yoga...&#10;Write the opening greeting and introduction here."
                    />
                  </div>

                  {/* Stage 2: Main Content */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: C.indigo.main }}>2</span>
                      Stage 2 — Main Content
                    </label>
                    <textarea
                      value={formDraft2}
                      onChange={e => setFormDraft2(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-y font-mono leading-relaxed"
                      placeholder="The main body of the call script...&#10;Include key talking points, questions to ask, and value propositions."
                    />
                  </div>

                  {/* Stage 3: Closing */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: C.emerald.main }}>3</span>
                      Stage 3 — Closing Script
                    </label>
                    <textarea
                      value={formDraft3}
                      onChange={e => setFormDraft3(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100 outline-none resize-y font-mono leading-relaxed"
                      placeholder="Thank you for your time, {{leadName}}...&#10;Write the closing, next steps, and farewell here."
                    />
                  </div>
                </div>
              </div>

              {/* ── Section: AI Voice Agent (after draft messages) ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${C.pink.main}, ${C.violet.main})` }}>
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">AI Voice Agent — Retell AI</span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Agent Info */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-100">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${C.violet.main}, ${C.pink.main})` }}>
                      <Bot className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">
                        {retellAgents.find(a => a.agent_id === formAIAgent)?.agent_name || 'AI'} Voice Agent
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">Powered by Retell AI — converts your draft script into a natural AI voice call agent</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600">
                          <ShieldCheck className="h-2.5 w-2.5" /> Connected
                        </span>
                        <span className="text-[10px] text-gray-400">
                          Agent: {retellAgents.find(a => a.agent_id === formAIAgent)?.agent_name || 'Not selected'}
                          {(() => { const v = retellAgents.find(a => a.agent_id === formAIAgent)?.voice_id; return v ? ` • Voice: ${v.split('-').slice(1).join('-')}` : ''; })()}
                          {' • From: '}{formCallingNumber ? CALLING_NUMBERS.find(n => n.value === formCallingNumber)?.label || formCallingNumber : 'Not selected'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Generate Voice Button */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateVoice}
                      disabled={voiceGenerating || (!formDraft1 && !formDraft2 && !formDraft3)}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all"
                      style={{ background: `linear-gradient(135deg, ${C.violet.main}, ${C.pink.main})` }}
                    >
                      {voiceGenerating ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Generating Voice...</>
                      ) : (
                        <><Mic className="h-4 w-4" /> Generate AI Voice from Script</>
                      )}
                    </button>
                    {voiceGenStatus === 'success' && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle className="h-4 w-4" /> Voice generated!
                      </span>
                    )}
                  </div>

                  {/* ── Audio Player & Approve (after voice generated or URL provided) ── */}
                  {(voiceGenStatus === 'success' || formVoiceUrl) && (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Volume2 className="h-4 w-4 text-violet-500" />
                        <span className="text-xs font-bold text-gray-700">Listen & Approve Voice</span>
                      </div>

                      {/* Player Controls */}
                      <div className="flex items-center gap-3">
                        {/* Play / Pause */}
                        <button
                          onClick={() => {
                            if (isPlaying) {
                              if (window.speechSynthesis.paused) {
                                window.speechSynthesis.resume();
                              } else {
                                window.speechSynthesis.pause();
                              }
                            } else {
                              const text = [formDraft1, formDraft2, formDraft3].filter(Boolean).join('. ');
                              if (!text.trim()) return;
                              const utterance = new SpeechSynthesisUtterance(text);
                              utterance.lang = formLang === 'hi' ? 'hi-IN' : 'en-IN';
                              // Pick a female voice matching the language
                              const voices = window.speechSynthesis.getVoices();
                              const targetLang = formLang === 'hi' ? 'hi' : 'en';
                              const femaleVoice = voices.find(v => v.lang.startsWith(targetLang) && /female|woman|samantha|lekha|veena|rishi|moira|karen|fiona|victoria|zira/i.test(v.name))
                                || voices.find(v => v.lang.startsWith(targetLang))
                                || null;
                              if (femaleVoice) utterance.voice = femaleVoice;
                              utterance.rate = 0.95;
                              utterance.pitch = 1.1;
                              utterance.onend = () => setIsPlaying(false);
                              utterance.onerror = () => setIsPlaying(false);
                              speechRef.current = utterance;
                              window.speechSynthesis.speak(utterance);
                              setIsPlaying(true);
                            }
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
                          style={{ background: `linear-gradient(135deg, ${C.violet.main}, ${C.pink.main})` }}
                          title={isPlaying ? 'Pause' : 'Play'}
                        >
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                        </button>
                        {/* Stop */}
                        {isPlaying && (
                          <button
                            onClick={() => {
                              window.speechSynthesis.cancel();
                              setIsPlaying(false);
                            }}
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg hover:scale-105 transition-all"
                            style={{ background: C.red.main }}
                            title="Stop"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-700">
                            {retellAgents.find(a => a.agent_id === formAIAgent)?.agent_name || 'AI Voice'}{(() => {
                              const agent = retellAgents.find(a => a.agent_id === formAIAgent);
                              const voiceName = agent?.voice_id?.split('-').slice(1).join('-');
                              const langCode = agent?.language || formLang || 'en';
                              const lang = langCode.startsWith('hi') ? 'Hindi' : langCode.startsWith('en') ? 'English' : langCode.startsWith('mr') ? 'Marathi' : langCode;
                              return ` — ${lang}${voiceName ? ` • ${voiceName}` : ''}`;
                            })()}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {isPlaying ? '🔊 Playing script audio...' : 'Click ▶ to listen to the voice script'}
                          </div>
                        </div>

                        {/* Approve Button */}
                        {!voiceApproved ? (
                          <button
                            onClick={() => setVoiceApproved(true)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:shadow-lg transition-all"
                            style={{ background: `linear-gradient(135deg, ${C.emerald.main}, #10b981)` }}
                          >
                            <ThumbsUp className="h-3.5 w-3.5" /> Approve Voice
                          </button>
                        ) : (
                          <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-200">
                            <CheckCircle className="h-3.5 w-3.5" /> Approved ✓
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status / Error */}
                  {voiceGenStatus === 'error' && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-semibold text-amber-700">Voice Generation Notice</div>
                        <p className="text-[11px] text-amber-600 mt-0.5">{voiceGenError}</p>
                      </div>
                    </div>
                  )}

                  {voiceGenStatus === 'generating' && (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                      <span className="text-xs text-violet-600 font-medium">AI is converting your script to voice... This may take a moment.</span>
                    </div>
                  )}

                  {/* Manual Voice URL fallback */}
                  <div className="border-t border-gray-100 pt-4 mt-2">
                    <div className="text-[10px] text-gray-400 mb-3">Or add voice recording URL manually</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Recording Name</label>
                        <input
                          value={formVoiceName}
                          onChange={e => setFormVoiceName(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-300 outline-none"
                          placeholder="e.g. Welcome Call Hindi v2"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1 block">Recording URL</label>
                        <input
                          value={formVoiceUrl}
                          onChange={e => setFormVoiceUrl(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-300 outline-none"
                          placeholder="https://drive.google.com/file/..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Section 4: Admin Approval & Next Instructions ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.amber.main }}>4</div>
                  <span className="text-sm font-bold text-gray-700">Approval & Instructions</span>
                </div>
                <div className="p-5 space-y-4">
                  {/* Admin Approval Checkbox */}
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-amber-300 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formAdminApproval}
                      onChange={e => setFormAdminApproval(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-amber-500 focus:ring-amber-400 mt-0.5 cursor-pointer"
                    />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Send for Admin Approval</div>
                      <p className="text-xs text-gray-400 mt-0.5">When checked, this template will be submitted for admin review before it can go live.</p>
                    </div>
                  </label>

                  {/* Next Instructions */}
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Next Instructions / Notes</label>
                    <textarea
                      value={formNextInstructions}
                      onChange={e => setFormNextInstructions(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 focus:border-amber-300 focus:ring-2 focus:ring-amber-100 outline-none resize-y"
                      placeholder="Any additional notes, follow-up actions, or instructions for the team..."
                    />
                  </div>
                </div>
              </div>

              {/* ── Submit Bar ── */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateHead}
                  disabled={saving || !newHead.name.trim()}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.indigo.main}, ${C.violet.main})` }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Calling Head
                </button>
              </div>
            </div>
          ) : detailTemplateKey && !selected ? (
            /* ════════ SPLIT DETAIL VIEW ════════ */
            (() => {
              const detailTmpl = stageTemplates.find(t => t.key === detailTemplateKey);
              const detailStage = stages.find(s => s.key === detailTemplateKey);
              const catColor = activeCategory === 'outbound' ? C.emerald : C.blue;
              const storedQueries = getStoredQueries(detailTmpl);
              const allQueries: Array<{ _id?: string; query: string; response: string; scheduledAt: string; status: 'pending' | 'scheduled' | 'completed' | 'cancelled'; createdAt: string }> = [...storedQueries].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

              // Parse script stages
              const scriptText = detailTmpl?.promptText || '';
              const stage1 = scriptText.match(/--- STAGE 1: OPENING ---\n([\s\S]*?)(?=\n\n--- STAGE 2:|$)/)?.[1]?.trim();
              const stage2 = scriptText.match(/--- STAGE 2: MAIN CONTENT ---\n([\s\S]*?)(?=\n\n--- STAGE 3:|$)/)?.[1]?.trim();
              const stage3 = scriptText.match(/--- STAGE 3: CLOSING ---\n([\s\S]*?)$/)?.[1]?.trim();
              const hasStages = stage1 || stage2 || stage3;

              return (
                <div className="flex h-full">
                  {/* ────── LEFT: What We Say (Script) ────── */}
                  <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{detailStage?.icon || '📞'}</span>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">{detailTmpl?.name || detailStage?.name || 'Template'}</h2>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 text-[9px] font-bold rounded-lg text-white" style={{ background: catColor.main }}>
                              {activeCategory === 'outbound' ? 'Outbound' : 'Inbound'}
                            </span>
                            <span className="text-[10px] text-gray-400">{LANGUAGES.find(l => l.key === activeLang)?.flag} {LANGUAGES.find(l => l.key === activeLang)?.label}</span>
                            {detailTmpl && (() => {
                              const b = APPROVAL_BADGES[detailTmpl.approvalStatus || 'draft'];
                              const BIcon = b.Icon;
                              return <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: b.bg, color: b.color }}><BIcon className="h-2.5 w-2.5" />{b.label}</span>;
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { if (detailTmpl) openTemplateForm(detailTmpl); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow hover:shadow-md transition"
                          style={{ background: C.indigo.main }}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit Script
                        </button>
                        <button
                          onClick={() => { setDetailTemplateKey(''); setActiveSidebarKey(''); }}
                          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Script Display */}
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" /> Call Script — What We Say
                    </div>

                    {hasStages ? (
                      <div className="space-y-3">
                        {stage1 && (
                          <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: C.emerald.main }}>1</div>
                              <span className="text-xs font-bold text-emerald-700">Opening</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{stage1}</p>
                          </div>
                        )}
                        {stage2 && (
                          <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: C.blue.main }}>2</div>
                              <span className="text-xs font-bold text-indigo-700">Main Content</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{stage2}</p>
                          </div>
                        )}
                        {stage3 && (
                          <div className="bg-white rounded-xl border border-gray-100 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ background: C.violet.main }}>3</div>
                              <span className="text-xs font-bold text-violet-700">Closing</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{stage3}</p>
                          </div>
                        )}
                      </div>
                    ) : scriptText ? (
                      <div className="bg-white rounded-xl border border-gray-100 p-4">
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{scriptText}</p>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-300">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium">No script written yet</p>
                        <p className="text-xs mt-1 text-gray-400">Click &quot;Edit Script&quot; to add the call script</p>
                      </div>
                    )}

                    {/* Voice Recording */}
                    {detailTmpl?.voiceRecordingUrl && (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <Volume2 className="h-3.5 w-3.5" /> Voice Recording
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50/50 border border-violet-100">
                          <button
                            onClick={() => { const a = new Audio(detailTmpl.voiceRecordingUrl); a.play().catch(() => {}); }}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: C.violet.main }}
                          >
                            <Play className="h-5 w-5" fill="white" />
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-700 truncate">{detailTmpl.voiceRecordingName || 'Voice Recording'}</div>
                            <div className="text-[10px] text-violet-400 truncate">{detailTmpl.voiceRecordingUrl}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Do's / Don'ts / Rules */}
                    {detailTmpl?.description && (
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                          <Shield className="h-3.5 w-3.5" /> Guidelines
                        </div>
                        <div className="bg-white rounded-xl border border-gray-100 p-4 text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                          {detailTmpl.description}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ────── RIGHT: User Queries & Schedule ────── */}
                  <div className="w-1/2 overflow-y-auto p-5 space-y-4 bg-gray-50/30">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" style={{ color: catColor.main }} />
                        <h3 className="text-sm font-bold text-gray-800">User Queries & Follow-ups</h3>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white" style={{ background: catColor.main }}>
                        {allQueries.length} {allQueries.length === 1 ? 'query' : 'queries'}
                      </span>
                    </div>

                    {/* Add New Query/Response */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                        <Plus className="h-4 w-4" style={{ color: catColor.main }} />
                        <span className="text-xs font-bold text-gray-700">Add New Response</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">User Query / Question</label>
                          <textarea
                            value={newQuery}
                            onChange={e => setNewQuery(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                            placeholder="What did the user ask? e.g. 'What is the workshop timing?'"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block">Our Response / Answer</label>
                          <textarea
                            value={newResponse}
                            onChange={e => setNewResponse(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none"
                            placeholder="Prepare the response to be sent via call..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-500 uppercase mb-1 block flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" /> Schedule Call Time
                          </label>
                          <input
                            type="datetime-local"
                            value={newScheduleTime}
                            onChange={e => setNewScheduleTime(e.target.value)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none"
                          />
                          <p className="text-[9px] text-gray-400 mt-1">Auto-broadcast will call at this time with the response above</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleAddQuery}
                            disabled={saving || (!newQuery.trim() && !newResponse.trim())}
                            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow disabled:opacity-40 transition"
                            style={{ background: `linear-gradient(135deg, ${catColor.main}, ${catColor.light})` }}
                          >
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                            Save & Schedule
                          </button>
                          {newScheduleTime && (
                            <button
                              onClick={handleAddQuery}
                              disabled={saving || !newResponse.trim()}
                              className="flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-white shadow disabled:opacity-40 transition"
                              style={{ background: `linear-gradient(135deg, ${C.amber.main}, ${C.orange.main})` }}
                            >
                              <Zap className="h-3.5 w-3.5" /> Auto Broadcast
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Existing Queries List */}
                    {allQueries.length > 0 ? (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Saved Queries & Responses</div>
                        {allQueries.map((q, i) => (
                          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 hover:border-gray-200 transition">
                            {/* Status */}
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                q.status === 'completed' ? 'bg-green-50 text-green-600'
                                : q.status === 'cancelled' ? 'bg-red-50 text-red-500'
                                : q.status === 'scheduled' ? 'bg-amber-50 text-amber-600'
                                : 'bg-gray-50 text-gray-500'
                              }`}>
                                {q.status === 'completed' ? '✅ Completed' : q.status === 'cancelled' ? '🚫 Cancelled' : q.status === 'scheduled' ? '⏰ Scheduled' : '⏳ Pending'}
                              </span>
                              <div className="flex items-center gap-2">
                                {q.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleCancelScheduled(i, q)}
                                    disabled={saving}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition disabled:opacity-40"
                                  >
                                    <XCircle className="h-3 w-3" /> Cancel
                                  </button>
                                )}
                                {q.createdAt && (
                                  <span className="text-[9px] text-gray-400">
                                    {new Date(q.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}{' '}
                                    {new Date(q.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* Query */}
                            {q.query && (
                              <div className="mb-2">
                                <div className="text-[9px] font-bold text-red-400 uppercase mb-0.5">User Asked:</div>
                                <p className="text-xs text-gray-700 bg-red-50/50 rounded-lg px-3 py-2 border-l-2 border-red-200">{q.query}</p>
                              </div>
                            )}
                            {/* Response */}
                            {q.response && (
                              <div className="mb-2">
                                <div className="text-[9px] font-bold text-green-400 uppercase mb-0.5">Our Response:</div>
                                <p className="text-xs text-gray-700 bg-green-50/50 rounded-lg px-3 py-2 border-l-2 border-green-200">{q.response}</p>
                              </div>
                            )}
                            {/* Schedule */}
                            {q.scheduledAt && q.status !== 'cancelled' && (
                              <div className="flex items-center justify-between mt-1">
                                <div className="flex items-center gap-1.5">
                                  <CalendarClock className="h-3 w-3 text-amber-500" />
                                  <span className="text-[10px] text-amber-600 font-medium">
                                    Scheduled: {new Date(q.scheduledAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}{' '}
                                    {new Date(q.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleCancelScheduled(i, q)}
                                  disabled={saving}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold text-red-500 hover:bg-red-50 transition disabled:opacity-40"
                                  title="Cancel this scheduled call"
                                >
                                  <XCircle className="h-3 w-3" /> Cancel Call
                                </button>
                              </div>
                            )}
                            {q.status === 'cancelled' && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <XCircle className="h-3 w-3 text-red-400" />
                                <span className="text-[10px] text-red-400 font-medium line-through">Schedule cancelled</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 text-gray-300">
                        <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium text-gray-400">No queries yet</p>
                        <p className="text-xs text-gray-300 mt-1">When users ask questions during calls, add them here with scheduled follow-up responses</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : !selected ? (
            /* ── Template Table View ── */
            <div className="p-6">
              {/* Category toggle */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setActiveCategory('outbound')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                    activeCategory === 'outbound' ? 'text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                  style={activeCategory === 'outbound' ? { background: `linear-gradient(135deg, ${C.emerald.main}, ${C.emerald.light})` } : {}}
                >
                  <PhoneOutgoing className="h-4 w-4" /> Outbound
                </button>
                <button
                  onClick={() => setActiveCategory('inbound')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition ${
                    activeCategory === 'inbound' ? 'text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                  style={activeCategory === 'inbound' ? { background: `linear-gradient(135deg, ${C.blue.main}, ${C.blue.light})` } : {}}
                >
                  <PhoneIncoming className="h-4 w-4" /> Inbound
                </button>
              </div>

              {/* ── Table ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[40px_2fr_1fr_80px_1fr_80px_1fr_140px] gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <div>#</div>
                  <div>Name</div>
                  <div>Language</div>
                  <div>Call Time</div>
                  <div>Status</div>
                  <div>Voice</div>
                  <div>Updated</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Table Rows — show ALL templates from DB for this category */}
                {stageTemplates.map((tmpl, idx) => {
                  const stageDef = stages.find(s => s.key === tmpl.key);
                  const status = tmpl.approvalStatus || 'draft';
                  const badge = APPROVAL_BADGES[status];
                  const BadgeIcon = badge.Icon;
                  const langObj = LANGUAGES.find(l => l.key === tmpl.language);
                  const catColor = activeCategory === 'outbound' ? C.emerald : C.blue;
                  const updatedDate = tmpl.updatedAt ? new Date(tmpl.updatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
                  const icon = stageDef?.icon || '📝';
                  // Agent speaking time: ~150 words/min. Total call ≈ 2× agent time (user responds too)
                  const wordCount = tmpl.promptText ? tmpl.promptText.split(/\s+/).filter(Boolean).length : 0;
                  const agentMinutes = wordCount / 150; // agent speaking duration
                  const totalCallSec = Math.round(agentMinutes * 2 * 60); // total call ≈ 2× agent
                  const callMin = Math.floor(totalCallSec / 60);
                  const callSec = totalCallSec % 60;
                  const callTime = wordCount > 0 ? `${String(callMin).padStart(2, '0')}:${String(callSec).padStart(2, '0')}` : '—';

                  return (
                    <div
                      key={tmpl._id}
                      className="grid grid-cols-[40px_2fr_1fr_80px_1fr_80px_1fr_140px] gap-2 px-5 py-3.5 items-center border-b border-gray-50 cursor-pointer transition-all duration-150 hover:bg-gradient-to-r hover:from-gray-50/80 hover:to-indigo-50/40 hover:shadow-[inset_3px_0_0_0] group"
                      style={{ '--tw-shadow-color': catColor.main } as React.CSSProperties}
                      onClick={() => openDetailView(tmpl.key)}
                    >
                      {/* # */}
                      <div className="text-xs font-bold text-gray-400 group-hover:text-gray-600">{idx + 1}</div>

                      {/* Name */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg flex-shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-gray-800 truncate group-hover:text-indigo-700 transition-colors">{tmpl.name}</div>
                          <div className="text-[10px] text-gray-400 truncate">Stage {tmpl.stageOrder} • {tmpl.promptText ? `${tmpl.promptText.slice(0, 40)}…` : 'No script yet'}</div>
                        </div>
                      </div>

                      {/* Language */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{langObj?.flag || '🌐'}</span>
                        <span className="text-xs font-medium text-gray-600">{langObj?.label || tmpl.language || '—'}</span>
                      </div>

                      {/* Call Time */}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-400" />
                        <span className={`text-xs font-mono font-medium ${wordCount > 0 ? 'text-gray-700' : 'text-gray-300'}`}>{callTime}</span>
                      </div>

                      {/* Status Badge */}
                      <div>
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: badge.bg, color: badge.color }}>
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </div>
                      </div>

                      {/* Voice */}
                      <div className="flex items-center gap-1.5">
                        {tmpl.voiceRecordingUrl ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const audio = new Audio(tmpl.voiceRecordingUrl);
                              audio.play().catch(() => {});
                            }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition text-[11px] font-medium"
                          >
                            <Play className="h-3 w-3" fill="currentColor" /> Play
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-300 flex items-center gap-1"><Mic className="h-3 w-3" /> None</span>
                        )}
                      </div>

                      {/* Updated */}
                      <div className="text-[11px] text-gray-400">{updatedDate}</div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); openTemplateForm(tmpl); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition"
                          title="Edit"
                        >
                          <Edit3 className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDuplicateModal(tmpl); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition"
                          title="Duplicate"
                        >
                          <Copy className="h-3 w-3" /> Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTemplate(tmpl._id);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {stageTemplates.length === 0 && (
                  <div className="px-5 py-10 text-center text-gray-400 text-sm">No templates found. Click &quot;+ Add New&quot; to create one.</div>
                )}
              </div>
            </div>
          ) : (
            /* ═══ TEMPLATE DETAIL VIEW ═══ */
            <div className="max-w-4xl mx-auto p-6 space-y-5">

              {/* ── Header card ── */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">
                      {(activeCategory === 'outbound' ? OUTBOUND_STAGES : INBOUND_STAGES).find(s => s.key === selected.key)?.icon || '📄'}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg text-white" style={{ background: activeCategory === 'outbound' ? C.emerald.main : C.blue.main }}>
                          {activeCategory === 'outbound' ? 'Outbound' : 'Inbound'}
                        </span>
                        <span className="text-xs text-gray-400">Stage {selected.stageOrder}</span>
                        <span className="text-xs text-gray-300">•</span>
                        <span className="text-xs text-gray-400">{LANGUAGES.find(l => l.key === activeLang)?.label}</span>
                        <span className="text-xs text-gray-300">•</span>
                        {(() => {
                          const b = APPROVAL_BADGES[selected.approvalStatus];
                          const BIcon = b.Icon;
                          return (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: b.bg, color: b.color }}>
                              <BIcon className="h-3 w-3" /> {b.label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedId('')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                {selected.description && <p className="mt-2 text-xs text-gray-500">{selected.description}</p>}
              </div>

              {/* ── STEP 1: Text Script ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.indigo.main }}>1</div>
                    <span className="text-sm font-bold text-gray-700">Script Text</span>
                    {selected.promptText && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-2">
                    {editMode ? (
                      <>
                        <button
                          onClick={handleSaveText}
                          disabled={saving}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow"
                          style={{ background: C.emerald.main }}
                        >
                          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                        </button>
                        <button onClick={() => { setEditMode(false); setEditPrompt(selected.promptText); }} className="px-3 py-1.5 rounded-xl text-xs font-medium text-gray-500 bg-gray-100">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setShowTestCall(true); setTestResult(null); setTestPhone(''); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow"
                          style={{ background: 'linear-gradient(135deg,#10B981,#34D399)', color: '#fff' }}
                          title="Test this template with a real call"
                        >
                          <PhoneOutgoing className="h-3.5 w-3.5" /> Test Call
                        </button>
                        <button
                          onClick={() => setEditMode(true)}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-white text-xs font-bold shadow"
                          style={{ background: C.indigo.main }}
                        >
                          <Edit3 className="h-3.5 w-3.5" /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-5">
                  {editMode ? (
                    <div className="space-y-4">
                      {/* Call Mode Selector */}
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">Call Behaviour</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'info_only',      icon: '📢', label: 'Info Only',        desc: 'Reads script & hangs up — no questions asked',          color: 'bg-blue-50 border-blue-400 text-blue-700' },
                            { value: 'interactive',    icon: '💬', label: 'Interactive',       desc: 'Full conversation — greets, asks questions, listens',    color: 'bg-indigo-50 border-indigo-400 text-indigo-700' },
                            { value: 'qa_interactive', icon: '🤝', label: 'Q&A + Interactive', desc: 'Answers caller questions AND has interactive conversation', color: 'bg-violet-50 border-violet-400 text-violet-700' },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => setEditCallMode(opt.value as any)}
                              className={`text-left px-3 py-2.5 rounded-xl border-2 transition ${editCallMode === opt.value ? opt.color + ' shadow-sm' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}`}
                            >
                              <div className="text-base mb-0.5">{opt.icon}</div>
                              <div className="text-xs font-bold leading-tight">{opt.label}</div>
                              <div className="text-[10px] leading-snug mt-0.5 opacity-70">{opt.desc}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stage 1: Opening */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white" style={{ background: C.emerald.main }}>1</span>
                          <span className="text-xs font-bold text-gray-600">STAGE 1: OPENING</span>
                        </div>
                        <textarea
                          value={editStage1}
                          onChange={e => setEditStage1(e.target.value)}
                          rows={5}
                          className="w-full px-4 py-3 text-sm font-mono leading-relaxed rounded-xl border border-emerald-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none resize-y"
                          placeholder="Opening script — greet the lead, introduce yourself..."
                        />
                      </div>
                      {/* Stage 2: Main Content */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white" style={{ background: C.blue.main }}>2</span>
                          <span className="text-xs font-bold text-gray-600">STAGE 2: MAIN CONTENT</span>
                        </div>
                        <textarea
                          value={editStage2}
                          onChange={e => setEditStage2(e.target.value)}
                          rows={8}
                          className="w-full px-4 py-3 text-sm font-mono leading-relaxed rounded-xl border border-indigo-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none resize-y"
                          placeholder="Main conversation — purpose, questions, information..."
                        />
                      </div>
                      {/* Stage 3: Closing */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white" style={{ background: C.violet.main }}>3</span>
                          <span className="text-xs font-bold text-gray-600">STAGE 3: CLOSING</span>
                        </div>
                        <textarea
                          value={editStage3}
                          onChange={e => setEditStage3(e.target.value)}
                          rows={5}
                          className="w-full px-4 py-3 text-sm font-mono leading-relaxed rounded-xl border border-violet-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none resize-y"
                          placeholder="Closing — thank them, next steps, goodbye..."
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">Use {'{{leadName}}'}, {'{{lang}}'}, {'{{workshopName}}'} as variables</p>
                    </div>
                  ) : selected.promptText ? (
                    <div className="space-y-3">
                      {/* Call mode badge */}
                      {(() => {
                        const modeMap: Record<string, { icon: string; label: string; color: string }> = {
                          info_only:      { icon: '📢', label: 'Info Only',        color: 'bg-blue-50 text-blue-700 border-blue-200' },
                          interactive:    { icon: '💬', label: 'Interactive',       color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                          qa_interactive: { icon: '🤝', label: 'Q&A + Interactive', color: 'bg-violet-50 text-violet-700 border-violet-200' },
                        };
                        const mode = modeMap[selected.callMode || 'interactive'] || modeMap.interactive;
                        return (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${mode.color}`}>
                            <span>{mode.icon}</span> {mode.label}
                          </div>
                        );
                      })()}
                      {(() => {
                        const { stage1, stage2, stage3 } = parseStages(selected.promptText);
                        const hasStages = selected.promptText.includes('--- STAGE 1:');
                        if (!hasStages) {
                          return (
                            <pre className="text-sm font-mono leading-relaxed text-gray-700 whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
                              {selected.promptText}
                            </pre>
                          );
                        }
                        return (
                          <>
                            {stage1 && (
                              <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white" style={{ background: C.emerald.main }}>1</span>
                                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Opening</span>
                                </div>
                                <pre className="text-sm font-mono leading-relaxed text-gray-700 whitespace-pre-wrap break-words">{stage1}</pre>
                              </div>
                            )}
                            {stage2 && (
                              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white" style={{ background: C.blue.main }}>2</span>
                                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Main Content</span>
                                </div>
                                <pre className="text-sm font-mono leading-relaxed text-gray-700 whitespace-pre-wrap break-words">{stage2}</pre>
                              </div>
                            )}
                            {stage3 && (
                              <div className="rounded-xl border border-violet-100 bg-violet-50/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md text-[10px] font-bold text-white" style={{ background: C.violet.main }}>3</span>
                                  <span className="text-[10px] font-bold text-violet-700 uppercase">Closing</span>
                                </div>
                                <pre className="text-sm font-mono leading-relaxed text-gray-700 whitespace-pre-wrap break-words">{stage3}</pre>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-300">
                      <FileText className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No script text yet. Click Edit to add.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STEP 2: Voice Recording ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.violet.main }}>2</div>
                    <span className="text-sm font-bold text-gray-700">Voice Recording</span>
                    {selected.voiceRecordingUrl && <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />}
                  </div>
                </div>
                <div className="p-5">
                  {selected.voiceRecordingUrl ? (
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.violet.main }}>
                        <Volume2 className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{selected.voiceRecordingName || 'Recording'}</div>
                        <a href={selected.voiceRecordingUrl} target="_blank" rel="noreferrer" className="text-xs text-violet-500 hover:underline truncate block">
                          {selected.voiceRecordingUrl}
                        </a>
                      </div>
                      <button
                        onClick={() => handleSaveVoice('', '')}
                        className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Remove recording"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <VoiceUploader onSave={handleSaveVoice} saving={saving} />
                  )}
                </div>
              </div>

              {/* ── STEP 3: Admin Approval ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.amber.main }}>3</div>
                  <span className="text-sm font-bold text-gray-700">Admin Approval</span>
                </div>
                <div className="p-5">
                  {selected.approvalStatus === 'draft' && (
                    <div className="text-center py-6">
                      <Shield className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                      <p className="text-sm text-gray-400 mb-4">Add text and/or voice recording, then submit for approval.</p>
                      <button
                        onClick={handleSubmit}
                        disabled={saving || (!selected.promptText && !selected.voiceRecordingUrl)}
                        className="flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg disabled:opacity-40 transition"
                        style={{ background: `linear-gradient(135deg, ${C.amber.main}, ${C.orange.main})` }}
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Submit for Approval
                      </button>
                    </div>
                  )}

                  {selected.approvalStatus === 'pending' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
                        <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-semibold text-amber-800">Pending Admin Approval</div>
                          <div className="text-xs text-amber-600 mt-0.5">
                            Submitted {selected.submittedAt ? new Date(selected.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600 mb-1 block">Approval Note (optional)</label>
                        <input
                          value={approvalNote}
                          onChange={e => setApprovalNote(e.target.value)}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                          placeholder="Add note for approval/rejection..."
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleApproval('approve')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg"
                          style={{ background: C.emerald.main }}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleApproval('reject')}
                          disabled={saving}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-bold shadow-lg"
                          style={{ background: C.red.main }}
                        >
                          <XCircle className="h-4 w-4" /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {selected.approvalStatus === 'approved' && (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <ShieldCheck className="h-6 w-6 text-emerald-500 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-emerald-800">Approved & Active</div>
                        <div className="text-xs text-emerald-600 mt-0.5">
                          Approved {selected.approvedAt ? new Date(selected.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          {selected.approvedBy && ` by ${selected.approvedBy}`}
                        </div>
                        {selected.approvalNote && <div className="text-xs text-emerald-500 mt-1 italic">&ldquo;{selected.approvalNote}&rdquo;</div>}
                      </div>
                    </div>
                  )}

                  {selected.approvalStatus === 'rejected' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                        <ShieldAlert className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-red-800">Rejected</div>
                          <div className="text-xs text-red-600 mt-0.5">
                            {selected.approvedBy && `By ${selected.approvedBy}`}
                            {selected.approvedAt && ` on ${new Date(selected.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                          </div>
                          {selected.approvalNote && <div className="text-xs text-red-500 mt-1 italic">&ldquo;{selected.approvalNote}&rdquo;</div>}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">Edit the script and re-submit for approval.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── STEP 4: Submit to Use (status summary) ── */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: C.emerald.main }}>4</div>
                  <span className="text-sm font-bold text-gray-700">Ready to Use</span>
                </div>
                <div className="p-5">
                  {selected.isActive ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: C.emerald.main }}>
                        <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-800">This script is LIVE</div>
                        <div className="text-xs text-emerald-600 mt-0.5">
                          Sakshi will use this script for {selected.name} calls in {LANGUAGES.find(l => l.key === activeLang)?.label}.
                          {selected.usageCount > 0 && ` Used ${selected.usageCount} times.`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-200">
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-600">Not yet active</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          Complete the workflow: Add text → Voice recording → Get admin approval
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ═══ DUPLICATE TEMPLATE MODAL ═══ */}
      {showDuplicateModal && duplicateSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ background: `linear-gradient(135deg, ${C.violet.bg}, ${C.indigo.bg})` }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${C.violet.main}, ${C.indigo.main})` }}>
                  <Copy className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Duplicate Template</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">From: {duplicateSource.name}</p>
                </div>
              </div>
              <button onClick={() => { setShowDuplicateModal(false); setDuplicateSource(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition">
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* 1. Calling Head Name */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ background: C.violet.main }}>1</span>
                  Calling Head Name
                </label>
                <input
                  value={dupName}
                  onChange={e => setDupName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none transition"
                  placeholder="e.g. Welcome Call Hindi v2"
                  autoFocus
                />
              </div>

              {/* 2. Language */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ background: C.blue.main }}>2</span>
                  Language
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ALL_LANGUAGES.slice(0, 8).map(lang => (
                    <button
                      key={lang.key}
                      onClick={() => setDupLang(lang.key)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                        dupLang === lang.key
                          ? 'text-white shadow-md border-transparent'
                          : 'text-gray-500 bg-gray-50 border-gray-100 hover:bg-gray-100'
                      }`}
                      style={dupLang === lang.key ? { background: `linear-gradient(135deg, ${lang.color.main}, ${lang.color.light})` } : {}}
                    >
                      <span>{lang.flag}</span> {lang.label}
                    </button>
                  ))}
                </div>
                {ALL_LANGUAGES.length > 8 && (
                  <select
                    value={dupLang}
                    onChange={e => setDupLang(e.target.value)}
                    className="mt-2 w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-indigo-300 outline-none"
                  >
                    {ALL_LANGUAGES.map(l => (
                      <option key={l.key} value={l.key}>{l.flag} {l.label}</option>
                    ))}
                  </select>
                )}
                {/* Translation status */}
                {dupTranslating && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                    <span className="text-xs font-medium text-indigo-600">Translating script to {ALL_LANGUAGES.find(l => l.key === dupLang)?.label || dupLang}...</span>
                  </div>
                )}
                {!dupTranslating && dupTranslatedPrompt && dupLang !== duplicateSource?.language && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-100">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs font-medium text-emerald-600">Script auto-translated to {ALL_LANGUAGES.find(l => l.key === dupLang)?.label || dupLang}</span>
                  </div>
                )}
              </div>

              {/* 3. AI Agent */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ background: C.emerald.main }}>3</span>
                  AI Agent
                </label>
                {agentsLoading ? (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-xs text-gray-400">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading agents...
                  </div>
                ) : retellAgents.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {retellAgents.map(agent => (
                      <button
                        key={agent.agent_id}
                        onClick={() => setDupAgent(agent.agent_id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                          dupAgent === agent.agent_id
                            ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                            : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <Bot className={`h-4 w-4 flex-shrink-0 ${dupAgent === agent.agent_id ? 'text-emerald-600' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-bold truncate ${dupAgent === agent.agent_id ? 'text-emerald-700' : 'text-gray-700'}`}>{agent.agent_name}</div>
                          <div className="text-[9px] text-gray-400 truncate">{agent.agent_id}</div>
                        </div>
                        {dupAgent === agent.agent_id && <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-600">
                    No AI agents found. Configure in Retell AI dashboard.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowDuplicateModal(false); setDuplicateSource(null); }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDuplicate}
                disabled={!dupName.trim() || dupSaving || dupTranslating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md hover:shadow-lg transition disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${C.violet.main}, ${C.indigo.main})` }}
              >
                {dupSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                Duplicate Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Test Call Modal ── */}
      {showTestCall && selected && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#10B981,#34D399)' }}>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <PhoneOutgoing className="h-4 w-4" /> Test Call
                </h2>
                <p className="text-xs text-white/80 mt-0.5 truncate max-w-[240px]">{selected.name}</p>
              </div>
              <button onClick={() => setShowTestCall(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="e.g. 9309986820"
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 outline-none"
                />
                <p className="text-[10px] text-gray-400 mt-1">Enter 10-digit Indian number. Call comes from 09513886363.</p>
              </div>

              {testResult && (
                <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${testResult.ok ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {testResult.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                  {testResult.msg}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setShowTestCall(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  Close
                </button>
                <button
                  onClick={handleTestCall}
                  disabled={testCalling || !testPhone.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg,#10B981,#34D399)' }}
                >
                  {testCalling ? <Loader2 className="h-4 w-4 animate-spin" /> : <PhoneOutgoing className="h-4 w-4" />}
                  {testCalling ? 'Calling...' : 'Call Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══ Voice URL Uploader Component ═══
function VoiceUploader({ onSave, saving }: { onSave: (url: string, name: string) => void; saving: boolean }) {
  const [voiceUrl, setVoiceUrl] = useState('');
  const [voiceName, setVoiceName] = useState('');

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Add a voice recording URL (Google Drive, Dropbox, or any public link).</p>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Recording Name</label>
        <input
          value={voiceName}
          onChange={e => setVoiceName(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-300 outline-none"
          placeholder="e.g. Welcome Call Hindi v2"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 mb-1 block">Recording URL</label>
        <input
          value={voiceUrl}
          onChange={e => setVoiceUrl(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 focus:border-violet-300 outline-none"
          placeholder="https://drive.google.com/file/..."
        />
      </div>
      <button
        onClick={() => { if (voiceUrl) onSave(voiceUrl, voiceName || 'Recording'); }}
        disabled={saving || !voiceUrl}
        className="flex items-center gap-2 px-5 py-2 rounded-xl text-white text-sm font-bold shadow disabled:opacity-40"
        style={{ background: C.violet.main }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Save Recording
      </button>
    </div>
  );
}
