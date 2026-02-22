'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { COMMUNITY_DESIGNS } from '@/lib/communityColorSystem';

const COUNTRY_OPTIONS = [
  { value: 'India', label: '🇮🇳 India', code: '+91' },
  { value: 'Nepal', label: '🇳🇵 Nepal', code: '+977' },
  { value: 'USA', label: '🇺🇸 USA', code: '+1' },
  { value: 'UK', label: '🇬🇧 UK', code: '+44' },
  { value: 'Canada', label: '🇨🇦 Canada', code: '+1' },
  { value: 'Australia', label: '🇦🇺 Australia', code: '+61' },
  { value: 'UAE', label: '🇦🇪 UAE', code: '+971' },
  { value: 'Singapore', label: '🇸🇬 Singapore', code: '+65' },
  { value: 'Germany', label: '🇩🇪 Germany', code: '+49' },
  { value: 'Other', label: '🌍 Other', code: '+' },
];

export default function JoinCommunityPage() {
  const params = useParams();
  const communityId = params.communityId as string;

  // Find community design info
  const communityDesign = COMMUNITY_DESIGNS.find(c => c.id === communityId);
  const communityName = communityDesign?.name || communityId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    country: 'India',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const selectedCountry = COUNTRY_OPTIONS.find(c => c.value === formData.country);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    const cleanMobile = formData.mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    if (!formData.country) {
      setError('Please select your country');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/community/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          mobile: formData.mobile,
          country: formData.country,
          countryCode: selectedCountry?.code || '+91',
          communityId,
          communityName,
          viaInviteLink: true,
        }),
      });

      const result = await response.json();

      if (!response.ok && response.status !== 200) {
        setError(result.error || 'Failed to join community');
        return;
      }

      // Store user data locally
      if (result?.data?.token) {
        localStorage.setItem('token', result.data.token);
      }
      localStorage.setItem('community_user', JSON.stringify({
        name: formData.name.trim(),
        mobile: formData.mobile,
        userId: result?.data?.userId,
        _id: result?.data?.userId,
      }));

      setSuccessMessage(result.message || 'Successfully joined!');
      setSuccess(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!communityId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <p className="text-red-600 font-semibold text-lg">Invalid community link</p>
          <p className="text-gray-500 mt-2">Please use the link shared with you.</p>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in-95">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h2>
          <p className="text-gray-600 mb-4">{successMessage}</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
            <p className="text-sm text-green-800 font-medium">
              🕉️ Welcome to <strong>{communityName}</strong>
            </p>
            {communityId !== 'global' && (
              <p className="text-xs text-green-600 mt-2">
                Admin will review and approve your membership shortly.
              </p>
            )}
          </div>
          <a
            href="/community"
            className="inline-block w-full py-3 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg"
          >
            Go to Community →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className={`bg-gradient-to-r ${communityDesign?.color?.gradient || 'from-green-600 to-emerald-600'} p-6 text-white`}>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-inner">
              <span className="text-3xl">🕉️</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Join {communityName}</h1>
              <p className="text-sm opacity-90 mt-1">
                {communityDesign?.description || 'Connect with the Swar Yoga community'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              👤 Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 transition-all"
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📱 Phone / WhatsApp Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-3 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-600 text-sm font-medium min-w-[60px] justify-center">
                {selectedCountry?.code || '+91'}
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="flex-1 px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-400 transition-all"
                required
              />
            </div>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🌍 Country <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-lg"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Joining...
              </>
            ) : (
              '🙏 Join Community'
            )}
          </button>

          <p className="text-xs text-gray-400 text-center mt-3">
            By joining, you agree to the community guidelines.
            {communityId !== 'global' && ' Your membership will be reviewed by admin.'}
          </p>
        </form>
      </div>
    </div>
  );
}
