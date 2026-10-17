'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Search, Users, Clock, TrendingUp, ArrowRight, Loader, ChevronRight, Flag, Plus, Trash2, Edit2, X, Check, Award, FileSpreadsheet, Upload, Download, Copy, AlertCircle, FileText, Link as LinkIcon } from 'lucide-react';

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

  // Bulk Import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkCourseId, setBulkCourseId] = useState('');
  const [bulkLevel, setBulkLevel] = useState('beginner');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<{
    totalRows: number;
    validRows: number;
    sample: any[];
    columns: string[];
  } | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    imported: number;
    updated: number;
    skipped: number;
    total: number;
    errors: string[];
    message: string;
  } | null>(null);

  // All courses cache for modal
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Fetch all recorded courses (for bulk & add student dropdowns)
  const fetchAllCourses = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/recorded-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.courses)) {
        setAllCourses(data.courses);
      }
    } catch (err) {
      console.error('Error fetching all courses:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchAllCourses();
  }, [fetchAllCourses]);

  const handleCopyEnquiryLink = () => {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/enquiry` : 'https://swaryoga.com/enquiry';
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setMessage({
      type: 'success',
      text: `All-in-One Workshop Enquiry link copied to clipboard: ${url}. Anyone can view & enquire about any added workshop!`,
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      'Name,Email,Phone,Level\n' +
      'Rahul Sharma,rahul.sharma@example.com,9876543210,beginner\n' +
      'Priya Patel,priya.patel@example.com,9123456780,intermediate\n' +
      'Amit Verma,amit.verma@example.com,9988776655,advanced\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'swaryoga_students_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkResult(null);

    try {
      setBulkLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('action', 'preview');
      formData.append('courseId', bulkCourseId || selectedCourseId || (courses[0]?._id || allCourses[0]?._id || ''));
      formData.append('level', bulkLevel);

      const res = await fetch('/api/admin/e-learning/enrollments/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkPreview(data);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to parse file preview' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error parsing file' });
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExecuteBulkImport = async () => {
    if (!token || !bulkFile) {
      setMessage({ type: 'error', text: 'Please choose an Excel or CSV file first' });
      return;
    }
    const targetCourse = bulkCourseId || selectedCourseId || (courses[0]?._id || allCourses[0]?._id || '');
    if (!targetCourse) {
      setMessage({ type: 'error', text: 'Please select a Course / Workshop for enrollment' });
      return;
    }

    try {
      setBulkLoading(true);
      setBulkResult(null);
      const formData = new FormData();
      formData.append('file', bulkFile);
      formData.append('action', 'import');
      formData.append('courseId', targetCourse);
      formData.append('level', bulkLevel);

      const res = await fetch('/api/admin/e-learning/enrollments/bulk', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkResult(data);
        setMessage({
          type: 'success',
          text: `Bulk Import Completed: ${data.imported} new enrolled, ${data.updated} updated, ${data.skipped} skipped.`,
        });
        fetchEnrollments();
      } else {
        setMessage({ type: 'error', text: data.error || 'Bulk import failed' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error executing bulk import' });
    } finally {
      setBulkLoading(false);
    }
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

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleCopyEnquiryLink}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all duration-200 hover:scale-105 shadow-md active:scale-95 text-sm"
              title="Copy public all-in-one enquiry form URL that dynamically lists all active workshops"
            >
              {copiedLink ? <Check size={18} /> : <LinkIcon size={18} />}
              {copiedLink ? 'Copied Form Link!' : 'Copy Form Link'}
            </button>
            <button
              onClick={() => {
                setBulkCourseId(selectedCourseId || (courses[0]?._id || allCourses[0]?._id || ''));
                setShowBulkModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-lg transition-all"
              title="Bulk import students from Excel (.xlsx, .xls) or CSV"
            >
              <FileSpreadsheet size={18} />
              Bulk Import (Excel / CSV)
            </button>
            <Link
              href="/admin/crm/e-learning/results"
              className="flex items-center gap-2 px-5 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded-xl border border-amber-500/40 shadow-lg transition-all"
              title="View student results, daily tasks, and question answers in bulk"
            >
              <Award size={18} />
              Results & Tasks Hub
            </Link>
            <button
              onClick={() => {
                setNewStudentCourseId(selectedCourseId || (courses[0]?._id || allCourses[0]?._id || ''));
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-lg transition-all"
            >
              <Plus size={18} />
              Add New Student
            </button>
          </div>
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
                    {(courses.length > 0 ? courses : allCourses).map(c => (
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

      {/* BULK IMPORT STUDENTS MODAL (EXCEL / CSV) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Bulk Import Students</h2>
                  <p className="text-xs text-gray-400">Upload Excel (.xlsx, .xls) or CSV to enroll multiple students</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkFile(null);
                  setBulkPreview(null);
                  setBulkResult(null);
                }} 
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Target Course & Default Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-950/60 p-4 rounded-xl border border-gray-800">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Target Workshop / Course *
                  </label>
                  <select
                    value={bulkCourseId}
                    onChange={(e) => setBulkCourseId(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
                  >
                    <option value="">-- Choose Course / Workshop --</option>
                    {(courses.length > 0 ? courses : allCourses).map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.content?.en?.title || c.slug}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">If file has &apos;Course&apos; column, it will take precedence.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                    Default Level
                  </label>
                  <select
                    value={bulkLevel}
                    onChange={(e) => setBulkLevel(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none text-sm"
                  >
                    <option value="beginner">Level 1: Beginner</option>
                    <option value="intermediate">Level 2: Intermediate</option>
                    <option value="advanced">Level 3: Advanced</option>
                    <option value="master">Level 4: Master / Sadhak</option>
                  </select>
                  <p className="text-[11px] text-gray-500 mt-1">Applied if &apos;Level&apos; column is not specified.</p>
                </div>
              </div>

              {/* Download Sample Template & Instructions */}
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-400 shrink-0" />
                  <span>Columns supported: <strong>Name</strong>, <strong>Email</strong>, <strong>Phone</strong>, <strong>Level</strong></span>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all shrink-0"
                >
                  <Download size={13} />
                  Download Sample CSV
                </button>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5">
                  Select File (.xlsx, .xls, .csv)
                </label>
                <div className="border-2 border-dashed border-gray-700 hover:border-blue-500/60 rounded-xl p-6 text-center bg-black/40 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleBulkFileSelected}
                    className="hidden"
                    id="bulk-student-file-input"
                  />
                  <label htmlFor="bulk-student-file-input" className="cursor-pointer flex flex-col items-center">
                    <Upload size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm font-medium text-white mb-1">
                      {bulkFile ? bulkFile.name : 'Click to browse or drop your spreadsheet here'}
                    </span>
                    <span className="text-xs text-gray-500">
                      Supports Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                    </span>
                  </label>
                </div>
              </div>

              {/* Loading State */}
              {bulkLoading && (
                <div className="flex items-center justify-center gap-3 py-4 text-blue-400 text-sm">
                  <Loader size={18} className="animate-spin" />
                  <span>Processing file rows...</span>
                </div>
              )}

              {/* Preview Table */}
              {bulkPreview && !bulkResult && (
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 border-b border-gray-800 pb-2">
                    <span className="text-white font-semibold">File Preview</span>
                    <div className="flex items-center gap-3">
                      <span>Total Rows: <strong className="text-white">{bulkPreview.totalRows}</strong></span>
                      <span>Valid: <strong className="text-green-400">{bulkPreview.validRows}</strong></span>
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs text-gray-300">
                      <thead className="text-gray-500 border-b border-gray-800">
                        <tr>
                          <th className="py-1.5 px-2">#</th>
                          <th className="py-1.5 px-2">Name</th>
                          <th className="py-1.5 px-2">Email</th>
                          <th className="py-1.5 px-2">Phone</th>
                          <th className="py-1.5 px-2">Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900">
                        {bulkPreview.sample.map((row: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-900/50">
                            <td className="py-1.5 px-2 text-gray-500">{row.rowIndex}</td>
                            <td className="py-1.5 px-2 font-medium text-white">{row.name || '—'}</td>
                            <td className="py-1.5 px-2 font-mono text-gray-300">{row.email || <span className="text-red-400">Missing Email</span>}</td>
                            <td className="py-1.5 px-2">{row.phone || '—'}</td>
                            <td className="py-1.5 px-2 capitalize">{row.level || bulkLevel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Results & Errors */}
              {bulkResult && (
                <div className="p-4 rounded-xl border bg-green-500/10 border-green-500/30 text-green-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-green-400">
                    <Check size={18} />
                    {bulkResult.message}
                  </div>
                  <div className="text-xs text-gray-300 flex items-center gap-4">
                    <span>Enrolled: <strong>{bulkResult.imported}</strong></span>
                    <span>Updated: <strong>{bulkResult.updated}</strong></span>
                    <span>Skipped: <strong>{bulkResult.skipped}</strong></span>
                  </div>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-red-300 space-y-1 max-h-32 overflow-y-auto">
                      <div className="font-semibold text-red-400">Skipped Row Details:</div>
                      {bulkResult.errors.map((err, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{err}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkFile(null);
                    setBulkPreview(null);
                    setBulkResult(null);
                  }}
                  className="px-4 py-2 text-gray-400 hover:text-white text-sm"
                >
                  {bulkResult ? 'Close' : 'Cancel'}
                </button>
                {!bulkResult && (
                  <button
                    type="button"
                    onClick={handleExecuteBulkImport}
                    disabled={bulkLoading || !bulkFile}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50 transition"
                  >
                    {bulkLoading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                    Import {bulkPreview ? `${bulkPreview.validRows} Students` : 'Students'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
