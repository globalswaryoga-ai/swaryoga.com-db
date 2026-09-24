'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Loader2, UserCircle, DollarSign, ExternalLink } from 'lucide-react';

/**
 * Leads and Sales as in-place popups over the QR inbox, so a lead can be
 * looked up and its chat opened without navigating away.
 *
 * Tenant isolation: the leads query sends `qrOnly=1`, which the leads API
 * treats the same as `scope=own` — it scopes even a super admin to their own
 * QR leads. Dropping that flag would surface other tenants' leads here.
 */

type Lead = {
  _id: string;
  name?: string;
  phoneNumber?: string;
  status?: string;
  source?: string;
  createdAt?: string;
};

type Sale = {
  _id: string;
  customerName?: string;
  amount?: number;
  saleDate?: string;
  paymentMode?: string;
  leadId?: { phoneNumber?: string; name?: string };
};

function Shell({
  title, icon: Icon, onClose, children, footer,
}: {
  title: string;
  icon: React.ElementType;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b flex items-center justify-between bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Icon className="w-4 h-4" /> {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function LeadsModal({
  token, onClose, onOpenChat,
}: {
  token: string | null;
  onClose: () => void;
  /** Opens the chat for this phone number and closes the popup. */
  onOpenChat?: (phone: string) => void;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (search: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // qrOnly=1 keeps this scoped to the tenant's own QR leads.
      const params = new URLSearchParams({
        qrOnly: '1', limit: '50', selectAll: 'true',
        fields: 'name,phoneNumber,status,source,createdAt',
      });
      if (search.trim()) params.set('q', search.trim());
      const res = await fetch(`/api/admin/crm/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load leads');
      setLeads(data?.data?.leads || []);
      setTotal(data?.data?.total ?? (data?.data?.leads || []).length);
    } catch (e: any) {
      setError(e?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => load(q), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [q, load]);

  return (
    <Shell title="QR Leads" icon={UserCircle} onClose={onClose}
      footer={<a href="/admin/crm/qr/leads" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900">
        <ExternalLink className="w-3.5 h-3.5" /> Open full leads page
      </a>}
    >
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:ring-1 focus:ring-green-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : leads.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No leads found.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-2">
            {total} lead{total === 1 ? '' : 's'}{total > leads.length ? ` (showing first ${leads.length})` : ''}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2 pr-3 font-medium">Name</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Source</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr
                    key={l._id}
                    onClick={() => { if (l.phoneNumber && onOpenChat) { onOpenChat(l.phoneNumber); onClose(); } }}
                    className={`border-b last:border-0 ${l.phoneNumber && onOpenChat ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    title={l.phoneNumber && onOpenChat ? 'Open this chat' : undefined}
                  >
                    <td className="py-2 pr-3 text-gray-900">{l.name || 'Unnamed'}</td>
                    <td className="py-2 pr-3 text-gray-600">{l.phoneNumber || '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{(l.status || '').replace(/_/g, ' ') || '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{l.source || '—'}</td>
                    <td className="py-2 text-gray-500">{l.createdAt ? new Date(l.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}

export function SalesModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/crm/sales?view=list&limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load sales');
        if (!cancelled) setSales(data?.data?.sales || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load sales');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const totalAmount = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <Shell title="QR Sales" icon={DollarSign} onClose={onClose}
      footer={<a href="/admin/crm/sales" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900">
        <ExternalLink className="w-3.5 h-3.5" /> Open full sales page
      </a>}
    >
      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
      ) : error ? (
        <p className="py-10 text-center text-sm text-red-600">{error}</p>
      ) : sales.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">No sales recorded yet.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-2">
            {sales.length} most recent · total ₹{totalAmount.toLocaleString('en-IN')}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="py-2 pr-3 font-medium">Customer</th>
                  <th className="py-2 pr-3 font-medium">Phone</th>
                  <th className="py-2 pr-3 font-medium text-right">Amount</th>
                  <th className="py-2 pr-3 font-medium">Mode</th>
                  <th className="py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s._id} className="border-b last:border-0">
                    <td className="py-2 pr-3 text-gray-900">{s.customerName || s.leadId?.name || '—'}</td>
                    <td className="py-2 pr-3 text-gray-600">{s.leadId?.phoneNumber || '—'}</td>
                    <td className="py-2 pr-3 text-right text-gray-900 font-medium">
                      {typeof s.amount === 'number' ? `₹${s.amount.toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-600">{s.paymentMode || '—'}</td>
                    <td className="py-2 text-gray-500">{s.saleDate ? new Date(s.saleDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Shell>
  );
}
