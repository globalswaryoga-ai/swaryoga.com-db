'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { Play, X } from 'lucide-react';
import { findWorkshopBySlug, workshopLandingPages } from '@/lib/workshopsData';
import EnquiryFormModal from '@/components/EnquiryFormModal';

export const dynamic = 'force-dynamic';

// Fee mapping for all workshops
const WORKSHOP_FEES: Record<string, { minPrice: number; maxPrice: number; currency: string }> = {
  'swar-yoga-basic': { minPrice: 96, maxPrice: 96, currency: 'INR' },
  'yogasana-sadhana': { minPrice: 330, maxPrice: 330, currency: 'INR' },
  'swar-yoga-level-1': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-3': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-level-4': { minPrice: 6000, maxPrice: 6000, currency: 'INR' },
  '96-days-weight-loss': { minPrice: 6600, maxPrice: 6600, currency: 'INR' },
  '42-days-meditation': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'amrut-aahar': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'bandhan-mukti': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'swar-yoga-level-2': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
  'swar-yoga-businessman': { minPrice: 4200, maxPrice: 4200, currency: 'INR' },
  'swar-yoga-youth': { minPrice: 999, maxPrice: 999, currency: 'INR' },
  'personality-development': { minPrice: 3300, maxPrice: 5500, currency: 'INR' },
  'garbh-sanskar': { minPrice: 1000, maxPrice: 9000, currency: 'INR' },
  'teacher-training': { minPrice: 15000, maxPrice: 33000, currency: 'INR' },
  'annual-satsang': { minPrice: 500, maxPrice: 1000, currency: 'INR' },
  'nadi-parikshan': { minPrice: 500, maxPrice: 1000, currency: 'INR' },
  'family-wellness': { minPrice: 2000, maxPrice: 4000, currency: 'INR' },
  'advanced-breathing': { minPrice: 2400, maxPrice: 2400, currency: 'INR' },
  'life-transformation': { minPrice: 3300, maxPrice: 3300, currency: 'INR' },
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
  mentorInfo: string;
  testimonials: Array<{ quote: string; name: string; place: string }>;
  videoTestimonials: Array<{ name: string; url: string }>;
  finalCTA: string;
}

export default function WorkshopLandingPage({ params }: { params: { slug: string } }) {
  const workshop = findWorkshopBySlug(params.slug);

  if (!workshop) {
    notFound();
  }

  const [activeVideoModal, setActiveVideoModal] = useState<string | null>(null);
  const [allSchedules, setAllSchedules] = useState<DbSchedule[]>([]);
  const [enquiryModal, setEnquiryModal] = useState<{ isOpen: boolean; month: string }>({ isOpen: false, month: '' });

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

  const registerLink = `/workshops/${workshop.slug}/register`;

  return (
    <>
      <style>{blinkingStyles}</style>
      <Navigation />

      <main className="mt-16 sm:mt-20 bg-white">
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

        {/* PROGRAM DETAILS VIDEOS */}
        {params.slug === 'swar-yoga-youth' && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <h2 className="text-3xl sm:text-4xl font-bold text-green-900 mb-8 text-center">
              🎓 Program Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Video 1 */}
              <a
                href="https://youtu.be/_sVjfPam0SM"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative h-48 md:h-56 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <div className="relative w-full h-full bg-gradient-to-br from-green-100 to-green-50">
                  <iframe
                    src="https://www.youtube.com/embed/_sVjfPam0SM"
                    title="Program Detail 1"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white rounded-full p-3">
                    <Play className="w-6 h-6 text-green-700" fill="currentColor" />
                  </div>
                </div>
              </a>

              {/* Video 2 */}
              <a
                href="https://youtu.be/fxA5CjzgHQA"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative h-48 md:h-56 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <div className="relative w-full h-full bg-gradient-to-br from-blue-100 to-blue-50">
                  <iframe
                    src="https://www.youtube.com/embed/fxA5CjzgHQA"
                    title="Program Detail 2"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white rounded-full p-3">
                    <Play className="w-6 h-6 text-blue-700" fill="currentColor" />
                  </div>
                </div>
              </a>

              {/* Video 3 */}
              <a
                href="https://youtu.be/_EWOgcAc8GA"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative h-48 md:h-56 rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all transform hover:scale-105"
              >
                <div className="relative w-full h-full bg-gradient-to-br from-purple-100 to-purple-50">
                  <iframe
                    src="https://www.youtube.com/embed/_EWOgcAc8GA"
                    title="Program Detail 3"
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="bg-white rounded-full p-3">
                    <Play className="w-6 h-6 text-purple-700" fill="currentColor" />
                  </div>
                </div>
              </a>
            </div>
            <p className="text-center text-gray-600 mt-6 text-sm">Click on any video to open on YouTube</p>
          </section>
        )}

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
      {enquiryModal.isOpen && (
        <EnquiryFormModal
          workshopId={workshop.slug}
          workshopName={workshop.name}
          month={enquiryModal.month}
          mode={workshop.mode?.join(', ') || 'Online'}
          language={workshop.language?.join(', ') || 'English'}
          onClose={() => setEnquiryModal({ isOpen: false, month: '' })}
        />
      )}

      <Footer />
    </>
  );
}
