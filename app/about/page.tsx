'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function About() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20">
        <div className="container py-20">
          <h1 className="text-5xl font-bold mb-8 text-yoga-700">About Swar Yoga</h1>
          
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-yoga-600">Our Mission</h2>
              <p className="text-lg text-gray-700 mb-4">
                At Swar Yoga, we believe in the transformative power of yoga. Our mission is to make authentic yoga teachings accessible to everyone, combining traditional wisdom with modern wellness.
              </p>
              <p className="text-lg text-gray-700">
                We are committed to helping you achieve physical, mental, and spiritual well-being through our comprehensive yoga programs and premium products.
              </p>
            </div>
            <div className="bg-yoga-50 rounded-lg p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-yoga-600 mb-4">10+</div>
                <p className="text-gray-700 font-semibold">Years of Excellence</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-yoga-200 p-8 mb-16">
            <h2 className="text-3xl font-bold mb-6 text-yoga-600">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-3 text-yoga-700">Authenticity</h3>
                <p className="text-gray-700">We maintain the integrity of traditional yoga teachings.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-yoga-700">Quality</h3>
                <p className="text-gray-700">Premium products and expert instruction in every class.</p>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-yoga-700">Community</h3>
                <p className="text-gray-700">Building a supportive community of wellness seekers.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
