/**
 * Client-safe shape of a recorded Google Forms sync run.
 *
 * Kept separate from `googleFormSyncStatus.ts` so UI modules can import the type
 * without pulling the Bunny Database client into the browser bundle.
 */
export type GoogleFormSyncStatus = {
  formId: string;
  scope: string;
  formName: string;
  status: 'ok' | 'error';
  lastRunAt: string;
  lastSuccessAt: string;
  responseCount: number;
  savedCount: number;
  importedCount: number;
  lastError: string;
};
