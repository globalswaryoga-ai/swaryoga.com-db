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
  numberOfShares: string;
  paymentMode: 'INR' | 'NPR' | 'USD';
  startDate: string;
  endDate: string;
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
    numberOfShares: '',
    paymentMode: 'INR',
    startDate: '',
    endDate: '',
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

  // Auto-update date after midnight and initialize end date on load
  useEffect(() => {
    const updateDateIfNewDay = () => {
      const today = getTodayDate();
      
      // Calculate 90 days from today (using local time)
      const future = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 90);
      const year = future.getFullYear();
      const month = String(future.getMonth() + 1).padStart(2, '0');
      const date = String(future.getDate()).padStart(2, '0');
      const endDate90 = `${year}-${month}-${date}`;
      
      setFormData((prev) => {
        // Initialize on first load (when startDate is empty)
        const needsInitialization = !prev.startDate;
        // Or update if the date has changed (comparing date strings)
        const hasDateChanged = prev.startDate !== today;
        
        if (needsInitialization || hasDateChanged) {
          if (needsInitialization) {
            console.log('[Upamanyu] Initialized dates:', { startDate: today, endDate: endDate90 });
          } else {
            console.log('[Upamanyu] Date auto-updated:', { old: prev.startDate, new: today });
          }
          return {
            ...prev,
            startDate: today,
            endDate: endDate90,
          };
        }
        return prev;
      });
    };

    // Update immediately on mount with today's date
    updateDateIfNewDay();

    // Check every 60 seconds if it's a new day (to catch midnight changes)
    const interval = setInterval(updateDateIfNewDay, 60000);

    return () => clearInterval(interval);
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
    if (['numberOfShares', 'shareType', 'startDate', 'endDate'].includes(name)) {
      setTimeout(() => recalculate(formData), 100);
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!validatePhoneNumber(formData.phone)) newErrors.phone = 'Valid phone number required';
    if (!formData.numberOfShares || parseInt(formData.numberOfShares) < 1)
      newErrors.numberOfShares = 'Minimum 1 share required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';

    // Validate that end date is at least 90 days from start date
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate.split(' ')[0]);
      const endDate = new Date(formData.endDate.split(' ')[0]);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      
      if (diffDays < 90) {
        newErrors.endDate = 'Maturity date must be at least 90 days from start date';
      }
    }

    const dateValidation = validateInvestmentDates(
      new Date(formData.startDate.split(' ')[0]),
      new Date(formData.endDate.split(' ')[0])
    );
    if (!dateValidation.valid && !newErrors.endDate) {
      newErrors.endDate = dateValidation.error || 'Invalid dates';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Recalculate investment with 18% minimum PA for equity
  const recalculate = (data: FormData) => {
    if (
      data.numberOfShares &&
      data.startDate &&
      data.endDate &&
      parseInt(data.numberOfShares) > 0
    ) {
      const sharePrice =
        data.shareType === SHARE_TYPES.EQUITY
          ? companyInfo.equityPrice || 1000
          : companyInfo.preferencePrice || 1000;

      const numberOfShares = parseInt(data.numberOfShares);
      const totalAmount = sharePrice * numberOfShares;
      
      // Parse dates using local timezone (not UTC)
      const startParts = data.startDate.split('-');
      const endParts = data.endDate.split('-');
      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));

      const dateValidation = validateInvestmentDates(startDate, endDate);
      if (dateValidation.valid) {
        const years = calculateYears(startDate, endDate);

        let calculation: any = {
          sharePrice,
          totalAmount,
          years,
          numberOfShares,
        };

        if (data.shareType === SHARE_TYPES.PREFERENCE) {
          // Preference shares: 12% fixed dividend
          const dividendInfo = calculatePreferenceDividend(totalAmount, years);
          calculation.yearlyReturn = dividendInfo.yearlyDividend;
          calculation.totalReturn = dividendInfo.totalDividend;
        } else {
          // Equity shares: minimum 18% PA
          const EQUITY_RATE = 0.18;
          calculation.yearlyReturn = totalAmount * EQUITY_RATE;
          calculation.totalReturn = totalAmount * EQUITY_RATE * years;
        }

        setCalculation(calculation);
      }
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const sharePrice =
        formData.shareType === SHARE_TYPES.EQUITY
          ? companyInfo.equityPrice || 110
          : companyInfo.preferencePrice || 10;

      const numberOfShares = parseInt(formData.numberOfShares);
      const totalAmount = sharePrice * numberOfShares;

      // Send submission data
      const response = await fetch('/api/investment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity: ENTITIES.UPAMANYU,
          name: formData.name,
          phone: `${formData.countryCode}${formData.phone}`,
          paymentMode: formData.paymentMode,
          shareType: formData.shareType,
          numberOfShares: numberOfShares,
          sharePrice: sharePrice,
          amount: totalAmount,
          startDate: new Date(formData.startDate.split(' ')[0]).toISOString(),
          endDate: new Date(formData.endDate.split(' ')[0]).toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      const result = await response.json();
      setSuccess(true);
      setFormData({
        name: '',
        countryCode: '+91',
        phone: '',
        shareType: SHARE_TYPES.EQUITY,
        numberOfShares: '',
        paymentMode: 'INR',
        startDate: '',
        endDate: '',
      });
      setTimeout(() => (window.location.href = '/dashboard'), 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred. Please try again.';
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

                {/* Number of Shares */}
                <div className="border-b pb-6">
                  <h3 className="font-bold text-gray-800 mb-4">Investment Amount & Payment</h3>

                  {formData.shareType === SHARE_TYPES.EQUITY && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>📌 Equity Share Structure:</strong> 1 Lot = 110 shares @ ₹110 = ₹12,100
                      </p>
                    </div>
                  )}

                  <FormInput
                    label={formData.shareType === SHARE_TYPES.EQUITY ? 'Number of Shares (or Lots × 110)' : 'Number of Shares'}
                    name="numberOfShares"
                    type="number"
                    value={formData.numberOfShares}
                    onChange={handleChange}
                    placeholder={formData.shareType === SHARE_TYPES.EQUITY ? 'Enter shares (110 = 1 lot)' : 'Enter number of shares'}
                    error={errors.numberOfShares}
                    step="1"
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

                  <DatePickerDropdown
                    label="Start Date"
                    value={formData.startDate}
                    onChange={(value) => {
                      // Auto-calculate end date as 90 days after start date (using local time)
                      const startParts = value.split('-');
                      const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
                      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 90);
                      
                      const year = end.getFullYear();
                      const month = String(end.getMonth() + 1).padStart(2, '0');
                      const date = String(end.getDate()).padStart(2, '0');
                      const endDateStr = `${year}-${month}-${date}`;
                      
                      setFormData((prev) => ({
                        ...prev,
                        startDate: value,
                        endDate: endDateStr,
                      }));
                    }}
                    error={errors.startDate}
                    required
                    minDate={getTodayDate()}
                  />

                  <DatePickerDropdown
                    label="End Date (Maturity)"
                    value={formData.endDate}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: value,
                      }))
                    }
                    error={errors.endDate}
                    required
                    minDate={formData.startDate}
                  />
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
