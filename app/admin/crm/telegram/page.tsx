'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  Send, Search, Users, Settings, Bot, MessageCircle, RefreshCw,
  Loader2, AlertTriangle, CheckCircle2, ChevronRight, Trash2,
  Eye, Image as ImageIcon, Video, FileText, Plus, ArrowLeft
} from 'lucide-react';

// ── Types ──
type TelegramContact = {
  _id: string;
  chatId: number;
  firstName: string;
  lastName: string;
  username: string;
  chatType: 'private' | 'group' | 'supergroup' | 'channel';
  groupTitle: string;
  lastMessageAt: string;
  lastMessageText: string;
  messageCount: number;
  labels: string[];
};

type TelegramMsg = {
  _id: string;
  chatId: number;
  messageId?: number;
  direction: 'inbound' | 'outbound';
  text: string;
  mediaType: string;
  mediaUrl: string;
  mediaFileName: string;
  caption: string;
  fromName: string;
  fromUsername: string;
  status: string;
  createdAt: string;
};

type BotConfig = {
  configured: boolean;
  botToken: string;
  botUsername: string;
  botName: string;
  botId: number | null;
  webhookSet: boolean;
  enabled: boolean;
};

export default function TelegramPage() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  // Bot config
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [botTokenInput, setBotTokenInput] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Contacts & Chat
  const [contacts, setContacts] = useState<TelegramContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<TelegramContact | null>(null);
  const [messages, setMessages] = useState<TelegramMsg[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [msgLoading, setMsgLoading] = useState(false);

  // Composer
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');

  // Poll timer
  const pollRef = useRef<any>(null);

  // ── Load Bot Config ──
  const loadConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await crmFetch('/api/admin/crm/telegram/config');
      if (res.ok) {
        const data = await res.json();
        setBotConfig(data);
        if (!data.configured) setShowSetup(true);
      }
    } catch {}
  }, [token, crmFetch]);

  // ── Load Contacts ──
  const loadContacts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await crmFetch(`/api/admin/crm/telegram/contacts?search=${encodeURIComponent(contactSearch)}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch {}
    setLoading(false);
  }, [token, crmFetch, contactSearch]);

  // ── Load Messages ──
  const loadMessages = useCallback(async (chatId: number) => {
    if (!token) return;
    setMsgLoading(true);
    try {
      const res = await crmFetch(`/api/admin/crm/telegram/messages?chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
    setMsgLoading(false);
  }, [token, crmFetch]);

  // ── Init ──
  useEffect(() => {
    loadConfig();
    loadContacts();
  }, [loadConfig, loadContacts]);

  // ── Poll messages for active chat ──
  useEffect(() => {
    if (selectedContact) {
      loadMessages(selectedContact.chatId);
      pollRef.current = setInterval(() => loadMessages(selectedContact.chatId), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [selectedContact, loadMessages]);

  // ── Setup Bot ──
  const handleSetup = async () => {
    if (!botTokenInput.trim()) return;
    setSetupLoading(true);
    setSetupError('');
    try {
      const res = await crmFetch('/api/admin/crm/telegram/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: botTokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSetupError(data.error || 'Setup failed');
      } else {
        setBotConfig({
          configured: true,
          botToken: botTokenInput.slice(0, 10) + '...',
          botUsername: data.botUsername,
          botName: data.botName,
          botId: data.botId,
          webhookSet: data.webhookSet,
          enabled: true,
        });
        setShowSetup(false);
        setBotTokenInput('');
      }
    } catch (err: any) {
      setSetupError(err.message);
    }
    setSetupLoading(false);
  };

  // ── Disconnect Bot ──
  const handleDisconnect = async () => {
    if (!confirm('Disconnect Telegram bot? This will stop receiving messages.')) return;
    try {
      await crmFetch('/api/admin/crm/telegram/config', { method: 'DELETE' });
      setBotConfig({ configured: false, botToken: '', botUsername: '', botName: '', botId: null, webhookSet: false, enabled: false });
      setShowSetup(true);
    } catch {}
  };

  // ── Send Message ──
  const handleSend = async () => {
    if (!selectedContact || !messageText.trim()) return;
    setSending(true);
    setSendError('');
    try {
      const res = await crmFetch('/api/admin/crm/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedContact.chatId, text: messageText.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setSendError(data.error || 'Send failed');
      } else {
        setMessageText('');
        loadMessages(selectedContact.chatId);
      }
    } catch (err: any) {
      setSendError(err.message);
    }
    setSending(false);
  };

  const contactName = (c: TelegramContact) => {
    if (c.chatType !== 'private' && c.groupTitle) return c.groupTitle;
    return [c.firstName, c.lastName].filter(Boolean).join(' ') || c.username || `Chat ${c.chatId}`;
  };

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // ── Render ──
  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Send className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Telegram</h1>
            {botConfig?.configured && (
              <p className="text-xs text-gray-400">
                @{botConfig.botUsername}
                {botConfig.webhookSet && <span className="text-green-400 ml-2">● Connected</span>}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/crm/telegram/templates"
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/admin/crm/telegram/broadcast"
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Broadcast
          </Link>
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            title="Bot Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Setup Panel */}
      {showSetup && (
        <div className="border-b border-gray-800 bg-gray-900/50 p-4">
          <div className="max-w-lg mx-auto space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-blue-400" />
              {botConfig?.configured ? 'Bot Configuration' : 'Connect Your Telegram Bot'}
            </h3>

            {botConfig?.configured ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                  <div>
                    <p className="text-sm text-white font-medium">{botConfig.botName}</p>
                    <p className="text-xs text-gray-400">@{botConfig.botUsername} · Token: {botConfig.botToken}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${botConfig.webhookSet ? 'text-green-400' : 'text-yellow-400'}`}>
                      {botConfig.webhookSet ? '✓ Webhook Active' : '⚠ No Webhook'}
                    </span>
                    <button
                      onClick={handleDisconnect}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Your bot receives messages at: <code className="text-gray-400">/api/admin/crm/telegram/webhook</code>
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-400">
                  1. Open Telegram and chat with <a href="https://t.me/BotFather" target="_blank" className="text-blue-400 hover:underline">@BotFather</a><br />
                  2. Send <code className="text-gray-300">/newbot</code> and follow the prompts<br />
                  3. Paste the bot token below
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={botTokenInput}
                    onChange={e => setBotTokenInput(e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSetup}
                    disabled={setupLoading || !botTokenInput.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                  >
                    {setupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Connect
                  </button>
                </div>
                {setupError && (
                  <p className="text-xs text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {setupError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Contact List */}
        <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-900/50">
          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Search contacts..."
                className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No contacts yet</p>
                <p className="text-xs mt-1">
                  {botConfig?.configured
                    ? 'Contacts appear when users message your bot'
                    : 'Set up your bot to start receiving messages'}
                </p>
              </div>
            ) : (
              contacts.map(c => (
                <button
                  key={c._id}
                  onClick={() => { setSelectedContact(c); setSendError(''); }}
                  className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50 text-left ${
                    selectedContact?._id === c._id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {c.chatType === 'private'
                      ? (c.firstName?.[0] || c.username?.[0] || '?').toUpperCase()
                      : '#'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white truncate">{contactName(c)}</span>
                      <span className="text-[10px] text-gray-500">{formatTime(c.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate">{c.lastMessageText || 'No messages'}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-gray-950">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-3 border-b border-gray-800 bg-gray-900">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="lg:hidden p-1 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                  {selectedContact.chatType === 'private'
                    ? (selectedContact.firstName?.[0] || '?').toUpperCase()
                    : '#'}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">{contactName(selectedContact)}</h3>
                  <p className="text-xs text-gray-400">
                    {selectedContact.username ? `@${selectedContact.username} · ` : ''}
                    {selectedContact.chatType} · {selectedContact.messageCount} messages
                  </p>
                </div>
                <button
                  onClick={() => loadMessages(selectedContact.chatId)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {msgLoading && messages.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  messages.map(m => (
                    <div
                      key={m._id}
                      className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                          m.direction === 'outbound'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-gray-800 text-gray-100 rounded-bl-md'
                        }`}
                      >
                        {m.direction === 'inbound' && m.fromName && (
                          <p className="text-[10px] text-blue-400 font-medium mb-0.5">{m.fromName}</p>
                        )}
                        {m.mediaType !== 'none' && (
                          <p className="text-xs text-gray-300 mb-1 flex items-center gap-1">
                            {m.mediaType === 'photo' && <ImageIcon className="w-3 h-3" />}
                            {m.mediaType === 'video' && <Video className="w-3 h-3" />}
                            {m.mediaType === 'document' && <FileText className="w-3 h-3" />}
                            [{m.mediaType}] {m.mediaFileName}
                          </p>
                        )}
                        {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                        <p className={`text-[10px] mt-1 ${
                          m.direction === 'outbound' ? 'text-blue-200' : 'text-gray-500'
                        }`}>
                          {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          {m.direction === 'outbound' && m.status === 'sent' && ' ✓'}
                          {m.direction === 'outbound' && m.status === 'failed' && ' ✗'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-gray-800 bg-gray-900 p-3">
                {sendError && (
                  <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {sendError}
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !messageText.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors flex items-center gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium text-gray-400">Telegram Bot Inbox</p>
                <p className="text-sm mt-1">Select a contact to view messages</p>
                {botConfig?.configured && (
                  <p className="text-xs mt-3 text-gray-500">
                    Share <span className="text-blue-400">t.me/{botConfig.botUsername}</span> to start receiving messages
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
