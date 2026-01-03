'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizePhoneForMeta } from '@/lib/utils/phone';

type Props = {
  isOpen: boolean;
  token: string | null;
  onClose: () => void;
  /** Optional: prefill phone when opening from a chat context */
  initialPhone?: string;
};

export default function CreateLeadModal({ isOpen, token, onClose, initialPhone }: Props) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the phone input in sync when the modal opens with a new initialPhone.
  // If user already typed something else, we won't overwrite it.
  useEffect(() => {
    if (!isOpen) return;
    if (!initialPhone) return;
    setPhone((prev) => {
      if (!prev) return initialPhone;
      if (normalizePhoneForMeta(prev) === normalizePhoneForMeta(initialPhone)) return initialPhone;
      return prev;
    });
  }, [isOpen, initialPhone]);

  const normalizedPhone = useMemo(() => normalizePhoneForMeta(phone), [phone]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    const cleanedName = name.trim();
    const cleanedPhone = normalizePhoneForMeta(phone);

    if (!cleanedName) {
      setError('Name is required');
      return;
    }

    if (!cleanedPhone) {
      setError('Mobile number is required');
      return;
    }

    try {
      setBusy(true);
      setError(null);

      // Email is required by existing API. Provide a safe placeholder.
      // This avoids changing server validation logic.
      const placeholderEmail = `${cleanedPhone}@noemail.local`;

      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanedName,
          phoneNumber: cleanedPhone,
          email: placeholderEmail,
          source: 'manual',
          status: 'lead',
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.error || 'Failed to create lead';
        // If API returns existing lead in conflict payload, use it
        const existingId = data?.data?._id || data?.existing?._id;
        if (res.status === 409 && existingId) {
          onClose();
          router.push(`/admin/crm/leads/${existingId}`);
          return;
        }
        throw new Error(msg);
      }

      const createdId = data?.data?._id;
      if (createdId) {
        onClose();
        router.push(`/admin/crm/leads/${createdId}`);
        return;
      }

      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create lead');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Create Lead</h2>
            <p className="text-xs text-slate-600">Only Name + Mobile required</p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="Customer name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Mobile *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={(e) => setPhone(normalizePhoneForMeta(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-300"
              placeholder="919309986820"
              inputMode="tel"
            />
            <p className="mt-1 text-xs text-slate-500">
              Saved as: <span className="font-mono text-slate-700">{normalizedPhone || '-'}</span>
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            disabled={busy}
          >
            {busy ? 'Saving…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
