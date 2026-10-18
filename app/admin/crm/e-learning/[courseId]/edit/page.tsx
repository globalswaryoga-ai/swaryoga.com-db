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
  const [promoDiscount, setPromoDiscount] = useState('0');
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
        if (data.success && data.course) {
          const c = data.course;
          setCourse(c);
          const newContent: Record<string, { title: string; subtitle?: string; description?: string }> = {};
          languageOptions.forEach(lang => {
            newContent[lang.code] = c.content?.[lang.code] || { title: '', subtitle: '', description: '' };
          });
          setContent(newContent);
          setLevel(c.level || 'beginner');
          setVideoLanguage(c.videoLanguage || 'en');
          setThumbnail(c.thumbnail || '');
          setTotalVideos(String(c.totalVideos ?? (c as any).data?.totalVideos ?? 0));
          setDuration(String(c.totalDuration || 0));
          setPriceINR(String(c.pricing?.INR?.price || 0));
          setPriceNPR(String(c.pricing?.NPR?.price || 0));
          setPriceUSD(String(c.pricing?.USD?.price || 0));
          setDiscount(String(c.discount || 0));
          setPromoCode(c.promoCode || '');
          setPromoDiscount(String(c.promoDiscount ?? (c as any).data?.promoDiscount ?? 0));
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
    const effectiveContent = { ...content };
    if (!effectiveContent.en?.title && effectiveContent[activeLanguage]?.title) {
      effectiveContent.en = {
        ...effectiveContent.en,
        title: effectiveContent[activeLanguage].title,
        subtitle: effectiveContent.en?.subtitle || effectiveContent[activeLanguage].subtitle,
        description: effectiveContent.en?.description || effectiveContent[activeLanguage].description,
      };
    }

    if (!token || !effectiveContent.en?.title) {
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
          content: effectiveContent,
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
          promoCode: promoCode ? promoCode.trim().toUpperCase() : null,
          promoDiscount: parseInt(promoDiscount) || 0,
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
        <form onSubmit={handleSubmit} className="bg-gray-900/50 rounded-2xl border border-gray-800 p-4 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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

                {/* ───────────────────────────────────────────────────────────── */}
                {/* WAY 1: DIRECT FRONTEND DISCOUNT */}
                {/* ───────────────────────────────────────────────────────────── */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800/90 rounded-xl p-4 border border-red-500/30 mb-5 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-700/60">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Way 1
                      </span>
                      <h4 className="text-sm font-bold text-white">Direct Frontend Discount (%)</h4>
                    </div>
                    <span className="text-xs text-red-300/80">Affects website catalog & course page directly</span>
                  </div>

                  {/* Quick Presets for Frontend Discount */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Quick Discount Presets
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { pct: 10, label: '10% OFF' },
                        { pct: 25, label: '25% OFF' },
                        { pct: 33, label: '33% OFF' },
                        { pct: 50, label: '50% OFF' },
                        { pct: 75, label: '75% OFF' },
                      ].map(({ pct, label }) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscount(String(pct))}
                          className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                            parseInt(discount) === pct
                              ? 'bg-red-500/30 border-red-500 text-red-300 ring-2 ring-red-500/50'
                              : 'bg-black/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Discount % Input & Direct Preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-300">Website Discount (%)</label>
                        <span className="text-xs text-gray-500">0 - 100%</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={discount}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setDiscount(String(val));
                          }}
                          className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                          placeholder="0"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-4 top-2.5 text-gray-500 text-sm font-bold">%</span>
                      </div>
                    </div>

                    {/* Live Website Price Preview */}
                    {parseInt(priceINR) > 0 && (
                      <div className="bg-black/50 border border-gray-700/80 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">Public Website Price (All Visitors):</p>
                        <div className="flex items-center gap-2 justify-center flex-wrap">
                          {parseInt(discount) > 0 ? (
                            <>
                              <span className="text-gray-400 line-through text-sm">
                                ₹{parseInt(priceINR).toLocaleString()}
                              </span>
                              <span className="text-gray-500 text-xs">→</span>
                              <span className="text-2xl font-black text-red-400">
                                ₹{Math.round(parseInt(priceINR) * (1 - (parseInt(discount) || 0) / 100)).toLocaleString()}
                              </span>
                              <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">
                                {discount}% OFF
                              </span>
                            </>
                          ) : (
                            <span className="text-xl font-black text-green-400">
                              ₹{parseInt(priceINR).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ───────────────────────────────────────────────────────────── */}
                {/* WAY 2: SECRET / CIRCULATED PROMO CODE */}
                {/* ───────────────────────────────────────────────────────────── */}
                <div className="bg-gradient-to-br from-gray-900 to-blue-950/40 rounded-xl p-4 border border-blue-500/40 mb-5 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-700/60">
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">
                        Way 2
                      </span>
                      <h4 className="text-sm font-bold text-white">Secret Circulated Promo Code</h4>
                    </div>
                    <span className="text-xs text-blue-300">Circulate to people • Applied at payment option</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                    {/* Promo Code Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-300">Promo Code to Circulate</label>
                        <button
                          type="button"
                          onClick={() => setPromoCode('SWAR010')}
                          className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                        >
                          Use SWAR010
                        </button>
                      </div>
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                        className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none uppercase font-mono tracking-wider text-sm"
                        placeholder="e.g. SWAR010"
                      />
                    </div>

                    {/* Promo Discount (%) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-medium text-gray-300">Promo Discount (%)</label>
                        <span className="text-xs text-gray-500">Auto less at payment</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          value={promoDiscount}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setPromoDiscount(String(val));
                          }}
                          className="w-full px-4 py-2.5 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                          placeholder="20"
                          min="0"
                          max="100"
                        />
                        <span className="absolute right-4 top-2.5 text-gray-500 text-sm font-bold">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets for Promo Code Discount */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Quick Promo % Presets
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[10, 15, 20, 25, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setPromoDiscount(String(pct))}
                          className={`py-1.5 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                            parseInt(promoDiscount) === pct
                              ? 'bg-blue-500/30 border-blue-500 text-blue-300 ring-2 ring-blue-500/50'
                              : 'bg-black/60 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-800'
                          }`}
                        >
                          {pct}% OFF
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Promo Live Preview */}
                  {parseInt(priceINR) > 0 && (
                    <div className="bg-black/50 border border-blue-800/60 rounded-lg p-3 text-center">
                      {promoCode.trim() && parseInt(promoDiscount) > 0 ? (
                        <>
                          <p className="text-xs text-blue-300 mb-1">
                            When student enters <span className="font-mono font-bold text-white px-1.5 py-0.5 bg-blue-900/60 rounded border border-blue-700">{promoCode}</span> in payment option:
                          </p>
                          <div className="flex items-center gap-2 justify-center flex-wrap">
                            <span className="text-gray-400 line-through text-sm">
                              ₹{Math.round(parseInt(priceINR) * (1 - (parseInt(discount) || 0) / 100)).toLocaleString()}
                            </span>
                            <span className="text-blue-400 text-xs">→</span>
                            <span className="text-2xl font-black text-emerald-400">
                              ₹{Math.max(
                                0,
                                Math.round(
                                  Math.round(parseInt(priceINR) * (1 - (parseInt(discount) || 0) / 100)) *
                                    (1 - (parseInt(promoDiscount) || 0) / 100)
                                )
                              ).toLocaleString()}
                            </span>
                            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded text-xs font-bold">
                              {promoDiscount}% Promo OFF (Saves extra ₹{(
                                Math.round(parseInt(priceINR) * (1 - (parseInt(discount) || 0) / 100)) -
                                Math.max(
                                  0,
                                  Math.round(
                                    Math.round(parseInt(priceINR) * (1 - (parseInt(discount) || 0) / 100)) *
                                      (1 - (parseInt(promoDiscount) || 0) / 100)
                                  )
                                )
                              ).toLocaleString()})
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">
                          {promoCode.trim()
                            ? 'Set a Promo Discount % above to activate promo savings at checkout.'
                            : 'Enter a promo code and % above to provide secret discounts at payment option.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 7 - Social/Engagement Metrics */}
              <div className="border-t border-gray-700 pt-6 mt-6">
                <h3 className="text-lg font-bold text-white mb-4">Social & Engagement</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
