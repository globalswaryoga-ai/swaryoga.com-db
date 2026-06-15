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
  certificatePhotoUrl?: string;
  certificatePhotoZoom?: number;
  certificatePhotoOffsetX?: number;
  certificatePhotoOffsetY?: number;
  certificateTitle?: string;
  certificateName?: string;
  certificateAddress?: string;
  certificateMobile?: string;
  certificatePlace?: string;
  certificateState?: string;
  certificateCountry?: string;
  createdAt: string;
}

// Branding assets (hosted on Bunny CDN) — shared with the receipt page.
const ASSETS = {
  photo: 'https://swaryogacrm.b-cdn.net/mohan.jpg',
  signature: 'https://swaryogacrm.b-cdn.net/ChatGPT%20Image%20Aug%2021%2C%202025%20at%2004_08_28%20PM.png',
  seal: 'https://swaryogacrm.b-cdn.net/Blue%20Ink%20Stamp%20of%20Upamanyu%20Ltd..png',
  goldBadge: 'https://swaryogacrm.b-cdn.net/certi.jpg',
};

const TEAL = '#2c6975';
const GOLD = '#cda349';
const BROWN = '#906126';
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
      className={`absolute ${isTopLeft ? 'top-0 left-0' : 'bottom-0 right-0'} w-96 h-96 pointer-events-none`}
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

