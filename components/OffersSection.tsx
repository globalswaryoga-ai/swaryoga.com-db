'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Clock } from 'lucide-react';

interface Offer {
  _id: string;
  title: string;
  description: string;
  discountPercentage: number;
  offerCode: string;
  validUntil: string;
  isActive: boolean;
}

export default function OffersSection() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers');
      if (response.ok) {
        const data = await response.json();
        setOffers(Array.isArray(data) ? data : []);
      } else {
        console.warn('Failed to fetch offers:', response.statusText);
        setOffers([]);
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const getDaysRemaining = (validUntil: string) => {
    const now = new Date();
    const until = new Date(validUntil);
    const days = Math.ceil((until.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading || offers.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Gift className="w-6 h-6 text-coral-rose-500" />
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Special Offers & Deals</h2>
          </div>
          <p className="text-gray-600 text-lg">Exclusive promotions just for you</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <div
              key={offer._id}
              className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-primary-100"
            >
              {/* Discount Badge */}
              <div className="bg-gradient-to-r from-coral-rose-500 to-coral-rose-600 text-white p-4 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-coral-rose-400 rounded-full opacity-20"></div>
                <div className="relative">
                  <p className="text-sm font-medium opacity-90">Limited Time Offer</p>
                  <h3 className="text-2xl font-bold">{offer.discountPercentage}% OFF</h3>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h4 className="text-xl font-bold text-gray-900 mb-2">{offer.title}</h4>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{offer.description}</p>

                {/* Offer Code */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Use Code</p>
                  <div className="flex items-center justify-between">
                    <code className="text-lg font-bold text-primary-600">{offer.offerCode}</code>
                    <button
                      onClick={() => copyToClipboard(offer.offerCode)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                        copiedCode === offer.offerCode
                          ? 'bg-green-100 text-green-700'
                          : 'bg-primary-100 text-primary-600 hover:bg-primary-200'
                      }`}
                    >
                      {copiedCode === offer.offerCode ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Validity */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Clock size={16} className="text-orange-500" />
                  <span>{getDaysRemaining(offer.validUntil)} days remaining</span>
                </div>

                {/* CTA Button */}
                <button className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                  Shop Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
