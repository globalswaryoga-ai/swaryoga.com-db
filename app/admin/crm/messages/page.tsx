'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import {
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
  isRead?: boolean;
  isArchived?: boolean;
  failureReason?: string;
  sentAt?: string;
  backgroundColor?: string;
  textColor?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationThread {
  phoneNumber: string;
  leadId?: string;
  leadName?: string;
  unreadCount: number;
  lastMessage: Message;
  lastMessageAt: Date;
  messages: Message[];
}

export default function MessagesPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });

  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'incoming' | 'all'>('incoming');
  const [selectedThread, setSelectedThread] = useState<ConversationThread | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group messages into conversation threads
  const buildThreads = useCallback((msgs: Message[]): ConversationThread[] => {
    const threadMap = new Map<string, ConversationThread>();

    msgs.forEach((msg) => {
      const phone = msg.phoneNumber;
      const leadId = typeof msg.leadId === 'string' ? msg.leadId : msg.leadId?._id;
      const leadName = typeof msg.leadId === 'string' ? undefined : msg.leadId?.name;

      if (!threadMap.has(phone)) {
        threadMap.set(phone, {
          phoneNumber: phone,
          leadId,
          leadName,
          unreadCount: 0,
          lastMessage: msg,
          lastMessageAt: new Date(msg.sentAt || msg.createdAt),
          messages: [],
        });
      }

      const thread = threadMap.get(phone)!;
      thread.messages.push(msg);

      if (msg.direction === 'inbound' && !msg.isRead) {
        thread.unreadCount += 1;
      }

      // Update last message
      const msgTime = new Date(msg.sentAt || msg.createdAt);
      if (msgTime > thread.lastMessageAt) {
        thread.lastMessage = msg;
        thread.lastMessageAt = msgTime;
      }
    });

    // Sort threads by most recent message first
    const threads = Array.from(threadMap.values());
    threads.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());

    // Sort messages within each thread by oldest first
    threads.forEach((thread) => {
      thread.messages.sort((a, b) => {
        const aTime = new Date(a.sentAt || a.createdAt).getTime();
        const bTime = new Date(b.sentAt || b.createdAt).getTime();
        return aTime - bTime;
      });
    });

    return threads;
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      setError(null);
      const result = await crm.fetch('/api/admin/crm/messages', {
        params: {
          limit: 1000, // Fetch enough for thread grouping
          direction: view === 'incoming' ? 'inbound' : undefined,
        },
      });

      setMessages(result?.data?.messages || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    }
  }, [crm, view]);

  useEffect(() => {
    if (!token) {
      router.push('/admin/login');
      return;
    }
    fetchMessages();
  }, [token, router, fetchMessages, view]);

  // Auto-refresh incoming messages every 5 seconds
  useEffect(() => {
    if (view !== 'incoming') return;
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [view, fetchMessages]);

  const threads = buildThreads(messages);

  const filteredThreads = threads.filter((thread) => {
    const query = searchQuery.toLowerCase();
    return (
      thread.phoneNumber.includes(query) ||
      (thread.leadName && thread.leadName.toLowerCase().includes(query))
    );
  });

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    if (!selectedThread.leadId) {
      setError('Cannot reply: no lead associated with this conversation');
      return;
    }

    setIsSendingReply(true);
    try {
      await crm.fetch('/api/admin/crm/messages', {
        method: 'POST',
        body: {
          leadId: selectedThread.leadId,
          phoneNumber: selectedThread.phoneNumber,
          messageContent: replyText.trim(),
          messageType: 'text',
        },
      });

      setReplyText('');
      setSelectedThread(null);
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleSendMedia = async () => {
    if (!selectedThread || !mediaFile) return;
    if (!selectedThread.leadId) {
      setError('Cannot send media: no lead associated with this conversation');
      return;
    }

    setIsSendingMedia(true);
    try {
      // Step 1: Upload file to S3
      const uploadFormData = new FormData();
      uploadFormData.append('file', mediaFile);

      const uploadResponse = await fetch('/api/admin/crm/templates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || 'Failed to upload file');
      }

      const uploadData = await uploadResponse.json();
      const mediaUrl = uploadData.fileUrl;

      // Step 2: Send media via WhatsApp API
      const isImage = mediaFile.type.startsWith('image/');
      const isVideo = mediaFile.type.startsWith('video/');
      const mediaType = isImage ? 'image' : isVideo ? 'video' : 'document';

      const response = await fetch('/api/admin/crm/whatsapp/send-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: selectedThread.leadId,
          phoneNumber: selectedThread.phoneNumber,
          mediaUrl,
          mediaType,
          caption: mediaCaption.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send media');
      }

      // Reset media state
      setMediaFile(null);
      setMediaCaption('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send media');
    } finally {
      setIsSendingMedia(false);
    }
  };

  const handleMarkThreadAsRead = async (thread: ConversationThread) => {
    try {
      for (const msg of thread.messages) {
        if (msg.direction === 'inbound' && !msg.isRead) {
          await crm.fetch('/api/admin/crm/messages', {
            method: 'PUT',
            body: { messageId: msg._id, action: 'mark-read' },
          });
        }
      }
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark thread as read');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <PageHeader
            title="WhatsApp Messages"
            action={
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setView('incoming');
                    setSelectedThread(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    view === 'incoming'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📨 Incoming Messages
                </button>
                <button
                  onClick={() => {
                    setView('all');
                    setSelectedThread(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    view === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📧 All Messages
                </button>
              </div>
            }
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Thread List */}
        <div className={`${selectedThread ? 'w-1/3' : 'w-full'} border-r border-gray-200 bg-white transition-all`}>
          <div className="h-full flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto">
              {error && !selectedThread && (
                <div className="p-4">
                  <AlertBox type="error" message={error} onClose={() => setError(null)} />
                </div>
              )}

              {crm.loading ? (
                <div className="p-8 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p className="text-lg">No messages found</p>
                  <p className="text-sm mt-1">Messages from customers will appear here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredThreads.map((thread) => (
                    <button
                      key={thread.phoneNumber}
                      onClick={() => {
                        setSelectedThread(thread);
                        handleMarkThreadAsRead(thread);
                      }}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                        selectedThread?.phoneNumber === thread.phoneNumber
                          ? 'bg-green-50 border-green-500'
                          : 'border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {thread.leadName || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-600">{thread.phoneNumber}</div>
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 line-clamp-2">
                        {thread.lastMessage.messageContent}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(thread.lastMessageAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Thread Detail */}
        {selectedThread && (
          <div className="w-2/3 bg-white flex flex-col">
            {/* Thread Header */}
            <div className="border-b border-gray-200 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedThread.leadName || 'Unknown'}</h2>
                <p className="text-sm text-gray-600">{selectedThread.phoneNumber}</p>
              </div>
              <button
                onClick={() => setSelectedThread(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selectedThread.messages.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No messages in this conversation</p>
                </div>
              ) : (
                selectedThread.messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className="max-w-xs px-4 py-3 rounded-lg"
                      style={{
                        backgroundColor: msg.backgroundColor || (msg.direction === 'inbound' ? '#22c55e' : '#e5e7eb'),
                        color: msg.textColor || (msg.direction === 'inbound' ? '#ffffff' : '#000000'),
                      }}
                    >
                      <p className="text-sm break-words">{msg.messageContent}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {msg.direction === 'outbound' && (
                        <p className="text-xs opacity-75 mt-1">
                          {msg.status === 'delivered' && '✓✓'} {msg.status}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input */}
            <div className="border-t border-gray-200 p-6 space-y-3">
              <textarea
                ref={replyInputRef}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                maxLength={1000}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              
              {/* Media Upload Section */}
              {!mediaFile ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    📸 Send Image
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    🎬 Send Video
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMediaFile(file);
                      }
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{mediaFile.type.startsWith('image/') ? '📸' : '🎬'}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{mediaFile.name}</p>
                        <p className="text-xs text-gray-600">{(mediaFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMediaFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-red-500 hover:text-red-700 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    placeholder="Add caption (optional)..."
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendMedia}
                      disabled={isSendingMedia}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                      {isSendingMedia ? 'Sending...' : '📤 Send Media'}
                    </button>
                    <button
                      onClick={() => {
                        setMediaFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold py-2 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleSendReply}
                disabled={!replyText.trim() || isSendingReply}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {isSendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
