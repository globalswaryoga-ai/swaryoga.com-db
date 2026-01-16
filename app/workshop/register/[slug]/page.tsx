'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { workshopCatalog } from '@/lib/workshopsData';

export default function WorkshopRegisterPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const workshop = workshopCatalog.find((w) => w.slug === slug);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: '',
    source: 'workshop-registration-url',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setIsLoggedIn(true);
      // Auto-fill user data
      try {
        const userData = JSON.parse(user);
        setFormData((prev) => ({
          ...prev,
          firstName: userData.name?.split(' ')[0] || '',
          email: userData.email || '',
        }));
      } catch {}
    }
  }, []);

  if (!workshop) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20">
          <div className="container py-20">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Workshop Not Found</h1>
              <p className="text-gray-600 mb-8">The workshop you're trying to register for doesn't exist.</p>
              <button
                onClick={() => router.push('/workshops')}
                className="bg-swar-primary hover:bg-swar-primary-hover text-white px-8 py-3 rounded-lg transition-colors"
              >
                View All Workshops
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

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
      newErrors.phone = 'Phone is required';
    } else if (!/^\d{10,}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone must be at least 10 digits';
    }
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus('idle');
    setSubmitMessage('');

    if (!validateForm()) {
      setSubmitStatus('error');
      setSubmitMessage('Please fill in all required fields correctly');
      return;
    }

    setIsSubmitting(true);

    try {
      // First, add to cart
      const cartItem = {
        id: workshop.slug,
        name: workshop.name,
        price: workshop.batches?.[0]?.price || 4999,
        quantity: 1,
        currency: 'INR' as const,
        instructor: workshop.instructor,
        workshopSlug: workshop.slug,
      };

      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      const existingIndex = cart.findIndex((item: any) => item.id === workshop.slug);

      if (existingIndex > -1) {
        cart[existingIndex].quantity += 1;
      } else {
        cart.push(cartItem);
      }

      localStorage.setItem('cart', JSON.stringify(cart));

      // Then, submit registration data to CRM/Sales
      const response = await fetch('/api/crm/workshop-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('token') && {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }),
        },
        body: JSON.stringify({
          workshopSlug: workshop.slug,
          workshopName: workshop.name,
          ...formData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit registration');
      }

      const data = await response.json();

      setSubmitStatus('success');
      setSubmitMessage('Registration successful! Redirecting to checkout...');

      // Redirect to checkout after 2 seconds
      setTimeout(() => {
        router.push('/checkout');
      }, 2000);
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitStatus('error');
      setSubmitMessage(
        error instanceof Error ? error.message : 'Failed to register. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-gray-50">
        <div className="container py-12 sm:py-20">
          <button
            onClick={() => router.back()}
            className="mb-8 flex items-center gap-2 text-swar-primary hover:text-swar-primary-hover font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-swar-primary to-swar-primary-hover text-white p-8">
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Register for Workshop</h1>
                <p className="text-lg text-white/90">{workshop.name}</p>
                <p className="text-sm text-white/80 mt-2">Price: ₹{workshop.batches?.[0]?.price || 4999}</p>
              </div>

              {/* Form */}
              <div className="p-8 sm:p-12">
                {submitStatus === 'success' && (
                  <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900">{submitMessage}</p>
                    </div>
                  </div>
                )}

                {submitStatus === 'error' && (
                  <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">{submitMessage}</p>
                    </div>
                  </div>
                )}

                {!isLoggedIn && (
                  <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> You can fill this form and proceed to checkout. You'll be able to create an account or sign in during payment.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-semibold text-gray-900 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary ${
                          errors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-semibold text-gray-900 mb-2">
                        Last Name (Optional)
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                        placeholder="Doe"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="john@example.com"
                    />
                    {errors.email && (
                      <p className="text-red-600 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-900 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="98765 43210"
                    />
                    {errors.phone && (
                      <p className="text-red-600 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-semibold text-gray-900 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary ${
                          errors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Bangalore"
                      />
                      {errors.city && (
                        <p className="text-red-600 text-sm mt-1">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-semibold text-gray-900 mb-2">
                        State (Optional)
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                        placeholder="Karnataka"
                      />
                    </div>
                  </div>

                  {/* Country */}
                  <div>
                    <label htmlFor="country" className="block text-sm font-semibold text-gray-900 mb-2">
                      Country (Optional)
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-swar-primary"
                      placeholder="India"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-swar-primary to-swar-primary-hover hover:from-swar-primary-hover hover:to-swar-primary text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Register & Add to Cart</span>
                        <span>→</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Registration Link Info */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-700">
                    <strong>Share this link:</strong> Anyone can use this URL to register for this workshop.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <input
                      type="text"
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/workshop/register/${workshop.slug}` : ''}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const url = typeof window !== 'undefined' ? `${window.location.origin}/workshop/register/${workshop.slug}` : '';
                        navigator.clipboard.writeText(url);
                        alert('Link copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-swar-primary text-white rounded font-semibold hover:bg-swar-primary-hover transition-colors text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
