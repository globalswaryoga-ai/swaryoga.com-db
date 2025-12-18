'use client';

import React, { useState } from 'react';

interface FunnelOpportunity {
  id: string;
  name: string;
  stage: 'lead' | 'prospect' | 'customer' | 'lost';
  value: number;
  notes: string;
  priority: 'high' | 'medium' | 'low';
  daysInStage: number;
}

interface FunnelTrackerProps {
  opportunities?: FunnelOpportunity[];
  onMoveStage?: (opportunityId: string, newStage: string) => void;
  onAddNote?: (opportunityId: string, note: string) => void;
  onUpdatePriority?: (opportunityId: string, priority: string) => void;
}

export default function FunnelTracker({
  opportunities = [
    { id: '1', name: 'Priya Singh', stage: 'lead', value: 49.99, notes: 'Interested in prenatal yoga', priority: 'high', daysInStage: 3 },
    { id: '2', name: 'Rajesh Kumar', stage: 'customer', value: 299.99, notes: 'Active subscriber, VIP member', priority: 'medium', daysInStage: 45 },
    { id: '3', name: 'Anjali Sharma', stage: 'prospect', value: 99.99, notes: 'Requested demo, awaiting response', priority: 'high', daysInStage: 7 },
    { id: '4', name: 'Marcus Johnson', stage: 'prospect', value: 149.99, notes: 'Corporate wellness inquiry', priority: 'medium', daysInStage: 12 },
    { id: '5', name: 'Sara Chen', stage: 'customer', value: 599.99, notes: 'Premium package, high engagement', priority: 'low', daysInStage: 90 },
    { id: '6', name: 'David Patel', stage: 'lead', value: 0, notes: 'Clicked ad, no engagement yet', priority: 'low', daysInStage: 1 },
  ],
  onMoveStage,
  onAddNote,
  onUpdatePriority,
}: FunnelTrackerProps) {
  const [selectedOpp, setSelectedOpp] = useState<FunnelOpportunity | null>(null);
  const [newNote, setNewNote] = useState('');
  const [draggedOpp, setDraggedOpp] = useState<FunnelOpportunity | null>(null);

  const stages = [
    { id: 'lead', label: '🎯 Leads', color: 'bg-blue-100', borderColor: 'border-blue-300' },
    { id: 'prospect', label: '💼 Prospects', color: 'bg-yellow-100', borderColor: 'border-yellow-300' },
    { id: 'customer', label: '✅ Customers', color: 'bg-green-100', borderColor: 'border-green-300' },
    { id: 'lost', label: '❌ Lost', color: 'bg-gray-100', borderColor: 'border-gray-300' },
  ];

  const priorityColor: Record<string, string> = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  function handleMoveStage(opp: FunnelOpportunity, newStage: string) {
    onMoveStage?.(opp.id, newStage);
    setDraggedOpp(null);
  }

  function handleAddNote() {
    if (!selectedOpp || !newNote.trim()) return;
    onAddNote?.(selectedOpp.id, newNote);
    setNewNote('');
  }

  const stageStats = stages.map((stage) => {
    const oppsInStage = opportunities.filter((o) => o.stage === stage.id);
    const totalValue = oppsInStage.reduce((sum, o) => sum + o.value, 0);
    return { ...stage, count: oppsInStage.length, value: totalValue, opportunities: oppsInStage };
  });

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-900">Sales Funnel</h2>
        <div className="text-sm text-gray-600">
          Total Value: <span className="font-bold text-yoga-600">${stageStats.reduce((sum, s) => sum + s.value, 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Funnel Stages */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 flex-1">
        {stageStats.map((stage) => (
          <div
            key={stage.id}
            className={`${stage.color} border-2 ${stage.borderColor} rounded-lg p-3 min-h-[300px] flex flex-col`}
          >
            {/* Stage Header */}
            <div className="mb-3">
              <h3 className="font-bold text-gray-900 text-sm">{stage.label}</h3>
              <div className="flex justify-between items-center mt-1">
                <span className="text-2xl font-bold text-gray-700">{stage.count}</span>
                <span className="text-xs font-semibold text-gray-600">${stage.value.toFixed(0)}</span>
              </div>
            </div>

            {/* Opportunities */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {stage.opportunities.map((opp) => (
                <div
                  key={opp.id}
                  draggable
                  onDragStart={() => setDraggedOpp(opp)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleMoveStage(opp, stage.id)}
                  onClick={() => setSelectedOpp(opp)}
                  className={`p-2 bg-white rounded border-l-4 cursor-move hover:shadow-md transition-all ${
                    selectedOpp?.id === opp.id ? 'ring-2 ring-yoga-500' : ''
                  } ${
                    opp.priority === 'high'
                      ? 'border-l-red-500'
                      : opp.priority === 'medium'
                      ? 'border-l-yellow-500'
                      : 'border-l-green-500'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{opp.name}</p>
                      <p className="text-xs text-gray-600 line-clamp-1">{opp.notes}</p>
                    </div>
                    <span className={`${priorityColor[opp.priority]} text-white text-xs px-2 py-1 rounded-full whitespace-nowrap`}>
                      {opp.priority}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs font-bold text-yoga-600">${opp.value.toFixed(2)}</span>
                    <span className="text-xs text-gray-500">{opp.daysInStage}d</span>
                  </div>
                </div>
              ))}

              {stage.opportunities.length === 0 && (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No opportunities
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Details Panel */}
      {selectedOpp && (
        <div className="p-4 bg-yoga-50 rounded-lg border-2 border-yoga-200">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedOpp.name}</h3>
              <p className="text-sm text-gray-600">${selectedOpp.value.toFixed(2)}</p>
            </div>
            <button onClick={() => setSelectedOpp(null)} className="text-xl hover:scale-110">
              ✕
            </button>
          </div>

          {/* Stage & Priority */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Current Stage:</label>
              <select
                value={selectedOpp.stage}
                onChange={(e) => {
                  handleMoveStage(selectedOpp, e.target.value);
                  setSelectedOpp({ ...selectedOpp, stage: e.target.value as any });
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yoga-500"
              >
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Priority:</label>
              <select
                value={selectedOpp.priority}
                onChange={(e) => {
                  onUpdatePriority?.(selectedOpp.id, e.target.value);
                  setSelectedOpp({ ...selectedOpp, priority: e.target.value as any });
                }}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yoga-500"
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-2">Add Note:</label>
            <div className="flex gap-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Follow-up action, next steps..."
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-yoga-500 resize-none"
                rows={2}
              />
              <button
                onClick={handleAddNote}
                className="px-3 py-1 bg-yoga-600 hover:bg-yoga-700 text-white rounded font-semibold text-sm whitespace-nowrap"
              >
                Add
              </button>
            </div>
            {selectedOpp.notes && (
              <div className="mt-2 p-2 bg-white rounded text-sm text-gray-700">
                <p className="font-semibold text-xs text-gray-600 mb-1">Current Notes:</p>
                <p>{selectedOpp.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {stageStats.map((stage) => (
          <div key={stage.id} className={`${stage.color} p-2 rounded`}>
            <p className="text-xs font-semibold text-gray-700">{stage.count} {stage.label.split(' ')[1]}</p>
            <p className="text-lg font-bold text-yoga-600">${(stage.value / 1000).toFixed(1)}k</p>
          </div>
        ))}
      </div>
    </div>
  );
}
