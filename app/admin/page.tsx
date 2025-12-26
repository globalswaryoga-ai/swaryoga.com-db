'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, LogOut, UserCheck, Bell, ScrollText, Sparkles } from 'lucide-react';

type AdminUserPayload = {
  userId?: string;
  email?: string;
  isAdmin?: boolean;
  role?: string;
  permissions?: string[];
};

function getStoredAdminUser(): AdminUserPayload {
  if (typeof window === 'undefined') return {};
  const userStr = localStorage.getItem('admin_user');
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      return parsed && typeof parsed === 'object' ? (parsed as AdminUserPayload) : {};
    } catch {
      return {};
    }
  }
  // Legacy fallback
  const legacyUserId = localStorage.getItem('adminUser') || '';
  return legacyUserId ? { userId: legacyUserId } : {};
}

function Card({
  href,
  enabled,
  title,
  description,
  cta,
  gradientClass,
  icon,
}: {
  href?: string;
  enabled: boolean;
  title: string;
  description: string;
  cta: string;
  gradientClass: string;
  icon: React.ReactNode;
}) {
  const content = (
    <div
      className={
        `${gradientClass} rounded-lg shadow-lg p-8 transition ` +
        (enabled
          ? 'cursor-pointer hover:shadow-xl transform hover:scale-105'
          : 'opacity-60 cursor-not-allowed')
      }
      aria-disabled={!enabled}
    >
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <h2 className="text-3xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-white/85 text-lg">{description}</p>
      <div className="mt-6 text-white/90 font-semibold">
        {enabled ? cta : 'Access restricted'}
      </div>
    </div>
  );

  if (enabled && href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function InfoCard({
  title,
  description,
  gradientClass,
  icon,
}: {
  title: string;
  description: string;
  gradientClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`${gradientClass} rounded-lg shadow-lg p-8`}>
      <div className="flex items-center gap-4 mb-4">
        {icon}
        <h3 className="text-2xl font-bold text-white">{title}</h3>
      </div>
      <p className="text-white/85 text-base leading-relaxed">{description}</p>
    </div>
  );
}

export default function AdminRoot() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken'))
      : null;
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      const user = getStoredAdminUser();
      setAdminUser(user.userId || 'Admin');
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      setIsSuperAdmin((user.userId || '') === 'admin' || perms.includes('all'));
      setLoading(false);
    }
  }, [router]);

  // Requested behavior:
  // - Full-access admin (admin / permissions: ['all']) can open Dashboard + Admin CRM.
  // - Other admin users can open only User CRM.
  const canDashboard = isSuperAdmin;
  const canAdminCRM = isSuperAdmin;
  const canUserCRM = true;

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {/* Header */}
      <div className="bg-gray-950 border-b border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Swar Yoga Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Welcome, <span className="text-blue-400 font-semibold">{adminUser}</span></span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Hub Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white">Dashboard</h2>
          <p className="text-gray-300 mt-2">Header shortcuts (Dashboard / CRM / User CRM)</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card
            href="/admin/dashboard"
            enabled={canDashboard}
            title="Dashboard"
            description="Admin analytics, orders, users, and system overview."
            cta="→ Open Dashboard"
            gradientClass="bg-gradient-to-br from-blue-600 to-blue-800"
            icon={<LayoutDashboard size={40} className="text-white" />}
          />
          <Card
            href="/admin/crm"
            enabled={canAdminCRM}
            title="CRM"
            description="Admin CRM access (full controls for leads, templates, analytics)."
            cta="→ Open Admin CRM"
            gradientClass="bg-gradient-to-br from-green-600 to-green-800"
            icon={<Users size={40} className="text-white" />}
          />
          <Card
            href="/admin/users"
            enabled={canUserCRM}
            title="User CRM"
            description="CRM access for users based on the permissions you assign."
            cta="→ Open User CRM"
            gradientClass="bg-gradient-to-br from-purple-600 to-purple-800"
            icon={<UserCheck size={40} className="text-white" />}
          />
        </div>

        <div className="mt-10">
          <h3 className="text-xl font-semibold text-white mb-4">More details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard
              title="Latest Updates"
              description="Add latest updates here (new features, fixes, announcements, and important actions for the team)."
              gradientClass="bg-gradient-to-br from-sky-600 to-sky-800"
              icon={<Sparkles size={40} className="text-white" />}
            />
            <InfoCard
              title="Rules"
              description="Add operational rules here (do's, don'ts, CRM workflow, escalation rules, and compliance)."
              gradientClass="bg-gradient-to-br from-amber-600 to-amber-800"
              icon={<ScrollText size={40} className="text-white" />}
            />
            <InfoCard
              title="Notice"
              description="Add notices here (maintenance windows, system alerts, campaigns, and urgent updates)."
              gradientClass="bg-gradient-to-br from-pink-600 to-pink-800"
              icon={<Bell size={40} className="text-white" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
