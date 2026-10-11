'use client';

import { useState } from 'react';

export type MetaTriggerRun = {
  id: string;
  name: string;
  scheduledAt: string;
  senderNumber?: string;
  status: string;
  lastError?: string;
  retryableCount: number;
  evidence: string;
  stats: { total: number; sent: number; failed: number; delivered: number; wrongNumber: number; pending: number; cancelled: number; unverified: number };
};

export type MetaTriggerAction = 'retry' | 'reschedule' | 'cancel' | 'delete';

function displayTime(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : 'Not recorded';
}

export function MetaTriggerReportTable({ runs, busy, onView, onAction }: {
  runs: MetaTriggerRun[];
  busy: boolean;
  onView: (id: string) => void;
  onAction: (id: string, action: MetaTriggerAction, scheduledAt?: string) => Promise<boolean>;
}) {
  const [rescheduleId, setRescheduleId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [dateError, setDateError] = useState('');
  return (
    <div>
      <p className="mb-3 text-xs text-slate-500">One row per trigger run. Sent includes delivered/read; wrong-number failures are included in Failed. Retry never resets sent messages.</p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm" aria-label="Saved WhatsApp trigger runs">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>{['Run name', 'Trigger date & time', 'Sender number', 'Recipients', 'Sent', 'Failed', 'Delivered', 'Wrong number', 'Queued', 'Status', 'Actions'].map(title => <th key={title} className="whitespace-nowrap p-3">{title}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {runs.map(run => (
              <tr key={run.id}>
                <td className="p-3 font-semibold">{run.name}</td>
                <td className="whitespace-nowrap p-3">{displayTime(run.scheduledAt)}</td>
                <td className="p-3">{run.senderNumber || 'Not recorded'}</td>
                <td className="p-3">{run.evidence === 'message_rows' ? run.stats.total : 'Unverified'}</td>
                <td className="p-3">{run.stats.sent}</td>
                <td className="p-3">{run.stats.failed}</td>
                <td className="p-3">{run.stats.delivered}</td>
                <td className="p-3">{run.stats.wrongNumber}</td>
                <td className="p-3">{run.stats.pending}</td>
                <td className="p-3">{run.status}{run.lastError && <span className="block text-xs text-red-700">{run.lastError}</span>}{run.stats.unverified > 0 && <span className="block text-xs text-amber-700">{run.stats.unverified} unverified</span>}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button className="font-semibold text-blue-700" onClick={() => onView(run.id)}>View Details</button>
                    <button disabled={busy || !run.retryableCount} className="text-indigo-700 disabled:opacity-40" onClick={() => {
                      if (window.confirm('Retry only failed recipients? Sent and wrong-number recipients are excluded.')) void onAction(run.id, 'retry');
                    }}>Retry</button>
                    <button disabled={busy || (!run.stats.pending && !run.stats.cancelled)} className="text-blue-700 disabled:opacity-40" onClick={() => {
                      setDateError(''); setDateTime(''); setRescheduleId(run.id);
                    }}>Reschedule</button>
                    <button disabled={busy || !run.stats.pending} className="text-amber-700 disabled:opacity-40" onClick={() => {
                      if (window.confirm('Cancel unsent recipients in this run? Sent delivery history stays saved.')) void onAction(run.id, 'cancel');
                    }}>Cancel</button>
                    <button disabled={busy} className="text-red-700 disabled:opacity-40" onClick={() => {
                      if (window.confirm('Move this run to the backend deleted folder? It will disappear here; delivery history is preserved.')) void onAction(run.id, 'delete');
                    }}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rescheduleId && (
        <form className="mt-4 rounded-xl border bg-white p-4" onSubmit={async event => {
          event.preventDefault();
          const date = new Date(dateTime);
          if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
            setDateError('Choose a valid future date and time.'); return;
          }
          if (await onAction(rescheduleId, 'reschedule', date.toISOString())) setRescheduleId('');
        }}>
          <label className="block text-sm font-semibold">New trigger date and time (your local timezone)
            <input aria-label="New trigger date and time" type="datetime-local" required value={dateTime} disabled={busy} onChange={event => setDateTime(event.target.value)} className="ml-3 rounded border p-2" />
          </label>
          {dateError && <p role="alert" className="mt-2 text-sm text-red-700">{dateError}</p>}
          <div className="mt-3 flex gap-3">
            <button disabled={busy} type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">{busy ? 'Saving...' : 'Save schedule'}</button>
            <button disabled={busy} type="button" onClick={() => setRescheduleId('')}>Close</button>
          </div>
        </form>
      )}
    </div>
  );
}
