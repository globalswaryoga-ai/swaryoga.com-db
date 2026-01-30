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
  customerAddress?: string;
  workshopName?: string;
  batchDate?: string;
  saleAmount?: number;
  workshopFee?: number;
  paidAmount?: number;
  dueAmount?: number;
  paymentType?: 'full' | 'part' | 'advance';
  paymentHistory?: Array<{
    amount: number;
    date: string;
    mode: string;
    transactionId?: string;
    note?: string;
  }>;
  transactionId?: string;
  paymentMode?: string;
  saleDate?: string;
  reportedByUserId?: string;
  leadId?: string | { _id: string; name?: string; phoneNumber?: string };
  status?: string;
  labels?: string[];
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper to get leadId as string (handles both string and populated object)
function getLeadIdString(leadId: string | { _id: string; name?: string; phoneNumber?: string } | undefined): string {
  if (!leadId) return '';
  if (typeof leadId === 'string') return leadId;
  return leadId._id || '';
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
    const leadIdStr = getLeadIdString(sale?.leadId);
    if (!leadIdStr) {
      setReceiptError('Missing leadId for this sale. Please link the sale to a lead first.');
      return;
    }

    try {
      setReceiptBusy(true);
      setReceiptError(null);

      // 1) Try fetching the most recent receipt
      const res = await fetch(`/api/admin/crm/receipts?leadId=${encodeURIComponent(leadIdStr)}`, {
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
        body: JSON.stringify({ leadId: leadIdStr }),
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
                <p className="font-mono text-blue-700">{getLeadIdString(sale.leadId) || 'N/A'}</p>
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
                  `/admin/crm/whatsapp?leadId=${encodeURIComponent(getLeadIdString(sale.leadId))}&phone=${encodeURIComponent(normalized)}`
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
              onClick={() => router.push(`/admin/crm/email?leadId=${encodeURIComponent(getLeadIdString(sale.leadId))}&email=${encodeURIComponent(sale.customerEmail || '')}`)}
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
                        `/admin/crm/whatsapp?leadId=${encodeURIComponent(getLeadIdString(sale.leadId))}&phone=${encodeURIComponent(phone)}&message=${msg}`
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
                  {/* Professional Invoice/Receipt - Exact Match to PNG Design */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden relative" style={{ minHeight: '1100px' }}>
                    
                    {/* Green Wave - Top Left Corner */}
                    <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        <defs>
                          <linearGradient id="greenWave1" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.2"/>
                          </linearGradient>
                        </defs>
                        <path d="M0,0 L0,180 Q30,160 60,140 Q100,110 120,80 Q140,50 160,30 Q180,10 200,0 L0,0 Z" fill="url(#greenWave1)"/>
                        <path d="M0,0 L0,140 Q20,120 50,100 Q80,75 100,55 Q130,30 160,15 Q180,5 200,0 L0,0 Z" fill="#22c55e" fillOpacity="0.3"/>
                      </svg>
                    </div>

                    {/* Green Wave - Bottom Left & Right */}
                    <div className="absolute bottom-0 left-0 w-full h-32 pointer-events-none">
                      <svg viewBox="0 0 800 120" preserveAspectRatio="none" className="w-full h-full">
                        <defs>
                          <linearGradient id="greenWave2" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
                            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.35"/>
                          </linearGradient>
                        </defs>
                        <path d="M0,60 Q100,30 200,50 Q350,80 500,40 Q650,0 800,30 L800,120 L0,120 Z" fill="url(#greenWave2)"/>
                        <path d="M0,80 Q150,50 300,70 Q450,90 600,60 Q700,40 800,50 L800,120 L0,120 Z" fill="#22c55e" fillOpacity="0.25"/>
                      </svg>
                    </div>
                    
                    {/* Header Section */}
                    <div className="relative px-8 pt-8 pb-4">
                      <div className="flex items-start justify-between">
                        {/* Left - Owner Photo + SWAR YOGA */}
                        <div className="flex items-center gap-4">
                          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-green-600 shadow-lg bg-gray-100 flex-shrink-0">
                            <img 
                              src="/logo with mohan sir.png" 
                              alt="Mohan Kalburgi" 
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <h1 className="text-3xl font-black text-slate-800 tracking-wide">SWAR YOGA</h1>
                        </div>

                        {/* Right - Logo + INVOICE */}
                        <div className="text-right flex flex-col items-end">
                          <div className="w-16 h-16 rounded-full overflow-hidden border-[3px] border-green-600 bg-white shadow-md">
                            <img 
                              src="/logo-square.png" 
                              alt="Swar Yoga Logo" 
                              className="w-full h-full object-contain p-1"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>
                          <p className="text-sm text-orange-500 font-bold mt-1">SWAR YOGA</p>
                          <p className="text-[9px] text-slate-500">Organised by: Upamnyu International Education P. Ltd.</p>
                          <h2 className="text-4xl font-black text-slate-700 tracking-wider mt-3">INVOICE</h2>
                          <p className="text-sm text-slate-500">No: {receipt?.receiptNumber || `R-${String(sale._id || '').slice(-6).toUpperCase()}`}</p>
                        </div>
                      </div>
                    </div>

                    {/* Invoice To & Date Section */}
                    <div className="relative px-8 py-5 mx-6 bg-slate-50/60 rounded-xl mt-2">
                      <div className="flex justify-between items-start">
                        {/* Left - Customer Info */}
                        <div>
                          <p className="text-sm text-slate-500 uppercase font-semibold tracking-wide">Invoice To :</p>
                          <p className="text-2xl font-bold text-orange-500 mt-1">{(receipt?.customerName || sale.customerName || 'CUSTOMER NAME').toUpperCase()}</p>
                          <p className="text-base font-bold text-slate-800 mt-1">ID: {sale.customerId || String(sale._id || '').slice(-6).toUpperCase()}</p>
                          <div className="mt-2 space-y-0.5 text-sm text-slate-600">
                            <p>{receipt?.customerPhone || sale.customerPhone || '+91-XXX-XXX-XXXX'}</p>
                            <p>{receipt?.customerEmail || sale.customerEmail || 'email@example.com'}</p>
                            <p className="max-w-[280px]">{receipt?.customerAddress || sale.customerAddress || 'Address'}</p>
                          </div>
                        </div>
                        
                        {/* Right - Date & Amount */}
                        <div className="text-right">
                          <p className="text-sm text-slate-700">
                            <span className="font-semibold">Date:</span> {new Date(receipt?.issuedAt || sale.saleDate || sale.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </p>
                          <p className="text-xs text-slate-500 uppercase font-semibold mt-6 tracking-wide">Total Amount</p>
                          <p className="text-4xl font-black text-orange-500 mt-1">RS. {Number(sale.workshopFee || sale.saleAmount || receipt?.payment?.amount || 0).toLocaleString()}/-</p>
                        </div>
                      </div>
                    </div>

                    {/* Workshop Table */}
                    <div className="relative px-8 py-5">
                      <table className="w-full text-sm border-collapse rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-gradient-to-r from-orange-500 to-orange-400 text-white">
                            <th className="text-left px-4 py-3 font-bold text-sm rounded-tl-lg" style={{ width: '45%' }}>WORKSHOPS</th>
                            <th className="text-center px-3 py-3 font-bold text-sm" style={{ width: '15%' }}>PERSON</th>
                            <th className="text-center px-3 py-3 font-bold text-sm" style={{ width: '20%' }}>FEES</th>
                            <th className="text-right px-4 py-3 font-bold text-sm rounded-tr-lg" style={{ width: '20%' }}>TOTAL</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {/* Workshop Row */}
                          <tr className="border-b border-slate-200">
                            <td className="px-4 py-3 text-slate-800 font-semibold">{receipt?.workshopName || sale.workshopName || 'Swar Yoga Master Class'}</td>
                            <td className="text-center px-3 py-3 text-slate-700">1</td>
                            <td className="text-center px-3 py-3 text-slate-700">{Number(sale.workshopFee || sale.saleAmount || 0).toLocaleString()}/-Rs</td>
                            <td className="text-right px-4 py-3 text-slate-800"></td>
                          </tr>
                          
                          {/* Payment History Rows */}
                          {sale.paymentHistory && sale.paymentHistory.length > 0 ? (
                            sale.paymentHistory.map((payment, idx) => (
                              <tr key={idx} className="border-b border-slate-100">
                                <td className="px-4 py-2.5 text-slate-600 text-sm">
                                  Received on the date of- {new Date(payment.date).toLocaleDateString('en-IN')}
                                </td>
                                <td className="text-center px-3 py-2.5 text-slate-600"></td>
                                <td className="text-center px-3 py-2.5 text-slate-600">{Number(payment.amount).toLocaleString()}/-</td>
                                <td className="text-right px-4 py-2.5 text-slate-700">{Number(payment.amount).toLocaleString()}</td>
                              </tr>
                            ))
                          ) : (
                            <tr className="border-b border-slate-100">
                              <td className="px-4 py-2.5 text-slate-600 text-sm">
                                Received on the date of- {new Date(receipt?.issuedAt || sale.saleDate || sale.createdAt || Date.now()).toLocaleDateString('en-IN')}
                              </td>
                              <td className="text-center px-3 py-2.5 text-slate-600"></td>
                              <td className="text-center px-3 py-2.5 text-slate-600">{Number(sale.paidAmount || sale.saleAmount || 0).toLocaleString()}/-</td>
                              <td className="text-right px-4 py-2.5 text-slate-700">{Number(sale.paidAmount || sale.saleAmount || 0).toLocaleString()}</td>
                            </tr>
                          )}
                          
                          {/* Amount Receivable Row */}
                          <tr>
                            <td className="px-4 py-3 text-slate-700">
                              <span className="font-medium">Amount Receivable</span>
                              <span className="ml-4 text-slate-600">{Number(sale.dueAmount || 0).toLocaleString()}/-</span>
                            </td>
                            <td className="text-center px-3 py-3"></td>
                            <td className="text-center px-3 py-3"></td>
                            <td className="text-right px-4 py-3"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Payment Method & Totals Section */}
                    <div className="relative px-8 py-4 flex justify-between items-start">
                      {/* Left - Payment Method */}
                      <div className="pt-2">
                        <p className="text-lg font-bold text-slate-800">Payment Method :</p>
                        <p className="text-base text-slate-700 font-semibold mt-2">{receipt?.payment?.method || sale.paymentMode || 'UPI/Bank/Paypal'}</p>
                        {(sale.bankCode || sale.transactionId) && (
                          <>
                            <p className="text-sm text-slate-500 italic mt-1">Bank Code : {sale.bankCode || '****'}</p>
                            <p className="text-sm text-slate-500 italic">Account No : {sale.transactionId || '***-*****-**'}</p>
                          </>
                        )}
                      </div>
                      
                      {/* Right - Totals */}
                      <div className="w-56 border border-slate-200 rounded-lg overflow-hidden">
                        <div className="flex justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                          <span className="text-slate-600 text-sm">Sub-total :</span>
                          <span className="font-semibold text-sm">{Number(sale.workshopFee || sale.saleAmount || 0).toLocaleString()}/-</span>
                        </div>
                        <div className="flex justify-between px-4 py-2 border-b border-slate-200 bg-slate-50">
                          <span className="text-slate-600 text-sm">Tax :</span>
                          <span className="font-semibold text-sm">0</span>
                        </div>
                        <div className="flex justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-400 text-white">
                          <span className="font-bold">Total :</span>
                          <span className="font-black">Rs-{Number(sale.workshopFee || sale.saleAmount || 0).toLocaleString()}/</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer - Seal, Thank You, Signature */}
                    <div className="relative px-8 py-6 flex justify-between items-end mt-4">
                      {/* Left - Seal & Thank You */}
                      <div className="flex flex-col items-center">
                        {/* Circular Company Seal */}
                        <div className="w-28 h-28 rounded-full border-[5px] border-blue-700 flex flex-col items-center justify-center text-center bg-white relative">
                          <div className="absolute inset-2 rounded-full border-2 border-blue-600"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-[7px] text-blue-800 font-medium leading-tight">Upamnyu International</div>
                              <div className="text-[7px] text-blue-800 font-medium leading-tight">Education Pvt. Ltd.</div>
                              <div className="bg-red-100 px-2 py-0.5 rounded mt-0.5">
                                <div className="text-[8px] text-red-700 font-bold">CIN No.</div>
                                <div className="text-[7px] text-red-700 font-bold">U92400PN2022</div>
                                <div className="text-[7px] text-red-700 font-bold">PTC212555</div>
                              </div>
                              <div className="text-[7px] text-blue-800 mt-0.5">• Sangammer •</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Thank You Message */}
                        <div className="mt-6 text-center">
                          <p className="text-green-700 font-bold text-lg">&quot;Thank you!</p>
                          <p className="text-green-700 font-medium text-sm">Your registration &amp; payment</p>
                          <p className="text-green-700 font-medium text-sm">are confirmed&quot;</p>
                        </div>
                      </div>

                      {/* Right - Signature */}
                      <div className="text-center pr-8">
                        {/* Signature Image/Line */}
                        <div className="h-16 w-40 flex items-end justify-center mb-1">
                          <svg viewBox="0 0 160 50" className="w-full h-full">
                            <path 
                              d="M5,40 Q15,30 25,35 Q40,42 55,28 Q65,18 75,22 Q85,26 95,18 Q105,10 115,20 Q125,30 135,25 Q145,20 155,28" 
                              stroke="#1d4ed8" 
                              strokeWidth="1.5" 
                              fill="none"
                              strokeLinecap="round"
                            />
                            <text x="90" y="48" fontSize="10" fill="#1d4ed8" fontFamily="cursive" fontStyle="italic">Inj.</text>
                          </svg>
                        </div>
                        <p className="text-xl font-bold text-green-700">Mohan Kalburgi</p>
                        <p className="text-sm text-slate-500 italic">Yogacharya</p>
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
