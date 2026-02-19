'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader, CheckCircle, User, Mail, Phone, MapPin, Briefcase, Calendar, Lock, Globe, BookOpen, Users, Search } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { workshopCatalog } from '@/lib/workshopsData';
import { getAllCountries, getStatesByCountry } from '@/lib/globalLocationData';

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

// Auto-populated from workshopsData.ts
const WORKSHOPS = workshopCatalog.map(w => w.name);

const LANGUAGES = [
  { value: 'hindi', label: 'हिंदी (Hindi)' },
  { value: 'english', label: 'English' },
  { value: 'marathi', label: 'मराठी (Marathi)' },
];

// Country to phone code mapping
const COUNTRY_PHONE_CODES: Record<string, { code: string; flag: string }> = {
  'India': { code: '+91', flag: '🇮🇳' },
  'USA': { code: '+1', flag: '🇺🇸' },
  'United States': { code: '+1', flag: '🇺🇸' },
  'United Kingdom': { code: '+44', flag: '🇬🇧' },
  'UK': { code: '+44', flag: '🇬🇧' },
  'Canada': { code: '+1', flag: '🇨🇦' },
  'Australia': { code: '+61', flag: '🇦🇺' },
  'Germany': { code: '+49', flag: '🇩🇪' },
  'UAE': { code: '+971', flag: '🇦🇪' },
  'United Arab Emirates': { code: '+971', flag: '🇦🇪' },
  'Singapore': { code: '+65', flag: '🇸🇬' },
  'Nepal': { code: '+977', flag: '🇳🇵' },
  'Bangladesh': { code: '+880', flag: '🇧🇩' },
  'Pakistan': { code: '+92', flag: '🇵🇰' },
  'Sri Lanka': { code: '+94', flag: '🇱🇰' },
  'Malaysia': { code: '+60', flag: '🇲🇾' },
  'Indonesia': { code: '+62', flag: '🇮🇩' },
  'Thailand': { code: '+66', flag: '🇹🇭' },
  'Philippines': { code: '+63', flag: '🇵🇭' },
  'Japan': { code: '+81', flag: '🇯🇵' },
  'South Korea': { code: '+82', flag: '🇰🇷' },
  'China': { code: '+86', flag: '🇨🇳' },
  'Russia': { code: '+7', flag: '🇷🇺' },
  'France': { code: '+33', flag: '🇫🇷' },
  'Italy': { code: '+39', flag: '🇮🇹' },
  'Spain': { code: '+34', flag: '🇪🇸' },
  'Netherlands': { code: '+31', flag: '🇳🇱' },
  'Belgium': { code: '+32', flag: '🇧🇪' },
  'Switzerland': { code: '+41', flag: '🇨🇭' },
  'Austria': { code: '+43', flag: '🇦🇹' },
  'Sweden': { code: '+46', flag: '🇸🇪' },
  'Norway': { code: '+47', flag: '🇳🇴' },
  'Denmark': { code: '+45', flag: '🇩🇰' },
  'Finland': { code: '+358', flag: '🇫🇮' },
  'Poland': { code: '+48', flag: '🇵🇱' },
  'Ireland': { code: '+353', flag: '🇮🇪' },
  'Portugal': { code: '+351', flag: '🇵🇹' },
  'Greece': { code: '+30', flag: '🇬🇷' },
  'Turkey': { code: '+90', flag: '🇹🇷' },
  'Saudi Arabia': { code: '+966', flag: '🇸🇦' },
  'Qatar': { code: '+974', flag: '🇶🇦' },
  'Kuwait': { code: '+965', flag: '🇰🇼' },
  'Bahrain': { code: '+973', flag: '🇧🇭' },
  'Oman': { code: '+968', flag: '🇴🇲' },
  'South Africa': { code: '+27', flag: '🇿🇦' },
  'Kenya': { code: '+254', flag: '🇰🇪' },
  'Nigeria': { code: '+234', flag: '🇳🇬' },
  'Egypt': { code: '+20', flag: '🇪🇬' },
  'Morocco': { code: '+212', flag: '🇲🇦' },
  'Brazil': { code: '+55', flag: '🇧🇷' },
  'Mexico': { code: '+52', flag: '🇲🇽' },
  'Argentina': { code: '+54', flag: '🇦🇷' },
  'New Zealand': { code: '+64', flag: '🇳🇿' },
  'Other': { code: '+91', flag: '🌍' },
};

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
  
  // User ID lookup (optional - for existing users)
  const [userId, setUserId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [userFound, setUserFound] = useState(false);
  
  // Dynamic countries and states from globalLocationData
  const [countries, setCountries] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [customState, setCustomState] = useState('');
  const [useCustomState, setUseCustomState] = useState(false);
  
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
  
  // Load countries on mount
  useEffect(() => {
    const allCountries = getAllCountries();
    // Add 'Other' at the end
    setCountries([...allCountries, 'Other']);
  }, []);
  
  // Update states when country changes
  useEffect(() => {
    if (country && country !== 'Other') {
      const countryStates = getStatesByCountry(country);
      setStates([...countryStates, 'Other']);
      setUseCustomState(false);
      setCustomState('');
      // Reset state when country changes
      if (countryStates.length > 0) {
        setState(countryStates[0]);
      } else {
        setState('');
        setUseCustomState(true);
      }
    } else {
      setStates([]);
      setUseCustomState(true);
      setState('');
    }
    
    // Update country code based on country
    const phoneData = COUNTRY_PHONE_CODES[country];
    if (phoneData) {
      setCountryCode(phoneData.code);
    }
  }, [country]);
  
  // Handle user ID lookup
  const handleUserLookup = useCallback(async () => {
    if (!userId || userId.trim().length < 3) return;
    
    setLookupLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/forms/user-lookup?userId=${encodeURIComponent(userId.trim())}`);
      const data = await response.json();
      
      if (data.found && data.user) {
        setName(data.user.name || '');
        setEmail(data.user.email || '');
        setPhone(data.user.phone || '');
        setCountryCode(data.user.countryCode || '+91');
        setCountry(data.user.country || 'India');
        // State will be set after country effect runs
        setTimeout(() => {
          if (data.user.state) {
            const countryStates = getStatesByCountry(data.user.country || 'India');
            if (countryStates.includes(data.user.state)) {
              setState(data.user.state);
            } else {
              setCustomState(data.user.state);
              setUseCustomState(true);
            }
          }
        }, 100);
        setGender(data.user.gender || '');
        setAge(data.user.age ? String(data.user.age) : '');
        setProfession(data.user.profession || '');
        setUserFound(true);
      } else {
        setUserFound(false);
        setError('User ID not found. Please fill the form manually.');
      }
    } catch {
      setError('Failed to lookup user. Please fill manually.');
    } finally {
      setLookupLoading(false);
    }
  }, [userId]);
  
  // Get effective state value
  const getEffectiveState = () => {
    if (useCustomState || state === 'Other') {
      return customState;
    }
    return state;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const effectiveState = getEffectiveState();
    
    try {
      const payload = {
        formType,
        source: sourceParam || 'form-link',
        ref: refParam,
        existingUserId: userFound ? userId : undefined,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        countryCode,
        country,
        state: effectiveState,
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
              
              {/* User ID Lookup - Only for workshop form */}
              {formType === 'workshop' && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <label className="block text-sm font-bold text-purple-700 mb-2">
                    <Search size={14} className="inline mr-2" />
                    Already Registered? Enter Your ID (Optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => {
                        setUserId(e.target.value.replace(/[^0-9]/g, '').slice(0, 6));
                        setUserFound(false);
                      }}
                      placeholder="e.g. 518520"
                      className="flex-1 h-12 px-4 border border-purple-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-purple-300"
                    />
                    <button
                      type="button"
                      onClick={handleUserLookup}
                      disabled={lookupLoading || !userId}
                      className="px-6 h-12 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {lookupLoading ? <Loader className="animate-spin" size={16} /> : <Search size={16} />}
                      Fetch
                    </button>
                  </div>
                  {userFound && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <CheckCircle size={12} /> User found! Form auto-filled.
                    </p>
                  )}
                  <p className="text-xs text-purple-600 mt-2">
                    💡 Enter your 6-digit Profile ID to auto-fill your details. Find it in your account or email.
                  </p>
                </div>
              )}
              
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
                  <div className="w-28 h-12 px-3 border border-gray-200 rounded-xl text-sm font-medium bg-gray-50 flex items-center justify-center">
                    {COUNTRY_PHONE_CODES[country]?.flag || '🌍'} {countryCode}
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 15))}
                    placeholder="9876543210"
                    className="flex-1 h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">📱 Country code auto-updates based on selected country</p>
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
                      {countries.map(c => (
                        <option key={c} value={c}>
                          {COUNTRY_PHONE_CODES[c]?.flag || '🌍'} {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <MapPin size={14} className="inline mr-2" />
                      State *
                    </label>
                    {states.length > 0 && !useCustomState ? (
                      <select
                        value={state}
                        onChange={(e) => {
                          if (e.target.value === 'Other') {
                            setUseCustomState(true);
                            setState('Other');
                          } else {
                            setState(e.target.value);
                          }
                        }}
                        className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                        required
                      >
                        <option value="">Select State</option>
                        {states.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={customState}
                          onChange={(e) => setCustomState(e.target.value)}
                          placeholder="Enter your state/province"
                          className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-300"
                          required
                        />
                        {states.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomState(false);
                              setCustomState('');
                              setState(states[0] || '');
                            }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-purple-600 hover:underline"
                          >
                            Show list
                          </button>
                        )}
                      </div>
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
