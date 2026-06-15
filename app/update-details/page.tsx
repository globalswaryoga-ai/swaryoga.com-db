'use client';

import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Search } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface DetailsForm {
  name: string;
  email: string;
  workshopName: string;
  city: string;
  state: string;
  country: string;
  language: string;
}

const EMPTY_FORM: DetailsForm = {
  name: '',
  email: '',
  workshopName: '',
  city: '',
  state: '',
  country: '',
  language: '',
};

export default function UpdateDetailsPage() {
  const [mobile, setMobile] = useState('');
  const [step, setStep] = useState<'lookup' | 'edit'>('lookup');
  const [form, setForm] = useState<DetailsForm>(EMPTY_FORM);
  const [leadNumber, setLeadNumber] = useState('');
  const [wasFound, setWasFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus(null);
    if (!mobile.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/leads/my-details?mobile=${encodeURIComponent(mobile.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Failed to look up details');
      }

      if (data.data.found) {
        setForm({
          name: data.data.name || '',
          email: data.data.email || '',
          workshopName: data.data.workshopName || '',
          city: data.data.city || '',
          state: data.data.state || '',
          country: data.data.country || '',
          language: data.data.language || '',
        });
        setLeadNumber(data.data.leadNumber || '');
        setWasFound(true);
      } else {
        setForm(EMPTY_FORM);
        setLeadNumber('');
        setWasFound(false);
      }
      setStep('edit');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus(null);

    if (!form.name.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/leads/my-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile.trim(), ...form }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Failed to save details');
      }

      setLeadNumber(data.data.leadNumber || leadNumber);
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        <section
          className="relative py-10 overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-green-500/10 rounded-full blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-gray-800/80 border border-gray-700 text-green-400 font-bold text-xs mb-4 tracking-wider uppercase">
                Update Your Details
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-green-500">
                Keep Your
                <span className="block text-yellow-400">Information Up To Date</span>
              </h1>
              <p className="text-base md:text-lg text-gray-400 leading-relaxed">
                Enter your mobile number to view and correct your details with us.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
            {status === 'success' ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-swar-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-swar-text mb-2">Thank you!</h2>
                <p className="text-swar-text-secondary mb-1">Your details have been updated successfully.</p>
                {leadNumber && (
                  <p className="text-swar-text-secondary text-sm">
                    Your ID: <strong>{leadNumber}</strong>
                  </p>
                )}
                <button
                  onClick={() => {
                    setStatus(null);
                    setStep('lookup');
                    setMobile('');
                    setForm(EMPTY_FORM);
                  }}
                  className="mt-6 text-swar-primary font-semibold underline"
                >
                  Update another number
                </button>
              </div>
            ) : step === 'lookup' ? (
              <form onSubmit={handleLookup} className="space-y-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-swar-text mb-2">Find Your Details</h2>
                <p className="text-swar-text-secondary text-sm">
                  Enter the mobile number registered with us. If we have a record, we&apos;ll show it so you can correct it.
                </p>

                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-swar-primary text-white font-semibold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60"
                >
                  <Search className="h-5 w-5" />
                  {loading ? 'Searching…' : 'Find My Details'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-swar-text mb-2">
                  {wasFound ? 'Review &amp; Correct Your Details' : 'Add Your Details'}
                </h2>
                <p className="text-swar-text-secondary text-sm">
                  {wasFound
                    ? 'We found a record for this number. Please correct anything that is wrong and submit.'
                    : "We don't have a record for this number yet. Please fill in your details below."}
                </p>

                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    value={mobile}
                    disabled
                    className="w-full border border-gray-200 bg-gray-50 rounded-lg px-4 py-2.5 text-swar-text-secondary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Workshop / Program Interest</label>
                  <input
                    type="text"
                    value={form.workshopName}
                    onChange={(e) => setForm({ ...form, workshopName: e.target.value })}
                    placeholder="e.g. Yoga Retreat 2025"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">Country</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => setForm({ ...form, country: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">Language</label>
                    <input
                      type="text"
                      value={form.language}
                      onChange={(e) => setForm({ ...form, language: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('lookup')}
                    className="flex-1 border border-gray-300 text-swar-text font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-swar-primary text-white font-semibold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60"
                  >
                    {submitting ? 'Saving…' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
