'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import Link from 'next/link';

// All 19 language options
const languageOptions = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
  { code: 'ne', name: 'Nepali', flag: '🇳🇵' },
  { code: 'zh', name: 'Mandarin', flag: '🇨🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'pt', name: 'Portuguese', flag: '🇧🇷' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
];

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

  // Form fields - Multi-language (all 19 languages)
  const [activeLanguage, setActiveLanguage] = useState<string>('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [showVideoLanguageDropdown, setShowVideoLanguageDropdown] = useState(false);
  const [content, setContent] = useState<Record<string, { title: string; subtitle?: string; description?: string }>>({
    en: { title: '', subtitle: '', description: '' },
    hi: { title: '', subtitle: '', description: '' },
    ne: { title: '', subtitle: '', description: '' },
    mr: { title: '', subtitle: '', description: '' },
    zh: { title: '', subtitle: '', description: '' },
    es: { title: '', subtitle: '', description: '' },
    fr: { title: '', subtitle: '', description: '' },
    ar: { title: '', subtitle: '', description: '' },
    de: { title: '', subtitle: '', description: '' },
    pt: { title: '', subtitle: '', description: '' },
    ja: { title: '', subtitle: '', description: '' },
    ko: { title: '', subtitle: '', description: '' },
    ru: { title: '', subtitle: '', description: '' },
    it: { title: '', subtitle: '', description: '' },
    tr: { title: '', subtitle: '', description: '' },
    nl: { title: '', subtitle: '', description: '' },
    sv: { title: '', subtitle: '', description: '' },
    th: { title: '', subtitle: '', description: '' },
    id: { title: '', subtitle: '', description: '' },
  });

  // Load preferred language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('admin_course_edit_language');
    if (savedLang && languageOptions.some(l => l.code === savedLang)) {
      setActiveLanguage(savedLang);
    }
  }, []);

  // Other fields
  const [level, setLevel] = useState('beginner');
  const [videoLanguage, setVideoLanguage] = useState('en');
  const [totalVideos, setTotalVideos] = useState('0');
  const [duration, setDuration] = useState('0');
  const [thumbnail, setThumbnail] = useState('');
  const [priceINR, setPriceINR] = useState('0');
  const [priceNPR, setPriceNPR] = useState('0');
  const [priceUSD, setPriceUSD] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [promoCode, setPromoCode] = useState('');
  const [isFree, setIsFree] = useState(false);

  // Social/Engagement fields
  const [defaultStudents, setDefaultStudents] = useState('15');
  const [likes, setLikes] = useState('10');
  const [rating, setRating] = useState('5.0');

  useEffect(() => {
    if (!token || !courseId) return;

    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/recorded-courses?id=${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        console.log('API Response:', data);
        if (data.success && data.course) {
          const c = data.course;
          console.log('Course data:', c);
          console.log('Course content:', c.content);
          setCourse(c);
          const newContent: Record<string, { title: string; subtitle?: string; description?: string }> = {};
          languageOptions.forEach(lang => {
            newContent[lang.code] = c.content?.[lang.code] || { title: '', subtitle: '', description: '' };
          });
          console.log('Loaded content:', newContent);
          setContent(newContent);
          setLevel(c.level || 'beginner');
          setVideoLanguage(c.videoLanguage || 'en');
          setThumbnail(c.thumbnail || '');
          setTotalVideos(String(c.totalVideos || 0));
          setDuration(String(c.totalDuration || 0));
          setPriceINR(String(c.pricing?.INR?.price || 0));
          setPriceNPR(String(c.pricing?.NPR?.price || 0));
          setPriceUSD(String(c.pricing?.USD?.price || 0));
          setDiscount(String(c.discount || 0));
          setPromoCode(c.promoCode || '');
          setIsFree(c.isFree || false);
          setDefaultStudents(String(c.defaultStudents || 15));
          setLikes(String(c.likes || 10));
          setRating(String(c.rating || 5.0));
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
    if (!token || !content.en.title) {
      setError('Workshop name (English) is required');
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
          content,
          level,
          videoLanguage,
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
          defaultStudents: parseInt(defaultStudents) || 15,
          likes: parseInt(likes) || 10,
          rating: parseFloat(rating) || 5.0,
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
          {/* Language Dropdown - All 19 Languages */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-green-400 mb-2">Select Language to Edit</label>
            <div className="relative w-full">
              <button
                type="button"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none text-left flex justify-between items-center hover:border-green-600 transition-colors"
              >
                <span className="flex items-center gap-2 text-white font-medium whitespace-nowrap">
                  {languageOptions.find(l => l.code === activeLanguage)?.flag}
                  {languageOptions.find(l => l.code === activeLanguage)?.name}
                </span>
                <svg className={`w-5 h-5 text-green-500 flex-shrink-0 transition-transform duration-200 ${showLanguageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showLanguageDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setActiveLanguage(lang.code);
                        localStorage.setItem('admin_course_edit_language', lang.code);
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm font-medium transition-all ${
                        activeLanguage === lang.code
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Language Content */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Name * ({languageOptions.find(l => l.code === activeLanguage)?.name})</label>
              <input
                type="text"
                value={content[activeLanguage].title}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  [activeLanguage]: { ...prev[activeLanguage], title: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder={activeLanguage === 'en' ? "Yoga Fundamentals" : activeLanguage === 'hi' ? "योग मौलिक" : "योग आधार"}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Subtitle ({languageOptions.find(l => l.code === activeLanguage)?.name})</label>
              <input
                type="text"
                value={content[activeLanguage].subtitle || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  [activeLanguage]: { ...prev[activeLanguage], subtitle: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                placeholder="Brief subtitle"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Description ({languageOptions.find(l => l.code === activeLanguage)?.name})</label>
              <textarea
                value={content[activeLanguage].description || ''}
                onChange={(e) => setContent(prev => ({
                  ...prev,
                  [activeLanguage]: { ...prev[activeLanguage], description: e.target.value }
                }))}
                className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none resize-none"
                placeholder="Describe your workshop..."
                rows={3}
              />
            </div>
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
              <label className="block text-sm font-medium text-green-400 mb-2">Workshop Language</label>
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setShowVideoLanguageDropdown(!showVideoLanguageDropdown)}
                  className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white focus:border-green-500 focus:outline-none text-left flex justify-between items-center hover:border-green-600 transition-colors"
                >
                  <span className="flex items-center gap-2 text-white font-medium">
                    {languageOptions.find(l => l.code === videoLanguage)?.flag}
                    {languageOptions.find(l => l.code === videoLanguage)?.name}
                  </span>
                  <svg className={`w-5 h-5 text-green-500 flex-shrink-0 transition-transform duration-200 ${showVideoLanguageDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showVideoLanguageDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                    {languageOptions.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setVideoLanguage(lang.code);
                          setShowVideoLanguageDropdown(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left flex items-center gap-3 text-sm font-medium transition-all ${
                          videoLanguage === lang.code
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

              {/* Row 7 - Social/Engagement Metrics */}
              <div className="border-t border-gray-700 pt-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Social & Engagement</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Default Students</label>
                    <input
                      type="number"
                      value={defaultStudents}
                      onChange={(e) => setDefaultStudents(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="15"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Base student count (adds to real enrollments)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Likes</label>
                    <input
                      type="number"
                      value={likes}
                      onChange={(e) => setLikes(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="10"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Course likes count</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Rating (Stars)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-green-500 focus:outline-none"
                      placeholder="5.0"
                      min="0"
                      max="5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Course rating (0-5 stars)</p>
                  </div>
                </div>
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
