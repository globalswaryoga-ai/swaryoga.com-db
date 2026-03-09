'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronLeft, Home, Search, RefreshCw, Loader2,
  Video, Users, Calendar, Clock, Award,
  Download, Printer, BarChart3, Eye, EyeOff,
  ChevronDown, ChevronRight, CheckCircle,
  Monitor, Smartphone,
} from 'lucide-react';

/* ── Colors ── */
const GRADE_COLORS: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-500' },
  B: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-500' },
  C: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500' },
  D: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', badge: 'bg-orange-500' },
  E: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', badge: 'bg-red-500' },
};

const GRADE_LABELS: Record<string, string> = {
  A: 'Excellent',
  B: 'Good',
  C: 'Average',
  D: 'Below Avg',
  E: 'Poor',
};

interface SessionParticipant {
  name: string;
  email: string;
  joinTime: string;
  leaveTime: string;
  durationSeconds: number;
  durationFormatted: string;
  attendancePercent: number;
  videoOn: boolean;
  grade: string;
  gradeLabel: string;
}

interface SessionDetail {
  uuid: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  participantCount: number;
  participants: SessionParticipant[];
}

interface ParticipantAnalysis {
  name: string;
  email: string;
  joinTime: string;
  leaveTime: string;
  durationSeconds: number;
  durationFormatted: string;
  attendancePercent: number;
  videoOn: boolean;
  grade: string;
  gradeLabel: string;
  sessionsAttended: number;
  totalSessions: number;
  device?: string;
  location?: string;
}

interface MeetingAnalytics {
  meetingId: string;
  topic: string;
  totalSessions: number;
  sessionDates: string[];
  totalUniqueParticipants: number;
  avgAttendance: number;
  participants: ParticipantAnalysis[];
  gradeDistribution: Record<string, number>;
  sessions: SessionDetail[];
  _warning?: string;
  _errors?: string[];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return iso; }
}

