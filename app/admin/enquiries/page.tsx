'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Phone, MapPin, Trash2, Eye, EyeOff } from 'lucide-react';

interface Enquiry {
  id: string;
  workshopId: string;
  workshopName: string;
  name: string;
  mobile: string;
  gender: string;
  city: string;
  submittedAt: string;
  status: 'new' | 'contacted' | 'registered';
  notes?: string;
}

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'contacted' | 'registered'>('all');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Fetch enquiries
  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/enquiries');
      if (!response.ok) throw new Error('Failed to fetch enquiries');
      const data = await response.json();
      setEnquiries(data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this enquiry?')) return;

    try {
      const response = await fetch(`/api/admin/enquiries?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete enquiry');
      setEnquiries(enquiries.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete enquiry');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/enquiries?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      
      const updated = enquiries.map((e) =>
        e.id === id ? { ...e, status: newStatus as Enquiry['status'] } : e
      );
      setEnquiries(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Get unique workshops for filter
  const workshops = Array.from(new Set(enquiries.map((e) => e.workshopName)));

  // Filter enquiries
  const filteredEnquiries = enquiries.filter((enquiry) => {
    const statusMatch = selectedFilter === 'all' || enquiry.status === selectedFilter;
    const workshopMatch = selectedWorkshop === 'all' || enquiry.workshopName === selectedWorkshop;
    const searchMatch = searchTerm === '' || 
      enquiry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enquiry.mobile.includes(searchTerm) ||
      enquiry.city.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && workshopMatch && searchMatch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'registered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar isOpen={true} onClose={() => {}} />

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Workshop Enquiries</h1>
            <p className="text-gray-600">
              Total Enquiries: <span className="font-semibold">{enquiries.length}</span>
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Search by name, mobile, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />

              {/* Status Filter */}
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="registered">Registered</option>
              </select>

              {/* Workshop Filter */}
              <select
                value={selectedWorkshop}
                onChange={(e) => setSelectedWorkshop(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Workshops</option>
                {workshops.map((ws) => (
                  <option key={ws} value={ws}>
                    {ws}
                  </option>
                ))}
              </select>

              {/* Refresh Button */}
              <button
                onClick={fetchEnquiries}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Enquiries Table */}
          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">Loading enquiries...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg shadow-md p-8 text-center">
              <p className="text-red-700">{error}</p>
            </div>
          ) : filteredEnquiries.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-500">No enquiries found</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Mobile View */}
              <div className="block md:hidden space-y-4 p-4">
                {filteredEnquiries.map((enquiry) => (
                  <div
                    key={enquiry.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">{enquiry.name}</h3>
                        <p className="text-sm text-gray-600">{enquiry.workshopName}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(enquiry.status)}`}>
                        {enquiry.status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        {enquiry.mobile}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin className="w-4 h-4" />
                        {enquiry.city} • {enquiry.gender}
                      </div>
                      <div className="text-xs text-gray-500">{formatDate(enquiry.submittedAt)}</div>
                    </div>

                    <select
                      value={enquiry.status}
                      onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="registered">Registered</option>
                    </select>

                    <button
                      onClick={() => handleDelete(enquiry.id)}
                      className="w-full text-sm text-red-600 hover:text-red-700 font-medium py-1"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Workshop</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Submitted</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnquiries.map((enquiry) => (
                      <React.Fragment key={enquiry.id}>
                        <tr className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-gray-800">{enquiry.name}</div>
                            <div className="text-sm text-gray-600">{enquiry.gender}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <a href={`tel:${enquiry.mobile}`} className="text-primary-600 hover:underline">
                                {enquiry.mobile}
                              </a>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              {enquiry.city}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-700">{enquiry.workshopName}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(enquiry.submittedAt)}</td>
                          <td className="px-6 py-4">
                            <select
                              value={enquiry.status}
                              onChange={(e) => handleStatusChange(enquiry.id, e.target.value)}
                              className={`px-3 py-1 rounded-full text-sm font-semibold border-0 cursor-pointer ${getStatusBadgeColor(enquiry.status)}`}
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="registered">Registered</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() =>
                                setExpandedRow(expandedRow === enquiry.id ? null : enquiry.id)
                              }
                              className="mr-2 text-gray-600 hover:text-gray-800"
                              title="View details"
                            >
                              {expandedRow === enquiry.id ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(enquiry.id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete enquiry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {expandedRow === enquiry.id && (
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <td colSpan={7} className="px-6 py-4">
                              <div className="text-sm">
                                <p className="text-gray-600 mb-2">
                                  <strong>ID:</strong> {enquiry.id}
                                </p>
                                <p className="text-gray-600">
                                  <strong>Notes:</strong> {enquiry.notes || 'No notes'}
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {enquiries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {enquiries.filter((e) => e.status === 'new').length}
                </div>
                <p className="text-gray-600 mt-2">New Enquiries</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {enquiries.filter((e) => e.status === 'contacted').length}
                </div>
                <p className="text-gray-600 mt-2">Contacted</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {enquiries.filter((e) => e.status === 'registered').length}
                </div>
                <p className="text-gray-600 mt-2">Registered</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
