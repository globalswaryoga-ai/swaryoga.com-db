import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight, AlertCircle } from 'lucide-react';
import axios from 'axios';
import LanguageSelector from '../components/LanguageSelector';

interface RegistrationFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  selectedLanguage: string;
}

export default function RegistrationPage() {
  const { workshopId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedBatch = location.state?.selectedBatch;

  const [formData, setFormData] = useState<RegistrationFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    selectedLanguage: selectedBatch?.language || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!selectedBatch) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-4">Please select a batch first</p>
          <button
            onClick={() => navigate(`/workshop/${workshopId || ''}`)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      // Get current user ID from localStorage
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/signin');
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user.id || user._id;

      // Create enrollment
      const enrollmentResponse = await axios.post(
        '/api/enrollment',
        {
          workshopId,
          userId,
          batchId: selectedBatch._id,
          selectedMode: selectedBatch.mode,
          selectedLanguage: formData.selectedLanguage,
          phone: formData.phone,
          email: formData.email,
          name: formData.name
        },
        {
          headers: {
            'X-User-ID': userId
          }
        }
      );

      if (enrollmentResponse.data.success) {
        // Proceed to checkout
        navigate('/checkout', {
          state: {
            enrollment: enrollmentResponse.data.data,
            batch: selectedBatch
          }
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error registering for workshop');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Language Selector */}
      <LanguageSelector
        selectedLanguage={formData.selectedLanguage || 'English'}
        onLanguageChange={(lang) =>
          setFormData({ ...formData, selectedLanguage: lang })
        }
        availableLanguages={['English', 'Hindi', 'Marathi', 'Nepali']}
      />

      <div className="max-w-2xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8 text-gray-600">
          <span>Workshop</span>
          <ChevronRight className="w-4 h-4" />
          <span>Registration</span>
          <ChevronRight className="w-4 h-4" />
          <span>Payment</span>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Registration</h1>
          <p className="text-gray-600 mb-8">Step 1 of 3</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Batch Info */}
          <div className="mb-8 p-6 bg-indigo-50 border border-indigo-200 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Selected Batch Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Mode</p>
                <p className="font-semibold text-gray-800 capitalize">{selectedBatch.mode}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-semibold text-gray-800">
                  {new Date(selectedBatch.startDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="font-semibold text-gray-800">7 days</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Price</p>
                <p className="font-semibold text-indigo-600">₹ {selectedBatch.pricing.INR}</p>
              </div>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address (optional)
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  placeholder="Enter your address"
                />
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language *
                </label>
                <select
                  name="selectedLanguage"
                  value={formData.selectedLanguage}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  required
                >
                  <option value="">Select a language</option>
                  <option value="hindi">Hindi</option>
                  <option value="marathi">Marathi</option>
                  <option value="english">English</option>
                </select>
              </div>

              {/* Terms */}
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  className="w-4 h-4 mt-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-600"
                  required
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the terms and conditions and privacy policy
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      Next: Payment
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
