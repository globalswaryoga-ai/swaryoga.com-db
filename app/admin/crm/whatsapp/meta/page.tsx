// Backwards-compatible route.
//
// Historically the full chat inbox lived under /admin/crm/whatsapp/meta.
// Keep that URL working, but treat /admin/crm/meta as the canonical route.

export { default } from '../../meta/page';

