'use client';

import { useAuth } from '@/hooks/useAuth';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Mail,
  MessageSquare,
  QrCode,
  Bot,
  Loader,
  BarChart3,
  Calendar,
  Download,
  Eye,
} from 'lucide-react';

export default function AllReportsPage() {
  const [reports, setReports] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter, year

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/crm/reports?range=${dateRange}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setReports(data.reports);
      } else {
        setError(data.error || 'Failed to load reports');
      }
    } catch (err) {
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format: 'csv' | 'pdf') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `/api/admin/crm/reports/download?range=${dateRange}&format=${format}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-report-${dateRange}.${format}`;
      a.click();
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
            </div>
            <button
              onClick={() => downloadReport('pdf')}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex gap-2">
            {['week', 'month', 'quarter', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-red-700">
            {error}
          </div>
        ) : reports ? (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ₹{(reports.totalRevenue || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {reports.leads?.total || 0}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Conversion Rate</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {reports.conversionRate?.toFixed(1) || 0}%
                    </p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Avg Deal Value</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ₹{(reports.avgDealValue || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-orange-600" />
                </div>
              </div>
            </div>

            {/* Module-specific Reports */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Leads */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold">Leads Overview</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">New Leads</span>
                    <span className="font-semibold">{reports.leads?.new || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Qualified</span>
                    <span className="font-semibold">{reports.leads?.qualified || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">In Progress</span>
                    <span className="font-semibold">{reports.leads?.inProgress || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Won</span>
                    <span className="font-semibold text-green-600">{reports.leads?.won || 0}</span>
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-bold">Email Campaigns</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Emails Sent</span>
                    <span className="font-semibold">{(reports.email?.sent || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Opens</span>
                    <span className="font-semibold">{reports.email?.opens || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Open Rate</span>
                    <span className="font-semibold text-blue-600">{(reports.email?.openRate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Click Rate</span>
                    <span className="font-semibold text-blue-600">{(reports.email?.clickRate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* QR Broadcasts */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-bold">QR Broadcasts</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Total Sent</span>
                    <span className="font-semibold">{reports.qrBroadcast?.sent || 0}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Views</span>
                    <span className="font-semibold">{(reports.qrBroadcast?.views || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Clicks</span>
                    <span className="font-semibold text-green-600">{(reports.qrBroadcast?.clicks || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Click Rate</span>
                    <span className="font-semibold text-green-600">{(reports.qrBroadcast?.clickRate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Messaging */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-bold">Messaging Overview</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">Telegram Messages</span>
                    <span className="font-semibold">{(reports.messaging?.telegram || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">WhatsApp Messages</span>
                    <span className="font-semibold">{(reports.messaging?.whatsapp || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-700">SMS Messages</span>
                    <span className="font-semibold">{(reports.messaging?.sms || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700">Response Rate</span>
                    <span className="font-semibold text-purple-600">{(reports.messaging?.responseRate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Chatbots */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Bot className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold">AI Chatbots & Automation</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center py-4 border rounded-lg">
                    <p className="text-gray-600 text-sm">Conversations</p>
                    <p className="text-2xl font-bold text-gray-900">{reports.chatbot?.conversations || 0}</p>
                  </div>
                  <div className="text-center py-4 border rounded-lg">
                    <p className="text-gray-600 text-sm">Resolution Rate</p>
                    <p className="text-2xl font-bold text-indigo-600">{(reports.chatbot?.resolutionRate || 0).toFixed(0)}%</p>
                  </div>
                  <div className="text-center py-4 border rounded-lg">
                    <p className="text-gray-600 text-sm">Avg Response Time</p>
                    <p className="text-2xl font-bold text-gray-900">{reports.chatbot?.avgResponseTime || 0}s</p>
                  </div>
                  <div className="text-center py-4 border rounded-lg">
                    <p className="text-gray-600 text-sm">Customer Satisfaction</p>
                    <p className="text-2xl font-bold text-green-600">{(reports.chatbot?.satisfaction || 0).toFixed(1)}★</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-blue-900">Need more details?</h3>
                <p className="text-blue-700 text-sm">Export detailed reports in CSV or PDF format</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadReport('csv')}
                  className="px-4 py-2 bg-white hover:bg-gray-50 border border-blue-200 rounded-lg font-medium text-blue-600"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => downloadReport('pdf')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
