/**
 * Certificate Download Component
 * Used in investment dashboard and admin panels
 */

'use client';

import { useState } from 'react';
import { THEME_COLORS } from '@/lib/investment-constants';

interface CertificateDownloadProps {
  investmentId: string;
  certificateNumber?: string;
  status?: string;
  onDownload?: () => void;
}

export default function CertificateDownload({
  investmentId,
  certificateNumber,
  status,
  onDownload,
}: CertificateDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setError('');

    try {
      const response = await fetch(
        `/api/investment/${investmentId}/generate-certificate`
      );

      if (!response.ok) {
        throw new Error('Failed to generate certificate');
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Certificate_${certificateNumber || investmentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onDownload?.();
    } catch (err: any) {
      setError(err.message || 'Failed to download certificate');
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: THEME_COLORS.BLUE }}>
            📄 Certificate & Receipt
          </h3>
          <p className="text-sm text-gray-600">
            Download 2-in-1 investment certificate + payment receipt
          </p>
        </div>

        {status && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              status === 'ACTIVE'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {status}
          </span>
        )}
      </div>

      {certificateNumber && (
        <p className="text-sm text-gray-700 mb-4">
          <strong>Certificate No:</strong> {certificateNumber}
        </p>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {downloading ? '⏳ Generating...' : '📥 Download PDF'}
        </button>

        <button
          className="py-3 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
          title="Print certificate"
          onClick={() => window.print()}
        >
          🖨️ Print
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          <p className="text-sm">⚠️ {error}</p>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs text-blue-800">
          <strong>📋 What's Included:</strong> Complete investment details, payment receipt,
          KYC verification, admin signature, and company branding.
        </p>
      </div>
    </div>
  );
}
