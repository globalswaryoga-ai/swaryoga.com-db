'use client';

import React, { useState } from 'react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'promotion' | 'event' | 'urgent';
  createdAt: string;
  postedAt: string;
  author: string;
}

interface AnnouncementCreatorProps {
  onPublish?: (announcement: Announcement) => void;
  onSchedule?: (announcement: Announcement, scheduleTime: string) => void;
}

export default function AnnouncementCreator({
  onPublish,
  onSchedule,
}: AnnouncementCreatorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<'info' | 'promotion' | 'event' | 'urgent'>('info');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

  const members = [
    'all-members',
    'premium-members',
    'yoga-instructors',
    'community-leads',
    'new-members',
  ];

  const typeStyles = {
    info: 'bg-blue-100 text-blue-700 border-blue-300',
    promotion: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    event: 'bg-purple-100 text-purple-700 border-purple-300',
    urgent: 'bg-red-100 text-red-700 border-red-300',
  };

  const typeEmojis = {
    info: 'ℹ️',
    promotion: '🎉',
    event: '📅',
    urgent: '⚠️',
  };

  function handleAddMention(member: string) {
    if (!mentions.includes(member)) {
      setMentions([...mentions, member]);
      setContent(`${content}@${member} `);
    }
    setShowMentionSuggestions(false);
  }

  function handleRemoveMention(member: string) {
    setMentions(mentions.filter((m) => m !== member));
    const regex = new RegExp(`@${member}\\s+`, 'g');
    setContent(content.replace(regex, ''));
  }

  function handlePublish() {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    const announcement: Announcement = {
      id: Date.now().toString(),
      title,
      content,
      type,
      createdAt: new Date().toISOString(),
      postedAt: new Date().toISOString(),
      author: 'Admin',
    };

    if (isScheduled && scheduleTime) {
      onSchedule?.(announcement, scheduleTime);
      alert('Announcement scheduled successfully!');
    } else {
      onPublish?.(announcement);
      alert('Announcement published successfully!');
    }

    resetForm();
  }

  function resetForm() {
    setTitle('');
    setContent('');
    setType('info');
    setMentions([]);
    setAttachmentUrl('');
    setIsScheduled(false);
    setScheduleTime('');
  }

  const characterLimit = 2000;
  const charactersUsed = content.length;
  const charactersRemaining = characterLimit - charactersUsed;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Create Announcement</h2>
        <p className="text-sm text-gray-600">Share updates with your community members</p>
      </div>

      {/* Announcement Type */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Announcement Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {Object.entries(typeEmojis).map(([key, emoji]) => (
            <button
              key={key}
              onClick={() => setType(key as any)}
              className={`px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-all ${
                type === key ? `${typeStyles[key as keyof typeof typeStyles]} border-current` : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {emoji} {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., New Beginner Yoga Class Starting Soon!"
          maxLength={100}
          className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">{title.length}/100 characters</p>
      </div>

      {/* Content */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label htmlFor="content" className="block text-sm font-semibold text-gray-700">
            Content
          </label>
          <span className={`text-xs font-semibold ${charactersRemaining < 100 ? 'text-red-600' : 'text-gray-600'}`}>
            {charactersUsed}/{characterLimit}
          </span>
        </div>

        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your announcement here... Use @member-group to mention groups."
          maxLength={characterLimit}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent resize-none"
          rows={6}
        />

        {/* Character Progress Bar */}
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${charactersRemaining < 100 ? 'bg-red-500' : 'bg-yoga-600'}`}
            style={{ width: `${(charactersUsed / characterLimit) * 100}%` }}
          />
        </div>
      </div>

      {/* Mentions/Tags */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Tag Member Groups</label>
        <div className="relative">
          <button
            onClick={() => setShowMentionSuggestions(!showMentionSuggestions)}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-left bg-white hover:border-gray-300 flex justify-between items-center"
          >
            <span className="text-sm text-gray-600">@mention groups...</span>
            <span>{showMentionSuggestions ? '▲' : '▼'}</span>
          </button>

          {showMentionSuggestions && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg z-10 shadow-lg">
              {members.map((member) => (
                <button
                  key={member}
                  onClick={() => handleAddMention(member)}
                  disabled={mentions.includes(member)}
                  className={`block w-full text-left px-4 py-2 hover:bg-yoga-50 first:rounded-t-md last:rounded-b-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    mentions.includes(member) ? 'bg-yoga-100' : ''
                  }`}
                >
                  @{member}
                </button>
              ))}
            </div>
          )}
        </div>

        {mentions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {mentions.map((mention) => (
              <div key={mention} className="bg-yoga-100 text-yoga-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-2">
                @{mention}
                <button
                  onClick={() => handleRemoveMention(mention)}
                  className="text-yoga-900 hover:text-yoga-600 font-bold"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Attachment */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment (Optional)</label>
        <input
          type="url"
          value={attachmentUrl}
          onChange={(e) => setAttachmentUrl(e.target.value)}
          placeholder="Paste image/document URL"
          className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
        />
        {attachmentUrl && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-sm text-gray-600">
            📎 Attachment will be included: {attachmentUrl.substring(0, 50)}...
          </div>
        )}
      </div>

      {/* Scheduling */}
      <div className="p-3 bg-yoga-50 rounded-lg border-2 border-yoga-200">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isScheduled}
            onChange={(e) => setIsScheduled(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm font-semibold text-gray-700">Schedule for later</span>
        </label>

        {isScheduled && (
          <input
            type="datetime-local"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
            className="w-full mt-3 px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yoga-500 focus:border-transparent"
          />
        )}
      </div>

      {/* Preview */}
      <div className="p-4 bg-gray-100 rounded-lg border-2 border-gray-200">
        <p className="text-xs font-semibold text-gray-600 mb-2">Preview:</p>
        <div className={`p-4 rounded-lg ${typeStyles[type]} border-2 bg-opacity-50`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">{typeEmojis[type]}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">{title || 'Your Title Here'}</h3>
              <p className="text-sm mt-1 line-clamp-3">{content || 'Your content will appear here...'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handlePublish}
          disabled={!title.trim() || !content.trim()}
          className="flex-1 px-4 py-3 bg-yoga-600 hover:bg-yoga-700 text-white rounded-lg font-bold disabled:opacity-50 transition-colors"
        >
          {isScheduled ? '📅 Schedule Announcement' : '🚀 Publish Now'}
        </button>
        <button
          onClick={resetForm}
          className="px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-bold transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Tips */}
      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-1">💡 Pro Tips:</p>
        <ul className="text-xs space-y-1 list-disc list-inside">
          <li>Use mentions to ensure specific groups see important updates</li>
          <li>Schedule announcements during peak community hours</li>
          <li>Keep titles clear and action-oriented</li>
          <li>Add links or attachments for reference materials</li>
        </ul>
      </div>
    </div>
  );
}
