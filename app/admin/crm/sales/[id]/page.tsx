'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';
import { normalizePhoneForMeta } from '@/lib/utils/phone';

interface SaleRecord {
  _id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  workshopName?: string;
  batchDate?: string;
  saleAmount?: number;
  paymentMode?: string;
  saleDate?: string;
  reportedByUserId?: string;
  leadId?: string;
  status?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const id = params?.id as string;

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const receiptPrintRef = useRef<HTMLDivElement | null>(null);
  const [receiptPdfBusy, setReceiptPdfBusy] = useState(false);

  const receiptAddressLine =
    'Off No 04, Vedant Complex, Maldad Road, Sangamner - 422605, MH, India.';

  // Fetch sale details
  useEffect(() => {
    if (!id || !token) return;

    const fetchSale = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/crm/sales?id=${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load sale: ${response.statusText}`);
        }

        const data = await response.json();
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          setSale(data.data[0]);
        } else if (data.data && !Array.isArray(data.data)) {
          setSale(data.data);
        } else {
          throw new Error('Sale not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sale');
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id, token]);

  const fetchOrCreateReceipt = async () => {
    if (!token) {
      setReceiptError('Authentication required');
      return;
    }
    if (!sale?.leadId) {
      setReceiptError('Missing leadId for this sale. Please link the sale to a lead first.');
      return;
    }

    try {
      setReceiptBusy(true);
      setReceiptError(null);

      // 1) Try fetching the most recent receipt
      const res = await fetch(`/api/admin/crm/receipts?leadId=${encodeURIComponent(sale.leadId)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || `Failed to load receipts (${res.status})`);

      const rows = Array.isArray(json?.data) ? json.data : [];
      if (rows.length) {
        setReceipt(rows[0]);
        return;
      }

      // 2) If no receipt exists, create one
      const createRes = await fetch('/api/admin/crm/receipts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadId: sale.leadId }),
      });
      const created = await createRes.json().catch(() => null);
      if (!createRes.ok) throw new Error(created?.error || `Failed to create receipt (${createRes.status})`);
      setReceipt(created?.data || null);
    } catch (e) {
      setReceiptError(e instanceof Error ? e.message : 'Failed to load receipt');
    } finally {
      setReceiptBusy(false);
    }
  };

  const receiptTableRows = useMemo(() => {
    const workshopName = receipt?.workshopName || sale?.workshopName || 'Workshop';
    const amount = Number(receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? sale?.saleAmount ?? 0);

    return [
      {
        label: 'Workshop Name',
        value: String(workshopName),
      },
      {
        label: 'Amount',
        value: `₹${amount.toLocaleString()}`,
      },
      {
        label: 'Enrolled Date',
        value: new Date(receipt?.issuedAt || sale?.saleDate || sale?.createdAt || Date.now()).toLocaleDateString(),
      },
      {
        label: 'Payment Details',
        value: [
          receipt?.payment?.method ? `Method: ${receipt.payment.method}` : null,
          receipt?.payment?.provider ? `Provider: ${receipt.payment.provider}` : null,
          receipt?.payment?.transactionId ? `Txn: ${receipt.payment.transactionId}` : null,
          receipt?.payment?.orderId ? `Order: ${receipt.payment.orderId}` : null,
          receipt?.payment?.status ? `Status: ${receipt.payment.status}` : null,
        ]
          .filter(Boolean)
          .join(' • ') ||
          '—',
      },
    ];
  }, [receipt, sale?.createdAt, sale?.saleAmount, sale?.saleDate, sale?.workshopName]);

