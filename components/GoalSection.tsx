'use client';

import { ActionPlanGoal } from '@/lib/types/lifePlanner';

interface GoalSectionProps {
  goal: ActionPlanGoal;
  index: number;
  onUpdate: (id: string, goal: ActionPlanGoal) => void;
  onDelete: (id: string) => void;
}

export default function GoalSection({ goal, index, onUpdate, onDelete }: GoalSectionProps) {
  return (
    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-blue-800">Goal {index + 1}</h4>
        <button
          onClick={() => onDelete(goal.id)}
          className="text-red-500 hover:text-red-700 font-bold"
        >
          Delete
        </button>
      </div>

      <div className="space-y-3">
        {/* Goal Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Goal Name *</label>
          <input
            type="text"
            value={goal.title}
            onChange={e =>
              onUpdate(goal.id, {
                ...goal,
                title: e.target.value,
              })
            }
            placeholder="Goal name"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
          <textarea
            value={goal.description}
            onChange={e =>
              onUpdate(goal.id, {
                ...goal,
                description: e.target.value,
              })
            }
            placeholder="Goal description"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={goal.startDate}
              onChange={e =>
                onUpdate(goal.id, {
                  ...goal,
                  startDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">End Date *</label>
            <input
              type="date"
              value={goal.endDate}
              onChange={e =>
                onUpdate(goal.id, {
                  ...goal,
                  endDate: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Working Time */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Working Time Start
            </label>
            <input
              type="time"
              value={goal.workingTimeStart}
              onChange={e =>
                onUpdate(goal.id, {
                  ...goal,
                  workingTimeStart: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Working Time End
            </label>
            <input
              type="time"
              value={goal.workingTimeEnd}
              onChange={e =>
                onUpdate(goal.id, {
                  ...goal,
                  workingTimeEnd: e.target.value,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Place */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Place *</label>
          <input
            type="text"
            value={goal.place}
            onChange={e =>
              onUpdate(goal.id, {
                ...goal,
                place: e.target.value,
              })
            }
            placeholder="Work location"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Expected Amount */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Expected Amount (Rs.)
          </label>
          <input
            type="number"
            value={goal.expectedAmount || 0}
            onChange={e =>
              onUpdate(goal.id, {
                ...goal,
                expectedAmount: Number(e.target.value),
              })
            }
            placeholder="0"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
          <select
            value={goal.status}
            onChange={e =>
              onUpdate(goal.id, {
                ...goal,
                status: e.target.value as 'not-started' | 'working' | 'pending' | 'done',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="not-started">Not Started</option>
            <option value="working">Working</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>
    </div>
  );
}
