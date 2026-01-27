
// Get contact details
app.get('/contact/:contactId', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const contactId = req.params.contactId;
    console.log('[CONTACT] Fetching contact:', contactId);
    const contact = await client.getContactById(contactId);
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get profile picture
    let profilePicUrl = null;
    try {
      profilePicUrl = await contact.getProfilePicUrl();
    } catch (e) {
      console.log('[CONTACT] No profile pic for:', contactId);
    }
    
    res.json({
      success: true,
      contact: {
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.number,
        pushname: contact.pushname,
        number: contact.number,
        isBlocked: contact.isBlocked,
        isBusiness: contact.isBusiness,
        isEnterprise: contact.isEnterprise,
        isGroup: contact.isGroup,
        isMe: contact.isMe,
        isMyContact: contact.isMyContact,
        isUser: contact.isUser,
        isWAContact: contact.isWAContact,
        profilePicUrl: profilePicUrl,
      }
    });
  } catch (e) {
    console.error('[CONTACT ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Get group details
app.get('/group/:groupId', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    console.log('[GROUP] Fetching group:', groupId);
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // Get group metadata
    let inviteCode = null;
    let profilePicUrl = null;
    try {
      inviteCode = await chat.getInviteCode();
    } catch (e) {
      console.log('[GROUP] Cannot get invite code:', e.message);
    }
    try {
      const contact = await chat.getContact();
      if (contact) {
        profilePicUrl = await contact.getProfilePicUrl();
      }
    } catch (e) {
      console.log('[GROUP] No profile pic');
    }
    
    // Get participants
    const participants = [];
    if (chat.participants) {
      for (const p of chat.participants) {
        participants.push({
          id: p.id._serialized,
          isAdmin: p.isAdmin,
          isSuperAdmin: p.isSuperAdmin,
        });
      }
    }
    
    res.json({
      success: true,
      group: {
        id: chat.id._serialized,
        name: chat.name,
        description: chat.description || '',
        createdAt: chat.createdAt,
        owner: chat.owner ? chat.owner._serialized : null,
        participants: participants,
        participantCount: participants.length,
        inviteCode: inviteCode,
        inviteLink: inviteCode ? 'https://chat.whatsapp.com/' + inviteCode : null,
        profilePicUrl: profilePicUrl,
        isReadOnly: chat.isReadOnly,
        isMuted: chat.isMuted,
      }
    });
  } catch (e) {
    console.error('[GROUP ERROR]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Update group subject (name)
app.post('/group/:groupId/subject', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    const { subject } = req.body;
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    await chat.setSubject(subject);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update group description
app.post('/group/:groupId/description', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    const { description } = req.body;
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    await chat.setDescription(description);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add participants to group
app.post('/group/:groupId/add', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    const { participants } = req.body;
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    const normalizedParticipants = participants.map(p => {
      let phone = String(p).replace(/[^0-9]/g, '');
      if (phone.length === 10) phone = '91' + phone;
      return phone + '@c.us';
    });
    
    const result = await chat.addParticipants(normalizedParticipants);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove participant from group
app.post('/group/:groupId/remove', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    const { participant } = req.body;
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    await chat.removeParticipants([participant]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get group invite link
app.get('/group/:groupId/invite', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const inviteCode = await chat.getInviteCode();
    res.json({ 
      success: true, 
      inviteCode,
      inviteLink: 'https://chat.whatsapp.com/' + inviteCode
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Revoke group invite link
app.post('/group/:groupId/revoke-invite', async (req, res) => {
  if (status !== 'connected' || !isReady) {
    return res.status(503).json({ error: 'Bridge not ready' });
  }
  try {
    const groupId = req.params.groupId;
    const chat = await client.getChatById(groupId);
    if (!chat || !chat.isGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }
    const newInviteCode = await chat.revokeInvite();
    res.json({ 
      success: true, 
      inviteCode: newInviteCode,
      inviteLink: 'https://chat.whatsapp.com/' + newInviteCode
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
