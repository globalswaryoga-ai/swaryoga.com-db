'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import CashfreePaymentButton from './CashfreePaymentButton';

interface EnrolledStudent {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  enrolledAt?: string;
}

interface CourseEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: {
    _id: string;
    title: string;
    pricing?: {
      INR?: { price: number };
    };
    discount?: number;
    promoCode?: string | null;
    promoDiscount?: number;
    promoExpiry?: string | null;
  };
  token?: string;
  enrolledStudents?: EnrolledStudent[];
  enrollmentCount?: number;
}

export default function CourseEnrollmentModal({
  isOpen,
  onClose,
  course,
  token = '',
  enrolledStudents = [],
  enrollmentCount = 15,
}: CourseEnrollmentModalProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    state: '',
    zip: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Promo code state
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPct: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Base price
  const basePrice = course.pricing?.INR?.price || 0;

  // Way 1: Direct Frontend Discount (%)
  const directDiscountPct = Math.min(100, Math.max(0, Number(course.discount) || 0));
  const directDiscountedPrice = directDiscountPct > 0
    ? Math.round(basePrice * (1 - directDiscountPct / 100))
    : basePrice;
  const directSavings = basePrice - directDiscountedPrice;

  // Way 2: Secret / Circulated Promo Code Discount (%)
  const promoDiscountPct = appliedPromo ? appliedPromo.discountPct : 0;
  const promoSavings = appliedPromo && promoDiscountPct > 0
    ? Math.round(directDiscountedPrice * (promoDiscountPct / 100))
    : 0;

  const finalPrice = Math.max(0, directDiscountedPrice - promoSavings);

  const handleApplyPromo = () => {
    const entered = promoInput.trim().toUpperCase();
    if (!entered) {
      setPromoError('Please enter a promo code');
      setPromoSuccess(null);
      return;
    }

    const configuredCode = (course.promoCode || '').trim().toUpperCase();
    const configuredDiscount = Number(course.promoDiscount) || 0;
    const configuredExpiry = course.promoExpiry;

    if (configuredCode && entered === configuredCode) {
      if (configuredExpiry) {
        const expiryTime = new Date(configuredExpiry).getTime();
        if (!isNaN(expiryTime) && Date.now() > expiryTime) {
          const expiryDateFormatted = new Date(configuredExpiry).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          setPromoError(`This promo code expired on ${expiryDateFormatted} at 11:59 PM.`);
          setPromoSuccess(null);
          return;
        }
      }

      if (configuredDiscount > 0) {
        setAppliedPromo({ code: entered, discountPct: configuredDiscount });
        setPromoError(null);
        const expiryNote = configuredExpiry
          ? ` (Valid until 11:59 PM, ${new Date(configuredExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`
          : '';
        setPromoSuccess(`Promo code "${entered}" applied! ${configuredDiscount}% discount${expiryNote}.`);
      } else {
        setPromoError('This promo code is valid but has no discount configured.');
        setPromoSuccess(null);
      }
    } else {
      setPromoError('Invalid promo code. Please check and try again.');
      setPromoSuccess(null);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
    setPromoSuccess(null);
  };

  const isFormValid = formData.firstName && formData.email && formData.phone && formData.city;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Enroll in Course</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Two Column Layout (Stacked on Mobile) */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left Side - Enrollment Form */}
          <div className="w-full lg:w-3/5 p-4 sm:p-6 overflow-y-auto lg:border-r border-gray-200">
          {/* Course Info & Pricing Breakdown */}
          <div className="mb-6 p-4 bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-200/80 rounded-xl space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-green-800">Workshop</p>
                <p className="font-bold text-gray-900 text-base">{course.title}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-green-200/60 space-y-1.5 text-sm">
              <div className="flex items-center justify-between text-gray-600">
                <span>Original Price:</span>
                <span className={directDiscountPct > 0 ? "line-through text-gray-400" : "font-semibold text-gray-900"}>
                  ₹{basePrice.toLocaleString()}
                </span>
              </div>

              {directDiscountPct > 0 && (
                <div className="flex items-center justify-between text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <span>Website Discount:</span>
                    <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                      {directDiscountPct}% OFF
                    </span>
                  </span>
                  <span className="text-red-600 font-semibold">-₹{directSavings.toLocaleString()}</span>
                </div>
              )}

              {appliedPromo && promoSavings > 0 && (
                <div className="flex items-center justify-between text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span>Promo Code ({appliedPromo.code}):</span>
                    <span className="text-xs bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                      {appliedPromo.discountPct}% OFF
                    </span>
                  </span>
                  <span className="text-emerald-800 font-bold">-₹{promoSavings.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-2 border-t border-green-200 text-gray-900">
                <span className="font-bold">Total Payable:</span>
                <span className="text-2xl font-black text-green-700">
                  ₹{finalPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Pune"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Maharashtra"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="411001"
                />
              </div>
            </div>
          </div>

            {/* Promo Code Input Section */}
            <div className="mt-5 p-3.5 bg-gray-50 border border-gray-200 rounded-xl">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Have a Promo Code?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value.toUpperCase().replace(/\s+/g, ''));
                    if (promoError) setPromoError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!appliedPromo) handleApplyPromo();
                    }
                  }}
                  disabled={!!appliedPromo}
                  placeholder="Enter code (e.g. SWAR010)"
                  className="flex-1 px-3 py-2 text-sm uppercase font-mono tracking-wider border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
                />
                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="px-3.5 py-2 text-xs font-bold text-red-600 border border-red-300 bg-red-50 hover:bg-red-100 rounded-lg transition"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 text-xs font-bold text-white bg-gray-900 hover:bg-black rounded-lg transition shadow-sm"
                  >
                    Apply Code
                  </button>
                )}
              </div>
              {promoError && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  {promoError}
                </p>
              )}
              {promoSuccess && (
                <p className="text-xs text-emerald-700 mt-2 font-medium">
                  ✓ {promoSuccess}
                </p>
              )}
            </div>

            {/* Payment Button */}
            <div className="mt-6">
              <CashfreePaymentButton
                amount={finalPrice}
                productInfo={course.title}
                firstName={formData.firstName}
                lastName={formData.lastName}
                email={formData.email}
                phone={formData.phone}
                city={formData.city}
                address={formData.address}
                state={formData.state}
                zip={formData.zip}
                currency="INR"
                token={token}
                courseId={course._id}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold disabled:opacity-50 transition-all"
                disabled={!isFormValid || loading}
                onSuccess={() => {
                  onClose();
                }}
                onError={(error) => {
                  setError(error);
                }}
                onLoading={setLoading}
              />
            </div>
          </div>

          {/* Right Side - Enrolled Students (Hidden on Mobile) */}
          <div className="hidden lg:flex lg:w-2/5 p-4 sm:p-6 overflow-y-auto bg-gray-50 flex-col">
            <div className="mb-4">
              <h3 className="text-base lg:text-lg font-bold text-gray-900">{enrollmentCount} Students Joined</h3>
              <p className="text-xs text-gray-600 mt-1">Currently learning this course</p>
            </div>
            {enrolledStudents && enrolledStudents.length > 0 ? (
              <div className="space-y-3">
                {enrolledStudents.map((student) => (
                  <div key={student._id} className="p-3 bg-white rounded-lg border border-gray-300 hover:border-green-400 transition-colors">
                    <p className="font-semibold text-gray-900 text-sm">{student.firstName} {student.lastName}</p>
                    {student.email && (
                      <p className="text-xs text-gray-600 mt-1 truncate">{student.email}</p>
                    )}
                    {student.enrolledAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(student.enrolledAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : enrollmentCount > 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">Join {enrollmentCount} other students learning this course!</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 text-sm">No students enrolled yet.</p>
                <p className="text-gray-500 text-xs mt-2">Be the first to learn!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
