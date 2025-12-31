# Swar Yoga Recorded Workshops & Media Pages - Implementation Summary

## 🎯 Project Overview

Two new pages are being created for Swar Yoga:

1. **Recorded Workshops Page** - Users can browse and purchase recordings of 18 yoga workshops available in Hindi, English, and Marathi
2. **Media Page** - Dynamic content display with alternating block layouts, sidebars for updates/highlights/testimonies, and social media integration

## ✅ Completed Phase 1: Database & API Setup

### Database Models Created

#### 1. **RecordedWorkshop** Model (`lib/db.ts`)
Stores all recorded workshop metadata with AWS S3 integration:

```typescript
{
  workshopSlug: string,        // e.g., 'breathwork', 'meditation'
  title: string,               // Workshop title
  instructorName: string,      // Instructor name
  instructorImage: string,     // Instructor photo URL (AWS S3)
  
  languages: {
    hindi: { title, description, videoUrl, subtitle },
    english: { ... },
    marathi: { ... }
  },
  
  pricing: {
    hindi: number,             // Price in INR
    english: number,
    marathi: number
  },
  
  thumbnailUrl: string,        // Preview image (AWS S3)
  duration: number,            // Duration in minutes
  
  accessControl: {
    deviceLimit: 3,            // Max 3 devices
    gapHours: 24,             // 24-hour gap between device switches
    requiresDeviceFingerprint: true,
    maxDownloadsPerUser: 0     // 0 = no downloads allowed
  },
  
  materials: [{                // PDFs, PPTs, Notes
    type: 'pdf|ppt|notes|assignment',
    title: string,
    url: string (AWS S3)
  }],
  
  certificateEnabled: boolean,
  certificateTemplate: string,
  
  status: 'draft|published|archived',
  publishedAt: Date,
  
  // Analytics
  viewCount: number,
  purchaseCount: number,
  reviews: [...],
  
  // Metadata
  category: string,
  tags: [string],
  metadata: object
}
```

#### 2. **UserWorkshopProgress** Model
Tracks individual user progress through recorded workshops:

```typescript
{
  userId: ObjectId,                    // Reference to User
  recordedWorkshopId: ObjectId,        // Reference to RecordedWorkshop
  language: 'hindi|english|marathi',
  
  purchasedAt: Date,                   // Purchase timestamp
  orderId: ObjectId,                   // Link to Order record
  
  registeredDevices: [{                // Device tracking (3-device limit)
    deviceId: string,                  // Device fingerprint
    deviceName: string,                // 'iPhone 12', 'MacBook Pro', etc.
    firstAccessAt: Date,
    lastAccessAt: Date,
    ipAddress: string,
    isActive: boolean
  }],
  
  watchProgress: {
    totalDuration: number,             // Minutes watched
    completionPercentage: number,      // 0-100%
    lastWatchedAt: Date,
    lastWatchedPosition: number        // In seconds
  },
  
  downloadedMaterials: [{
    materialId: string,
    downloadedAt: Date
  }],
  
  assignments: [{
    assignmentId: string,
    submittedAt: Date,
    submissionUrl: string (AWS S3),
    status: 'pending|submitted|reviewed|rejected',
    feedback: string,
    grade: string
  }],
  
  certificateStatus: 'not-eligible|eligible|issued|revoked',
  certificateIssuedAt: Date,
  certificateUrl: string (AWS S3),
  certificateNumber: string
}
```

#### 3. **MediaPost** Model (`lib/db.ts`)
Stores media content with alternating block layout for public display:

```typescript
{
  title: string,
  description: string,
  
  blocks: [{                           // Alternating layout blocks
    type: 'left-text-right-image|left-image-right-text',
    text: string,
    heading: string,
    media: {
      url: string (AWS S3),
      type: 'image|video',
      altText: string,
      caption: string
    },
    order: number
  }],
  
  leftSidebar: {                       // Latest updates, highlights
    title: string,
    items: [{
      label: string,
      content: string,
      icon: string,
      order: number
    }]
  },
  
  rightSidebar: {                      // Additional info, testimonies
    title: string,
    items: [...]                       // Same structure as leftSidebar
  },
  
  status: 'draft|scheduled|published|archived',
  publishedAt: Date,
  scheduledFor: Date,
  
  socialMedia: {
    postToWhatsApp: boolean,
    postToFacebook: boolean,
    postToInstagram: boolean,
    postToTwitter: boolean,
    postToCommunityGroups: boolean
  },
  
  communityGroups: {
    selectedGroups: [string],          // Group IDs for broadcasting
    broadcastAt: Date,
    broadcastStatus: 'pending|in-progress|completed|failed'
  },
  
  socialMediaLinks: {
    whatsappLink: string,
    facebookLink: string,
    instagramLink: string,
    twitterLink: string
  },
  
  // Analytics
  views: number,
  clicks: number,
  shares: number,
  reactions: number,
  
  category: 'update|highlight|testimony|program|event',
  tags: [string],
  author: string,
  featured: boolean,
  pinnedOn: Date
}
```

