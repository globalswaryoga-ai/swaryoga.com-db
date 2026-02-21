'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface WhatsAppTemplate {
  _id: string;
  templateName: string;
  templateContent: string;
  language: string;
  category?: string;
  headerMedia?: { kind: string; url: string };
  buttons?: Array<{ type: string; title: string }>;
  metaStatus?: string;
  createdAt?: string;
}

interface QuickMessage {
  id: string;
  text: string;
  imageUrl?: string;
  buttons?: string[];
  delayMinutes?: number;
}

interface AutoAssignRule {
  id: string;
  name: string;
  enabled: boolean;
  keywords?: string[];
  assignTo: string;
}

interface FormTemplate {
  id: string;
  name: string;
  url: string;
  description?: string;
}

interface AdminUser {
  _id: string;
  userId: string;
  name: string;
}

interface ChatbotConfig {
  enabled: boolean;
  welcomeMessage: string;
  fallbackMessage: string;
  keywords: Array<{
    keyword: string;
    response: string;
    action?: 'reply' | 'forward_to_agent' | 'send_template';
    templateName?: string;
  }>;
  autoReplyDelay: number; // seconds
  workingHours: {
    enabled: boolean;
    start: string; // "09:00"
    end: string;   // "18:00"
    timezone: string;
    offHoursMessage: string;
  };
  aiEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string;
  maxAiTokens: number;
  // NEW: Quick Messages with Image + Buttons
  quickMessages: QuickMessage[];
  // NEW: Auto Assign
  autoAssignEnabled: boolean;
  autoAssignRules: AutoAssignRule[];
  defaultAssignee: string;
  // NEW: Forms
  formTemplates: FormTemplate[];
  // NEW: Auto Close
  autoCloseEnabled: boolean;
  autoCloseMinutes: number;
  autoCloseMessage: string;
  autoCloseExcludeLabels: string[];
}

const defaultConfig: ChatbotConfig = {
  enabled: false,
  welcomeMessage: 'नमस्ते 🙏 Swar Yoga में आपका स्वागत है!\n\nHow can I help you today?\n\n1️⃣ Workshop Information\n2️⃣ Course Fees\n3️⃣ Schedule\n4️⃣ Talk to Human',
  fallbackMessage: 'I\'m sorry, I didn\'t understand that. Please choose from the options or type "help" for assistance.',
  keywords: [
    { keyword: '1', response: 'Our workshops include:\n• Basic Pranayama\n• Advanced Breathing\n• Youth Program\n\nType the workshop name for more details!', action: 'reply' },
    { keyword: '2', response: 'Course fees vary by program:\n• Basic: ₹2,100\n• Advanced: ₹3,500\n• Youth: ₹1,500\n\nWould you like to register?', action: 'reply' },
    { keyword: '3', response: 'Our classes run:\n• Morning: 6 AM - 7 AM\n• Evening: 6 PM - 7 PM\n\nMonday to Saturday', action: 'reply' },
    { keyword: '4', response: 'Connecting you to our team. Please wait...', action: 'forward_to_agent' },
    { keyword: 'help', response: 'Available commands:\n1️⃣ Workshop Info\n2️⃣ Fees\n3️⃣ Schedule\n4️⃣ Talk to Human\n\nOr just ask your question!', action: 'reply' },
  ],
  autoReplyDelay: 2,
  workingHours: {
    enabled: false,
    start: '09:00',
    end: '18:00',
    timezone: 'Asia/Kolkata',
    offHoursMessage: 'We are currently offline. Our team will respond during business hours (9 AM - 6 PM IST).',
  },
  aiEnabled: false,
  aiModel: 'gpt-3.5-turbo',
  aiSystemPrompt: 'You are a helpful assistant for Swar Yoga, a yoga and pranayama center. Be friendly, concise, and helpful. Answer questions about yoga, breathing techniques, and our services.',
  maxAiTokens: 150,
  // NEW defaults
  quickMessages: [
    { id: '1', text: 'Hello! How can I help you today?' },
    { id: '2', text: 'Thank you for your interest in Swar Yoga.' },
    { id: '3', text: 'Our next workshop is scheduled soon. Would you like details?' },
  ],
  autoAssignEnabled: true,
  autoAssignRules: [],
  defaultAssignee: '',
  formTemplates: [
    { id: '1', name: 'Workshop Registration', url: 'https://swaryoga.com/register', description: 'Register for upcoming workshops' },
    { id: '2', name: 'Feedback Form', url: 'https://swaryoga.com/feedback', description: 'Share your experience' },
  ],
  autoCloseEnabled: false,
  autoCloseMinutes: 1440, // 24 hours
  autoCloseMessage: 'This chat has been closed due to inactivity. Feel free to message us again anytime! 🙏',
  autoCloseExcludeLabels: ['VIP', 'Priority'],
};

