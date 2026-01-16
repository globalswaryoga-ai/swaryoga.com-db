'use client';

/**
 * @fileoverview Easy Enrollment Component
 * Simple, user-friendly Cashfree payment flow for workshops
 * Replaces complex PayU button code
 */

import React, { useState } from 'react';
import CashfreePaymentButton from '@/components/CashfreePaymentButton';

interface EasyEnrollmentProps {
  workshopId: string;
  workshopName: string;
  amount: number;
  duration?: string;
  level?: string;
  instructorName?: string;
  maxParticipants?: number;
  enrolledCount?: number;
  token?: string;
}

export default function EasyEnrollment({
  workshopId,
  workshopName,
  amount,
  duration = '8 weeks',
  level = 'Beginner',
  instructorName = 'Expert Instructor',
  maxParticipants = 50,
  enrolledCount = 0,
  token = '',
}: EasyEnrollmentProps) {
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
  });
  const [isValid, setIsValid] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Validate form
    const isFormValid =
      updated.firstName.trim() &&
      updated.email.trim() &&
      updated.phone.trim() &&
      updated.city.trim();
    setIsValid(!!isFormValid);
  };

  const availableSeats = maxParticipants - enrolledCount;
  const isFull = availableSeats <= 0;

  return (
    <div className="w-full">
      {/* Main Enrollment Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all">
        {/* Header with Workshop Info */}
        <div className="bg-gradient-to-r from-yoga-600 to-yoga-700 text-white p-8">
          <h2 className="text-3xl font-bold mb-2">{workshopName}</h2>
          <p className="text-yoga-100 text-lg mb-6">Join our community and transform your practice</p>

          {/* Quick Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-yoga-100 text-xs uppercase tracking-wide">Duration</p>
              <p className="text-lg font-bold">{duration}</p>
            </div>
            <div>
              <p className="text-yoga-100 text-xs uppercase tracking-wide">Level</p>
              <p className="text-lg font-bold">{level}</p>
            </div>
            <div>
              <p className="text-yoga-100 text-xs uppercase tracking-wide">Instructor</p>
              <p className="text-lg font-bold truncate">{instructorName}</p>
            </div>
            <div>
              <p className="text-yoga-100 text-xs uppercase tracking-wide">Available</p>
              <p className="text-lg font-bold">{availableSeats} seats</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* Price Section */}
          <div className="mb-8 pb-8 border-b-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm uppercase tracking-wide">Total Investment</p>
                <p className="text-5xl font-bold text-yoga-600">₹{amount.toLocaleString('en-IN')}</p>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-bold mb-2">✅ One-time payment</p>
                <p className="text-gray-700 font-semibold">Lifetime access</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">What You Get:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span>✅</span> <span>Complete video lessons</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span> <span>Live Q&A sessions</span>
                </li>
                <li className="flex gap-2">
                  <span>✅</span> <span>Certification upon completion</span>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-gray-900">Premium Access:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span>📱</span> <span>Mobile + Desktop access</span>
                </li>
                <li className="flex gap-2">
                  <span>🎥</span> <span>Downloadable resources</span>
                </li>
                <li className="flex gap-2">
                  <span>💬</span> <span>Community support</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Availability Warning */}
          {isFull && (
            <div className="mb-6 bg-red-50 border-2 border-red-300 rounded-lg p-4 text-center">
              <p className="text-red-700 font-bold">❌ This workshop is currently full</p>
              <p className="text-red-600 text-sm">Check back soon for next batch</p>
            </div>
          )}

          {availableSeats < 5 && !isFull && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center">
              <p className="text-yellow-700 font-bold">⚠️ Only {availableSeats} seats remaining!</p>
              <p className="text-yellow-600 text-sm">Enroll now to secure your spot</p>
            </div>
          )}

          {/* Enrollment Button - Toggle Form */}
          {!isFull && (
            <>
              {!showEnrollForm ? (
                <button
                  onClick={() => setShowEnrollForm(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3 mb-4"
                >
                  <span>🎯</span>
                  <span>Enroll Now with Cashfree</span>
                </button>
              ) : null}

              {/* Enrollment Form (Hidden by Default) */}
              {showEnrollForm && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6 border-2 border-yoga-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">📝 Your Information</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <input
                      type="text"
                      name="firstName"
                      placeholder="First Name *"
                      value={formData.firstName}
                      onChange={handleFormChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleFormChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none"
                    />
                    <input
                      type="email"
                      name="email"
                      placeholder="Email Address *"
                      value={formData.email}
                      onChange={handleFormChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none md:col-span-2"
                      required
                    />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone Number *"
                      value={formData.phone}
                      onChange={handleFormChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none"
                      required
                    />
                    <input
                      type="text"
                      name="city"
                      placeholder="City *"
                      value={formData.city}
                      onChange={handleFormChange}
                      className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-yoga-600 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Cashfree Payment Button */}
                  {isValid && (
                    <CashfreePaymentButton
                      amount={amount}
                      productInfo={workshopName}
                      firstName={formData.firstName}
                      lastName={formData.lastName}
                      email={formData.email}
                      phone={formData.phone}
                      city={formData.city}
                      token={token}
                      className="w-full bg-gradient-to-r from-yoga-600 to-yoga-700 hover:from-yoga-700 hover:to-yoga-800 text-white font-bold py-4 px-4 rounded-lg mb-3"
                    />
                  )}

                  {!isValid && (
                    <button
                      disabled
                      className="w-full bg-gray-400 text-white font-bold py-4 px-4 rounded-lg cursor-not-allowed opacity-60 mb-3"
                    >
                      ⚠️ Fill all required fields
                    </button>
                  )}

                  <button
                    onClick={() => setShowEnrollForm(false)}
                    className="w-full border-2 border-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {/* Security & Trust */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 flex gap-2 items-start mb-2">
              <span>🔒</span>
              <span className="font-semibold">Secure Payment: Powered by Cashfree - India's most trusted payment gateway</span>
            </p>
            <p className="text-xs text-blue-800">
              Your payment is 100% secure, encrypted, and PCI DSS compliant. Get instant access upon successful payment.
            </p>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="bg-gray-50 px-8 py-4 border-t flex justify-between items-center text-sm">
          <div className="text-gray-700">
            <span className="font-bold text-gray-900">{enrolledCount}</span>
            <span className="text-gray-600"> students enrolled</span>
          </div>
          <div className="text-right">
            <span className="font-bold text-yoga-600">⭐ 4.8/5</span>
            <span className="text-gray-600"> rating</span>
          </div>
        </div>
      </div>
    </div>
  );
}
