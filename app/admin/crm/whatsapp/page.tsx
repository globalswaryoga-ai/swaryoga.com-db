import { redirect } from 'next/navigation';

// This route historically hosted multiple inbox variants.
// The current canonical inbox is the Meta UI at /admin/crm/whatsapp/meta (and /admin/crm/meta).
// Keep this path as a simple redirect so older internal links/bookmarks stay working.

// --- Types ---

export default function WhatsAppInboxRedirectPage() {
  // Sidebar entry: WhatsApp should open the white inbox UI.
  redirect('/admin/crm/whatsapp/meta');
}
