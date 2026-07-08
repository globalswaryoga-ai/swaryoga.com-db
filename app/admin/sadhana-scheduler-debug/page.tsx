'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Play, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SchedulerStatus {
  running: boolean;
  lastCheck: string;
  nextCheck: string;
  activeSchedules: number;
  lastError?: string;
  uptime: string;
}

interface ScheduleLog {
  timestamp: string;
  eventType: 'bot_join' | 'video_start' | 'meeting_close' | 'error' | 'check';
  scheduleId: string;
  scheduleName: string;
  status: 'success' | 'pending' | 'failed';
  message: string;
  details?: any;
}

export default function SadhanaSchedulerDebugPage() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [logs, setLogs] = useState<ScheduleLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<string>('all');

  // Fetch scheduler status
  useEffect(() => {
    fetchStatus();
    const interval = autoRefresh ? setInterval(fetchStatus, 5000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/sadhana-scheduler/status');
      const data = await response.json();
      setSchedulerStatus(data.status);
      setLogs(data.logs || []);
    } catch (error) {
      console.error('[Debug] Error fetching status:', error);
      setSchedulerStatus({
        running: false,
        lastCheck: new Date().toISOString(),
        nextCheck: new Date(Date.now() + 60000).toISOString(),
        activeSchedules: 0,
        lastError: error instanceof Error ? error.message : 'Unknown error',
        uptime: '0m',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualTrigger = async (scheduleId: string) => {
    try {
      const response = await fetch(`/api/admin/sadhana-scheduler/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId }),
      });
      const result = await response.json();

      if (result.success) {
        alert(`✅ Triggered: ${result.message}`);
        fetchStatus();
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to trigger: ${error}`);
    }
  };

  const handleRestartScheduler = async () => {
    if (!confirm('Restart scheduler? This will refresh all active sessions.')) return;

    try {
      const response = await fetch(`/api/admin/sadhana-scheduler/restart`, {
        method: 'POST',
      });
      const result = await response.json();
      alert(result.success ? '✅ Scheduler restarted' : `❌ ${result.error}`);
      fetchStatus();
    } catch (error) {
      alert(`❌ Failed: ${error}`);
    }
  };

  const filteredLogs = selectedSchedule === 'all'
    ? logs
    : logs.filter(l => l.scheduleId === selectedSchedule);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🧘 Sadhana Scheduler Debug</h1>
            <p className="text-gray-600 mt-2">Monitor and control sadhana session automation</p>
          </div>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <span className="text-sm">Auto-refresh (5s)</span>
            </label>
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Cards */}
        {schedulerStatus && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Running Status */}
            <div className={`p-6 rounded-lg border-2 ${schedulerStatus.running ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {schedulerStatus.running ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-semibold text-gray-900">Status</h3>
              </div>
              <p className={`text-2xl font-bold ${schedulerStatus.running ? 'text-green-600' : 'text-red-600'}`}>
                {schedulerStatus.running ? 'RUNNING' : 'STOPPED'}
              </p>
              <p className="text-xs text-gray-600 mt-2">Uptime: {schedulerStatus.uptime}</p>
            </div>

            {/* Active Schedules */}
            <div className="p-6 rounded-lg border-2 border-blue-200 bg-blue-50">
              <h3 className="font-semibold text-gray-900 mb-2">Active Schedules</h3>
              <p className="text-2xl font-bold text-blue-600">{schedulerStatus.activeSchedules}</p>
              <p className="text-xs text-gray-600 mt-2">Ready to run</p>
            </div>

            {/* Last Check */}
            <div className="p-6 rounded-lg border-2 border-purple-200 bg-purple-50">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Last Check</h3>
              </div>
              <p className="text-sm text-purple-600 font-mono">
                {new Date(schedulerStatus.lastCheck).toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-600 mt-2">Next: {new Date(schedulerStatus.nextCheck).toLocaleTimeString()}</p>
            </div>

            {/* Error Status */}
            <div className={`p-6 rounded-lg border-2 ${schedulerStatus.lastError ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <h3 className="font-semibold text-gray-900 mb-2">Last Error</h3>
              <p className="text-sm text-gray-600 break-words">
                {schedulerStatus.lastError ? (
                  <span className="text-yellow-700">{schedulerStatus.lastError}</span>
                ) : (
                  <span className="text-green-700">✅ No errors</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 p-6 bg-white rounded-lg border-2 border-gray-200">
          <h3 className="font-semibold mb-4">🎮 Admin Controls</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleRestartScheduler}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
            >
              🔄 Restart Scheduler
            </button>
            <button
              onClick={fetchStatus}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              📊 Force Status Sync
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-3">
            ⚠️ Restart will re-initialize all scheduler components
          </p>
        </div>

        {/* Logs Section */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">📋 Scheduler Logs</h3>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="all">All Schedules</option>
              <option value="daily-morning">Daily Morning Sadhana - TEST</option>
              <option value="evening">Evening Sadhana</option>
            </select>
          </div>

          {/* Log Entries */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No logs yet. Waiting for scheduler check...
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    log.status === 'success'
                      ? 'bg-green-50 border-green-400'
                      : log.status === 'failed'
                      ? 'bg-red-50 border-red-400'
                      : 'bg-yellow-50 border-yellow-400'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-600">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status === 'success'
                            ? 'bg-green-200 text-green-800'
                            : log.status === 'failed'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                          {log.eventType.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-2">
                        {log.scheduleName}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                      {log.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer font-mono">
                            Details
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    {log.eventType !== 'check' && (
                      <button
                        onClick={() => handleManualTrigger(log.scheduleId)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap ml-4"
                      >
                        <Play className="h-3 w-3 inline mr-1" />
                        Trigger
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Troubleshooting Guide */}
        <div className="mt-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">🔧 Troubleshooting</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div>
              <strong>Bot not joining?</strong>
              <ul className="ml-4 mt-1 space-y-1 text-xs">
                <li>✓ Check scheduler is RUNNING (green status above)</li>
                <li>✓ Verify Zoom meeting link is valid</li>
                <li>✓ Check ZOOM_BOT_ACCOUNT_ID, ZOOM_BOT_CLIENT_ID, ZOOM_BOT_CLIENT_SECRET</li>
                <li>✓ Look for errors in logs above</li>
              </ul>
            </div>
            <div>
              <strong>Video not auto-playing?</strong>
              <ul className="ml-4 mt-1 space-y-1 text-xs">
                <li>✓ Check Hetzner streaming service: curl http://5.223.65.159:3001/health</li>
                <li>✓ Verify HLS URL is accessible</li>
                <li>✓ Check Zoom RTMP stream is enabled</li>
              </ul>
            </div>
            <div>
              <strong>Scheduler frozen?</strong>
              <ul className="ml-4 mt-1 space-y-1 text-xs">
                <li>✓ Click "Restart Scheduler" button above</li>
                <li>✓ Check server logs: grep "[SadhanaScheduler]" /var/log/app.log</li>
                <li>✓ Verify MongoDB is accessible</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
