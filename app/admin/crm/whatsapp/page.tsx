import { redirect } from 'next/navigation';

// This route historically hosted multiple inbox variants.
// The current canonical inbox is the Meta UI at /admin/crm/meta.
// Keep this path as a simple redirect so older internal links/bookmarks stay working.

export default function WhatsAppInboxRedirectPage() {
  // Redirect to Meta WhatsApp inbox
  redirect('/admin/crm/meta');
}
