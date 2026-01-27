'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
};

export default function ChatbotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ChatbotConfig>(defaultConfig);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'keywords' | 'ai' | 'hours'>('general');
  const [newKeyword, setNewKeyword] = useState({ keyword: '', response: '', action: 'reply' as const });

  // Get token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('adminToken') || localStorage.getItem('admin_token');
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
    if (!newKeyword.keyword.trim() || !newKeyword.response.trim()) {
      setError('Keyword and response are required');
      return;
    }

    setConfig({
      ...config,
      keywords: [...config.keywords, { ...newKeyword }],
    });
    setNewKeyword({ keyword: '', response: '', action: 'reply' });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'general', label: '⚙️ General', icon: '⚙️' },
            { id: 'keywords', label: '🔑 Keywords', icon: '🔑' },
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
                  Define automatic responses for specific keywords or phrases
                </p>

                {/* Add New Keyword */}
                <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                  <h4 className="text-white font-medium mb-3">Add New Keyword</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      value={newKeyword.keyword}
                      onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })}
                      placeholder="Keyword (e.g., 'price', '1')"
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                    />
                    <input
                      type="text"
                      value={newKeyword.response}
                      onChange={(e) => setNewKeyword({ ...newKeyword, response: e.target.value })}
                      placeholder="Response message..."
                      className="bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white placeholder-slate-400"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newKeyword.action}
                        onChange={(e) => setNewKeyword({ ...newKeyword, action: e.target.value as any })}
                        className="flex-1 bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white"
                      >
                        <option value="reply">Auto Reply</option>
                        <option value="forward_to_agent">Forward to Agent</option>
                      </select>
                      <button
                        onClick={addKeyword}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Keywords List */}
                <div className="space-y-2">
                  {config.keywords.map((kw, index) => (
                    <div key={index} className="flex items-start gap-4 bg-slate-700/30 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded font-mono">
                            {kw.keyword}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            kw.action === 'forward_to_agent' ? 'bg-amber-600' : 'bg-green-600'
                          } text-white`}>
                            {kw.action === 'forward_to_agent' ? 'Forward' : 'Reply'}
                          </span>
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
                </div>
              </div>
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
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-purple-500/20">
            <h3 className="text-purple-200 text-sm mb-1">Keywords Configured</h3>
            <p className="text-3xl font-bold text-white">{config.keywords.length}</p>
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
