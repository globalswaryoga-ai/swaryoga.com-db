# 📋 Meta WhatsApp Credentials Form

**Phone Number:** 9779006820 (Meta Verified)
**Date:** December 31, 2025
**Status:** Ready to connect

---

## 🔐 Collect Your Meta Credentials

Fill in these 5 fields from your Meta Business Manager account:

### Field 1: Phone Number ID
**Where to find:** Meta Business Manager → WhatsApp Accounts → Phone Numbers → Select your number → Copy ID

```
Label: metaPhoneNumberId
Value: _____________________________________________________
Example: 120265123456789
```

### Field 2: Business Account ID (WABA ID)
**Where to find:** Meta Business Manager → WhatsApp Accounts → Business Account ID

```
Label: metaBusinessAccountId
Value: _____________________________________________________
Example: 100123456789012
```

### Field 3: Access Token
**Where to find:** Meta Developers → App Settings → Tokens → Generate System User Access Token

⚠️ **Keep this SUPER SECRET! Never commit to git!**

```
Label: metaAccessToken
Value: _____________________________________________________
Example: EAA...YZD (very long string)
```

### Field 4: Webhook Verify Token
**Create this yourself:** Run in terminal to generate a secure string:

```bash
openssl rand -hex 32
```

⚠️ **Remember this! You'll need it to configure webhooks in Meta!**

```
Label: metaVerifyToken
Value: _____________________________________________________
Example: a1b2c3d4e5f6... (32-character hex string)
```

### Field 5: Your Phone Number
**Already known:**

```
Label: metaPhoneNumber
Value: +977-9006820
Or: 9779006820
```

---

## ✅ Complete This Before Adding to System

- [ ] Have Meta Business Manager access
- [ ] Have verified phone number (9779006820)
- [ ] Have copied Phone Number ID
- [ ] Have copied Business Account ID
- [ ] Have generated Access Token
- [ ] Have created Webhook Verify Token
- [ ] Have all 5 values written down above

---

## 🚀 Ready to Add to Your System?

Once you have all credentials filled in above, run this command:

```bash
# Set these as environment variables (temporarily)
export META_PHONE_ID="[Field 1 value]"
export META_BUSINESS_ACCOUNT_ID="[Field 2 value]"
export META_ACCESS_TOKEN="[Field 3 value]"
export META_VERIFY_TOKEN="[Field 4 value]"

# Then run the setup command (coming next)
# curl -X POST ... (see META_WHATSAPP_SETUP.md for full command)
```

---

## 📝 Store Safely

**After adding to system:**

1. **Store Access Token in password manager** (e.g., 1Password, LastPass)
   - Keep it safe - regenerate if compromised
   - Can be regenerated every 60 days

2. **Store Webhook Verify Token somewhere safe**
   - You'll need it to configure webhooks in Meta
   - Cannot be regenerated if lost

3. **Never commit to git**
   - Credentials are automatically in `.gitignore`
   - Double-check before committing

4. **Rotate every 90 days**
   - Generate new tokens regularly
   - Update in database when changed

---

## 🧪 Test Your Credentials

After adding to system, test:

```bash
# Check if account is connected
curl -X GET http://localhost:3000/api/admin/crm/whatsapp-accounts/[ACCOUNT_ID]/health-check \
  -H "Authorization: Bearer [YOUR_ADMIN_TOKEN]"

# Expected: status should be "connected"
```

---

**Next:** See `META_WHATSAPP_SETUP.md` for complete setup instructions
