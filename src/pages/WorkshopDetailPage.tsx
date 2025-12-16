import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Users, Clock, DollarSign, PlayCircle, MessageCircle, ChevronDown } from 'lucide-react';
import axios from 'axios';
import WorkshopModeBadge from '../components/WorkshopModeBadge';
import AboutWorkshop from '../components/workshop/AboutWorkshop';
import VideoCarousel from '../components/workshop/VideoCarousel';
import TextTestimonies from '../components/workshop/TextTestimonies';
import VideoTestimonies from '../components/workshop/VideoTestimonies';
import WhoIsForGrid from '../components/workshop/WhoIsForGrid';
import BenefitsSection from '../components/workshop/BenefitsSection';
import StickyMobileCTA from '../components/workshop/StickyMobileCTA';

interface Workshop {
  _id: string;
  title: string;
  description: string;
  heroImage: string;
  heroVideo?: string;
  thumbnail: string;
  category: string;
  level: string;
  duration: number;
  totalSessions: number;
  instructor: { name: string; bio?: string; photo?: string };
  languages: string[];
  averageRating: number;
  totalReviews: number;
  totalEnrollments: number;
  batches: any[];
  sessions: any[];
  testimonials: any[];
  benefits: string[];
  whatYouWillLearn: string[];
  requirements: string[];
  faq: any[];
  slug: string;
}

