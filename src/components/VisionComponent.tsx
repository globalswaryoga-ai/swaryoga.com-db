import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Target, X, TrendingUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { visionAPI, Vision, formatDate, daysUntilDue } from '../utils/sadhakaPlannerData';

interface VisionComponentProps {
  onVisionsUpdate?: (visions: Vision[]) => void;
}

const VisionComponent: React.FC<VisionComponentProps> = ({ onVisionsUpdate }) => {
  const { user } = useAuth();
  const [visions, setVisions] = useState<Vision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    timelineMonths: 12,
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
    status: 'Active' as 'Active' | 'Completed' | 'On Hold' | 'Not Started' | 'In Progress'
  });

  useEffect(() => {
    loadVisions();
  }, [user?.id]);

  const loadVisions = async () => {
    try {
      setLoading(true);
      const data = await visionAPI.getAll(user?.id || '');
      setVisions(data);
      onVisionsUpdate?.(data);
    } catch (error) {
      console.error('Error loading visions:', error);
      toast.error('Failed to load visions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Vision title is required');
      return;
    }

    if (new Date(formData.targetDate) < new Date(formData.startDate)) {
      toast.error('Target date must be after start date');
      return;
    }

    try {
      const visionData: Vision = {
        ...formData,
        userId: user?.id || ''
      };

      if (editingId) {
        visionData.id = editingId;
        await visionAPI.update(editingId, visionData);
        toast.success('Vision updated successfully');
      } else {
        await visionAPI.create(visionData);
        toast.success('Vision created successfully');
      }

      resetForm();
      setShowModal(false);
      loadVisions();
    } catch (error: any) {
      console.error('Error saving vision:', error);
      toast.error(error.message || 'Failed to save vision');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vision?')) return;

    try {
      await visionAPI.delete(id, user?.id || '');
      toast.success('Vision deleted successfully');
      loadVisions();
    } catch (error: any) {
      console.error('Error deleting vision:', error);
      toast.error(error.message || 'Failed to delete vision');
    }
  };

  const handleEdit = (vision: Vision) => {
    setFormData({
      title: vision.title,
      description: vision.description,
      imageUrl: vision.imageUrl,
      timelineMonths: vision.timelineMonths,
      startDate: vision.startDate,
      targetDate: vision.targetDate,
      status: vision.status
    });
    setEditingId(vision.id || null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      timelineMonths: 12,
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(new Date().setMonth(new Date().getMonth() + 12)).toISOString().split('T')[0],
      status: 'Active'
    });
    setEditingId(null);
  };

  const filteredVisions = visions.filter(vision => {
    const matchStatus = filterStatus === 'all' || vision.status === filterStatus;
    return matchStatus;
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Active':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (startDate: string, targetDate: string) => {
    const start = new Date(startDate).getTime();
    const target = new Date(targetDate).getTime();
    const now = new Date().getTime();

    if (now < start) return 0;
    if (now > target) return 100;

    const progress = ((now - start) / (target - start)) * 100;
    return Math.round(progress);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🎯 My Visions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total: {visions.length} | Active: {visions.filter(v => v.status === 'Active').length} | Completed: {visions.filter(v => v.status === 'Completed').length}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Vision
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Visions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVisions.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No visions yet. Create your first vision!</p>
          </div>
        ) : (
          filteredVisions.map(vision => {
            const progress = calculateProgress(vision.startDate, vision.targetDate);
            const visionKey = vision.id || vision._id || `vision-${Math.random()}`;
            return (
              <div
                key={visionKey}
                className={`rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow ${
                  vision.status === 'Completed'
                    ? 'bg-gray-50 border border-gray-200'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* Vision Image */}
                {vision.imageUrl && (
                  <div className="h-40 bg-gradient-to-br from-indigo-200 to-blue-200 overflow-hidden">
                    <img
                      src={vision.imageUrl}
                      alt={vision.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Vision Content */}
                <div className="p-4">
                  {/* Title & Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3
                      className={`font-semibold text-lg ${
                        vision.status === 'Completed'
                          ? 'text-gray-500 line-through'
                          : 'text-gray-800'
                      }`}
                    >
                      {vision.title}
                    </h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded whitespace-nowrap ${statusColor(vision.status)}`}>
                      {vision.status}
                    </span>
                  </div>

                  {/* Description */}
                  {vision.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{vision.description}</p>
                  )}

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 font-medium">Progress</span>
                      <span className="text-xs font-semibold text-indigo-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Timeline Info */}
                  <div className="text-xs text-gray-600 space-y-1 mb-3">
                    <p>🗓️ Start: {formatDate(vision.startDate)}</p>
                    <p>🎯 Target: {formatDate(vision.targetDate)}</p>
                    <p>⏱️ Duration: {vision.timelineMonths} months</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-3 border-t">
                    <button
                      onClick={() => handleEdit(vision)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(vision.id || '')}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingId ? 'Edit Vision' : 'Create New Vision'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vision Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="What is your vision?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your vision in detail..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vision Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {formData.imageUrl && (
                  <div className="mt-2 h-32 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.alt = 'Image failed to load';
                        e.currentTarget.style.objectFit = 'contain';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Timeline Months */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Timeline (Months): {formData.timelineMonths}
                </label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={formData.timelineMonths}
                  onChange={(e) => {
                    const months = parseInt(e.target.value);
                    const newTargetDate = new Date(formData.startDate);
                    newTargetDate.setMonth(newTargetDate.getMonth() + months);
                    setFormData({
                      ...formData,
                      timelineMonths: months,
                      targetDate: newTargetDate.toISOString().split('T')[0]
                    });
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-600 mt-1">Adjust to set your target timeline</p>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => {
                    const newStartDate = e.target.value;
                    const newTargetDate = new Date(newStartDate);
                    newTargetDate.setMonth(newTargetDate.getMonth() + formData.timelineMonths);
                    setFormData({
                      ...formData,
                      startDate: newStartDate,
                      targetDate: newTargetDate.toISOString().split('T')[0]
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Target Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                <input
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingId ? 'Update Vision' : 'Create Vision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisionComponent;
