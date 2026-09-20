'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader, ChevronDown, ExternalLink, CreditCard } from 'lucide-react';

interface Workshop {
  id: string;
  name: string;
}

interface DynamicQuestion {
  _id: string;
  fieldKey: string;
  questionType: 'text' | 'paragraph' | 'dropdown' | 'radio' | 'checkbox' | 'info' | 'payment';
  label: { en: string };
  placeholder?: { en?: string };
  options?: Array<{ value: string; label: { en: string } }>;
  imageUrl?: string;
  qrCodeUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  paymentConfig?: {
    gateway: 'razorpay' | 'custom';
    paymentUrl?: string;
    amount?: number;
    currency?: string;
    buttonLabel?: string;
    description?: string;
  };
  required: boolean;
}

function EnquiryForm() {
  const searchParams = useSearchParams();
  const preWorkshopId = searchParams.get('workshopId') || searchParams.get('w') || '';
  const preWorkshopName = searchParams.get('workshopName') || '';

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(true);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string | string[]>>({});

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [workshopId, setWorkshopId] = useState(preWorkshopId);
  const [workshopName, setWorkshopName] = useState(preWorkshopName);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Load workshops
  useEffect(() => {
    fetch('/api/workshops/list')
      .then(r => r.json())
      .then(data => {
        const list: Workshop[] = (data.data || []).map((w: any) => ({ id: w.id, name: w.name }));
        setWorkshops(list);
        if (preWorkshopId && !preWorkshopName) {
          const found = list.find(w => w.id === preWorkshopId);
          if (found) setWorkshopName(found.name);
        }
        if (!preWorkshopId && preWorkshopName) {
          const found = list.find(w => w.name === preWorkshopName);
          if (found) setWorkshopId(found.id);
        }
      })
      .catch(() => {})
      .finally(() => setWorkshopsLoading(false));
  }, []);

  // Load dynamic questions for 'enquiry' form type
  useEffect(() => {
    fetch('/api/admin/form-questions?formType=enquiry')
      .then(r => r.json())
      .then(data => {
        const qs: DynamicQuestion[] = (data.questions || []).filter((q: any) => q.isActive);
        setDynamicQuestions(qs);
        // Pre-initialise answers
        const init: Record<string, string | string[]> = {};
        qs.forEach(q => {
          init[q.fieldKey] = q.questionType === 'checkbox' ? [] : '';
        });
        setDynamicAnswers(init);
      })
      .catch(() => {});
  }, []);

  const handleWorkshopChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setWorkshopId(id);
    const found = workshops.find(w => w.id === id);
    setWorkshopName(found?.name || '');
  };

  const setAnswer = (key: string, value: string) => {
    setDynamicAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleCheckbox = (key: string, value: string) => {
    setDynamicAnswers(prev => {
      const current = (prev[key] as string[]) || [];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) { setError('Please select your gender.'); return; }
    if (!workshopId) { setError('Please select a workshop.'); return; }

    // Validate required dynamic questions
    for (const q of dynamicQuestions) {
      if (!q.required) continue;
      if (q.questionType === 'info' || q.questionType === 'payment') continue;
      const val = dynamicAnswers[q.fieldKey];
      const isEmpty = Array.isArray(val) ? val.length === 0 : !String(val || '').trim();
      if (isEmpty) { setError(`Please answer: ${q.label.en}`); return; }
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mobile: '+91' + mobile,
          gender,
          city,
          workshopId,
          workshopName,
          dynamicAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You, {name.split(' ')[0]}!</h1>
          <p className="text-gray-600 mb-2">Enquiry received for <strong>{workshopName}</strong>.</p>
          <p className="text-gray-500 text-sm">Our team will contact you on WhatsApp shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#2d6a4f] px-8 py-7 text-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">🧘</span>
            <span className="font-semibold text-white/80 text-sm">Swar Yoga</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Workshop Enquiry</h1>
          <p className="text-white/70 text-sm">Fill in your details and we'll reach out on WhatsApp.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          {/* Workshop selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Workshop *</label>
            <div className="relative">
              <select
                value={workshopId}
                onChange={handleWorkshopChange}
                required
                disabled={workshopsLoading}
                className="w-full h-12 px-4 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f] appearance-none bg-white disabled:bg-gray-50"
              >
                <option value="">{workshopsLoading ? 'Loading workshops…' : 'Choose a workshop'}</option>
                {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Enter your full name" required
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp Number *</label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center w-16 h-12 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 shrink-0">+91</div>
              <input
                type="tel" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210" required pattern="\d{10}" title="Enter 10-digit mobile number"
                className="flex-1 h-12 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender *</label>
            <div className="grid grid-cols-3 gap-2">
              {['Male', 'Female', 'Other'].map(g => (
                <button key={g} type="button" onClick={() => setGender(g.toLowerCase())}
                  className={`h-12 rounded-xl text-sm font-semibold border-2 transition-all ${gender === g.toLowerCase() ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#2d6a4f]/50'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
            <input
              type="text" value={city} onChange={e => setCity(e.target.value)}
              placeholder="Your city" required
              className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
            />
          </div>

          {/* ── Dynamic Questions ── */}
          {dynamicQuestions.map(q => (
            <div key={q._id} className="space-y-2">
              {/* Question image */}
              {q.imageUrl && (
                <img src={q.imageUrl} alt="" className="w-full max-h-48 object-cover rounded-xl border border-gray-100" />
              )}

              {/* Label */}
              {q.questionType !== 'info' && (
                <label className="block text-sm font-semibold text-gray-700">
                  {q.label.en}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}

              {/* QR + Link */}
              {(q.qrCodeUrl || q.linkUrl) && (
                <div className="flex items-center gap-4 flex-wrap">
                  {q.qrCodeUrl && (
                    <img src={q.qrCodeUrl} alt="QR Code" className="w-28 h-28 object-cover rounded-xl border border-gray-200" />
                  )}
                  {q.linkUrl && (
                    <a
                      href={q.linkUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2d6a4f] text-white text-sm font-semibold rounded-xl hover:bg-[#1b4332] transition-colors shadow"
                    >
                      <ExternalLink size={14} />
                      {q.linkLabel || 'Open Link'}
                    </a>
                  )}
                </div>
              )}

              {/* Input rendering */}
              {q.questionType === 'text' && (
                <input
                  value={(dynamicAnswers[q.fieldKey] as string) || ''}
                  onChange={e => setAnswer(q.fieldKey, e.target.value)}
                  placeholder={q.placeholder?.en || ''}
                  required={q.required}
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]"
                />
              )}

              {q.questionType === 'paragraph' && (
                <textarea
                  value={(dynamicAnswers[q.fieldKey] as string) || ''}
                  onChange={e => setAnswer(q.fieldKey, e.target.value)}
                  placeholder={q.placeholder?.en || ''}
                  required={q.required}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f] resize-none"
                />
              )}

              {q.questionType === 'dropdown' && (
                <div className="relative">
                  <select
                    value={(dynamicAnswers[q.fieldKey] as string) || ''}
                    onChange={e => setAnswer(q.fieldKey, e.target.value)}
                    required={q.required}
                    className="w-full h-12 px-4 pr-10 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f] appearance-none bg-white"
                  >
                    <option value="">Choose…</option>
                    {(q.options || []).map(o => <option key={o.value} value={o.value}>{o.label.en}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                </div>
              )}

              {q.questionType === 'radio' && (
                <div className="space-y-2">
                  {(q.options || []).map(o => (
                    <label key={o.value} className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:border-[#2d6a4f]/40 hover:bg-green-50 transition-all">
                      <input
                        type="radio" name={q.fieldKey} value={o.value}
                        checked={(dynamicAnswers[q.fieldKey] as string) === o.value}
                        onChange={() => setAnswer(q.fieldKey, o.value)}
                        required={q.required}
                        className="w-4 h-4 text-[#2d6a4f]"
                      />
                      <span className="text-sm text-gray-700 font-medium">{o.label.en}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'checkbox' && (
                <div className="space-y-2">
                  {(q.options || []).map(o => (
                    <label key={o.value} className="flex items-center gap-3 cursor-pointer p-3 border border-gray-200 rounded-xl hover:border-[#2d6a4f]/40 hover:bg-green-50 transition-all">
                      <input
                        type="checkbox"
                        checked={((dynamicAnswers[q.fieldKey] as string[]) || []).includes(o.value)}
                        onChange={() => toggleCheckbox(q.fieldKey, o.value)}
                        className="w-4 h-4 rounded text-[#2d6a4f]"
                      />
                      <span className="text-sm text-gray-700 font-medium">{o.label.en}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'info' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <p className="text-sm text-blue-800 font-medium">{q.label.en}</p>
                </div>
              )}

              {q.questionType === 'payment' && q.paymentConfig && (
                <a
                  href={q.paymentConfig.paymentUrl || '#'}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full h-14 bg-gradient-to-r from-[#2d6a4f] to-emerald-500 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all text-base"
                >
                  <CreditCard size={20} />
                  {q.paymentConfig.buttonLabel || 'Pay Now'}
                  {q.paymentConfig.amount ? ` — ₹${q.paymentConfig.amount}` : ''}
                </a>
              )}
            </div>
          ))}

          {/* Submit */}
          <button
            type="submit" disabled={loading}
            className="w-full h-12 bg-[#2d6a4f] text-white rounded-xl font-bold text-sm hover:bg-[#1b4332] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Submit Enquiry'}
          </button>

          <p className="text-center text-xs text-gray-400">We'll contact you on WhatsApp within 24 hours.</p>
        </form>
      </div>
    </div>
  );
}

export default function EnquiryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-[#2d6a4f]" size={32} />
      </div>
    }>
      <EnquiryForm />
    </Suspense>
  );
}
