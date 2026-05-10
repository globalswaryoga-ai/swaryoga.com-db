'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Users, Calendar, Video, Globe, Lock } from 'lucide-react';
import CourseEnrollmentModal from '@/components/CourseEnrollmentModal';

// Language options with flags (same as main e-learning page)
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

interface Video {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  order?: number;
}

interface Course {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  level: string;
  totalVideos?: number;
  totalDuration?: number;
  pricing: {
    INR?: { price: number };
  };
  discount?: number;
  promoCode?: string;
  isFree: boolean;
  enrolledCount?: number;
  averageRating?: number;
  defaultStudents?: number;
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showVideoPreviewModal, setShowVideoPreviewModal] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [token, setToken] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [language, setLanguage] = useState<string>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    if (langDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langDropdownOpen]);

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
    setIsLoggedIn(!!storedToken);

    // Get preferred language from localStorage
    const savedLang = localStorage.getItem('preferred_language');
    if (savedLang && languageOptions.some(l => l.code === savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  // Get current language info
  const currentLangInfo = languageOptions.find(l => l.code === language) || languageOptions[0];

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/recorded-courses?slug=${slug}&lang=${language}`);
        const data = await res.json();

        if (data.success && data.course) {
          setCourse(data.course);
          setVideos(data.videos || []);
        } else {
          setError('Course not found');
        }
      } catch (err) {
        setError('Error loading course');
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [slug, language]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white p-6">
        <Link href="/e-learning" className="flex items-center gap-2 text-green-600 hover:text-green-700">
          <ArrowLeft size={20} /> Back
        </Link>
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg">{error || 'Course not found'}</p>
        </div>
      </div>
    );
  }

  const priceINR = course.pricing?.INR?.price || 0;
  const originalPrice = priceINR;
  const discountedPrice = course.discount ? Math.round(priceINR * (1 - course.discount / 100)) : priceINR;
  const discountAmount = originalPrice - discountedPrice;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-50 border-b p-6 flex items-center justify-between">
        <Link href="/e-learning" className="flex items-center gap-2 text-green-600 hover:text-green-700">
          <ArrowLeft size={20} /> Back to Courses
        </Link>
        {/* Language Selector - All 19 Languages Modal */}
        <div ref={langDropdownRef}>
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors hover:border-gray-400"
          >
            <span className="text-lg">{currentLangInfo.flag}</span>
            <span>{currentLangInfo.name}</span>
            <svg
              className={`w-4 h-4 transition-transform ${langDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {langDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/30"
                onClick={() => setLangDropdownOpen(false)}
              />
              {/* Modal */}
              <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Select Language</h2>
                  <button
                    onClick={() => setLangDropdownOpen(false)}
                    className="text-gray-500 hover:text-gray-700 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Language List - Single Column */}
                <div className="max-w-xs mx-auto max-h-96 overflow-y-auto bg-white rounded-lg border border-gray-200">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        localStorage.setItem('preferred_language', lang.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left flex items-center gap-3 text-sm font-medium transition-all border-b border-gray-100 last:border-b-0 ${
                        language === lang.code
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="flex-1">{lang.name}</span>
                      {language === lang.code && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {!course ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : (
      <div className="max-w-4xl mx-auto p-6">
        {course.thumbnail && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img src={course.thumbnail} alt={course.title} className="w-full h-96 object-cover" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <h1 className="text-4xl font-bold text-black mb-4">{course.title}</h1>

            <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold mb-6 ${
              course.level === 'beginner' ? 'bg-green-100 text-green-800' :
              course.level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
            </span>

            <div className="flex gap-6 text-gray-600 mb-8">
              <div className="flex items-center gap-2">
                <Video size={20} />
                <span>{course.totalVideos || 0} videos</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={20} />
                <span>{course.totalDuration || 0} days</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={20} />
                <span>{15 + (course.enrolledCount || 0)} students</span>
              </div>
            </div>

            {course.description && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-black mb-4">About This Course</h2>
                <p className="text-gray-700 leading-relaxed">{course.description}</p>
              </div>
            )}

            {/* Students Count */}
            <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-lg font-semibold text-gray-900">
                👥 {(course.defaultStudents || 15) + (course.enrolledCount || 0)} Students Currently Learning
              </p>
            </div>

            {/* Course Content */}
            {videos.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-black mb-4">Course Content</h2>
                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <div
                      key={video._id}
                      className="flex gap-4 p-4 border border-gray-200 rounded-lg hover:border-green-400 transition-colors cursor-pointer"
                    >
                      {/* Video Thumbnail */}
                      <div className="flex-shrink-0 w-32 h-20 bg-gray-300 rounded-lg overflow-hidden relative">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-400">
                            <Play size={24} className="text-white" />
                          </div>
                        )}
                        {/* Free Badge */}
                        {index === 0 && (
                          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                            FREE
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                              {index === 0 ? (
                                <Play size={16} className="text-green-600" />
                              ) : (
                                <Lock size={16} className="text-gray-400" />
                              )}
                              {video.title}
                            </h3>
                            {video.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {video.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1">
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 sticky top-6">
              <div className="mb-6 pb-6 border-b-2 border-gray-200">
                {course.isFree ? (
                  <div className="text-center">
                    <p className="text-4xl font-bold text-green-600 mb-2">FREE</p>
                  </div>
                ) : (
                  <div className="text-center">
                    {course.discount && course.discount > 0 ? (
                      <>
                        {/* Original Price - Strikethrough */}
                        <p className="text-gray-400 line-through text-lg mb-2">
                          ₹{originalPrice.toLocaleString()}
                        </p>
                        {/* Final Price - RED & BOLD */}
                        <p className="text-4xl font-bold text-red-600 mb-2">
                          ₹{discountedPrice.toLocaleString()}
                        </p>
                        {/* Discount Badge */}
                        <div className="bg-red-100 text-red-700 rounded-lg py-2 px-3 text-sm font-semibold mb-4">
                          Save ₹{discountAmount.toLocaleString()} ({course.discount}% OFF)
                        </div>
                        {/* Promo Code */}
                        {course.promoCode && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-gray-600 mb-1">Promo Code</p>
                            <p className="text-lg font-bold text-blue-600">{course.promoCode}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-4xl font-bold text-gray-900 mb-2">₹{priceINR.toLocaleString()}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Rating and Likes */}
              <div className="mb-6 pb-6 border-b-2 border-gray-200 text-center">
                {/* Stars */}
                <div className="flex justify-center gap-2 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-5 h-5 text-yellow-400 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-gray-600">5.0 rating</p>
              </div>

              {/* Students and Likes */}
              <div className="mb-6 pb-6 border-b-2 border-gray-200 flex items-center justify-around text-center">
                <div>
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-lg font-bold text-gray-900">{15 + (course.enrolledCount || 0)}</p>
                </div>
                <div className="border-l border-gray-300"></div>
                <div>
                  <p className="text-sm text-gray-600">Likes</p>
                  <p className="text-lg font-bold text-red-500">❤ 10</p>
                </div>
              </div>

              {/* See Videos Button */}
              <button
                onClick={() => setShowVideoPreviewModal(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors mb-3"
              >
                <Video size={20} />
                See All Videos
              </button>

              <button
                onClick={() => setShowEnrollmentModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Play size={20} />
                Start Learning
              </button>

              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>2 hours free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Video Preview Modal */}
      {showVideoPreviewModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">All Course Videos</h2>
              <button
                onClick={() => setShowVideoPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Videos Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {videos.map((video, index) => {
                  const isFreeVideo = index === 0; // First video is free
                  const canWatch = isFreeVideo || isLoggedIn;

                  return (
                    <div
                      key={video._id}
                      onClick={() => {
                        if (isFreeVideo) {
                          // Play free video
                          if (isLoggedIn) {
                            router.push(`/e-learning/${slug}/learn?video=${video._id}`);
                          } else {
                            // Redirect to login
                            router.push(`/login?redirect=/e-learning/${slug}/learn?video=${video._id}`);
                          }
                        } else {
                          // Show enrollment for paid video
                          setShowVideoPreviewModal(false);
                          setShowEnrollmentModal(true);
                        }
                      }}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        canWatch ? 'cursor-pointer hover:shadow-lg hover:border-green-400' : 'cursor-not-allowed opacity-75'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-full aspect-video bg-gray-300 overflow-hidden">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-400">
                            <Play size={48} className="text-white" />
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                          <button className="bg-white rounded-full p-3">
                            <Play size={32} className="text-green-600 ml-1" fill="currentColor" />
                          </button>
                        </div>

                        {/* Free Badge */}
                        {isFreeVideo && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                            FREE
                          </div>
                        )}

                        {/* Lock Badge for Paid */}
                        {!isFreeVideo && !isLoggedIn && (
                          <div className="absolute top-2 right-2 bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                            <Lock size={12} /> LOCKED
                          </div>
                        )}
                      </div>

                      {/* Video Info */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{video.title}</h3>
                        {video.description && (
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{video.description}</p>
                        )}

                        <div className="flex items-center justify-between text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Video size={14} />
                            Video {index + 1}
                          </span>
                          {video.duration && (
                            <span>
                              {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enrollment Modal */}
      {course && (
        <CourseEnrollmentModal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          course={{
            _id: course._id,
            title: course.title,
            pricing: course.pricing,
            discount: course.discount,
          }}
          token={token}
        />
      )}
    </div>
  );
}
