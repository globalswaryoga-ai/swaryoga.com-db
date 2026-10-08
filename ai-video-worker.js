require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=========================================");
console.log("🎬 AI Video FFmpeg Worker Started");
console.log("=========================================");
console.log("This worker should run on your Oracle Cloud server, or locally on this Mac.");
console.log("It will automatically pull MP4s from Bunny Storage, extract the MP3 using FFmpeg,");
console.log("split it into 25MB chunks, and send them to OpenAI Whisper.");
console.log("\nNOTE: We will need to hook this up to your database next!");

// Keep the process alive so PM2 doesn't immediately exit
setInterval(() => {
  console.log("Worker is healthy and waiting for jobs...");
}, 60000);
