'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { PageHeader, LoadingSpinner, AlertBox, StatusBadge } from '@/components/admin/crm';

function normalizePhoneForMeta(input?: string): string {
  const digits = String(input || '').replace(/\D/g, '');
  if (!digits) return '';

  // For India, if 10 digits assume +91.
  if (digits.length === 10) return `91${digits}`;

  // If it already starts with 91 and is 12 digits, keep.
  return digits;
}

interface Lead {
  _id: string;
  leadNumber?: string;
  assignedToUserId?: string;
  createdByUserId?: string;
  name: string;
  email: string;
  phoneNumber: string;
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
  source: string;
  labels: string[];
  workshopId?: string;
  workshopName?: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  metadata?: any;
}

interface MetaMessage {
  _id: string;
  phoneNumber: string;
  messageContent: string;
  direction: 'inbound' | 'outbound';
  status: string;
  createdAt: string;
  waMessageId?: string;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const crm = useCRM({ token });
  const id = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Lead>>({});

  // Meta WhatsApp Chat states
  const [messages, setMessages] = useState<MetaMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for Meta WhatsApp
  const fetchMetaMessages = async (phoneNumber: string) => {
    try {
      const normalized = normalizePhoneForMeta(phoneNumber);
      if (!normalized) return;

      setChatError(null);
      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/messages', {
        method: 'GET',
        params: { phoneNumber: normalized },
      });
      setMessages(res || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      setChatError(err instanceof Error ? err.message : 'Failed to fetch messages');
    }
  };

  // Send Meta WhatsApp message
  const handleSendMetaMessage = async () => {
    if (!lead?.phoneNumber || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      setChatError(null);

      const res = await crm.fetch('/api/admin/crm/whatsapp/meta/send', {
        method: 'POST',
        body: {
          phoneNumber: normalizePhoneForMeta(lead.phoneNumber),
          messageContent: newMessage,
        },
      });

      if (res?.messageId) {
        setNewMessage('');
        await fetchMetaMessages(lead.phoneNumber);
      } else {
        throw new Error(res?.error || 'Failed to send message');
      }
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setSendingMessage(false);
    }
  };

  // Fetch lead details
  useEffect(() => {
    if (!id || !token) return;

    const fetchLead = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/crm/leads/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load lead: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.data) {
          setLead(data.data);
          setEditForm(data.data);
          // Fetch Meta messages for this lead
          if (data.data.phoneNumber) {
            await fetchMetaMessages(data.data.phoneNumber);
          }
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
    
    // Auto-refresh messages every 5 seconds
    if (lead?.phoneNumber) {
      const interval = setInterval(() => fetchMetaMessages(lead.phoneNumber), 5000);
      return () => clearInterval(interval);
    }
  }, [id, token]);

  // Refresh messages when lead phone changes
  useEffect(() => {
    if (lead?.phoneNumber) {
      const interval = setInterval(() => fetchMetaMessages(lead.phoneNumber), 5000);
      return () => clearInterval(interval);
    }
  }, [lead?.phoneNumber]);

  const handleStatusChange = async (newStatus: Lead['status']) => {
    if (!lead || !token) return;

    try {
      const response = await fetch(`/api/admin/crm/leads/${lead._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      const data = await response.json();
      setLead(data.data);
      setEditForm(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleSaveChanges = async () => {
    if (!lead || !token) return;

    try {
      const response = await fetch(`/api/admin/crm/leads/${lead._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) throw new Error('Failed to update lead');

      const data = await response.json();
      setLead(data.data);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
    }
  };

  if (!token) {
    return <AlertBox type="error" message="Authentication required" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Lead Details" subtitle="Loading..." />
        <LoadingSpinner />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Lead Details" subtitle="Lead not found" />
        <AlertBox
          type="error"
          message={error || 'Lead not found'}
          onClose={() => router.back()}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/crm')}
              className="p-2 hover:bg-slate-300 rounded-lg transition-colors text-slate-600 hover:text-slate-900"
              title="Go to CRM Dashboard"
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{lead.name || 'Unnamed Lead'}</h1>
              <p className="text-slate-600">{lead.phoneNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChanges}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditForm(lead);
                  }}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
              >
                Edit
              </button>
            )}

            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-180px)]">
          
          {/* LEFT: Lead Details */}
          <div className="bg-white rounded-xl shadow-lg overflow-y-auto">
            <div className="p-8">
              {error && (
                <AlertBox type="error" message={error} onClose={() => setError(null)} />
              )}

              {/* Status Section */}
              <div className="mb-8 pb-8 border-b-2 border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Status</h2>
                <div className="flex gap-4">
                  {(['lead', 'prospect', 'customer', 'inactive'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        lead.status === status
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-8 pb-8 border-b-2 border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Contact Information</h2>
                <div className="space-y-6">
                  <div>
                    <p className="text-slate-600 text-sm font-semibold uppercase mb-2">Email Address</p>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    ) : (
                      <p className="text-slate-900 text-lg font-semibold">{lead.email || '-'}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-slate-600 text-sm font-semibold uppercase mb-2">Phone Number</p>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={editForm.phoneNumber || ''}
                        onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                      />
                    ) : (
                      <p className="text-slate-900 text-lg font-semibold">{lead.phoneNumber || '-'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Workshop Info */}
              <div className="mb-8 pb-8 border-b-2 border-slate-200">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Program / Workshop</h2>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.workshopName || ''}
                    onChange={(e) => setEditForm({ ...editForm, workshopName: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg text-slate-900 focus:border-emerald-500 focus:outline-none"
                    placeholder="e.g., Yoga Retreat 2025"
                  />
                ) : (
                  <p className="text-slate-900 text-lg font-semibold">{lead.workshopName || 'Not specified'}</p>
                )}
              </div>

              {/* Labels */}
              <div className="mb-8 pb-8 border-b-2 border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Labels</h3>
                <div className="flex flex-wrap gap-3">
                  {lead.labels && lead.labels.length > 0 ? (
                    lead.labels.map((label) => (
                      <span
                        key={label}
                        className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full font-semibold text-sm border border-orange-300"
                      >
                        {label}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">No labels assigned</p>
                  )}
                </div>
              </div>

              {/* Timeline */}
              <div className="mb-8">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Timeline</h2>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-slate-600 text-xs font-semibold uppercase">Created Date</p>
                    <p className="text-slate-900 font-semibold mt-1">{new Date(lead.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-slate-500 text-xs">{new Date(lead.createdAt).toLocaleTimeString()}</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <p className="text-slate-600 text-xs font-semibold uppercase">Last Updated</p>
                    <p className="text-slate-900 font-semibold mt-1">{new Date(lead.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-slate-500 text-xs">{new Date(lead.updatedAt).toLocaleTimeString()}</p>
                  </div>

                  {lead.lastMessageAt && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <p className="text-slate-600 text-xs font-semibold uppercase">Last Message</p>
                      <p className="text-slate-900 font-semibold mt-1">{new Date(lead.lastMessageAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-slate-500 text-xs">{new Date(lead.lastMessageAt).toLocaleTimeString()}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveChanges}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditForm(lead);
                      }}
                      className="px-6 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Meta WhatsApp Chat */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-teal-700 via-cyan-600 to-sky-600 text-white px-6 py-4 border-b border-cyan-700">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">WhatsApp Meta Chat</h2>
                  <p className="text-white/80 text-sm">{lead.phoneNumber}</p>
                </div>
                <div className="text-xs bg-black/20 px-3 py-1 rounded-full border border-white/20">
                  {messages.length} messages
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50 via-white to-slate-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p className="text-center">
                    <p className="text-4xl mb-2">💬</p>
                    <p>No messages yet</p>
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.direction === 'outbound'
                          ? 'bg-gradient-to-br from-teal-700 via-cyan-600 to-sky-600 text-white shadow-md'
                          : 'bg-white text-gray-900 border border-slate-200 shadow-sm'
                      }`}
                    >
                      <p className="break-words text-sm">{msg.messageContent}</p>
                      <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-white/80' : 'text-slate-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error Message */}
            {chatError && (
              <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
                {chatError}
              </div>
            )}

            {/* Message Input */}
            <div className="border-t border-gray-200 bg-white p-4">
              <div className="flex gap-2">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  rows={2}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleSendMetaMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMetaMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-teal-700 via-cyan-600 to-sky-600 text-white rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors h-fit"
                >
                  {sendingMessage ? '...' : '✓'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Ctrl+Enter to send</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
