const fs = require('fs');
let code = fs.readFileSync('deploy/wa-baileys/server_vps_patched.js', 'utf8');

const groupReplacement = `
// ── Group Participants ───────────────────────────────────────────────────
app.post('/group-participants', async (req, res) => {
  const session = getSessionForRequest(req);
  if (!session.sock || session.connectionState !== 'connected') return res.status(503).json({ error: 'Not connected' });
  const { groupId, action, participants } = req.body;
  if (!groupId || !action || !participants) return res.status(400).json({ error: 'groupId, action and participants required' });
  const jid = groupId.includes('@') ? groupId : \`\${groupId}@g.us\`;
  const pList = Array.isArray(participants) ? participants : [participants];
  const formatted = pList.map(p => {
    const s = String(p);
    return s.includes('@') ? s : \`\${s.replace(/[^0-9]/g, '')}@s.whatsapp.net\`;
  });
  
  try {
    // --- ANTI-BAN: Group Action Delay ---
    // Actions like adding/removing from a group trigger intense spam checks.
    // We add a significant randomized delay (3 to 6 seconds) to mimic human clicking.
    await sleep(getRandomDelay(3000, 6000));
    
    const result = await session.sock.groupParticipantsUpdate(jid, formatted, action);
    res.json({ success: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
`;

// Replace the old group participants block
code = code.replace(/(\/\/ ── Group Participants ───────────────────────────────────────────────────)[\s\S]*?(?=\/\/ ── Group Promote\/Demote)/, groupReplacement);

fs.writeFileSync('deploy/wa-baileys/server_vps_patched2.js', code);
console.log('Group patch created!');
