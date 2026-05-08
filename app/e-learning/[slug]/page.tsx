'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
}

interface EnrolledStudent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  enrolledAt: string;
  progress?: number;
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
  const [token, setToken] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [enrollmentCount, setEnrollmentCount] = useState(15);

  useEffect(() => {
    // Get token from localStorage
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);

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

  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      if (!course?._id) return;
      try {
        setLoadingStudents(true);
        const res = await fetch(`/api/recorded-courses/${course._id}/enrollments?limit=15`);
        const data = await res.json();
        if (data.success && data.students) {
          setEnrolledStudents(data.students);
          setEnrollmentCount(data.total || 15);
        }
      } catch (err) {
        console.error('Error fetching enrolled students:', err);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchEnrolledStudents();
  }, [course?._id]);

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
        <div>
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

                {/* Language Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {languageOptions.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang.code);
                        localStorage.setItem('preferred_language', lang.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                        language === lang.code
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-green-400 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-3xl flex-shrink-0">{lang.flag}</span>
                      <div className="text-left flex-1">
                        <p className={`font-semibold ${language === lang.code ? 'text-green-700' : 'text-gray-900'}`}>
                          {lang.name}
                        </p>
                      </div>
                      {language === lang.code && (
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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

            {/* Enrolled Students Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-black mb-4">Students Currently Learning ({15 + (course.enrolledCount || 0)})</h2>
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
                </div>
              ) : enrolledStudents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {enrolledStudents.map((student) => (
                    <div
                      key={student._id}
                      className="p-4 border border-gray-200 rounded-lg hover:border-green-400 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{student.firstName} {student.lastName}</h3>
                          <p className="text-sm text-gray-600 mt-1">{student.email}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Enrolled: {new Date(student.enrolledAt).toLocaleDateString()}
                          </p>
                        </div>
                        {student.progress !== undefined && (
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">{student.progress}%</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No enrolled students yet. Be the first to learn!</p>
              )}
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
          enrolledStudents={enrolledStudents}
          enrollmentCount={enrollmentCount}
        />
      )}
    </div>
  );
}
