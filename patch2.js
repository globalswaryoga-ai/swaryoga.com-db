const fs = require('fs');
let content = fs.readFileSync('app/api/admin/crm/whatsapp/qr/chats/route.ts', 'utf8');

content = content.replace(
  /const QrChat = getQrWhatsAppChat\(\);/g,
  `// QrChat removed`
);

fs.writeFileSync('app/api/admin/crm/whatsapp/qr/chats/route.ts', content);
