'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Loader } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'contact';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatWindowProps {
  contactName: string;
  contactPhone?: string;
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
  onSendMessage?: (message: string) => void;
  onStatusChange?: (newStatus: string) => void;
  phoneNumber?: string;
}

export default function ChatWindow({
  contactName,
  contactPhone,
  status,
  onSendMessage,
  onStatusChange,
  phoneNumber,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const templates = [
    '👋 Hey! Thanks for reaching out. Tell me about your interest.',
    '🧘 Check out our beginner yoga course - perfect for you!',
    '📅 Would you like to schedule a demo session?',
    '✅ Great! I\'m enrolling you now. Check your email.',
    '💝 Special offer: Get 20% off today! Limited time.',
  ];

  // Fetch messages from database
  useEffect(() => {
    const fetchMessages = async () => {
      const phone = phoneNumber || contactPhone?.replace(/\D/g, '');
      if (!phone) return;

      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phone)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });

        if (!response.ok) {
          console.error(`Failed to fetch messages: ${response.statusText}`);
          setMessages([]);
          return;
        }

        const data = await response.json();

        if (data.success && data.messages && Array.isArray(data.messages)) {
          // Sort messages by date (ascending - oldest first)
          const sorted = [...data.messages].sort((a: any, b: any) => 
            new Date(a.sentAt || a.createdAt).getTime() - new Date(b.sentAt || b.createdAt).getTime()
          );

          const formattedMessages: Message[] = sorted.map((msg: any) => ({
            id: msg._id?.toString() || msg.waMessageId || Date.now().toString(),
            text: msg.messageContent || '',
            sender: msg.direction === 'inbound' ? 'contact' : 'user',
            timestamp: new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            status: (msg.status || 'delivered') as 'sent' | 'delivered' | 'read',
          }));

          setMessages(formattedMessages);
        }
      } catch (err) {
        console.error('Error fetching messages:', err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [phoneNumber, contactPhone]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSendMessage() {
    if (!messageInput.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageInput,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessages([...messages, newMessage]);
    onSendMessage?.(messageInput);
    setMessageInput('');
  }

  function handleTemplateSelect() {
    if (!selectedTemplate) return;
    setMessageInput(selectedTemplate);
    setSelectedTemplate('');
  }

  const statusColor: Record<string, string> = {
    lead: 'bg-blue-100 text-blue-700',
    prospect: 'bg-yellow-100 text-yellow-700',
    customer: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-yoga-50 to-white">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{contactName}</h2>
            {contactPhone && <p className="text-sm text-gray-600">{contactPhone}</p>}
          </div>
          <button className="text-2xl hover:scale-110">⋮</button>
        </div>

        {/* Status Selector */}
        <div className="flex gap-2 items-center">
          <span className="text-xs font-semibold text-gray-600">Status:</span>
          <select
            value={status}
            onChange={(e) => onStatusChange?.(e.target.value)}
            className={`text-xs px-3 py-1 rounded-full font-semibold cursor-pointer ${statusColor[status]}`}
          >
            <option value="lead">🎯 Lead</option>
            <option value="prospect">💼 Prospect</option>
            <option value="customer">✅ Customer</option>
            <option value="inactive">❌ Inactive</option>
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <Loader className="w-6 h-6 animate-spin text-yoga-600" />
              <p className="text-sm text-gray-500">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 text-sm">No messages yet</p>
              <p className="text-gray-400 text-xs mt-1">Messages will appear here when received</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  msg.sender === 'user'
                    ? 'bg-yoga-600 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm break-words">{msg.text}</p>
                <div className="flex items-center gap-1 mt-1 justify-end">
                  <p className="text-xs opacity-70">{msg.timestamp}</p>
                  {msg.sender === 'user' && (
                    <span className="text-xs ml-1">
                      {msg.status === 'sent' && '✓'}
                      {msg.status === 'delivered' && '✓✓'}
                      {msg.status === 'read' && '✓✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {/* Template Selector */}
        <div className="mb-3">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
          >
            <option value="">Quick templates...</option>
            {templates.map((template, idx) => (
              <option key={idx} value={template}>
                {template.substring(0, 40)}...
              </option>
            ))}
          </select>
          {selectedTemplate && (
            <button
              onClick={handleTemplateSelect}
              className="w-full mt-2 bg-yoga-100 hover:bg-yoga-200 text-yoga-700 px-3 py-1 rounded text-sm font-semibold"
            >
              Use Template
            </button>
          )}
        </div>

        {/* Input Field */}
        <div className="flex gap-2">
          <textarea
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message... (Shift+Enter for new line)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent resize-none text-sm"
            rows={3}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            className="self-end px-4 py-2 bg-yoga-600 hover:bg-yoga-700 text-white rounded-lg font-semibold disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>

        {/* Message Counter */}
        <p className="text-xs text-gray-500 mt-2">
          {messageInput.length}/1000 characters • WhatsApp 24h window tracking enabled
        </p>
      </div>
    </div>
  );
}
