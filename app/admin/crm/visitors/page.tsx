'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, 
  MousePointerClick, 
  MapPin, 
  Smartphone, 
  Globe, 
  Laptop, 
  ArrowLeft,
  ArrowUpRight, 
  BarChart3, 
  Activity, 
  RefreshCw, 
  Search, 
  UserCheck, 
  Phone, 
  Mail, 
  Calendar,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface WebsiteVisitor {
  id: string;
  sessionId: string;
  ip: string;
  pageUrl: string;
  referrer: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  country: string;
  state: string;
  city: string;
  visitorName?: string;
  visitorEmail?: string;
  visitorPhone?: string;
  visitorGender?: string;
  source: string;
  createdAt: string;
}

export default function WebsiteVisitorsPage() {
  const token = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [totalVisitors, setTotalVisitors] = useState(0);
  const [pageViews, setPageViews] = useState(0);
  const [activeNow, setActiveNow] = useState(0);
  const [leadsCaptured, setLeadsCaptured] = useState(0);
  const [mobilePercent, setMobilePercent] = useState(0);
  const [desktopPercent, setDesktopPercent] = useState(0);
  const [topCountries, setTopCountries] = useState<Array<{ name: string; count: number; percentage: number }>>([]);
  const [topCities, setTopCities] = useState<Array<{ name: string; count: number }>>([]);
  const [visitors, setVisitors] = useState<WebsiteVisitor[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'leads' | 'mobile' | 'desktop'>('all');

  const fetchAnalytics = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/crm/visitors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load visitor data');
      }

      setTotalVisitors(data.totalVisitors30d || 0);
      setPageViews(data.totalPageViews || 0);
      setActiveNow(data.activeNow || 0);
      setLeadsCaptured(data.leadsCaptured || 0);
      setMobilePercent(data.mobilePercent || 0);
      setDesktopPercent(data.desktopPercent || 0);
      setTopCountries(data.topCountries || []);
      setTopCities(data.topCities || []);
      setVisitors(data.recentVisitors || []);
    } catch (err: any) {
      setError(err?.message || 'Error fetching visitors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  // Filter visitors
  const filteredVisitors = visitors.filter((v) => {
    if (filterType === 'leads' && !v.visitorEmail && !v.visitorPhone) {
      return false;
    }
    if (filterType === 'mobile' && v.deviceType !== 'mobile') {
      return false;
    }
    if (filterType === 'desktop' && v.deviceType === 'mobile') {
      return false;
    }

    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (v.visitorName && v.visitorName.toLowerCase().includes(term)) ||
      (v.visitorEmail && v.visitorEmail.toLowerCase().includes(term)) ||
      (v.visitorPhone && v.visitorPhone.includes(term)) ||
      (v.city && v.city.toLowerCase().includes(term)) ||
      (v.state && v.state.toLowerCase().includes(term)) ||
      (v.country && v.country.toLowerCase().includes(term)) ||
      (v.pageUrl && v.pageUrl.toLowerCase().includes(term)) ||
      (v.ip && v.ip.includes(term))
    );
  });

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/admin/crm/web-admin"
            className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Web Admin
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Website Visitors & Traffic
                </h1>
                <span className="flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Live Tracking
                </span>
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                Real-time tracking of website visits, visitor locations, devices, and captured course leads.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium shadow-sm transition disabled:opacity-50 self-start sm:self-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
              Last 30 Days
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {loading ? '...' : totalVisitors.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 font-medium">Unique Visitors</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
              <MousePointerClick className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              Clicks & Views
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {loading ? '...' : pageViews.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 font-medium">Page Views</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
              <UserCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2.5 py-1 rounded-full">
              Form Filled
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {loading ? '...' : leadsCaptured.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 font-medium">Registered Course Leads</div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
              <Activity className="w-5 h-5" />
            </div>
            <span className="flex items-center text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-ping" />
              15 min
            </span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mb-1">
            {loading ? '...' : activeNow.toLocaleString()}
          </div>
          <div className="text-sm text-slate-500 font-medium">Active Right Now</div>
        </div>
      </div>

      {/* Breakdown Row: Locations & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Locations */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Top Visitor Locations
            </h2>
            <span className="text-xs text-slate-400">By verified visits & IP</span>
          </div>

          {topCountries.length > 0 || topCities.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topCountries.map((c, i) => (
                  <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-slate-400" />
                        {c.name}
                      </span>
                      <span className="text-xs font-bold text-slate-600">{c.count} visits</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(10, c.percentage))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {topCities.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Top Cities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {topCities.map((city, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg border border-indigo-100"
                      >
                        <MapPin size={12} />
                        {city.name}
                        <span className="text-indigo-400">({city.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 bg-slate-50 border border-slate-100 rounded-xl border-dashed">
              <div className="text-center text-slate-400">
                <Globe className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Visitor locations will populate automatically as users browse.</p>
              </div>
            </div>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600" />
              Device Breakdown
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="flex items-center text-slate-700">
                  <Smartphone className="w-4 h-4 mr-2 text-indigo-600" /> Mobile
                </span>
                <span className="text-slate-900">{mobilePercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${mobilePercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span className="flex items-center text-slate-700">
                  <Laptop className="w-4 h-4 mr-2 text-emerald-600" /> Desktop
                </span>
                <span className="text-slate-900">{desktopPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${desktopPercent}%` }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 inline mr-1" />
              All traffic is verified directly against your server database logs.
            </div>
          </div>
        </div>
      </div>

      {/* Visitors Log Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Recent Visitors & Captured Leads
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredVisitors.length} of {visitors.length} total recorded entries
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Filter Tabs */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('leads')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'leads' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Leads Only ({leadsCaptured})
              </button>
              <button
                onClick={() => setFilterType('mobile')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Mobile
              </button>
              <button
                onClick={() => setFilterType('desktop')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Desktop
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, phone, city, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {filteredVisitors.length > 0 ? (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/80 text-slate-600 uppercase text-[11px] font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4 sm:px-6">Visitor / Lead</th>
                  <th className="py-3 px-4">WhatsApp / Contact</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Page Visited</th>
                  <th className="py-3 px-4 sm:px-6">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitors.map((v) => {
                  const isLead = Boolean(v.visitorName || v.visitorEmail || v.visitorPhone);
                  const cleanPhone = v.visitorPhone ? v.visitorPhone.replace(/\D/g, '') : '';

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Name / Lead */}
                      <td className="py-3.5 px-4 sm:px-6">
                        {isLead ? (
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {v.visitorName || 'Lead'}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                Lead
                              </span>
                              {v.visitorGender && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {v.visitorGender}
                                </span>
                              )}
                            </div>
                            {v.visitorEmail && (
                              <div className="text-slate-500 text-xs flex items-center gap-1 mt-0.5">
                                <Mail size={12} className="text-slate-400" />
                                {v.visitorEmail}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic">
                            Anonymous Visitor
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{v.ip}</div>
                          </div>
                        )}
                      </td>

                      {/* WhatsApp / Contact */}
                      <td className="py-3.5 px-4">
                        {v.visitorPhone ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800 font-mono">{v.visitorPhone}</span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition"
                                title="Chat on WhatsApp"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        {v.city || v.state || v.country ? (
                          <div className="flex items-center gap-1 text-slate-700">
                            <MapPin size={13} className="text-indigo-500 shrink-0" />
                            <span>
                              {[v.city, v.state, v.country].filter(Boolean).join(', ')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Unknown Location</span>
                        )}
                      </td>

                      {/* Device */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium ${
                            v.deviceType === 'mobile'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {v.deviceType === 'mobile' ? (
                            <Smartphone size={12} />
                          ) : (
                            <Laptop size={12} />
                          )}
                          {v.deviceType}
                        </span>
                      </td>

                      {/* Page Visited */}
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <span className="font-mono text-xs text-slate-600" title={v.pageUrl}>
                          {v.pageUrl ? v.pageUrl.replace(/^https?:\/\/[^/]+/, '') : '/'}
                        </span>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 sm:px-6 text-slate-500 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          {new Date(v.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(v.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium text-slate-600">No visitors found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm
                  ? 'No results matched your search query.'
                  : 'Traffic data and leads will appear here as visitors browse and unlock videos.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
