# Social Media Scheduler Setup Guide

## Overview

The Social Media Manager now includes an automatic scheduler for publishing posts at scheduled times. Posts marked with a `scheduledFor` date/time will be automatically published when the scheduled time arrives.

## How It Works

1. **Admin creates a post** with text, images, platform selection, and a scheduled publication time
2. **Post is saved** with status `draft` or `scheduled` and a `scheduledFor` date
3. **Cron job runs** every 1-5 minutes (depending on your setup)
4. **Scheduler checks** for posts where `scheduledFor <= now`
5. **If found**, scheduler publishes the post to selected platforms
6. **Status updates** to `published` with `publishedAt` timestamp

## Setup Instructions

### Option 1: EasyCron (Recommended for Hosted Apps)

**Best for:** Vercel, Netlify, any cloud-hosted app

1. Go to https://www.easycron.com/
2. Create a free account
3. Click "Create a New Cron Job"
4. Set these values:
   - **URL**: `https://your-app.com/api/admin/social-media/scheduler?action=publish&secret=YOUR_CRON_SECRET`
   - **Execution interval**: `Every 1 minute` (or 5 minutes if you want less frequent checks)
   - **Timezone**: Your preferred timezone
   - **Enable notifications**: Check if you want email alerts on failures

5. In your `.env.production`:
   ```
   CRON_SECRET=your-super-secret-random-string-here
   ```

### Option 2: Google Cloud Scheduler

**Best for:** Google Cloud deployment

1. Go to Google Cloud Console > Cloud Scheduler
2. Create a new job:
   - **Name**: `social-media-scheduler`
   - **Frequency**: `*/5 * * * *` (every 5 minutes)
   - **Timezone**: Your timezone
   - **Execution type**: HTTP
   - **HTTP method**: GET
   - **URI**: `https://your-app.com/api/admin/social-media/scheduler?action=publish&secret=YOUR_CRON_SECRET`
   - **Add HTTP header**:
     - Header name: `x-cron-secret`
     - Header value: `YOUR_CRON_SECRET`

3. Set `CRON_SECRET` in your Cloud environment variables

### Option 3: AWS Lambda + CloudWatch Events

**Best for:** AWS deployment

1. Create a Lambda function:
   ```javascript
   const https = require('https');
   
   exports.handler = async (event) => {
     const url = process.env.SCHEDULER_URL;
     const secret = process.env.CRON_SECRET;
     
     return new Promise((resolve, reject) => {
       const options = {
         hostname: new URL(url).hostname,
         path: new URL(url).pathname + new URL(url).search,
         method: 'GET',
         headers: {
           'x-cron-secret': secret
         }
       };
       
       https.request(options, (res) => {
         let data = '';
         res.on('data', chunk => data += chunk);
         res.on('end', () => resolve({
           statusCode: res.statusCode,
           body: data
         }));
       }).on('error', reject).end();
     });
   };
   ```

2. Create CloudWatch Event rule:
   - **Name**: `social-media-scheduler`
   - **Schedule expression**: `rate(5 minutes)`
   - **Target**: Your Lambda function

### Option 4: Local Development (Node.js Cron)

**Best for:** Local testing and self-hosted servers

1. Install node-cron:
   ```bash
   npm install node-cron
   ```

2. Create `lib/cronJobs.ts`:
   ```typescript
   import cron from 'node-cron';
   import { checkAndPublishScheduledPosts } from './socialMediaScheduler';

   export function initializeCronJobs() {
     // Run every 5 minutes
     cron.schedule('*/5 * * * *', async () => {
       try {
         const result = await checkAndPublishScheduledPosts();
         console.log('📱 Social media scheduler:', {
           checked: result.totalChecked,
           published: result.published,
           failed: result.failed,
         });
       } catch (error) {
         console.error('❌ Scheduler error:', error);
       }
     });

     console.log('✅ Cron jobs initialized');
   }
   ```

3. Initialize in your `server.js` or startup script:
   ```javascript
   import { initializeCronJobs } from '@/lib/cronJobs';
   
   // After app starts
   initializeCronJobs();
   ```

