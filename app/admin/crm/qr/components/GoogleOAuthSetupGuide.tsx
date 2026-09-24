'use client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';

interface GoogleOAuthSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onSetupComplete?: () => void;
}

export default function GoogleOAuthSetupGuide({
  isOpen,
  onClose,
  token,
  onSetupComplete,
}: GoogleOAuthSetupGuideProps) {
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const redirectUri = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/admin/crm/qr/auth/google-connect/callback`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConnectGoogle = async () => {
    if (!token) {
      alert('Not authenticated');
      return;
    }

    try {
      setConnecting(true);
      const response = await fetch('/api/admin/crm/qr/auth/google-connect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'get-auth-url' }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to connect Google Drive');
        return;
      }

      if (data.setupRequired) {
        alert('⚠️ Admin Setup Required:\n\n' + data.instruction);
        return;
      }

      // Redirect to Google OAuth
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Google connection error:', error);
      alert('Failed to connect Google Drive');
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b sticky top-0 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Connect Google Drive</h2>
            <p className="text-xs text-gray-500 mt-1">Step-by-step guide to enable WhatsApp backup</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step Indicator */}
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Step {s}
              </button>
            ))}
          </div>

          {/* Step 1: Create Google Cloud Project */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">1️⃣ Create Google Cloud Project</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li>
                    <span className="font-medium">Go to Google Cloud Console:</span>
                    <br />
                    <a
                      href="https://console.cloud.google.com/welcome"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      console.cloud.google.com
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </li>
                  <li className="mt-3">
                    <span className="font-medium">Click "Select a Project"</span> at the top
                  </li>
                  <li>
                    <span className="font-medium">Click "New Project"</span>
                  </li>
                  <li>
                    <span className="font-medium">Name:</span> "Swar Yoga WhatsApp Backup"
                  </li>
                  <li>
                    <span className="font-medium">Click "Create"</span> and wait (30 seconds)
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  After creating, you'll be automatically switched to the new project. If not, select it manually.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
              >
                Next: Enable APIs →
              </button>
            </div>
          )}

          {/* Step 2: Enable APIs */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">2️⃣ Enable Required APIs</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li>
                    <span className="font-medium">Search "Google Drive API"</span> in the search bar
                  </li>
                  <li>
                    <span className="font-medium">Click the result</span> → Click "Enable"
                  </li>
                  <li className="mt-3">
                    <span className="font-medium">Search "Google People API"</span>
                  </li>
                  <li>
                    <span className="font-medium">Click the result</span> → Click "Enable"
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Wait 30 seconds after enabling each API for the changes to apply.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition"
                >
                  Next: Create Credentials →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Create OAuth Credentials */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">3️⃣ Create OAuth 2.0 Credentials</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li>
                    <span className="font-medium">Go to "Credentials"</span> (left sidebar)
                  </li>
                  <li>
                    <span className="font-medium">Click "Create Credentials"</span> → "OAuth 2.0 Client IDs"
                  </li>
                  <li>
                    <span className="font-medium">Application Type:</span> "Web application"
                  </li>
                  <li>
                    <span className="font-medium">Name:</span> "Swar Yoga Backup"
                  </li>
                  <li className="mt-3">
                    <span className="font-medium">Authorized redirect URIs:</span>
                    <div className="mt-2 relative">
                      <input
                        type="text"
                        value={redirectUri}
                        readOnly
                        className="w-full px-3 py-2 text-xs bg-gray-100 border border-gray-300 rounded font-mono"
                      />
                      <button
                        onClick={() => handleCopy(redirectUri, 'redirect')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded transition"
                      >
                        {copied === 'redirect' ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </div>
                  </li>
                  <li className="mt-3">
                    <span className="font-medium">Click "Create"</span>
                  </li>
                  <li>
                    <span className="font-medium">Copy "Client ID"</span> and save it
                  </li>
                  <li>
                    <span className="font-medium">Click "Download JSON"</span> to get Client Secret
                  </li>
                </ol>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">📌 Next: Add to .env.local</h4>
                <p className="text-sm text-gray-700 mb-3">
                  Admin should add these to <code className="bg-gray-100 px-2 py-1 rounded text-xs">.env.local</code>:
                </p>
                <div className="space-y-2">
                  <div className="relative bg-gray-100 p-3 rounded font-mono text-xs">
                    <code>GOOGLE_CLIENT_ID=your_client_id_here</code>
                    <button
                      onClick={() => handleCopy('GOOGLE_CLIENT_ID=', 'client-id')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                    >
                      {copied === 'client-id' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-500" />
                      )}
                    </button>
                  </div>
                  <div className="relative bg-gray-100 p-3 rounded font-mono text-xs">
                    <code>GOOGLE_CLIENT_SECRET=your_client_secret_here</code>
                    <button
                      onClick={() => handleCopy('GOOGLE_CLIENT_SECRET=', 'client-secret')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                    >
                      {copied === 'client-secret' ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  ← Back
                </button>
                <button
                  onClick={handleConnectGoogle}
                  disabled={connecting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition flex items-center justify-center gap-2"
                >
                  {connecting ? '⏳ Connecting...' : '✅ Connect Google Drive'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
