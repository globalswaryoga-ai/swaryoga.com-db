'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
  DataTable,
  FormModal,
  PageHeader,
  LoadingSpinner,
  AlertBox,
} from '@/components/admin/crm';

type PopulatedLead = { _id: string; name?: string; phoneNumber?: string };

interface Message {
  _id: string;
  leadId: string | PopulatedLead;
  phoneNumber: string;
  messageContent: string;
  messageType?: 'text' | 'template' | 'media' | 'interactive';
  direction: 'inbound' | 'outbound';
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'read';
  failureReason?: string;
  sentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function MessagesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'sent' | 'delivered' | 'failed' | 'read'>('all');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [formData, setFormData] = useState({
    leadId: '',
    phoneNumber: '',
    messageContent: '',
  });
  const [page, setPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);

  const pageSize = 20;

  const fetchMessages = useCallback(async () => {
    try {
      const result = await crm.fetch('/api/admin/crm/messages', {
        params: {
          limit: pageSize,
          skip: (page - 1) * pageSize,
          status: statusFilter === 'all' ? undefined : statusFilter,
          direction: directionFilter === 'all' ? undefined : directionFilter,
        },
      });

      setMessages(result?.messages || []);
      setTotalMessages(result?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [crm, directionFilter, page, pageSize, statusFilter]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchMessages();
  }, [token, router, fetchMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crm.fetch('/api/admin/crm/messages', {
        method: 'POST',
        body: {
          leadId: formData.leadId,
          phoneNumber: formData.phoneNumber,
          messageContent: formData.messageContent,
          messageType: 'text',
        },
      });

      setShowSendModal(false);
      setFormData({ leadId: '', phoneNumber: '', messageContent: '' });
      setPage(1);
      fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    try {
      await crm.fetch('/api/admin/crm/messages', {
        method: 'PUT',
        body: { messageId, action: 'retry' },
      });
      fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to retry');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    try {
      await crm.fetch('/api/admin/crm/messages', {
        method: 'DELETE',
        params: { messageId },
      });
      fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      queued: 'bg-yellow-500/20 text-yellow-200 border-yellow-500/30',
      sent: 'bg-blue-500/20 text-blue-200 border-blue-500/30',
      delivered: 'bg-purple-500/20 text-purple-200 border-purple-500/30',
      failed: 'bg-red-500/20 text-red-200 border-red-500/30',
      read: 'bg-green-500/20 text-green-200 border-green-500/30',
    };
    return colors[status] || colors.queued;
  };

  const getDirectionIcon = (direction: string) => {
    return direction === 'inbound' ? '📨' : '📤';
  };

  const columns = [
    {
      key: 'direction',
      label: 'Type',
      render: (dir: string) => `${getDirectionIcon(dir)} ${dir}`,
    },
    {
      key: 'leadId',
      label: 'Lead',
      render: (lead: string | PopulatedLead) =>
        typeof lead === 'string' ? lead.slice(-6) : lead?._id?.slice(-6) || 'N/A',
    },
    {
      key: 'messageContent',
      label: 'Message',
      render: (msg: string) => <div className="line-clamp-2">{msg}</div>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => (
        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(status)}`}>
          {status}
        </span>
      ),
    },
    {
      key: 'sentAt',
      label: 'Date',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, msg: Message) => (
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMessage(msg)}
            className="px-3 py-1 bg-blue-500/20 text-blue-200 rounded-lg text-sm hover:bg-blue-500/30 transition-colors"
          >
            View
          </button>
          {msg.status === 'failed' && (
            <button
              onClick={() => handleRetryMessage(msg._id)}
              className="px-3 py-1 bg-yellow-500/20 text-yellow-200 rounded text-xs hover:bg-yellow-500/30 transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Messages & WhatsApp"
          action={
            <button
              onClick={() => setShowSendModal(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
            >
              + Send Message
            </button>
          }
        />

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-purple-200 text-sm mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="failed">Failed</option>
              <option value="read">Read</option>
            </select>
          </div>
          <div>
            <label className="block text-purple-200 text-sm mb-2">Filter by Direction</label>
            <select
              value={directionFilter}
              onChange={(e) => {
                setDirectionFilter(e.target.value as any);
                setPage(1);
              }}
              className="w-full bg-slate-800/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            >
              <option value="all">All Directions</option>
              <option value="inbound">Inbound (Received)</option>
              <option value="outbound">Outbound (Sent)</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {crm.loading ? (
          <LoadingSpinner />
        ) : error ? (
          <AlertBox type="error" message={error} onClose={() => setError(null)} />
        ) : (
          <div className="space-y-6">
            {/* Data Table */}
            <DataTable
              columns={columns}
              data={messages}
              emptyMessage="No messages found"
            />

            {/* Pagination */}
            {totalMessages > 0 && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
                >
                  Previous
                </button>
                <div className="text-purple-200 text-sm">
                  {totalMessages > 0 ? `Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, totalMessages)} of ${totalMessages}` : 'No messages'}
                </div>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalMessages}
                  className="px-4 py-2 bg-purple-500/20 text-purple-200 rounded-lg disabled:opacity-50 hover:bg-purple-500/30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-xl border border-purple-500/50 p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Message Details</h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Direction</label>
                  <div className="text-white capitalize">{selectedMessage.direction} - {getDirectionIcon(selectedMessage.direction)}</div>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Lead ID</label>
                  <div className="text-white font-mono">
                    {typeof selectedMessage.leadId === 'string'
                      ? selectedMessage.leadId
                      : selectedMessage.leadId?._id}
                  </div>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedMessage.status)}`}>
                    {selectedMessage.status}
                  </span>
                </div>
                <div>
                  <label className="block text-purple-300 text-sm mb-1">Message</label>
                  <div className="bg-slate-700/50 rounded-lg p-4 text-purple-200 whitespace-pre-wrap">
                    {selectedMessage.messageContent}
                  </div>
                </div>
                {selectedMessage.failureReason && (
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Failure Reason</label>
                    <div className="text-red-200 text-sm">{selectedMessage.failureReason}</div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Created</label>
                    <div className="text-white text-sm">{new Date(selectedMessage.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <label className="block text-purple-300 text-sm mb-1">Updated</label>
                    <div className="text-white text-sm">{new Date(selectedMessage.updatedAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {selectedMessage.status === 'failed' && (
                  <button
                    onClick={() => {
                      handleRetryMessage(selectedMessage._id);
                      setSelectedMessage(null);
                    }}
                    className="flex-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-200 rounded-lg transition-colors"
                  >
                    Retry Message
                  </button>
                )}
                <button
                  onClick={() => {
                    handleDeleteMessage(selectedMessage._id);
                    setSelectedMessage(null);
                  }}
                  className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors"
                >
                  Delete Message
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Send Message Modal */}
        <FormModal
          isOpen={showSendModal}
          title="Send Message"
          onSubmit={handleSendMessage}
          submitLabel="Send"
          cancelLabel="Cancel"
          onClose={() => {
            setShowSendModal(false);
            setFormData({ leadId: '', phoneNumber: '', messageContent: '' });
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 text-sm mb-2">Lead ID *</label>
              <input
                type="text"
                required
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Mongo Lead ID"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm mb-2">Phone Number *</label>
              <input
                type="text"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="91XXXXXXXXXX"
              />
            </div>

            <div>
              <label className="block text-purple-200 text-sm mb-2">Message *</label>
              <textarea
                required
                rows={5}
                maxLength={1000}
                value={formData.messageContent}
                onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
                className="w-full bg-slate-700/50 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                placeholder="Type your message..."
              />
            </div>
          </div>
        </FormModal>
      </div>
    </div>
  );
}
