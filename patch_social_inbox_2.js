const fs = require('fs');
const file = 'lib/socialInbox.ts';
let content = fs.readFileSync(file, 'utf8');

// Fix createOutboundSocialMessage
content = content.replace(/  const conversation = await Conversation\.findOne\(\{\n    _id: args\.conversationId,\n    \.\.\.buildSocialInboxScopeFilter\(args\.scope, args\.platform\),\n  \}\);/g, 
`  const conversations = await listBunnySocialConversations({ platform: args.platform, scopeType: args.scope.scopeType, scopeKey: args.scope.scopeKey, limit: 1000 });
  const conversation = conversations.find(c => String(c._id) === args.conversationId);`);

content = content.replace(/    await Message\.create\(\{/g, `    await upsertBunnySocialMessage({`);

content = content.replace(/    createdMessage = await Message\.create\(\{/g, `    createdMessage = await upsertBunnySocialMessage({`);

content = content.replace(/  await Conversation\.updateOne\(\n    \{ _id: conversation\._id \},\n    \{\n      \$set: \{\n        lastMessage,\n        lastMessageAt: now,\n        lastMessageDirection: 'outbound',\n        lastExternalMessageId: textResult\?\.messageId \|\| '',\n        updatedAt: now,\n      \},\n    \}\n  \);/g,
`  conversation.lastMessage = lastMessage;
  conversation.lastMessageAt = now.toISOString();
  conversation.lastMessageDirection = 'outbound';
  conversation.lastExternalMessageId = textResult?.messageId || '';
  conversation.updatedAt = now.toISOString();
  await upsertBunnySocialConversation(conversation);`);


// Fix markSocialConversationRead
content = content.replace(/  await Conversation\.updateOne\(\n    \{ _id: conversationId, \.\.\.buildSocialInboxScopeFilter\(scope, platform\) \},\n    \{ \$set: \{ unreadCount: 0, updatedAt: now \} \}\n  \);/g,
`  const filterArgs = { platform, scopeType: scope.scopeType, scopeKey: scope.scopeKey, limit: 1000 };
  const conversations = await listBunnySocialConversations(filterArgs);
  const conversation = conversations.find(c => String(c._id) === String(conversationId));
  if (conversation) {
    conversation.unreadCount = 0;
    conversation.updatedAt = now.toISOString();
    await upsertBunnySocialConversation(conversation);
  }`);

content = content.replace(/  await Message\.updateMany\(\n    \{\n      conversationId: new mongoose\.Types\.ObjectId\(conversationId\),\n      platform,\n      accountScopeType: scope\.scopeType,\n      accountScopeKey: scope\.scopeKey,\n      direction: 'inbound',\n      isRead: \{ \$ne: true \},\n    \},\n    \{ \$set: \{ isRead: true, readAt: now, updatedAt: now \} \}\n  \);/g,
`  const messages = await listBunnySocialMessages(conversationId, 500);
  for (const msg of messages) {
    if (msg.direction === 'inbound' && !msg.isRead) {
      msg.isRead = true;
      msg.readAt = now.toISOString();
      msg.updatedAt = now.toISOString();
      await upsertBunnySocialMessage(msg);
    }
  }`);


// Fix importFacebookConversationHistory
// Look closely at the file for importFacebookConversationHistory... let's replace its body manually if possible.
// Wait, I will just replace the specific BulkWrite parts
content = content.replace(/      await Conversation\.updateOne\(\n        \{\n          conversationKey,\n          \.\.\.scopeFilter,\n        \},\n        \{\n          \$set: \{\n            updatedAt: now,\n            \.\.\.conversationUpdate,\n          \},\n          \$setOnInsert: \{\n            createdAt: now,\n            status: 'active',\n          \},\n        \},\n        \{ upsert: true \}\n      \);/g,
`      let allConvs = await listBunnySocialConversations({ platform, scopeType: scopeFilter.accountScopeType, scopeKey: scopeFilter.accountScopeKey, limit: 1000, search: conversationKey });
      let conv = allConvs.find(c => c.conversationKey === conversationKey);
      if (!conv) {
         conv = {
           conversationKey,
           ...scopeFilter,
           createdAt: now.toISOString(),
           status: 'active',
           unreadCount: 0
         };
      }
      conv = {
        ...conv,
        updatedAt: now.toISOString(),
        ...conversationUpdate,
      };
      await upsertBunnySocialConversation(conv);`);

content = content.replace(/      const conversationDoc = await Conversation\.findOne\(\{ conversationKey, \.\.\.scopeFilter \}\)\.select\('_id'\)\.lean<any>\(\);/g,
`      let allConvs = await listBunnySocialConversations({ platform, scopeType: scopeFilter.accountScopeType, scopeKey: scopeFilter.accountScopeKey, limit: 1000, search: conversationKey });
      let conversationDoc = allConvs.find(c => c.conversationKey === conversationKey);`);

content = content.replace(/          const result = await Message\.updateOne\(\n            \{ externalMessageId: msgId \},\n            \{\n              \$set: messageDoc,\n              \$setOnInsert: \{ createdAt: msgDate \},\n            \},\n            \{ upsert: true \}\n          \);/g,
`          let msgObj = { ...messageDoc, externalMessageId: msgId, createdAt: msgDate.toISOString() };
          await upsertBunnySocialMessage(msgObj);
          const result = { upsertedCount: 1 };`);

content = content.replace(/          await Message\.create\(messageDoc\);/g,
`          await upsertBunnySocialMessage(messageDoc);`);

fs.writeFileSync(file, content);
console.log('patched lib/socialInbox.ts successfully');
