'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/context/CartContext';
import { X, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface WorkshopRegistrationFormProps {
  workshopId: string;
  workshopName: string;
  workshopPrice: number;
  workshopInstructor?: string;
  workshopLevel?: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function WorkshopRegistrationForm({
  workshopId,
  workshopName,
  workshopPrice,
  workshopInstructor = 'Expert Instructor',
  workshopLevel = 'Beginner',
  onSuccess,
  onClose,
}: WorkshopRegistrationFormProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be at least 10 digits';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      // Redirect to signin with return URL
      router.push(`/signin?redirect=checkout`);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Add item to cart
      addToCart({
        id: workshopId,
        name: workshopName,
        price: workshopPrice,
        quantity: 1,
        instructor: workshopInstructor,
        level: workshopLevel,
        registeredName: `${formData.firstName} ${formData.lastName}`.trim(),
        registeredEmail: formData.email,
        registeredPhone: formData.phone,
        registeredCity: formData.city,
        registeredAt: new Date().toISOString(),
        workshopSlug: workshopId,
      });

      setSubmitSuccess(true);

      // Redirect to date selection page
      setTimeout(() => {
        router.push(`/workshop/${workshopId}/select-date`);
      }, 1500);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to register for workshop. Please try again.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Register for Workshop</h3>
          <p className="text-sm text-gray-600 mt-1">{workshopName}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* Success State */}
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-500 rounded-lg flex gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          <div>
            <p className="font-bold text-green-900">Registration Successful!</p>
            <p className="text-sm text-green-700">Redirecting to select batch date...</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={24} />
          <div>
            <p className="font-bold text-red-900">Registration Error</p>
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {/* Form */}
      {!submitSuccess && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workshop Info Card */}
          <div className="bg-gradient-to-r from-yoga-600 to-yoga-700 text-white p-4 rounded-lg mb-6">
            <p className="text-sm opacity-90">Workshop Price:</p>
            <p className="text-2xl font-bold">₹{workshopPrice.toLocaleString('en-IN')}</p>
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="Your first name"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.firstName
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-yoga-600'
              }`}
            />
            {errors.firstName && (
              <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Last Name <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Your last name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-yoga-600 transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-yoga-600'
              }`}
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="9876543210"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.phone
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-yoga-600'
              }`}
            />
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="Your city"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors ${
                errors.city
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-300 focus:border-yoga-600'
              }`}
            />
            {errors.city && (
              <p className="text-red-600 text-sm mt-1">{errors.city}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 active:scale-95'
            }`}
          >
            {isSubmitting && <Loader size={20} className="animate-spin" />}
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>

          {/* Info Text */}
          <p className="text-xs text-gray-600 text-center">
            By registering, you agree to our Terms of Service and Privacy Policy
          </p>
        </form>
      )}
    </div>
  );
}
