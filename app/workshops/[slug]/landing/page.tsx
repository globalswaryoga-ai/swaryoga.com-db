'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { Play, X, Star, MessageSquareText } from 'lucide-react';
import { findWorkshopBySlug, workshopLandingPages } from '@/lib/workshopsData';
import EnquiryFormModal from '@/components/EnquiryFormModal';

export const dynamic = 'force-dynamic';

// Fee mapping for all workshops
const WORKSHOP_FEES: Record<string, { minPrice: number; maxPrice: number; currency: string }> = {
  'yogasana-sadhana': { minPrice: 330, maxPrice: 330, currency: 'INR' },
  'swar-yoga-level-1': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-2': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-youth': { minPrice: 999, maxPrice: 999, currency: 'INR' },
  'weight-loss': { minPrice: 6600, maxPrice: 6600, currency: 'INR' },
  'meditation': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'amrut-aahar': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'astavakra': { minPrice: 5910, maxPrice: 5910, currency: 'INR' },
  'pre-pregnancy': { minPrice: 3600, maxPrice: 3600, currency: 'INR' },
  'swy-children': { minPrice: 600, maxPrice: 600, currency: 'INR' },
  'complete-health': { minPrice: 4200, maxPrice: 4200, currency: 'INR' },
  'corporate-swy': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'self-awareness': { minPrice: 3600, maxPrice: 3600, currency: 'INR' },
  'happy-marriage': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'gurukul-training': { minPrice: 4500, maxPrice: 4500, currency: 'INR' },
  'swy-teacher': { minPrice: 33000, maxPrice: 33000, currency: 'INR' },
  'gurukul-organiser-training': { minPrice: 45000, maxPrice: 45000, currency: 'INR' },
  'naturopathy': { minPrice: 14900, maxPrice: 14900, currency: 'INR' },
};

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const addMonths = (d: Date, months: number) => {
  const copy = new Date(d.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
};

const formatDate = (iso: string) => {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatScheduleTime = (s: any) => {
  const direct = String((s as any)?.time || '').trim();
  if (direct) return direct;
  const parts = [String((s as any)?.startTime || '').trim(), String((s as any)?.endTime || '').trim()].filter(Boolean);
  return parts.join(' - ');
};

function pickDetailVideos(landingData: LandingPageData): Array<{ title: string; url: string }> {
  const dv = (landingData as any)?.detailVideos;
  if (Array.isArray(dv) && dv.length) return dv.slice(0, 3);
  // Fallback to existing highlight videos
  return (landingData.highlightVideos || []).slice(0, 3);
}

type DbSchedule = {
  id: string;
  workshopSlug: string;
  workshopName?: string;
  mode: string;
  language?: string;
  batch?: string;
  startDate?: string | null;
  endDate?: string | null;
  days?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  seatsTotal?: number;
  registrationCloseDate?: string | null;
  location?: string;
  price?: number;
  currency?: string;
};

const blinkingStyles = `
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .blink-btn {
    animation: blink 1.5s infinite;
  }
`;

type VideoModalProps = {
  videoUrl: string;
  onClose: () => void;
};

const VideoModal: React.FC<VideoModalProps> = ({ videoUrl, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <X size={32} />
        </button>
        <div className="w-full aspect-video">
          <iframe
            src={videoUrl}
            title="Workshop Video"
            className="w-full h-full rounded-lg"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

interface LandingPageData {
  heroImage: string;
  introVideoUrl: string;
  whatYouWillLearn: string[];
  highlightVideos: Array<{ title: string; url: string }>;
  detailVideos?: Array<{ title: string; url: string }>;
  mentorInfo: string;
  testimonials: Array<{ quote: string; name: string; place: string }>;
  videoTestimonials: Array<{ name: string; url: string }>;
  finalCTA: string;
}

type LocalReview = {
  id: string;
  name: string;
  rating: number; // 1..5
  review: string;
  createdAt: string;
};

const REVIEWS_STORAGE_KEY = (slug: string) => `workshop_reviews_v1:${slug}`;

function clampRating(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function Stars({ value }: { value: number }) {
  const v = clampRating(value);
  return (
    <div className="flex items-center gap-1" aria-label={`${v} star rating`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < v ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
        />
      ))}
    </div>
  );
}

export default function WorkshopLandingPage({ params }: { params: { slug: string } }) {
  const workshop = findWorkshopBySlug(params.slug);

  if (!workshop) {
    notFound();
  }

  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);
  const [allSchedules, setAllSchedules] = useState<DbSchedule[]>([]);
  const [enquiryModal, setEnquiryModal] = useState<{ isOpen: boolean; month: string }>({ isOpen: false, month: '' });
  const [formModalOpen, setFormModalOpen] = useState(false);

  // Reviews (localStorage backed for now)
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [reviewForm, setReviewForm] = useState<{ name: string; rating: number; review: string }>({
    name: '',
    rating: 5,
    review: '',
  });

  // Fetch schedules
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const res = await fetch('/api/workshops/schedules', { cache: 'no-store' });
        const json = await res.json();
        if (Array.isArray(json?.data)) {
          setAllSchedules(json.data);
        }
      } catch (err) {
        console.error('Failed to fetch schedules:', err);
      }
    };
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY(params.slug));
      const parsed = raw ? (JSON.parse(raw) as LocalReview[]) : [];
      if (Array.isArray(parsed)) setReviews(parsed);
    } catch {
      // ignore
    }
  }, [params.slug]);

  // Filter schedules for this workshop
  const schedulesFor = useMemo(() => {
    return allSchedules.filter((s) => s.workshopSlug === params.slug);
  }, [allSchedules, params.slug]);

  // Generate 6 month blocks
  const sixMonthBlocks = useMemo(() => {
    if (schedulesFor.length === 0) {
      return Array.from({ length: 6 }, (_, i) => {
        const d = addMonths(new Date(), i);
        return {
          label: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
          dateText: 'Coming soon',
          available: false,
        };
      });
    }

    const dated = schedulesFor
      .map((s) => ({ s, ms: s.startDate ? Date.parse(String(s.startDate)) : NaN }))
      .filter((p) => !Number.isNaN(p.ms))
      .sort((a, b) => a.ms - b.ms);

    const today = new Date();
    const monthStarts = Array.from({ length: 6 }, (_, i) => {
      const d = addMonths(today, i);
      return new Date(d.getFullYear(), d.getMonth(), 1);
    });

    return monthStarts.map((m) => {
      const key = monthKey(m);
      const inMonth = dated.filter((p) => monthKey(new Date(p.ms)) === key);
      const picked = inMonth[0]?.s;
      const count = inMonth.length;
      const pickedTime = picked ? formatScheduleTime(picked) : '';
      const timeSuffix = pickedTime ? ` • ${pickedTime}` : '';
      return {
        label: m.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        dateText: picked
          ? `${formatDate(String(picked.startDate))}${timeSuffix}${count > 1 ? ` (${count} batches)` : ''}`
          : 'Coming soon',
        available: Boolean(picked),
      };
    });
  }, [schedulesFor]);
  
  // Get landing page data for this workshop
  const landingData: LandingPageData = workshopLandingPages[params.slug] || {
    heroImage: workshop.image,
    introVideoUrl: workshop.videoUrl || 'https://www.youtube.com/embed/mzYKqFxYzQU',
    whatYouWillLearn: [
      'Master the core principles of this transformative practice',
      'Develop practical skills applicable to daily life',
      'Improve physical health and mental clarity',
      'Build spiritual awareness and inner peace',
      'Create lasting positive changes in your life'
    ],
    highlightVideos: [
      { title: 'Introduction', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'Key Techniques', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' },
      { title: 'Success Stories', url: 'https://www.youtube.com/embed/5nqVXQG9Mvk' }
    ],
    detailVideos: [
      { title: 'More Details – 1', url: 'https://www.youtube.com/embed/mzYKqFxYzQU' },
      { title: 'More Details – 2', url: 'https://www.youtube.com/embed/0q2FWUqqqPs' },
      { title: 'More Details – 3', url: 'https://www.youtube.com/embed/5nqVXQG9Mvk' }
    ],
    mentorInfo: 'Our experienced mentors have 25+ years of expertise in guiding students through transformative journeys. They provide personalized guidance and support throughout your program.',
    testimonials: [
      { quote: 'This program changed my life completely!', name: 'Participant One', place: 'Delhi' },
      { quote: 'Simple techniques with profound impact.', name: 'Participant Two', place: 'Mumbai' },
      { quote: 'I experienced real improvements in my health and wellbeing.', name: 'Participant Three', place: 'Bangalore' },
      { quote: 'Highly recommended for anyone seeking transformation.', name: 'Participant Four', place: 'Pune' }
    ],
    videoTestimonials: [
      { name: 'Participant 1', url: 'https://www.youtube.com/embed/T3qQdIj7f0Y' },
      { name: 'Participant 2', url: 'https://www.youtube.com/embed/cklZSXAWA5U' },
      { name: 'Participant 3', url: 'https://www.youtube.com/embed/y90cV_3OMrQ' },
      { name: 'Participant 4', url: 'https://www.youtube.com/embed/8HWaFGJz6Yw' }
    ],
    finalCTA: `Join ${workshop.name} and transform your life. Enroll now for this extraordinary opportunity.`
  };

  const detailVideos = useMemo(() => pickDetailVideos(landingData), [landingData]);

  // Detect if workshop has ANY confirmed dates (at least one schedule with startDate)
  const hasConfirmedDates = useMemo(() => {
    return schedulesFor.length > 0 && schedulesFor.some((s) => s.startDate);
  }, [schedulesFor]);

  // New canonical registration URL format:
  // /registration/<mode>/<language>/<workshopSlug>
  // Defaulting to online + hindi (can be made dynamic later)
  const registerLink = `/registration/online/hindi/${workshop.slug}`;

  const openForm = (monthLabel: string) => {
    // Keep month context (current/coming soon) but open a single consistent form.
    setEnquiryModal({ isOpen: true, month: monthLabel });
    setFormModalOpen(true);
  };

  const submitLocalReview = () => {
    const name = reviewForm.name.trim();
    const review = reviewForm.review.trim();
    const rating = clampRating(reviewForm.rating);
    if (!name || !review) return;

    const next: LocalReview[] = [
      {
        id: `r-${Date.now()}`,
        name,
        rating,
        review,
        createdAt: new Date().toISOString(),
      },
      ...reviews,
    ];
    setReviews(next);
    try {
      window.localStorage.setItem(REVIEWS_STORAGE_KEY(params.slug), JSON.stringify(next));
    } catch {
      // ignore
    }
    setReviewForm({ name: '', rating: 5, review: '' });
  };

  return (
    <>
      <style>{blinkingStyles}</style>
      <Navigation />

      <main className="mt-16 sm:mt-20 bg-white">
        {/* Sticky modern CTA (does NOT remove any existing buttons) */}
        <div className="sticky top-[64px] z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                <MessageSquareText className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <div className="font-extrabold text-gray-900 leading-tight">Fill the Form</div>
                <div className="text-xs text-gray-600">
                  {hasConfirmedDates ? 'Secure your seat & pay now' : 'Current batch or Next batch enquiry'}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormModalOpen(true)}
                className="rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black px-5 py-3 shadow-sm active:scale-[0.99]"
              >
                {hasConfirmedDates ? '💳 Pay Now' : '📝 Book Seat'}
              </button>
              <Link
                href={registerLink}
                className="rounded-2xl border-2 border-green-700 text-green-800 hover:bg-green-50 font-black px-5 py-3"
              >
                Register Page
              </Link>
            </div>
          </div>
        </div>

        {/* MODERN VIDEO SECTION: Main + 3 Detail Videos (ADD-ONLY) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6">
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Main Video */}
            <div className="lg:col-span-8">
              <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-xl">
                <div className="p-5 sm:p-6 flex items-center justify-between bg-gradient-to-r from-green-50 to-white border-b border-gray-100">
                  <div>
                    <div className="text-xs font-black uppercase tracking-wider text-gray-500">Main Video</div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{workshop.name} – Overview</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveVideoModal(landingData.introVideoUrl)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black px-4 py-2 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    Play
                  </button>
                </div>
                <div className="px-5 sm:px-6 pb-6 pt-6">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                    <iframe
                      src={landingData.introVideoUrl}
                      title="Workshop Intro Video"
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3 Detail Videos */}
            <div className="lg:col-span-4">
              <div className="rounded-3xl border border-gray-200 bg-white shadow-xl p-5 sm:p-6">
                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Workshop Details</div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-4">3 Quick Videos</h3>
                <div className="space-y-3">
                  {detailVideos.map((v, idx) => (
                    <button
                      key={`${v.title}-${idx}`}
                      type="button"
                      onClick={() => setActiveVideoModal(v.url)}
                      className="w-full text-left rounded-2xl border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors p-4 flex items-start gap-3 active:scale-95"
                    >
                      <div className="h-10 w-10 rounded-xl bg-green-700 text-white flex items-center justify-center font-black flex-shrink-0 text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-gray-900 text-sm line-clamp-1">{v.title}</div>
                        <div className="text-xs text-gray-500">Tap to play</div>
                      </div>
                      <Play className="w-4 h-4 text-green-700 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-green-900 mb-4 leading-tight">
                {workshop.name}
              </h1>
              <h2 className="text-2xl font-semibold text-green-700 mb-6">
                Transform Your Life Today
              </h2>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                {workshop.detailedDescription || workshop.description}
              </p>

              <div className="bg-green-50 border-l-4 border-green-700 p-6 rounded mb-8">
                <p className="text-sm font-semibold text-gray-700 mb-4">Program Details:</p>
                <div className="space-y-2 text-gray-700">
                  <p><strong>Duration:</strong> {workshop.duration}</p>
                  <p><strong>Level:</strong> {workshop.level}</p>
                  <p><strong>Category:</strong> {workshop.category}</p>
                  <p><strong>Available Modes:</strong> {workshop.mode?.join(', ') || 'Online'}</p>
                </div>
              </div>

              <Link
                href={registerLink}
                className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
              >
                Register Now
              </Link>
            </div>

            <div className="relative h-96 sm:h-full rounded-lg overflow-hidden shadow-2xl group">
              <Image
                src={landingData.heroImage}
                alt={workshop.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                <div className="p-6 text-white">
                  <p className="font-semibold text-lg">{workshop.name}</p>
                  <p className="text-sm opacity-90">{workshop.category}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="text-center py-8 bg-green-50">
          <Link
            href={registerLink}
            className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
          >
            Register Now
          </Link>
        </section>

        {/* PROGRAM INFO BLOCKS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Duration Block */}
            <div className="bg-gradient-to-br from-green-100 to-green-50 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              <div className="text-5xl font-bold text-green-900 mb-3">⏱️</div>
              <div className="text-4xl font-bold text-green-900 mb-3">{workshop.duration}</div>
              <div className="text-lg font-bold text-green-900">Duration</div>
            </div>

            {/* Mode Block */}
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              <div className="text-5xl font-bold text-blue-900 mb-3">💻</div>
              <div className="text-2xl font-bold text-blue-900 mb-3">
                {workshop.mode?.join(' / ') || 'Online'}
              </div>
              <div className="text-lg font-bold text-blue-900">Mode</div>
            </div>

            {/* Price Block */}
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              <div className="text-5xl font-bold text-purple-900 mb-3">💰</div>
              <div className="text-2xl font-bold text-purple-900 mb-3">
                {WORKSHOP_FEES[params.slug]
                  ? WORKSHOP_FEES[params.slug].minPrice === WORKSHOP_FEES[params.slug].maxPrice
                    ? `₹${WORKSHOP_FEES[params.slug].minPrice.toLocaleString('en-IN')}`
                    : `₹${WORKSHOP_FEES[params.slug].minPrice.toLocaleString('en-IN')} - ₹${WORKSHOP_FEES[params.slug].maxPrice.toLocaleString('en-IN')}`
                  : 'Enquire'}
              </div>
              <div className="text-lg font-bold text-purple-900">Fees</div>
              <div className="text-xs text-purple-700 mt-2">({WORKSHOP_FEES[params.slug]?.currency || 'INR'})</div>
            </div>

            {/* Language Block */}
            <div className="bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px] shadow-md hover:shadow-lg transition-shadow transform hover:scale-105">
              <div className="text-5xl font-bold text-orange-900 mb-3">🌐</div>
              <div className="text-2xl font-bold text-orange-900 mb-3">
                {workshop.language?.join(' / ') || 'English'}
              </div>
              <div className="text-lg font-bold text-orange-900">Language</div>
            </div>
          </div>
        </section>

        {/* SMART BOOK/PAY FORM SECTION (Add-Only) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="bg-gradient-to-br from-green-50 to-white rounded-3xl border-2 border-green-200 p-8 sm:p-12 shadow-xl">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left: Info & Button */}
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-green-900 mb-4">
                  {hasConfirmedDates ? '💳 Ready to Join?' : '📋 Interested?'}
                </h2>
                <p className="text-gray-700 text-lg mb-2 leading-relaxed">
                  {hasConfirmedDates
                    ? `This workshop has confirmed dates. Fill the form below and proceed to payment.`
                    : `Dates coming soon? Fill the form to secure your spot and we'll notify you when registration opens.`}
                </p>
                <p className="text-gray-600 text-sm mb-6">
                  ✓ All data goes directly to our CRM system  
                  ✓ You'll receive a 6-digit Lead ID  
                  ✓ Our team will follow up within 24 hours
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(true)}
                    className="rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black px-8 py-4 shadow-lg active:scale-95 transition-all text-lg flex items-center gap-2"
                  >
                    {hasConfirmedDates ? '💳 Pay Now' : '📝 Book Seat'}
                  </button>
                  <Link
                    href={registerLink}
                    className="rounded-2xl border-2 border-green-700 text-green-800 hover:bg-green-50 font-black px-8 py-4 transition-all text-lg"
                  >
                    Full Registration
                  </Link>
                </div>
              </div>

              {/* Right: Form Preview */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-md">
                <div className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">Quick Form</div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Name</label>
                    <div className="mt-1 h-10 bg-gray-100 rounded-lg"></div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Mobile</label>
                    <div className="mt-1 h-10 bg-gray-100 rounded-lg"></div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-gray-700">Email</label>
                    <div className="mt-1 h-10 bg-gray-100 rounded-lg"></div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(true)}
                    className="w-full mt-4 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black py-3 transition-colors"
                  >
                    {hasConfirmedDates ? 'Pay Now' : 'Book Seat'}
                  </button>
                  <p className="text-xs text-gray-500 text-center pt-2">Click to open full form</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6-MONTH DATES SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8 text-center">
            📅 Available Dates (Next 6 Months)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {sixMonthBlocks.map((b) => (
              <div
                key={b.label}
                className={`rounded-lg px-3 py-4 border-2 font-semibold transition-all text-center cursor-pointer transform hover:scale-105 ${
                  b.available
                    ? 'bg-gradient-to-br from-green-100 to-green-50 border-green-400 text-green-900 shadow-md hover:shadow-xl'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-green-500 hover:bg-green-50'
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wide mb-1">{b.label}</div>
                <div className={`text-xs mb-2 font-semibold ${b.available ? 'text-green-700' : 'text-gray-500'}`}>
                  {b.dateText}
                </div>
                {!b.available && (
                  <button
                    type="button"
                    onClick={() => setEnquiryModal({ isOpen: true, month: b.label })}
                    className="w-full mt-2 rounded-md px-2 py-1 bg-green-600 text-white text-xs font-bold hover:bg-green-700 transition-colors active:scale-95"
                  >
                    Enquire
                  </button>
                )}
                {b.available && (
                  <div className="text-[10px] text-green-600 mt-1 font-bold">✓ Open</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8 text-center">
            Program Introduction
          </h2>
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-xl">
            <iframe
              src={landingData.introVideoUrl}
              title="Program Introduction"
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        </section>

        {/* PROGRAM DETAILS VIDEOS (3 small videos for more details) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8 text-center">
            � More Details (3 Videos)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {(landingData.detailVideos || landingData.highlightVideos.slice(0, 3)).slice(0, 3).map((v, idx) => (
              <div
                key={idx}
                className="group relative h-48 md:h-56 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:scale-[1.02] cursor-pointer"
                onClick={() => setActiveVideoModal(v.url)}
              >
                <iframe
                  src={v.url}
                  title={v.title}
                  className="w-full h-full pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all flex items-center justify-center">
                  <div className="bg-white/10 group-hover:bg-white/25 rounded-full p-4 transition-all">
                    <Play className="w-7 h-7 text-white" fill="white" />
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="text-white font-bold text-sm line-clamp-1">{v.title}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="text-center py-8 bg-green-50">
          <Link
            href={registerLink}
            className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
          >
            Register Now
          </Link>
        </section>

        {/* WHAT YOU WILL LEARN */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            What You Will Learn
          </h2>
          <ul className="space-y-4">
            {landingData.whatYouWillLearn.map((item, idx) => (
              <li key={idx} className="flex items-start gap-4">
                <span className="text-green-700 font-bold text-2xl">✓</span>
                <span className="text-gray-700 text-lg leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA SECTION */}
        <section className="text-center py-8 bg-green-50">
          <Link
            href={registerLink}
            className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
          >
            Register Now
          </Link>
        </section>

        {/* LEARNING HIGHLIGHTS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            Learning Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingData.highlightVideos.map((video, idx) => (
              <div
                key={idx}
                className="relative h-64 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                onClick={() => setActiveVideoModal(video.url)}
              >
                <iframe
                  src={video.url}
                  title={video.title}
                  className="w-full h-full pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <div className="bg-white/0 group-hover:bg-white/20 rounded-full p-4 transition-all">
                    <Play className="w-8 h-8 text-white" fill="white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* MENTOR INFO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            About the Mentor
          </h2>
          <div className="bg-green-50 rounded-lg p-8 border border-green-200">
            <p className="text-gray-700 text-lg leading-relaxed">
              {landingData.mentorInfo}
            </p>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            Participant Experiences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {landingData.testimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="bg-green-50 rounded-lg p-6 border border-green-200 hover:shadow-lg transition-shadow"
              >
                <p className="text-gray-700 text-lg italic mb-4">"{testimonial.quote}"</p>
                <div className="border-t border-green-200 pt-4">
                  <p className="text-green-700 font-semibold">{testimonial.name}</p>
                  <p className="text-gray-600 text-sm">{testimonial.place}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SCROLLING TESTIMONIALS MARQUEE (ADD-ONLY) */}
        <section className="max-w-full bg-gradient-to-r from-green-50 via-white to-green-50 py-12 overflow-hidden">
          <div className="mx-auto px-4">
            <style>{`
              @keyframes scroll-left {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
              .marquee {
                display: flex;
                gap: 2rem;
                animation: scroll-left 60s linear infinite;
              }
              .marquee:hover {
                animation-play-state: paused;
              }
              .marquee-item {
                flex: 0 0 auto;
                min-width: 280px;
              }
            `}</style>
            <div className="marquee">
              {[...landingData.testimonials, ...landingData.testimonials].map((t, idx) => (
                <div key={`marquee-${idx}`} className="marquee-item">
                  <div className="rounded-2xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow h-full">
                    <p className="text-gray-700 text-sm italic line-clamp-2 mb-3">"{t.quote}"</p>
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-green-700 font-bold text-sm">{t.name}</p>
                      <p className="text-gray-500 text-xs">{t.place}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA SECTION */}
        <section className="text-center py-8 bg-green-50">
          <Link
            href={registerLink}
            className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
          >
            Register Now
          </Link>
        </section>

        {/* VIDEO TESTIMONIALS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            Video Testimonials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {landingData.videoTestimonials.map((testimonial, idx) => (
              <div
                key={idx}
                className="relative h-64 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                onClick={() => setActiveVideoModal(testimonial.url)}
              >
                <iframe
                  src={testimonial.url}
                  title={testimonial.name}
                  className="w-full h-full pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <div className="bg-white/0 group-hover:bg-white/20 rounded-full p-4 transition-all">
                    <Play className="w-8 h-8 text-white" fill="white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* REVIEWS (Stars + written reviews) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">⭐ Reviews</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Write review */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="font-extrabold text-gray-900 mb-4">Write a review</div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">Your Name</label>
                  <input
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">Rating</label>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const starValue = i + 1;
                      const active = starValue <= reviewForm.rating;
                      return (
                        <button
                          key={starValue}
                          type="button"
                          onClick={() => setReviewForm((p) => ({ ...p, rating: starValue }))}
                          className="p-1"
                          aria-label={`Set rating ${starValue}`}
                        >
                          <Star className={`h-7 w-7 ${active ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        </button>
                      );
                    })}
                    <span className="text-sm font-bold text-gray-700">{reviewForm.rating}/5</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">Review</label>
                  <textarea
                    value={reviewForm.review}
                    onChange={(e) => setReviewForm((p) => ({ ...p, review: e.target.value }))}
                    className="w-full min-h-[120px] rounded-xl border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Share your experience…"
                  />
                </div>
                <button
                  type="button"
                  onClick={submitLocalReview}
                  disabled={!reviewForm.name.trim() || !reviewForm.review.trim()}
                  className="w-full rounded-2xl bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white font-black py-3"
                >
                  Submit Review
                </button>
                <p className="text-xs text-gray-500">
                  Note: Reviews are stored in this browser for now. We can connect to database next.
                </p>
              </div>
            </div>

            {/* Reviews list */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="font-extrabold text-gray-900">Latest reviews</div>
                <div className="text-sm text-gray-600">{reviews.length} total</div>
              </div>
              {reviews.length === 0 ? (
                <div className="text-sm text-gray-600">No reviews yet. Be the first to write one.</div>
              ) : (
                <div className="space-y-4">
                  {reviews.slice(0, 8).map((r) => (
                    <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-gray-900">{r.name}</div>
                          <div className="mt-1"><Stars value={r.rating} /></div>
                        </div>
                        <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                      <p className="mt-3 text-sm text-gray-700 leading-relaxed">{r.review}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* MASTER CLASS LEVELS SECTION - Only for master-swar-yoga */}
        {params.slug === 'master-swar-yoga' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <div className="mb-12 text-center">
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Master Swar Yoga – Level 1 to 5
              </h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                The complete 6-month journey combining all five levels in a single guided progression
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { slug: 'swar-yoga-level-1', name: 'Swar Yoga', label: 'L-1' },
                { slug: 'swar-yoga-level-2', name: 'Aham Brahmasmi', label: 'L-2' },
                { slug: 'astavakra', name: 'Astavakra Dhyan', label: 'L-3' },
                { slug: 'swar-yoga-level-4', name: 'Swar Yoga', label: 'L-4' },
                { slug: 'bandhan-mukti', name: 'Bandhan Mukti', label: 'L-5' }
              ].map((level) => (
                <Link
                  key={level.slug}
                  href={`/workshops/${level.slug}/landing`}
                  className="group relative rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                >
                  {/* Card Background Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-transparent to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Level Badge */}
                  <div className="relative z-10 p-6 pb-4">
                    <div className="inline-block mb-3">
                      <span className="inline-block bg-gradient-to-r from-green-600 to-blue-600 text-white font-black px-4 py-2 rounded-full text-sm">
                        {level.label}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-green-700 transition-colors">
                      {level.name}
                    </h3>
                  </div>

                  {/* Content */}
                  <div className="relative z-10 px-6 py-4 flex-grow flex flex-col justify-between">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {level.slug === 'swar-yoga-level-1' && 'Learn the foundational principles of Swar Yoga and breathing techniques.'}
                      {level.slug === 'swar-yoga-level-2' && 'Explore the deeper philosophy: "I am Brahman" consciousness.'}
                      {level.slug === 'astavakra' && 'Advanced meditation using Astavakra Gita teachings and non-dual wisdom.'}
                      {level.slug === 'swar-yoga-level-4' && 'Master advanced Swar Yoga practices and integration techniques.'}
                      {level.slug === 'bandhan-mukti' && 'Liberation from limitation through the highest Swar Yoga practices.'}
                    </p>

                    {/* CTA Arrow */}
                    <div className="mt-4 flex items-center gap-2 text-green-700 font-bold text-sm group-hover:translate-x-2 transition-transform">
                      <span>Explore</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Hover Border Effect */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-green-400 transition-colors pointer-events-none" />
                </Link>
              ))}
            </div>

            {/* Info Text */}
            <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-blue-50 border border-blue-200">
              <p className="text-gray-700 text-center leading-relaxed">
                <span className="font-bold text-blue-900">Complete Your Journey:</span> Enroll in Master Swar Yoga and access all 5 levels with flexible monthly or discounted 3-month payment plans. New batches start every month with 3 days/week classes.
              </p>
            </div>
          </section>
        )}

        {/* FINAL CTA */}
        <section className="bg-green-50 py-16 sm:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-6">
              Transform Your Life with {workshop.name}
            </h2>
            <p className="text-gray-700 text-lg mb-8 max-w-2xl mx-auto">
              {landingData.finalCTA}
            </p>
            <Link
              href={registerLink}
              className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-lg transition-all font-bold text-lg"
            >
              Enroll Now
            </Link>
          </div>
        </section>

        {/* FIXED BOTTOM BUTTON */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link
            href={registerLink}
            className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg shadow-lg"
          >
            Register Now
          </Link>
        </div>
      </main>

      {/* VIDEO MODAL */}
      {activeVideoModal && (
        <VideoModal videoUrl={activeVideoModal} onClose={() => setActiveVideoModal(null)} />
      )}

      {/* ENQUIRY MODAL */}
      {(enquiryModal.isOpen || formModalOpen) && (
        <EnquiryFormModal
          workshopId={workshop.slug}
          workshopName={workshop.name}
          month={enquiryModal.month || new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          mode={workshop.mode?.join(', ') || 'Online'}
          language={workshop.language?.join(', ') || 'English'}
          priceInr={WORKSHOP_FEES[params.slug]?.minPrice}
          payNowHref={hasConfirmedDates ? registerLink : undefined}
          onClose={() => {
            setEnquiryModal({ isOpen: false, month: '' });
            setFormModalOpen(false);
          }}
        />
      )}

      <Footer />
    </>
  );
}
