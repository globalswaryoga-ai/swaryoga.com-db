'use client';

import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import HeroSection from '@/components/HeroSection';

export default function Home() {
  return (
    <>
      <Navigation />
      <main>
        <HeroSection />
        
        <section className="py-20 bg-white">
          <div className="container">
            <h2 className="text-4xl font-bold text-center mb-12 text-yoga-700">
              Featured Products
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3].map((item) => (
                <div key={item} className="bg-yoga-50 rounded-lg overflow-hidden shadow-md hover:shadow-lg transition">
                  <div className="h-48 bg-gradient-to-br from-yoga-100 to-yoga-200 flex items-center justify-center">
                    <span className="text-yoga-600 text-lg font-semibold">Product {item}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold mb-2">Yoga Product {item}</h3>
                    <p className="text-gray-600 mb-4">High-quality yoga products for your practice.</p>
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-yoga-600">$99.99</span>
                      <Link href="/cart" className="bg-yoga-600 text-white px-4 py-2 rounded hover:bg-yoga-700 transition">
                        Add to Cart
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-yoga-50">
          <div className="container text-center">
            <h2 className="text-4xl font-bold mb-6 text-yoga-700">Why Choose Swar Yoga?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12">
              Experience authentic yoga teachings with certified instructors and premium products.
            </p>
            <Link href="/about" className="inline-block bg-yoga-600 text-white px-8 py-3 rounded-lg hover:bg-yoga-700 transition font-semibold">
              Learn More
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
