'use client';

import React, { useState } from 'react';
import { Phone, Video, Info, Search, MoreVertical, Smile, Paperclip, Send } from 'lucide-react';

interface ChatAreaProps {
  selectedChatName?: string;
  isOnline?: boolean;
  isTyping?: boolean;
  messages?: any[];
  onSendMessage?: (text: string) => void;
  profilePic?: string;
}

export default function ChatArea({
  selectedChatName,
  isOnline,
  isTyping,
  messages = [],
  onSendMessage,
  profilePic,
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage?.(inputValue);
      setInputValue('');
    }
  };

  if (!selectedChatName) {
    return (
      <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center">
        <div className="text-gray-400 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-600">Select a chat to start messaging</p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white flex flex-col">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          {profilePic ? (
            <img
              src={profilePic}
              alt={selectedChatName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-semibold">
              {selectedChatName.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{selectedChatName}</h2>
            <p className="text-xs text-gray-500">
              {isTyping ? '🔴 typing...' : isOnline ? '🟢 Online' : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Phone className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Video className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Search className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <Info className="w-5 h-5 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-b from-gray-50 to-white space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.fromMe
                    ? 'bg-green-100 text-gray-900 rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.text || msg.body}</p>
                <p className="text-xs mt-1 opacity-70">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-gray-200 bg-white">
        <div className="flex items-end gap-3">
          <button className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
            <Smile className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleSend}
            className="p-2 hover:bg-green-50 rounded-full transition text-green-600 disabled:text-gray-300"
            disabled={!inputValue.trim()}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