// Participant photo frame with optional drag-to-reposition (edit mode only).
function ParticipantPhotoFrame({
  photoUrl,
  zoom,
  offsetX,
  offsetY,
  initials,
  editable,
  onDrag,
}: {
  photoUrl?: string;
  zoom: number;
  offsetX: number;
  offsetY: number;
  initials: string;
  editable: boolean;
  onDrag?: (newOffsetX: number, newOffsetY: number) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.MouseEvent) => {
    if (!editable || !onDrag) return;
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const baseX = offsetX;
    const baseY = offsetY;

    const handleMove = (ev: MouseEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      onDrag(baseX + dx, baseY + dy);
    };
    const handleUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  return (
    <div
      className="relative w-36 h-44 overflow-hidden bg-gray-100 select-none"
      style={{ border: '4px solid #5b9bd5', cursor: editable && photoUrl ? (dragging ? 'grabbing' : 'grab') : 'default' }}
      onMouseDown={handlePointerDown}
    >
      {photoUrl ? (
        <img
          src={photoUrl}
          alt="Participant"
          crossOrigin="anonymous"
          draggable={false}
          className="absolute top-1/2 left-1/2 w-full h-full object-cover"
          style={{ transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${zoom})` }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-4xl font-bold text-gray-400">{initials}</span>
        </div>
      )}
    </div>
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

  // Participant photo editor (admin-only: URL + zoom + position)
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(0);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Participant certificate details editor (admin-only: title, name, address, mobile, place, state, country)
  const [editingDetails, setEditingDetails] = useState(false);
  const [detailTitle, setDetailTitle] = useState('');
  const [detailName, setDetailName] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [detailMobile, setDetailMobile] = useState('');
  const [detailPlace, setDetailPlace] = useState('');
  const [detailState, setDetailState] = useState('');
  const [detailCountry, setDetailCountry] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

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
        let saleData: SaleRecord | null = null;
        if (data.data && Array.isArray(data.data) && data.data.length > 0) {
          saleData = data.data[0];
        } else if (data.data && !Array.isArray(data.data)) {
          saleData = data.data;
        } else {
          throw new Error('Sale not found');
        }
        setSale(saleData);
        setPhotoUrl(saleData?.certificatePhotoUrl || '');
        setPhotoZoom(saleData?.certificatePhotoZoom ?? 1);
        setPhotoOffsetX(saleData?.certificatePhotoOffsetX ?? 0);
        setPhotoOffsetY(saleData?.certificatePhotoOffsetY ?? 0);
        setDetailTitle(saleData?.certificateTitle || '');
        setDetailName(saleData?.certificateName || '');
        setDetailAddress(saleData?.certificateAddress || '');
        setDetailMobile(saleData?.certificateMobile || '');
        setDetailPlace(saleData?.certificatePlace || '');
        setDetailState(saleData?.certificateState || '');
        setDetailCountry(saleData?.certificateCountry || '');
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
      const canvasRatio = canvas.width / canvas.height;

      // Fit the canvas inside the A4 page without distorting its aspect ratio.
      let renderWidth = pageWidth;
      let renderHeight = pageWidth / canvasRatio;
      if (renderHeight > pageHeight) {
        renderHeight = pageHeight;
        renderWidth = pageHeight * canvasRatio;
      }
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, yOffset, renderWidth, renderHeight);
      const certNo = sale?.receiptNumber || (sale?._id || id || 'swaryoga').slice(-8).toUpperCase();
      pdf.save(`Certificate-${certNo}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const handleSavePhoto = async () => {
    if (!token || !sale) return;
    setSavingPhoto(true);
    setPhotoError(null);
    try {
      const response = await fetch('/api/admin/crm/sales', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId: sale._id,
          certificatePhotoUrl: photoUrl,
          certificatePhotoZoom: photoZoom,
          certificatePhotoOffsetX: photoOffsetX,
          certificatePhotoOffsetY: photoOffsetY,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to save photo');
      }

      setSale((prev) => prev ? {
        ...prev,
        certificatePhotoUrl: photoUrl,
        certificatePhotoZoom: photoZoom,
        certificatePhotoOffsetX: photoOffsetX,
        certificatePhotoOffsetY: photoOffsetY,
      } : prev);
      setEditingPhoto(false);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Failed to save photo');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleSaveDetails = async () => {
    if (!token || !sale) return;
    setSavingDetails(true);
    setDetailsError(null);
    try {
      const response = await fetch('/api/admin/crm/sales', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          saleId: sale._id,
          certificateTitle: detailTitle,
          certificateName: detailName,
          certificateAddress: detailAddress,
          certificateMobile: detailMobile,
          certificatePlace: detailPlace,
          certificateState: detailState,
          certificateCountry: detailCountry,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to save details');
      }

      setSale((prev) => prev ? {
        ...prev,
        certificateTitle: detailTitle || undefined,
        certificateName: detailName || undefined,
        certificateAddress: detailAddress || undefined,
        certificateMobile: detailMobile || undefined,
        certificatePlace: detailPlace || undefined,
        certificateState: detailState || undefined,
        certificateCountry: detailCountry || undefined,
      } : prev);
      setEditingDetails(false);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to save details');
    } finally {
      setSavingDetails(false);
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
  const customerName = sale.certificateName?.trim() || sale.customerName || 'Participant';
  const workshopName = sale.workshopName || 'Swar Yoga Workshop';
  const completionDate = formatMonthYear(sale.batchDate || sale.saleDate || sale.createdAt);
  const certTitle = sale.certificateTitle?.trim();
  const location = [sale.certificatePlace, sale.certificateState, sale.certificateCountry].filter((v) => v && v.trim()).join(', ');

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

          <div className="relative z-10 flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-6">
              <div className="w-52 flex-shrink-0 flex justify-start">
                <img
                  src={ASSETS.photo}
                  alt="Swar Yoga"
                  crossOrigin="anonymous"
                  className="w-32 h-32 rounded-full object-cover border-4 shadow"
                  style={{ borderColor: '#5b9bd5' }}
                />
              </div>
              <div className="text-center flex-1 min-w-0 self-center">
                <h1 className="text-7xl font-extrabold whitespace-nowrap" style={{ color: BROWN }}>Swar Yoga</h1>
                <p className="text-xl italic mt-1 whitespace-nowrap" style={{ color: RUST, fontFamily: 'Georgia, serif' }}>The Science Of Breath</p>
              </div>
              <div className="w-52 flex-shrink-0 flex justify-end">
                <img
                  src={ASSETS.goldBadge}
                  alt="Certificate Badge"
                  crossOrigin="anonymous"
                  className="w-52 h-auto object-contain"
                  style={{ marginRight: '-10mm' }}
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mt-1">
              <h2 className="text-6xl font-extrabold tracking-wide" style={{ color: TEAL }}>CERTIFICATE</h2>
              <p className="text-2xl mt-1 tracking-[0.3em]" style={{ color: '#1f2937' }}>OF PARTICIPATION</p>
            </div>

            {/* Participant Photo */}
            <div className="flex justify-center mt-6">
              <ParticipantPhotoFrame
                photoUrl={sale.certificatePhotoUrl}
                zoom={sale.certificatePhotoZoom ?? 1}
                offsetX={sale.certificatePhotoOffsetX ?? 0}
                offsetY={sale.certificatePhotoOffsetY ?? 0}
                initials={initialsOf(customerName)}
                editable={false}
              />
            </div>

            {/* Presented To */}
            <div className="text-center mt-5">
              <p className="text-xl font-bold text-slate-900">This Certificate is Presented To :</p>
              <p className="cert-script text-6xl mt-2" style={{ color: TEAL }}>
                {customerName}
              </p>
            </div>

            {/* Body */}
            <p className="text-center text-base text-slate-700 leading-relaxed mt-4 px-1">
              This is to proudly certify that{' '}
              <span className="font-bold">{certTitle ? `${certTitle}. ` : ''}{customerName}</span>
              {location ? <>, <span className="font-bold">{location}</span></> : ''},{' '}
              has successfully completed the Swar Yoga
              {' – '}<span className="font-bold">{workshopName}</span> organized by Upamnyu International Swar Yoga Education.
              With consistent enthusiasm, active involvement, and sincere dedication to learning and practicing Swar Yoga principles,
              the participant is hereby recognized with the Best Participation and Completion Certificate.{' '}
              <span className="font-bold">Date: {completionDate}</span>
            </p>

            {/* Reg No */}
            <p className="text-base text-slate-700 mt-4">Reg. No.: {certNo}</p>
            {sale.certificateAddress && (
              <p className="text-base text-slate-700 mt-1">Address: {sale.certificateAddress}</p>
            )}
            {sale.certificateMobile && (
              <p className="text-base text-slate-700 mt-1">Mobile: {sale.certificateMobile}</p>
            )}

            {/* Seal & Signature */}
            <div className="flex items-end justify-between gap-6 mt-4">
              <img
                src={ASSETS.seal}
                alt="Company Seal"
                crossOrigin="anonymous"
                className="w-48 h-48 object-contain"
              />
              <div className="text-center">
                <img
                  src={ASSETS.signature}
                  alt="Signature"
                  crossOrigin="anonymous"
                  className="h-48 mx-auto -mb-2 object-contain"
                />
                <p className="font-bold text-lg text-slate-900 border-t border-slate-400 pt-1 mt-1">MOHAN KALBURGI</p>
                <p className="text-sm text-slate-600">SWAR YOGA ACHARYA</p>
                <p className="text-xs text-slate-500">CEO &amp; Founder</p>
              </div>
            </div>

            {/* Footer */}
            <p className="text-center text-base text-slate-700 mt-4">
              off: Maldad road Vedant complex Sangamner-422605. Mo-9309986820
            </p>
          </div>
        </div>

        {/* Participant Photo Editor (admin only) - Hidden on print */}
        <div className="mt-6 bg-gray-900 border border-white/20 rounded-lg p-4 print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Participant Photo</h3>
            <button
              onClick={() => {
                if (editingPhoto) {
                  // Cancel - revert to last saved values
                  setPhotoUrl(sale.certificatePhotoUrl || '');
                  setPhotoZoom(sale.certificatePhotoZoom ?? 1);
                  setPhotoOffsetX(sale.certificatePhotoOffsetX ?? 0);
                  setPhotoOffsetY(sale.certificatePhotoOffsetY ?? 0);
                  setPhotoError(null);
                }
                setEditingPhoto(!editingPhoto);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {editingPhoto ? 'Cancel' : '✏️ Edit Photo'}
            </button>
          </div>

          {editingPhoto && (
            <div className="mt-4 flex flex-col md:flex-row gap-6 items-start">
              <ParticipantPhotoFrame
                photoUrl={photoUrl}
                zoom={photoZoom}
                offsetX={photoOffsetX}
                offsetY={photoOffsetY}
                initials={initialsOf(customerName)}
                editable
                onDrag={(nx, ny) => { setPhotoOffsetX(nx); setPhotoOffsetY(ny); }}
              />
              <div className="flex-1 w-full flex flex-col gap-4">
                <div>
                  <label className="block text-white text-sm mb-1 font-semibold">Photo URL</label>
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1 font-semibold">Zoom: {photoZoom.toFixed(2)}x</label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    value={photoZoom}
                    onChange={(e) => setPhotoZoom(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                <p className="text-xs text-white/50">Drag the photo above to move it left/right/up/down within the frame.</p>
                {photoError && <AlertBox type="error" message={photoError} onClose={() => setPhotoError(null)} />}
                <div className="flex gap-2">
                  <button
                    onClick={handleSavePhoto}
                    disabled={savingPhoto}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {savingPhoto ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setPhotoOffsetX(0); setPhotoOffsetY(0); setPhotoZoom(1); }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold rounded-lg transition-colors border border-white/20"
                  >
                    Reset Position
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Participant Details Editor (admin only) - Hidden on print */}
        <div className="mt-6 bg-gray-900 border border-white/20 rounded-lg p-4 print:hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Participant Details</h3>
            <button
              onClick={() => {
                if (editingDetails) {
                  // Cancel - revert to last saved values
                  setDetailTitle(sale.certificateTitle || '');
                  setDetailName(sale.certificateName || '');
                  setDetailAddress(sale.certificateAddress || '');
                  setDetailMobile(sale.certificateMobile || '');
                  setDetailPlace(sale.certificatePlace || '');
                  setDetailState(sale.certificateState || '');
                  setDetailCountry(sale.certificateCountry || '');
                  setDetailsError(null);
                }
                setEditingDetails(!editingDetails);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {editingDetails ? 'Cancel' : '✏️ Edit Details'}
            </button>
          </div>

          {editingDetails && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white text-sm mb-1 font-semibold">Title</label>
                  <select
                    value={detailTitle}
                    onChange={(e) => setDetailTitle(e.target.value)}
                    className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">—</option>
                    <option value="Mr">Mr</option>
                    <option value="Miss">Miss</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-white text-sm mb-1 font-semibold">Name (as on certificate)</label>
                  <input
                    type="text"
                    value={detailName}
                    onChange={(e) => setDetailName(e.target.value)}
                    placeholder={sale.customerName || 'Participant name'}
                    className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-white text-sm mb-1 font-semibold">Address</label>
                <input
                  type="text"
                  value={detailAddress}
                  onChange={(e) => setDetailAddress(e.target.value)}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-white text-sm mb-1 font-semibold">Mobile Number</label>
                <input
                  type="text"
                  value={detailMobile}
                  onChange={(e) => setDetailMobile(e.target.value)}
                  className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white text-sm mb-1 font-semibold">Place</label>
                  <input
                    type="text"
                    value={detailPlace}
                    onChange={(e) => setDetailPlace(e.target.value)}
                    className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1 font-semibold">State</label>
                  <input
                    type="text"
                    value={detailState}
                    onChange={(e) => setDetailState(e.target.value)}
                    className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-white text-sm mb-1 font-semibold">Country</label>
                  <input
                    type="text"
                    value={detailCountry}
                    onChange={(e) => setDetailCountry(e.target.value)}
                    className="w-full bg-black border border-white/30 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {detailsError && <AlertBox type="error" message={detailsError} onClose={() => setDetailsError(null)} />}

              <div>
                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {savingDetails ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
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
