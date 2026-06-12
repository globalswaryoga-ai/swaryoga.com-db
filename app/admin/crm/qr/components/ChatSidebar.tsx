'use client';

import React from 'react';
import { Search, Plus, MessageCirclePlus, Users, Settings } from 'lucide-react';

interface ChatItem {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  isGroup?: boolean;
  unreadCount?: number;
  isSelected?: boolean;
  isMuted?: boolean;
  isOnline?: boolean;
  profilePic?: string;
}

interface ChatSidebarProps {
  chats: ChatItem[];
  selectedChat: string | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  connectedPhoneNumber?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  unreadCount?: number;
}

export default function ChatSidebar({
  chats,
  selectedChat,
  onSelectChat,
  onNewChat,
  onNewGroup,
  connectedPhoneNumber,
  searchQuery = '',
  onSearchChange,
  unreadCount = 0,
}: ChatSidebarProps) {
  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-sm font-semibold text-green-700">QR</span>
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">WhatsApp</h2>
              <p className="text-xs text-gray-500">{connectedPhoneNumber || 'Not connected'}</p>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, number, or message..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 py-3 border-b border-gray-100 flex gap-2 overflow-x-auto">
        <button className="px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded-full whitespace-nowrap hover:bg-green-100 transition">
          All ({chats.length})
        </button>
        <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full whitespace-nowrap transition">
          Unread ({unreadCount})
        </button>
        <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full whitespace-nowrap transition">
          Groups
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCirclePlus className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No chats yet</p>
          </div>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition text-left ${
                selectedChat === chat.id ? 'bg-gray-50 border-l-4 border-l-green-500' : ''
              }`}
            >
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {chat.profilePic ? (
                    <img
                      src={chat.profilePic}
                      alt={chat.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold text-sm">
                      {chat.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {chat.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                  {chat.unreadCount ? (
                    <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                    </div>
                  ) : null}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                    <span className="text-xs text-gray-500 flex-shrink-0">{chat.lastMessageTime}</span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{chat.lastMessage || 'No messages yet'}</p>
                </div>

                {/* Muted Icon */}
                {chat.isMuted && <div className="text-xs text-gray-400">🔕</div>}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="p-4 border-t border-gray-100 flex gap-2">
        <button
          onClick={onNewChat}
          className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={onNewGroup}
          className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium transition flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          Group
        </button>
      </div>
    </div>
  );
}
