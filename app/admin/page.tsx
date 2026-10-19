'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  LogOut,
  UserCheck,
  Bell,
  ScrollText,
  Sparkles,
  UsersRound,
  FileQuestion,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  CheckCircle2,
} from 'lucide-react';

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
  badge,
  icon,
}: {
  href?: string;
  enabled: boolean;
  title: string;
  description: string;
  cta: string;
  gradientClass: string;
  badge?: string;
  icon: React.ReactNode;
}) {
  const content = (
    <div
      className={
        `group bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs transition-all duration-200 flex flex-col justify-between h-full ` +
        (enabled
          ? 'cursor-pointer hover:border-indigo-300 hover:shadow-xl hover:-translate-y-0.5'
          : 'opacity-60 cursor-not-allowed')
      }
      aria-disabled={!enabled}
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:scale-105 transition-transform duration-200`}>
            {icon}
          </div>
          {badge && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200/60 px-2.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
          {title}
          {enabled && <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-indigo-600" />}
        </h2>
        <p className="text-slate-600 text-sm mt-2 leading-relaxed">{description}</p>
      </div>
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
        <span>{enabled ? cta : 'Access restricted'}</span>
        {enabled && <span>→</span>}
      </div>
    </div>
  );

  if (enabled && href) {
    return <Link href={href} className="block h-full">{content}</Link>;
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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs hover:shadow-md transition">
      <div className="flex items-center gap-3.5 mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${gradientClass} flex items-center justify-center text-white shadow-xs`}>
          {icon}
        </div>
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
      </div>
      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{description}</p>
    </div>
  );
}

export default function AdminRoot() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasCRMPermission, setHasCRMPermission] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('crm_token') ||
         localStorage.getItem('adminToken') ||
         localStorage.getItem('admin_token') ||
         localStorage.getItem('token'))
      : null;
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      const user = getStoredAdminUser();
      setAdminUser(user.userId || 'Admin');
      const perms = Array.isArray(user.permissions) ? user.permissions : [];
      const superAdmin = ['admin', 'admincrm'].includes(user.userId || '') || perms.includes('all') || user.isAdmin === true;
      const hasCRM = superAdmin || perms.includes('crm');
      setIsSuperAdmin(superAdmin);
      setHasCRMPermission(hasCRM);
      setLoading(false);
    }
  }, [router]);

  const canDashboard = isSuperAdmin;
  const canAdminCRM = isSuperAdmin;
  const canUserCRM = hasCRMPermission;

  const handleLogout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mx-auto mb-3" />
          <p className="text-slate-600 font-medium text-sm">Loading admin console...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500" />

      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Swar Yoga Admin Console</h1>
              <p className="text-xs text-slate-500 font-medium">Enterprise Management & Operations Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs sm:text-sm text-slate-600">
              Welcome, <span className="text-indigo-600 font-bold">{adminUser}</span>
              {isSuperAdmin && (
                <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Super Admin
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Hub Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-teal-50 border border-indigo-200/60 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
                Command Center
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2">
              Executive Administration Dashboard
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Unified operational control for Swar Yoga courses, student enrollments, customer leads, automated communications, and community ecosystems.
            </p>

            {/* 4 Metric Summary Cards */}
            <div className="mt-6 pt-5 border-t border-indigo-200/50 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-blue-100 shadow-2xs">
                <span className="text-blue-700 font-semibold block uppercase tracking-wider text-[11px]">Control Centers</span>
                <span className="text-lg font-black text-slate-800 mt-0.5 block">5 Modules</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-indigo-100 shadow-2xs">
                <span className="text-indigo-700 font-semibold block uppercase tracking-wider text-[11px]">Role Permission</span>
                <span className="text-lg font-black text-slate-800 mt-0.5 block">{isSuperAdmin ? 'Full Access' : 'CRM Operator'}</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-teal-100 shadow-2xs">
                <span className="text-teal-700 font-semibold block uppercase tracking-wider text-[11px]">Database Engine</span>
                <span className="text-lg font-black text-slate-800 mt-0.5 block">Bunny & Unified</span>
              </div>
              <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-emerald-100 shadow-2xs">
                <span className="text-emerald-700 font-semibold block uppercase tracking-wider text-[11px]">System Status</span>
                <span className="text-lg font-black text-slate-800 mt-0.5 block flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Operational
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Command Cards */}
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Core Portals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              href="/admin/crm"
              enabled={canDashboard}
              title="Dashboard"
              description="Executive KPI analytics, revenue tracking, order pipelines, and system overview."
              cta="Open Dashboard"
              badge="Executive"
              gradientClass="from-blue-600 to-indigo-600"
              icon={<LayoutDashboard size={24} />}
            />
            <Card
              href="/admin/crm"
              enabled={canAdminCRM}
              title="Admin CRM"
              description="Complete CRM operations: leads capture, WhatsApp broadcasting, and automation funnels."
              cta="Open Admin CRM"
              badge="Full Suite"
              gradientClass="from-emerald-600 to-teal-600"
              icon={<Users size={24} />}
            />
            <Card
              href="/admin/crm"
              enabled={canUserCRM}
              title={isSuperAdmin ? "Staff CRM Operations" : "CRM Workspace"}
              description={isSuperAdmin ? "Staff workspace with client contact logs, template builders, and real-time chat." : "Agent CRM workspace for customer inquiries and lead updates."}
              cta={isSuperAdmin ? "Open Staff CRM" : "Open CRM"}
              badge="Workspace"
              gradientClass="from-purple-600 to-indigo-600"
              icon={<UserCheck size={24} />}
            />
          </div>
        </div>

        {/* Extended Tools */}
        {canDashboard && (
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              Community & Data Tools
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card
                href="/admin/crm/community-hub"
                enabled={true}
                title="Community Hub"
                description="Member roster, join request approvals, activity feeds, and community moderation."
                cta="Manage Community"
                badge="Community"
                gradientClass="from-teal-600 to-cyan-600"
                icon={<UsersRound size={24} />}
              />
              <Card
                href="/admin/crm/workshop-hub"
                enabled={true}
                title="Workshop Management"
                description="Cohorts, student enrollment, Zoom class attendance, and video recordings distribution."
                cta="Manage Workshops"
                badge="Cohorts"
                gradientClass="from-emerald-600 to-teal-700"
                icon={<CheckCircle2 size={24} />}
              />
              <Card
                href="/admin/form-questions"
                enabled={true}
                title="Form Questions Builder"
                description="Build dynamic intake form questions, set required validation, and organize field sequences."
                cta="Manage Questions"
                badge="Forms"
                gradientClass="from-indigo-600 to-violet-700"
                icon={<FileQuestion size={24} />}
              />
            </div>
          </div>
        )}

        {/* Notices & Operational Guidelines */}
        <div>
          <h3 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Operational Announcements & Directives
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <InfoCard
              title="Platform Release Notes"
              description="Continuous modern white UI upgrades, universal token fallback synchronization, and Bunny DB real-time data connectivity deployed across all domains."
              gradientClass="from-sky-500 to-blue-600"
              icon={<Sparkles size={20} />}
            />
            <InfoCard
              title="Operational Protocols"
              description="Ensure customer leads are triaged within 15 minutes of intake. WhatsApp broadcast messages must follow authorized template formatting."
              gradientClass="from-amber-500 to-orange-600"
              icon={<ScrollText size={20} />}
            />
            <InfoCard
              title="System Status & Telemetry"
              description="Automated Sadhana Zoom bots, WhatsApp Web bridge, and Google Form synchronization pipelines are running at 100% nominal health."
              gradientClass="from-rose-500 to-pink-600"
              icon={<Bell size={20} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
