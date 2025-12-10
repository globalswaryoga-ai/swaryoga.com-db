'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="bg-gradient-premium text-white py-40 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-400/10 rounded-full -mr-48 -mt-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent-400/10 rounded-full -ml-48 -mb-48"></div>
      
      <div className="container text-center relative z-10">
        <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">Welcome to Swar Yoga</h1>
        <p className="text-xl md:text-2xl mb-8 text-primary-100 max-w-2xl mx-auto leading-relaxed">
          Discover Your Inner Peace and Transform Your Life Through Ancient Yoga Wisdom and Modern Naturopathy
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/cart"
            className="bg-accent-500 hover:bg-accent-600 text-primary-950 px-8 py-4 rounded-lg font-bold transition text-lg shadow-eco"
          >
            🛍️ Shop Now
          </Link>
          <Link
            href="/about"
            className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-primary-600 transition text-lg"
          >
            📚 Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
