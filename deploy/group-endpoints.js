
// ============ GROUP MANAGEMENT ENDPOINTS (Added for CRM) ============

// Get all groups
app.get('/groups', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    // Get all chats and filter groups
    const chats = await sock.groupFetchAllParticipating();
    const groups = Object.values(chats).map(g => ({
      id: g.id,
      name: g.subject,
      memberCount: g.participants?.length || 0,
      owner: g.owner,
      creation: g.creation,
      description: g.desc,
      restrict: g.restrict,
      announce: g.announce
    }));
    
    res.json({ success: true, groups });
  } catch (err) {
    console.error('Get groups error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get group details
app.get('/group/:groupId', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const metadata = await sock.groupMetadata(groupId);
    
    // Helper to extract phone number from JID
    const extractPhone = (jid) => {
      if (!jid) return null;
      // Standard format: 91XXXXXXXXXX@s.whatsapp.net
      if (jid.includes('@s.whatsapp.net')) {
        return jid.split('@')[0];
      }
      // Linked ID format: XXXXXXX@lid (privacy protected, no real phone)
      if (jid.includes('@lid')) {
        return null; // Can't extract phone from @lid
      }
      // Contact format: 91XXXXXXXXXX@c.us  
      if (jid.includes('@c.us')) {
        return jid.split('@')[0];
      }
      return jid.split('@')[0];
    };
    
    res.json({ 
      success: true, 
      group: {
        id: metadata.id,
        name: metadata.subject,
        owner: metadata.owner,
        description: metadata.desc,
        participants: metadata.participants?.map(p => ({
          id: p.id,
          phoneNumber: extractPhone(p.id), // Will be null for @lid
          isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
          isSuperAdmin: p.admin === 'superadmin'
        })) || [],
        creation: metadata.creation,
        restrict: metadata.restrict,
        announce: metadata.announce
      }
    });
  } catch (err) {
    console.error('Get group details error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new group
app.post('/groups/create', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { name, participants } = req.body;
    if (!name || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ success: false, error: 'Name and participants array required' });
    }
    
    const jids = participants.map(p => p.includes('@') ? p : p + '@s.whatsapp.net');
    const result = await sock.groupCreate(name, jids);
    
    res.json({ 
      success: true, 
      groupId: result.id,
      gid: result.gid
    });
  } catch (err) {
    console.error('Create group error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update group subject/name
app.post('/group/:groupId/subject', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { subject } = req.body;
    
    await sock.groupUpdateSubject(groupId, subject);
    res.json({ success: true });
  } catch (err) {
    console.error('Update subject error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update group description
app.post('/group/:groupId/description', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { description } = req.body;
    
    await sock.groupUpdateDescription(groupId, description || '');
    res.json({ success: true });
  } catch (err) {
    console.error('Update description error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add participants to group
app.post('/group/:groupId/add', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { participants } = req.body;
    
    if (!participants || !Array.isArray(participants)) {
      return res.status(400).json({ success: false, error: 'Participants array required' });
    }
    
    const jids = participants.map(p => p.includes('@') ? p : p + '@s.whatsapp.net');
    const result = await sock.groupParticipantsUpdate(groupId, jids, 'add');
    
    res.json({ success: true, result });
  } catch (err) {
    console.error('Add participants error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Remove participant from group
app.post('/group/:groupId/remove', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { participant } = req.body;
    
    if (!participant) {
      return res.status(400).json({ success: false, error: 'Participant ID required' });
    }
    
    const jid = participant.includes('@') ? participant : participant + '@s.whatsapp.net';
    const result = await sock.groupParticipantsUpdate(groupId, [jid], 'remove');
    
    res.json({ success: true, result });
  } catch (err) {
    console.error('Remove participant error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Promote participant to admin
app.post('/group/:groupId/promote', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { participant } = req.body;
    
    if (!participant) {
      return res.status(400).json({ success: false, error: 'Participant ID required' });
    }
    
    const jid = participant.includes('@') ? participant : participant + '@s.whatsapp.net';
    const result = await sock.groupParticipantsUpdate(groupId, [jid], 'promote');
    
    res.json({ success: true, result });
  } catch (err) {
    console.error('Promote participant error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Demote admin to participant
app.post('/group/:groupId/demote', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { participant } = req.body;
    
    if (!participant) {
      return res.status(400).json({ success: false, error: 'Participant ID required' });
    }
    
    const jid = participant.includes('@') ? participant : participant + '@s.whatsapp.net';
    const result = await sock.groupParticipantsUpdate(groupId, [jid], 'demote');
    
    res.json({ success: true, result });
  } catch (err) {
    console.error('Demote participant error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get group invite link
app.get('/group/:groupId/invite', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const inviteCode = await sock.groupInviteCode(groupId);
    const inviteLink = 'https://chat.whatsapp.com/' + inviteCode;
    
    res.json({ success: true, inviteCode, inviteLink });
  } catch (err) {
    console.error('Get invite link error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke group invite link
app.post('/group/:groupId/revoke-invite', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const newInviteCode = await sock.groupRevokeInvite(groupId);
    const inviteLink = 'https://chat.whatsapp.com/' + newInviteCode;
    
    res.json({ success: true, inviteCode: newInviteCode, inviteLink });
  } catch (err) {
    console.error('Revoke invite link error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Leave group
app.post('/group/:groupId/leave', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    await sock.groupLeave(groupId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Leave group error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update group settings (announce/restrict)
app.post('/group/:groupId/settings', authMiddleware, async (req, res) => {
  if (!sock || !sessionReady) return res.status(503).json({ success: false, error: 'WhatsApp not connected' });
  
  try {
    const { groupId } = req.params;
    const { announce, restrict } = req.body;
    
    const results = {};
    
    if (announce !== undefined) {
      // announce = true means only admins can send messages
      await sock.groupSettingUpdate(groupId, announce ? 'announcement' : 'not_announcement');
      results.announce = 'updated';
    }
    
    if (restrict !== undefined) {
      // restrict = true means only admins can edit group info
      await sock.groupSettingUpdate(groupId, restrict ? 'locked' : 'unlocked');
      results.restrict = 'updated';
    }
    
    res.json({ success: true, results });
  } catch (err) {
    console.error('Update settings error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

console.log('Group management endpoints loaded: /groups, /group/:id, /group/:id/add, /group/:id/remove, etc.');
