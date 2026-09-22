'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader, ExternalLink, CreditCard } from 'lucide-react';

interface DynamicQuestion {
  _id: string;
  fieldKey: string;
  questionType: 'text' | 'paragraph' | 'dropdown' | 'radio' | 'checkbox' | 'info' | 'payment' | 'image' | 'document';
  label: { en: string };
  placeholder?: { en?: string };
  options?: Array<{ value: string; label: { en: string } }>;
  imageUrl?: string;
  qrCodeUrl?: string;
  linkUrl?: string;
  linkLabel?: string;
  paymentConfig?: Array<{
    amount?: number;
    currency?: string;
    buttonText?: string;
  }> | {
    amount?: number;
    currency?: string;
    buttonText?: string;
  };
  required: boolean;
}

interface EnquiryFormDetails {
  formId: string;
  workshopName: string;
  workshopDate?: string;
  workshopEndDate?: string;
  workshopTime?: string;
  duration?: string;
  holidays?: string;
  description?: string;
  workshopImage?: string;
}

function EnquiryForm() {
  const searchParams = useSearchParams();
  const formId = searchParams.get('workshopId') || searchParams.get('w') || '';

  const [formDetails, setFormDetails] = useState<EnquiryFormDetails | null>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string | string[]>>({});
  
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');

  const [loadingForm, setLoadingForm] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Load specific form details and questions
  useEffect(() => {
    if (!formId) {
      setLoadingForm(false);
      setError('No form ID provided in URL.');
      return;
    }

    fetch(`/api/enquiry-form/${formId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          setError(data.error || 'Form not found or inactive.');
          return;
        }
        setFormDetails(data.form);
        setDynamicQuestions(data.questions || []);
        
        const init: Record<string, string | string[]> = {};
        (data.questions || []).forEach((q: DynamicQuestion) => {
          init[q.fieldKey] = q.questionType === 'checkbox' ? [] : '';
        });
        setDynamicAnswers(init);
      })
      .catch(() => setError('Failed to load form.'))
      .finally(() => setLoadingForm(false));
  }, [formId]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 5MB Validation
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      e.target.value = '';
      return;
    }
    
    setSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const res = await fetch('/api/admin/crm/upload/s3/base64', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, fileName: file.name, category: 'form-uploads' }),
        });
        const data = await res.json();
        if (data.success) {
          setAnswer(key, data.data.publicUrl);
        } else {
          setError('Failed to upload file');
        }
        setSubmitting(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Error reading file');
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gender) { setError('Please select your gender.'); return; }
    if (!formDetails) return;

    for (const q of dynamicQuestions) {
      if (!q.required) continue;
      if (q.questionType === 'info' || q.questionType === 'payment') continue;
      const val = dynamicAnswers[q.fieldKey];
      const isEmpty = Array.isArray(val) ? val.length === 0 : !String(val || '').trim();
      if (isEmpty) { setError(`Please answer: ${q.label.en}`); return; }
    }

    setSubmitting(true);
    setError('');

    // Calculate Total Amount
    let totalAmount = 0;
    let currency = 'INR';
    dynamicQuestions.forEach(q => {
      if (q.questionType === 'payment' && q.paymentConfig) {
        const configs = Array.isArray(q.paymentConfig) ? q.paymentConfig : [q.paymentConfig];
        if (configs.length > 0) {
          totalAmount += Number(configs[0].amount || 0);
          currency = configs[0].currency || 'INR';
        }
      }
    });

    try {
      const res = await fetch('/api/admin/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          mobile: '+91' + mobile,
          gender,
          city,
          workshopId: formDetails.formId,
          workshopName: formDetails.workshopName,
          dynamicAnswers,
          amount: totalAmount,
          currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Submission failed');
      
      if (data.paymentSessionId) {
        // Load Cashfree SDK dynamically and trigger payment
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.async = true;
        script.onload = () => {
          let cf = (window as any).Cashfree;
          if (typeof cf === 'function' && typeof cf.checkout !== 'function') {
            cf = cf({ mode: 'production' });
          }
          if (cf && typeof cf.checkout === 'function') {
            cf.checkout({
              paymentSessionId: data.paymentSessionId,
              redirectTarget: '_self'
            });
          }
        };
        document.body.appendChild(script);
      } else {
        setSubmitted(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8]">
        <Loader className="animate-spin text-[#2d6a4f]" size={40} />
      </div>
    );
  }

  if (error && !formDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-4xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Thank You, {name.split(' ')[0]}!</h1>
          <p className="text-gray-600 mb-2">Form submitted for <strong>{formDetails?.workshopName}</strong>.</p>
          <p className="text-gray-500 text-sm">Our team will contact you on WhatsApp shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
        {/* Header Section */}
        {formDetails?.workshopImage ? (
          <div className="w-full h-48 bg-gray-100 relative">
            <img src={formDetails.workshopImage} alt="Header" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="bg-[#2d6a4f] h-32 flex items-end px-8 pb-6 text-white">
            <h1 className="text-2xl font-bold">{formDetails?.workshopName}</h1>
          </div>
        )}

        <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
          {formDetails?.workshopImage && (
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{formDetails?.workshopName}</h1>
          )}
          {formDetails?.description && (
            <p className="text-gray-600 text-sm whitespace-pre-wrap mt-2 leading-relaxed">{formDetails.description}</p>
          )}

          <div className="flex flex-wrap gap-3 mt-5">
            {formDetails?.workshopDate && (
              <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700">
                📅 {formDetails.workshopDate} {formDetails.workshopEndDate ? `- ${formDetails.workshopEndDate}` : ''}
              </div>
            )}
            {formDetails?.workshopTime && (
              <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700">
                🕐 {formDetails.workshopTime}
              </div>
            )}
            {formDetails?.duration && (
              <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700">
                ⏳ {formDetails.duration}
              </div>
            )}
            {formDetails?.holidays && (
              <div className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700">
                🏖️ Holidays: {formDetails.holidays}
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
          )}

          {/* Standard Fields */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your answer" required className="w-full h-12 px-4 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm outline-none focus:border-[#2d6a4f] focus:bg-white transition-colors" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp Number *</label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center w-14 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm font-semibold text-gray-600 shrink-0">+91</div>
              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" required pattern="\d{10}" className="flex-1 h-12 px-4 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm outline-none focus:border-[#2d6a4f] focus:bg-white transition-colors" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender *</label>
            <div className="grid grid-cols-3 gap-3">
              {['Male', 'Female', 'Other'].map(g => (
                <button key={g} type="button" onClick={() => setGender(g.toLowerCase())} className={`h-11 rounded-lg text-sm font-semibold border-2 transition-all ${gender === g.toLowerCase() ? 'bg-[#2d6a4f]/10 text-[#2d6a4f] border-[#2d6a4f]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Your answer" required className="w-full h-12 px-4 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm outline-none focus:border-[#2d6a4f] focus:bg-white transition-colors" />
          </div>

          {/* Dynamic Questions */}
          {dynamicQuestions.map((q, idx) => (
            <div key={q._id} className="pt-2">
              {q.imageUrl && <img src={q.imageUrl} alt="" className="w-full max-h-56 object-cover rounded-xl border border-gray-100 mb-4" />}
              
              {q.questionType !== 'info' && (
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {q.label.en}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}

              {(q.qrCodeUrl || q.linkUrl) && (
                <div className="flex items-center gap-4 flex-wrap mb-4">
                  {q.qrCodeUrl && <img src={q.qrCodeUrl} alt="QR Code" className="w-32 h-32 object-cover rounded-xl border border-gray-200 shadow-sm" />}
                  {q.linkUrl && (
                    <a href={q.linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                      <ExternalLink size={14} /> {q.linkLabel || 'Open Link'}
                    </a>
                  )}
                </div>
              )}

              {q.questionType === 'text' && (
                <input value={(dynamicAnswers[q.fieldKey] as string) || ''} onChange={e => setAnswer(q.fieldKey, e.target.value)} placeholder={q.placeholder?.en || 'Your answer'} required={q.required} className="w-full h-12 px-4 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm outline-none focus:border-[#2d6a4f] focus:bg-white transition-colors" />
              )}

              {q.questionType === 'paragraph' && (
                <textarea value={(dynamicAnswers[q.fieldKey] as string) || ''} onChange={e => setAnswer(q.fieldKey, e.target.value)} placeholder={q.placeholder?.en || 'Your answer'} required={q.required} rows={4} className="w-full px-4 py-3 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm outline-none focus:border-[#2d6a4f] focus:bg-white transition-colors resize-none" />
              )}

              {q.questionType === 'dropdown' && (
                <select value={(dynamicAnswers[q.fieldKey] as string) || ''} onChange={e => setAnswer(q.fieldKey, e.target.value)} required={q.required} className="w-full h-12 px-4 border-b-2 border-gray-200 bg-gray-50 rounded-t-xl text-sm outline-none focus:border-[#2d6a4f] focus:bg-white transition-colors">
                  <option value="">Choose…</option>
                  {(q.options || []).map(o => <option key={o.value} value={o.value}>{o.label.en}</option>)}
                </select>
              )}

              {q.questionType === 'radio' && (
                <div className="space-y-3 mt-1">
                  {(q.options || []).map(o => (
                    <label key={o.value} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${dynamicAnswers[q.fieldKey] === o.value ? 'border-[#2d6a4f]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                        {dynamicAnswers[q.fieldKey] === o.value && <div className="w-2.5 h-2.5 bg-[#2d6a4f] rounded-full" />}
                      </div>
                      <input type="radio" name={q.fieldKey} value={o.value} checked={(dynamicAnswers[q.fieldKey] as string) === o.value} onChange={() => setAnswer(q.fieldKey, o.value)} required={q.required} className="hidden" />
                      <span className="text-sm text-gray-700">{o.label.en}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.questionType === 'checkbox' && (
                <div className="space-y-3 mt-1">
                  {(q.options || []).map(o => {
                    const isChecked = ((dynamicAnswers[q.fieldKey] as string[]) || []).includes(o.value);
                    return (
                      <label key={o.value} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-[#2d6a4f] border-[#2d6a4f]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                          {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </div>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleCheckbox(q.fieldKey, o.value)} className="hidden" />
                        <span className="text-sm text-gray-700">{o.label.en}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.questionType === 'info' && (
                <div className="bg-blue-50/50 border-l-4 border-blue-400 py-3 px-4 rounded-r-lg">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{q.label.en}</p>
                </div>
              )}

              {(q.questionType === 'image' || q.questionType === 'document') && (
                <div className="space-y-2 mt-2">
                  <input
                    type="file"
                    accept={q.questionType === 'image' ? "image/*" : ".pdf,.doc,.docx"}
                    onChange={(e) => handleFileUpload(e, q.fieldKey)}
                    required={q.required && !dynamicAnswers[q.fieldKey]}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#2d6a4f]/10 file:text-[#2d6a4f] hover:file:bg-[#2d6a4f]/20"
                  />
                  {dynamicAnswers[q.fieldKey] && (
                    <div className="flex items-center gap-2 mt-2">
                      <CheckCircle className="text-green-600" size={16} />
                      <a href={dynamicAnswers[q.fieldKey] as string} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">View Uploaded {q.questionType === 'image' ? 'Image' : 'Document'}</a>
                    </div>
                  )}
                </div>
              )}

              {q.questionType === 'payment' && q.paymentConfig && (
                <div className="flex items-center justify-center gap-2 w-full h-12 bg-white border-2 border-[#2d6a4f] text-[#2d6a4f] rounded-xl font-bold mt-2 cursor-default">
                  <CreditCard size={18} /> {Array.isArray(q.paymentConfig) ? q.paymentConfig[0]?.buttonText : q.paymentConfig.buttonText || 'Pay Now'} {Array.isArray(q.paymentConfig) ? (q.paymentConfig[0]?.amount ? ` (₹${q.paymentConfig[0].amount})` : '') : (q.paymentConfig.amount ? ` (₹${q.paymentConfig.amount})` : '')}
                </div>
              )}
            </div>
          ))}

          <div className="pt-4 border-t border-gray-100">
            <button type="submit" disabled={submitting} className="w-full h-12 bg-[#2d6a4f] text-white rounded-xl font-bold text-base hover:bg-[#1b4332] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md">
              {submitting ? <Loader className="animate-spin" size={20} /> : 'Submit'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">Never submit passwords through this form.</p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EnquiryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader className="animate-spin text-[#2d6a4f]" size={40} /></div>}>
      <EnquiryForm />
    </Suspense>
  );
}
