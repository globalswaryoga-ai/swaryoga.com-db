'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { PageHeader, LoadingSpinner, AlertBox } from '@/components/admin/crm';

interface SaleRecord {
  _id: string;
  customerId?: string;
  customerName?: string;
  workshopName?: string;
  batchDate?: string;
  saleDate?: string;
  receiptNumber?: string;
  createdAt: string;
}

// Branding assets (hosted on Bunny CDN) — shared with the receipt page.
const ASSETS = {
  photo: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
  signature: 'https://swaryogacrm.b-cdn.net/ChatGPT%20Image%20Aug%2021%2C%202025%20at%2004_08_28%20PM.png',
  seal: 'https://swaryogacrm.b-cdn.net/Blue%20Ink%20Stamp%20of%20Upamanyu%20Ltd..png',
};

const TEAL = '#2c6975';
const GOLD = '#cda349';
const BROWN = '#6b4423';
const RUST = '#c0512f';

function formatMonthYear(d?: string | Date) {
  if (!d) return '—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

function initialsOf(name?: string) {
  const parts = (name || 'NA').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'NA';
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('');
}

// Decorative gold-and-teal diagonal corner banner.
function CornerBanner({ corner }: { corner: 'top-left' | 'bottom-right' }) {
  const isTopLeft = corner === 'top-left';
  return (
    <svg
      className={`absolute ${isTopLeft ? 'top-0 left-0' : 'bottom-0 right-0'} w-72 h-72 pointer-events-none`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {isTopLeft ? (
        <>
          <polygon points="0,0 78,0 0,58" fill={GOLD} />
          <polygon points="0,0 68,0 0,48" fill={TEAL} />
        </>
      ) : (
        <>
          <polygon points="100,100 22,100 100,42" fill={GOLD} />
          <polygon points="100,100 32,100 100,52" fill={TEAL} />
        </>
      )}
    </svg>
  );
}

// Decorative gold rosette / medal badge.
function RosetteBadge() {
  const lines = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * 360) / 16;
    const rad = (angle * Math.PI) / 180;
    const x1 = 45 + 32 * Math.cos(rad);
    const y1 = 45 + 32 * Math.sin(rad);
    const x2 = 45 + 46 * Math.cos(rad);
    const y2 = 45 + 46 * Math.sin(rad);
    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="7" strokeLinecap="round" />;
  });

  return (
    <svg width="110" height="150" viewBox="0 0 90 150" aria-hidden="true">
      {lines}
      <circle cx="45" cy="45" r="34" fill={GOLD} stroke="#a9842f" strokeWidth="2" />
      <circle cx="45" cy="45" r="22" fill="#fff8e1" stroke={GOLD} strokeWidth="2" />
      <polygon points="22,68 45,55 68,68 60,140 45,112 30,140" fill={GOLD} />
      <polygon points="30,70 45,60 60,70 55,125 45,108 35,125" fill="#e8c878" />
    </svg>
  );
}

