'use client';

import React, { useState } from 'react';
import { Phone, AlertCircle, CheckCircle } from 'lucide-react';

interface EnquiryFormProps {
  workshopId: string;
  workshopName: string;
  onSuccess?: () => void;
}

export default function EnquiryForm({ workshopId, workshopName, onSuccess }: EnquiryFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
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
      const response = await fetch('/api/admin/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workshopId,
          workshopName,
          ...formData,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit enquiry');
      }

      setMessage({
        type: 'success',
        text: 'Thank you! We will notify you when the schedule is announced.',
      });

      // Reset form
      setFormData({
        name: '',
        mobile: '',
        gender: '',
        city: '',
      });

      // Call success callback if provided
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit enquiry',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-lg mx-auto">
      <div className="mb-6 text-center">
        <h3 className="text-2xl md:text-3xl font-bold text-swar-text mb-2">
          Interested in {workshopName}?
        </h3>
        <p className="text-swar-text-secondary">
          Dates will be announced soon. Fill this form to get notified when schedules are available.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success'
              ? 'bg-swar-primary-light border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-swar-primary flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p
            className={`text-sm ${
              message.type === 'success' ? 'text-swar-primary' : 'text-swar-primary'
            }`}
          >
            {message.text}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-swar-text mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter your full name"
            className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Mobile Field */}
        <div>
          <label htmlFor="mobile" className="block text-sm font-semibold text-swar-text mb-2">
            Mobile Number *
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-swar-text-secondary" />
            <input
              type="tel"
              id="mobile"
              name="mobile"
              value={formData.mobile}
              onChange={handleChange}
              placeholder="Enter your 10-digit mobile number"
              className="w-full pl-10 pr-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
            />
          </div>
        </div>

        {/* Gender Field */}
        <div>
          <label htmlFor="gender" className="block text-sm font-semibold text-swar-text mb-2">
            Gender *
          </label>
          <select
            id="gender"
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          >
            <option value="">Select Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        {/* City Field */}
        <div>
          <label htmlFor="city" className="block text-sm font-semibold text-swar-text mb-2">
            City *
          </label>
          <input
            type="text"
            id="city"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Enter your city"
            className="w-full px-4 py-2 border border-swar-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-swar-primary hover:bg-swar-primary-hover active:scale-95'
          }`}
        >
          {loading ? 'Submitting...' : 'Notify Me When Available'}
        </button>
      </form>

      <p className="text-xs text-swar-text-secondary text-center mt-4">
        We will send you an email and SMS when the schedule is announced.
      </p>
    </div>
  );
}
