'use client';

import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface EnquiryFormModalProps {
  workshopId: string;
  workshopName: string;
  month: string;
  mode: string;
  language: string;
  onClose: () => void;
}

export default function EnquiryFormModal({
  workshopId,
  workshopName,
  month,
  mode,
  language,
  onClose,
}: EnquiryFormModalProps) {
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
      const res = await fetch('/api/workshop-enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workshopId,
          workshopName,
          month,
          mode,
          language,
          ...formData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Thank you! We will contact you soon.' });
        setFormData({
          name: '',
          mobile: '',
          email: '',
          gender: '',
          city: '',
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to submit enquiry' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error submitting enquiry. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="bg-green-700 text-white p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold">Enquiry Form</h2>
          <button
            onClick={onClose}
            className="hover:bg-green-600 p-1 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Workshop:</strong> {workshopName}
            </p>
            <p className="text-sm text-gray-700">
              <strong>For:</strong> {month} • {mode} • {language}
            </p>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg flex gap-3 ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              )}
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Mobile */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                Gender *
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter your city"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Submitting...' : 'Submit Enquiry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
