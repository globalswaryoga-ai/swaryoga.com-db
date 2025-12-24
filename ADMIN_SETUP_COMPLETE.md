# 🔐 CRM Admin Access - Complete Setup

## ✅ Admin User Created Successfully

### Admin Credentials
```
User ID: admincrm
Password: Turya@#$4596
Email: admin@swaryoga.com
Role: admin
```

---

## 🔑 Authentication Methods

### Method 1: Login API (Recommended)
```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "admincrm",
    "password": "Turya@#$4596"
  }'
```

Response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "admincrm",
    "email": "admin@swaryoga.com",
    "role": "admin",
    "isAdmin": true
  }
}
```

### Method 2: Using Login Script
```bash
node admin-login.js admincrm 'Turya@#$4596'
```

### Method 3: Direct JWT Token (Pre-generated)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbmNybSIsImVtYWlsIjoiYWRtaW5Ac3dhcnlvZ2EuY29tIiwiaXNBZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzY2NTU4NjYwLCJleHAiOjE3NjcxNjM0NjB9.i0GyqSr2ey0sRzoYDsPMH8K5JFwB51coBfVLxSH5oLY
```

---

## 🧪 Test API Access

### Get All Leads
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbmNybSIsImVtYWlsIjoiYWRtaW5Ac3dhcnlvZ2EuY29tIiwiaXNBZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzY2NTU4NjYwLCJleHAiOjE3NjcxNjM0NjB9.i0GyqSr2ey0sRzoYDsPMH8K5JFwB51coBfVLxSH5oLY"

curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/crm/leads?limit=10
```

### Create New Lead
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbmNybSIsImVtYWlsIjoiYWRtaW5Ac3dhcnlvZ2EuY29tIiwiaXNBZG1pbiI6dHJ1ZSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzY2NTU4NjYwLCJleHAiOjE3NjcxNjM0NjB9.i0GyqSr2ey0sRzoYDsPMH8K5JFwB51coBfVLxSH5oLY"

curl -X POST http://localhost:3000/api/admin/crm/leads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Your Name",
    "email": "name@example.com",
    "phoneNumber": "+919876543210",
    "source": "website",
    "status": "lead"
  }'
```

---

## 📊 Available CRM Endpoints

All endpoints require valid admin JWT token in Authorization header.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/crm/leads` | GET/POST | Manage leads |
| `/api/admin/crm/leads/[id]` | GET/PATCH/DELETE | Single lead |
| `/api/admin/crm/leads/bulk` | POST/GET/DELETE | Bulk operations |
| `/api/admin/crm/sales` | GET/POST | Sales tracking |
| `/api/admin/crm/messages` | GET/POST/PUT/DELETE | WhatsApp messages |
| `/api/admin/crm/templates` | GET/POST/PATCH/DELETE | Message templates |
| `/api/admin/crm/analytics` | GET | Analytics dashboard |
| `/api/admin/crm/permissions` | GET/POST/DELETE | Consent/permissions |
| `/api/admin/crm/labels` | GET/POST/DELETE | Lead labels |

---

## 🎯 Dashboard Access

### Local Development
```
http://localhost:3000/admin/crm
```

### Production (Vercel)
```
https://swaryoga.com/admin/crm
```

---

## 🔐 Password Hash Details

The password is securely hashed using bcryptjs:
- Salt rounds: 10
- Algorithm: bcryptjs (bcrypt)
- Secure storage in MongoDB

---

## 📝 Files Created

1. **create-admin.js** - Script to create admin user
2. **admin-login.js** - Script to login and get token
3. **/api/admin/auth/login/route.ts** - API endpoint for login

---

## ✅ Verification Checklist

- [x] Admin user created in MongoDB
- [x] Password securely hashed with bcrypt
- [x] JWT token generation working
- [x] API endpoints responding with admin auth
- [x] Login API endpoint available
- [x] All 9 CRM APIs accessible with admin token
- [x] 4 test leads in database
- [x] Performance optimized

---

## 🚀 Ready for Production

Admin authentication is now fully set up and ready to deploy to swaryoga.com!

**Next Steps:**
1. Test login on http://localhost:3000/admin/crm (use credentials above)
2. Deploy to Vercel with `vercel --prod`
3. Access at https://swaryoga.com/admin/crm

---

## 💡 Quick Commands

```bash
# Create admin user
node create-admin.js

# Login and get token
node admin-login.js admincrm 'Turya@#$4596'

# Test API with token
TOKEN=$(node admin-login.js admincrm 'Turya@#$4596' | grep "eyJ" | head -1)
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/crm/leads
```

---

**Status**: ✅ ADMIN SETUP COMPLETE
