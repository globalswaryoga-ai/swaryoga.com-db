export const whatsappSetupLinks = [
  { href: '/admin/crm/whatsapp/web', label: 'WhatsApp Web Setup' },
  ...((process.env.NEXT_PUBLIC_ENABLE_META_WHATSAPP || '').toLowerCase() === 'true'
    ? [{ href: '/admin/crm/whatsapp-meta', label: 'Meta Chat' }]
    : []),
];
