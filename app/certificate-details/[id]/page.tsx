'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, AlertCircle, Upload } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

interface DetailsForm {
  certificateTitle: string;
  certificateName: string;
  certificateAddress: string;
  certificateMobile: string;
  certificatePlace: string;
  certificatePincode: string;
  certificateState: string;
  certificateCountry: string;
}

const EMPTY_FORM: DetailsForm = {
  certificateTitle: 'Mr',
  certificateName: '',
  certificateAddress: '',
  certificateMobile: '',
  certificatePlace: '',
  certificatePincode: '',
  certificateState: '',
  certificateCountry: '',
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function formatDate(d?: string | Date) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function CertificateDetailsPage() {
  const params = useParams();
  const rawId = params?.id as string;
  // /certificate-details/lead-<leadId> resolves via leadId; anything else is treated as saleId
  const isLead = rawId?.startsWith('lead-');
  const refId = isLead ? rawId.slice('lead-'.length) : rawId;

  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(false);
  const [saleId, setSaleId] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [date, setDate] = useState('');
  const [form, setForm] = useState<DetailsForm>(EMPTY_FORM);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!refId) return;
    const fetchDetails = async () => {
      try {
        const qs = isLead ? `leadId=${encodeURIComponent(refId)}` : `saleId=${encodeURIComponent(refId)}`;
        const res = await fetch(`/api/certificate-details?${qs}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data?.error || 'Failed to load');

        if (data.data.found) {
          setFound(true);
          setSaleId(data.data.saleId || '');
          setWorkshopName(data.data.workshopName || '');
          setDate(data.data.date || '');
          setForm({
            certificateTitle: data.data.certificateTitle || 'Mr',
            certificateName: data.data.certificateName || '',
            certificateAddress: data.data.certificateAddress || '',
            certificateMobile: data.data.certificateMobile || '',
            certificatePlace: data.data.certificatePlace || '',
            certificatePincode: data.data.certificatePincode || '',
            certificateState: data.data.certificateState || '',
            certificateCountry: data.data.certificateCountry || '',
          });
          setPhotoUrl(data.data.certificatePhotoUrl || '');
        } else {
          setFound(false);
        }
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [refId, isLead]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setErrorMessage(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 5 MB.`);
      return;
    }
    setErrorMessage('');
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStatus(null);

    if (!form.certificateName.trim()) {
      setErrorMessage('Please enter your name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/certificate-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saleId: saleId || (isLead ? undefined : refId),
          leadId: isLead ? refId : undefined,
          ...form,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || 'Failed to save details');

      const resolvedSaleId = data.data.saleId || saleId;

      if (photoFile && resolvedSaleId) {
        const fd = new FormData();
        fd.append('file', photoFile);
        fd.append('saleId', resolvedSaleId);
        const photoRes = await fetch('/api/certificate-details/photo', { method: 'POST', body: fd });
        const photoData = await photoRes.json();
        if (!photoRes.ok || !photoData.success) throw new Error(photoData?.error || 'Failed to upload photo');
        setPhotoUrl(photoData.data.certificatePhotoUrl || '');
      }

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
                Certificate Details
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight text-green-500">
                Complete Your
                <span className="block text-yellow-400">Certificate of Participation</span>
              </h1>
              <p className="text-base md:text-lg text-gray-400 leading-relaxed">
                Please provide your details exactly as they should appear on your certificate, and upload your photo.
              </p>
            </div>
          </div>
        </section>

        <div className="container mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8">
            {loading ? (
              <p className="text-center text-swar-text-secondary py-10">Loading…</p>
            ) : !found ? (
              <div className="text-center py-10">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-swar-text mb-2">Record Not Found</h2>
                <p className="text-swar-text-secondary">
                  We couldn&apos;t find a certificate record for this link. Please contact us if you believe this is a mistake.
                </p>
              </div>
            ) : status === 'success' ? (
              <div className="text-center py-6">
                <CheckCircle className="h-12 w-12 text-swar-primary mx-auto mb-4" />
                <h2 className="text-xl font-bold text-swar-text mb-2">Thank you!</h2>
                <p className="text-swar-text-secondary">Your certificate details have been saved successfully.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-swar-text mb-2">Your Details</h2>

                {(workshopName || date) && (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-swar-text-secondary">
                    {workshopName && <p><strong>Workshop:</strong> {workshopName}</p>}
                    {date && <p><strong>Date:</strong> {formatDate(date)}</p>}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 text-sm">{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">Title</label>
                    <select
                      value={form.certificateTitle}
                      onChange={(e) => setForm({ ...form, certificateTitle: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    >
                      <option value="Mr">Mr</option>
                      <option value="Miss">Miss</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-swar-text mb-2">Name (in English) *</label>
                    <input
                      type="text"
                      value={form.certificateName}
                      onChange={(e) => setForm({ ...form, certificateName: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Address</label>
                  <textarea
                    value={form.certificateAddress}
                    onChange={(e) => setForm({ ...form, certificateAddress: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Mobile Number</label>
                  <input
                    type="tel"
                    value={form.certificateMobile}
                    onChange={(e) => setForm({ ...form, certificateMobile: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">Place</label>
                    <input
                      type="text"
                      value={form.certificatePlace}
                      onChange={(e) => setForm({ ...form, certificatePlace: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">Pincode</label>
                    <input
                      type="text"
                      value={form.certificatePincode}
                      onChange={(e) => setForm({ ...form, certificatePincode: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">State</label>
                    <input
                      type="text"
                      value={form.certificateState}
                      onChange={(e) => setForm({ ...form, certificateState: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-swar-text mb-2">Country</label>
                    <input
                      type="text"
                      value={form.certificateCountry}
                      onChange={(e) => setForm({ ...form, certificateCountry: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-swar-text mb-2">Your Photo (max 5 MB)</label>
                  <div className="flex items-center gap-4">
                    {(photoPreview || photoUrl) && (
                      <img
                        src={photoPreview || photoUrl}
                        alt="Preview"
                        className="w-20 h-24 object-cover border border-gray-300 rounded"
                      />
                    )}
                    <label className="flex-1 flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 text-sm text-swar-text-secondary">
                      <Upload className="h-5 w-5" />
                      {photoFile ? photoFile.name : 'Choose photo to upload'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-swar-primary text-white font-semibold py-3 rounded-lg hover:opacity-90 transition disabled:opacity-60"
                >
                  {submitting ? 'Saving…' : 'Submit'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
