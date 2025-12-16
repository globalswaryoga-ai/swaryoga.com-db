import React, { useState } from 'react';
import { AlertCircle, Loader } from 'lucide-react';
import { Currency } from './CurrencySelector';

interface PayUPaymentProps {
  orderId: string;
  amount: number;
  currency: Currency;
  userEmail: string;
  userName: string;
  productName: string;
  onSuccess?: () => void;
  onFailure?: () => void;
}

export default function PayUPayment({
  orderId,
  amount,
  currency,
  userEmail,
  userName,
  productName,
  onSuccess,
  onFailure
}: PayUPaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      // Get PayU configuration from environment
      const merchantKey = process.env.REACT_APP_PAYU_MERCHANT_KEY;
      const salt = process.env.REACT_APP_PAYU_SALT;
      const successUrl = `${window.location.origin}/payment/success`;
      const failureUrl = `${window.location.origin}/payment/failure`;

      if (!merchantKey || !salt) {
        throw new Error('PayU configuration not found. Please contact support.');
      }

      // Prepare payment data
      const paymentData = {
        key: merchantKey,
        txnid: orderId,
        amount: amount.toString(),
        productinfo: productName,
        firstname: userName,
        email: userEmail,
        phone: '',
        surl: successUrl,
        furl: failureUrl,
        curl: `${window.location.origin}/payment/cancel`
      };

      // Generate hash (this should be done on the backend for security)
      const response = await fetch('/api/payment/generate-hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txnid: orderId,
          amount,
          productinfo: productName,
          firstname: userName,
          email: userEmail
        })
      });

      const { hash } = await response.json();

      // Create form and submit to PayU
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = process.env.REACT_APP_PAYU_URL || 'https://secure.payu.in/_payment';

      const fields = {
        ...paymentData,
        hash
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);
    } catch (err: any) {
      setError(err.message || 'Payment processing failed. Please try again.');
      if (onFailure) onFailure();
    } finally {
      setIsProcessing(false);
    }
  };

  const currencySymbols: { [key in Currency]: string } = {
    INR: '₹',
    USD: '$',
    NPR: 'Rs'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Payment Details</h2>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Order Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <p className="text-gray-600">{productName}</p>
          <p className="font-semibold text-gray-900">
            {currencySymbols[currency]} {amount.toLocaleString()}
          </p>
        </div>
        <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between items-center">
          <p className="font-semibold text-gray-800">Total Amount</p>
          <p className="text-xl font-bold text-indigo-600">
            {currencySymbols[currency]} {amount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Payment Methods Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Accepted Payment Methods</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Credit Card (Visa, MasterCard, American Express)</li>
          <li>✓ Debit Card</li>
          <li>✓ Net Banking</li>
          <li>✓ Mobile Wallets (Google Pay, Apple Pay, PhonePe)</li>
          <li>✓ UPI</li>
        </ul>
      </div>

      {/* User Info Summary */}
      <div className="mb-6 space-y-3 p-4 bg-gray-50 rounded-lg">
        <div className="flex justify-between">
          <span className="text-gray-600">Name</span>
          <span className="font-medium text-gray-900">{userName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Email</span>
          <span className="font-medium text-gray-900">{userEmail}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Order ID</span>
          <span className="font-medium text-gray-900">{orderId}</span>
        </div>
      </div>

      {/* PayU Button */}
      <form onSubmit={handlePayment}>
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processing Payment...
            </>
          ) : (
            <>
              Pay {currencySymbols[currency]} {amount.toLocaleString()}
            </>
          )}
        </button>
      </form>

      {/* Security Notice */}
      <p className="text-xs text-gray-500 text-center mt-4">
        🔒 Your payment is secure and encrypted. Powered by PayU
      </p>
    </div>
  );
}
