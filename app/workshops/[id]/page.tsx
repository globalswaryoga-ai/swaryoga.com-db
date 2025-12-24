import React from 'react';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Calendar, Clock, Users, Star, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';

// Schedule interface removed; full-page register view now handles schedules per mode

const workshopDetails: Record<string, any> = {
  'swar-yoga-basic': {
    id: 1,
    name: 'Swar Yoga Basic Workshop',
    image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Introduction to Swar Yoga', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Breathing Basics', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'First Steps', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    duration: '3 days',
    level: 'Beginner',
    instructor: 'Master Yoga Instructor',
    price: '₹2,999',
    currency: 'INR',
    description: 'Foundation of Swar Yoga practice and breathing techniques.',
    fullDescription: `The Swar Yoga Basic Workshop is the perfect starting point for anyone interested in learning the ancient science of Swar Yoga. Over 3 intensive days, you'll master the fundamental breathing techniques and postures that form the foundation of this powerful practice.

This beginner-friendly workshop teaches you the basic principles of Swar Yoga, which focuses on the science of breath and its connection to physical health, mental clarity, and spiritual development. Whether you're looking to improve your overall wellness or begin a deeper yoga journey, this workshop provides the essential foundation you need.

Topics covered:
- Introduction to Swar Yoga philosophy
- Basic breathing techniques and pranayama
- Fundamental yoga postures and alignment
- Daily practice guidelines
- Common mistakes and how to avoid them`,
    benefits: [
      'Learn authentic Swar Yoga techniques',
      'Improved breathing capacity',
      'Increased energy and vitality',
      'Better stress management',
      'Foundation for advanced practices',
      'Enhanced body awareness'
    ],
    schedule: [
      { id: 's1', startDate: '2025-01-15', endDate: '2025-01-17', time: '6:00 AM - 8:00 AM', seats: 30, price: 2999, currency: 'INR' },
      { id: 's2', startDate: '2025-02-20', endDate: '2025-02-22', time: '6:00 AM - 8:00 AM', seats: 30, price: 2999, currency: 'INR' },
      { id: 's3', startDate: '2025-03-15', endDate: '2025-03-17', time: '5:00 PM - 7:00 PM', seats: 25, price: 2999, currency: 'INR' }
    ],
    testimonies: [
      { id: 1, name: 'Priya Sharma', role: 'Software Developer', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg', text: 'Amazing foundation course! I finally understand how breathing techniques can transform your life.', rating: 5 },
      { id: 2, name: 'Rajesh Kumar', role: 'Business Owner', image: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg', text: 'The instructor made everything so clear and easy to understand. Highly recommended!', rating: 5 },
      { id: 3, name: 'Anjali Patel', role: 'Teacher', image: 'https://images.pexels.com/photos/1181574/pexels-photo-1181574.jpeg', text: 'Perfect for beginners. I feel energized after just 3 days!', rating: 5 }
    ]
  },
  'swar-yoga-level-1': {
    id: 2,
    name: 'Swar Yoga Level-1 Workshop',
    image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
    heroImage: 'https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg',
    videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    smallVideos: [
      { id: 1, title: 'Level-1 Overview', url: 'https://www.youtube.com/embed/jNQXAC9IVRw' },
      { id: 2, title: 'Advanced Breathing', url: 'https://www.youtube.com/embed/9bZkp7q19f0' },
      { id: 3, title: 'Meditation Techniques', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
  },
};

export const dynamic = 'force-dynamic';

export default function WorkshopDetailPage({ params }: { params: { id: string } }) {
      const workshop = findWorkshopBySlug(params.id);

      // Invalid slug (including reserved words like "register") should be a real 404.
      if (!workshop) {
        notFound();
      }

      const modes = workshop.mode?.length ? workshop.mode.join(', ') : '—';
      const languages = workshop.language?.length ? workshop.language.join(', ') : '—';
      const currencies = workshop.currency?.length ? workshop.currency.join(', ') : '—';

      return (
        <>
          <Navigation />

          <main className="mt-16 sm:mt-20">
            {/* Hero */}
            <section className="relative min-h-[50vh] sm:min-h-[60vh] flex items-center overflow-hidden">
              <div className="absolute inset-0 z-0">
                <Image
                  src={workshop.image}
                  alt={workshop.name}
                  fill
                  priority
                  className="object-cover"
                  sizes="100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 to-black/30" />
              </div>

              <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-6xl">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full mb-6 font-semibold">
                    <span className="text-primary-200">{workshop.category}</span>
                    <span className="opacity-70">•</span>
                    <span>{workshop.level}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                    {workshop.name}
                  </h1>

                  <p className="text-base sm:text-lg text-gray-100 leading-relaxed mb-8">
                    {workshop.description}
                  </p>

                  <div className="flex flex-wrap gap-4 mb-8 text-white/90">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5" />
                      <span className="font-semibold">{workshop.duration}</span>
                    </div>
                  </div>

                  <Link
                    href={`/workshops/${workshop.slug}/register`}
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-7 py-3.5 rounded-lg transition-all duration-300 font-semibold"
                  >
                    Register
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </section>

            {/* Details */}
            <section className="py-10 sm:py-16 bg-gray-50">
              <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                      <Globe className="w-5 h-5 text-primary-600" />
                      Mode
                    </div>
                    <p className="text-gray-700">{modes}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                      <Languages className="w-5 h-5 text-primary-600" />
                      Language
                    </div>
                    <p className="text-gray-700">{languages}</p>
                  </div>

                  <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center gap-2 font-semibold text-gray-800 mb-2">
                      <Wallet className="w-5 h-5 text-primary-600" />
                      Currency
                    </div>
                    <p className="text-gray-700">{currencies}</p>
                  </div>
                </div>

                <div className="mt-8 sm:mt-10 bg-white rounded-xl shadow p-6 sm:p-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Registration</h2>
                  <p className="text-gray-700 mb-6">
                    All programs use the same registration flow. Select your preferred mode, schedule, and language on the register page.
                  </p>

                  <Link
                    href={`/workshops/${workshop.slug}/register`}
                    className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white px-6 py-3 rounded-lg transition-all duration-300 font-semibold"
                  >
                    Go to Register Page
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            </section>
          </main>

          <Footer />
        </>
      );
    }
