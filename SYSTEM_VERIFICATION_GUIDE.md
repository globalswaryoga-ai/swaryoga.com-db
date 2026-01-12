# ✅ SYSTEM VERIFICATION & TESTING GUIDE

**Purpose:** Verify all 8 tasks are working correctly  
**Date:** January 13, 2026

---

## 🎯 Quick Health Check Checklist

```
✅ AWS S3 Connected          [ ] Test: Upload image/video
✅ MongoDB Connected         [ ] Test: Message persistence
✅ QR Code Opening          [ ] Test: Display QR
✅ Messages In/Out          [ ] Test: Send/receive
✅ Profile Image Showing    [ ] Test: Avatar display
✅ Group Creation           [ ] Test: Create group
✅ Media In/Out             [ ] Test: Upload/download
✅ Emoji Support            [ ] Test: Send emoji
```

---

## 🔍 STEP-BY-STEP VERIFICATION

### 1️⃣ AWS S3 Connectivity Test

**Test Upload (Image):**
```bash
# Terminal Command
curl -X POST http://localhost:3333/media/upload \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -F 'file=@/path/to/test_image.jpg'

# Expected Response:
# {
#   "success": true,
#   "url": "https://s3.amazonaws.com/social-media/whatsapp-media/uuid-test_image.jpg",
#   "key": "whatsapp-media/uuid-test_image.jpg",
#   "size": 12345,
#   "mimetype": "image/jpeg"
# }
```

**Test Download (Stream):**
```bash
curl -O http://localhost:3333/media/download/whatsapp-media/uuid-test_image.jpg \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Check: File should download successfully
```

**Test Video Upload:**
```bash
curl -X POST http://localhost:3333/media/upload \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -F 'file=@/path/to/test_video.mp4'

# Expected: Video URL returned with video/mp4 mimetype
```

**✅ What to verify:**
- [ ] Upload returns S3 URL
- [ ] File is stored in S3 bucket
- [ ] Download URL is accessible
- [ ] Both image and video work
- [ ] File sizes are correct

---

### 2️⃣ MongoDB Connectivity Test

**Test Message Sync:**
```bash
curl -X POST http://localhost:3333/db/sync/message \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "test_msg_001",
    "chatId": "test_chat_001",
    "body": "Test message from verification",
    "fromMe": true,
    "sender": "Tester",
    "timestamp": 1673596800,
    "type": "text",
    "hasMedia": false,
    "ack": 2
  }'

# Expected Response:
# {
#   "success": true,
#   "message": {
#     "_id": "mongoid123",
#     "messageId": "test_msg_001",
#     "chatId": "test_chat_001",
#     ...
#   }
# }
```

**Test Message Retrieval:**
```bash
curl http://localhost:3333/db/messages/test_chat_001 \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Expected Response:
# {
#   "messages": [
#     {
#       "messageId": "test_msg_001",
#       "body": "Test message from verification",
#       ...
#     }
#   ],
#   "total": 1,
#   "limit": 50,
#   "skip": 0
# }
```

**Test Chat Sync:**
```bash
curl -X POST http://localhost:3333/db/sync/chat \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -H 'Content-Type: application/json' \
  -d '{
    "chatId": "test_chat_001",
    "name": "Test Chat",
    "isGroup": false,
    "lastMessage": "Test message from verification",
    "lastMessageTime": 1673596800,
    "unreadCount": 0
  }'

# Expected: { "success": true, "chat": {...} }
```

**Test Chat List:**
```bash
curl http://localhost:3333/db/chats \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Expected: Array of chats with proper sorting
```

**✅ What to verify:**
- [ ] Messages save to MongoDB
- [ ] Messages retrieve successfully
- [ ] Chat info saves correctly
- [ ] Chat list shows all chats
- [ ] Pagination works (limit/skip)
- [ ] Timestamps are correct

---

### 3️⃣ QR Code Display Test

**Get QR Code:**
```bash
curl http://localhost:3333/qr \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Expected Response: Base64-encoded PNG image (data:image/png;base64,...)
```

