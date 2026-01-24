/**
 * Upamanyu Investment Form
 * Private Limited Company - Equity and Preference Shares
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ENTITIES, ENTITY_NAMES, SHARE_TYPES, SHARE_TYPE_NAMES } from '@/lib/investment-constants';
import { InvestmentButton } from '@/components/investment/InvestmentButton';
import { FormInput } from '@/components/investment/FormInput';
import { DatePickerDropdown } from '@/components/investment/DatePickerDropdown';
import { InvestmentCard } from '@/components/investment/InvestmentCard';
import {
  validatePhoneNumber,
  validateInvestmentDates,
  calculateYears,
  calculatePreferenceDividend,
  calculateEquityReturns,
  formatCurrency,
  formatDate,
} from '@/lib/investment-utils';

interface FormData {
  name: string;
  countryCode: string;
  phone: string;
  shareType: 'equity' | 'preference';
  investmentAmount: string;
  paymentMode: 'INR' | 'NPR' | 'USD';
  startYear: string;
  startMonth: string;
  startDay: string;
  endYear: string;
  endMonth: string;
  endDay: string;
}

interface Errors {
  [key: string]: string;
}

interface CompanyInfo {
  equityPrice?: number;
  preferencePrice?: number;
}

export default function UpamanyuPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    countryCode: '+91',
    phone: '',
    shareType: SHARE_TYPES.EQUITY,
    investmentAmount: '',
    paymentMode: 'INR',
    startYear: new Date().getFullYear().toString(),
    startMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
    startDay: String(new Date().getDate()).padStart(2, '0'),
    endYear: (new Date().getFullYear() + 3).toString(),
    endMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
    endDay: String(new Date().getDate()).padStart(2, '0'),
  });

  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({});
  const [timezone, setTimezone] = useState<string>('');
  const [calculation, setCalculation] = useState<{
    sharePrice: number;
    totalAmount: number;
    years: number;
    numberOfShares: number;
    yearlyReturn?: number;
    totalReturn?: number;
  } | null>(null);

  // Get device timezone and fetch company info
  useEffect(() => {
    // Get user's device timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(userTimezone);

    // Fetch company share prices
    const fetchCompanyInfo = async () => {
      try {
        const response = await fetch('/api/investment/company');
        if (response.ok) {
          const data = await response.json();
          setCompanyInfo(data);
        }
      } catch (error) {
        console.error('Failed to fetch company info:', error);
      }
    };

    fetchCompanyInfo();
  }, []);

  // Get today's date in YYYY-MM-DD format (using local time, not UTC)
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  // Build date string from year/month/day dropdowns
  const getStartDate = (): string => {
    return `${formData.startYear}-${formData.startMonth}-${formData.startDay}`;
  };

  const getEndDate = (): string => {
    return `${formData.endYear}-${formData.endMonth}-${formData.endDay}`;
  };

  // Convert investment amount to shares
  const calculateShares = (): number => {
    if (!formData.investmentAmount) return 0;
    const sharePrice =
      formData.shareType === SHARE_TYPES.EQUITY
        ? companyInfo.equityPrice || 110
        : companyInfo.preferencePrice || 10;
    return Math.floor(parseInt(formData.investmentAmount) / sharePrice);
  };

  // Auto-update date after midnight and initialize end date on load
  useEffect(() => {
    // Just initialize once on mount, dates now controlled by dropdowns
    return () => {};
  }, []);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Recalculate on relevant changes
    if (['investmentAmount', 'shareType', 'startYear', 'startMonth', 'startDay', 'endYear', 'endMonth', 'endDay'].includes(name)) {
      setTimeout(() => recalculate(), 100);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!validatePhoneNumber(formData.phone)) newErrors.phone = 'Valid phone number required';
    if (!formData.investmentAmount || parseInt(formData.investmentAmount) < 1)
      newErrors.investmentAmount = 'Investment amount is required';
    
    const sharePrice =
      formData.shareType === SHARE_TYPES.EQUITY
        ? companyInfo.equityPrice || 110
        : companyInfo.preferencePrice || 10;
    const shares = calculateShares();
    if (shares < 1) {
      newErrors.investmentAmount = `Minimum investment required: ₹${sharePrice}`;
    }

    const startDate = new Date(parseInt(formData.startYear), parseInt(formData.startMonth) - 1, parseInt(formData.startDay));
    const endDate = new Date(parseInt(formData.endYear), parseInt(formData.endMonth) - 1, parseInt(formData.endDay));

    // Validate that end date is at least 90 days from start date
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
    
    if (diffDays < 90) {
      newErrors.endDate = 'Maturity date must be at least 90 days from start date';
    }

    const dateValidation = validateInvestmentDates(startDate, endDate);
    if (!dateValidation.valid && !newErrors.endDate) {
      newErrors.endDate = dateValidation.error || 'Invalid dates';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Recalculate investment
  const recalculate = () => {
    if (formData.investmentAmount) {
      const sharePrice =
        formData.shareType === SHARE_TYPES.EQUITY
          ? companyInfo.equityPrice || 110
          : companyInfo.preferencePrice || 10;

      const numberOfShares = calculateShares();
      const totalAmount = sharePrice * numberOfShares;
      
      const startDate = new Date(parseInt(formData.startYear), parseInt(formData.startMonth) - 1, parseInt(formData.startDay));
      const endDate = new Date(parseInt(formData.endYear), parseInt(formData.endMonth) - 1, parseInt(formData.endDay));

      const dateValidation = validateInvestmentDates(startDate, endDate);
      if (dateValidation.valid) {
        const years = calculateYears(startDate, endDate);

        let calc: any = {
          sharePrice,
          totalAmount,
          years,
          numberOfShares,
        };

        if (formData.shareType === SHARE_TYPES.PREFERENCE) {
          // Preference shares: 12% fixed dividend
          const dividendInfo = calculatePreferenceDividend(totalAmount, years);
          calc.yearlyReturn = dividendInfo.yearlyDividend;
          calc.totalReturn = dividendInfo.totalDividend;
        } else {
          // Equity shares: minimum 18% PA
          const EQUITY_RATE = 0.18;
          calc.yearlyReturn = totalAmount * EQUITY_RATE;
          calc.totalReturn = totalAmount * EQUITY_RATE * years;
        }

        setCalculation(calc);
      }
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    console.log('[Upamanyu Form] Starting submission...');

    try {
      const sharePrice =
        formData.shareType === SHARE_TYPES.EQUITY
          ? companyInfo.equityPrice || 110
          : companyInfo.preferencePrice || 10;

      const numberOfShares = calculateShares();
      const totalAmount = sharePrice * numberOfShares;

      const payload = {
        entity: ENTITIES.UPAMANYU,
        name: formData.name,
        phone: `${formData.countryCode}${formData.phone}`,
        paymentMode: formData.paymentMode,
        shareType: formData.shareType,
        numberOfShares: numberOfShares,
        sharePrice: sharePrice,
        amount: totalAmount,
        startDate: new Date(parseInt(formData.startYear), parseInt(formData.startMonth) - 1, parseInt(formData.startDay)).toISOString(),
        endDate: new Date(parseInt(formData.endYear), parseInt(formData.endMonth) - 1, parseInt(formData.endDay)).toISOString(),
      };

      console.log('[Upamanyu Form] Sending investment payload:', payload);

      // Send submission data
      const response = await fetch('/api/investment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('[Upamanyu Form] API Response Status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Upamanyu Form] API Error:', errorData);
        throw new Error(errorData.error || 'Submission failed');
      }

      const result = await response.json();
      console.log('[Upamanyu Form] API Response:', result);

      if (!result.success) {
        console.error('[Upamanyu Form] Response indicates failure:', result);
        throw new Error(result.message || 'Investment not saved - unknown error');
      }

      // Verify certificate number was returned
      if (!result.certificateNumber) {
        console.error('[Upamanyu Form] No certificate number in response:', result);
        throw new Error('Investment submitted but certificate not generated');
      }

      console.log('[Upamanyu Form] Investment successful! Certificate:', result.certificateNumber);
      setSuccess(true);
      setFormData({
        name: '',
        countryCode: '+91',
        phone: '',
        shareType: SHARE_TYPES.EQUITY,
        investmentAmount: '',
        paymentMode: 'INR',
        startYear: new Date().getFullYear().toString(),
        startMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
        startDay: String(new Date().getDate()).padStart(2, '0'),
        endYear: (new Date().getFullYear() + 3).toString(),
        endMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
        endDay: String(new Date().getDate()).padStart(2, '0'),
      });
      
      // Show success for 2 seconds before redirecting
      setTimeout(() => {
        console.log('[Upamanyu Form] Redirecting to dashboard...');
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
      console.error('[Upamanyu Form] Submission error:', errorMessage);
      setErrors({ submit: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🏢 {ENTITY_NAMES[ENTITIES.UPAMANYU]}
          </h1>
          <p className="text-gray-600">
            Invest in our private limited company through equity or preference shares. Choose the option that
            best fits your investment goals.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
            ✅ Investment submitted successfully! Redirecting to dashboard...
          </div>
        )}

        {/* Error Message */}
        {errors.submit && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            ❌ {errors.submit}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <InvestmentCard title="Investment Details">
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Personal Information */}
                <div className="border-b pb-6">
                  <h3 className="font-bold text-gray-800 mb-4">Your Information</h3>

                  <FormInput
                    label="Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    error={errors.name}
                    required
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Country Code <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="countryCode"
                        value={formData.countryCode}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Select Country</option>
                        <option value="+91">🇮🇳 +91 (India)</option>
                        <option value="+977">🇳🇵 +977 (Nepal)</option>
                        <option value="+880">🇧🇩 +880 (Bangladesh)</option>
                        <option value="+92">🇵🇰 +92 (Pakistan)</option>
                        <option value="+94">🇱🇰 +94 (Sri Lanka)</option>
                        <option value="+971">🇦🇪 +971 (UAE)</option>
                        <option value="+1">🇺🇸 +1 (USA)</option>
                        <option value="+1">🇨🇦 +1 (Canada)</option>
                        <option value="+44">🇬🇧 +44 (UK)</option>
                        <option value="+49">🇩🇪 +49 (Germany)</option>
                        <option value="+33">🇫🇷 +33 (France)</option>
                        <option value="+61">🇦🇺 +61 (Australia)</option>
                        <option value="+81">🇯🇵 +81 (Japan)</option>
                        <option value="+86">🇨🇳 +86 (China)</option>
                        <option value="+65">🇸🇬 +65 (Singapore)</option>
                        <option value="+852">🇭🇰 +852 (Hong Kong)</option>
                        <option value="+66">🇹🇭 +66 (Thailand)</option>
                        <option value="+63">🇵🇭 +63 (Philippines)</option>
                        <option value="+62">🇮🇩 +62 (Indonesia)</option>
                        <option value="+60">🇲🇾 +60 (Malaysia)</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <FormInput
                        label="Phone Number"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        error={errors.phone}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Share Type */}
                <div className="border-b pb-6">
                  <h3 className="font-bold text-gray-800 mb-4">Choose Share Type</h3>

                  <div className="space-y-4">
                    {[SHARE_TYPES.EQUITY, SHARE_TYPES.PREFERENCE].map((type) => (
                      <label
                        key={type}
                        className={`
                          block p-4 border-2 rounded-lg cursor-pointer transition-all
                          ${
                            formData.shareType === type
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-300 bg-white hover:border-gray-400'
                          }
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="shareType"
                            value={type}
                            checked={formData.shareType === type}
                            onChange={handleChange}
                            className="w-5 h-5 mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{SHARE_TYPE_NAMES[type]}</p>
                            {type === SHARE_TYPES.EQUITY && (
                              <p className="text-sm text-gray-600 mt-1">
                                Minimum 18% annual returns + growth potential
                              </p>
                            )}
                            {type === SHARE_TYPES.PREFERENCE && (
                              <p className="text-sm text-gray-600 mt-1">12% fixed annual dividend</p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Price: {formatCurrency(
                                type === SHARE_TYPES.EQUITY
                                  ? companyInfo.equityPrice || 1000
                                  : companyInfo.preferencePrice || 1000
                              )}{' '}
                              per share
                            </p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Investment Amount */}
                <div className="border-b pb-6">
                  <h3 className="font-bold text-gray-800 mb-4">Investment Amount & Share Details</h3>

                  {formData.shareType === SHARE_TYPES.EQUITY && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>ℹ️ Equity:</strong> Price ₹{companyInfo.equityPrice || 110}/share
                      </p>
                    </div>
                  )}
                  {formData.shareType === SHARE_TYPES.PREFERENCE && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>ℹ️ Preference:</strong> Price ₹{companyInfo.preferencePrice || 10}/share | 12% fixed dividend
                      </p>
                    </div>
                  )}

                  <FormInput
                    label="Investment Amount (₹)"
                    name="investmentAmount"
                    type="number"
                    value={formData.investmentAmount}
                    onChange={handleChange}
                    placeholder="Enter your investment amount"
                    error={errors.investmentAmount}
                    step="100"
                    required
                  />

                  {formData.investmentAmount && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>📊 Auto-calculated Shares:</strong> {calculateShares()} shares
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Amount: ₹{formData.investmentAmount} ÷ ₹{formData.shareType === SHARE_TYPES.EQUITY ? companyInfo.equityPrice || 110 : companyInfo.preferencePrice || 10} per share
                      </p>
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="INR">🇮🇳 INR (Indian Rupees)</option>
                      <option value="NPR">🇳🇵 NPR (Nepalese Rupees)</option>
                      <option value="USD">🇺🇸 USD (US Dollars)</option>
                    </select>
                  </div>
                </div>
                    min="1"
                    required
                  />

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Payment Mode <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="paymentMode"
                      value={formData.paymentMode}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                    >
                      <option value="INR">₹ INR (Indian Rupee)</option>
                      <option value="NPR">₨ NPR (Nepalese Rupee)</option>
                      <option value="USD">$ USD (US Dollar)</option>
                    </select>
                  </div>

                  {calculation && (
                    <div className="mt-4 space-y-3">
                      {formData.shareType === SHARE_TYPES.EQUITY && (
                        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>📦 Shares Taken:</strong>
                          </p>
                          <p className="text-lg font-bold text-orange-600">
                            {calculation.numberOfShares} Shares
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(calculation.numberOfShares / 110).toFixed(2)} Lots ({calculation.numberOfShares} ÷ 110)
                          </p>
                        </div>
                      )}

                      {formData.shareType === SHARE_TYPES.PREFERENCE && (
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>📦 Shares Taken:</strong>
                          </p>
                          <p className="text-lg font-bold text-purple-600">
                            {calculation.numberOfShares} Shares
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            @ {formatCurrency(calculation.sharePrice)} per share
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Total Investment Amount:</strong>
                        </p>
                        <p className="text-2xl font-bold text-blue-600">{formatCurrency(calculation.totalAmount)}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatCurrency(calculation.sharePrice)} × {calculation.numberOfShares} shares
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-4">Investment Duration</h3>

                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Year <span className="text-red-500">*</span></label>
                      <select
                        name="startYear"
                        value={formData.startYear}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(10)].map((_, i) => {
                          const year = new Date().getFullYear() + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Month <span className="text-red-500">*</span></label>
                      <select
                        name="startMonth"
                        value={formData.startMonth}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(12)].map((_, i) => {
                          const month = String(i + 1).padStart(2, '0');
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return <option key={month} value={month}>{monthNames[i]}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Start Day <span className="text-red-500">*</span></label>
                      <select
                        name="startDay"
                        value={formData.startDay}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(31)].map((_, i) => {
                          const day = String(i + 1).padStart(2, '0');
                          return <option key={day} value={day}>{day}</option>;
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Maturity Year <span className="text-red-500">*</span></label>
                      <select
                        name="endYear"
                        value={formData.endYear}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(15)].map((_, i) => {
                          const year = new Date().getFullYear() + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Maturity Month <span className="text-red-500">*</span></label>
                      <select
                        name="endMonth"
                        value={formData.endMonth}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(12)].map((_, i) => {
                          const month = String(i + 1).padStart(2, '0');
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return <option key={month} value={month}>{monthNames[i]}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Maturity Day <span className="text-red-500">*</span></label>
                      <select
                        name="endDay"
                        value={formData.endDay}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        {[...Array(31)].map((_, i) => {
                          const day = String(i + 1).padStart(2, '0');
                          return <option key={day} value={day}>{day}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <InvestmentButton
                    variant="orange"
                    size="lg"
                    type="submit"
                    loading={loading}
                    className="w-full"
                  >
                    Submit Investment 🚀
                  </InvestmentButton>
                </div>
              </form>
            </InvestmentCard>
          </div>

          {/* Calculation Summary */}
          <div>
            <InvestmentCard title="Investment Returns">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase font-semibold">Share Type</p>
                  <p className="text-lg font-bold text-orange-600">
                    {SHARE_TYPE_NAMES[formData.shareType]}
                  </p>
                </div>

                {calculation && (
                  <>
                    <hr className="my-4" />

                    <div>
                      <p className="text-sm text-gray-500 uppercase font-semibold">Total Investment</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(calculation.totalAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 uppercase font-semibold">Duration</p>
                      <p className="text-lg font-semibold text-gray-800">
                        {calculation.years.toFixed(2)} years
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 uppercase font-semibold">Number of Shares Taken</p>
                      <p className="text-lg font-bold text-blue-600">
                        {calculation.numberOfShares} Shares
                      </p>
                    </div>

                    {formData.shareType === SHARE_TYPES.PREFERENCE ? (
                      <>
                        <div>
                          <p className="text-sm text-gray-500 uppercase font-semibold">Yearly Dividend</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(calculation.yearlyReturn || 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">(12% fixed dividend)</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Total Getting at Maturity</p>
                          <div className="text-2xl font-bold text-gray-800 space-y-2">
                            <div>
                              {formatCurrency(calculation.totalAmount)} + {formatCurrency(calculation.totalReturn || 0)}
                            </div>
                            <div className="text-3xl text-green-600 border-t pt-2 mt-2">
                              = {formatCurrency((calculation.totalAmount || 0) + (calculation.totalReturn || 0))}
                            </div>
                          </div>
                          <p className="text-xs text-green-700 mt-3 font-semibold">
                            💰 12% per annum = {formatCurrency(calculation.totalReturn || 0)} for {calculation.years.toFixed(2)} years
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-sm text-gray-500 uppercase font-semibold">Yearly Profit (Minimum)</p>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(calculation.yearlyReturn || 0)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">(18% minimum per annum)</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Total Getting at Maturity</p>
                          <div className="text-2xl font-bold text-gray-800 space-y-2">
                            <div>
                              {formatCurrency(calculation.totalAmount)} + {formatCurrency(calculation.totalReturn || 0)}
                            </div>
                            <div className="text-3xl text-green-600 border-t pt-2 mt-2">
                              = {formatCurrency((calculation.totalAmount || 0) + (calculation.totalReturn || 0))}
                            </div>
                          </div>
                          <p className="text-xs text-green-700 mt-3 font-semibold">
                            💰 Minimum 18% per annum = {formatCurrency(calculation.totalReturn || 0)} for {calculation.years.toFixed(2)} years
                          </p>
                        </div>
                      </>
                    )}

                    <p className="text-xs text-gray-500 italic">
                      {formData.shareType === SHARE_TYPES.PREFERENCE
                        ? `Receive ₹${calculation.yearlyReturn?.toFixed(0) || 0} dividend yearly`
                        : `Receive ₹${calculation.yearlyReturn?.toFixed(0) || 0} yearly + appreciation`}
                    </p>
                  </>
                )}

                {!calculation && (
                  <p className="text-center text-gray-500 text-sm py-8">
                    Fill in the details to see calculation
                  </p>
                )}
              </div>
            </InvestmentCard>

            {/* Info Box */}
            <InvestmentCard title="Share Benefits" className="mt-6">
              {formData.shareType === SHARE_TYPES.PREFERENCE ? (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <span>Guaranteed 12% dividend annually</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <span>Predictable returns</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <span>Priority claim on company assets</span>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <span>10% annual dividend returns</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <span>Capital appreciation potential</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                    <span>Ownership stake in the company</span>
                  </li>
                </ul>
              )}
            </InvestmentCard>
          </div>
        </div>
      </div>
    </div>
  );
}
