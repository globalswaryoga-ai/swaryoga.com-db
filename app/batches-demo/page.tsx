'use client';

import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import BatchCard from '@/components/BatchCard';

/**
 * This is a demo page showing how to use the BatchCard component
 * You can integrate this into your workshops page or create dedicated pages for each workshop
 */

const swarYogaBasicBatches = [
  {
    id: '1',
    startDate: '24 Jan 2025',
    duration: '24 Jan - 27 Jan',
    time: '19:00 to 21:00',
    location: 'By Zoom',
    availableSeats: 50,
  },
  {
    id: '2',
    startDate: '4 Feb 2025',
    duration: '4 Feb - 6 Feb',
    time: '18:00 to 20:00',
    location: 'By Zoom',
    availableSeats: 60,
  },
];

export default function SwarYogaBasicOnlineDemo() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-yoga-50 to-yoga-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-swar-text mb-4">
              Swar Yoga Basic - Online
            </h1>
            <p className="text-xl text-swar-text-secondary max-w-2xl mx-auto">
              Choose your preferred language and country to see available batches and pricing
            </p>
          </div>

          {/* Hindi Batches */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-swar-text mb-8 pb-4 border-b-2 border-yoga-600">
              🇮🇳 Hindi (हिंदी)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BatchCard
                workshop="swar-yoga-basic"
                mode="online"
                language="hindi"
                batches={swarYogaBasicBatches}
                indianPrice={999}
                internationalPrice={29}
              />
              <BatchCard
                workshop="swar-yoga-basic"
                mode="online"
                language="hindi"
                batches={[
                  {
                    id: '3',
                    startDate: '15 Feb 2025',
                    duration: '15 Feb - 18 Feb',
                    time: '20:00 to 22:00',
                    location: 'By Zoom',
                    availableSeats: 45,
                  },
                ]}
                indianPrice={999}
                internationalPrice={29}
              />
            </div>
          </div>

          {/* English Batches */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-swar-text mb-8 pb-4 border-b-2 border-blue-600">
              🌍 English
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BatchCard
                workshop="swar-yoga-basic"
                mode="online"
                language="english"
                batches={[
                  {
                    id: '4',
                    startDate: '20 Jan 2025',
                    duration: '20 Jan - 23 Jan',
                    time: '10:00 to 12:00',
                    location: 'By Zoom',
                    availableSeats: 40,
                  },
                  {
                    id: '5',
                    startDate: '1 Feb 2025',
                    duration: '1 Feb - 4 Feb',
                    time: '15:00 to 17:00',
                    location: 'By Zoom',
                    availableSeats: 55,
                  },
                ]}
                indianPrice={1499}
                internationalPrice={39}
              />
              <BatchCard
                workshop="swar-yoga-basic"
                mode="online"
                language="english"
                batches={[
                  {
                    id: '6',
                    startDate: '10 Mar 2025',
                    duration: '10 Mar - 13 Mar',
                    time: '12:00 to 14:00',
                    location: 'By Zoom',
                    availableSeats: 35,
                  },
                ]}
                indianPrice={1499}
                internationalPrice={39}
              />
            </div>
          </div>

          {/* Marathi Batches */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-swar-text mb-8 pb-4 border-b-2 border-purple-600">
              🇮🇳 Marathi (मराठी)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <BatchCard
                workshop="swar-yoga-basic"
                mode="online"
                language="marathi"
                batches={[
                  {
                    id: '7',
                    startDate: '25 Jan 2025',
                    duration: '25 Jan - 28 Jan',
                    time: '17:00 to 19:00',
                    location: 'By Zoom',
                    availableSeats: 50,
                  },
                ]}
                indianPrice={999}
                internationalPrice={29}
              />
              <BatchCard
                workshop="swar-yoga-basic"
                mode="online"
                language="marathi"
                batches={[
                  {
                    id: '8',
                    startDate: '5 Feb 2025',
                    duration: '5 Feb - 8 Feb',
                    time: '19:00 to 21:00',
                    location: 'By Zoom',
                    availableSeats: 42,
                  },
                ]}
                indianPrice={999}
                internationalPrice={29}
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-white rounded-lg shadow-lg p-8 border-l-4 border-yoga-600">
            <h3 className="text-2xl font-bold text-swar-text mb-4">How to Use Batch Cards</h3>
            <ul className="space-y-3 text-swar-text">
              <li className="flex items-start gap-3">
                <span className="text-swar-primary font-bold text-xl">1.</span>
                <span>Select your preferred country (India, Nepal, or International)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-swar-primary font-bold text-xl">2.</span>
                <span>The price and currency will update automatically based on your selection</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-swar-primary font-bold text-xl">3.</span>
                <span>Click "Add to Cart" to save the batch for checkout with the right price for your language and country</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-swar-primary font-bold text-xl">4.</span>
                <span>Payment links are dynamically retrieved from your .env.payment configuration</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
