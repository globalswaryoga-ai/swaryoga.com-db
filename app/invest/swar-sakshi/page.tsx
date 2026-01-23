/**
 * Swar Sakshi Investment Form
 * Proprietorship investment with 12% fixed annual dividend
 * - Minimum ₹15,000 investment
 * - Cannot refund before due date
 * - 12% fixed annual dividend (no compounding option)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ENTITIES, ENTITY_NAMES, BUTTON_STYLES, SWAR_SAKSHI_INVESTMENT } from '@/lib/investment-constants';
import { InvestmentButton } from '@/components/investment/InvestmentButton';
import { FormInput } from '@/components/investment/FormInput';
import { DatePickerDropdown } from '@/components/investment/DatePickerDropdown';
import { InvestmentCard } from '@/components/investment/InvestmentCard';
import {
  validatePhoneNumber,
  validateInvestmentDates,
  calculateYears,
  formatCurrency,
  formatDate,
} from '@/lib/investment-utils';

interface FormData {
  name: string;
  countryCode: string;
  phone: string;
  amount: string;
  paymentMode: 'INR' | 'NPR' | 'USD';
  startDate: string;
  endDate: string;
}

interface Errors {
  [key: string]: string;
}

export default function SwarSakshiPage() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    countryCode: '+91',
    phone: '',
    amount: '',
    paymentMode: 'INR',
    startDate: '',
    endDate: '',
  });

  // Auto-calculated end date (90 days from start date)
  const getEndDate = (): string => {
    if (!formData.startDate) return '';
    const start = new Date(formData.startDate);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 90);
    return end.toISOString().split('T')[0];
  };

  // Get today's date in YYYY-MM-DD format (using local time, not UTC)
  const getTodayDate = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const date = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  // Get date 90 days from today
  const get90DaysFromNow = (): string => {
    const today = new Date();
    const future = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 90);
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const date = String(future.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  // Initialize form with today's date on mount and auto-update after midnight
  useEffect(() => {
    const updateDateIfNewDay = () => {
      const today = getTodayDate();
      const endDate = get90DaysFromNow();
      
      setFormData((prev) => {
        // Initialize on first load (when startDate is empty)
        const needsInitialization = !prev.startDate;
        // Or update if the date has changed (comparing date strings)
        const hasDateChanged = prev.startDate !== today;
        
        if (needsInitialization || hasDateChanged) {
          if (needsInitialization) {
            console.log('[Swar Sakshi] Initialized dates:', { startDate: today, endDate: endDate });
          } else {
            console.log('[Swar Sakshi] Date auto-updated:', { old: prev.startDate, new: today });
          }
          const updatedForm = {
            ...prev,
            startDate: today,
            endDate: endDate,
          };
          // Trigger recalculation with updated form data
          setTimeout(() => recalculate(updatedForm), 0);
          return updatedForm;
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

  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [calculation, setCalculation] = useState<{
    years: number;
    maturityAmount: number;
    dividend: number;
    days: number;
    dailyDividend: number;
  } | null>(null);

  // Trigger recalculation when form data changes
  useEffect(() => {
    recalculate(formData);
  }, [formData.amount, formData.startDate, formData.endDate]);

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

    // Recalculate on amount or date change
    if (['amount', 'startDate', 'endDate'].includes(name)) {
      setTimeout(() => recalculate(formData), 100);
    }
  };

  // Handle checkbox
  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Swar Sakshi doesn't have compound interest option - this is removed
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!validatePhoneNumber(formData.phone)) newErrors.phone = 'Valid phone number required (10 digits)';
    if (!formData.amount || parseFloat(formData.amount) < SWAR_SAKSHI_INVESTMENT.MINIMUM_AMOUNT)
      newErrors.amount = `Minimum investment is ${formatCurrency(SWAR_SAKSHI_INVESTMENT.MINIMUM_AMOUNT)}`;
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';
    
    // Validate that end date is at least 90 days from start date
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
      
      if (diffDays < 90) {
        newErrors.endDate = 'Maturity date must be at least 90 days from start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Recalculate based on current form data
  const recalculate = (data: FormData) => {
    if (data.amount && data.startDate && data.endDate && parseFloat(data.amount) > 0) {
      const amount = parseFloat(data.amount);
      
      // Parse dates using local time (not UTC)
      const startParts = data.startDate.split('-');
      const endParts = data.endDate.split('-');
      
      const startDate = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
      const endDate = new Date(parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]));

      // Calculate number of days between start and end date
      const timeDiff = endDate.getTime() - startDate.getTime();
      const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include start date

      // Calculate years based on actual number of days (not hardcoded 90)
      const yearsInvested = days / 365;
      // Fixed 12% annual dividend
      const totalDividend = amount * SWAR_SAKSHI_INVESTMENT.FIXED_DIVIDEND_RATE * yearsInvested;
      // Daily dividend (total dividend divided by days)
      const dailyDividend = totalDividend / days;
      const maturityAmount = amount + totalDividend;

      setCalculation({
        years: yearsInvested,
        maturityAmount,
        dividend: totalDividend,
        days,
        dailyDividend,
      });
    }
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      const payload = {
        entity: ENTITIES.SWAR_SAKSHI,
        name: formData.name,
        phone: `${formData.countryCode}${formData.phone}`,
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        interestRate: SWAR_SAKSHI_INVESTMENT.FIXED_DIVIDEND_RATE * 100, // Convert to percentage
        compound: false, // Swar Sakshi doesn't use compound interest
        startDate: formData.startDate, // Send as ISO date string, not Date object
        endDate: getEndDate(), // Send as ISO date string
        earlyRefundAllowed: false, // Cannot refund before due date
        refundRule: 'early_refund_blocked',
      };

      console.log('[Swar Sakshi Form] Submitting payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/investment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('[Swar Sakshi Form] API Response:', responseData, 'Status:', response.status);

      if (response.ok) {
        setSuccess(true);
        setFormData({
          name: '',
          phone: '',
          amount: '',
          startDate: '',
        });
        setTimeout(() => (window.location.href = '/dashboard'), 2000);
      } else {
        console.error('[Swar Sakshi Form] API Error:', responseData);
        const errorMessage = responseData.error || responseData.message || 'Submission failed';
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      console.error('[Swar Sakshi Form] Exception:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💼 {ENTITY_NAMES[ENTITIES.SWAR_SAKSHI]}
          </h1>
          <p className="text-gray-600">
            Fixed 12% annual dividend investment. Minimum investment ₹15,000. 
            <strong> Note: Amount cannot be refunded before the due date.</strong>
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

                {/* Investment Details */}
                <div className="border-b pb-6">
                  <h3 className="font-bold text-gray-800 mb-4">Investment Amount & Payment</h3>

                  <FormInput
                    label="Investment Amount (₹)"
                    name="amount"
                    type="number"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder={`Minimum ${formatCurrency(SWAR_SAKSHI_INVESTMENT.MINIMUM_AMOUNT)}`}
                    error={errors.amount}
                    step="1000"
                    min={SWAR_SAKSHI_INVESTMENT.MINIMUM_AMOUNT}
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

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mt-4">
                    <strong>📌 Fixed Dividend:</strong> {(SWAR_SAKSHI_INVESTMENT.FIXED_DIVIDEND_RATE * 100)}% per year
                  </div>
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
                    label="End Date"
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

                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-gray-500 uppercase font-semibold mb-2">Investment Period</p>
                    <p className="text-sm text-gray-800">
                      <strong>From:</strong> {formData.startDate ? formatDate(formData.startDate) : 'Select start date'}
                    </p>
                    <p className="text-sm text-gray-800 mt-1">
                      <strong>To:</strong> {formData.endDate ? formatDate(formData.endDate) : 'Auto-set'}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">Default duration: 90 days from your start date</p>
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm mt-4">
                    <strong>⚠️ Important:</strong> Amount cannot be refunded before the due date.
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-6">
                  <InvestmentButton
                    variant="green"
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
            <InvestmentCard title="Investment Summary">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 uppercase font-semibold">Investment Amount</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formData.amount ? formatCurrency(parseFloat(formData.amount)) : '₹0'}
                  </p>
                </div>

                {calculation && (
                  <>
                    <hr className="my-4" />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Duration</p>
                        <p className="text-lg font-semibold text-gray-800">
                          {calculation.days} days
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Daily Dividend</p>
                        <p className="text-lg font-semibold text-blue-600">
                          {formatCurrency(calculation.dailyDividend)}
                        </p>
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Total Getting at Maturity</p>
                      <div className="text-2xl font-bold text-gray-800 space-y-2">
                        <div>
                          {formData.amount ? formatCurrency(parseFloat(formData.amount)) : '₹0'} + {formatCurrency(calculation.dividend)} ({calculation.days} days)
                        </div>
                        <div className="text-3xl text-green-600 border-t pt-2 mt-2">
                          = {formatCurrency(parseFloat(formData.amount) + calculation.dividend)}
                        </div>
                      </div>
                      <p className="text-xs text-green-700 mt-3 font-semibold">
                        💰 12% per annum = {formatCurrency(calculation.dividend)} for {calculation.days} days
                      </p>
                    </div>

                    <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-800 uppercase font-semibold mb-2">📅 Maturity Date</p>
                      <p className="text-lg font-bold text-amber-900">
                        {formData.startDate ? formatDate(getEndDate()) : 'Select start date'}
                      </p>
                      <p className="text-xs text-amber-700 mt-2">💳 Auto-deposited to your bank account at 5:00 PM</p>
                    </div>

                    <p className="text-xs text-gray-500 italic mt-4">
                      You will receive {formatCurrency(calculation.maturityAmount)} on{' '}
                      {formData.startDate ? formatDate(getEndDate()) : 'maturity date'}
                    </p>
                  </>
                )}

                {!calculation && (
                  <p className="text-center text-gray-500 text-sm py-8">
                    Fill in the details above to see calculation
                  </p>
                )}
              </div>
            </InvestmentCard>

            {/* Info Box */}
            <InvestmentCard title="Key Features" className="mt-6">
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                  <span>Fixed 12% annual dividend on your investment</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                  <span>Minimum investment of ₹15,000</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                  <span>Fixed 3-month investment duration</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                  <span>Auto-deposited to your bank account at 5:00 PM on maturity date</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2 flex-shrink-0">⚠️</span>
                  <span>Amount cannot be refunded before the due date</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                  <span>Official investment agreement and certificate</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2 flex-shrink-0">✓</span>
                  <span>Transparent and regulated process</span>
                </li>
              </ul>
            </InvestmentCard>
          </div>
        </div>
      </div>
    </div>
  );
}
