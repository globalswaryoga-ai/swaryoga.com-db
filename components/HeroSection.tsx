'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="bg-gradient-premium text-white py-12 sm:py-20 md:py-32 lg:py-40 relative overflow-hidden">
      {/* Decorative elements - hidden on mobile */}
      <div className="hidden md:block absolute top-0 right-0 w-96 h-96 bg-secondary-400/10 rounded-full -mr-48 -mt-48"></div>
      <div className="hidden md:block absolute bottom-0 left-0 w-96 h-96 bg-accent-400/10 rounded-full -ml-48 -mb-48"></div>
      
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight tracking-tight">
          Welcome to Swar Yoga
        </h1>
        <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-6 sm:mb-8 md:mb-10 text-primary-100 max-w-3xl mx-auto leading-relaxed">
          Discover Your Inner Peace and Transform Your Life Through Ancient Yoga Wisdom and Modern Naturopathy
        </p>
        <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center flex-col sm:flex-row">
          <Link
            href="/cart"
            className="bg-accent-500 hover:bg-accent-600 active:scale-95 text-primary-950 px-4 sm:px-6 md:px-8 py-3 sm:py-3 md:py-4 rounded-lg font-bold transition text-base sm:text-lg shadow-eco touch-target min-h-12 w-full sm:w-auto"
          >
            🛍️ Shop Now
          </Link>
          <Link
            href="/about"
            className="border-2 border-white text-white px-4 sm:px-6 md:px-8 py-3 sm:py-3 md:py-4 rounded-lg font-bold hover:bg-white hover:text-primary-600 transition text-base sm:text-lg active:scale-95 touch-target min-h-12 w-full sm:w-auto"
          >
            📚 Learn More
          </Link>
        </div>
        
        {/* Features below hero - mobile friendly */}
        <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-white/20">
          <p className="text-xs sm:text-sm text-primary-100 mb-4 font-semibold">TRUSTED BY THOUSANDS</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold">25+</p>
              <p className="text-xs sm:text-sm text-primary-100">Years Experience</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold">8000+</p>
              <p className="text-xs sm:text-sm text-primary-100">Students</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold">15+</p>
              <p className="text-xs sm:text-sm text-primary-100">Countries</p>
            </div>
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold">100%</p>
              <p className="text-xs sm:text-sm text-primary-100">Satisfaction</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
