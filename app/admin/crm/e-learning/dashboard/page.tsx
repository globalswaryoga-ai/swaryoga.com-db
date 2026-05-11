'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Users, TrendingUp, DollarSign, BookOpen, Loader, AlertCircle, BarChart3, PieChart } from 'lucide-react';

interface DashboardStats {
  newWorkshops: number;
  newEnrollments: number;
  paymentsReceived: number;
  activeUsers: number;
  enrollmentsTrend: Array<{ date: string; count: number }>;
  revenueTrend: Array<{ date: string; amount: number }>;
  progressDistribution: { range: string; count: number }[];
  topCourses: Array<{ title: string; enrollments: number; revenue: number }>;
  recentEnrollments: Array<{ userName: string; userEmail: string; courseName: string; enrolledAt: string }>;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export default function DashboardPage() {
  const token = useAuth();
  const [period, setPeriod] = useState<Period>('monthly');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/admin/e-learning/analytics?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
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
          <h1 className="text-2xl font-bold text-white">E-Learning Dashboard</h1>
          <p className="text-sm text-gray-400">Track performance and analytics</p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-8">
        {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                : 'bg-gray-900/50 text-gray-400 border border-gray-800 hover:border-gray-700'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">New Workshops</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.newWorkshops || 0}</p>
            </div>
            <BookOpen className="w-10 h-10 text-blue-500/30" />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">New Enrollments</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.newEnrollments || 0}</p>
            </div>
            <Users className="w-10 h-10 text-green-500/30" />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Payments Received</p>
              <p className="text-2xl font-bold text-white mt-2">{formatCurrency(stats?.paymentsReceived || 0)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-yellow-500/30" />
          </div>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-400 text-sm font-medium">Active Users</p>
              <p className="text-3xl font-bold text-white mt-2">{stats?.activeUsers || 0}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-purple-500/30" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Enrollments Trend */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Enrollments Trend</h3>
          </div>
          <div className="h-40 flex items-end gap-1">
            {stats?.enrollmentsTrend && stats.enrollmentsTrend.length > 0 ? (
              stats.enrollmentsTrend.map((item, idx) => {
                const maxCount = Math.max(...stats.enrollmentsTrend.map(e => e.count), 1);
                const height = (item.count / maxCount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-green-500/50 hover:bg-green-500 rounded-t transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${item.date}: ${item.count}`}
                    />
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Revenue Trend */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Revenue Trend</h3>
          </div>
          <div className="h-40 flex items-end gap-1">
            {stats?.revenueTrend && stats.revenueTrend.length > 0 ? (
              stats.revenueTrend.map((item, idx) => {
                const maxAmount = Math.max(...stats.revenueTrend.map(e => e.amount), 1);
                const height = (item.amount / maxAmount) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-yellow-500/50 hover:bg-yellow-500 rounded-t transition-colors"
                      style={{ height: `${height}%` }}
                      title={`${item.date}: ${formatCurrency(item.amount)}`}
                    />
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Progress Distribution */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Progress Distribution</h3>
          </div>
          <div className="space-y-3">
            {stats?.progressDistribution && stats.progressDistribution.length > 0 ? (
              stats.progressDistribution.map((item, idx) => {
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500'];
                return (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-400">{item.range}</span>
                      <span className="text-sm font-medium text-white">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${colors[idx % colors.length]}/50 rounded-full`}
                        style={{
                          width: `${
                            stats.progressDistribution.length > 0
                              ? (item.count / Math.max(...stats.progressDistribution.map(d => d.count), 1)) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Top Courses */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Courses</h3>
          <div className="space-y-3">
            {stats?.topCourses && stats.topCourses.length > 0 ? (
              stats.topCourses.map((course, idx) => (
                <div key={idx} className="p-3 bg-gray-800/50 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-white text-sm line-clamp-1">{course.title}</span>
                    <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{course.enrollments} students</span>
                  </div>
                  <div className="text-xs text-gray-500">{formatCurrency(course.revenue)}</div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Enrollments */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Recent Enrollments</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {stats?.recentEnrollments && stats.recentEnrollments.length > 0 ? (
              stats.recentEnrollments.slice(0, 10).map((enrollment, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{enrollment.userName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{enrollment.userEmail}</p>
                      <p className="text-xs text-gray-500 mt-1">{enrollment.courseName}</p>
                    </div>
                    <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">No recent enrollments</div>
            )}
          </div>
        </div>

        {/* Top Performing Courses */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white">Top Performing Courses</h3>
          </div>
          <div className="divide-y divide-gray-800">
            {stats?.topCourses && stats.topCourses.length > 0 ? (
              stats.topCourses.slice(0, 10).map((course, idx) => (
                <div key={idx} className="p-4 hover:bg-gray-800/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{course.title}</p>
                      <div className="flex gap-4 mt-2 text-xs">
                        <span className="text-gray-400">
                          📚 {course.enrollments} {course.enrollments === 1 ? 'student' : 'students'}
                        </span>
                        <span className="text-green-400">{formatCurrency(course.revenue)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm">No courses available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
