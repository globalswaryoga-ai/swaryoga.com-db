'use client';
import { useCallback, useEffect, useState } from 'react';
import { registrationFetch } from '@/lib/registrationClient';
import type { GoogleFormSyncStatus } from '@/lib/googleFormSyncStatusTypes';

export type GoogleFormSyncSummary = {
  responseCount: number;
  alreadySaved: number;
  pendingResponses: number;
  savedCount: number;
  persistedSubmissions: number;
  insertedSubmissions: number;
  syncedLeads: number;
  failures?: Array<{ responseId: string; stage: string; error: string }>;
};

export type GoogleFormSyncOutcome = {
  summary: GoogleFormSyncSummary | null;
  questionMap: Record<string, string>;
  linkedSheetId: string | null;
  error?: string;
};

/**
 * Imports Google Form responses into Bunny and reports the recorded sync history.
 *
 * The data section reads saved submissions, so "Sync Leads" must actually pull
 * from Google first. This hook performs that import and then exposes the stored
 * status (last run, last error, saved vs. total) so a partial import is visible
 * instead of silently missing responses.
 */
export function useGoogleFormSync(formId: string) {
  const [status, setStatus] = useState<GoogleFormSyncStatus | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  const reloadStatus = useCallback(async (targetFormId: string) => {
    if (!targetFormId) {
      setStatus(null);
      return;
    }
    setIsLoadingStatus(true);
    try {
      const response = await registrationFetch(
        `/api/admin/google-forms/sync-status?formId=${encodeURIComponent(targetFormId)}`,
      );
      const data = await response.json();
      setStatus(response.ok ? data.byFormId?.[targetFormId] ?? null : null);
    } catch {
      setStatus(null);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void reloadStatus(formId);
  }, [formId, reloadStatus]);

  const syncForm = useCallback(
    async (options?: { name?: string; refresh?: boolean }): Promise<GoogleFormSyncOutcome> => {
      if (!formId) throw new Error('Connect a Google Form before syncing.');
      setIsSyncing(true);
      try {
        const params = new URLSearchParams({ url: formId });
        if (options?.name) params.set('name', options.name);
        if (options?.refresh) params.set('refresh', '1');
        const response = await registrationFetch(`/api/admin/google-forms/sync?${params}`);
        const data = await response.json();
        // A partial-success run still returns a summary worth showing.
        if (!response.ok && !data.summary) {
          throw new Error(data.error || `Google Forms import failed (HTTP ${response.status}).`);
        }
        const outcome: GoogleFormSyncOutcome = {
          summary: data.summary || null,
          questionMap: data.questionMap || {},
          linkedSheetId: data.linkedSheetId || null,
          error: response.ok ? undefined : String(data.error || `HTTP ${response.status}`),
        };
        await reloadStatus(formId);
        return outcome;
      } finally {
        setIsSyncing(false);
      }
    },
    [formId, reloadStatus],
  );

  return { status, isSyncing, isLoadingStatus, syncForm, reloadStatus };
}
