'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import Link from 'next/link';

interface Course {
  _id: string;
  slug: string;
  content: {
    en: { title: string; subtitle?: string; description?: string };
  };
  level: string;
  pricing: {
    INR: { price: number; originalPrice?: number };
  };
  isFree: boolean;
  isPublished: boolean;
  isActive: boolean;
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState('beginner');
  const [price, setPrice] = useState('0');
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    if (!token || !courseId) return;

    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/recorded-courses?id=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (data.success && data.course) {
          const c = data.course;
          setCourse(c);
          setTitle(c.content?.en?.title || '');
          setSubtitle(c.content?.en?.subtitle || '');
          setDescription(c.content?.en?.description || '');
          setLevel(c.level || 'beginner');
          setPrice(String(c.pricing?.INR?.price || 0));
          setIsFree(c.isFree || false);
        } else {
          setError('Failed to load course');
        }
      } catch (err) {
        setError('Error loading course');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [token, courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title) return;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/recorded-courses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId,
          content: {
            en: {
              title,
              subtitle,
              description,
            },
          },
          level,
          pricing: {
            INR: {
              price: isFree ? 0 : parseInt(price) || 0,
            },
          },
          isFree,
        }),
      });

      if (res.ok) {
        // Refresh server data and redirect back to courses list
        router.refresh();
        router.push('/admin/crm/e-learning');
      } else {
        setError('Failed to save course');
      }
    } catch (err) {
      setError('Error saving course');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/crm/e-learning"
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-white">Edit Course</h1>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900/50 rounded-2xl border border-gray-800 p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Course Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="Enter course title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
              placeholder="Enter course subtitle"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-green-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
              placeholder="Enter course description"
              rows={5}
            />
          </div>

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

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
                className="w-5 h-5 rounded border-gray-600 bg-black text-green-500 focus:ring-green-500"
              />
              Free Course
            </label>
          </div>

          {!isFree && (
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="0"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Link
              href="/admin/crm/e-learning"
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors text-center"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