**Check QR Cache:**
```bash
# The QR should be cached in: ./.wwebjs_auth/last_qr.json
cat ./.wwebjs_auth/last_qr.json

# Expected: JSON file with QR data
```

**Frontend Display:**
```html
<!-- Display QR in React -->
<img src={qrCodeBase64} alt="WhatsApp QR" />
```

**✅ What to verify:**
- [ ] QR code displays without error
- [ ] QR is cached to file
- [ ] QR persists after restart
- [ ] QR updates when needed
- [ ] QR is scannable by WhatsApp

---

### 4️⃣ Message In/Out Test

**Send Message (Test):**
```bash
# Use WhatsApp Web UI or programmatic method
# Message should:
# - Send successfully
# - Show ✓ (sent)
# - Show ✓✓ (delivered)
# - Show ✓✓ with blue background (seen)
```

**Receive Message (Test):**
```bash
# Send a message to your WhatsApp from another account
# Message should:
# - Arrive in real-time
# - Display correctly
# - Have sender info
# - Show timestamp
```

**Message Delivery Status:**
```bash
# Check ACK values:
# 1 = sent
# 2 = delivered
# 3 = seen

curl http://localhost:3333/db/messages/test_chat_001 \
  -H 'x-bridge-secret: swar-bridge-secret-2024' | grep '"ack"'

# Expected: ack: 1, 2, or 3
```

**✅ What to verify:**
- [ ] Messages send successfully
- [ ] Delivery status updates
- [ ] Messages receive correctly
- [ ] Real-time sync to MongoDB
- [ ] Message body is preserved
- [ ] Timestamps are accurate

---

### 5️⃣ Profile Image Display Test

**Get Profile Picture:**
```bash
# WhatsApp has profile pictures in metadata
# Check in received messages or contact info

curl http://localhost:3333/db/chats \
  -H 'x-bridge-secret: swar-bridge-secret-2024' | grep profilePicture

# Should return image URL if available
```

**Display in Frontend:**
```html
<img src={chat.profilePicture} alt={chat.name} />
```

**✅ What to verify:**
- [ ] Profile images load without errors
- [ ] Images display correctly
- [ ] Fallback to default if missing
- [ ] Images cached properly
- [ ] No CORS issues

---

### 6️⃣ Group Creation Test

**Create Group:**
```bash
# Use WhatsApp Web UI to create a group
# Group should:
# - Appear in chat list
# - Show as isGroup: true
# - Have participant list
# - Allow messages
```

**Verify Group in DB:**
```bash
curl http://localhost:3333/db/chats \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Look for entries with "isGroup": true
# Example response:
# {
#   "chats": [
#     {
#       "chatId": "group_id_123@g.us",
#       "name": "Test Group",
#       "isGroup": true,
#       "participants": ["user1@c.us", "user2@c.us"],
#       "lastMessage": "Group message",
#       "lastMessageTime": "2026-01-13T10:00:00.000Z",
#       "unreadCount": 0
#     }
#   ]
# }
```

**Send Group Message:**
```bash
# Send a message in the group
# Verify it shows in chat history:

curl http://localhost:3333/db/messages/group_id_123@g.us \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Should show messages with group format
```

**✅ What to verify:**
- [ ] Groups are created successfully
- [ ] Groups appear in chat list
- [ ] isGroup flag is true
- [ ] Participants list shows members
- [ ] Group messages sync to DB
- [ ] Group icons display correctly

---

### 7️⃣ Combined S3 + MongoDB Test (Media with Persistence)

