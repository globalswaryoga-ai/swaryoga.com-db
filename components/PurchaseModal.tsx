'use client';

import React, { useState } from 'react';

interface PurchaseModalProps {
  sessionId: string;
  sessionTitle: string;
  price: number;
  onClose: () => void;
  onSuccess: (purchaseData: any) => void;
  token: string;
}

export default function PurchaseModal({
  sessionId,
  sessionTitle,
  price,
  onClose,
  onSuccess,
  token,
}: PurchaseModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'one-time' | 'monthly' | 'yearly'>('one-time');
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'payu'>('stripe');

  const pricing = {
    'one-time': price,
    monthly: price * 0.3, // 30% monthly cost
    yearly: price * 2.4, // 2.4x yearly cost (slight discount)
  };

  async function handlePurchase() {
    try {
      setLoading(true);
      setError('');

      // Generate transaction ID
      const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`/api/sessions/${sessionId}/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: paymentMethod,
          subscription_type: subscriptionType,
          transaction_id: transactionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Purchase failed');
      }

      const data = await response.json();
      onSuccess(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-yoga-600 text-white px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">🎁 Enroll Session</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-2xl hover:text-yoga-100 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Session Title */}
          <p className="text-gray-600 text-sm mb-1">Session</p>
          <h3 className="text-lg font-bold text-gray-900 mb-6">{sessionTitle}</h3>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              ❌ {error}
            </div>
          )}

          {/* Subscription Type */}
          <div className="mb-6">
            <p className="text-gray-700 font-semibold mb-3">Choose Plan</p>
            <div className="space-y-2">
              {(['one-time', 'monthly', 'yearly'] as const).map((type) => (
                <label key={type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="subscription"
                    value={type}
                    checked={subscriptionType === type}
                    onChange={() => setSubscriptionType(type)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 capitalize">
                      {type === 'one-time' ? 'One-Time Purchase' : `${type.charAt(0).toUpperCase() + type.slice(1)} Subscription`}
                    </p>
                    <p className="text-sm text-gray-600">
                      ${pricing[type].toFixed(2)}/{type === 'one-time' ? 'forever' : type === 'monthly' ? 'month' : 'year'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <p className="text-gray-700 font-semibold mb-3">Payment Method</p>
            <div className="space-y-2">
              {(['stripe', 'payu'] as const).map((method) => (
                <label key={method} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payment"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <p className="font-semibold text-gray-800 capitalize">
                    {method === 'stripe' ? '💳 Stripe (Card)' : '🏦 PayU (UPI/Card)'}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-yoga-50 border border-yoga-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-700">Amount:</span>
              <span className="font-bold text-gray-900">${pricing[subscriptionType].toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-yoga-200 pt-2">
              <span className="text-gray-700">Processing Fee:</span>
              <span className="font-bold text-gray-900">Free</span>
            </div>
            <div className="flex justify-between border-t border-yoga-200 pt-2 mt-2">
              <span className="font-bold text-gray-900">Total:</span>
              <span className="font-bold text-lg text-yoga-600">
                ${pricing[subscriptionType].toFixed(2)}
              </span>
            </div>
          </div>

          {/* Benefits */}
          <div className="mb-6 bg-green-50 p-4 rounded-lg">
            <p className="font-semibold text-green-900 mb-2">✅ You'll get:</p>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✓ Lifetime access (one-time) or subscription period</li>
              <li>✓ Auto-resume from where you left off</li>
              <li>✓ Completion certificate upon finishing</li>
              <li>✓ Offline download available</li>
            </ul>
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500 text-center mb-6">
            By continuing, you agree to our{' '}
            <a href="/terms" className="text-yoga-600 hover:underline">
              Terms & Conditions
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePurchase}
            disabled={loading}
            className="flex-1 bg-yoga-600 hover:bg-yoga-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>
                🔒 Purchase Now
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
