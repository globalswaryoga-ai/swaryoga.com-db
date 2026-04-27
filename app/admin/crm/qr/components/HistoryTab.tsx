'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Loader2, CheckCircle2, CheckCircle, AlertCircle } from 'lucide-react';

interface MessageRecord {
  _id?: string;
  id?: string;
  phoneNumber?: string;
  recipient?: string;
  message?: string;
  text?: string;
  status?: string;
  createdAt?: string;
  timestamp?: string;
  ticks?: number; // 0=sent, 1=delivered, 2=read
}

interface HistoryTabProps {
  token: string | null;
}

export function HistoryTab({ token }: HistoryTabProps) {
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/admin/crm/whatsapp/messages?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to load message history');
      }

      const data = await res.json();
      setMessages(data?.messages ?? []);
    } catch (e: any) {
      setError(e.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [token, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    if (token) fetchMessages();
  }, [token, filterStatus, dateFrom, dateTo, fetchMessages]);

  const getStatusIcon = (ticks?: number, status?: string) => {
    const tick1 = <CheckCircle className="w-4 h-4 text-gray-400" />;
    const tick2 = <CheckCircle2 className="w-4 h-4 text-gray-400" />;
    const tick2Blue = <CheckCircle2 className="w-4 h-4 text-blue-500" />;

    if (status) {
      if (status === 'read' || status === 'seen') return tick2Blue;
      if (status === 'delivered') return tick2;
      if (status === 'sent') return tick1;
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }

    if (ticks === 2) return tick2Blue;
    if (ticks === 1) return tick2;
    if (ticks === 0) return tick1;
    return <AlertCircle className="w-4 h-4 text-gray-300" />;
  };

  const getStatusLabel = (ticks?: number, status?: string) => {
    if (status) {
      if (status === 'read' || status === 'seen') return 'Read';
      if (status === 'delivered') return 'Delivered';
      if (status === 'sent') return 'Sent';
      return 'Failed';
    }
    if (ticks === 2) return 'Read';
    if (ticks === 1) return 'Delivered';
    if (ticks === 0) return 'Sent';
    return 'Pending';
  };

  const formatTime = (date: string | undefined) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="flex items-center gap-2 p-4 border-b bg-gray-50 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="read">Read</option>
          <option value="failed">Failed</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="To"
        />

        {(filterStatus !== 'all' || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setFilterStatus('all');
              setDateFrom('');
              setDateTo('');
            }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Messages Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Clock className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No sent messages yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-y sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Recipient</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Message</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Time</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((msg, idx) => (
                  <tr key={msg._id || msg.id || idx} className="border-b hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{msg.phoneNumber || msg.recipient || 'Unknown'}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{msg.message || msg.text || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(msg.ticks, msg.status)}
                        <span className="text-xs text-gray-600">{getStatusLabel(msg.ticks, msg.status)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {formatTime(msg.createdAt || msg.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
