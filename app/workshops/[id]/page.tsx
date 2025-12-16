'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Calendar, Clock, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { workshopCatalog, findWorkshopBySlug } from '@/lib/workshopsData';

// Schedule interface removed; full-page register view now handles schedules per mode

export default function WorkshopDetail() {
  const params = useParams();
  const workshopSlug = params.id as string;
  
  // Use findWorkshopBySlug to get from catalog or provide safe default
  const workshop = (findWorkshopBySlug(workshopSlug) || {
    id: 0,
    name: workshopCatalog[0]?.name || 'Swar Yoga Workshop',
    slug: workshopSlug,
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Introduction', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Basics', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'First Steps', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    duration: 'Variable',
    level: 'All Levels',
    category: 'General',
    instructor: 'Master Yoga Instructor',
    description: 'Transform your life through Swar Yoga practice.',
    fullDescription: 'Discover the transformative power of Swar Yoga and breathing techniques.',
    benefits: [
      'Improved breathing capacity',
      'Better stress management',
      'Enhanced well-being',
      'Spiritual growth'
    ],
    testimonies: [
      { id: 1, name: 'Student', role: 'Practitioner', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Transformed my life!', rating: 5 }
    ]
  }) as any;

  return (
    <>
      <Navigation />
      <main>
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
              <div className="inline-block bg-primary-600 text-white px-4 py-2 rounded-full mb-6 font-semibold">
                {workshop.level}
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                {workshop.name}
              </h1>
              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-8">
                {workshop.description}
              </p>

              <Link
                href={`/workshops/${workshopSlug}/register`}
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-semibold text-lg"
              >
                Register Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Workshop Details */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            {/* Key Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Clock className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Duration</h3>
                <p className="text-2xl font-bold text-primary-600">{workshop.duration}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Users className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Instructor</h3>
                <p className="text-lg font-semibold text-gray-700">{workshop.instructor}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Star className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Level</h3>
                <p className="text-lg font-semibold text-gray-700">{workshop.level}</p>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-gray-800 font-semibold mb-2">Price</h3>
                <p className="text-2xl font-bold text-primary-600">{workshop.price}</p>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-6">About This Workshop</h2>
              <p className="text-gray-700 text-lg leading-relaxed mb-8 whitespace-pre-wrap">
                {workshop.fullDescription}
              </p>

              <h3 className="text-2xl font-bold text-gray-800 mb-6">Key Benefits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workshop.benefits.map((benefit: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-4">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                    <span className="text-gray-700 text-lg">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-16">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={workshop.videoUrl}
                  title={workshop.name}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Small Videos Section */}
            {workshop.smallVideos && workshop.smallVideos.length > 0 && (
              <div className="mb-16">
                <h2 className="text-3xl font-bold text-gray-800 mb-8">Watch More Videos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {workshop.smallVideos.map((video: any) => (
                    <div key={video.id} className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <iframe
                          className="absolute top-0 left-0 w-full h-full"
                          src={video.url}
                          title={video.title}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-800 text-center">{video.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Testimonies Section */}
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-800 mb-12 text-center">
                Student Testimonies
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {workshop.testimonies.map((testimony: any) => (
                  <div
                    key={testimony.id}
                    className="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-shadow"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <img
                        src={testimony.image}
                        alt={testimony.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-gray-800">{testimony.name}</h4>
                        <p className="text-gray-600 text-sm">{testimony.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimony.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                    <p className="text-gray-700 italic">"{testimony.text}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-2xl p-12 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Transform Your Life?
              </h2>
              <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto">
                Join hundreds of satisfied students who have experienced the power of pranayama and breathing techniques.
              </p>
              <Link
                href={`/workshops/${workshopSlug}/register`}
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-100 text-primary-600 px-10 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-bold text-lg"
              >
                Register Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Register Modal removed in favor of full-page register view */}

      <Footer />
    </>
  );
}
