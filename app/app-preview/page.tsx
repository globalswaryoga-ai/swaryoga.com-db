'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Smartphone, 
  RotateCw, 
  ExternalLink, 
  Wifi, 
  BatteryMedium, 
  Signal, 
  Maximize2, 
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Eye,
  CheckCircle2,
  Building2,
  Video,
  Flame,
  CreditCard,
  Share2
} from 'lucide-react';

export default function AppPreviewPage() {
  const [currentUrl, setCurrentUrl] = useState('/?app=true');
  const [deviceModel, setDeviceModel] = useState<'android' | 'iphone'>('android');
  const [scale, setScale] = useState(1);
  const [currentTime, setCurrentTime] = useState('12:45');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.src = `${currentUrl}&t=${Date.now()}`;
    }
  };

  const navigateTo = (path: string) => {
    const fullUrl = path.includes('?') ? `${path}&app=true` : `${path}?app=true`;
    setCurrentUrl(fullUrl);
    if (iframeRef.current) {
      iframeRef.current.src = fullUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white flex flex-col">
      {/* Top Controls Bar */}
      <header className="bg-black/40 backdrop-blur-md border-b border-white/10 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left Title */}
          <div className="flex items-center space-x-3">
            <Link 
              href="/" 
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/80 hover:text-white"
              title="Return to Website"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-swar-primary to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold leading-tight flex items-center gap-2">
                  <span>Swar Yoga Mobile App Simulator</span>
                  <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    LIVE PREVIEW
                  </span>
                </h1>
                <p className="text-[11px] text-white/60">Inspect mobile app status bar, buttons & layout on your PC</p>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center space-x-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => navigateTo('/')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentUrl.startsWith('/?') ? 'bg-swar-primary text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => navigateTo('/resort')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                currentUrl.startsWith('/resort') ? 'bg-swar-primary text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Resort</span>
            </button>
            <button
              onClick={() => navigateTo('/workshops')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentUrl.startsWith('/workshops') ? 'bg-swar-primary text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Workshops
            </button>
            <button
              onClick={() => navigateTo('/e-learning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentUrl.startsWith('/e-learning') ? 'bg-swar-primary text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              E-Learning
            </button>
            <button
              onClick={() => navigateTo('/community')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                currentUrl.startsWith('/community') ? 'bg-swar-primary text-white shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              Community
            </button>
          </div>

          {/* Device & View Actions */}
          <div className="flex items-center space-x-2">
            {/* Device Toggle */}
            <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                onClick={() => setDeviceModel('android')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  deviceModel === 'android' ? 'bg-emerald-600 text-white font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                Android
              </button>
              <button
                onClick={() => setDeviceModel('iphone')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  deviceModel === 'iphone' ? 'bg-emerald-600 text-white font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                iPhone
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={reloadIframe}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              title="Reload Simulator"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Open direct */}
            <a
              href="/?app=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-swar-primary to-emerald-600 hover:opacity-95 text-xs font-bold text-white shadow-md active:scale-95 transition-all"
              title="Open full page app view"
            >
              <span>Open App Mode</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Device Frame */}
        <div className="flex flex-col items-center">
          <div 
            className="relative transition-transform duration-300"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
          >
            {/* Smartphone Outer Shell */}
            <div 
              className={`relative bg-[#0d1117] rounded-[52px] p-3 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.15)] border-4 ${
                deviceModel === 'android' ? 'border-slate-700/80' : 'border-slate-800'
              }`}
              style={{ width: '400px', height: '820px' }}
            >
              {/* Screen Bezel Frame */}
              <div className="relative w-full h-full bg-black rounded-[42px] overflow-hidden flex flex-col">
                
                {/* Hardware Status Bar (Camera hole + Clock + Icons) */}
                <div className="bg-[#166235] text-white px-6 pt-3 pb-2 flex items-center justify-between text-xs select-none z-30 relative">
                  {/* Left: Clock */}
                  <div className="font-semibold text-xs tracking-tight flex items-center gap-1.5">
                    <span>{currentTime}</span>
                  </div>

                  {/* Center: Punch Hole Camera Lens */}
                  {deviceModel === 'android' ? (
                    <div className="w-4 h-4 rounded-full bg-black/90 border border-black flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900 border border-slate-700/40"></div>
                    </div>
                  ) : (
                    <div className="w-24 h-5 rounded-full bg-black flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-900/60"></div>
                    </div>
                  )}

                  {/* Right: Signal, Wifi, Battery */}
                  <div className="flex items-center space-x-1.5 text-white/90">
                    <Signal className="w-3.5 h-3.5" />
                    <Wifi className="w-3.5 h-3.5" />
                    <div className="flex items-center">
                      <BatteryMedium className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* WebView Container */}
                <div className="flex-1 w-full relative bg-white overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    src={currentUrl}
                    title="Swar Yoga Mobile App Preview"
                    className="w-full h-full border-none select-auto"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                    }}
                  />
                </div>

                {/* Android Navigation Bar / Home Gesture Pill */}
                <div className="bg-white py-2 flex items-center justify-center select-none border-t border-gray-100">
                  <div className="w-32 h-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>

              {/* Side Volume / Power buttons mockup */}
              <div className="absolute -left-4 top-28 w-1 h-12 bg-slate-700 rounded-l-md"></div>
              <div className="absolute -left-4 top-44 w-1 h-12 bg-slate-700 rounded-l-md"></div>
              <div className="absolute -right-4 top-36 w-1 h-16 bg-slate-700 rounded-r-md"></div>
            </div>
          </div>
        </div>

        {/* Info & Comparison Sidebar */}
        <div className="w-full max-w-md flex flex-col space-y-4">
          {/* Card 1: Live Status */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">Features Comparison</span>
              <span className="text-[11px] text-white/60">Verified Active</span>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="bg-black/30 rounded-2xl p-3 border border-white/5">
                <span className="font-bold text-emerald-300 block mb-1">📱 Mobile App Settings:</span>
                <ul className="space-y-1 text-white/80 list-disc list-inside text-[11px]">
                  <li>Upper status bar band is green (<code className="text-emerald-400">#166235</code>) for camera lens & notifications.</li>
                  <li>4 Quick Action pills visible (<span className="text-white font-semibold">Resort, Zoom, Sadhana, ₹ Pay</span>).</li>
                  <li>3-Line drawer contains Zoom Live Join, Sadhana, and all modules.</li>
                </ul>
              </div>

              <div className="bg-black/30 rounded-2xl p-3 border border-white/5">
                <span className="font-bold text-blue-300 block mb-1">💻 Website Settings:</span>
                <ul className="space-y-1 text-white/80 list-disc list-inside text-[11px]">
                  <li>Clean white header strip (No green camera band).</li>
                  <li>Navbar items: <span className="text-white font-semibold">Home, About, Workshops, E-Learning, Resort, Community, Contact</span>.</li>
                  <li>Cart icon & <span className="text-red-400 font-bold">Sign In in Red</span> on the right.</li>
                  <li>Zero duplicate pills crowding the desktop bar.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Testing Checklist */}
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-3xl p-5 shadow-xl">
            <h3 className="text-xs uppercase font-bold text-amber-300 tracking-wider mb-3">
              Try In The Simulator:
            </h3>
            <div className="space-y-2.5 text-xs text-white/80">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Tap <strong className="text-white">Zoom</strong> to test the meeting ID auto-fill popup.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Tap <strong className="text-white">Sadhana</strong> to check daily schedule timings & code prompt.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Tap the green <strong className="text-white">☰ Menu</strong> to see the slide-out navigation.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Tap <strong className="text-white">Resort</strong> to view the retreat accommodations.</span>
              </div>
            </div>
          </div>

          {/* Card 3: Direct Link */}
          <div className="bg-gradient-to-r from-swar-primary/30 to-emerald-800/30 border border-emerald-500/30 rounded-3xl p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Test on Your Actual Phone</span>
              <span className="text-[11px] text-emerald-200/80">Open swaryoga.com/?app=true in phone browser</span>
            </div>
            <a
              href="/?app=true"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Open directly"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
