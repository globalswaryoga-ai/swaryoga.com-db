'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  BarChart3, ArrowUp, ArrowDown, Activity, Phone,
  TrendingUp, TrendingDown, Users, MessageSquare,
  Calendar, Clock, CheckCircle2, AlertCircle,
  Download, RefreshCw, Loader2, ChevronDown, ChevronUp,
  Filter, Search, ArrowLeft,
} from 'lucide-react';

interface MessageStats {
  totalMessages: number;
  inboundMessages: number;
  outboundMessages: number;
  inboundChats: number;
  outboundChats: number;
  totalChats: number;
  lastMessageTime: string | null;
  avgMessagesPerChat: number;
  messagesByType: Record<string, number>;
  dailyBreakdown: Array<{ date: string; inbound: number; outbound: number; total: number }>;
}

interface ChannelStats extends MessageStats {
  phone: string;
  name?: string;
  status: 'connected' | 'disconnected';
  connectedAt?: string;
  uptime?: string;
  healthScore: number;
}

type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export default function HealthReportPage() {
  useAuth();

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<ChannelStats[]>([]);
  const [period, setPeriod] = useState<TimePeriod>('month');
  const [expandedPhone, setExpandedPhone] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'connected' | 'disconnected'>('all');
  const [searchPhone, setSearchPhone] = useState('');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(
        `/api/admin/crm/whatsapp/qr/health-stats?period=${period}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels || []);
      } else {
        console.error('Failed to load health stats');
      }
    } catch (error) {
      console.error('Error loading health report:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      if (filterStatus !== 'all' && ch.status !== filterStatus) return false;
      if (searchPhone && !ch.phone.includes(searchPhone)) return false;
      return true;
    });
  }, [channels, filterStatus, searchPhone]);

  const totalStats = useMemo(() => {
    const result: MessageStats = {
      totalMessages: 0,
      inboundMessages: 0,
      outboundMessages: 0,
      inboundChats: 0,
      outboundChats: 0,
      totalChats: 0,
      lastMessageTime: null,
      avgMessagesPerChat: 0,
      messagesByType: {},
      dailyBreakdown: [],
    };

    channels.forEach(ch => {
      result.totalMessages += ch.totalMessages;
      result.inboundMessages += ch.inboundMessages;
      result.outboundMessages += ch.outboundMessages;
      result.inboundChats += ch.inboundChats;
      result.outboundChats += ch.outboundChats;
      result.totalChats += ch.totalChats;

      Object.entries(ch.messagesByType).forEach(([type, count]) => {
        result.messagesByType[type] = (result.messagesByType[type] || 0) + count;
      });

      if (ch.lastMessageTime && (!result.lastMessageTime || ch.lastMessageTime > result.lastMessageTime)) {
        result.lastMessageTime = ch.lastMessageTime;
      }
    });

    if (result.totalChats > 0) {
      result.avgMessagesPerChat = Math.round(result.totalMessages / result.totalChats);
    }

    // Merge daily breakdowns
    const dailyMap: Record<string, { inbound: number; outbound: number; total: number }> = {};
    channels.forEach(ch => {
      ch.dailyBreakdown.forEach(day => {
        if (!dailyMap[day.date]) dailyMap[day.date] = { inbound: 0, outbound: 0, total: 0 };
        dailyMap[day.date].inbound += day.inbound;
        dailyMap[day.date].outbound += day.outbound;
        dailyMap[day.date].total += day.total;
      });
    });
    result.dailyBreakdown = Object.entries(dailyMap).map(([date, data]) => ({ date, ...data }));

    return result;
  }, [channels]);

  const connectedCount = channels.filter(ch => ch.status === 'connected').length;
  const inboundHealthScore = channels.length > 0
    ? Math.round((channels.filter(ch => ch.healthScore >= 70).length / channels.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/crm/qr" className="text-gray-400 hover:text-gray-600">
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">QR WhatsApp Health Report</h1>
                <p className="text-sm text-gray-500 mt-1">Inbound & Outbound Message Statistics</p>
              </div>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Messages</span>
              <MessageSquare size={20} className="text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStats.totalMessages.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">Across all channels</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Inbound</span>
              <ArrowDown size={20} className="text-green-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStats.inboundMessages.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">
              {totalStats.totalMessages > 0
                ? `${Math.round((totalStats.inboundMessages / totalStats.totalMessages) * 100)}% of total`
                : '0%'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Outbound</span>
              <ArrowUp size={20} className="text-orange-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalStats.outboundMessages.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">
              {totalStats.totalMessages > 0
                ? `${Math.round((totalStats.outboundMessages / totalStats.totalMessages) * 100)}% of total`
                : '0%'}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Connected Channels</span>
              <Phone size={20} className="text-purple-600" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{connectedCount}/{channels.length}</p>
            <p className="text-xs text-gray-500 mt-2">Active connections</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Health Score</span>
              <Activity size={20} className={inboundHealthScore >= 70 ? 'text-green-600' : 'text-red-600'} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{inboundHealthScore}%</p>
            <p className="text-xs text-gray-500 mt-2">Channels healthy</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as TimePeriod)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Channels</option>
                <option value="connected">Connected Only</option>
                <option value="disconnected">Disconnected Only</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Phone</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  placeholder="Search by phone number"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Channels List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Loader2 size={40} className="mx-auto mb-4 text-gray-400 animate-spin" />
            <p className="text-gray-500">Loading health report...</p>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle size={40} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No channels found matching your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChannels.map(channel => (
              <div key={channel.phone} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Channel Header */}
                <button
                  onClick={() => setExpandedPhone(expandedPhone === channel.phone ? null : channel.phone)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-3 h-3 rounded-full ${channel.status === 'connected' ? 'bg-green-600' : 'bg-red-600'}`} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{channel.name || channel.phone}</p>
                      <p className="text-sm text-gray-500">{channel.phone}</p>
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{channel.totalMessages}</p>
                      <p className="text-xs text-gray-500">Messages</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <ArrowDown size={16} className="text-green-600" />
                        <span className="text-sm font-medium">{channel.inboundMessages}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <ArrowUp size={16} className="text-orange-600" />
                        <span className="text-sm font-medium">{channel.outboundMessages}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${channel.healthScore >= 70 ? 'text-green-600' : 'text-red-600'}`}>
                        {channel.healthScore}%
                      </p>
                      <p className="text-xs text-gray-500">Health</p>
                    </div>
                  </div>

                  <ChevronDown
                    size={20}
                    className={`text-gray-400 transition ${expandedPhone === channel.phone ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded Details */}
                {expandedPhone === channel.phone && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Inbound Messages</p>
                        <p className="text-3xl font-bold text-green-600">{channel.inboundMessages}</p>
                        <p className="text-xs text-gray-600 mt-1">{channel.inboundChats} chats</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Outbound Messages</p>
                        <p className="text-3xl font-bold text-orange-600">{channel.outboundMessages}</p>
                        <p className="text-xs text-gray-600 mt-1">{channel.outboundChats} chats</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Avg Messages/Chat</p>
                        <p className="text-3xl font-bold text-blue-600">{channel.avgMessagesPerChat}</p>
                        <p className="text-xs text-gray-600 mt-1">{channel.totalChats} total chats</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Last Message</p>
                        <p className="text-sm font-medium text-gray-900">
                          {channel.lastMessageTime
                            ? new Date(channel.lastMessageTime).toLocaleDateString('en-IN')
                            : 'Never'}
                        </p>
                        {channel.uptime && <p className="text-xs text-gray-600 mt-1">Uptime: {channel.uptime}</p>}
                      </div>
                    </div>

                    {/* Message Types */}
                    {Object.keys(channel.messagesByType).length > 0 && (
                      <div className="mb-6">
                        <p className="text-sm font-semibold text-gray-700 mb-3">Message Types</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                          {Object.entries(channel.messagesByType).map(([type, count]) => (
                            <div key={type} className="bg-white rounded p-3">
                              <p className="text-xs text-gray-500 capitalize mb-1">{type}</p>
                              <p className="text-lg font-bold text-gray-900">{count}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily Breakdown */}
                    {channel.dailyBreakdown.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-3">Daily Activity</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {channel.dailyBreakdown.slice(-7).map(day => (
                            <div key={day.date} className="bg-white rounded p-3 text-sm">
                              <p className="text-gray-600 font-medium mb-2">{day.date}</p>
                              <div className="space-y-1 text-xs">
                                <p><span className="text-gray-500">In:</span> <span className="font-bold text-green-600">{day.inbound}</span></p>
                                <p><span className="text-gray-500">Out:</span> <span className="font-bold text-orange-600">{day.outbound}</span></p>
                                <p><span className="text-gray-500">Total:</span> <span className="font-bold text-gray-900">{day.total}</span></p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Export Button */}
        {channels.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                const csv = generateCSV(filteredChannels, totalStats);
                downloadCSV(csv, `qr-health-report-${new Date().toISOString().split('T')[0]}.csv`);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Download size={18} /> Export Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function generateCSV(channels: ChannelStats[], totals: MessageStats): string {
  let csv = 'QR WhatsApp Health Report\n\n';
  csv += `Generated: ${new Date().toISOString()}\n\n`;

  csv += 'SUMMARY\n';
  csv += 'Total Messages,Inbound,Outbound,Connected Channels,Total Channels\n';
  csv += `${totals.totalMessages},${totals.inboundMessages},${totals.outboundMessages},${channels.filter(c => c.status === 'connected').length},${channels.length}\n\n`;

  csv += 'CHANNELS\n';
  csv += 'Phone,Name,Status,Total Messages,Inbound,Outbound,Total Chats,Health Score\n';
  channels.forEach(ch => {
    csv += `"${ch.phone}","${ch.name || ''}","${ch.status}",${ch.totalMessages},${ch.inboundMessages},${ch.outboundMessages},${ch.totalChats},${ch.healthScore}%\n`;
  });

  return csv;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}
