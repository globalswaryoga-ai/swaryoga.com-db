'use client';

import React, { useState, useEffect } from 'react';

interface Conversation {
  id: string;
  contactName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  labels: string[];
  status: 'lead' | 'prospect' | 'customer' | 'inactive';
  avatar?: string;
}

interface ChatListProps {
  selectedId?: string;
  onSelect: (conversationId: string) => void;
  onAddLabel?: (conversationId: string, label: string) => void;
  filterLabel?: string;
}

export default function ChatList({
  selectedId,
  onSelect,
  onAddLabel,
  filterLabel,
}: ChatListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      contactName: 'Priya Singh',
      lastMessage: 'I want to enroll in yoga classes...',
      lastMessageTime: '2 min ago',
      unreadCount: 3,
      labels: ['yoga-interest'],
      status: 'lead',
    },
    {
      id: '2',
      contactName: 'Rajesh Kumar',
      lastMessage: 'Thank you for the course link!',
      lastMessageTime: '1 hour ago',
      unreadCount: 0,
      labels: ['customer', 'vip'],
      status: 'customer',
    },
    {
      id: '3',
      contactName: 'Anjali Sharma',
      lastMessage: 'Can I get a demo?',
      lastMessageTime: '5 hours ago',
      unreadCount: 1,
      labels: ['demo-requested'],
      status: 'prospect',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'unread' | 'name'>('recent');

  const filteredConversations = conversations
    .filter((conv) => {
      if (filterLabel && !conv.labels.includes(filterLabel)) return false;
      if (searchQuery && !conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'unread') return b.unreadCount - a.unreadCount;
      if (sortBy === 'name') return a.contactName.localeCompare(b.contactName);
      return 0; // recent
    });

  const statusColor: Record<string, string> = {
    lead: 'bg-blue-100 text-blue-700',
    prospect: 'bg-yellow-100 text-yellow-700',
    customer: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
  };

  const statusEmoji: Record<string, string> = {
    lead: '🎯',
    prospect: '💼',
    customer: '✅',
    inactive: '❌',
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-4">💬 Messages</h2>

        {/* Search */}
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent text-sm"
        />
      </div>

      {/* Sort Options */}
      <div className="px-4 pt-4 pb-2 flex gap-2 border-b border-gray-200">
        {(['recent', 'unread', 'name'] as const).map((option) => (
          <button
            key={option}
            onClick={() => setSortBy(option)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              sortBy === option
                ? 'bg-yoga-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option === 'recent' && '🕐'}
            {option === 'unread' && '🔔'}
            {option === 'name' && '🔤'}
            {option.charAt(0).toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm">No conversations</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedId === conv.id ? 'bg-yoga-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yoga-400 to-yoga-600 flex items-center justify-center text-white font-bold">
                    {conv.contactName.charAt(0)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-gray-900 truncate">{conv.contactName}</h3>
                    <span className="text-xs text-gray-500 ml-2">{conv.lastMessageTime}</span>
                  </div>

                  <p className="text-sm text-gray-600 truncate mb-2">{conv.lastMessage}</p>

                  {/* Labels & Status */}
                  <div className="flex gap-1 flex-wrap items-center">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        statusColor[conv.status]
                      }`}
                    >
                      {statusEmoji[conv.status]} {conv.status.charAt(0).toUpperCase() + conv.status.slice(1)}
                    </span>
                    {conv.labels.map((label, idx) => (
                      <span key={idx} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {label}
                      </span>
                    ))}
                    {conv.unreadCount > 0 && (
                      <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full w-6 h-6 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
        <p>Total: {filteredConversations.length} conversations</p>
      </div>
    </div>
  );
}
