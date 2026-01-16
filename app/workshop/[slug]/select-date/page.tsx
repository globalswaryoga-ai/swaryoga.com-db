'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { workshopCatalog } from '@/lib/workshopsData';
import { useCart } from '@/lib/context/CartContext';

export default function SelectDatePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { addToCart } = useCart();

  const workshop = workshopCatalog.find((w) => w.slug === slug);

  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('Hindi');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Filter batches by selected language
  const filteredBatches = workshop?.batches?.filter(
    (batch) => batch.language.toLowerCase() === selectedLanguage.toLowerCase()
  ) || [];

  if (!workshop) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-16">
            <p className="text-center text-red-600">Workshop not found</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const handleContinue = async () => {
    if (!selectedBatch) {
      setError('Please select a date to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      // Find the selected batch details
      const selectedBatchData = workshop?.batches?.find((b) => b.id === selectedBatch);
      if (!selectedBatchData) {
        setError('Selected batch not found');
        return;
      }

      // Add to cart with batch details
      addToCart({
        id: slug,
        name: workshop?.name || '',
        price: selectedBatchData.price,
        quantity: 1,
        mode: selectedBatchData.mode,
        language: selectedBatchData.language,
        workshopSlug: slug,
      });

      // Go to cart
      router.push('/cart');
    } catch (err) {
      setError('Failed to proceed. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-yoga-600 hover:text-yoga-700 font-semibold mb-6"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-yoga-600 to-yoga-700 text-white p-8">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Select Batch & Date</h1>
                <p className="text-lg text-white/90">{workshop.name}</p>
              </div>

              {/* Content */}
              <div className="p-8 sm:p-12">
                {error && (
                  <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">{error}</p>
                    </div>
                  </div>
                )}

                {/* Batch Selection */}
                <div className="mb-8">
                  {/* Language Selector */}
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Select Language</h3>
                    <div className="flex gap-3">
                      {['Hindi', 'English'].map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setSelectedLanguage(lang);
                            setSelectedBatch(null);
                            setError('');
                          }}
                          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                            selectedLanguage === lang
                              ? 'bg-yoga-600 text-white'
                              : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <h2 className="text-xl font-bold text-gray-900 mb-6">Available Dates</h2>

                  {filteredBatches && filteredBatches.length > 0 ? (
                    <div className="space-y-3">
                      {filteredBatches.map((batch) => (
                        <button
                          key={batch.id}
                          onClick={() => {
                            setSelectedBatch(batch.id);
                            setError('');
                          }}
                          className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                            selectedBatch === batch.id
                              ? 'border-yoga-600 bg-yoga-50'
                              : 'border-gray-300 hover:border-yoga-600 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedBatch === batch.id
                                ? 'border-yoga-600 bg-yoga-600'
                                : 'border-gray-300'
                            }`}>
                              {selectedBatch === batch.id && (
                                <CheckCircle className="w-5 h-5 text-white" fill="currentColor" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-yoga-600" />
                                <span className="font-semibold text-gray-900">
                                  {new Date(batch.startDate).toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                <span className="inline-block mr-3">Mode: {batch.mode}</span>
                                <span className="inline-block">Language: {batch.language}</span>
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                Price: ₹{batch.price.toLocaleString('en-IN')} {batch.currency}
                              </p>
                              <span className={`inline-block mt-2 text-xs font-semibold px-3 py-1 rounded ${
                                batch.status === 'open'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {batch.status === 'open' ? 'Seats Available' : 'Closed'}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 bg-gray-50 rounded-lg text-center">
                      <p className="text-gray-600">No batches available at the moment</p>
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleContinue}
                  disabled={isSubmitting || !selectedBatch}
                  className={`w-full py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
                    isSubmitting || !selectedBatch
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 active:scale-95'
                  }`}
                >
                  {isSubmitting ? 'Processing...' : 'Continue to Checkout'}
                </button>

                {/* Info Text */}
                <p className="text-xs text-gray-600 text-center mt-6">
                  You can change your batch selection at any time before checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
