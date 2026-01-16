# Cashfree Integration - Quick Reference

## ⚡ Quick Setup (5 minutes)

### 1. Add Credentials to `.env.local`
```dotenv
CASHFREE_ENV=sandbox
CASHFREE_CLIENT_ID=your_client_id
CASHFREE_CLIENT_SECRET=your_client_secret
CASHFREE_API_VERSION=2023-08-01
```

### 2. Test Payment Flow
```bash
npm run dev
# Visit workshop/session page
# Click payment button
# Use Cashfree test card: 4111111111111111
```

### 3. Deploy
```bash
# Update Vercel environment variables
vercel env add CASHFREE_CLIENT_ID
vercel env add CASHFREE_CLIENT_SECRET
```

---

## 🔗 Component Usage

### Workshop Payment
```tsx
<WorkshopPaymentButton
  workshopSlug="yoga-basics"
  token={authToken}
  firstName="John"
  lastName="Doe"
  email="john@example.com"
  phone="+919876543210"
  city="Bangalore"
  onPaymentSuccess={handleSuccess}
/>
```

### Custom Payment
```tsx
<CashfreePaymentButton
  amount={99}
  productInfo="Course: Yoga Basics"
  firstName="John"
  email="john@example.com"
  phone="+919876543210"
  city="Bangalore"
  token={authToken}
  onSuccess={(data) => console.log('Success:', data)}
  onError={(error) => console.error('Error:', error)}
/>
```

---

## 📍 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/payments/cashfree/initiate` | Create payment session |
| GET | `/api/payments/cashfree/return` | Handle payment completion |
| POST | `/api/payments/cashfree/webhook` | Receive notifications |

---

## 🧪 Testing

### Sandbox Mode
- Use `CASHFREE_ENV=sandbox`
- Test card: `4111111111111111`
- Any future expiry date
- Any CVC

### Production Mode
- Change to `CASHFREE_ENV=production`
- Use live credentials
- Real payments processed

---

## ✅ Payment Statuses

| Status | Meaning | Action |
|--------|---------|--------|
| `PAID` | ✅ Success | Order completed |
| `FAILED` | ❌ Failed | Retry payment |
| `CANCELLED` | ⏹️ Cancelled | Payment cancelled |
| `EXPIRED` | ⏱️ Expired | Session expired |
| `ACTIVE` | ⏳ Pending | Awaiting completion |

---

## 🐛 Troubleshooting

**"Cashfree SDK not loaded"**
- Check browser console
- Verify CDN access
- Refresh page

**"Invalid payment session"**
- Verify credentials in `.env.local`
- Check MongoDB connection
- Ensure Order created before payment

**"Webhook not triggering"**
- Register URL in Cashfree Dashboard
- Check webhook logs in dashboard
- Verify MongoDB Order updates

---

## 🔗 Resources

- **Setup Guide**: `CASHFREE_SETUP_GUIDE.md`
- **Implementation Summary**: `CASHFREE_INTEGRATION_COMPLETE.md`
- **Official Docs**: https://docs.cashfree.com
- **Dashboard**: https://dashboard.cashfree.com

---

## 💰 Payment Methods Supported

✅ UPI  
✅ Credit Card  
✅ Debit Card  
✅ Net Banking  
✅ Wallet (PayTM, Google Pay, etc.)  
✅ Buy Now Pay Later  

---

## 🛡️ Security

- JWT token verification on all endpoints
- HTTPS required in production
- Server-side payment verification
- Webhook signature support
- No sensitive data in frontend

---

## 📱 Files Reference

| File | Purpose |
|------|---------|
| `components/CashfreePaymentButton.tsx` | Payment button component |
| `app/api/payments/cashfree/initiate/route.ts` | Session creation |
| `app/api/payments/cashfree/return/route.ts` | Payment verification |
| `app/api/payments/cashfree/webhook/route.ts` | Webhooks |
| `lib/payments/cashfree.ts` | API utilities |
| `CASHFREE_SETUP_GUIDE.md` | Complete guide |
| `CASHFREE_INTEGRATION_COMPLETE.md` | Summary |

---

## 🚀 Deployment Checklist

- [ ] Credentials added to Vercel
- [ ] Webhook URL registered in Cashfree
- [ ] Changed ENV to `production`
- [ ] Tested with real transaction
- [ ] Monitoring set up
- [ ] Fallback payment method ready
- [ ] Error notifications configured

---

**Status**: ✅ Ready to use  
**Backend**: ✅ Already implemented  
**Frontend**: ✅ Just implemented  
**Documentation**: ✅ Complete  

🎉 **You're all set!**
