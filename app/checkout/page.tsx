'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Download, QrCode } from 'lucide-react';

// Currency exchange rates (INR base)
const CURRENCY_RATES: Record<string, { code: string; symbol: string; rate: number; country: string; flag: string }> = {
  INR: { code: 'INR', symbol: '₹', rate: 1, country: 'India', flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$', rate: 0.012, country: 'United States', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', rate: 0.011, country: 'Europe', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', rate: 0.0095, country: 'United Kingdom', flag: '🇬🇧' },
  CAD: { code: 'CAD', symbol: 'C$', rate: 0.017, country: 'Canada', flag: '🇨🇦' },
  AUD: { code: 'AUD', symbol: 'A$', rate: 0.018, country: 'Australia', flag: '🇦🇺' },
  JPY: { code: 'JPY', symbol: '¥', rate: 1.8, country: 'Japan', flag: '🇯🇵' },
  SGD: { code: 'SGD', symbol: 'S$', rate: 0.016, country: 'Singapore', flag: '🇸🇬' },
  MUR: { code: 'MUR', symbol: '₨', rate: 0.54, country: 'Mauritius', flag: '🇲🇺' },
  NPR: { code: 'NPR', symbol: '₨', rate: 1.58, country: 'Nepal', flag: '🇳🇵' },
};

type CheckoutStep = 'currency' | 'payment' | 'qrcode';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [step, setStep] = useState<CheckoutStep>('currency');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('INR');
  const [workshopId, setWorkshopId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [workshopData, setWorkshopData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
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

  useEffect(() => {
    const id = searchParams.get('workshopId') || '';
    const qty = parseInt(searchParams.get('quantity') || '1');
    setWorkshopId(id);
    setQuantity(qty);

    if (!id) {
      setError('Workshop not found. Please select a workshop.');
      setLoading(false);
      return;
    }

    // Fetch workshop data
    const fetchWorkshopData = async () => {
      try {
        const res = await fetch(`/api/workshops/${id}`);
        if (!res.ok) throw new Error('Failed to fetch workshop');
        const data = await res.json();
        setWorkshopData(data);
      } catch (err) {
        setError('Failed to load workshop details.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshopData();
  }, [searchParams]);

  const basePriceInINR = workshopData?.price || 0;
  const priceInSelectedCurrency = basePriceInINR * CURRENCY_RATES[selectedCurrency].rate * quantity;
  const paymentFee = priceInSelectedCurrency * 0.033;
  const totalAmount = priceInSelectedCurrency + paymentFee;

  const handleCurrencySelect = (currency: string) => {
    setSelectedCurrency(currency);
    if (currency === 'NPR') {
      setStep('qrcode');
    } else {
      setStep('payment');
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
        setError('Please fill in all required fields.');
        setSubmitting(false);
        return;
      }

      // Prepare PayU data
      const txnid = `TXN${Date.now()}`;
      const amount = totalAmount.toFixed(2);
      const productinfo = `${workshopData.name} (${quantity}x)`;
      const firstname = formData.firstName;
      const email = formData.email;
      const phone = formData.phone;

      // Hash generation happens on server-side for security
      const response = await fetch('/api/payment/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnid,
          amount,
          productinfo,
          firstname,
          email,
          phone,
          currency: selectedCurrency,
          workshopId,
          quantity,
          formData,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Payment initiation failed');

      // Redirect to PayU
      window.location.href = data.paymentUrl;
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
      setSubmitting(false);
    }
  };

  const downloadQRCode = () => {
    const qrElement = document.getElementById('qr-code');
    if (qrElement) {
      const canvas = qrElement.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = `Nepal-Payment-QR-${Date.now()}.png`;
        link.click();
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-swar-primary border-t-swar-accent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-swar-text">Loading checkout...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error && step === 'currency') {
    return (
      <div className="bg-white min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-900 mb-2">Error</h2>
                <p className="text-red-800 mb-4">{error}</p>
                <Link href="/workshop" className="inline-block bg-swar-primary hover:bg-swar-primary-hover text-white px-6 py-2 rounded-lg transition">
                  Browse Workshops
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-swar-bg min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          {step !== 'currency' && (
            <button
              onClick={() => setStep('currency')}
              className="inline-flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover transition mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Change Currency
            </button>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-swar-text mb-2">
            {step === 'qrcode' ? 'Nepal Payment - QR Code' : step === 'currency' ? 'Select Payment Currency' : 'Payment Details'}
          </h1>
          <p className="text-swar-text-secondary">
            {step === 'currency' && 'Choose your currency to proceed'}
            {step === 'payment' && `Complete payment in ${selectedCurrency} • ${workshopData?.name}`}
            {step === 'qrcode' && 'Scan QR code or download for payment'}
          </p>
        </div>

        {/* Content */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            {/* Currency Selection */}
            {step === 'currency' && (
              <div className="bg-white rounded-xl border border-swar-border p-8">
                <h2 className="text-xl font-semibold text-swar-text mb-6">Choose Your Currency</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(CURRENCY_RATES).map(([key, currency]) => (
                    <button
                      key={key}
                      onClick={() => handleCurrencySelect(key)}
                      className="p-4 border-2 border-swar-border rounded-lg hover:border-swar-primary hover:bg-swar-primary-light transition text-left"
                    >
                      <div className="text-2xl mb-2">{currency.flag}</div>
                      <div className="font-semibold text-swar-text">{currency.country}</div>
                      <div className="text-sm text-swar-text-secondary">{key} ({currency.symbol})</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Form */}
            {step === 'payment' && (
              <div className="bg-white rounded-xl border border-swar-border p-8">
                <h2 className="text-xl font-semibold text-swar-text mb-6">Enter Your Details</h2>
                <form onSubmit={handlePaymentSubmit} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="First Name *"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last Name *"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      required
                    />
                  </div>

                  <input
                    type="email"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    required
                  />

                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    required
                  />

                  <input
                    type="text"
                    placeholder="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={formData.zip}
                      onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                      className="px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-swar-primary hover:bg-swar-primary-hover text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : `Pay ${CURRENCY_RATES[selectedCurrency].symbol}${totalAmount.toFixed(2)}`}
                  </button>
                </form>
              </div>
            )}

            {/* QR Code Page */}
            {step === 'qrcode' && (
              <div className="bg-white rounded-xl border border-swar-border p-8">
                <h2 className="text-xl font-semibold text-swar-text mb-6">Complete Payment via QR Code</h2>
                <div className="space-y-6">
                  <div id="qr-code" className="bg-swar-primary-light rounded-xl p-8 flex justify-center">
                    <div className="bg-white p-6 rounded-lg">
                      <QrCode className="w-48 h-48 text-swar-primary" />
                      <p className="text-center text-sm text-swar-text-secondary mt-4">[Dummy QR - Will be updated]</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-swar-text font-medium">Payment Instructions:</p>
                    <ol className="space-y-2 text-swar-text-secondary list-decimal list-inside">
                      <li>Scan the QR code with your mobile payment app</li>
                      <li>Enter amount: {CURRENCY_RATES[selectedCurrency].symbol}{totalAmount.toFixed(2)} NPR</li>
                      <li>Confirm and complete the payment</li>
                      <li>You'll receive a confirmation immediately</li>
                    </ol>
                  </div>

                  <button
                    onClick={downloadQRCode}
                    className="w-full bg-swar-accent hover:bg-swar-accent-hover text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download QR Code
                  </button>

                  <Link
                    href="/payment-successful?status=pending"
                    className="w-full block bg-swar-primary hover:bg-swar-primary-hover text-white py-3 rounded-lg font-semibold transition text-center"
                  >
                    I've Completed the Payment
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="md:col-span-1">
            {workshopData && (
              <div className="bg-white rounded-xl border border-swar-border p-6 sticky top-24">
                <h3 className="font-semibold text-swar-text mb-4">Order Summary</h3>

                {/* Workshop Details */}
                <div className="pb-4 border-b border-swar-border mb-4">
                  <p className="text-sm text-swar-text-secondary mb-2">Workshop</p>
                  <p className="font-medium text-swar-text">{workshopData?.name}</p>
                  {workshopData?.instructor && (
                    <p className="text-sm text-swar-text-secondary">by {workshopData.instructor}</p>
                  )}
                  <p className="text-sm text-swar-text-secondary mt-2">
                    {workshopData?.duration} • {workshopData?.level}
                  </p>
                </div>

                {/* Pricing */}
                <div className="space-y-3 pb-4 border-b border-swar-border mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-swar-text-secondary">Price per seat</span>
                    <span className="text-swar-text font-medium">
                      {CURRENCY_RATES[selectedCurrency].symbol}{(workshopData?.price * CURRENCY_RATES[selectedCurrency].rate).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-swar-text-secondary">Quantity</span>
                    <span className="text-swar-text font-medium">× {quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-swar-text-secondary">Subtotal</span>
                    <span className="text-swar-text font-medium">
                      {CURRENCY_RATES[selectedCurrency].symbol}{priceInSelectedCurrency.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm bg-orange-50 -mx-2 px-2 py-2 rounded">
                    <span className="text-swar-text-secondary">Payment Fee (3.3%)</span>
                    <span className="font-medium text-swar-accent">{CURRENCY_RATES[selectedCurrency].symbol}{paymentFee.toFixed(2)}</span>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mb-6 pt-2">
                  <span className="font-semibold text-swar-text">Total</span>
                  <span className="text-2xl font-bold text-swar-primary">
                    {CURRENCY_RATES[selectedCurrency].symbol}{totalAmount.toFixed(2)}
                  </span>
                </div>

                {/* Currency Indicator */}
                {step !== 'currency' && (
                  <div className="bg-swar-primary-light rounded-lg p-4 text-sm">
                    <p className="text-swar-text font-medium mb-1">Payment Currency</p>
                    <p className="text-swar-text-secondary">
                      {CURRENCY_RATES[selectedCurrency].country} ({selectedCurrency})
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
