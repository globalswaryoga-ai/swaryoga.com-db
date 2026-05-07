'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, CheckCircle, Download, Loader, AlertCircle, Users } from 'lucide-react';

interface Enrollment {
  _id: string;
  userId: { _id: string; name: string; email: string };
  courseId: { _id: string; content: { en: { title: string } } };
  status: string;
  progress: number;
  enrolledAt: string;
}

export default function BulkActionsPage() {
  const token = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<'active' | 'suspended' | 'expired' | 'completed'>('active');
  const [bulkAction, setBulkAction] = useState<'status' | 'export' | ''>('');
  const [processing, setProcessing] = useState(false);

  const fetchEnrollments = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch('/api/admin/e-learning/enrollments?limit=1000', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (data.success) {
        setEnrollments(data.enrollments || []);
      }
    } catch (err) {
      setError('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const toggleSelectAll = () => {
    if (selected.size === enrollments.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(enrollments.map((e) => e._id)));
    }
  };

  const handleBulkStatus = async () => {
    if (!token || selected.size === 0) return;

    setProcessing(true);
    try {
      const updates = Array.from(selected).map((enrollmentId) =>
        fetch('/api/admin/e-learning/enrollments', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            enrollmentId,
            status: bulkStatus,
          }),
        })
      );

      await Promise.all(updates);
      await fetchEnrollments();
      setSelected(new Set());
      setBulkAction('');
    } catch (err) {
      setError('Error updating enrollments');
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = () => {
    const selectedEnrollments = enrollments.filter((e) => selected.has(e._id));

    const csv = [
      ['Name', 'Email', 'Course', 'Status', 'Progress', 'Enrolled'],
      ...selectedEnrollments.map((e) => [
        e.userId.name,
        e.userId.email,
        e.courseId.content.en.title,
        e.status,
        `${e.progress}%`,
        new Date(e.enrolledAt).toLocaleDateString(),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
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
        <Link href="/admin/crm/e-learning" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Bulk Actions</h1>
          <p className="text-sm text-gray-400">Manage multiple enrollments at once</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Action Bar */}
      {selected.size > 0 && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={24} />
              <div>
                <p className="font-semibold text-white">{selected.size} selected</p>
                <p className="text-sm text-green-300">{enrollments.length - selected.size} not selected</p>
              </div>
            </div>

            {bulkAction === '' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setBulkAction('status')}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg"
                >
                  Change Status
                </button>
                <button
                  onClick={handleExport}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-lg flex items-center gap-2"
                >
                  <Download size={18} />
                  Export CSV
                </button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}

            {bulkAction === 'status' && (
              <div className="flex gap-3 items-center">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as any)}
                  className="px-4 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="expired">Expired</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  onClick={handleBulkStatus}
                  disabled={processing}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Updating...' : 'Apply'}
                </button>
                <button
                  onClick={() => setBulkAction('')}
                  className="px-6 py-2 border border-gray-600 text-gray-300 hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enrollments Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-900/80 border-b border-gray-800">
            <tr>
              <th className="px-6 py-4 text-left">
                <input
                  type="checkbox"
                  checked={selected.size === enrollments.length && enrollments.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded border-gray-600 bg-black text-green-500"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase">User</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase">Course</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase">Status</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase">Progress</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase">Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {enrollments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  <Users className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p>No enrollments found</p>
                </td>
              </tr>
            ) : (
              enrollments.map((enrollment) => (
                <tr key={enrollment._id} className="hover:bg-gray-800/30">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selected.has(enrollment._id)}
                      onChange={() => toggleSelect(enrollment._id)}
                      className="w-5 h-5 rounded border-gray-600 bg-black text-green-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{enrollment.userId.name}</p>
                    <p className="text-sm text-gray-400">{enrollment.userId.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white">{enrollment.courseId.content.en.title}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        enrollment.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : enrollment.status === 'completed'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-700/50 text-gray-400'
                      }`}
                    >
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${enrollment.progress}%` }} />
                      </div>
                      <span className="text-sm text-gray-400">{enrollment.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {new Date(enrollment.enrolledAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
