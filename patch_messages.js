const fs = require('fs');
const file = 'app/api/admin/crm/social-inbox/messages/route.ts';
let content = fs.readFileSync(file, 'utf8');

// replace mongoose import and getSocialInbox
content = content.replace("import mongoose from 'mongoose';", "");
content = content.replace("import { connectDB } from '@/lib/db';", "");
content = content.replace(/import \{ getSocialInboxConversation, getSocialInboxMessage \} from '@\/lib\/schemas\/enterpriseSchemas';/, "import { listBunnySocialMessages, listBunnySocialConversations } from '@/lib/bunnySocialInboxRepository';");

// replace GET method
content = content.replace(/    if \(\!mongoose\.Types\.ObjectId\.isValid\(conversationId\)\) \{[\s\S]*?      return apiError\('VALIDATION_ERROR', 'conversationId is required'\);\n    \}/, "    if (!conversationId) {\n      return apiError('VALIDATION_ERROR', 'conversationId is required');\n    }");

content = content.replace(/    await connectDB\(\);\n    const scope = await resolveSocialMediaScope\(decoded\);\n    const Conversation = getSocialInboxConversation\(\);\n    const Message = getSocialInboxMessage\(\);\n\n    const conversation = await Conversation\.findOne\(\{[\s\S]*?    \}\)\.lean\(\);/, 
`    const scope = await resolveSocialMediaScope(decoded);
    const conversations = await listBunnySocialConversations({ platform, scopeType: scope.scopeType, scopeKey: scope.scopeKey, limit: 1000 });
    const conversation = conversations.find((c) => String(c._id) === conversationId);`);

content = content.replace(/    const messages = await Message\.find\(\{[\s\S]*?    \}\)\n      \.sort\(\{\s*sentAt:\s*1,\s*createdAt:\s*1\s*\}\)\n      \.limit\(500\)\n      \.lean\(\);/,
`    let messages = await listBunnySocialMessages(conversationId, 500);
    // listBunnySocialMessages returns them reversed for us, but let's ensure sentAt ascending
    messages = messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());`);

fs.writeFileSync(file, content);
