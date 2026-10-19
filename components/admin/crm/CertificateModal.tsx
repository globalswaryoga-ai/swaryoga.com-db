'use client';

import React, { useState } from 'react';
import { X, Download, Printer, Share2, ExternalLink, Loader2, Award } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatPersonName } from '@/lib/formatName';

export interface CertificateSaleRecord {
  _id: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
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
  createdAt?: string | Date;
  [key: string]: any;
}

export interface CertificateModalProps {
  sale: CertificateSaleRecord | any;
  token?: string;
  onClose: () => void;
}

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

function CornerBanner({ corner }: { corner: 'top-left' | 'bottom-right' }) {
  const isTopLeft = corner === 'top-left';
  return (
    <svg
      className={`absolute ${isTopLeft ? 'top-0 left-0' : 'bottom-0 right-0'} w-44 h-44 sm:w-64 sm:h-64 pointer-events-none`}
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

export default function CertificateModal({ sale, token, onClose }: CertificateModalProps) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);

  const certNo = sale.receiptNumber || (sale._id || '').slice(-8).toUpperCase();
  const customerName = sale.certificateName?.trim() || formatPersonName(sale.customerName) || 'Participant';
  const workshopName = sale.workshopName || 'Swar Yoga Workshop';
  const completionDate = formatMonthYear(sale.batchDate || sale.saleDate || sale.createdAt);
  const certTitle = sale.certificateTitle?.trim();
  const location = [sale.certificatePlace, sale.certificateState, sale.certificateCountry].filter(Boolean).join(', ');

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById('cert-modal-render-node');
      if (!element) return;

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
      pdf.save(`Certificate-${customerName.replace(/[^a-zA-Z0-9]/g, '_')}-${certNo}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const phone = (sale.certificateMobile || sale.customerPhone || '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `🙏 Namaste ${customerName}!\n\nCongratulations on completing the ${workshopName}!\nYour Certificate of Participation (Reg No: ${certNo}) has been issued by Upamnyu International Swar Yoga Education.\n\nWishing you peaceful breathing and divine energy! ✨`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      {/* Cursive Google Font for recipient script */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
        .cert-script-modal { font-family: 'Great Vibes', cursive; }
      `}</style>

      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Certificate Preview
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                  {certNo}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {customerName} &bull; {workshopName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-xs flex items-center gap-1"
              title="Print Certificate"
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={handleWhatsAppShare}
              className="p-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 rounded-lg transition text-xs flex items-center gap-1"
              title="Share via WhatsApp"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => router.push(`/admin/crm/sales/${sale._id}/certificate`)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition text-xs flex items-center gap-1"
              title="Open Full Certificate Editor"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Certificate Visual Frame */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/60 flex items-center justify-center">
          <div
            id="cert-modal-render-node"
            className="relative bg-white text-slate-900 rounded-lg shadow-xl overflow-hidden w-full max-w-[700px] border border-amber-300/40"
            style={{
              padding: '24px 32px 30px',
              fontFamily: 'serif'
            }}
          >
            {/* Corner Decorative Triangles */}
            <CornerBanner corner="top-left" />
            <CornerBanner corner="bottom-right" />

            <div className="relative z-10 flex flex-col">
              {/* Header */}
              <div className="relative flex items-center justify-center min-h-[100px] pt-2">
                <img
                  src={ASSETS.photo}
                  alt="Swar Yoga"
                  crossOrigin="anonymous"
                  className="absolute left-0 top-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 shadow"
                  style={{ borderColor: '#5b9bd5' }}
                />
                <div className="text-center">
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-wide" style={{ color: BROWN }}>
                    Swar Yoga
                  </h1>
                  <p className="text-xs sm:text-sm italic mt-0.5 tracking-wider" style={{ color: RUST, fontFamily: 'Georgia, serif' }}>
                    The Science Of Breath
                  </p>
                </div>
                <img
                  src={ASSETS.goldBadge}
                  alt="Badge"
                  crossOrigin="anonymous"
                  className="absolute right-0 top-0 w-20 sm:w-28 h-auto object-contain"
                />
              </div>

              {/* Title */}
              <div className="text-center mt-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wider" style={{ color: TEAL }}>
                  CERTIFICATE
                </h2>
                <p className="text-xs sm:text-sm mt-0.5 tracking-[0.25em] font-semibold text-slate-700">
                  OF PARTICIPATION
                </p>
              </div>

              {/* Photo Frame if available */}
              {sale.certificatePhotoUrl && (
                <div className="flex justify-center mt-3">
                  <div
                    className="w-20 h-24 overflow-hidden bg-gray-100 rounded shadow"
                    style={{ border: '2px solid #5b9bd5' }}
                  >
                    <img
                      src={sale.certificatePhotoUrl}
                      alt={customerName}
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover"
                      style={{
                        transform: `scale(${sale.certificatePhotoZoom ?? 1}) translate(${sale.certificatePhotoOffsetX ?? 0}px, ${sale.certificatePhotoOffsetY ?? 0}px)`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Recipient */}
              <div className="text-center mt-3">
                <p className="text-xs sm:text-sm font-bold text-slate-700">This Certificate is Presented To :</p>
                <p className="cert-script-modal text-3xl sm:text-5xl mt-1 font-bold" style={{ color: TEAL }}>
                  {customerName}
                </p>
              </div>

              {/* Body */}
              <p className="text-center text-xs sm:text-sm text-slate-700 leading-relaxed mt-2.5 px-4 font-sans">
                This is to proudly certify that{' '}
                <span className="font-bold text-slate-900">{certTitle ? `${certTitle}. ` : ''}{customerName}</span>
                {location ? <>, <span className="font-semibold">{location}</span></> : ''},{' '}
                has successfully completed the Swar Yoga
                {' – '}<span className="font-bold text-slate-900">{workshopName}</span> organized by Upamnyu International Swar Yoga Education.
                With consistent enthusiasm, active involvement, and sincere dedication to learning and practicing Swar Yoga principles,
                the participant is hereby recognized with the Best Participation and Completion Certificate.{' '}
                <span className="font-bold">Date: {completionDate}</span>
              </p>

              {/* Meta */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 mt-3 px-4 font-sans">
                <span>Reg. No.: <strong className="text-slate-800 font-mono">{certNo}</strong></span>
                {sale.customerPhone && (
                  <span>Phone: <strong className="text-slate-800">{sale.customerPhone}</strong></span>
                )}
              </div>

              {/* Footer Stamp & Signature */}
              <div className="flex items-end justify-between gap-4 mt-3 pt-2 border-t border-slate-200">
                <img
                  src={ASSETS.seal}
                  alt="Company Seal"
                  crossOrigin="anonymous"
                  className="w-20 sm:w-24 h-20 sm:h-24 object-contain"
                />
                <div className="text-center">
                  <img
                    src={ASSETS.signature}
                    alt="Signature"
                    crossOrigin="anonymous"
                    className="h-14 sm:h-18 mx-auto -mb-1 object-contain"
                  />
                  <p className="font-bold text-xs text-slate-900 border-t border-slate-400 pt-0.5">
                    MOHAN KALBURGI
                  </p>
                  <p className="text-[10px] text-slate-600 tracking-wider">SWAR YOGA ACHARYA</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Need to adjust photo position or details? Use the Editor.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
