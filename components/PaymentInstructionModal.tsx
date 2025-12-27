'use client';

import React, { useState } from 'react';
import { X, Copy, CheckCircle, MessageCircle } from 'lucide-react';

interface PaymentInstructionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  amount: number;
  email: string;
  phone: string;
}

export default function PaymentInstructionModal({
  isOpen,
  onClose,
  currency,
  amount,
  email,
  phone,
}: PaymentInstructionModalProps) {
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);
  const whatsappNumber = '919309986820'; // Without + for WhatsApp API
  const whatsappDisplay = '+91 9309986820';

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(whatsappDisplay);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    const message = `Hello, I have made a payment of ${currency} ${amount} for Swar Yoga program. My email is ${email} and mobile is ${phone}. Please add me to the main group.`;
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle size={28} />
            <h2 className="text-2xl font-bold">Payment Initiated</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-8 space-y-6">
          {/* Payment Status */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Payment Amount:</span> {currency} {amount}
            </p>
            <p className="text-sm text-gray-700 mt-2">
              <span className="font-semibold">Order Status:</span> <span className="text-yellow-600">Pending Manual Verification</span>
            </p>
          </div>

          {/* QR Code Section */}
          <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="font-bold text-gray-900 mb-4">📱 Step 1: Complete Your Payment</h3>
            <p className="text-gray-700 mb-4">
              Scan the QR code below using your mobile wallet (Google Pay, PhonePe, Paytm, etc.) to complete your payment:
            </p>
            <div className="bg-white p-6 rounded-lg border border-gray-300 inline-block mx-auto">
              <p className="text-center text-gray-500 py-8">
                [QR Code will be displayed here]
              </p>
            </div>
            <p className="text-xs text-gray-500 mt-4 text-center">
              Keep this page open and take a screenshot after payment completion
            </p>
          </div>

          {/* WhatsApp Instructions */}
          <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageCircle size={20} className="text-green-600" />
              Step 2: Send Proof to WhatsApp
            </h3>
            <div className="space-y-4">
              <p className="text-gray-700">
                After payment is complete, please send a <span className="font-semibold">screenshot of your payment confirmation</span> to our WhatsApp:
              </p>

              {/* WhatsApp Number */}
              <div className="bg-white border border-green-300 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">WhatsApp Number</p>
                  <p className="text-lg font-bold text-green-600">{whatsappDisplay}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-semibold"
                  >
                    <Copy size={16} />
                    {copiedWhatsApp ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleOpenWhatsApp}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                  >
                    <MessageCircle size={16} />
                    Open WhatsApp
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                ⚠️ <span className="font-semibold">Important:</span> Include your name, email, and order amount in your message so we can verify your payment quickly.
              </p>
            </div>
          </div>

          {/* Admin Approval */}
          <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
            <h3 className="font-bold text-gray-900 mb-3">✅ Step 3: Admin Verification & Group Access</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">1.</span>
                <span>Our admin will verify your payment within 24 hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">2.</span>
                <span>You will be added to the main WhatsApp group</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">3.</span>
                <span>You will receive a confirmation message with all program details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600 font-bold mt-0.5">4.</span>
                <span>Your user profile will be updated with all your details</span>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-600 mb-2">
              <span className="font-semibold">Email:</span> {email}
            </p>
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Mobile:</span> {phone}
            </p>
            <p className="text-xs text-gray-500 mt-3">
              If you have any issues, please contact us via WhatsApp with your details above.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleOpenWhatsApp}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <MessageCircle size={18} />
            Continue on WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
