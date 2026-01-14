'use client';

/**
 * @fileoverview Static PayU Payment Button Component
 * 
 * Uses direct PayU payment links for specific workshops
 * Format: Static button that redirects directly to PayU form
 * 
 * Features:
 * - Direct link to PayU (no API call needed)
 * - Pre-generated payment form
 * - One-click payment
 * - Works across all devices
 * - No authentication required
 */

interface PayUStaticButtonProps {
  workshopName: string;
  payuLink: string;
  mode?: string; // online, offline, residential, recorded
  language?: string; // english, hindi, marathi, nepali
  className?: string;
  buttonText?: string;
}

export default function PayUStaticButton({
  workshopName,
  payuLink,
  mode = 'online',
  language = 'english',
  className = '',
  buttonText = 'Pay Now',
}: PayUStaticButtonProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <a
        href={payuLink}
        style={{
          width: '200px',
          backgroundColor: '#1CA953',
          textAlign: 'center',
          fontWeight: '800',
          padding: '11px 0px',
          color: 'white',
          fontSize: '12px',
          display: 'inline-block',
          textDecoration: 'none',
          borderRadius: '3.229px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.backgroundColor = '#158c41';
          (e.target as HTMLElement).style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.backgroundColor = '#1CA953';
          (e.target as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
        }}
      >
        {buttonText}
      </a>
    </div>
  );
}
