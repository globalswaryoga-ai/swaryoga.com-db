import type { ReactNode } from 'react';

// CRM pages rely heavily on client-only state (localStorage tokens, browser-only APIs).
// Force dynamic rendering to avoid hydration mismatches in dev and production.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function CrmLayout({ children }: { children: ReactNode }) {
  return children;
}
