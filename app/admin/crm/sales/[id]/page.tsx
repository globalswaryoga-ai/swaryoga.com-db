'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

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
  receiptNumber?: string;
  saleDate?: string;
  reportedByUserId?: string;
  leadId?: string | { _id: string; name?: string; phoneNumber?: string };
  status?: string;
  labels?: string[];
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

// Organiser details printed on every receipt.
const ORG = {
  brand: 'SWAR YOGA',
  legalName: 'Upamnyu International Education Pvt. Ltd.',
  cin: 'U92400PN2022PTC212555',
  address: 'Off No 04, Vedant Complex, Maldad Road, Sangamner - 422605, Maharashtra, India',
  phone: '+91 93099 86820',
  email: 'info@swaryoga.com',
  website: 'www.swaryoga.com',
  // Optional bank details — left blank until confirmed to avoid printing incorrect payment info.
  bankName: '',
  bankAccount: '',
  bankIFSC: '',
  upiId: '',
};

// Receipt branding assets (hosted on Bunny CDN).
const ASSETS = {
  photo: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
  logo: 'https://swaryogacrm.b-cdn.net/Symbol%20of%20infinity%20with%20a%20flame.png',
  signature: 'https://swaryogacrm.b-cdn.net/ChatGPT%20Image%20Aug%2021%2C%202025%20at%2004_08_28%20PM.png',
  seal: 'https://swaryogacrm.b-cdn.net/Blue%20Ink%20Stamp%20of%20Upamanyu%20Ltd..png',
};

const REFUND_POLICY = [
  'No cancellation and no refund once payment is made.',
  'The amount paid is non-transferable to any other person, program, or batch.',
];

const ACCENT_BORDER = '#d9a26a';
const ACCENT_TABLE = '#f39c12';
const ACCENT_GREEN = '#5baa2f';
const ACCENT_RED = '#d72e2e';

