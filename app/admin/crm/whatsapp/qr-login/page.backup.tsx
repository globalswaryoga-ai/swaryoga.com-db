'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCRM } from '@/hooks/useCRM';
import { LoadingSpinner, AlertBox } from '@/components/admin/crm';

type Step = 'initial' | 'loading' | 'qr-display' | 'scanning' | 'success' | 'error';

export default function QRLoginPage() {
  const router = useRouter();
  const token = useAuth();
  const crm = useCRM({ token });
  
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [step, setStep] = useState<Step>('initial');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [accountName, setAccountName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [provider, setProvider] = useState<string>('manual');
  const [expiresIn, setExpiresIn] = useState(900);
  const [countdown, setCountdown] = useState(900);

  useEffect(() => {
    if (token === null) {
      // Token is still loading, don't redirect yet
      return;
    }
    if (token === undefined || token === '') {
      // Token loading complete but empty, redirect
      setIsAuthed(false);
      router.push('/admin/login');
      return;
    }
    // Token exists
    setIsAuthed(true);
  }, [token, router]);

  // Countdown timer for QR expiry
  useEffect(() => {
    if (step !== 'qr-display') return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setStep('error');
          setError('QR code expired. Please generate a new one.');
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  const generateQR = async () => {
    if (!accountName.trim()) {
      setError('Please enter an account name');
      return;
    }

    setStep('loading');
    setError(null);

    try {
      const res = await crm.fetch('/api/admin/crm/whatsapp/qr-login/generate', {
        method: 'POST',
        body: {},
      });

      if (res.success) {
        setQrUrl(res.data.qrUrl);
        setSessionId(res.data.sessionId);
        setExpiresIn(res.data.expiresIn);
        setCountdown(res.data.expiresIn);
        setStep('qr-display');
        setSuccess('QR code generated! Scan with your WhatsApp number.');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    }
  };

  const verifyAndSubmit = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your WhatsApp phone number');
      return;
    }

    if (!sessionId) {
      setError('Session expired. Generate a new QR code.');
      return;
    }

    setStep('scanning');
    setError(null);

    try {
      const res = await crm.fetch('/api/admin/crm/whatsapp/qr-login/verify', {
        method: 'POST',
        body: {
          sessionId,
          phoneNumber,
          accountName: accountName || `WhatsApp - ${phoneNumber}`,
          provider,
        },
      });

      if (res.success) {
        setStep('success');
        setSuccess(`✅ ${res.data.message}`);
        setTimeout(() => {
          router.push('/admin/crm/whatsapp/settings');
        }, 3000);
      }
    } catch (err) {
      setStep('error');
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const resetFlow = () => {
    setStep('initial');
    setAccountName('');
    setPhoneNumber('');
    setProvider('manual');
    setQrUrl('');
    setSessionId('');
    setError(null);
    setSuccess(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E7F43] via-[#166235] to-[#0F4620] flex items-center justify-center p-4">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/admin/crm/whatsapp" className="text-white/70 hover:text-white text-sm mb-4 inline-block">
            ← Back to WhatsApp
          </Link>
          <div className="bg-white p-3 rounded-full w-fit mx-auto mb-4">
            <svg className="w-8 h-8 text-[#1E7F43]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.869 1.23c-.563.306-1.07.74-1.501 1.227-.906 1.031-1.528 2.487-1.528 4.11 0 .563.057 1.116.168 1.65l.164.79-1.738.46.46-1.738-.79-.165C1.057 14.935 1 14.38 1 13.816c0-2.016.733-3.87 1.942-5.283.458-.52 1.006-.973 1.596-1.322.826-.492 1.756-.78 2.752-.78h.004c.024 0 .048 0 .072 0a9.87 9.87 0 012.477.33l1.01.265-1.265-1.01a9.87 9.87 0 00-.33-2.477zm-5.421 7.403c-.298-.149-1.759-.867-2.031-.967-.272-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">WhatsApp QR Login</h1>
          <p className="text-white/80">Connect your WhatsApp number via QR code</p>
        </div>

        {/* Alerts */}
        {error && <AlertBox type="error" message={error} onClose={() => setError(null)} />}
        {success && <AlertBox type="success" message={success} onClose={() => setSuccess(null)} />}

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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Provider Type
                </label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
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
                className="w-full px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                🔲 Generate QR Code
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-semibold mb-2">📋 How it works:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li>✓ Enter account name</li>
                  <li>✓ Click "Generate QR Code"</li>
                  <li>✓ Scan with your WhatsApp</li>
                  <li>✓ Confirm to authenticate</li>
                </ul>
              </div>
            </>
          )}

          {/* LOADING STEP */}
          {step === 'loading' && (
            <div className="text-center py-12">
              <LoadingSpinner />
              <p className="text-gray-600 mt-4">Generating QR code...</p>
            </div>
          )}

          {/* QR DISPLAY STEP */}
          {step === 'qr-display' && (
            <>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600 mb-4">Scan this QR code with WhatsApp:</p>
                {qrUrl && (
                  <div className="flex justify-center mb-6">
                    <div className="bg-white border-4 border-[#1E7F43] p-4 rounded-lg">
                      <img src={qrUrl} alt="QR Code" width={300} height={300} className="w-72 h-72" />
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-900 font-semibold mb-2">⏱️ Expires in: {countdown}s</p>
                <p className="text-xs text-yellow-800">QR code will expire in 15 minutes</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Your WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g., +91 98765 43210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E7F43] focus:border-transparent"
                  />
                </div>

                <button
                  onClick={verifyAndSubmit}
                  className="w-full px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
                >
                  ✅ Confirm Authentication
                </button>

                <button
                  onClick={resetFlow}
                  className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  🔄 Generate New QR
                </button>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-900 font-semibold mb-2">✅ Next steps:</p>
                <ol className="text-xs text-green-800 space-y-1">
                  <li>1. Open WhatsApp on your phone</li>
                  <li>2. Go to Settings → Linked Devices</li>
                  <li>3. Tap "Link a device"</li>
                  <li>4. Point camera at QR code above</li>
                  <li>5. Enter phone number and confirm</li>
                </ol>
              </div>
            </>
          )}

          {/* SCANNING STEP */}
          {step === 'scanning' && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 bg-[#1E7F43] rounded-full opacity-20 animate-pulse"></div>
                  <div className="absolute inset-2 bg-[#1E7F43] rounded-full opacity-10 animate-pulse animation-delay-100"></div>
                  <div className="flex items-center justify-center h-full">
                    <svg className="w-8 h-8 text-[#1E7F43] animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-gray-600 mt-6 font-semibold">Verifying your WhatsApp number...</p>
              <p className="text-gray-500 text-sm mt-2">Please wait while we authenticate your account</p>
            </div>
          )}

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
              <h2 className="text-2xl font-bold text-green-700 mb-2">Authentication Successful!</h2>
              <p className="text-gray-600 mb-6">Your WhatsApp number has been connected.</p>
              <p className="text-sm text-gray-500">Redirecting to WhatsApp settings...</p>
            </div>
          )}

          {/* ERROR STEP */}
          {step === 'error' && (
            <>
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-red-700 mb-2">Authentication Failed</h2>
                <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>

                <button
                  onClick={resetFlow}
                  className="w-full px-6 py-3 bg-[#1E7F43] hover:bg-[#166235] text-white rounded-lg font-semibold transition-colors"
                >
                  🔄 Try Again
                </button>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-500">
            <p>Need help? <Link href="/admin/crm/whatsapp/settings" className="text-[#1E7F43] hover:underline font-semibold">Go to Settings</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
