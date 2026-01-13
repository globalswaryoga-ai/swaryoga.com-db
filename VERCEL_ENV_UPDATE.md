# Update Vercel Environment Variables

## Bridge URLs to Update

Change these environment variables in Vercel to point to your Mac's local IP:

### Current (EC2 - not working):
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
```

### New (Mac local - working):
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
WHATSAPP_BRIDGE_HTTP_URL=http://192.168.1.100:3333
```

Keep these unchanged:
```
NEXT_PUBLIC_WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
WHATSAPP_WEB_BRIDGE_SECRET=swar-bridge-secret-2024
```

---

## Steps

1. Go to: https://vercel.com/dashboard → Project Settings → Environment Variables
2. Find `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL`
3. Change value from `https://wa-bridge.swaryoga.com` to `http://192.168.1.100:3333`
4. Find `WHATSAPP_BRIDGE_HTTP_URL`
5. Change value from `https://wa-bridge.swaryoga.com` to `http://192.168.1.100:3333`
6. Redeploy or restart the Next.js app

---

## Important Notes

- Bridge must stay running on Mac: `cd deploy/wa-bridge && node server.js`
- Uses HTTP (not HTTPS) since it's local
- Only works from within your home network
- If you access from outside your network, this won't work (need VPN or proper tunneling)

---

## Test from CRM

After updating Vercel variables:
1. Go to https://crm.swaryoga.com/admin
2. Open WhatsApp QR section
3. Should show QR code from local bridge
4. Scan with your phone to log in
