'use client';

import { useState } from 'react';
import { registrationPage } from '@/lib/registrationPagination';

export function useRegistrationPage(key: string) {
  const [selection, setSelection] = useState({ key, page: 1 });
  return {
    page: selection.key === key ? selection.page : 1,
    onPage: (page: number) => setSelection({ key, page }),
  };
}

export function RegistrationPagination({ range, onPage }: {
  range: ReturnType<typeof registrationPage>;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
      <span>Showing {range.total ? range.offset + 1 : 0}-{range.end} of {range.total} leads. Bulk selection and export still include all matching leads.</span>
      <nav aria-label="Lead table pages" className="flex items-center gap-3">
        <button type="button" disabled={range.page === 1} onClick={() => onPage(range.page - 1)} className="rounded border px-3 py-1 disabled:opacity-40">Previous</button>
        <span>Page {range.page} of {range.pages}</span>
        <button type="button" disabled={range.page === range.pages} onClick={() => onPage(range.page + 1)} className="rounded border px-3 py-1 disabled:opacity-40">Next</button>
      </nav>
    </div>
  );
}
