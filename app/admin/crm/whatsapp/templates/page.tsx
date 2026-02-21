// Backwards-compatible redirect
// Old URL: /admin/crm/whatsapp/templates
// New URL: /admin/crm/meta/templates

import { redirect } from 'next/navigation';

export default function LegacyTemplatesRedirect() {
  redirect('/admin/crm/meta/templates');
}
