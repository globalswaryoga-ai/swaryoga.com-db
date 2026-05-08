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
    en: { title: string; subtitle?: string; description?: string; language?: string };
  };
  thumbnail?: string;
  level: string;
  totalVideos?: number;
  totalDuration?: number;
  pricing: {
    INR?: { price: number; originalPrice?: number };
    NPR?: { price: number; originalPrice?: number };
    USD?: { price: number; originalPrice?: number };
  };
  discount?: number;
  promoCode?: string;
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

  // Form fields
  const [title, setTitle] = useState('');
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
          setDescription(c.content?.en?.description || '');
          setLanguage(c.content?.en?.language || 'en');
          setLevel(c.level || 'beginner');
          setThumbnail(c.thumbnail || '');
          setTotalVideos(String(c.totalVideos || 0));
          setDuration(String(c.totalDuration || 0));
          setPriceINR(String(c.pricing?.INR?.price || 0));
          setPriceNPR(String(c.pricing?.NPR?.price || 0));
          setPriceUSD(String(c.pricing?.USD?.price || 0));
          setDiscount(String(c.discount || 0));
          setPromoCode(c.promoCode || '');
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
    if (!token || !title) {
      setError('Workshop name is required');
      return;
    }

    setSaving(true);
    setError(null);

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
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.refresh();
        router.push('/admin/crm/e-learning');
      } else {
        setError(data.error || 'Failed to save course');
      }
    } catch (err) {
      setError('Error saving course: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin/crm/e-learning"
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Edit Workshop</h1>
            <p className="text-sm text-gray-400">{course?.content?.en?.title}</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900/50 rounded-2xl border border-gray-800 p-8 space-y-6 max-h-[80vh] overflow-y-auto">
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
              <label className="block text-sm font-medium text-green-400 mb-2">Current Slug</label>
              <input
                type="text"
                value={course?.slug || ''}
                disabled
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 cursor-not-allowed"
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
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Duration (days)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="7"
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

                {/* Price Preview */}
                {parseInt(priceINR) > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4 mt-6 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-3">Final Price Preview (INR):</p>
                    <div className="flex items-center gap-4 justify-center">
                      {parseInt(discount) > 0 ? (
                        <>
                          {/* Original Price - Strikethrough */}
                          <span className="text-gray-400 line-through text-lg">
                            ₹{parseInt(priceINR).toLocaleString()}
                          </span>
                          {/* Separator */}
                          <span className="text-gray-600">→</span>
                          {/* Final Price - Red & Bold */}
                          <span className="text-3xl font-bold text-red-500">
                            ₹{Math.round(parseInt(priceINR) * (1 - parseInt(discount) / 100)).toLocaleString()}
                          </span>
                          {/* Discount Badge */}
                          <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded text-sm font-semibold">
                            {discount}% OFF
                          </span>
                        </>
                      ) : (
                        <span className="text-3xl font-bold text-green-500">
                          ₹{parseInt(priceINR).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-6 border-t border-gray-700">
            <Link
              href="/admin/crm/e-learning"
              className="flex-1 px-4 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors text-center font-medium"
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
