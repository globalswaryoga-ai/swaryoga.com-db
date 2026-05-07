'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Clock, TrendingUp, ArrowRight, Loader } from 'lucide-react';

interface Enrollment {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    image?: string;
  };
  courseId: {
    _id: string;
    slug: string;
    content: { en: { title: string } };
    level: string;
  };
  status: string;
  progress: number;
  totalWatchTime: number;
  enrolledAt: string;
}

export default function ELearningUsersPage() {
  const router = useRouter();
  const token = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchEnrollments = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/e-learning/enrollments?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setEnrollments(data.enrollments || []);
        setTotal(data.total);
        setTotalPages(data.pages);
      }
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, search]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">E-Learning Users</h1>
            <p className="text-sm text-gray-400">Manage enrolled students and their courses</p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-md relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Enrollments</p>
              <p className="text-3xl font-bold text-white mt-2">{total}</p>
            </div>
            <Users className="w-10 h-10 text-green-500/30" />
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-white mt-2">{enrollments.filter(e => e.status === 'active').length}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-blue-500/30" />
          </div>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Page</p>
              <p className="text-3xl font-bold text-white mt-2">{page} of {totalPages}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500/30" />
          </div>
        </div>
      </div>

      {/* Enrollments Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 animate-spin text-green-500" />
        </div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Enrollments Found</h3>
          <p className="text-gray-400">No users match your search criteria</p>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/80 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Watch Time</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Enrolled</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-green-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {enrollments.map((enrollment) => (
                <tr key={enrollment._id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-green-400">
                          {enrollment.userId.name?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{enrollment.userId.name}</p>
                        <p className="text-sm text-gray-400">{enrollment.userId.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{enrollment.courseId.content.en.title}</p>
                      <p className="text-sm text-gray-500">{enrollment.courseId.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${enrollment.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white">{enrollment.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">{formatTime(enrollment.totalWatchTime || 0)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      enrollment.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      enrollment.status === 'completed' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      enrollment.status === 'suspended' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-gray-700/50 text-gray-400 border border-gray-600'
                    }`}>
                      {enrollment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-400">{new Date(enrollment.enrolledAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/crm/e-learning/users/${enrollment.userId._id}?enrollmentId=${enrollment._id}`}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                    >
                      Manage
                      <ArrowRight size={16} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