  if (!token) {
    return <AlertBox type="error" message="Authentication required" />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Sale Details" subtitle="Loading..." />
        <LoadingSpinner />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Sale Details" subtitle="Sale not found" />
        <AlertBox type="error" message={error || 'Sale not found'} onClose={() => router.back()} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-slate-300 hover:bg-slate-400 text-slate-700 transition-colors"
        >
          ← Back
        </button>

  {/* A4 Professional Document */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-4 border border-slate-200" style={{ aspectRatio: '8.5/11' }}>
          
          {/* Header */}
          <div className="border-b-2 border-slate-300 pb-3">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-red-600">SALE #{id?.slice(-6).toUpperCase()}</h1>
                <p className="text-xs text-slate-500 mt-1">Document ID: {id}</p>
              </div>
              <div className="text-right text-xs text-slate-600">
                <p><strong>Date:</strong> {new Date(sale.saleDate || sale.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            
            {/* Left Column - Customer & Lead Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Customer Name</p>
                <p className="font-semibold text-slate-900">{sale.customerName || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Customer ID</p>
                <p className="font-mono text-slate-800">{sale.customerId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Lead ID</p>
                <p className="font-mono text-blue-700">{sale.leadId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Phone</p>
                <p className="font-mono text-slate-800">{sale.customerPhone || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Email</p>
                <p className="text-xs text-slate-800 break-words">{sale.customerEmail || 'N/A'}</p>
              </div>
            </div>

            {/* Right Column - Order & Admin Info */}
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Workshop / Program</p>
                <p className="font-semibold text-slate-900">{sale.workshopName || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Batch Date</p>
                <p className="font-semibold text-slate-800">{sale.batchDate ? new Date(sale.batchDate).toLocaleDateString() : 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Admin User</p>
                <p className="font-mono text-slate-800">{sale.reportedByUserId || 'N/A'}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Status</p>
                <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${
                  sale.status === 'completed' ? 'bg-green-100 text-green-700' :
                  sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  sale.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {sale.status || 'N/A'}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-600 uppercase">Labels</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Array.isArray(sale.labels) && sale.labels.length > 0 ? (
                    sale.labels.slice(0, 3).map((label, idx) => (
                      <span key={idx} className="inline-block px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">
                        {label}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500 italic">No labels</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section - Compact */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-lg p-4 my-3">
            <h3 className="text-sm font-bold text-emerald-700 mb-2">PAYMENT DETAILS</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded p-3 border border-emerald-200 text-center">
                <p className="text-xs text-slate-600 font-bold">AMOUNT</p>
                <p className="text-2xl font-bold text-emerald-600">₹{(sale.saleAmount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded p-3 border border-emerald-200 text-center">
                <p className="text-xs text-slate-600 font-bold">MODE</p>
                <p className="text-lg font-bold text-slate-800 capitalize">{sale.paymentMode || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
            <p className="font-bold text-slate-700 mb-2">Transaction History</p>
            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="font-bold">Created:</span> {new Date(sale.createdAt).toLocaleString()}
              </div>
              <div>
                <span className="font-bold">Updated:</span> {new Date(sale.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                const normalized = normalizePhoneForMeta(sale.customerPhone || '');
                router.push(
                  `/admin/crm/whatsapp?leadId=${encodeURIComponent(sale.leadId || '')}&phone=${encodeURIComponent(normalized)}`
                );
              }}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded transition-colors"
            >
              💬 WhatsApp
            </button>
            <button
              onClick={async () => {
                setShowReceiptPreview(true);
                await fetchOrCreateReceipt();
              }}
              className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded transition-colors"
              title="Preview receipt"
            >
              🧾 Receipt
            </button>
            <button
              onClick={() => router.push(`/admin/crm/email?leadId=${encodeURIComponent(sale.leadId || '')}&email=${encodeURIComponent(sale.customerEmail || '')}`)}
              className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded transition-colors"
            >
              📧 Email
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 px-3 py-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-bold rounded transition-colors"
            >
              🖨️ Print
            </button>
          </div>
        </div>

        {/* Receipt Preview Overlay */}
        {showReceiptPreview ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
              {/* Preview Header Buttons Row */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="font-bold text-slate-800">Receipt Preview</div>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token) {
                        setReceiptError('Authentication required');
                        return;
                      }

                      const receiptId = receipt?._id;
                      if (!receiptId) {
                        // If receipt isn't loaded yet, fallback to print.
                        window.print();
                        return;
                      }

                      try {
                        setReceiptPdfBusy(true);
                        setReceiptError(null);

                        const res = await fetch(
                          `/api/admin/crm/receipts/pdf?id=${encodeURIComponent(String(receiptId))}`,
                          {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}` },
                            cache: 'no-store',
                          }
                        );

                        if (!res.ok) {
                          const j = await res.json().catch(() => null);
                          throw new Error(j?.error || `Failed to download PDF (${res.status})`);
                        }

                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        const receiptNo = String(receipt?.receiptNumber || 'receipt').replace(/[^a-zA-Z0-9_-]+/g, '_');
                        a.href = url;
                        a.download = `${receiptNo}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) {
                        // Fallback: print dialog (still allows Save as PDF)
                        setReceiptError(e instanceof Error ? e.message : 'Failed to download PDF');
                        window.print();
                      } finally {
                        setReceiptPdfBusy(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-semibold"
                  >
                    {receiptPdfBusy ? 'Downloading…' : '⬇️ Download'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const phone = normalizePhoneForMeta(sale.customerPhone || '');
                      const receiptNo = receipt?.receiptNumber || '-';
                      const amt = Number(receipt?.payment?.paidAmount ?? receipt?.payment?.amount ?? sale.saleAmount ?? 0);
                      const wk = String(receipt?.workshopName || sale.workshopName || 'workshop');

                      const msg = [
                        `Receipt ${receiptNo}`,
                        `Name: ${String(receipt?.customerName || sale.customerName || '')}`,
                        `Mobile: ${String(sale.customerPhone || '')}`,
                        `Workshop: ${wk}`,
                        `Amount: ₹${amt}`,
                        'Thank you for enrollment.',
                      ]
                        .filter(Boolean)
                        .join('\n');

                      router.push(
                        `/admin/crm/whatsapp?leadId=${encodeURIComponent(sale.leadId || '')}&phone=${encodeURIComponent(phone)}&message=${msg}`
                      );
                    }}
                    className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
                  >
                    💬 WhatsApp Send
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowReceiptPreview(false)}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-semibold"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Preview Body */}
              <div className="p-6 overflow-auto max-h-[80vh]">
                {receiptError ? (
                  <AlertBox type="error" message={receiptError} />
                ) : null}
                {receiptBusy ? <LoadingSpinner /> : null}

                <div ref={receiptPrintRef} className="mx-auto max-w-[820px]">
                  {/* Receipt (printable) */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden">
                    {/* Header section */}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left logo/brand */}
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full border border-slate-300 flex items-center justify-center font-black text-red-600">
                            SY
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 leading-tight">Swar Yoga</div>
                            <div className="text-xs text-slate-600">Receipt</div>
                          </div>
                        </div>

                        {/* Center heading */}
                        <div className="text-center flex-1">
                          <div className="text-lg font-extrabold text-slate-900">Swar Yoga and Naturopathy</div>
                          <div className="text-xs text-slate-700">Organised by: Upamnyu International Education P. Ltd.</div>
                          <div className="text-xs text-slate-700">Address: {receiptAddressLine}</div>
                        </div>

                        {/* Right receipt meta */}
                        <div className="text-right text-xs text-slate-700 min-w-[180px]">
                          <div>
                            <span className="font-bold">Receipt No:</span> {receipt?.receiptNumber || '—'}
                          </div>
                          <div>
                            <span className="font-bold">Date:</span>{' '}
                            {new Date(receipt?.issuedAt || sale.saleDate || sale.createdAt || Date.now()).toLocaleDateString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 h-px bg-slate-300" />

                      {/* Customer block */}
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs font-bold text-slate-600 uppercase">ID No</div>
                          <div className="font-mono text-slate-800">{receipt?.leadNumber || sale.customerId || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-600 uppercase">Sadhak Name (Customer)</div>
                          <div className="font-semibold text-slate-900">{receipt?.customerName || sale.customerName || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-600 uppercase">Mobile No</div>
                          <div className="font-mono text-slate-800">{receipt?.customerPhone || sale.customerPhone || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-600 uppercase">Address</div>
                          <div className="text-slate-800">{receipt?.customerAddress || '—'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Table section */}
                    <div className="px-5 pb-5">
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700">
                              <th className="text-left px-3 py-2 font-bold">Particular</th>
                              <th className="text-left px-3 py-2 font-bold">Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {receiptTableRows.map((r) => (
                              <tr key={r.label} className="border-t border-slate-200">
                                <td className="px-3 py-2 font-semibold text-slate-800 align-top">{r.label}</td>
                                <td className="px-3 py-2 text-slate-800">{r.value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 pb-5">
                      <div className="mt-2 text-sm text-slate-800">Thanks for enrollment.</div>
                      <div className="mt-6 flex items-end justify-between">
                        <div className="text-xs text-slate-600">
                          <div className="font-bold">Note:</div>
                          <div>Workshop fees will be not refundable or transferable.</div>
                          <div className="mt-2 font-semibold">Thank you!</div>
                        </div>
                        <div className="text-right">
                          <div className="h-12 w-24 border-2 border-slate-300 rounded-full inline-flex items-center justify-center text-xs font-bold text-slate-700">
                            STAMP
                          </div>
                          <div className="mt-2 text-sm font-semibold text-slate-800">Sign</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Print Hint */}
        <p className="text-center text-slate-500 text-xs mt-4 italic hidden print:block">
          Printed on {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  );
}
