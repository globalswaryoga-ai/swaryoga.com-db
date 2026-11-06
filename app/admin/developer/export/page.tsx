'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Download,
  Lock,
  Terminal,
  Laptop,
  CheckCircle,
  Copy,
  ArrowLeft,
  ShieldCheck,
  Server,
  KeyRound,
  FileArchive,
  RefreshCw,
  GitBranch,
} from 'lucide-react';

export default function DeveloperExportPage() {
  const [password, setPassword] = useState('');
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('adminToken') ||
        sessionStorage.getItem('token') ||
        null;
      setActiveToken(token);
    }
  }, []);

  const handleCopy = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleDownload = (useToken = false, isEnvOnly = false) => {
    setErrorMsg(null);

    let url = '/api/admin/developer/download-project';
    const params = new URLSearchParams();

    if (isEnvOnly) {
      params.append('type', 'env');
    }

    if (useToken && activeToken) {
      params.append('token', activeToken);
    } else {
      if (!password.trim()) {
        setErrorMsg('Please enter your admin login password to proceed.');
        return;
      }
      params.append('password', password.trim());
    }

    url += `?${params.toString()}`;
    setIsDownloading(true);

    // Trigger direct browser download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', isEnvOnly ? 'Dell-Mohan-db-web-env.local' : 'Dell-Mohan-db-web.tar.gz');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 4000);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-4 sm:p-8 flex flex-col items-center selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <div className="w-full max-w-4xl flex items-center justify-between pb-6 border-b border-slate-800/80 mb-8">
        <Link
          href="/admin/crm"
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl hover:border-slate-700"
        >
          <ArrowLeft size={14} />
          <span>Back to Admin CRM</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400 font-bold">Contabo VPS Live</span>
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-8">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-[#0d1527] to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20 shrink-0">
              <Laptop size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Travel Laptop Codebase Export
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Full Project Integrity
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                Download the complete Swar Yoga full-stack codebase archive (`.tar.gz`) with all API routes, database connections, environment configs, and frontend components to continue coding seamlessly on your other laptop while traveling.
              </p>
            </div>
          </div>
        </div>

        {/* Security Password Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Super Admin Password Verification</h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Security Gate</span>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {activeToken && (
            <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <KeyRound size={16} className="text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-emerald-300">Active Admin Session Detected</p>
                  <p className="text-[11px] text-emerald-400/80">You are logged into Admin CRM on this browser.</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleDownload(true, true)}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50"
                  title="Download standalone .env.local configuration file"
                >
                  <KeyRound size={13} />
                  <span>Download .env.local</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload(true, false)}
                  disabled={isDownloading}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
                >
                  <Download size={14} />
                  <span>{isDownloading ? 'Downloading...' : '1-Click Full Project'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-1">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Lock size={13} className="text-amber-400" />
              <span>Or Enter Admin Login Password (same password used for CRM Login):</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                placeholder="Enter admin password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDownload(false, false);
                }}
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:border-amber-400 focus:outline-none transition shadow-inner font-mono"
              />
              <button
                type="button"
                onClick={() => handleDownload(false, true)}
                disabled={isDownloading}
                className="px-4 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95 disabled:opacity-50 shrink-0"
                title="Download standalone .env.local file"
              >
                <KeyRound size={14} />
                <span>Download .env.local</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(false, false)}
                disabled={isDownloading}
                className="px-6 py-3 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                <FileArchive size={15} />
                <span>{isDownloading ? 'Downloading...' : 'Download Full Project (.tar.gz)'}</span>
              </button>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <CheckCircle size={13} />
                <span>All .env and .env.local credentials are ALREADY bundled inside the full .tar.gz archive.</span>
              </p>
              <p>
                Direct API URLs:
                <br />
                • Full Codebase: <code className="text-amber-300">https://swaryoga.com/api/admin/developer/download-project?password=YOUR_PASSWORD</code>
                <br />
                • .env.local only: <code className="text-emerald-300">https://swaryoga.com/api/admin/developer/download-project?password=YOUR_PASSWORD&type=env</code>
              </p>
            </div>
          </div>
        </div>

        {/* Setup Instructions on New Laptop */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Terminal size={18} className="text-amber-400" />
            <h2 className="text-sm font-bold text-white">How to Run on Your Traveling Laptop (Step-by-Step)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center">1</span>
              <h3 className="text-xs font-bold text-white">Extract Archive</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Move the downloaded file to your desired coding folder and unpack it:
              </p>
              <pre className="p-2.5 rounded-lg bg-black text-[11px] font-mono text-amber-300 border border-slate-800 overflow-x-auto">
tar -xzf swaryoga-project-full-*.tar.gz
cd swaryoga
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center">2</span>
              <h3 className="text-xs font-bold text-white">Install & Run</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Install dependencies and launch your local development server:
              </p>
              <pre className="p-2.5 rounded-lg bg-black text-[11px] font-mono text-emerald-300 border border-slate-800 overflow-x-auto">
npm install
npm run dev
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center">3</span>
              <h3 className="text-xs font-bold text-white">Coding Live</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Open in your laptop browser:
              </p>
              <pre className="p-2.5 rounded-lg bg-black text-[11px] font-mono text-cyan-300 border border-slate-800 overflow-x-auto">
http://localhost:3000
http://localhost:3000/admin/crm
              </pre>
            </div>
          </div>

          {/* Deploying from laptop back to Contabo */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Server size={14} className="text-purple-400" />
                <span>Deploying Changes From Your Laptop to Live Contabo VPS:</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    `rsync -avz --exclude 'node_modules' --exclude '.git' --exclude '.next*' . root@169.58.238.255:/var/www/swaryoga/\nssh root@169.58.238.255 "/var/www/swaryoga/scripts/deploy-atomic.sh"`,
                    'deploy'
                  )
                }
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'deploy' ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSection === 'deploy' ? 'Copied!' : 'Copy Deploy Script'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-purple-300 overflow-x-auto leading-relaxed">
rsync -avz --exclude &apos;node_modules&apos; --exclude &apos;.git&apos; --exclude &apos;.next*&apos; . root@169.58.238.255:/var/www/swaryoga/
ssh root@169.58.238.255 &quot;/var/www/swaryoga/scripts/deploy-atomic.sh&quot;
            </pre>
          </div>

          {/* Git Clone Alternative */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <GitBranch size={14} className="text-blue-400" />
                <span>Alternative: Git Clone Directly from GitHub:</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(`git clone git@github.com:globalswaryoga-ai/swaryoga.com-db.git`, 'git')
                }
                className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                {copiedSection === 'git' ? <CheckCircle size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedSection === 'git' ? 'Copied!' : 'Copy Git Clone'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-blue-300 overflow-x-auto">
git clone git@github.com:globalswaryoga-ai/swaryoga.com-db.git
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

