'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { getCurrencyForLanguage } from '@/lib/paymentLinkHelper';
import { addCartItem, CartCurrency } from '@/lib/cart';
import { workshopDetails } from '@/lib/workshopsData';

export const dynamic = 'force-dynamic';

interface PaymentInfo {
  workshop: string;
  mode: string;
  language: string;
  currency: string;
}

function PaymentConfirmationInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [userInfo, setUserInfo] = useState({
    email: '',
    name: '',
    redirect: '/',
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    workshop: 'swar-yoga-basic',
    mode: 'online',
    language: 'hindi',
    currency: 'INR',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    // Get user info from URL params
    const email = searchParams.get('email') || '';
    const name = searchParams.get('name') || '';
    const redirect = searchParams.get('redirect') || '/';

    setUserInfo({ email, name, redirect });

    // Get workshop payment info from URL params
    const workshop = searchParams.get('workshop') || 'swar-yoga-basic';
    const mode = searchParams.get('mode') || 'online';
    const language = searchParams.get('language') || 'hindi';
    const currency = searchParams.get('currency') || getCurrencyForLanguage(language);

    // Get payment link
    setPaymentInfo({
      workshop,
      mode,
      language,
      currency,
    });
  }, [searchParams]);

  const handleContinueLater = () => {
    router.push(userInfo.redirect);
  };

  // Format workshop name
  const workshopDisplayName = paymentInfo.workshop
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const modeDisplayName = paymentInfo.mode.charAt(0).toUpperCase() + paymentInfo.mode.slice(1);
  const languageDisplayName = paymentInfo.language.charAt(0).toUpperCase() + paymentInfo.language.slice(1);

  const getBasePriceForWorkshop = (slug: string) => {
    const details = workshopDetails[slug];
    if (!details?.price) return 0;
    return Number(details.price.replace(/[^0-9.]/g, '')) || 0;
  };

  const convertPriceForCurrency = (priceInInr: number, currency: CartCurrency) => {
    if (currency === 'USD') return Math.round(priceInInr * 0.012);
    if (currency === 'NPR') return Math.round(priceInInr * 1.6);
    return priceInInr;
  };

  const normalizeCurrency = (currency: string): CartCurrency => {
    if (currency === 'USD') return 'USD';
    if (currency === 'NPR') return 'NPR';
    return 'INR';
  };

  const handleAddWorkshopToCart = () => {
    const basePrice = getBasePriceForWorkshop(paymentInfo.workshop);
    if (!basePrice) {
      alert('Price information is unavailable for this workshop. Please try from the workshops page.');
      return;
    }

    setIsAdding(true);
    const cartCurrency = normalizeCurrency(paymentInfo.currency);
    const convertedPrice = convertPriceForCurrency(basePrice, cartCurrency);

    addCartItem({
      id: `${paymentInfo.workshop}-${paymentInfo.mode}-${paymentInfo.language}-${cartCurrency}`,
      name: `${workshopDisplayName} (${modeDisplayName} • ${languageDisplayName})`,
      price: convertedPrice,
      quantity: 1,
      currency: cartCurrency,
      workshop: paymentInfo.workshop,
      mode: paymentInfo.mode,
      language: paymentInfo.language,
    });

    setAddedToCart(true);
    setIsAdding(false);
    setTimeout(() => router.push('/cart'), 600);
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-yoga-50 to-yoga-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-2xl p-8 sm:p-12">
            {/* Success Icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-swar-primary-light mb-4">
                <svg
                  className="h-10 w-10 text-swar-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-swar-text mb-2">
                Welcome to Swar Yoga! 🎉
              </h1>
              <p className="text-swar-text-secondary text-lg">
                Your account has been successfully created
              </p>
            </div>

            {/* User Info */}
            <div className="bg-yoga-50 rounded-lg p-6 mb-8 border border-yoga-200">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-swar-text-secondary">Account Created For</p>
                  <p className="text-lg font-semibold text-swar-text">{userInfo.name}</p>
                </div>
                <div>
                  <p className="text-sm text-swar-text-secondary">Email Address</p>
                  <p className="text-lg font-semibold text-swar-text">{userInfo.email}</p>
                </div>
                <div className="pt-3 border-t border-yoga-300">
                  <p className="text-sm text-swar-text-secondary">Workshop Details</p>
                  <p className="text-lg font-semibold text-swar-text">
                    {workshopDisplayName} - {modeDisplayName}
                  </p>
                  <p className="text-sm text-swar-text-secondary">
                    Language: {languageDisplayName} | Currency: {paymentInfo.currency}
                  </p>
                </div>
              </div>
            </div>

            {/* Cart Section */}
            <div className="border-t border-b border-swar-border py-8 mb-8">
              <h2 className="text-2xl font-bold text-swar-text mb-4">Next Step: Add Your Workshop to Cart</h2>
              <p className="text-swar-text-secondary mb-6">
                Add your preferred workshop to the cart and finish checkout when you’re ready. You can manage quantities, choose your preferred currency, and complete secure payment from the cart page.
              </p>

              {/* Add to Cart Button */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                <button
                  type="button"
                  onClick={handleAddWorkshopToCart}
                  disabled={isAdding || addedToCart}
                  className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                    addedToCart
                      ? 'bg-swar-primary'
                      : 'bg-swar-primary hover:bg-swar-primary-hover'
                  }`}
                >
                  {addedToCart ? 'Added! Redirecting to Cart…' : isAdding ? 'Adding...' : '🛒 Add to Cart'}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/cart')}
                  className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold border border-yoga-600 text-swar-accent hover:bg-yoga-50 transition"
                >
                  Go to Cart
                </button>
              </div>

              <p className="text-sm text-swar-text-secondary text-center mt-4">
                Use the cart to review your selections and proceed with secure checkout.
              </p>
            </div>

            {/* Alternative Actions */}
            <div className="space-y-4">
              <button
                onClick={handleContinueLater}
                className="w-full bg-swar-primary-light text-swar-text py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-all"
              >
                Continue Later
              </button>

              <p className="text-xs text-swar-text-secondary text-center">
                You can access payment anytime from your account dashboard
              </p>
            </div>

            {/* FAQ Section */}
            <div className="mt-8 pt-8 border-t border-swar-border">
              <h3 className="text-lg font-semibold text-swar-text mb-4">Frequently Asked Questions</h3>
              <div className="space-y-4 text-sm text-swar-text-secondary">
                <div>
                  <p className="font-semibold text-swar-text mb-1">Is my payment secure?</p>
                  <p>Yes, we use PayU, a trusted and secure payment gateway. Your payment information is encrypted and protected.</p>
                </div>
                <div>
                  <p className="font-semibold text-swar-text mb-1">What happens after payment?</p>
                  <p>You'll receive a confirmation email immediately. Your account will be fully activated with access to all workshops.</p>
                </div>
                <div>
                  <p className="font-semibold text-swar-text mb-1">Can I pay later?</p>
                  <p>Yes, you can skip this for now and come back anytime to complete the payment from your profile.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaymentConfirmation() {
  return (
    <Suspense fallback={null}>
      <PaymentConfirmationInner />
    </Suspense>
  );
}
