app.post('/send-template', authMiddleware, async (req, res) => {
  const { to, chatId, imageUrl, bodyText, buttons, footerText } = req.body;
  const target = (chatId || to || '').includes('@') ? (chatId || to) : (chatId || to) + '@c.us';
  
  console.log('[TEMPLATE] to:', target, 'hasImage:', !!imageUrl, 'buttons:', buttons?.length || 0);
  
  if (!sessionReady) return res.status(503).json({ error: 'Bridge not connected' });
  
  try {
    const messageIds = [];
    
    // Build complete message with image caption + buttons in one message
    let fullMessage = bodyText || '';
    
    // Add buttons as bold numbered options
    if (buttons && buttons.length > 0) {
      const buttonLabels = buttons.map((b, i) => {
        const label = typeof b === 'string' ? b : (b.text || b.title || '');
        return '*' + (i + 1) + '.* ' + label;
      }).join('\n');
      
      if (buttonLabels) {
        fullMessage = fullMessage + '\n\n' + buttonLabels;
      }
      
      if (footerText) {
        fullMessage = fullMessage + '\n\n_' + footerText + '_';
      }
    }
    
    // Send image with full caption (including button options)
    if (imageUrl) {
      console.log('[TEMPLATE] Sending image with buttons in caption...');
      const { MessageMedia } = require('whatsapp-web.js');
      const media = await MessageMedia.fromUrl(imageUrl, { unsafeMime: true });
      if (media) {
        const imgResult = await client.sendMessage(target, media, { caption: fullMessage });
        messageIds.push(imgResult.id._serialized);
        console.log('[TEMPLATE] Image+buttons sent:', imgResult.id._serialized);
      }
    } else if (fullMessage) {
      // Text only message with buttons
      const textResult = await client.sendMessage(target, fullMessage);
      messageIds.push(textResult.id._serialized);
      console.log('[TEMPLATE] Text+buttons sent:', textResult.id._serialized);
    }
    
    res.json({ success: true, messageIds, id: messageIds[0] });
  } catch (e) {
    console.error('[TEMPLATE ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});
