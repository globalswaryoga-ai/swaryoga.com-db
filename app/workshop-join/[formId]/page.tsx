'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Loader, Calendar, Clock } from 'lucide-react';

interface FormData {
  formId: string;
  workshopName: string;
  workshopDate: string;
  workshopTime: string;
  workshopMode: string;
  description: string;
  workshopImage: string;
}

const MODE_ICONS: Record<string, string> = { online: '💻', offline: '📍', residential: '🏡', recorded: '🎥' };
const MODE_LABELS: Record<string, string> = { online: 'Online', offline: 'Offline', residential: 'Residential', recorded: 'Recorded' };

export default function JoinFormPage() {
  const { formId } = useParams<{ formId: string }>();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [formLoading, setFormLoading] = useState(true);
  const [formError, setFormError] = useState('');

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!formId) return;
    fetch(`/api/workshop-join/${formId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) throw new Error(data.error || 'Form not found');
        setFormData(data.form);
      })
      .catch((e) => setFormError(e.message))
      .finally(() => setFormLoading(false));
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/workshop-join/${formId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile: '+91' + mobile, email, city, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (formLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8]">
        <Loader className="animate-spin text-[#2d6a4f]" size={32} />
      </div>
    );
  }

  if (formError || !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-500 text-sm">This link may have expired or been deactivated.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          {formData.workshopImage && (
            <img src={formData.workshopImage} alt={formData.workshopName} className="w-full h-40 object-cover rounded-2xl mb-6" />
          )}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You're Registered! 🎉</h1>
          <p className="text-gray-600 mb-1">Thank you, <strong>{name.split(' ')[0]}</strong>!</p>
          <p className="text-gray-500 text-sm">
            We'll contact you on WhatsApp with details for <strong>{formData.workshopName}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Workshop Image Banner */}
        {formData.workshopImage ? (
          <div className="relative">
            <img
              src={formData.workshopImage}
              alt={formData.workshopName}
              className="w-full h-52 object-cover"
            />
            {/* Gradient overlay with workshop info */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1b4332]/90 via-[#1b4332]/40 to-transparent flex flex-col justify-end px-7 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-semibold text-white">
                  {MODE_ICONS[formData.workshopMode]} {MODE_LABELS[formData.workshopMode] || formData.workshopMode}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">{formData.workshopName}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-white/80 text-xs">
                {formData.workshopDate && (
                  <span className="flex items-center gap-1"><Calendar size={11} />{formData.workshopDate}</span>
                )}
                {formData.workshopTime && (
                  <span className="flex items-center gap-1"><Clock size={11} />{formData.workshopTime}</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Fallback header without image */
          <div className="bg-[#2d6a4f] px-8 py-7 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-semibold">
                {MODE_ICONS[formData.workshopMode]} {MODE_LABELS[formData.workshopMode] || formData.workshopMode}
              </span>
            </div>
            <h1 className="text-xl font-bold mb-2">{formData.workshopName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/80 text-sm">
              {formData.workshopDate && (
                <span className="flex items-center gap-1.5"><Calendar size={13} />{formData.workshopDate}</span>
              )}
              {formData.workshopTime && (
                <span className="flex items-center gap-1.5"><Clock size={13} />{formData.workshopTime}</span>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {formData.description && (
          <div className="px-8 py-4 bg-[#f7faf8] border-b border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{formData.description}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800">Join Now — Fill Your Details</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp Number *</label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center w-16 h-11 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 shrink-0">
                +91
              </div>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                required
                pattern="\d{10}"
                title="Enter 10-digit mobile number"
                className="flex-1 h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Email <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Your city"
                required
                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country *</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country"
                required
                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#2d6a4f] text-white rounded-xl font-bold text-sm hover:bg-[#1b4332] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Join Now →'}
          </button>

          <p className="text-center text-xs text-gray-400 pb-1">
            We'll contact you on WhatsApp within 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
}
