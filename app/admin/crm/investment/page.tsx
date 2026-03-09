/**
 * CRM - Investment Management Page
 * Manage investments with dividend tracking, permissions-based CRUD, and lead integration
 * - CS, CA, Admin can create/edit investments
 * - Admin can delete investments
 * - Track paid dividends, pending dividends, overdue amounts
 * - Calculate compound interest at 12% on overdue amounts
 * - Link investments to leads
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ENTITIES, ENTITY_NAMES, SHARE_TYPES, SHARE_TYPE_NAMES } from '@/lib/investment-constants';
import { formatCurrency, formatDate } from '@/lib/investment-utils';

interface Investment {
  _id: string;
  leadId?: string;
  leadNumber?: string;
  createdByUserId?: string;
  createdByUserName?: string;
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
  status: 'active' | 'matured' | 'overdue';
  certificateNumber: string;
  maturityAmount?: number;
  paidDividend?: number;
  pendingDividend?: number;
  overdueAmount?: number;
  compoundedInterest?: number;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  entity: 'swar-sakshi' | 'upamanyu';
  leadId?: string;
  name: string;
  phone: string;
  shareType?: 'equity' | 'preference';
  amount: string;
  numberOfShares?: string;
  sharePrice?: string;
  interestRate?: string;
  startDate: string;
  endDate: string;
  paidDividend?: string;
  isOldInvestment?: boolean;
}

export default function CRMInvestmentPage() {
  const token = useAuth();
  // Decode token for role checks (server enforces actual permissions)
  const user: any = token ? (() => { try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; } })() : null;
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState<'all' | 'swar-sakshi' | 'upamanyu'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'matured' | 'overdue'>('all');
  
  const [formData, setFormData] = useState<FormData>({
    entity: 'swar-sakshi',
    name: '',
    phone: '',
    amount: '',
    startDate: '',
    endDate: '',
    paidDividend: '0',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Check permissions
  const canCreate = user && ['admin', 'CS', 'CA'].includes(user.role);
  const canEdit = user && ['admin', 'CS', 'CA'].includes(user.role);
  const canDelete = user && user.role === 'admin';

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

  // Calculate dividend status with compound interest
  const calculateDividendStatus = (investment: Investment) => {
    const endDate = new Date(investment.endDate);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysOverdue > 0) {
      // Compound interest at 12% per annum
      const totalPendingDividend = (investment.pendingDividend || 0) + (investment.maturityAmount || 0);
      const dailyRate = 0.12 / 365;
      const compoundedAmount = totalPendingDividend * Math.pow(1 + dailyRate, daysOverdue);
      const compoundedInterest = compoundedAmount - totalPendingDividend;
      
      return {
        daysOverdue,
        compoundedInterest: Math.round(compoundedInterest * 100) / 100,
        totalOverdueAmount: Math.round(compoundedAmount * 100) / 100,
      };
    }
    
    return { daysOverdue: 0, compoundedInterest: 0, totalOverdueAmount: 0 };
  };

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
    if (!canCreate) {
      setErrors({ submit: 'You do not have permission to create investments' });
      return;
    }

    setSubmitting(true);

    try {
      const payload: any = {
        entity: formData.entity,
        name: formData.name,
        phone: formData.phone,
        amount: parseFloat(formData.amount),
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        paidDividend: parseFloat(formData.paidDividend || '0'),
        isOldInvestment: formData.isOldInvestment,
      };

      if (formData.leadId) payload.leadId = formData.leadId;

      if (formData.entity === 'upamanyu') {
        payload.shareType = formData.shareType;
        payload.numberOfShares = parseInt(formData.numberOfShares || '0');
        payload.sharePrice = parseFloat(formData.sharePrice || '0');
      }

      if (formData.entity === 'swar-sakshi') {
        payload.interestRate = parseFloat(formData.interestRate || '12');
        payload.compound = false;
      }

      const endpoint = editingId ? `/api/admin/crm/investments/${editingId}` : '/api/investment/create';
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (response.ok) {
        setSuccessMessage(
          editingId 
            ? '✅ Investment updated successfully!'
            : `✅ Investment added successfully! Certificate: ${responseData.certificateNumber}`
        );
        
        // Refresh investments list
        const listResponse = await fetch('/api/admin/crm/investments');
        if (listResponse.ok) {
          const data = await listResponse.json();
          setInvestments(data.investments || []);
        }

        setFormData({
          entity: 'swar-sakshi',
          name: '',
          phone: '',
          amount: '',
          startDate: '',
          endDate: '',
          paidDividend: '0',
        });
        setEditingId(null);

        setTimeout(() => {
          setShowAddModal(false);
          setSuccessMessage('');
        }, 2000);
      } else {
        const errorMsg = responseData.error || responseData.message || 'Failed to save investment';
        setErrors({ submit: errorMsg });
      }
    } catch (error) {
      console.error('Submit error:', error);
      setErrors({ submit: 'An error occurred. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (investment: Investment) => {
    if (!canEdit) {
      alert('You do not have permission to edit investments');
      return;
    }
    setEditingId(investment._id);
    setFormData({
      entity: investment.entity,
      leadId: investment.leadId,
      name: investment.name,
      phone: investment.phone,
      shareType: investment.shareType,
      amount: investment.amount.toString(),
      numberOfShares: investment.numberOfShares?.toString(),
      sharePrice: investment.sharePrice?.toString(),
      interestRate: investment.interestRate?.toString(),
      startDate: new Date(investment.startDate).toISOString().split('T')[0],
      endDate: new Date(investment.endDate).toISOString().split('T')[0],
      paidDividend: (investment.paidDividend || 0).toString(),
    });
    setShowAddModal(true);
  };

  const handleDelete = async (investmentId: string) => {
    if (!canDelete) {
      alert('You do not have permission to delete investments');
      return;
    }
    if (!confirm('Are you sure you want to delete this investment?')) return;

    try {
      const response = await fetch(`/api/admin/crm/investments/${investmentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setInvestments(investments.filter((inv) => inv._id !== investmentId));
        setSuccessMessage('✅ Investment deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);
      } else {
        alert('Failed to delete investment');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('An error occurred while deleting');
    }
  };

  const handleViewDetails = (investment: Investment) => {
    setSelectedInvestment(investment);
    setShowDetailsModal(true);
  };

  const filteredInvestments = investments.filter((inv) => {
    const matchesSearch =
      inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.phone.includes(searchTerm) ||
      inv.certificateNumber.includes(searchTerm);

    const matchesEntity = filterEntity === 'all' || inv.entity === filterEntity;
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;

    return matchesSearch && matchesEntity && matchesStatus;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 Investment Management</h1>
        <p className="text-gray-600">Manage investments, track dividends, and handle overdue amounts</p>
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
          <div className="flex-1 flex gap-4 w-full md:w-auto flex-wrap">
            <input
              type="text"
              placeholder="Search by name, phone, or certificate..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={filterEntity}
              onChange={(e) => setFilterEntity(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Entities</option>
              <option value="swar-sakshi">Swar Sakshi</option>
              <option value="upamanyu">Upamanyu</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="matured">Matured</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          {canCreate && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  entity: 'swar-sakshi',
                  name: '',
                  phone: '',
                  amount: '',
                  startDate: '',
                  endDate: '',
                  paidDividend: '0',
                });
                setShowAddModal(true);
              }}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-colors"
            >
              + Add Investment
            </button>
          )}
        </div>
      </div>

      {/* Investments Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading investments...</div>
        ) : filteredInvestments.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            {investments.length === 0 ? 'No investments found' : 'No matching investments'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Entity</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Paid Dividend</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-900">Pending Dividend</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvestments.map((inv) => {
                  const dividendStatus = calculateDividendStatus(inv);
                  return (
                    <tr key={inv._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{inv.name}</td>
                      <td className="px-4 py-3 text-gray-700">{inv.phone}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                          {ENTITY_NAMES[inv.entity as any] || inv.entity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 font-medium">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">
                        {formatCurrency(inv.paidDividend || 0)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-orange-600 font-medium">
                          {formatCurrency(inv.pendingDividend || 0)}
                        </div>
                        {dividendStatus.daysOverdue > 0 && (
                          <div className="text-xs text-red-600">
                            +{formatCurrency(dividendStatus.compoundedInterest)} (12% compound)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            inv.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : inv.status === 'matured'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {inv.status}
                          {dividendStatus.daysOverdue > 0 && ` (${dividendStatus.daysOverdue}d)`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleViewDetails(inv)}
                            className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded transition-colors"
                            title="View details"
                          >
                            📋
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(inv)}
                              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white text-xs rounded transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(inv._id)}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingId ? '✏️ Edit Investment' : '➕ Add New Investment'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errors.submit && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {errors.submit}
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
                          ? 'border-indigo-500 bg-indigo-50'
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
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                    maxLength={10}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
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
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {/* Old Investment Checkbox */}
              <label className="flex items-center space-x-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg cursor-pointer hover:bg-indigo-100 transition">
                <input
                  type="checkbox"
                  name="isOldInvestment"
                  checked={formData.isOldInvestment || false}
                  onChange={(e) => setFormData((prev) => ({
                    ...prev,
                    isOldInvestment: e.target.checked,
                  }))}
                  className="w-5 h-5 text-indigo-600 rounded"
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

      {/* Details Modal */}
      {showDetailsModal && selectedInvestment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Investment Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Name</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedInvestment.name}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedInvestment.phone}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Entity</label>
                  <p className="text-lg font-semibold text-gray-900">
                    {ENTITY_NAMES[selectedInvestment.entity as any]}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Certificate</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedInvestment.certificateNumber}</p>
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Investment Amount</label>
                  <p className="text-xl font-bold text-indigo-600">{formatCurrency(selectedInvestment.amount)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Maturity Amount</label>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(selectedInvestment.maturityAmount || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                  <p className="text-lg font-bold text-gray-900">{selectedInvestment.status}</p>
                </div>
              </div>

              {/* Dividend Status */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-4">Dividend Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Paid Dividend</label>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(selectedInvestment.paidDividend || 0)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Pending Dividend</label>
                    <p className="text-xl font-bold text-orange-600">
                      {formatCurrency(selectedInvestment.pendingDividend || 0)}
                    </p>
                  </div>
                </div>

                {(() => {
                  const status = calculateDividendStatus(selectedInvestment);
                  return status.daysOverdue > 0 ? (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm font-semibold text-red-800 mb-2">
                        ⚠️ Overdue by {status.daysOverdue} days
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Compound Interest (12%)</label>
                          <p className="font-bold text-red-600">{formatCurrency(status.compoundedInterest)}</p>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-500">Total Overdue Amount</label>
                          <p className="font-bold text-red-600">{formatCurrency(status.totalOverdueAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Start Date</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(selectedInvestment.startDate)}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">End Date</label>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(selectedInvestment.endDate)}</p>
                </div>
              </div>

              {selectedInvestment.createdByUserName && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Created By</label>
                  <p className="text-lg font-semibold text-gray-900">{selectedInvestment.createdByUserName}</p>
                </div>
              )}

              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
