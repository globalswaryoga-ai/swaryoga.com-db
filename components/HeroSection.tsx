'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-r from-yoga-600 to-yoga-700 text-white py-32">
      <div className="container text-center">
        <h1 className="text-6xl font-bold mb-6">Welcome to Swar Yoga</h1>
        <p className="text-2xl mb-8 text-yoga-50">
          Discover Your Inner Peace and Transform Your Life
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/cart"
            className="bg-white text-yoga-600 px-8 py-4 rounded-lg font-bold hover:bg-yoga-50 transition text-lg"
          >
            Shop Now
          </Link>
          <Link
            href="/about"
            className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-white hover:text-yoga-600 transition text-lg"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}
