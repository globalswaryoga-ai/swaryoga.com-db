# CRM Admin Dashboard - Quick Start Guide

## 🚀 Getting Started

### 1. Start the Development Server
```bash
cd /Users/mohankalburgi/Downloads/swar-yoga-web-mohan
npm run dev
```

The app will be available at: `http://localhost:3000`

### 2. Login to Admin Panel
Navigate to: `http://localhost:3000/admin/login`

**Default Credentials** (if configured):
- Email: admin@example.com (or your configured admin email)
- Password: (configured in environment)

**Note**: You need a valid admin account. If you don't have one, create one via:
```bash
node scripts/create-admin.js
```

### 3. Access CRM Dashboard
Once logged in, you'll be redirected to: `http://localhost:3000/admin/crm`

---

## 📍 Dashboard Pages

### Main Pages Accessible

| Page | URL | Purpose |
|------|-----|---------|
| Overview | `/admin/crm` | Dashboard stats and navigation |
| Leads | `/admin/crm/leads` | Lead management (CRUD) |
| Sales | `/admin/crm/sales` | Sales tracking and analytics |
| Messages | `/admin/crm/messages` | WhatsApp message management |
| Analytics | `/admin/crm/analytics` | Advanced analytics & KPIs |
| Templates | `/admin/crm/templates` | Message template management |
| Consent | `/admin/crm/permissions` | User consent management |

---

## 🧪 Testing the Dashboard

### Test 1: View Dashboard Overview
1. Navigate to `http://localhost:3000/admin/crm`
2. Verify you see:
   - Stats cards (Total Leads, Total Sales, Messages, Conversion Rate)
   - Navigation sidebar with 7 options
   - Quick action buttons
   - System status indicators

**Expected**: All stats display correctly, sidebar links are functional

---

### Test 2: Manage Leads
1. Click "Leads" in sidebar or navigate to `/admin/crm/leads`
2. **Test Search**:
   - Enter a lead name in search box
   - Verify results filter in real-time
   
3. **Test Filter**:
   - Select different status filters
   - Verify table updates
   
4. **Test Create Lead**:
   - Click "+ Add Lead" button
   - Fill in form: Name, Email, Phone, Source, Status
   - Click "Create Lead"
   - Verify new lead appears in table
   
5. **Test Update Status**:
   - Click status dropdown on any lead
   - Change status (lead → prospect → customer → inactive)
   - Verify table updates immediately
   
6. **Test Delete Lead**:
   - Click Delete button
   - Confirm dialog
   - Verify lead is removed

**Expected**: All CRUD operations work, table updates reflect changes

---

### Test 3: Track Sales
1. Click "Sales" in sidebar or navigate to `/admin/crm/sales`
2. **Test View Modes**:
   - Click "List View" tab → Shows individual sales
   - Click "Summary View" tab → Shows metrics
   - Click "Daily View" tab → Shows daily aggregates
   - Click "Monthly View" tab → Shows monthly aggregates
   
3. **Test Create Sale**:
   - Click "+ Record Sale"
   - Fill form: Lead ID, Amount, Payment Mode
   - Click "Record Sale"
   - Verify it appears in the list
   
4. **Test Delete Sale**:
   - Click Delete on any sale
   - Confirm
   - Verify removal

**Expected**: All view modes show data, create/delete operations work

---

### Test 4: Manage Messages
1. Click "Messages" in sidebar or navigate to `/admin/crm/messages`
2. **Test Filters**:
   - Filter by Status (Pending, Sent, Delivered, Failed, Read)
   - Filter by Direction (Inbound, Outbound)
   - Verify table updates
   
3. **Test Send Message**:
   - Click "+ Send Message"
   - Enter Lead ID and message text
   - Click "Send"
   - Verify message appears in list
   
4. **Test Retry Failed**:
   - Find a failed message
   - Click "Retry" button or "Retry Message" in detail view
   - Verify status updates
   
5. **Test Message Detail**:
   - Click on any message row
   - View full message content
   - Verify metadata (timestamp, direction, etc.)

**Expected**: Filtering works, messages send successfully, detail modal shows all info

---

### Test 5: View Analytics
1. Click "Analytics" in sidebar or navigate to `/admin/crm/analytics`
2. **Test View Modes**:
   - "Overview" → Shows 4 main metrics
   - "Leads" → Shows lead-specific analytics
   - "Sales" → Shows sales metrics and breakdown
   - "Messages" → Shows message statistics
   - "Conversion" → Shows funnel and drop-off rate
   - "Trends" → Shows daily and weekly trends
   
3. **Test Refresh**:
   - Click "🔄 Refresh" button
   - Verify data reloads

**Expected**: All view modes display correctly, metrics are accurate

---

### Test 6: Manage Templates
1. Click "Templates" in sidebar or navigate to `/admin/crm/templates`
2. **Test Create Template**:
   - Click "+ Create Template"
   - Fill form:
     - Name: "Welcome Message"
     - Category: "message"
     - Content: "Hi {name}, welcome to {company}!"
   - Click "Create"
   - Verify template appears with "draft" status
   
