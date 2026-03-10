'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, Search, Send, Loader2, CheckSquare, Square, Plus, Pencil, Trash2, Clock, Repeat, Calendar } from 'lucide-react';
import { QUICK_REPLIES, TEMPLATES } from '../constants';
import { getAvatarColor, getInitials, formatPhoneNumber } from '../utils';
import type { ChatItem } from '../types';

interface QuickReply {
  _id: string;
  title: string;
  content: string;
  shortcut?: string;
}

interface SavedTemplate {
  _id: string;
  templateName: string;
  templateContent: string;
  headerContent?: string;
  footerText?: string;
  imageFile?: { url: string };
}

interface StarPopupProps {
  showStarPopup: boolean;
  setShowStarPopup: (v: boolean) => void;
  starTab: 'quick' | 'template' | 'broadcast' | 'schedule' | 'repeat';
  setStarTab: (v: 'quick' | 'template' | 'broadcast' | 'schedule' | 'repeat') => void;
  setComposerText: React.Dispatch<React.SetStateAction<string>>;
  broadcastChats: Set<string>;
  setBroadcastChats: React.Dispatch<React.SetStateAction<Set<string>>>;
  broadcastText: string;
  setBroadcastText: (v: string) => void;
  broadcastSending: boolean;
  broadcastSearch: string;
  setBroadcastSearch: (v: string) => void;
  chats: ChatItem[];
  handleBroadcastSend: () => void;
  selectedChat: string | null;
  token: string | null;
  crmFetch: (url: string, options?: any) => Promise<any>;
}

