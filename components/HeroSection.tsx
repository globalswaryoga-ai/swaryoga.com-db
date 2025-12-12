'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="bg-gradient-premium text-white py-16 sm:py-24 md:py-40 relative overflow-hidden">
      {/* Decorative elements - hidden on mobile */}
      <div className="hidden md:block absolute top-0 right-0 w-96 h-96 bg-secondary-400/10 rounded-full -mr-48 -mt-48"></div>
      <div className="hidden md:block absolute bottom-0 left-0 w-96 h-96 bg-accent-400/10 rounded-full -ml-48 -mb-48"></div>
      
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
          Welcome to Swar Yoga
        </h1>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-primary-100 max-w-2xl mx-auto leading-relaxed px-2">
          Discover Your Inner Peace and Transform Your Life Through Ancient Yoga Wisdom and Modern Naturopathy
        </p>
        <div className="flex gap-3 sm:gap-4 justify-center flex-wrap px-4">
          <Link
            href="/cart"
            className="bg-accent-500 hover:bg-accent-600 text-primary-950 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold transition text-base sm:text-lg shadow-eco active:scale-95"
          >
            🛍️ Shop Now
          </Link>
          <Link
            href="/about"
            className="border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold hover:bg-white hover:text-primary-600 transition text-base sm:text-lg active:scale-95"
          >
            📚 Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
