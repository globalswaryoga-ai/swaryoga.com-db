'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Download, Mail, Send, FileText, Loader2, AlertCircle, Plus,
  ExternalLink, CheckCircle, Clock, ChevronDown, QrCode,
} from 'lucide-react';

interface ReceiptData {
  _id: string;
  leadId?: string;
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

// Mirrors the canonical invoice design (app/api/admin/crm/receipts/pdf/route.ts
// and the sales/[id] receipt page) so this preview card never drifts from it.
const ORG = { address: 'Maldad Road, Sangamner', phone: '+91 93099 86820', email: 'mohan@swaryoga.com' };
const ASSETS = {
  photo: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
  logo: 'https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png',
  seal: 'https://swaryogacrm.b-cdn.net/Blue%20Ink%20Stamp%20of%20Upamanyu%20Ltd..png',
  signature: 'https://swaryogacrm.b-cdn.net/ChatGPT%20Image%20Aug%2021%2C%202025%20at%2004_08_28%20PM.png',
};
const ACCENT_BORDER = '#d9a26a';
const ACCENT_TABLE = '#f39c12';
const ACCENT_GREEN = '#5baa2f';
const ACCENT_RED = '#d72e2e';
const WAVE_LIGHT = '#6bb82c';
const WAVE_DARK = '#53825d';
const PAYMENT_MODE_LABELS: Record<string, string> = {
  payu: 'PayU',
  cashfree: 'Cashfree',
  upi: 'UPI (Paytm/PhonePe/GPay)',
  bank_transfer: 'Bank Transfer',
  paypal: 'PayPal',
  card: 'Card',
  cash: 'Cash',
  other: 'Other',
};

interface Props {
  leadId: string;
  leadName?: string;
  leadPhone?: string;
  leadEmail?: string;
  saleId?: string;
  token: string;
  onClose: () => void;
}

export default function ReceiptPreviewModal({ leadId, leadName, leadPhone, leadEmail, saleId, token, onClose }: Props) {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [whatsappMenuOpen, setWhatsappMenuOpen] = useState(false);

  // Generates a receipt, or — when one already exists but is stale (missing
  // the amount a real sale already has) — refreshes it in place.
  const generateReceipt = useCallback(async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, saleId }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReceipts((prev) => [json.data, ...prev.filter((r) => r._id !== json.data._id)]);
        setActiveReceipt(json.data);
      } else {
        setError(json.error || 'Failed to generate receipt');
      }
    } catch {
      setError('Failed to generate receipt');
    } finally {
      setGenerating(false);
    }
  }, [leadId, saleId, token]);

  // Fetch receipts for this lead; if the latest one looks stale (no amount)
  // and we know which sale this is, auto-heal it so the preview is correct
  // immediately — no extra "Generate Receipt" click needed.
  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = saleId ? `leadId=${leadId}&saleId=${saleId}` : `leadId=${leadId}`;
      const res = await fetch(`/api/admin/crm/receipts?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const data: ReceiptData[] = res.ok && Array.isArray(json.data) ? json.data : [];
      const top = data[0];
      const looksStale = !top || !top.payment?.amount;
      if (looksStale && saleId) {
        setLoading(false);
        await generateReceipt();
        return;
      }
      setReceipts(data);
      setActiveReceipt(top || null);
    } catch {
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  }, [leadId, saleId, token, generateReceipt]);

  useEffect(() => { fetchReceipts(); }, [fetchReceipts]);

  // Explicitly creates a brand-new receipt (e.g. for a follow-up payment),
  // unlike the auto-heal above which only refreshes an existing stale one.
  const regenerateReceipt = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, saleId, force: true }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setReceipts((prev) => [json.data, ...prev.filter((r) => r._id !== json.data._id)]);
        setActiveReceipt(json.data);
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

  const sendViaWhatsApp = (channel: 'meta' | 'qr') => {
    if (!activeReceipt) return;
    const phone = (leadPhone || activeReceipt.customerPhone || '').replace(/\D/g, '');
    const params = new URLSearchParams();
    params.set('phone', phone);
    params.set('receiptId', activeReceipt._id);
    if (leadName || activeReceipt.customerName) params.set('name', leadName || activeReceipt.customerName || '');
    router.push(`/admin/crm/${channel}?${params.toString()}`);
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
  const fmtRs = (n: number | undefined) => `RS. ${Math.round(n || 0).toLocaleString('en-IN')}/-`;
  const fmtDate = (d: string | undefined) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const isPaid = (activeReceipt?.payment?.status || '').toLowerCase() === 'paid'
    || (activeReceipt?.payment?.paidAmount ?? 0) > 0;

  const totalAmt = activeReceipt?.payment?.amount ?? activeReceipt?.payment?.paidAmount ?? 0;
  const paidAmt = activeReceipt?.payment?.paidAmount ?? totalAmt;
  const dueAmt = Math.max(0, totalAmt - paidAmt);
  const custId = (activeReceipt?.leadId || '').toString().slice(-6) || (activeReceipt?._id || '').slice(-6);
  const methodKey = (activeReceipt?.payment?.method || activeReceipt?.payment?.provider || '').toLowerCase();
  const methodLabel = PAYMENT_MODE_LABELS[methodKey]
    || (methodKey ? methodKey.charAt(0).toUpperCase() + methodKey.slice(1).replace(/_/g, ' ') : 'Bank Transfer');

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
                  {/* ── Invoice preview card (mirrors the canonical receipt design exactly) ── */}
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                    {/* Header with wave decoration */}
                    <div className="relative overflow-hidden">
                      <svg className="absolute top-0 left-0 w-full h-20" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0,0 L1000,0 L1000,20 C800,30 500,110 0,150 Z" fill={WAVE_LIGHT} />
                        <path d="M0,0 L1000,0 L1000,170 C800,165 500,70 0,30 Z" fill={WAVE_DARK} />
                      </svg>
                      <div className="relative flex items-end justify-between gap-4 px-6 pt-6 pb-4">
                        <div className="flex items-center gap-3">
                          <img src={ASSETS.photo} alt="Swar Yoga" className="w-14 h-14 rounded-full object-cover border-2 border-white shadow" />
                          <div>
                            <p className="text-xl font-extrabold text-gray-900 leading-tight">SWAR YOGA</p>
                            <p className="text-[10px] text-gray-500">{ORG.address} • Mo {ORG.phone}</p>
                            <p className="text-[10px] text-gray-500">Email: {ORG.email}</p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <img src={ASSETS.logo} alt="" className="w-10 h-10 rounded-full object-cover ml-auto mb-1" />
                          <p className="text-2xl font-extrabold text-gray-900">INVOICE</p>
                          <p className="text-[10px] text-gray-500">No: {activeReceipt.receiptNumber || activeReceipt._id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="h-[2px]" style={{ background: ACCENT_BORDER }} />

                    {/* Invoice To + Date/Total */}
                    <div className="flex justify-between gap-6 px-6 py-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400">Invoice To :</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">ID: {custId}</p>
                        <p className="text-lg font-bold mt-0.5" style={{ color: ACCENT_GREEN }}>
                          {activeReceipt.customerName || leadName || '—'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{activeReceipt.customerPhone || leadPhone || ''}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-700">Date: {fmtDate(activeReceipt.issuedAt)}</p>
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-3">Total Amount</p>
                        <p className="text-2xl font-extrabold mt-0.5" style={{ color: ACCENT_RED }}>{fmtRs(totalAmt)}</p>
                      </div>
                    </div>

                    {/* Fee table */}
                    <table className="w-full border-collapse">
                      <thead>
                        <tr style={{ background: ACCENT_TABLE }}>
                          <th className="py-2 px-4 text-left text-[10px] font-bold text-white uppercase">Workshop</th>
                          <th className="py-2 px-4 text-center text-[10px] font-bold text-white uppercase">Person</th>
                          <th className="py-2 px-4 text-center text-[10px] font-bold text-white uppercase">Fees</th>
                          <th className="py-2 px-4 text-right text-[10px] font-bold text-white uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-gray-700">
                        <tr>
                          <td className="py-2.5 px-4 font-semibold text-gray-900" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{activeReceipt.workshopName || 'Workshop'}</td>
                          <td className="py-2.5 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}>1</td>
                          <td className="py-2.5 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{Math.round(paidAmt).toLocaleString('en-IN')}/-</td>
                          <td className="py-2.5 px-4 text-right" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="py-2.5 px-4 text-gray-500 text-xs" style={{ border: `1px solid ${ACCENT_BORDER}` }}>
                            Received on the date of- {fmtDate(activeReceipt.payment?.paidAt || activeReceipt.issuedAt)}{methodKey ? ` (${methodKey})` : ''}
                          </td>
                          <td className="py-2.5 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                          <td className="py-2.5 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{Math.round(paidAmt).toLocaleString('en-IN')}/-</td>
                          <td className="py-2.5 px-4 text-right" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{Math.round(paidAmt).toLocaleString('en-IN')}</td>
                        </tr>
                        {dueAmt > 0 && (
                          <tr>
                            <td className="py-2.5 px-4 font-semibold text-gray-900" style={{ border: `1px solid ${ACCENT_BORDER}` }}>Amount Receivable</td>
                            <td className="py-2.5 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                            <td className="py-2.5 px-4 text-center font-semibold" style={{ border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_RED }}>{Math.round(dueAmt).toLocaleString('en-IN')}/-</td>
                            <td className="py-2.5 px-4 text-right" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Payment method + totals */}
                    <div className="flex justify-between items-start gap-6 px-6 py-4">
                      <div>
                        <p className="font-bold text-sm text-gray-900">Payment Method :</p>
                        <p className="text-sm text-gray-700 mt-0.5">{methodLabel}</p>
                        <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {isPaid ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </div>
                      </div>
                      <div className="w-40 flex-shrink-0 text-xs">
                        <div className="flex justify-between py-1.5 text-gray-700">
                          <span>Sub Total</span>
                          <span>{Math.round(paidAmt).toLocaleString('en-IN')}/-</span>
                        </div>
                        <div className="flex justify-between py-1.5 text-gray-700 border-t" style={{ borderColor: ACCENT_BORDER }}>
                          <span>Tax</span>
                          <span>0</span>
                        </div>
                        <div className="flex justify-between py-2 px-2 font-bold text-sm text-white" style={{ background: ACCENT_TABLE }}>
                          <span>Total</span>
                          <span>{Math.round(paidAmt).toLocaleString('en-IN')}/-</span>
                        </div>
                      </div>
                    </div>

                    {/* Seal & signature */}
                    <div className="flex items-end justify-between gap-6 px-6 pb-4">
                      <div className="text-center">
                        <img src={ASSETS.seal} alt="Company Seal" className="w-16 h-16 object-contain mx-auto" />
                        <p className="font-bold text-xs text-gray-900 mt-1">&quot;Thank you!&quot;</p>
                      </div>
                      <div className="text-center">
                        <img src={ASSETS.signature} alt="Signature" className="h-12 mx-auto object-contain" />
                        <p className="font-bold text-xs text-gray-900">Mohan Kalburgi</p>
                        <p className="text-[10px] text-gray-500 italic">Yogacharya</p>
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
            <div className="relative">
              <button
                onClick={() => setWhatsappMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <Send className="h-4 w-4" />
                WhatsApp
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {whatsappMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-44 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden z-10">
                  <button
                    onClick={() => { setWhatsappMenuOpen(false); sendViaWhatsApp('meta'); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Send className="h-4 w-4 text-emerald-600" />
                    Via Meta
                  </button>
                  <button
                    onClick={() => { setWhatsappMenuOpen(false); sendViaWhatsApp('qr'); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition border-t border-gray-100"
                  >
                    <QrCode className="h-4 w-4 text-indigo-600" />
                    Via QR
                  </button>
                </div>
              )}
            </div>
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
              onClick={regenerateReceipt}
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
