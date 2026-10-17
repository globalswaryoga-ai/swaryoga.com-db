'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Clock, TrendingUp, ArrowRight, Loader, ChevronRight, Flag, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

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

interface LanguageFolder {
  _id: string;
  code: string;
  name: string;
  headline?: string;
  flag?: string;
  thumbnail?: string;
  isActive?: boolean;
}

interface Course {
  _id: string;
  slug: string;
  content: { en: { title: string } };
  level: string;
  thumbnail?: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧', hi: '🇮🇳', ne: '🇳🇵', mr: '🇮🇳', gu: '🇮🇳', ta: '🇮🇳', te: '🇮🇳',
  es: '🇪🇸', fr: '🇫🇷', de: '🇩🇪', pt: '🇵🇹', ar: '🇸🇦', ja: '🇯🇵', ko: '🇰🇷',
  ru: '🇷🇺', it: '🇮🇹', tr: '🇹🇷', nl: '🇳🇱', sv: '🇸🇪', th: '🇹🇭', id: '🇮🇩', zh: '🇨🇳'
};

export default function ELearningUsersPage() {
  const router = useRouter();
  const token = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Hierarchical navigation state
  const [folders, setFolders] = useState<LanguageFolder[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [hierarchyLoading, setHierarchyLoading] = useState(false);

  // Student management modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New Student Form State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentCourseId, setNewStudentCourseId] = useState('');
  const [newStudentLevel, setNewStudentLevel] = useState('beginner');

  // Edit Student Form State
  const [editLevel, setEditLevel] = useState('beginner');
  const [editStatus, setEditStatus] = useState('active');
  const [editProgress, setEditProgress] = useState(0);

  // Fetch language folders
  const fetchFolders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/admin/language-folders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders || []);
      }
    } catch (err) {
      console.error('Error fetching folders:', err);
    }
  }, [token]);

  // Fetch courses for selected folder
  const fetchCourses = useCallback(async (folderId: string) => {
    if (!token || !folderId) return;
    try {
      setHierarchyLoading(true);
      const res = await fetch(`/api/admin/recorded-courses?folderId=${folderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setHierarchyLoading(false);
    }
  }, [token]);

  // Fetch enrollments for selected course or all
  const fetchEnrollments = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (search) params.append('search', search);
      if (selectedCourseId) params.append('courseId', selectedCourseId);

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
  }, [token, page, search, selectedCourseId]);

  // Load folders on mount
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Load courses when folder is selected
  useEffect(() => {
    if (selectedFolderId) {
      fetchCourses(selectedFolderId);
    }
  }, [selectedFolderId, fetchCourses]);

  // Load enrollments when course is selected or search changes
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

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newStudentEmail || !newStudentCourseId) {
      setMessage({ type: 'error', text: 'Email and Course are required' });
      return;
    }

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch('/api/admin/e-learning/enrollments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newStudentName,
          email: newStudentEmail,
          phone: newStudentPhone,
          courseId: newStudentCourseId,
          level: newStudentLevel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Student enrolled! ${data.generatedPassword ? `Auto-generated Password: ${data.generatedPassword}` : ''}` });
        setShowAddModal(false);
        setNewStudentName('');
        setNewStudentEmail('');
        setNewStudentPhone('');
        fetchEnrollments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to add student' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error adding student' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedEnrollment) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch('/api/admin/e-learning/enrollments', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          enrollmentId: selectedEnrollment._id,
          status: editStatus,
          progressPercent: Number(editProgress),
          level: editLevel,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Student details updated successfully!' });
        setShowEditModal(false);
        setSelectedEnrollment(null);
        fetchEnrollments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update student' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating student' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStudent = async (enrollmentId: string, studentName: string) => {
    if (!token) return;
    if (!window.confirm(`Are you sure you want to remove ${studentName || 'this student'} from the course?`)) return;

    try {
      setActionLoading(true);
      setMessage(null);
      const res = await fetch(`/api/admin/e-learning/enrollments?id=${enrollmentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Student removed from course successfully!' });
        fetchEnrollments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete student' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error deleting student' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">E-Learning Students</h1>
              <p className="text-sm text-gray-400">Add, edit levels, manage progress, or remove students</p>
            </div>
          </div>

          <button
            onClick={() => {
              setNewStudentCourseId(selectedCourseId || (courses[0]?._id || ''));
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-lg transition-all"
          >
            <Plus size={18} />
            Add New Student
          </button>
        </div>

        {message && (
          <div className={`p-4 rounded-xl mb-4 border ${
            message.type === 'success' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

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

      {/* HIERARCHICAL NAVIGATION SECTION */}
      {/* Step 1: Language Folders */}
      {!selectedFolderId ? (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Select Language</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {folders.map((folder) => (
              <button
                key={folder._id}
                onClick={() => setSelectedFolderId(folder._id)}
                className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-green-500/50 hover:bg-gray-900 transition-all"
              >
                <div className="text-3xl mb-2">{LANGUAGE_FLAGS[folder.code] || '🌍'}</div>
                <div className="text-sm font-semibold text-white">{folder.name}</div>
              </button>
            ))}
          </div>
        </div>
      ) : !selectedCourseId ? (
        // Step 2: Workshops in selected language
        <div className="mb-8">
          <button
            onClick={() => {
              setSelectedFolderId(null);
              setCourses([]);
            }}
            className="mb-4 flex items-center gap-2 text-green-400 hover:text-green-300"
          >
            ← Back to Languages
          </button>
          <h2 className="text-xl font-bold text-white mb-4">
            {folders.find(f => f._id === selectedFolderId)?.name} Workshops
          </h2>
          {hierarchyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-6 h-6 animate-spin text-green-500" />
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 bg-gray-900/50 rounded-xl border border-gray-800">
              <p className="text-gray-400">No workshops in this language</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <button
                  key={course._id}
                  onClick={() => setSelectedCourseId(course._id)}
                  className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:border-green-500/50 hover:bg-gray-900 transition-all text-left"
                >
                  <div className="font-semibold text-white">{course.content.en.title}</div>
                  <div className="text-xs text-gray-400 mt-1">{course.slug}</div>
                  <div className="text-xs text-gray-500 mt-2">{course.level}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Step 3: Enrolled users in selected workshop
        <div className="mb-8">
          <button
            onClick={() => {
              setSelectedCourseId(null);
              setPage(1);
            }}
            className="mb-2 flex items-center gap-2 text-green-400 hover:text-green-300 text-sm"
          >
            ← Back to Workshops
          </button>
          <div className="mb-4 flex items-center gap-2 text-gray-400 text-sm">
            <span>Users</span>
            <ChevronRight size={16} />
            <span>{folders.find(f => f._id === selectedFolderId)?.name}</span>
            <ChevronRight size={16} />
            <span>{courses.find(c => c._id === selectedCourseId)?.content.en.title}</span>
          </div>
        </div>
      )}

      {/* Show stats and enrollments table only in flat view or when course selected */}
      {(selectedCourseId || (!selectedFolderId && !selectedCourseId)) && (
        <>
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
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-x-auto">
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
              {/* Pinned Demo User - only show when course is selected */}
              {selectedCourseId && (
                <tr className="bg-blue-500/10 border-b-2 border-blue-500/30 hover:bg-blue-500/20 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-blue-400">S</span>
                      </div>
                      <div>
                        <p className="font-medium text-white">Swar Sakshi <span className="text-xs text-blue-400">(Demo)</span></p>
                        <p className="text-sm text-gray-400">demo@swarsakshi.com</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-medium text-white">{courses.find(c => c._id === selectedCourseId)?.content.en.title}</p>
                      <p className="text-sm text-gray-500">{courses.find(c => c._id === selectedCourseId)?.slug}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: '0%' }} />
                      </div>
                      <span className="text-sm font-medium text-white">0%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">0m</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      active
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-400">-</p>
                  </td>
                  <td className="px-6 py-4">
                    <button className="inline-flex items-center gap-2 px-3 py-2 bg-gray-700/50 text-gray-400 rounded-lg opacity-50 cursor-not-allowed" disabled>
                      Demo
                    </button>
                  </td>
                </tr>
              )}
              {enrollments.map((enrollment) => {
                // Skip rows where userId or courseId is null
                if (!enrollment.userId || !enrollment.courseId) {
                  return null;
                }
                return (
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedEnrollment(enrollment);
                          setEditStatus(enrollment.status || 'active');
                          setEditProgress(enrollment.progress || 0);
                          setEditLevel(enrollment.courseId?.level || 'beginner');
                          setShowEditModal(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-lg text-xs font-medium transition-colors"
                        title="Edit Student Level & Status"
                      >
                        <Edit2 size={14} />
                        Level
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(enrollment._id, enrollment.userId?.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors"
                        title="Delete Student"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link
                        href={`/admin/crm/e-learning/users/${enrollment.userId._id}?enrollmentId=${enrollment._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors"
                        title="Full Details"
                      >
                        Manage
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
              })}

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
        </>
      )}

      {/* ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-lg p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="text-green-400" size={22} />
                Enroll New Student
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp / Phone</label>
                <input
                  type="tel"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Course / Workshop</label>
                  <select
                    value={newStudentCourseId}
                    onChange={(e) => setNewStudentCourseId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none text-sm"
                    required
                  >
                    <option value="">Select Course...</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.content?.en?.title || c.slug}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Assigned Level</label>
                  <select
                    value={newStudentLevel}
                    onChange={(e) => setNewStudentLevel(e.target.value)}
                    className="w-full px-3 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none text-sm"
                  >
                    <option value="beginner">Level 1: Beginner</option>
                    <option value="intermediate">Level 2: Intermediate</option>
                    <option value="advanced">Level 3: Advanced</option>
                    <option value="master">Level 4: Master / Sadhak</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  Enroll Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT LEVEL & STATUS MODAL */}
      {showEditModal && selectedEnrollment && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="text-yellow-400" size={20} />
                Edit Student Details
              </h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase mb-1">Student</label>
                <p className="text-white font-medium">{selectedEnrollment.userId?.name || selectedEnrollment.userId?._id}</p>
                <p className="text-sm text-gray-400">{selectedEnrollment.userId?.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Change Student Level</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="beginner">Level 1: Beginner</option>
                  <option value="intermediate">Level 2: Intermediate</option>
                  <option value="advanced">Level 3: Advanced</option>
                  <option value="master">Level 4: Master / Sadhak</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Enrollment Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="active">Active (Access Allowed)</option>
                  <option value="completed">Completed</option>
                  <option value="suspended">Suspended (Blocked)</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Course Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editProgress}
                  onChange={(e) => setEditProgress(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
