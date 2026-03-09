'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';

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
        {/* Modal Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📥</span>
            <h2 className="text-xl font-bold">QR WhatsApp PC Extension</h2>
          </div>
          <button onClick={() => setShowExtensionModal(false)} className="text-white hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All-in-One WhatsApp Business Automation</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Power up your WhatsApp management with a single Node.js script. Manage leads, labels, messaging, and automation—all from the command line.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-3">✨ Key Features</h4>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { title: 'Funnel Management', desc: 'Track leads through custom sales pipelines' },
                { title: 'Label System', desc: 'Multi-label contact organization' },
                { title: 'Batch Messaging', desc: 'Send to 10 people with smart delays' },
                { title: 'Category Management', desc: 'Organize contacts by department' },
                { title: 'Date Filtering', desc: 'View messages by time period' },
                { title: 'QR Code Scanning', desc: 'Easy PC WhatsApp connection' },
              ].map((f) => (
                <li key={f.title} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span><strong>{f.title}</strong> — {f.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
            <h4 className="font-semibold text-gray-900">🚀 Quick Setup (3 Steps)</h4>
            <ol className="space-y-2 text-sm text-gray-700">
              <li><strong>1. Download</strong> the script using the button below</li>
              <li><strong>2. Run</strong> <code className="bg-gray-100 px-2 py-1 rounded text-xs">node qr-whatsapp-pc-extension.js</code></li>
              <li><strong>3. Choose from 21 interactive menu options</strong></li>
            </ol>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">📋 Requirements</h4>
            <ul className="text-sm text-gray-700 space-y-1 ml-4">
              <li>• Node.js 14+ installed</li>
              <li>• WhatsApp Bridge running (port 3333)</li>
              <li>• MongoDB connection configured</li>
              <li>• <code className="bg-gray-100 px-1 rounded text-xs">.env.local</code> with credentials</li>
            </ul>
          </div>

          <div className="bg-gray-900 text-green-400 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <p className="mb-2"># Launch interactive menu</p>
            <p className="text-gray-300">$ node qr-whatsapp-pc-extension.js</p>
            <p className="mt-3 mb-2"># Or run specific commands</p>
            <p className="text-gray-300">$ node qr-whatsapp-pc-extension.js qr</p>
            <p className="text-gray-300">$ node qr-whatsapp-pc-extension.js funnel:list</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-semibold mb-2">📚 Full Documentation Available</p>
            <p>See <strong>QR_TOOL_COMPLETE_GUIDE.md</strong> or <strong>QR_WHATSAPP_PC_EXTENSION_GUIDE.md</strong> in your project root for detailed command reference.</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">v1.0 — Unified WhatsApp Business Automation</p>
          <div className="flex gap-3">
            <button onClick={() => setShowExtensionModal(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition">Cancel</button>
            <button
              onClick={handleDownloadInstaller}
              disabled={downloadingExtension}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {downloadingExtension ? (<><Loader2 className="w-4 h-4 animate-spin" /> Downloading...</>) : (<><span>📥</span> Download & Install</>)}
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
          <h2 className="text-2xl font-bold">✅ Almost Done!</h2>
          <p className="text-green-100 mt-1">Just 2 quick steps to run the extension</p>
        </div>
        <div className="p-6 space-y-6">
          <div>
            <h3 className="font-bold text-lg mb-3">Step 1: Open Terminal</h3>
            <p className="text-gray-700 mb-3">Open the Terminal app on your Mac</p>
            <div className="bg-indigo-50 border border-indigo-200 rounded p-3 text-sm text-indigo-900">
              Press: <code className="bg-indigo-100 px-2 py-1 rounded font-mono">Cmd + Space</code> then type &quot;Terminal&quot;
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Step 2: Run the Installer</h3>
            <p className="text-gray-700 mb-3">Copy & paste this command in Terminal:</p>
            <div className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono overflow-x-auto flex items-center justify-between group hover:bg-gray-800 cursor-pointer transition">
              <code>cd ~/Downloads && chmod +x install.sh && ./install.sh</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('cd ~/Downloads && chmod +x install.sh && ./install.sh');
                  alert('✅ Copied to clipboard!');
                }}
                className="opacity-0 group-hover:opacity-100 transition bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold flex-shrink-0 ml-2"
              >
                Copy
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">The installer will automatically check Node.js, install dependencies, and run everything!</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-900">
              <strong>✨ That&apos;s it!</strong> The installer handles everything for you. Just copy the command and press Enter.
            </p>
          </div>
        </div>
        <div className="bg-gray-100 border-t p-4 flex gap-3 justify-end">
          <button onClick={() => setShowInstallGuide(false)} className="px-4 py-2 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition">Close</button>
          <a href="https://nodejs.org" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition text-sm">
            Need Node.js?
          </a>
        </div>
      </div>
    </div>
  );
}