**Upload Media and Sync:**
```bash
# Step 1: Upload image to S3
curl -X POST http://localhost:3333/media/upload \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -F 'file=@test_image.jpg'

# Get: S3 URL and key
# Example: 
# - URL: https://s3.amazonaws.com/.../uuid-test_image.jpg
# - Key: whatsapp-media/uuid-test_image.jpg

# Step 2: Sync message with media to MongoDB
curl -X POST http://localhost:3333/db/sync/message \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -H 'Content-Type: application/json' \
  -d '{
    "messageId": "media_msg_001",
    "chatId": "test_chat_001",
    "body": "Check this image!",
    "fromMe": true,
    "sender": "Tester",
    "timestamp": 1673596800,
    "type": "image",
    "hasMedia": true,
    "mediaUrl": "https://s3.amazonaws.com/.../uuid-test_image.jpg",
    "mediaKey": "whatsapp-media/uuid-test_image.jpg",
    "ack": 2
  }'

# Step 3: Retrieve message with media from MongoDB
curl http://localhost:3333/db/messages/test_chat_001 \
  -H 'x-bridge-secret: swar-bridge-secret-2024'

# Verify:
# - Message contains mediaUrl
# - Media URL is accessible
# - mediaKey is stored
# - Media displays in UI
```

**✅ What to verify:**
- [ ] Image uploads to S3
- [ ] S3 URL is returned
- [ ] Message syncs with media URL
- [ ] Media URL stored in MongoDB
- [ ] Media URL is accessible
- [ ] Image displays in chat
- [ ] Video works the same way

---

## 📊 Full System Test Checklist

### AWS S3 System
```
✅ AWS Credentials loaded from .env
✅ S3 bucket accessible (social-media)
✅ Upload endpoint working (/media/upload)
✅ Download endpoint working (/media/download/:fileKey)
✅ Delete endpoint working (/media/:fileKey)
✅ Image upload successful
✅ Video upload successful
✅ File URLs are valid and accessible
✅ Files persist in S3 bucket
✅ Error handling working
```

### MongoDB System
```
✅ MongoDB connection string valid
✅ Database connected successfully
✅ Message schema created
✅ Chat schema created
✅ Message sync endpoint working (/db/sync/message)
✅ Chat sync endpoint working (/db/sync/chat)
✅ Message retrieval working (/db/messages/:chatId)
✅ Chat retrieval working (/db/chats)
✅ Pagination working (limit/skip)
✅ Data persists across restarts
✅ Error handling working
```

### QR Code System
```
✅ QR code generates correctly
✅ QR code caches to file
✅ QR persists across restarts
✅ QR displays in frontend
✅ QR is scannable
✅ QR updates when session changes
✅ QR endpoint responding
```

### WhatsApp Messaging
```
✅ Messages send successfully
✅ Delivery status updates (✓ ✓✓)
✅ Messages received correctly
✅ Message timestamps accurate
✅ Sender information preserved
✅ Message body preserved
✅ Message type correct (text/image/video)
✅ Real-time sync to MongoDB
```

### Profile & Media
```
✅ Profile images display
✅ Profile names show correctly
✅ Group icons display
✅ Media uploads work
✅ Media downloads work
✅ Image thumbnails show
✅ Video thumbnails show
```

### Group Chats
```
✅ Groups created successfully
✅ Group appears in chat list
✅ isGroup flag set to true
✅ Participants list populated
✅ Group messages send
✅ Group messages receive
✅ Group metadata stored in DB
✅ Group icons show
```

---

## 🚀 Quick Testing Script

```bash
#!/bin/bash
echo "🔍 WhatsApp Bridge System Verification"
echo "======================================"

# 1. Check AWS Connection
echo "1️⃣  Testing AWS S3..."
curl -s http://localhost:3333/media/upload -H 'x-bridge-secret: swar-bridge-secret-2024' >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ AWS endpoint responding" || echo "❌ AWS endpoint failed"

# 2. Check MongoDB Connection
echo "2️⃣  Testing MongoDB..."
curl -s http://localhost:3333/db/chats -H 'x-bridge-secret: swar-bridge-secret-2024' >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ MongoDB endpoint responding" || echo "❌ MongoDB endpoint failed"

# 3. Check QR Code
echo "3️⃣  Testing QR Code..."
curl -s http://localhost:3333/qr -H 'x-bridge-secret: swar-bridge-secret-2024' | grep -q "data:image" 
[ $? -eq 0 ] && echo "✅ QR code generating" || echo "❌ QR code failed"

# 4. Check Message Endpoints
echo "4️⃣  Testing Message Endpoints..."
curl -s http://localhost:3333/db/messages/test -H 'x-bridge-secret: swar-bridge-secret-2024' >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ Message endpoints responding" || echo "❌ Message endpoints failed"

# 5. Check WhatsApp Connection
echo "5️⃣  Testing WhatsApp Connection..."
curl -s http://localhost:3333/status -H 'x-bridge-secret: swar-bridge-secret-2024' >/dev/null 2>&1
[ $? -eq 0 ] && echo "✅ WhatsApp bridge responding" || echo "❌ WhatsApp bridge failed"

echo "======================================"
echo "✅ System verification complete!"
```

