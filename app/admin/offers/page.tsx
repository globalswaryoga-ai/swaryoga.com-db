'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import AdminSidebar from '@/components/AdminSidebar';

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

export default function AdminOffers() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');

    if (!adminToken || adminUser !== 'admin') {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      fetchOffers(adminToken);
    }
  }, [router]);

  const fetchOffers = async (token: string) => {
    try {
      const response = await fetch('/api/admin/offers', {
        headers: {
          Authorization: token,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOffers(data);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'discountPercentage' ? parseFloat(value) : value,
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
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessageType('error');
        setMessage('Admin token not found. Please login again.');
        return;
      }

      const method = editingOffer ? 'PUT' : 'POST';
      const endpoint = editingOffer ? '/api/admin/offers' : '/api/admin/offers';

      const body = {
        ...(editingOffer && { offerId: editingOffer._id }),
        title: formData.title,
        description: formData.description,
        discountPercentage: formData.discountPercentage,
        offerCode: formData.offerCode,
        validFrom: formData.validFrom,
        validUntil: formData.validUntil,
        targetUsers: formData.targetUsers,
        selectedUserEmails: formData.selectedUserEmails ? formData.selectedUserEmails.split(',').map((e) => e.trim()) : [],
      };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessageType('success');
        setMessage(editingOffer ? 'Offer updated successfully' : 'Offer created successfully');
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
        fetchOffers(token!);
      } else {
        const errorData = await response.json();
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
    setFormData({
      title: offer.title,
      description: offer.description,
      discountPercentage: offer.discountPercentage,
      offerCode: offer.offerCode,
      validFrom: offer.validFrom.slice(0, 16),
      validUntil: offer.validUntil.slice(0, 16),
      targetUsers: offer.targetUsers,
      selectedUserEmails: offer.selectedUserEmails.join(', '),
    });
    setShowForm(true);
  };

  const handleDelete = async (offerId: string) => {
    if (!window.confirm('Are you sure you want to delete this offer?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessageType('error');
        setMessage('Admin token not found. Please login again.');
        return;
      }

      const response = await fetch('/api/admin/offers', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({ offerId }),
      });

      if (response.ok) {
        setMessageType('success');
        setMessage('Offer deleted successfully');
        fetchOffers(token);
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
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setMessageType('error');
        setMessage('Admin token not found. Please login again.');
        return;
      }

      const response = await fetch('/api/admin/offers', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token,
        },
        body: JSON.stringify({
          offerId: offer._id,
          isActive: !offer.isActive,
        }),
      });

      if (response.ok) {
        setMessageType('success');
        setMessage(`Offer ${!offer.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchOffers(token);
      }
    } catch (error) {
      console.error('Error toggling offer status:', error);
      setMessageType('error');
      setMessage('Error updating offer status');
    }
  };

  if (!isAuthenticated) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen bg-swar-primary-light">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-swar-text">Manage Offers</h1>
            <button
              onClick={() => {
                setShowForm(!showForm);
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
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus size={20} />
              New Offer
            </button>
          </div>
        </header>

        {/* Messages */}
        {message && (
          <div
            className={`mx-6 mt-4 p-4 rounded-lg flex items-center justify-between ${
              messageType === 'success' ? 'bg-swar-primary-light text-swar-primary' : 'bg-red-100 text-red-700'
            }`}
          >
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="p-1">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Form */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-swar-text mb-6">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Offer Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., Winter Yoga Sale"
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Offer Code *</label>
                    <input
                      type="text"
                      name="offerCode"
                      value={formData.offerCode}
                      onChange={handleInputChange}
                      placeholder="e.g., WINTER20"
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      required
                      disabled={!!editingOffer}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-swar-text mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the offer details..."
                    className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Discount % *</label>
                    <input
                      type="number"
                      name="discountPercentage"
                      value={formData.discountPercentage}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Valid From *</label>
                    <input
                      type="datetime-local"
                      name="validFrom"
                      value={formData.validFrom}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Valid Until *</label>
                    <input
                      type="datetime-local"
                      name="validUntil"
                      value={formData.validUntil}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-swar-text mb-2">Target Users</label>
                    <select
                      name="targetUsers"
                      value={formData.targetUsers}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                    >
                      <option value="all">All Users</option>
                      <option value="selected">Selected Users</option>
                    </select>
                  </div>

                  {formData.targetUsers === 'selected' && (
                    <div>
                      <label className="block text-sm font-medium text-swar-text mb-2">User Emails (comma-separated)</label>
                      <input
                        type="text"
                        name="selectedUserEmails"
                        value={formData.selectedUserEmails}
                        onChange={handleInputChange}
                        placeholder="user1@email.com, user2@email.com"
                        className="w-full px-4 py-2 border border-swar-border rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <Check size={20} />
                    {editingOffer ? 'Update Offer' : 'Create Offer'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingOffer(null);
                    }}
                    className="bg-gray-300 text-swar-text px-6 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Offers List */}
          {loading ? (
            <div className="text-center py-12">Loading offers...</div>
          ) : offers.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-swar-text-secondary text-lg">No offers yet</p>
              <p className="text-swar-text-secondary text-sm mt-2">Create your first offer to get started</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {offers.map((offer) => (
                <div key={offer._id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-swar-text">{offer.title}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            offer.isActive
                              ? 'bg-swar-primary-light text-swar-primary'
                              : 'bg-swar-primary-light text-swar-text'
                          }`}
                        >
                          {offer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-swar-text-secondary mb-3">{offer.description}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-bold text-primary-600 mb-2">{offer.discountPercentage}%</div>
                      <p className="text-xs text-swar-text-secondary">Discount</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b border-swar-border">
                    <div>
                      <p className="text-xs text-swar-text-secondary uppercase">Offer Code</p>
                      <p className="font-mono font-bold text-swar-text">{offer.offerCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-swar-text-secondary uppercase">Valid From</p>
                      <p className="text-sm text-swar-text">{new Date(offer.validFrom).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-swar-text-secondary uppercase">Valid Until</p>
                      <p className="text-sm text-swar-text">{new Date(offer.validUntil).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-swar-text-secondary uppercase">Target</p>
                      <p className="text-sm text-swar-text capitalize">{offer.targetUsers === 'all' ? 'All Users' : 'Selected'}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleOfferStatus(offer)}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        offer.isActive
                          ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          : 'bg-swar-primary-light text-swar-primary hover:bg-swar-border'
                      }`}
                    >
                      {offer.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleEdit(offer)}
                      className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(offer._id)}
                      className="flex-1 bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
