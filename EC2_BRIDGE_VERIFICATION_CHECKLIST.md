# EC2 Bridge Fix - Verification Checklist

## Complete Restart Procedure

### ✅ Before You Start

- [ ] You have SSH access to EC2 (52.91.198.23)
- [ ] You have the EC2 key file (.pem)
- [ ] You know the bridge directory path
- [ ] You have the bridge secret (swar-bridge-secret-2024)

### ✅ Step 1: Stop Existing Service

On EC2, run:
```bash
sudo lsof -ti:3333 | xargs sudo kill -9 2>/dev/null || true
docker stop $(docker ps | grep whatsapp | awk '{print $1}') 2>/dev/null || true
pm2 stop bridge && pm2 delete bridge 2>/dev/null || true
sleep 2
```

- [ ] No process on port 3333
- [ ] Docker container stopped
- [ ] PM2 process stopped

### ✅ Step 2: Navigate & Verify Code

On EC2:
```bash
cd ~/deploy/wa-bridge  # Update path as needed
ls -la server.js
grep "app.get('/chats'" server.js
grep "app.get('/health'" server.js
```

- [ ] server.js exists
- [ ] /chats endpoint present
- [ ] /health endpoint present

### ✅ Step 3: Start the Service

**Option A: Docker (Recommended)**
```bash
docker-compose down 2>/dev/null || true
sleep 2
docker-compose up -d
sleep 5
```

- [ ] Docker container started
- [ ] No errors in startup

**Option B: PM2**
```bash
npm install --production
pm2 start server.js --name bridge --env production
pm2 save
sleep 3
```

- [ ] Node.js process started
- [ ] PM2 saved

### ✅ Step 4: Verify on EC2

Run these commands on EC2:
```bash
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/health
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://localhost:3333/chats
```

Expected responses:
- [ ] /health returns: `{"ok": true, "port": 3333}`
- [ ] /chats returns: `{"chats": [...]}`
- [ ] No 404 errors
- [ ] No "Cannot GET" messages

### ✅ Step 5: Check Logs

**Docker:**
```bash
docker logs $(docker ps | grep whatsapp | awk '{print $1}')
```

**PM2:**
```bash
pm2 logs bridge
```

- [ ] No error messages
- [ ] Bridge is initializing
- [ ] WhatsApp client loading

### ✅ Step 6: From Your Mac

Exit EC2 and run:
```bash
./test-bridge-health.sh http://52.91.198.23:3333 swar-bridge-secret-2024
```

Expected:
```
✅ Bridge is responding
✅ Health check passed
✅ QR endpoint available
✅ Status endpoint available
✅ Chats endpoint available
```

- [ ] All tests pass
- [ ] No connection errors
- [ ] Health check successful

### ✅ Step 7: Test in Browser

1. Open QR page: `/admin/crm/qr`
2. Check console for errors:
   - [ ] No "[loadChats] /chats endpoint not found (404)"
   - [ ] No "Bridge error" messages
   - [ ] No socket connection errors

3. Verify chat loading:
   - [ ] Chat list appears (not empty)
   - [ ] No "Falling back to cached chats" warning
   - [ ] Chat count > 0

### ✅ Step 8: Send Test Message

1. In QR page:
   - [ ] Select a chat
   - [ ] Type a test message
   - [ ] Click Send

2. Verify:
   - [ ] Message sends (no error)
   - [ ] Message appears in conversation immediately
   - [ ] Status shows "Sent" (not "Sending")

### ✅ Step 9: Real-time Updates

1. Send a message from WhatsApp to the bot
2. Check QR page:
   - [ ] Incoming message appears immediately
   - [ ] No refresh needed
   - [ ] Timestamp is current

---

## Success Indicators

All of these should be TRUE:

✅ /health endpoint returns JSON with "ok"
✅ /chats endpoint returns chat list
✅ /status endpoint returns connection state
✅ /qr endpoint shows QR if not connected
✅ QR page loads chats from bridge
✅ Messages send and appear immediately
✅ Incoming messages appear in real-time
✅ No console errors or 404s
✅ Browser doesn't fall back to localStorage cache
✅ Chat list updates without refresh

---

## Troubleshooting

### Problem: /health returns "Cannot GET"
- Bridge code is not the whatsapp-web.js version
- Check server.js has whatsapp-web.js imports
- Verify you're in the correct directory
- Redeploy code if needed

### Problem: "Cannot connect to WhatsApp"
- Browser automation can't start
- Check EC2 has Chrome/Chromium installed
- Check EC2 has enough memory/disk
- Check EC2 can reach WhatsApp servers

### Problem: /chats endpoint times out
- Browser is slow or hanging
- WhatsApp Web is not fully loaded
- Check EC2 resource usage (CPU, memory)

### Problem: QR page still shows 404
- Bridge is running but on wrong port
- Verify port 3333 is correct
- Check firewall allows 3333
- Restart proxy server if needed

### Problem: Messages don't appear after sending
- Check EC2 logs for errors
- Verify auth session is valid
- Try scanning QR code again
- Check .wwebjs_auth directory exists

---

## Files for Reference

- Restart script: [ec2-bridge-restart.sh](ec2-bridge-restart.sh)
- Direct commands: [EC2_BRIDGE_DIRECT_COMMANDS.md](EC2_BRIDGE_DIRECT_COMMANDS.md)
- Health test: [test-bridge-health.sh](test-bridge-health.sh)
- QR page code: [app/admin/crm/qr/page.tsx](app/admin/crm/qr/page.tsx)
- Bridge code: [deploy/wa-bridge/server.js](deploy/wa-bridge/server.js)

---

## Timeline

- **Now**: Run restart commands
- **+2 min**: Test endpoints
- **+5 min**: Refresh browser
- **+5 min**: Send test message
- **+10 min**: Verify all features work

**Total Time: ~15 minutes**

---

## Commit

This fix is tracked in commit: **fe0ea95**

If you need to reference this later, use:
```bash
git show fe0ea95
```

