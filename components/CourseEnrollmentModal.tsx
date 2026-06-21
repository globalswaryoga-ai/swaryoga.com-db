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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Calculate price
  const basePrice = course.pricing?.INR?.price || 0;
  const finalPrice = course.discount && course.discount > 0
    ? Math.round(basePrice * (1 - course.discount / 100))
    : basePrice;

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
          {/* Course Info */}
          <div className="mb-6 p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Course</p>
            <p className="font-semibold text-gray-900 mb-2">{course.title}</p>
            <div className="flex items-baseline gap-2">
              {course.discount && course.discount > 0 ? (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    ₹{basePrice.toLocaleString()}
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{finalPrice.toLocaleString()}
                  </span>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    {course.discount}% OFF
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold text-green-600">
                  ₹{finalPrice.toLocaleString()}
                </span>
              )}
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
