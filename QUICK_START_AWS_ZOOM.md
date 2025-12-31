# Quick Start - AWS & Zoom Setup

## 🚀 Fast Setup (15 minutes)

### Step 1: AWS S3 Setup (5 minutes)

1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Sign up or login

2. **Create S3 Buckets**
   ```
   Bucket 1: swaryoga-media (public - for images/thumbnails)
   Bucket 2: swaryoga-recordings (private - for videos)
   ```

3. **Create IAM User**
   - Go to IAM → Users → Create User
   - User name: `swaryoga-s3-user`
   - Attach policy: `AmazonS3FullAccess`
   - Create access key → Copy credentials

4. **Get Credentials**
   - Access Key ID → `AWS_ACCESS_KEY_ID`
   - Secret Access Key → `AWS_SECRET_ACCESS_KEY`

### Step 2: Zoom OAuth Setup (5 minutes)

1. **Create Zoom App**
   - Go to https://marketplace.zoom.us/develop/create
   - Create "Server-to-Server OAuth" app
   - Name: "Swar Yoga Live Workshops"

2. **Get Credentials**
   - Client ID → `ZOOM_CLIENT_ID`
   - Client Secret → `ZOOM_CLIENT_SECRET`
   - Account ID → `ZOOM_ACCOUNT_ID`

3. **Enable Recording**
   - Zoom Settings → Recording → Enable Cloud Recording
   - Default recording: "Audio and Video"

### Step 3: Update .env.local (2 minutes)

```env
# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_S3_BUCKET=swaryoga-media
AWS_S3_RECORDINGS_BUCKET=swaryoga-recordings

# Zoom
ZOOM_CLIENT_ID=xxxxx
ZOOM_CLIENT_SECRET=xxxxx
ZOOM_ACCOUNT_ID=xxxxx
ZOOM_WEBHOOK_SECRET=optional
```

### Step 4: Install Dependencies (3 minutes)

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner axios
npm run dev
```

### Step 5: Test APIs

**Test S3 Upload:**
```bash
curl -X POST http://localhost:3000/api/admin/test/upload-s3 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "file=@test-image.jpg"
```

**Test Zoom Meeting:**
```bash
curl -X POST http://localhost:3000/api/admin/test/create-zoom-meeting \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Test Workshop",
    "startTime": "2024-02-15T10:00:00Z",
    "duration": 60
  }'
```

---

## 📝 Database Check

Run this to verify all models are created:

```bash
node -e "
const db = require('./lib/db');
(async () => {
  await db.connectDB();
  console.log('✅ RecordedWorkshop:', !!db.RecordedWorkshop);
  console.log('✅ UserWorkshopProgress:', !!db.UserWorkshopProgress);
  console.log('✅ MediaPost:', !!db.MediaPost);
  process.exit(0);
})();
"
```

---

## 📚 Key API Examples

### Create Recorded Workshop

```bash
curl -X POST http://localhost:3000/api/admin/workshops/recorded \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workshopSlug": "breathwork",
    "title": "Breathwork Mastery",
    "instructorName": "Yogini Priya",
    "description": "Learn advanced breathing techniques",
    "languages": {
      "hindi": {
        "title": "प्राणायाम महारत",
        "description": "उन्नत श्वसन तकनीकें",
        "videoUrl": "https://swaryoga-recordings.s3.amazonaws.com/breathwork/hindi/main.mp4",
        "subtitle": "हिंदी"
      },
      "english": {
        "title": "Breathwork Mastery",
        "videoUrl": "https://swaryoga-recordings.s3.amazonaws.com/breathwork/english/main.mp4",
        "subtitle": "English"
      },
      "marathi": {
        "title": "श्वसन कला",
        "videoUrl": "https://swaryoga-recordings.s3.amazonaws.com/breathwork/marathi/main.mp4",
        "subtitle": "मराठी"
      }
    },
    "pricing": {
      "hindi": 499,
      "english": 599,
      "marathi": 499
    },
    "currency": "INR",
    "thumbnailUrl": "https://swaryoga-media.s3.amazonaws.com/thumbnails/breathwork.jpg",
    "duration": 45,
    "status": "published"
  }'
