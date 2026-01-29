
// Template endpoint with native blue buttons
app.post('/send-template', async (req, res) => {
  const { to, chatId, imageUrl, bodyText, buttons, footerText } = req.body;
  const target = (chatId || to || '').includes('@') ? (chatId || to) : (chatId || to) + '@c.us';
  
  console.log('[TEMPLATE] to:', target, 'hasImage:', !!imageUrl, 'buttons:', buttons?.length || 0);
  
  if (status !== 'connected') return res.status(503).json({ error: 'Bridge not connected' });
  
  try {
    const messageIds = [];
    
    // Step 1: Send image with caption
    if (imageUrl) {
      console.log('[TEMPLATE] Sending image...');
      const media = await getMediaFromUrl(imageUrl);
      if (media) {
        const imgResult = await client.sendMessage(target, media, { caption: bodyText || '' });
        messageIds.push(imgResult.id._serialized);
        console.log('[TEMPLATE] Image sent:', imgResult.id._serialized);
      }
    } else if (bodyText) {
      const textResult = await client.sendMessage(target, bodyText);
      messageIds.push(textResult.id._serialized);
    }
    
    // Step 2: Send native buttons
    if (buttons && buttons.length > 0) {
      try {
        await new Promise(r => setTimeout(r, 500));
        console.log('[TEMPLATE] Sending', buttons.length, 'buttons...');
        
        const buttonList = buttons.map(b => ({ body: typeof b === 'string' ? b : b.text || b.title }));
        const buttonMsg = new Buttons(
          'Please select an option:',
          buttonList,
          footerText || 'Swar Yoga',
          'Tap to choose'
        );
        
        const btnResult = await client.sendMessage(target, buttonMsg);
        messageIds.push(btnResult.id._serialized);
        console.log('[TEMPLATE] Buttons sent:', btnResult.id._serialized);
      } catch (btnErr) {
        console.warn('[TEMPLATE] Buttons failed:', btnErr.message);
      }
    }
    
    res.json({ success: true, id: messageIds[0], allIds: messageIds });
  } catch (e) {
    console.error('[TEMPLATE ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});
