# WhatsApp Bridge Diagnostic Report

## Issue Summary

The QR page is getting HTTP 404 on the `/chats` endpoint:
- **Error**: `[loadChats] /chats endpoint not found (404) - bridge may be outdated`
- **Impact**: Messages don't load in QR interface (falls back to localStorage cache)
- **Affected Endpoint**: `GET http://52.91.198.23:3333/chats`

## Root Cause Analysis

### Current Bridge Status
- ✅ Server IS responding on port 3333
- ✅ Express is running (X-Powered-By: Express header)
- ❌ The endpoints ARE NOT from whatsapp-web.js bridge
- ❌ `/health`, `/chats`, `/messages` endpoints return 404

### What This Means
The bridge server on EC2 (52.91.198.23:3333) appears to be running an **empty Express server** or a **crashed/reset service**, not the actual WhatsApp bridge code from `deploy/wa-bridge/server.js`.

The proper server should return:
```json
{ "ok": true, "port": 3333 }
```

But instead returns:
```html
Cannot GET /health
```

## Expected Bridge Endpoints

The `deploy/wa-bridge/server.js` includes these endpoints:

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/health` | GET | ❌ Missing | Should return `{"ok": true, "port": 3333}` |
| `/qr` | GET | ❌ Missing | Should return QR code image |
| `/status` | GET | ❌ Missing | Should return connection status |
| `/chats` | GET | ❌ Missing | Should return list of chats |
| `/messages/:chatId` | GET | ❌ Missing | Should return messages from a chat |
| `/send` | POST | ❌ Missing | Should send a message |
| `/profile` | GET | ❌ Missing | Should return profile info |

## Possible Causes

1. **Bridge Process Crashed** - Node.js process exited, port now has default Express server
2. **Docker Container Not Running** - The docker-compose setup is not running
3. **PM2 Process Crashed** - If using PM2, the whatsapp-web.js process may have crashed
4. **Outdated Code** - Bridge server code wasn't updated to include `/chats` endpoint
5. **Environment Variables Wrong** - BRIDGE_SECRET mismatch could cause auth failures

## Solution Steps

### Step 1: SSH into EC2 and Check Process

```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@52.91.198.23

# Check if docker container is running
docker ps | grep -i whatsapp

# Check if PM2 process is running
pm2 list | grep bridge

# Check logs
docker logs <container-id>  # if using docker
pm2 logs bridge            # if using PM2
```

### Step 2: Verify Bridge Code

Confirm the bridge server has been deployed with the updated code including:
- whatsapp-web.js Client initialization
- `/chats` endpoint (line 403 of server.js)
- `/health` endpoint (line 860 of server.js)

### Step 3: Restart the Service

**Option A: Docker Compose**
```bash
cd /path/to/deploy/wa-bridge
docker-compose down
docker-compose up -d
```

**Option B: PM2**
```bash
pm2 restart bridge
pm2 save
```

### Step 4: Verify Bridge is Working

```bash
curl -H "x-bridge-secret: swar-bridge-secret-2024" http://52.91.198.23:3333/health
# Should return: {"ok": true, "port": 3333}

curl -H "x-bridge-secret: swar-bridge-secret-2024" http://52.91.198.23:3333/chats
# Should return: {"chats": [...]}
```

## Environment Variables to Check

The EC2 bridge needs these env vars:

```
PORT=3333
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
SESSION_DIR=/tmp/.wwebjs_auth (or persistent volume)
CLIENT_ID=swar-bridge-session
```

The Next.js app needs:
```
WHATSAPP_BRIDGE_HTTP_URL=http://52.91.198.23:3333 (or https://wa-bridge.swaryoga.com)
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
```

## Impact on Message Sending

- ✅ **Message Sending**: Still works (uses `/send` endpoint or direct bridge calls)
- ✅ **Outgoing Messages**: Being logged and sent
- ❌ **Message Visibility**: Messages don't appear in QR interface because `/chats` returns 404
- ⚠️ **Fallback**: QR page uses localStorage cache (works but not real-time)

## Testing After Fix

1. SSH to EC2, restart bridge service
2. Test `/health` endpoint responds with 200 OK
3. Test `/chats` endpoint returns chat list
4. Refresh QR page in browser
5. Messages should now load from bridge instead of cache
6. New outgoing messages should appear immediately

## Files Involved

- **Bridge Server**: `deploy/wa-bridge/server.js` (should be running on EC2)
- **Proxy Handler**: `app/api/admin/crm/whatsapp/qr-bridge/route.ts` (proxies requests)
- **QR Page**: `app/admin/crm/qr/page.tsx` (calls `/chats` endpoint)
- **Bridge Setup**: `deploy/wa-bridge/docker-compose.yml` (deployment config)

## Next Steps

**Immediate Action**: SSH to EC2 and restart the WhatsApp bridge service using either Docker Compose or PM2.

**Permanent Fix**: Consider implementing:
1. Health check monitoring for the bridge
2. Automatic restart if bridge goes down
3. Bridge deployment automation
4. Docker registry for versioned bridge images
