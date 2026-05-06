'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Clock, Loader2, Zap, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  workshop?: string;
  group?: string;
  labels?: string[];
  assignedToUserId?: string;
  status?: string;
}

interface WhatsAppGroup {
  id: string;
  subject: string;
  participants?: number;
  isGroup: true;
}

interface Template {
  _id: string;
  templateName: string;
  templateContent: string;
}

interface BroadcastRun {
  id: string;
  name: string;
  recipients: string[];
  sent: number;
  status: 'queued' | 'sending' | 'completed' | 'paused';
  createdAt: string;
}

interface BroadcastTabProps {
  token: string | null;
  isConnected: boolean;
}

export function BroadcastTab({ token, isConnected }: BroadcastTabProps) {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedPhones, setSelectedPhones] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [recipientTab, setRecipientTab] = useState<'people' | 'groups'>('people');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [runs, setRuns] = useState<BroadcastRun[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterWorkshop, setFilterWorkshop] = useState('');
  const [filterLabel, setFilterLabel] = useState('');
  const [confirmedCount, setConfirmedCount] = useState(0);

  // Initialize schedule date and time on mount
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setScheduleDate(today);
    setScheduleTime(time);
  }, []);

  // Fetch leads, groups, and templates
  const fetchData = useCallback(async () => {
    if (!token || !isConnected) return;
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, groupsRes, templatesRes] = await Promise.all([
        fetch('/api/admin/crm/leads?selectAll=true&limit=5000', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/crm/whatsapp/qr/chats', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch('/api/admin/crm/templates?provider=qr&limit=100', {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
      ]);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        const leadsArray = leadsData?.data?.leads ?? [];
        if (Array.isArray(leadsArray)) {
          setLeads(leadsArray);
        } else {
          setError('Invalid leads data format');
        }
      } else {
        setError(`Failed to load leads: ${leadsRes.status}`);
      }

      if (groupsRes.ok) {
        const groupsData = await groupsRes.json();
        const chatsArray = groupsData?.chats ?? groupsData?.result ?? [];
        console.log('[BroadcastTab] Groups API response:', { success: groupsData?.success, chatsCount: chatsArray?.length, chatsArray });
        const whatsappGroups = Array.isArray(chatsArray)
          ? chatsArray
              .filter((c: any) => {
                const isGroup = c.id?.endsWith('@g.us') || c.isGroup === true || c.isGroupChat === true || c.groupMetadata !== undefined;
                console.log(`[BroadcastTab] Chat: ${c.name || c.id} | IsGroup: ${isGroup}`);
                return isGroup;
              })
              .map((c: any) => ({
                id: c.id,
                subject: c.name || c.subject || 'Unknown',
                participants: c.participants?.length || 0,
                isGroup: true as const,
              }))
          : [];
        console.log(`[BroadcastTab] Loaded ${whatsappGroups.length} groups from API`);
        setGroups(whatsappGroups);
      } else {
        console.error('[BroadcastTab] Groups fetch failed:', groupsRes.status);
        setError(`Failed to load groups: ${groupsRes.status}`);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        const templatesArray = templatesData?.templates ?? [];
        if (Array.isArray(templatesArray)) {
          setTemplates(templatesArray);
        }
      }
    } catch (e: any) {
      setError(`Error loading data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, isConnected]);

  useEffect(() => {
    if (isConnected && token) fetchData();
    else setLoading(false);
  }, [token, isConnected, fetchData]);

  // Load runs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('qr_broadcast_runs');
      if (saved) setRuns(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load broadcast history');
    }
  }, []);

  const handleInitiateBroadcast = () => {
    const totalRecipients = (recipientTab === 'people' ? selectedPhones.size : selectedGroupIds.size);
    if (totalRecipients === 0) {
      setError(`Select at least one ${recipientTab}`);
      return;
    }
    if (!selectedTemplate && !customMessage.trim()) {
      setError('Select a template or write a message');
      return;
    }
    setError(null);
    setConfirmedCount(0);
    setShowConfirmation(true);
  };

  const handleConfirmBroadcast = async () => {
    if (confirmedCount === 0) {
      setError('Check the confirmation box before sending');
      return;
    }

    setSending(true);
    setError(null);

    try {
      const runId = `run_${Date.now()}`;
      const message = customMessage.trim();
      const template = templates.find(t => t._id === selectedTemplate);

      // Determine recipients and type
      const recipients = recipientTab === 'people' ? Array.from(selectedPhones) : Array.from(selectedGroupIds);

      // Prepare broadcast payload
      const broadcastPayload = {
        recipients,
        message: message || template?.templateContent || '',
        schedule: scheduleMode === 'schedule' ? {
          mode: 'scheduled',
          date: scheduleDate,
          time: scheduleTime,
        } : null,
        recipientType: recipientTab === 'people' ? 'people' : 'groups',
      };

      // Send broadcast via API
      const broadcastRes = await fetch('/api/admin/crm/whatsapp/qr/broadcast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(broadcastPayload),
      });

      const broadcastData = await broadcastRes.json();

      if (!broadcastRes.ok) {
        throw new Error(broadcastData.error || `Broadcast failed: ${broadcastRes.status}`);
      }

      const totalRecipients = recipientTab === 'people' ? selectedPhones.size : selectedGroupIds.size;

      // Create run record
      const newRun: BroadcastRun = {
        id: runId,
        name: `Broadcast - ${new Date().toLocaleString()}`,
        recipients: recipients,
        sent: broadcastData.rateLimitInfo?.totalRecipients || totalRecipients,
        status: scheduleMode === 'now' ? 'sending' : 'queued',
        createdAt: new Date().toISOString(),
      };

      // Save to localStorage
      const updatedRuns = [newRun, ...runs].slice(0, 50);
      localStorage.setItem('qr_broadcast_runs', JSON.stringify(updatedRuns));
      setRuns(updatedRuns);

      const typeLabel = recipientTab === 'people' ? `${totalRecipients} people` : `${totalRecipients} group${totalRecipients === 1 ? '' : 's'}`;
      setSuccess(`✅ Broadcast ${scheduleMode === 'now' ? 'sent to ' + typeLabel + '!' : 'scheduled successfully!'}`);
      setShowConfirmation(false);
      setTimeout(() => {
        setSuccess(null);
        setSelectedPhones(new Set());
        setSelectedGroupIds(new Set());
        setSelectedTemplate('');
        setCustomMessage('');
        setScheduleDate('');
        setScheduleTime('');
      }, 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to send broadcast');
    } finally {
      setSending(false);
    }
  };

  // Filter leads based on search and filters
  const filteredLeads = Array.isArray(leads) ? leads.filter(lead => {
    if (searchQuery && !lead?.name?.toLowerCase?.().includes(searchQuery.toLowerCase()) &&
        !String(lead?.phoneNumber || '').includes(searchQuery)) {
      return false;
    }
    if (filterGroup && lead?.group !== filterGroup) return false;
    if (filterWorkshop && lead?.workshop !== filterWorkshop) return false;
    if (filterLabel && !lead?.labels?.includes(filterLabel)) return false;
    return true;
  }) : [];

  const uniqueGroups = Array.isArray(leads) ? Array.from(new Set(leads.map(l => l?.group).filter(Boolean))) : [];
  const uniqueWorkshops = Array.isArray(leads) ? Array.from(new Set(leads.map(l => l?.workshop).filter(Boolean))) : [];
  const allLabels = Array.isArray(leads) ? Array.from(new Set(leads.flatMap(l => l?.labels || []))) : [];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <h2 className="text-lg font-bold text-gray-700">WhatsApp Not Connected</h2>
        <p className="text-sm text-gray-500">Connect your WhatsApp in the Connection tab first</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex gap-2 p-4 border-b bg-gray-50">
        {(['compose', 'history'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === t
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border'
            }`}
          >
            {t === 'compose' ? 'Compose' : 'History'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {success && (
        <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {success}
        </div>
      )}

      {/* Compose Tab */}
      {activeTab === 'compose' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipients</label>

              {/* Recipient Type Tabs */}
              <div className="flex gap-2 mb-3 border-b">
                {(['people', 'groups'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setRecipientTab(t)}
                    className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                      recipientTab === t
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {t === 'people' ? `People (${selectedPhones.size})` : `Groups (${selectedGroupIds.size})`}
                  </button>
                ))}
              </div>

              {/* Filters for People */}
              {recipientTab === 'people' && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Groups</option>
                  {uniqueGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={filterWorkshop}
                  onChange={(e) => setFilterWorkshop(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Workshops</option>
                  {uniqueWorkshops.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <select
                  value={filterLabel}
                  onChange={(e) => setFilterLabel(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Labels</option>
                  {allLabels.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : recipientTab === 'people' ? (
                <>
                  {/* Select All / Clear All for People */}
                  {filteredLeads.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setSelectedPhones(new Set(filteredLeads.map(l => l.phoneNumber)))}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded font-medium transition"
                      >
                        ✓ Select All ({filteredLeads.length})
                      </button>
                      <button
                        onClick={() => setSelectedPhones(new Set())}
                        className="flex-1 px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded font-medium transition"
                      >
                        ✕ Clear All
                      </button>
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {filteredLeads.length === 0 ? (
                      <p className="text-sm text-gray-500">No leads match filters</p>
                    ) : (
                      filteredLeads.map(lead => (
                      <label key={lead._id} className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedPhones.has(lead.phoneNumber)}
                          onChange={(e) => {
                            const updated = new Set(selectedPhones);
                            if (e.target.checked) updated.add(lead.phoneNumber);
                            else updated.delete(lead.phoneNumber);
                            setSelectedPhones(updated);
                          }}
                          className="rounded mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 font-medium">{lead.name}</div>
                          <div className="text-xs text-gray-500">{lead.phoneNumber}</div>
                          {(lead.group || lead.workshop || lead.labels?.length) && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {lead.group && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{lead.group}</span>}
                              {lead.workshop && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{lead.workshop}</span>}
                              {lead.labels?.map(l => (
                                <span key={l} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{l}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                  </div>
                </>
              ) : (
                <>
                  {/* Select All / Clear All for Groups */}
                  {groups.length > 0 && (
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setSelectedGroupIds(new Set(groups.map(g => g.id)))}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded font-medium transition"
                      >
                        ✓ Select All ({groups.length})
                      </button>
                      <button
                        onClick={() => setSelectedGroupIds(new Set())}
                        className="flex-1 px-3 py-2 bg-gray-400 hover:bg-gray-500 text-white text-sm rounded font-medium transition"
                      >
                        ✕ Clear All
                      </button>
                    </div>
                  )}
                  <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {groups.length === 0 ? (
                      <p className="text-sm text-gray-500">No WhatsApp groups available</p>
                    ) : (
                      groups.map(group => (
                      <label key={group.id} className="flex items-start gap-2 p-2 hover:bg-white rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.has(group.id)}
                          onChange={(e) => {
                            const updated = new Set(selectedGroupIds);
                            if (e.target.checked) updated.add(group.id);
                            else updated.delete(group.id);
                            setSelectedGroupIds(updated);
                          }}
                          className="rounded mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 font-medium">{group.subject}</div>
                          <div className="text-xs text-gray-500">{group.participants || 0} members</div>
                        </div>
                      </label>
                    ))
                  )}
                  </div>
                </>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <div className="space-y-2">
                <select
                  value={selectedTemplate}
                  onChange={(e) => {
                    setSelectedTemplate(e.target.value);
                    const t = templates.find(x => x._id === e.target.value);
                    if (t) setCustomMessage(t.templateContent);
                  }}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Or select a template...</option>
                  {templates.map(t => (
                    <option key={t._id} value={t._id}>{t.templateName}</option>
                  ))}
                </select>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none h-24"
                />
              </div>
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Send</label>
              <div className="flex gap-2">
                {(['now', 'schedule'] as const).map(m => (
                  <label key={m} className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={scheduleMode === m}
                      onChange={() => setScheduleMode(m)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{m === 'now' ? 'Send Now' : 'Schedule'}</span>
                  </label>
                ))}
              </div>
              {scheduleMode === 'schedule' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                  <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleInitiateBroadcast}
              disabled={sending || selectedPhones.size === 0}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Broadcast'}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4">
          {runs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Clock className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No broadcasts yet</p>
            </div>
          ) : (
            <div className="space-y-2 max-w-2xl mx-auto">
              {runs.map(run => (
                <div key={run.id} className="p-3 border rounded-lg bg-white">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{run.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{run.recipients.length} recipients • {run.sent} sent</p>
                      <div className="w-32 h-2 bg-gray-100 rounded-full mt-2">
                        <div
                          className="h-full bg-green-600 rounded-full transition-all"
                          style={{ width: `${run.recipients.length > 0 ? (run.sent / run.recipients.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      run.status === 'completed' ? 'bg-green-100 text-green-700' :
                      run.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                      run.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Confirm Broadcast</h2>
              <button
                onClick={() => setShowConfirmation(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-900 mb-2">⚠️ Broadcast Details</div>
                <div className="space-y-1 text-sm text-amber-800">
                  <p><strong>Type:</strong> {recipientTab === 'people' ? 'People (DMs)' : 'Groups'}</p>
                  <p><strong>Recipients:</strong> {recipientTab === 'people' ? selectedPhones.size + ' people' : selectedGroupIds.size + ' group' + (selectedGroupIds.size === 1 ? '' : 's')}</p>
                  <p><strong>Message:</strong> {selectedTemplate ? 'Template' : 'Custom message'}</p>
                  <p><strong>Send Mode:</strong> {scheduleMode === 'now' ? 'Immediately' : `Scheduled for ${scheduleDate} at ${scheduleTime}`}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedCount > 0}
                    onChange={(e) => setConfirmedCount(e.target.checked ? 1 : 0)}
                    className="rounded mt-1"
                  />
                  <span className="text-sm text-gray-700">
                    I understand I'm sending to <strong>{recipientTab === 'people' ? selectedPhones.size + ' people' : selectedGroupIds.size + ' group' + (selectedGroupIds.size === 1 ? '' : 's')}</strong> and confirm this broadcast
                  </span>
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs text-blue-800">
                  💡 <strong>Rate limiting:</strong> Large broadcasts (100+) are auto-scheduled to prevent WhatsApp bans
                </div>
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBroadcast}
                disabled={confirmedCount === 0 || sending}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
              >
                {sending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
