'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Users, LogOut, Mail, MessageSquare, UserCog } from 'lucide-react';

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

function hasPermission(user: AdminUserPayload, perm: string): boolean {
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  return perms.includes('all') || perms.includes(perm);
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
        {enabled ? cta : '🔒 Access restricted'}
      </div>
    </div>
  );

  if (enabled && href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export default function AdminRoot() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminPayload, setAdminPayload] = useState<AdminUserPayload>({});

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken'))
      : null;
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      const user = getStoredAdminUser();
      setAdminPayload(user);
      setAdminUser(user.userId || 'Admin');
      setIsSuperAdmin((user.userId || '') === 'admin');
      setLoading(false);
    }
  }, [router]);

  const canDashboard = isSuperAdmin;
  const canCRM = isSuperAdmin || hasPermission(adminPayload, 'crm') || hasPermission(adminPayload, 'whatsapp') || hasPermission(adminPayload, 'email');

  const canLeads = isSuperAdmin || hasPermission(adminPayload, 'crm');
  const canWhatsApp = isSuperAdmin || hasPermission(adminPayload, 'whatsapp');
  const canEmail = isSuperAdmin || hasPermission(adminPayload, 'email');

  const userCardHref = (() => {
    if (isSuperAdmin) return '/admin/users';
    if (canWhatsApp) return '/admin/crm/messages';
    if (canEmail) return '/admin/contact-messages';
    if (canLeads) return '/admin/crm/leads';
    return '/admin/crm';
  })();

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
          <h2 className="text-3xl font-bold text-white">Choose a section</h2>
          <p className="text-gray-300 mt-2">
            Your access is shown based on your permissions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* 1) Dashboard (only main admin can open) */}
          <Card
            href="/admin/dashboard"
            enabled={canDashboard}
            title="Dashboard"
            description="Manage orders, users, view statistics, and manage website content."
            cta="→ Go to Dashboard"
            gradientClass="bg-gradient-to-br from-blue-600 to-blue-800"
            icon={<LayoutDashboard size={40} className="text-white" />}
          />

          {/* 2) CRM (opens for admins with CRM/WhatsApp/Email permissions) */}
          <Card
            href="/admin/crm"
            enabled={canCRM}
            title="CRM"
            description="Manage leads, send messages, handle WhatsApp communication, and templates."
            cta="→ Go to CRM"
            gradientClass="bg-gradient-to-br from-green-600 to-green-800"
            icon={<Users size={40} className="text-white" />}
          />

          {/* 3) Users (permission-based entry point) */}
          <Card
            href={userCardHref}
            enabled={true}
            title="Users"
            description={
              isSuperAdmin
                ? 'Create and manage admin users with custom permissions (CRM, WhatsApp, Email).'
                : 'Open your permitted modules (CRM / WhatsApp / Email) based on your access.'
            }
            cta={isSuperAdmin ? '→ Manage Users' : '→ Open your access'}
            gradientClass="bg-gradient-to-br from-purple-600 to-purple-800"
            icon={<UserCog size={40} className="text-white" />}
          />
        </div>

        {/* Detail Cards */}
        <div className="mt-10">
          <h3 className="text-xl font-semibold text-white mb-4">More details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              href="/admin/crm/leads"
              enabled={canLeads}
              title="Leads"
              description="View, import, update, and manage your leads pipeline."
              cta="→ Open Leads"
              gradientClass="bg-gradient-to-br from-sky-600 to-sky-800"
              icon={<Users size={40} className="text-white" />}
            />
            <Card
              href="/admin/crm/messages"
              enabled={canWhatsApp}
              title="WhatsApp"
              description="Send and track WhatsApp messages to leads and customers."
              cta="→ Open WhatsApp"
              gradientClass="bg-gradient-to-br from-emerald-600 to-emerald-800"
              icon={<MessageSquare size={40} className="text-white" />}
            />
            <Card
              href="/admin/contact-messages"
              enabled={canEmail}
              title="Email"
              description="View contact messages and respond to customer enquiries."
              cta="→ Open Inbox"
              gradientClass="bg-gradient-to-br from-amber-600 to-amber-800"
              icon={<Mail size={40} className="text-white" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
