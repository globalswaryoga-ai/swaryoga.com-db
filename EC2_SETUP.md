# 🔑 EC2 VPS Setup Guide

Your VPS management system is ready! Just need to add EC2 credentials to `.env.local`.

## Step 1: Locate Your EC2 Key Pair

Your EC2 key should be on your Mac. Common locations:
```bash
# Check these locations:
ls -la ~/Downloads/your-key.pem
ls -la ~/.ssh/your-key.pem
ls -la ~/Documents/AWS/your-key.pem

# Find all .pem files:
find ~ -name "*.pem" -type f 2>/dev/null
```

## Step 2: Get Your VPS IP Address

Your VPS is: **wa-bridge.swaryoga.com**

Get the IP address:
```bash
dig wa-bridge.swaryoga.com +short
# or
nslookup wa-bridge.swaryoga.com
```

Note the IP address (usually something like 1.2.3.4)

## Step 3: Set Permissions on Key Pair

Your EC2 key needs restricted permissions:
```bash
# Replace with actual key path
chmod 600 ~/path/to/your-key.pem

# Verify permissions:
ls -la ~/path/to/your-key.pem
# Should show: -rw------- (600)
```

## Step 4: Add to `.env.local`

Open `.env.local` in your editor:
```bash
code /Users/mohankalburgi/swaryoga.com-db/.env.local
```

Add these lines (replace with your actual values):
```bash
# EC2 / VPS Configuration
EC2_KEY_PATH=/Users/mohankalburgi/path/to/your-key.pem
VPS_IP=1.2.3.4
VPS_USER=ec2-user
VPS_SSH_PORT=22
VPS_BRIDGE_DIR=~/swaryoga/swaryoga.com-db/deploy/wa-bridge
```

**Important**: Use absolute paths for EC2_KEY_PATH, not ~

## Step 5: Test SSH Connection

```bash
# Reload shell
source ~/.zshrc

# Test connection
qa-vps-test
```

You should see:
```
✅ SSH Connection successful!
Connected to: wa-bridge.swaryoga.com (1.2.3.4)
```

## Step 6: Check Bridge Status

```bash
qa-vps-bridge-status
```

You should see:
```
🏃 Bridge is RUNNING on VPS
Container ID: abc123...
Status: healthy
Uptime: 5 days
```

## Common Issues

### ❌ "Permission denied (publickey)"
- Check EC2_KEY_PATH is correct and absolute
- Run `chmod 600` on your key.pem
- Verify VPS_IP is correct

### ❌ "No such file or directory"
- EC2_KEY_PATH must exist
- Use absolute path, not ~/
- Example: `/Users/mohankalburgi/Downloads/my-key.pem`

### ❌ "Connection refused"
- VPS_IP might be wrong
- Test with: `ping 1.2.3.4`
- Try: `ssh -i /path/to/key.pem ec2-user@1.2.3.4`

### ❌ "Could not resolve hostname"
- wa-bridge.swaryoga.com might not be resolving
- Test DNS: `nslookup wa-bridge.swaryoga.com`
- Check internet connection

## Verify Everything Works

Once SSH is working:

```bash
# Test connection
qa-vps-test

# Check bridge
qa-vps-bridge-status

# View all VPS options
qa-vps-menu
```

## Available VPS Commands

Once EC2 is configured:

| Command | What it does |
|---------|-------------|
| `qa-vps-test` | Test SSH connection to VPS |
| `qa-vps-bridge-status` | Check if bridge is running |
| `qa-vps-bridge-start` | Start the bridge on VPS |
| `qa-vps-bridge-stop` | Stop the bridge |
| `qa-vps-bridge-restart` | Restart the bridge |
| `qa-vps-bridge-logs` | View live bridge logs |
| `qa-vps-status` | System uptime, disk, memory |
| `qa-vps-docker-ps` | List Docker containers |
| `qa-vps-ssh` | Open full SSH terminal |
| `qa-vps-menu` | Interactive menu with all options |

## Next Steps

Once EC2 is configured:
1. ✅ `qa-vps-test` - Confirm SSH works
2. ✅ `qa-vps-bridge-status` - Confirm bridge is running
3. ✅ `qa-qr-open` - Open QR code to scan
4. ✅ Start using WhatsApp integration!

## Need Help?

If something doesn't work:
```bash
# Show diagnostic info
qa-diagnose

# Show all VPS connection info
qa-vps-info

# Get full help
qa-vps-help
```

Good luck! 🚀
