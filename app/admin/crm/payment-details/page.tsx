'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Landmark,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  User,
  Hash,
  FileText,
  ShieldCheck,
  MapPin,
  Phone,
  Info,
} from 'lucide-react';

interface BankDetails {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  accountType: 'savings' | 'current';
  branchName: string;
  upiId: string;
  panNumber: string;
  gstNumber: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingPhone: string;
}

const EMPTY: BankDetails = {
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifscCode: '',
  accountType: 'savings',
  branchName: '',
  upiId: '',
  panNumber: '',
  gstNumber: '',
  billingAddress: '',
  billingCity: '',
  billingState: '',
  billingPincode: '',
  billingPhone: '',
};

export default function PaymentDetailsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<BankDetails>(EMPTY);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [filled, setFilled] = useState(false); // Has user filled details before?

  const getToken = () =>
    localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token');

  // Load saved bank details
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    (async () => {
      try {
        const res = await fetch('/api/crm-site/account', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const bd = data.profile?.bankDetails;
          if (bd && bd.accountHolderName) {
            setDetails({ ...EMPTY, ...bd, confirmAccountNumber: bd.accountNumber || '' });
            setFilled(true);
          }
        }
      } catch (err) {
        console.error('Failed to load bank details:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (key: keyof BankDetails, value: string) => {
    setDetails(prev => ({ ...prev, [key]: value }));
  };

  const validate = (): string | null => {
    if (!details.accountHolderName.trim()) return 'Account holder name is required';
    if (!details.bankName.trim()) return 'Bank name is required';
    if (!details.accountNumber.trim()) return 'Account number is required';
    if (details.accountNumber !== details.confirmAccountNumber) return 'Account numbers do not match';
    if (!details.ifscCode.trim()) return 'IFSC code is required';
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(details.ifscCode.toUpperCase())) return 'Invalid IFSC code format (e.g. SBIN0001234)';
    return null;
  };

  const saveDetails = async () => {
    const err = validate();
    if (err) {
      setToast({ type: 'error', text: err });
      return;
    }

    const token = getToken();
    if (!token) return;

    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/crm-site/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          bankDetails: {
            accountHolderName: details.accountHolderName.trim(),
            bankName: details.bankName.trim(),
            accountNumber: details.accountNumber.trim(),
            ifscCode: details.ifscCode.toUpperCase().trim(),
            accountType: details.accountType,
            branchName: details.branchName.trim(),
            upiId: details.upiId.trim(),
            panNumber: details.panNumber.toUpperCase().trim(),
            gstNumber: details.gstNumber.toUpperCase().trim(),
            billingAddress: details.billingAddress.trim(),
            billingCity: details.billingCity.trim(),
            billingState: details.billingState.trim(),
            billingPincode: details.billingPincode.trim(),
            billingPhone: details.billingPhone.trim(),
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: '✅ Bank details saved successfully!' });
        setFilled(true);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Completion percentage
  const getCompletion = () => {
    const fields = [
      details.accountHolderName, details.bankName, details.accountNumber,
      details.ifscCode, details.branchName, details.upiId,
      details.panNumber, details.billingAddress, details.billingCity,
      details.billingState, details.billingPincode,
    ];
    const filled = fields.filter(f => f?.trim()).length;
    return Math.round((filled / fields.length) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const completion = getCompletion();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment / Bank Details</h1>
              <p className="text-xs text-gray-500">Manage your banking & billing information</p>
            </div>
          </div>
          <button
            onClick={saveDetails}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Details'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className={`p-3 rounded-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.text}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status Banner */}
        <div className={`rounded-2xl border p-5 ${
          filled
            ? 'bg-green-50 border-green-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center gap-3 mb-3">
            {filled ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-600" />
            )}
            <div>
              <p className={`font-semibold ${filled ? 'text-green-800' : 'text-amber-800'}`}>
                {filled ? 'Bank Details Saved' : 'Bank Details Required'}
              </p>
              <p className={`text-sm ${filled ? 'text-green-600' : 'text-amber-600'}`}>
                {filled
                  ? 'Your banking information is on file. You can update it anytime.'
                  : 'Please fill in your bank details for payment processing and refunds.'}
              </p>
            </div>
          </div>
          {/* Completion bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  completion >= 80 ? 'bg-green-500' : completion >= 50 ? 'bg-amber-500' : 'bg-red-400'
                }`}
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className={`text-xs font-semibold ${
              completion >= 80 ? 'text-green-700' : 'text-amber-700'
            }`}>
              {completion}% filled
            </span>
          </div>
        </div>

        {/* Bank Account Details */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-5">
            <Landmark className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Bank Account</h2>
          </div>

          <div className="space-y-4">
            <FormField
              icon={<User className="w-4 h-4" />}
              label="Account Holder Name *"
              value={details.accountHolderName}
              onChange={v => update('accountHolderName', v)}
              placeholder="As per bank records"
            />

            <FormField
              icon={<Building2 className="w-4 h-4" />}
              label="Bank Name *"
              value={details.bankName}
              onChange={v => update('bankName', v)}
              placeholder="e.g. State Bank of India"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                icon={<Hash className="w-4 h-4" />}
                label="Account Number *"
                value={details.accountNumber}
                onChange={v => update('accountNumber', v)}
                placeholder="Enter account number"
                type="password"
              />
              <FormField
                icon={<Hash className="w-4 h-4" />}
                label="Confirm Account Number *"
                value={details.confirmAccountNumber}
                onChange={v => update('confirmAccountNumber', v)}
                placeholder="Re-enter account number"
                error={details.confirmAccountNumber && details.accountNumber !== details.confirmAccountNumber ? 'Numbers do not match' : ''}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                icon={<FileText className="w-4 h-4" />}
                label="IFSC Code *"
                value={details.ifscCode}
                onChange={v => update('ifscCode', v.toUpperCase())}
                placeholder="e.g. SBIN0001234"
                maxLength={11}
              />
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <CreditCard className="w-4 h-4 text-gray-400" /> Account Type
                </label>
                <select
                  value={details.accountType}
                  onChange={e => update('accountType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                </select>
              </div>
            </div>

            <FormField
              icon={<MapPin className="w-4 h-4" />}
              label="Branch Name"
              value={details.branchName}
              onChange={v => update('branchName', v)}
              placeholder="e.g. MG Road Branch"
            />
          </div>
        </div>

        {/* UPI & Tax Details */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-5">
            <ShieldCheck className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">UPI & Tax Details</h2>
          </div>

          <div className="space-y-4">
            <FormField
              icon={<Phone className="w-4 h-4" />}
              label="UPI ID"
              value={details.upiId}
              onChange={v => update('upiId', v)}
              placeholder="e.g. name@upi"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                icon={<FileText className="w-4 h-4" />}
                label="PAN Number"
                value={details.panNumber}
                onChange={v => update('panNumber', v.toUpperCase())}
                placeholder="e.g. ABCDE1234F"
                maxLength={10}
              />
              <FormField
                icon={<FileText className="w-4 h-4" />}
                label="GST Number (optional)"
                value={details.gstNumber}
                onChange={v => update('gstNumber', v.toUpperCase())}
                placeholder="e.g. 29AABCU9603R1ZM"
                maxLength={15}
              />
            </div>
          </div>
        </div>

        {/* Billing Address */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-5">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Billing Address</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 text-gray-400" /> Street Address
              </label>
              <textarea
                value={details.billingAddress}
                onChange={e => update('billingAddress', e.target.value)}
                placeholder="Enter your billing address"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                label="City"
                value={details.billingCity}
                onChange={v => update('billingCity', v)}
                placeholder="e.g. Mumbai"
              />
              <FormField
                label="State"
                value={details.billingState}
                onChange={v => update('billingState', v)}
                placeholder="e.g. Maharashtra"
              />
              <FormField
                label="PIN Code"
                value={details.billingPincode}
                onChange={v => update('billingPincode', v)}
                placeholder="e.g. 400001"
                maxLength={6}
              />
            </div>

            <FormField
              icon={<Phone className="w-4 h-4" />}
              label="Billing Phone"
              value={details.billingPhone}
              onChange={v => update('billingPhone', v)}
              placeholder="+91 XXXXX XXXXX"
            />
          </div>
        </div>

        {/* Info Note */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-indigo-700">
            <p className="font-medium">Why do we need this?</p>
            <p className="mt-1 text-xs">
              Bank details are used for processing refunds, payouts, and generating invoices with correct billing information.
              Your data is encrypted and stored securely. We never share it with third parties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({
  icon,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  maxLength,
  error,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
        {icon && <span className="text-gray-400">{icon}</span>}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