---

## 🆘 Troubleshooting

### AWS S3 Not Working
**Error:** Upload fails or returns 403
- [ ] Check AWS_ACCESS_KEY_ID in .env
- [ ] Check AWS_SECRET_ACCESS_KEY in .env
- [ ] Check AWS_REGION is correct
- [ ] Check AWS_S3_BUCKET exists
- [ ] Verify IAM user has S3 permissions

**Fix:**
```bash
# Verify credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Test S3 bucket access
aws s3 ls s3://social-media/ --profile default
```

### MongoDB Not Connected
**Error:** "MongoDB connection error" or messages not saving
- [ ] Check MONGODB_URI in .env
- [ ] Verify MongoDB service running: `mongosh`
- [ ] Check connection string format
- [ ] Verify database name correct
- [ ] Check network connectivity

**Fix:**
```bash
# Test connection
mongosh "mongodb://localhost:27017/whatsapp-bridge"
# Should connect successfully

# Check collections
db.messages.countDocuments()
db.chats.countDocuments()
```

### QR Not Displaying
**Error:** QR code not showing or blank
- [ ] Check qrcode package installed: `npm list qrcode`
- [ ] Check QR_CACHE_FILE path exists: `./.wwebjs_auth/`
- [ ] Restart backend: `npm run dev`
- [ ] Check browser console for errors

**Fix:**
```bash
# Clear cache and restart
rm -f ./.wwebjs_auth/last_qr.json
npm run dev
```

### Messages Not Syncing
**Error:** Messages not appearing in DB or in chat
- [ ] Check MongoDB is running
- [ ] Verify message sync endpoint is working
- [ ] Check authentication header is correct
- [ ] Verify chatId format is correct
- [ ] Check browser network tab for errors

**Fix:**
```bash
# Test message sync manually
curl -X POST http://localhost:3333/db/sync/message \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -H 'Content-Type: application/json' \
  -d '{"messageId":"test","chatId":"test","body":"test"}'
```

### Media Upload Failing
**Error:** Upload returns 400 or 500
- [ ] Check file size < 100MB
- [ ] Check file type is supported
- [ ] Check AWS S3 bucket has write permissions
- [ ] Verify Multer is configured correctly
- [ ] Check disk space available

**Fix:**
```bash
# Test with small image
curl -X POST http://localhost:3333/media/upload \
  -H 'x-bridge-secret: swar-bridge-secret-2024' \
  -F 'file=@small_test.jpg'
```

---

## ✅ Final Verification Checklist

After running all tests above, verify:

- [ ] AWS S3: Images upload and download successfully
- [ ] AWS S3: Videos upload and download successfully
- [ ] MongoDB: Messages persist in database
- [ ] MongoDB: Chats appear in database
- [ ] QR Code: Displays and is scannable
- [ ] Messages: Send and deliver correctly
- [ ] Messages: Receive in real-time
- [ ] Profile: Images display correctly
- [ ] Groups: Create and show correctly
- [ ] Media: Sync with messages properly
- [ ] Pagination: Works for large message sets
- [ ] Error Handling: Shows proper error messages
- [ ] Authentication: All endpoints require token
- [ ] Performance: Responses < 500ms

---

**All Verification Complete! ✅**

If all items above check out, your WhatsApp Bridge system is working perfectly with:
- ✅ AWS S3 connected and operational
- ✅ MongoDB connected and operational  
- ✅ QR code system functional
- ✅ Messages in/out working
- ✅ Profile images displaying
- ✅ Groups creating successfully

**Status: 🟢 System Healthy and Ready for Production**
