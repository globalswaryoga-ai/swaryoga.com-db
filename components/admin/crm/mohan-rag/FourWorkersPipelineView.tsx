'use client';

import React, { useState, useEffect } from 'react';
import {
  Video, ShieldCheck, Network, ListChecks, RefreshCw, CheckCircle2,
  AlertTriangle, Play, FileText, Sparkles, Loader2, Search, Filter,
  ArrowRight, ExternalLink, Cpu, Database, Eye, X
} from 'lucide-react';
import type { PipelineHealthDashboard, WorkerReport } from '@/lib/mohanRag/fourWorkerPipeline';

interface FourWorkersPipelineViewProps {
  token: string | null;
  onNavigateToTab?: (tab: string, topic?: string, text?: string) => void;
}

export default function FourWorkersPipelineView({ token, onNavigateToTab }: FourWorkersPipelineViewProps) {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<PipelineHealthDashboard | null>(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'dummy_only' | 'verified_only'>('all');
  const [runningSourceId, setRunningSourceId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [activePreviewReport, setActivePreviewReport] = useState<WorkerReport | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [actionSuccessNotice, setActionSuccessNotice] = useState('');

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/four-workers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch pipeline health dashboard');
      setDashboard(data.dashboard);
    } catch (err: any) {
      setError(err.message || 'Error communicating with 4-Worker pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const handleRunSingle = async (sourceId: string) => {
    if (!token) return;
    setRunningSourceId(sourceId);
    setError('');
    setActionSuccessNotice('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/four-workers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run_single', sourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Pipeline run failed');
      setActionSuccessNotice(`Pipeline finished for "${data.report?.title || sourceId}": ${data.report?.worker1_conversion?.charCount || 0} characters transcribed and distributed everywhere!`);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to run 4-worker pipeline');
    } finally {
      setRunningSourceId(null);
    }
  };

  const handleRunBatch = async (limit = 3) => {
    if (!token) return;
    setBatchRunning(true);
    setError('');
    setActionSuccessNotice('');
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/four-workers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'run_batch', limit }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch pipeline run failed');
      setActionSuccessNotice(`Batch execution completed! Processed ${data.processed} sources across all 4 workers.`);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to run batch pipeline');
    } finally {
      setBatchRunning(false);
    }
  };

  const loadSourcePreview = async (report: WorkerReport) => {
    setActivePreviewReport(report);
    setLoadingPreview(true);
    setPreviewContent(null);
    try {
      const res = await fetch(`/api/admin/crm/mohan-rag/knowledge/${report.sourceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.source?.content) {
        setPreviewContent(data.source.content);
      } else {
        setPreviewContent('No text content available.');
      }
    } catch {
      setPreviewContent('Failed to load extracted text preview.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const filteredReports = (dashboard?.reports || []).filter(r => {
    const matchesSearch = !searchQuery || r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.sourceId.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filterMode === 'dummy_only') return r.worker2_verification.isDummyOrPdf;
    if (filterMode === 'verified_only') return !r.worker2_verification.isDummyOrPdf;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/70 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold tracking-widest text-emerald-400 uppercase">Automated AI Media Engine</span>
            </div>
            <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-emerald-400" />
              4-Worker Video & Speech Ingestion Pipeline
            </h2>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              Strict 4-stage pipeline: <strong className="text-emerald-300">Worker 1</strong> transcribes media into verbatim text,{' '}
              <strong className="text-amber-300">Worker 2</strong> audits against dummy outlines,{' '}
              <strong className="text-cyan-300">Worker 3</strong> propagates verified speech across all 7 platform destinations, and{' '}
              <strong className="text-purple-300">Worker 4</strong> verifies 100% distribution health.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchDashboard}
              disabled={loading}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
            <button
              onClick={() => handleRunBatch(3)}
              disabled={batchRunning || loading}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-900/40 hover:from-emerald-400 hover:to-teal-500 transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {batchRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {batchRunning ? 'Processing Batch...' : 'Run 4-Worker Batch (Next 3 Pending)'}
            </button>
          </div>
        </div>

        {/* Global Notices */}
        {actionSuccessNotice && (
          <div className="mt-4 rounded-xl border border-emerald-400/50 bg-emerald-900/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessNotice}</span>
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-rose-500/50 bg-rose-950/40 p-3 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* 4 Worker Stage Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Worker 1 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Video className="w-16 h-16 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Worker 1: Media Converter</p>
              <h4 className="text-sm font-bold text-white">Audio & Video to Text</h4>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            Transcribes Bunny Stream, Bunny Storage CDN, YouTube, & MP3s via FFmpeg & Whisper.
          </p>
          <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Converted Speech:</span>
            <span className="text-lg font-black text-emerald-400">
              {dashboard?.worker1_convertedCount ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">/ {dashboard?.totalSources ?? 0}</span>
            </span>
          </div>
        </div>

        {/* Worker 2 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ShieldCheck className="w-16 h-16 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Worker 2: Quality Checker</p>
              <h4 className="text-sm font-bold text-white">Authenticity Verifier</h4>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            Audits text: rejects dummy metadata, empty timestamps, and short outlines.
          </p>
          <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Verified Real Text:</span>
            <span className="text-lg font-black text-amber-400">
              {dashboard?.worker2_verifiedCount ?? 0}
              <span className="text-xs font-bold text-rose-400 ml-2">({dashboard?.worker2_rejectedCount ?? 0} flagged)</span>
            </span>
          </div>
        </div>

        {/* Worker 3 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Network className="w-16 h-16 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Worker 3: Multi-Destination</p>
              <h4 className="text-sm font-bold text-white">Global Distribution</h4>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            Pushes speech to Library, Plain Text, Spell Check, Grammar, Emotion, Blueprint, & Avatar.
          </p>
          <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">Synced Everywhere:</span>
            <span className="text-lg font-black text-cyan-400">
              {dashboard?.worker3_distributedCount ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">sources</span>
            </span>
          </div>
        </div>

        {/* Worker 4 */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <ListChecks className="w-16 h-16 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Worker 4: Audit & Health</p>
              <h4 className="text-sm font-bold text-white">Full Integrity Monitor</h4>
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-3 line-clamp-2">
            Validates presence across all 7 destinations and scores global sync confidence.
          </p>
          <div className="flex items-baseline justify-between pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-400">100% Confidence:</span>
            <span className="text-lg font-black text-purple-400">
              {dashboard?.worker4_fullyVerifiedCount ?? 0}
              <span className="text-xs font-normal text-slate-500 ml-1">/ {dashboard?.totalSources ?? 0}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Sources Audit Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4 pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              Source Inspection & Pipeline Status ({filteredReports.length})
            </h3>
            <p className="text-xs text-slate-400">
              Track the conversion and distribution health for each imported media file.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search source title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex rounded-xl border border-slate-700 bg-slate-800 p-0.5 text-xs">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterMode === 'all' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                All ({dashboard?.reports?.length ?? 0})
              </button>
              <button
                onClick={() => setFilterMode('dummy_only')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterMode === 'dummy_only' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Needs Conversion ({dashboard?.worker2_rejectedCount ?? 0})
              </button>
              <button
                onClick={() => setFilterMode('verified_only')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${filterMode === 'verified_only' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Verified Speech ({dashboard?.worker2_verifiedCount ?? 0})
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-sm">Auditing all sources across the 4-worker pipeline...</span>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No sources found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Source Title & Media</th>
                  <th className="py-2.5 px-3 font-semibold">Worker 1 (Text)</th>
                  <th className="py-2.5 px-3 font-semibold">Worker 2 (Quality)</th>
                  <th className="py-2.5 px-3 font-semibold">Worker 3 (Distribution)</th>
                  <th className="py-2.5 px-3 font-semibold">Worker 4 (Audit)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredReports.map(report => {
                  const isDummy = report.worker2_verification.isDummyOrPdf;
                  const isRunningThis = runningSourceId === report.sourceId;
                  const charCount = report.worker1_conversion.charCount;

                  return (
                    <tr key={report.sourceId} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-100 truncate" title={report.title}>
                          {report.title}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 uppercase">
                            {report.worker1_conversion.sourceType || 'media'}
                          </span>
                          <span className="truncate max-w-[180px]" title={report.sourceId}>
                            {report.sourceId}
                          </span>
                        </div>
                      </td>

                      {/* Worker 1 */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {charCount > 1000 ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              {charCount.toLocaleString()} chars
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              {charCount} chars
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[130px]">
                          {report.worker1_conversion.method}
                        </div>
                      </td>

                      {/* Worker 2 */}
                      <td className="py-3 px-3">
                        {isDummy ? (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/40 px-2 py-1 text-rose-300 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                            <span>Needs Real Audio</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2 py-1 text-emerald-300 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                            <span>Verified Speech</span>
                          </div>
                        )}
                        {report.worker2_verification.rejectionReason && (
                          <p className="text-[10px] text-rose-400/80 mt-1 max-w-[160px] truncate" title={report.worker2_verification.rejectionReason}>
                            {report.worker2_verification.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Worker 3 */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${isDummy ? 'bg-amber-500' : 'bg-cyan-400'}`} />
                          <span className={isDummy ? 'text-amber-400' : 'text-cyan-300'}>
                            {isDummy ? 'Pending speech' : '7/7 Places Synced'}
                          </span>
                        </div>
                      </td>

                      {/* Worker 4 */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${report.worker4_audit.confidenceScore >= 90 ? 'bg-emerald-400' : report.worker4_audit.confidenceScore >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`}
                              style={{ width: `${report.worker4_audit.confidenceScore}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-200">{report.worker4_audit.confidenceScore}%</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => loadSourcePreview(report)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-slate-300 hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
                            title="Preview Extracted Text"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>

                          {report.worker1_conversion.mediaUrl && (
                            <a
                              href={report.worker1_conversion.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2 py-1 text-emerald-300 hover:bg-emerald-900/50 transition flex items-center gap-1"
                              title="Play Source Video"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Play
                            </a>
                          )}

                          <button
                            onClick={() => handleRunSingle(report.sourceId)}
                            disabled={isRunningThis || batchRunning}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                              isDummy
                                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-400 hover:to-orange-500 shadow-xs'
                                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {isRunningThis ? (
                              <Loader2 className="w-3 h-3 animate-spin text-white" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            {isRunningThis ? 'Running...' : isDummy ? 'Convert Now' : 'Re-Run 4W'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Text Preview Modal */}
      {activePreviewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  {activePreviewReport.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Extracted text verification • Length: {activePreviewReport.worker1_conversion.charCount.toLocaleString()} chars
                </p>
              </div>
              <button
                onClick={() => { setActivePreviewReport(null); setPreviewContent(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quality status banner */}
            <div className="my-3">
              {activePreviewReport.worker2_verification.isDummyOrPdf ? (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-3 text-xs text-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      <strong>Worker 2 Flagged:</strong> {activePreviewReport.worker2_verification.rejectionReason}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      handleRunSingle(activePreviewReport.sourceId);
                      setActivePreviewReport(null);
                    }}
                    className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-slate-950 hover:bg-amber-400 transition cursor-pointer text-xs shrink-0"
                  >
                    Run 4-Worker Pipeline Now
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Worker 2 Verified:</strong> Authentic verbatim speech transcript. Distributed to all 7 workspaces.
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading full source text...</span>
                </div>
              ) : (
                previewContent || 'No text stored for this source.'
              )}
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400">ID: {activePreviewReport.sourceId}</span>
              <div className="flex items-center gap-2">
                {onNavigateToTab && !activePreviewReport.worker2_verification.isDummyOrPdf && (
                  <>
                    <button
                      onClick={() => {
                        onNavigateToTab('plaintext', activePreviewReport.title, previewContent || undefined);
                        setActivePreviewReport(null);
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition cursor-pointer"
                    >
                      Open in Plain Text →
                    </button>
                    <button
                      onClick={() => {
                        onNavigateToTab('spellcheck', activePreviewReport.title, previewContent || undefined);
                        setActivePreviewReport(null);
                      }}
                      className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition cursor-pointer"
                    >
                      Open in Spell Checker →
                    </button>
                  </>
                )}
                <button
                  onClick={() => { setActivePreviewReport(null); setPreviewContent(null); }}
                  className="rounded-xl border border-slate-700 px-4 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