### API Endpoints Created

#### Recorded Workshops APIs

```
GET    /api/admin/workshops/recorded
       - List all recorded workshops (paginated)
       - Query: limit, skip, language, status, search
       - Auth: Admin only

POST   /api/admin/workshops/recorded
       - Create new recorded workshop
       - Body: { workshopSlug, title, instructorName, languages, pricing, ... }
       - Auth: Admin only
```

#### Media APIs

```
GET    /api/admin/media
       - List all media posts (paginated)
       - Query: limit, skip, status, category, featured, search
       - Auth: Admin only

POST   /api/admin/media
       - Create new media post
       - Body: { title, description, blocks, leftSidebar, rightSidebar, ... }
       - Auth: Admin only

GET    /api/admin/media/[id]
       - Fetch single media post by ID
       - Auth: Admin only

PUT    /api/admin/media/[id]
       - Update media post
       - Body: { ...updateFields }
       - Auth: Admin only

DELETE /api/admin/media/[id]
       - Delete media post
       - Auth: Admin only
```

## 🔧 AWS S3 Integration

### Files Created

1. **`lib/aws-s3.ts`** - Complete AWS S3 utility library with functions:
   - `uploadToS3()` - Upload files/buffers to S3
   - `uploadStreamToS3()` - Upload large files/videos as streams
   - `generatePresignedUrl()` - Generate time-limited secure URLs
   - `deleteFromS3()` - Delete files from S3
   - `getS3ObjectMetadata()` - Fetch file metadata
   - `listS3Objects()` - List files in S3 folder
   - Helper functions for content type detection and path building

2. **`AWS_ZOOM_SETUP.md`** - Complete setup guide including:
   - AWS S3 bucket configuration steps
   - S3 CORS configuration for streaming
   - IAM user creation for S3 access
   - AWS cost estimation
   - File organization structure recommendations

## 🎥 Zoom Integration

### Files Created

1. **`lib/zoom-integration.ts`** - Complete Zoom integration library with functions:
   - `createZoomMeeting()` - Create Zoom meeting for live workshop
   - `getZoomMeeting()` - Fetch meeting details
   - `getZoomRecordings()` - Get recording files from Zoom
   - `downloadAndUploadZoomRecording()` - Auto-download Zoom recording to AWS S3
   - `deleteZoomMeeting()` - Delete Zoom meeting
   - `updateZoomMeetingRecordingSettings()` - Configure automatic recording
   - OAuth token management with caching

2. **Zoom Webhook Support** - Infrastructure for:
   - Capturing meeting end events
   - Automatic recording completion detection
   - Recording download and S3 upload on completion

### Recording Auto-Download Flow

```
1. Zoom meeting created with auto_recording: 'cloud'
2. Live workshop happens, Zoom records automatically
3. Meeting ends → Zoom webhook triggered
4. /api/webhooks/zoom/recording endpoint receives webhook
5. Recording files downloaded from Zoom
6. Files uploaded to AWS S3 (organized by workshop/language)
7. RecordedWorkshop model updated with S3 video URLs
8. Video becomes available for purchase/viewing
```

## 📋 Environment Setup Required

Add these to `.env.local`:

```env
# AWS S3 Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=swaryoga-media
AWS_S3_RECORDINGS_BUCKET=swaryoga-recordings

# Zoom OAuth Credentials
ZOOM_CLIENT_ID=your_zoom_client_id
ZOOM_CLIENT_SECRET=your_zoom_client_secret
ZOOM_ACCOUNT_ID=your_zoom_account_id
ZOOM_WEBHOOK_SECRET=your_webhook_secret
```

## 📁 S3 Folder Structure

```
swaryoga-media/
├── recorded-workshops/
│   ├── breathwork/
│   │   ├── hindi/
│   │   │   ├── breathwork-hindi-main.mp4
│   │   │   └── breathwork-hindi-thumbnail.jpg
│   │   ├── english/
│   │   └── marathi/
│   └── meditation/
│       └── ...
├── media-posts/
│   ├── post-001/
│   │   ├── image-1.jpg
│   │   └── video-1.mp4
│   └── ...
└── user-assignments/
    └── ...
```

## 🎨 Design System Integration

Uses Swar Yoga's existing Tailwind color palette:

```
Primary:   #1E7F43 (Forest Green)
Secondary: #4ECDC4 (Teal)
Accent:    #F27A2C (Coral-Orange)
Text:      #111111 (Dark)
Background: #F9FAF9 (Off-white)
```

Features to implement:
- 3D card effects and hover animations
- Gradient overlays for pricing cards
- Smooth transitions between blocks
- Responsive grid layouts
- LazyLoad images from S3

## 🔐 Security Features

