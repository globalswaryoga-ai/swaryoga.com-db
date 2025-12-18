'use client';

import React, { useState, useRef, useEffect } from 'react';

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
  onSendMessage?: (message: string, templates?: string[]) => void;
  onStatusChange?: (newStatus: string) => void;
}

export default function ChatWindow({
  contactName,
  contactPhone,
  status,
  onSendMessage,
  onStatusChange,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hi! I saw your yoga course...', sender: 'contact', timestamp: '10:30 AM', status: 'read' },
    { id: '2', text: 'Would love to know more about the prenatal yoga class', sender: 'contact', timestamp: '10:32 AM', status: 'read' },
    { id: '3', text: 'Sure! We have a great beginner-friendly program 🧘', sender: 'user', timestamp: '10:35 AM', status: 'read' },
    { id: '4', text: 'Can I try a free demo session?', sender: 'contact', timestamp: '10:36 AM', status: 'read' },
  ]);

  const [messageInput, setMessageInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const templates = [
    '👋 Hey! Thanks for reaching out. Tell me about your interest.',
    '🧘 Check out our beginner yoga course - perfect for you!',
    '📅 Would you like to schedule a demo session?',
    '✅ Great! I\'m enrolling you now. Check your email.',
    '💝 Special offer: Get 20% off today! Limited time.',
  ];

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
        {messages.map((msg) => (
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
              <p className="text-sm">{msg.text}</p>
              <div className="flex items-center gap-1 mt-1">
                <p className="text-xs opacity-70">{msg.timestamp}</p>
                {msg.sender === 'user' && (
                  <span className="text-xs">
                    {msg.status === 'sent' && '✓'}
                    {msg.status === 'delivered' && '✓✓'}
                    {msg.status === 'read' && '✓✓'}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
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
