'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  Zap, Bot, MessageCircle, Send, Mail, SmartphoneNfc, Globe,
  BookOpen, Video, FileText, Radio, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Settings, AlertTriangle, Info, Plus,
  Trash2, GripVertical, ToggleLeft, ToggleRight,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================
interface TriggerMessage {
  id: string;
  keyword: string;
  response: string;
  enabled: boolean;
}

interface ChatbotFlowStep {
  id: string;
  trigger: string;
  message: string;
  nextStep: string;
}

interface IntegrationData {
  // Chatbot & AI
  chatbot: {
    welcomeEnabled: boolean;
    welcomeMessage: string;
    triggerMessages: TriggerMessage[];
    flowSteps: ChatbotFlowStep[];
    aiEnabled: boolean;
    aiModel: string;
    aiSystemPrompt: string;
    aiMaxTokens: number;
    aiTemperature: number;
  };

  // Templates & Broadcast (Meta)
  templates: {
    autoApproval: boolean;
    defaultLanguage: string;
    categories: string[];
    broadcastDefaultTime: string;
    broadcastTimezone: string;
    broadcastDailyLimit: number;
    rateLimitPerSecond: number;
  };

  // Email
  email: {
    defaultFromName: string;
    defaultFromEmail: string;
    footerText: string;
    unsubscribeEnabled: boolean;
    trackOpens: boolean;
    trackClicks: boolean;
  };

  // SMS
  sms: {
    defaultSenderId: string;
    templatePrefix: string;
    optOutKeyword: string;
    optOutMessage: string;
  };

  // Community
  community: {
    autoWelcome: boolean;
    autoWelcomeMessage: string;
    moderationEnabled: boolean;
    bannedWords: string;
    maxMessageLength: number;
  };

  // E-Learning
  eLearning: {
    autoEnrollEnabled: boolean;
    completionCertificate: boolean;
    reminderEnabled: boolean;
    reminderDays: number;
    defaultCurrency: string;
    defaultLanguage: string;
  };

  // Recordings
  recordings: {
    autoSyncZoom: boolean;
    autoPublish: boolean;
    retentionDays: number;
    maxRecordingMB: number;
    notifyOnNewRecording: boolean;
  };
}

const DEFAULTS: IntegrationData = {
  chatbot: {
    welcomeEnabled: true,
    welcomeMessage: 'नमस्ते 🙏 Welcome! How can I help you today?',
    triggerMessages: [],
    flowSteps: [],
    aiEnabled: false,
    aiModel: 'gpt-4o-mini',
    aiSystemPrompt: 'You are a helpful assistant. Be friendly and concise.',
    aiMaxTokens: 250,
    aiTemperature: 0.7,
  },
  templates: {
    autoApproval: false,
    defaultLanguage: 'en',
    categories: ['MARKETING', 'UTILITY'],
    broadcastDefaultTime: '10:00',
    broadcastTimezone: 'Asia/Kolkata',
    broadcastDailyLimit: 1000,
    rateLimitPerSecond: 30,
  },
  email: {
    defaultFromName: '',
    defaultFromEmail: '',
    footerText: '© 2024 Your Business. All rights reserved.',
    unsubscribeEnabled: true,
    trackOpens: true,
    trackClicks: true,
  },
  sms: {
    defaultSenderId: '',
    templatePrefix: '',
    optOutKeyword: 'STOP',
    optOutMessage: 'You have been unsubscribed. Reply START to re-subscribe.',
  },
  community: {
    autoWelcome: true,
    autoWelcomeMessage: 'Welcome to the community! 🎉',
    moderationEnabled: false,
    bannedWords: '',
    maxMessageLength: 5000,
  },
  eLearning: {
    autoEnrollEnabled: false,
    completionCertificate: true,
    reminderEnabled: true,
    reminderDays: 3,
    defaultCurrency: 'INR',
    defaultLanguage: 'en',
  },
  recordings: {
    autoSyncZoom: false,
    autoPublish: false,
    retentionDays: 90,
    maxRecordingMB: 500,
    notifyOnNewRecording: true,
  },
};

type SectionKey = keyof IntegrationData;

