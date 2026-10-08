const fs = require('fs');
let content = fs.readFileSync('app/api/admin/crm/whatsapp/qr/chats/route.ts', 'utf8');

// Replace imports
content = content.replace(
  "import { getLead, getCRMUserSettings, getQrWhatsAppChat } from '@/lib/schemas/enterpriseSchemas';",
  `import { getBunnyCrmUserSettings } from '@/lib/bunnyCrmSettings';\nimport { getBunnyQrChats } from '@/lib/bunnyQrWhatsAppRepository';\nimport { getBunnyLeadsByPhones } from '@/lib/bunnyLeadsRepository';`
);

// Replace CRMUserSettings fetch
content = content.replace(
  /const CRMUserSettings = getCRMUserSettings\(\);\s*const userSettings = await CRMUserSettings\.findOne\([^;]+;\s*const ownerSessionKey = superAdmin \? null : await resolveOwnerSessionKey\(\{ userId: viewerUserId, tenantSlug: decoded\?\.tenantSlug \}\);\s*const ownerSettings: any = ownerSessionKey\s*\? await CRMUserSettings\.findOne\(\{ permanentTenantId: ownerSessionKey \}, \{ userId: 1, qrConnectedPhoneNumber: 1 \}\)\.lean\(\)\s*: null;/m,
  `const userSettings = await getBunnyCrmUserSettings(viewerUserId);\n    const ownerSessionKey = superAdmin ? null : await resolveOwnerSessionKey({ userId: viewerUserId, tenantSlug: decoded?.tenantSlug });\n    const ownerSettings = ownerSessionKey ? await getBunnyCrmUserSettings(ownerSessionKey) : null;`
);

// Replace QrChat fetch
content = content.replace(
  /const QrChat = getQrWhatsAppChat\(\);\s*\/\/ Isolation: scoped to THIS user's THIS connected number only\.\s*const query: any = \{ userId: viewerUserId, connectedPhone \};\s*const dbChatDocs = await QrChat\.find\(query\)\s*\.sort\(\{ lastMessageTime: -1, conversationTimestamp: -1, createdAt: -1 \}\)\s*\.limit\(1000\)\s*\.lean\(\);/m,
  `const dbChatDocs = await getBunnyQrChats(viewerUserId, connectedPhone, 1000);`
);

// Remove QrChat.updateOne inside push-name harvest
content = content.replace(
  /const QrChat = getQrWhatsAppChat\(\);\s*await Promise\.allSettled\(candidates\.map\(async \(c\) => \{([^]*?)await QrChat\.updateOne\([^]*?\}\s*\}\)\);/g,
  `await Promise.allSettled(candidates.map(async (c) => {$1}));`
);

// Replace Lead.find with getBunnyLeadsByPhones
content = content.replace(
  /const Lead = getLead\(\);[^]*const leads = await Lead\.find\(\{([^]*?)\}\)\.select\('phoneNumber assignedToUserId createdByUserId displayName name'\)\.lean\(\);/m,
  `const leads = await getBunnyLeadsByPhones(Array.from(phoneNumbers), viewerUserId, superAdmin);`
);

// Remove Lead.updateOne inside push-name harvest
content = content.replace(
  /await Lead\.updateOne\([^]*?\}\)\.catch\(\(\) => \{\}\);/g,
  `// lead update removed for bunnydb`
);

// Remove connectDB
content = content.replace(/await connectDB\(\);/g, `// await connectDB();`);

fs.writeFileSync('app/api/admin/crm/whatsapp/qr/chats/route.ts', content);
