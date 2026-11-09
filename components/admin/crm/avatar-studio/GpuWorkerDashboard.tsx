'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Activity,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Clock,
  Layers,
  Terminal,
  Mail,
  ShieldAlert,
} from 'lucide-react';

interface GpuWorker {
  id: string;
  slotNumber: number;
  accountEmail: string;
  provider: 'google_colab' | 'kaggle' | 'self_hosted';
  gpuModel: string;
  totalVramMb: number;
  availableVramMb: number;
  cudaVersion: string;
  pythonVersion: string;
  installedModels: string[];
  assignedTaskCategory: string;
  status: 'idle' | 'busy' | 'offline' | 'expired';
  currentJobId: string | null;
  lastHeartbeatAt: string;
  runtimeExpiresAt: string | null;
}

interface QueueStats {
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
  totalFailed: number;
}

interface SlotConfig {
  slotNumber: number;
  workerLabel: string;
  accountEmail: string;
  provider: string;
  assignedTask: string;
  taskCategory: string;
  model: string;
  notebookUrl: string;
}

const CONFIGURED_SLOTS: SlotConfig[] = [
  {
    slotNumber: 1,
    workerLabel: 'GPU 1',
    accountEmail: 'swarsakshi9@gmail.com',
    provider: 'Colab',
    assignedTask: 'MuseTalk',
    taskCategory: 'lip_sync_musetalk',
    model: 'MuseTalk + Whisper',
    notebookUrl: '/colab/Worker_1_MuseTalk_Colab.ipynb',
  },
  {
    slotNumber: 2,
    workerLabel: 'GPU 2',
    accountEmail: 'swarsakshi9999@gmail.com',
    provider: 'Colab',
    assignedTask: 'Face AI',
    taskCategory: 'face_reconstruction',
    model: 'LivePortrait / 3DDFA',
    notebookUrl: '/colab/Worker_2_FaceRecon_Colab.ipynb',
  },
  {
    slotNumber: 3,
    workerLabel: 'GPU 3',
    accountEmail: 'swarsakshi9@gmail.com',
    provider: 'Kaggle',
    assignedTask: 'Motion AI',
    taskCategory: 'motion_generation',
    model: 'MotionDiffusion / SMPL-X',
    notebookUrl: '/colab/Worker_3_Motion_Kaggle.ipynb',
  },
  {
    slotNumber: 4,
    workerLabel: 'GPU 4',
    accountEmail: 'swarsakshi9999@gmail.com',
    provider: 'Kaggle',
    assignedTask: 'Video Enhancement',
    taskCategory: 'scene_enhancement',
    model: 'Real-ESRGAN / CodeFormer',
    notebookUrl: '/colab/Worker_4_SceneEnhance_Kaggle.ipynb',
  },
];

