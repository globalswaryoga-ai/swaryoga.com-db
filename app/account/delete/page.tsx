'use client';

import { useState } from 'react';

export default function DeleteAccountPage() {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      setError('Please confirm account deletion');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to delete your account');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      setSuccess(true);
      localStorage.removeItem('token');
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">✓</div>
            <h1 className="text-3xl font-bold text-green-600 mb-4">
              Account Deleted Successfully
            </h1>
            <p className="text-gray-700 mb-6">
              Your account and associated data have been permanently deleted.
              You will be redirected to the home page in a moment.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50 p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="text-orange-600 hover:text-orange-800 mb-6 font-semibold"
        >
          ← Back
        </button>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Delete Your Account
          </h1>
          <p className="text-gray-600 mb-8">
            This action is permanent and cannot be undone.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              How to Delete Your Account
            </h2>
            <ol className="space-y-4 text-gray-700">
              <li className="flex gap-4">
                <span className="font-bold text-orange-600 flex-shrink-0">1.</span>
                <span>Read through the information below carefully to understand what will be deleted</span>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-orange-600 flex-shrink-0">2.</span>
                <span>Check the confirmation checkbox at the bottom of this page</span>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-orange-600 flex-shrink-0">3.</span>
                <span>Click the "Permanently Delete My Account" button</span>
              </li>
              <li className="flex gap-4">
                <span className="font-bold text-orange-600 flex-shrink-0">4.</span>
                <span>Your account will be deleted immediately and you will be logged out</span>
              </li>
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              ✓ What Data Will Be Deleted
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <span>Your account profile (name, email, phone number)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <span>Your password and authentication credentials</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <span>Your workshop bookings and enrollment history</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <span>Your life planner data and personal preferences</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <span>Your community posts and comments</span>
              </li>
              <li className="flex gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <span>Any saved favorites or watchlist items</span>
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📋 What Data Will Be Retained
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex gap-3">
                <span className="text-blue-600 text-xl">•</span>
                <span><strong>Transaction Records:</strong> Payment receipts and invoices for tax and legal compliance (retained for 7 years per Indian tax laws)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 text-xl">•</span>
                <span><strong>Refund History:</strong> Records of any refunds or disputes (retained for 2 years)</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 text-xl">•</span>
                <span><strong>Legal Records:</strong> Any information related to legal disputes or compliance issues</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 text-xl">•</span>
                <span><strong>Anonymized Analytics:</strong> Non-identifying usage statistics for improving the platform</span>
              </li>
            </ul>
          </section>

          <section className="mb-8 bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
            <h3 className="font-bold text-yellow-900 mb-2">⏱️ Data Retention Timeline</h3>
            <p className="text-yellow-900 text-sm">
              <strong>Immediate (Upon deletion):</strong> Your profile and personal data are deleted within 24 hours.
            </p>
            <p className="text-yellow-900 text-sm mt-2">
              <strong>Financial Records:</strong> Transaction data is retained for 7 years as required by Indian tax regulations (ITA 1961).
            </p>
            <p className="text-yellow-900 text-sm mt-2">
              <strong>Support Records:</strong> Communications with support may be retained for 6 months for quality assurance.
            </p>
          </section>

          <section className="mb-8 bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-bold text-orange-900 mb-3">⚠️ Important Notes</h3>
            <ul className="space-y-2 text-sm text-orange-900">
              <li>• This action <strong>cannot be undone</strong>. Your account will be permanently deleted.</li>
              <li>• If you have active workshop enrollments, you will lose access immediately.</li>
              <li>• Refund eligibility will be determined based on the workshop's refund policy at the time of deletion.</li>
              <li>• You will no longer receive any emails from Swar Yoga after account deletion.</li>
              <li>• To contact support about account deletion, email: <strong>support@swaryoga.com</strong></li>
            </ul>
          </section>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
                className="w-5 h-5 mt-1 rounded accent-orange-600"
              />
              <span className="text-gray-700">
                I understand that my account and all associated personal data will be permanently deleted. 
                I have read and agree to the retention policies for financial records as required by law.
              </span>
            </label>

            <button
              onClick={handleDeleteAccount}
              disabled={!confirmDelete || loading}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors ${
                confirmDelete && !loading
                  ? 'bg-red-600 hover:bg-red-700 cursor-pointer'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {loading ? 'Deleting Account...' : 'Permanently Delete My Account'}
            </button>

            <button
              onClick={() => window.history.back()}
              className="w-full py-3 px-4 rounded-lg font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              If you have any questions about the account deletion process or data retention, 
              please contact us at <strong>support@swaryoga.com</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
