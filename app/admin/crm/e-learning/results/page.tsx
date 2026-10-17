'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  Award,
  FileText,
  CheckSquare,
  HelpCircle,
  User,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Save,
  Trash2,
  AlertCircle,
  ExternalLink,
  Users,
} from 'lucide-react';

interface StudentInfo {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  country?: string;
  state?: string;
  profession?: string;
}

interface SubmissionItem {
  _id: string;
  id: string;
  assignmentId: string;
  userId: StudentInfo;
  courseId: string;
  courseTitle: string;
  title: string;
  subType: 'assignment' | 'task' | 'question' | string;
  status: string;
  submittedAt: string;
  score: number | null;
  total: number;
  passingPoints: number;
  passed: boolean;
  answers: Record<string, any>;
  checklist: Array<{ id: string; text: string; checked: boolean }>;
  feedback: string;
  grade?: string | null;
  assignmentDetails?: any;
}

interface StatsData {
  totalSubmissions: number;
  totalQuizzes: number;
  totalTasks: number;
  totalQuestions: number;
  passedCount: number;
  uniqueStudents: number;
}

export default function StudentResultsHubPage() {
  const token = useAuth();

  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [stats, setStats] = useState<StatsData>({
    totalSubmissions: 0,
    totalQuizzes: 0,
    totalTasks: 0,
    totalQuestions: 0,
    passedCount: 0,
    uniqueStudents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [subTypeFilter, setSubTypeFilter] = useState<'all' | 'assignment' | 'task' | 'question'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [coursesList, setCoursesList] = useState<Array<{ id: string; title: string }>>([]);

  // Expanded items & grading
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingFeedback, setEditingFeedback] = useState<Record<string, string>>({});
  const [editingScore, setEditingScore] = useState<Record<string, string>>({});
  const [editingStatus, setEditingStatus] = useState<Record<string, string>>({});
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      setError(null);

      const params = new URLSearchParams();
      if (courseFilter !== 'all') params.append('courseId', courseFilter);
      if (subTypeFilter !== 'all') params.append('subType', subTypeFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/admin/e-learning/assignment-submissions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load submissions');
      }

      setSubmissions(data.submissions || []);
      if (data.stats) {
        setStats(data.stats);
      }

      // Collect unique courses for filter dropdown
      const courseMap = new Map<string, string>();
      (data.submissions || []).forEach((s: SubmissionItem) => {
        if (s.courseId && s.courseTitle) {
          courseMap.set(s.courseId, s.courseTitle);
        }
      });
      const uniqueCourses = Array.from(courseMap.entries()).map(([id, title]) => ({ id, title }));
      setCoursesList(uniqueCourses);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading submissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, courseFilter, subTypeFilter, statusFilter, searchQuery]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Handle Review / Grade update
  const handleSaveReview = async (submission: SubmissionItem) => {
    if (!token) return;
    setSavingReviewId(submission.id);
    try {
      const fb = editingFeedback[submission.id] !== undefined ? editingFeedback[submission.id] : submission.feedback;
      const sc = editingScore[submission.id] !== undefined ? Number(editingScore[submission.id]) : submission.score;
      const st = editingStatus[submission.id] || submission.status;

      const res = await fetch('/api/admin/e-learning/assignment-submissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          submissionId: submission.id,
          status: st,
          score: sc,
          feedback: fb,
        }),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to update review');
      }

      setSuccessToast(`Review saved for ${submission.userId.name || 'student'}`);
      setTimeout(() => setSuccessToast(null), 3000);

      // Update locally
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submission.id
            ? { ...s, status: st, score: sc, feedback: fb }
            : s
        )
      );
    } catch (err: any) {
      alert('Error updating review: ' + err.message);
    } finally {
      setSavingReviewId(null);
    }
  };

  // Handle Delete / Reset
  const handleDeleteSubmission = async (submissionId: string) => {
    if (!token || !confirm('Reset or delete this submission record?')) return;
    try {
      const res = await fetch(`/api/admin/e-learning/assignment-submissions?id=${submissionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert('No submissions to export');
      return;
    }

    const headers = [
      'Submission ID',
      'Student Name',
      'Student Email',
      'Student Phone',
      'Workshop Title',
      'Type',
      'Item Title',
      'Score',
      'Total Points',
      'Passed',
      'Status',
      'Submitted At',
      'Feedback',
    ];

    const rows = submissions.map((s) => [
      `"${s.id}"`,
      `"${s.userId.name || ''}"`,
      `"${s.userId.email || ''}"`,
      `"${s.userId.phone || ''}"`,
      `"${s.courseTitle || ''}"`,
      `"${s.subType}"`,
      `"${s.title.replace(/"/g, '""')}"`,
      s.score !== null ? s.score : '',
      s.total || '',
      s.passed ? 'YES' : 'NO',
      `"${s.status}"`,
      `"${new Date(s.submittedAt).toLocaleString()}"`,
      `"${(s.feedback || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `swar_student_results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helpers
  const formatTimeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 md:p-8">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-black px-5 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={20} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/crm/e-learning"
                className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                title="Back to Workshops"
              >
                <ArrowLeft size={20} />
              </Link>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-black font-extrabold shadow-lg shadow-amber-500/20">
                  <Award size={22} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Student Results, Tasks & Questions Hub
                  </h1>
                  <p className="text-sm text-gray-400">
                    Review and grade all student submissions in bulk across all courses and workshops.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => fetchSubmissions()}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-200 text-sm font-semibold rounded-xl border border-gray-700/80 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-emerald-400' : ''} />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-sm font-semibold rounded-xl border border-emerald-500/40 transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <Link
              href="/admin/crm/e-learning/users"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/10"
            >
              <Users size={16} />
              <span>Manage Students</span>
            </Link>
          </div>
        </div>

        {/* 5 Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Submissions</span>
              <FileText size={16} className="text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">{stats.totalSubmissions}</div>
            <div className="text-xs text-gray-500 mt-1">{stats.uniqueStudents} active students</div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Quizzes / Exams</span>
              <Award size={16} className="text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">{stats.totalQuizzes}</div>
            <div className="text-xs text-emerald-400 mt-1">
              {stats.totalQuizzes > 0
                ? `${Math.round((stats.passedCount / stats.totalSubmissions) * 100)}% Pass Rate`
                : 'No quizzes yet'}
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Daily Tasks</span>
              <CheckSquare size={16} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">{stats.totalTasks}</div>
            <div className="text-xs text-gray-500 mt-1">Checklists completed</div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Questions</span>
              <HelpCircle size={16} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black text-blue-400">{stats.totalQuestions}</div>
            <div className="text-xs text-gray-500 mt-1">Short / Paragraph answers</div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Passed / Completed</span>
              <CheckCircle2 size={16} className="text-teal-400" />
            </div>
            <div className="text-2xl font-black text-teal-400">{stats.passedCount}</div>
            <div className="text-xs text-gray-500 mt-1">Verified successful</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6 bg-gray-900/80 border border-gray-800 rounded-2xl p-4 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, email, phone, or assignment title..."
              className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-gray-700/80 rounded-xl text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Type Pills */}
          <div className="flex items-center gap-1.5 bg-black/50 p-1 rounded-xl border border-gray-800 overflow-x-auto">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'assignment', label: 'Quizzes / Assignments' },
              { id: 'task', label: 'Daily Tasks' },
              { id: 'question', label: 'Questions' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  subTypeFilter === tab.id
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Workshop Filter */}
          {coursesList.length > 0 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="px-3 py-2 bg-black/60 border border-gray-700/80 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
            >
              <option value="all">All Workshops ({coursesList.length})</option>
              {coursesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-black/60 border border-gray-700/80 rounded-xl text-xs text-white focus:border-amber-500 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="passed">Passed</option>
            <option value="completed">Completed</option>
            <option value="submitted">Submitted</option>
            <option value="graded">Graded</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Loading student results and submissions...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-2xl text-red-400 text-center">
            <AlertCircle size={32} className="mx-auto mb-2 text-red-400" />
            <p className="font-semibold">{error}</p>
            <button
              onClick={() => fetchSubmissions()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-semibold"
            >
              Try Again
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-gray-900/40 border border-dashed border-gray-800 rounded-2xl py-20 px-6 text-center">
            <Award size={48} className="mx-auto mb-3 text-gray-600" />
            <h3 className="text-lg font-bold text-gray-300">No submissions found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              No student submissions or task completions match your current filters. When students submit quizzes, mark daily tasks as complete, or answer questions, they will appear right here in bulk.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id;
              const hasAnswers = sub.answers && Object.keys(sub.answers).length > 0;
              const hasChecklist = Array.isArray(sub.checklist) && sub.checklist.length > 0;

              return (
                <div
                  key={sub.id}
                  className={`bg-gray-900/60 border rounded-2xl transition-all overflow-hidden ${
                    isExpanded ? 'border-amber-500/40 shadow-xl shadow-amber-500/5' : 'border-gray-800/90 hover:border-gray-700'
                  }`}
                >
                  {/* Card Header / Summary Row */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Student Info & Assignment Title */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-gray-800 to-gray-700 flex items-center justify-center text-white font-bold text-base shrink-0 border border-gray-700">
                        {sub.userId.name ? sub.userId.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/crm/e-learning/users/${sub.userId._id}`}
                            className="font-bold text-base text-white hover:text-amber-400 transition-colors flex items-center gap-1 group"
                          >
                            <span>{sub.userId.name || 'Student'}</span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>

                          {sub.userId.email && (
                            <span className="text-xs text-gray-400">({sub.userId.email})</span>
                          )}

                          {sub.userId.phone && (
                            <span className="text-xs text-gray-500">• {sub.userId.phone}</span>
                          )}
                        </div>

                        {/* Title and Workshop */}
                        <div className="mt-1 flex items-center gap-2 flex-wrap text-xs">
                          <span className="text-gray-300 font-semibold">{sub.title}</span>
                          <span className="text-gray-500">•</span>
                          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-medium">
                            {sub.courseTitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Badges & Actions */}
                    <div className="flex items-center gap-3 flex-wrap justify-between lg:justify-end">
                      {/* Type Badge */}
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${
                          sub.subType === 'task'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : sub.subType === 'question'
                            ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                            : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {sub.subType === 'task' ? (
                          <>
                            <CheckSquare size={13} />
                            <span>Daily Task</span>
                          </>
                        ) : sub.subType === 'question' ? (
                          <>
                            <HelpCircle size={13} />
                            <span>Questions</span>
                          </>
                        ) : (
                          <>
                            <Award size={13} />
                            <span>Quiz / Exam</span>
                          </>
                        )}
                      </span>

                      {/* Status / Score Pill */}
                      {sub.subType === 'assignment' || sub.score !== null ? (
                        <div
                          className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                            sub.passed || (sub.score !== null && sub.score >= sub.passingPoints)
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-950/40 text-red-400 border-red-500/30'
                          }`}
                        >
                          {sub.passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          <span>
                            {sub.score !== null ? `${sub.score} / ${sub.total} pts` : sub.status}
                          </span>
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-950/40 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                          <CheckCircle2 size={13} />
                          <span className="capitalize">{sub.status.replace('_', ' ')}</span>
                        </div>
                      )}

                      {/* Submission Timestamp */}
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        <span>{formatTimeAgo(sub.submittedAt)}</span>
                      </div>

                      {/* Expand Button */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 ${
                          isExpanded
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-md'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
                        }`}
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Answers & Review'}</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content Drawer */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 bg-black/40 p-5 sm:p-6 space-y-6 animate-fadeIn">
                      {/* Section 1: Detailed Answers or Checklist */}
                      {sub.subType === 'task' || hasChecklist ? (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <CheckSquare size={16} className="text-emerald-400" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                              Task Todo Checklist Progress
                            </h4>
                          </div>

                          <div className="space-y-2 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                            {sub.checklist && sub.checklist.length > 0 ? (
                              sub.checklist.map((item, idx) => (
                                <div
                                  key={item.id || idx}
                                  className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs ${
                                    item.checked
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                                      : 'bg-gray-800/40 border-gray-800 text-gray-400'
                                  }`}
                                >
                                  <div
                                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 font-bold ${
                                      item.checked ? 'bg-emerald-500 text-black' : 'border border-gray-600'
                                    }`}
                                  >
                                    {item.checked ? '✓' : ''}
                                  </div>
                                  <span className={`flex-1 ${item.checked ? 'line-through opacity-80' : ''}`}>
                                    {item.text}
                                  </span>
                                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-gray-800">
                                    {item.checked ? 'Completed' : 'Pending'}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400 italic">No checklist items recorded.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={16} className="text-blue-400" />
                            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                              Submitted Answers & Replies
                            </h4>
                          </div>

                          <div className="space-y-3">
                            {hasAnswers ? (
                              Object.entries(sub.answers).map(([qKey, aVal], idx) => {
                                // Find question definition if available
                                const qDef = sub.assignmentDetails?.content?.questions?.find(
                                  (q: any) => q.id === qKey
                                );

                                return (
                                  <div
                                    key={qKey}
                                    className="bg-gray-900/70 p-4 rounded-xl border border-gray-800 space-y-2"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2">
                                        <span className="w-5 h-5 rounded-full bg-gray-800 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                                          {idx + 1}
                                        </span>
                                        <p className="text-xs font-bold text-gray-200">
                                          {qDef?.prompt || `Question ${idx + 1}`}
                                        </p>
                                      </div>
                                      {qDef?.points && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-amber-400 font-semibold shrink-0">
                                          {qDef.points} pts
                                        </span>
                                      )}
                                    </div>

                                    {/* Student Answer */}
                                    <div className="pl-7">
                                      <p className="text-[11px] font-semibold text-gray-400 mb-0.5">Student's Answer:</p>
                                      <div className="p-2.5 bg-black/60 rounded-lg border border-gray-700/60 text-xs text-emerald-300 font-medium">
                                        {Array.isArray(aVal) ? aVal.join(', ') : String(aVal || 'No answer provided')}
                                      </div>

                                      {/* Correct Answer if available */}
                                      {qDef?.correctAnswer && (
                                        <div className="mt-1.5 text-[11px] text-gray-400 flex items-center gap-1.5">
                                          <span className="text-gray-500">Correct Key:</span>
                                          <span className="text-amber-400 font-semibold">
                                            {Array.isArray(qDef.correctAnswer)
                                              ? qDef.correctAnswer.join(', ')
                                              : String(qDef.correctAnswer)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-gray-400 italic">No detailed answers recorded.</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section 2: Review, Score, & Teacher Feedback */}
                      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                            <Award size={14} /> Teacher Review & Feedback
                          </h4>
                          <span className="text-[11px] text-gray-400">
                            Student ID: <code className="text-gray-300">{sub.userId._id}</code>
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {/* Score field */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                              Score Points ({sub.total} Max)
                            </label>
                            <input
                              type="number"
                              value={
                                editingScore[sub.id] !== undefined
                                  ? editingScore[sub.id]
                                  : sub.score !== null
                                  ? sub.score
                                  : ''
                              }
                              onChange={(e) =>
                                setEditingScore((prev) => ({ ...prev, [sub.id]: e.target.value }))
                              }
                              placeholder="e.g. 85"
                              className="w-full px-3 py-2 bg-black/60 border border-gray-700 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          {/* Status field */}
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                              Review Status
                            </label>
                            <select
                              value={editingStatus[sub.id] || sub.status}
                              onChange={(e) =>
                                setEditingStatus((prev) => ({ ...prev, [sub.id]: e.target.value }))
                              }
                              className="w-full px-3 py-2 bg-black/60 border border-gray-700 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none"
                            >
                              <option value="passed">Passed</option>
                              <option value="completed">Completed</option>
                              <option value="submitted">Submitted</option>
                              <option value="graded">Graded</option>
                              <option value="needs_revision">Needs Revision</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>

                          {/* Action Button */}
                          <div className="flex items-end">
                            <button
                              onClick={() => handleSaveReview(sub)}
                              disabled={savingReviewId === sub.id}
                              className="w-full px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                            >
                              <Save size={14} />
                              <span>{savingReviewId === sub.id ? 'Saving...' : 'Save Review'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Feedback Textarea */}
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                            Teacher Feedback Note (Visible to Student)
                          </label>
                          <textarea
                            rows={2}
                            value={
                              editingFeedback[sub.id] !== undefined
                                ? editingFeedback[sub.id]
                                : sub.feedback || ''
                            }
                            onChange={(e) =>
                              setEditingFeedback((prev) => ({ ...prev, [sub.id]: e.target.value }))
                            }
                            placeholder="Add your encouragement, corrections, or instructions for the student..."
                            className="w-full px-3 py-2 bg-black/60 border border-gray-700 rounded-lg text-xs text-white focus:border-amber-500 focus:outline-none"
                          />
                        </div>

                        {/* Reset / Delete submission */}
                        <div className="pt-2 flex justify-between items-center text-xs border-t border-gray-800">
                          <span className="text-gray-500">
                            Submitted: {new Date(sub.submittedAt).toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleDeleteSubmission(sub.id)}
                            className="text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                            title="Reset this submission record"
                          >
                            <Trash2 size={12} />
                            <span>Reset Submission</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
