'use client';

import React, { useState } from 'react';

interface Label {
  id: string;
  name: string;
  color: string;
  count: number;
}

interface LabelManagerProps {
  conversationId?: string;
  currentLabels?: string[];
  onLabelAdd?: (conversationId: string, label: string) => void;
  onLabelRemove?: (conversationId: string, label: string) => void;
  onLabelCreate?: (label: Label) => void;
}

export default function LabelManager({
  conversationId,
  currentLabels = [],
  onLabelAdd,
  onLabelRemove,
  onLabelCreate,
}: LabelManagerProps) {
  const [labels, setLabels] = useState<Label[]>([
    { id: '1', name: 'yoga-interest', color: 'bg-purple-500', count: 8 },
    { id: '2', name: 'customer', color: 'bg-green-500', count: 15 },
    { id: '3', name: 'vip', color: 'bg-amber-500', count: 3 },
    { id: '4', name: 'demo-requested', color: 'bg-blue-500', count: 5 },
    { id: '5', name: 'follow-up-needed', color: 'bg-red-500', count: 12 },
  ]);

  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('bg-indigo-500');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterLabel, setFilterLabel] = useState('');

  const colors = [
    'bg-purple-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-blue-500',
    'bg-red-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-orange-500',
  ];

  function handleCreateLabel() {
    if (!newLabelName.trim()) return;

    const newLabel: Label = {
      id: Date.now().toString(),
      name: newLabelName.toLowerCase().replace(/\s+/g, '-'),
      color: newLabelColor,
      count: 0,
    };

    setLabels([...labels, newLabel]);
    onLabelCreate?.(newLabel);
    setNewLabelName('');
    setNewLabelColor('bg-indigo-500');
    setShowCreateForm(false);
  }

  function handleAddLabel(label: string) {
    if (conversationId) {
      onLabelAdd?.(conversationId, label);
    }
  }

  function handleRemoveLabel(label: string) {
    if (conversationId) {
      onLabelRemove?.(conversationId, label);
    }
  }

  function handleBulkLabelConversations(label: string) {
    // Placeholder for bulk operation
    alert(`Bulk apply "${label}" label - implement with API`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">Labels</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="text-2xl hover:scale-110"
        >
          ➕
        </button>
      </div>

      {/* Create New Label Form */}
      {showCreateForm && (
        <div className="p-3 bg-gray-100 rounded-lg space-y-2">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name (e.g., 'urgent-follow-up')"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yoga-500"
          />

          <div className="flex gap-1 flex-wrap">
            {colors.map((color) => (
              <button
                key={color}
                onClick={() => setNewLabelColor(color)}
                className={`w-8 h-8 rounded-full ${color} ${
                  newLabelColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCreateLabel}
              className="flex-1 px-3 py-1 bg-yoga-600 hover:bg-yoga-700 text-white rounded text-sm font-semibold"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter by Label */}
      <div>
        <label className="text-xs font-semibold text-gray-600 mb-2 block">Filter:</label>
        <select
          value={filterLabel}
          onChange={(e) => setFilterLabel(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yoga-500"
        >
          <option value="">Show all conversations</option>
          {labels.map((label) => (
            <option key={label.id} value={label.name}>
              {label.name} ({label.count})
            </option>
          ))}
        </select>
      </div>

      {/* Labels List */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-600">Available Labels:</p>
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className={`${label.color} px-3 py-1 rounded-full text-white text-sm font-semibold flex items-center gap-2 group hover:opacity-90 cursor-pointer`}
            >
              <span className="flex-1">{label.name}</span>
              <span className="text-xs bg-black bg-opacity-20 px-2 py-0.5 rounded-full">
                {label.count}
              </span>
              <button
                onClick={() => handleBulkLabelConversations(label.name)}
                className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                title="Apply to filtered conversations"
              >
                ⚙️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Labels for Current Conversation */}
      {conversationId && currentLabels.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">This Conversation:</p>
          <div className="space-y-2">
            {currentLabels.map((labelName) => {
              const label = labels.find((l) => l.name === labelName);
              return (
                <div
                  key={labelName}
                  className={`${label?.color || 'bg-gray-500'} px-3 py-1 rounded-full text-white text-sm font-semibold flex items-center justify-between`}
                >
                  <span>{labelName}</span>
                  <button
                    onClick={() => handleRemoveLabel(labelName)}
                    className="text-xs opacity-70 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add More Labels */}
          <div className="mt-3">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddLabel(e.target.value);
                  e.target.value = '';
                }
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yoga-500"
            >
              <option value="">Add label...</option>
              {labels
                .filter((l) => !currentLabels.includes(l.name))
                .map((label) => (
                  <option key={label.id} value={label.name}>
                    + {label.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      )}

      {/* Label Statistics */}
      <div className="mt-4 p-3 bg-yoga-50 rounded-lg">
        <p className="text-xs font-semibold text-yoga-700 mb-2">Statistics:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded">
            <p className="text-gray-600">Total Labels</p>
            <p className="text-lg font-bold text-yoga-600">{labels.length}</p>
          </div>
          <div className="bg-white p-2 rounded">
            <p className="text-gray-600">Total Tagged</p>
            <p className="text-lg font-bold text-yoga-600">{labels.reduce((sum, l) => sum + l.count, 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