export function StarPopup({
  showStarPopup,
  setShowStarPopup,
  starTab,
  setStarTab,
  setComposerText,
  broadcastChats,
  setBroadcastChats,
  broadcastText,
  setBroadcastText,
  broadcastSending,
  broadcastSearch,
  setBroadcastSearch,
  chats,
  handleBroadcastSend,
  selectedChat,
  token,
  crmFetch,
}: StarPopupProps) {
  // Quick Replies state
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loadingQR, setLoadingQR] = useState(false);
  const [showQRForm, setShowQRForm] = useState(false);
  const [editingQR, setEditingQR] = useState<QuickReply | null>(null);
  const [qrTitle, setQrTitle] = useState('');
  const [qrContent, setQrContent] = useState('');
  const [qrShortcut, setQrShortcut] = useState('');
  const [savingQR, setSavingQR] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  // Schedule state
  const [scheduleText, setScheduleText] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleTemplateId, setScheduleTemplateId] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Repeat state
  const [repeatText, setRepeatText] = useState('');
  const [repeatType, setRepeatType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('daily');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [repeatStartDate, setRepeatStartDate] = useState('');
  const [repeatStartTime, setRepeatStartTime] = useState('');
  const [repeatEndDate, setRepeatEndDate] = useState('');
  const [repeatTemplateId, setRepeatTemplateId] = useState('');
  const [savingRepeat, setSavingRepeat] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // Fetch quick replies from API
  const fetchQuickReplies = useCallback(async () => {
    if (!token || !crmFetch) return;
    setLoadingQR(true);
    try {
      const data = await crmFetch('/api/admin/crm/quick-replies');
      setQuickReplies(data?.replies || data?.quickReplies || []);
    } catch (e) {
      console.error('Failed to load quick replies:', e);
      // Fallback to hardcoded
      setQuickReplies(QUICK_REPLIES.map((r, i) => ({ _id: `default-${i}`, title: r.substring(0, 30), content: r })));
    }
    setLoadingQR(false);
  }, [token, crmFetch]);

  // Fetch templates from API
  const fetchTemplates = useCallback(async () => {
    if (!token || !crmFetch) return;
    setLoadingTemplates(true);
    try {
      const data = await crmFetch('/api/admin/crm/templates?provider=qr&limit=100');
      setTemplates(data?.templates || data?.data?.templates || []);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
    setLoadingTemplates(false);
  }, [token, crmFetch]);

  // Fetch scheduled/recurring messages
  const fetchScheduledMessages = useCallback(async () => {
    if (!token || !crmFetch || !selectedChat) return;
    setLoadingScheduled(true);
    try {
      const phone = selectedChat.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const data = await crmFetch(`/api/admin/crm/scheduled-messages?status=active&phoneNumber=${phone}`);
      setScheduledMessages(data?.jobs || []);
    } catch (e) {
      console.error('Failed to load scheduled messages:', e);
    }
    setLoadingScheduled(false);
  }, [token, crmFetch, selectedChat]);

  // Load data when popup opens
  useEffect(() => {
    if (showStarPopup && token) {
      if (starTab === 'quick') fetchQuickReplies();
      if (starTab === 'template') fetchTemplates();
      if (starTab === 'schedule' || starTab === 'repeat') {
        fetchTemplates();
        fetchScheduledMessages();
      }
    }
  }, [showStarPopup, starTab, token, fetchQuickReplies, fetchTemplates, fetchScheduledMessages]);

  // Save quick reply
  const handleSaveQR = async () => {
    if (!qrTitle.trim() || !qrContent.trim()) return;
    setSavingQR(true);
    try {
      if (editingQR && editingQR._id && !editingQR._id.startsWith('default-')) {
        await crmFetch('/api/admin/crm/quick-replies', {
          method: 'PUT',
          body: { id: editingQR._id, title: qrTitle.trim(), content: qrContent.trim(), shortcut: qrShortcut.trim() || undefined },
        });
      } else {
        await crmFetch('/api/admin/crm/quick-replies', {
          method: 'POST',
          body: { title: qrTitle.trim(), content: qrContent.trim(), shortcut: qrShortcut.trim() || undefined },
        });
      }
      setShowQRForm(false);
      setEditingQR(null);
      setQrTitle('');
      setQrContent('');
      setQrShortcut('');
      fetchQuickReplies();
    } catch (e) {
      console.error('Failed to save quick reply:', e);
    }
    setSavingQR(false);
  };

  // Delete quick reply
  const handleDeleteQR = async (id: string) => {
    if (id.startsWith('default-') || !confirm('Delete this quick reply?')) return;
    try {
      await crmFetch(`/api/admin/crm/quick-replies?id=${id}`, { method: 'DELETE' });
      fetchQuickReplies();
    } catch (e) {
      console.error('Failed to delete quick reply:', e);
    }
  };

  // Schedule message
  const handleScheduleMessage = async () => {
    if (!selectedChat || (!scheduleText.trim() && !scheduleTemplateId) || !scheduleDate || !scheduleTime) return;
    setScheduling(true);
    try {
      const phone = selectedChat.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`);
      
      await crmFetch('/api/admin/crm/scheduled-messages', {
        method: 'POST',
        body: {
          name: `Scheduled to ${phone}`,
          targetType: 'leadIds',
          targetLeadIds: [], // Will use phone number
          messageType: scheduleTemplateId ? 'template' : 'text',
          messageContent: scheduleText.trim(),
          templateId: scheduleTemplateId || undefined,
          sendAt: scheduledFor.toISOString(),
        },
      });
      setScheduleText('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleTemplateId('');
      alert('Message scheduled successfully!');
    } catch (e: any) {
      alert('Failed to schedule: ' + (e.message || 'Unknown error'));
    }
    setScheduling(false);
  };

  // Save recurring message
  const handleSaveRepeat = async () => {
    if (!selectedChat || (!repeatText.trim() && !repeatTemplateId) || !repeatStartDate || !repeatStartTime) return;
    setSavingRepeat(true);
    try {
      const phone = selectedChat.replace('@c.us', '').replace('@s.whatsapp.net', '');
      const startAt = new Date(`${repeatStartDate}T${repeatStartTime}`);
      
      // Map recurrence type to API format
      const recurrence: any = { frequency: repeatType, interval: repeatInterval };
      
      await crmFetch('/api/admin/crm/scheduled-messages', {
        method: 'POST',
        body: {
          name: `Repeat ${repeatType} to ${phone}`,
          targetType: 'leadIds',
          targetLeadIds: [],
          messageType: repeatTemplateId ? 'template' : 'text',
          messageContent: repeatText.trim(),
          templateId: repeatTemplateId || undefined,
          sendAt: startAt.toISOString(),
          recurrence,
          maxRuns: repeatEndDate ? 0 : 365, // If no end date, max 365 runs
        },
      });
      setRepeatText('');
      setRepeatStartDate('');
      setRepeatStartTime('');
      setRepeatEndDate('');
      setRepeatTemplateId('');
      setRepeatType('daily');
      setRepeatInterval(1);
      alert('Recurring message set up successfully!');
      fetchScheduledMessages();
    } catch (e: any) {
      alert('Failed to save: ' + (e.message || 'Unknown error'));
    }
    setSavingRepeat(false);
  };

  // Delete scheduled/recurring message
  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Delete this scheduled message?')) return;
    try {
      await crmFetch(`/api/admin/crm/scheduled-messages?id=${id}`, { method: 'DELETE' });
      fetchScheduledMessages();
    } catch (e) {
      console.error('Failed to delete:', e);
    }
  };

  if (!showStarPopup) return null;

  const filteredTemplates = templates.filter(t => 
    !templateSearch.trim() || 
    t.templateName.toLowerCase().includes(templateSearch.toLowerCase()) ||
    (t.templateContent || '').toLowerCase().includes(templateSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowStarPopup(false)}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between bg-gradient-to-r from-yellow-500 to-orange-500 rounded-t-xl">
          <div className="flex items-center gap-2 text-white">
            <Star className="w-5 h-5" />
            <h3 className="font-semibold">Quick Actions</h3>
          </div>
          <button onClick={() => setShowStarPopup(false)} className="text-white/80 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b overflow-x-auto">
          {(['quick', 'template', 'schedule', 'repeat', 'broadcast'] as const).map(t => (
            <button key={t} onClick={() => setStarTab(t)} className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium transition whitespace-nowrap ${
              starTab === t ? 'text-yellow-600 border-b-2 border-yellow-500 bg-yellow-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}>
              {t === 'quick' && '⚡ Quick'}
              {t === 'template' && '📋 Template'}
              {t === 'schedule' && '📅 Schedule'}
              {t === 'repeat' && '🔁 Repeat'}
              {t === 'broadcast' && '📢 Broadcast'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Quick Reply Tab */}
          {starTab === 'quick' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">Click to insert • {quickReplies.length} saved</p>
                <button 
                  onClick={() => { setShowQRForm(true); setEditingQR(null); setQrTitle(''); setQrContent(''); setQrShortcut(''); }}
                  className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              {/* Add/Edit Form */}
              {showQRForm && (
                <div className="bg-gray-50 border rounded-lg p-3 mb-3 space-y-2">
                  <input
                    type="text"
                    value={qrTitle}
                    onChange={e => setQrTitle(e.target.value)}
                    placeholder="Title (e.g., Greeting)"
                    className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-green-400 outline-none"
                  />
                  <textarea
                    value={qrContent}
                    onChange={e => setQrContent(e.target.value)}
                    placeholder="Message content..."
                    rows={3}
                    className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-green-400 outline-none resize-none"
                  />
                  <input
                    type="text"
                    value={qrShortcut}
                    onChange={e => setQrShortcut(e.target.value)}
                    placeholder="Shortcut (e.g., /hi) - optional"
                    className="w-full px-2 py-1.5 text-sm border rounded focus:ring-1 focus:ring-green-400 outline-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowQRForm(false)} className="flex-1 py-1.5 text-xs text-gray-600 bg-gray-200 rounded hover:bg-gray-300">Cancel</button>
                    <button onClick={handleSaveQR} disabled={savingQR || !qrTitle.trim() || !qrContent.trim()} className="flex-1 py-1.5 text-xs text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50">
                      {savingQR ? 'Saving...' : editingQR ? 'Update' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {loadingQR ? (
                <div className="py-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : quickReplies.length === 0 ? (
                <p className="py-8 text-center text-gray-400 text-sm">No quick replies yet. Add one!</p>
              ) : (
                quickReplies.map(qr => (
                  <div key={qr._id} className="group flex items-center gap-2">
                    <button 
                      onClick={() => { setComposerText(prev => prev ? prev + ' ' + qr.content : qr.content); setShowStarPopup(false); }} 
                      className="flex-1 text-left px-3 py-2.5 bg-gray-50 hover:bg-green-50 border rounded-lg text-sm text-gray-700 hover:text-green-700 hover:border-green-300 transition"
                    >
                      <span className="font-medium">{qr.title}</span>
                      {qr.shortcut && <span className="text-[10px] text-gray-400 ml-2">{qr.shortcut}</span>}
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{qr.content}</p>
                    </button>
                    {!qr._id.startsWith('default-') && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                        <button onClick={() => { setEditingQR(qr); setQrTitle(qr.title); setQrContent(qr.content); setQrShortcut(qr.shortcut || ''); setShowQRForm(true); }} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => handleDeleteQR(qr._id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Template Tab */}
          {starTab === 'template' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={templateSearch}
                  onChange={e => setTemplateSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-100 rounded-lg border-0 focus:ring-1 focus:ring-yellow-400 outline-none"
                />
              </div>
              <p className="text-xs text-gray-500">{filteredTemplates.length} saved templates</p>
              
              {loadingTemplates ? (
                <div className="py-8 text-center text-gray-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
              ) : filteredTemplates.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-400 text-sm mb-2">No templates found</p>
                  <a href="/admin/crm/qr/templates" className="text-xs text-green-600 hover:underline">Create templates →</a>
                </div>
              ) : (
                filteredTemplates.map(tpl => (
                  <button 
                    key={tpl._id} 
                    onClick={() => { setComposerText(tpl.templateContent || ''); setShowStarPopup(false); }} 
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 border rounded-lg hover:border-indigo-300 transition"
                  >
                    <div className="flex items-start gap-2">
                      {tpl.imageFile?.url && (
                        <img src={tpl.imageFile.url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{tpl.templateName}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{tpl.templateContent}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {starTab === 'schedule' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Schedule a message to send later (max 10)</p>
              
              <div className="space-y-2">
                <textarea
                  value={scheduleText}
                  onChange={e => setScheduleText(e.target.value)}
                  placeholder="Type message or select template below..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                  rows={3}
                />
                
                <select
                  value={scheduleTemplateId}
                  onChange={e => {
                    setScheduleTemplateId(e.target.value);
                    if (e.target.value) {
                      const tpl = templates.find(t => t._id === e.target.value);
                      if (tpl?.templateContent) setScheduleText(tpl.templateContent);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="">Or select a template...</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.templateName}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Date</label>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={e => setScheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Time</label>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={e => setScheduleTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                  </div>
                </div>

                <button
                  onClick={handleScheduleMessage}
                  disabled={scheduling || (!scheduleText.trim() && !scheduleTemplateId) || !scheduleDate || !scheduleTime || !selectedChat}
                  className="w-full py-2.5 bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {scheduling ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</> : <><Clock className="w-4 h-4" /> Schedule Message</>}
                </button>
              </div>

              {!selectedChat && (
                <p className="text-xs text-red-500 text-center">Select a chat first to schedule a message</p>
              )}
            </div>
          )}

          {/* Repeat Tab */}
          {starTab === 'repeat' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Set up recurring messages</p>
              
              <div className="space-y-2">
                <textarea
                  value={repeatText}
                  onChange={e => setRepeatText(e.target.value)}
                  placeholder="Type message or select template..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                  rows={3}
                />

                <select
                  value={repeatTemplateId}
                  onChange={e => {
                    setRepeatTemplateId(e.target.value);
                    if (e.target.value) {
                      const tpl = templates.find(t => t._id === e.target.value);
                      if (tpl?.templateContent) setRepeatText(tpl.templateContent);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                >
                  <option value="">Or select a template...</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.templateName}</option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Repeat</label>
                    <select
                      value={repeatType}
                      onChange={e => setRepeatType(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Every</label>
                    <input
                      type="number"
                      value={repeatInterval}
                      onChange={e => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
                      min={1}
                      max={365}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                    <input
                      type="date"
                      value={repeatStartDate}
                      onChange={e => setRepeatStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Time</label>
                    <input
                      type="time"
                      value={repeatStartTime}
                      onChange={e => setRepeatStartTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End Date (optional)</label>
                  <input
                    type="date"
                    value={repeatEndDate}
                    onChange={e => setRepeatEndDate(e.target.value)}
                    min={repeatStartDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
                  />
                </div>

                <button
                  onClick={handleSaveRepeat}
                  disabled={savingRepeat || (!repeatText.trim() && !repeatTemplateId) || !repeatStartDate || !repeatStartTime || !selectedChat}
                  className="w-full py-2.5 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {savingRepeat ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Repeat className="w-4 h-4" /> Set Recurring</>}
                </button>
              </div>

              {/* Existing recurring messages */}
              {scheduledMessages.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-2">Active Recurring ({scheduledMessages.length})</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {scheduledMessages.map(msg => (
                      <div key={msg._id} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded text-xs">
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700 truncate">{msg.name || msg.messageContent?.substring(0, 30)}</p>
                          <p className="text-[10px] text-gray-400">{msg.recurrence?.frequency || 'Once'}</p>
                        </div>
                        <button onClick={() => handleDeleteScheduled(msg._id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!selectedChat && (
                <p className="text-xs text-red-500 text-center">Select a chat first to set up recurring messages</p>
              )}
            </div>
          )}

          {/* Broadcast Tab */}
          {starTab === 'broadcast' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Send one message to up to 10 contacts at once</p>
              <textarea
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
                placeholder="Type your broadcast message..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none"
                rows={3}
              />
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={broadcastSearch}
                  onChange={e => setBroadcastSearch(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-8 pr-3 py-2 text-xs bg-gray-100 rounded-lg border-0 focus:ring-1 focus:ring-yellow-400 outline-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{broadcastChats.size}/10 selected</span>
                {broadcastChats.size > 0 && (
                  <button onClick={() => setBroadcastChats(new Set())} className="text-xs text-red-500 hover:text-red-700">Clear all</button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {chats
                  .filter(c => !c.isGroup)
                  .filter(c => {
                    if (!broadcastSearch.trim()) return true;
                    const q = broadcastSearch.toLowerCase();
                    return (c.name || '').toLowerCase().includes(q) || (c.resolvedPhone || c.id).toLowerCase().includes(q);
                  })
                  .slice(0, 50)
                  .map(c => {
                    const checked = broadcastChats.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setBroadcastChats(prev => {
                            const next = new Set(prev);
                            if (next.has(c.id)) { next.delete(c.id); }
                            else if (next.size < 10) { next.add(c.id); }
                            return next;
                          });
                        }}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition ${checked ? 'bg-yellow-50' : ''}`}
                      >
                        {checked ? <CheckSquare className="w-4 h-4 text-yellow-600 flex-shrink-0" /> : <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-semibold flex-shrink-0 ${getAvatarColor(c.name)}`}>
                          {getInitials(c.name)}
                        </div>
                        <span className="text-xs text-gray-700 truncate">{c.resolvedPhone ? formatPhoneNumber(c.resolvedPhone) : c.name}</span>
                      </div>
                    );
                  })}
              </div>
              <button
                onClick={handleBroadcastSend}
                disabled={broadcastChats.size === 0 || !broadcastText.trim() || broadcastSending}
                className="w-full py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {broadcastSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4" /> Send to {broadcastChats.size} contacts</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
