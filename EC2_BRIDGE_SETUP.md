# EC2 WhatsApp Bridge Setup Guide

## **Quick Timeline**
- EC2 Instance: ~5 min
- Install Node.js: ~2 min
- Deploy Bridge: ~3 min
- Update Vercel: ~2 min
- **Total: ~12 minutes**

---

## **Step 1: Launch EC2 Instance (5 min)**

### On AWS Console:

1. **Go to EC2 Dashboard** → Instances → Launch Instances
2. **Select AMI**: Ubuntu 24.04 LTS (free tier eligible)
3. **Instance Type**: `t2.micro` (free tier)
4. **Configure**:
   - VPC: Default
   - Auto-assign public IP: ✅ Enable
5. **Security Group**: Create new
   - Allow SSH (port 22) from your IP
   - Allow HTTP (port 80) from anywhere (0.0.0.0/0)
   - Allow port 3333 from anywhere (0.0.0.0/0)
6. **Storage**: 20 GB (free tier)
7. **Key Pair**: Create new → Save `.pem` file
8. **Launch** → Wait 2-3 minutes for instance to start

**Note your EC2 Public IP** (e.g., `54.123.456.789`)

---

## **Step 2: Connect to EC2 (2 min)**

```bash
# Make key readable
chmod 400 /path/to/your-key.pem

# SSH into instance
ssh -i /path/to/your-key.pem ubuntu@54.123.456.789
```

---

## **Step 3: Install Node.js & Git (2 min)**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Verify
node --version
npm --version
```

---

## **Step 4: Deploy Bridge Server (3 min)**

```bash
# Clone repo
cd /home/ubuntu
git clone https://github.com/globalswaryoga-ai/swaryoga.com-db.git
cd swaryoga.com-db/deploy/wa-bridge

# Install dependencies
npm install

# Start bridge (runs in background with PM2)
sudo npm install -g pm2
pm2 start server.js --name "whatsapp-bridge"
pm2 startup
pm2 save

# Check status
pm2 status
```

**Get EC2 IP:**
```bash
hostname -I
# Output: 54.123.456.789 (your public IP)
```

---

## **Step 5: Test Bridge on EC2 (1 min)**

```bash
# From your Mac, test the bridge
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://54.123.456.789:3333/status

# Should return JSON with QR data
```

---

## **Step 6: Update Vercel Environment Variables (2 min)**

In Vercel Dashboard → Settings → Environment Variables:

**Update for Production:**
- `NEXT_PUBLIC_WHATSAPP_BRIDGE_HTTP_URL` = `http://54.123.456.789:3333`
- `WHATSAPP_BRIDGE_HTTP_URL` = `http://54.123.456.789:3333`

**Update for Preview:**
- Same values

**Trigger Redeploy:**
```bash
cd /Users/mohankalburgi/swaryoga.com-db
git add . && git commit -m "chore: update bridge URL to EC2 instance"
git push origin main
```

---

## **Step 7: Test Production Endpoint (1 min)**

```bash
# Test from your Mac
curl https://crm.swaryoga.com/api/admin/crm/whatsapp/qr-bridge?path=%2Fstatus

# Should return QR code JSON in 2-3 seconds
```

---

## **Advantages of EC2:**

✅ **Permanent IP** - No tunnel URL changes  
✅ **Always Running** - 24/7 availability  
✅ **Scalable** - Can upgrade instance type anytime  
✅ **Free Tier** - First year free (t2.micro)  
✅ **No Dependencies** - No ngrok or Cloudflare needed  
✅ **Full Control** - SSH access to server  

---

## **Ongoing Maintenance:**

### **Check Bridge Status:**
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@54.123.456.789

# View logs
pm2 logs whatsapp-bridge

# Restart if needed
pm2 restart whatsapp-bridge

# Update code
cd swaryoga.com-db/deploy/wa-bridge
git pull
npm install
pm2 restart whatsapp-bridge
```

### **Monitor EC2:**
- **CPU/Memory**: AWS Console → EC2 → Monitoring
- **Uptime**: PM2 status dashboard
- **Traffic**: Check security group inbound rules

---

## **Cost Estimate:**
- **Year 1**: Free (AWS free tier)
- **Year 2+**: ~$10-15/month (t2.micro: $0.0116/hour)

---

## **Troubleshooting:**

| Issue | Fix |
|-------|-----|
| Can't connect to EC2 | Check security group allows port 22 from your IP |
| Bridge not responding | Check firewall: `sudo ufw allow 3333` |
| Port 3333 already in use | `sudo lsof -i :3333` and kill process |
| PM2 crashes on reboot | Run `pm2 startup && pm2 save` |

---

## **Next Steps:**

1. Launch EC2 instance
2. Run Steps 2-4 above
3. Get EC2 public IP
4. Update `.env.local` with EC2 IP
5. Test and deploy
6. Monitor on AWS console

**Questions?** DM or check PM2 logs!
