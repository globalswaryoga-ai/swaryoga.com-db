'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Play, Users, Calendar, Video } from 'lucide-react';

interface Course {
  _id: string;
  slug: string;
  content: {
    en: { title: string; description?: string };
  };
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

export default function CourseDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/recorded-courses?slug=${slug}`);
        const data = await res.json();

        if (data.success && data.course) {
          setCourse(data.course);
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
  const originalPrice = course.discount ? Math.round(priceINR / (1 - course.discount / 100)) : priceINR;
  const discountedPrice = priceINR;
  const discountAmount = originalPrice - discountedPrice;

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gray-50 border-b p-6">
        <Link href="/e-learning" className="flex items-center gap-2 text-green-600 hover:text-green-700">
          <ArrowLeft size={20} /> Back to Courses
        </Link>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {course.thumbnail && (
          <div className="mb-8 rounded-2xl overflow-hidden">
            <img src={course.thumbnail} alt={course.content.en.title} className="w-full h-96 object-cover" />
          </div>
        )}

        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2">
            <h1 className="text-4xl font-bold text-black mb-4">{course.content.en.title}</h1>
            
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
                <span>{course.enrolledCount || 0} students</span>
              </div>
            </div>

            {course.content.en.description && (
              <div>
                <h2 className="text-2xl font-bold text-black mb-4">About This Course</h2>
                <p className="text-gray-700 leading-relaxed">{course.content.en.description}</p>
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
                        <p className="text-gray-400 line-through text-lg mb-2">
                          ₹{originalPrice.toLocaleString()}
                        </p>
                        <p className="text-4xl font-bold text-green-600 mb-2">
                          ₹{discountedPrice.toLocaleString()}
                        </p>
                        <div className="bg-red-100 text-red-700 rounded-lg py-2 px-3 text-sm font-semibold mb-4">
                          Save ₹{discountAmount.toLocaleString()} ({course.discount}% OFF)
                        </div>
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

              <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-2">
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
    </div>
  );
}
