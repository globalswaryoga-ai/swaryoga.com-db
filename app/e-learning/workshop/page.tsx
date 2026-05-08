'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Lock, CheckCircle, Clock, Award, MessageCircle, AlertCircle } from 'lucide-react';
import BunnyVideoPlayer from '@/components/BunnyVideoPlayer';

interface Video {
  _id: string;
  title: string;
  duration?: number;
  order: number;
  bunnyVideoId?: string;
  isWatched: boolean;
  isCompleted: boolean;
}

interface Course {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  thumbnail?: string;
  level: string;
  videoLanguage?: string;
  totalVideos: number;
  totalDuration: number;
}

interface EnrolledCourse {
  enrollment: {
    _id: string;
    status: string;
    enrolledAt: string;
  };
  course: Course;
  progress: {
    watchedCount: number;
    totalCount: number;
    completionPercentage: number;
    remainingDays: number;
    remainingHours: number;
  };
  videos: Video[];
  assignments: any[];
  materials: any[];
  hasCertificate: boolean;
}

export default function WorkshopPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [completedVideos, setCompletedVideos] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        setLoading(true);
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          router.push('/login');
          return;
        }
        setToken(storedToken);

        const response = await fetch('/api/user/enrolled-courses', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (data.success && data.courses) {
          setCourses(data.courses);
          if (data.courses.length > 0) {
            const firstCourse = data.courses[0];
            setSelectedCourse(firstCourse);
            setSelectedVideo(firstCourse.videos[0]);

            // Track completed videos
            const completed = new Set(
              firstCourse.videos
                .filter((v: Video) => v.isCompleted)
                .map((v: Video) => v._id)
            );
            setCompletedVideos(completed);
          }
        } else {
          setError('Failed to load courses');
        }
      } catch (err) {
        console.error('Error fetching enrolled courses:', err);
        setError('Error loading courses');
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, [router]);

  const handleVideoComplete = useCallback(async () => {
    if (!selectedVideo || !selectedCourse || !token) return;

    try {
      // Mark video as completed
      await fetch('/api/user/video-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: selectedCourse.course._id,
          videoId: selectedVideo._id,
          isCompleted: true,
          progress: 100,
        }),
      });

      // Update local state
      setCompletedVideos(prev => new Set([...prev, selectedVideo._id]));

      // Find next video to auto-select
      const nextVideoIndex = selectedCourse.videos.findIndex(v => v._id === selectedVideo._id) + 1;
      if (nextVideoIndex < selectedCourse.videos.length) {
        const nextVideo = selectedCourse.videos[nextVideoIndex];
        setSelectedVideo(nextVideo);
      }
    } catch (err) {
      console.error('Error marking video as complete:', err);
    }
  }, [selectedVideo, selectedCourse, token]);

  const canPlayVideo = useCallback((videoIndex: number): boolean => {
    // First video is always playable
    if (videoIndex === 0) return true;

    // Check if all previous videos are completed
    for (let i = 0; i < videoIndex; i++) {
      if (!completedVideos.has(selectedCourse?.videos[i]._id || '')) {
        return false;
      }
    }
    return true;
  }, [completedVideos, selectedCourse]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="min-h-screen bg-black p-6">
        <Link href="/e-learning" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-8">
          <ArrowLeft size={20} /> Back to Courses
        </Link>
        <div className="text-center py-20">
          <p className="text-white text-lg mb-4">No enrolled courses yet</p>
          <Link href="/e-learning" className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b-2 border-green-500 p-6">
        <Link href="/e-learning" className="flex items-center gap-2 text-green-400 hover:text-green-300 mb-4">
          <ArrowLeft size={20} /> Back to Courses
        </Link>
        <h1 className="text-3xl font-bold text-yellow-400">My Learning Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 p-6 max-w-7xl mx-auto">
        {/* Course List Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="border-2 border-green-500 rounded-lg p-4 bg-gray-900/50">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">My Courses</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {courses.map((enrolledCourse) => (
                <button
                  key={enrolledCourse.enrollment._id}
                  onClick={() => {
                    setSelectedCourse(enrolledCourse);
                    setSelectedVideo(enrolledCourse.videos[0]);
                  }}
                  className={`w-full text-left p-3 rounded-lg transition-colors border-l-4 ${
                    selectedCourse?.enrollment._id === enrolledCourse.enrollment._id
                      ? 'border-l-green-500 bg-green-500/10'
                      : 'border-l-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <p className="font-semibold text-white">{enrolledCourse.course.title}</p>
                  <p className="text-sm text-gray-400">
                    {enrolledCourse.progress.completionPercentage}% complete
                  </p>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${enrolledCourse.progress.completionPercentage}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        {selectedCourse && (
          <div className="lg:col-span-3 space-y-6">
            {/* Video Player Section */}
            {selectedVideo && selectedCourse && (
              <>
                {canPlayVideo(selectedCourse.videos.findIndex(v => v._id === selectedVideo._id)) ? (
                  <BunnyVideoPlayer
                    bunnyVideoId={selectedVideo.bunnyVideoId || ''}
                    title={selectedVideo.title}
                    onComplete={handleVideoComplete}
                    onProgress={(progress) => {
                      // Optional: track progress in real-time
                    }}
                  />
                ) : (
                  <div className="border-2 border-green-500 rounded-lg p-8 bg-gray-900/50 text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-yellow-400" />
                    <h3 className="text-xl font-bold text-white mb-2">Video Locked</h3>
                    <p className="text-gray-300 mb-4">
                      You must complete all previous videos before unlocking this one.
                    </p>
                    <p className="text-gray-400 text-sm">
                      Complete the videos in order to continue your learning journey.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Video Info & Progress */}
            <div className="border-2 border-green-500 rounded-lg p-6 bg-gray-900/50">
              <h2 className="text-2xl font-bold text-yellow-400 mb-4">{selectedCourse.course.title}</h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-gray-400 text-sm">Progress</p>
                  <p className="text-2xl font-bold text-green-400">{selectedCourse.progress.completionPercentage}%</p>
                </div>
                <div className="border-l-4 border-green-500 pl-4">
                  <p className="text-gray-400 text-sm">Remaining Time</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {selectedCourse.progress.remainingDays}d {selectedCourse.progress.remainingHours}h
                  </p>
                </div>
              </div>

              {/* Certificate */}
              {selectedCourse.hasCertificate && (
                <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6 flex items-center gap-4">
                  <Award size={32} className="text-green-400" />
                  <div>
                    <p className="text-green-400 font-bold">Certificate Available</p>
                    <p className="text-gray-300 text-sm">Download your completion certificate</p>
                  </div>
                </div>
              )}
            </div>

            {/* Videos List */}
            <div className="border-2 border-green-500 rounded-lg p-6 bg-gray-900/50">
              <h3 className="text-xl font-bold text-yellow-400 mb-4">Course Videos ({selectedCourse.videos.length})</h3>
              <div className="space-y-2">
                {selectedCourse.videos.map((video, index) => {
                  const isUnlocked = canPlayVideo(index);
                  const isCurrentVideo = selectedVideo?._id === video._id;

                  return (
                    <button
                      key={video._id}
                      onClick={() => isUnlocked && setSelectedVideo(video)}
                      className={`w-full p-4 rounded-lg border-l-4 transition-colors text-left ${
                        isCurrentVideo
                          ? 'border-l-green-500 bg-green-500/10'
                          : 'border-l-gray-700 hover:bg-gray-800'
                      } ${!isUnlocked && 'opacity-50 cursor-not-allowed'}`}
                      disabled={!isUnlocked}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {completedVideos.has(video._id) ? (
                            <CheckCircle size={24} className="text-green-400" />
                          ) : isUnlocked ? (
                            <Play size={24} className="text-yellow-400" />
                          ) : (
                            <Lock size={24} className="text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-white">
                            Video {index + 1}: {video.title}
                            {!isUnlocked && (
                              <span className="text-xs text-gray-400 ml-2">(Complete previous videos)</span>
                            )}
                          </p>
                          {video.duration && (
                            <p className="text-sm text-gray-400">{Math.round(video.duration / 60)} minutes</p>
                          )}
                        </div>
                        {completedVideos.has(video._id) && <CheckCircle size={20} className="text-green-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assignments */}
            {selectedCourse.assignments.length > 0 && (
              <div className="border-2 border-green-500 rounded-lg p-6 bg-gray-900/50">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">Assignments</h3>
                <div className="space-y-3">
                  {selectedCourse.assignments.map((assignment) => (
                    <div key={assignment._id} className="border border-gray-700 rounded-lg p-4 hover:border-green-500 transition">
                      <p className="font-semibold text-white">{assignment.title}</p>
                      <p className="text-gray-400 text-sm mt-1">{assignment.description}</p>
                      <div className="flex items-center gap-2 mt-3">
                        {assignment.isSubmitted ? (
                          <span className="text-green-400 text-sm font-bold">✓ Submitted</span>
                        ) : (
                          <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition">
                            Submit Assignment
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Materials/PDFs */}
            {selectedCourse.materials.length > 0 && (
              <div className="border-2 border-green-500 rounded-lg p-6 bg-gray-900/50">
                <h3 className="text-xl font-bold text-yellow-400 mb-4">Course Materials</h3>
                <div className="space-y-3">
                  {selectedCourse.materials.map((material) => (
                    <a
                      key={material._id}
                      href={material.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-gray-700 rounded-lg p-4 hover:border-green-500 transition hover:bg-gray-800"
                    >
                      <p className="font-semibold text-white">{material.title}</p>
                      <p className="text-gray-400 text-sm mt-1">Type: {material.type}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Chat & Community */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border-2 border-green-500 rounded-lg p-6 bg-gray-900/50 flex flex-col items-center justify-center">
                <MessageCircle size={32} className="text-green-400 mb-2" />
                <p className="text-white font-bold mb-2">Chat Support</p>
                <button className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition">
                  Start Chat
                </button>
              </div>
              <div className="border-2 border-green-500 rounded-lg p-6 bg-gray-900/50 flex flex-col items-center justify-center">
                <MessageCircle size={32} className="text-yellow-400 mb-2" />
                <p className="text-white font-bold mb-2">WhatsApp Community</p>
                <a
                  href="https://chat.whatsapp.com/your-group"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition"
                >
                  Join Group
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
