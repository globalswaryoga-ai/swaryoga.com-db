'use client';

import React, { useState } from 'react';
import { X, Phone, AlertCircle, CheckCircle } from 'lucide-react';

interface BookSeatModalProps {
  workshopId: string;
  workshopName: string;
  mode: 'online' | 'offline' | 'residential' | 'recorded';
  language: string;
  month: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookSeatModal({
  workshopId,
  workshopName,
  mode,
  language,
  month,
  onClose,
  onSuccess,
}: BookSeatModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    gender: '',
    city: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      setLoading(false);
      return;
    }

    if (!formData.mobile.trim() || formData.mobile.length < 10) {
      setMessage({ type: 'error', text: 'Valid mobile number (10+ digits) is required' });
      setLoading(false);
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setMessage({ type: 'error', text: 'Valid email is required' });
      setLoading(false);
      return;
    }

    if (!formData.gender) {
      setMessage({ type: 'error', text: 'Please select gender' });
      setLoading(false);
      return;
    }

    if (!formData.city.trim()) {
      setMessage({ type: 'error', text: 'City is required' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshopId,
          workshopName,
          mode,
          language,
          month,
          name: formData.name.trim(),
          mobile: formData.mobile.trim(),
          email: formData.email.trim(),
          gender: formData.gender,
          city: formData.city.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || 'Failed to submit inquiry');
      }

      setMessage({ type: 'success', text: 'Your inquiry has been submitted successfully!' });
      setFormData({ name: '', mobile: '', email: '', gender: '', city: '' });

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'An error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-swar-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-swar-border bg-swar-primary-light">
          <h2 className="text-lg font-extrabold text-swar-text">Book Your Seat</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-white/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-swar-text" />
          </button>
        </div>

        {/* Workshop Info */}
        <div className="px-6 py-4 bg-swar-bg border-b border-swar-border">
          <h3 className="text-sm font-extrabold text-swar-text mb-1">{workshopName}</h3>
          <p className="text-xs text-swar-text-secondary">
            {mode.charAt(0).toUpperCase() + mode.slice(1)} • {language} • {month}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swar-primary"
            />
          </div>

          {/* Mobile */}
          <div>
            <label htmlFor="mobile" className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
              Mobile Number *
            </label>
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="10 digit mobile number"
              className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swar-primary"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your@email.com"
              className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swar-primary"
            />
          </div>

          {/* Gender */}
          <div>
            <label htmlFor="gender" className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
              Gender *
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-swar-primary"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* City */}
          <div>
            <label htmlFor="city" className="block text-xs font-bold uppercase tracking-wide text-swar-text-secondary mb-1">
              City *
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Your city"
              className="w-full rounded-lg border border-swar-border bg-white px-3 py-2 text-sm font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-swar-primary"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg px-4 py-3 text-sm font-extrabold transition-all ${
              loading
                ? 'bg-gray-300 text-swar-text-secondary cursor-not-allowed'
                : 'bg-swar-primary text-white hover:bg-swar-primary hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]'
            }`}
          >
            {loading ? 'Submitting...' : 'Submit Inquiry'}
          </button>

          <p className="text-xs text-swar-text-secondary text-center">
            We will contact you soon about seat availability.
          </p>
        </form>
      </div>
    </div>
  );
}
