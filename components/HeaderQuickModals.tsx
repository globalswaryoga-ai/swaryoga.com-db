'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  X, 
  Video, 
  Flame, 
  CreditCard, 
  CheckCircle2, 
  ExternalLink, 
  KeyRound, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock
} from 'lucide-react';

interface ZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZoomJoinModal({ isOpen, onClose }: ZoomModalProps) {
  const [meetingId, setMeetingId] = useState('');
  const [passcode, setPasscode] = useState('');
  const [enrolledInfo, setEnrolledInfo] = useState<{ workshopName?: string; meetingId?: string; passcode?: string } | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Try to load saved last Zoom credentials
    const savedId = localStorage.getItem('swar_zoom_meeting_id') || '';
    const savedPwd = localStorage.getItem('swar_zoom_passcode') || '';
    if (savedId) setMeetingId(savedId);
    if (savedPwd) setPasscode(savedPwd);

    // 2. Check if logged in user has enrolled workshop details
    try {
      const storedUser = localStorage.getItem('user');
      const storedWorkshop = localStorage.getItem('swar_enrolled_workshop');
      if (storedWorkshop) {
        const parsed = JSON.parse(storedWorkshop);
        if (parsed.meetingId) {
          setEnrolledInfo(parsed);
          setMeetingId(parsed.meetingId);
          if (parsed.passcode) setPasscode(parsed.passcode);
          setAutoFilled(true);
        }
      } else if (storedUser) {
        // Probe user profile to find recent workshop if possible
        const userObj = JSON.parse(storedUser);
        if (userObj.workshopZoomMeetingId) {
          const info = {
            workshopName: userObj.workshopName || 'Enrolled Swar Yoga Workshop',
            meetingId: userObj.workshopZoomMeetingId,
            passcode: userObj.workshopZoomPasscode || ''
          };
          setEnrolledInfo(info);
          setMeetingId(info.meetingId);
          if (info.passcode) setPasscode(info.passcode);
          setAutoFilled(true);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = meetingId.replace(/[\s-]/g, '');
    if (!cleanId) return;

    // Save for next time
    localStorage.setItem('swar_zoom_meeting_id', cleanId);
    if (passcode) localStorage.setItem('swar_zoom_passcode', passcode);

    // Build URL
    let zoomUrl = `https://zoom.us/j/${cleanId}`;
    if (passcode.trim()) {
      zoomUrl += `?pwd=${encodeURIComponent(passcode.trim())}`;
    }

    onClose();
    // Open Zoom directly
    window.open(zoomUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Band */}
        <div className="bg-gradient-to-r from-swar-primary to-[#166235] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Join Zoom Meeting</h3>
              <p className="text-xs text-white/80">Swar Yoga Live Class & Workshop</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/25 hover:bg-white/40 active:scale-90 flex items-center justify-center text-white transition-all flex-shrink-0 border border-white/40 shadow-sm"
          >
            <X className="w-5 h-5 text-white stroke-[3]" stroke="#ffffff" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Enrolled Badge if detected */}
          {enrolledInfo && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-emerald-900 block">
                  {enrolledInfo.workshopName || 'Enrolled Workshop Found'}
                </span>
                <span className="text-emerald-700">
                  Your meeting credentials have been auto-filled below.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Meeting ID or Personal Link Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. 892 4567 1234"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-swar-primary focus:ring-2 focus:ring-swar-primary/20 outline-none text-base font-medium tracking-wide transition-all"
                />
                {autoFilled && (
                  <span className="absolute right-3 top-3 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Auto-Filled
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Meeting Passcode (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter passcode if required"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-swar-primary focus:ring-2 focus:ring-swar-primary/20 outline-none text-base font-medium transition-all"
                />
                <KeyRound className="absolute right-3.5 top-3.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-swar-primary to-[#166235] text-white font-bold text-base shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
            >
              <span>Join Zoom Meeting Now</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="text-center text-[11px] text-gray-500">
            Make sure the Zoom app is installed on your device for the best experience.
          </p>
        </div>
      </div>
    </div>
  );
}

interface SadhanaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailySadhanaModal({ isOpen, onClose }: SadhanaModalProps) {
  const router = useRouter();
  const [sadhanaCode, setSadhanaCode] = useState('');
  const [savedBatch, setSavedBatch] = useState<any>(null);
  const [activePrograms, setActivePrograms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // Load saved batch and resolve live programs
  useEffect(() => {
    if (!isOpen) return;

    const savedCode = localStorage.getItem('swar_sadhana_code') || '';
    if (savedCode) setSadhanaCode(savedCode);

    try {
      const stored = localStorage.getItem('swar_sadhana_program');
      if (stored) {
        setSavedBatch(JSON.parse(stored));
      }
    } catch {}

    try {
      const storedPrograms = localStorage.getItem('swar_sadhana_active_programs');
      if (storedPrograms) {
        setActivePrograms(JSON.parse(storedPrograms));
      }
    } catch {}

    // Resolve available programs and code from server
    setIsLoading(true);
    fetch(`/api/sadhana/resolve-code?code=${encodeURIComponent(savedCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.allActivePrograms)) {
            setActivePrograms(data.allActivePrograms);
            try {
              localStorage.setItem('swar_sadhana_active_programs', JSON.stringify(data.allActivePrograms));
            } catch {}
          }
          if (data.program) {
            setSavedBatch(data.program);
            try {
              localStorage.setItem('swar_sadhana_program', JSON.stringify(data.program));
            } catch {}
            if (!savedCode && data.program.passcode) {
              setSadhanaCode(data.program.passcode);
            }
          }
        }
      })
      .catch((e) => console.warn('Failed to resolve sadhana programs:', e))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const navigateToProgram = (program: any) => {
    if (!program || !program.slug) return;
    // Save to system so they can use daily in 1 click
    const codeToSave = program.passcode || sadhanaCode.trim() || program.slug.toUpperCase();
    localStorage.setItem('swar_sadhana_code', codeToSave);
    localStorage.setItem('swar_sadhana_program', JSON.stringify(program));
    onClose();
    router.push(`/sadhana/live/${program.slug}`);
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = sadhanaCode.trim();

    // If code matches already loaded batch
    if (savedBatch && (!cleanCode || cleanCode.toUpperCase() === (savedBatch.passcode || '').toUpperCase() || cleanCode.toLowerCase() === savedBatch.slug.toLowerCase())) {
      navigateToProgram(savedBatch);
      return;
    }

    // Offline / deployment fallback: check cached programs
    const matchingInCached = activePrograms.find(
      (p) =>
        (p.passcode && p.passcode.toUpperCase() === cleanCode.toUpperCase()) ||
        (p.slug && p.slug.toLowerCase() === cleanCode.toLowerCase())
    );
    if (matchingInCached) {
      navigateToProgram(matchingInCached);
      return;
    }

    // Direct slug fallback (e.g. HINDISWAR, ENGLISHSWAR)
    if (cleanCode.toUpperCase() === 'HINDISWAR' || cleanCode.toUpperCase() === 'HINDI') {
      navigateToProgram({ slug: 'hindi', name: 'Hindi Sadhana', passcode: 'HINDISWAR' });
      return;
    }
    if (cleanCode.toUpperCase() === 'ENGLISHSWAR' || cleanCode.toUpperCase() === 'ENGLISH') {
      navigateToProgram({ slug: 'english', name: 'English Sadhana', passcode: 'ENGLISHSWAR' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/sadhana/resolve-code?code=${encodeURIComponent(cleanCode)}`);
      const data = await res.json();
      if (data.success && data.program) {
        navigateToProgram(data.program);
      } else {
        setNotice('Batch code not found. Connecting to open session...');
        setTimeout(() => {
          onClose();
          router.push('/sadhana/live');
        }, 1200);
      }
    } catch {
      onClose();
      router.push('/sadhana/live');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectBatch = (prog: any) => {
    setSavedBatch(prog);
    setSadhanaCode(prog.passcode || prog.slug.toUpperCase());
    localStorage.setItem('swar_sadhana_code', prog.passcode || prog.slug.toUpperCase());
    localStorage.setItem('swar_sadhana_program', JSON.stringify(prog));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Band */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-[#166235] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Daily Swar Sadhana</h3>
              <p className="text-xs text-white/80">Breath Meditation & Vedic Chanting</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/25 hover:bg-white/40 active:scale-90 flex items-center justify-center text-white transition-all flex-shrink-0 border border-white/40 shadow-sm cursor-pointer"
          >
            <X className="w-5 h-5 text-white stroke-[3]" stroke="#ffffff" />
          </button>
        </div>

        {/* Content — Simple Passcode Screen for Mobile App */}
        <div className="p-5 sm:p-6 space-y-4">
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Sadhana Passcode / Batch Code
                </label>
                {savedBatch && (
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Saved in browser
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter passcode (e.g. HINDISWAR)"
                  value={sadhanaCode}
                  onChange={(e) => setSadhanaCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-base font-mono font-bold tracking-wider transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal text-slate-900"
                  autoFocus
                />
                <Sparkles className="absolute right-3.5 top-3.5 w-5 h-5 text-amber-500" />
              </div>
              <span className="text-xs text-gray-500 block mt-1.5 leading-relaxed">
                Enter your code once — our system saves it so you can join daily in 1 click.
              </span>
            </div>

            {notice && (
              <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center animate-pulse font-medium">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-[#166235] text-white font-bold text-base shadow-lg shadow-amber-900/20 hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <span>{isLoading ? 'Connecting...' : 'Save & Start Scheduled Sadhana'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickPaymentModal({ isOpen, onClose }: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Band */}
        <div className="bg-gradient-to-r from-swar-primary to-[#166235] text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Quick Payments & Plans</h3>
              <p className="text-xs text-white/80">Secure Official Swar Yoga Enrollment</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-white/25 hover:bg-white/40 active:scale-90 flex items-center justify-center text-white transition-all flex-shrink-0 border border-white/40 shadow-sm"
          >
            <X className="w-5 h-5 text-white stroke-[3]" stroke="#ffffff" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          {/* Card 1: Resort Membership */}
          <Link
            href="/resort#membership"
            onClick={onClose}
            className="group block p-4 rounded-2xl border-2 border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-500 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">5-Year Resort Membership</h4>
                  <p className="text-xs text-emerald-800 font-semibold">₹21,000 · 50 Days Free Stay</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Workshops & Courses */}
          <Link
            href="/workshops"
            onClick={onClose}
            className="group block p-4 rounded-2xl border border-gray-200 hover:border-swar-primary hover:bg-gray-50/80 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-swar-primary/10 text-swar-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Live Workshops & Courses</h4>
                  <p className="text-xs text-gray-500">Upcoming batches & certifications</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 group-hover:text-swar-primary transition-all" />
            </div>
          </Link>

          {/* Card 3: Cart / Checkout */}
          <Link
            href="/cart"
            onClick={onClose}
            className="group block p-4 rounded-2xl border border-gray-200 hover:border-swar-primary hover:bg-gray-50/80 transition-all shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">View Cart & Complete Checkout</h4>
                  <p className="text-xs text-gray-500">Pay for selected courses & products</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 group-hover:text-orange-600 transition-all" />
            </div>
          </Link>

          <div className="pt-2 flex items-center justify-center space-x-2 text-[11px] text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>100% Secure Payment via Official Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
