import React, { useEffect, useState } from 'react';

interface BridgeStatus {
  ok: boolean;
  bridgeUrl: string;
  reachable: boolean;
  endpoints: Record<string, { ok: boolean; status: number | null; message: string; timeMs: number }>;
  summary: string;
  timestamp: string;
  recommendations: string;
}

export default function QRWhatsAppHealthPage() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/admin/crm/whatsapp/bridge-health');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setStatus(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a8a] to-[#4f46e5] p-8 text-white font-sans">
      <h1 className="text-4xl font-bold mb-6 text-center">📱 QR‑WhatsApp Bridge Health</h1>

      {loading && <p className="text-center text-lg">Loading health check…</p>}

      {error && (
        <div className="bg-red-900/60 rounded-md p-4 text-center mx-auto max-w-xl">
          <p className="font-medium">Failed to load health data:</p>
          <p>{error}</p>
        </div>
      )}

      {status && (
        <section className="max-w-3xl mx-auto space-y-6">
          <div className="bg-gray-800/60 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-2">Bridge Overview</h2>
            <p>Bridge URL: <code className="bg-gray-700 rounded px-1 py-0.5">{status.bridgeUrl}</code></p>
            <p>Status: <span className={status.ok ? 'text-green-400' : 'text-red-400'}>{status.ok ? '✅ Working' : '❌ Unavailable'}</span></p>
            <p>Checked at: {new Date(status.timestamp).toLocaleString()}</p>
            <p className="mt-2 font-medium">{status.recommendations}</p>
          </div>

          <div className="bg-gray-800/60 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-2">Endpoint Details</h2>
            <ul className="space-y-2">
              {Object.entries(status.endpoints).map(([path, info]) => (
                <li key={path} className="flex justify-between items-center">
                  <span>{path}</span>
                  <span className={info.ok ? 'text-green-400' : 'text-red-400'}>{info.ok ? 'OK' : `Error (${info.status ?? '—'})`}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-800/60 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-semibold mb-2">🚫 Anti‑Ban Guidelines</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Never send bulk messages without explicit user consent.</li>
              <li>Respect WhatsApp rate limits – maximum 1 message per second per number.</li>
              <li>Vary message templates; avoid sending identical text repeatedly.</li>
              <li>Always include an easy opt‑out phrase, e.g., “Reply STOP to unsubscribe”.</li>
              <li>Stagger sending windows; avoid a large spike at the exact same minute.</li>
              <li>Monitor delivery & read receipts; pause if failure rate climbs above ~5%.</li>
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
