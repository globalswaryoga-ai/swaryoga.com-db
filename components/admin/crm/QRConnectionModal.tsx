'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

interface QRConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

type ConnectionMode = 'qr' | 'api';

export function QRConnectionModal({ isOpen, onClose, onConnected }: QRConnectionModalProps) {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('qr');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'authenticated' | 'error' | 'resetting'>('idle');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [message, setMessage] = useState('Connecting to WhatsApp Web...');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [qrAttempt, setQrAttempt] = useState(0);
  const [maxQrAttempts] = useState(5);
  const wsRef = useRef<WebSocket | null>(null);

  const resolveBridgeWsUrl = useCallback((): string | null => {
    const envWsUrl = (process.env.NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL || '').trim();
    if (!envWsUrl) return null;

    // Guard against placeholder values like ws://localhost:YOUR_PORT
    if (envWsUrl.includes('YOUR_PORT')) return null;

    // Basic validation: must be ws:// or wss:// and parseable.
    try {
      const parsed = new URL(envWsUrl);
      if (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') return null;
    } catch {
      return null;
    }

    return envWsUrl;
  }, []);

  const resolveBridgeWsUrlWithDevFallback = useCallback((): string | null => {
    const explicit = resolveBridgeWsUrl();
    if (explicit) return explicit;

    // In local development, default to the standard bridge port.
    // This helps the common "QR not shown" case when env isn't set.
    if (process.env.NODE_ENV !== 'production') {
      return 'ws://127.0.0.1:3333';
    }

    return null;
  }, [resolveBridgeWsUrl]);

  const connectQRMode = useCallback(() => {
    setStatus('connecting');
    setMessage('Initializing WhatsApp Web connection...');
    
    try {
      // IMPORTANT:
      // - The WhatsApp Web bridge (qrServer.js) is a separate Node service.
      // - It should NOT be exposed on your production domain (security + infra).
      // - In development, we default to localhost.
      // - In production, you *must* explicitly set NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL.
      const wsUrl = resolveBridgeWsUrlWithDevFallback();
      if (!wsUrl) {
        setStatus('idle');
        setErrorMsg(
          'WhatsApp Web QR requires the separate bridge service (qrServer.js). Set NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL to a valid ws:// or wss:// URL (example: ws://localhost:3333).'
        );
        setMessage('Bridge not configured. Enter the bridge URL in env and click Connect.');
        return;
      }
      
      console.log('🔌 Connecting to WebSocket at:', wsUrl);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('✅ WebSocket connected, waiting for QR code...');
        setMessage('Waiting for QR code... (this may take 10-30 seconds)');

        // Trigger QR generation / client initialization on the bridge.
        // The bridge only starts the WhatsApp client after receiving an init request.
        try {
          ws.send(JSON.stringify({ type: 'init' }));
        } catch (e) {
          console.warn('⚠️ Failed to send init message to WhatsApp bridge:', e);
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          switch (msg.type) {
            case 'qr':
              console.log('✅ QR received:', msg.data ? 'Valid QR image' : 'Invalid QR');
              setQrCode(msg.data);
              setQrAttempt(0);
              setStatus('connecting');
              setMessage('Scan this QR code with your WhatsApp mobile phone to authenticate');
              setErrorMsg(null);
              break;

            case 'authenticated':
              console.log('✅ WhatsApp authenticated!');
              setStatus('authenticated');
              setMessage('WhatsApp Web successfully authenticated!');
              setQrCode(null);
              if (onConnected) {
                setTimeout(() => {
                  onConnected();
                  onClose();
                }, 1500);
              }
              break;

            case 'error':
              console.error('❌ WhatsApp error:', msg.error);
              setStatus('error');
              setErrorMsg(msg.error);
              setQrAttempt(prev => prev + 1);
              if (msg.action === 'reconnect') {
                setMessage(`QR generation failed. Retrying... (Attempt ${qrAttempt + 1}/${maxQrAttempts})`);
              }
              break;

            case 'warning':
              console.warn('⚠️ Warning:', msg.message);
              setErrorMsg(msg.message);
              break;

            default:
              console.log('📬 Message:', msg);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setStatus('error');
        setErrorMsg('Failed to connect to WhatsApp bridge service. Verify NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL and that the bridge is running.');
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        if (status !== 'authenticated') {
          setStatus('error');
          setErrorMsg('Connection lost. Please try again.');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('❌ WebSocket error:', err);
      setStatus('error');
      setErrorMsg('Failed to initialize WhatsApp connection');
    }
  }, [status, onConnected, onClose, qrAttempt, maxQrAttempts, resolveBridgeWsUrlWithDevFallback]);

  useEffect(() => {
    if (!isOpen) {
      // Clean up WebSocket on close
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    // Reset state when opened
    setStatus('idle');
    setErrorMsg(null);
    setQrCode(null);
    setQrAttempt(0);
    setConnectionMode('qr');
    setMessage('Connecting to WhatsApp Web...');

    // Do not auto-connect. This prevents noisy reconnect loops when the bridge isn't configured.
  }, [isOpen]);

  const handleResetSession = async () => {
    setStatus('resetting');
    setMessage('Clearing WhatsApp session...');
    
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/admin/whatsapp/reset-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reset session');
      }

      const data = await response.json();
      console.log('✅ Session reset successful:', data);
      
      setMessage('Session cleared successfully. Reconnecting...');
      setQrAttempt(0);
      
      // Reconnect WebSocket after delay
      setTimeout(() => {
        if (wsRef.current) {
          wsRef.current.close();
        }
        connectQRMode();
      }, 2000);
    } catch (err) {
      console.error('❌ Session reset error:', err);
      setStatus('error');
      setErrorMsg(`Failed to reset session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleConnectAPI = async () => {
    if (!whatsappToken.trim() || !phoneNumberId.trim()) {
      setErrorMsg('Please enter both WhatsApp Token and Phone Number ID');
      return;
    }

    setStatus('connecting');
    setMessage('Verifying WhatsApp Business API credentials...');

    try {
      // Test connection to Meta WhatsApp Business API
      const response = await fetch(`https://graph.whatsapp.com/v18.0/${phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid WhatsApp token - check your access token');
        } else if (response.status === 404) {
          throw new Error('Invalid Phone Number ID - check your phone number ID');
        } else {
          const errorData = await response.json();
          throw new Error(errorData?.error?.message || 'WhatsApp API error');
        }
      }

      const data = await response.json();
      console.log('✅ WhatsApp API authenticated:', data);

      setStatus('authenticated');
      setMessage('WhatsApp Business API connected successfully!');
      setErrorMsg(null);
      
      // Store credentials
      localStorage.setItem('whatsapp_token', whatsappToken);
      localStorage.setItem('whatsapp_phone_number_id', phoneNumberId);

      if (onConnected) {
        setTimeout(() => {
          onConnected();
          onClose();
        }, 1500);
      }
    } catch (err) {
      console.error('❌ WhatsApp API error:', err);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to connect WhatsApp API');
    }
  };

  const handleDisconnect = () => {
    localStorage.removeItem('whatsapp_token');
    localStorage.removeItem('whatsapp_phone_number_id');
    setStatus('idle');
    setQrCode(null);
    setWhatsappToken('');
    setPhoneNumberId('');
    setMessage('Disconnected. Enter new credentials to reconnect.');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Connection Mode Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => {
              setConnectionMode('qr');
            }}
            className={`px-4 py-2 font-semibold transition-colors ${
              connectionMode === 'qr'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📱 WhatsApp Web QR
          </button>
          <button
            onClick={() => setConnectionMode('api')}
            className={`px-4 py-2 font-semibold transition-colors ${
              connectionMode === 'api'
                ? 'text-green-600 border-b-2 border-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💼 Business API
          </button>
        </div>

        {/* QR Mode */}
        {connectionMode === 'qr' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">📱</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">WhatsApp Web QR Login</h2>
                <p className="text-sm text-gray-600">Scan with your phone to authenticate</p>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status === 'authenticated'
                      ? 'bg-green-500'
                      : status === 'connecting'
                        ? 'bg-yellow-500 animate-pulse'
                        : status === 'error'
                          ? 'bg-red-500'
                          : status === 'resetting'
                            ? 'bg-blue-500 animate-pulse'
                            : 'bg-gray-400'
                  }`}
                ></div>
                <span className="font-semibold text-gray-900 capitalize">
                  {status === 'resetting' ? 'Resetting...' : status}
                </span>
              </div>
              <p className="text-sm text-gray-600">{message}</p>
              {qrAttempt > 0 && qrAttempt < maxQrAttempts && (
                <p className="text-xs text-amber-600 mt-2">
                  Attempt {qrAttempt}/{maxQrAttempts}
                </p>
              )}
            </div>

            {/* QR Code Display */}
            {qrCode && (
              <div className="mb-6 p-4 rounded-lg bg-white border-2 border-green-300 flex justify-center">
                <div>
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 rounded-lg" />
                  <p className="text-xs text-gray-600 text-center mt-3">
                    Open WhatsApp on your phone → Linked Devices → Link a Device
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700 mb-3">
                  <strong>⚠️ Error:</strong> {errorMsg}
                </p>
                {qrAttempt >= maxQrAttempts ? (
                  <p className="text-xs text-red-600 mb-3">
                    Max retry attempts reached. Try resetting the session.
                  </p>
                ) : (
                  <p className="text-xs text-red-600 mb-3">
                    Click Connect to retry.
                  </p>
                )}
              </div>
            )}

            {/* Instructions */}
            {!qrCode && status === 'connecting' && (
              <div className="mb-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700 font-semibold mb-2">⏳ Initializing...</p>
                <p className="text-xs text-blue-700">
                  The system is starting up WhatsApp Web and generating a QR code. This typically takes 10-30 seconds on first run.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={connectQRMode}
                disabled={status === 'connecting' || status === 'resetting'}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  status === 'connecting' || status === 'resetting'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {status === 'connecting' ? '⏳ Connecting...' : '🔌 Connect'}
              </button>
              {(status === 'error' || errorMsg) && (
                <button
                  type="button"
                  onClick={handleResetSession}
                  disabled={status === 'resetting'}
                  className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                    status === 'resetting'
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {status === 'resetting' ? '🔄 Resetting...' : '🔄 Reset Session'}
                </button>
              )}
            </div>

            {/* Info */}
            <div className="mt-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-700">
                <strong>ℹ️ Note:</strong> QR login requires the separate WhatsApp Web bridge (qrServer.js). For most setups, Meta Business API is recommended.
              </p>
            </div>
          </>
        )}

        {/* API Mode */}
        {connectionMode === 'api' && (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">💼</div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Business API</h2>
                <p className="text-sm text-gray-600">Meta WhatsApp Business API</p>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    status === 'authenticated'
                      ? 'bg-green-500'
                      : status === 'connecting'
                        ? 'bg-yellow-500 animate-pulse'
                        : status === 'error'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                  }`}
                ></div>
                <span className="font-semibold text-gray-900 capitalize">{status}</span>
              </div>
              <p className="text-sm text-gray-600">
                {status === 'authenticated'
                  ? 'WhatsApp Business API is connected'
                  : 'Enter your WhatsApp Business API credentials'}
              </p>
            </div>

            {/* API Credentials Form */}
            {status !== 'authenticated' && (
              <div className="mb-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    WhatsApp Business Token
                  </label>
                  <input
                    type="password"
                    placeholder="EAABxxxxxxxxxxxxxxx"
                    value={whatsappToken}
                    onChange={(e) => setWhatsappToken(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get from Meta App Dashboard → Settings → User Access Tokens
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Phone Number ID
                  </label>
                  <input
                    type="text"
                    placeholder="1234567890123456"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Found in WhatsApp Business Account settings
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">
                  <strong>⚠️ Error:</strong> {errorMsg}
                </p>
              </div>
            )}

            {/* Status Message for Authenticated */}
            {status === 'authenticated' && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-700">
                  ✅ <strong>Success!</strong> WhatsApp Business API is now connected.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {status !== 'authenticated' ? (
                <>
                  <button
                    type="button"
                    onClick={handleConnectAPI}
                    disabled={status === 'connecting' || !whatsappToken.trim() || !phoneNumberId.trim()}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-colors ${
                      status === 'connecting' || !whatsappToken.trim() || !phoneNumberId.trim()
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {status === 'connecting' ? '⏳ Connecting...' : '✓ Connect'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    ✅ Done
                  </button>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="flex-1 px-4 py-3 rounded-lg font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    Disconnect
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
