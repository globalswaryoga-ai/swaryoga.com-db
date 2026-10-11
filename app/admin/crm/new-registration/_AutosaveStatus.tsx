'use client';

import type { RegistrationSaveStatus } from '@/lib/registrationAutosave';

export function AutosaveStatus({ status, error, retry }: {
  status: RegistrationSaveStatus;
  error?: string;
  retry: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className={`text-xs px-3 py-2 rounded-lg ${status === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
      {status === 'saving' ? 'Saving changes to Bunny Database...' :
        status === 'saved' ? 'All changes saved to Bunny Database.' :
        status === 'error' ? `Changes not saved: ${error || 'Please retry.'}` : 'Changes save automatically after saved data loads.'}
      {status === 'error' && <button type="button" onClick={retry} className="ml-3 font-bold underline">Retry save</button>}
    </div>
  );
}
