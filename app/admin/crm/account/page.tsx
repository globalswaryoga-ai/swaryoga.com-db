'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Shield,
  Calendar,
  Clock,
} from 'lucide-react';

interface Profile {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  profilePhoto: string;
  company: string;
  designation: string;
  tenantSlug: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export default function AccountPage() {
  const router = useRouter();
  const token = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Fetch profile
  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        const res = await fetch('/api/crm-site/account', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profile) {
            setProfile(data.profile);
            if (data.profile.profilePhoto) setPhotoPreview(data.profile.profilePhoto);
          }
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', text: 'Please select an image file' });
      return;
    }
    if (file.size > 500_000) {
      setToast({ type: 'error', text: 'Image must be less than 500KB' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      setProfile(prev => prev ? { ...prev, profilePhoto: base64 } : prev);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview('');
    setProfile(prev => prev ? { ...prev, profilePhoto: '' } : prev);
    if (fileRef.current) fileRef.current.value = '';
  };

  const saveProfile = async () => {
    if (!profile) return;
    const token = getToken();
    if (!token) return;

    setSaving(true);
    setToast(null);

    try {
      const res = await fetch('/api/crm-site/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          profilePhoto: profile.profilePhoto,
          company: profile.company,
          designation: profile.designation,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast({ type: 'success', text: '✅ Profile updated successfully!' });
        // Update localStorage for avatar display across the CRM
        if (profile.profilePhoto) {
          localStorage.setItem('crm_profile_photo', profile.profilePhoto);
        } else {
          localStorage.removeItem('crm_profile_photo');
        }
        if (profile.name) localStorage.setItem('crm_user_name', profile.name);
      } else {
        setToast({ type: 'error', text: data.error || 'Failed to save' });
      }
    } catch {
      setToast({ type: 'error', text: 'Network error — please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof Profile, value: string) => {
    setProfile(prev => prev ? { ...prev, [key]: value } : prev);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Failed to load profile</p>
          <button onClick={() => window.location.reload()} className="mt-3 text-indigo-600 hover:underline text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const initials = profile.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/crm" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className={`p-3 rounded-lg text-sm font-medium ${
            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {toast.text}
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Photo Section */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>
          <div className="flex items-center gap-6">
            <div className="relative group">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-indigo-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-indigo-100">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium">Upload a profile photo</p>
              <p className="text-xs text-gray-500 mt-1">JPG, PNG or WebP. Max 500KB. Shown across CRM.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                >
                  Upload Photo
                </button>
                {photoPreview && (
                  <button
                    onClick={removePhoto}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <User className="w-4 h-4 text-gray-400" /> Full Name
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={e => update('name', e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 text-gray-400" /> Email Address
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed. Contact support if needed.</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 text-gray-400" /> Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone}
                onChange={e => update('phone', e.target.value)}
                placeholder="+91 XXXXX XXXXX"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 text-gray-400" /> Company / Organization
                </label>
                <input
                  type="text"
                  value={profile.company}
                  onChange={e => update('company', e.target.value)}
                  placeholder="Your company name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                  <Briefcase className="w-4 h-4 text-gray-400" /> Designation / Role
                </label>
                <input
                  type="text"
                  value={profile.designation}
                  onChange={e => update('designation', e.target.value)}
                  placeholder="e.g. Admin, Manager"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Account Info (read-only) */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard
              icon={<Shield className="w-5 h-5 text-indigo-500" />}
              label="Role"
              value={profile.role === 'superadmin' ? 'Super Admin' : 'Admin'}
            />
            <InfoCard
              icon={<User className="w-5 h-5 text-purple-500" />}
              label="User ID"
              value={profile.userId}
            />
            {profile.tenantSlug && (
              <InfoCard
                icon={<Building2 className="w-5 h-5 text-emerald-500" />}
                label="Tenant"
                value={profile.tenantSlug}
              />
            )}
            {profile.createdAt && (
              <InfoCard
                icon={<Calendar className="w-5 h-5 text-blue-500" />}
                label="Member Since"
                value={new Date(profile.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              />
            )}
            {profile.lastLoginAt && (
              <InfoCard
                icon={<Clock className="w-5 h-5 text-amber-500" />}
                label="Last Login"
                value={new Date(profile.lastLoginAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              />
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/admin/crm/subscription"
              className="p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition group"
            >
              <p className="font-medium text-gray-900 group-hover:text-indigo-700 text-sm">📋 Plan Details</p>
              <p className="text-xs text-gray-500 mt-0.5">View & upgrade your plan</p>
            </Link>
            <Link
              href="/admin/crm/billing"
              className="p-4 rounded-xl border border-gray-200 hover:border-green-300 hover:bg-green-50/50 transition group"
            >
              <p className="font-medium text-gray-900 group-hover:text-green-700 text-sm">💰 Billing</p>
              <p className="text-xs text-gray-500 mt-0.5">Payments & invoices</p>
            </Link>
            <Link
              href="/admin/crm/payment-details"
              className="p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 transition group"
            >
              <p className="font-medium text-gray-900 group-hover:text-purple-700 text-sm">🏦 Bank Details</p>
              <p className="text-xs text-gray-500 mt-0.5">Manage payment info</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
      <div className="p-2 bg-white rounded-lg shadow-sm">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}
