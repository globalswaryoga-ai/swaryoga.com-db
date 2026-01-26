
// Get messages for a specific chat - Add this before app.listen()
app.get('/messages/:chatId', async (req, res) => {
  if (status !== 'connected') {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const chatId = req.params.chatId;
    console.log('[MESSAGES] Fetching messages for:', chatId);
    
    const chat = await client.getChatById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    // Mark as read
    try {
      await chat.sendSeen();
    } catch (e) {
      console.log('[MESSAGES] sendSeen failed (non-critical):', e.message);
    }
    
    const messages = await chat.fetchMessages({ limit: 50 });
    const formatted = messages.map(m => ({
      id: m.id._serialized,
      body: m.body,
      fromMe: m.fromMe,
      timestamp: m.timestamp,
      type: m.type,
      hasMedia: m.hasMedia,
      ack: m.ack
    }));
    
    console.log('[MESSAGES] Returning', formatted.length, 'messages');
    res.json({ success: true, messages: formatted });
  } catch (e) {
    console.error('[MESSAGES ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});
