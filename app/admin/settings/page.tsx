'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Settings,
  Building2,
  UserCheck,
  CreditCard,
  FileCheck,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  Globe,
  MapPin,
  Save,
  Trash2,
  Eye,
} from 'lucide-react';

interface AdminSettings {
  _id?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  logoUrl?: string;
  signatureUrl?: string;
  sealUrl?: string;
  adminName: string;
  adminTitle: string;
  bankName?: string;
  bankAccount?: string;
  bankIFSC?: string;
  certificateNote?: string;
  receiptNote?: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings>({
    companyName: 'Swar Yoga',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyWebsite: 'https://swaryoga.com',
    adminName: '',
    adminTitle: '',
    bankName: '',
    bankAccount: '',
    bankIFSC: '',
    certificateNote: '',
    receiptNote: '',
  });

  const [activeTab, setActiveTab] = useState<'company' | 'signatory' | 'notes' | 'branding'>('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [sealFile, setSealFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [sealPreview, setSealPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const getStoredToken = () => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      ''
    );
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const token = getStoredToken();
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      const response = await fetch('/api/admin/settings', {
        headers: {
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        if (data.logoUrl) setLogoPreview(data.logoUrl);
        if (data.signatureUrl) setSignaturePreview(data.signatureUrl);
        if (data.sealUrl) setSealPreview(data.sealUrl);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Unable to load current settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'signature' | 'seal') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'logo') {
          setLogoFile(file);
          setLogoPreview(event.target?.result as string);
        } else if (type === 'signature') {
          setSignatureFile(file);
          setSignaturePreview(event.target?.result as string);
        } else {
          setSealFile(file);
          setSealPreview(event.target?.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = getStoredToken();
      const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

      // Upload images if selected
      if (logoFile || signatureFile || sealFile) {
        const formData = new FormData();
        if (logoFile) formData.append('logo', logoFile);
        if (signatureFile) formData.append('signature', signatureFile);
        if (sealFile) formData.append('seal', sealFile);

        const uploadResponse = await fetch('/api/admin/settings/upload', {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          if (uploadData.logoUrl) settings.logoUrl = uploadData.logoUrl;
          if (uploadData.signatureUrl) settings.signatureUrl = uploadData.signatureUrl;
          if (uploadData.sealUrl) settings.sealUrl = uploadData.sealUrl;
        }
      }

      // Save settings
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setSuccess('All settings and branding assets saved successfully!');
        setLogoFile(null);
        setSignatureFile(null);
        setSealFile(null);
        setTimeout(() => setSuccess(''), 4000);
      } else {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save settings');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Colorful Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/crm/web-admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Web Admin
              </Link>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <Settings className="w-3 h-3 text-blue-600" />
                Website & Brand Config
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Settings className="w-7 h-7 text-indigo-600" />
              Certificate, Receipt & Brand Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage organization metadata, company logo, official stamp, and automated receipt disclaimers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadSettings}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all shadow-xs disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={() => handleSave()}
              disabled={saving || loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-xs shadow-indigo-600/20 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes…' : 'Save All Settings'}
            </button>
          </div>
        </div>

        {/* 4 Colorful Metric/Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Organization</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
                {settings.companyName || 'Swar Yoga'}
              </p>
              <p className="text-xs text-blue-600 font-medium mt-1">Verified Entity</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
                <UserCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Authorized Signatory</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
                {settings.adminName || 'Not Assigned'}
              </p>
              <p className="text-xs text-indigo-600 font-medium mt-1 truncate">
                {settings.adminTitle || 'Signatory Authority'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Banking Details</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1 truncate">
                {settings.bankName || 'Active'}
              </p>
              <p className="text-xs text-emerald-600 font-medium mt-1 font-mono">
                {settings.bankAccount ? `•••• ${settings.bankAccount.slice(-4)}` : 'On File'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-3">
                <FileCheck className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Official Brand Assets</p>
              <p className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                {[logoPreview, signaturePreview, sealPreview].filter(Boolean).length} of 3
              </p>
              <p className="text-xs text-purple-600 font-medium mt-1">Logo, Stamp & Signature</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
              ✕
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">{success}</p>
            </div>
            <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700">
              ✕
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
          {[
            { id: 'company', label: 'Company & Contact', icon: Building2 },
            { id: 'signatory', label: 'Signatory & Bank', icon: UserCheck },
            { id: 'notes', label: 'Certificate & Receipt Notes', icon: FileCheck },
            { id: 'branding', label: 'Brand Assets (Logo, Stamp)', icon: Upload },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Main Settings Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
          {/* TAB 1: Company & Contact */}
          {activeTab === 'company' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Company Information</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Legal entity name, official address, and public contact information.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Brand Name *</label>
                  <input
                    type="text"
                    name="companyName"
                    value={settings.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g. Swar Yoga International"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Address *</label>
                  <textarea
                    name="companyAddress"
                    value={settings.companyAddress}
                    onChange={handleInputChange}
                    placeholder="Full postal address with city, state, and pin code..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Phone Number *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      name="companyPhone"
                      value={settings.companyPhone}
                      onChange={handleInputChange}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address *</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="companyEmail"
                      value={settings.companyEmail}
                      onChange={handleInputChange}
                      placeholder="support@swaryoga.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      name="companyWebsite"
                      value={settings.companyWebsite || ''}
                      onChange={handleInputChange}
                      placeholder="https://swaryoga.com"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Signatory & Bank */}
          {activeTab === 'signatory' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Authorized Signatory & Bank Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This signatory name and bank account will be automatically stamped on fee receipts.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Person Name *</label>
                  <input
                    type="text"
                    name="adminName"
                    value={settings.adminName}
                    onChange={handleInputChange}
                    placeholder="e.g. Mohan Kalburgi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Designation / Title *</label>
                  <input
                    type="text"
                    name="adminTitle"
                    value={settings.adminTitle}
                    onChange={handleInputChange}
                    placeholder="e.g. Founder & Managing Director"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={settings.bankName || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. State Bank of India / HDFC Bank"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={settings.bankAccount || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. 50200012345678"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC / Routing Code</label>
                  <input
                    type="text"
                    name="bankIFSC"
                    value={settings.bankIFSC || ''}
                    onChange={handleInputChange}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Certificate & Receipt Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Custom Legal Notes & Footers</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  These texts will be printed at the bottom of student course completion certificates and receipts.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Certificate Note (printed on completion certificates)
                  </label>
                  <textarea
                    name="certificateNote"
                    value={settings.certificateNote || ''}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="e.g. This certificate of completion is awarded for successfully completing the rigorous 15-day Swar Yoga Level-1 sadhana curriculum."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt Note (printed on PDF payment receipts)
                  </label>
                  <textarea
                    name="receiptNote"
                    value={settings.receiptNote || ''}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="e.g. Fees once paid are non-refundable. Thank you for your contribution to Swar Yoga sadhana research & wellness activities."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Brand Visual Assets */}
          {activeTab === 'branding' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Brand Visual Assets</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Upload crisp, transparent PNG images for logo header, admin signature, and official seal.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo */}
                <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/50 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Company Logo</span>
                  <div className="w-full h-36 bg-white border border-slate-200 rounded-xl mb-4 flex items-center justify-center p-3 relative overflow-hidden">
                    {logoPreview ? (
                      <Image src={logoPreview} alt="Logo" fill className="object-contain p-2" />
                    ) : (
                      <span className="text-xs text-slate-400">No logo uploaded</span>
                    )}
                  </div>
                  <label className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'logo')}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" /> Choose Logo File
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">Recommended: 240x80px PNG</p>
                </div>

                {/* Signature */}
                <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/50 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Admin Signature</span>
                  <div className="w-full h-36 bg-white border border-slate-200 rounded-xl mb-4 flex items-center justify-center p-3 relative overflow-hidden">
                    {signaturePreview ? (
                      <Image src={signaturePreview} alt="Signature" fill className="object-contain p-2" />
                    ) : (
                      <span className="text-xs text-slate-400">No signature uploaded</span>
                    )}
                  </div>
                  <label className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'signature')}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" /> Choose Signature
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">Recommended: 180x60px transparent PNG</p>
                </div>

                {/* Seal / Stamp */}
                <div className="border border-slate-200/80 rounded-2xl p-5 bg-slate-50/50 flex flex-col items-center text-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Official Seal / Stamp</span>
                  <div className="w-full h-36 bg-white border border-slate-200 rounded-xl mb-4 flex items-center justify-center p-3 relative overflow-hidden">
                    {sealPreview ? (
                      <Image src={sealPreview} alt="Seal" fill className="object-contain p-2" />
                    ) : (
                      <span className="text-xs text-slate-400">No stamp uploaded</span>
                    )}
                  </div>
                  <label className="w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'seal')}
                      className="hidden"
                    />
                    <span className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" /> Choose Seal Stamp
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">Recommended: 150x150px transparent PNG</p>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Changes apply instantly across all certificate generators and receipt templates.
            </p>
            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-xs shadow-indigo-600/20 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Changes…' : 'Save All Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
