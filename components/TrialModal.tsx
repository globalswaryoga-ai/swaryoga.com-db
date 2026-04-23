'use client';

import React, { useState } from 'react';

interface TrialPopup {
  type: 'storage-payment' | 'upgrade-offer' | 'trial-expired';
  title: string;
  message: string;
  amount?: number;
  days?: string;
  action?: string;
  actions?: string[];
}

interface TrialModalProps {
  popup: TrialPopup | null;
  onClose: () => void;
  onAction?: (action: string) => void;
  isLoading?: boolean;
}

export default function TrialModal({ popup, onClose, onAction, isLoading = false }: TrialModalProps) {
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  if (!popup) return null;

  const handleAction = async (action: string) => {
    setProcessingAction(action);
    try {
      if (onAction) {
        await onAction(action);
      }
    } finally {
      setProcessingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
        {/* Header with icon and close button */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {popup.title}
            </h2>
            {popup.days && (
              <p className="text-xs text-gray-500 mt-1">Since {popup.days}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-gray-700 mb-6 leading-relaxed">
            {popup.message}
          </p>

          {/* Storage Payment Popup - Day 2 */}
          {popup.type === 'storage-payment' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">1GB Monthly Storage</p>
                  <p className="text-xs text-blue-500">Unlock additional features</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">₹{popup.amount}</p>
                  <p className="text-xs text-blue-500">one-time</p>
                </div>
              </div>
            </div>
          )}

          {/* Upgrade Popup - Day 10 */}
          {popup.type === 'upgrade-offer' && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 mb-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Basic Plan</p>
                    <p className="text-xs text-gray-600">₹499/month • 500 leads • All features</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Expired Popup - Day 15+ */}
          {popup.type === 'trial-expired' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700 font-semibold mb-2">⚠️ Access will be limited</p>
              <p className="text-xs text-red-600">
                Your free trial has ended. Upgrade to continue accessing all features and manage your contacts.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {popup.type === 'storage-payment' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Later
              </button>
              <button
                onClick={() => handleAction('pay')}
                disabled={processingAction === 'pay' || isLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/30 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingAction === 'pay' ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </>
                ) : (
                  <>
                    💳 Pay ₹{popup.amount}
                  </>
                )}
              </button>
            </>
          )}

          {popup.type === 'upgrade-offer' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => handleAction('demo')}
                disabled={processingAction === 'demo' || isLoading}
                className="flex-1 px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium text-sm transition-colors disabled:opacity-50"
              >
                📅 Book Demo
              </button>
              <button
                onClick={() => handleAction('upgrade')}
                disabled={processingAction === 'upgrade' || isLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingAction === 'upgrade' ? (
                  <>
                    <span className="animate-spin">⏳</span>
                  </>
                ) : (
                  '🚀 Upgrade'
                )}
              </button>
            </>
          )}

          {popup.type === 'trial-expired' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => handleAction('upgrade')}
                disabled={processingAction === 'upgrade' || isLoading}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/30 font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processingAction === 'upgrade' ? (
                  <>
                    <span className="animate-spin">⏳</span>
                  </>
                ) : (
                  '🚀 Upgrade Now'
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
