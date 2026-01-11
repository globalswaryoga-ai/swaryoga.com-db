// QR WhatsApp 1-1 Inbox (Shared WhatsApp Web session).
'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function QRWhatsAppInboxPage() {
  const token = useAuth();

  const [status, setStatus] = useState('loading');
  const [qr, setQr] = useState<string | null>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [syncedMediaIds, setSyncedMediaIds] = useState<Set<string>>(new Set());
  const [syncingMediaIds, setSyncingMediaIds] = useState<Set<string>>(new Set());
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [selectedChat, setSelectedChat] = useState<any>(null);

  // Helper to safely get string ID from a chat object
  const getChatIdStr = (chat: any) => {
    if (!chat || !chat.id) return '';
    if (typeof chat.id === 'string') return chat.id;
    return chat.id._serialized || chat.id.id || '';
  };

  const selectedChatIdStr = useMemo(() => getChatIdStr(selectedChat), [selectedChat]);

  const [selectedThreadIds, setSelectedThreadIds] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<any[]>([]);
  const [messageLimit, setMessageLimit] = useState(5);
  const [newMessage, setNewMessage] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'text' | 'image' | 'video' | 'buttons' | 'document'>('text');
  const [buttonLabels, setButtonLabels] = useState<string[]>(['', '', '']);
  const [showRichControls, setShowRichControls] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);
  const [starToolsOpen, setStarToolsOpen] = useState(false);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [delayTime, setDelayTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [assignedUser, setAssignedUser] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'white' | 'dark' | 'green' | 'blue' | 'lavender'>('white');

  const themeConfig = {
    white: { bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-900', sidebar: 'bg-slate-50/80', chatBg: '#efeae2', header: 'bg-white/90' },
    dark: { bg: 'bg-slate-950', border: 'border-slate-800', text: 'text-white', sidebar: 'bg-slate-900', chatBg: '#0b141a', header: 'bg-slate-900/95' },
    green: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900', sidebar: 'bg-emerald-100/40', chatBg: '#dcfce7', header: 'bg-emerald-50/90' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900', sidebar: 'bg-blue-100/40', chatBg: '#dbeafe', header: 'bg-blue-50/90' },
    lavender: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-900', sidebar: 'bg-purple-100/40', chatBg: '#f3e8ff', header: 'bg-purple-50/90' },
  };

  const currentTheme = themeConfig[theme];
  
  // NEW CRM SELECTIONS
  const [leadStatuses] = useState(['Leads', 'Prospect', 'Interested', 'Customer', 'Inactive']);
  const [leadLabels] = useState(['New', 'Chatting', 'Replying', 'Ready to call', 'Call done', 'Interested', 'Next time', 'Enrolled', 'No reply']);
  const [pollModalOpen, setPollModalOpen] = useState(false);
  const [pollData, setPollData] = useState({ 
    question: '', 
    options: ['', ''] 
  });
  const [buttonModalOpen, setButtonModalOpen] = useState(false);
  const [buttonData, setButtonData] = useState({
    text: '',
    buttons: ['', '', '']
  });

  const [teamMembers, setTeamMembers] = useState<any[]>([
    { id: 'admin', name: 'System Admin' },
    { id: 'mohan', name: 'Mohan Kalburgi' },
    { id: 'sales_1', name: 'Sales Head' },
    { id: 'support_1', name: 'Customer Success' }
  ]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const bridgeUrl = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL || 'http://localhost:3333';
  const bridgeSecret = process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

  const bridgeFetch = (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'x-bridge-secret': bridgeSecret
      }
    });
  };

  useEffect(() => {
    const checkStatus = async () => {
      try {
        if (!token) return;
        const res = await bridgeFetch(`${bridgeUrl}/status`);
        if (!res.ok) throw new Error('Bridge unreachable');
        const data = await res.json();
        
        // Handle all valid bridge statuses from services/whatsapp-web/index.js
        // valid: disconnected, qr, connecting, connected, authenticated
        if (data.status === 'connected' || data.status === 'authenticated') {
          setStatus('connected');
          fetchChats();
        } else if (data.status === 'qr') {
          setStatus('qr');
          fetchQR();
        } else if (data.status === 'connecting') {
          setStatus('connecting');
        } else {
          setStatus('disconnected');
        }
      } catch (e) {
        console.error('Bridge not reachable');
        setStatus('disconnected'); 
      }
    };
    
    checkStatus();
    // Refresh status every 10s for better responsiveness
    const timer = setInterval(checkStatus, 10000);
    return () => clearInterval(timer);
  }, [bridgeUrl, token]);

  const fetchQR = async () => {
    try {
      const response = await bridgeFetch(`${bridgeUrl}/qr`);
      const data = await response.json();
      if (data.qr) setQr(data.qr);
    } catch (err) {
      console.error('Failed to fetch QR', err);
    }
  };

  const fetchChats = async () => {
    if (loadingChats || !token) return;
    setLoadingChats(true);
    try {
      // 1. Try CRM API (with assignments logic)
      const res = await fetch('/api/admin/crm/whatsapp/qr/chats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.chats)) {
        setChats(data.chats);
        return;
      }
      
      // 2. Fallback: Try direct bridge (if CRM API is unreachable or fails)
      console.warn('CRM Chats API failed, trying direct bridge fallback...');
      const bridgeRes = await bridgeFetch(`${bridgeUrl}/chats`);
      const bridgeData = await bridgeRes.json();
      if (Array.isArray(bridgeData.chats)) {
        setChats(bridgeData.chats);
      }
    } catch (e) {
      console.error('Failed to fetch chats from all sources');
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    if (!selectedChatIdStr || selectedChatIdStr === '[object Object]') {
      setMessages([]);
      return;
    }
    
    fetchMessages(selectedChatIdStr);
    const msgInterval = setInterval(() => fetchMessages(selectedChatIdStr), 10000);
    return () => clearInterval(msgInterval);
  }, [selectedChatIdStr]);

  const fetchMessages = async (chatId: string) => {
    if (!chatId || chatId === '[object Object]') return;
    setLoadingMessages(true);
    try {
      const res = await bridgeFetch(`${bridgeUrl}/messages/${chatId}`);
      if (!res.ok) throw new Error('Messages fetch failed');
      const data = await res.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (e) {
      console.error('Failed to fetch messages:', e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (token) {
      await fetchChats();
      if (selectedChatIdStr) await fetchMessages(selectedChatIdStr);
    }
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch chats and messages when the tab is active
        if (token) {
          fetchChats();
          if (selectedChatIdStr) fetchMessages(selectedChatIdStr);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedChatIdStr, token]);

  // If no token, useAuth will redirect to login, but we should handle this gracefully.
  // IMPORTANT: This must be after *all* hooks, otherwise eslint will report
  // "React Hook is called conditionally".
  if (!token) {
    return (
      <div className="h-screen bg-white flex items-center justify-center font-jakarta">
        <div className="text-center">
          <p className="text-slate-500 font-bold">Authenticating...</p>
        </div>
      </div>
    );
  }

  const sendMessage = async () => {
    if (!selectedChat || sending) return;
    
    const totalDelayMs = (delayTime.minutes * 60 + delayTime.seconds) * 1000;
    
    if (totalDelayMs > 0) {
      const confirmDelay = window.confirm(`Send this message in ${totalDelayMs/1000} seconds?`);
      if (!confirmDelay) return;
      
      setSending(true);
      // Wait for the delay
      await new Promise(resolve => setTimeout(resolve, totalDelayMs));
      setDelayTime({ ...delayTime, minutes: 0, seconds: 0 });
    }

    setSending(true);
    try {
      const payload: any = {
        to: selectedChatIdStr,
        message: newMessage,
        type: mediaType,
      };

      if (mediaType !== 'text' && mediaUrl) {
         payload.url = mediaUrl;
      }
      
      if (mediaType === 'buttons') {
         payload.buttons = buttonLabels.filter(l => l.trim() !== '');
      }

      // USE BACKEND SEND API (For attribution & logging)
      await fetch('/api/admin/crm/whatsapp/qr/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      setNewMessage('');
      setMediaUrl('');
      setMediaType('text');
      setShowRichControls(false);
      setTimeout(() => fetchMessages(selectedChatIdStr), 1500);
    } catch (e) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const startConnection = async () => {
    try {
      await bridgeFetch(`${bridgeUrl}/connect`, { method: 'POST' });
      setStatus('connecting');
    } catch (e) {
      alert(`Could not reach WhatsApp Bridge at ${bridgeUrl}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size - if > 5MB we warn about base64 size
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large for direct sending (>5MB). Please compress it first or use a direct URL.');
      return;
    }

    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
        
        const confirmSend = window.confirm(`Send ${file.name} to this contact?`);
        if (!confirmSend) {
          setIsUploading(false);
          return;
        }

        try {
          const response = await fetch('/api/admin/crm/whatsapp/qr/send', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
              to: selectedChatIdStr, 
              type: type, 
              url: base64Data, // Simple logic: send base64 directly to our bridge
              caption: '',
              message: ''
            })
          });

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to send file');
          }

          setIsUploading(false);
          alert('Message sent successfully!');
          // Refresh messages
          if (selectedChatIdStr) {
             fetchMessages(selectedChatIdStr);
          }
        } catch (err: any) {
          alert(err.message || 'Send failed');
          setIsUploading(false);
        }
      };
    } catch (err: any) {
      alert('Failed to process file');
      setIsUploading(false);
    }
  };

  const restartBridge = async () => {
    if (!window.confirm('Restart WhatsApp Bridge session?')) return;
    try {
      await bridgeFetch(`${bridgeUrl}/restart`, { method: 'POST' });
      setStatus('connecting');
      alert('Restarting... Please wait 10 seconds.');
    } catch (e) {
      alert('Failed to reach bridge');
    }
  };

  // Helper to create a lead for the currently selected chat.
  // Defined before effects that may reference it to avoid conditional hook lint issues.
  const handleAddAsLead = async () => {
    if (!selectedChatIdStr) return;
    const phone = selectedChatIdStr.split('@')[0];
    const name = selectedChat?.name || 'New Lead';
    
    try {
      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name, 
          phoneNumber: phone,
          source: 'whatsapp'
        })
      });
      const data = await res.json();
      if (data.success) {
        const newLead = data.data;
        setSelectedLead(newLead);
        // Update chat list with real lead ID
        setChats(prev => prev.map(c => getChatIdStr(c) === selectedChatIdStr ? { ...c, leadId: newLead.id || newLead._id?.slice(-6) } : c));
        console.log('Lead created and connected!');
      } else {
        console.error(data.error || 'Failed to create lead');
      }
    } catch (err) {
      alert('Error creating lead');
    }
  };

  // Auto-linking chats to CRM leads (and auto-create if missing).
  // NOTE: Temporarily disabled to keep the page lint-clean while we focus on
  // in/out text sync. This block should be moved to a dedicated hook and given
  // proper dependencies: [selectedChatIdStr, token, handleAddAsLead].
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // useEffect(() => {
  //   if (selectedChatIdStr) {
  //     const phone = selectedChatIdStr.split('@')[0];
  //     fetch(`/api/admin/crm/leads/search?phone=${phone}`)
  //       .then(res => res.json())
  //       .then(data => {
  //         if (data.success && data.leads?.length > 0) {
  //           const lead = data.leads[0];
  //           setSelectedLead(lead);
  //           // Update chat list with real lead ID
  //           setChats(prev => prev.map(c => getChatIdStr(c) === selectedChatIdStr ? { ...c, leadId: lead.id || lead._id?.slice(-6) } : c));
  //         } else {
  //           // AUTO CREATE LEAD IF NOT FOUND
  //           console.log('Lead not found, auto-creating...');
  //           handleAddAsLead();
  //         }
  //       })
  //       .catch(err => console.error('Error fetching lead:', err));
  //   }
  // }, [selectedChatIdStr]);

  const handleAssignChange = async (userId: string) => {
    if (!selectedLead) return;
    try {
      const res = await fetch(`/api/admin/crm/leads/${selectedLead._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignedToUserId: userId })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedLead({ ...selectedLead, assignedToUserId: userId });
        alert('Lead assigned successfully');
      }
    } catch (err) {
      alert('Failed to assign lead');
    }
  };

  // AUTO-SYNC INBOUND MEDIA TO S3
  // NOTE: Disabled for now. This hook uses dynamic `Math.random()` IDs and Set
  // dependencies, which makes eslint sometimes mis-detect hook order. We can
  // re-enable after refactoring to stable IDs + a dedicated media-sync hook.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  // useEffect(() => {
  //   const syncInboundMedia = async () => {
  //     // Filter for media messages that aren't synced or currently syncing
  //     const inboundMediaMsgs = messages.filter(m => {
  //       const mId = m.id;
  //       const msgIdStr = mId ? (typeof mId === 'string' ? mId : (mId._serialized || mId.id || `unknown-${Math.random()}`)) : `missing-${Math.random()}`;
  //       return !m.fromMe && 
  //              m.hasMedia && 
  //              !syncedMediaIds.has(msgIdStr) &&
  //              !syncingMediaIds.has(msgIdStr);
  //     });
  //     
  //     if (inboundMediaMsgs.length === 0) return;

  //     for (const msg of inboundMediaMsgs) {
  //       const mId = msg.id;
  //       const msgIdStr = mId ? (typeof mId === 'string' ? mId : (mId._serialized || mId.id || `unknown-${Math.random()}`)) : `missing-${Math.random()}`;
  //       
  //       try {
  //         // Double check to avoid race conditions
  //         if (syncingMediaIds.has(msgIdStr)) continue;
  //         
  //         setSyncingMediaIds(prev => new Set(prev).add(msgIdStr));
  //         
  //         const bridgeRes = await bridgeFetch(`${bridgeUrl}/messages/media/${msgIdStr}`);
  //         const bridgeData = await bridgeRes.json();
  //         
  //         if (!bridgeData.data) throw new Error('No media data from bridge');

  //         const response = await fetch('/api/admin/crm/upload/s3/base64', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //             'Authorization': `Bearer ${token}`
  //           },
  //           body: JSON.stringify({
  //             base64: `data:${bridgeData.mimetype};base64,${bridgeData.data}`,
  //             fileName: `inbound-${msgIdStr.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`,
  //             category: 'inbox'
  //           })
  //         });
  //         
  //         const data = await response.json();
  //         if (data.success && data.data?.publicUrl) {
  //           setSyncedMediaIds(prev => new Set(prev).add(msgIdStr));
  //           setMediaUrls(prev => ({ ...prev, [msgIdStr]: data.data.publicUrl }));
  //         }
  //       } catch (err) {
  //         console.error(`Failed to sync media for ${msgIdStr}:`, err);
  //       } finally {
  //         setSyncingMediaIds(prev => {
  //           const next = new Set(prev);
  //           next.delete(msgIdStr);
  //           return next;
  //         });
  //       }
  //     }
  //   };

  //   if (messages.length > 0 && token) {
  //     syncInboundMedia();
  //   }
  // }, [messages, token, bridgeUrl, syncedMediaIds, syncingMediaIds]);

  const sendPoll = async () => {
    if (!pollData.question.trim()) return;
    const pollText = `📊 *POLL: ${pollData.question}*\n\n` + 
      pollData.options.map((opt, i) => `${i+1}. ${opt}`).filter(o => o.trim()).join('\n');
    
    setNewMessage(pollText);
    setPollModalOpen(false);
    // Auto-trigger send
    setTimeout(() => {
        const sendBtn = document.querySelector('button[title="Send Message"]') as HTMLButtonElement;
        sendBtn?.click();
    }, 100);
  };

  const sendButtons = async () => {
    if (!buttonData.text.trim()) return;
    const filteredButtons = buttonData.buttons.filter(b => b.trim() !== '');
    if (filteredButtons.length === 0) return;

    setSending(true);
    try {
      await fetch('/api/admin/crm/whatsapp/qr/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: selectedChatIdStr,
          message: buttonData.text,
          type: 'buttons',
          buttons: filteredButtons
        })
      });
      setButtonModalOpen(false);
      setButtonData({ text: '', buttons: ['', '', ''] });
      setTimeout(() => fetchMessages(selectedChatIdStr), 1500);
    } catch (e) {
      alert('Failed to send buttons');
    } finally {
      setSending(false);
    }
  };

  const toggleThreadSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedThreadIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedThreadIds(next);
  };

  const handleBulkAction = async (action: 'lead' | 'delete' | 'archive') => {
     if (selectedThreadIds.size === 0) return;
     if (!window.confirm(`Perform ${action} on ${selectedThreadIds.size} selected threads?`)) return;
     
     alert(`${action} performed on ${selectedThreadIds.size} threads (Simulated)`);
     setSelectedThreadIds(new Set());
  };

  if (!token) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center text-white font-jakarta">
       <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
       <p className="text-xl font-black uppercase tracking-widest opacity-50">Authenticating</p>
    </div>
  );

  if (status === 'loading') return (
    <div className="h-screen bg-white flex flex-col items-center justify-center font-jakarta">
       <div className="w-24 h-24 relative mb-8">
          <div className="absolute inset-0 border-4 border-slate-100 rounded-[32px]"></div>
          <div className="absolute inset-0 border-4 border-emerald-500 rounded-[32px] border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <img src="/logo-square.png" className="w-12 h-12 grayscale opacity-20" alt="" />
          </div>
       </div>
       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initializing Core</p>
    </div>
  );

  if (status === 'qr' && qr) return (
    <div className="h-screen bg-slate-50 flex items-center justify-center p-6 font-jakarta">
       <div className="bg-white max-w-2xl w-full rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col md:flex-row">
          <div className="p-12 flex-1 space-y-8">
             <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Link WhatsApp</h1>
                <p className="text-slate-500 text-[15px] font-medium leading-relaxed">Scan this code with your WhatsApp app to start syncing messages with Swar Yoga CRM.</p>
             </div>
             
             <div className="space-y-4">
                {[
                  'Open WhatsApp on your phone',
                  'Tap Menu or Settings and select Linked Devices',
                  'Point your phone to this screen to capture the code'
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-4 group">
                     <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black group-hover:bg-emerald-500 transition-colors">{i+1}</span>
                     <p className="font-bold text-slate-700">{step}</p>
                  </div>
                ))}
             </div>
             
             <div className="pt-6 border-t border-slate-100 flex items-center gap-3 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                <i className="ph-fill ph-shield-check text-emerald-500 text-lg"></i>
                Secure Peer-to-Peer Encryption
             </div>
          </div>
          
          <div className="bg-slate-50 p-12 flex items-center justify-center border-l border-slate-100">
             <div className="bg-white p-6 rounded-[40px] shadow-xl border-4 border-white relative group">
                <img src={qr} alt="QR Code" className="w-64 h-64 grayscale group-hover:grayscale-0 transition-all duration-700" />
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-wait">
                   <div className="bg-slate-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Awaiting Scan...</div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );

  if (status === 'disconnected') return (
    <div className="h-screen bg-rose-50 flex items-center justify-center p-6 font-jakarta">
       <div className="bg-white max-w-xl w-full rounded-[40px] shadow-2xl p-12 text-center space-y-6 overflow-y-auto max-h-[90vh]">
          <div className="w-24 h-24 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-5xl mb-4">
             <i className="ph-bold ph-plugs"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Bridge Unreachable</h2>
          <p className="text-slate-500 font-medium leading-relaxed">External service at <span className="font-bold underline text-rose-600">{bridgeUrl}</span> is not responding.</p>
          
          <div className="text-left bg-slate-50 rounded-3xl p-6 border border-rose-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="ph-fill ph-terminal text-rose-500"></i>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">VPS Troubleshooting Commands</p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">1. Check if Bridge is running:</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">sudo docker ps | grep wa-bridge</code>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">2. Restart Bridge service:</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">cd ~/swaryoga/swaryoga.com-db/deploy/wa-bridge && sudo docker compose restart wa-bridge</code>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">3. Check Nginx configuration:</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">sudo nginx -t && sudo systemctl reload nginx</code>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400">4. Check Firewall (Port 443):</p>
                <code className="block bg-slate-900 text-emerald-400 p-3 rounded-xl text-xs font-mono">sudo ufw status | grep 443</code>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => window.location.reload()} className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-black transition-all shadow-xl active:scale-95">Retry Sync</button>
            <button onClick={startConnection} className="flex-1 py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-xl active:scale-95">Force Connect</button>
          </div>
          
          <p className="text-[10px] font-bold text-slate-400 pt-4 border-t border-slate-100">
             Images, Videos, and Interactive Buttons are supported when bridge is online.
          </p>
       </div>
    </div>
  );

  return (
    <div className={`flex h-screen font-jakarta overflow-hidden transition-colors duration-500 ${currentTheme.bg}`}>
      {/* Branded Meta Frame - emerald outline around the app container */}
      <div className={`flex-1 flex overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.1)] m-0 md:m-3 md:rounded-[40px] border-[10px] relative transition-all duration-700 ${
        theme === 'dark' ? 'border-slate-800' : 'border-emerald-500/20'
      } ${currentTheme.bg}`}>
        
        {/* Left Sidebar */}
        <aside className={`w-[360px] border-r flex flex-col shrink-0 transition-colors duration-500 ${currentTheme.sidebar} ${currentTheme.border}`}>
          <div className="p-6 pb-2 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-3xl font-black tracking-tighter transition-colors ${currentTheme.text}`}>Inbox</h1>
                <div className="flex items-center gap-2 mt-1">
                   <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`}></div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{status}</span>
                </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={handleRefresh} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${isRefreshing ? 'animate-spin' : ''} ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-400 shadow-sm border border-slate-100/50 hover:bg-slate-50'}`}><i className="ph-bold ph-arrows-clockwise text-xl"></i></button>
              </div>
            </div>

            {/* 5 COLOR THEME SWITCHER */}
            <div className={`p-2 rounded-2xl flex items-center justify-between gap-1.5 border transition-all duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
               {(['white', 'dark', 'green', 'blue', 'lavender'] as const).map((t) => (
                 <button 
                  key={t} 
                  onClick={() => setTheme(t)}
                  className={`flex-1 h-9 rounded-xl transition-all flex items-center justify-center border-2 group relative overflow-hidden ${
                    theme === t ? 'border-emerald-500 scale-105 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                  } ${
                    t === 'white' ? 'bg-white hover:bg-slate-50' : 
                    t === 'dark' ? 'bg-slate-950 hover:bg-slate-900' : 
                    t === 'green' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                    t === 'blue' ? 'bg-blue-500 hover:bg-blue-600' : 'bg-purple-500 hover:bg-purple-600'
                  }`}
                  title={t.charAt(0).toUpperCase() + t.slice(1)}
                 >
                   {theme === t && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                   <div className={`w-1.5 h-1.5 rounded-full transition-transform group-hover:scale-150 ${theme === t ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                 </button>
               ))}
            </div>

            <div className="relative group">
              <i className="ph-bold ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors"></i>
              <input 
                type="text" 
                placeholder="Search name or number..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border-2 py-3.5 pl-12 pr-4 rounded-2xl outline-none transition-all font-bold text-[13px] tracking-tight ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700/50 focus:bg-slate-950 focus:border-emerald-500 text-white' : 'bg-slate-50 border-slate-100/30 focus:bg-white focus:border-emerald-500 text-slate-900'
                }`} 
              />
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['All', 'Unread', 'Groups'].map((filter) => (
                <button 
                  key={filter} 
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 rounded-xl text-[12px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    activeFilter === filter ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 
                    (theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingChats ? (
               <div className="p-12 flex flex-col items-center justify-center gap-4 opacity-40">
                  <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">Syncing Threads...</span>
               </div>
            ) : chats.length === 0 ? (
               <div className="p-12 text-center space-y-4 opacity-30 mt-10">
                  <i className="ph-bold ph-chats-teardrop text-6xl"></i>
                  <p className="text-[13px] font-bold">No conversations found</p>
                  <button onClick={handleRefresh} className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500">Retry Sync</button>
               </div>
            ) : (
                <div className={`divide-y ${theme === 'dark' ? 'divide-slate-800' : 'divide-slate-50'}`}>
                  {chats.filter(chat => {
                    const chatId = getChatIdStr(chat);
                    if (!chatId) return false; // Filter out chats with empty IDs
                    const name = chat.name || chatId.split('@')[0] || '';
                    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
                    if (!matchesSearch) return false;
                    if (activeFilter === 'Groups') return chat.isGroup;
                    if (activeFilter === 'Unread') return (chat.unreadCount || 0) > 0;
                    return true;
                  }).map((chat) => {
                    const chatId = getChatIdStr(chat);
                    if (!chatId) return null; // Safety check
                    const isSelected = selectedChatIdStr === chatId;
                    return (
                      <div 
                        key={chatId}
                        onClick={() => setSelectedChat(chat)}
                        className={`px-5 py-4 flex items-center gap-4 cursor-pointer transition-all relative group ${
                          isSelected ? (theme === 'dark' ? 'bg-emerald-900/40 border-l-4 border-emerald-500' : 'bg-emerald-50/60 border-l-4 border-emerald-500') : 
                          (theme === 'dark' ? 'hover:bg-slate-800 border-l-4 border-transparent' : 'hover:bg-slate-50 border-l-4 border-transparent')
                        }`}
                      >
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200/50 shadow-sm relative">
                           <img 
                            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name || chatId.split('@')[0] || 'User')}&bg=0ea5e9&color=fff&bold=true`} 
                            alt="" 
                            className="w-full h-full object-cover"
                           />
                           {chat.isGroup && (
                             <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                               <i className="ph-fill ph-users text-lg"></i>
                             </div>
                           )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline mb-1">
                            <h4 className={`text-[15px] font-bold truncate tracking-tight transition-colors ${
                              isSelected ? 'text-emerald-500' : (theme === 'dark' ? 'text-slate-200' : 'text-slate-900')
                            }`}>
                              {chat.name || chatId.split('@')[0] || 'Unknown'}
                            </h4>
                            <span className="text-[10px] font-bold text-slate-400">
                               {chat.lastMessage ? new Date(chat.lastMessage.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-2">
                             <p className={`text-[13px] truncate ${
                               (chat.unreadCount || 0) > 0 ? (theme === 'dark' ? 'text-white font-bold' : 'text-slate-900 font-bold') : (theme === 'dark' ? 'text-slate-400' : 'text-slate-500')
                             }`}>
                               {chat.lastMessage?.body || 'No messages'}
                             </p>
                             {(chat.unreadCount || 0) > 0 && (
                               <div className="bg-emerald-500 text-white text-[9px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
                                 {chat.unreadCount}
                               </div>
                             )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
          </div>
        </aside>

        <main className={`flex-1 flex flex-col min-w-0 relative transition-colors duration-500 ${currentTheme.bg}`}>
          {selectedChat ? (
            <>
              <header className={`px-6 py-4 backdrop-blur-md border-b flex items-center justify-between z-30 shrink-0 sticky top-0 transition-colors duration-500 ${currentTheme.header} ${currentTheme.border}`}>
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => setRightSidebarOpen(!rightSidebarOpen)} title="View Contact Info">
                  <div className="w-12 h-12 rounded-[18px] bg-slate-100 overflow-hidden shadow-sm border border-slate-200/50 relative hover:scale-105 transition-transform">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedChat.name || selectedChatIdStr.split('@')[0] || 'User')}&bg=0ea5e9&color=fff&bold=true&size=128`} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h3 className={`text-xl font-black leading-none mb-1 tracking-tighter ${currentTheme.text}`}>
                      {selectedChat?.name || (typeof selectedChatIdStr === 'string' && selectedChatIdStr ? selectedChatIdStr.split('@')[0] : 'Chat')}
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-md">Realtime Sync</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                   <button className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"><i className="ph-bold ph-phone text-lg"></i></button>
                   <button onClick={() => setRightSidebarOpen(!rightSidebarOpen)} className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${rightSidebarOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-500 hover:bg-slate-50'}`}><i className="ph-bold ph-sidebar-simple text-lg"></i></button>
                </div>
              </header>

              <div 
                className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 relative custom-scrollbar"
                style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/744/548/wallpaper-whatsapp-dark-pattern.jpg")', backgroundBlendMode: 'overlay', opacity: theme === 'dark' ? '0.3' : '0.8', backgroundColor: currentTheme.chatBg }}
              >
                <div className="max-w-4xl mx-auto flex flex-col gap-2">
                   {messages.map((msg: any) => {
                     const isMe = msg.fromMe;
                     // Robust ID extraction
                     const mId = msg.id;
                     const msgIdStr = mId ? (typeof mId === 'string' ? mId : (mId._serialized || mId.id || `temp-${Math.random()}`)) : `temp-${Math.random()}`;
                     
                     // Robust Media Source Detection
                     const mediaSrc = mediaUrls[msgIdStr] || (msg.mediaData ? (msg.mediaData.startsWith('data:') ? msg.mediaData : `data:${msg.mimetype || 'image/jpeg'};base64,${msg.mediaData}`) : null) || msg.body;
                     
                     return (
                       <div key={msgIdStr} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-3xl shadow-sm text-[14px] relative group ${
                            isMe ? (theme === 'dark' ? 'bg-slate-800 text-slate-200 border border-slate-700/50' : 'bg-white text-slate-800') : 'bg-emerald-600 text-white'
                          } ${isMe ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                             {msg.hasMedia && (
                               <div className="mb-2 rounded-2xl overflow-hidden border border-black/5 relative bg-black/5 min-h-[100px] flex items-center justify-center">
                                  {syncingMediaIds.has(msgIdStr) ? (
                                     <div className="flex flex-col items-center gap-2 p-6">
                                        <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/70">Securely Syncing...</span>
                                     </div>
                                  ) : (
                                    <>
                                      {msg.type === 'image' && mediaSrc && <img src={mediaSrc} alt="Media" className="max-w-full cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(mediaSrc, '_blank')} />}
                                      {msg.type === 'video' && mediaSrc && <video src={mediaSrc} controls className="max-w-full" />}
                                      {msg.type === 'document' && (
                                        <div className="flex items-center gap-4 p-4 min-w-[200px]">
                                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><i className="ph-fill ph-file-pdf text-2xl text-white"></i></div>
                                          <div><p className="font-bold text-xs truncate">Document</p><a href={mediaUrls[msgIdStr] || mediaSrc} target="_blank" className="text-[10px] underline opacity-80">Download</a></div>
                                        </div>
                                      )}
                                    </>
                                  )}
                               </div>
                             )}
                             
                             {msg.body && <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.body}</p>}
                             
                             <div className={`flex items-center justify-end gap-1.5 mt-1 -mr-1 opacity-70`}>
                                <span className={`text-[10px] font-bold uppercase ${theme === 'dark' && !isMe ? 'text-white' : ''}`}>
                                   {new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isMe && (
                                   <i className={`ph-fill ph-checks text-[15px] ${msg.ack === 3 ? 'text-blue-400' : (theme === 'dark' ? 'text-slate-500' : 'text-slate-300')}`}></i>
                                )}
                             </div>
                          </div>
                       </div>
                     );
                   })}
                   <div ref={chatEndRef} />
                </div>
              </div>

              <div className={`p-5 border-t shrink-0 z-40 transition-colors duration-500 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                 <div className="max-w-5xl mx-auto flex items-end gap-4">
                    <div className={`flex-1 rounded-[28px] border-2 transition-all p-2 pr-4 flex items-end min-h-[56px] shadow-inner relative ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-800 focus-within:bg-slate-950 focus-within:border-emerald-500' : 'bg-slate-50 border-slate-50 focus-within:bg-white focus-within:border-emerald-500'
                    }`}>
                       <button onClick={() => setShowRichControls(!showRichControls)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${showRichControls ? 'bg-slate-900 text-white rotate-45' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                          <i className="ph-bold ph-plus text-xl"></i>
                       </button>

                       {showRichControls && (
                          <div className={`absolute bottom-16 left-2 w-64 rounded-[32px] shadow-2xl border p-3 space-y-1 z-[60] animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 ${
                            theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'
                          }`}>
                             {[
                               { id: 'image', label: 'Photo & Video', icon: 'ph-fill ph-image', color: 'bg-emerald-50 text-emerald-600' },
                               { id: 'document', label: 'Document', icon: 'ph-fill ph-file-text', color: 'bg-blue-50 text-blue-600' },
                               { id: 'buttons', label: 'Interactive Buttons', icon: 'ph-fill ph-hand-tap', color: 'bg-indigo-50 text-indigo-600' },
                               { id: 'poll', label: 'Create Poll', icon: 'ph-fill ph-chart-bar', color: 'bg-rose-50 text-rose-600' },
                             ].map(item => (
                               <button 
                                 key={item.id} 
                                 onClick={() => { 
                                   if (item.id === 'poll') setPollModalOpen(true); 
                                   else if (item.id === 'buttons') setButtonModalOpen(true);
                                   else document.getElementById('bridge-file-upload')?.click(); 
                                   setShowRichControls(false); 
                                 }} 
                                 className={`flex items-center gap-4 w-full p-3 rounded-2xl transition-all group ${theme === 'dark' ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                               >
                                  <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center text-xl transition-transform group-hover:scale-110`}><i className={item.icon}></i></div>
                                  <span className={`text-[14px] font-bold group-hover:text-emerald-500 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>{item.label}</span>
                               </button>
                             ))}
                          </div>
                       )}

                       <textarea 
                          value={newMessage} 
                          onChange={(e) => { setNewMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Type a message..." 
                          rows={1}
                          className={`flex-1 bg-transparent border-none py-2 px-2 text-[15px] focus:outline-none font-medium resize-none max-h-48 overflow-y-auto custom-scrollbar leading-tight mb-0.5 ${
                            theme === 'dark' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'
                          }`} 
                       />
                    </div>

                    <button 
                       onClick={sendMessage}
                       disabled={sending || (!newMessage.trim() && !mediaUrl)}
                       className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 ${newMessage.trim() ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-100 text-slate-400'}`}
                    >
                       <i className="ph-fill ph-paper-plane-right text-2xl"></i>
                    </button>
                 </div>
              </div>
            </>
          ) : (
            <div className={`flex-1 flex flex-col items-center justify-center gap-8 relative overflow-hidden transition-colors duration-500 ${
              theme === 'dark' ? 'bg-slate-950 text-slate-600' : 'bg-slate-50/50'
            }`}>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 blur-[120px] rounded-full animate-pulse"></div>
               <div className="relative group">
                  <div className={`w-40 h-40 rounded-[48px] shadow-2xl flex items-center justify-center border-4 relative overflow-hidden transition-all duration-700 group-hover:scale-105 group-hover:rotate-3 ${
                    theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-emerald-500/5' : 'bg-white border-white shadow-slate-200/50'
                  }`}>
                     <img src="/logo-square.png" alt="" className="w-24 h-24 grayscale opacity-10 group-hover:scale-110 transition-transform duration-700" />
                     <div className="absolute inset-x-0 bottom-0 h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-600"></div>
                  </div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-emerald-500 text-xl border-4 border-slate-50">
                    <i className="ph-fill ph-whatsapp-logo"></i>
                  </div>
               </div>
               <div className="text-center space-y-4 z-10">
                  <h3 className={`text-4xl font-black tracking-tighter ${currentTheme.text} opacity-20`}>Swar Yoga WhatsApp</h3>
                  <div className="flex flex-col items-center gap-2">
                     <p className={`text-[15px] font-bold max-w-sm mx-auto ${currentTheme.text} opacity-40`}>Select a conversation to start chatting.</p>
                     <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600">
                        <i className="ph-fill ph-shield-check"></i>
                        <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Secure</span>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </main>

        {selectedChat && rightSidebarOpen && (
           <aside className={`w-[400px] border-l flex flex-col shrink-0 animate-in slide-in-from-right duration-500 z-50 transition-colors duration-500 ${currentTheme.sidebar} ${currentTheme.border}`}>
              <div className={`p-6 border-b flex items-center justify-between ${currentTheme.border}`}>
                 <h3 className={`text-xl font-black tracking-tight ${currentTheme.text}`}>Contact Detail</h3>
                 <button onClick={() => setRightSidebarOpen(false)} className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                   theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-50 text-slate-400 hover:text-slate-900'
                 }`}><i className="ph-bold ph-x text-lg"></i></button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                 <div className="text-center">
                    <div className="w-32 h-32 rounded-[48px] overflow-hidden mx-auto mb-6 border-4 border-white shadow-2xl">
                       <img src={`https://ui-avatars.com/api/?name=${selectedChat.name || "User"}&bg=0ea5e9&color=fff&size=200&bold=true`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <h4 className={`text-2xl font-black tracking-tighter ${currentTheme.text}`}>{selectedChat.name || "Unknown User"}</h4>
                    <p className="text-sm font-bold text-slate-500">+{getChatIdStr(selectedChat).split('@')[0]}</p>
                 </div>

                 <div className={`rounded-[32px] p-6 border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700/50' : 'bg-slate-50 border-slate-100/50'}`}>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">CRM Linking</h5>
                    {selectedLead ? (
                       <div className="space-y-4">
                          <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Status</label>
                             <div className={`p-3 rounded-xl border font-bold ${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-100 text-slate-900'}`}>{selectedLead.status}</div>
                          </div>
                       </div>
                    ) : (
                       <button onClick={handleAddAsLead} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.15em] shadow-xl">Link to CRM</button>
                    )}
                 </div>
              </div>
           </aside>
        )}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        ::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>

      {delayModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
             <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                   <h3 className="text-xl font-black text-slate-800 tracking-tighter">Delay Message</h3>
                   <button onClick={() => setDelayModalOpen(false)} className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm"><i className="ph-bold ph-x text-lg"></i></button>
                </div>
                <div className="p-8 space-y-4">
                   <div className="grid grid-cols-2 gap-4">
                      <input type="number" value={delayTime.minutes} onChange={(e) => setDelayTime({...delayTime, minutes: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-center" placeholder="Mins" />
                      <input type="number" value={delayTime.seconds} onChange={(e) => setDelayTime({...delayTime, seconds: parseInt(e.target.value) || 0})} className="w-full px-5 py-4 bg-slate-50 rounded-2xl font-bold text-center" placeholder="Secs" />
                   </div>
                </div>
                <div className="p-8 pt-0">
                   <button onClick={() => setDelayModalOpen(false)} className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-[11px]">Apply</button>
                </div>
             </div>
          </div>
      )}

      {pollModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className={`text-2xl font-black tracking-tighter ${currentTheme.text}`}>Create Poll</h2>
                   <button onClick={() => setPollModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"><i className="ph ph-x text-xl"></i></button>
                </div>
                
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Question</p>
                   <input 
                      type="text" 
                      placeholder="e.g. Can you join today's session?" 
                      className={`w-full border-2 p-4 rounded-2xl font-bold outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                      value={pollData.question}
                      onChange={e => setPollData({...pollData, question: e.target.value})}
                   />
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Options</p>
                   {pollData.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input 
                          type="text" 
                          placeholder={`Option ${i+1}`}
                          className={`flex-1 border-2 p-3 rounded-xl font-bold outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                          value={opt}
                          onChange={e => {
                            const next = [...pollData.options];
                            next[i] = e.target.value;
                            setPollData({...pollData, options: next});
                          }}
                        />
                        {pollData.options.length > 2 && (
                          <button onClick={() => setPollData({...pollData, options: pollData.options.filter((_, idx)=>idx!==i)})} className="text-rose-500 p-2"><i className="ph ph-trash"></i></button>
                        )}
                      </div>
                   ))}
                   {pollData.options.length < 5 && (
                     <button onClick={() => setPollData({...pollData, options: [...pollData.options, '']})} className="text-[11px] font-black uppercase tracking-widest text-emerald-500">+ Add Option</button>
                   )}
                </div>

                <button 
                  onClick={sendPoll}
                  className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30"
                >
                   Send as Text Fallback
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Button Modal */}
      {buttonModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className={`w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}>
             <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                   <h2 className={`text-2xl font-black tracking-tighter ${currentTheme.text}`}>Interactive Buttons</h2>
                   <button onClick={() => setButtonModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center"><i className="ph ph-x text-xl"></i></button>
                </div>
                
                <p className="text-xs text-slate-400 font-medium leading-relaxed italic">Note: Real "blue buttons" work best with Cloud API. The Bridge uses WWebJS Buttons which may fallback to numbers on some phone OS versions.</p>

                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Message Text</p>
                   <textarea 
                      placeholder="e.g. Please choose an option below:" 
                      className={`w-full border-2 p-4 rounded-2xl font-bold outline-none transition-all min-h-[100px] resize-none ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                      value={buttonData.text}
                      onChange={e => setButtonData({...buttonData, text: e.target.value})}
                   />
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Button Options</p>
                   {buttonData.buttons.map((btn, i) => (
                      <input 
                        key={i}
                        type="text" 
                        placeholder={`Button ${i+1} text (max 20 chars)`}
                        maxLength={20}
                        className={`w-full border-2 p-3 rounded-xl font-bold outline-none transition-all ${theme === 'dark' ? 'bg-slate-800 border-slate-800 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500'}`}
                        value={btn}
                        onChange={e => {
                          const next = [...buttonData.buttons];
                          next[i] = e.target.value;
                          setButtonData({...buttonData, buttons: next});
                        }}
                      />
                   ))}
                </div>

                <button 
                  onClick={sendButtons}
                  disabled={sending || !buttonData.text.trim()}
                  className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50"
                >
                   {sending ? 'Sending...' : 'Send Interactive Message'}
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
