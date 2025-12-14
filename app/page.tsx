'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, Calendar, Award } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check if user is logged in and redirect to life planner
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (token && user) {
      // User is logged in, redirect to life planner dashboard
      router.push('/life-planner/dashboard');
    } else {
      // User is not logged in, show home page
      setCheckingAuth(false);
    }
  }, [router]);

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }
  const stats = [
    { number: '25+', label: 'Years Experience', delay: 0 },
    { number: '8000+', label: 'Students Trained', delay: 0.1 },
    { number: '15+', label: 'Countries Reached', delay: 0.2 },
    { number: '100%', label: 'Satisfaction Rate', delay: 0.3 }
  ];

  const resortTeasers = [
    {
      title: 'Brahmaputra River Suites',
      detail: 'Private suites with plunge pools and meditation verandas facing the Brahmaputra.',
      tag: 'Luxury',
    },
    {
      title: 'Ayurvedic Spa Journeys',
      detail: 'Panchakarma, marma therapy, and guided oil massages with resident Vaidyas.',
      tag: 'Healing',
    },
    {
      title: 'Forest Breath Trails',
      detail: 'Daily sunrise and moonlight breath walks inside the sacred groves.',
      tag: 'Nature',
    },
  ];

  return (
    <>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center overflow-hidden">
          <div className="hero-visual">
            <img
              src="https://images.pexels.com/photos/1051838/pexels-photo-1051838.jpeg"
              alt="Peaceful nature yoga setting"
              loading="lazy"
            />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-6xl">
            <div className="hero-content-card max-w-3xl">
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-6xl">🧘</span>
                  <div>
                    <p className="text-white/80 text-sm uppercase tracking-widest">Welcome to</p>
                  </div>
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 leading-tight">
                  <span className="text-green-400">Swar Yoga</span>
                </h1>
              </div>

              <div className="mb-8 md:mb-12">
                <p className="text-xl md:text-2xl text-gray-200 leading-relaxed max-w-2xl">
                  The Science of Breath - Ancient yogic practices that unlock the secrets of conscious breathing for optimal health and vitality.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/calendar"
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg transition-all duration-300 flex items-center justify-center group hover:shadow-lg"
                >
                  <span className="text-lg">Start Your Journey</span>
                  <ArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" size={20} />
                </Link>
                <Link
                  href="/about"
                  className="border-2 border-white hover:bg-white/10 text-white px-8 py-4 rounded-lg transition-all duration-300 text-center text-lg"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl section-surface-soft">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="order-2 md:order-1">
                <h2 className="text-4xl md:text-5xl font-bold text-[#2A5654] mb-8">Discover Swar Yoga</h2>
                <p className="text-gray-700 mb-6 text-lg leading-relaxed">
                  At Swar Yoga, we believe in the transformative power of breath to bring balance and harmony to your life. 
                  Our approach combines traditional yoga practices with modern wellness techniques to create a holistic 
                  experience for practitioners of all levels.
                </p>
                <p className="text-gray-700 mb-8 text-lg leading-relaxed">
                  Whether you're looking to deepen your practice, find stress relief, or embark on a journey of 
                  self-discovery, our experienced instructors are here to guide you every step of the way.
                </p>
                <Link 
                  href="/about" 
                  className="inline-flex items-center text-green-600 hover:text-green-700 font-semibold text-lg group"
                >
                  <span>Learn more about our philosophy</span>
                  <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
              <div className="order-1 md:order-2 relative">
                <div className="rounded-lg overflow-hidden shadow-2xl">
                  <img
                    src="https://i.postimg.cc/J4zrWKT7/temp-Image6-FKl-H4.avif"
                    alt="Swar Yoga practice and meditation"
                    className="w-full h-auto object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 bg-red-500 text-white p-6 rounded-lg shadow-2xl hidden md:block">
                  <p className="text-2xl font-bold">25+ Years</p>
                  <p className="text-sm">of teaching experience</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workshops Call-to-Action Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl section-surface-soft">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-primary-700 mb-6">Transform Your Practice</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Join our comprehensive workshop programs and discover the ancient science of breath
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              {/* Mode Buttons */}
              <div className="flex flex-wrap gap-4 justify-center mb-12">
                <Link
                  href="/workshops?mode=Online"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Online
                </Link>
                <Link
                  href="/workshops?mode=Offline"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Offline
                </Link>
                <Link
                  href="/workshops?mode=Residential"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Residential
                </Link>
                <Link
                  href="/workshops?mode=Recorded"
                  className="bg-red-600 hover:bg-red-700 text-white px-6 md:px-8 py-3 rounded-lg transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Recorded Class
                </Link>
              </div>

              {/* Workshop Image */}
              <div className="relative h-64 md:h-96 rounded-lg overflow-hidden shadow-2xl mb-12">
                <img
                  src="https://i.postimg.cc/kGRQhYJg/tempImageai7DlM.avif"
                  alt="Swar Yoga Workshops - Ancient Science of Breath"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-8 left-8 text-white">
                  <h3 className="text-3xl md:text-4xl font-bold mb-3">
                    Discover Ancient Wisdom
                  </h3>
                  <p className="text-xl text-gray-200">
                    Join our transformative workshops and retreats
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className="section-card-smooth text-center"
                  >
                    <div className="text-4xl font-bold text-green-600 mb-3">{stat.number}</div>
                    <div className="text-gray-700 font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="text-center">
                <Link
                  href="/calendar"
                  className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-lg transition-all duration-300 text-lg font-semibold shadow-lg hover:shadow-xl group"
                >
                  <Calendar size={24} className="mr-3" />
                  <span>Explore Our Workshops</span>
                  <ArrowRight size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>
        
          {/* Resort Preview Section */}
          <section className="py-16 bg-gradient-to-br from-[#f2f6f3] to-white">
            <div className="container mx-auto px-4 md:px-6 max-w-6xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div>
                  <p className="text-xs uppercase tracking-[0.5em] text-gray-500 mb-2">Resort Sanctuary</p>
                  <h2 className="text-4xl font-bold text-gray-900">Swar Resort &amp; Retreat</h2>
                  <p className="text-gray-600 max-w-xl leading-relaxed mt-3">
                    Escape to our Brahmaputra riverside retreat for Ayurvedic resets, breath science, and curated
                    star-lit samadhis. Every stay is designed to align your nervous system with the natural rhythm of
                    the Swar Calendar.
                  </p>
                </div>
                <Link
                  href="/resort"
                  className="bg-green-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-green-700 transition"
                >
                  Explore the resort
                </Link>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {resortTeasers.map((item) => (
                  <article key={item.title} className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
                    <div className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-3">{item.tag}</div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

        {/* Why Choose Section */}
        <section className="py-20">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl section-surface-soft">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-[#2A5654] mb-6">Why Choose Swar Yoga?</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Experience authentic yoga teachings with certified instructors and transformative practices
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="section-card-smooth border-t-4 border-primary-600">
                <Award size={40} className="text-primary-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Expert Instructors</h3>
                <p className="text-gray-600 text-lg">Learn from certified yoga masters with decades of experience and international recognition.</p>
              </div>
              
              <div className="section-card-smooth border-t-4 border-coral-rose-600">
                <Calendar size={40} className="text-coral-rose-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Flexible Schedules</h3>
                <p className="text-gray-600 text-lg">Join workshops and classes at times that work for your lifestyle and learning pace.</p>
              </div>
              
              <div className="section-card-smooth border-t-4 border-teal-accent-600">
                <ArrowRight size={40} className="text-teal-accent-600 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Proven Results</h3>
                <p className="text-gray-600 text-lg">Join thousands of students who have experienced transformative health and wellness benefits.</p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link 
                href="/about" 
                className="inline-block bg-primary-600 text-white px-10 py-4 rounded-lg hover:bg-primary-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Learn More About Us
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="section-gradient-cta">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center relative z-10">
            <h2 className="text-4xl md:text-5xl font-bold mb-8">Begin Your Yoga Journey Today</h2>
            <p className="text-xl text-primary-100 mb-12 leading-relaxed">
              Join our community and discover the transformative power of yoga. Whether you're a beginner or an experienced practitioner, we have programs for every level.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/calendar"
                className="btn-gradient-cta"
              >
                Browse Workshops
              </Link>
              <Link
                href="/contact"
                className="btn-outline-soft"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
