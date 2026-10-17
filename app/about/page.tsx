'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { 
  Award, 
  Heart, 
  Users, 
  CheckCircle2, 
  Wind, 
  Sparkles, 
  Compass, 
  Sun, 
  Moon, 
  ArrowRight, 
  Activity, 
  BookOpen, 
  ShieldCheck,
  Globe2,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function About() {
  const achievements = [
    { number: '25+', label: 'Years of Himalayan Lineage', sub: 'Preserving authentic Swar Vigyan' },
    { number: '8,000+', label: 'Global Practitioners', sub: 'Trained across 15+ countries' },
    { number: '100%', label: 'Rooted in Vedic Science', sub: 'Shiva Swarodaya tradition' },
    { number: '365', label: 'Days of Live Sadhana', sub: 'Daily morning & evening community' }
  ];

  const pillars = [
    {
      icon: <Wind className="text-swar-primary" size={28} />,
      badge: 'BIORHYTHM SCIENCE',
      title: 'Swar Vigyan (Breath Cycles)',
      description: 'Understanding the autonomic alternation between your left (Ida / Lunar) and right (Pingala / Solar) nostrils to regulate energy, focus, and digestion on demand.'
    },
    {
      icon: <Sparkles className="text-swar-accent" size={28} />,
      badge: 'ACOUSTIC HEALING',
      title: 'Nada Yoga (Sound Resonance)',
      description: 'Using sacred vocal frequencies and primordial vibrations to drop brainwave states into regenerative alpha and theta frequencies, releasing stored emotional tension.'
    },
    {
      icon: <Compass className="text-swar-primary" size={28} />,
      badge: 'DAILY CHRONOBIOLOGY',
      title: 'Ritucharya & Lifestyle Flow',
      description: 'Harmonizing your daily tasks, nutrition, workouts, and decision-making with cosmic, lunar, and seasonal cycles for effortless high performance and longevity.'
    }
  ];

  const coreValues = [
    {
      icon: <ShieldCheck className="text-swar-primary" size={28} />,
      title: 'Authenticity Without Dogma',
      description: 'We honor ancient Himalayan lineages while translating their sacred mechanics into clear, practical physiological tools for modern high-performers.'
    },
    {
      icon: <Heart className="text-swar-accent" size={28} />,
      title: 'Compassionate Mentorship',
      description: 'Whether you are a complete beginner or an advanced yoga teacher, we meet you with personalized warmth, empathy, and patient guidance.'
    },
    {
      icon: <Globe2 className="text-swar-primary" size={28} />,
      title: 'Global Sangha (Community)',
      description: 'Practicing alone is hard. Our daily live Sadhana connects thousands of conscious souls worldwide across timezones to breathe, meditate, and elevate together.'
    }
  ];

  const testimonials = [
    {
      quote: "Swar Yoga taught me how to shift my nervous system in under two minutes before board meetings. It is the most practical bio-hack I have discovered in 20 years of wellness.",
      author: "David M.",
      title: "Technology Executive, San Francisco, CA"
    },
    {
      quote: "Learning Swarodaya under Mohan-ji transformed not just my meditation practice, but my sleep, digestion, and chronic anxiety. Pure timeless wisdom explained with utmost clarity.",
      author: "Elena R.",
      title: "Integrative Health Practitioner, London, UK"
    },
    {
      quote: "The live Sadhana hall feels like a sacred sanctuary every morning. Practicing with an authentic Himalayan teacher from my living room is an incredible blessing.",
      author: "Sarah K.",
      title: "Yoga Studio Owner, Austin, TX"
    }
  ];

  return (
    <div className="bg-[#FCFCFA] text-swar-text font-sans antialiased selection:bg-swar-primary-light selection:text-swar-primary">
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-36 md:pb-24 overflow-hidden">
        {/* Soft atmospheric gradient orbs */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-swar-primary/10 via-swar-accent/5 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container mx-auto px-4 max-w-6xl relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-white border border-swar-primary/20 shadow-sm text-swar-primary font-bold text-xs tracking-[0.2em] uppercase mb-6 backdrop-blur">
              <Sparkles size={14} className="text-swar-accent animate-pulse" />
              SACRED BREATH SCIENCE • EST. 1999
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-swar-text tracking-tight leading-[1.08] mb-6">
              Where Ancient Vedic Wisdom Meets{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-swar-primary via-emerald-600 to-swar-accent">
                Modern Human Potential
              </span>
            </h1>

            <p className="text-swar-text-secondary text-lg sm:text-xl md:text-2xl font-normal leading-relaxed max-w-2xl mx-auto">
              Master the sacred neuro-respiratory art of Swar Yoga — aligning your breath cycles, acoustic frequencies, and circadian rhythms for peak vitality and spiritual stillness.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/workshops"
                className="w-full sm:w-auto px-8 py-4 bg-swar-primary hover:bg-swar-primary-hover text-white rounded-xl font-bold text-base shadow-lg shadow-swar-primary/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                <span>Explore Live Workshops</span>
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/sadhana/live/hindi-swar-yoga-l-1-sadhana"
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-swar-primary-light/50 text-swar-text hover:text-swar-primary rounded-xl font-bold text-base border border-gray-200 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Enter Live Sadhana</span>
              </Link>
            </div>
          </div>

          {/* Cinematic Editorial Hero Banner */}
          <div className="relative w-full h-[280px] sm:h-[380px] md:h-[480px] rounded-3xl overflow-hidden shadow-2xl border border-black/5 group">
            <Image
              src="/images/about-hero-zen.jpg"
              alt="Serene breathwork and meditation at sunrise overlooking sacred Himalayan peaks"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover object-center group-hover:scale-105 transition-transform duration-1000 ease-out"
            />
            {/* Cinematic subtle contrast overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />

            {/* Bottom Caption Pill */}
            <div className="absolute bottom-6 left-6 right-6 md:left-10 md:right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-white">
              <div className="max-w-xl">
                <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-300 block mb-1">
                  The Power of Swarodaya
                </span>
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                  "Your breath is the silent conductor of every thought, cell, and destiny."
                </h3>
              </div>
              <div className="flex-shrink-0 bg-white/15 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-xs sm:text-sm font-medium">
                📍 Himalayan Lineage • Global Practice
              </div>
            </div>
          </div>

          {/* Key Achievements Grid */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {achievements.map((item, idx) => (
              <div 
                key={idx} 
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow text-center sm:text-left"
              >
                <div className="text-3xl sm:text-4xl font-black text-swar-primary tracking-tight mb-1">
                  {item.number}
                </div>
                <div className="text-sm font-bold text-swar-text mb-0.5">
                  {item.label}
                </div>
                <div className="text-xs text-swar-text-tertiary">
                  {item.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Science & 3 Pillars Section */}
      <section className="py-20 md:py-28 bg-white border-y border-gray-100 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-swar-primary font-bold text-xs tracking-[0.25em] uppercase mb-3 block">
              THE METHODOLOGY
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-swar-text mb-4">
              The 3 Pillars of Swar Yoga
            </h2>
            <p className="text-swar-text-secondary text-base sm:text-lg leading-relaxed">
              Unlike ordinary breath exercises, Swar Yoga is a complete science of cosmic chronobiology, sound frequency, and autonomic balance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-[#FAFBF9] rounded-3xl p-8 border border-gray-100 hover:border-swar-primary/20 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 border border-gray-100 group-hover:scale-110 transition-transform">
                    {pillar.icon}
                  </div>
                  <span className="text-[11px] font-extrabold tracking-widest text-swar-text-tertiary uppercase block mb-2">
                    {pillar.badge}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-swar-text mb-3">
                    {pillar.title}
                  </h3>
                  <p className="text-swar-text-secondary text-sm sm:text-base leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-gray-200/60 flex items-center text-xs font-bold text-swar-primary group-hover:translate-x-1 transition-transform">
                  <span>Learn the practice</span>
                  <ArrowRight size={14} className="ml-1" />
                </div>
              </div>
            ))}
          </div>

          {/* Deep-dive visual highlight card */}
          <div className="mt-16 bg-[#163E27] text-white rounded-3xl p-8 md:p-12 overflow-hidden relative shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold">
                  <Activity size={14} /> AUTONOMIC NERVOUS SYSTEM REBALANCING
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight text-white">
                  Solar & Lunar Breath Cycles: <br />
                  <span className="text-emerald-300">The Secret Rhythm of Your Brain</span>
                </h3>

                <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed font-normal">
                  In modern neuroscience, this is recognized as the "Ultradian Nasal Cycle." When your right nostril dominates, your sympathetic nervous system accelerates, boosting metabolism, logic, and physical stamina. When your left nostril opens, your parasympathetic system activates, inducing rest, emotional balance, and creative insight.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-sm mb-1">
                      <Sun size={18} /> Pingala (Right Nostril)
                    </div>
                    <p className="text-xs text-emerald-100/80">Solar energy • Focus • Digestion • Decisive action</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-cyan-200 font-bold text-sm mb-1">
                      <Moon size={18} /> Ida (Left Nostril)
                    </div>
                    <p className="text-xs text-emerald-100/80">Lunar energy • Healing • Sleep • Intuitive peace</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                <Image
                  src="/images/about-sound-healing.jpg"
                  alt="Sound healing singing bowl practice in serene modern studio"
                  fill
                  sizes="(max-width: 1024px) 100vw, 500px"
                  className="object-cover object-center"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-20 md:py-28 bg-[#FCFCFA] relative overflow-hidden">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            
            {/* Founder Image Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative border frame */}
                <div className="absolute -inset-3 bg-gradient-to-tr from-swar-primary/20 via-swar-accent/15 to-transparent rounded-[2.5rem] transform -rotate-2" />
                
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/5] bg-gray-100">
                  <img
                    src="https://i.postimg.cc/3RfL08Hc/temp-Image-N5-TSEG.avif"
                    alt="Yogacharya Mohan Kalburgi - Founder of Swar Yoga"
                    className="w-full h-full object-cover object-top filter brightness-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-5 left-5 right-5 text-white">
                    <p className="text-xs uppercase font-bold tracking-widest text-emerald-300">HIMALAYAN MASTER</p>
                    <p className="text-xl font-bold">Yogacharya Mohan Kalburgi</p>
                    <p className="text-xs text-white/80">Founder & Chief Visionary</p>
                  </div>
                </div>

                {/* Badge Overlay */}
                <div className="absolute -bottom-6 -right-4 sm:-right-6 bg-white p-4 sm:p-5 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3.5 z-20">
                  <div className="w-12 h-12 rounded-xl bg-swar-primary-light flex items-center justify-center text-swar-primary flex-shrink-0">
                    <Award size={26} />
                  </div>
                  <div>
                    <div className="text-xl font-black text-swar-primary leading-none">25+ Years</div>
                    <div className="text-xs text-swar-text-tertiary font-semibold mt-1">Teaching Worldwide</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Founder Story Column */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-swar-accent font-bold tracking-[0.2em] text-xs uppercase mb-2 block">
                  MEET OUR FOUNDER
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-swar-text tracking-tight mb-2">
                  Yogacharya Mohan Kalburgi
                </h2>
                <p className="text-base sm:text-lg font-semibold text-swar-primary">
                  Master of Shiva Swarodaya & Vedic Chronobiology
                </p>
              </div>

              <div className="space-y-4 text-swar-text-secondary text-base sm:text-lg leading-relaxed">
                <p>
                  For over a quarter of a century, Yogacharya Mohan Kalburgi has dedicated his life to resurrecting and systematizing the ancient Vedic science of <strong>Swar Yoga</strong> — the lost art of conscious breathing cycles originally codified in sacred texts like the <em>Shiva Swarodaya</em>.
                </p>
                <p>
                  Initiated by master practitioners in the sacred valleys of the Himalayas, he bridged traditional yogic sadhana with modern lifestyle challenges. He has guided over 8,000 students, business leaders, doctors, and spiritual seekers across the United States, Europe, and Asia to unlock effortless focus, emotional resilience, and vibrant health.
                </p>
              </div>

              {/* Founder Credibility Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  "Author of acclaimed wellness treatises",
                  "Over 25 years unbroken Himalayan sadhana",
                  "Global keynote educator & retreat leader",
                  "Mentor to hundreds of certified yoga instructors"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                    <CheckCircle2 size={18} className="text-swar-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-semibold text-swar-text">{item}</span>
                  </div>
                ))}
              </div>

              {/* Personal quote box */}
              <div className="p-6 bg-white rounded-2xl border-l-4 border-swar-primary shadow-sm mt-6">
                <p className="italic text-swar-text text-base sm:text-lg font-medium leading-relaxed">
                  "You do not need to change the entire world to find peace. When you learn to synchronize your inner breath with the rhythm of existence, the world harmonizes around you."
                </p>
                <p className="text-xs font-bold text-swar-primary uppercase tracking-wider mt-3">
                  — Yogacharya Mohan Kalburgi
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Core Values / Philosophy */}
      <section className="py-20 md:py-28 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-swar-primary font-bold text-xs tracking-[0.25em] uppercase mb-3 block">
              OUR GUIDING LIGHT
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-swar-text mb-4">
              Built on Sacred Trust & Integrity
            </h2>
            <p className="text-swar-text-secondary text-base sm:text-lg leading-relaxed">
              Every course, workshop, and live Sadhana session is crafted around these three non-negotiable principles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {coreValues.map((val, idx) => (
              <div
                key={idx}
                className="bg-[#FCFCFA] p-8 sm:p-10 rounded-3xl border border-gray-100 hover:border-swar-primary/20 hover:shadow-xl transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 border border-gray-100">
                  {val.icon}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-swar-text mb-3">
                  {val.title}
                </h3>
                <p className="text-swar-text-secondary text-sm sm:text-base leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Stories / Social Proof */}
      <section className="py-20 md:py-28 bg-[#F9FAF8] border-t border-gray-100">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="text-swar-primary font-bold text-xs tracking-[0.25em] uppercase mb-3 block">
              VOICES OF TRANSFORMATION
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-swar-text mb-4">
              Loved by Practitioners Worldwide
            </h2>
            <p className="text-swar-text-secondary text-base sm:text-lg">
              Hear from professionals, doctors, and yogis who made Swar Yoga their daily anchor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 text-amber-400 mb-4 text-lg">★★★★★</div>
                  <p className="italic text-swar-text text-sm sm:text-base leading-relaxed mb-6 font-medium">
                    "{t.quote}"
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <p className="font-bold text-swar-text text-sm">{t.author}</p>
                  <p className="text-xs text-swar-text-tertiary">{t.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-20 md:py-24 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-[#123E25] via-[#165132] to-[#0E311D] p-10 sm:p-14 md:p-20 text-center text-white shadow-2xl">
            {/* Background ambient orbs */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-swar-accent/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl mx-auto space-y-6">
              <span className="inline-block py-1 px-4 rounded-full bg-white/10 text-emerald-300 text-xs font-bold tracking-widest uppercase border border-white/15">
                START YOUR PRACTICE TODAY
              </span>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                Your Breath is Waiting to Be Reclaimed
              </h2>

              <p className="text-emerald-100/90 text-base sm:text-lg leading-relaxed font-light">
                Join our international community of seekers, professionals, and teachers practicing daily Swar Yoga for deep vitality, mental clarity, and inner peace.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/workshops"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-swar-primary hover:bg-emerald-50 rounded-xl font-bold text-base shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Browse Workshops & Courses
                </Link>
                <Link
                  href="/contact"
                  className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-white/30 hover:border-white text-white rounded-xl font-bold text-base transition-all"
                >
                  Contact Our Team
                </Link>
              </div>

              <div className="pt-6 flex items-center justify-center gap-6 text-xs text-emerald-200/80">
                <span className="flex items-center gap-1.5"><Clock size={14} /> Daily 07:00 & 19:00 IST</span>
                <span>•</span>
                <span className="flex items-center gap-1.5"><Globe2 size={14} /> Open to All Levels</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
