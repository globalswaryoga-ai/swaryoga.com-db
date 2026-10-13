'use client';
import React from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import type { GoogleFormSyncStatus } from '@/lib/googleFormSyncStatusTypes';

function formatLastRun(value: string): string {
  if (!value) return 'never';
  const timestamp = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(timestamp.getTime())) return value;
  const minutes = Math.round((Date.now() - timestamp.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return timestamp.toLocaleString();
}

export function GoogleFormSyncStatusBanner({
  status,
  isLoading,
  isSyncing,
  unmappedCount,
  onSync,
  disabled,
}: {
  status: GoogleFormSyncStatus | null;
  isLoading: boolean;
  isSyncing: boolean;
  unmappedCount: number;
  onSync: () => void;
  disabled?: boolean;
}) {
  const missing = status ? Math.max(0, status.responseCount - status.savedCount) : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {status?.status === 'error' ? (
            <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
          ) : (
            <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          )}
          <div className="min-w-0 text-xs text-slate-600">
            {isLoading && !status ? (
              <span>Checking import history…</span>
            ) : status ? (
              <>
                <p className="font-bold text-slate-700">
                  {status.savedCount} of {status.responseCount} Google responses saved
                  {status.importedCount > 0 ? ` · ${status.importedCount} new on last import` : ''}
                </p>
                <p className="text-slate-500">
                  Last import {formatLastRun(status.lastRunAt)} · last success{' '}
                  {status.lastSuccessAt ? formatLastRun(status.lastSuccessAt) : 'never'}
                </p>
              </>
            ) : (
              <p className="font-bold text-slate-700">No import recorded for this form yet.</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onSync}
          disabled={disabled || isSyncing}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5 shrink-0"
          title="Import new responses from Google Forms into Bunny"
        >
          <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Importing…' : 'Import from Google'}
        </button>
      </div>

      {missing > 0 && (
        <p className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
          {missing} Google response{missing === 1 ? '' : 's'} not saved yet — run Import from Google.
        </p>
      )}

      {status?.lastError && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 space-y-2 break-words">
          <p>
            <span className="font-bold">Last import error:</span> {status.lastError}
          </p>
          {(status.lastError.includes('invalid_grant') || status.lastError.includes('401') || status.lastError.includes('Reconnect Google')) && (
            <div className="flex items-center gap-2 pt-1 border-t border-red-200">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const token = (typeof window !== 'undefined' ? (localStorage.getItem('admin_token') || localStorage.getItem('adminToken') || '') : '');
                    const origin = window.location.origin;
                    const res = await fetch(`/api/admin/google-form-oauth?token=${encodeURIComponent(token)}&origin=${encodeURIComponent(origin)}`, {
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                    });
                    const data = await res.json();
                    if (data.authUrl) window.location.href = data.authUrl;
                    else alert(data.error || 'Failed to start Google login');
                  } catch {
                    alert('Failed to initiate Google Login');
                  }
                }}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-md text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                🔗 Reconnect Google Account Now
              </button>
              <span className="text-slate-500 text-[11px]">
                (Google session expired. Authorize once to restore automatic imports)
              </span>
            </div>
          )}
        </div>
      )}

      {unmappedCount > 0 && (
        <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5">
          {unmappedCount} CRM field{unmappedCount === 1 ? '' : 's'} show as “-- Ignore --” because the form has no
          matching question. Set them below if the wording differs.
        </p>
      )}
    </div>
  );
}

export default GoogleFormSyncStatusBanner;
