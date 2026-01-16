'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BANK_ACCOUNT_DETAILS, getWhatsAppLink } from '@/lib/bankTransferConfig';

export default function PaymentPendingPage() {
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    // Get order details from localStorage or session
    const cartData = localStorage.getItem('cartItems');
    const formData = localStorage.getItem('checkoutForm');
    if (cartData || formData) {
      try {
        setOrderDetails({
          cart: cartData ? JSON.parse(cartData) : [],
          form: formData ? JSON.parse(formData) : {}
        });
      } catch (e) {
        console.error('Error loading order details:', e);
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Success Icon */}
          <div className="text-center mb-8">
            <div className="inline-block bg-orange-100 rounded-full p-6 mb-6">
              <div className="text-6xl">⏳</div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment Pending</h1>
            <p className="text-lg text-gray-600">Your bank transfer is being processed</p>
          </div>

          {/* Bank Details Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📋 Bank Account Details</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Beneficiary Name:</span>
                <span className="text-gray-900 font-bold">{BANK_ACCOUNT_DETAILS.beneficiaryName}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Bank & Branch:</span>
                <span className="text-gray-900 font-bold">{BANK_ACCOUNT_DETAILS.bank} – {BANK_ACCOUNT_DETAILS.branch}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">IFSC Code:</span>
                <span className="text-gray-900 font-mono font-bold">{BANK_ACCOUNT_DETAILS.ifscCode}</span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">SWIFT/BIC Code:</span>
                <span className="text-gray-900 font-mono font-bold">{BANK_ACCOUNT_DETAILS.swiftCode}</span>
              </div>

              <div className="py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700 block mb-2">Bank Address:</span>
                <span className="text-gray-900 font-bold text-sm block">
                  {BANK_ACCOUNT_DETAILS.address}
                </span>
              </div>

              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="font-semibold text-gray-700">Purpose:</span>
                <span className="text-gray-900 font-bold">{BANK_ACCOUNT_DETAILS.purpose}</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 mb-8">
            <h3 className="text-xl font-bold text-blue-900 mb-6">📸 Next Steps:</h3>
            
            <ol className="space-y-4">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                <div>
                  <p className="font-semibold text-gray-900">Complete the Bank Transfer</p>
                  <p className="text-sm text-gray-700">Transfer the amount from your bank account using the details above.</p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                <div>
                  <p className="font-semibold text-gray-900">Take a Screenshot</p>
                  <p className="text-sm text-gray-700">Capture the transaction confirmation/receipt from your bank.</p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                <div>
                  <p className="font-semibold text-gray-900">Send via WhatsApp</p>
                  <p className="text-sm text-gray-700">Send the screenshot along with your order ID to our WhatsApp number.</p>
                </div>
              </li>

              <li className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
                <div>
                  <p className="font-semibold text-gray-900">Confirmation & Access</p>
                  <p className="text-sm text-gray-700">We'll verify your payment and grant course access within 24 hours.</p>
                </div>
              </li>
            </ol>
          </div>

          {/* WhatsApp Button */}
          <div className="text-center mb-8">
            <a
              href="https://wa.me/919876543210?text=I%20have%20completed%20the%20bank%20transfer%20for%20Swar%20Yoga%20Workshops.%20Please%20find%20the%20transaction%20screenshot%20attached."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="text-2xl">💬</span>
              <span>Send WhatsApp Confirmation</span>
            </a>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-8 mb-8">
            <h3 className="text-lg font-bold text-yellow-900 mb-4">⚠️ Important Notes:</h3>
            
            <ul className="space-y-3 text-sm text-yellow-800">
              <li className="flex gap-3">
                <span>✓</span>
                <span>Keep your transaction receipt/screenshot safe</span>
              </li>
              <li className="flex gap-3">
                <span>✓</span>
                <span>Include your email or phone number in the WhatsApp message</span>
              </li>
              <li className="flex gap-3">
                <span>✓</span>
                <span>We'll confirm your payment within 24 hours</span>
              </li>
              <li className="flex gap-3">
                <span>✓</span>
                <span>Check your email for course access link</span>
              </li>
              <li className="flex gap-3">
                <span>✓</span>
                <span>If you don't receive confirmation, reach out to us on WhatsApp</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Link
              href="/workshops"
              className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <span>←</span> Back to Workshops
            </Link>
            
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              <span>💬</span> Chat on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