function formatDate(d?: string | Date) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(n?: number) {
  return `${Math.round(n || 0).toLocaleString('en-IN')}/-`;
}

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const id = params?.id as string;

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  // Render the receipt to a canvas and download it as an A4 PDF.
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('receipt-content');
      if (!element) return;

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const pageWidth = 210; // A4 mm
      const pageHeight = 297; // A4 mm
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const renderHeight = Math.min(imgHeight, pageHeight);
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, renderHeight);
      const invoiceNo = sale?.receiptNumber || (sale?._id || id || 'swaryoga').slice(-8).toUpperCase();
      pdf.save(`Receipt-${invoiceNo}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

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

  // Payment rows for the fee table — one per recorded payment, falling back to a single
  // "paid amount" row when no detailed history exists.
  const paymentRows = (sale.paymentHistory && sale.paymentHistory.length > 0)
    ? sale.paymentHistory
    : [{ amount: sale.paidAmount || sale.saleAmount || 0, date: sale.saleDate || sale.createdAt, mode: sale.paymentMode || '' }];

  const subtotal = paymentRows.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const grandTotal = sale.saleAmount || sale.workshopFee || subtotal;
  const dueAmount = sale.dueAmount ?? Math.max(0, grandTotal - subtotal);

  const hasBankDetails = ORG.bankName || ORG.bankAccount || ORG.bankIFSC || ORG.upiId;
  const receiptNumber = sale.receiptNumber || (sale._id || id || '').slice(-10).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-4 md:p-8 print:bg-white print:p-0">
      {/* A4 print sizing */}
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          .receipt-a4 { width: 210mm; min-height: 297mm; }
        }
      `}</style>

      <div className="max-w-3xl mx-auto print:max-w-none">
        {/* Back Button - Hidden on print */}
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-800 border border-white/20 hover:bg-gray-700 text-white transition-colors print:hidden"
        >
          ← Back to Sales
        </button>

        {/* Receipt Document */}
        <div
          id="receipt-content"
          className="receipt-a4 relative bg-white overflow-hidden mx-auto print:mx-auto"
          style={{ width: '210mm', minHeight: '297mm', padding: '14mm' }}
        >
          {/* Top wave decoration */}
          <svg className="absolute top-0 left-0 w-full h-36 pointer-events-none" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L1000,0 L1000,20 C800,30 500,110 0,150 Z" fill="#6bb82c" />
            <path d="M0,0 L1000,0 L1000,170 C800,165 500,70 0,30 Z" fill="#53825d" />
          </svg>
          {/* Bottom wave decoration */}
          <svg className="absolute bottom-0 left-0 w-full h-36 pointer-events-none rotate-180" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,0 L1000,0 L1000,20 C800,30 500,110 0,150 Z" fill="#6bb82c" />
            <path d="M0,0 L1000,0 L1000,170 C800,165 500,70 0,30 Z" fill="#53825d" />
          </svg>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-end justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={ASSETS.photo}
                  alt={ORG.brand}
                  crossOrigin="anonymous"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow"
                />
                <h1 className="text-4xl font-extrabold tracking-wide text-slate-900">{ORG.brand}</h1>
              </div>
              <div className="text-right flex-shrink-0">
                <img
                  src={ASSETS.logo}
                  alt="Swar Yoga Logo"
                  crossOrigin="anonymous"
                  className="w-20 h-20 rounded-full object-cover ml-auto mb-2"
                />
                <h2 className="text-5xl font-extrabold text-slate-900">INVOICE</h2>
                <p className="text-sm text-slate-500 mt-1">No: {receiptNumber}</p>
              </div>
            </div>

            {/* Divider */}
            <hr className="border-0 h-0.5 my-5" style={{ backgroundColor: ACCENT_BORDER }} />

            {/* Client & Date */}
            <div className="flex justify-between gap-8 mb-6">
              <div className="max-w-[55%]">
                <p className="text-xs text-slate-500 tracking-wider uppercase">Invoice To :</p>
                <p className="text-2xl font-bold mt-1" style={{ color: ACCENT_GREEN }}>{sale.customerName || 'Customer'}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">ID: {sale.customerId || id?.slice(-8)}</p>
                {sale.customerPhone && <p className="text-sm text-slate-600 mt-2">{sale.customerPhone}</p>}
                {sale.customerEmail && <p className="text-sm text-slate-600">{sale.customerEmail}</p>}
                {sale.customerAddress && <p className="text-sm text-slate-600">{sale.customerAddress}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-base text-slate-700">Date: {formatDate(sale.saleDate || sale.createdAt)}</p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-4">Total Amount</p>
                <p className="text-4xl font-extrabold mt-1" style={{ color: ACCENT_RED }}>RS. {formatAmount(grandTotal)}</p>
              </div>
            </div>

            {/* Fee Table */}
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: ACCENT_TABLE }}>
                  <th className="py-3 px-4 text-left text-sm font-bold text-slate-900">WORKSHOP</th>
                  <th className="py-3 px-4 text-center text-sm font-bold text-slate-900">PERSON</th>
                  <th className="py-3 px-4 text-center text-sm font-bold text-slate-900">FEES</th>
                  <th className="py-3 px-4 text-right text-sm font-bold text-slate-900">TOTAL</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm">
                <tr>
                  <td className="py-3 px-4 font-semibold" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{sale.workshopName || 'Workshop Enrollment'}</td>
                  <td className="py-3 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}>1</td>
                  <td className="py-3 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{formatAmount(sale.workshopFee || grandTotal)}</td>
                  <td className="py-3 px-4 text-right" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                </tr>
                {paymentRows.map((p, idx) => (
                  <tr key={idx}>
                    <td className="py-3 px-4 text-slate-500" style={{ border: `1px solid ${ACCENT_BORDER}` }}>Received on the date of- {formatDate(p.date)}{p.mode ? ` (${p.mode})` : ''}</td>
                    <td className="py-3 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                    <td className="py-3 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{formatAmount(p.amount)}</td>
                    <td className="py-3 px-4 text-right" style={{ border: `1px solid ${ACCENT_BORDER}` }}>{Math.round(p.amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {dueAmount > 0 && (
                  <tr>
                    <td className="py-3 px-4 font-semibold" style={{ border: `1px solid ${ACCENT_BORDER}` }}>Amount Receivable</td>
                    <td className="py-3 px-4 text-center" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                    <td className="py-3 px-4 text-center font-semibold" style={{ border: `1px solid ${ACCENT_BORDER}`, color: ACCENT_RED }}>{formatAmount(dueAmount)}</td>
                    <td className="py-3 px-4 text-right" style={{ border: `1px solid ${ACCENT_BORDER}` }}></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Payment Method & Summary */}
            <div className="flex justify-between items-start mt-6 gap-8">
              <div>
                <p className="font-bold text-lg text-slate-900">Payment Method :</p>
                <p className="text-base text-slate-700 mt-1 capitalize">{sale.paymentMode || 'N/A'}</p>
                {sale.transactionId && <p className="text-xs text-slate-500 font-mono mt-1">Txn ID: {sale.transactionId}</p>}
                {hasBankDetails && (
                  <p className="text-xs text-slate-500 mt-1">
                    {[ORG.bankName, ORG.bankAccount && `A/C ${ORG.bankAccount}`, ORG.bankIFSC && `IFSC ${ORG.bankIFSC}`, ORG.upiId && `UPI ${ORG.upiId}`]
                      .filter(Boolean)
                      .join(' • ')}
                  </p>
                )}
                <ul className="mt-3 text-[10px] text-slate-400 list-disc list-inside space-y-0.5 max-w-xs">
                  {REFUND_POLICY.map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="w-64 flex-shrink-0 text-sm">
                <div className="flex justify-between py-2 text-slate-700">
                  <span>Sub Total</span>
                  <span>{formatAmount(subtotal)}</span>
                </div>
                <div className="flex justify-between py-2 text-slate-700 border-t" style={{ borderColor: ACCENT_BORDER }}>
                  <span>Tax</span>
                  <span>0</span>
                </div>
                <div className="flex justify-between py-3 px-3 font-bold text-lg text-slate-900" style={{ backgroundColor: ACCENT_TABLE }}>
                  <span>Total</span>
                  <span>{formatAmount(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Seal & Signature */}
            <div className="flex items-end justify-between gap-6 mt-10">
              <div className="text-center">
                <img
                  src={ASSETS.seal}
                  alt="Company Seal"
                  crossOrigin="anonymous"
                  className="w-36 h-36 object-contain mx-auto"
                />
                <p className="font-bold text-lg text-slate-900 mt-2">&quot;Thank you!&quot;</p>
                <p className="text-sm text-slate-600">Your registration &amp; payment are confirmed</p>
              </div>
              <div className="text-center">
                <img
                  src={ASSETS.signature}
                  alt="Signature"
                  crossOrigin="anonymous"
                  className="h-44 mx-auto -mb-6 object-contain"
                />
                <p className="font-bold text-lg text-slate-900">Mohan Kalburgi</p>
                <p className="text-sm text-slate-500 italic">Yogacharya</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons - Hidden on print */}
        <div className="mt-6 flex justify-center gap-4 print:hidden">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors border border-emerald-500"
          >
            {downloading ? 'Generating…' : '⬇️ Download PDF'}
          </button>
          <button
            onClick={() => window.print()}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors border border-white/20"
          >
            🖨️ Print
          </button>
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-lg transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}
