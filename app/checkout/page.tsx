'use client';

import { useState, useEffect } from 'react';
import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { CartItem, getStoredCart } from '@/lib/cart';

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
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);

  useEffect(() => {
    const items = getStoredCart();
    setCartItems(items);
    setIsCartLoaded(true);
    if (items.length && !items.some((item) => item.currency === selectedCurrency)) {
      setSelectedCurrency(items[0].currency);
    }
  }, []);

  useEffect(() => {
    if (!cartItems.length || !isSupportedQueryCurrency) return;
    if (cartItems.some((item) => item.currency === normalizedQueryCurrency) && selectedCurrency !== normalizedQueryCurrency) {
      setSelectedCurrency(normalizedQueryCurrency as CartItem['currency']);
    }
  }, [cartItems, normalizedQueryCurrency, isSupportedQueryCurrency, selectedCurrency]);

  const summaryItems = cartItems.filter((item) => item.currency === selectedCurrency);
  const summarySubtotal = summaryItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const summaryTax = Number((summarySubtotal * 0.08).toFixed(2));
  const summaryTotal = Number((summarySubtotal + summaryTax).toFixed(2));
  const summaryQuantity = summaryItems.reduce((sum, item) => sum + item.quantity, 0);
  const availableCurrencies = Array.from(new Set(cartItems.map((item) => item.currency)));
  const currencyOverview = availableCurrencies.map((code) => {
    const items = cartItems.filter((item) => item.currency === code);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return { code, total, quantity };
  });
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
      // Validate all required fields
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone ||
          !formData.address || !formData.city || !formData.state || !formData.zip) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      if (!hasItemsForSelectedCurrency) {
        setError('Your cart does not have any items for this currency.');
        setLoading(false);
        return;
      }

      // Handle Nepal Rs - Show QR code and WhatsApp instruction
      if (selectedCurrency === 'NPR') {
        alert('Thank you for your order!\n\nPlease scan the QR code displayed and send a screenshot of your payment to our WhatsApp:\n\n+91 9779006820\n\nWe will update you shortly.');
        // In a real scenario, you might show a modal with QR code instead of alert
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
        price: item.price,
        quantity: item.quantity,
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

  const getCurrencySymbol = (curr: string) => {
    switch(curr) {
      case 'INR': return '₹';
      case 'USD': return '$';
      case 'NPR': return 'Rs';
      default: return '₹';
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
              Your cart is empty. Visit the <a href="/workshops" className="underline font-semibold">workshops page</a> to add a program before proceeding to PayU.
            </div>
          )}
          <h1 className="text-5xl font-bold mb-12 text-yoga-700">Checkout</h1>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-8">
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
                      Add a workshop to your cart to enable checkout.
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-600 mb-4">
                        Select your payment currency:
                      </p>
                      <div className="flex flex-wrap gap-3 mb-6">
                        {['INR', 'USD', 'NPR'].map((code) => {
                          const isActive = code === selectedCurrency;
                          return (
                            <button
                              key={code}
                              type="button"
                              onClick={() => setSelectedCurrency(code as CartItem['currency'])}
                              className={`rounded-full border px-6 py-3 text-sm font-bold transition ${
                                isActive
                                  ? 'bg-yoga-600 text-white border-yoga-600 shadow-md scale-105'
                                  : 'bg-white text-yoga-700 border-yoga-300 hover:border-yoga-600 hover:scale-105'
                              }`}
                            >
                              {code === 'INR' && '₹ INR'}
                              {code === 'USD' && '$ USD'}
                              {code === 'NPR' && 'Rs Nepal'}
                            </button>
                          );
                        })}
                      </div>

                      {selectedCurrency === 'NPR' ? (
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
                          <h3 className="text-lg font-bold text-blue-900 mb-3">Nepal Payment Instructions</h3>
                          <div className="space-y-3 text-blue-900">
                            <p className="font-semibold">Please follow these steps:</p>
                            <ol className="list-decimal list-inside space-y-2 ml-2">
                              <li>Scan the QR code (you'll receive it)</li>
                              <li>Complete the payment</li>
                              <li>Take a screenshot of the payment confirmation</li>
                              <li>Send it to us on WhatsApp: <span className="font-bold">+91 9779006820</span></li>
                              <li>We will update you within 24 hours</li>
                            </ol>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 mb-6">
                          <p className="font-semibold text-gray-700 mb-2">Payment Gateway: PayU</p>
                          <p>Pay via debit/credit card, net banking, digital wallets, or international options.</p>
                        </div>
                      )}

                      <p className="text-gray-600 mb-3">
                        Your order will be processed in{' '}
                        <span className="font-semibold text-yoga-700">{selectedCurrency}</span>.
                      </p>
                      
                      {currencyOverview.length > 1 && (
                        <div className="mt-6 border-t border-gray-200 pt-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">All payment groups</p>
                          <div className="space-y-2">
                            {currencyOverview.map(({ code, total, quantity }) => (
                              <div key={code} className="flex justify-between text-sm text-gray-600">
                                <span>{code} • {quantity} item{quantity === 1 ? '' : 's'}</span>
                                <span className="font-semibold">{getCurrencySymbol(code)}{total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6">
                      {error}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !hasItemsForSelectedCurrency}
                  className={`w-full bg-yoga-600 text-white py-4 rounded-lg font-bold text-lg transition ${
                    loading || !hasItemsForSelectedCurrency ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yoga-700'
                  }`}
                >
                  {loading
                    ? 'Redirecting to PayU...'
                    : hasItemsForSelectedCurrency
                      ? `Pay ${getCurrencySymbol(selectedCurrency)}${summaryTotal.toFixed(2)}`
                      : 'Select a currency with items'}
                </button>
              </form>
            </div>

            {/* Order Summary */}
            <div className="md:col-span-1">
              <div className="bg-yoga-50 rounded-lg p-8 sticky top-24">
                <h2 className="text-2xl font-bold mb-6 text-yoga-700">Order Summary</h2>
                
                <div className="space-y-4 mb-6 border-b border-yoga-200 pb-6">
                  {hasItemsForSelectedCurrency ? (
                    summaryItems.map((item) => (
                      <div key={`${item.id}-${item.currency}`} className="flex justify-between">
                        <div>
                          <p className="text-gray-800 font-semibold">{item.name}</p>
                          <p className="text-xs text-gray-500">Qty {item.quantity}</p>
                        </div>
                        <span className="font-semibold">{getCurrencySymbol(selectedCurrency)}{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      No items available for {selectedCurrency}. Switch currency above or return to the cart.
                    </p>
                  )}
                </div>

                <div className="space-y-3 mb-6 border-b border-yoga-200 pb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal</span>
                    <span>{getCurrencySymbol(selectedCurrency)}{summarySubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Tax (8%)</span>
                    <span>{getCurrencySymbol(selectedCurrency)}{summaryTax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="text-xl font-bold text-yoga-700">
                    Total{summaryQuantity ? ` (${summaryQuantity} item${summaryQuantity === 1 ? '' : 's'})` : ''}
                  </span>
                  <span className="text-2xl font-bold text-yoga-600">{getCurrencySymbol(selectedCurrency)}{summaryTotal.toFixed(2)}</span>
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

export default function Checkout() {
  return (
    <Suspense fallback={null}>
      <CheckoutInner />
    </Suspense>
  );
}
