'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Database,
  Cpu,
  Sparkles,
  Server,
  Mic,
  BookOpen,
  ArrowLeft,
  Search,
  ExternalLink,
  ShieldCheck,
  Brain,
  Zap,
} from 'lucide-react';
import { SystemHealthReport, HealthCheckItem } from '@/lib/mohanRag/systemHealthDiagnostic';

export default function SystemHealthMonitorPage() {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'green' | 'yellow' | 'red'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  const fetchHealthReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/crm/mohan-rag/system-health', {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      if (!data.success || !data.report) {
        throw new Error(data.error || 'Failed to fetch diagnostic report');
      }
      setReport(data.report);
    } catch (err: any) {
      console.error('Diagnostic error:', err);
      setError(err.message || 'Failed to connect to health diagnostic service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthReport();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchHealthReport();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Flatten all items across categories
  const allItems: HealthCheckItem[] = useMemo(() => {
    if (!report?.categories) return [];
    return report.categories.flatMap(c => c.items);
  }, [report]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesMetric = item.metric?.toLowerCase().includes(query);
        const matchesError = item.error?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesMetric && !matchesError) return false;
      }
      return true;
    });
  }, [allItems, selectedCategory, selectedStatus, searchQuery]);

  return (
    <div className="min-h-full bg-[#070b14] text-slate-100 p-4 md:p-8 pb-32">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/crm/mohan-rag"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-medium transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Mohan RAG Hub
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
              System Health & Diagnostics Monitor
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
              />
              Auto-refresh (30s)
            </label>

            <button
              onClick={fetchHealthReport}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Running Diagnostics...' : 'Run Diagnostics Now'}
            </button>

            <Link
              href="/admin/crm/mohan-rag/management"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              Management
            </Link>

            <Link
              href="/podcasts"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/70 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
            >
              <Mic className="w-3.5 h-3.5 text-teal-400" />
              Podcasts
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Hero Banner & Summary Metrics */}
        <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                AUTOMATED SYSTEM INTEGRITY ENGINE
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-3">
                RAG & Clone Health Monitor
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {report ? `${report.totalFunctions} Total Functions Added` : '29 Functions'}
                </span>
              </h1>
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                Live inspection of Bunny Edge SQL tables, 4-Worker Ingestion & Conversion Pipeline, Unicode Verbatim Spell Checker, SOV/SVO Dual Grammar, Mohan Sir Digital Twin DNA, and 2-Speaker AI Podcast Studio.
              </p>
              {report?.timestamp && (
                <div className="text-[11px] text-slate-500 flex items-center gap-2 pt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Last verified: {new Date(report.timestamp).toLocaleString()}
                </div>
              )}
            </div>

            {/* Score & Dot Breakdown Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              {/* Overall Health Score */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col justify-between min-w-[130px]">
                <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Health Score</div>
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300 mt-1">
                  {report ? `${report.healthScorePercent}%` : '--%'}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">All Subsystems</div>
              </div>

              {/* Working (Green Dot) */}
              <button
                onClick={() => setSelectedStatus(selectedStatus === 'green' ? 'all' : 'green')}
                className={`p-4 rounded-xl border text-left transition ${
                  selectedStatus === 'green'
                    ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500'
                    : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Working
                </div>
                <div className="text-2xl font-black text-emerald-400 mt-1">
                  {report ? report.greenCount : 0}
                </div>
                <div className="text-[10px] text-emerald-500/70 mt-1">Green Dots (100% OK)</div>
              </button>

              {/* Warning (Yellow Dot) */}
              <button
                onClick={() => setSelectedStatus(selectedStatus === 'yellow' ? 'all' : 'yellow')}
                className={`p-4 rounded-xl border text-left transition ${
                  selectedStatus === 'yellow'
                    ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500'
                    : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-400 uppercase tracking-wider">
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  Degraded
                </div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {report ? report.yellowCount : 0}
                </div>
                <div className="text-[10px] text-amber-500/70 mt-1">Yellow (Attention)</div>
              </button>

              {/* Errors / Bugs (Red Dot) */}
              <button
                onClick={() => setSelectedStatus(selectedStatus === 'red' ? 'all' : 'red')}
                className={`p-4 rounded-xl border text-left transition ${
                  selectedStatus === 'red'
                    ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500'
                    : 'bg-slate-950/80 border-slate-800 hover:border-rose-500/40'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  </span>
                  Errors / Bugs
                </div>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  {report ? report.redCount : 0}
                </div>
                <div className="text-[10px] text-rose-500/70 mt-1">Red Dots (Needs Fix)</div>
              </button>
            </div>
          </div>
        </div>

        {/* Global Error Alert if diagnostic check failed */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-200 text-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <div>
                <div className="font-bold">Diagnostic Execution Error</div>
                <div className="text-xs text-rose-300 mt-0.5">{error}</div>
              </div>
            </div>
            <button
              onClick={fetchHealthReport}
              className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-xs font-semibold text-white transition flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl backdrop-blur">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-slate-100 text-slate-900 font-bold'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Categories ({allItems.length})
            </button>
            {report?.categories?.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.title.split('. ')[1] || cat.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30 font-semibold">
                  {cat.healthyCount}/{cat.totalCount}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter functions, metrics, or bugs..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-950/70 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Function Cards by Category */}
        <div className="space-y-6">
          {report?.categories
            ?.filter(cat => selectedCategory === 'all' || selectedCategory === cat.id)
            .map(category => {
              const categoryItems = category.items.filter(item => {
                if (selectedStatus !== 'all' && item.status !== selectedStatus) return false;
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  return (
                    item.name.toLowerCase().includes(query) ||
                    item.description.toLowerCase().includes(query) ||
                    item.metric?.toLowerCase().includes(query) ||
                    item.error?.toLowerCase().includes(query)
                  );
                }
                return true;
              });

              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{category.icon}</span>
                      <h2 className="text-base font-bold text-white tracking-wide">
                        {category.title}
                      </h2>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">
                        {category.healthyCount} Operational
                      </span>
                      <span>/</span>
                      <span>{category.totalCount} Functions</span>
                    </div>
                  </div>

                  {/* Function Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {categoryItems.map(item => {
                      const isGreen = item.status === 'green';
                      const isYellow = item.status === 'yellow';
                      const isRed = item.status === 'red';

                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-xl border transition-all duration-200 ${
                            isGreen
                              ? 'bg-slate-900/60 border-slate-800/80 hover:border-emerald-500/30'
                              : isYellow
                              ? 'bg-amber-950/15 border-amber-800/40 hover:border-amber-500/40'
                              : 'bg-rose-950/20 border-rose-800/50 hover:border-rose-500/50 ring-1 ring-rose-500/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            {/* Dot + Function Name */}
                            <div className="flex items-start gap-2.5">
                              {/* Glowing Status Dot */}
                              <div className="pt-1 flex-shrink-0">
                                {isGreen && (
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                  </span>
                                )}
                                {isYellow && (
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                                )}
                                {isRed && (
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                                  </span>
                                )}
                              </div>

                              <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                  {item.name}
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            </div>

                            {/* Status Tag & Latency */}
                            <div className="flex flex-col items-end flex-shrink-0">
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isGreen
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : isYellow
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                }`}
                              >
                                {isGreen ? 'OPERATIONAL' : isYellow ? 'DEGRADED' : 'BUG DETECTED'}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-1 font-mono">
                                {item.latencyMs}ms
                              </span>
                            </div>
                          </div>

                          {/* Metric Pill */}
                          {item.metric && (
                            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-medium">Live Metric:</span>
                              <span
                                className={`font-mono text-xs px-2 py-0.5 rounded ${
                                  isGreen
                                    ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
                                    : 'bg-slate-800/80 text-slate-200'
                                }`}
                              >
                                {item.metric}
                              </span>
                            </div>
                          )}

                          {/* Error / Bug Callout */}
                          {item.error && (
                            <div className="mt-3 p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-1">
                              <div className="font-bold flex items-center gap-1.5 text-rose-300">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                Error Details:
                              </div>
                              <div className="font-mono text-[11px] text-rose-200/90 break-words">
                                {item.error}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          {filteredItems.length === 0 && !loading && (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-semibold">No functions matched your current filter.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedStatus('all');
                  setSearchQuery('');
                }}
                className="mt-3 text-xs text-emerald-400 underline"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

