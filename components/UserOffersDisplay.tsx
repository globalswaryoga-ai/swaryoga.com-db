'use client';

import React, { useEffect, useState } from 'react';
import { Gift, Clock, Check, ArrowRight } from 'lucide-react';

interface Offer {
  _id: string;
  title: string;
  description: string;
  discountPercentage: number;
  offerCode: string;
  validUntil: string;
  isActive: boolean;
}

export default function UserOffersDisplay() {
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
    return Math.max(0, days);
  };

  if (loading) {
    return <div className="text-center py-8">Loading offers...</div>;
  }

  if (offers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Gift size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-swar-text-secondary text-lg">No active offers at the moment</p>
        <p className="text-swar-text-secondary text-sm mt-2">Check back soon for exclusive deals</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {offers.map((offer) => {
        const daysRemaining = getDaysRemaining(offer.validUntil);
        const isExpiringSoon = daysRemaining <= 3;

        return (
          <div
            key={offer._id}
            className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-coral-rose-500"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-xl font-bold text-swar-text">{offer.title}</h4>
                  {isExpiringSoon && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-semibold animate-pulse">
                      Expires Soon!
                    </span>
                  )}
                </div>
                <p className="text-swar-text-secondary text-sm">{offer.description}</p>
              </div>

              <div className="text-right ml-4">
                <div className="text-4xl font-bold text-coral-rose-500">{offer.discountPercentage}%</div>
                <p className="text-xs text-swar-text-secondary uppercase tracking-wider">Off</p>
              </div>
            </div>

            {/* Offer Code and Copy */}
            <div className="bg-swar-bg rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-swar-text-secondary uppercase tracking-wider mb-1">Promo Code</p>
                  <code className="text-lg font-mono font-bold text-primary-600">{offer.offerCode}</code>
                </div>
                <button
                  onClick={() => copyToClipboard(offer.offerCode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                    copiedCode === offer.offerCode
                      ? 'bg-swar-primary-light text-swar-primary'
                      : 'bg-primary-100 text-primary-600 hover:bg-primary-200 active:scale-95'
                  }`}
                >
                  {copiedCode === offer.offerCode ? (
                    <>
                      <Check size={16} />
                      Copied!
                    </>
                  ) : (
                    <>Copy Code</>
                  )}
                </button>
              </div>
            </div>

            {/* Validity Info */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-swar-text-secondary">
                <Clock size={16} className="text-orange-500" />
                <span>
                  {daysRemaining === 0 ? (
                    <span className="font-semibold text-red-600">Expires Today!</span>
                  ) : (
                    <span>
                      {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
                    </span>
                  )}
                </span>
              </div>

              <button className="text-primary-600 hover:text-primary-700 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
                Learn More <ArrowRight size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