function formatDateTime(iso: string) {
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/* ══════════════════════════════════════════════════════════════════════════ */

function ZoomAnalyticsPageInner() {
  const token = useAuth();
  const router = useRouter();
  const isAdmin = !!token; // useAuth redirects to login if no token
  const printRef = useRef<HTMLDivElement>(null);

  const [meetingId, setMeetingId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MeetingAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'participants' | 'sessions'>('overview');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (!meetingId.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      let url = `/api/admin/crm/zoom-analytics?meetingId=${encodeURIComponent(meetingId.trim())}`;
      if (fromDate) url += `&from=${fromDate}`;
      if (toDate) url += `&to=${toDate}`;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to fetch');
      setData(json.data || json);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [meetingId, fromDate, toDate, token]);

  // Print / Export A4 PDF
  const handleExport = useCallback(() => {
    if (!printRef.current || !data) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const gradeRows = data.participants.map((p, i) => `
      <tr style="border-bottom:1px solid #e5e7eb;${i % 2 === 0 ? '' : 'background:#f9fafb;'}">
        <td style="padding:6px 10px;font-size:11px;">${i + 1}</td>
        <td style="padding:6px 10px;font-size:11px;font-weight:600;">${p.name}</td>
        <td style="padding:6px 10px;font-size:11px;">${p.email || '—'}</td>
        <td style="padding:6px 10px;font-size:11px;">${p.sessionsAttended}/${p.totalSessions}</td>
        <td style="padding:6px 10px;font-size:11px;">${p.durationFormatted}</td>
        <td style="padding:6px 10px;font-size:11px;">${p.attendancePercent}%</td>
        <td style="padding:6px 10px;font-size:11px;">${p.videoOn ? '✅ On' : '❌ Off'}</td>
        <td style="padding:6px 10px;font-size:11px;text-align:center;">
          <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-weight:700;font-size:12px;color:#fff;background:${
            p.grade === 'A' ? '#10B981' : p.grade === 'B' ? '#3B82F6' : p.grade === 'C' ? '#F59E0B' : p.grade === 'D' ? '#F97316' : '#EF4444'
          };">${p.grade}</span>
        </td>
      </tr>
    `).join('');

    const sessionBlocks = data.sessions.map((s, si) => `
      <div style="margin-top:20px;page-break-inside:avoid;">
        <h3 style="font-size:13px;font-weight:700;margin-bottom:6px;color:#374151;">
          Session ${si + 1}: ${formatDate(s.startTime)} (${s.participantCount} participants, ${s.duration} min)
        </h3>
        <table style="width:100%;border-collapse:collapse;border:1px solid #d1d5db;font-size:10px;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #d1d5db;">#</th>
              <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #d1d5db;">Name</th>
              <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #d1d5db;">Join Time</th>
              <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #d1d5db;">Leave Time</th>
              <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #d1d5db;">Duration</th>
              <th style="padding:4px 8px;text-align:left;border-bottom:1px solid #d1d5db;">Attendance</th>
              <th style="padding:4px 8px;text-align:center;border-bottom:1px solid #d1d5db;">Grade</th>
            </tr>
          </thead>
          <tbody>
            ${s.participants.map((sp, spi) => `
              <tr style="${spi % 2 === 1 ? 'background:#f9fafb;' : ''}">
                <td style="padding:3px 8px;">${spi + 1}</td>
                <td style="padding:3px 8px;font-weight:600;">${sp.name}</td>
                <td style="padding:3px 8px;">${formatTime(sp.joinTime)}</td>
                <td style="padding:3px 8px;">${formatTime(sp.leaveTime)}</td>
                <td style="padding:3px 8px;">${sp.durationFormatted}</td>
                <td style="padding:3px 8px;">${sp.attendancePercent}%</td>
                <td style="padding:3px 8px;text-align:center;">
                  <span style="display:inline-block;padding:1px 8px;border-radius:10px;font-weight:700;font-size:10px;color:#fff;background:${
                    sp.grade === 'A' ? '#10B981' : sp.grade === 'B' ? '#3B82F6' : sp.grade === 'C' ? '#F59E0B' : sp.grade === 'D' ? '#F97316' : '#EF4444'
                  };">${sp.grade}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    const gradeDistHTML = Object.entries(data.gradeDistribution)
      .map(([g, c]) => `<span style="display:inline-block;margin-right:16px;font-size:12px;">
        <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${
          g === 'A' ? '#10B981' : g === 'B' ? '#3B82F6' : g === 'C' ? '#F59E0B' : g === 'D' ? '#F97316' : '#EF4444'
        };color:#fff;text-align:center;line-height:20px;font-weight:700;font-size:10px;margin-right:4px;">${g}</span>
        ${GRADE_LABELS[g]}: <strong>${c}</strong>
      </span>`)
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Zoom Meeting Report – ${data.topic}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.5; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          h2 { font-size: 14px; color: #6366F1; margin-top: 20px; border-bottom: 2px solid #6366F1; padding-bottom: 4px; }
          .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
          .stats { display: flex; gap: 20px; margin: 12px 0; }
          .stat { background: #f3f4f6; padding: 10px 16px; border-radius: 8px; font-size: 12px; }
          .stat strong { font-size: 18px; display: block; color: #6366F1; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { font-size: 11px; text-transform: uppercase; color: #6b7280; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          .grade-legend { margin: 12px 0; padding: 10px; background: #f9fafb; border-radius: 8px; }
          .grade-legend-title { font-size: 11px; font-weight: 700; color: #6b7280; margin-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>📹 Zoom Meeting Report</h1>
        <div class="meta">
          <strong>${data.topic}</strong><br/>
          Meeting ID: ${data.meetingId} &nbsp;|&nbsp; 
          Sessions: ${data.totalSessions} &nbsp;|&nbsp;
          Dates: ${data.sessionDates.map(d => formatDate(d + 'T00:00:00')).join(', ')} &nbsp;|&nbsp;
          Generated: ${new Date().toLocaleString('en-IN')}
        </div>

        <div class="stats">
          <div class="stat"><strong>${data.totalUniqueParticipants}</strong>Unique Participants</div>
          <div class="stat"><strong>${data.totalSessions}</strong>Total Sessions</div>
          <div class="stat"><strong>${data.avgAttendance}%</strong>Avg Attendance</div>
        </div>

        <div class="grade-legend">
          <div class="grade-legend-title">GRADE DISTRIBUTION</div>
          ${gradeDistHTML}
        </div>

        <div style="margin-top:8px;font-size:10px;color:#6b7280;">
          <strong>Grading Criteria:</strong> A = ≥90% attendance &nbsp;|&nbsp; B = ≥70% &nbsp;|&nbsp; C = ≥50% &nbsp;|&nbsp; D = ≥30% &nbsp;|&nbsp; E = &lt;30%
        </div>

        <h2>Overall Participant Report</h2>
        <table style="border:1px solid #d1d5db;">
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">#</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Name</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Email</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Sessions</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Duration</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Attendance</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:2px solid #d1d5db;">Video</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:2px solid #d1d5db;">Grade</th>
            </tr>
          </thead>
          <tbody>${gradeRows}</tbody>
        </table>

        <h2 style="page-break-before:always;">Session-wise Details</h2>
        ${sessionBlocks}

        <div class="footer">
          Swar Yoga CRM – Zoom Meeting Analytics Report &nbsp;|&nbsp; swaryoga.com
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }, [data]);

  // CSV Export
  const handleCSVExport = useCallback(() => {
    if (!data) return;
    const headers = ['#', 'Name', 'Email', 'Sessions Attended', 'Total Sessions', 'Total Duration', 'Attendance %', 'Video On', 'Grade', 'Grade Label'];
    const rows = data.participants.map((p, i) => [
      i + 1, p.name, p.email || '', p.sessionsAttended, p.totalSessions,
      p.durationFormatted, p.attendancePercent, p.videoOn ? 'Yes' : 'No',
      p.grade, p.gradeLabel,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `zoom-report-${data.meetingId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  // Filter participants
  const filteredParticipants = data?.participants.filter(p => {
    const matchGrade = !gradeFilter || p.grade === gradeFilter;
    const q = searchTerm.toLowerCase().trim();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q);
    return matchGrade && matchSearch;
  }) || [];

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500">Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/crm" className="p-2 rounded-lg hover:bg-gray-100 transition">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100">
                  <Video className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Zoom Meeting Analytics</h1>
                  <p className="text-xs text-gray-500">Participant attendance, grades & reports</p>
                </div>
              </div>
            </div>
            <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-100 transition">
              <Home className="w-5 h-5 text-gray-500" />
            </Link>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter Zoom Meeting ID (e.g. 85012345678)"
                  value={meetingId}
                  onChange={(e) => setMeetingId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAnalytics()}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm font-medium"
                />
              </div>
              <button
                onClick={fetchAnalytics}
                disabled={loading || !meetingId.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold text-sm transition active:scale-95"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Analyze
              </button>
            </div>
            
            {/* Date range filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 font-semibold">Date Range (optional):</span>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                  placeholder="From"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                  placeholder="To"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => { setFromDate(''); setToDate(''); }}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <p className="font-semibold mb-1">Error</p>
              <p>{error}</p>
              {error.includes('not found') && (
                <p className="mt-2 text-xs text-red-500">
                  💡 <strong>Tips:</strong> Make sure you enter just the numeric meeting ID (e.g. 85012345678). 
                  The Zoom Reports API only works for past meetings that ended at least 2 hours ago.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
            <p className="text-gray-500 font-medium">Fetching Zoom meeting data...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a moment for meetings with many sessions.</p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div ref={printRef}>
            {/* Warning banner */}
            {data._warning && (
              <div className="mt-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold mb-1">Limited Data Available</p>
                    <p>{data._warning}</p>
                  </div>
                </div>
              </div>
            )}

            {/* API Errors banner */}
            {data._errors && data._errors.length > 0 && (
              <div className="mt-4 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
                <p className="font-semibold mb-2">Session Fetch Errors ({data._errors.length})</p>
                <ul className="list-disc pl-5 space-y-1 text-xs max-h-40 overflow-y-auto">
                  {data._errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {/* Meeting Header */}
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{data.topic}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Meeting ID: <span className="font-mono font-bold">{data.meetingId}</span>
                    {' '}&bull;{' '}
                    {data.totalSessions} session{data.totalSessions !== 1 ? 's' : ''}
                    {' '}&bull;{' '}
                    {data.sessionDates.length > 0 && (
                      <>
                        {formatDate(data.sessionDates[0] + 'T00:00:00')}
                        {data.sessionDates.length > 1 && ` – ${formatDate(data.sessionDates[data.sessionDates.length - 1] + 'T00:00:00')}`}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCSVExport}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-sm font-semibold transition"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 text-sm font-semibold transition"
                  >
                    <Printer className="w-4 h-4" /> A4 Report
                  </button>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Unique Participants" value={data.totalUniqueParticipants} color="indigo" />
              <StatCard icon={Calendar} label="Total Sessions" value={data.totalSessions} color="blue" />
              <StatCard icon={BarChart3} label="Avg Attendance" value={`${data.avgAttendance}%`} color="emerald" />
              <StatCard icon={Award} label="Grade A Count" value={data.gradeDistribution.A || 0} color="green" />
            </div>

            {/* Grade Distribution */}
            <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Grade Distribution</h3>
              <div className="grid grid-cols-5 gap-3">
                {(['A', 'B', 'C', 'D', 'E'] as const).map(g => {
                  const count = data.gradeDistribution[g] || 0;
                  const pct = data.totalUniqueParticipants > 0
                    ? Math.round((count / data.totalUniqueParticipants) * 100)
                    : 0;
                  const colors = GRADE_COLORS[g];
                  return (
                    <button
                      key={g}
                      onClick={() => setGradeFilter(gradeFilter === g ? null : g)}
                      className={`p-4 rounded-xl border-2 transition text-center ${
                        gradeFilter === g ? `${colors.border} ${colors.bg} ring-2 ring-offset-1` : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${colors.badge} text-white text-lg font-bold mb-2`}>
                        {g}
                      </div>
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">{GRADE_LABELS[g]} ({pct}%)</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
                <strong>Grading Criteria:</strong>{' '}
                <span className="text-emerald-600 font-semibold">A</span> = ≥90% attendance &nbsp;|&nbsp;
                <span className="text-indigo-600 font-semibold">B</span> = ≥70% &nbsp;|&nbsp;
                <span className="text-amber-600 font-semibold">C</span> = ≥50% &nbsp;|&nbsp;
                <span className="text-orange-600 font-semibold">D</span> = ≥30% &nbsp;|&nbsp;
                <span className="text-red-600 font-semibold">E</span> = &lt;30%
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
              {[
                { key: 'overview', label: 'Participants', icon: Users },
                { key: 'sessions', label: 'Sessions', icon: Calendar },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === tab.key
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Participants Tab */}
            {activeTab === 'overview' && (
              <div className="mt-4 bg-white rounded-2xl shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    Showing <strong>{filteredParticipants.length}</strong> of {data.totalUniqueParticipants}
                    {gradeFilter && (
                      <button onClick={() => setGradeFilter(null)} className="ml-2 text-indigo-600 hover:underline text-xs">
                        Clear filter
                      </button>
                    )}
                  </div>
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                        <th className="px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Participant</th>
                        <th className="px-4 py-3 text-left">Sessions</th>
                        <th className="px-4 py-3 text-left">Total Duration</th>
                        <th className="px-4 py-3 text-left">Attendance</th>
                        <th className="px-4 py-3 text-center">Video</th>
                        <th className="px-4 py-3 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredParticipants.map((p, i) => {
                        const colors = GRADE_COLORS[p.grade] || GRADE_COLORS.E;
                        return (
                          <tr key={i} className={`hover:bg-gray-50 transition ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                            <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-semibold text-gray-900">{p.name}</div>
                              {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                              {p.device && <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Monitor className="w-3 h-3" /> {p.device}</div>}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <span className="font-semibold">{p.sessionsAttended}</span>
                              <span className="text-gray-400">/{p.totalSessions}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 font-mono">{p.durationFormatted}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="h-2 rounded-full transition-all"
                                    style={{
                                      width: `${p.attendancePercent}%`,
                                      backgroundColor: p.attendancePercent >= 90 ? '#10B981' : p.attendancePercent >= 70 ? '#3B82F6' : p.attendancePercent >= 50 ? '#F59E0B' : p.attendancePercent >= 30 ? '#F97316' : '#EF4444',
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-semibold text-gray-700">{p.attendancePercent}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {p.videoOn ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                                  <Eye className="w-3.5 h-3.5" /> On
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400 font-semibold">
                                  <EyeOff className="w-3.5 h-3.5" /> Off
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${colors.badge}`}>
                                {p.grade}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredParticipants.map((p, i) => {
                    const colors = GRADE_COLORS[p.grade] || GRADE_COLORS.E;
                    return (
                      <div key={i} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-sm font-bold text-gray-900">{p.name}</span>
                            {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                          </div>
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${colors.badge}`}>
                            {p.grade}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-gray-400">Sessions</div>
                            <div className="font-bold text-gray-700">{p.sessionsAttended}/{p.totalSessions}</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-gray-400">Attendance</div>
                            <div className="font-bold text-gray-700">{p.attendancePercent}%</div>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-2 py-1.5 text-center">
                            <div className="text-gray-400">Video</div>
                            <div className={`font-bold ${p.videoOn ? 'text-emerald-600' : 'text-gray-400'}`}>
                              {p.videoOn ? 'On' : 'Off'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredParticipants.length === 0 && (
                  <div className="p-12 text-center text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-semibold">No participants found</p>
                  </div>
                )}
              </div>
            )}

            {/* Sessions Tab */}
            {activeTab === 'sessions' && (
              <div className="mt-4 space-y-3">
                {data.sessions.map((s, si) => (
                  <div key={s.uuid} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedSession(expandedSession === s.uuid ? null : s.uuid)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 font-bold text-sm">
                          {si + 1}
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">
                            {formatDate(s.startTime)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTime(s.startTime)} – {formatTime(s.endTime)}
                            {' '}&bull;{' '}{s.duration} min
                            {' '}&bull;{' '}{s.participantCount} participant{s.participantCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      {expandedSession === s.uuid ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {expandedSession === s.uuid && (
                      <div className="border-t border-gray-100">
                        {/* Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <th className="px-4 py-2 text-left">#</th>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Join Time</th>
                                <th className="px-4 py-2 text-left">Leave Time</th>
                                <th className="px-4 py-2 text-left">Duration</th>
                                <th className="px-4 py-2 text-left">Attendance</th>
                                <th className="px-4 py-2 text-center">Video</th>
                                <th className="px-4 py-2 text-center">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {s.participants.map((sp, spi) => {
                                const colors = GRADE_COLORS[sp.grade] || GRADE_COLORS.E;
                                return (
                                  <tr key={spi} className={`${spi % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                                    <td className="px-4 py-2 text-gray-400">{spi + 1}</td>
                                    <td className="px-4 py-2 font-semibold text-gray-900">{sp.name}</td>
                                    <td className="px-4 py-2 text-gray-600 font-mono text-xs">{formatTime(sp.joinTime)}</td>
                                    <td className="px-4 py-2 text-gray-600 font-mono text-xs">{formatTime(sp.leaveTime)}</td>
                                    <td className="px-4 py-2 text-gray-700 font-mono">{sp.durationFormatted}</td>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                          <div
                                            className="h-1.5 rounded-full"
                                            style={{
                                              width: `${sp.attendancePercent}%`,
                                              backgroundColor: sp.attendancePercent >= 90 ? '#10B981' : sp.attendancePercent >= 70 ? '#3B82F6' : sp.attendancePercent >= 50 ? '#F59E0B' : sp.attendancePercent >= 30 ? '#F97316' : '#EF4444',
                                            }}
                                          />
                                        </div>
                                        <span className="text-xs font-semibold">{sp.attendancePercent}%</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      {sp.videoOn ? (
                                        <Eye className="w-4 h-4 text-emerald-500 mx-auto" />
                                      ) : (
                                        <EyeOff className="w-4 h-4 text-gray-300 mx-auto" />
                                      )}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${colors.badge}`}>
                                        {sp.grade}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden divide-y divide-gray-100">
                          {s.participants.map((sp, spi) => {
                            const colors = GRADE_COLORS[sp.grade] || GRADE_COLORS.E;
                            return (
                              <div key={spi} className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-bold text-gray-900">{sp.name}</span>
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${colors.badge}`}>
                                    {sp.grade}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div><span className="text-gray-400">In:</span> {formatTime(sp.joinTime)}</div>
                                  <div><span className="text-gray-400">Out:</span> {formatTime(sp.leaveTime)}</div>
                                  <div><span className="text-gray-400">Duration:</span> {sp.durationFormatted}</div>
                                  <div><span className="text-gray-400">Attendance:</span> {sp.attendancePercent}%</div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {s.participants.length === 0 && (
                          <div className="p-8 text-center text-gray-400 text-sm">
                            No participant data for this session.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="mt-16 text-center">
            <Video className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-400 mb-2">Enter a Zoom Meeting ID</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Paste any Zoom meeting ID to get detailed participant analytics,
              attendance tracking, in/out times, and A-E grades with an exportable A4 report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Stat Card Component ── */
function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: number | string; color: string;
}) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600',
    blue: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    green: 'bg-green-100 text-green-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function ZoomAnalyticsPage() {
  return <ZoomAnalyticsPageInner />;
}
