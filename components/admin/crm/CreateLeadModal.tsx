'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizePhoneForMeta } from '@/lib/utils/phone';
import { FormModal } from '@/components/admin/crm';

type Props = {
  isOpen: boolean;
  token: string | null;
  onClose: () => void;
  /** Optional: prefill phone when opening from a chat context */
  initialPhone?: string;
};

type AdminUserOption = {
  userId: string;
  email?: string;
  permissions?: string[];
};

type LeadStatus = 'lead' | 'prospect' | 'customer' | 'inactive';

export default function CreateLeadModal({ isOpen, token, onClose, initialPhone }: Props) {
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState(initialPhone || '');
  const [source, setSource] = useState('website');
  const [status, setStatus] = useState<LeadStatus>('lead');
  const [workshopName, setWorkshopName] = useState('');
  const [assignedToUserId, setAssignedToUserId] = useState('');

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userOptions, setUserOptions] = useState<AdminUserOption[]>([]);

  // Determine if current admin has full access (admin / permissions: ['all'])
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userStr = localStorage.getItem('admin_user');
    if (!userStr) {
      setIsSuperAdmin(false);
      return;
    }
    try {
      const u = JSON.parse(userStr);
      const perms: string[] = Array.isArray(u?.permissions) ? u.permissions : [];
      setIsSuperAdmin((u?.userId === 'admin') || perms.includes('all'));
    } catch {
      setIsSuperAdmin(false);
    }
  }, []);

  // For super-admin, fetch user list so admin can assign leads.
  useEffect(() => {
    const loadUsers = async () => {
      if (!token || !isSuperAdmin) return;
      try {
        const response = await fetch('/api/admin/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const users = Array.isArray(data?.data) ? data.data : [];
        setUserOptions(
          users
            .map((x: any) => ({
              userId: String(x?.userId || '').trim(),
              email: x?.email ? String(x.email) : undefined,
              permissions: Array.isArray(x?.permissions) ? x.permissions : undefined,
            }))
            .filter((u: AdminUserOption) => Boolean(u.userId))
        );
      } catch {
        // ignore
      }
    };
    loadUsers();
  }, [token, isSuperAdmin]);

  // When opening, reset the form and prefill phone if provided
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setBusy(false);
    setName('');
    setEmail('');
    setSource('website');
    setStatus('lead');
    setWorkshopName('');
    setAssignedToUserId('');
    setPhone(initialPhone || '');
  }, [isOpen, initialPhone]);

  const normalizedPhone = useMemo(() => normalizePhoneForMeta(phone), [phone]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    const cleanedName = name.trim();
    const cleanedEmail = email.trim();
    const cleanedPhone = normalizePhoneForMeta(phone);

    if (!cleanedName || !cleanedEmail || !cleanedPhone) {
      setError('Please fill Name, Email, and Phone Number');
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const res = await fetch('/api/admin/crm/leads', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: cleanedName,
          email: cleanedEmail,
          phoneNumber: cleanedPhone,
          source,
          status,
          workshopName: workshopName || undefined,
          ...(isSuperAdmin && assignedToUserId ? { assignedToUserId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // If it's a duplicate lead, open the existing lead
        const existingId = data?.existingLead?._id || data?.data?._id || data?.existing?._id;
        if (res.status === 409 && existingId) {
          onClose();
          router.push(`/admin/crm/leads/${existingId}`);
          return;
        }
        throw new Error(data?.error || 'Failed to create lead');
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
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Lead"
      submitLabel="Create Lead"
      cancelLabel="Cancel"
      onSubmit={() => submit()}
      loading={busy}
      size="md"
    >
      <div className="lead-form-light-green space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        {isSuperAdmin && (
          <div>
            <label className="block text-slate-700 text-sm mb-2 font-semibold">Assign to User (Optional)</label>
            <select
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            >
              <option value="">(Default: current admin)</option>
              {userOptions.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.userId}
                </option>
              ))}
            </select>
            <p className="text-slate-600 text-xs mt-1">This controls which user can see/manage this lead.</p>
          </div>
        )}

        <div>
          <label className="block text-slate-700 text-sm mb-2 font-semibold">Name *</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            placeholder="Lead name"
          />
        </div>

        <div>
          <label className="block text-slate-700 text-sm mb-2 font-semibold">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            placeholder="email@example.com"
          />
        </div>

        <div>
          <label className="block text-slate-700 text-sm mb-2 font-semibold">Phone Number *</label>
          <input
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => {
              const normalized = normalizePhoneForMeta(e.target.value);
              if (normalized) setPhone(normalized);
            }}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            placeholder="+919876543210"
            inputMode="tel"
          />
          <p className="text-slate-600 text-xs mt-1">
            Saved as: <span className="font-mono">{normalizedPhone || '-'}</span>
          </p>
        </div>

        <div>
          <label className="block text-slate-700 text-sm mb-2 font-semibold">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
          >
            <option value="website">Website</option>
            <option value="referral">Referral</option>
            <option value="social">Social Media</option>
            <option value="event">Event</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-700 text-sm mb-2 font-semibold">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
          >
            <option value="lead">Lead</option>
            <option value="prospect">Prospect</option>
            <option value="customer">Customer</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-700 text-sm mb-2 font-semibold">Workshop/Program (Optional)</label>
          <input
            type="text"
            value={workshopName}
            onChange={(e) => setWorkshopName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-400"
            placeholder="e.g., Yoga Retreat 2025, Advanced Pranayama"
          />
        </div>
      </div>
    </FormModal>
  );
}