3. **Test Variable Detection**:
   - Verify variables ({name}, {company}) are extracted and shown
   
4. **Test Approval Workflow**:
   - Click template card
   - Click "Approve" button
   - Verify status changes to "approved"
   - Or click "Reject" to test rejection
   
5. **Test Filter**:
   - Filter by status (All, Draft, Approved, Rejected)
   - Verify only matching templates show
   
6. **Test Delete**:
   - Click Delete button (×)
   - Confirm
   - Verify removal

**Expected**: Template creation works, approval workflow functional, variables detected

---

### Test 7: Manage Consent
1. Click "Consent" in sidebar or navigate to `/admin/crm/permissions`
2. **Test Create Consent**:
   - Click "+ Grant Consent"
   - Enter Lead ID
   - Select consent types (checkboxes):
     - Marketing Communications
     - SMS Messages
     - Email Notifications
     - WhatsApp Messages
     - Phone Calls
     - Data Processing
   - Click "Save"
   - Verify records appear in table
   
3. **Test Filter**:
   - Filter by Type (dropdown)
   - Filter by Status (Granted/Withdrawn)
   - Verify filtering works
   
4. **Test Update Status**:
   - Click on a consent record (View button)
   - Click "Withdraw Consent"
   - Verify status changes to "Withdrawn"
   
5. **Test Delete**:
   - Click "Delete Record"
   - Verify removal

**Expected**: Consent grants/withdrawals work, filtering functional

---

## 🐛 Troubleshooting

### Issue: "Unauthorized" error on API calls
**Solution**: 
- Check that you're logged in
- Verify `adminToken` exists in browser localStorage
- Try logging out and back in

### Issue: Pages show "Loading..." indefinitely
**Solution**:
- Check browser console for API errors
- Verify backend server is running (`npm run dev`)
- Check MongoDB connection
- Try refreshing the page

### Issue: Forms don't submit
**Solution**:
- Check all required fields are filled
- Look for validation errors
- Check browser console for JavaScript errors
- Verify network requests in DevTools

### Issue: Data doesn't update after create/edit
**Solution**:
- Refresh the page
- Wait a few seconds (pagination might be offset)
- Check browser console for errors
- Verify API response in Network tab

### Issue: Modal doesn't close
**Solution**:
- Press Escape key
- Click outside the modal
- Click "Cancel" button

---

## 🔍 API Testing

### Test an API Directly
Use curl to test an endpoint:

```bash
# Get leads
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/crm/leads?limit=10

# Create a lead
curl -X POST http://localhost:3000/api/admin/crm/leads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Lead","email":"test@example.com","phoneNumber":"1234567890","source":"web","status":"lead"}'
```

### Get Admin Token
In browser console, run:
```javascript
console.log(localStorage.getItem('adminToken'))
```

---

## 📊 Sample Test Data

### Create Test Lead
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+919876543210",
  "source": "website",
  "status": "lead"
}
```

### Create Test Sale
```json
{
  "leadId": "LEAD_ID_HERE",
  "amount": 5000,
  "paymentMode": "payu"
}
```

### Create Test Message
```json
{
  "leadId": "LEAD_ID_HERE",
  "message": "Hello! This is a test message."
}
```

### Create Test Template
```json
{
  "name": "Appointment Reminder",
  "category": "notification",
  "content": "Hi {name}, you have an appointment on {date} at {time}."
}
```

### Grant Test Consent
```json
{
  "leadId": "LEAD_ID_HERE",
  "consentTypes": ["marketing", "sms", "email"],
  "status": "granted"
}
```

---

## ✅ Verification Checklist

After initial setup, verify:

- [ ] Can login to admin panel
- [ ] Dashboard loads with stats
- [ ] Can navigate between all 7 pages
- [ ] Can create, read, update, delete leads
- [ ] Can record and view sales
- [ ] Can send and manage messages
- [ ] Can view analytics in different modes
- [ ] Can create and approve templates
- [ ] Can manage user consent
- [ ] All sidebar links work
- [ ] Logout button clears session
- [ ] No console errors
- [ ] Responsive design (test mobile view)

---

## 🎯 Next Steps

After dashboard is working:

1. **Test with Real Data**:
   - Connect to production MongoDB
   - Import sample data
   - Verify all operations with real data

2. **Performance Testing**:
   - Load test with large datasets
   - Check pagination performance
   - Monitor API response times

3. **User Testing**:
   - Have team members test
   - Gather feedback
   - Iterate on UX

4. **Deployment**:
   - Deploy to staging environment
   - Run E2E tests
   - Deploy to production

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Check server logs: `npm run dev` terminal output
3. Verify MongoDB connection
4. Review API documentation
5. Check authentication token validity

---

**Happy Testing! 🚀**

Dashboard is fully functional and ready for use.
