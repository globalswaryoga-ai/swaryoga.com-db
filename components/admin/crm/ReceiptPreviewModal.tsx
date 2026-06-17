'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Download, Mail, Send, FileText, Loader2, AlertCircle, Plus,
  ExternalLink, CheckCircle, Clock,
} from 'lucide-react';

interface ReceiptData {
  _id: string;
  receiptNumber?: string;
  issuedAt?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  workshopName?: string;
  payment?: {
    status?: string;
    currency?: string;
    amount?: number;
    paidAmount?: number;
    method?: string;
    provider?: string;
    orderId?: string;
    transactionId?: string;
    paidAt?: string;
    discountAmount?: number;
  };
}

interface Props {
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  token: string;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ leadId, leadName, leadPhone, leadEmail, token, onClose }: Props) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/crm/receipts?leadId=${leadId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReceipts(json.data);
        if (json.data.length > 0) setActiveReceipt(json.data[0]);
      } else {
        setReceipts([]);
      }
    } catch {
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, [leadId, token]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  const generateReceipt = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        await fetchReceipts();
      } else {
        setError(json.error || 'Failed to generate receipt');
      }
    } catch {
      setError('Failed to generate receipt');
    } finally {
      setGenerating(false);
    }
  };

  // Opens PDF in a new browser tab (most reliable approach — no iframe CSP issues)
  const openPdf = () => {
    if (!activeReceipt) return;
    const url = `/api/admin/crm/receipts/pdf?id=${activeReceipt._id}&token=${encodeURIComponent(token)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const downloadPdf = async () => {
    if (!activeReceipt) return;
    try {
      const res = await fetch(`/api/admin/crm/receipts/pdf?id=${activeReceipt._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt-${activeReceipt.receiptNumber || activeReceipt._id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Download failed');
    }
  };

  const sendViaWhatsApp = () => {
    if (!activeReceipt) return;
    const phone = (leadPhone || activeReceipt.customerPhone || '').replace(/\D/g, '');
    const params = new URLSearchParams();
    params.set('phone', phone);
    params.set('receiptId', activeReceipt._id);
    if (leadName || activeReceipt.customerName) params.set('name', leadName || activeReceipt.customerName || '');
    router.push(`/admin/crm/meta?${params.toString()}`);
    onClose();
  };

  const sendViaEmail = () => {
    if (!activeReceipt) return;
    const email = leadEmail || activeReceipt.customerEmail || '';
    const subject = encodeURIComponent(`Your Receipt - ${activeReceipt.receiptNumber || 'Swar Yoga'}`);
    const amt = activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount || 0;
    const body = encodeURIComponent(
      `Dear ${activeReceipt.customerName || 'Student'},\n\nPlease find your receipt details below:\n\nReceipt No: ${activeReceipt.receiptNumber || '-'}\nWorkshop: ${activeReceipt.workshopName || '-'}\nAmount Paid: ₹${amt.toLocaleString('en-IN')}\nDate: ${activeReceipt.issuedAt ? new Date(activeReceipt.issuedAt).toLocaleDateString('en-IN') : '-'}\n\nThank you for choosing Swar Yoga!\n\nBest regards,\nSwar Yoga Team`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const fmtAmt = (n: number | undefined) =>
    `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const isPaid = (activeReceipt?.payment?.status || '').toLowerCase() === 'paid'
    || (activeReceipt?.payment?.paidAmount ?? 0) > 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100"
          style={{ background: 'linear-gradient(135deg,#1a4731 0%,#2d6a4f 60%,#e8801a 100%)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Invoice / Receipt</h2>
              <p className="text-xs text-white/70">{leadName || 'Customer'}{leadPhone ? ` · ${leadPhone}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Receipts Yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">
                No receipt exists for this lead. Generate a receipt or create a sale entry.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={generateReceipt}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Generate Receipt
                </button>
                <button
                  onClick={() => { router.push(`/admin/crm/sales?createFor=${leadId}`); onClose(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Make Sale Entry
                </button>
                <button
                  onClick={() => { router.push('/admin/crm/tally'); onClose(); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition"
                >
                  Add from Tally
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-5">
              {/* Receipt tabs (if multiple) */}
              {receipts.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {receipts.map((r, i) => (
                    <button
                      key={r._id}
                      onClick={() => setActiveReceipt(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition border ${
                        activeReceipt?._id === r._id
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                      }`}
                    >
                      {r.receiptNumber || `Receipt ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {activeReceipt && (
                <>
                  {/* ── Invoice preview card ── */}
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                    {/* Invoice header (mirrors PDF design) */}
                    <div className="relative overflow-hidden" style={{ background: '#ffffff', minHeight: 90 }}>
                      {/* Green diagonal stripe */}
                      <div
                        className="absolute"
                        style={{
                          right: -30, top: -30, width: 280, height: 130,
                          background: '#2d6a4f',
                          transform: 'rotate(12deg)',
                          transformOrigin: 'top right',
                        }}
                      />
                      <div className="relative flex items-start justify-between px-6 py-5">
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-0.5">Swar Yoga</p>
                          <p className="font-black text-2xl text-gray-900 leading-tight">INVOICE</p>
                          <p className="text-xs text-gray-500 mt-0.5">No: {activeReceipt.receiptNumber || activeReceipt._id}</p>
                        </div>
                        <div className="text-right z-10">
                          <p className="text-[10px] uppercase tracking-widest text-white/80 font-semibold">Date</p>
                          <p className="text-sm font-bold text-white">{fmtDate(activeReceipt.issuedAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Orange accent bar */}
                    <div className="h-1" style={{ background: '#e8801a' }} />

                    {/* Customer + Amount */}
                    <div className="grid grid-cols-2 divide-x divide-gray-100 bg-white px-6 py-4">
                      <div className="pr-4">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Invoice To</p>
                        <p className="text-base font-bold" style={{ color: '#1a6b55' }}>
                          {activeReceipt.customerName || leadName || '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {activeReceipt.customerPhone || leadPhone || ''}
                        </p>
                      </div>
                      <div className="pl-4 flex flex-col justify-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Total Amount</p>
                        <p className="text-2xl font-black" style={{ color: '#c0392b' }}>
                          {fmtAmt(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Workshop row */}
                    <div className="border-t border-gray-100">
                      {/* Table header */}
                      <div className="grid grid-cols-4 px-6 py-2" style={{ background: '#e8801a' }}>
                        {['WORKSHOP', 'QTY', 'AMOUNT', 'TOTAL'].map(h => (
                          <p key={h} className="text-[10px] font-bold text-white uppercase tracking-wide">{h}</p>
                        ))}
                      </div>
                      {/* Table row */}
                      <div className="grid grid-cols-4 px-6 py-3 bg-white border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900 col-span-1 truncate pr-2">
                          {activeReceipt.workshopName || '—'}
                        </p>
                        <p className="text-sm text-gray-700">1</p>
                        <p className="text-sm text-gray-700">
                          {fmtAmt(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                        </p>
                        <p className="text-sm font-semibold text-gray-900">
                          {fmtAmt(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                        </p>
                      </div>
                      {/* Payment row */}
                      <div className="grid grid-cols-4 px-6 py-3 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs text-gray-500 col-span-2">
                          {activeReceipt.payment?.method
                            ? `Via ${activeReceipt.payment.method.replace(/_/g, ' ')}`
                            : 'Payment received'}
                          {activeReceipt.payment?.paidAt ? ` · ${fmtDate(activeReceipt.payment.paidAt)}` : ''}
                        </p>
                        <p className="text-xs text-gray-500">
                          {fmtAmt(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                        </p>
                        <p className="text-xs font-semibold text-gray-700">
                          {fmtAmt(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Totals + Status */}
                    <div className="flex items-center justify-between px-6 py-4 bg-white">
                      {/* Status pill */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                        isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {isPaid
                          ? <CheckCircle className="h-3.5 w-3.5" />
                          : <Clock className="h-3.5 w-3.5" />}
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </div>
                      {/* Total box */}
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-gray-400 tracking-wider">Grand Total</p>
                        <p className="text-lg font-black" style={{ color: '#e8801a' }}>
                          {fmtAmt(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                        </p>
                      </div>
                    </div>

                    {/* Open PDF button */}
                    <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 flex items-center justify-between">
                      <p className="text-xs text-gray-400">Swar Yoga · Maldad Road, Sangamner</p>
                      <button
                        onClick={openPdf}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition hover:opacity-90"
                        style={{ background: '#2d6a4f' }}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View Full Invoice PDF
                      </button>
                    </div>
                  </div>

                  {/* Payment details row */}
                  {(activeReceipt.payment?.method || activeReceipt.payment?.transactionId || activeReceipt.payment?.orderId) && (
                    <div className="grid grid-cols-3 gap-3">
                      {activeReceipt.payment?.method && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Method</p>
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {activeReceipt.payment.method.replace(/_/g, ' ')}
                          </p>
                        </div>
                      )}
                      {activeReceipt.payment?.provider && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Provider</p>
                          <p className="text-sm font-semibold text-gray-800">{activeReceipt.payment.provider}</p>
                        </div>
                      )}
                      {activeReceipt.payment?.transactionId && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5">Txn ID</p>
                          <p className="text-sm font-semibold text-gray-800 truncate">{activeReceipt.payment.transactionId}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mx-6 mb-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        {activeReceipt && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center gap-3 flex-wrap">
            <button
              onClick={sendViaWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              <Send className="h-4 w-4" />
              WhatsApp
            </button>
            <button
              onClick={sendViaEmail}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-900 transition"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={generateReceipt}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition ml-auto disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Receipt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
