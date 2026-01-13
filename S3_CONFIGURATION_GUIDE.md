# AWS S3 Media Upload Configuration Guide

## Overview
The WhatsApp bridge now includes a `/media/upload` endpoint that handles file uploads. To enable media uploads to S3, you need to configure AWS credentials on the EC2 instance.

---

## Prerequisites

1. **AWS Account** with S3 access
2. **S3 Bucket** created (e.g., `swar-yoga-media`)
3. **IAM User** with S3 permissions
4. **Access Key ID** and **Secret Access Key** from IAM

---

## Step-by-Step Configuration

### 1. Create IAM User (if not exists)

```bash
# In AWS Console:
1. Go to IAM → Users → Create User
2. User name: whatsapp-bridge (or similar)
3. Enable programmatic access
4. Attach policy: AmazonS3FullAccess (or create custom policy)
5. Save Access Key ID and Secret Access Key
```

### 2. Create S3 Bucket (if not exists)

```bash
# Via AWS Console or AWS CLI:
aws s3 mb s3://swar-yoga-media --region ap-south-1

# Enable public read access (optional, if serving images publicly):
# Bucket → Permissions → Block public access → Uncheck all
# Bucket → Permissions → Bucket policy → Add policy for GetObject
```

### 3. SSH into EC2 Instance

```bash
ssh -i ~/.ssh/swar-yoga-bridge-key.pem ec2-user@3.109.154.61
```

### 4. Configure Environment Variables

Create or update the bridge environment file:

```bash
# Option A: Add to .env file in bridge directory
cd /home/ec2-user/swaryoga.com-db/deploy/wa-bridge
cat > .env << 'EOF'
AWS_ACCESS_KEY_ID=your-access-key-id-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_S3_BUCKET=swar-yoga-media
AWS_REGION=ap-south-1
PORT=3333
WHATSAPP_BRIDGE_SECRET=swar-bridge-secret-2024
EOF
```

### 5. Update PM2 Configuration (Recommended for Persistence)

Create an ecosystem file for PM2:

```bash
cat > /home/ec2-user/swaryoga.com-db/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'whatsapp-bridge',
      script: '/home/ec2-user/swaryoga.com-db/deploy/wa-bridge/server.js',
      cwd: '/home/ec2-user/swaryoga.com-db/deploy/wa-bridge',
      env: {
        NODE_ENV: 'production',
        PORT: 3333,
        AWS_ACCESS_KEY_ID: 'your-access-key-id-here',
        AWS_SECRET_ACCESS_KEY: 'your-secret-access-key-here',
        AWS_S3_BUCKET: 'swar-yoga-media',
        AWS_REGION: 'ap-south-1',
        WHATSAPP_BRIDGE_SECRET: 'swar-bridge-secret-2024'
      },
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/error.log',
      out_file: './logs/out.log'
    }
  ]
};
EOF
```

### 6. Install Dependencies and Restart

```bash
cd /home/ec2-user/swaryoga.com-db/deploy/wa-bridge

# Pull latest code (if not done already)
cd ..
git pull origin main
cd wa-bridge

# Install multer if not already installed
npm install

# Restart PM2 with ecosystem file
pm2 delete whatsapp-bridge 2>/dev/null || true
pm2 start ecosystem.config.js

# Verify
pm2 status
pm2 logs whatsapp-bridge --lines 20
```

---

## Testing Media Upload

### 1. Test Upload Endpoint Directly

```bash
# Create a test file
echo "test content" > /tmp/test.txt

# Upload to bridge (requires valid AWS credentials)
curl -X POST \
  -H "x-bridge-secret: swar-bridge-secret-2024" \
  -F "file=@/tmp/test.txt" \
  http://localhost:3333/media/upload
```

Expected response:
```json
{
  "success": true,
  "url": "https://swar-yoga-media.s3.ap-south-1.amazonaws.com/whatsapp-media/1673798400000-test.txt",
  "key": "whatsapp-media/1673798400000-test.txt",
  "size": 12,
  "mimetype": "text/plain",
  "name": "test.txt"
}
```

### 2. Test via UI

1. Open `/admin/crm/qr` in browser
2. Select a chat
3. Click the "+" button to upload media
4. Select an image/video
5. Check browser console for upload logs
6. If successful, image should appear in chat
7. If error, check for AWS credential messages

### 3. Check Bridge Logs

```bash
pm2 logs whatsapp-bridge --lines 50
```

Look for:
- ✅ `[media/upload] Received file upload request`
- ✅ `[media/upload] Processing file:`
- ✅ `[media/upload] ✓ File processed:`
- ❌ `[media/upload] ⚠ Missing AWS credentials` (if config missing)

---

## Troubleshooting

### Issue: "S3 upload not configured"

**Solution**: Check AWS credentials in PM2 ecosystem file or .env

```bash
pm2 show whatsapp-bridge
# Look for AWS_* variables in "env"
```

### Issue: "Access Denied" from AWS

**Possible Causes**:
1. Wrong Access Key ID or Secret Key
2. IAM user doesn't have S3 permissions
3. S3 bucket doesn't exist

**Solution**:
```bash
# Test AWS credentials locally
aws s3 ls --profile default

# If error, verify credentials:
cat ~/.aws/credentials  # Check format
aws configure            # Reconfigure if needed
```

### Issue: Files uploaded but not visible in S3

**Solution**:
1. Check bucket name and region
2. Verify bucket visibility in AWS Console
3. Check IAM policy includes PutObject permission

### Issue: CORS errors when loading images

**Solution**: Add CORS policy to S3 bucket

```bash
# Via AWS CLI:
aws s3api put-bucket-cors \
  --bucket swar-yoga-media \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["https://*.vercel.app", "https://swaryoga.com"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3000
      }
    ]
  }' --region ap-south-1
```

---

## S3 Bucket Public Access Policy (Optional)

If you want images to be publicly accessible:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::swar-yoga-media/*"
    }
  ]
}
```

---

## Security Best Practices

1. **Use IAM User**: Never use root AWS credentials
2. **Restrict Permissions**: Only allow S3 access, not full AWS access
3. **Rotate Keys**: Regularly rotate Access Keys
4. **Use HTTPS**: Always communicate over HTTPS
5. **Monitor Uploads**: Set up CloudWatch alerts for S3 activity
6. **Set Lifecycle Policies**: Auto-delete old uploads after X days

---

## AWS Costs

**Estimate for WhatsApp media uploads:**
- S3 Storage: $0.025 per GB/month (ap-south-1)
- Data Transfer: Free within region, $0.09/GB out of region
- Requests: $0.0004 per 1,000 PUT requests

For 100 users uploading ~10 images/month (~5MB each):
- Storage: ~50GB/year ≈ $15/month
- Requests: ~1,200/month ≈ $0.48/month
- **Total estimated: ~$15-20/month**

---

## Next Steps

1. ✅ Set up AWS credentials on EC2
2. ✅ Restart PM2 process
3. ✅ Test media upload via UI
4. ✅ Monitor logs for any errors
5. ✅ Share S3 bucket URL if needed for client access

---

**Questions?** Check the bridge logs with `pm2 logs whatsapp-bridge`