export default function GpuWorkerDashboard() {
  const [workers, setWorkers] = useState<GpuWorker[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats>({
    totalQueued: 0,
    totalRunning: 0,
    totalCompleted: 0,
    totalFailed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  const fetchWorkerStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/avatar/gpu-workers', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setWorkers(data.workers || []);
        if (data.queueStats) {
          setQueueStats(data.queueStats);
        }
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to load GPU worker status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkerStatus();
    const interval = setInterval(fetchWorkerStatus, 15000); // 15s polling
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (worker?: GpuWorker) => {
    if (!worker || worker.status === 'offline') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
          Offline (Awaiting Heartbeat)
        </span>
      );
    }

    switch (worker.status) {
      case 'idle':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online (Idle)
          </span>
        );
      case 'busy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Inferencing
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Session Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            Offline
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Queue Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white">4-GPU Cluster (Two Google Accounts)</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            4 independent sessions distributed across <code className="text-amber-400">swarsakshi9@gmail.com</code> and{' '}
            <code className="text-amber-400">swarsakshi9999@gmail.com</code>.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-xs">
            <div>
              <span className="text-slate-500 block">Queue Waiting</span>
              <span className="font-bold text-amber-400">{queueStats.totalQueued}</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-slate-500 block">Rendering</span>
              <span className="font-bold text-sky-400">{queueStats.totalRunning}</span>
            </div>
            <div className="w-px h-6 bg-slate-800" />
            <div>
              <span className="text-slate-500 block">Completed</span>
              <span className="font-bold text-emerald-400">{queueStats.totalCompleted}</span>
            </div>
          </div>

          <button
            onClick={fetchWorkerStatus}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Structured Account Allocation Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Account & Hardware Allocation Matrix</h3>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Zero credentials stored • Dynamic hardware detection
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Worker</th>
                <th className="py-3 px-4 font-semibold">Google Account</th>
                <th className="py-3 px-4 font-semibold">Provider</th>
                <th className="py-3 px-4 font-semibold">Assigned Task</th>
                <th className="py-3 px-4 font-semibold">Detected GPU & VRAM</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Notebook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {CONFIGURED_SLOTS.map((slot) => {
                const live = workers.find((w) => w.slotNumber === slot.slotNumber);
                const hasLivePing = live && live.status !== 'offline' && live.status !== 'expired';

                return (
                  <tr key={slot.slotNumber} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-bold text-amber-400 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-amber-400" />
                      {slot.workerLabel}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-200">
                      <span className="inline-flex items-center gap-1">
                        <Mail className="w-3 h-3 text-sky-400" />
                        {slot.accountEmail}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] border border-slate-700">
                        {slot.provider}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">
                      <div>{slot.assignedTask}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{slot.taskCategory}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {hasLivePing ? (
                        <span className="text-emerald-400 font-semibold font-mono">
                          {live.gpuModel} ({live.totalVramMb} MB)
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">
                          Awaiting startup (hardware detected on connect)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(live)}</td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={slot.notebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-400/10 hover:bg-amber-400/20 text-amber-400 rounded-lg font-medium transition border border-amber-400/30"
                      >
                        Launch <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4 Interactive Worker Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CONFIGURED_SLOTS.map((slot) => {
          const registered = workers.find((w) => w.slotNumber === slot.slotNumber);
          const isOnline = registered && registered.status !== 'offline' && registered.status !== 'expired';

          return (
            <div
              key={slot.slotNumber}
              className={`flex flex-col justify-between p-5 rounded-2xl border transition-all ${
                isOnline
                  ? 'bg-slate-900/90 border-slate-700/80 shadow-lg shadow-black/40'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-80'
              }`}
            >
              <div>
                {/* Slot Badge & Status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold tracking-wider uppercase text-amber-400/90 bg-amber-400/10 px-2.5 py-0.5 rounded-md border border-amber-400/20">
                    {slot.workerLabel}
                  </span>
                  {getStatusBadge(registered)}
                </div>

                {/* Worker Title & Provider */}
                <h3 className="font-semibold text-white text-base leading-snug">{slot.assignedTask}</h3>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                  <span className="text-slate-300 font-medium">{slot.provider}</span>
                  <span>•</span>
                  <span className="text-sky-400 font-mono text-[11px] truncate">{slot.accountEmail}</span>
                </div>

                {/* VRAM Progress Meter */}
                <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-sky-400" /> Detected VRAM
                    </span>
                    <span className="text-slate-200 font-mono text-[11px]">
                      {isOnline ? `${registered.availableVramMb} MB Free` : 'Detected on Launch'}
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        registered?.status === 'busy'
                          ? 'bg-amber-400'
                          : isOnline
                          ? 'bg-emerald-400'
                          : 'bg-slate-700'
                      }`}
                      style={{
                        width: isOnline
                          ? `${Math.max(10, Math.min(100, (1 - registered.availableVramMb / registered.totalVramMb) * 100))}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>

                {/* Active Task / Installed Model */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Hardware:</span>
                    <span className="text-slate-300 font-mono text-[11px] truncate max-w-[130px]">
                      {isOnline ? registered.gpuModel : 'Detecting...'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Target Model:</span>
                    <span className="text-amber-400 font-medium text-[11px]">{slot.model}</span>
                  </div>
                  {registered?.currentJobId && (
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Active Job:</span>
                      <span className="text-sky-400 font-mono text-[11px] truncate max-w-[120px]">
                        {registered.currentJobId}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Launch Link */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {isOnline && registered?.lastHeartbeatAt
                    ? `Ping: ${new Date(registered.lastHeartbeatAt).toLocaleTimeString()}`
                    : 'Awaiting connection'}
                </span>

                <a
                  href={slot.notebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 hover:underline font-medium"
                >
                  Notebook <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
