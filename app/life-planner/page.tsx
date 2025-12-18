'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function LifePlannerPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('lifePlannerUser');
    
    if (user) {
      // If logged in, redirect to dashboard
      router.push('/life-planner/dashboard');
    }
  }, [router]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setSubscribed(true);
        setEmail('');
        setTimeout(() => setSubscribed(false), 3000);
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
    }
  };

  return (
    <div className="bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] flex items-center">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg"
            alt="Life Planning"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10 safe-area-left safe-area-right">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              Design Your Life with Purpose
            </h1>
            <p className="text-lg sm:text-xl text-gray-100 mb-8">
              Create a hierarchical vision, set milestones, and track your journey to success. Login or signup to start your life planning journey today.
            </p>
            <div className="flex gap-4 flex-wrap">
              <button
                onClick={() => router.push('/life-planner/login')}
                className="bg-[#2A5654] text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-[#1F4240] transition"
              >
                Login
              </button>
              <button
                onClick={() => router.push('/life-planner/signup')}
                className="bg-[#FF9F43] text-white px-6 sm:px-8 py-3 rounded-lg font-semibold hover:bg-orange-500 transition"
              >
                Start Free
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-swar-bg">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12">Life Planner Features</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#2A5654] mb-4">📊</div>
              <h3 className="font-semibold text-lg mb-2">Hierarchical Planning</h3>
              <p className="text-swar-text-secondary">Vision → Milestones → Goals → Tasks → Todos</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#FF9F43] mb-4">🎯</div>
              <h3 className="font-semibold text-lg mb-2">Track Progress</h3>
              <p className="text-swar-text-secondary">Monitor your journey and celebrate wins</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#4ADE80] mb-4">💾</div>
              <h3 className="font-semibold text-lg mb-2">Secure Storage</h3>
              <p className="text-swar-text-secondary">Your data is safely stored in the cloud</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stay Connected Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-[#1a2332]">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="text-3xl">✨</div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white">Stay Connected</h2>
            </div>
          </div>
          
          <form onSubmit={handleSubscribe} className="flex gap-2 sm:gap-3 mb-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 sm:px-6 py-3 rounded-lg text-swar-text placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF9F43]"
              required
            />
            <button
              type="submit"
              className="bg-[#4ADE80] hover:bg-swar-primary-light0 text-white px-6 sm:px-8 py-3 rounded-lg font-semibold flex items-center gap-2 transition"
            >
              <ArrowRight size={20} />
              <span className="hidden sm:inline">Subscribe</span>
            </button>
          </form>
          
          <p className="text-swar-text-secondary text-sm sm:text-base text-center">
            Subscribe to receive updates, planning tips, and wellness insights.
          </p>
          
          {subscribed && (
            <div className="mt-4 p-3 bg-swar-primary-light0/20 border border-green-500/50 rounded-lg text-green-300 text-center text-sm">
              ✓ Thank you for subscribing!
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
