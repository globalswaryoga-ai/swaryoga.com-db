'use client';

import { useState } from 'react';
import { ActionPlan, ActionPlanGoal, Milestone, Vision, VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import GoalSection from '@/components/GoalSection';

interface ActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actionPlan: ActionPlan) => void;
  visions: Vision[];
  editingPlan?: ActionPlan;
}

export default function ActionPlanModal({
  isOpen,
  onClose,
  onSave,
  visions,
  editingPlan,
}: ActionPlanModalProps) {
  const [selectedVisionId, setSelectedVisionId] = useState(editingPlan?.visionId || '');
  const [selectedVisionHead, setSelectedVisionHead] = useState('');
  const [title, setTitle] = useState(editingPlan?.title || '');
  const [description, setDescription] = useState(editingPlan?.description || '');
  const [startDate, setStartDate] = useState(editingPlan?.startDate || '');
  const [endDate, setEndDate] = useState(editingPlan?.endDate || '');
  const [workingHoursStart, setWorkingHoursStart] = useState(
    editingPlan?.workingHoursStart || '09:00'
  );
  const [workingHoursEnd, setWorkingHoursEnd] = useState(
    editingPlan?.workingHoursEnd || '17:00'
  );
  const [place, setPlace] = useState(editingPlan?.place || '');
  const [expectedAmount, setExpectedAmount] = useState(editingPlan?.expectedAmount || 0);
  const [milestones, setMilestones] = useState<Milestone[]>(editingPlan?.milestones || []);
  const [goals, setGoals] = useState<ActionPlanGoal[]>(editingPlan?.goals || []);

  const selectedVision = visions.find(v => v.id === selectedVisionId);
  
  // Filter visions by selected head
  const visionsUnderHead = selectedVisionHead
    ? visions.filter(v => v.category === selectedVisionHead)
    : [];

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      workingHoursStart: '09:00',
      workingHoursEnd: '17:00',
      place: '',
      status: 'not-started',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMilestones([...milestones, newMilestone]);
  };

  const handleUpdateMilestone = (id: string, updatedMilestone: Milestone) => {
    setMilestones(milestones.map(m => (m.id === id ? updatedMilestone : m)));
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id));
  };

  const handleAddGoal = () => {
    const newGoal: ActionPlanGoal = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      workingTimeStart: '09:00',
      workingTimeEnd: '17:00',
      place: '',
      expectedAmount: 0,
      status: 'not-started',
      priority: 'medium',
      progress: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setGoals([...goals, newGoal]);
  };

  const handleUpdateGoal = (id: string, updatedGoal: ActionPlanGoal) => {
    setGoals(goals.map(g => (g.id === id ? updatedGoal : g)));
  };

  const handleDeleteGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const handleSave = () => {
    if (!selectedVisionId || !title || !place || !startDate || !endDate) {
      alert('Please fill in all required fields');
      return;
    }

    const actionPlan: ActionPlan = {
      id: editingPlan?.id || Date.now().toString(),
      visionId: selectedVisionId,
      title,
      description,
      imageUrl: selectedVision?.imageUrl || selectedVision?.categoryImageUrl,
      startDate,
      endDate,
      workingHoursStart,
      workingHoursEnd,
      place,
      expectedAmount: expectedAmount || undefined,
      milestones,
      goals,
      status: editingPlan?.status || 'not-started',
      progress: editingPlan?.progress || 0,
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(actionPlan);
    resetForm();
  };

  const resetForm = () => {
    setSelectedVisionId('');
    setSelectedVisionHead('');
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setWorkingHoursStart('09:00');
    setWorkingHoursEnd('17:00');
    setPlace('');
    setExpectedAmount(0);
    setMilestones([]);
    setGoals([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {editingPlan ? 'Edit Action Plan' : 'Create Action Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl font-bold hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Vision Head Selection - First Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Vision Plan Head *
            </label>
            <select
              value={selectedVisionHead}
              onChange={e => {
                setSelectedVisionHead(e.target.value);
                setSelectedVisionId(''); // Reset vision when head changes
              }}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Choose a vision head...</option>
              {VISION_CATEGORIES.map(head => (
                <option key={head} value={head}>
                  {head}
                </option>
              ))}
            </select>
          </div>

          {/* Vision Selection - Second Level */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Vision Plan *
            </label>
            {selectedVisionHead ? (
              <select
                value={selectedVisionId}
                onChange={e => setSelectedVisionId(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Choose a vision...</option>
                {visionsUnderHead.map(vision => (
                  <option key={vision.id} value={vision.id}>
                    {vision.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 italic">Please select a vision head first</p>
            )}
          </div>

          {/* Vision Image Preview */}
          {selectedVision && (
            <div className="flex justify-center">
              <img
                src={selectedVision.imageUrl || selectedVision.categoryImageUrl || '/placeholder.png'}
                alt={selectedVision.title}
                className="w-full h-64 object-cover rounded-lg border-2 border-gray-300"
              />
            </div>
          )}

          {/* Action Plan Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Action Plan Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Q1 Fitness Challenge"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your action plan..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Working Hours Start
              </label>
              <input
                type="time"
                value={workingHoursStart}
                onChange={e => setWorkingHoursStart(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Working Hours End
              </label>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={e => setWorkingHoursEnd(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Place */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Working Place *
            </label>
            <input
              type="text"
              value={place}
              onChange={e => setPlace(e.target.value)}
              placeholder="e.g., Home Gym, Office, Studio"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Expected Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Expected Amount (Rs.)
            </label>
            <input
              type="number"
              value={expectedAmount}
              onChange={e => setExpectedAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Milestones Section */}
          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Milestones</h3>
              <button
                onClick={handleAddMilestone}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                + Add Milestone
              </button>
            </div>

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <MilestoneCard
                  key={milestone.id}
                  milestone={milestone}
                  index={index}
                  onUpdate={handleUpdateMilestone}
                  onDelete={handleDeleteMilestone}
                />
              ))}
            </div>
          </div>

          {/* Goals Section */}
          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Goals</h3>
              <button
                onClick={handleAddGoal}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                + Add Goal
              </button>
            </div>

            <div className="space-y-4">
              {goals.map((goal, index) => (
                <GoalSection
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onUpdate={handleUpdateGoal}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 border-t-2 pt-6">
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save Action Plan
            </button>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="flex-1 px-6 py-3 bg-gray-300 text-gray-800 font-bold rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Milestone Card Component
function MilestoneCard({
  milestone,
  index,
  onUpdate,
  onDelete,
}: {
  milestone: Milestone;
  index: number;
  onUpdate: (id: string, milestone: Milestone) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-gray-800">Milestone {index + 1}</h4>
        <button
          onClick={() => onDelete(milestone.id)}
          className="text-red-500 hover:text-red-700 font-bold"
        >
          Delete
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
          <input
            type="text"
            value={milestone.title || ''}
            onChange={e =>
              onUpdate(milestone.id, {
                ...milestone,
                title: e.target.value,
              })
            }
            placeholder="Milestone title (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={milestone.startDate}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  startDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">End Date</label>
            <input
              type="date"
              value={milestone.endDate}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  endDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Working Hours Start
            </label>
            <input
              type="time"
              value={milestone.workingHoursStart}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  workingHoursStart: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Working Hours End
            </label>
            <input
              type="time"
              value={milestone.workingHoursEnd}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  workingHoursEnd: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Place</label>
          <input
            type="text"
            value={milestone.place}
            onChange={e =>
              onUpdate(milestone.id, {
                ...milestone,
                place: e.target.value,
              })
            }
            placeholder="Working location"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