export default function WorkshopDetailPage() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    // Prevent treating reserved words as valid workshop slugs
    if (workshopId === 'register') {
      navigate('/workshops', { replace: true });
      return;
    }

    if (!workshopId) return;

    fetchWorkshop(workshopId);
  }, [workshopId, navigate]);

  const fetchWorkshop = async (identifier: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/workshops/${identifier}`);
      const data = response.data.data || response.data;
      setWorkshop(data);
      if (data.batches && data.batches.length > 0) {
        setSelectedBatch(data.batches[0]);
      }
    } catch (error) {
      console.error('Error fetching workshop:', error);
      setWorkshop(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workshop details...</p>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Workshop not found</p>
          <button
            onClick={() => navigate('/workshops')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Workshops
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative h-96 bg-gray-900 overflow-hidden">
        <img
          src={workshop.heroImage}
          alt={workshop.title}
          className="w-full h-full object-cover"
        />
        {workshop.heroVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <PlayCircle className="w-20 h-20 text-white cursor-pointer hover:scale-110 transition-transform" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <h1 className="text-4xl font-bold text-white mb-2">{workshop.title}</h1>
          <p className="text-indigo-200 text-lg">By {workshop.instructor.name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Rating & Stats */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.round(workshop.averageRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">({workshop.totalReviews} reviews)</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200">
                  <MessageCircle className="w-4 h-4" />
                  Questions?
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{workshop.totalEnrollments}</p>
                  <p className="text-sm text-gray-600">Enrolled</p>
                </div>
                <div>
                  <Clock className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{workshop.duration}</p>
                  <p className="text-sm text-gray-600">Days</p>
                </div>
                <div>
                  <PlayCircle className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-800">{workshop.totalSessions}</p>
                  <p className="text-sm text-gray-600">Sessions</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">About this course</h2>
              <p className="text-gray-600 leading-relaxed">{workshop.description}</p>
            </div>

            {/* What You Will Learn */}
            {workshop.whatYouWillLearn && workshop.whatYouWillLearn.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">What you will learn</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {workshop.whatYouWillLearn.map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sessions */}
            {workshop.sessions && workshop.sessions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Course content</h2>
                <div className="space-y-2">
                  {workshop.sessions.map((session: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <span className="text-indigo-600 font-semibold">{session.sessionId}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{session.title}</h3>
                          <p className="text-sm text-gray-600">{session.duration} minutes</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonials */}
            {workshop.testimonials && workshop.testimonials.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Student testimonials</h2>
                <div className="space-y-4">
                  {workshop.testimonials.slice(0, 3).map((testimonial: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">{testimonial.name}</h3>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < testimonial.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-600 text-sm">{testimonial.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ */}
            {workshop.faq && workshop.faq.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Frequently asked questions</h2>
                <div className="space-y-2">
                  {workshop.faq.map((faq: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className="font-semibold text-gray-800 text-left">{faq.question}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 transition-transform ${
                            expandedFaq === idx ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {expandedFaq === idx && (
                        <div className="p-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-600">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Enrollment Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Choose your batch</h3>

              {/* Mode Selection */}
              {workshop?.batches && workshop.batches.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Available Modes</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {Array.from(new Set(workshop.batches.map((b: any) => b.mode))).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          const batch = workshop.batches.find((b: any) => b.mode === mode);
                          if (batch) setSelectedBatch(batch);
                        }}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          selectedBatch?.mode === mode
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <WorkshopModeBadge mode={mode as any} size="sm" showLabel={false} />
                        </div>
                        <span className="text-xs font-semibold capitalize text-gray-700">{mode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedBatch && (
                <div className="mb-6 space-y-3">
                  {/* Mode Icon & Label */}
                  <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-lg">
                    <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                      <WorkshopModeBadge mode={selectedBatch.mode as any} size="lg" showLabel={false} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Delivery Mode</p>
                      <p className="font-bold text-lg capitalize text-gray-800">{selectedBatch.mode}</p>
                    </div>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Schedule</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(selectedBatch.startDate).toLocaleDateString()} -
                      {new Date(selectedBatch.endDate).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Seats available</p>
                    <p className="font-semibold text-gray-800">
                      {selectedBatch.capacity - selectedBatch.enrolledCount}/{selectedBatch.capacity}
                    </p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-2">Price</p>
                    <div className="space-y-1">
                      <p className="font-semibold text-gray-800">₹ {selectedBatch.pricing.INR}</p>
                      <p className="text-sm text-gray-600">NPR {selectedBatch.pricing.NPR}</p>
                      <p className="text-sm text-gray-600">$ {selectedBatch.pricing.USD}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() =>
                  navigate(`/workshops/${workshop.slug || workshop._id}/register`, {
                    state: { selectedBatch }
                  })
                }
                className="w-full px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 mb-3"
              >
                Enroll now
              </button>

              <button className="w-full px-4 py-3 border-2 border-indigo-600 text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50">
                Wishlist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* About Workshop Section */}
      <AboutWorkshop
        image={workshop.thumbnail}
        title={workshop.title}
        description={workshop.description}
        whatYouWillLearn={workshop.whatYouWillLearn || []}
        whoIsItFor={workshop.requirements || []}
        duration={`${workshop.duration} days`}
        level={workshop.level}
      />

      {/* Watch More Videos Section */}
      <VideoCarousel
        videos={(workshop.sessions || []).map((s: any) => ({
          url: s.videoUrl || '',
          title: s.title
        })).filter((v: any) => v.url)}
        title="Watch More Videos"
      />

      {/* Text Testimonies */}
      <TextTestimonies
        testimonials={(workshop.testimonials || []).map((t: any) => ({
          quote: t.text || t.testimonial || '',
          name: t.name || 'Anonymous',
          location: t.location || 'India',
          workshopName: workshop.title
        }))}
      />

      {/* Video Testimonies */}
      <VideoTestimonies
        videos={(workshop.testimonials || []).filter((t: any) => t.videoUrl).map((t: any) => ({
          url: t.videoUrl,
          studentName: t.name || 'Anonymous',
          location: t.location || 'India'
        }))}
      />

      {/* Who Is For Grid */}
      <WhoIsForGrid categories={workshop.requirements} />

      {/* Benefits Section */}
      <BenefitsSection benefits={workshop.benefits || []} />

      {/* Sticky Mobile CTA */}
      <StickyMobileCTA
        workshopTitle={workshop.title}
        onCtaClick={() =>
          navigate(`/workshops/${workshop.slug || workshop._id}/register`, {
            state: { selectedBatch }
          })
        }
      />
    </div>
  );
}
