'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, BarChart3, Users, BookOpen, Clock, TrendingUp, Loader, AlertCircle } from 'lucide-react';

export default function AnalyticsPage() {
  const token = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const [statsRes, coursesRes] = await Promise.all([
        fetch('/api/admin/e-learning/analytics', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/recorded-courses', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [statsData, coursesData] = await Promise.all([statsRes.json(), coursesRes.json()]);

      if (statsData.success) setStats(statsData.stats);
      if (coursesData.success) setCourses(coursesData.courses || []);
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatHours = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/crm/e-learning" className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">E-Learning Analytics</h1>
          <p className="text-sm text-gray-400">Track courses, students, and engagement</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Enrollments</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.totalEnrollments || 0}</p>
            </div>
            <Users className="w-10 h-10 text-green-500/30" />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Active Courses</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.totalCourses || 0}</p>
            </div>
            <BookOpen className="w-10 h-10 text-blue-500/30" />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.completedEnrollments || 0}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-yellow-500/30" />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Total Watch Time</p>
              <p className="text-3xl font-bold text-white mt-2">{formatHours(stats?.totalWatchTime || 0)}</p>
            </div>
            <Clock className="w-10 h-10 text-purple-500/30" />
          </div>
        </div>
      </div>

      {/* Stats Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity Stats */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Activity Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Active Enrollments</span>
              <span className="text-white font-bold">{stats?.activeEnrollments || 0}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Completion Rate</span>
              <span className="text-white font-bold">
                {stats?.totalEnrollments > 0
                  ? Math.round((stats?.completedEnrollments / stats?.totalEnrollments) * 100)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Avg. Progress</span>
              <span className="text-white font-bold">{Math.round(stats?.avgProgress || 0)}%</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">Watch Sessions</span>
              <span className="text-white font-bold">{stats?.totalWatchSessions || 0}</span>
            </div>
          </div>
        </div>

        {/* Engagement */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-6">Engagement</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Overall Progress</span>
                <span className="text-white font-bold">{Math.round(stats?.avgProgress || 0)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${stats?.avgProgress || 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Completion Rate</span>
                <span className="text-white font-bold">
                  {stats?.totalEnrollments > 0
                    ? Math.round((stats?.completedEnrollments / stats?.totalEnrollments) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${
                      stats?.totalEnrollments > 0
                        ? Math.round((stats?.completedEnrollments / stats?.totalEnrollments) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Courses */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-400" />
          Course Performance
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Course</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Enrolled</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Completed</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Completion %</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              {courses.slice(0, 10).map((course: any) => (
                <tr key={course._id} className="border-b border-gray-800 hover:bg-gray-800/30">
                  <td className="py-3 px-4 text-white">{course.content?.en?.title}</td>
                  <td className="py-3 px-4 text-gray-400">{course.enrollmentCount || 0}</td>
                  <td className="py-3 px-4 text-gray-400">0</td>
                  <td className="py-3 px-4 text-gray-400">0%</td>
                  <td className="py-3 px-4 text-gray-400">0%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
