'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PhoneCall, Video, Search, CheckCircle, Clock, Trash2,
  RefreshCw, ArrowLeft, Send, MessageCircle, ExternalLink,
  Filter, Calendar, User, Phone, Check, AlertCircle, Loader2
} from 'lucide-react';

interface CallRequest {
  id: string;
  name: string;
  phone: string;
  category: string;
  preferredTime: string;
  note: string;
  communityId: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

interface Stats {
  total: number;
  pending: number;
  completed: number;
  zoom: number;
  calls: number;
}

export default function CallRequestsAdminPage() {
  const [requests, setRequests] = useState<CallRequest[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, completed: 0, zoom: 0, calls: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pending' | 'completed' | 'zoom' | 'call'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/community/call-requests', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setRequests(data.requests || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load call requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const updateStatus = async (id: string, currentStatus: string) => {
    try {
      setActionLoading(id);
      const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      const res = await fetch('/api/admin/community/call-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: nextStatus } : r));
        setStats(prev => ({
          ...prev,
          pending: nextStatus === 'completed' ? prev.pending - 1 : prev.pending + 1,
          completed: nextStatus === 'completed' ? prev.completed + 1 : prev.completed - 1,
        }));
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to remove this request?')) return;
    try {
      setActionLoading(id);
      const res = await fetch(`/api/admin/community/call-requests?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      alert('Failed to delete request');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    const isZoom = req.category.toLowerCase().includes('zoom');
    if (filterType === 'pending' && req.status !== 'pending') return false;
    if (filterType === 'completed' && req.status !== 'completed') return false;
    if (filterType === 'zoom' && !isZoom) return false;
    if (filterType === 'call' && isZoom) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        req.name.toLowerCase().includes(q) ||
        req.phone.toLowerCase().includes(q) ||
        req.category.toLowerCase().includes(q) ||
        req.note.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm/community"
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="Back to Community Hub"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                  <PhoneCall size={18} />
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  1:1 Call & Zoom Video Requests
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Manage all direct consultation, phone call, and 1:1 Zoom meet requests from members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title="Refresh List"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              href="/admin/crm/community/workspace"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              Open Studio
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div
            onClick={() => setFilterType('all')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <p className="text-xs font-medium opacity-80">Total Requests</p>
            <p className="text-2xl font-black mt-1">{stats.total}</p>
          </div>

          <div
            onClick={() => setFilterType('pending')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'pending'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-amber-600">Pending Follow-ups</p>
              <Clock size={16} className="text-amber-500" />
            </div>
            <p className="text-2xl font-black text-amber-900 mt-1">{stats.pending}</p>
          </div>

          <div
            onClick={() => setFilterType('zoom')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'zoom'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-blue-600">1:1 Zoom Video</p>
              <Video size={16} className="text-blue-500" />
            </div>
            <p className="text-2xl font-black text-blue-900 mt-1">{stats.zoom}</p>
          </div>

          <div
            onClick={() => setFilterType('completed')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-emerald-600">Completed</p>
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <p className="text-2xl font-black text-emerald-900 mt-1">{stats.completed}</p>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, phone, topic, or notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'pending', label: 'Pending' },
              { id: 'completed', label: 'Completed' },
              { id: 'zoom', label: '🎥 Zoom' },
              { id: 'call', label: '📞 Phone Call' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterType === tab.id
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-sm font-semibold">Loading call requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <p className="text-4xl mb-2">📞</p>
              <h3 className="text-base font-bold text-slate-700">No requests found</h3>
              <p className="text-xs text-slate-500 mt-1">There are no call or Zoom meeting requests matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4">Type & Topic</th>
                    <th className="py-3 px-4">Preferred Time</th>
                    <th className="py-3 px-4">Question / Note</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequests.map(req => {
                    const isZoom = req.category.toLowerCase().includes('zoom');
                    const cleanPhone = req.phone.replace(/\D/g, '');
                    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
                    const dateFormatted = new Date(req.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 text-sm">{req.name}</p>
                          <p className="text-slate-500 font-mono text-[11px] mt-0.5">{req.phone}</p>
                          <span className="text-[10px] text-slate-400">{dateFormatted}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 mb-1">
                            {isZoom ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-md flex items-center gap-1 text-[10px]">
                                <Video size={11} />
                                Zoom 1:1
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md flex items-center gap-1 text-[10px]">
                                <Phone size={11} />
                                Phone Call
                              </span>
                            )}
                          </div>
                          <p className="font-semibold text-slate-700">{req.category.replace(/^Zoom 1:1 Meet:\s*/, '')}</p>
                          <p className="text-[10px] text-slate-400">Community: {req.communityId}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-medium">
                            {req.preferredTime}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          {req.note ? (
                            <p className="text-slate-600 line-clamp-2 italic">"{req.note}"</p>
                          ) : (
                            <span className="text-slate-400 italic">No notes provided</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <button
                            onClick={() => updateStatus(req.id, req.status)}
                            disabled={actionLoading === req.id}
                            className={`px-3 py-1 rounded-full font-bold text-[10px] transition-all flex items-center gap-1 active:scale-95 ${
                              req.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            }`}
                          >
                            {req.status === 'completed' ? (
                              <>
                                <Check size={11} />
                                Done
                              </>
                            ) : (
                              <>
                                <Clock size={11} />
                                Pending
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Call Button */}
                            <a
                              href={`tel:${req.phone}`}
                              className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                              title="Call Phone"
                            >
                              <Phone size={14} />
                            </a>

                            {/* WhatsApp Button */}
                            <a
                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Namaste ${req.name} ji! Main Mohan Kalburgi Swar Yoga se aapke ${req.category} ke call request ke sambandh mein message kar raha hoon.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                              title="Send WhatsApp Message"
                            >
                              <Send size={14} />
                            </a>

                            {/* Zoom Invite Link */}
                            {isZoom && (
                              <a
                                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Namaste ${req.name} ji! Yeh raha aapka 1:1 Zoom Video meeting link: https://us06web.zoom.us/j/85155446286. Kripya nirdharit samay par join karein.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
                                title="Send Zoom Meeting Link via WhatsApp"
                              >
                                <Video size={14} />
                              </a>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => deleteRequest(req.id)}
                              disabled={actionLoading === req.id}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete request"
                            >
                              <Trash2 size={14} />
                            </button>
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
      </div>
    </div>
  );
}
