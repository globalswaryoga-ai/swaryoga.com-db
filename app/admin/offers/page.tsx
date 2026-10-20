'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Calendar,
  Percent,
  Search,
  RefreshCw,
  ArrowLeft,
  Copy,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Users,
} from 'lucide-react';

interface Offer {
  _id: string;
  title: string;
  description: string;
  discountPercentage: number;
  offerCode: string;
  validFrom: string;
  validUntil: string;
  targetUsers: string;
  selectedUserEmails: string[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

interface CatalogItem {
  id: string;
  name: string;
  type: 'workshop' | 'course';
  category: string;
}

export default function AdminOffers() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [catalogWorkshops, setCatalogWorkshops] = useState<CatalogItem[]>([]);
  const [catalogCourses, setCatalogCourses] = useState<CatalogItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [selectedCatalogKey, setSelectedCatalogKey] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountPercentage: 0,
    offerCode: '',
    validFrom: '',
    validUntil: '',
    targetUsers: 'all',
    selectedUserEmails: '',
  });

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  const getStoredToken = () => {
    if (typeof window === 'undefined') return '';
    return (
      localStorage.getItem('crm_token') ||
      localStorage.getItem('adminToken') ||
      localStorage.getItem('admin_token') ||
      ''
    );
  };

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchOffers(token);
      fetchCatalog(token);
    }
  }, [router]);

  const fetchOffers = async (token?: string) => {
    const activeToken = token || getStoredToken();
    if (!activeToken) return;

    try {
      setLoading(true);
      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
      const response = await fetch('/api/admin/offers', {
        headers: {
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(Array.isArray(data) ? data : []);
      } else {
        setMessageType('error');
        setMessage('Failed to fetch offers');
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      setMessageType('error');
      setMessage('Error fetching offers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async (token?: string) => {
    const activeToken = token || getStoredToken();
    if (!activeToken) return;

    try {
      setLoadingCatalog(true);
      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
      const response = await fetch('/api/admin/offers/catalog', {
        headers: {
          Authorization: authHeader,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCatalogWorkshops(data.workshops || []);
        setCatalogCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching catalog for offers:', error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleCatalogSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedCatalogKey(val);
    if (!val || val === 'custom') return;

    const item = [...catalogCourses, ...catalogWorkshops].find(
      (x) => `${x.type}:${x.id}` === val
    );
    if (item) {
      setFormData((prev) => {
        let suggestedCode = prev.offerCode;
        if (!suggestedCode) {
          const initials = item.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase();
          const discountPart = prev.discountPercentage > 0 ? String(prev.discountPercentage) : '25';
          suggestedCode = `${initials}${discountPart}`;
        }
        return {
          ...prev,
          title: item.name,
          description: prev.description || `Special promotional offer for ${item.name}`,
          offerCode: suggestedCode,
        };
      });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'discountPercentage' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.offerCode || !formData.validFrom || !formData.validUntil) {
      setMessageType('error');
      setMessage('Please fill in all required fields');
      return;
    }

    if (formData.discountPercentage < 0 || formData.discountPercentage > 100) {
      setMessageType('error');
      setMessage('Discount percentage must be between 0 and 100');
      return;
    }

    if (new Date(formData.validFrom) >= new Date(formData.validUntil)) {
      setMessageType('error');
      setMessage('Valid until date must be after valid from date');
      return;
    }

    try {
      const activeToken = getStoredToken();
      if (!activeToken) {
        setMessageType('error');
        setMessage('Admin token not found. Please login again.');
        return;
      }

      const method = editingOffer ? 'PUT' : 'POST';
      const endpoint = '/api/admin/offers';
      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;

      const body = {
        ...(editingOffer && { offerId: editingOffer._id }),
        title: formData.title,
        description: formData.description,
        discountPercentage: formData.discountPercentage,
        offerCode: formData.offerCode.toUpperCase(),
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        targetUsers: formData.targetUsers,
        selectedUserEmails: formData.selectedUserEmails
          ? formData.selectedUserEmails.split(',').map((e) => e.trim()).filter(Boolean)
          : [],
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessageType('success');
        setMessage(editingOffer ? 'Offer updated successfully!' : 'Offer created successfully!');
        setShowForm(false);
        setEditingOffer(null);
        setFormData({
          title: '',
          description: '',
          discountPercentage: 0,
          offerCode: '',
          validFrom: '',
          validUntil: '',
          targetUsers: 'all',
          selectedUserEmails: '',
        });
        fetchOffers(activeToken);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setMessageType('error');
        setMessage(errorData.error || 'Failed to save offer');
      }
    } catch (error) {
      console.error('Error saving offer:', error);
      setMessageType('error');
      setMessage('Error saving offer');
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    const matchedItem = [...catalogCourses, ...catalogWorkshops].find(
      (x) => x.name.toLowerCase().trim() === offer.title.toLowerCase().trim()
    );
    setSelectedCatalogKey(matchedItem ? `${matchedItem.type}:${matchedItem.id}` : 'custom');
    setFormData({
      title: offer.title,
      description: offer.description,
      discountPercentage: offer.discountPercentage,
      offerCode: offer.offerCode,
      validFrom: offer.validFrom ? offer.validFrom.slice(0, 16) : '',
      validUntil: offer.validUntil ? offer.validUntil.slice(0, 16) : '',
      targetUsers: offer.targetUsers || 'all',
      selectedUserEmails: Array.isArray(offer.selectedUserEmails) ? offer.selectedUserEmails.join(', ') : '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (offerId: string) => {
    if (!window.confirm('Are you sure you want to delete this promotional offer?')) {
      return;
    }

    try {
      const activeToken = getStoredToken();
      if (!activeToken) return;

      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
      const response = await fetch('/api/admin/offers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ offerId }),
      });

      if (response.ok) {
        setMessageType('success');
        setMessage('Offer deleted successfully');
        fetchOffers(activeToken);
      } else {
        setMessageType('error');
        setMessage('Failed to delete offer');
      }
    } catch (error) {
      console.error('Error deleting offer:', error);
      setMessageType('error');
      setMessage('Error deleting offer');
    }
  };

  const toggleOfferStatus = async (offer: Offer) => {
    try {
      const activeToken = getStoredToken();
      if (!activeToken) return;

      const authHeader = activeToken.startsWith('Bearer ') ? activeToken : `Bearer ${activeToken}`;
      const response = await fetch('/api/admin/offers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          offerId: offer._id,
          isActive: !offer.isActive,
        }),
      });

      if (response.ok) {
        setMessageType('success');
        setMessage(`Offer ${!offer.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchOffers(activeToken);
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
      setMessageType('error');
      setMessage('Error updating offer status');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Metrics
  const metrics = useMemo(() => {
    const total = offers.length;
    const active = offers.filter((o) => o.isActive).length;
    const inactive = total - active;
    const maxDiscount = offers.reduce((max, o) => Math.max(max, o.discountPercentage || 0), 0);
    return { total, active, inactive, maxDiscount };
  }, [offers]);

  // Filtered
  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesSearch =
        !q ||
        offer.title.toLowerCase().includes(q) ||
        offer.offerCode.toLowerCase().includes(q) ||
        (offer.description && offer.description.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && offer.isActive) ||
        (statusFilter === 'inactive' && !offer.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [offers, search, statusFilter]);

  if (!isAuthenticated && loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Verifying admin access…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* Top Colorful Gradient Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/admin/crm/web-admin"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Web Admin
              </Link>
              <span className="text-slate-300">/</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                <Tag className="w-3 h-3 text-rose-600" />
                Marketing & Promotions
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Tag className="w-7 h-7 text-rose-600" />
              Promotional Offers & Discount Coupons
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create coupon codes, seasonal discounts, and automated promotional banners for checkout.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setShowForm(!showForm);
                setEditingOffer(null);
                setSelectedCatalogKey('');
                setFormData({
                  title: '',
                  description: '',
                  discountPercentage: 0,
                  offerCode: '',
                  validFrom: '',
                  validUntil: '',
                  targetUsers: 'all',
                  selectedUserEmails: '',
                });
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-xs ${
                showForm
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20'
              }`}
            >
              {showForm ? (
                <>
                  <X className="w-4 h-4" /> Cancel Form
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Create New Offer
                </>
              )}
            </button>

            <button
              onClick={() => fetchOffers()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-all shadow-xs disabled:opacity-60"
              title="Refresh offer list"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 Colorful Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
                <Tag className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Offers</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.total}</p>
              <p className="text-xs text-rose-600 font-medium mt-1">Configured coupons</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Coupons</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.active}</p>
              <p className="text-xs text-emerald-600 font-medium mt-1">Currently redeemable</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-600 mb-3">
                <ToggleLeft className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Inactive / Paused</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.inactive}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Disabled or expired</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-105" />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 mb-3">
                <Percent className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Top Discount</p>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{metrics.maxDiscount}%</p>
              <p className="text-xs text-amber-600 font-medium mt-1">Maximum savings tier</p>
            </div>
          </div>
        </div>

        {/* Alerts / Message */}
        {message && (
          <div
            className={`rounded-2xl border p-4 flex items-center justify-between gap-3 shadow-xs ${
              messageType === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {messageType === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <p className="text-sm font-medium">{message}</p>
            </div>
            <button onClick={() => setMessage('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Create / Edit Form Accordion */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-rose-200 shadow-sm p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-500" />
                  {editingOffer ? 'Edit Promotional Offer' : 'Create New Promotional Offer'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set code, discount percentage, validity window, and target audience
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="catalog-dropdown" className="block text-xs font-semibold text-slate-700">
                      Select Workshop / E-Learning Course *
                    </label>
                    {loadingCatalog && (
                      <span className="text-[11px] text-rose-500 animate-pulse flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                      </span>
                    )}
                  </div>

                  <select
                    id="catalog-dropdown"
                    value={selectedCatalogKey}
                    onChange={handleCatalogSelection}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-xs"
                  >
                    <option value="">-- Choose from Created Workshops / Courses --</option>

                    {catalogCourses.length > 0 && (
                      <optgroup label="🎓 E-Learning Courses (Recorded)">
                        {catalogCourses.map((c) => (
                          <option key={`course:${c.id}`} value={`course:${c.id}`}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {catalogWorkshops.length > 0 && (
                      <optgroup label="🔴 Live Workshops & Batches">
                        {catalogWorkshops.map((w) => (
                          <option key={`workshop:${w.id}`} value={`workshop:${w.id}`}>
                            {w.name}
                          </option>
                        ))}
                      </optgroup>
                    )}

                    <option value="custom">✏️ Custom / Type Manual Title</option>
                  </select>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Offer Title * (Auto-filled from selection or edit as needed)
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g. Swar Yoga Level 1 Special Discount"
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Coupon Code *</label>
                  <input
                    type="text"
                    name="offerCode"
                    value={formData.offerCode}
                    onChange={handleInputChange}
                    placeholder="e.g. SWARYOGA25"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                    disabled={!!editingOffer}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Explain discount terms, applicable courses, and minimum purchase rules..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount % *</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="discountPercentage"
                      value={formData.discountPercentage}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className="w-full px-3.5 py-2.5 pr-8 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                    <Percent className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valid From *</label>
                  <input
                    type="datetime-local"
                    name="validFrom"
                    value={formData.validFrom}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Until *</label>
                  <input
                    type="datetime-local"
                    name="validUntil"
                    value={formData.validUntil}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
                  <select
                    name="targetUsers"
                    value={formData.targetUsers}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="all">All Visitors & Students</option>
                    <option value="selected">Specific Email List</option>
                  </select>
                </div>

                {formData.targetUsers === 'selected' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">User Emails (comma-separated)</label>
                    <input
                      type="text"
                      name="selectedUserEmails"
                      value={formData.selectedUserEmails}
                      onChange={handleInputChange}
                      placeholder="user1@example.com, user2@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all shadow-xs"
                >
                  {editingOffer ? 'Update Offer' : 'Save & Publish Offer'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Directory Card with Search & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Card Top Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Configured Coupons & Deals</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {filteredOffers.length} of {offers.length} active and scheduled promotions
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search code, title..."
                  className="w-full sm:w-64 pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Status filter buttons */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80">
                {(['all', 'active', 'inactive'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-colors ${
                      statusFilter === st
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Coupon & Title</th>
                  <th className="px-5 py-3.5">Discount</th>
                  <th className="px-5 py-3.5">Validity Dates</th>
                  <th className="px-5 py-3.5">Target</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-rose-500 mb-2" />
                      Loading promotional offers…
                    </td>
                  </tr>
                ) : filteredOffers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No offers found matching current search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredOffers.map((offer) => {
                    const isExpired = new Date(offer.validUntil) < new Date();

                    return (
                      <tr key={offer._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Coupon & Title */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white font-bold flex items-center justify-center shadow-xs shrink-0">
                              <Tag className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                                  {offer.offerCode}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyCode(offer.offerCode)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Copy coupon code"
                                >
                                  {copiedCode === offer.offerCode ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                              <p className="font-semibold text-slate-900 mt-0.5">{offer.title}</p>
                              <p className="text-xs text-slate-400 line-clamp-1">{offer.description}</p>
                            </div>
                          </div>
                        </td>

                        {/* Discount */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-0.5 text-sm font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200/80">
                            {offer.discountPercentage}% OFF
                          </span>
                        </td>

                        {/* Validity Dates */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(offer.validFrom).toLocaleDateString()} -{' '}
                              {new Date(offer.validUntil).toLocaleDateString()}
                            </span>
                          </div>
                          {isExpired && (
                            <span className="inline-block mt-1 text-[11px] font-semibold text-rose-600">
                              Expired
                            </span>
                          )}
                        </td>

                        {/* Target */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {offer.targetUsers === 'all' ? 'All Users' : `${offer.selectedUserEmails?.length || 0} emails`}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleOfferStatus(offer)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              offer.isActive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {offer.isActive ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-3.5 h-3.5 text-slate-400" /> Inactive
                              </>
                            )}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleEdit(offer)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(offer._id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