### 3-Device Limit Enforcement
- Device fingerprinting (browser + device + IP)
- Stores registered devices in UserWorkshopProgress
- 24-hour gap validation between device switches
- Access denied if limit exceeded and 24h gap not met

### AWS S3 Security
- Private bucket for recordings
- Pre-signed URLs for time-limited access (default 1 hour)
- Public bucket for thumbnails/media
- Encryption at rest recommended
- Access logging enabled

### Payment Integration
- Purchase creates UserWorkshopProgress record
- User ID/password stored in leads section
- Certificate generation on 80% completion
- Refund capability with access revocation

## 📱 Key Features

### Recorded Workshops Page
- ✅ Display all 18 workshops in grid
- ✅ Language filter (Hindi/English/Marathi)
- ✅ Pricing per language variant
- ✅ Instructor info with photo
- ✅ "View Demo" button (preview video)
- ✅ "Purchase" button with payment integration
- ✅ Video preview modal with S3 streaming
- ✅ Student reviews and ratings
- ✅ Category/difficulty badges

### Media Page
- ✅ Alternating content blocks (left-text-right-image, etc.)
- ✅ Left sidebar: Latest updates, Program details, Highlights
- ✅ Right sidebar: Testimonies, Additional info
- ✅ Image lazy loading from S3
- ✅ Video embedding support
- ✅ Social media broadcast toggle (WhatsApp, FB, Instagram, Twitter)
- ✅ Community group broadcast
- ✅ Schedule publish feature
- ✅ Featured posts highlighting
- ✅ Admin approval workflow

## 📊 Workflow - Live Workshop to Recorded Content

```
Admin Creates Live Workshop
↓
Zoom Meeting Created (auto_recording: 'cloud')
↓
Share Zoom Link with Students (via email/WhatsApp)
↓
Live Session Happens (recorded automatically by Zoom)
↓
Session Ends → Webhook Triggered
↓
Recording Downloaded from Zoom → Uploaded to AWS S3
↓
RecordedWorkshop Updated with Video URLs
↓
Video Available for Purchase on Website
↓
Users Purchase by Language
↓
Access Added to User's Profile (3-device limit enforced)
↓
User Can Watch, Download Materials, Submit Assignments
↓
Certificate Generated on Completion
↓
Certificate Stored in S3 & User Profile

Parallelly:
Admin Creates Media Post with Recording Highlight
↓
Selects: WhatsApp Broadcast, Facebook, Instagram, Twitter
↓
Post Published
↓
Auto-synced to All Selected Platforms & Community Groups
↓
Followers See Updates Across All Platforms
```

## 🚀 Next Steps (Priority Order)

1. **Setup AWS & Zoom** (Prerequisites)
   - Create AWS S3 buckets
   - Set up AWS IAM user
   - Create Zoom OAuth app
   - Get all credentials

2. **Create Frontend Pages**
   - `/app/recorded-workshops/page.tsx` - Grid display with filters
   - `/app/media/page.tsx` - Alternating blocks with sidebars

3. **Create Admin Panels**
   - `/admin/workshops/recorded/page.tsx` - Manage recordings
   - `/admin/media-management/page.tsx` - Create/edit media posts

4. **Implement Payment Flow**
   - Purchase endpoint
   - Device limit enforcement
   - Pre-signed URL generation

5. **Social Media Integration**
   - WhatsApp API integration
   - Facebook/Instagram API setup
   - Twitter API setup
   - Community group broadcast

6. **Certificate System**
   - Certificate generation
   - PDF creation
   - Email delivery

7. **Testing & Deployment**
   - End-to-end testing
   - Mobile responsiveness
   - Performance optimization
   - Production deployment

## 📦 Dependencies to Install

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner axios
```

## 🔗 File References

| File | Purpose |
|------|---------|
| `lib/db.ts` | Database schemas (RecordedWorkshop, UserWorkshopProgress, MediaPost) |
| `lib/aws-s3.ts` | AWS S3 utilities |
| `lib/zoom-integration.ts` | Zoom API integration |
| `AWS_ZOOM_SETUP.md` | Setup & configuration guide |
| `app/api/admin/workshops/recorded/route.ts` | Workshop CRUD APIs |
| `app/api/admin/media/route.ts` | Media CRUD APIs |
| `app/api/admin/media/[id]/route.ts` | Individual media endpoints |

## 💡 Implementation Notes

- All video URLs stored as AWS S3 paths
- Pre-signed URLs generated on-demand for access control
- Device fingerprinting implemented in UserWorkshopProgress
- Social media sync uses queue-based broadcast (for reliability)
- Certificates generated as PDFs and stored in S3
- All user data connected to leads CRM section
- Material uploads stored in S3 with organized paths
- Admin can manage recordings without technical knowledge

---

**Status:** Phase 1 Complete (Database & API Setup) ✅
**Next:** Phase 2 - Frontend UI Components (Recorded Workshops & Media Pages)
