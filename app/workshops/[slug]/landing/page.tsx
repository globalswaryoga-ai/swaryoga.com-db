'use client';

import React, { useRef, useState, useEffect, useMemo } from 'react';
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
  'swar-yoga-basic-program': { minPrice: 145, maxPrice: 145, currency: 'INR' },
  'master-swar-yoga': { minPrice: 1500, maxPrice: 1500, currency: 'INR' },
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

function normalizeYouTubeEmbedUrl(raw: string): string {
  const url = String(raw || '').trim();
  if (!url) return url;
  const verifiedFallbacks: Record<string, string> = {
    '0q2FWUqqqPs': 'luSaTlBXssM',
    mzYKqFxYzQU: 'fxA5CjzgHQA',
    cklZSXAWA5U: 'luSaTlBXssM',
    T3qQdIj7f0Y: 'luSaTlBXssM',
    y90cV_3OMrQ: 'fxA5CjzgHQA',
    '8HWaFGJz6Yw': '_sVjfPam0SM',
    '5nqVXQG9Mvk': '_EWOgcAc8GA',
    j_H8i50HjYQ: '_EWOgcAc8GA',
  };
  const normalizeId = (id: string) => verifiedFallbacks[id] || id;

  // Common cases:
  // - https://www.youtube.com/watch?v=VIDEO -> https://www.youtube.com/embed/VIDEO
  // - https://youtu.be/VIDEO -> https://www.youtube.com/embed/VIDEO
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') {
        const id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${normalizeId(id)}`;
      }
      const embedMatch = u.pathname.match(/^\/embed\/([^/?#]+)/);
      if (embedMatch?.[1]) {
        return `https://www.youtube.com/embed/${normalizeId(embedMatch[1])}`;
      }
      return url;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '').trim();
      if (id) return `https://www.youtube.com/embed/${normalizeId(id)}`;
      return url;
    }
    return url;
  } catch {
    return url;
  }
}

function dedupeByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const normalized = normalizeYouTubeEmbedUrl(item.url);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push({ ...item, url: normalized });
  }
  return out;
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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isFeaturedLanding = params.slug === 'swar-yoga-basic-program' || params.slug === 'master-swar-yoga';
  // Featured landings are simplified, but we still want Reviews (stars + add review)
  // visible for both Master and Basic.
  const showReviews =
    !isFeaturedLanding ||
    params.slug === 'master-swar-yoga' ||
    params.slug === 'swar-yoga-basic-program';

  const videoTestimonialsScrollerRef = useRef<HTMLDivElement | null>(null);
  const [pauseVideoAutoScroll, setPauseVideoAutoScroll] = useState(false);

  // Reviews (localStorage backed for now)
  const [reviews, setReviews] = useState<LocalReview[]>([]);
  const [reviewForm, setReviewForm] = useState<{ name: string; rating: number; review: string }>({
    name: '',
    rating: 5,
    review: '',
  });

  // Check if user is logged in
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    }
  }, []);

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

  const detailVideos = useMemo(() => dedupeByUrl(pickDetailVideos(landingData)), [landingData]);
  const videoTestimonials = useMemo(() => dedupeByUrl(landingData.videoTestimonials || []), [landingData]);

  // Auto-scroll video testimonials for featured landings.
  // Keeps UI modern (like a carousel), but still scrollable manually.
  useEffect(() => {
    if (!isFeaturedLanding) return;
    if (typeof window === 'undefined') return;
    if (pauseVideoAutoScroll) return;

    const el = videoTestimonialsScrollerRef.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (prefersReducedMotion) return;

    // If content doesn't overflow, nothing to scroll.
    const canScroll = el.scrollWidth > el.clientWidth + 4;
    if (!canScroll) return;

    let raf = 0;
    let last = 0;
    const speedPxPerSec = 28; // gentle, readable

    const tick = (t: number) => {
      if (!last) last = t;
      const dt = (t - last) / 1000;
      last = t;

      // Advance; loop back smoothly.
      const next = el.scrollLeft + speedPxPerSec * dt;
      const max = el.scrollWidth - el.clientWidth;
      el.scrollLeft = next >= max ? 0 : next;

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isFeaturedLanding, pauseVideoAutoScroll, videoTestimonials.length]);

  const hasConfirmedDates = useMemo(() => {
    return schedulesFor.length > 0 && schedulesFor.some((s) => s.startDate);
  }, [schedulesFor]);

  // New canonical registration URL format:
  // /registration/<mode>/<language>/<workshopSlug>
  // DEFAULTING TO SIGNUP FIRST (as requested)
  const registerLink = `/signup?workshop=${workshop.slug}&mode=online&language=hindi`;

  // For featured landings, route directly to the modern unified registration dashboard.
  const registerNowLink = isFeaturedLanding ? `/registernow?workshop=${encodeURIComponent(workshop.slug)}` : registerLink;

  const bottomCtaHref = isFeaturedLanding ? registerNowLink : registerLink;

  // Special-case: Basic Program PayU link (₹145)
  const basicProgramPayNowHref = 'https://u.payu.in/kru2VzxJ7TlK';

  // Special-case: Master class one-month PayU link (₹1500)
  const masterClassPayNowHref = 'https://u.payu.in/9ItludruJA4x';

  // Special-case: Master class three-month PayU link
  const masterClass3MonthPayNowHref = 'https://u.payu.in/IIZb7FOuWLpp';

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
        {/* Sticky modern CTA (non-featured only) */}
        {!isFeaturedLanding && (
          <div className="sticky top-[64px] z-30 border-b border-gray-100 bg-white/80 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                  <MessageSquareText className="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <div className="font-extrabold text-gray-900 leading-tight">Join {workshop.name}</div>
                  <div className="text-xs text-gray-600">
                    {isLoggedIn ? 'Proceed to Payment' : 'Step 1: Signup & Save Lead • Step 2: Payment in Cart'}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                {isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => setFormModalOpen(true)}
                    className="rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black px-5 py-3 shadow-sm active:scale-[0.99]"
                  >
                    {hasConfirmedDates ? '💳 Pay Now' : '📝 Book Seat'}
                  </button>
                ) : (
                  <>
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
                      Sign Up First
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 1st: HERO SECTION (Main Image & Info) */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
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

              {isFeaturedLanding ? (
                <Link
                  href={registerNowLink}
                  className="blink-btn inline-flex items-center justify-center bg-green-700 hover:bg-green-800 text-white px-10 py-4 rounded-2xl transition-all font-black text-lg shadow-lg"
                >
                  Register Now
                </Link>
              ) : isLoggedIn ? (
                <button
                  type="button"
                  onClick={() => setFormModalOpen(true)}
                  className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
                >
                  💳 Pay Now
                </button>
              ) : (
                <Link
                  href={registerLink}
                  className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
                >
                  Register & Sign Up
                </Link>
              )}
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

        {/* 2nd: BIG VIDEO OVERVIEW */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="rounded-3xl overflow-hidden border border-gray-200 bg-white shadow-xl">
            <div className="p-5 sm:p-6 flex items-center justify-between bg-gradient-to-r from-green-50 to-white border-b border-gray-100">
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-gray-500">Workshop Overview</div>
                <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">{workshop.name} – Big Video</h2>
              </div>
              {!isFeaturedLanding && (
                <button
                  type="button"
                  onClick={() => setActiveVideoModal(normalizeYouTubeEmbedUrl(landingData.introVideoUrl))}
                  className="inline-flex items-center gap-2 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black px-4 py-2 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Play Full Video
                </button>
              )}
            </div>
            <div className="p-6">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-lg">
                <iframe
                  src={normalizeYouTubeEmbedUrl(landingData.introVideoUrl)}
                  title="Workshop Intro Video"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>

        {/* 3rd: SMALL 3 VIDEOS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-extrabold text-gray-900">Workshop Videos</h3>
            <p className="mt-2 text-sm text-gray-600">3 short videos to understand the workshop quickly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {detailVideos.map((v, idx) => (
              <div
                key={`${v.title}-${idx}`}
                className="group relative rounded-3xl border border-gray-200 bg-white shadow-md overflow-hidden hover:shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                onClick={() => setActiveVideoModal(normalizeYouTubeEmbedUrl(v.url))}
              >
                <div className="aspect-video w-full bg-gray-100 relative">
                  <iframe
                    src={normalizeYouTubeEmbedUrl(v.url)}
                    title={v.title}
                    className="w-full h-full pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all flex items-center justify-center">
                    <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
                  </div>
                </div>
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-green-700 text-white flex items-center justify-center font-black text-sm">
                      {idx + 1}
                    </div>
                    <div className="font-bold text-gray-900 text-sm">{v.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6-MONTH DATES SECTION */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 border-t border-gray-100">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8 text-center">
            📅 Next 6 Months Schedule
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sixMonthBlocks.map((b) => (
              <div
                key={b.label}
                className={`rounded-2xl p-6 border-2 transition-all flex flex-col justify-between ${
                  b.available
                    ? 'bg-gradient-to-br from-green-50 to-white border-green-400 shadow-md hover:shadow-xl'
                    : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-lg font-black text-gray-900">{b.label}</div>
                    {b.available ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] font-black rounded-lg">LIVE DATE</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-black rounded-lg">COMING SOON</span>
                    )}
                  </div>
                  <div className={`text-sm ${!isFeaturedLanding ? 'mb-6' : 'mb-0'} ${b.available ? 'text-green-700 font-bold' : 'text-gray-500'}`}>
                    {b.dateText}
                  </div>
                </div>

                {!isFeaturedLanding && (
                  <div className="flex gap-2">
                    {b.available ? (
                      <>
                        {isLoggedIn ? (
                          <button
                            type="button"
                            onClick={() => openForm(b.label)}
                            className="flex-1 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold py-3 text-xs shadow-sm transition-all active:scale-95"
                          >
                            💳 Pay Now
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => openForm(b.label)}
                              className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 text-xs shadow-sm transition-all active:scale-95"
                            >
                              📝 Book Seat
                            </button>
                            <Link
                              href={`${registerLink}&month=${b.label.replace(' ', '-')}`}
                              className="flex-1 rounded-xl bg-green-700 hover:bg-green-800 text-white font-bold py-3 text-xs shadow-sm text-center transition-all active:scale-95"
                            >
                              ✅ Register
                            </Link>
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEnquiryModal({ isOpen: true, month: b.label })}
                        className="w-full rounded-xl border-2 border-green-700 text-green-800 font-bold py-3 text-sm hover:bg-green-50 transition-all"
                      >
                        📝 Book Your Seat
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          {isFeaturedLanding && (
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">Dates shown here are synced from the Admin workshop schedules.</p>
            </div>
          )}
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
        {!isFeaturedLanding && (
        <section className="text-center py-8 bg-green-50">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => setFormModalOpen(true)}
              className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
            >
              💳 Pay Now
            </button>
          ) : (
            <Link
              href={registerLink}
              className="blink-btn inline-flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-8 py-4 rounded-lg transition-all font-bold text-lg"
            >
              Register Now
            </Link>
          )}
        </section>
        )}

        {/* LEARNING HIGHLIGHTS */}
        {!isFeaturedLanding && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            Learning Highlights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingData.highlightVideos.map((video, idx) => (
              <div
                key={idx}
                className="relative h-64 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                onClick={() => setActiveVideoModal(normalizeYouTubeEmbedUrl(video.url))}
              >
                <iframe
                  src={normalizeYouTubeEmbedUrl(video.url)}
                  title={video.title}
                  className="w-full h-full pointer-events-none"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
        )}

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

        {/* VIDEO TESTIMONIALS */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8">
            Video Testimonials
          </h2>
          {isFeaturedLanding ? (
            <div className="relative">
              <div
                ref={videoTestimonialsScrollerRef}
                className="flex gap-6 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth snap-x snap-mandatory"
                onMouseEnter={() => setPauseVideoAutoScroll(true)}
                onMouseLeave={() => setPauseVideoAutoScroll(false)}
                onTouchStart={() => setPauseVideoAutoScroll(true)}
                onTouchEnd={() => setPauseVideoAutoScroll(false)}
              >
                {videoTestimonials.map((testimonial, idx) => (
                  <div
                    key={`${testimonial.url}-${idx}`}
                    className="snap-start shrink-0 w-[86%] sm:w-[48%] lg:w-[32%]"
                  >
                    <div
                      className="group relative rounded-3xl border border-gray-200 bg-white shadow-md overflow-hidden hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer"
                      onClick={() => setActiveVideoModal(normalizeYouTubeEmbedUrl(testimonial.url))}
                    >
                      <div className="aspect-video w-full bg-gray-100 relative">
                        <iframe
                          src={normalizeYouTubeEmbedUrl(testimonial.url)}
                          title={testimonial.name}
                          className="w-full h-full pointer-events-none"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
                        </div>
                      </div>
                      <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-gray-900 text-sm truncate" title={testimonial.name}>{testimonial.name}</div>
                            <div className="mt-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Testimonial</div>
                          </div>
                          <div className="shrink-0 h-8 w-8 rounded-lg bg-green-700 text-white flex items-center justify-center font-black text-sm">
                            {idx + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-500">Auto-scrolling (pause on hover). You can also scroll left/right.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {videoTestimonials.map((testimonial, idx) => (
                <div
                  key={idx}
                  className="relative h-64 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer group"
                  onClick={() => setActiveVideoModal(normalizeYouTubeEmbedUrl(testimonial.url))}
                >
                  <iframe
                    src={normalizeYouTubeEmbedUrl(testimonial.url)}
                    title={testimonial.name}
                    className="w-full h-full pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <div className="bg-white/0 group-hover:bg-white/20 rounded-full p-4 transition-all">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* REVIEWS (Stars + written reviews) */}
        {showReviews && (
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
        )}

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
        {!isFeaturedLanding && (
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
        )}

        {/* FIXED BOTTOM BUTTON (Always visible) */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <Link
            href={bottomCtaHref}
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
      {!isFeaturedLanding && (enquiryModal.isOpen || formModalOpen) && (
        <EnquiryFormModal
          workshopId={workshop.slug}
          workshopName={workshop.name}
          month={enquiryModal.month || new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
          mode={workshop.mode?.join(', ') || 'Online'}
          language={workshop.language?.join(', ') || 'English'}
          priceInr={WORKSHOP_FEES[params.slug]?.minPrice}
          payNowHref={
            hasConfirmedDates
              ? params.slug === 'master-swar-yoga'
                ? masterClassPayNowHref
                : params.slug === 'swar-yoga-basic-program'
                ? basicProgramPayNowHref
                : registerLink
              : undefined
          }
          payNowHref3Month={
            params.slug === 'master-swar-yoga' && hasConfirmedDates
              ? masterClass3MonthPayNowHref
              : undefined
          }
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
