'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Lock, BookOpen } from 'lucide-react';
import CourseEnrollmentModal from '@/components/CourseEnrollmentModal';

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
  giftHours?: { enabled: boolean; hours: number };
  enrolledCount?: number;
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
  const [token, setToken] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token') || '';
    setToken(storedToken);
    setIsLoggedIn(!!storedToken);

    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/recorded-courses?slug=${slug}`);
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
    if (video.isFree === true || isLoggedIn) {
      // Free video or user is logged in
      return;
    } else {
      // Paid video and not logged in
      setShowEnrollmentModal(true);
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
              const isFree = video.isFree === true;
              const isLocked = !isFree && !isLoggedIn;

              return (
                <div
                  key={video._id}
                  onClick={() => handleVideoClick(video, index)}
                  className={`rounded-xl overflow-hidden border-2 transition-all ${
                    isLocked
                      ? 'border-gray-300 cursor-not-allowed'
                      : 'border-gray-200 hover:border-green-400 cursor-pointer'
                  }`}
                >
                  {/* Video Thumbnail */}
                  <div className="relative h-48 bg-gradient-to-br from-gray-300 to-gray-400 overflow-hidden group">
                    {video.thumbnail && video.thumbnail.trim() ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className={`w-full h-full object-cover transition-transform ${
                          isLocked ? '' : 'group-hover:scale-105'
                        }`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : null}
                    {!video.thumbnail || !video.thumbnail.trim() ? (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-400 to-gray-500">
                        <Play size={48} className="text-white" />
                      </div>
                    ) : null}

                    {/* Overlay */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all ${
                      isLocked ? 'bg-black/40' : 'bg-black/0 group-hover:bg-black/20'
                    }`}>
                      {!isLocked && (
                        <div className="bg-green-500 rounded-full p-3">
                          <Play size={24} className="text-white fill-white" />
                        </div>
                      )}
                      {isLocked && (
                        <div className="bg-gray-700 rounded-full p-3">
                          <Lock size={24} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      {isFree && (
                        <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                          FREE
                        </span>
                      )}
                      {isLocked && (
                        <span className="bg-gray-700 text-white text-xs font-bold px-3 py-1 rounded-full">
                          LOCKED
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    {video.duration && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded">
                        {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                      </div>
                    )}
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm mb-2 line-clamp-2">
                      Video {index + 1}: {video.title}
                    </h3>
                    {video.description && (
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {video.description}
                      </p>
                    )}

                    {/* Action Button */}
                    {isFree ? (
                      <button
                        onClick={() => router.push(`/e-learning/${slug}/learn?video=${video._id}`)}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play size={16} /> Play Video
                      </button>
                    ) : isLoggedIn ? (
                      <button
                        onClick={() => router.push(`/e-learning/${slug}/learn?video=${video._id}`)}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <Play size={16} /> Play Video
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowEnrollmentModal(true)}
                        className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        <BookOpen size={16} /> Enroll to Watch
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
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Ready to Learn?</h3>
          <p className="text-gray-600 mb-6">Enroll now to access all course videos and start your learning journey</p>
          <button
            onClick={() => setShowEnrollmentModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            Enroll Now
          </button>
        </div>
      </div>

      {/* Enrollment Modal */}
      {showEnrollmentModal && (
        <CourseEnrollmentModal
          isOpen={showEnrollmentModal}
          onClose={() => setShowEnrollmentModal(false)}
          courseId={course._id}
          courseName={course.title}
        />
      )}
    </div>
  );
}
