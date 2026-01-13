# ngrok Setup Instructions

## Problem
ngrok requires authentication to run the tunnel. You need to:

1. **Sign up for free account** (if you don't have one)
   - Go to: https://dashboard.ngrok.com/signup
   - Or login if you have account: https://dashboard.ngrok.com/login

2. **Get your authtoken**
   - After login, go to: https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy the authtoken (looks like: `X_xxxxxxxxxxxxxxxxxxxxxxxxxxx`)

3. **Install authtoken locally**
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
   ```
   
   Example:
   ```bash
   ngrok config add-authtoken 2X_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxooooo
   ```

4. **Then start the tunnel**
   ```bash
   ngrok http 3333 --subdomain=swar-yoga-bridge
   ```

## Or: Use Quick Alternative (No Authentication Needed)

If you don't want to set up ngrok account, you can use a **free dynamic tunnel**:

```bash
ngrok http 3333
```

This will create a temporary URL like: `https://random-string.ngrok.io`

Then update `.env.local` with that URL instead.

## Next Steps
1. Complete ngrok setup (authtoken or free tunnel)
2. Note the HTTPS URL provided by ngrok
3. Update `.env.local` with that URL
4. Restart dev server
5. Test on `crm.swaryoga.com/admin/crm/qr`
