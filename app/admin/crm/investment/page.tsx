/**
 * Admin CRM - Investment Management Page
 * Manage all investments, add old investments, view details
 */

'use client';

import React, { useState, useEffect } from 'react';
import { ENTITIES, ENTITY_NAMES, SHARE_TYPES, SHARE_TYPE_NAMES } from '@/lib/investment-constants';
import { formatCurrency, formatDate } from '@/lib/investment-utils';

interface Investment {
  _id: string;
  entity: 'swar-sakshi' | 'upamanyu';
  shareType?: 'equity' | 'preference';
  name: string;
  phone: string;
  amount: number;
  numberOfShares?: number;
  sharePrice?: number;
  interestRate?: number;
  startDate: string;
  endDate: string;
  status: string;
  certificateNumber: string;
  maturityAmount?: number;
  createdAt: string;
}

interface FormData {
  entity: 'swar-sakshi' | 'upamanyu';
  name: string;
  phone: string;
  shareType?: 'equity' | 'preference';
  amount: string;
  numberOfShares?: string;
  sharePrice?: string;
  interestRate?: string;
  startDate: string;
  endDate: string;
  isOldInvestment?: boolean;
}

export default function InvestmentPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState<'all' | 'swar-sakshi' | 'upamanyu'>('all');
  const [formData, setFormData] = useState<FormData>({
    entity: 'swar-sakshi',
    name: '',
    phone: '',
    amount: '',
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch investments
  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const response = await fetch('/api/admin/crm/investments');
        if (response.ok) {
          const data = await response.json();
          setInvestments(data.investments || []);
        }
      } catch (error) {
        console.error('Failed to fetch investments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.phone || formData.phone.length !== 10) newErrors.phone = 'Valid 10-digit phone required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount required';
    if (!formData.startDate) newErrors.startDate = 'Start date is required';
    if (!formData.endDate) newErrors.endDate = 'End date is required';

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.entity === 'upamanyu') {
      if (!formData.shareType) newErrors.shareType = 'Share type is required';
      if (!formData.numberOfShares || parseInt(formData.numberOfShares) < 1)
        newErrors.numberOfShares = 'Number of shares required';
      if (!formData.sharePrice || parseFloat(formData.sharePrice) <= 0)
        newErrors.sharePrice = 'Share price required';
    }

    if (formData.entity === 'swar-sakshi') {
      if (!formData.interestRate || parseFloat(formData.interestRate) <= 0)
        newErrors.interestRate = 'Interest rate required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);

    try {
      const payload: any = {
        entity: formData.entity,
        name: formData.name,
        phone: formData.phone,
        amount: parseFloat(formData.amount),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      if (formData.entity === 'upamanyu') {
        payload.shareType = formData.shareType;
        payload.numberOfShares = parseInt(formData.numberOfShares || '0');
        payload.sharePrice = parseFloat(formData.sharePrice || '0');
      }

      if (formData.entity === 'swar-sakshi') {
        payload.interestRate = parseFloat(formData.interestRate || '0');
        payload.compound = false;
      }

      if (formData.isOldInvestment) {
        payload.isOldInvestment = true;
      }

      console.log('Form data:', formData);
      console.log('Sending investment payload:', JSON.stringify(payload, null, 2));

      const response = await fetch('/api/investment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();
      console.log('API Response:', responseData, 'Status:', response.status);

      if (response.ok) {
        setSuccessMessage(`✅ Investment added successfully! Certificate: ${responseData.certificateNumber}`);
        
        // Refresh investments list
        const listResponse = await fetch('/api/admin/crm/investments');
        if (listResponse.ok) {
          const data = await listResponse.json();
          setInvestments(data.investments || []);
        }

        // Reset form
        setFormData({
          entity: 'swar-sakshi',
          name: '',
          phone: '',
          amount: '',
          startDate: '',
          endDate: '',
        });

        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMessage('');
        }, 2000);
      } else {
        console.error('API Error Response:', responseData);
        
        let errorMessage = responseData.error || 'Failed to add investment';
        if (responseData.details && Array.isArray(responseData.details)) {
          errorMessage += '\n' + responseData.details.join('\n');
        } else if (responseData.fieldErrors && typeof responseData.fieldErrors === 'object') {
          const fieldErrorMessages = Object.entries(responseData.fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('\n');
          errorMessage += '\n' + fieldErrorMessages;
        }
        
        setErrors({ submit: errorMessage });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvestments = investments.filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.phone.includes(searchTerm) ||
      inv.certificateNumber.includes(searchTerm);

    const matchesEntity = filterEntity === 'all' || inv.entity === filterEntity;

    return matchesSearch && matchesEntity;
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Investment Management</h1>
        <p className="text-gray-600">Manage all investments and add old investment records</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          {/* Search & Filter */}
          <div className="flex-1 flex gap-4 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by name, phone, or certificate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Entities</option>
              <option value="swar-sakshi">Swar Sakshi</option>
              <option value="upamanyu">Upamanyu</option>
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
          >
            + Add Old Investment
          </button>
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading investments...</div>
        ) : filteredInvestments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {investments.length === 0 ? 'No investments found' : 'No matching investments'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Entity</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Duration</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Certificate</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvestments.map((inv) => {
                const startDate = new Date(inv.startDate);
                const endDate = new Date(inv.endDate);
                const daysRemaining = Math.ceil(
                  (endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );

                return (
                  <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{inv.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{inv.phone}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                        {ENTITY_NAMES[inv.entity as keyof typeof ENTITY_NAMES]?.split(' ')[0] || inv.entity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(inv.amount)}
                      {inv.shareType && (
                        <div className="text-xs text-gray-500 mt-1">
                          {inv.numberOfShares} {inv.shareType === 'equity' ? 'shares' : 'shares'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(inv.startDate)} to {formatDate(inv.endDate)}
                      <div className={`text-xs mt-1 font-semibold ${daysRemaining > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Matured'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{inv.certificateNumber}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          inv.status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : inv.status === 'certificate_issued'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {inv.status?.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Investment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-blue-500 text-white p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Add Old Investment</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-2xl hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {errors.submit && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded bg-red-100 text-red-900 text-sm font-medium">
                  <p className="font-bold mb-2">❌ Error:</p>
                  <div className="whitespace-pre-wrap font-mono text-xs">{errors.submit}</div>
                  <p className="text-xs text-red-800 mt-2">Check browser console (F12) for more details</p>
                </div>
              )}

              {/* Entity Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">Entity Type</label>
                <div className="space-y-3">
                  {[ENTITIES.SWAR_SAKSHI, ENTITIES.UPAMANYU].map((entity) => (
                    <label
                      key={entity}
                      className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.entity === entity
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="entity"
                          value={entity}
                          checked={formData.entity === entity}
                          onChange={handleInputChange}
                          className="w-5 h-5"
                        />
                        <span className="ml-3 font-semibold text-gray-800">{ENTITY_NAMES[entity as keyof typeof ENTITY_NAMES]}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Investor name"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit number"
                    maxLength="10"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Amount (₹)</label>
                <input
                  type="number"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="Enter amount"
                  step="1000"
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.amount ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
              </div>

              {/* Entity-Specific Fields */}
              {formData.entity === 'upamanyu' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Share Type</label>
                    <div className="space-y-2">
                      {[SHARE_TYPES.EQUITY, SHARE_TYPES.PREFERENCE].map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="radio"
                            name="shareType"
                            value={type}
                            checked={formData.shareType === type}
                            onChange={handleInputChange}
                            className="w-4 h-4"
                          />
                          <span className="ml-2 text-gray-700">{SHARE_TYPE_NAMES[type as keyof typeof SHARE_TYPE_NAMES]}</span>
                        </label>
                      ))}
                    </div>
                    {errors.shareType && <p className="text-red-500 text-xs mt-1">{errors.shareType}</p>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Number of Shares</label>
                      <input
                        type="number"
                        name="numberOfShares"
                        value={formData.numberOfShares}
                        onChange={handleInputChange}
                        placeholder="e.g., 110"
                        step="1"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.numberOfShares ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.numberOfShares && (
                        <p className="text-red-500 text-xs mt-1">{errors.numberOfShares}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-900 mb-2">Share Price (₹)</label>
                      <input
                        type="number"
                        name="sharePrice"
                        value={formData.sharePrice}
                        onChange={handleInputChange}
                        placeholder="e.g., 110"
                        step="0.01"
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.sharePrice ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.sharePrice && <p className="text-red-500 text-xs mt-1">{errors.sharePrice}</p>}
                    </div>
                  </div>
                </>
              )}

              {formData.entity === 'swar-sakshi' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Interest Rate (%)</label>
                  <input
                    type="number"
                    name="interestRate"
                    value={formData.interestRate}
                    onChange={handleInputChange}
                    placeholder="12"
                    step="0.1"
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.interestRate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.interestRate && <p className="text-red-500 text-xs mt-1">{errors.interestRate}</p>}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.startDate && <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {/* Old Investment Checkbox */}
              <label className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition">
                <input
                  type="checkbox"
                  name="isOldInvestment"
                  checked={formData.isOldInvestment || false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    isOldInvestment: e.target.checked,
                  }))}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Mark as Old Investment</p>
                  <p className="text-sm text-gray-600">Old investments skip verification payment. Only KYC images and admin verification needed.</p>
                </div>
              </label>

              {/* Buttons */}
              <div className="flex gap-4 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-2 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-lg font-semibold transition-colors"
                >
                  {submitting ? 'Adding...' : 'Add Investment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
