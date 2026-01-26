
// Media endpoint - Add this after /messages/:chatId endpoint
app.get('/messages/media/:msgId', async (req, res) => {
  if (status !== 'connected') {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const msgId = req.params.msgId;
    console.log('[MEDIA] Fetching media for message:', msgId);
    
    const msg = await client.getMessageById(msgId);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    if (!msg.hasMedia) {
      return res.status(404).json({ error: 'Message has no media' });
    }
    
    const media = await msg.downloadMedia();
    if (!media) {
      return res.status(404).json({ error: 'Failed to download media' });
    }
    
    console.log('[MEDIA] Downloaded media, type:', media.mimetype, 'size:', media.data?.length || 0);
    
    res.json({
      success: true,
      mimetype: media.mimetype,
      data: media.data, // base64 encoded
      filename: media.filename || null,
      dataUrl: `data:${media.mimetype};base64,${media.data}`
    });
  } catch (e) {
    console.error('[MEDIA ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});
