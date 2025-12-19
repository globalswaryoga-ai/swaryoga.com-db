# Social Media Management System - Implementation Plan

**Date:** December 19, 2025  
**Status:** Ready for Implementation

## 📋 What We're Building

### 1. **Public Social Media Page** (`/social-media`)
- Display posts from all connected social media platforms
- Beautiful feed layout with filters by platform
- Real-time updates indicator
- Call-to-action to follow on social platforms

### 2. **Admin Social Media Dashboard** (`/admin/social-media`)
- Connect/Disconnect social media accounts
- OAuth authentication for each platform
- Post creation interface (text, images, videos)
- Scheduling options
- Analytics and posting history

### 3. **Supported Platforms**
- ✅ Facebook (Business Pages)
- ✅ YouTube (Channel)
- ✅ X / Twitter
- ✅ LinkedIn
- ✅ Instagram

## 🔧 What You Need to Provide

### **For Each Platform** - API Credentials:

#### **1. Facebook Business**
- **Get Here:** https://developers.facebook.com/
- **Need:**
  - Facebook App ID
  - Facebook App Secret
  - Business Account Access Token
- **Permissions:** pages_manage_metadata, pages_read_engagement, pages_manage_posts

#### **2. YouTube**
- **Get Here:** https://console.cloud.google.com/
- **Need:**
  - Google OAuth 2.0 Client ID
  - Google OAuth 2.0 Client Secret
  - YouTube Channel ID
- **Permissions:** YouTube Data API v3

#### **3. X (Twitter)**
- **Get Here:** https://developer.twitter.com/
- **Need:**
  - API Key (Consumer Key)
  - API Secret (Consumer Secret)
  - Bearer Token
- **Permissions:** Tweet.write, users.read

#### **4. LinkedIn**
- **Get Here:** https://www.linkedin.com/developers/
- **Need:**
  - LinkedIn App ID
  - LinkedIn Client Secret
  - LinkedIn Redirect URI
- **Permissions:** w_member_social, r_organization_social

#### **5. Instagram** (via Facebook Graph API)
- **Get Here:** https://developers.facebook.com/
- **Need:**
  - Instagram Business Account ID
  - Facebook App ID & Secret
- **Permissions:** instagram_basic, instagram_content_publish

## 📦 Database Models We'll Create

```typescript
// Social Media Account
{
  _id: ObjectId
  platform: 'facebook' | 'youtube' | 'x' | 'linkedin' | 'instagram'
  accountName: string
  accountHandle: string
  accountId: string
  accessToken: string (encrypted)
  refreshToken: string (encrypted)
  expiresAt: Date
  isConnected: boolean
  connectedAt: Date
  disconnectedAt?: Date
  metadata: { followers, lastSyncedAt, ... }
}

// Social Media Post
{
  _id: ObjectId
  accountIds: [ObjectId] // Post to multiple accounts
  platforms: ['facebook', 'youtube', ...]
  content: {
    text: string
    images: [{ url, caption }]
    videos: [{ url, thumbnail }]
    link?: string
  }
  status: 'draft' | 'scheduled' | 'published' | 'failed'
  scheduledFor?: Date
  publishedAt?: Date
  failureReason?: string
  stats: {
    likes, comments, shares, views, impressions
  }
  createdAt: Date
  updatedAt: Date
}

// Social Media Analytics
{
  _id: ObjectId
  accountId: ObjectId
  date: Date
  platform: string
  followers: number
  engagement: number
  reach: number
  impressions: number
}
```

## 🎯 Features We'll Implement

### **Admin Panel:**
- [x] Add/Remove social media accounts via OAuth
- [x] Create posts with text, images, and videos
- [x] Schedule posts for future publishing
- [x] View publishing history and status
- [x] See performance analytics
- [x] Multi-platform posting (post to multiple accounts at once)
- [x] Draft saving

### **Public Page:**
- [x] Feed showing recent posts from all platforms
- [x] Filter by platform
- [x] Social share buttons
- [x] Follow buttons linking to actual platforms
- [x] Responsive mobile design

## 📝 Environment Variables Needed

```env
# Facebook
FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# YouTube / Google
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret

# X / Twitter
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_BEARER_TOKEN=your_bearer_token

# LinkedIn
LINKEDIN_APP_ID=your_app_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3000/admin/social-media/callback

# Encryption for storing credentials
ENCRYPTION_KEY=32_char_random_string
```

## 🚀 Implementation Steps

### **Phase 1: Backend Setup**
1. Add Social Media schemas to MongoDB
2. Create encryption utility for storing credentials
3. Build API routes for account connection
4. Implement OAuth callback handlers

### **Phase 2: Admin Interface**
1. Create admin dashboard page
2. Add account connection UI (OAuth buttons)
3. Build post creation form
4. Implement scheduling interface

### **Phase 3: Public Page**
1. Create /social-media page
2. Build post feed component
3. Add filters and search
4. Deploy

### **Phase 4: Posting Integration**
1. Integrate Facebook SDK
2. Integrate YouTube API
3. Integrate Twitter API
4. Integrate LinkedIn API

## 💰 Cost Considerations

Most platforms are **FREE** to integrate:
- Facebook Graph API: Free
- YouTube Data API: Free (quotas apply)
- Twitter API: Free tier available
- LinkedIn API: Free
- Instagram (via Facebook): Free

## ⚠️ Important Notes

1. **Encryption:** All access tokens will be encrypted in database
2. **Rate Limiting:** Implement rate limiting per platform
3. **Error Handling:** Graceful handling of failed posts
4. **Security:** Store OAuth credentials securely, never expose in frontend
5. **Compliance:** Follow each platform's terms of service

## 📊 What Happens Next

Once you provide the API credentials for your platforms, I will:
1. ✅ Update MongoDB models
2. ✅ Create API routes for OAuth
3. ✅ Build admin dashboard
4. ✅ Build public social media page
5. ✅ Test all integrations
6. ✅ Deploy to Vercel

---

## ✅ Ready to Start?

**Please provide:**
1. Which platforms do you want to connect? (Facebook, YouTube, X, LinkedIn, Instagram)
2. Do you already have developer accounts set up on those platforms?
3. Do you want me to create a simple version first, or full-featured?

Once confirmed, I'll implement everything! 🚀
