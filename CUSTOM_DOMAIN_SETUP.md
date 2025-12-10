# Custom Domain Setup: swaryoga.com → Vercel Deployment

## ✅ Current Status
- **Application:** Successfully deployed on Vercel
- **Auto-Generated URL:** `https://swar-yoga-latest-latest-prod-version-oxtf58xh8.vercel.app` (LIVE)
- **Custom Domain:** `swaryoga.com` (NOT YET CONFIGURED)

---

## 📋 Step-by-Step Setup Instructions

### Step 1: Access Vercel Dashboard
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Sign in with your account
3. Find and click on your project: **"swar-yoga-latest"**

### Step 2: Add Custom Domain in Vercel
1. In your project, go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter: `swaryoga.com`
4. Select **Add** and wait for Vercel to generate DNS instructions

### Step 3: Vercel Will Show You DNS Configuration
Vercel will display one of these options:

**Option A: Using CNAME (Recommended)**
```
Type:  CNAME
Name:  @ or blank
Value: cname.vercel.com
```

**Option B: Using A Records**
```
Type:  A
Name:  @ or blank
Value: 76.76.19.140 (or other IP shown in Vercel)
```

**Option C: Using CNAME for subdomain**
```
Type:  CNAME
Name:  www
Value: cname.vercel.com
```

### Step 4: Update DNS at Your Domain Registrar
1. Go to where **swaryoga.com** is registered (GoDaddy, Namecheap, Cloudflare, etc.)
2. Find **DNS Settings** or **DNS Management**
3. Look for **DNS Records** section
4. Remove or update the existing DNS records pointing to the old hosting
5. Add the **new DNS records** provided by Vercel (from Step 3)

### Step 5: Wait for DNS Propagation
- DNS changes take **24-48 hours** to fully propagate
- Check status: [https://dnschecker.org](https://dnschecker.org)
  - Search for: `swaryoga.com`
  - Verify it resolves to Vercel IPs

### Step 6: Enable HTTPS/SSL
- Vercel automatically provisions SSL certificates
- Once DNS is propagated, HTTPS will be active
- No additional action needed

### Step 7: Verify in Vercel Dashboard
- Go back to **Settings** → **Domains**
- You should see: `swaryoga.com` with status **✅ Valid Configuration**

---

## 🔍 Current DNS Status

```
Current IPs for swaryoga.com:
- 64.29.17.65
- 216.198.79.65

These are NOT Vercel IPs and need to be replaced with Vercel's DNS records.
```

---

## ⚠️ Important Notes

1. **Do NOT delete swaryoga.com DNS records** until you've added Vercel's records
2. **Keep both pointing to Vercel** until DNS propagates
3. **If using Cloudflare:** Make sure to disable Cloudflare's proxy (set to DNS only) during setup
4. **Email might be affected:** If you have email set up for swaryoga.com, preserve those MX records

---

## 🧪 Testing

Once DNS is propagated:

1. **Test in browser:**
   ```
   https://swaryoga.com
   ```

2. **Test via terminal:**
   ```bash
   nslookup swaryoga.com
   # Should resolve to Vercel IPs (cname.vercel.com)
   ```

3. **Verify HTTPS:**
   - Certificate should show Vercel/Let's Encrypt
   - No security warnings

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| DNS still points to old IP | Wait 24-48 hours for propagation, then check with `nslookup swaryoga.com` |
| Domain shows "Pending" in Vercel | Ensure DNS records are correctly added at your registrar |
| HTTPS certificate not working | Wait another 24 hours, Vercel needs to validate domain ownership |
| Getting 404 on swaryoga.com | Check vercel.json rewrites are correct for SPA routing |

---

## 📞 Need Help?

- **Vercel Support:** [https://vercel.com/support](https://vercel.com/support)
- **Domain Registrar Support:** Contact where you registered swaryoga.com
- **Check DNS:** [https://dnschecker.org](https://dnschecker.org) or use `nslookup swaryoga.com`

---

## ✅ Checklist

- [ ] Logged into Vercel Dashboard
- [ ] Added `swaryoga.com` as custom domain
- [ ] Copied DNS records from Vercel
- [ ] Logged into domain registrar
- [ ] Updated DNS records at registrar
- [ ] Verified DNS propagation (24-48 hours)
- [ ] Tested `https://swaryoga.com` in browser
- [ ] Confirmed HTTPS certificate is valid

---

**Last Updated:** December 10, 2025
**Status:** Ready for Custom Domain Configuration
