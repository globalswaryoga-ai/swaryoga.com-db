# 🔐 ngrok Account Setup - Step by Step

## Step 1: Create Free ngrok Account
Go to: https://dashboard.ngrok.com/signup

Fill in:
- Email address
- Password
- Click "Sign up"

## Step 2: Get Your Authtoken
After signing up:
1. Go to: https://dashboard.ngrok.com/get-started/your-authtoken
2. You'll see your authtoken (looks like): `X_xxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. Copy it (the full token)

## Step 3: Install Authtoken Locally
In your terminal, run:
```bash
ngrok config add-authtoken PASTE_YOUR_TOKEN_HERE
```

Replace `PASTE_YOUR_TOKEN_HERE` with your actual token from Step 2.

Example:
```bash
ngrok config add-authtoken 2X_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxooooo
```

## Step 4: Verify Installation
```bash
ngrok config check
```

You should see something like:
```
Valid configuration file at /Users/mohankalburgi/Library/Application Support/ngrok/ngrok.yml
```

## Step 5: Start the Tunnel
```bash
ngrok http 3333 --subdomain=swar-yoga-bridge
```

You'll see output like:
```
Forwarding                    https://swar-yoga-bridge.ngrok.io -> http://localhost:3333
```

## ✅ Then Continue with Steps 2 & 3

Once ngrok is running with the URL, come back and I'll help you:
- Update `.env.local`
- Restart the dev server
- Test the QR code
