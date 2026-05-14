'use client';

import React from 'react';

interface PaymentMethodPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (method: 'india' | 'nepal' | 'usd') => void;
  workshopName?: string;
}

export default function PaymentMethodPopup({ isOpen, onClose, onSelect, workshopName }: PaymentMethodPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4">
          <h2 className="text-xl font-bold text-white">Select Payment Method</h2>
          {workshopName && (
            <p className="text-green-100 text-sm mt-1 truncate">{workshopName}</p>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* India Option */}
          <button
            type="button"
            onClick={() => onSelect('india')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl shrink-0">
              🇮🇳
            </div>
            <div className="text-left flex-1">
              <div className="font-bold text-gray-900 group-hover:text-green-700">India (INR)</div>
              <div className="text-sm text-gray-500">Pay via Cashfree - UPI, Cards, NetBanking</div>
            </div>
            <div className="text-gray-400 group-hover:text-green-600">→</div>
          </button>

          {/* Nepal Option */}
          <button
            type="button"
            onClick={() => onSelect('nepal')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl shrink-0">
              🇳🇵
            </div>
            <div className="text-left flex-1">
              <div className="font-bold text-gray-900 group-hover:text-blue-700">Nepal (NPR)</div>
              <div className="text-sm text-gray-500">Pay via QR Code - eSewa, Khalti, Bank Transfer</div>
            </div>
            <div className="text-gray-400 group-hover:text-blue-600">→</div>
          </button>

          {/* USD Option */}
          <button
            type="button"
            onClick={() => onSelect('usd')}
            className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl shrink-0">
              🌍
            </div>
            <div className="text-left flex-1">
              <div className="font-bold text-gray-900 group-hover:text-purple-700">International (USD)</div>
              <div className="text-sm text-gray-500">Pay via Cashfree - International Cards</div>
            </div>
            <div className="text-gray-400 group-hover:text-purple-600">→</div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
