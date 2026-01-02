# WhatsApp Bridge Deployment Checklist

Use this checklist while deploying to your VPS.

---

## ✋ Info Needed From You

**Fill in these details before starting:**

```
VPS Provider: __________________ (AWS EC2 / DigitalOcean / Hetzner / etc.)
VPS IP Address: ________________

SSH Access:
  - Username: __________________ (usually: ubuntu, admin, or root)
  - Key file path: __________________ (or password if using password auth)
  - Command to connect: ssh -i /path/key.pem ubuntu@IP

Domain: wa-bridge.swaryoga.com
CRM Domain(s): __________________ (e.g., admin.swaryoga.com, swaryoga.com)
```

---

## ✅ Step-by-Step Checklist

### Phase 1: VPS Preparation (5 mins)
- [ ] SSH into VPS: `ssh ubuntu@YOUR_VPS_IP`
- [ ] Run: `sudo apt update && sudo apt upgrade -y`
- [ ] Install Docker: Use command from guide Step 1.2
- [ ] Install Nginx: `sudo apt install -y nginx`
- [ ] Install Certbot: `sudo apt install -y certbot python3-certbot-nginx`
- [ ] Verify: `docker --version`, `docker-compose --version`, `nginx -v`

### Phase 2: Deploy Bridge (10 mins)
- [ ] Clone or copy repo to `/opt/swaryoga` or `/opt/wa-bridge`
- [ ] Copy `.env.example` to `.env`
- [ ] Edit `.env` with:
  - [ ] `WHATSAPP_WEB_ALLOWED_ORIGINS` = your CRM domains
  - [ ] `WHATSAPP_WEB_BRIDGE_SECRET` = random 32-char string (optional)
- [ ] Run: `docker-compose build`
- [ ] Run: `docker-compose up -d`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Verify: `curl http://127.0.0.1:3333/health` → Should return `{"status":"ok"}`

### Phase 3: Configure Nginx (5 mins)
- [ ] Copy Nginx config: `sudo cp nginx-wa-bridge.conf /etc/nginx/sites-available/wa-bridge`
- [ ] Enable: `sudo ln -s /etc/nginx/sites-available/wa-bridge /etc/nginx/sites-enabled/wa-bridge`
- [ ] Test: `sudo nginx -t` → Should say "successful"
- [ ] Reload: `sudo systemctl reload nginx`

### Phase 4: SSL Certificate (5 mins)
- [ ] **IMPORTANT:** Point DNS A record `wa-bridge.swaryoga.com` → your VPS IP
- [ ] Wait 5-10 mins for DNS to propagate
- [ ] Verify DNS: `nslookup wa-bridge.swaryoga.com` → Should show your VPS IP
- [ ] Issue cert: `sudo certbot --nginx -d wa-bridge.swaryoga.com`
- [ ] Choose option 2: Redirect HTTP to HTTPS
- [ ] Certbot auto-updates Nginx config
- [ ] Verify: `curl https://wa-bridge.swaryoga.com/health` → Should return `{"status":"ok"}`

### Phase 5: CRM Configuration (5 mins)
- [ ] Update `.env.local` on your development machine:
  ```bash
  NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
  NEXT_PUBLIC_WHATSAPP_BRIDGE_WS_URL=wss://wa-bridge.swaryoga.com
  WHATSAPP_BRIDGE_HTTP_URL=https://wa-bridge.swaryoga.com
  WHATSAPP_WEB_BRIDGE_SECRET=your_secret_from_step_above (if set)
  ```
- [ ] Or add to Vercel Dashboard → Environment Variables
- [ ] Restart dev server or redeploy to Vercel

### Phase 6: Testing (5 mins)
- [ ] Go to `/admin/crm?page=whatsapp-web` in browser
- [ ] Click "Open QR Login"
- [ ] Verify QR code loads from bridge
- [ ] Scan with your personal WhatsApp number
- [ ] Wait for "Connected" message
- [ ] Send test message → Should arrive on WhatsApp

---

## 🚨 Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| `curl http://127.0.0.1:3333/health` fails | Check `docker-compose logs -f` for errors |
| Nginx test fails | Check nginx-wa-bridge.conf syntax: `grep "server_name\|location\|proxy_pass"` |
| SSL cert fails | Verify DNS points to correct IP: `nslookup wa-bridge.swaryoga.com` |
| QR code won't load | Check CORS: `cat .env \| grep WHATSAPP_WEB_ALLOWED_ORIGINS` |
| WebSocket connection fails | Check Nginx has upgrade headers (see guide Step 3.1) |
| "Failed to load resource: 404" in browser | Bridge not running or not reachable through Nginx |

---

## 📞 Support Commands

**Always start with these diagnostics:**

```bash
# Check bridge status
cd /opt/wa-bridge
docker-compose ps
docker-compose logs --tail 50

# Check Nginx routing
sudo nginx -t
sudo systemctl status nginx
curl -v https://wa-bridge.swaryoga.com/health

# Check DNS
nslookup wa-bridge.swaryoga.com

# Check SSL cert
sudo certbot certificates
```

---

## ⏱️ Estimated Total Time: 30-45 minutes

- Phase 1: 5 mins
- Phase 2: 10 mins (first build takes longer)
- Phase 3: 5 mins
- Phase 4: 5-10 mins (DNS propagation + cert issuance)
- Phase 5: 5 mins
- Phase 6: 5 mins

---

**Good luck! 🚀**

Once complete, both WhatsApp pages will be fully operational:
- ✅ Meta WhatsApp Cloud API (Page 1)
- ✅ Personal WhatsApp Web QR (Page 2)
