'use client';

import React, { useState } from 'react';
import { Mail, MapPin, Phone, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/crm-site/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send message');
      }

      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Something went wrong. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (status === 'error') setStatus('idle');
  };

  return (
    <>
      <section className="pt-20 pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">Get in Touch</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-xl mx-auto">
              Have a question, need a demo, or want to discuss enterprise plans? We&apos;d love to hear from you.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-12">
            {/* Contact Info */}
            <div className="md:col-span-2 space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-swar-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-swar-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Email</h3>
                  <p className="text-gray-600 text-sm">support@swaryoga.com</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-swar-primary/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-swar-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Phone</h3>
                  <p className="text-gray-600 text-sm">+91 80 XXXX XXXX</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-swar-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-5 w-5 text-swar-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Location</h3>
                  <p className="text-gray-600 text-sm">Bangalore, India</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 mt-8">
                <h4 className="font-semibold text-gray-900 mb-2">Enterprise Sales</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Need a custom plan with dedicated support? Our team will prepare a tailored proposal.
                </p>
                <a
                  href="mailto:support@swaryoga.com?subject=Enterprise%20Inquiry"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-swar-primary hover:underline"
                >
                  <Mail className="h-4 w-4" /> Email sales team
                </a>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-3">
              {status === 'success' ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-swar-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600 text-sm">
                    Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setStatus('idle')}
                    className="mt-6 px-6 py-2 bg-swar-primary text-white rounded-xl text-sm font-semibold hover:bg-swar-primary-hover transition"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {status === 'error' && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                      <select
                        name="subject"
                        value={form.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition bg-white"
                      >
                        <option value="">Select a topic</option>
                        <option value="general">General Inquiry</option>
                        <option value="demo">Request a Demo</option>
                        <option value="enterprise">Enterprise Plan</option>
                        <option value="support">Technical Support</option>
                        <option value="billing">Billing Question</option>
                        <option value="bug">Report a Bug</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows={5}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-swar-primary/30 focus:border-swar-primary transition resize-none"
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'loading'}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-swar-primary hover:bg-swar-primary-hover rounded-xl shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {status === 'loading' ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send Message
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
