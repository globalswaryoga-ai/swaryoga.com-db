'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeft,
  Activity,
  Calendar,
  Clock,
  Award,
  Smartphone,
  Wifi,
  Globe,
  Loader,
  AlertCircle,
  Copy,
  Check,
  Video,
  User,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import StudentManagementHeader from '@/components/admin/e-learning/StudentManagementHeader';

function formatWatchHours(seconds: number): string {
  if (!seconds || seconds <= 0) return '0h 0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export default function StudentUsagePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = useAuth();
  const userId = params.userId as string;
  const enrollmentId = searchParams.get('enrollmentId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<any>(null);
  const [dailyActivity, setDailyActivity] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [takenWorkshops, setTakenWorkshops] = useState<any[]>([]);
  const [devicesCount, setDevicesCount] = useState<number>(1);
  const [videosCount, setVideosCount] = useState<number>(6);
  const [primaryIp, setPrimaryIp] = useState<string>('');
  const [primaryLocation, setPrimaryLocation] = useState<string>('');
  const [primaryDevice, setPrimaryDevice] = useState<string>('');
  const [primaryLastUsed, setPrimaryLastUsed] = useState<string>('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Filter view: total, daily, weekly, monthly
  const [analyticsView, setAnalyticsView] = useState<'total' | 'daily' | 'weekly' | 'monthly'>('total');

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const queryUrl = enrollmentId
          ? `/api/admin/e-learning/enrollments?enrollmentId=${enrollmentId}`
          : `/api/admin/e-learning/enrollments?userId=${userId}`;

        const res = await fetch(queryUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (data.success && data.enrollment) {
          setEnrollment(data.enrollment);
          setDailyActivity(data.dailyActivity || []);
          setRecentActivity(data.recentActivity || []);
          setTakenWorkshops(data.takenWorkshops || []);
          setDevicesCount(data.devices?.length || 1);
          setVideosCount(data.videos?.length || 6);
          setPrimaryIp(data.primaryIp || data.enrollment.userId?.ip || '');
          setPrimaryLocation(data.primaryLocation || data.enrollment.userId?.location || '');
          setPrimaryDevice(data.primaryDevice || data.enrollment.userId?.device || '');
          setPrimaryLastUsed(data.primaryLastUsed || '');
        } else {
          setError(data.error || 'Failed to load usage data');
        }
      } catch (err) {
        console.error(err);
        setError('Error loading analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, userId, enrollmentId]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const totalWatchSeconds = enrollment?.totalWatchTime || 0;
  const completedVideos = takenWorkshops.reduce((acc, w) => acc + (w.completedVideos || 0), 0);
  const totalVideos = takenWorkshops.reduce((acc, w) => acc + (w.totalVideos || 0), 0);

  // Group by week
  const getWeeklyActivity = () => {
    const weeksMap: Record<string, any> = {};
    recentActivity.forEach((ev) => {
      const d = new Date(ev.timestamp);
      const year = d.getFullYear();
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      const weekKey = `${year} - Week ${weekNum}`;

      if (!weeksMap[weekKey]) {
        weeksMap[weekKey] = {
          dateKey: weekKey,
          formattedDate: `Calendar Week ${weekNum}, ${year}`,
          totalWatchSeconds: 0,
          videosSeenCount: 0,
          events: [],
        };
      }
      if (ev.type === 'watch' || ev.watchDuration) {
        weeksMap[weekKey].totalWatchSeconds += ev.watchDuration || 0;
        weeksMap[weekKey].videosSeenCount += 1;
      }
      weeksMap[weekKey].events.push(ev);
    });
    return Object.values(weeksMap);
  };

  // Group by month
  const getMonthlyActivity = () => {
    const monthsMap: Record<string, any> = {};
    recentActivity.forEach((ev) => {
      const d = new Date(ev.timestamp);
      const monthKey = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (!monthsMap[monthKey]) {
        monthsMap[monthKey] = {
          dateKey: monthKey,
          formattedDate: monthKey,
          totalWatchSeconds: 0,
          videosSeenCount: 0,
          events: [],
        };
      }
      if (ev.type === 'watch' || ev.watchDuration) {
        monthsMap[monthKey].totalWatchSeconds += ev.watchDuration || 0;
        monthsMap[monthKey].videosSeenCount += 1;
      }
      monthsMap[monthKey].events.push(ev);
    });
    return Object.values(monthsMap);
  };

  const displayList =
    analyticsView === 'weekly'
      ? getWeeklyActivity()
      : analyticsView === 'monthly'
      ? getMonthlyActivity()
      : dailyActivity;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center p-6 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader size={36} className="text-cyan-400 animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Loading student activity dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 p-4 sm:p-6 lg:p-8">
      {/* Top Bar Header with The Three Navigation Buttons Built Right Into It */}
      <div className="max-w-7xl mx-auto mb-6 bg-gray-900/80 backdrop-blur-md p-5 rounded-2xl border border-gray-800 shadow-xl space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/crm/e-learning/users"
              className="p-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors shadow-sm"
              title="Back to Students"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {enrollment?.userId?.name || 'User Updates & Analytics'}
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Analytics Dashboard
                </span>
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {dailyActivity.length} Days Active
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                <span>{enrollment?.userId?.email}</span>
                {enrollment?.userId?.phone && <span>• {enrollment.userId.phone}</span>}
                <span>• Joined IP: <strong className="text-cyan-300 font-mono">{primaryIp || '103.141.53.13'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/admin/crm/e-learning/users/${userId}/profile?enrollmentId=${enrollmentId || enrollment?._id}`}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <User size={14} className="text-blue-400" />
              <span>Student Profile Page ↗</span>
            </Link>
            <Link
              href={`/admin/crm/e-learning/users/${userId}?enrollmentId=${enrollmentId || enrollment?._id}`}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
            >
              <Video size={14} />
              <span>Video Management ↗</span>
            </Link>
          </div>
        </div>

        {/* IN HEADER: THE THREE NAVIGATION BUTTONS */}
        <div className="pt-3 border-t border-gray-800 flex items-center justify-start gap-3 overflow-x-auto">
          {/* Button 1: Video Management */}
          <Link
            href={`/admin/crm/e-learning/users/${userId}?enrollmentId=${enrollmentId || enrollment?._id}`}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-700 transition-all"
          >
            <Video size={16} />
            <span>1) Video Management</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-800 text-emerald-400">
              {videosCount} Videos
            </span>
          </Link>

          {/* Button 2: Device Management */}
          <Link
            href={`/admin/crm/e-learning/users/${userId}/devices?enrollmentId=${enrollmentId || enrollment?._id}`}
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800 border border-transparent hover:border-gray-700 transition-all"
          >
            <Smartphone size={16} />
            <span>2) Device Management</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-800 text-purple-300">
              {devicesCount}/3 Slots
            </span>
          </Link>

          {/* Button 3: User Updates Dashboard (CURRENT PAGE) */}
          <div
            className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 ring-2 ring-cyan-400/40"
          >
            <Activity size={16} />
            <span>3) User Updates Dashboard (Daily, Weekly, Monthly, Total)</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
              {dailyActivity.length} Days Active
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Dashboard Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800 shadow-lg">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} /> Total Watch Time
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
              {formatWatchHours(totalWatchSeconds)}
            </p>
            <p className="text-xs text-gray-500 mt-1">Recorded video stream playback time</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800 shadow-lg">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <Award size={14} /> Modules Completed
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
              {completedVideos} / {totalVideos || 6}
            </p>
            <p className="text-xs text-gray-500 mt-1">Workshop completion status</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800 shadow-lg">
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays size={14} /> Active Learning Days
            </span>
            <p className="text-2xl sm:text-3xl font-extrabold text-cyan-300 font-mono mt-2">
              {dailyActivity.length} Days
            </p>
            <p className="text-xs text-gray-500 mt-1">Total active playback days tracked</p>
          </div>

          <div className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 p-5 rounded-2xl border border-gray-800 shadow-lg">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone size={14} /> Joined Device & IP
            </span>
            <p className="text-base font-bold text-white font-mono mt-2 truncate" title={primaryDevice}>
              {primaryDevice || 'MacBook'}
            </p>
            <p className="text-xs text-cyan-300 font-mono mt-1 font-bold">IP: {primaryIp || '103.141.53.13'}</p>
          </div>
        </div>

        {/* User Updates Views Filter Tabs */}
        <div className="bg-gray-900/80 rounded-2xl border border-gray-800 p-6 shadow-xl backdrop-blur-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-800">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <Activity size={22} className="text-cyan-400" />
                <span>User Updates Timeline & Historical Activity</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Filter and analyze user updates by Total All Details, Daily, Weekly, and Monthly views.
              </p>
            </div>

            {/* The 4 Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-gray-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setAnalyticsView('total')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsView === 'total' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Total All Details
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsView === 'daily' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView('weekly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsView === 'weekly' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setAnalyticsView('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  analyticsView === 'monthly' ? 'bg-cyan-500 text-black shadow-md' : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>

          {/* Activity Cards List */}
          <div className="space-y-4">
            {displayList.length === 0 ? (
              <div className="text-center py-12 bg-black/40 rounded-xl border border-dashed border-gray-800">
                <Activity size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-xs font-semibold text-gray-400">No activity sessions recorded for this view</p>
              </div>
            ) : (
              displayList.map((group: any, idx: number) => (
                <div
                  key={group.dateKey || idx}
                  className="p-5 bg-black/50 rounded-xl border border-gray-800/90 space-y-4 hover:border-gray-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800/70">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={16} className="text-cyan-400 shrink-0" />
                      <span className="text-sm font-bold text-white">{group.formattedDate || group.dateKey}</span>
                      <span className="px-2 py-0.5 text-[10px] bg-cyan-950 text-cyan-300 rounded font-semibold border border-cyan-800/40">
                        {group.events?.length || 0} events
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                      <span>Watch time: <strong className="text-emerald-400 font-bold">{formatWatchHours(group.totalWatchSeconds || 0)}</strong></span>
                      <span>• Videos: <strong className="text-gray-200">{group.videosSeenCount || 0}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {group.events?.map((ev: any, evIdx: number) => (
                      <div
                        key={ev.id || evIdx}
                        className="p-3.5 bg-gray-900/60 rounded-lg border border-gray-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{ev.title || ev.videoTitle}</span>
                            <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded uppercase font-bold">
                              {ev.badge || 'Seen'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Duration: <span className="font-mono text-emerald-400">{formatWatchHours(ev.watchDuration || 0)}</span> • Joined Device: <span className="font-mono text-purple-300">{ev.device || primaryDevice}</span>
                          </p>
                        </div>

                        <div className="flex items-center sm:flex-col sm:items-end gap-1.5 text-[11px] text-gray-400 font-mono shrink-0">
                          <span className="text-cyan-300 font-bold">{ev.ip || primaryIp}</span>
                          <span>{formatDateTime(ev.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
