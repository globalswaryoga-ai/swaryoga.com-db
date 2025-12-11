'use client';

import React, { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowRight, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Workshop {
  id: number;
  name: string;
  slug: string;
  image: string;
  description: string;
  duration: string;
  level: string;
  category: string;
  mode?: string[];
  language?: string[];
  currency?: string[];
  batches?: Batch[];
}

interface Batch {
  id: string;
  startDate: string;
  mode: string;
  language: string;
  status: 'open' | 'closed';
  price: number;
  currency: string;
}

export default function WorkshopsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const workshopsPerPage = 3;
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const queryString = searchParams?.toString() ?? '';

  useEffect(() => {
    if (!searchParams) return;
    setSelectedMode(searchParams.get('mode') || null);
    setSelectedLanguage(searchParams.get('language') || null);
    setSelectedPayment(searchParams.get('currency') || null);
    setSelectedCategory(searchParams.get('category') || null);
    setCurrentPage(1);
  }, [queryString, searchParams]);

  const workshops: Workshop[] = [
    {
      id: 1,
      name: 'Swar Yoga Basic Workshop',
      slug: 'swar-yoga-basic',
      image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
      description: 'Foundation of Swar Yoga practice',
      duration: '3 days',
      level: 'Beginner',
      category: 'Swar Yoga',
      mode: ['Online', 'Offline', 'Residential'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR', 'USD', 'NPR'],
      batches: [
        { id: 'b1', startDate: '19th Dec 2025', mode: 'Online', language: 'Hindi', status: 'open', price: 2999, currency: 'INR' },
        { id: 'b2', startDate: '22nd Dec 2025', mode: 'Offline', language: 'English', status: 'open', price: 3499, currency: 'INR' },
        { id: 'b3', startDate: '25th Dec 2025', mode: 'Residential', language: 'Marathi', status: 'closed', price: 4999, currency: 'INR' },
        { id: 'b4', startDate: '2nd Jan 2026', mode: 'Online', language: 'Hindi', status: 'open', price: 2999, currency: 'INR' }
      ]
    },
    {
      id: 2,
      name: 'Swar Yoga Level-1 Workshop',
      slug: 'swar-yoga-level-1',
      image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
      description: 'First level comprehensive Swar Yoga training',
      duration: '15 days',
      level: 'Beginner',
      category: 'Swar Yoga',
      mode: ['Online', 'Residential'],
      language: ['Hindi', 'English'],
      currency: ['INR', 'USD'],
      batches: [
        { id: 'b1', startDate: '20th Dec 2025', mode: 'Online', language: 'Hindi', status: 'open', price: 9999, currency: 'INR' },
        { id: 'b2', startDate: '5th Jan 2026', mode: 'Residential', language: 'English', status: 'open', price: 12999, currency: 'INR' },
        { id: 'b3', startDate: '15th Jan 2026', mode: 'Online', language: 'English', status: 'closed', price: 9999, currency: 'INR' }
      ]
    },
    {
      id: 3,
      name: 'Swar Yoga Youth Program',
      slug: 'swar-yoga-youth',
      image: 'https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg',
      description: 'Specially designed for young practitioners',
      duration: '10 days',
      level: 'Beginner',
      category: 'Youth',
      mode: ['Online', 'Offline'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR', 'NPR']
    },
    {
      id: 4,
      name: 'Weight Loss Program',
      slug: 'weight-loss-program',
      image: 'https://images.pexels.com/photos/1624365/pexels-photo-1624365.jpeg',
      description: 'Transform your body through Swar Yoga',
      duration: '90 days',
      level: 'Intermediate',
      category: 'Health',
      mode: ['Online', 'Offline', 'Recorded'],
      language: ['Hindi', 'English'],
      currency: ['INR', 'USD']
    },
    {
      id: 5,
      name: 'Meditation Program',
      slug: 'meditation-program',
      image: 'https://images.pexels.com/photos/3807517/pexels-photo-3807517.jpeg',
      description: 'Deep meditation and mindfulness training',
      duration: '15 days',
      level: 'All Levels',
      category: 'Health',
      mode: ['Online', 'Offline', 'Residential'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR', 'NPR', 'USD']
    },
    {
      id: 6,
      name: 'Amrut Aahar (Natural Diet) Program',
      slug: 'amrut-aahar-diet',
      image: 'https://images.pexels.com/photos/3807507/pexels-photo-3807507.jpeg',
      description: 'Complete natural diet and nutrition guidance',
      duration: '45 days',
      level: 'All Levels',
      category: 'Health',
      mode: ['Online', 'Offline'],
      language: ['Hindi', 'Marathi'],
      currency: ['INR']
    },
    {
      id: 7,
      name: 'Swar Yoga Level-2 Wealth Program',
      slug: 'swar-yoga-level-2-wealth',
      image: 'https://images.pexels.com/photos/3873033/pexels-photo-3873033.jpeg',
      description: 'Advanced Swar Yoga for wealth creation and prosperity',
      duration: '15 days',
      level: 'Intermediate',
      category: 'Swar Yoga',
      mode: ['Online', 'Residential'],
      language: ['Hindi'],
      currency: ['INR']
    },
    {
      id: 8,
      name: 'Astavakra Dhyan Program (L-3)',
      slug: 'astavakra-dhyan-level-3',
      image: 'https://images.pexels.com/photos/3807516/pexels-photo-3807516.jpeg',
      description: 'Level-3 advanced meditation and wisdom',
      duration: '10 days',
      level: 'Advanced',
      category: 'Swar Yoga',
      mode: ['Residential'],
      language: ['Hindi', 'English'],
      currency: ['INR', 'USD']
    },
    {
      id: 9,
      name: 'Pre Pregnancy Program',
      slug: 'pre-pregnancy-program',
      image: 'https://images.pexels.com/photos/3807521/pexels-photo-3807521.jpeg',
      description: 'Safe yoga practice for expecting mothers',
      duration: '36 days (2 days/week)',
      level: 'All Levels',
      category: 'Health',
      mode: ['Online', 'Offline'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR', 'NPR']
    },
    {
      id: 10,
      name: 'Swar Yoga Children Program',
      slug: 'swar-yoga-children',
      image: 'https://images.pexels.com/photos/3807518/pexels-photo-3807518.jpeg',
      description: 'Yoga training for children and teenagers',
      duration: '10 days',
      level: 'Beginner',
      category: 'Youth',
      mode: ['Offline', 'Online'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR']
    },
    {
      id: 11,
      name: 'Complete Health Program',
      slug: 'complete-health-program',
      image: 'https://images.pexels.com/photos/3807519/pexels-photo-3807519.jpeg',
      description: 'Holistic cure for BP, diabetes, heart, liver, kidney, migraine & hormonal balance',
      duration: '45 days',
      level: 'All Levels',
      category: 'Health',
      mode: ['Online', 'Offline', 'Recorded'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR', 'USD', 'NPR']
    },
    {
      id: 12,
      name: 'Business Swar Yoga - Plan & Earn',
      slug: 'business-swar-yoga-earn',
      image: 'https://images.pexels.com/photos/3807520/pexels-photo-3807520.jpeg',
      description: 'Business opportunity and personal development',
      duration: '60 days (2 days/week)',
      level: 'Intermediate',
      category: 'Corporate',
      mode: ['Online'],
      language: ['Hindi', 'English'],
      currency: ['INR', 'USD']
    },
    {
      id: 13,
      name: 'Corporate Swar Yoga - Management',
      slug: 'corporate-swar-yoga-management',
      image: 'https://images.pexels.com/photos/3820517/pexels-photo-3820517.jpeg',
      description: 'Stress management and productivity for corporate professionals',
      duration: '10 days',
      level: 'Intermediate',
      category: 'Corporate',
      mode: ['Online', 'Offline'],
      language: ['English', 'Hindi'],
      currency: ['INR', 'USD']
    },
    {
      id: 14,
      name: 'Self Awareness - Level-4',
      slug: 'self-awareness-level-4',
      image: 'https://images.pexels.com/photos/2397220/pexels-photo-2397220.jpeg',
      description: 'Ultimate self-discovery and spiritual transformation',
      duration: '30 days',
      level: 'Advanced',
      category: 'Swar Yoga',
      mode: ['Residential'],
      language: ['Hindi', 'English'],
      currency: ['INR', 'USD', 'NPR']
    },
    {
      id: 15,
      name: 'Happy Married Life',
      slug: 'happy-married-life',
      image: 'https://images.pexels.com/photos/3807512/pexels-photo-3807512.jpeg',
      description: 'Transform your married life with Swar Yoga techniques',
      duration: '36 days (2 days/week)',
      level: 'All Levels',
      category: 'Health',
      mode: ['Online', 'Offline'],
      language: ['Hindi', 'English', 'Marathi'],
      currency: ['INR', 'USD', 'NPR'],
      batches: [
        { id: 'b1', startDate: '10th Jan 2026', mode: 'Online', language: 'Hindi', status: 'open', price: 7999, currency: 'INR' },
        { id: 'b2', startDate: '24th Jan 2026', mode: 'Offline', language: 'English', status: 'open', price: 8999, currency: 'INR' },
        { id: 'b3', startDate: '7th Feb 2026', mode: 'Online', language: 'Marathi', status: 'closed', price: 7999, currency: 'INR' }
      ]
    }
  ];

  // Filter workshops based on selected filters
  const filteredWorkshops = workshops.filter((workshop) => {
    const categoryMatch = !selectedCategory || workshop.category === selectedCategory;
    const modeMatch = !selectedMode || (workshop.mode && workshop.mode.includes(selectedMode));
    const languageMatch = !selectedLanguage || (workshop.language && workshop.language.includes(selectedLanguage));
    const currencyMatch = !selectedPayment || (workshop.currency && workshop.currency.includes(selectedPayment));
    
    return categoryMatch && modeMatch && languageMatch && currencyMatch;
  });

  const totalPages = Math.ceil(filteredWorkshops.length / workshopsPerPage);
  const startIndex = (currentPage - 1) * workshopsPerPage;
  const endIndex = startIndex + workshopsPerPage;
  const currentWorkshops = filteredWorkshops.slice(startIndex, endIndex);

  return (
    <>
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="relative h-96 md:h-screen flex items-center overflow-hidden mt-20">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.pexels.com/photos/3807512/pexels-photo-3807512.jpeg"
              alt="Workshops hero"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/40" />
          </div>

          <div className="container mx-auto px-4 md:px-6 relative z-10 max-w-6xl">
            <div className="max-w-3xl">
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <BookOpen className="w-8 h-8 text-primary-400" />
                  <span className="text-primary-400 font-semibold text-lg">Our Programs</span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
                  Transformative Workshops
                </h1>
              </div>

              <p className="text-lg md:text-xl text-gray-200 leading-relaxed max-w-2xl mb-8">
                Choose from 12 comprehensive workshops designed to elevate your yoga practice and transform your life through the science of breath.
              </p>

              <Link
                href="/calendar"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-lg transition-all duration-300 group hover:shadow-lg transform hover:scale-105 font-semibold"
              >
                Explore Schedules
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>

        {/* Workshops Grid */}
        <section className="py-16 md:py-24 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
                Explore Our Workshops
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Each workshop is carefully designed by yoga masters to provide authentic learning and personal transformation.
              </p>
            </div>

            {/* Filters Section */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Filter Workshops</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Our Workshop Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Our Workshop</label>
                  <select
                    value={selectedCategory || ''}
                    onChange={(e) => setSelectedCategory(e.target.value || null)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Workshops</option>
                    <option value="Swar Yoga">Swar Yoga Programs</option>
                    <option value="Health">Health & Wellness</option>
                    <option value="Corporate">Corporate Programs</option>
                    <option value="Youth">Youth Programs</option>
                  </select>
                </div>

                {/* Mode Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Mode of Learning</label>
                  <select
                    value={selectedMode || ''}
                    onChange={(e) => setSelectedMode(e.target.value || null)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Modes</option>
                    <option value="Online">Online</option>
                    <option value="Offline">Offline</option>
                    <option value="Residential">Residential</option>
                    <option value="Recorded">Recorded</option>
                  </select>
                </div>

                {/* Language Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Language</label>
                  <select
                    value={selectedLanguage || ''}
                    onChange={(e) => setSelectedLanguage(e.target.value || null)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Languages</option>
                    <option value="Hindi">Hindi</option>
                    <option value="English">English</option>
                    <option value="Marathi">Marathi</option>
                  </select>
                </div>

                {/* Payment Currency Filter Dropdown */}
                <div>
                  <label className="block text-lg font-semibold text-gray-700 mb-3">Payment Currency</label>
                  <select
                    value={selectedPayment || ''}
                    onChange={(e) => setSelectedPayment(e.target.value || null)}
                    className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg font-semibold text-gray-700 cursor-pointer hover:border-primary-400 focus:outline-none focus:border-primary-600 transition-all duration-300"
                  >
                    <option value="">All Currencies</option>
                    <option value="INR">₹ INR (Indian Rupee)</option>
                    <option value="USD">$ USD (US Dollar)</option>
                    <option value="NPR">Rs NPR (Nepali Rupee)</option>
                  </select>
                </div>
              </div>

              {/* Clear Filters Button */}
              {(selectedMode || selectedLanguage || selectedPayment || selectedCategory) && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setSelectedMode(null);
                      setSelectedLanguage(null);
                      setSelectedPayment(null);
                      setSelectedCategory(null);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                  >
                    ✕ Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Workshop Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
              {currentWorkshops.map((workshop) => (
                <div
                  key={workshop.id}
                  className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 group"
                >
                  {/* Workshop Image */}
                  <div className="relative h-64 md:h-72 overflow-hidden bg-gray-200">
                    <img
                      src={workshop.image}
                      alt={workshop.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Level Badge */}
                    <div className="absolute top-4 right-4">
                      <span
                        className={`px-4 py-2 rounded-full text-white text-sm font-semibold ${
                          workshop.level === 'Beginner'
                            ? 'bg-green-500'
                            : workshop.level === 'Intermediate'
                            ? 'bg-blue-500'
                            : workshop.level === 'Advanced'
                            ? 'bg-red-500'
                            : 'bg-purple-500'
                        }`}
                      >
                        {workshop.level}
                      </span>
                    </div>
                  </div>

                  {/* Workshop Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {workshop.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {workshop.description}
                    </p>

                    <div className="flex items-center justify-between mb-6 pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-500 font-medium">
                        Duration: {workshop.duration}
                      </span>
                    </div>

                    {/* Filter Badges Removed - Only shown in batch details */}

                    {/* Batches Section Removed - Only shown on detail page */}

                    {/* Learn More Button */}
                    <Link
                      href={`/workshops/${workshop.slug}`}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg transition-all duration-300 font-semibold flex items-center justify-center gap-2 group/btn transform hover:scale-105"
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                        currentPage === page
                          ? 'bg-primary-600 text-white shadow-lg'
                          : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary-600'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-6 py-2 bg-white border-2 border-primary-600 text-primary-600 rounded-lg font-semibold hover:bg-primary-600 hover:text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}

            {/* Additional Info */}
            <div className="mt-16 pt-12 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">14</div>
                  <p className="text-gray-600 font-semibold">Total Workshops</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">Expert</div>
                  <p className="text-gray-600 font-semibold">Certified Instructors</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">100%</div>
                  <p className="text-gray-600 font-semibold">Transformation Guaranteed</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
