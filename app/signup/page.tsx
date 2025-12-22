'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SocialLoginButtons from '@/components/SocialLoginButtons';
import { Eye, EyeOff } from 'lucide-react';
import { addCartItem, CartCurrency } from '@/lib/cart';
import { getCurrencyForLanguage } from '@/lib/paymentLinkHelper';
import { setSession } from '@/lib/sessionManager';

export const dynamic = 'force-dynamic';

function SignUpInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams?.get('redirect') || '/';
  const workshop = searchParams?.get('workshop') || 'swar-yoga-basic';
  const mode = searchParams?.get('mode') || 'online';
  const language = searchParams?.get('language') || 'hindi';

  const currency = (getCurrencyForLanguage(language) as CartCurrency) || 'INR';

  const workshopDisplayName = workshop
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    country: '',
    state: '',
    gender: '',
    age: '',
    profession: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  // Auto-detect user's country based on geolocation
  useEffect(() => {
    const detectCountry = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const detectedCountry = data.country_name;
        
        if (detectedCountry) {
          setFormData(prev => ({ ...prev, country: detectedCountry }));
          
          // Auto-set country code if detected country matches
          const countryCodeMap: Record<string, string> = {
            'India': '+91',
            'United States': '+1',
            'United Kingdom': '+44',
            'Australia': '+61',
            'Nepal': '+977',
            'Singapore': '+65',
            'United Arab Emirates': '+971'
          };
          
          if (countryCodeMap[detectedCountry]) {
            setFormData(prev => ({ ...prev, countryCode: countryCodeMap[detectedCountry] }));
          }
        }
      } catch (error) {
        // Avoid noisy console logs in production; location detection is best-effort.
        if (process.env.NODE_ENV !== 'production') {
          console.debug('Could not detect location:', error);
        }
      }
    };

    detectCountry();
  }, []);

  const countryCodes = [
    { code: '+91', country: 'India' },
    { code: '+1', country: 'USA/Canada' },
    { code: '+44', country: 'UK' },
    { code: '+61', country: 'Australia' },
    { code: '+977', country: 'Nepal' },
    { code: '+65', country: 'Singapore' },
    { code: '+971', country: 'UAE' },
  ];

  const indianStates = [
    'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
    'Dadra and Nagar Haveli', 'Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
    'Karnataka', 'Kashmir and Jammu', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
  ];

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
    'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
    'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
    'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
    'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const canadianProvinces = [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories',
    'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'
  ];

  const australianStates = [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'
  ];

  const nepalProvinces = [
    'Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'
  ];

  const getStatesList = (country: string) => {
    switch (country) {
      case 'India':
        return indianStates;
      case 'United States':
        return usStates;
      case 'Canada':
        return canadianProvinces;
      case 'Australia':
        return australianStates;
      case 'Nepal':
        return nepalProvinces;
      default:
        return [];
    }
  };

  const countries = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
    'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
    'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
    'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
    'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt',
    'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
    'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
    'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
    'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait',
    'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
    'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico',
    'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
    'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
    'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
    'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
    'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
    'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
    'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
    'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    if (!formData.state) {
      newErrors.state = 'State/Province is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (parseInt(formData.age) < 13) {
      newErrors.age = 'You must be at least 13 years old';
    }

    if (!formData.profession.trim()) {
      newErrors.profession = 'Profession is required';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
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
      // API call to backend
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        countryCode: formData.countryCode || '+91',
        country: formData.country.trim(),
        state: formData.state.trim(),
        gender: formData.gender.trim(),
        age: formData.age.toString(),  // Convert to string like curl does
        profession: formData.profession.trim(),
        password: formData.password,
      };

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || 'Signup failed';
        console.error('❌ Signup error:', errorMessage);
        setErrors({ general: errorMessage });
        setSubmitStatus('error');
        throw new Error(errorMessage);
      }
      setSubmitStatus('success');

      // Use session manager to store token with 2-day expiry
      const storedUser = {
        id: data.user?.id || '',
        name: data.user?.name || formData.name.trim(),
        email: data.user?.email || formData.email.trim(),
        phone: data.user?.phone || formData.phone.trim(),
        countryCode: data.user?.countryCode || formData.countryCode || '+91'
      };

      if (data.token) {
        setSession({
          token: data.token,
          user: storedUser
        });
      }

      // Add the workshop to cart so user can pay from cart page
      addCartItem({
        id: `${workshop}-${mode}-${language}`,
        name: `${workshopDisplayName} (${mode.charAt(0).toUpperCase() + mode.slice(1)} - ${language.charAt(0).toUpperCase() + language.slice(1)})`,
        price: currency === 'USD' ? 29 : 999,
        quantity: 1,
        currency,
        workshop,
        mode,
        language,
      });

      router.push('/cart');
    } catch (err) {
      console.error('Sign-up error:', err);
      setErrors({ general: 'An error occurred. Please try again.' });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: '' }));
    }
  };

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-gradient-to-br from-yoga-50 to-white pt-24 pb-12">
        <div className="container mx-auto max-w-2xl px-6">
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-yoga-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">👤</span>
              </div>
              <h1 className="text-4xl font-bold text-swar-accent mb-2">Create Your Account</h1>
              <p className="text-lg text-swar-text-secondary">
                Join Swar Yoga and start your transformation journey
              </p>
              {redirectPath && redirectPath !== '/' && (
                <div className="mt-3 text-sm text-swar-primary font-medium">
                  Sign up to continue to{' '}
                  {redirectPath === 'account'
                    ? 'your account'
                    : redirectPath === 'cart'
                    ? 'your cart'
                    : redirectPath === 'checkout'
                    ? 'checkout'
                    : redirectPath}
                </div>
              )}
            </div>

            {/* Social Login Buttons */}
            <div className="mb-8">
              <SocialLoginButtons
                onSuccess={(user) => {
                  // User logged in successfully via social login
                  // Redirect to the intended path
                  router.push(redirectPath || '/profile');
                }}
                onError={(error) => {
                  setErrors({ general: error || 'Social login failed' });
                }}
              />
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-swar-primary-light border border-green-200 rounded-lg flex items-center space-x-3">
                <span className="text-swar-primary text-xl">✓</span>
                <span className="text-swar-primary font-medium">
                  Account created successfully! Redirecting...
                </span>
              </div>
            )}

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <span className="text-red-600 text-xl">⚠</span>
                <span className="text-red-800 font-medium">{errors.general}</span>
              </div>
            )}

            {/* Sign Up Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Personal Information Section */}
              <div className="space-y-5 bg-swar-bg rounded-lg p-6 border border-swar-border">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-1 h-6 bg-swar-primary rounded"></div>
                  <h2 className="text-xl font-bold text-swar-text">Personal Information</h2>
                </div>

                {/* Full Name & Email */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-semibold text-swar-text mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all ${
                        errors.name ? 'border-red-400 bg-red-50' : 'border-swar-border bg-white'
                      }`}
                      placeholder="Enter your full name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600 font-medium">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-swar-text mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all ${
                        errors.email ? 'border-red-400 bg-red-50' : 'border-swar-border bg-white'
                      }`}
                      placeholder="your@email.com"
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600 font-medium">{errors.email}</p>
                    )}
                  </div>
                </div>

                {/* Country Code & Phone */}
                <div className="grid md:grid-cols-4 gap-4 md:gap-6">
                  <div>
                    <label htmlFor="countryCode" className="block text-sm font-semibold text-swar-text mb-2">
                      Country Code
                    </label>
                    <select
                      id="countryCode"
                      name="countryCode"
                      value={formData.countryCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                    >
                      {countryCodes.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-semibold text-swar-text mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                {/* Country & State */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="country" className="block text-sm font-semibold text-swar-text mb-2">
                      Country
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                    >
                      <option value="">Select Country</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-semibold text-swar-text mb-2">
                      State/Province {formData.country && <span className="text-red-500">*</span>}
                    </label>
                    {formData.country ? (
                      <select
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                      >
                        <option value="">Select State/Province</option>
                        {getStatesList(formData.country).map((state) => (
                          <option key={state} value={state}>
                            {state}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border-2 border-dashed border-swar-border rounded-lg bg-swar-bg text-swar-text-secondary cursor-not-allowed"
                        placeholder="Select a country first"
                        disabled
                      />
                    )}
                  </div>
                </div>

                {/* Gender, Age, Profession */}
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-swar-text mb-2">
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-semibold text-swar-text mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                      placeholder="Your age"
                      min="1"
                      max="120"
                    />
                  </div>

                  <div>
                    <label htmlFor="profession" className="block text-sm font-semibold text-swar-text mb-2">
                      Profession
                    </label>
                    <input
                      type="text"
                      id="profession"
                      name="profession"
                      value={formData.profession}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 border-swar-border rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all bg-white"
                      placeholder="Your profession"
                    />
                  </div>
                </div>
              </div>

              {/* Security Information Section */}
              <div className="space-y-5 bg-swar-bg rounded-lg p-6 border border-swar-border">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-1 h-6 bg-swar-accent rounded"></div>
                  <h2 className="text-xl font-bold text-swar-text">Security</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-swar-text mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all pr-10 ${
                          errors.password ? 'border-red-400 bg-red-50' : 'border-swar-border bg-white'
                        }`}
                        placeholder="Create a password (min. 6 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-swar-text-secondary hover:text-swar-primary"
                      >
                        {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600 font-medium">{errors.password}</p>
                    )}
                    <p className="mt-2 text-xs text-swar-text-secondary">Password must be at least 6 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-swar-text mb-2">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-swar-primary focus:border-swar-primary transition-all pr-10 ${
                          errors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-swar-border bg-white'
                        }`}
                        placeholder="Confirm your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-swar-text-secondary hover:text-swar-primary"
                      >
                        {showConfirmPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 font-medium">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="space-y-4 bg-swar-bg rounded-lg p-6 border border-swar-border">
                <label className="flex items-start space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="mt-1 w-5 h-5 border-2 border-swar-border rounded text-swar-primary focus:ring-2 focus:ring-swar-primary cursor-pointer"
                  />
                  <span className="text-sm text-swar-text-secondary group-hover:text-swar-text transition-colors">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTerms(!showTerms);
                      }}
                      className="text-swar-primary hover:text-swar-accent font-semibold underline"
                    >
                      Terms and Conditions
                    </button>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-swar-primary hover:text-swar-accent font-semibold">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                {errors.agreeToTerms && (
                  <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
                )}

                {/* Expandable Terms Content */}
                {showTerms && (
                  <div className="mt-4 pt-4 border-t border-swar-border bg-white rounded-lg p-4 max-h-96 overflow-y-auto">
                    <h3 className="font-bold text-swar-text mb-3">Terms and Conditions</h3>
                    <div className="text-sm text-swar-text-secondary space-y-3">
                      <p>
                        Welcome to Swar Yoga. These Terms and Conditions govern your use of our website and services. By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
                      </p>
                      <p>
                        <strong>Use License:</strong> Permission is granted to temporarily download one copy of the materials (information or software) on Swar Yoga's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                      </p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Modifying or copying the materials</li>
                        <li>Using the materials for any commercial purpose or for any public display</li>
                        <li>Attempting to decompile or reverse engineer any software</li>
                        <li>Removing any copyright or other proprietary notations from the materials</li>
                        <li>Transferring the materials to another person or "mirroring" the materials</li>
                      </ul>
                      <p>
                        <strong>Disclaimer:</strong> The materials on Swar Yoga's website are provided on an 'as is' basis. Swar Yoga makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement.
                      </p>
                      <p>
                        <strong>Limitations:</strong> In no event shall Swar Yoga or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials.
                      </p>
                      <p>
                        <strong>Accuracy of Materials:</strong> The materials appearing on Swar Yoga's website could include technical, typographical, or photographic errors. Swar Yoga does not warrant that any of the materials on its website are accurate, complete, or current. Swar Yoga may make changes to the materials contained on its website at any time without notice.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowTerms(false)}
                      className="mt-4 text-swar-primary hover:text-swar-accent font-semibold text-sm"
                    >
                      ▲ Hide Terms
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 text-white py-4 px-6 rounded-lg font-bold hover:from-yoga-700 hover:to-yoga-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>👤</span>
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Sign In Link */}
            <div className="mt-8 text-center">
              <p className="text-swar-text-secondary">
                Already have an account?{' '}
                <Link
                  href={`/signin${redirectPath && redirectPath !== '/' ? `?redirect=${redirectPath}` : ''}`}
                  className="text-swar-primary hover:text-swar-accent font-bold"
                >
                  Sign in here
                </Link>
              </p>
            </div>

            {/* Life Planner Access Note */}
            <div className="mt-6 p-4 bg-yoga-50 border border-yoga-200 rounded-lg text-center">
              <p className="text-sm text-yoga-800">
                ✨ After creating your account, you can access your personal Life Planner to track your transformation journey.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SignUp() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  );
}
