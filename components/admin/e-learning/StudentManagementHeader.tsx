'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Video,
  Smartphone,
  Activity,
  User,
  Award,
  Save,
  Loader,
  Wifi,
} from 'lucide-react';

export interface TakenWorkshop {
  enrollmentId: string;
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  progressPercent: number;
  totalVideos: number;
  completedVideos: number;
  totalWatchTime?: number;
}

export interface StudentManagementHeaderProps {
  userId: string;
  enrollmentId?: string;
  enrollment: any;
  takenWorkshops?: TakenWorkshop[];
  activePage: 'profile' | 'videos' | 'devices' | 'usage';
  videosCount?: number;
  devicesCount?: number;
  daysActiveCount?: number;
  primaryIp?: string;
  primaryDevice?: string;
  primaryLocation?: string;
  computedProgress?: number;
  computedWatchSeconds?: number;
  onSaveAll?: () => void;
  saving?: boolean;
}

export default function StudentManagementHeader({
  userId,
  enrollmentId,
  enrollment,
  takenWorkshops = [],
  activePage,
  videosCount = 0,
  devicesCount = 1,
  daysActiveCount = 0,
  primaryIp = '',
  primaryDevice = '',
  primaryLocation = '',
  onSaveAll,
  saving = false,
}: StudentManagementHeaderProps) {
  const studentName = enrollment?.userId?.name || 'Student';
  const studentEmail = enrollment?.userId?.email || userId;
  const studentPhone = enrollment?.userId?.phone || '';
  const currentEnrollmentId = enrollmentId || enrollment?._id || '';
  const currentCourseTitle =
    enrollment?.courseId?.content?.en?.title ||
    enrollment?.courseId?.title ||
    enrollment?.courseId?.slug ||
    'Swar Yoga Course';

  const displayIp = primaryIp || enrollment?.userId?.ip || '';
  const displayLocation = primaryLocation || enrollment?.userId?.location || '';
  const displayDevice = primaryDevice || enrollment?.userId?.device || '';

  return (
    <div className="w-full mb-6 space-y-4">
      {/* ============================================================ */}
      {/* 2ND ROW HEADER BAR (DIRECTLY BELOW TOP E-LEARNING MENU BAR) */}
      {/* ============================================================ */}
      <div className="bg-[#0b1019] border border-gray-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Left: Student Back Button, Name, Badges, Contact info */}
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <Link
            href="/admin/crm/e-learning/users"
            className="p-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl transition-all shadow-sm shrink-0 border border-gray-700/60"
            title="Back to Students Table"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-white tracking-tight truncate">
                {studentName}
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 capitalize">
                {enrollment?.status || 'Active'}
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {enrollment?.purchaseType || 'Paid'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-gray-300">{studentEmail}</span>
              {studentPhone && <span className="text-gray-300">• {studentPhone}</span>}
              <span>• Course: <strong className="text-emerald-400 font-semibold">{currentCourseTitle}</strong></span>
            </p>
            {(displayIp || displayDevice || displayLocation) && (
              <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                {displayDevice && <span>Device: <span className="text-gray-400">{displayDevice}</span></span>}
                {displayIp && (
                  <span className="flex items-center gap-1">
                    • <Wifi size={11} className="text-cyan-400" />
                    IP: <span className="text-cyan-300 font-mono">{displayIp}</span>
                  </span>
                )}
                {displayLocation && <span>• Location: <span className="text-gray-400">{displayLocation}</span></span>}
              </p>
            )}
          </div>
        </div>

        {/* Right: THE THREE PAGES (+ PROFILE) BUTTONS IN 2ND ROW */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Button: Profile */}
          <Link
            href={`/admin/crm/e-learning/users/${userId}?enrollmentId=${currentEnrollmentId}`}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activePage === 'profile'
                ? 'bg-[#00c950] text-black shadow-lg shadow-[#00c950]/30 ring-2 ring-[#00c950]/50'
                : 'bg-[#131c29] border border-[#233144] text-gray-200 hover:text-white hover:bg-[#1b2637]'
            }`}
          >
            <User className={`w-4 h-4 ${activePage === 'profile' ? 'text-black stroke-[2.5]' : 'text-blue-400'}`} />
            <span>Profile</span>
          </Link>

          {/* Button 1: 1) Video Management */}
          <Link
            href={`/admin/crm/e-learning/users/${userId}/videos?enrollmentId=${currentEnrollmentId}`}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activePage === 'videos'
                ? 'bg-[#00c950] text-black shadow-lg shadow-[#00c950]/30 ring-2 ring-[#00c950]/50'
                : 'bg-[#131c29] border border-[#233144] text-gray-200 hover:text-white hover:bg-[#1b2637]'
            }`}
          >
            <Video className={`w-4 h-4 ${activePage === 'videos' ? 'text-black stroke-[2.5]' : 'text-emerald-400'}`} />
            <span>1) Video Management</span>
            {videosCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activePage === 'videos' ? 'bg-black/25 text-black' : 'bg-gray-800 text-emerald-300'
                }`}
              >
                {videosCount}
              </span>
            )}
          </Link>

          {/* Button 2: 2) Device Management */}
          <Link
            href={`/admin/crm/e-learning/users/${userId}/devices?enrollmentId=${currentEnrollmentId}`}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activePage === 'devices'
                ? 'bg-[#00c950] text-black shadow-lg shadow-[#00c950]/30 ring-2 ring-[#00c950]/50'
                : 'bg-[#131c29] border border-[#233144] text-gray-200 hover:text-white hover:bg-[#1b2637]'
            }`}
          >
            <Smartphone className={`w-4 h-4 ${activePage === 'devices' ? 'text-black stroke-[2.5]' : 'text-purple-400'}`} />
            <span>2) Device Management</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activePage === 'devices' ? 'bg-black/25 text-black' : 'bg-gray-800 text-purple-300'
              }`}
            >
              {devicesCount}/3
            </span>
          </Link>

          {/* Button 3: 3) User Updates */}
          <Link
            href={`/admin/crm/e-learning/users/${userId}/usage?enrollmentId=${currentEnrollmentId}`}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              activePage === 'usage'
                ? 'bg-[#00c950] text-black shadow-lg shadow-[#00c950]/30 ring-2 ring-[#00c950]/50'
                : 'bg-[#131c29] border border-[#233144] text-gray-200 hover:text-white hover:bg-[#1b2637]'
            }`}
          >
            <Activity className={`w-4 h-4 ${activePage === 'usage' ? 'text-black stroke-[2.5]' : 'text-cyan-400'}`} />
            <span>3) User Updates</span>
            {daysActiveCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activePage === 'usage' ? 'bg-black/25 text-black' : 'bg-gray-800 text-cyan-300'
                }`}
              >
                {daysActiveCount}d
              </span>
            )}
          </Link>

          {/* Optional: Save All Changes Button if provided */}
          {onSaveAll && (
            <button
              type="button"
              onClick={onSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{saving ? 'Saving...' : 'Save All Changes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAKEN WORKSHOPS & LIVE PROGRESS BARS IN HEADER */}
      {/* ============================================================ */}
      {takenWorkshops.length > 0 && (
        <div className="bg-[#0b1019] border border-gray-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Award size={16} className="text-amber-400" />
              <span>Taken Workshops & Progress Bars ({takenWorkshops.length})</span>
            </div>
            <span className="text-[11px] text-gray-400">
              Click any workshop to view all its videos, progress bar & watching controls
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {takenWorkshops.map((ws) => {
              const isSelected = ws.enrollmentId === currentEnrollmentId;
              return (
                <Link
                  key={ws.enrollmentId}
                  href={`/admin/crm/e-learning/users/${userId}/videos?enrollmentId=${ws.enrollmentId}`}
                  className={`p-3.5 rounded-xl border transition-all text-left block group ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/70 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                      : 'bg-black/40 border-gray-800 hover:border-gray-700 hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate" title={ws.courseTitle}>
                          {ws.courseTitle}
                        </p>
                        {isSelected && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shrink-0">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Enrolled: {ws.enrolledAt ? new Date(ws.enrolledAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      {ws.progressPercent}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden p-0.5 border border-gray-700/60 mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ws.progressPercent >= 100
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          : ws.progressPercent > 0
                          ? 'bg-gradient-to-r from-blue-500 to-emerald-400'
                          : 'bg-gray-700'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, ws.progressPercent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-mono">
                      {ws.completedVideos || 0}/{ws.totalVideos || 6} videos seen
                    </span>
                    <span className="text-emerald-400 group-hover:text-emerald-300 font-bold">
                      Click to open videos ↗
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
