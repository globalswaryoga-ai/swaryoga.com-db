'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Plus, Edit2, Trash2, CheckCircle2, X, Save, Loader, AlertCircle } from 'lucide-react';

interface Assignment {
  _id: string;
  content: { en: { title: string; description?: string; instructions?: string } };
  totalPoints: number;
  passingPoints: number;
  isRequired: boolean;
  dueAfterDays?: number;
  order: number;
}

interface Course {
  _id: string;
  content: { en: { title: string } };
}

export default function AssignmentsPage({ params }: { params: { courseId: string } }) {
  const token = useAuth();
  const { courseId } = params;

  const [course, setCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [totalPoints, setTotalPoints] = useState('100');
  const [passingPoints, setPassingPoints] = useState('60');
  const [isRequired, setIsRequired] = useState(false);
  const [dueAfterDays, setDueAfterDays] = useState('');

  const fetchData = useCallback(async () => {
    if (!token || !courseId) return;

    try {
      setLoading(true);
      const [courseRes, assignRes] = await Promise.all([
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/admin/e-learning/assignments?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [courseData, assignData] = await Promise.all([courseRes.json(), assignRes.json()]);

      if (courseData.success) {
        const found = courseData.courses?.find((c: Course) => c._id === courseId);
        setCourse(found || null);
      }

      if (assignData.success) {
        setAssignments(assignData.assignments || []);
      }
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, courseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setTotalPoints('100');
    setPassingPoints('60');
    setIsRequired(false);
    setDueAfterDays('');
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!token || !title) return;

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId
        ? '/api/admin/e-learning/assignments'
        : '/api/admin/e-learning/assignments';

      const body = editingId
        ? {
            assignmentId: editingId,
            content: { en: { title, description, instructions } },
            totalPoints: parseInt(totalPoints) || 100,
            passingPoints: parseInt(passingPoints) || 60,
            isRequired,
            dueAfterDays: dueAfterDays ? parseInt(dueAfterDays) : undefined,
          }
        : {
            courseId,
            content: { en: { title, description, instructions } },
            totalPoints: parseInt(totalPoints) || 100,
            passingPoints: parseInt(passingPoints) || 60,
            isRequired,
            dueAfterDays: dueAfterDays ? parseInt(dueAfterDays) : undefined,
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchData();
        resetForm();
        setShowForm(false);
      } else {
        setError('Failed to save assignment');
      }
    } catch (err) {
      setError('Error saving assignment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!token || !confirm('Delete this assignment?')) return;

    try {
      const res = await fetch(`/api/admin/e-learning/assignments?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      setError('Error deleting assignment');
    }
  };

  const handleEdit = (assignment: Assignment) => {
    setTitle(assignment.content.en.title);
    setDescription(assignment.content.en.description || '');
    setInstructions(assignment.content.en.instructions || '');
    setTotalPoints(assignment.totalPoints.toString());
    setPassingPoints(assignment.passingPoints.toString());
    setIsRequired(assignment.isRequired);
    setDueAfterDays(assignment.dueAfterDays?.toString() || '');
    setEditingId(assignment._id);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href={`/admin/crm/e-learning`} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{course?.content.en.title || 'Course'} - Assignments</h1>
          <p className="text-sm text-gray-400">{assignments.length} assignments</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg"
        >
          <Plus size={18} />
          Add Assignment
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-bold text-white mb-4">{editingId ? 'Edit' : 'New'} Assignment</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              rows={2}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
            />
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instructions for students"
              rows={2}
              className="w-full px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={totalPoints}
                onChange={(e) => setTotalPoints(e.target.value)}
                placeholder="Total points"
                className="px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
              <input
                type="number"
                value={passingPoints}
                onChange={(e) => setPassingPoints(e.target.value)}
                placeholder="Passing points"
                className="px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                value={dueAfterDays}
                onChange={(e) => setDueAfterDays(e.target.value)}
                placeholder="Due after (days)"
                className="px-4 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              />
              <label className="flex items-center gap-2 text-white">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500"
                />
                Required
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {assignments.length === 0 ? (
          <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
            <p className="text-gray-400 mb-4">No assignments yet</p>
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg"
            >
              Create First Assignment
            </button>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment._id} className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 hover:bg-gray-800/50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-white">{assignment.content.en.title}</h3>
                  {assignment.content.en.description && (
                    <p className="text-sm text-gray-400 mt-1">{assignment.content.en.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span>Points: {assignment.passingPoints}/{assignment.totalPoints}</span>
                    {assignment.isRequired && <span className="text-yellow-400">• Required</span>}
                    {assignment.dueAfterDays && <span>• Due: {assignment.dueAfterDays} days</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(assignment)}
                    className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(assignment._id)}
                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
