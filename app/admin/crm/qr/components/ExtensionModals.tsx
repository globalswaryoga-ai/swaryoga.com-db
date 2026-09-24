'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface ExtensionModalProps {
  showExtensionModal: boolean;
  setShowExtensionModal: (v: boolean) => void;
  handleDownloadInstaller: () => void;
  downloadingExtension: boolean;
}

export function ExtensionModal({
  showExtensionModal,
  setShowExtensionModal,
  handleDownloadInstaller,
  downloadingExtension,
}: ExtensionModalProps) {
  if (!showExtensionModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧩</span>
            <h2 className="text-xl font-bold">Swar Yoga WhatsApp CRM — Browser Extension</h2>
          </div>
          <button onClick={() => setShowExtensionModal(false)} className="text-white hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">CRM sidebar on your own WhatsApp Web</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Install in Chrome and log into your own personal WhatsApp Web as normal — the extension adds a CRM
              sidebar directly on the real web.whatsapp.com page. No bridge, no QR scan through us, no ban risk —
              it&apos;s just the official WhatsApp Web interface with lead info, quick replies, and AI Fix/Reply added on top.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">✨ What it does</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: 'Lead Lookup', desc: 'See CRM status, notes, and lead number for the open chat' },
                { title: 'AI Fix', desc: 'One click grammar/spelling fix, Hindi/Hinglish aware' },
                { title: 'AI Reply', desc: 'Draft a contextual reply based on the customer\'s last message' },
                { title: 'Quick Replies', desc: 'Click to insert your saved canned messages' },
                { title: 'Per-user approval', desc: 'Admin approves each team member individually' },
                { title: 'Your own number', desc: 'Runs on your personal WhatsApp Web login, not a shared bridge' },
              ].map((f) => (
                <li key={f.title} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>{f.title}</strong> — {f.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-gray-900">🚀 Quick Setup</h4>
            <ol className="space-y-1.5 text-sm text-gray-700 list-decimal list-inside">
              <li><strong>Download</strong> the extension using the button below</li>
              <li><strong>Unzip</strong> it anywhere on your computer</li>
              <li>Open <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">chrome://extensions</code>, turn on <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and select the unzipped folder</li>
              <li>Click the extension icon and <strong>sign in</strong> with your CRM login</li>
              <li>Ask your admin to approve your account below, then open WhatsApp Web</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p>
              Not published on the Chrome Web Store — that requires a separate Google Developer account, payment, and
              review process. This is a direct, "sideloaded" install; each team member does the same 5 steps once.
            </p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">v1.0</p>
          <div className="flex gap-3">
            <button onClick={() => setShowExtensionModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button
              onClick={handleDownloadInstaller}
              disabled={downloadingExtension}
              className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {downloadingExtension ? (<><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</>) : (<><span>📥</span> Download Extension</>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InstallGuideModalProps {
  showInstallGuide: boolean;
  setShowInstallGuide: (v: boolean) => void;
}

export function InstallGuideModal({ showInstallGuide, setShowInstallGuide }: InstallGuideModalProps) {
  if (!showInstallGuide) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-xl w-full">
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6">
          <h2 className="text-2xl font-bold">✅ Downloaded!</h2>
          <p className="text-green-100 mt-1">A few quick steps to load it into Chrome</p>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <h3 className="font-bold text-lg mb-2">Step 1: Unzip the file</h3>
            <p className="text-gray-700 text-sm">Find <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">swar-yoga-whatsapp-extension.zip</code> in your Downloads and unzip it — this gives you a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">browser-extension</code> folder.</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">Step 2: Load it in Chrome</h3>
            <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-sm text-indigo-900 space-y-1">
              <p>1. Open <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono">chrome://extensions</code></p>
              <p>2. Turn on <strong>Developer mode</strong> (top-right toggle)</p>
              <p>3. Click <strong>Load unpacked</strong> and select the <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono">browser-extension</code> folder</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-2">Step 3: Sign in</h3>
            <p className="text-gray-700 text-sm">Click the extension icon in your Chrome toolbar and sign in with your CRM login. Once your admin approves your account, open WhatsApp Web and the CRM sidebar will appear.</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              <strong>Admin:</strong> approve each user in the &quot;Browser Extension Access&quot; list further down this Settings page.
            </p>
          </div>
        </div>
        <div className="bg-gray-100 border-t p-4 flex gap-3 justify-end">
          <button onClick={() => setShowInstallGuide(false)} className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition">Close</button>
        </div>
      </div>
    </div>
  );
}
