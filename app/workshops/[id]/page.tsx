'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import WorkshopDateBooking from '@/components/WorkshopDateBooking';
import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { workshopCatalog, findWorkshopBySlug, workshopDetails, type Schedule } from '@/lib/workshopsData';
import { useRouter } from 'next/navigation';

// Schedule interface removed; full-page register view now handles schedules per mode

export default function WorkshopDetail() {
  const router = useRouter();
  const params = useParams();
  const workshopSlug = params?.id as string;
  
  const workshop = useMemo(() => {
    const found = findWorkshopBySlug(workshopSlug);
    if (found) return found as any;
    return {
      id: 0,
      name: workshopCatalog[0]?.name || 'Swar Yoga Workshop',
      slug: workshopSlug,
      image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
      duration: '10 days',
      level: 'All Levels',
      category: 'General',
      description: 'Transform your life through Swar Yoga practice.',
    } as any;
  }, [workshopSlug]);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const formatDate = (isoDate: string) => {
    const ms = Date.parse(isoDate);
    if (Number.isNaN(ms)) return isoDate;
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const videoRows = useMemo(() => {
    // CC/open sample videos (replace with your own hosted mp4s anytime)
    const sources = [
      {
        id: 'v1',
        title: 'Breath Awareness',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
      },
      {
        id: 'v2',
        title: 'Practice Flow',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      },
      {
        id: 'v3',
        title: 'Daily Routine',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      },
      {
        id: 'v4',
        title: 'Breathing Basics',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      },
      {
        id: 'v5',
        title: 'Mindful Closing',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      },
    ];

    const testimonial = [
      {
        id: 'tv1',
        title: 'Student Story 1',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      },
      {
        id: 'tv2',
        title: 'Student Story 2',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      },
      {
        id: 'tv3',
        title: 'Student Story 3',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
      },
      {
        id: 'tv4',
        title: 'Student Story 4',
        src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
      },
    ];

    return { watchMore: sources, testimonial };
  }, []);

  const testimonials = useMemo(() => {
    return [
      {
        id: 't1',
        quote: 'I feel calmer and more focused. My breathing became effortless within days.',
        name: 'Ananya',
        location: 'Pune, India',
        workshopName: workshop.name,
      },
      {
        id: 't2',
        quote: 'A simple practice, but it shifted my daily life clarity and emotional balance.',
        name: 'Ravi',
        location: 'Mumbai, India',
        workshopName: workshop.name,
      },
      {
        id: 't3',
        quote: 'The guidance is authentic. I noticed better sleep and less stress quickly.',
        name: 'Meera',
        location: 'Bangalore, India',
        workshopName: workshop.name,
      },
      {
        id: 't4',
        quote: 'Breath awareness became a daily anchor. Very calm and practical teaching.',
        name: 'Kiran',
        location: 'Delhi, India',
        workshopName: workshop.name,
      },
    ];
  }, [workshop.name]);

  const getCurrencySymbol = (curr: string) => {
    const code = String(curr || '').toUpperCase();
    if (code === 'INR') return '₹';
    if (code === 'USD') return '$';
    if (code === 'NPR') return 'Rs';
    return '₹';
  };

  const getZoomLabel = (mode?: string) => {
    const m = String(mode || '').toLowerCase();
    if (m === 'online') return 'Zoom';
    if (m === 'offline') return 'Offline';
    if (m === 'residential') return 'Residential';
    if (m === 'recorded') return 'Recorded';
    return 'Zoom';
  };

  const getLanguageLabel = () => {
    const langs = Array.isArray(workshop?.language) ? (workshop.language as string[]) : [];
    if (langs.length === 0) return 'Hindi / English / Marathi';
    return langs.join(' / ');
  };

  const [dbSchedules, setDbSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({ workshopSlug });
        const res = await fetch(`/api/workshops/schedules?${qs.toString()}`, { cache: 'no-store' });
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error || 'Failed to load schedules');

        const list = Array.isArray(json?.data) ? (json.data as any[]) : [];
        const normalized: Schedule[] = [];

        for (const raw of list) {
          const mode = String(raw?.mode || '').trim().toLowerCase() as Schedule['mode'];
          const id = String(raw?.id || raw?._id || '').trim();
          const startDate = raw?.startDate ? String(raw.startDate) : '';
          const endDate = raw?.endDate ? String(raw.endDate) : '';
          if (!id || !startDate) continue;
          if (!['online', 'offline', 'residential', 'recorded'].includes(mode)) continue;

          const seats = Number.isFinite(Number(raw?.seatsTotal))
            ? Number(raw.seatsTotal)
            : Number.isFinite(Number(raw?.slots))
              ? Number(raw.slots)
              : 60;

          const price = Number.isFinite(Number(raw?.price)) ? Number(raw.price) : 0;
          const currency = String(raw?.currency || 'INR').toUpperCase();
          const time = String(raw?.time || '').trim() || 'TBD';
          const location = raw?.location ? String(raw.location) : undefined;

          normalized.push({
            id,
            mode,
            startDate,
            endDate: endDate || startDate,
            time,
            seats,
            price,
            currency,
            location,
          });
        }

        normalized.sort((a, b) => Date.parse(a.startDate) - Date.parse(b.startDate));
        if (cancelled) return;
        setDbSchedules(normalized);
      } catch (e) {
        console.error('Failed to load workshop schedules', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workshopSlug]);

  const pickSchedule = (schedules: Schedule[]) => {
    if (!schedules || schedules.length === 0) return null;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const parsed = schedules
      .map((s) => ({ s, startMs: Date.parse(s.startDate) }))
      .filter((p) => !Number.isNaN(p.startMs))
      .sort((a, b) => a.startMs - b.startMs);
    const upcoming = parsed.find((p) => p.startMs >= todayStart);
    return (upcoming || parsed[parsed.length - 1])?.s || null;
  };

  const [seatsRemaining, setSeatsRemaining] = useState<number | null>(null);
  const schedule = useMemo(() => {
    const preferred = dbSchedules.length > 0 ? dbSchedules : (workshopDetails?.[workshopSlug]?.schedules || []);
    return pickSchedule(preferred);
  }, [dbSchedules, workshopSlug]);

  useEffect(() => {
    if (!schedule) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/workshops/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [
              {
                workshopSlug,
                scheduleId: schedule.id,
                seatsTotal: schedule.seats,
              },
            ],
          }),
        });
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        const key = `${workshopSlug}|${schedule.id}`;
        const next = payload?.success ? payload?.data?.[key] : undefined;
        if (typeof next === 'number') setSeatsRemaining(next);
        else setSeatsRemaining(schedule.seats);
      } catch (error) {
        if (cancelled) return;
        setSeatsRemaining(schedule.seats);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schedule, workshopSlug]);

  const admissionInfo = useMemo(() => {
    if (!schedule) return { open: true, label: 'Admission Open', closesInDays: null as number | null };
    const startMs = Date.parse(schedule.startDate);
    if (Number.isNaN(startMs)) return { open: true, label: 'Admission Open', closesInDays: null as number | null };
    const closeMs = startMs - 5 * MS_PER_DAY;
    const days = Math.ceil((closeMs - Date.now()) / MS_PER_DAY);
    if (days <= 0) return { open: false, label: 'Admission Closed', closesInDays: 0 };
    return { open: true, label: 'Admission Open', closesInDays: days };
  }, [MS_PER_DAY, schedule]);

  const handleRegisterNow = () => {
    // Always send user to the global registration page first
    // (because mode/language/date should be selected there).
    router.push(`/registernow?workshop=${encodeURIComponent(workshop.slug)}`);
  };

  const RegisterNowButton = ({ label = 'Register Now' }: { label?: string }) => {
    return (
      <>
        <style>{`
          @keyframes blinkAnimation {
            0%, 49% { opacity: 1; }
            50%, 100% { opacity: 0.5; }
          }
          .blink-register-btn {
            animation: blinkAnimation 1.5s infinite;
          }
        `}</style>
        <button
          type="button"
          onClick={handleRegisterNow}
          className="blink-register-btn inline-flex items-center justify-center gap-2 rounded-lg bg-swar-primary px-6 py-3 font-semibold text-white shadow-sm transition-all duration-200 hover:bg-swar-primary-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] group"
        >
          {label}
          <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
        </button>
      </>
    );
  };

  const AttentionRegisterButton = ({ label = 'Register Now' }: { label?: string }) => {
    return (
      <button
        type="button"
        onClick={handleRegisterNow}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-swar-primary px-10 py-4 font-extrabold text-white shadow-lg transition-all duration-200 hover:bg-swar-primary-hover hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] group animate-pulse"
      >
        {label}
        <ArrowRight className="h-6 w-6 transition-transform duration-200 group-hover:translate-x-1" />
      </button>
    );
  };

  // Fade-in only (no slide/scale) for the Experience section
  const experienceRef = useRef<HTMLDivElement | null>(null);
  const [experienceVisible, setExperienceVisible] = useState(false);
  useEffect(() => {
    const el = experienceRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) setExperienceVisible(true);
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Mobile-only sticky CTA after 30% scroll
  const [showStickyCta, setShowStickyCta] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = window.scrollY / max;
      setShowStickyCta(ratio >= 0.3);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const ScrollCarousel = ({
    title,
    subtitle,
    children,
  }: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
  }) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const scrollByCard = (dir: -1 | 1) => {
      const el = scrollerRef.current;
      if (!el) return;
      const approxCard = 360;
      el.scrollBy({ left: dir * approxCard, behavior: 'smooth' });
    };

    return (
      <section className="mb-12 sm:mb-16" aria-label={title}>
        <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-swar-text">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-swar-text-secondary">{subtitle}</p>}
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              type="button"
              onClick={() => scrollByCard(-1)}
              className="rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold text-swar-text hover:bg-swar-bg"
              aria-label="Scroll left"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollByCard(1)}
              className="rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold text-swar-text hover:bg-swar-bg"
              aria-label="Scroll right"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory"
        >
          {children}
        </div>
      </section>
    );
  };

  return (
    <>
      <Navigation />
      <main className="pb-24 md:pb-0">
        {/* Hero Section */}
        <section className="relative h-96 md:h-screen flex items-center overflow-hidden mt-20">
          <div className="absolute inset-0 z-0">
            <img
              src={workshop.image || 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg'}
              alt={workshop.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="inline-block bg-swar-primary text-white px-4 py-2 rounded-full mb-6 font-semibold">
                {workshop.level}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {workshop.name}
              </h1>
              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-8">
                {workshop.description}
              </p>

              <RegisterNowButton />
            </div>
          </div>
        </section>

        {/* Workshop Details */}
        <section className="py-16 md:py-24 bg-swar-bg">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            {/* Section 2: Image right, left information (date & time) */}
            <section className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-12 mb-10" aria-label="Workshop schedule overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-start">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-swar-text mb-4">Workshop Schedule</h2>
                  <div className="space-y-4">
                    <div className="rounded-xl border border-gray-100 bg-swar-bg p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-swar-text-secondary">Date</p>
                      <p className="mt-1 text-lg font-extrabold text-swar-text">
                        {schedule ? formatDate(schedule.startDate) : 'TBD'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-100 bg-swar-bg p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-swar-text-secondary">Workshop Time</p>
                      <p className="mt-1 text-lg font-extrabold text-swar-text">
                        {schedule ? schedule.time : 'TBD'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${admissionInfo.open ? 'bg-swar-primary-light text-swar-primary' : 'bg-swar-primary-light text-swar-primary'}`}>
                        {admissionInfo.label}
                      </span>
                      {admissionInfo.open && typeof admissionInfo.closesInDays === 'number' && admissionInfo.closesInDays <= 5 && (
                        <span className="inline-flex items-center rounded-full bg-swar-primary-light text-swar-text px-3 py-1 text-xs font-bold">
                          {admissionInfo.closesInDays <= 0
                            ? 'Closes today'
                            : `Closes in ${admissionInfo.closesInDays} day${admissionInfo.closesInDays === 1 ? '' : 's'}`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-6">
                    <RegisterNowButton />
                  </div>
                </div>

                <div>
                  <div className="relative w-full overflow-hidden rounded-xl bg-swar-primary-light" style={{ aspectRatio: '4 / 3' }}>
                    <Image
                      src={workshop.image || 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg'}
                      alt={`${workshop.name} workshop image`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 50vw, 100vw"
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* New section: Workshop Information as Description */}
            <section className="mb-12 sm:mb-16" aria-label="Workshop information">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-swar-text mb-6">Workshop Information</h2>
                <div className="space-y-3 text-sm sm:text-base text-swar-text leading-relaxed">
                  <p><span className="font-semibold">Program:</span> {workshop.name}</p>
                  <p><span className="font-semibold">Duration:</span> {workshop.duration}</p>
                  <p><span className="font-semibold">Start Date:</span> {schedule ? formatDate(schedule.startDate) : 'TBD'}</p>
                  <p><span className="font-semibold">Workshop Time:</span> {schedule ? schedule.time : 'TBD'}</p>
                  <p><span className="font-semibold">Mode:</span> {schedule ? String(schedule.mode).toUpperCase() : 'TBD'}</p>
                  <p><span className="font-semibold">Language:</span> {getLanguageLabel()}</p>
                  <p><span className="font-semibold">Fees:</span> {schedule ? `${getCurrencySymbol(schedule.currency)}${Number(schedule.price).toLocaleString('en-IN')} ${String(schedule.currency).toUpperCase()}` : 'TBD'} | <span className="font-semibold">Seats Available:</span> {typeof seatsRemaining === 'number' ? `${seatsRemaining}` : schedule ? `${schedule.seats}` : 'TBD'}</p>
                </div>

                <div className="mt-8 flex justify-center">
                  <AttentionRegisterButton />
                </div>
              </div>
            </section>

            {/* Section 3: 5 small blocks */}
            <section className="mb-12 sm:mb-16" aria-label="Quick workshop details">
              <h2 className="text-2xl sm:text-3xl font-bold text-swar-text mb-5">Quick Details</h2>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-swar-text-secondary">Duration</p>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-swar-text">{workshop.duration}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-swar-text-secondary">Slots</p>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-swar-text">
                    {typeof seatsRemaining === 'number' ? seatsRemaining : schedule ? schedule.seats : 'TBD'}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-swar-text-secondary">Language</p>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-swar-text line-clamp-2">{getLanguageLabel()}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-swar-text-secondary">Zoom</p>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-swar-text">{getZoomLabel(schedule?.mode)}</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-swar-text-secondary">Fees</p>
                  <p className="mt-1 text-sm sm:text-base font-extrabold text-swar-text">
                    {schedule ? (
                      <>
                        {getCurrencySymbol(schedule.currency)}{Number(schedule.price).toLocaleString()}
                        <span className="ml-1 text-xs font-bold text-swar-text-secondary">{String(schedule.currency).toUpperCase()}</span>
                      </>
                    ) : (
                      'TBD'
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-5 sm:hidden">
              </div>
            </section>

            {/* What You Will Experience (fade-in only) */}
            <section
              ref={experienceRef}
              className={`rounded-xl p-6 sm:p-8 md:p-12 mb-12 sm:mb-16 bg-primary-50 border border-primary-100 transition-opacity duration-700 ${experienceVisible ? 'opacity-100' : 'opacity-0'}`}
              aria-label="What you will experience"
            >
              <h2 className="text-2xl sm:text-3xl font-bold text-swar-text mb-4">What You Will Experience</h2>
              <p className="text-swar-text text-sm sm:text-base leading-relaxed mb-6">
                This workshop is designed to feel calm, grounded, and practical—something you can carry into your daily life.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { title: 'Inner calm', desc: 'A quieter mind and steadier emotions through breath awareness.' },
                  { title: 'Breath awareness', desc: 'A felt sense of how breath influences your energy and focus.' },
                  { title: 'Nervous system balance', desc: 'A more regulated body response to stress and overwhelm.' },
                  { title: 'Daily life clarity', desc: 'Better decisions and consistency with a simple practice routine.' },
                ].map((b) => (
                  <article key={b.title} className="bg-white rounded-xl border border-primary-100 p-5">
                    <h3 className="font-semibold text-swar-text mb-1">{b.title}</h3>
                    <p className="text-sm text-swar-text-secondary">{b.desc}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Section 5: Big video (main workshop details) */}
            <section className="mb-12 sm:mb-16" aria-label="Main workshop video">
              <div className="flex items-center justify-between gap-4 mb-5 sm:mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-swar-text">Main Workshop Video</h2>
                <div className="hidden sm:block">
                  <RegisterNowButton />
                </div>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-100 bg-black shadow-lg">
                <video
                  className="w-full h-full"
                  src={videoRows.watchMore?.[0]?.src}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
              <div className="mt-5 sm:hidden">
              </div>
            </section>

            {/* Section 6: Watch more videos */}
            <ScrollCarousel
              title="Watch More Videos"
              subtitle="Short clips to understand the workshop style"
            >
              {videoRows.watchMore.map((v) => (
                <article
                  key={v.id}
                  className="snap-start flex-none w-[280px] sm:w-[320px] lg:w-[360px] rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
                >
                  <div className="aspect-video bg-black">
                    <video className="w-full h-full object-cover" src={v.src} controls preload="metadata" playsInline />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-swar-text line-clamp-2">{v.title}</h3>
                  </div>
                </article>
              ))}
            </ScrollCarousel>

            {/* Section 7: Workshop benefits (6 bullets) */}
            <section className="mb-12 sm:mb-16" aria-label="Workshop benefits">
              <h2 className="text-2xl sm:text-3xl font-bold text-swar-text mb-4">Workshop Benefits</h2>
              <ul className="list-disc pl-5 space-y-2 text-swar-text text-sm sm:text-base">
                <li>Improve breath awareness and energy balance</li>
                <li>Better focus, calmness, and emotional stability</li>
                <li>Structured daily practice you can continue at home</li>
                <li>Support for stress reduction and improved sleep</li>
                <li>Simple techniques for clarity in decisions and actions</li>
                <li>Practical guidance with a disciplined routine</li>
              </ul>
            </section>

            {/* Section 8: What you will get (materials) */}
            <section className="mb-12 sm:mb-16" aria-label="What you will get">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-swar-text mb-4">What You Will Get</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'Recordings',
                    'Notes',
                    'Follow-up sessions',
                    'Certificate',
                    'Joined in community',
                    'Future offers',
                  ].map((item) => (
                    <div key={item} className="rounded-lg bg-swar-bg border border-gray-100 px-4 py-3 font-semibold text-swar-text">
                      {item}
                    </div>
                  ))}
                </div>

              </div>
            </section>

            {/* Section 9: Student testimony (3 blocks movable) */}
            <ScrollCarousel
              title="Student Testimony"
              subtitle="Real feedback from students"
            >
              {testimonials.map((t) => (
                <article
                  key={t.id}
                  className="snap-start flex-none w-[280px] sm:w-[320px] lg:w-[360px] rounded-xl border border-gray-100 bg-white shadow-sm p-5"
                >
                  <p className="text-swar-text text-sm sm:text-base leading-relaxed italic">“{t.quote}”</p>
                  <div className="mt-4">
                    <p className="font-extrabold text-swar-text">{t.name}</p>
                    <p className="text-sm text-swar-text-secondary">{t.location}</p>
                  </div>
                </article>
              ))}
            </ScrollCarousel>

            {/* Section 10: Testimonial videos (3 movable if more) */}
            <ScrollCarousel
              title="Testimonial Videos"
              subtitle="Watch student experiences"
            >
              {videoRows.testimonial.map((v) => (
                <article
                  key={v.id}
                  className="snap-start flex-none w-[280px] sm:w-[320px] lg:w-[360px] rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
                >
                  <div className="aspect-video bg-black">
                    <video className="w-full h-full object-cover" src={v.src} controls preload="metadata" playsInline />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-swar-text line-clamp-2">{v.title}</h3>
                  </div>
                </article>
              ))}
            </ScrollCarousel>
          </div>
        </section>
      </main>

      {/* Mobile sticky CTA (after 30% scroll) */}
      <div
        className={`md:hidden fixed left-0 right-0 bottom-0 z-50 border-t border-swar-border bg-white/95 backdrop-blur px-4 py-3 transition-transform duration-300 ${showStickyCta ? 'translate-y-0' : 'translate-y-full'}`}
        role="region"
        aria-label="Sticky enroll button"
      >
        <button
          type="button"
          onClick={handleRegisterNow}
          className="w-full bg-swar-primary hover:bg-swar-primary-hover text-white font-semibold rounded-lg py-3 transition-transform duration-200 active:scale-[0.99]"
        >
          Register Now
        </button>
      </div>

      {/* Register Modal removed in favor of full-page register view */}

      {/* Workshop Date Booking Section */}
      <section className="bg-gradient-to-b from-swar-50 to-white py-12 md:py-16">
        <WorkshopDateBooking
          workshopName={workshop.name}
          workshopSlug={workshopSlug}
          onBooking={(selectedDate) => {
            // Add item to cart and redirect to checkout
            const params = new URLSearchParams({
              workshop: workshopSlug,
              date: selectedDate.date.toISOString(),
              mode: selectedDate.mode || 'online',
              price: selectedDate.price.toString(),
              currency: selectedDate.currency,
            });
            router.push(`/checkout?${params.toString()}`);
          }}
        />
      </section>

      {/* Final Register Now Button */}
      <section className="bg-white py-12 md:py-16 border-t border-swar-border">
        <div className="container mx-auto px-4 md:px-6 max-w-6xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-swar-text mb-4">Ready to Transform Your Life?</h2>
          <p className="text-swar-text-secondary mb-8 max-w-2xl mx-auto">Join thousands of practitioners who have discovered the power of Swar Yoga</p>
          <RegisterNowButton />
        </div>
      </section>

      <Footer />
    </>
  );
}
