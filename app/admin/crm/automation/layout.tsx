import type { ReactNode } from 'react';

// CRM pages are client-driven (auth token from localStorage) and should not be
// statically prerendered. Forcing dynamic avoids hydration mismatches.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function AutomationLayout({ children }: { children: ReactNode }) {
  return children;
}
