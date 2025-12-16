import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, CreditCard } from 'lucide-react';
import axios from 'axios';
import CurrencySelector, { Currency } from '../components/CurrencySelector';
import PayUPayment from '../components/PayUPayment';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { enrollment, batch } = location.state || {};

  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('preferredCurrency');
    return (saved as Currency) || 'INR';
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentInitiated, setPaymentInitiated] = useState(false);

  if (!enrollment || !batch) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">Invalid checkout session</p>
          <button
            onClick={() => navigate('/workshop-list')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Workshops
          </button>
        </div>
      </div>
    );
  }

  const prices = {
    INR: batch.pricing?.INR || 5000,
    NPR: batch.pricing?.NPR || 6500,
    USD: batch.pricing?.USD || 60
  };

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/signin');
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user.id || user._id;

      // In real implementation, call payment API
      console.log('Processing payment:', { userId, amount: prices[selectedCurrency], currency: selectedCurrency });
      
      setPaymentInitiated(true);
      setTimeout(() => {
        navigate('/my-courses');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error processing payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Currency Selector */}
      <CurrencySelector
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        prices={prices}
      />

      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Checkout */}
          <div className="lg:col-span-2">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Order Summary</h2>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 inline mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              )}

              {paymentInitiated && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-700">Payment processing...</p>
                </div>
              )}

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">Workshop</span>
                  <span className="font-semibold text-gray-900">{batch.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Mode</span>
                  <span className="font-semibold text-gray-900 capitalize">{batch.mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Start Date</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(batch.startDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration</span>
                  <span className="font-semibold text-gray-900">{batch.duration || '7'} Days</span>
                </div>
              </div>

              {/* Current Price Display */}
              <div className="bg-indigo-50 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-600 mb-2">Total Amount ({selectedCurrency})</p>
                <p className="text-4xl font-bold text-indigo-600">
                  {selectedCurrency === 'INR' ? '₹' : selectedCurrency === 'NPR' ? 'Rs' : '$'}{' '}
                  {prices[selectedCurrency].toLocaleString()}
                </p>
              </div>
            </div>

            {/* PayU Payment Form */}
            <PayUPayment
              orderId={`ORDER-${enrollment._id}-${Date.now()}`}
              amount={prices[selectedCurrency]}
              currency={selectedCurrency}
              userEmail={enrollment.email}
              userName={enrollment.name}
              productName={batch.name}
              onSuccess={() => {
                setPaymentInitiated(true);
                setTimeout(() => navigate('/my-courses'), 2000);
              }}
              onFailure={() => {
                setError('Payment failed. Please try again.');
              }}
            />
          </div>

          {/* Sidebar - Price Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Price Summary</h3>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                {(Object.entries(prices) as Array<[Currency, number]>).map(([currency, price]) => (
                  <div
                    key={currency}
                    className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedCurrency === currency
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-200'
                    }`}
                    onClick={() => setSelectedCurrency(currency)}
                  >
                    <p className="text-sm text-gray-600 mb-1">{currency}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {currency === 'INR' ? '₹' : currency === 'NPR' ? 'Rs' : '$'}
                      {price.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {/* Payment Methods */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Accepted Methods
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Credit/Debit Card</li>
                  <li>✓ Net Banking</li>
                  <li>✓ UPI & Wallets</li>
                  <li>✓ PayPal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
