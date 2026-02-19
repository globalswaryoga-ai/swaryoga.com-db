'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, CheckCircle, User, Mail, Phone, MapPin, Briefcase, Calendar, Lock, Globe, BookOpen, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

type FormType = 'signup' | 'lead' | 'workshop' | 'sales' | 'inquiry';

interface FormConfig {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string;
  fields: string[];
}

const FORM_CONFIGS: Record<FormType, FormConfig> = {
  signup: {
    title: 'Join Swar Yoga',
    subtitle: 'Create your account and start your wellness journey',
    icon: '🧘',
    color: 'emerald',
    gradient: 'from-emerald-500 to-teal-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'gender', 'age', 'profession'],
  },
  lead: {
    title: 'Get Started',
    subtitle: 'Share your details and we\'ll contact you',
    icon: '📋',
    color: 'blue',
    gradient: 'from-blue-500 to-indigo-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'interest'],
  },
  workshop: {
    title: 'Workshop Registration',
    subtitle: 'Register for upcoming workshops',
    icon: '📚',
    color: 'purple',
    gradient: 'from-purple-500 to-violet-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'workshopName', 'workshopLanguage', 'workshopMode', 'batchPreference'],
  },
  sales: {
    title: 'Course Enrollment',
    subtitle: 'Enroll in our premium courses',
    icon: '🎯',
    color: 'orange',
    gradient: 'from-orange-500 to-amber-600',
    fields: ['name', 'email', 'phone', 'countryCode', 'country', 'state', 'courseName', 'paymentMode'],
  },
  inquiry: {
    title: 'General Inquiry',
    subtitle: 'Have questions? Reach out to us',
    icon: '❓',
    color: 'cyan',
    gradient: 'from-cyan-500 to-blue-600',
    fields: ['name', 'email', 'phone', 'message'],
  },
};

const WORKSHOPS = [
  'Swar Yoga Foundation',
  'Aham Bramhasmi',
  'Astavakra Gita',
  'Shivoham',
  'I Am Fit',
  'Youth Wellness',
  'Children Yoga',
  'Married Life Harmony',
  'Business Success',
  'Shankara Philosophy',
  'Amrut Bhoj',
  'Yogasana Mastery',
  'English Swar Yoga',
];

const LANGUAGES = [
  { value: 'hindi', label: 'हिंदी (Hindi)' },
  { value: 'english', label: 'English' },
  { value: 'marathi', label: 'मराठी (Marathi)' },
];

const COUNTRIES = [
  'India', 'USA', 'UK', 'Canada', 'Australia', 'Germany', 'UAE', 'Singapore', 'Other'
];

const INDIAN_STATES = [
  'Maharashtra', 'Gujarat', 'Karnataka', 'Tamil Nadu', 'Telangana', 'Delhi', 'Uttar Pradesh',
  'Madhya Pradesh', 'Rajasthan', 'West Bengal', 'Bihar', 'Andhra Pradesh', 'Kerala', 'Punjab',
  'Haryana', 'Jharkhand', 'Chhattisgarh', 'Assam', 'Odisha', 'Uttarakhand', 'Goa', 'Other'
];

