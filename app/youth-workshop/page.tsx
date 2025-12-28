'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FormData {
  name: string;
  email: string;
  phoneNumber: string;
  state: string;
}

export default function YouthWorkshopPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phoneNumber: '',
    state: '',
  });

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
    'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Chandigarh',
    'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }
    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      setLoading(false);
      return;
    }
    if (!formData.state) {
      setError('Please select your state');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/youth-workshop/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form');
      }

      setSuccess(true);
      setFormData({ name: '', email: '', phoneNumber: '', state: '' });
      
      // Redirect to thank you after 2 seconds
      setTimeout(() => {
        router.push('/thankyou?workshop=youth');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-green-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-green-700">
            Swar Yoga
          </Link>
          <nav className="space-x-6 hidden md:flex">
            <Link href="/" className="text-gray-700 hover:text-green-700">Home</Link>
            <Link href="/workshops" className="text-gray-700 hover:text-green-700">Workshops</Link>
            <Link href="/contact" className="text-gray-700 hover:text-green-700">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Title Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">
              Youth Workshop Registration
            </h1>
            <p className="text-xl text-gray-700 mb-6">
              Join us for an enriching journey into yoga and wellness designed specifically for young adults.
            </p>
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <div className="bg-green-100 rounded-lg px-4 py-2">
                <p className="text-green-800 font-semibold">🧘 Beginner-Friendly</p>
              </div>
              <div className="bg-blue-100 rounded-lg px-4 py-2">
                <p className="text-blue-800 font-semibold">📱 Online & Offline</p>
              </div>
              <div className="bg-orange-100 rounded-lg px-4 py-2">
                <p className="text-orange-800 font-semibold">💪 Transform Your Life</p>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            {success ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-3xl font-bold text-green-700 mb-4">Thank You!</h2>
                <p className="text-gray-700 text-lg mb-2">
                  Your registration has been submitted successfully.
                </p>
                <p className="text-gray-600">
                  We'll contact you shortly with more details about the youth workshop.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-lg font-semibold text-green-800 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-lg font-semibold text-green-800 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* Phone Number Field */}
                <div>
                  <label htmlFor="phoneNumber" className="block text-lg font-semibold text-green-800 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                {/* State Field */}
                <div>
                  <label htmlFor="state" className="block text-lg font-semibold text-green-800 mb-2">
                    State *
                  </label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="">Select your state</option>
                    {states.map(state => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <p className="text-red-700 font-semibold">❌ {error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-4 px-6 rounded-lg transition duration-200 text-lg"
                >
                  {loading ? 'Registering...' : 'Register for Youth Workshop'}
                </button>

                <p className="text-center text-gray-600 text-sm">
                  All fields are required. We respect your privacy and will never share your information.
                </p>
              </form>
            )}
          </div>

          {/* Info Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="bg-green-50 rounded-lg p-6 border-l-4 border-green-600">
              <h3 className="text-xl font-bold text-green-800 mb-2">📅 Schedule</h3>
              <p className="text-gray-700">
                Flexible timing options available for busy students and professionals.
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-6 border-l-4 border-blue-600">
              <h3 className="text-xl font-bold text-blue-800 mb-2">👨‍🏫 Expert Instructors</h3>
              <p className="text-gray-700">
                Learn from experienced yoga instructors with years of teaching expertise.
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-6 border-l-4 border-orange-600">
              <h3 className="text-xl font-bold text-orange-800 mb-2">🎓 Certificate</h3>
              <p className="text-gray-700">
                Receive a certificate upon completion of the youth workshop program.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-green-800 text-white mt-16 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 Swar Yoga. All rights reserved.</p>
          <div className="mt-4 space-x-6">
            <Link href="/privacy" className="hover:text-green-200">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-green-200">Terms & Conditions</Link>
            <Link href="/contact" className="hover:text-green-200">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
