'use client';

import React, { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { getCurrencySymbol, type CurrencyCode } from '@/lib/paymentMath';

interface NepalQRModalProps {
  onClose: () => void;
  amount: number;
  currency: string;
}

export default function NepalQRModal({ onClose, amount, currency }: NepalQRModalProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string>('');
  const isIndiaPayment = currency === 'INR';

  useEffect(() => {
    const url = isIndiaPayment 
      ? process.env.NEXT_PUBLIC_INDIA_QR_URL || ''
      : process.env.NEXT_PUBLIC_NEPALI_QR_URL || '';
    setQrImageUrl(url);
  }, [isIndiaPayment]);

  const handleDownloadQR = () => {
    if (!qrImageUrl) return;
    
    // If it's a remote URL, open it for download
    if (qrImageUrl.startsWith('http')) {
      const link = document.createElement('a');
      link.href = qrImageUrl;
      link.download = `swar-yoga-payment-${amount}.png`;
      link.target = '_blank';
      link.click();
    } else {
      // Local canvas download
      const canvas = document.getElementById('nepal-qr-code') as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = `swar-yoga-payment-${amount}.png`;
        link.click();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-swar-primary text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {isIndiaPayment ? '🇮🇳 India Payment' : '🇳🇵 Nepal Payment'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Amount */}
          <div className="text-center bg-swar-bg rounded-lg p-4">
            <p className="text-sm text-swar-text-secondary mb-1">Amount to Pay</p>
            <p className="text-2xl font-bold text-swar-primary">
              {getCurrencySymbol(currency as CurrencyCode)}
              {amount}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center space-y-4">
            <div className="bg-gray-100 rounded-lg p-6 flex items-center justify-center w-full aspect-square border-2 border-dashed border-swar-border">
              <div className="text-center">
                {qrImageUrl ? (
                  <>
                    <img 
                      src={qrImageUrl} 
                      alt="Payment QR Code"
                      className="w-40 h-40 object-contain"
                    />
                    <p className="text-xs text-swar-text-secondary mt-2">Scan to pay</p>
                  </>
                ) : (
                  <p className="text-sm text-swar-text-secondary">Loading QR Code...</p>
                )}
                <canvas
                  id="nepal-qr-code"
                  width="200"
                  height="200"
                  className="hidden"
                />
              </div>
            </div>

            {/* Download Button */}
            {qrImageUrl && (
              <button
                onClick={handleDownloadQR}
                className="w-full flex items-center justify-center gap-2 bg-swar-primary text-white px-4 py-2 rounded-lg hover:bg-swar-primary-hover transition-colors font-semibold"
              >
                <Download size={18} />
                Download QR Code
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-blue-900 text-sm">Instructions:</h4>
            <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
              {isIndiaPayment ? (
                <>
                  <li>Open your banking app or UPI app</li>
                  <li>Select "Scan & Pay" or "Send Money"</li>
                  <li>Scan this QR code</li>
                  <li>Enter amount {getCurrencySymbol(currency as CurrencyCode)}{amount}</li>
                  <li>Complete the payment</li>
                  <li>You'll receive a confirmation</li>
                </>
              ) : (
                <>
                  <li>Open your mobile payment app (eSewa, Khalti, etc.)</li>
                  <li>Scan the QR code with your app</li>
                  <li>Complete the payment</li>
                  <li>You'll receive a confirmation</li>
                </>
              )}
            </ol>
          </div>

          {/* Note */}
          <div className="text-xs text-swar-text-secondary text-center">
            <p>If you have any issues, please contact support at support@swaryoga.com</p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full bg-swar-bg text-swar-text px-4 py-2 rounded-lg hover:bg-swar-border transition-colors font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
