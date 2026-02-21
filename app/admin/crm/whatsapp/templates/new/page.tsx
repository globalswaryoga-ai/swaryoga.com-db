// Backwards-compatible redirect
// Old URL: /admin/crm/whatsapp/templates/new
// New URL: /admin/crm/meta/templates/new

import { redirect } from 'next/navigation';

export default function LegacyNewTemplateRedirect() {
  redirect('/admin/crm/meta/templates/new');
}
