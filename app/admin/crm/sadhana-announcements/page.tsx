'use client';

import { useAuth } from '@/hooks/useAuth';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SadhanaAnnouncementsPage() {
  const token = useAuth();
  const [announcement, setAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const getEffectiveToken = () => {
    return token || (typeof window !== 'undefined' ? (localStorage.getItem('crm_token') || localStorage.getItem('adminToken') || localStorage.getItem('admin_token') || '') : '');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/sadhana-announcements');
        const data = await res.json();
        if (data.success) {
          setAnnouncement(data.announcement);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const activeToken = getEffectiveToken();
    try {
      const res = await fetch('/api/admin/sadhana-announcements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken.trim().replace(/^Bearer\s+/i, '')}` } : {}),
        },
        body: JSON.stringify({ text: announcement }),
      });
      const data = await res.json();
      if (data.success) {
        setToast('✅ Announcement updated');
        setTimeout(() => setToast(''), 3000);
      }
    } catch (err) {
      console.error(err);
      setToast('❌ Failed to save');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 font-medium">Loading announcement...</div>
      </div>
    );
  }

  const isConfigured = Boolean(announcement.trim());

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-pink-500 via-rose-500 to-indigo-600" />

      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin/crm/sadhana-programs" className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-sm font-semibold transition">
            <ArrowLeft size={16} /> Back to Programs
          </Link>
          <span className="bg-pink-100 text-pink-700 text-xs font-bold px-3 py-1 rounded-full border border-pink-200">
            Live Marquee Bar
          </span>
        </div>

        {/* 4 Colorful Metric KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-pink-200/80 shadow-xs">
            <span className="text-xs font-semibold text-pink-600 uppercase tracking-wider block">Status</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">{isConfigured ? 'Active' : 'Disabled'}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{isConfigured ? 'Scrolling on live' : 'No message set'}</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-indigo-200/80 shadow-xs">
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">Text Length</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">{announcement.length} chars</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Ticker message</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block">Display Target</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">Live Sadhana</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Under video player</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-amber-200/80 shadow-xs">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">Broadcast Type</span>
            <span className="text-lg font-black text-slate-900 mt-1 block">Real-Time</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">Instant sync</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">📢 Sadhana Live Announcement</h1>
            <p className="text-slate-500 text-sm mt-1">
              Configure announcements that appear as a scrolling marquee ticker below the video player on the live Sadhana stream page.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Announcement Text</label>
              <textarea
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                placeholder="e.g., Next batch starts 30th April. WhatsApp us at 9309986820 for enrollment."
                rows={4}
                className="w-full bg-slate-50 text-slate-800 px-4 py-3 rounded-xl border border-slate-200 focus:border-pink-500 focus:bg-white outline-none resize-none text-sm transition"
              />
              <p className="text-xs text-slate-400 mt-1.5">Leave empty to disable the ticker announcement.</p>
            </div>

            {announcement && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Preview (Scrolling Animation):</p>
                <div className="overflow-hidden bg-gradient-to-r from-pink-600 to-indigo-600 rounded-lg p-3 shadow-inner">
                  <div className="animate-marquee whitespace-nowrap text-white text-sm font-semibold">
                    {announcement} • {announcement} •
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={save}
              disabled={saving}
              className="w-full bg-gradient-to-r from-pink-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:opacity-95 disabled:opacity-50 transition shadow-md shadow-pink-500/20 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Announcement'}
            </button>
          </div>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 bg-slate-900 text-white border border-slate-800 px-4 py-3 rounded-xl shadow-2xl z-50 text-sm font-semibold">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
