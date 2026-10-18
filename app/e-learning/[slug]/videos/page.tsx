'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Lock, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react';
import CourseEnrollmentModal from '@/components/CourseEnrollmentModal';
import CourseLeadUnlockModal from '@/components/CourseLeadUnlockModal';

interface Video {
  _id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  order?: number;
  isFree?: boolean;
  canWatch?: boolean;
}

interface Course {
  _id: string;
  slug: string;
  title: string;
  level: string;
  totalVideos?: number;
  isFree?: boolean;
  pricing?: {
    INR?: { price: number; originalPrice?: number };
    USD?: { price: number; originalPrice?: number };
  };
  discount?: number;
  promoCode?: string | null;
  promoDiscount?: number;
  giftHours?: { enabled: boolean; hours: number };
  enrolledCount?: number;
  defaultStudents?: number;
  thumbnail?: string;
}

export default function CourseVideosPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [targetVideoForUnlock, setTargetVideoForUnlock] = useState<Video | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);

    // Check if user has already unlocked this course or any course
    const unlocked =
      localStorage.getItem(`swar_course_unlocked_${slug}`) === 'true' ||
      localStorage.getItem('swar_course_unlocked_all') === 'true' ||
      Boolean(storedToken);
    setIsUnlocked(unlocked);

    const fetchCourse = async () => {
      try {
        setLoading(true);
        const headers: Record<string, string> = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
        const res = await fetch(`/api/recorded-courses?slug=${slug}&_t=${Date.now()}`, { headers, cache: 'no-store' });
        const data = await res.json();

        if (data.success && data.course) {
          setCourse(data.course);
          setVideos(data.videos || []);
          if (data.canAccessPaidContent || data.enrollment) {
            setIsUnlocked(true);
          }
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
  }, [slug]);

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
        <Link href={`/e-learning/${slug}`} className="flex items-center gap-2 text-green-600 hover:text-green-700 mb-6">
          <ArrowLeft size={20} /> Back to Course
        </Link>
        <div className="text-center py-20">
          <p className="text-gray-600 text-lg">{error || 'Course not found'}</p>
        </div>
      </div>
    );
  }

  const handleVideoClick = (video: Video, index: number) => {
    const videoId = video._id || (video as any).id;

    // Video 1 (index === 0) is completely free and instantly playable for anyone
    if (index === 0) {
      router.push(`/e-learning/${slug}/learn?video=${videoId}`);
      return;
    }

    // Videos 2 to 6: check if viewer has unlocked or filled form
    const unlocked = isUnlocked || token || video.canWatch;
    if (unlocked) {
      router.push(`/e-learning/${slug}/learn?video=${videoId}`);
    } else {
      setTargetVideoForUnlock(video);
      setShowUnlockModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b p-4 sm:p-6 flex items-center justify-between">
        <Link href={`/e-learning/${slug}`} className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm sm:text-base">
          <ArrowLeft size={20} /> Back to Course
        </Link>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Course Videos</h1>
        <div className="w-6" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        {/* Course Info */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-2">{course.title}</h2>
          <p className="text-gray-600 text-lg">{videos.length} videos</p>
        </div>

        {/* Videos Grid */}
        {videos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video, index) => {
              const isVideo1 = index === 0;
              const isUnlockedForUser = isVideo1 || isUnlocked || Boolean(token);
              const isLocked = !isUnlockedForUser;
              const videoId = video._id || (video as any).id;

              return (
                <div
                  key={videoId}
                  onClick={() => handleVideoClick(video, index)}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    isLocked
                      ? 'border-amber-200 hover:border-amber-400 bg-amber-50/20 cursor-pointer shadow-sm'
                      : 'border-gray-200 hover:border-green-400 cursor-pointer shadow-sm'
                  }`}
                >
                  {/* Video Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden group">
                    {video.thumbnail && video.thumbnail.trim() ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className={`w-full h-full object-cover transition-transform duration-300 ${
                          isLocked ? 'brightness-90 group-hover:scale-105' : 'group-hover:scale-105'
                        }`}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (course.thumbnail && target.src !== course.thumbnail) {
                            target.src = course.thumbnail;
                          } else {
                            target.style.display = 'none';
                          }
                        }}
                      />
                    ) : course.thumbnail ? (
                      <img
                        src={course.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                        <Play size={48} className="text-white/60" />
                      </div>
                    )}

                    {/* Overlay */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-all ${
                        isLocked ? 'bg-black/35 group-hover:bg-black/20' : 'bg-black/0 group-hover:bg-black/25'
                      }`}
                    >
                      {!isLocked ? (
                        <div className="bg-green-500 rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform">
                          <Play size={24} className="text-white fill-white ml-0.5" />
                        </div>
                      ) : (
                        <div className="bg-amber-500 rounded-full p-3 shadow-lg group-hover:scale-110 transition-transform flex items-center justify-center">
                          <Lock size={22} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {isVideo1 ? (
                        <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Sparkles size={12} /> FREE • INSTANT PLAY
                        </span>
                      ) : isUnlockedForUser ? (
                        <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <CheckCircle2 size={12} /> UNLOCKED
                        </span>
                      ) : (
                        <span className="bg-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                          <Lock size={12} /> FREE • 1-STEP UNLOCK
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    {video.duration ? (
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-semibold px-2 py-1 rounded shadow">
                        {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                      </div>
                    ) : null}
                  </div>

                  {/* Video Info */}
                  <div className="p-4 bg-white">
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-1 line-clamp-2">
                      Video {index + 1}: {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-gray-600 text-xs line-clamp-2 mb-2">
                        {video.description}
                      </p>
                    )}

                    {/* Action Button */}
                    {!isLocked ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/e-learning/${slug}/learn?video=${videoId}`);
                        }}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
                      >
                        <Play size={16} className="fill-white" /> Play Video
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetVideoForUnlock(video);
                          setShowUnlockModal(true);
                        }}
                        className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
                      >
                        <Sparkles size={16} /> Unlock & Watch Free
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No videos available for this course yet</p>
          </div>
        )}

        {/* Call to Action */}
        <div className="mt-12 p-4 sm:p-8 bg-green-50 rounded-2xl border-2 border-green-200 text-center">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            {course.isFree ? 'Start Learning Today' : 'Ready to Learn?'}
          </h3>
          <p className="text-gray-600 mb-6">
            {course.isFree
              ? 'All course videos are completely free. Start your learning journey now!'
              : 'Enroll now to access all course videos and start your learning journey'}
          </p>
          {course.isFree ? (
            <Link
              href={`/e-learning/${slug}/learn`}
              className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              <Play size={18} />
              Start Watching Free
            </Link>
          ) : (
            <button
              onClick={() => setShowEnrollmentModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Enroll Now
            </button>
          )}
        </div>
      </div>

      {/* Free Unlock Modal for Videos 2-6 */}
      <CourseLeadUnlockModal
        isOpen={showUnlockModal}
        onClose={() => {
          setShowUnlockModal(false);
          setTargetVideoForUnlock(null);
        }}
        onSuccess={() => {
          setShowUnlockModal(false);
          setIsUnlocked(true);
          const target = targetVideoForUnlock;
          setTargetVideoForUnlock(null);
          if (target) {
            const vId = target._id || (target as any).id;
            router.push(`/e-learning/${slug}/learn?video=${vId}`);
          }
        }}
        courseTitle={course?.title}
        courseId={course?._id}
        courseSlug={slug}
        targetVideoTitle={targetVideoForUnlock?.title}
      />

      {/* Enrollment Modal */}
      {showEnrollmentModal && course && (
        <CourseEnrollmentModal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          course={{
            _id: course._id,
            title: course.title,
            pricing: course.pricing,
            discount: course.discount,
            promoCode: course.promoCode,
            promoDiscount: course.promoDiscount,
          }}
          token={token}
          enrollmentCount={(course.defaultStudents ?? 15) + (course.enrolledCount || 0)}
        />
      )}
    </div>
  );
}
