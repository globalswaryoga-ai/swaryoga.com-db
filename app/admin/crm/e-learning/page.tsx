'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit2, Trash2, Video, Eye, EyeOff, GraduationCap, X, Upload, ShieldAlert, Users } from 'lucide-react';

interface Course {
  _id: string;
  slug: string;
  content: {
    en: { title: string; subtitle?: string; description?: string };
  };
  thumbnail?: string;
  level: string;
  category?: string;
  pricing: {
    INR: { price: number; originalPrice?: number };
  };
  isFree: boolean;
  isPublished: boolean;
  isActive: boolean;
  totalDuration: number;
  videoCount: number;
  enrollmentCount: number;
}

export default function DLearningPage() {
  const router = useRouter();
  const token = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check superadmin status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    let resolvedUserId = localStorage.getItem('adminUser') || '';
    let legacyPerms: string[] = [];
    let pv2: any = null;
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        resolvedUserId = (u?.userId as string) || resolvedUserId;
        legacyPerms = Array.isArray(u?.permissions) ? u.permissions : [];
        pv2 = u?.permissionsV2 || null;
      } catch {
        // ignore
      }
    }
    const superAdmin =
      resolvedUserId === 'admin' ||
      resolvedUserId === 'admincrm' ||
      legacyPerms.includes('all') ||
      pv2?.isSuperAdmin === true;
    setIsSuperAdmin(superAdmin);
    setAuthChecked(true);
  }, [router]);

  const fetchCourses = useCallback(async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch('/api/admin/recorded-courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCourses(data.courses || []);
      } else {
        setError(data.error || 'Failed to load courses');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchCourses();
  }, [token, fetchCourses]);

  // Refetch courses when returning to this page (from edit/etc)
  useEffect(() => {
    const handleRouteChange = () => {
      if (token) fetchCourses();
    };
    window.addEventListener('focus', handleRouteChange);
    return () => window.removeEventListener('focus', handleRouteChange);
  }, [token, fetchCourses]);

  const togglePublish = async (course: Course) => {
    if (!token) return;
    
    try {
      const res = await fetch('/api/admin/recorded-courses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course._id,
          isPublished: !course.isPublished,
        }),
      });
      
      if (res.ok) {
        setCourses(prev =>
          prev.map(c => c._id === course._id ? { ...c, isPublished: !c.isPublished } : c)
        );
      }
    } catch (err) {
      console.error('Toggle publish error:', err);
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!token) {
      alert('❌ Not authenticated. Please log in.');
      return;
    }

    if (!confirm('Delete this course? This cannot be undone.')) return;

    try {
      console.log('🗑️ Deleting course:', courseId);
      console.log('🔑 Token present:', !!token);

      const res = await fetch(`/api/admin/recorded-courses?id=${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log('📡 Response status:', res.status, res.statusText);

      const data = await res.json();
      console.log('📋 Response data:', data);

      if (res.ok && data.success) {
        setCourses(prev => prev.filter(c => c._id !== courseId));
        alert('✅ Course deleted successfully!');
      } else {
        const errorMsg = data.error || `HTTP ${res.status}: ${res.statusText}`;
        console.error('❌ Delete failed:', errorMsg);
        alert('❌ Error: ' + errorMsg);
      }
    } catch (err) {
      console.error('🔥 Delete error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      alert('❌ Network error:\n' + errorMsg);
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  if (!token || !authChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Non-superadmin - show access denied while redirecting
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">E-Learning management requires super admin access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">E-Learning Courses</h1>
            <p className="text-sm text-gray-400">Manage recorded video courses</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/crm/e-learning/users"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-black font-semibold rounded-lg transition-colors"
          >
            <Users size={18} />
            Manage Users
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors"
          >
            <Plus size={18} />
            Add Course
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
          <span className="ml-3 text-gray-400">Loading courses...</span>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg">
          {error}
          <button onClick={fetchCourses} className="ml-4 text-yellow-400 underline hover:no-underline">Retry</button>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-gray-900/50 rounded-2xl border border-gray-800">
          <Video className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Courses Yet</h3>
          <p className="text-gray-400 mb-6">Create your first recorded course</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors"
          >
            Create Course
          </button>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900/80 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Level</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Videos</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Enrolled</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-green-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-green-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {courses.map((course) => (
                <tr key={course._id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-10 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 border border-gray-700">
                        {course.thumbnail ? (
                          <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Video className="w-5 h-5 text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {course.content?.en?.title || course.slug}
                        </p>
                        <p className="text-sm text-gray-500">{course.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      course.level === 'beginner' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                      course.level === 'intermediate' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                      'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {course.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-white">
                    <span className="text-yellow-400 font-semibold">{course.videoCount || 0}</span>
                    <span className="text-gray-500 text-sm ml-1">
                      ({formatDuration(course.totalDuration || 0)})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {course.isFree ? (
                      <span className="text-green-400 font-semibold">Free</span>
                    ) : (
                      <span className="text-white font-medium">₹{course.pricing?.INR?.price || 0}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-yellow-400 font-semibold">{course.enrollmentCount || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => togglePublish(course)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                        course.isPublished
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600 hover:bg-gray-700'
                      }`}
                    >
                      {course.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                      {course.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/admin/crm/e-learning/${course._id}/videos`}
                        className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                        title="Manage Videos"
                      >
                        <Video size={18} />
                      </Link>
                      <Link
                        href={`/admin/crm/e-learning/${course._id}/edit`}
                        className="p-2 hover:bg-yellow-500/20 text-yellow-400 rounded-lg transition-colors"
                        title="Edit Course"
                      >
                        <Edit2 size={18} />
                      </Link>
                      <button
                        onClick={() => deleteCourse(course._id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Course Modal */}
      {showCreateModal && (
        <CreateCourseModal 
          token={token} 
          onClose={() => setShowCreateModal(false)} 
          onCreated={() => {
            setShowCreateModal(false);
            fetchCourses();
          }}
        />
      )}
    </div>
  );
}

function CreateCourseModal({ token, onClose, onCreated }: { token: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');
  const [language, setLanguage] = useState('en');
  const [totalVideos, setTotalVideos] = useState('0');
  const [duration, setDuration] = useState('0');
  const [thumbnail, setThumbnail] = useState('');
  const [priceINR, setPriceINR] = useState('0');
  const [priceNPR, setPriceNPR] = useState('0');
  const [priceUSD, setPriceUSD] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [promoCode, setPromoCode] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !slug) {
      setError('Title and slug are required');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/recorded-courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          content: {
            en: {
              title,
              subtitle: '',
              description,
              language
            }
          },
          level,
          thumbnail,
          totalVideos: parseInt(totalVideos) || 0,
          totalDuration: parseInt(duration) || 0,
          pricing: {
            INR: { price: isFree ? 0 : parseInt(priceINR) || 0 },
            NPR: { price: isFree ? 0 : parseInt(priceNPR) || 0 },
            USD: { price: isFree ? 0 : parseInt(priceUSD) || 0 },
          },
          discount: parseInt(discount) || 0,
          promoCode: promoCode || null,
          isFree,
          isPublished: false,
          isActive: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onCreated();
      } else {
        setError(data.error || 'Failed to create course');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error('Create error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
          <h2 className="text-xl font-bold text-white">Create New Workshop</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Name *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Yoga Fundamentals"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">URL Slug *</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="yoga-fundamentals"
                required
              />
            </div>
          </div>

          {/* Row 2 */}
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Workshop Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Describe your workshop..."
              rows={3}
            />
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="ne">Nepali</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Total Videos</label>
              <input
                type="number"
                value={totalVideos}
                onChange={(e) => setTotalVideos(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Thumbnail URL</label>
              <input
                type="url"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="https://example.com/thumb.jpg"
              />
            </div>
          </div>

          {/* Free Course Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isFree"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
            />
            <label htmlFor="isFree" className="text-white cursor-pointer text-sm font-medium">
              Make this a Free Workshop
            </label>
          </div>

          {/* Pricing Section */}
          {!isFree && (
            <>
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-sm font-semibold text-green-400 mb-4">Pricing</h3>

                {/* Row 5 - Pricing */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price INR (₹)</label>
                    <input
                      type="number"
                      value={priceINR}
                      onChange={(e) => setPriceINR(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price NPR (रु)</label>
                    <input
                      type="number"
                      value={priceNPR}
                      onChange={(e) => setPriceNPR(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Price USD ($)</label>
                    <input
                      type="number"
                      value={priceUSD}
                      onChange={(e) => setPriceUSD(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Row 6 - Discount & Promo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Discount (%)</label>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Promo Code</label>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="SUMMER2024"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Workshop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