export default function DynamicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const formType = (params.formType as FormType) || 'lead';
  
  // Get URL params for pre-filling
  const workshopParam = searchParams.get('workshop');
  const sourceParam = searchParams.get('source');
  const refParam = searchParams.get('ref');
  
  const config = FORM_CONFIGS[formType] || FORM_CONFIGS.lead;
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState<{ email: string; password: string; userId: string } | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [profession, setProfession] = useState('');
  const [interest, setInterest] = useState('');
  const [workshopName, setWorkshopName] = useState(workshopParam || '');
  const [workshopLanguage, setWorkshopLanguage] = useState('hindi');
  const [workshopMode, setWorkshopMode] = useState<'online' | 'offline'>('online');
  const [batchPreference, setBatchPreference] = useState('');
  const [courseName, setCourseName] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const payload = {
        formType,
        source: sourceParam || 'form-link',
        ref: refParam,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        countryCode,
        country,
        state,
        ...(config.fields.includes('gender') && { gender }),
        ...(config.fields.includes('age') && { age: parseInt(age) }),
        ...(config.fields.includes('profession') && { profession }),
        ...(config.fields.includes('interest') && { interest }),
        ...(config.fields.includes('workshopName') && { workshopName }),
        ...(config.fields.includes('workshopLanguage') && { workshopLanguage }),
        ...(config.fields.includes('workshopMode') && { workshopMode }),
        ...(config.fields.includes('batchPreference') && { batchPreference }),
        ...(config.fields.includes('courseName') && { courseName }),
        ...(config.fields.includes('paymentMode') && { paymentMode }),
        ...(config.fields.includes('message') && { message }),
      };
      
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Submission failed');
      }
      
      if (data.credentials) {
        setCredentials(data.credentials);
      }
      setSubmitted(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  
  if (submitted) {
    return (
      <>
        <Navigation />
        <main className="min-h-screen pt-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-2xl mx-auto px-4 py-16">
            <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100 text-center">
              <div className={`w-20 h-20 bg-${config.color}-100 rounded-full flex items-center justify-center mx-auto mb-6`}>
                <CheckCircle className={`text-${config.color}-600`} size={40} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Thank You! 🎉</h1>
              <p className="text-gray-600 mb-6">
                Your submission has been received. We'll contact you soon via WhatsApp and email.
              </p>
              
              {credentials && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 mb-6 text-left border border-emerald-200">
                  <h3 className="text-lg font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <Lock size={20} />
                    Your Login Credentials
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                      <span className="text-sm text-gray-600">User ID:</span>
                      <code className="font-mono font-bold text-emerald-700">{credentials.userId}</code>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                      <span className="text-sm text-gray-600">Email:</span>
                      <code className="font-mono font-bold text-emerald-700">{credentials.email}</code>
                    </div>
                    <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-emerald-100">
                      <span className="text-sm text-gray-600">Password:</span>
                      <code className="font-mono font-bold text-emerald-700 text-lg">{credentials.password}</code>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600 mt-4">
                    ⚠️ Save these credentials! They have been sent to your WhatsApp and email.
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signin"
                  className={`px-8 py-3 bg-gradient-to-r ${config.gradient} text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg`}
                >
                  Login Now
                </Link>
                <Link
                  href="/community"
                  className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                >
                  Explore Community
                </Link>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }
  
  return (
    <>
      <Navigation />
      <main className="min-h-screen pt-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
          {/* Header */}
          <div className={`bg-gradient-to-br ${config.gradient} rounded-3xl p-8 sm:p-10 mb-8 text-white shadow-xl relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
              <span className="text-5xl mb-4 block">{config.icon}</span>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">{config.title}</h1>
              <p className="text-white/90">{config.subtitle}</p>
            </div>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <User size={14} className="inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                />
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Mail size={14} className="inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                  required
                />
              </div>
              
              {/* Phone with Country Code */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Phone size={14} className="inline mr-2" />
                  WhatsApp Number *
                </label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-24 h-12 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+49">🇩🇪 +49</option>
                  </select>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className="flex-1 h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                    required
                  />
                </div>
              </div>
              
              {/* Country & State */}
              {config.fields.includes('country') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Globe size={14} className="inline mr-2" />
                      Country *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                      required
                    >
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <MapPin size={14} className="inline mr-2" />
                      State *
                    </label>
                    {country === 'India' ? (
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      >
                        <option value="">Select State</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="Enter your state"
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      />
                    )}
                  </div>
                </div>
              )}
              
              {/* Signup specific fields */}
              {formType === 'signup' && (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Gender *</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full h-12 px-3 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      >
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Calendar size={14} className="inline mr-1" />
                        Age *
                      </label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="Age"
                        min="13"
                        max="100"
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Briefcase size={14} className="inline mr-1" />
                        Profession *
                      </label>
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="Your work"
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      />
                    </div>
                  </div>
                </>
              )}
              
              {/* Workshop specific fields */}
              {formType === 'workshop' && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <BookOpen size={14} className="inline mr-2" />
                      Workshop Name *
                    </label>
                    <select
                      value={workshopName}
                      onChange={(e) => setWorkshopName(e.target.value)}
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                      required
                    >
                      <option value="">Select Workshop</option>
                      {WORKSHOPS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Language *</label>
                      <select
                        value={workshopLanguage}
                        onChange={(e) => setWorkshopLanguage(e.target.value)}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                        required
                      >
                        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Mode *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setWorkshopMode('online')}
                          className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all ${
                            workshopMode === 'online'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🌐 Online
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkshopMode('offline')}
                          className={`flex-1 h-12 rounded-xl font-bold text-sm transition-all ${
                            workshopMode === 'offline'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          🏢 Offline
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <Users size={14} className="inline mr-2" />
                      Batch Preference (Optional)
                    </label>
                    <input
                      type="text"
                      value={batchPreference}
                      onChange={(e) => setBatchPreference(e.target.value)}
                      placeholder="e.g., Morning batch, Weekend batch, etc."
                      className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    />
                  </div>
                </>
              )}
              
              {/* Lead specific - Interest */}
              {config.fields.includes('interest') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">What are you interested in?</label>
                  <select
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Select your interest</option>
                    <option value="yoga-workshop">Yoga Workshops</option>
                    <option value="meditation">Meditation</option>
                    <option value="fitness">Fitness Programs</option>
                    <option value="philosophy">Philosophy Classes</option>
                    <option value="counseling">Personal Counseling</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              
              {/* Inquiry - Message */}
              {config.fields.includes('message') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we help you?"
                    rows={4}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
                  />
                </div>
              )}
            </div>
            
            {/* Submit Button */}
            <div className={`p-6 bg-gradient-to-r ${config.gradient} bg-opacity-5`}>
              <button
                type="submit"
                disabled={loading}
                className={`w-full h-14 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `bg-gradient-to-r ${config.gradient} hover:opacity-90`
                }`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={20} />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Registration
                  </>
                )}
              </button>
              <p className="text-center text-xs text-gray-500 mt-4">
                By submitting, you agree to receive updates via WhatsApp and email.
              </p>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
