'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, Download, Mail, Send, FileText, Loader2, AlertCircle, Plus,
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
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [showCreateSale, setShowCreateSale] = useState(false);

  // Fetch receipts for this lead
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
        if (json.data.length > 0) {
          setActiveReceipt(json.data[0]);
        }
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

  // Load PDF for active receipt
  useEffect(() => {
    if (!activeReceipt) { setPdfUrl(null); return; }
    const url = `/api/admin/crm/receipts/pdf?id=${activeReceipt._id}`;
    setPdfUrl(url);
  }, [activeReceipt]);

  // Generate receipt if none exists
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

  // Download PDF
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

  // WhatsApp via Meta — navigate to Meta chat page with receipt context
  const sendViaWhatsApp = () => {
    if (!activeReceipt) return;
    const phone = (leadPhone || activeReceipt.customerPhone || '').replace(/\D/g, '');
    // Navigate to Meta WhatsApp page with receipt info for admin to send
    const params = new URLSearchParams();
    params.set('phone', phone);
    params.set('receiptId', activeReceipt._id);
    if (leadName || activeReceipt.customerName) params.set('name', leadName || activeReceipt.customerName || '');
    router.push(`/admin/crm/meta?${params.toString()}`);
    onClose();
  };

  // Email — open mailto with receipt details
  const sendViaEmail = () => {
    if (!activeReceipt) return;
    const email = leadEmail || activeReceipt.customerEmail || '';
    const subject = encodeURIComponent(`Your Receipt - ${activeReceipt.receiptNumber || 'Swar Yoga'}`);
    const body = encodeURIComponent(
      `Dear ${activeReceipt.customerName || 'Student'},\n\nPlease find your receipt details below:\n\nReceipt No: ${activeReceipt.receiptNumber || '-'}\nAmount: ₹${activeReceipt.payment?.amount || 0}\nPaid: ₹${activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount || 0}\nDate: ${activeReceipt.issuedAt ? new Date(activeReceipt.issuedAt).toLocaleDateString('en-IN') : '-'}\n\nThank you for choosing Swar Yoga!\n\nBest regards,\nSwar Yoga Team`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
  };

  const formatCurrency = (amt: number | undefined) => `₹${(amt || 0).toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Receipts</h2>
              <p className="text-xs text-gray-500">{leadName || 'Lead'} {leadPhone ? `· ${leadPhone}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
          ) : receipts.length === 0 ? (
            /* No receipt — prompt to create sale entry */
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Receipts Yet</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-sm">
                This lead doesn&apos;t have any receipts generated yet. Create a sale entry or generate a receipt.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={generateReceipt}
                  disabled={generating}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Generate Receipt
                </button>
                <button
                  onClick={() => {
                    router.push(`/admin/crm/sales?createFor=${leadId}`);
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Make Sale Entry
                </button>
                <button
                  onClick={() => {
                    router.push('/admin/crm/tally');
                    onClose();
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 text-white hover:bg-purple-700 transition"
                >
                  Add from Tally
                </button>
              </div>
            </div>
          ) : (
            /* Receipt preview */
            <div>
              {/* Receipt selector (if multiple) */}
              {receipts.length > 1 && (
                <div className="px-6 pt-4 flex gap-2 overflow-x-auto">
                  {receipts.map((r, i) => (
                    <button
                      key={r._id}
                      onClick={() => setActiveReceipt(r)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                        activeReceipt?._id === r._id
                          ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {r.receiptNumber || `Receipt ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* Receipt info card */}
              {activeReceipt && (
                <div className="p-6 space-y-4">
                  {/* Quick info grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Receipt Number</p>
                      <p className="text-sm font-bold text-gray-900">{activeReceipt.receiptNumber || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Date</p>
                      <p className="text-sm font-bold text-gray-900">
                        {activeReceipt.issuedAt ? new Date(activeReceipt.issuedAt).toLocaleDateString('en-IN') : '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Amount</p>
                      <p className="text-sm font-bold text-emerald-600">{formatCurrency(activeReceipt.payment?.amount)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Paid</p>
                      <p className="text-sm font-bold text-emerald-600">
                        {formatCurrency(activeReceipt.payment?.paidAmount || activeReceipt.payment?.amount)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Customer</p>
                      <p className="text-sm font-semibold text-gray-900">{activeReceipt.customerName || '-'}</p>
                      <p className="text-xs text-gray-500">{activeReceipt.customerPhone || ''}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Workshop</p>
                      <p className="text-sm font-semibold text-gray-900">{activeReceipt.workshopName || '-'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Payment Details</p>
                      <div className="flex gap-4 text-xs text-gray-600">
                        <span>Status: <strong className="text-gray-900">{activeReceipt.payment?.status || '-'}</strong></span>
                        <span>Method: <strong className="text-gray-900">{activeReceipt.payment?.method || '-'}</strong></span>
                        <span>Provider: <strong className="text-gray-900">{activeReceipt.payment?.provider || '-'}</strong></span>
                        {activeReceipt.payment?.transactionId && (
                          <span>Txn: <strong className="text-gray-900">{activeReceipt.payment.transactionId}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PDF iframe preview */}
                  {pdfUrl && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-100">
                      <iframe
                        src={`${pdfUrl}&token=${encodeURIComponent(token)}`}
                        className="w-full h-[320px]"
                        title="Receipt PDF"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mx-6 mb-4 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Action buttons footer */}
        {activeReceipt && (
          <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 flex items-center gap-3">
            {/* WhatsApp */}
            <button
              onClick={sendViaWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90"
              style={{ background: '#25D366' }}
            >
              <Send className="h-4 w-4" />
              WhatsApp
            </button>
            {/* Email */}
            <button
              onClick={sendViaEmail}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            {/* Download */}
            <button
              onClick={downloadPdf}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gray-800 text-white hover:bg-gray-900 transition"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            {/* Generate new */}
            <button
              onClick={() => generateReceipt()}
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