```

### Create Media Post

```bash
curl -X POST http://localhost:3000/api/admin/media \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Yoga Challenge Begins!",
    "description": "Join our 7-day yoga challenge",
    "blocks": [
      {
        "type": "left-text-right-image",
        "heading": "7-Day Yoga Challenge",
        "text": "Transform your body and mind in just 7 days!",
        "media": {
          "url": "https://swaryoga-media.s3.amazonaws.com/posts/challenge-1.jpg",
          "type": "image",
          "caption": "Start your journey today"
        },
        "order": 1
      }
    ],
    "leftSidebar": {
      "title": "Latest Updates",
      "items": [
        {
          "label": "Challenge Details",
          "content": "Daily 30-minute sessions",
          "order": 1
        }
      ]
    },
    "rightSidebar": {
      "title": "Testimonies",
      "items": [
        {
          "label": "Student Success",
          "content": "Amazing transformation!",
          "order": 1
        }
      ]
    },
    "status": "published",
    "category": "program",
    "socialMedia": {
      "postToWhatsApp": true,
      "postToFacebook": true,
      "postToInstagram": true,
      "postToCommunityGroups": true
    }
  }'
```

### Get All Workshops

```bash
curl http://localhost:3000/api/admin/workshops/recorded?limit=20&status=published \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get All Media Posts

```bash
curl http://localhost:3000/api/admin/media?limit=20&status=published&category=update \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔗 File Locations

All newly created files:

```
lib/
├── aws-s3.ts                          # AWS S3 utilities
├── zoom-integration.ts                # Zoom API integration
└── db.ts                              # [UPDATED] New models added

app/api/admin/
├── workshops/recorded/
│   └── route.ts                       # [NEW] Workshop CRUD APIs
└── media/
    ├── route.ts                       # [NEW] Media CRUD APIs
    └── [id]/route.ts                  # [NEW] Individual media endpoints

Project Root:
├── AWS_ZOOM_SETUP.md                  # [NEW] Full setup guide
└── RECORDED_WORKSHOPS_MEDIA_IMPLEMENTATION.md  # [NEW] Implementation details
```

---

## ⚠️ Important Notes

1. **Install dependencies first:**
   ```bash
   npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner axios
   ```

2. **Restart dev server after .env changes:**
   ```bash
   npm run dev
   ```

3. **Test credentials work:**
   - AWS: Try listing S3 buckets
   - Zoom: Try getting OAuth token

4. **S3 bucket naming:**
   - Must be globally unique
   - If `swaryoga-media` taken, use `swaryoga-media-YOUR_DOMAIN`

5. **Zoom webhook (optional):**
   - Not required for basic functionality
   - Enables auto-download of recordings

---

## 🆘 Troubleshooting

### "Cannot find module '@aws-sdk/client-s3'"
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
npm run dev  # Restart dev server
```

### "S3 Upload fails - Access Denied"
- Check AWS credentials in `.env.local`
- Verify IAM user has `AmazonS3FullAccess` policy
- Verify bucket exists and region is correct

### "Zoom meeting not created"
- Check Zoom credentials
- Verify Server-to-Server OAuth app is created
- Check `ZOOM_ACCOUNT_ID` is correct

### "Pre-signed URL expired"
- Default expiry is 1 hour
- Can be changed in code: `expiresIn: 86400` (24 hours)

---

## 📊 What's Included

✅ Database schemas for 3 new models
✅ Complete AWS S3 integration library
✅ Complete Zoom integration library
✅ 5 new API endpoints
✅ Setup documentation
✅ Configuration guide
✅ All environment variables documented
✅ Security best practices included

**Ready to start building the frontend!** 🎉
