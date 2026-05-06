'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { Send, Search, Users, Loader2, CheckCircle2, X } from 'lucide-react';

type Chat = {
  id: string;
  name: string;
  isGroup: boolean;
};

export default function QRBroadcastV2() {
  const token = useAuth();
  const { fetch: crmFetch } = useCRM({ token });

  // State
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  // Load chats from QR Bridge
  useEffect(() => {
    const loadChats = async () => {
      if (!token) return;
      setLoading(true);
      try {
        // Fetch chats directly from QR bridge
        const res = await crmFetch('/api/admin/crm/whatsapp/qr-bridge', { params: { path: '/chats' } });
        if (Array.isArray(res)) {
          const mappedChats = res.map((c: any) => {
            // Simple and reliable group detection
            const isGroupChat =
              c.id.endsWith('@g.us') ||  // Standard WhatsApp group
              c.isGroup === true ||
              c.isGroupChat === true ||
              c.groupMetadata !== undefined;

            console.log(`[QR Broadcast] Chat: ${c.name} | ID: ${c.id} | IsGroup: ${isGroupChat}`);

            return {
              id: c.id,
              name: c.name || c.id,
              isGroup: isGroupChat,
            };
          });

          const groups = mappedChats.filter(c => c.isGroup);
          const people = mappedChats.filter(c => !c.isGroup);
          console.log(`[QR Broadcast] Total: ${mappedChats.length} | Groups: ${groups.length} | People: ${people.length}`);

          setChats(mappedChats);
        }
      } catch (err) {
        console.error('[QR Broadcast] Error loading chats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [token, crmFetch]);

  // Categorize chats
  const { people, groups } = useMemo(() => ({
    people: chats.filter(c => !c.isGroup),
    groups: chats.filter(c => c.isGroup),
  }), [chats]);

  // Toggle recipient
  const toggleRecipient = (id: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select all groups
  const selectAllGroups = () => {
    setSelectedRecipients(prev => new Set([...prev, ...groups.map(g => g.id)]));
  };

  // Select all people
  const selectAllPeople = () => {
    setSelectedRecipients(prev => new Set([...prev, ...people.map(p => p.id)]));
  };

  // Select all chats
  const selectAll = () => {
    setSelectedRecipients(new Set(chats.map(c => c.id)));
  };

  // Clear all
  const clearAll = () => {
    setSelectedRecipients(new Set());
  };

  // Filter chats by search
  const filteredChats = useMemo(() => {
    if (!searchQuery) return { groups, people };
    const query = searchQuery.toLowerCase();
    return {
      groups: groups.filter(g => g.name.toLowerCase().includes(query) || g.id.includes(query)),
      people: people.filter(p => p.name.toLowerCase().includes(query) || p.id.includes(query)),
    };
  }, [groups, people, searchQuery]);

  // Send broadcast
  const handleSend = async () => {
    if (!messageText.trim() || selectedRecipients.size === 0) return;

    setSending(true);
    try {
      // Send to each recipient
      const bridgeCall = async (path: string, method = 'GET', body?: any) => {
        return crmFetch('/api/admin/crm/whatsapp/qr-bridge', {
          params: method === 'GET' ? { path } : undefined,
          method: method === 'GET' ? 'GET' : 'POST',
          body: method !== 'GET' ? { action: method, path, body } : undefined,
        });
      };

      let sent = 0;
      let failed = 0;

      for (const chatId of Array.from(selectedRecipients)) {
        try {
          await bridgeCall('/send', 'POST', {
            to: chatId,
            message: messageText.trim(),
            type: 'text',
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send to ${chatId}:`, err);
          failed++;
        }
        // Add delay between sends to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
      }

      alert(`✅ Sent: ${sent}\n❌ Failed: ${failed}`);
      setMessageText('');
      setSelectedRecipients(new Set());
    } catch (err) {
      console.error('Broadcast error:', err);
      alert('Error sending broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">QR WhatsApp Broadcast</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recipients Panel */}
          <div className="lg:col-span-1 bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" /> Recipients
              </h2>
              <p className="text-sm text-gray-500 mt-1">Selected: {selectedRecipients.size} / {chats.length}</p>
            </div>

            {/* Search */}
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            </div>

            {/* Select All Buttons */}
            <div className="p-3 border-b flex gap-2 flex-wrap">
              <button onClick={selectAll} className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded font-semibold">
                ✓ All ({chats.length})
              </button>
              <button onClick={clearAll} className="px-3 py-1.5 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded font-semibold">
                ✕ Clear
              </button>
            </div>

            {/* Groups Section */}
            {filteredChats.groups.length > 0 && (
              <div className="border-b">
                <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">💬 Groups ({filteredChats.groups.length})</h3>
                  <button
                    onClick={selectAllGroups}
                    className="text-xs px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded font-semibold"
                  >
                    +All
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredChats.groups.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => toggleRecipient(chat.id)}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 border-b hover:bg-purple-50 transition ${
                        selectedRecipients.has(chat.id) ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedRecipients.has(chat.id)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedRecipients.has(chat.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{chat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* People Section */}
            {filteredChats.people.length > 0 && (
              <div>
                <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-900">👤 People ({filteredChats.people.length})</h3>
                  <button
                    onClick={selectAllPeople}
                    className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded font-semibold"
                  >
                    +All
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredChats.people.map(chat => (
                    <button
                      key={chat.id}
                      onClick={() => toggleRecipient(chat.id)}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 border-b hover:bg-blue-50 transition ${
                        selectedRecipients.has(chat.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedRecipients.has(chat.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedRecipients.has(chat.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm text-gray-700 truncate">{chat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}

            {!loading && chats.length === 0 && (
              <p className="p-8 text-center text-sm text-gray-400">No chats found</p>
            )}
          </div>

          {/* Message Composer */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Compose Message</h2>

              <textarea
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder="Type your message..."
                rows={8}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 resize-none text-sm"
                maxLength={4096}
              />

              <div className="flex justify-between mt-3">
                <span className="text-xs text-gray-500">{messageText.length}/4096</span>
              </div>

              <button
                onClick={handleSend}
                disabled={!messageText.trim() || selectedRecipients.size === 0 || sending || loading}
                className="w-full mt-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : `Send to ${selectedRecipients.size} recipient${selectedRecipients.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