// ============================================================================
// Main Page
// ============================================================================
export default function IntegrationHubPage() {
  const token = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<IntegrationData>(DEFAULTS);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['chatbot']));

  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  }, []);

  // Load settings on mount
  useEffect(() => {
    const t = getToken();
    if (!t) return;

    (async () => {
      try {
        const res = await fetch('/api/admin/crm/integration-hub', {
          headers: { Authorization: `Bearer ${t}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.settings) {
            setData(prev => ({
              chatbot: { ...prev.chatbot, ...json.settings.chatbot },
              templates: { ...prev.templates, ...json.settings.templates },
              email: { ...prev.email, ...json.settings.email },
              sms: { ...prev.sms, ...json.settings.sms },
              community: { ...prev.community, ...json.settings.community },
              eLearning: { ...prev.eLearning, ...json.settings.eLearning },
              recordings: { ...prev.recordings, ...json.settings.recordings },
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load integration settings:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [getToken]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const copy = new Set(prev);
      if (copy.has(key)) copy.delete(key); else copy.add(key);
      return copy;
    });
  };

  const updateField = (section: SectionKey, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const saveAll = async () => {
    const t = getToken();
    if (!t) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/crm/integration-hub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        setToast({ type: 'success', text: '✅ Integration settings saved!' });
      } else {
        setToast({ type: 'error', text: json.error || 'Save failed' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Trigger messages CRUD
  const addTrigger = () => {
    setData(prev => ({
      ...prev,
      chatbot: {
        ...prev.chatbot,
        triggerMessages: [...prev.chatbot.triggerMessages, {
          id: Date.now().toString(),
          keyword: '',
          response: '',
          enabled: true,
        }],
      },
    }));
  };

  const updateTrigger = (id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      chatbot: {
        ...prev.chatbot,
        triggerMessages: prev.chatbot.triggerMessages.map(t =>
          t.id === id ? { ...t, [field]: value } : t
        ),
      },
    }));
  };

  const removeTrigger = (id: string) => {
    setData(prev => ({
      ...prev,
      chatbot: {
        ...prev.chatbot,
        triggerMessages: prev.chatbot.triggerMessages.filter(t => t.id !== id),
      },
    }));
  };

  // Flow steps CRUD
  const addFlowStep = () => {
    setData(prev => ({
      ...prev,
      chatbot: {
        ...prev.chatbot,
        flowSteps: [...prev.chatbot.flowSteps, {
          id: Date.now().toString(),
          trigger: '',
          message: '',
          nextStep: '',
        }],
      },
    }));
  };

  const updateFlowStep = (id: string, field: string, value: any) => {
    setData(prev => ({
      ...prev,
      chatbot: {
        ...prev.chatbot,
        flowSteps: prev.chatbot.flowSteps.map(s =>
          s.id === id ? { ...s, [field]: value } : s
        ),
      },
    }));
  };

  const removeFlowStep = (id: string) => {
    setData(prev => ({
      ...prev,
      chatbot: {
        ...prev.chatbot,
        flowSteps: prev.chatbot.flowSteps.filter(s => s.id !== id),
      },
    }));
  };

  const sections: {
    key: SectionKey;
    title: string;
    icon: React.ElementType;
    description: string;
    color: string;
  }[] = [
    { key: 'chatbot', title: 'Chatbot & AI', icon: Bot, description: 'Welcome messages, trigger keywords, chatbot flows, AI settings', color: 'indigo' },
    { key: 'templates', title: 'Templates & Broadcast', icon: Radio, description: 'Meta template approval, broadcast settings, rate limiting', color: 'purple' },
    { key: 'email', title: 'Email Campaigns', icon: Mail, description: 'Email templates, campaign settings, tracking', color: 'blue' },
    { key: 'sms', title: 'SMS Templates', icon: SmartphoneNfc, description: 'SMS templates, sender ID, opt-out management', color: 'green' },
    { key: 'community', title: 'Community', icon: Globe, description: 'Auto-welcome, moderation, community settings', color: 'orange' },
    { key: 'eLearning', title: 'E-Learning', icon: BookOpen, description: 'Course enrollment, certificates, reminders', color: 'rose' },
    { key: 'recordings', title: 'Recordings & Videos', icon: Video, description: 'Zoom sync, auto-publish, retention settings', color: 'cyan' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-indigo-600" />
          Integration Hub
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure chatbot flows, templates, broadcast settings, email campaigns, and all integrations.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(section => {
          const isExpanded = expandedSections.has(section.key);

          return (
            <div key={section.key} className="bg-white rounded-2xl border border-gray-200">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full flex items-center justify-between p-4 sm:p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    <section.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="px-4 sm:px-5 pb-5 border-t border-gray-100 pt-4">
                  {section.key === 'chatbot' && (
                    <ChatbotSection
                      data={data.chatbot}
                      updateField={(f, v) => updateField('chatbot', f, v)}
                      addTrigger={addTrigger}
                      updateTrigger={updateTrigger}
                      removeTrigger={removeTrigger}
                      addFlowStep={addFlowStep}
                      updateFlowStep={updateFlowStep}
                      removeFlowStep={removeFlowStep}
                    />
                  )}
                  {section.key === 'templates' && (
                    <TemplatesSection data={data.templates} updateField={(f, v) => updateField('templates', f, v)} />
                  )}
                  {section.key === 'email' && (
                    <EmailSection data={data.email} updateField={(f, v) => updateField('email', f, v)} />
                  )}
                  {section.key === 'sms' && (
                    <SmsSection data={data.sms} updateField={(f, v) => updateField('sms', f, v)} />
                  )}
                  {section.key === 'community' && (
                    <CommunitySection data={data.community} updateField={(f, v) => updateField('community', f, v)} />
                  )}
                  {section.key === 'eLearning' && (
                    <ELearningSection data={data.eLearning} updateField={(f, v) => updateField('eLearning', f, v)} />
                  )}
                  {section.key === 'recordings' && (
                    <RecordingsSection data={data.recordings} updateField={(f, v) => updateField('recordings', f, v)} />
                  )}

                  {/* Quick links */}
                  <QuickLinks sectionKey={section.key} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save All (sticky bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-end">
          <button
            onClick={saveAll}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg transition"
          >
            {saving ? 'Saving…' : '💾 Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Chatbot Section
// ============================================================================
function ChatbotSection({
  data, updateField, addTrigger, updateTrigger, removeTrigger,
  addFlowStep, updateFlowStep, removeFlowStep,
}: {
  data: IntegrationData['chatbot'];
  updateField: (f: string, v: any) => void;
  addTrigger: () => void;
  updateTrigger: (id: string, f: string, v: any) => void;
  removeTrigger: (id: string) => void;
  addFlowStep: () => void;
  updateFlowStep: (id: string, f: string, v: any) => void;
  removeFlowStep: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <div>
        <SectionTitle title="Welcome Message" />
        <ToggleRow label="Enable Welcome Message" desc="Automatically greet first-time contacts"
          checked={data.welcomeEnabled} onChange={v => updateField('welcomeEnabled', v)} />
        {data.welcomeEnabled && (
          <div className="mt-3">
            <TextAreaField label="Welcome Message" value={data.welcomeMessage}
              onChange={v => updateField('welcomeMessage', v)} rows={3} placeholder="Welcome message text..." />
          </div>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* Trigger Messages */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Trigger Messages" desc="Auto-reply when specific keywords are detected" />
          <button onClick={addTrigger}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition">
            <Plus className="w-4 h-4" /> Add Trigger
          </button>
        </div>
        {data.triggerMessages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No trigger messages yet. Click &quot;Add Trigger&quot; to create one.</p>
        ) : (
          <div className="space-y-3">
            {data.triggerMessages.map(trigger => (
              <div key={trigger.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-4 h-4 text-gray-300 mt-2 shrink-0" />
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Keyword" value={trigger.keyword}
                      onChange={v => updateTrigger(trigger.id, 'keyword', v)} placeholder="e.g. price, hello" />
                    <Field label="Reply" value={trigger.response}
                      onChange={v => updateTrigger(trigger.id, 'response', v)} placeholder="Auto-reply message" />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <button onClick={() => updateTrigger(trigger.id, 'enabled', !trigger.enabled)}
                      className={`p-1 rounded ${trigger.enabled ? 'text-green-500' : 'text-gray-300'}`}>
                      {trigger.enabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => removeTrigger(trigger.id)}
                      className="p-1 text-red-400 hover:text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* Chatbot Flow */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle title="Chatbot Flow" desc="Build multi-step conversation flows" />
          <button onClick={addFlowStep}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-100 transition">
            <Plus className="w-4 h-4" /> Add Step
          </button>
        </div>
        {data.flowSteps.length === 0 ? (
          <div className="text-center py-4">
            <Bot className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No flow steps. Add steps to build a conversation flow.</p>
            <p className="text-xs text-gray-400 mt-1">Or use the <a href="/admin/crm/chatbot-builder" className="text-indigo-500 hover:underline">Chatbot Builder</a> for visual editing.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data.flowSteps.map((step, idx) => (
              <div key={step.id} className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    Step {idx + 1}
                  </span>
                  <button onClick={() => removeFlowStep(step.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Trigger (keyword/option)" value={step.trigger}
                    onChange={v => updateFlowStep(step.id, 'trigger', v)} placeholder="e.g. 1, yes, courses" />
                  <Field label="Bot Message" value={step.message}
                    onChange={v => updateFlowStep(step.id, 'message', v)} placeholder="What bot says" />
                  <Field label="Next Step (step # or end)" value={step.nextStep}
                    onChange={v => updateFlowStep(step.id, 'nextStep', v)} placeholder="2 or end" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <hr className="border-gray-100" />

      {/* AI Settings */}
      <div>
        <SectionTitle title="AI Agent Settings" desc="Use AI to handle conversations the chatbot can't" />
        <ToggleRow label="Enable AI Agent" desc="Requires AI API key configured in Connections Hub"
          checked={data.aiEnabled} onChange={v => updateField('aiEnabled', v)} />
        {data.aiEnabled && (
          <div className="mt-3 space-y-3">
            <SelectField label="AI Model" value={data.aiModel} onChange={v => updateField('aiModel', v)}
              options={[
                { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast)' },
                { value: 'gpt-4o', label: 'GPT-4o (Balanced)' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo (Powerful)' },
                { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
              ]}
            />
            <TextAreaField label="System Prompt" value={data.aiSystemPrompt}
              onChange={v => updateField('aiSystemPrompt', v)} rows={3}
              placeholder="Instructions for the AI agent..." />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Max Tokens" value={data.aiMaxTokens}
                onChange={v => updateField('aiMaxTokens', v)} min={50} max={4000} />
              <NumberField label="Temperature (0-1)" value={data.aiTemperature}
                onChange={v => updateField('aiTemperature', v)} min={0} max={1} step={0.1} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Templates & Broadcast Section
// ============================================================================
function TemplatesSection({ data, updateField }: { data: IntegrationData['templates']; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Meta Template Settings" desc="Configure template approval and broadcast parameters" />
      <ToggleRow label="Auto-Submit for Approval" desc="Automatically submit new templates to Meta for approval"
        checked={data.autoApproval} onChange={v => updateField('autoApproval', v)} />
      <SelectField label="Default Language" value={data.defaultLanguage} onChange={v => updateField('defaultLanguage', v)}
        options={[
          { value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' },
          { value: 'mr', label: 'Marathi' }, { value: 'ne', label: 'Nepali' },
        ]}
      />
      <hr className="border-gray-100" />
      <SectionTitle title="Broadcast Settings" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Default Send Time" value={data.broadcastDefaultTime} type="time"
          onChange={v => updateField('broadcastDefaultTime', v)} />
        <SelectField label="Timezone" value={data.broadcastTimezone} onChange={v => updateField('broadcastTimezone', v)}
          options={[
            { value: 'Asia/Kolkata', label: 'IST (India)' },
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'EST' },
          ]}
        />
        <NumberField label="Daily Broadcast Limit" value={data.broadcastDailyLimit}
          onChange={v => updateField('broadcastDailyLimit', v)} min={1} max={100000} />
        <NumberField label="Rate Limit (msgs/sec)" value={data.rateLimitPerSecond}
          onChange={v => updateField('rateLimitPerSecond', v)} min={1} max={100} />
      </div>
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-700">Meta limits messaging to 1,000/day for new business accounts. <a href="/admin/crm/meta/templates" className="underline">Manage Templates →</a></p>
      </div>
    </div>
  );
}

// ============================================================================
// Email Section
// ============================================================================
function EmailSection({ data, updateField }: { data: IntegrationData['email']; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Email Campaign Settings" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Default From Name" value={data.defaultFromName} onChange={v => updateField('defaultFromName', v)} placeholder="Your Business" />
        <Field label="Default From Email" value={data.defaultFromEmail} onChange={v => updateField('defaultFromEmail', v)} placeholder="noreply@domain.com" />
      </div>
      <TextAreaField label="Email Footer Text" value={data.footerText} onChange={v => updateField('footerText', v)} rows={2} />
      <ToggleRow label="Unsubscribe Link" desc="Include unsubscribe link in all emails (required by law)"
        checked={data.unsubscribeEnabled} onChange={v => updateField('unsubscribeEnabled', v)} />
      <ToggleRow label="Track Opens" desc="Track when recipients open emails"
        checked={data.trackOpens} onChange={v => updateField('trackOpens', v)} />
      <ToggleRow label="Track Clicks" desc="Track link clicks in emails"
        checked={data.trackClicks} onChange={v => updateField('trackClicks', v)} />
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-700">Configure email credentials in <a href="/admin/crm/connections" className="underline">Connections Hub</a> first. <a href="/admin/crm/email" className="underline ml-2">Email Dashboard →</a></p>
      </div>
    </div>
  );
}

// ============================================================================
// SMS Section
// ============================================================================
function SmsSection({ data, updateField }: { data: IntegrationData['sms']; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="SMS Settings" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Default Sender ID" value={data.defaultSenderId} onChange={v => updateField('defaultSenderId', v)} placeholder="SWARYG" />
        <Field label="Template Prefix" value={data.templatePrefix} onChange={v => updateField('templatePrefix', v)} placeholder="Your DLT prefix" />
      </div>
      <hr className="border-gray-100" />
      <SectionTitle title="Opt-Out Settings" desc="Manage SMS unsubscribe keywords" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Opt-Out Keyword" value={data.optOutKeyword} onChange={v => updateField('optOutKeyword', v)} placeholder="STOP" />
      </div>
      <TextAreaField label="Opt-Out Reply Message" value={data.optOutMessage} onChange={v => updateField('optOutMessage', v)} rows={2} />
      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-2">
        <Info className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
        <p className="text-sm text-indigo-700">SMS provider credentials (PAN, API Key) go in <a href="/admin/crm/connections" className="underline">Connections Hub</a>. <a href="/admin/crm/messages" className="underline ml-2">SMS Dashboard →</a></p>
      </div>
    </div>
  );
}

// ============================================================================
// Community Section
// ============================================================================
function CommunitySection({ data, updateField }: { data: IntegrationData['community']; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Community Settings" />
      <ToggleRow label="Auto-Welcome New Members" desc="Automatically send welcome message to new members"
        checked={data.autoWelcome} onChange={v => updateField('autoWelcome', v)} />
      {data.autoWelcome && (
        <TextAreaField label="Welcome Message" value={data.autoWelcomeMessage}
          onChange={v => updateField('autoWelcomeMessage', v)} rows={2} />
      )}
      <hr className="border-gray-100" />
      <ToggleRow label="Content Moderation" desc="Auto-moderate messages for banned words"
        checked={data.moderationEnabled} onChange={v => updateField('moderationEnabled', v)} />
      {data.moderationEnabled && (
        <TextAreaField label="Banned Words (comma-separated)" value={data.bannedWords}
          onChange={v => updateField('bannedWords', v)} rows={2} placeholder="spam, scam, ..." />
      )}
      <NumberField label="Max Message Length" value={data.maxMessageLength}
        onChange={v => updateField('maxMessageLength', v)} min={100} max={50000} />
    </div>
  );
}

// ============================================================================
// E-Learning Section
// ============================================================================
function ELearningSection({ data, updateField }: { data: IntegrationData['eLearning']; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="E-Learning Settings" />
      <ToggleRow label="Auto-Enroll on Payment" desc="Automatically enroll students when payment is confirmed"
        checked={data.autoEnrollEnabled} onChange={v => updateField('autoEnrollEnabled', v)} />
      <ToggleRow label="Completion Certificates" desc="Issue certificates when course is completed"
        checked={data.completionCertificate} onChange={v => updateField('completionCertificate', v)} />
      <ToggleRow label="Reminder Notifications" desc="Send reminders for incomplete courses"
        checked={data.reminderEnabled} onChange={v => updateField('reminderEnabled', v)} />
      {data.reminderEnabled && (
        <NumberField label="Reminder After (days)" value={data.reminderDays}
          onChange={v => updateField('reminderDays', v)} min={1} max={30} />
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Default Currency" value={data.defaultCurrency} onChange={v => updateField('defaultCurrency', v)}
          options={[
            { value: 'INR', label: '₹ INR' }, { value: 'USD', label: '$ USD' },
            { value: 'NPR', label: 'Rs NPR' }, { value: 'EUR', label: '€ EUR' },
          ]}
        />
        <SelectField label="Default Language" value={data.defaultLanguage} onChange={v => updateField('defaultLanguage', v)}
          options={[
            { value: 'en', label: 'English' }, { value: 'hi', label: 'Hindi' },
            { value: 'mr', label: 'Marathi' }, { value: 'ne', label: 'Nepali' },
          ]}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Recordings Section
// ============================================================================
function RecordingsSection({ data, updateField }: { data: IntegrationData['recordings']; updateField: (f: string, v: any) => void }) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Recordings & Video Settings" />
      <ToggleRow label="Auto-Sync Zoom Recordings" desc="Automatically import new Zoom recordings"
        checked={data.autoSyncZoom} onChange={v => updateField('autoSyncZoom', v)} />
      <ToggleRow label="Auto-Publish" desc="Automatically publish recordings after sync"
        checked={data.autoPublish} onChange={v => updateField('autoPublish', v)} />
      <ToggleRow label="Notify on New Recording" desc="Send notification when new recording is available"
        checked={data.notifyOnNewRecording} onChange={v => updateField('notifyOnNewRecording', v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <NumberField label="Retention (days)" value={data.retentionDays}
          onChange={v => updateField('retentionDays', v)} min={7} max={365} />
        <NumberField label="Max Recording Size (MB)" value={data.maxRecordingMB}
          onChange={v => updateField('maxRecordingMB', v)} min={50} max={5000} />
      </div>
    </div>
  );
}

// ============================================================================
// Quick Links
// ============================================================================
function QuickLinks({ sectionKey }: { sectionKey: string }) {
  const links: Record<string, { label: string; href: string }[]> = {
    chatbot: [
      { label: 'Chatbot Builder', href: '/admin/crm/chatbot-builder' },
      { label: 'Knowledge Base', href: '/admin/crm/knowledge-base' },
      { label: 'AI Agents', href: '/admin/crm/ai-agents' },
    ],
    templates: [
      { label: 'Manage Templates', href: '/admin/crm/templates' },
      { label: 'Send Template', href: '/admin/crm/send-template' },
      { label: 'Broadcast', href: '/admin/crm/broadcast' },
    ],
    email: [
      { label: 'Email Dashboard', href: '/admin/crm/email' },
    ],
    sms: [
      { label: 'SMS Dashboard', href: '/admin/crm/messages' },
    ],
    community: [
      { label: 'Community Hub', href: '/admin/crm/community' },
      { label: 'Moderation', href: '/admin/crm/community-moderation' },
    ],
    eLearning: [
      { label: 'E-Learning Admin', href: '/admin/crm/e-learning' },
    ],
    recordings: [
      { label: 'Recording Management', href: '/admin/crm/recording-management' },
      { label: 'Zoom Analytics', href: '/admin/crm/zoom-analytics' },
    ],
  };

  const sectionLinks = links[sectionKey] || [];
  if (sectionLinks.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {sectionLinks.map(link => (
        <a key={link.href} href={link.href}
          className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition font-medium">
          {link.label} →
        </a>
      ))}
    </div>
  );
}

// ============================================================================
// Reusable Components
// ============================================================================
function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
    </div>
  );
}

function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
      <div>
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
      <button onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
          checked ? 'bg-indigo-600' : 'bg-gray-300'
        }`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform mt-1 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </div>
  );
}

function TextAreaField({ label, value, onChange, rows = 3, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y" />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))}
        min={min} max={max} step={step}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