export default function ChatbotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig>(defaultConfig);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'keywords' | 'templates' | 'messages' | 'assign' | 'forms' | 'autoclose' | 'ai' | 'hours'>('general');
  const [newKeyword, setNewKeyword] = useState({ keyword: '', response: '', action: 'reply' as const, templateName: '' });
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  // Quick Message Composer State
  const [qmText, setQmText] = useState('');
  const [qmImageUrl, setQmImageUrl] = useState('');
  const [qmButtons, setQmButtons] = useState<string[]>(['']);
  const [qmDelay, setQmDelay] = useState(0);

  // Get token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
  };

  // Load templates
  const fetchTemplates = async () => {
    const token = getToken();
    if (!token) return;

    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/admin/crm/templates?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = data?.data?.templates || data?.templates || [];
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load admin users
  const fetchAdminUsers = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data?.users || data?.data?.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin users:', err);
    }
  };

  // Load config
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/admin/crm/chatbot/config', {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.config) {
            setConfig({ ...defaultConfig, ...data.config });
          }
        }
      } catch (err) {
        console.error('Failed to load chatbot config:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    fetchTemplates();
    fetchAdminUsers();
  }, [router]);

  // Save config
  const saveConfig = async () => {
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/admin/crm/chatbot/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✅ Configuration saved successfully!');
      } else {
        setError(data.error || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Add keyword
  const addKeyword = () => {
    if (!newKeyword.keyword.trim()) {
      setError('Keyword is required');
      return;
    }
    if (newKeyword.action === 'send_template' && !newKeyword.templateName) {
      setError('Please select a template');
      return;
    }
    if (newKeyword.action !== 'send_template' && !newKeyword.response.trim()) {
      setError('Response is required');
      return;
    }

    setConfig({
      ...config,
      keywords: [...config.keywords, { ...newKeyword }],
    });
    setNewKeyword({ keyword: '', response: '', action: 'reply', templateName: '' });
    setError('');
  };

  // Remove keyword
  const removeKeyword = (index: number) => {
    setConfig({
      ...config,
      keywords: config.keywords.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="dark-theme min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="dark-theme min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-purple-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="text-purple-300 hover:text-white">
                ← Back to CRM
              </Link>
              <h1 className="text-2xl font-bold text-white">🤖 Chatbot (AI) Settings</h1>
            </div>
            <button
              onClick={saveConfig}
              disabled={saving}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-500/50 text-green-200 rounded-lg">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500/50 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* Enable/Disable Toggle */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 mb-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Chatbot Status</h2>
              <p className="text-purple-200 text-sm mt-1">
                Enable automatic responses to WhatsApp messages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-600"></div>
              <span className="ml-3 text-sm font-medium text-white">
                {config.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'general', label: '⚙️ General', icon: '⚙️' },
            { id: 'keywords', label: '🔑 Keywords', icon: '🔑' },
            { id: 'templates', label: '📋 Templates', icon: '📋' },
            { id: 'messages', label: '💬 Messages+Buttons', icon: '💬' },
            { id: 'assign', label: '👥 Auto Assign', icon: '👥' },
            { id: 'forms', label: '📝 Forms', icon: '📝' },
            { id: 'autoclose', label: '🔒 Auto Close', icon: '🔒' },
            { id: 'ai', label: '🧠 AI Settings', icon: '🧠' },
            { id: 'hours', label: '🕐 Working Hours', icon: '🕐' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700/50 text-purple-200 hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/20">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <label className="block text-white font-medium mb-2">Welcome Message</label>
                <textarea
                  value={config.welcomeMessage}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  rows={5}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="First message sent to new contacts..."
                />
                <p className="text-purple-300 text-sm mt-1">Sent when a user messages for the first time</p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Fallback Message</label>
                <textarea
                  value={config.fallbackMessage}
                  onChange={(e) => setConfig({ ...config, fallbackMessage: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="Message when no keyword matches..."
                />
                <p className="text-purple-300 text-sm mt-1">Sent when the bot doesn't understand the user's message</p>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Auto-Reply Delay (seconds)</label>
                <input
                  type="number"
                  value={config.autoReplyDelay}
                  onChange={(e) => setConfig({ ...config, autoReplyDelay: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={30}
                  className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-purple-500"
                />
                <p className="text-purple-300 text-sm mt-1">Delay before sending auto-reply (0-30 seconds)</p>
              </div>
            </div>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Keyword Responses</h3>
                <p className="text-purple-200 text-sm mb-4">
                  Define automatic responses for specific keywords or phrases. You can send text replies, forward to agent, or send a WhatsApp template.
                </p>

                {/* Add New Keyword */}
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-3">Add New Keyword</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input
                      type="text"
                      value={newKeyword.keyword}
                      onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                      placeholder="Keyword (e.g., 'price', '1', 'register')"
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                    />
                    <select
                      value={newKeyword.action}
                      onChange={(e) => setNewKeyword({ ...newKeyword, action: e.target.value as any })}
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="reply">💬 Auto Reply (Text)</option>
                      <option value="send_template">📋 Send Template</option>
                      <option value="forward_to_agent">👤 Forward to Agent</option>
                    </select>
                  </div>
                  
                  {/* Show response input for reply/forward */}
                  {newKeyword.action !== 'send_template' && (
                    <input
                      type="text"
                      value={newKeyword.response}
                      onChange={(e) => setNewKeyword({ ...newKeyword, response: e.target.value })}
                      placeholder="Response message..."
                      className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400 mb-4"
                    />
                  )}
                  
                  {/* Show template picker for send_template */}
                  {newKeyword.action === 'send_template' && (
                    <div className="mb-4">
                      <select
                        value={newKeyword.templateName}
                        onChange={(e) => setNewKeyword({ ...newKeyword, templateName: e.target.value, response: `Template: ${e.target.value}` })}
                        className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="">Select a template...</option>
                        {templates.map((t) => (
                          <option key={t._id} value={t.templateName}>
                            {t.templateName} ({t.language}) {t.metaStatus === 'APPROVED' ? '✅' : t.metaStatus === 'PENDING' ? '⏳' : ''}
                          </option>
                        ))}
                      </select>
                      {templates.length === 0 && (
                        <p className="text-amber-300 text-sm mt-2">
                          No templates found. <Link href="/admin/crm/meta/templates" className="underline">Create templates first</Link>
                        </p>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    ➕ Add Keyword
                  </button>
                </div>

                {/* Keywords List */}
                <div className="space-y-2">
                  {config.keywords.map((kw, index) => (
                    <div key={index} className="flex items-start gap-4 bg-slate-700/30 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded font-mono">
                            {kw.keyword}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            kw.action === 'forward_to_agent' ? 'bg-amber-600' : 
                            kw.action === 'send_template' ? 'bg-blue-600' : 'bg-green-600'
                          } text-white`}>
                            {kw.action === 'forward_to_agent' ? '👤 Forward' : 
                             kw.action === 'send_template' ? '📋 Template' : '💬 Reply'}
                          </span>
                          {kw.templateName && (
                            <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded">
                              {kw.templateName}
                            </span>
                          )}
                        </div>
                        <p className="text-purple-200 text-sm truncate">{kw.response}</p>
                      </div>
                      <button
                        onClick={() => removeKeyword(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {config.keywords.length === 0 && (
                    <p className="text-center text-purple-300 py-4">No keywords configured yet</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Templates Tab */}
          {activeTab === 'templates' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">WhatsApp Templates</h3>
                  <p className="text-purple-200 text-sm">All created message templates</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={fetchTemplates}
                    disabled={loadingTemplates}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                  >
                    {loadingTemplates ? '⏳ Loading...' : '🔄 Refresh'}
                  </button>
                  <Link
                    href="/admin/crm/meta/templates"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                  >
                    ➕ Create New
                  </Link>
                </div>
              </div>

              {loadingTemplates ? (
                <div className="text-center py-8 text-purple-300">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-purple-300 mb-4">No templates created yet</p>
                  <Link
                    href="/admin/crm/meta/templates/new"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg inline-block"
                  >
                    Create Your First Template
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map((t) => (
                    <div key={t._id} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
                      {/* Template Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold">{t.templateName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-purple-300 bg-purple-900/50 px-2 py-0.5 rounded">
                              {t.language}
                            </span>
                            {t.category && (
                              <span className="text-xs text-blue-300 bg-blue-900/50 px-2 py-0.5 rounded">
                                {t.category}
                              </span>
                            )}
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              t.metaStatus === 'APPROVED' ? 'bg-green-900/50 text-green-300' :
                              t.metaStatus === 'PENDING' ? 'bg-yellow-900/50 text-yellow-300' :
                              t.metaStatus === 'REJECTED' ? 'bg-red-900/50 text-red-300' :
                              'bg-slate-600 text-slate-300'
                            }`}>
                              {t.metaStatus === 'APPROVED' ? '✅ Approved' :
                               t.metaStatus === 'PENDING' ? '⏳ Pending' :
                               t.metaStatus === 'REJECTED' ? '❌ Rejected' :
                               '📝 Draft'}
                            </span>
                          </div>
                        </div>
                        {t.headerMedia?.url && (
                          <img
                            src={t.headerMedia.url}
                            alt=""
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                      </div>

                      {/* Template Preview */}
                      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
                        <p className="text-purple-100 text-sm whitespace-pre-wrap line-clamp-4">
                          {t.templateContent}
                        </p>
                      </div>

                      {/* Buttons */}
                      {t.buttons && t.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {t.buttons.map((btn, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-600/30 text-blue-200 rounded text-xs">
                              {btn.type === 'QUICK_REPLY' ? '↩️' : '🔗'} {btn.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between text-xs text-purple-300">
                        <span>Created: {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}</span>
                        <Link
                          href={`/admin/crm/meta/templates`}
                          className="text-purple-400 hover:text-purple-300"
                        >
                          Edit →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages + Buttons Tab (NEW) */}
          {activeTab === 'messages' && (
            <div className="space-y-6">
              {/* Message Composer */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">📝 Create Quick Message with Image & Buttons</h3>
                
                {/* Image URL */}
                <div className="mb-4">
                  <label className="block text-white font-medium mb-2">🖼️ Image URL (optional)</label>
                  <input
                    type="url"
                    value={qmImageUrl}
                    onChange={(e) => setQmImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full bg-slate-600 border border-slate-500 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                  />
                </div>

                {/* Message Text */}
                <div className="mb-4">
                  <label className="block text-white font-medium mb-2">💬 Message Text *</label>
                  <textarea
                    value={qmText}
                    onChange={(e) => setQmText(e.target.value)}
                    rows={3}
                    placeholder="Enter your message... Use *bold*, _italic_ for formatting"
                    className="w-full bg-slate-600 border border-slate-500 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                  />
                </div>

                {/* Buttons */}
                <div className="mb-4">
                  <label className="block text-white font-medium mb-2">🔘 Quick Reply Buttons (max 3)</label>
                  <div className="space-y-2">
                    {qmButtons.map((btn, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={btn}
                          onChange={(e) => {
                            const newBtns = [...qmButtons];
                            newBtns[i] = e.target.value;
                            setQmButtons(newBtns);
                          }}
                          maxLength={20}
                          placeholder={`Button ${i + 1}`}
                          className="flex-1 bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                        />
                        {qmButtons.length > 1 && (
                          <button
                            onClick={() => setQmButtons(prev => prev.filter((_, idx) => idx !== i))}
                            className="px-3 py-2 text-red-400 hover:bg-red-900/30 rounded-lg"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    {qmButtons.length < 3 && (
                      <button
                        onClick={() => setQmButtons(prev => [...prev, ''])}
                        className="text-sm text-purple-300 hover:text-purple-200"
                      >
                        + Add button
                      </button>
                    )}
                  </div>
                </div>

                {/* Timer/Delay */}
                <div className="mb-4">
                  <label className="block text-white font-medium mb-2">⏱️ Send Delay (optional)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={qmDelay}
                      onChange={(e) => setQmDelay(Number(e.target.value))}
                      min={0}
                      max={1440}
                      className="w-24 bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white"
                    />
                    <span className="text-purple-200">minutes</span>
                    <span className="text-xs text-slate-400">(0 = send immediately)</span>
                  </div>
                </div>

                {/* Preview & Add */}
                <div className="flex gap-3 pt-4 border-t border-slate-600">
                  <button
                    onClick={() => {
                      if (!qmText.trim()) return;
                      const newMsg: QuickMessage = {
                        id: Date.now().toString(),
                        text: qmText,
                        imageUrl: qmImageUrl || undefined,
                        buttons: qmButtons.filter(b => b.trim()),
                        delayMinutes: qmDelay || undefined,
                      };
                      setConfig(prev => ({
                        ...prev,
                        quickMessages: [...(prev.quickMessages || []), newMsg],
                      }));
                      setQmText('');
                      setQmImageUrl('');
                      setQmButtons(['']);
                      setQmDelay(0);
                    }}
                    disabled={!qmText.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white rounded-lg font-medium"
                  >
                    ➕ Add Quick Message
                  </button>
                </div>

                {/* Preview */}
                {qmText && (
                  <div className="mt-4 p-4 bg-[#0d1418] rounded-lg">
                    <p className="text-xs text-purple-300 mb-2">Preview:</p>
                    <div className="max-w-xs bg-slate-700 rounded-lg overflow-hidden">
                      {qmImageUrl && (
                        <img src={qmImageUrl} alt="" className="w-full h-24 object-cover" />
                      )}
                      <div className="p-3">
                        <p className="text-white text-sm whitespace-pre-wrap">{qmText}</p>
                        <p className="text-xs text-slate-400 text-right mt-1">
                          {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {qmButtons.filter(b => b.trim()).length > 0 && (
                        <div className="border-t border-slate-600">
                          {qmButtons.filter(b => b.trim()).map((btn, i) => (
                            <div key={i} className="p-2 text-center text-blue-400 text-sm border-b border-slate-600 last:border-0">
                              {btn}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {qmDelay > 0 && (
                      <p className="text-xs text-amber-300 mt-2">⏱️ Will be sent after {qmDelay} minute(s)</p>
                    )}
                  </div>
                )}
              </div>

              {/* Saved Quick Messages */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Saved Quick Messages ({config.quickMessages?.length || 0})</h3>
                {!config.quickMessages || config.quickMessages.length === 0 ? (
                  <p className="text-center text-purple-300 py-4">No quick messages saved yet</p>
                ) : (
                  <div className="space-y-3">
                    {config.quickMessages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-3 bg-slate-700/50 rounded-lg p-3">
                        <div className="flex-1">
                          <p className="text-white text-sm">{msg.text}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.imageUrl && (
                              <span className="text-xs bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded">📷 Image</span>
                            )}
                            {msg.buttons && msg.buttons.length > 0 && (
                              <span className="text-xs bg-green-900/50 text-green-300 px-2 py-0.5 rounded">🔘 {msg.buttons.length} btn</span>
                            )}
                            {msg.delayMinutes && (
                              <span className="text-xs bg-amber-900/50 text-amber-300 px-2 py-0.5 rounded">⏱️ {msg.delayMinutes}m</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setConfig(prev => ({
                            ...prev,
                            quickMessages: prev.quickMessages?.filter(m => m.id !== msg.id) || [],
                          }))}
                          className="text-red-400 hover:text-red-300 p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Auto Assign Tab (NEW) */}
          {activeTab === 'assign' && (
            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">Auto-Assign New Leads</h3>
                  <p className="text-purple-200 text-sm">Automatically assign incoming leads to admin users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoAssignEnabled}
                    onChange={(e) => setConfig({ ...config, autoAssignEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {config.autoAssignEnabled && (
                <>
                  {/* Default Assignee */}
                  <div>
                    <label className="block text-white font-medium mb-2">Default Assignee</label>
                    <select
                      value={config.defaultAssignee}
                      onChange={(e) => setConfig({ ...config, defaultAssignee: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="">-- Select Admin User --</option>
                      {adminUsers.map(u => (
                        <option key={u._id} value={u.userId}>{u.name} ({u.userId})</option>
                      ))}
                    </select>
                    <p className="text-purple-300 text-sm mt-1">New leads will be assigned to this user when no rules match</p>
                  </div>

                  {/* Rules */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium">Assignment Rules</h4>
                      <button
                        onClick={() => {
                          const newRule: AutoAssignRule = {
                            id: Date.now().toString(),
                            name: `Rule ${(config.autoAssignRules?.length || 0) + 1}`,
                            enabled: true,
                            keywords: [],
                            assignTo: config.defaultAssignee || adminUsers[0]?.userId || '',
                          };
                          setConfig(prev => ({
                            ...prev,
                            autoAssignRules: [...(prev.autoAssignRules || []), newRule],
                          }));
                        }}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                      >
                        ➕ Add Rule
                      </button>
                    </div>
                    
                    {!config.autoAssignRules || config.autoAssignRules.length === 0 ? (
                      <p className="text-center text-purple-300 py-4">No rules defined. All leads will go to default assignee.</p>
                    ) : (
                      <div className="space-y-3">
                        {config.autoAssignRules.map((rule, idx) => (
                          <div key={rule.id} className="bg-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <input
                                type="text"
                                value={rule.name}
                                onChange={(e) => {
                                  const updated = [...config.autoAssignRules];
                                  updated[idx].name = e.target.value;
                                  setConfig(prev => ({ ...prev, autoAssignRules: updated }));
                                }}
                                className="bg-transparent text-white font-medium border-b border-transparent hover:border-slate-500 focus:border-purple-500 outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-sm text-purple-200">
                                  <input
                                    type="checkbox"
                                    checked={rule.enabled}
                                    onChange={(e) => {
                                      const updated = [...config.autoAssignRules];
                                      updated[idx].enabled = e.target.checked;
                                      setConfig(prev => ({ ...prev, autoAssignRules: updated }));
                                    }}
                                    className="w-4 h-4 rounded"
                                  />
                                  Active
                                </label>
                                <button
                                  onClick={() => setConfig(prev => ({
                                    ...prev,
                                    autoAssignRules: prev.autoAssignRules.filter(r => r.id !== rule.id),
                                  }))}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="text-xs text-purple-300 block mb-1">Assign To</label>
                                <select
                                  value={rule.assignTo}
                                  onChange={(e) => {
                                    const updated = [...config.autoAssignRules];
                                    updated[idx].assignTo = e.target.value;
                                    setConfig(prev => ({ ...prev, autoAssignRules: updated }));
                                  }}
                                  className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm"
                                >
                                  {adminUsers.map(u => (
                                    <option key={u._id} value={u.userId}>{u.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-purple-300 block mb-1">Keywords (comma-separated)</label>
                                <input
                                  type="text"
                                  value={(rule.keywords || []).join(', ')}
                                  onChange={(e) => {
                                    const updated = [...config.autoAssignRules];
                                    updated[idx].keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                                    setConfig(prev => ({ ...prev, autoAssignRules: updated }));
                                  }}
                                  placeholder="workshop, yoga, health"
                                  className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-400"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Forms Tab (NEW) */}
          {activeTab === 'forms' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">📝 Form Templates for WhatsApp</h3>
                <p className="text-purple-200 text-sm mb-4">Send form links to collect lead information</p>

                {/* Existing Forms */}
                <div className="space-y-3 mb-6">
                  {(config.formTemplates || []).map((form, idx) => (
                    <div key={form.id} className="bg-slate-700/50 rounded-lg p-4 flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{form.name}</h4>
                        {form.description && <p className="text-purple-200 text-sm">{form.description}</p>}
                        <a href={form.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">
                          {form.url}
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const msg = `Please fill out this form: ${form.url}`;
                            navigator.clipboard.writeText(msg);
                            setMessage('✅ Form link copied!');
                            setTimeout(() => setMessage(''), 2000);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm"
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => setConfig(prev => ({
                            ...prev,
                            formTemplates: prev.formTemplates.filter(f => f.id !== form.id),
                          }))}
                          className="px-3 py-1.5 text-red-400 hover:bg-red-900/30 rounded-lg text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add New Form */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3">Add New Form</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      id="newFormName"
                      placeholder="Form Name"
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                    />
                    <input
                      type="url"
                      id="newFormUrl"
                      placeholder="Form URL"
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                    />
                    <input
                      type="text"
                      id="newFormDesc"
                      placeholder="Description (optional)"
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const nameEl = document.getElementById('newFormName') as HTMLInputElement;
                      const urlEl = document.getElementById('newFormUrl') as HTMLInputElement;
                      const descEl = document.getElementById('newFormDesc') as HTMLInputElement;
                      if (!nameEl.value || !urlEl.value) return;
                      
                      const newForm: FormTemplate = {
                        id: Date.now().toString(),
                        name: nameEl.value,
                        url: urlEl.value,
                        description: descEl.value || undefined,
                      };
                      setConfig(prev => ({
                        ...prev,
                        formTemplates: [...(prev.formTemplates || []), newForm],
                      }));
                      nameEl.value = '';
                      urlEl.value = '';
                      descEl.value = '';
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  >
                    ➕ Add Form
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Auto Close Tab (NEW) */}
          {activeTab === 'autoclose' && (
            <div className="space-y-6">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">Auto-Close Inactive Chats</h3>
                  <p className="text-purple-200 text-sm">Automatically close conversations after inactivity</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoCloseEnabled}
                    onChange={(e) => setConfig({ ...config, autoCloseEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              {config.autoCloseEnabled && (
                <>
                  {/* Inactivity Duration */}
                  <div>
                    <label className="block text-white font-medium mb-2">Close after inactivity of</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={config.autoCloseMinutes}
                        onChange={(e) => setConfig({ ...config, autoCloseMinutes: Number(e.target.value) })}
                        min={60}
                        max={10080}
                        className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                      />
                      <span className="text-purple-200">minutes</span>
                      <span className="text-sm text-slate-400">({Math.floor((config.autoCloseMinutes || 1440) / 60)} hours)</span>
                    </div>
                  </div>

                  {/* Close Message */}
                  <div>
                    <label className="block text-white font-medium mb-2">Closing Message</label>
                    <textarea
                      value={config.autoCloseMessage}
                      onChange={(e) => setConfig({ ...config, autoCloseMessage: e.target.value })}
                      rows={2}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                      placeholder="Message sent when chat is closed..."
                    />
                    <p className="text-purple-300 text-sm mt-1">Leave empty to close silently without sending a message</p>
                  </div>

                  {/* Exclude Labels */}
                  <div>
                    <label className="block text-white font-medium mb-2">Exclude Labels</label>
                    <input
                      type="text"
                      value={(config.autoCloseExcludeLabels || []).join(', ')}
                      onChange={(e) => setConfig({
                        ...config,
                        autoCloseExcludeLabels: e.target.value.split(',').map(l => l.trim()).filter(Boolean)
                      })}
                      placeholder="VIP, Priority, Active"
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-400"
                    />
                    <p className="text-purple-300 text-sm mt-1">Leads with these labels won't be auto-closed</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">AI-Powered Responses</h3>
                  <p className="text-purple-200 text-sm">Use AI to handle complex queries</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.aiEnabled}
                    onChange={(e) => setConfig({ ...config, aiEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {config.aiEnabled && (
                <>
                  <div>
                    <label className="block text-white font-medium mb-2">AI Model</label>
                    <select
                      value={config.aiModel}
                      onChange={(e) => setConfig({ ...config, aiModel: e.target.value })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-purple-500"
                    >
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast, Affordable)</option>
                      <option value="gpt-4">GPT-4 (Advanced, Slower)</option>
                      <option value="gpt-4-turbo">GPT-4 Turbo (Best Quality)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">System Prompt</label>
                    <textarea
                      value={config.aiSystemPrompt}
                      onChange={(e) => setConfig({ ...config, aiSystemPrompt: e.target.value })}
                      rows={4}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-purple-500"
                      placeholder="Instructions for the AI..."
                    />
                    <p className="text-purple-300 text-sm mt-1">Define how the AI should behave and respond</p>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Max Tokens per Response</label>
                    <input
                      type="number"
                      value={config.maxAiTokens}
                      onChange={(e) => setConfig({ ...config, maxAiTokens: parseInt(e.target.value) || 100 })}
                      min={50}
                      max={500}
                      className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:border-purple-500"
                    />
                    <p className="text-purple-300 text-sm mt-1">Limits response length (50-500 tokens)</p>
                  </div>

                  <div className="p-4 bg-amber-900/30 border border-amber-500/50 rounded-lg">
                    <p className="text-amber-200 text-sm">
                      ⚠️ <strong>Note:</strong> AI responses require an OpenAI API key configured in environment variables (OPENAI_API_KEY).
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Working Hours Tab */}
          {activeTab === 'hours' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div>
                  <h3 className="text-white font-medium">Working Hours</h3>
                  <p className="text-purple-200 text-sm">Send different messages outside business hours</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.workingHours.enabled}
                    onChange={(e) => setConfig({
                      ...config,
                      workingHours: { ...config.workingHours, enabled: e.target.checked }
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {config.workingHours.enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white font-medium mb-2">Start Time</label>
                      <input
                        type="time"
                        value={config.workingHours.start}
                        onChange={(e) => setConfig({
                          ...config,
                          workingHours: { ...config.workingHours, start: e.target.value }
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-medium mb-2">End Time</label>
                      <input
                        type="time"
                        value={config.workingHours.end}
                        onChange={(e) => setConfig({
                          ...config,
                          workingHours: { ...config.workingHours, end: e.target.value }
                        })}
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Timezone</label>
                    <select
                      value={config.workingHours.timezone}
                      onChange={(e) => setConfig({
                        ...config,
                        workingHours: { ...config.workingHours, timezone: e.target.value }
                      })}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="America/New_York">US Eastern</option>
                      <option value="America/Los_Angeles">US Pacific</option>
                      <option value="Europe/London">UK (GMT/BST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">Off-Hours Message</label>
                    <textarea
                      value={config.workingHours.offHoursMessage}
                      onChange={(e) => setConfig({
                        ...config,
                        workingHours: { ...config.workingHours, offHoursMessage: e.target.value }
                      })}
                      rows={3}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400"
                      placeholder="Message sent outside working hours..."
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-purple-200 text-sm mb-1">Keywords Configured</h3>
            <p className="text-3xl font-bold text-white">{config.keywords.length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-purple-200 text-sm mb-1">Templates Available</h3>
            <p className="text-3xl font-bold text-white">{templates.length}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-purple-200 text-sm mb-1">AI Status</h3>
            <p className="text-3xl font-bold text-white">{config.aiEnabled ? '🟢 Active' : '⚪ Off'}</p>
          </div>
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-purple-200 text-sm mb-1">Bot Status</h3>
            <p className="text-3xl font-bold text-white">{config.enabled ? '🟢 Running' : '🔴 Stopped'}</p>
          </div>
        </div>
      </main>
    </div>
  );
}
