'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft, MessageCircle, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CartItem, getStoredCart } from '@/lib/cart';
import { ChargeMethod, convertAmount, getChargeRate, getCurrencySymbol, roundMoney } from '@/lib/paymentMath';

export const dynamic = 'force-dynamic';

function CheckoutInner() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchParams = useSearchParams();
  const supportedCurrencies = ['INR', 'USD', 'NPR'] as const;
  const normalizedQueryCurrency = (searchParams.get('currency') || '').toUpperCase();
  const isSupportedQueryCurrency = supportedCurrencies.includes(normalizedQueryCurrency as typeof supportedCurrencies[number]);
  const [selectedCurrency, setSelectedCurrency] = useState<CartItem['currency']>(
    isSupportedQueryCurrency ? (normalizedQueryCurrency as CartItem['currency']) : 'INR'
  );
  const normalizedQueryMethod = (searchParams.get('method') || '').toLowerCase();
  const initialChargeMethod: ChargeMethod =
    normalizedQueryMethod === 'credit_card'
      ? 'credit_card'
      : normalizedQueryMethod === 'international'
        ? 'international'
        : normalizedQueryMethod === 'nepal_qr'
          ? 'nepal_qr'
          : 'indian';

  const [chargeMethod, setChargeMethod] = useState<ChargeMethod>(initialChargeMethod);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [nepalQrOpen, setNepalQrOpen] = useState(false);

  useEffect(() => {
    const items = getStoredCart();
    setCartItems(items);
    setIsCartLoaded(true);
  }, []);

  // Requirement: without signup/signin no payment should be done.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/signin?redirect=${encodeURIComponent(returnTo)}`);
    }
  }, [router]);

  // Keep charge method in sync with currency selection.
  useEffect(() => {
    if (selectedCurrency === 'USD') {
      setChargeMethod('international');
      return;
    }
    if (selectedCurrency === 'NPR') {
      setChargeMethod('nepal_qr');
      return;
    }
    // INR: default to Indian gateway charges unless user explicitly picked credit card.
    setChargeMethod((prev) => (prev === 'credit_card' ? 'credit_card' : 'indian'));
  }, [selectedCurrency]);

  const summaryItems = cartItems;
  const summaryQuantity = summaryItems.reduce((sum, item) => sum + item.quantity, 0);
  const summarySubtotal = roundMoney(
    summaryItems.reduce((sum, item) => {
      const line = item.price * item.quantity;
      return sum + convertAmount(line, item.currency as any, selectedCurrency as any);
    }, 0)
  );
  const chargeRate = getChargeRate(chargeMethod);
  const summaryCharges = roundMoney(summarySubtotal * chargeRate);
  const summaryTotal = roundMoney(summarySubtotal + summaryCharges);
  const hasItemsForSelectedCurrency = summaryItems.length > 0;
  const showEmptyCartNotice = isCartLoaded && cartItems.length === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Auth gate
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (!token || !userRaw) {
        const returnTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : '/checkout';
        router.push(`/signin?redirect=${encodeURIComponent(returnTo)}`);
        setLoading(false);
        return;
      }

      // Validate all required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone ||
          !formData.address || !formData.city || !formData.state || !formData.zip) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (!hasItemsForSelectedCurrency) {
        setError('Your cart is empty.');
        setLoading(false);
        return;
      }

      // Handle different payment methods
      if (selectedCurrency === 'NPR') {
        // Nepal QR flow: show modal with QR + WhatsApp instructions.
        const qrUrl = process.env.NEXT_PUBLIC_NEPALI_QR_URL;
        if (!qrUrl) {
          setError('Nepal QR payment is not configured. Please use India or International payment.');
          setLoading(false);
          return;
        }
        setNepalQrOpen(true);
        setLoading(false);
        return;
      }

      const amount = Number(summaryTotal.toFixed(2));
      const productInfo = summaryItems
        .map((item) => `${item.name} x${item.quantity}`)
        .join(', ')
        .slice(0, 90) || 'Swar Yoga Workshops';

      const lineItems = summaryItems.map((item) => ({
        productId: item.id,
        name: item.name,
        price: roundMoney(convertAmount(item.price, item.currency as any, selectedCurrency as any)),
        quantity: item.quantity,
        kind: item.workshop ? 'workshop' : 'product',
        workshopSlug: item.workshop,
        scheduleId: item.scheduleId,
        mode: item.mode,
        language: item.language,
        currency: selectedCurrency,
      }));

      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL || '');
      const callbackUrl = `${origin}/api/payments/payu/callback`;

      // Call PayU initiation endpoint for INR and USD
      const response = await fetch('/api/payments/payu/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount,
          currency: selectedCurrency,
          productInfo: productInfo,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          items: lineItems,
          successUrl: callbackUrl,
          failureUrl: callbackUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message = data?.error || data?.details || 'Failed to initiate payment';
        console.error('PayU initiation error:', { status: response.status, data });
        throw new Error(message);
      }

      const data = await response.json();
      
      if (!data.success || !data.paymentUrl || !data.params) {
        console.error('Invalid PayU response:', data);
        throw new Error(data.error || 'Invalid payment gateway response');
      }

      const { paymentUrl, params } = data;

      if (!paymentUrl || !params) {
        throw new Error('Invalid PayU initiation response');
      }

      // Create hidden form for PayU submission
      const existingForm = document.getElementById('payu-form');
      if (existingForm) {
        existingForm.remove();
      }

      const form = document.createElement('form');
      form.id = 'payu-form';
      form.method = 'POST';
      form.action = paymentUrl;
      form.style.display = 'none';

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      setLoading(false);
    } catch (err) {
      console.error('Error processing payment:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;

      const parsed = JSON.parse(storedUser);
      const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
      const nameParts = name ? name.split(/\s+/) : [];
      const [firstName = '', ...rest] = nameParts;
      const lastName = rest.join(' ');

      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || firstName,
        lastName: prev.lastName || lastName,
        email: prev.email || parsed.email || '',
        phone: prev.phone || parsed.phone || '',
      }));
    } catch (error) {
      console.error('Failed to load stored user for checkout autofill:', error);
    }
  }, []);

  const nepalQrUrl = process.env.NEXT_PUBLIC_NEPALI_QR_URL || '';
  const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  const whatsappPrefill = (() => {
    const itemText = summaryItems
      .map((item) => `${item.name} x${item.quantity}`)
      .join(', ')
      .slice(0, 120);
    const amountText = `${getCurrencySymbol(selectedCurrency)}${summaryTotal.toFixed(2)} ${selectedCurrency}`;
    return `Hi Swar Yoga, I completed the Nepal QR payment (${amountText}) for: ${itemText}. Sharing the screenshot for confirmation.`;
  })();
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappPrefill)}`
    : '';

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20">
        <div className="container py-20">
          <button
            onClick={() => router.back()}
            className="mb-6 flex items-center gap-2 text-yoga-600 hover:text-yoga-700 font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          {showEmptyCartNotice && (
            <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800">
              Your cart is empty. Visit the <a href="/workshop" className="underline font-semibold">workshops page</a> to add a program before proceeding to PayU.
            </div>
          )}
          <h1 className="text-5xl font-bold mb-12 text-yoga-700">Checkout</h1>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
                {/* Shipping Information */}
                <div className="bg-white rounded-lg shadow-md p-8">
                  <h2 className="text-2xl font-bold mb-6 text-yoga-700">Shipping Information</h2>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-gray-700 font-bold mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="John"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="Doe"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-2">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-2">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="(555) 000-0000"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-gray-700 font-bold mb-2">Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="123 Main St"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="New York"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-2">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="NY"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-2">ZIP Code</label>
                      <input
                        type="text"
                        name="zip"
                        value={formData.zip}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600"
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Information - Currency & Method */}
                <div className="bg-white rounded-lg shadow-md p-8">
                  <h2 className="text-2xl font-bold mb-4 text-yoga-700">Payment Method</h2>
                  {cartItems.length === 0 ? (
                    <p className="text-gray-600">
                      Add a workshop to your cart to enable PayU checkout.
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-3">
                        Choose where you are paying from. International payments convert the India amount into USD.
                      </p>

                      <div className="flex flex-wrap gap-3 mb-4">
                        {(['INR', 'NPR', 'USD'] as Array<CartItem['currency']>).map((code) => {
                          const isActive = code === selectedCurrency;
                          const label = code === 'INR' ? 'India' : code === 'NPR' ? 'Nepal' : 'International';
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setSelectedCurrency(code)}
                              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                                isActive
                                  ? 'bg-yoga-600 text-white border-yoga-600 shadow-md'
                                  : 'bg-white text-yoga-700 border-yoga-200 hover:border-yoga-400'
                              }`}
                            >
                              {label}
                              <span className="ml-2 text-xs font-normal">({code})</span>
                            </button>
                          );
                        })}
                      </div>

                      {selectedCurrency === 'INR' ? (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <p className="text-sm font-semibold text-gray-800 mb-2">Select payment option</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setChargeMethod('indian')}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                                chargeMethod === 'indian'
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              Indian (2.5%)
                            </button>
                            <button
                              type="button"
                              onClick={() => setChargeMethod('credit_card')}
                              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                                chargeMethod === 'credit_card'
                                  ? 'border-green-600 bg-green-600 text-white'
                                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              Credit Card (5%)
                            </button>
                          </div>
                          <p className="mt-2 text-xs text-gray-600">
                            Tax is removed. Only gateway charges are added.
                          </p>
                        </div>
                      ) : selectedCurrency === 'USD' ? (
                        <p className="text-sm text-gray-600">
                          International payments include <span className="font-semibold">8%</span> charges (USD/PayPal).
                        </p>
                      ) : (
                        <p className="text-sm text-gray-600">
                          Nepal payments use QR. Scan & pay in Nepali, then send screenshot on WhatsApp.
                        </p>
                      )}
                    </>
                  )}

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6">
                      {error}
                    </div>
                  )}
                </div>

                {/* Hidden on desktop, visible on mobile */}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || !hasItemsForSelectedCurrency}
                  className={`md:hidden w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-4 rounded-lg font-bold text-lg transition ${
                    loading || !hasItemsForSelectedCurrency ? 'opacity-50 cursor-not-allowed' : 'hover:from-green-700 hover:to-green-800'
                  }`}
                >
                  {loading
                    ? 'Processing...'
                    : hasItemsForSelectedCurrency
                      ? `💳 Pay Now`
                      : 'Select a currency with items'}
                </button>
              </form>
            </div>

            {/* Order Summary - Dark Green Sidebar */}
            <div className="md:col-span-1">
              <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-lg p-8 sticky top-24 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-white">Order Summary</h2>
                
                {/* Next 6 Months Dates Section */}
                <div className="mb-6 pb-6 border-b border-green-700">
                  <p className="text-xs font-semibold text-green-200 uppercase tracking-wide mb-3">Available Dates</p>
                  <div className="space-y-2">
                    {(() => {
                      const today = new Date();
                      const dates = [];
                      for (let i = 0; i < 6; i++) {
                        const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
                        dates.push(date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
                      }
                      return dates.map((date, idx) => (
                        <div key={idx} className="flex items-center text-sm text-green-100">
                          <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                          {date}
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                <div className="space-y-4 mb-6 border-b border-green-700 pb-6">
                  {hasItemsForSelectedCurrency ? (
                    summaryItems.map((item) => (
                      <div key={`${item.id}-${item.currency}`} className="flex justify-between">
                        <div>
                          <p className="text-white font-semibold text-sm">{item.name}</p>
                          <p className="text-xs text-green-200">Qty {item.quantity}</p>
                        </div>
                        <span className="font-semibold text-green-100">
                          {getCurrencySymbol(selectedCurrency)}
                          {roundMoney(convertAmount(item.price * item.quantity, item.currency as any, selectedCurrency as any)).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-green-200">
                      No items available for {selectedCurrency}. Switch currency above or return to the cart.
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-8 border-b border-green-700 pb-6">
                  <div className="flex justify-between text-green-100">
                    <span>Subtotal</span>
                    <span>{getCurrencySymbol(selectedCurrency)}{summarySubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-green-100">
                    <span>Charges ({Math.round(chargeRate * 1000) / 10}%)</span>
                    <span>{getCurrencySymbol(selectedCurrency)}{summaryCharges.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between mb-4">
                    <span className="text-lg font-bold text-white">
                      Total{summaryQuantity ? ` (${summaryQuantity} item${summaryQuantity === 1 ? '' : 's'})` : ''}
                    </span>
                    <span className="text-3xl font-bold text-green-300">{getCurrencySymbol(selectedCurrency)}{summaryTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Pay Now Button */}
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={loading || !hasItemsForSelectedCurrency}
                  className={`w-full bg-green-500 hover:bg-green-400 text-white font-bold text-lg py-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg ${
                    loading || !hasItemsForSelectedCurrency ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''
                  }`}
                >
                  {loading
                    ? 'Processing...'
                    : hasItemsForSelectedCurrency
                      ? `💳 Pay Now ${getCurrencySymbol(selectedCurrency)}${summaryTotal.toFixed(2)}`
                      : 'Select a currency with items'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {nepalQrOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
                <div>
                  <p className="text-lg font-extrabold text-gray-900">Nepal QR Payment</p>
                  <p className="text-xs text-gray-600">Scan & pay in Nepali rupees</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNepalQrOpen(false)}
                  className="rounded-lg p-2 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-700" />
                </button>
              </div>

              <div className="p-5">
                {nepalQrUrl ? (
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-center">
                    <img
                      src={nepalQrUrl}
                      alt="Nepal QR code for payment"
                      className="w-64 h-64 object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 font-semibold">
                    Nepal QR is not configured. Please select India or International payment.
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-bold text-amber-900">Note:-</p>
                  <p className="mt-1 text-sm text-amber-900">
                    Scan this QR and do the payment in Nepali. After payment, send the screenshot on WhatsApp.
                  </p>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  {whatsappLink ? (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-white font-bold hover:bg-green-700 transition"
                    >
                      <MessageCircle className="h-5 w-5" />
                      WhatsApp Screenshot
                    </a>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm text-gray-700">
                      WhatsApp number not configured.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setNepalQrOpen(false)}
                    className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 font-bold text-gray-800 hover:bg-gray-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function Checkout() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
