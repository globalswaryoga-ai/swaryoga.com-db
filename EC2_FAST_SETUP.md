# ⚡ EC2 Setup - Fast Track (macOS)

## **One-Time Setup: 2 minutes**

### **Step 1: Install AWS CLI** (if not already installed)
```bash
brew install awscli
aws configure  # Enter your AWS Access Key and Secret
```

### **Step 2: Make script executable**
```bash
cd /Users/mohankalburgi/swaryoga.com-db
chmod +x setup-ec2-from-mac.sh
```

### **Step 3: Run the automated setup** ✨
```bash
./setup-ec2-from-mac.sh
```

**That's it! The script will:**
- ✅ Create EC2 instance (t2.micro, free tier)
- ✅ Configure security groups & firewall
- ✅ Install Node.js & PM2
- ✅ Clone and deploy bridge
- ✅ Test the bridge
- ✅ Update Vercel environment variables
- ✅ Commit and push to GitHub
- ✅ Display your EC2 IP and test commands

---

## **Timeline**
| Step | What | Time |
|------|------|------|
| 1 | Create instance | 30 sec |
| 2 | Wait for SSH | 30 sec |
| 3 | Install Node.js | 1 min |
| 4 | Deploy bridge | 1 min |
| 5 | Test & verify | 30 sec |
| 6 | Update Vercel | 30 sec |
| **Total** | **All done!** | **~4-5 min** |

---

## **After Setup**

### **Test QR Page**
```bash
# Wait ~2 minutes for Vercel to redeploy, then:
open https://crm.swaryoga.com/admin/crm/qr
```

### **Check Bridge Status**
```bash
# Replace EC2_IP with the IP shown in script output
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://EC2_IP:3333/status
```

### **SSH into EC2**
```bash
# Key and IP shown in script output
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ubuntu@EC2_IP

# Check bridge logs
pm2 logs whatsapp-bridge

# Restart if needed
pm2 restart whatsapp-bridge
```

---

## **Manual Method** (if script doesn't work)

If the script fails, follow the **step-by-step guide** in `EC2_BRIDGE_SETUP.md`

---

## **Need Help?**

Check troubleshooting in `EC2_BRIDGE_SETUP.md`

---

**Ready?** Run this now:
```bash
cd /Users/mohankalburgi/swaryoga.com-db && chmod +x setup-ec2-from-mac.sh && ./setup-ec2-from-mac.sh
```