export default function CertificatePage() {
  const router = useRouter();
  const params = useParams();
  const token = useAuth();
  const id = params?.id as string;

  const [sale, setSale] = useState<SaleRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('certificate-content');
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
      const certNo = sale?.receiptNumber || (sale?._id || id || 'swaryoga').slice(-8).toUpperCase();
      pdf.save(`Certificate-${certNo}.pdf`);
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
        <PageHeader title="Certificate" subtitle="Loading..." />
        <LoadingSpinner />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Certificate" subtitle="Sale not found" />
        <AlertBox type="error" message={error || 'Sale not found'} onClose={() => router.back()} />
      </div>
    );
  }

  const certNo = sale.receiptNumber || (sale._id || id || '').slice(-10).toUpperCase();
  const customerName = sale.customerName || 'Participant';
  const workshopName = sale.workshopName || 'Swar Yoga Workshop';
  const completionDate = formatMonthYear(sale.batchDate || sale.saleDate || sale.createdAt);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 p-4 md:p-8 print:bg-white print:p-0">
      {/* A4 print sizing + cursive font for the recipient name */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        .cert-script { font-family: 'Great Vibes', cursive; }
        @media print {
          @page { size: A4; margin: 0; }
          .certificate-a4 { width: 210mm; min-height: 297mm; }
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

        {/* Certificate Document */}
        <div
          id="certificate-content"
          className="certificate-a4 relative bg-white overflow-hidden mx-auto print:mx-auto"
          style={{ width: '210mm', minHeight: '297mm', padding: '16mm' }}
        >
          <CornerBanner corner="top-left" />
          <CornerBanner corner="bottom-right" />

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-6">
              <img
                src={ASSETS.photo}
                alt="Swar Yoga"
                crossOrigin="anonymous"
                className="w-24 h-24 rounded-full object-cover border-4 shadow"
                style={{ borderColor: '#5b9bd5' }}
              />
              <div className="text-center flex-1 pt-2">
                <h1 className="text-5xl font-extrabold" style={{ color: BROWN }}>Swar Yoga</h1>
                <p className="text-xl italic mt-1" style={{ color: RUST, fontFamily: 'Georgia, serif' }}>The Science Of Breath</p>
              </div>
              <div className="flex-shrink-0 mt-2">
                <RosetteBadge />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mt-4">
              <h2 className="text-6xl font-extrabold tracking-wide" style={{ color: TEAL }}>CERTIFICATE</h2>
              <p className="text-2xl mt-1 tracking-[0.3em]" style={{ color: '#1f2937' }}>OF PARTICIPATION</p>
            </div>

            {/* Participant Photo */}
            <div className="flex justify-center mt-8">
              <div
                className="w-48 h-56 flex items-center justify-center bg-gray-100"
                style={{ border: `6px solid #5b9bd5` }}
              >
                <span className="text-6xl font-bold text-gray-400">{initialsOf(customerName)}</span>
              </div>
            </div>

            {/* Presented To */}
            <div className="text-center mt-6">
              <p className="text-xl font-bold text-slate-900">This Certificate is Presented To :</p>
              <p className="cert-script text-7xl mt-2" style={{ color: TEAL }}>{customerName}</p>
            </div>

            {/* Body */}
            <p className="text-center text-lg text-slate-700 leading-relaxed mt-6 px-6">
              This is to proudly certify that <span className="font-bold">{customerName},</span> has successfully completed the Swar Yoga
              {' – '}<span className="font-bold">{workshopName}</span> organized by Upamnyu International Swar Yoga Education.
              With consistent enthusiasm, active involvement, and sincere dedication to learning and practicing Swar Yoga principles,
              the participant is hereby recognized with the Best Participation and Completion Certificate.{' '}
              <span className="font-bold">Date: {completionDate}</span>
            </p>

            {/* Reg No */}
            <p className="text-base text-slate-700 mt-8">Reg. No.: {certNo}</p>

            {/* Seal & Signature */}
            <div className="flex items-end justify-between gap-6 mt-6">
              <img
                src={ASSETS.seal}
                alt="Company Seal"
                crossOrigin="anonymous"
                className="w-32 h-32 object-contain"
              />
              <div className="text-center">
                <img
                  src={ASSETS.signature}
                  alt="Signature"
                  crossOrigin="anonymous"
                  className="h-32 mx-auto -mb-4 object-contain"
                />
                <p className="font-bold text-lg text-slate-900 border-t border-slate-400 pt-1 mt-1">MOHAN KALBURGI</p>
                <p className="text-sm text-slate-600">SWAR YOGA ACHARYA</p>
                <p className="text-xs text-slate-500">CEO &amp; Founder</p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Footer */}
            <p className="text-center text-base text-slate-700 mt-6">
              off: Maldad road Vedant complex Sangamner-422605. Mo-9309986820
            </p>
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
