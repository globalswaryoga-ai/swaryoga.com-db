'use client';

import type { RegistrationSaveStatus } from '@/lib/registrationAutosave';

export function AutosaveStatus({ status, error, retry }: {
  status: RegistrationSaveStatus;
  error?: string;
  retry: () => void;
}) {
  const isVisible = status === 'error' || status === 'saving';
  return (
    <div
      role="status"
      aria-live="polite"
      className={isVisible
        ? `text-xs px-2.5 py-1 rounded-lg ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600 animate-pulse'}`
        : 'sr-only'
      }
      style={!isVisible ? {
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
      } : undefined}
    >
      {status === 'saving' ? 'Saving changes to Bunny Database...' :
        status === 'saved' ? 'All changes saved to Bunny Database.' :
        status === 'error' ? `Changes not saved: ${error || 'Please retry.'}` : 'Changes save automatically after saved data loads.'}
      {status === 'error' && <button type="button" onClick={retry} className="ml-3 font-bold underline">Retry save</button>}
    </div>
  );
}
