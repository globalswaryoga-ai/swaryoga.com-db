# AWS & Zoom Credentials Collection Sheet

## 📋 Fill in Your Credentials Here

When you've completed the AWS and Zoom setup, provide these credentials. Keep this file secure and never commit to git!

---

## 🟦 AWS S3 Details

**Your AWS Account Setup:**
```
AWS Account ID: ____________________________
AWS Region: ____________________________
IAM Username: ____________________________
```

**S3 Buckets Created:**
```
Public Media Bucket Name: ____________________________
  (e.g., swaryoga-media, swaryoga-media-v2)
  
Private Recordings Bucket Name: ____________________________
  (e.g., swaryoga-recordings, swaryoga-recordings-v2)
```

**IAM User Access Keys:**
```
Access Key ID:
____________________________
____________________________
____________________________

Secret Access Key:
____________________________
____________________________
____________________________
(Keep this secret! Never share or commit to git)
```

**S3 Bucket Permissions Verified:**
- [ ] Public bucket has CORS enabled
- [ ] Private bucket blocks public access
- [ ] IAM user has S3FullAccess policy
- [ ] Bucket lifecycle policies configured (if archiving old files)

---

## 🟪 Zoom OAuth App Details

**Zoom Account Setup:**
```
Zoom Email: ____________________________
Zoom Account ID:
____________________________
____________________________
____________________________

Zoom Account Admin URL:
____________________________
```

**Server-to-Server OAuth App:**
```
App Name: ____________________________
Client ID:
____________________________
____________________________
____________________________

Client Secret:
____________________________
____________________________
____________________________
(Keep this secret! Never share or commit to git)

Webhook Token (optional):
____________________________
```

**Zoom Features Enabled:**
- [ ] Cloud Recording enabled
- [ ] Auto Recording enabled (set to "cloud")
- [ ] Recording type: "Audio and Video"
- [ ] Meeting recording option visible to users

---

## ✅ Verification Checklist

Before providing these credentials, verify:

### AWS
- [ ] S3 buckets exist and accessible
- [ ] IAM user created with S3FullAccess
- [ ] Access keys generated and tested
- [ ] Can upload/download test file to bucket
- [ ] CORS configured on public bucket
- [ ] Cost alerts set up in billing

### Zoom
- [ ] OAuth app created in Marketplace
- [ ] Client ID and Secret generated
- [ ] Account ID copied correctly
- [ ] Test: Can create meeting via API
- [ ] Test: Cloud recording enabled and working
- [ ] Webhook token saved (if using webhooks)

---

## 📝 Implementation Instructions

Once you provide the credentials above:

1. **Update `.env.local`:**
   ```env
   AWS_REGION=your_region
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_S3_BUCKET=your_public_bucket_name
   AWS_S3_RECORDINGS_BUCKET=your_private_bucket_name
   
   ZOOM_CLIENT_ID=your_client_id
   ZOOM_CLIENT_SECRET=your_client_secret
   ZOOM_ACCOUNT_ID=your_account_id
   ZOOM_WEBHOOK_SECRET=your_webhook_token
   ```

2. **Install dependencies:**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner axios
   ```

3. **Restart dev server:**
   ```bash
   npm run dev
   ```

4. **Run tests to verify:**
   ```bash
   # Test S3 connection
   curl -X POST http://localhost:3000/api/admin/test/upload-s3 \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -F "file=@test.jpg"
   
   # Test Zoom connection
   curl -X POST http://localhost:3000/api/admin/test/create-zoom-meeting \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"topic":"Test","startTime":"2024-02-15T10:00:00Z","duration":60}'
   ```

---

## 🔐 Security Guidelines

⚠️ **CRITICAL:**

1. **Never commit credentials to git**
   - Add `.env.local` to `.gitignore` (already done)
   - Never paste credentials in code files

2. **Store securely**
   - Use password manager (1Password, LastPass, Bitwarden)
   - Share only via secure channels
   - Rotate keys periodically (every 90 days recommended)

3. **Monitor usage**
   - Set up AWS billing alerts
   - Monitor Zoom API usage (5000 req/hour limit)
   - Review S3 access logs monthly

4. **Restrict permissions**
   - IAM user should have ONLY S3 access needed
   - Don't use root AWS account credentials
   - Enable MFA on AWS account

5. **Backup credentials**
   - Store backup in secure location (safe, encrypted drive)
   - Document recovery procedures
   - Have alternate contact person who has credentials

---

## 📞 Support Resources

If you get stuck:

1. **AWS Documentation:**
   - S3 Setup: https://docs.aws.amazon.com/s3/
   - IAM: https://docs.aws.amazon.com/iam/
   - Cost Calculator: https://aws.amazon.com/s3/pricing/

2. **Zoom Documentation:**
   - OAuth: https://developers.zoom.us/docs/internal-apps/oauth/
   - Recordings: https://developers.zoom.us/docs/api/rest/reference/cloud-recordings/
   - Webhooks: https://developers.zoom.us/docs/api/webhook/validation/

3. **Local Testing:**
   - Check `.env.local` has all required variables
   - Run `npm run dev` with `DEBUG=*` for verbose logs
   - Use AWS CLI to test credentials: `aws s3 ls`

---

## 📋 Checklist Summary

- [ ] AWS S3 buckets created
- [ ] IAM user created with S3 access
- [ ] Access keys generated and tested
- [ ] Zoom OAuth app created
- [ ] Zoom Client ID and Secret obtained
- [ ] Zoom Account ID identified
- [ ] All credentials filled in above
- [ ] `.env.local` updated with credentials
- [ ] Dependencies installed (`npm install`)
- [ ] Dev server restarted (`npm run dev`)
- [ ] APIs tested successfully
- [ ] Credentials backed up securely
- [ ] Team members granted access (if needed)

---

**Once complete, you're ready to start building the Recorded Workshops and Media Pages! 🚀**
