'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { QRConnectionModal } from '@/components/admin/crm/QRConnectionModal';

type Step = 'initial' | 'loading' | 'success' | 'error';

export default function QRLoginPage() {
  const router = useRouter();
  const token = useAuth();
  
  // Auth state: null = loading, false = not authenticated, true = authenticated
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('initial');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [provider, setProvider] = useState<string>('manual');

  // Prefer the live WebSocket-based QR bridge flow.
  // This page is kept for backwards compatibility, but we can open the live modal here too.
  const [liveModalOpen, setLiveModalOpen] = useState(false);

  // Check authentication status
  useEffect(() => {
    if (token === null || token === undefined) {
      if (token === undefined) {
        // Token is done loading and empty
        setIsAuthed(false);
        router.push('/admin/login');
      }
      // If null, still loading
      return;
    }

    if (token && token.length > 0) {
      // Token exists
      setIsAuthed(true);
    } else {
      // Token is empty string after loading
      setIsAuthed(false);
      router.push('/admin/login');
    }
  }, [token, router]);

  // QR expiry is handled by the bridge itself; we keep the UI simple and rely on WS events.

  const generateQR = useCallback(async () => {
    if (!accountName.trim()) {
      setError('Please enter an account name');
      return;
    }

    // Default behavior: open the live WebSocket-based QR modal (no browser extension needed).
    // The QR image comes from the separate WhatsApp bridge WebSocket service.
    // We only fall back to the legacy REST flow if the WS modal can't connect / doesn't produce a QR.
    setError(null);
    setSuccess(null);
    setStep('loading');
    setLiveModalOpen(true);

    let fallbackTimer: number | null = window.setTimeout(() => {
      setLiveModalOpen(false);
      setStep('loading');
      setError('WhatsApp QR service not reachable (WebSocket).');
    }, 6000);

    if (!token) {
      setError('Authentication token missing. Please login again.');
      setIsAuthed(false);
      router.push('/admin/login');
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      return;
    }

    // NOTE: Legacy REST fallback endpoints are not deployed in production.
    // They were producing 405 errors and confusing the operator.
    // If the WS modal fails, we keep the error message and ask the operator to check bridge availability.
    // The modal itself shows QR when available.
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
  }, [accountName, provider, token, router]);

  // Legacy verify flow removed: the production integration uses the WebSocket QR bridge only.
  // After scanning the QR, the bridge becomes authenticated and settings/status pages reflect it.

  const resetFlow = useCallback(() => {
    setStep('initial');
    setError(null);
    setSuccess(null);
    setAccountName('');
    setProvider('manual');
  }, []);

  // Show loading spinner while auth is being checked
  if (isAuthed === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E7F43] via-[#166235] to-[#0F4620] flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
          <p className="text-white mt-4 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error if not authenticated
  if (isAuthed === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E7F43] via-[#166235] to-[#0F4620] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-red-700 mb-2">Not Authenticated</h2>
          <p className="text-gray-600 mb-6">Please login to access this feature.</p>
          <Link href="/admin/login" className="inline-block px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Render main content if authenticated
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E7F43] via-[#166235] to-[#0F4620] flex items-center justify-center p-4">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header with Better Option Notice */}
        <div className="text-center mb-8">
          <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-800 rounded-lg text-sm">
            <p className="font-semibold mb-2">💡 Better Way to Connect</p>
            <p className="mb-3">Use the <strong>WhatsApp page with built-in QR authentication</strong> for the best experience.</p>
            <Link href="/admin/crm/whatsapp" className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm transition-colors">
              Open WhatsApp Page
            </Link>
          </div>
          <Link href="/admin/crm/whatsapp" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to WhatsApp
          </Link>
          <div className="bg-white p-3 rounded-full w-fit mx-auto mb-4">
            <svg className="w-8 h-8 text-[#1E7F43]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">WhatsApp QR Login</h1>
          <p className="text-white/80">Connect your WhatsApp number via QR code</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-700 hover:text-red-900">✕</button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-700 hover:text-green-900">✕</button>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          {/* INITIAL STEP - Form */}
          {step === 'initial' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g., My WhatsApp Number"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Provider Type
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent outline-none"
                >
                  <option value="manual">📱 Manual (Your Number)</option>
                  <option value="twilio">📲 Twilio</option>
                  <option value="msg91">💬 MSG91</option>
                  <option value="vonage">📞 Vonage (Nexmo)</option>
                  <option value="aws">☁️ AWS SNS</option>
                </select>
              </div>

              <button
                onClick={generateQR}
                className="w-full px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
              >
                🔲 Generate QR Code
              </button>

              <button
                onClick={() => setLiveModalOpen(true)}
                className="w-full px-6 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-semibold transition-colors border border-emerald-200"
              >
                ⚡ Open Live QR (Recommended)
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Instructions:</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-2 space-y-1">
                  <li>• Enter a name for this WhatsApp account</li>
                  <li>• Select your provider type</li>
                  <li>• Click "Generate QR Code"</li>
                  <li>• Scan with your WhatsApp number</li>
                  <li>• Your account will be created automatically</li>
                </ul>
              </div>
            </>
          )}

          {/* LOADING STEP */}
          {step === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1E7F43] border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 font-semibold">Generating QR code...</p>
              <p className="text-sm text-gray-500 mt-2">This usually takes a few seconds.</p>
            </div>
          )}

          {/* Legacy QR display/verify steps removed (production uses WebSocket QR bridge). */}

          {/* SUCCESS STEP */}
          {step === 'success' && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">Success!</h2>
              <p className="text-gray-600 mb-4">Your WhatsApp account has been created.</p>
              <p className="text-sm text-gray-500">Redirecting to settings in 3 seconds...</p>
            </div>
          )}

          {/* ERROR STEP */}
          {step === 'error' && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">Something Went Wrong</h2>
              <p className="text-gray-600 mb-6">{error || 'An unexpected error occurred'}</p>
              <button
                onClick={resetFlow}
                className="w-full px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
              >
                🔄 Try Again
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
            <p>Need help? <Link href="/admin/crm/whatsapp/settings" className="text-[#1E7F43] hover:underline font-semibold">Go to Settings</Link></p>
          </div>
        </div>

        <QRConnectionModal
          isOpen={liveModalOpen}
          onClose={() => {
            setLiveModalOpen(false);
            // If modal closes without connecting (common when bridge is down), keep user on the fallback view.
            if (step === 'initial') setStep('loading');
          }}
          onConnected={() => {
            setSuccess('✅ WhatsApp connected successfully!');
            setTimeout(() => setSuccess(null), 2500);
          }}
        />
      </div>
    </div>
  );
}
