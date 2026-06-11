#!/usr/bin/env node

/**
 * YouTube Video Privacy Check
 * 
 * For community videos to work for all users:
 * ✅ UNLISTED - Anyone with link can watch (RECOMMENDED)
 * ❌ PRIVATE - Only owner can watch (BLOCKS COMMUNITY ACCESS)
 * 
 * This script provides instructions to change video privacy settings.
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const youtubeVideoIds = [
  // Add YouTube video IDs here to check
  // Format: 'VIDEO_ID'
];

console.log(`
╔════════════════════════════════════════════════════════════╗
║     YouTube Video Privacy Check for Community Access      ║
╚════════════════════════════════════════════════════════════╝

🔒 PRIVACY LEVELS:
  ├─ PUBLIC: Anyone can find and watch
  ├─ UNLISTED: Only people with the link can watch ✅ COMMUNITY
  └─ PRIVATE: Only owner and explicit access ❌ BLOCKS

⚠️  CURRENT ISSUE:
  Video marked as PRIVATE → Community users get "Access Denied"
  
✅ SOLUTION:
  Change video from PRIVATE → UNLISTED on YouTube

📋 HOW TO CHANGE PRIVACY:
  1. Go to https://studio.youtube.com
  2. Click "Videos" → Find your video
  3. Click the video to edit
  4. In sidebar, find "VISIBILITY" section
  5. Click "PRIVATE" dropdown
  6. Select "UNLISTED"
  7. Click "SAVE"

💡 WHAT HAPPENS:
  Before: swarsakshi9@gmail.com can't share with others
  After: Anyone with the link (like our app) can watch
  
🎯 AFTER CHANGING:
  • Wait 1-2 minutes for YouTube to process
  • Refresh community page in browser
  • Video should now play for all community members

📝 VIDEO ID TO CHECK:
`);

rl.question('Enter YouTube Video ID (or press Enter to skip): ', (videoId) => {
  if (videoId) {
    console.log(`
✅ Video ID: ${videoId}

🔗 Link: https://www.youtube.com/watch?v=${videoId}
📊 Studio Link: https://studio.youtube.com/video/${videoId}

Steps:
  1. Open: https://studio.youtube.com/video/${videoId}
  2. Find "VISIBILITY" section on the left sidebar
  3. Change from "PRIVATE" to "UNLISTED"
  4. Save the changes
    `);
  } else {
    console.log(`
For each YouTube video in your community:

1. Get the video ID from the URL
   Example: https://youtube.com/watch?v=abc123def456
   Video ID: abc123def456

2. Open studio.youtube.com/video/abc123def456

3. Change privacy to UNLISTED
    `);
  }

  rl.question('\nDone changing video privacy? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      console.log(`
✅ DONE! 

Next steps:
  • Wait 1-2 minutes for YouTube to process
  • Refresh your browser
  • Try playing the video in your community
  
If still not working:
  • Try a different community video to test
  • Check browser console for error messages
  • Email swarsakshi9@gmail.com if issue persists
      `);
    }
    rl.close();
  });
});
