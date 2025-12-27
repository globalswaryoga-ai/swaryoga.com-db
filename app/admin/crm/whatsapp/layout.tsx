import type { ReactNode } from 'react';

// WhatsApp CRM is client-driven (localStorage tokens, search params) and should not be statically prerendered.
// This layout forces dynamic rendering for all routes under /admin/crm/whatsapp.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function WhatsAppLayout({ children }: { children: ReactNode }) {
  return children;
}
