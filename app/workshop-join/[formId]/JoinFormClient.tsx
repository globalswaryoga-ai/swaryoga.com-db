'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';
import { CheckCircle, Loader, Calendar, Clock, Users, CreditCard, Clock3, Lock } from 'lucide-react';

interface FormData {
  formId: string;
  workshopName: string;
  workshopDate: string;
  workshopTime: string;
  workshopMode: string;
  description: string;
  workshopImage: string;
  price?: number;
  currency?: string;
  feeOptions?: { label: string; price: number }[];
  groupLink?: string;
}

const MODE_ICONS: Record<string, string> = { online: '💻', offline: '📍', residential: '🏡', recorded: '🎥' };
const MODE_LABELS: Record<string, string> = { online: 'Online', offline: 'Offline', residential: 'Residential', recorded: 'Recorded' };
const CURRENCY_SYMBOL: Record<string, string> = { INR: '₹', USD: '$', NPR: 'रू' };

export default function JoinFormClient({ formData, paid = false, payFailed = false }: { formData: FormData; paid?: boolean; payFailed?: boolean }) {
  const feeOptions = formData.feeOptions || [];
  const hasFeeOptions = feeOptions.length > 0;
  const currency = (formData.currency || 'INR').toUpperCase();
  const symbol = CURRENCY_SYMBOL[currency] || '';

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('India');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [payLaterState, setPayLaterState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [payLaterSentWhatsApp, setPayLaterSentWhatsApp] = useState(false);
  const [payLaterLink, setPayLaterLink] = useState('');
  const [feeOptionIndex, setFeeOptionIndex] = useState(0);

  // The amount driving the UI: the selected fee tier when the form has
  // multiple, otherwise the legacy single price.
  const price = hasFeeOptions
    ? Math.max(0, Number(feeOptions[feeOptionIndex]?.price) || 0)
    : Math.max(0, Number(formData.price) || 0);
  const isPaid = hasFeeOptions ? feeOptions.some((f) => f.price > 0) : price > 0;

  // Badge shown BEFORE the registrant has picked a tier (intro screen) — a
  // single amount if all paid tiers cost the same, otherwise "From ₹X".
  const introPriceLabel = (() => {
    if (!isPaid) return 'Free';
    if (!hasFeeOptions) return `${symbol}${price}`;
    const paidAmounts = feeOptions.filter((f) => f.price > 0).map((f) => f.price);
    const min = Math.min(...paidAmounts);
    const max = Math.max(...paidAmounts);
    return min === max ? `${symbol}${min}` : `From ${symbol}${min}`;
  })();

  // Pre-fill from a pay link (?pay=1&n=&m=&fee=) sent on WhatsApp for "Pay Later".
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('n')) setName(q.get('n') || '');
    if (q.get('m')) setMobile((q.get('m') || '').replace(/\D/g, '').slice(0, 10));
    const feeParam = q.get('fee');
    if (feeParam !== null) {
      const idx = Number(feeParam);
      if (Number.isInteger(idx) && idx >= 0 && idx < feeOptions.length) setFeeOptionIndex(idx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/workshop-join/${formData.formId}`, {
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

  // Pay Now → ask the server for a Cashfree session (amount is server-authoritative),
  // then launch the Cashfree JS SDK checkout, which redirects to the gateway.
  const payNow = async () => {
    setPayLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/workshop-join/${formData.formId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile: '+91' + mobile, email, city, country, feeOptionIndex }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.paymentSessionId) {
        throw new Error(data.error || 'Could not start payment');
      }

      const CashfreeFactory = (window as any).Cashfree;
      if (!CashfreeFactory) {
        throw new Error('Payment gateway is still loading — please try again in a moment.');
      }
      const cashfree = typeof CashfreeFactory === 'function'
        ? CashfreeFactory({ mode: data.env === 'production' ? 'production' : 'sandbox' })
        : CashfreeFactory;
      if (typeof cashfree?.checkout !== 'function') {
        throw new Error('Payment gateway failed to initialize — please refresh and try again.');
      }
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_self' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed to start');
      setPayLoading(false);
    }
  };

  // Pay Later → server saves the lead as pending and WhatsApps the pay link.
  const payLater = async () => {
    setPayLaterState('sending');
    try {
      const res = await fetch(`/api/workshop-join/${formData.formId}/pay-later`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, mobile: '+91' + mobile, email, city, country, feeOptionIndex }),
      });
      const data = await res.json().catch(() => ({}));
      setPayLaterSentWhatsApp(!!data.whatsappSent);
      setPayLaterLink(data.payLink || '');
    } catch { /* non-fatal — fall back to the on-screen note */ }
    setPayLaterState('sent');
  };

  // ── Payment complete (returned from Cashfree, server-verified) ──
  // This is the ONLY place the group link is revealed for a paid workshop.
  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4 py-10">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          {formData.workshopImage && (
            <img src={formData.workshopImage} alt={formData.workshopName} className="w-full h-36 object-cover rounded-2xl mb-5" />
          )}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Payment Complete! 🎉</h1>
          <p className="text-gray-500 text-sm mb-5">
            You&apos;re confirmed for <strong>{formData.workshopName}</strong>.
          </p>
          {formData.groupLink ? (
            <a
              href={formData.groupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 bg-[#25D366] text-white rounded-xl font-bold text-sm hover:brightness-95 transition flex items-center justify-center gap-2"
            >
              <Users size={18} /> Join WhatsApp Group
            </a>
          ) : (
            <p className="text-sm text-gray-500">We&apos;ll share the group details on WhatsApp shortly.</p>
          )}
          <p className="text-xs text-gray-400 mt-3">We&apos;ve also sent this link to your WhatsApp.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#f0f7ee] to-[#e8f4e8] px-4 py-10">
        {isPaid && <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />}
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          {formData.workshopImage && (
            <img src={formData.workshopImage} alt={formData.workshopName} className="w-full h-36 object-cover rounded-2xl mb-5" />
          )}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">You&apos;re Registered! 🎉</h1>
          <p className="text-gray-600 mb-1">Thank you, <strong>{name.split(' ')[0]}</strong>!</p>
          <p className="text-gray-500 text-sm mb-5">
            for <strong>{formData.workshopName}</strong>.
          </p>

          {/* Step 1 — Join the WhatsApp group.
              For FREE workshops the link shows immediately. For PAID workshops it
              stays LOCKED until payment completes (revealed on the paid screen). */}
          {formData.groupLink && !isPaid && (
            <a
              href={formData.groupLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 mb-3 bg-[#25D366] text-white rounded-xl font-bold text-sm hover:brightness-95 transition flex items-center justify-center gap-2"
            >
              <Users size={18} /> Join WhatsApp Group
            </a>
          )}
          {formData.groupLink && isPaid && (
            <div className="w-full mb-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 text-sm flex items-center justify-center gap-2">
              <Lock size={15} /> WhatsApp group unlocks after payment
            </div>
          )}

          {/* Step 2 — Payment (only when the workshop has a price) */}
          {isPaid && (
            <div className="border-t border-gray-100 pt-4 mt-1">
              {hasFeeOptions && feeOptions.length > 1 ? (
                <>
                  <p className="text-sm text-gray-600 mb-2 text-left">Choose your fee option</p>
                  <div className="space-y-2 mb-3 text-left">
                    {feeOptions.map((fee, idx) => (
                      <label
                        key={idx}
                        className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border cursor-pointer transition ${
                          feeOptionIndex === idx ? 'border-[#2d6a4f] bg-[#f0f7ee]' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm font-medium text-gray-800">
                          <input
                            type="radio"
                            name="feeOption"
                            checked={feeOptionIndex === idx}
                            onChange={() => setFeeOptionIndex(idx)}
                            className="accent-[#2d6a4f]"
                          />
                          {fee.label || `Option ${idx + 1}`}
                        </span>
                        <span className="text-sm font-bold text-[#1b4332]">
                          {fee.price > 0 ? `${symbol}${fee.price}` : 'Free'}
                        </span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-600 mb-1">Workshop fee</p>
                  <p className="text-2xl font-extrabold text-[#1b4332] mb-3">{symbol}{price}</p>
                </>
              )}

              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm mb-3">{error}</div>}

              {payLaterState === 'sent' ? (
                payLaterSentWhatsApp ? (
                  <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm">
                    ✅ We&apos;ve sent your payment link on WhatsApp. You can pay anytime before the workshop.
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                    Saved! You can pay anytime using this link:
                    {payLaterLink && (
                      <a href={payLaterLink} className="block mt-1 font-semibold text-[#1b4332] underline break-all">{payLaterLink}</a>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-2.5">
                  <button
                    onClick={payNow}
                    disabled={payLoading}
                    className="w-full h-12 bg-[#2d6a4f] text-white rounded-xl font-bold text-sm hover:bg-[#1b4332] transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {payLoading ? <Loader className="animate-spin" size={18} /> : <><CreditCard size={18} /> Pay Now {symbol}{price}</>}
                  </button>
                  <button
                    onClick={payLater}
                    disabled={payLaterState === 'sending' || payLoading}
                    className="w-full h-11 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {payLaterState === 'sending' ? <Loader className="animate-spin" size={16} /> : <><Clock3 size={16} /> Pay Later (link on WhatsApp)</>}
                  </button>
                </div>
              )}
            </div>
          )}

          {!isPaid && (
            <p className="text-gray-500 text-sm">We&apos;ll contact you on WhatsApp with the details.</p>
          )}
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
            <img src={formData.workshopImage} alt={formData.workshopName} className="w-full h-52 object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1b4332]/90 via-[#1b4332]/40 to-transparent flex flex-col justify-end px-7 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-semibold text-white">
                  {MODE_ICONS[formData.workshopMode]} {MODE_LABELS[formData.workshopMode] || formData.workshopMode}
                </span>
                <span className="text-xs bg-white text-[#1b4332] px-3 py-1 rounded-full font-bold">
                  {introPriceLabel}
                </span>
              </div>
              <h1 className="text-xl font-bold text-white leading-tight">{formData.workshopName}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-white/80 text-xs">
                {formData.workshopDate && <span className="flex items-center gap-1"><Calendar size={11} />{formData.workshopDate}</span>}
                {formData.workshopTime && <span className="flex items-center gap-1"><Clock size={11} />{formData.workshopTime}</span>}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#2d6a4f] px-8 py-7 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm bg-white/20 px-3 py-1 rounded-full font-semibold">
                {MODE_ICONS[formData.workshopMode]} {MODE_LABELS[formData.workshopMode] || formData.workshopMode}
              </span>
              <span className="text-sm bg-white text-[#1b4332] px-3 py-1 rounded-full font-bold">
                {isPaid ? `${symbol}${price}` : 'Free'}
              </span>
            </div>
            <h1 className="text-xl font-bold mb-2">{formData.workshopName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-white/80 text-sm">
              {formData.workshopDate && <span className="flex items-center gap-1.5"><Calendar size={13} />{formData.workshopDate}</span>}
              {formData.workshopTime && <span className="flex items-center gap-1.5"><Clock size={13} />{formData.workshopTime}</span>}
            </div>
          </div>
        )}

        {formData.description && (
          <div className="px-8 py-4 bg-[#f7faf8] border-b border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{formData.description}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
          <h2 className="text-base font-bold text-gray-800">Join Now — Fill Your Details</h2>

          {payFailed && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
              Your payment didn’t go through. Please fill the form and try again.
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" required
              className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">WhatsApp Number *</label>
            <div className="flex gap-2">
              <div className="flex items-center justify-center w-16 h-11 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 bg-gray-50 shrink-0">+91</div>
              <input type="tel" value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210" required pattern="\d{10}" title="Enter 10-digit mobile number"
                className="flex-1 h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">City *</label>
              <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Your city" required
                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Country *</label>
              <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" required
                className="w-full h-11 px-4 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 focus:border-[#2d6a4f]" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full h-12 bg-[#2d6a4f] text-white rounded-xl font-bold text-sm hover:bg-[#1b4332] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
            {loading ? <Loader className="animate-spin" size={18} /> : 'Join Now →'}
          </button>
          <p className="text-center text-xs text-gray-400 pb-1">
            {isPaid ? `Next: join the group & pay ${introPriceLabel} (now or later).` : 'We’ll contact you on WhatsApp within 24 hours.'}
          </p>
        </form>
      </div>
    </div>
  );
}
