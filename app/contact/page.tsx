'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check if user is signed in and auto-fill form
  useEffect(() => {
    const userToken = localStorage.getItem('token');
    if (!userToken) return;

    let userName = '';
    let userEmail = '';
    let userPhone = '';
    let userCountryCode = '';

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        userName = parsed.name || '';
        userEmail = parsed.email || '';
        userPhone = parsed.phone || '';
        userCountryCode = parsed.countryCode || '';
      } catch (error) {
        console.debug('Unable to parse stored user profile:', error);
      }
    }

    userName = userName || localStorage.getItem('userName') || '';
    userEmail = userEmail || localStorage.getItem('userEmail') || '';
    userPhone = userPhone || localStorage.getItem('userPhone') || '';
    userCountryCode = userCountryCode || localStorage.getItem('userCountryCode') || '+91';

    setFormData(prev => ({
      ...prev,
      name: userName,
      email: userEmail,
      phone: userPhone,
      countryCode: userCountryCode
    }));
  }, []);

  const countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
    { code: '+977', country: 'Nepal' },
    { code: '+65', country: 'Singapore' },
    { code: '+971', country: 'UAE' }
  ];

  const subjectOptions = [
    { value: '', label: 'Select a subject' },
    { value: 'Workshop Inquiry', label: 'Workshop Inquiry' },
    { value: 'Product Information', label: 'Product Information' },
    { value: 'Membership Plans', label: 'Membership Plans' },
    { value: 'Technical Support', label: 'Technical Support' },
    { value: 'Feedback', label: 'Feedback' },
    { value: 'General Inquiry', label: 'General Inquiry' },
    { value: 'Other', label: 'Other' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters long';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      // API call to save contact message
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          countryCode: formData.countryCode,
          subject: formData.subject,
          message: formData.message
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSubmitStatus('success');
      
      // Keep user data if logged in, clear only message
      if (!localStorage.getItem('token')) {
        setFormData({
          name: '',
          email: '',
          phone: '',
          countryCode: '+91',
          subject: '',
          message: ''
        });
      } else {
        setFormData(prev => ({
          ...prev,
          subject: '',
          message: ''
        }));
      }

      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* Hero Section with Background Image */}
        <section className="relative h-80 sm:h-96 md:h-[500px] px-4 sm:px-6 flex items-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.pexels.com/photos/3822622/pexels-photo-3822622.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
              alt="Contact Us - Yoga and Wellness"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
          
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 sm:mb-6">
              Get in <span className="text-green-400">Touch</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-200 leading-relaxed">
              Have questions? We&apos;d love to hear from you. Reach out anytime!
            </p>
          </div>
        </section>

        <div className="container mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid lg:grid-cols-3 gap-8 sm:gap-12">
            {/* Contact Information */}
            <div className="lg:col-span-1">
              <h2 className="text-xl sm:text-2xl font-bold text-swar-text mb-6 sm:mb-8">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-swar-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 sm:h-6 sm:w-6 text-swar-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-swar-text mb-1">Email</h3>
                    <p className="text-swar-text-secondary">hello@swaryoga.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-swar-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-5 w-5 sm:h-6 sm:w-6 text-swar-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-swar-text mb-1">Phone</h3>
                    <p className="text-swar-text-secondary">+91 93099 86820</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-swar-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-swar-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-swar-text mb-1">Location</h3>
                    <p className="text-swar-text-secondary">India</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 sm:p-6 bg-swar-primary-light rounded-xl">
                <h3 className="font-semibold text-swar-text mb-3">Response Time</h3>
                <p className="text-swar-text-secondary text-sm">
                  We typically respond to all inquiries within 24 hours during business days.
                </p>
                <p className="text-swar-text text-sm mt-3">
                  💬 <strong>Check your responses in your <a href="/profile" className="text-swar-primary hover:text-swar-primary font-semibold underline">profile messages</a></strong>
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-bold text-swar-text mb-6">Send us a Message</h2>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                  <div className="mb-6 p-4 bg-swar-primary-light border border-green-200 rounded-lg flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-swar-primary" />
                    <span className="text-swar-primary">Message sent successfully! We&apos;ll get back to you soon.</span>
                  </div>
                )}

                {submitStatus === 'error' && Object.keys(errors).length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-800">Please fix the errors below and try again.</span>
                  </div>
                )}

                {/* Welcome message if user is logged in */}
                {formData.name && localStorage.getItem('token') && (
                  <div className="mb-6 p-4 bg-swar-primary-light border border-green-200 rounded-lg">
                    <p className="text-swar-primary flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2 text-swar-primary" />
                      Welcome back, {formData.name}! Your details have been automatically filled.
                    </p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-swar-text mb-1 sm:mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent transition-colors ${
                        errors.name ? 'border-red-400 bg-red-50' : 'border-swar-border'
                      }`}
                      placeholder="Enter your full name"
                      autoComplete="name"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-swar-text mb-1 sm:mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent transition-colors ${
                        errors.email ? 'border-red-400 bg-red-50' : 'border-swar-border'
                      }`}
                      placeholder="Enter your email address"
                      autoComplete="email"
                    />
                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-swar-text mb-1 sm:mb-2">
                      Phone Number *
                    </label>
                    <div className="flex space-x-2">
                      <select
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleInputChange}
                        className="w-24 px-2 py-2 sm:py-3 border border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent"
                        autoComplete="tel-country-code"
                      >
                        {countryCodes.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.code}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`flex-1 px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent transition-colors ${
                          errors.phone ? 'border-red-400 bg-red-50' : 'border-swar-border'
                        }`}
                        placeholder="Enter your phone number"
                        autoComplete="tel"
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                  </div>

                  {/* Subject Dropdown */}
                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-swar-text mb-1 sm:mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent transition-colors ${
                        errors.subject ? 'border-red-400 bg-red-50' : 'border-swar-border'
                      }`}
                    >
                      {subjectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
                  </div>

                  {/* Message */}
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-swar-text mb-1 sm:mb-2">
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      rows={4}
                      className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-transparent transition-colors resize-none ${
                        errors.message ? 'border-red-400 bg-red-50' : 'border-swar-border'
                      }`}
                      placeholder="Please describe your inquiry in detail..."
                    />
                    {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-swar-primary to-green-700 text-white py-3 sm:py-4 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
