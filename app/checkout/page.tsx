'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { CartItem, getStoredCart } from '@/lib/cart';
import { getCurrencySymbol, roundMoney } from '@/lib/paymentMath';
import NepalQRModal from '@/components/NepalQRModal';

export const dynamic = 'force-dynamic';

type PaymentCountry = 'india' | 'international' | 'nepal';

type CashfreeInitResponse = {
  success: boolean;
  method: 'cashfree';
  orderId: string;
  cashfreeOrderId: string;
  paymentSessionId: string;
  env: 'sandbox' | 'production';
  sdkUrl: string;
};

interface OrderData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const processingRef = useRef(false);
  const [showNepalQR, setShowNepalQR] = useState(false);
  const [error, setError] = useState('');

  const cashfreeSdkPromiseRef = useRef<Promise<void> | null>(null);

  const [formData, setFormData] = useState<OrderData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
  });

  // Check authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      router.replace(`/signin?redirect=${encodeURIComponent('/checkout')}`);
      return;
    }

    // Load cart and user data
    const items = getStoredCart();
    setCartItems(items);

    try {
      const userData = JSON.parse(user);
      setFormData((prev) => ({
        ...prev,
        firstName: userData.name?.split(' ')[0] || '',
        lastName: userData.name?.split(' ').slice(1).join(' ') || '',
        email: userData.email || '',
        phone: userData.phone || '',
        city: userData.city || '',
      }));
    } catch (err) {
      console.error('Error loading user data:', err);
    }

    setIsLoading(false);
  }, [router]);

  // Calculate pricing
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const PLATFORM_FEE_PERCENT = 0.033; // 3.3%
  const charges = roundMoney(subtotal * PLATFORM_FEE_PERCENT);
  const total = roundMoney(subtotal + charges);
  const currency = cartItems[0]?.currency || 'INR';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    const requiredFields = ['firstName', 'email', 'phone', 'city'];
    const missingFields = requiredFields.filter((field) => !formData[field as keyof OrderData]?.trim());

    if (missingFields.length > 0) {
      setError(`Please fill in: ${missingFields.join(', ')}`);
      return false;
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return false;
    }

    return true;
  };

  const handlePayment = async (country: PaymentCountry) => {
    // Prevent double-clicks / event bubbling from triggering multiple initiations.
    if (processingRef.current || isProcessing) return;


    if (!validateForm()) return;

    setError('');
    processingRef.current = true;
    setIsProcessing(true);

    try {
      // For Nepal, show QR modal instead of processing payment
      if (country === 'nepal') {
        setShowNepalQR(true);
        setIsProcessing(false);
        processingRef.current = false;
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      // Calculate subtotal (without charges for API)
      const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      // Prepare order data
      const orderData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        amount: subtotal, // Send subtotal, API will add 3.3%
        currency: country === 'india' ? 'INR' : 'USD',
        country,
        productInfo: `Swar Yoga Purchase - ${cartItems.length} item(s)`,
        items: cartItems.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          currency: item.currency,
        })),
      };

      // Call payment initiation API (Cashfree)
      const response = await fetch('/api/payments/cashfree/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = (await response.json()) as Partial<CashfreeInitResponse> & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      // Store order ID
      if (!data.orderId || !data.paymentSessionId) {
        throw new Error('Cashfree payment session not available');
      }
      localStorage.setItem('orderId', data.orderId);

      const sdkUrl = data.sdkUrl || 'https://sdk.cashfree.com/js/v3/cashfree.js';

      // Load Cashfree JS SDK once
      if (!cashfreeSdkPromiseRef.current) {
        cashfreeSdkPromiseRef.current = new Promise<void>((resolve, reject) => {
          if (typeof window !== 'undefined' && window.Cashfree) {
            resolve();
            return;
          }

          const existing = document.querySelector(`script[src="${sdkUrl}"]`);
          if (existing) {
            existing.addEventListener('load', () => resolve());
            existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree SDK')));
            return;
          }

          const script = document.createElement('script');
          script.src = sdkUrl;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
          document.body.appendChild(script);
        });
      }

      await cashfreeSdkPromiseRef.current;

      if (!window.Cashfree) {
        throw new Error('Cashfree SDK not available');
      }

      const cashfree = window.Cashfree({ mode: data.env === 'production' ? 'production' : 'sandbox' });
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment processing failed';
      setError(message);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };

  if (isLoading) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20 pb-20 bg-swar-bg flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-swar-primary border-t-transparent"></div>
        </main>
        <Footer />
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20 pb-20 bg-swar-bg">
          <div className="max-w-2xl mx-auto px-4 py-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover mb-6"
            >
              <ArrowLeft size={20} />
              Back to Cart
            </button>

            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <p className="text-swar-text-secondary text-lg mb-4">Your cart is empty</p>
              <button
                onClick={() => router.push('/workshop')}
                className="bg-swar-primary text-white px-6 py-2 rounded-lg hover:bg-swar-primary-hover transition-colors"
              >
                Browse Workshops
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 pb-20 bg-swar-bg">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover mb-6 font-semibold"
          >
            <ArrowLeft size={20} />
            Back to Cart
          </button>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
            <h2 className="text-2xl font-bold text-swar-text mb-6">Order Summary</h2>

            {/* Cart Items */}
            <div className="space-y-4 mb-6 pb-6 border-b border-swar-border">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-swar-text">{item.name}</p>
                    <p className="text-sm text-swar-text-secondary">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-swar-text">
                      {getCurrencySymbol(item.currency)}
                      {roundMoney(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing Summary */}
            <div className="space-y-2 mb-6 pb-6 border-b border-swar-border">
              <div className="flex justify-between text-swar-text">
                <span>Subtotal:</span>
                <span className="font-semibold">
                  {getCurrencySymbol(currency)}
                  {roundMoney(subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-swar-text-secondary text-sm">
                <span>Processing charges (3.3%):</span>
                <span>
                  {getCurrencySymbol(currency)}
                  {charges}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-lg font-bold text-swar-text">Total Amount:</span>
              <span className="text-2xl font-bold text-swar-primary">
                {getCurrencySymbol(currency)}
                {total}
              </span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Billing Information */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 mb-8">
            <h3 className="text-xl font-bold text-swar-text mb-6">Billing Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  placeholder="Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-swar-text mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  placeholder="+91 9999999999"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-swar-text mb-2">City *</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  placeholder="Mumbai"
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <h3 className="text-xl font-bold text-swar-text">Payment Method</h3>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold whitespace-nowrap">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Cashfree Connected
              </div>
            </div>

            {/* Payment Options */}
            <div className="space-y-4 mb-8">
              {/* India Payment */}
              <div className="border-2 border-swar-border rounded-lg p-4">
                <h3 className="text-sm font-bold text-swar-text mb-3">🇮🇳 India Payment</h3>
                <button
                  type="button"
                  onClick={() => handlePayment('india')}
                  disabled={isProcessing}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-center font-semibold ${
                    isProcessing
                      ? 'opacity-50 cursor-not-allowed border-gray-200'
                      : 'border-sky-300 hover:border-sky-500 hover:bg-sky-50'
                  }`}
                >
                  <p className="text-sm mb-2">💳 Cashfree</p>
                  <p className="text-xs text-swar-text-secondary">UPI / Cards / NetBanking</p>
                </button>
              </div>

              {/* International Payment */}
              <button
                type="button"
                onClick={() => handlePayment('international')}
                disabled={isProcessing}
                className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-swar-primary'
                } border-swar-border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-swar-text mb-1">🌍 International</h4>
                    <p className="text-xs text-swar-text-secondary">Cashfree Checkout</p>
                  </div>
                  <div
                    className={`bg-swar-primary text-white px-6 py-2 rounded font-semibold transition-colors ${
                      isProcessing ? 'opacity-50' : 'hover:bg-swar-primary-hover'
                    }`}
                  >
                    {isProcessing ? 'Processing...' : 'Pay Now'}
                  </div>
                </div>
              </button>

              {/* Nepal QR */}
              <button
                type="button"
                onClick={() => {
                  setShowNepalQR(true);
                  setIsProcessing(false);
                }}
                disabled={isProcessing}
                className={`w-full p-6 rounded-lg border-2 transition-all text-left ${
                  isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:border-swar-primary'
                } border-swar-border`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-swar-text mb-1">🇳🇵 Nepal</h4>
                    <p className="text-xs text-swar-text-secondary">QR Code Payment</p>
                  </div>
                  <div className="bg-swar-primary text-white px-6 py-2 rounded font-semibold">
                    Show QR
                  </div>
                </div>
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Terms */}
            <div className="bg-swar-bg rounded-lg p-4 text-sm text-swar-text-secondary">
              <p>By proceeding with payment, you agree to our terms and conditions. Your payment is secured and encrypted.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Nepal QR Modal */}
      {showNepalQR && <NepalQRModal onClose={() => setShowNepalQR(false)} amount={total} currency={currency} />}
    </>
  );
}
