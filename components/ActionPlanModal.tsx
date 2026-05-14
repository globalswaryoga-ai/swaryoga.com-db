'use client';

import { useEffect, useMemo, useState } from 'react';
import { VISION_CATEGORIES } from '@/lib/types/lifePlanner';
import type { ActionPlan, Milestone, Vision } from '@/lib/types/lifePlanner';
import LifePlannerImageUpload from '@/components/LifePlannerImageUpload';

interface ActionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (actionPlan: ActionPlan) => void;
  visions: Vision[];
  editingPlan?: ActionPlan;
  parentVisionId?: string; // Auto-populate from parent Vision
}

export default function ActionPlanModal({
  isOpen,
  onClose,
  onSave,
  visions,
  editingPlan,
  parentVisionId,
}: ActionPlanModalProps) {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  const [selectedVisionId, setSelectedVisionId] = useState('');
  const [selectedVisionHead, setSelectedVisionHead] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [workingHoursStart, setWorkingHoursStart] = useState('11:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('11:00');
  const [place, setPlace] = useState('');
  const [expectedAmount, setExpectedAmount] = useState(0);
  const [imageUrl, setImageUrl] = useState('');
  const [completed, setCompleted] = useState(false);
  const [milestones, setMilestones] = useState<Milestone[]>([]);

  const selectedVision = visions.find(v => v.id === selectedVisionId);

  // When opening the modal (or switching editingPlan), preload all fields.
  // Without this, React state initialized via useState() won't update when editingPlan changes.
  useEffect(() => {
    if (!isOpen) return;

    if (editingPlan) {
      const v = visions.find(vv => vv.id === editingPlan.visionId);
      const head = v?.category ? String(v.category) : '';
      setSelectedVisionHead(head);
      setSelectedVisionId(editingPlan.visionId || '');
      setTitle(editingPlan.title || '');
      setDescription(editingPlan.description || '');
      setStartDate(editingPlan.startDate || today);
      setEndDate(editingPlan.endDate || today);
      setWorkingHoursStart(editingPlan.workingHoursStart || '11:00');
      setWorkingHoursEnd(editingPlan.workingHoursEnd || '11:00');
      setPlace(editingPlan.place || '');
      setExpectedAmount(editingPlan.expectedAmount || 0);
      setImageUrl(editingPlan.imageUrl || '');
      setCompleted(editingPlan.completed || false);
      setMilestones(editingPlan.milestones || []);
      return;
    }

    // Create mode - check if parentVisionId provided (auto-populate from parent)
    if (parentVisionId) {
      const parentVision = visions.find(v => v.id === parentVisionId);
      if (parentVision) {
        setSelectedVisionId(parentVisionId);
        setSelectedVisionHead(String(parentVision.category) || '');
        setTitle('');
        setDescription('');
        setStartDate(today);
        setEndDate(today);
        setWorkingHoursStart('11:00');
        setWorkingHoursEnd('11:00');
        setPlace('');
        setExpectedAmount(0);
        setImageUrl('');
        setCompleted(false);
        setMilestones([]);
        return;
      }
    }

    // Create mode defaults (no parent context)
    setSelectedVisionHead('');
    setSelectedVisionId('');
    setTitle('');
    setDescription('');
    setStartDate(today);
    setEndDate(today);
    setWorkingHoursStart('11:00');
    setWorkingHoursEnd('11:00');
    setPlace('');
    setExpectedAmount(0);
    setImageUrl('');
    setCompleted(false);
    setMilestones([]);
  }, [isOpen, editingPlan, visions, today, parentVisionId]);
  
  // Filter visions by selected head
  const visionsUnderHead = selectedVisionHead
    ? visions.filter(v => v.category === selectedVisionHead)
    : [];

  // Auto-select vision if only one exists under selected head
  useEffect(() => {
    if (visionsUnderHead.length === 1 && !selectedVisionId && !parentVisionId) {
      setSelectedVisionId(visionsUnderHead[0].id);
    }
  }, [visionsUnderHead, selectedVisionId, parentVisionId]);

  const handleAddMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      description: '',
      startDate: startDate || today,
      endDate: endDate || today,
      workingHoursStart: '11:00',
      workingHoursEnd: '11:00',
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
      imageUrl: imageUrl || selectedVision?.imageUrl || selectedVision?.categoryImageUrl,
      startDate,
      endDate,
      workingHoursStart,
      workingHoursEnd,
      place,
      expectedAmount: expectedAmount || undefined,
      milestones,
      status: editingPlan?.status || 'not-started',
      progress: editingPlan?.progress || 0,
      completed: completed,
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
    setStartDate(today);
    setEndDate(today);
    setWorkingHoursStart('11:00');
    setWorkingHoursEnd('11:00');
    setPlace('');
    setExpectedAmount(0);
    setImageUrl('');
    setCompleted(false);
    setMilestones([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-swar-primary to-blue-700 p-6 text-white flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
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
          {/* If parentVisionId provided, show auto-filled info */}
          {parentVisionId && selectedVision ? (
            <>
              {/* Category (Auto-filled) */}
              <div className="rounded-lg bg-blue-50 border-2 border-blue-200 p-4">
                <label className="block text-sm font-semibold text-swar-text mb-2">📂 Category</label>
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text">
                  {selectedVisionHead} (Auto - linked to Vision)
                </div>
              </div>

              {/* Vision (Auto-filled) */}
              <div className="rounded-lg bg-purple-50 border-2 border-purple-200 p-4">
                <label className="block text-sm font-semibold text-swar-text mb-2">💡 Vision</label>
                <div className="px-4 py-2 bg-white border border-swar-border rounded-lg text-swar-text">
                  {selectedVision.title} (Auto - parent context)
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Vision Head Selection - Manual (when no parent) */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">
                  Select Vision Plan Head *
                </label>
                <select
                  value={selectedVisionHead}
                  onChange={e => {
                    setSelectedVisionHead(e.target.value);
                    setSelectedVisionId(''); // Reset vision when head changes
                  }}
                  className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose a vision head...</option>
                  {VISION_CATEGORIES.map(head => (
                    <option key={head} value={head}>
                      {head}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vision Selection - Show dropdown if multiple visions, text if single */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">
                  Select Vision Plan *
                </label>
                {selectedVisionHead ? (
                  visionsUnderHead.length === 1 ? (
                    // If only 1 vision, show as auto-filled text
                    <div className="px-4 py-2 bg-swar-bg border border-swar-border rounded-lg text-swar-text">
                      {visionsUnderHead[0].title} (Auto - only option)
                    </div>
                  ) : visionsUnderHead.length > 1 ? (
                    // If multiple visions, show dropdown
                    <select
                      value={selectedVisionId}
                      onChange={e => setSelectedVisionId(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Choose a vision...</option>
                      {visionsUnderHead.map(vision => (
                        <option key={vision.id} value={vision.id}>
                          {vision.title}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-swar-text-secondary italic">No visions found under this category</p>
                  )
                ) : (
                  <p className="text-sm text-swar-text-secondary italic">Please select a vision head first</p>
                )}
              </div>
            </>
          )}

          {/* Vision Image Preview */}
          {selectedVision && (
            <div className="flex justify-center">
              <img
                src={selectedVision.imageUrl || selectedVision.categoryImageUrl || '/placeholder.png'}
                alt={selectedVision.title}
                className="w-full h-64 object-cover rounded-lg border-2 border-swar-border"
              />
            </div>
          )}

          {/* Action Plan Title */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Action Plan Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Q1 Fitness Challenge"
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe your action plan..."
              rows={3}
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Working Hours Start
              </label>
              <input
                type="time"
                value={workingHoursStart}
                onChange={e => setWorkingHoursStart(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-swar-text mb-2">
                Working Hours End
              </label>
              <input
                type="time"
                value={workingHoursEnd}
                onChange={e => setWorkingHoursEnd(e.target.value)}
                className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Place */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Working Place *
            </label>
            <input
              type="text"
              value={place}
              onChange={e => setPlace(e.target.value)}
              placeholder="e.g., Home Gym, Office, Studio"
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Expected Amount */}
          <div>
            <label className="block text-sm font-semibold text-swar-text mb-2">
              Expected Amount (Rs.)
            </label>
            <input
              type="number"
              value={expectedAmount}
              onChange={e => setExpectedAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Plan Image Upload */}
          <LifePlannerImageUpload
            label="Action Plan Image (Optional)"
            onImageUrlChange={setImageUrl}
            currentImageUrl={imageUrl}
            maxSizeMB={5}
          />

          {/* Milestones Section */}
          <div className="border-t-2 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-swar-text">Milestones</h3>
              <button
                onClick={handleAddMilestone}
                className="px-4 py-2 bg-swar-primary text-white rounded-lg hover:opacity-90 transition-colors"
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





          {/* Completed Checkbox */}
          <div className="flex items-center gap-3 px-4 py-3 bg-swar-bg rounded-lg">
            <input
              type="checkbox"
              id="completed"
              checked={completed}
              onChange={e => setCompleted(e.target.checked)}
              className="w-5 h-5 rounded border-2 border-swar-border cursor-pointer"
            />
            <label htmlFor="completed" className="text-sm font-medium text-swar-text cursor-pointer">
              Mark as Completed
            </label>
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
              className="flex-1 px-6 py-3 bg-gray-300 text-swar-text font-bold rounded-lg hover:bg-gray-400 transition-colors"
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
    <div className="bg-swar-bg p-4 rounded-lg border-2 border-swar-border">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-swar-text">Milestone {index + 1}</h4>
        <button
          onClick={() => onDelete(milestone.id)}
          className="text-red-500 hover:text-swar-primary font-bold"
        >
          Delete
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Title</label>
          <input
            type="text"
            value={milestone.title || ''}
            onChange={e =>
              onUpdate(milestone.id, {
                ...milestone,
                title: e.target.value,
              })
            }
            placeholder="Milestone title"
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Start Date</label>
            <input
              type="date"
              value={milestone.startDate}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  startDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">End Date</label>
            <input
              type="date"
              value={milestone.endDate}
              onChange={e =>
                onUpdate(milestone.id, {
                  ...milestone,
                  endDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">
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
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-swar-text-secondary mb-1">
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
              className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-swar-text-secondary mb-1">Place</label>
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
            className="w-full px-3 py-2 border border-swar-border rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
