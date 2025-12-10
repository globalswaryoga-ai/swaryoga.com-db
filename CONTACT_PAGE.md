# Enhanced Contact Page Documentation

## Overview
A complete, professional contact page has been created with automatic form population for signed-in users and comprehensive messaging capabilities.

## Features

### 1. Auto-Fill for Signed-In Users
When a user is logged in (has a valid `token` in localStorage), their information is automatically populated:
- **Name** - From `userName` in localStorage
- **Email** - From `userEmail` in localStorage  
- **Phone** - From `userPhone` in localStorage
- **Country Code** - From `userCountryCode` in localStorage

### 2. Hero Section
- Beautiful background image with overlay
- "Get in Touch" heading with green accent
- Welcoming subtitle

### 3. Contact Information Panel
Located on the left side with:
- **Email** - hello@swaryoga.com
- **Phone** - +91 93099 86820
- **Location** - India
- Response time information box

### 4. Contact Form
Comprehensive form with the following fields:

#### Basic Information
- **Full Name** (required, text input)
- **Email Address** (required, email validation)
- **Phone Number** (required with country code selector)
  - Supports 7 countries with their country codes
  - Phone validation (10-15 digits)

#### Message Details
- **Subject Dropdown** (required) with options:
  - Workshop Inquiry
  - Product Information
  - Membership Plans
  - Technical Support
  - Feedback
  - General Inquiry
  - Other

- **Message** (required, textarea)
  - Minimum 10 characters
  - 4 rows of text area

### 5. Form Validation
- Real-time error clearing while typing
- Comprehensive error messages for each field
- Email format validation
- Phone number format validation
- Message length validation

### 6. User Feedback
- **Success Message**: Green notification when message is sent
- **Error Message**: Red notification if validation fails
- **Welcome Message**: Shows personalized greeting for logged-in users
- Auto-dismisses success message after 5 seconds

### 7. Form Behavior
- **For Logged-In Users**: Auto-clears subject and message only (keeps personal info)
- **For Anonymous Users**: Clears entire form after submission
- Loading spinner during submission
- Disabled button while submitting

### 8. Responsive Design
- Mobile-optimized with `sm:` breakpoints
- Adapts from single column on mobile to 3-column layout on desktop
- Touch-friendly spacing and inputs
- Horizontal scrollable on narrow screens

## Data Structure

### Form Data State
```typescript
{
  name: string,
  email: string,
  phone: string,
  countryCode: string (e.g., '+91'),
  subject: string,
  message: string
}
```

### Country Codes Supported
```typescript
[
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+977', country: 'Nepal' },
  { code: '+65', country: 'Singapore' },
  { code: '+971', country: 'UAE' }
]
```

## API Integration

### Endpoint
**URL:** `/api/contact`
**Method:** POST
**Headers:** `Content-Type: application/json`

### Request Body
```json
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "countryCode": "string",
  "subject": "string",
  "message": "string"
}
```

### Expected Response
- **Success (200):** JSON object with confirmation
- **Error (400+):** Error message

## Usage Flow

### For Signed-In Users
1. User logs in (token stored in localStorage)
2. Navigates to contact page
3. Form auto-fills with user's name, email, phone, country code
4. User only needs to fill subject and message
5. Green welcome message appears showing their name
6. Submits form
7. After submission, only subject and message are cleared
8. Personal info remains for next inquiry

### For Anonymous Users
1. User visits contact page (no token)
2. Form is empty
3. User fills all fields
4. Submits form
5. Entire form is cleared on success

## File Location
```
app/contact/page.tsx
```

## Components Used
- **Navigation** - Header component
- **Footer** - Footer component with admin button
- **lucide-react Icons** - Mail, Phone, MapPin, Send, CheckCircle, AlertCircle

## Styling
- Tailwind CSS utility classes
- Green color scheme (#059669, #047857, #ecfdf5)
- Responsive breakpoints (sm, md, lg)
- Shadow and hover effects
- Smooth transitions

## Form Validation Rules

| Field | Rules |
|-------|-------|
| Name | Required, non-empty |
| Email | Required, valid email format |
| Phone | Required, 10-15 digits |
| Subject | Required, selected from dropdown |
| Message | Required, minimum 10 characters |

## Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive on all screen sizes
- Mobile and tablet optimized
- Fallbacks for older CSS features

## Security Considerations
1. Form data validated on client-side
2. Email validation prevents invalid formats
3. Phone validation prevents injection
4. Message length limits abuse
5. CSRF protection via API endpoints

## Future Enhancements
1. Server-side validation
2. Rate limiting
3. CAPTCHA verification
4. Email notifications
5. File attachments
6. Message categories
7. Priority levels
8. Auto-reply confirmation emails
9. Admin notifications
10. Message status tracking

## Testing Checklist
- [ ] Form validation works for each field
- [ ] Auto-fill works when logged in
- [ ] Success message displays and auto-dismisses
- [ ] Error messages are clear
- [ ] API call succeeds on submission
- [ ] Form clears appropriately
- [ ] Mobile responsive layout works
- [ ] Icons display correctly
- [ ] Hover states work
- [ ] Loading spinner shows during submission

---
**Version:** 1.0
**Created:** December 11, 2025
**Status:** Complete and Ready for API Integration
