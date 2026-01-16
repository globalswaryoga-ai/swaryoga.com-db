'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CashfreePaymentButton from '@/components/CashfreePaymentButton';
import { useCart } from '@/lib/context/CartContext';

export default function WorkshopRegistrationFormPage() {
  const params = useParams();
  const router = useRouter();
  const { cart, addToCart, getTotals } = useCart();
  
  const slug = params.slug as string;
  const mode = params.mode as string;
  const language = params.language as string;

  const [workshop, setWorkshop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    zip: '',
    address: '',
    acceptedTerms: false,
  });
  const [paymentMethod, setPaymentMethod] = useState<'cashfree' | 'bank'>('cashfree');
  const [isPaymentReady, setIsPaymentReady] = useState(false);

  // Fetch workshop details
  useEffect(() => {
    const fetchWorkshop = async () => {
      try {
        const response = await fetch(`/api/workshops/schedules?workshopSlug=${slug}&mode=${mode}&language=${language}`);
        const data = await response.json();
        if (data.schedules && data.schedules.length > 0) {
          const workshopData = data.schedules[0];
          setWorkshop(workshopData);
          
          // Auto-add to cart
          addToCart({
            kind: 'workshop',
            productId: workshopData._id,
            name: workshopData.workshopName || 'Workshop',
            price: workshopData.price || 145,
            quantity: 1,
            workshopSlug: slug,
            mode,
            language,
          });
        }
      } catch (error) {
        console.error('Error fetching workshop:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkshop();
  }, [slug, mode, language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // Check if form is valid
  const isFormValid = 
    formData.firstName &&
    formData.email &&
    formData.phone &&
    formData.city &&
    formData.acceptedTerms &&
    cart.length > 0;

  const totals = getTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-yoga-200 border-t-yoga-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workshop details...</p>
        </div>
      </div>
    );
  }

  if (!workshop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">Workshop not found</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-6 py-2 bg-yoga-600 text-white rounded-lg hover:bg-yoga-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-yoga-600 mb-4">
            🧘 {workshop.workshopName}
          </h1>
          <p className="text-gray-600 text-lg">
            {mode === 'online' ? '📱 Online' : '📍 Offline'} • {language === 'hindi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">📍 Sadhak Information</h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name *"
                    value={formData.firstName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                    required
                  />
                  <input
                    type="text"
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="email"
                    name="email"
                    placeholder="Email *"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                    required
                  />
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone Number *"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    name="city"
                    placeholder="City *"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                    required
                  />
                  <input
                    type="text"
                    name="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                  />
                </div>

                <textarea
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yoga-600"
                />

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="acceptedTerms"
                    checked={formData.acceptedTerms}
                    onChange={handleChange}
                    className="mt-1 w-5 h-5 text-yoga-600 cursor-pointer"
                    required
                  />
                  <label className="text-sm text-gray-600">
                    I accept the terms and conditions *
                  </label>
                </div>
              </form>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📋 Order Summary</h3>

              <div className="space-y-4 mb-6 border-b pb-6">
                {cart.map((item, index) => (
                  <div key={index} className="flex justify-between text-gray-700">
                    <span className="font-medium">{item.name}</span>
                    <span className="font-bold">₹{item.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span className="font-bold">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Service Charges (2.5%)</span>
                  <span className="font-bold">₹{totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Shipping</span>
                  <span className="text-green-600 font-bold">Free</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-gray-900">Total Amount</span>
                  <span className="text-2xl font-bold text-green-600">₹{totals.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="mb-6 border-t pt-6">
                <p className="text-sm font-semibold text-gray-700 mb-3">Payment Method</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg" style={{borderColor: paymentMethod === 'cashfree' ? '#16a34a' : '#d1d5db'}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cashfree"
                      checked={paymentMethod === 'cashfree'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cashfree' | 'bank')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">💳 Pay with Cashfree</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer p-3 border-2 rounded-lg" style={{borderColor: paymentMethod === 'bank' ? '#16a34a' : '#d1d5db'}}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank"
                      checked={paymentMethod === 'bank'}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cashfree' | 'bank')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">🏦 Bank Transfer</span>
                  </label>
                </div>
              </div>

              {/* Payment Button */}
              {paymentMethod === 'cashfree' ? (
                isFormValid ? (
                  <CashfreePaymentButton
                    amount={totals.total}
                    productInfo={`${workshop.workshopName} - ${mode} ${language}`}
                    firstName={formData.firstName}
                    lastName={formData.lastName}
                    email={formData.email}
                    phone={formData.phone}
                    city={formData.city}
                    address={formData.address}
                    state={formData.state}
                    zip={formData.zip}
                    items={cart}
                    token=""
                    onSuccess={() => router.push('/payment-success')}
                    onError={(error) => console.error('Payment error:', error)}
                    className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white font-bold py-4 px-4 rounded-lg transition-all transform hover:scale-105"
                  />
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-400 text-white font-bold py-4 px-4 rounded-lg opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>⚠️</span> Fill Required Fields
                  </button>
                )
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 font-semibold mb-2">🏦 Bank Transfer Details</p>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p><strong>Account Name:</strong> Swar Yoga</p>
                    <p><strong>Amount:</strong> ₹{totals.total.toFixed(2)}</p>
                    <p className="text-blue-600 font-bold mt-2">Please contact support for bank details</p>
                  </div>
                </div>
              )}

              {/* Security badges */}
              <div className="mt-6 pt-6 border-t space-y-2 text-xs text-gray-600">
                <p className="flex items-center gap-2">🔒 256-bit SSL Encrypted</p>
                <p className="flex items-center gap-2">✅ PCI DSS Compliant</p>
                <p className="flex items-center gap-2">🛡️ Fraud Protection</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
