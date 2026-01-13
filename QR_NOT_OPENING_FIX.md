# QR Code Not Opening on Domain - Troubleshooting Guide

## Problem
QR code not loading on `crm.swaryoga.com/admin/crm`

## Root Causes

### 1. **Bridge URL Misconfiguration**
The app is trying to reach `localhost:3333` which doesn't work from a domain.

**Solution:**
```bash
# Update environment for your domain and bridge IP
node scripts/setup-domain.js crm.swaryoga.com 13.51.112.100
```

### 2. **Bridge Not Accessible**
Bridge service is not running or not accessible from the domain.

**Check bridge status:**
```bash
# Check if bridge is running
curl http://13.51.112.100:3333/health

# Check detailed bridge status
curl http://13.51.112.100:3333/status
```

### 3. **CORS Issues**
Domain requests being blocked by CORS.

**Solution:** The API proxy at `/api/admin/crm/whatsapp/qr-bridge` should handle this, but verify it's working:
```bash
curl -X GET 'https://crm.swaryoga.com/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus'
```

### 4. **SSL Certificate Issues**
HTTPS domain can't reach HTTP bridge.

**Solution:** Either:
- Use HTTPS bridge (requires SSL certificate)
- Use HTTP bridge on EC2 (recommended for same network)
- Use bridge.yourdomain.com (separate SSL cert for bridge)

## Step-by-Step Fix

### Step 1: Verify Environment Configuration
```bash
# Check current bridge URL
grep NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL .env.local

# Should show your bridge IP/domain, not localhost
```

### Step 2: Update Configuration (if needed)
```bash
# For EC2 bridge at IP 13.51.112.100
node scripts/setup-domain.js crm.swaryoga.com 13.51.112.100
```

### Step 3: Verify Bridge Connection
```bash
# From your domain server/client
curl -v http://13.51.112.100:3333/status

# Should return:
# {"status":"connected"/"qr"/"disconnected", "hasQr":true/false, ...}
```

### Step 4: Check Browser Console
Open dev tools (F12) on the QR page:
1. Go to Console tab
2. Look for network errors
3. Check what URLs are being called

Expected sequence:
- `GET /api/admin/crm/whatsapp/qr-bridge?path=/status` → 200
- Response should include QR code or status

### Step 5: Restart Services (if needed)
```bash
# Kill old bridge
pkill -f "node.*wa-bridge"

# Start bridge on EC2
cd /path/to/deploy/wa-bridge
nohup node server.js > wa-bridge.log 2>&1 &

# Verify it's running
lsof -i:3333
```

### Step 6: Clear Browser Cache
- Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows/Linux)
- Clear browser cache and cookies
- Try in incognito/private window

## Configuration Examples

### Local Development (localhost:3020)
```env
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333
NEXT_BASE_URL=http://localhost:3020
```

### Production (Domain with EC2 Bridge)
```env
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://13.51.112.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://13.51.112.100:3333
NEXT_BASE_URL=https://crm.swaryoga.com
NEXTAUTH_URL=https://crm.swaryoga.com
```

### Production (Bridge on Same Domain via Subdomain)
```env
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=http://localhost:3333  # Internal server-side call
NEXT_BASE_URL=https://crm.swaryoga.com
```

## Common Issues & Fixes

### Issue: "Bridge not reachable"
- Check firewall rules allow 3333
- Check security group allows inbound 3333
- Verify EC2 instance is running
- Check bridge process: `ps aux | grep node | grep bridge`

### Issue: "QR button shows but nothing happens"
- Check browser console for errors
- Verify API proxy endpoint is working
- Check bridge status manually

### Issue: "QR shows but won't scan"
- This means bridge IS connected but Chrome might not have webcam access
- Grant camera permission in browser
- Or use QR scanner app on phone

### Issue: "Timeout errors"
- Bridge is too slow or unreachable
- Increase timeout in code (currently 8-12 seconds)
- Check EC2 instance performance
- Check network latency

## API Proxy Route Details

Location: `app/api/admin/crm/whatsapp/qr-bridge/route.ts`

Flow:
1. Browser calls: `GET /api/admin/crm/whatsapp/qr-bridge?path=/status`
2. Server receives request
3. Server calls: `http://WHATSAPP_BRIDGE_HTTP_URL/status`
4. Server returns response to browser

This proxy avoids CORS issues and centralizes bridge configuration.

## Testing

### Quick Test (20 concurrent users)
```bash
# Test QR page under load
npm run test:load

# Should complete with 100% success rate for domain to work
```

### Domain-specific Test
```bash
# Test against production domain
BASE_URL=https://crm.swaryoga.com npm run test:load:domain
```

## Debugging Logs

Check server logs for bridge errors:
```bash
# Dev server logs (shows API proxy calls)
# Check terminal where npm run dev is running

# Bridge logs (on EC2)
tail -f /tmp/wa-bridge.log
ssh admin@13.51.112.100 "tail -f wa-bridge.log"
```

## Need More Help?

1. Check bridge status: `curl http://13.51.112.100:3333/status`
2. Verify domain DNS: `nslookup crm.swaryoga.com`
3. Check network connectivity: `ping 13.51.112.100`
4. Review API proxy logs in dev console
5. Check .env.local is correctly updated
