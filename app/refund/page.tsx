'use client';

import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { AlertCircle, RefreshCw, Home, Mail } from 'lucide-react';
import { useState } from 'react';

export default function RefundPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    transactionId: '',
    workshopName: '',
    reason: 'changed-mind',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/refund/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          transactionId: '',
          workshopName: '',
          reason: 'changed-mind',
          message: '',
        });
      } else {
        alert('Error submitting refund request. Please try again.');
      }
    } catch (error) {
      console.error('Refund request error:', error);
      alert('Error submitting refund request. Please try again.');
    }
  };

  return (
    <div className="bg-white min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            // Success Message
            <div className="bg-white rounded-xl shadow-lg border-2 border-swar-primary overflow-hidden">
              <div className="bg-gradient-to-r from-swar-primary-light to-white p-8 sm:p-12 text-center">
                <RefreshCw className="w-16 h-16 text-swar-primary mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-swar-primary mb-2">Refund Request Received</h1>
                <p className="text-lg text-swar-text-secondary">
                  We've received your refund request and will process it within 5-7 business days.
                </p>
              </div>
              <div className="p-8 sm:p-12">
                <div className="bg-swar-primary-light rounded-lg p-6 mb-8">
                  <h3 className="font-semibold text-swar-text mb-3">What Happens Next?</h3>
                  <ol className="space-y-2 text-swar-text-secondary text-sm">
                    <li className="flex gap-3">
                      <span className="font-bold text-swar-primary">1.</span>
                      <span>We'll review your refund request</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-swar-primary">2.</span>
                      <span>Send you a confirmation email</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-swar-primary">3.</span>
                      <span>Process the refund to your original payment method</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-bold text-swar-primary">4.</span>
                      <span>The amount will appear in your account within 5-7 days</span>
                    </li>
                  </ol>
                </div>

                <Link
                  href="/"
                  className="block w-full bg-swar-primary hover:bg-swar-primary-hover text-white py-3 rounded-lg font-semibold transition text-center flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Back to Home
                </Link>
              </div>
            </div>
          ) : (
            // Refund Form
            <div className="bg-white rounded-xl shadow-lg border border-swar-border p-8 sm:p-12">
              <div className="flex gap-4 mb-6">
                <AlertCircle className="w-8 h-8 text-swar-accent flex-shrink-0 mt-1" />
                <div>
                  <h1 className="text-2xl font-bold text-swar-text mb-2">Request a Refund</h1>
                  <p className="text-swar-text-secondary">
                    We're sorry to see you go. Please fill out the form below with your refund request details.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="font-semibold text-swar-text mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email Address *"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      required
                    />
                  </div>
                </div>

                {/* Payment Information */}
                <div className="border-t border-swar-border pt-6">
                  <h3 className="font-semibold text-swar-text mb-4">Payment Information</h3>
                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="Transaction ID / Order ID *"
                      value={formData.transactionId}
                      onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                      className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Workshop Name *"
                      value={formData.workshopName}
                      onChange={(e) => setFormData({ ...formData, workshopName: e.target.value })}
                      className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      required
                    />
                  </div>
                </div>

                {/* Refund Reason */}
                <div className="border-t border-swar-border pt-6">
                  <h3 className="font-semibold text-swar-text mb-4">Reason for Refund</h3>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  >
                    <option value="changed-mind">Changed my mind</option>
                    <option value="workshop-issue">Issue with workshop</option>
                    <option value="duplicate">Duplicate payment</option>
                    <option value="other">Other reason</option>
                  </select>
                </div>

                {/* Additional Message */}
                <div className="border-t border-swar-border pt-6">
                  <h3 className="font-semibold text-swar-text mb-4">Additional Comments (Optional)</h3>
                  <textarea
                    placeholder="Tell us more about your refund request..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                  />
                </div>

                {/* Important Info */}
                <div className="bg-swar-primary-light rounded-lg p-4 border border-swar-border">
                  <h4 className="font-semibold text-swar-text mb-2">Important Information</h4>
                  <ul className="text-sm text-swar-text-secondary space-y-1">
                    <li>• Refunds are processed within 5-7 business days</li>
                    <li>• Payment fees are non-refundable</li>
                    <li>• Refunds are credited to your original payment method</li>
                    <li>• Once approved, you cannot access workshop materials</li>
                  </ul>
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-swar-border">
                  <button
                    type="submit"
                    className="flex-1 bg-swar-accent hover:bg-swar-accent-hover text-white py-3 rounded-lg font-semibold transition"
                  >
                    Submit Refund Request
                  </button>
                  <Link
                    href="/"
                    className="flex-1 border-2 border-swar-primary text-swar-primary hover:bg-swar-primary-light py-3 rounded-lg font-semibold transition text-center"
                  >
                    Cancel
                  </Link>
                </div>
              </form>

              {/* Support */}
              <div className="mt-8 pt-8 border-t border-swar-border text-center">
                <p className="text-swar-text-secondary mb-3">
                  Have questions about refunds?
                </p>
                <a
                  href="mailto:support@swaryoga.com"
                  className="inline-flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover font-semibold transition"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
