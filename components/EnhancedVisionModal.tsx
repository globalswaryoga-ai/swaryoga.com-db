'use client';

import React, { useState, useEffect } from 'react';
import { X, Target, Plus, Trash2, Lightbulb, BookOpen } from 'lucide-react';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface Goal {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  amountNeeded: string;
  progress: number;
  todos: Todo[];
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  goal: Goal;
}

interface EnhancedVision {
  id?: string;
  title: string;
  image: string;
  description: string;
  guidelines: string[];
  ideas: string[];
  startDate: string;
  endDate: string;
  estimatedTime: string;
  estimatedMoney: string;
  priority: 'Low' | 'Medium' | 'High';
  color: string;
  milestones: Milestone[];
}

interface VisionModalProps {
  vision?: EnhancedVision;
  onSave: (visionData: EnhancedVision) => void;
  onClose: () => void;
}

const EnhancedVisionModal: React.FC<VisionModalProps> = ({ vision, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState<EnhancedVision>({
    title: '',
    image: '',
    description: '',
    guidelines: ['', '', '', ''],
    ideas: [''],
    startDate: '',
    endDate: '',
    estimatedTime: '',
    estimatedMoney: '',
    priority: 'Medium',
    color: 'purple',
    milestones: []
  });

  useEffect(() => {
    if (vision) {
      setFormData({
        id: vision.id,
        title: vision.title || '',
        image: vision.image || '',
        description: vision.description || '',
        guidelines: vision.guidelines || ['', '', '', ''],
        ideas: vision.ideas || [''],
        startDate: vision.startDate || '',
        endDate: vision.endDate || '',
        estimatedTime: vision.estimatedTime || '',
        estimatedMoney: vision.estimatedMoney || '',
        priority: vision.priority || 'Medium',
        color: vision.color || 'purple',
        milestones: vision.milestones || []
      });
    }
  }, [vision]);

  const tabs = [
    { id: 'basic', name: 'Basic Info', icon: '📝' },
    { id: 'guidelines', name: 'Guidelines & Ideas', icon: '💡' },
    { id: 'structure', name: 'Milestones & Goals', icon: '🎯' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleGuidelineChange = (index: number, value: string) => {
    const newGuidelines = [...formData.guidelines];
    newGuidelines[index] = value;
    setFormData(prev => ({ ...prev, guidelines: newGuidelines }));
  };

  const handleIdeaChange = (index: number, value: string) => {
    const newIdeas = [...formData.ideas];
    newIdeas[index] = value;
    setFormData(prev => ({ ...prev, ideas: newIdeas }));
  };

  const addIdea = () => {
    setFormData(prev => ({
      ...prev,
      ideas: [...prev.ideas, '']
    }));
  };

  const removeIdea = (index: number) => {
    setFormData(prev => ({
      ...prev,
      ideas: prev.ideas.filter((_, i) => i !== index)
    }));
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: '',
      completed: false,
      dueDate: '',
      goal: {
        id: (Date.now() + 1).toString(),
        title: '',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '17:00',
        amountNeeded: '',
        progress: 0,
        todos: []
      }
    };
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone]
    }));
  };

  const updateMilestone = (milestoneId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === milestoneId ? { ...m, [field]: value } : m
      )
    }));
  };

  const updateGoal = (milestoneId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === milestoneId ? { ...m, goal: { ...m.goal, [field]: value } } : m
      )
    }));
  };

  const removeMilestone = (milestoneId: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter(m => m.id !== milestoneId)
    }));
  };

  const addTodo = (milestoneId: string) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: '',
      completed: false,
      priority: 'medium'
    };
    
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === milestoneId 
          ? { ...m, goal: { ...m.goal, todos: [...m.goal.todos, newTodo] } }
          : m
      )
    }));
  };

  const updateTodo = (milestoneId: string, todoId: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === milestoneId 
          ? { 
              ...m, 
              goal: { 
                ...m.goal, 
                todos: m.goal.todos.map(t => 
                  t.id === todoId ? { ...t, [field]: value } : t
                )
              }
            }
          : m
      )
    }));
  };

  const removeTodo = (milestoneId: string, todoId: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map(m => 
        m.id === milestoneId 
          ? { ...m, goal: { ...m.goal, todos: m.goal.todos.filter(t => t.id !== todoId) } }
          : m
      )
    }));
  };

  const colors = [
    { name: 'Purple', value: 'purple' },
    { name: 'Indigo', value: 'indigo' },
    { name: 'Blue', value: 'blue' },
    { name: 'Green', value: 'green' },
    { name: 'Red', value: 'red' },
    { name: 'Orange', value: 'orange' },
    { name: 'Pink', value: 'pink' },
    { name: 'Yellow', value: 'yellow' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-swar-border sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg sm:text-2xl font-bold text-swar-text">
            {vision?.id ? '✏️ Edit Vision' : '🌟 Create New Vision'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-swar-primary-light rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-swar-border sticky top-16 bg-white overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 sm:px-6 py-3 font-medium transition-colors text-sm sm:text-base flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-swar-text-secondary hover:text-swar-text'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    🎯 Vision Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="e.g., Master Yoga Practice"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    🖼️ Vision Image URL
                  </label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">
                  📖 Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base"
                  placeholder="Describe your vision in detail..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    📅 Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    📅 End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    ⏱️ Estimated Time
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedTime: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="e.g., 2 hours daily"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    💰 Estimated Budget
                  </label>
                  <input
                    type="text"
                    value={formData.estimatedMoney}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedMoney: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="e.g., ₹50,000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    🔴 Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as 'Low' | 'Medium' | 'High' }))}
                    className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">
                    🎨 Color Theme
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color.value
                            ? `border-${color.value}-500 ring-2 ring-offset-2 ring-${color.value}-400`
                            : 'border-swar-border hover:border-swar-border'
                        }`}
                        style={{
                          backgroundColor: `rgb(var(--color-${color.value}-500))`,
                          opacity: formData.color === color.value ? 1 : 0.6
                        }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Guidelines & Ideas Tab */}
          {activeTab === 'guidelines' && (
            <div className="space-y-6">
              {/* Guidelines Section */}
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-3 flex items-center gap-2">
                  <BookOpen size={20} className="text-blue-600" />
                  4-Line Guidelines
                </label>
                <div className="space-y-3">
                  {formData.guidelines.map((guideline, index) => (
                    <input
                      key={index}
                      type="text"
                      value={guideline}
                      onChange={(e) => handleGuidelineChange(index, e.target.value)}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={`Guideline ${index + 1}: e.g., Practice daily for consistency`}
                    />
                  ))}
                </div>
                <p className="text-xs text-swar-text-secondary mt-2">💡 Add 4 key principles or guidelines for this vision</p>
              </div>

              {/* Ideas Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-swar-text flex items-center gap-2">
                    <Lightbulb size={20} className="text-yellow-600" />
                    Ideas & Notes
                  </label>
                  <button
                    type="button"
                    onClick={addIdea}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition text-xs font-medium"
                  >
                    <Plus size={14} />
                    Add Idea
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.ideas.map((idea, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={idea}
                        onChange={(e) => handleIdeaChange(index, e.target.value)}
                        className="flex-1 px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                        placeholder={`Idea ${index + 1}: e.g., Attend yoga retreat in Bali`}
                      />
                      {formData.ideas.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeIdea(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-swar-text-secondary mt-2">💭 Brainstorm ideas and notes related to your vision</p>
              </div>
            </div>
          )}

          {/* Milestones & Goals Tab */}
          {activeTab === 'structure' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-swar-text">🏆 Milestones & Goals Structure</h3>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
                >
                  <Plus size={18} />
                  Add Milestone
                </button>
              </div>
              
              {formData.milestones.length === 0 ? (
                <div className="border-2 border-dashed border-swar-border rounded-lg p-8 text-center">
                  <Target size={48} className="mx-auto text-swar-text-secondary mb-2" />
                  <p className="text-swar-text-secondary">No milestones added yet. Click "Add Milestone" to get started!</p>
                </div>
              ) : (
                formData.milestones.map((milestone, milestoneIndex) => (
                  <div key={milestone.id} className="border-2 border-purple-200 rounded-lg p-4 sm:p-6 space-y-4 bg-purple-50">
                    {/* Milestone Header */}
                    <div className="flex items-center justify-between">
                      <h4 className="text-lg font-semibold text-swar-text">
                        🎯 Milestone {milestoneIndex + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => removeMilestone(milestone.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/* Milestone Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-1">
                          Milestone Title
                        </label>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, 'title', e.target.value)}
                          placeholder="e.g., Complete Advanced Training"
                          className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-swar-text mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          value={milestone.dueDate}
                          onChange={(e) => updateMilestone(milestone.id, 'dueDate', e.target.value)}
                          className="w-full px-4 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>

                    {/* Goal Section */}
                    <div className="bg-white rounded-lg p-4 space-y-4">
                      <h5 className="font-semibold text-swar-text">🎯 Goal Details</h5>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-swar-text mb-1 block">Goal Title</label>
                          <input
                            type="text"
                            value={milestone.goal.title}
                            onChange={(e) => updateGoal(milestone.id, 'title', e.target.value)}
                            placeholder="Enter goal title"
                            className="w-full px-3 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-swar-text mb-1 block">Amount Needed</label>
                          <input
                            type="text"
                            value={milestone.goal.amountNeeded}
                            onChange={(e) => updateGoal(milestone.id, 'amountNeeded', e.target.value)}
                            placeholder="e.g., ₹5000"
                            className="w-full px-3 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-swar-text mb-1 block">Start Date</label>
                          <input
                            type="date"
                            value={milestone.goal.startDate}
                            onChange={(e) => updateGoal(milestone.id, 'startDate', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-swar-text mb-1 block">End Date</label>
                          <input
                            type="date"
                            value={milestone.goal.endDate}
                            onChange={(e) => updateGoal(milestone.id, 'endDate', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-swar-text mb-1 block">Start Time</label>
                          <input
                            type="time"
                            value={milestone.goal.startTime}
                            onChange={(e) => updateGoal(milestone.id, 'startTime', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-swar-text mb-1 block">End Time</label>
                          <input
                            type="time"
                            value={milestone.goal.endTime}
                            onChange={(e) => updateGoal(milestone.id, 'endTime', e.target.value)}
                            className="w-full px-3 py-2 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Todo Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-swar-text">✓ To-Do List</h5>
                        <button
                          type="button"
                          onClick={() => addTodo(milestone.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-xs font-medium"
                        >
                          <Plus size={14} />
                          Add Todo
                        </button>
                      </div>
                      
                      {milestone.goal.todos.map((todo) => (
                        <div key={todo.id} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-white border-2 border-blue-200 rounded-lg">
                          <input
                            type="checkbox"
                            checked={todo.completed}
                            onChange={(e) => updateTodo(milestone.id, todo.id, 'completed', e.target.checked)}
                            className="w-4 h-4 rounded border-swar-border text-purple-600"
                          />
                          <input
                            type="text"
                            value={todo.text}
                            onChange={(e) => updateTodo(milestone.id, todo.id, 'text', e.target.value)}
                            placeholder="Enter todo item"
                            className="flex-1 px-3 py-2 border-2 border-swar-border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                          />
                          <div className="flex items-center gap-1">
                            <select
                              value={todo.priority}
                              onChange={(e) => updateTodo(milestone.id, todo.id, 'priority', e.target.value)}
                              className="px-2 py-1 border-2 border-swar-border rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Med</option>
                              <option value="high">High</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => removeTodo(milestone.id, todo.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-6 border-t border-swar-border sticky bottom-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-swar-border text-swar-text rounded-lg hover:bg-swar-bg transition font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-lg font-semibold"
            >
              {vision?.id ? '✏️ Update Vision' : '🌟 Create Vision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EnhancedVisionModal;