### Option 5: PM2 Cron Task

**Best for:** Self-hosted servers

If using PM2 (already in your stack):

1. Create `scripts/social-media-cron.js`:
   ```javascript
   const https = require('https');

   async function runCron() {
     const url = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/admin/social-media/scheduler`;
     const secret = process.env.CRON_SECRET;

     try {
       const response = await fetch(url, {
         headers: {
           'x-cron-secret': secret,
         },
       });
       const data = await response.json();
       console.log('✅ Scheduler ran:', data);
     } catch (error) {
       console.error('❌ Cron error:', error);
     }
   }

   runCron();
   ```

2. Add to `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [
       // ... your app config
       {
         name: 'social-media-scheduler',
         script: 'scripts/social-media-cron.js',
         cron: '*/5 * * * *', // Every 5 minutes
         autorestart: false,
       },
     ],
   };
   ```

## Environment Variables

Add to `.env.local` (development) and `.env.production` (production):

```bash
# Protect the scheduler endpoint
CRON_SECRET=your-super-secret-random-string-32-chars-minimum

# (Optional) Override the base URL if auto-detection fails
NEXTAUTH_URL=https://your-app.com
```

## Testing the Scheduler

### Manual Test (Any Setup)

1. Create a test post with a `scheduledFor` time in the past
2. Call the endpoint manually:
   ```bash
   curl "https://your-app.com/api/admin/social-media/scheduler?action=publish&secret=YOUR_SECRET"
   ```

3. Check the response - should show:
   ```json
   {
     "success": true,
     "data": {
       "totalChecked": 1,
       "published": 1,
       "failed": 0,
       "errors": []
     }
   }
   ```

### Check Scheduler Status

```bash
curl "https://your-app.com/api/admin/social-media/scheduler?action=status&secret=YOUR_SECRET"
```

Response:
```json
{
  "status": "active",
  "scheduledPosts": 5,
  "readyToPublish": 2,
  "publishedPosts": 42,
  "failedPosts": 1,
  "nextCheckAt": "2024-01-01T12:35:00Z"
}
```

## Monitoring & Debugging

### Check Logs

Look for scheduler activity in your app logs:
```bash
# For Vercel:
vercel logs

# For PM2:
pm2 logs swar-yoga-web

# For local dev:
# Check console output in terminal running `npm run dev`
```

### Common Issues

**Q: Posts aren't publishing at scheduled time**
- A: Check `CRON_SECRET` matches between .env and cron service
- Check the scheduler URL is correct and accessible from the cron service
- Check post has valid platforms and accounts selected
- Check `scheduledFor` is in the future

**Q: Scheduler returns 401 Unauthorized**
- A: The `secret` parameter doesn't match `CRON_SECRET` environment variable
- Make sure you're passing `?secret=YOUR_SECRET` in the URL

**Q: Scheduler says it ran but posts didn't publish**
- A: Check post status (should be `draft` or `scheduled`, not `failed` or `published`)
- Check post has `scheduledFor` set
- Check there are no encryption errors with account tokens
- Check the error in the response for specific platform issues

### Debug Mode

To see detailed logs, add to `.env.local`:
```bash
DEBUG=*social*
DEBUG_SCHEDULER=1
```

## Database Schema Notes

Posts include these scheduling fields:
- `scheduledFor: Date` - When to publish
- `status: 'draft' | 'scheduled' | 'published' | 'failed'` - Current state
- `publishedAt: Date` - When actually published
- `publishAttempts: number` - Retry counter
- `failureReason: string` - Error message if failed

## Rate Limiting

- Max 3 retry attempts per post
- 5-second delay between retry attempts
- Scheduler checks once every 1-5 minutes (configurable)

## Next Steps

1. **Choose a setup** from the options above
2. **Set `CRON_SECRET`** in your environment variables
3. **Test** by creating a scheduled post
4. **Verify** the post publishes at the scheduled time

Need help? Check the social media manager documentation or contact support.
