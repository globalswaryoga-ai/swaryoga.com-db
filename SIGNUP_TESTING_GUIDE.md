# Signup Testing Guide

## Prerequisites
- Dev server running on `http://localhost:3000`
- MongoDB Atlas connected
- Admin credentials: `admin` / `Mohanpk@1010`

## Test Credentials
**Email:** `swarsakshi9@gmail.com`
**Password:** `Mohan@123`

## Step-by-Step Testing Instructions

### Step 1: Access the Signup Page
1. Open your browser and navigate to `http://localhost:3000/signup`
2. You should see the signup form with all fields

### Step 2: Fill out the Signup Form

**Personal Information Section:**
- **Full Name:** `Sakshi Swaraj` (or any name)
- **Email:** `swarsakshi9@gmail.com`
- **Country Code:** `+91` (India)
- **Phone Number:** `9876543210` (or any 10-digit number)
- **Country:** `India`
- **State:** Select from dropdown (e.g., `Maharashtra`)

**Personal Details:**
- **Gender:** `Female` (or Male)
- **Age:** `28` (or any age 1-120)
- **Profession:** `Yoga Instructor` (or any profession)

**Security Section:**
- **Password:** `Mohan@123`
- **Confirm Password:** `Mohan@123`
- **Agree to Terms:** Check the checkbox

### Step 3: Submit the Form
1. Click the **"Create Account"** button
2. Wait for success message: **"Account created successfully! Redirecting..."**
3. You should be redirected to the home page
4. Check browser console (F12) for any errors

### Step 4: Verify Data in Admin Panel

#### 4a. Login to Admin Panel
1. Navigate to `http://localhost:3000/admin/login`
2. Enter credentials:
   - **Username:** `admin`
   - **Password:** `Mohanpk@1010`
3. Click **"Login"**
4. You should see the Admin Dashboard

#### 4b. View Signup Data
1. From the dashboard, click **"Signup Data"** in the sidebar
2. You should see a table with your newly registered user
3. Verify the following columns are populated correctly:
   - **Name:** Should match what you entered
   - **Email:** Should be `swarsakshi9@gmail.com`
   - **Phone:** Should match your entered phone
   - **Country:** Should be `India`
   - **State:** Should match your selection
   - **Gender:** Should be `Female` (or your selection)
   - **Age:** Should be `28` (or your entry)
   - **Profession:** Should be `Yoga Instructor` (or your entry)
   - **Date:** Should show today's date

### Step 5: Export Signup Data
1. On the Signup Data page, click the **"Export CSV"** button
2. A CSV file should download with all signup records
3. Open the CSV file to verify data format

### Step 6: Test Contact Page Auto-Fill (Optional)
1. Sign in with the credentials you just created:
   - Email: `swarsakshi9@gmail.com`
   - Password: `Mohan@123`
2. Navigate to `http://localhost:3000/contact`
3. Verify that the form is auto-filled with:
   - **Name:** Your registered name
   - **Email:** `swarsakshi9@gmail.com`
   - **Phone:** Your registered phone
   - **Country Code:** Your registered country code

## Expected Results

### Successful Signup ✅
- [ ] Form submission succeeds
- [ ] Success message appears
- [ ] User is redirected
- [ ] Token is saved in localStorage
- [ ] User data appears in admin panel within seconds
- [ ] All form fields are saved correctly in the database

### Admin Panel ✅
- [ ] Can login with admin credentials
- [ ] Signup data table displays the new user
- [ ] All columns show correct information
- [ ] CSV export contains the user record
- [ ] User appears in the table with correct timestamp

## Troubleshooting

### Form Submission Fails
**Check:**
- Browser console for error messages (F12 → Console)
- Network tab to see API response
- Ensure MongoDB is connected (check `.env.local`)

### Data Not Appearing in Admin Panel
**Check:**
- Signup API response in Network tab
- MongoDB connection string is correct
- User schema includes all fields (name, email, phone, country, state, gender, age, profession)
- Admin token is valid

### Login Issues
**Admin Panel:**
- Clear localStorage: `localStorage.clear()`
- Refresh page
- Try login again with `admin` / `Mohanpk@1010`

## Database Verification

### Via MongoDB Atlas
1. Go to MongoDB Atlas (https://cloud.mongodb.com)
2. Navigate to Swar Yoga Database
3. Find `swar_yoga_db` → `users` collection
4. Look for document with email `swarsakshi9@gmail.com`
5. Verify all fields are stored correctly

### Via Terminal (MongoDB Shell)
```bash
mongosh "mongodb+srv://swarsakshi9_db_user:Swaryogadbmongo170776@swaryogadb.dheqmu1.mongodb.net/swar_yoga_db"
db.users.find({ email: "swarsakshi9@gmail.com" })
```

## Success Criteria

The signup integration is working correctly when:

1. ✅ User can complete signup form with all fields
2. ✅ Form submission is accepted by API (status 201)
3. ✅ Token is returned and stored in localStorage
4. ✅ User data is saved to MongoDB with all fields
5. ✅ Admin can login to admin panel
6. ✅ Signup data appears in admin/signup-data page
7. ✅ All columns display correct information
8. ✅ CSV export works and includes the new user
9. ✅ Contact form auto-fills for logged-in users

## Next Steps

After successful testing:
- [ ] Test signin data logging
- [ ] Test contact message storage
- [ ] Test with multiple user signups
- [ ] Verify data persistence across deployments
- [ ] Deploy to Vercel production
