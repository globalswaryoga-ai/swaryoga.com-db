'use client';

import { useAuth } from '@/hooks/useAuth';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SadhanaAnnouncementsPage() {
  const [announcement, setAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

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
    try {
      const res = await fetch('/api/admin/sadhana-announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    return <div className="p-6 text-gray-400">Loading...</div>;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Link href="/admin/crm/sadhana-programs" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm w-fit mb-6">
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 rounded-xl p-6">
        <h1 className="text-3xl font-bold text-white mb-2">📢 Sadhana Announcements</h1>
        <p className="text-purple-200 text-sm mb-6">
          Add announcements that appear as a scrolling ticker below the video on the live page.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-2">Announcement Text</label>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="e.g., Next new workshop will start from 30th April. Reply: 9309986820"
              rows={4}
              className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-700 focus:border-pink-500 outline-none resize-none"
            />
            <p className="text-xs text-gray-400 mt-2">Leave empty to disable the announcement</p>
          </div>

          {announcement && (
            <div className="bg-black/50 rounded-lg p-4 border border-purple-500/20">
              <p className="text-xs text-gray-400 mb-2">Preview (scrolling):</p>
              <div className="overflow-hidden bg-gradient-to-r from-purple-900 to-indigo-900 rounded p-3">
                <div className="animate-marquee whitespace-nowrap text-white text-sm">
                  {announcement} • {announcement} •
                </div>
              </div>
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Saving...' : 'Save Announcement'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-700 text-green-100 px-4 py-3 rounded-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
