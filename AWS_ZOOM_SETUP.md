# AWS S3 & Zoom Configuration for Swar Yoga

## AWS S3 Configuration

Store these in your `.env.local` file:

```env
# AWS S3 Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_S3_BUCKET=swaryoga-media

# Optional: Separate bucket for private recordings
AWS_S3_RECORDINGS_BUCKET=swaryoga-recordings
```

### AWS S3 Setup Steps:

1. **Create AWS Account** (if not already done)
   - Go to https://aws.amazon.com/
   - Sign up or login to AWS Console

2. **Create S3 Bucket**
   - Navigate to S3 service
   - Create bucket: `swaryoga-media` (for public images/videos)
   - Create bucket: `swaryoga-recordings` (for private recordings)
   - Set appropriate access permissions

3. **Create IAM User for S3 Access**
   - Go to IAM (Identity and Access Management)
   - Create new user: `swaryoga-s3-user`
   - Attach policy: `AmazonS3FullAccess`
   - Generate Access Key ID and Secret Access Key
   - Save these credentials securely

4. **Configure CORS (for public bucket)**
   - Select public bucket → Permissions → CORS
   - Add CORS configuration:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["https://swaryoga.com", "https://*.swaryoga.com"],
       "ExposeHeaders": ["ETag"],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

5. **Enable Versioning** (optional but recommended)
   - Select bucket → Properties → Versioning
   - Enable versioning for data protection

---

## Zoom Integration Configuration

Store these in your `.env.local` file:

```env
# Zoom OAuth Credentials
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_WEBHOOK_SECRET=your_webhook_secret
```

### Zoom Setup Steps:

1. **Create Zoom App**
   - Go to https://marketplace.zoom.us/develop/create
   - Create Server-to-Server OAuth app
   - Name: "Swar Yoga Live Workshops"

2. **Configure OAuth Settings**
   - Grant type: `Account Credentials`
   - Redirect URL: `https://swaryoga.com/api/admin/zoom/oauth/callback`
   - Authorized redirect URIs: `https://swaryoga.com`

3. **Get Credentials**
   - Copy `Client ID` → `ZOOM_CLIENT_ID`
   - Copy `Client Secret` → `ZOOM_CLIENT_SECRET`
   - Note your `Account ID` from Zoom admin panel → `ZOOM_ACCOUNT_ID`

4. **Enable Recording Features**
   - In your Zoom account settings:
     - Enable Cloud Recording
     - Enable Auto Recording (cloud)
     - Set default recording: "Audio and Video"

5. **Setup Webhook** (optional but recommended)
   - In Zoom app dashboard → Event Subscriptions
   - Subscribe to these events:
     - `meeting.started`
     - `meeting.ended`
     - `recording.completed`
   - Webhook URL: `https://swaryoga.com/api/webhooks/zoom/recording`
   - Verify token: Save the token as `ZOOM_WEBHOOK_SECRET`

---

## Database Setup for Recorded Workshops & Media

The schemas are already created in `lib/db.ts`:

1. **RecordedWorkshop** - Stores all recorded workshop metadata
   - Supports 18 workshops in 3 languages (Hindi, English, Marathi)
   - Links to S3 videos and thumbnails
   - Tracks access control (3-device limit, 24-hour gap)
   - Stores pricing and instructor info

2. **UserWorkshopProgress** - Tracks user progress
   - Monitors video watch progress
   - Tracks assignments and certificates
   - Device registration and access logs
   - Integration with leads section

3. **MediaPost** - Stores media content for public display
   - Alternating block layout (left-text-right-image, etc.)
   - Sidebar content for updates and highlights
   - Social media sync configuration
   - Broadcasting to WhatsApp groups

---

## File Organization in AWS S3

Suggested folder structure:

```
swaryoga-media/
├── recorded-workshops/
│   ├── breathwork/
│   │   ├── hindi/
│   │   │   ├── breathwork-hindi-main.mp4
│   │   │   └── breathwork-hindi-thumbnail.jpg
│   │   ├── english/
│   │   │   ├── breathwork-english-main.mp4
│   │   │   └── breathwork-english-thumbnail.jpg
│   │   └── marathi/
│   │       ├── breathwork-marathi-main.mp4
│   │       └── breathwork-marathi-thumbnail.jpg
│   └── meditation/
│       └── ...
├── media-posts/
│   ├── post-001/
│   │   ├── image-1.jpg
│   │   ├── video-1.mp4
│   │   └── thumbnail-1.jpg
│   └── post-002/
│       └── ...
├── user-assignments/
│   ├── user-123/
│   │   ├── workshop-001/
│   │   │   ├── assignment-1.pdf
│   │   │   └── submission.pdf
│   │   └── ...
│   └── ...
└── certificates/
    ├── user-123-certificate.pdf
    └── ...

swaryoga-recordings/
├── live-sessions/
│   ├── 2024-01-15-breathwork/
│   │   ├── video.mp4
│   │   └── metadata.json
│   └── ...
```

---

## Testing the Integration

### Test AWS S3 Upload:
```bash
# Use this to test S3 upload
curl -X POST http://localhost:3000/api/admin/test/upload-s3 \
  -F "file=@image.jpg"
```

### Test Zoom Meeting Creation:
```bash
# Use this to test Zoom integration
curl -X POST http://localhost:3000/api/admin/test/create-zoom-meeting \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Workshop",
    "startTime": "2024-02-15T10:00:00Z",
    "duration": 60
  }'
```

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Rotate credentials regularly** - Change AWS keys and Zoom secrets periodically
3. **Use IAM policies** - Restrict S3 access to only needed buckets/operations
4. **Enable MFA** - Enable multi-factor authentication on AWS/Zoom accounts
5. **Monitor costs** - Set up AWS billing alerts to track S3 and data transfer costs
6. **Encrypt sensitive data** - Use AWS KMS for encryption at rest if storing sensitive files
7. **Pre-signed URLs** - Use pre-signed URLs for time-limited access to private recordings
8. **Rate limiting** - Implement rate limiting on Zoom API calls (5000 requests per hour limit)

---

## Cost Estimation

### AWS S3 Costs:
- Storage: ~$0.023 per GB/month
- For 100 hours of 4K video (~500GB): ~$12/month
- Data transfer: Free for first 1GB/month, then ~$0.09 per GB
- API requests: Cheap (typically <$1/month)

### Zoom Costs:
- Host account: Free
- Zoom app: Free (included with account)
- Cloud recording: Included with Pro plan
- API calls: Unlimited (included)

---

## Helpful Links

- AWS S3 Pricing: https://aws.amazon.com/s3/pricing/
- Zoom API Docs: https://developers.zoom.us/docs/
- AWS SDK for JavaScript: https://docs.aws.amazon.com/sdk-for-javascript/
- Zoom OAuth: https://developers.zoom.us/docs/internal-apps/oauth/

---

## Support

When providing AWS/Zoom credentials to the development team:
1. Create separate IAM users (never use root credentials)
2. Use temporary credentials when possible
3. Document which services each credential is for
4. Set up credential rotation schedule
5. Monitor usage and access logs
