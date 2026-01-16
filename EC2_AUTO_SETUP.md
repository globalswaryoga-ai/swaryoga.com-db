# EC2 Bridge Auto-Setup & Management (From Mac Terminal)

All commands can be run from your Mac local terminal without SSH. No EC2 terminal needed.

---

## 1. Instance Details
```bash
# Get instance info
aws ec2 describe-instances --region ap-south-1 \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[PublicIpAddress,InstanceId,SecurityGroups[0].GroupId]' \
  --output table
```

**Output:**
```
Instance IP:        3.109.154.61
Instance ID:        i-0d2fb8b38cb190ffe
Security Group ID:  sg-0ebce8ebe37dc8e71
Region:             ap-south-1
```

---

## 2. Check Instance Status

```bash
# Check if instance is healthy
aws ec2 describe-instance-status --instance-ids i-0d2fb8b38cb190ffe \
  --region ap-south-1 \
  --query 'InstanceStatuses[0].[InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]' \
  --output text
```

Expected output: `running ok ok`

---

## 3. Reboot Instance (When Stuck)

```bash
# Reboot the instance
aws ec2 reboot-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1

# Wait for reboot to complete (2-3 minutes)
echo "Waiting 120 seconds for reboot..." && sleep 120

# Verify status
aws ec2 describe-instance-status --instance-ids i-0d2fb8b38cb190ffe \
  --region ap-south-1 \
  --query 'InstanceStatuses[0].[InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]' \
  --output text
```

---

## 4. Stop/Start Instance (Full Restart)

```bash
# Stop the instance
aws ec2 stop-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1

# Wait for stop
echo "Waiting 30 seconds..." && sleep 30

# Start the instance
aws ec2 start-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1

# Wait for start
echo "Waiting 120 seconds for startup..." && sleep 120

# Check status
aws ec2 describe-instance-status --instance-ids i-0d2fb8b38cb190ffe \
  --region ap-south-1 \
  --query 'InstanceStatuses[0].[InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]' \
  --output text
```

---

## 5. Check Security Group Rules

```bash
# View all inbound rules
aws ec2 describe-security-groups --group-ids sg-0ebce8ebe37dc8e71 \
  --region ap-south-1 \
  --query 'SecurityGroups[0].IpPermissions[*].[IpProtocol,FromPort,ToPort,IpRanges[0].CidrIp]' \
  --output table
```

---

## 6. Add Security Group Rule (Port 3333)

```bash
# Add inbound rule for port 3333
aws ec2 authorize-security-group-ingress \
  --group-id sg-0ebce8ebe37dc8e71 \
  --protocol tcp \
  --port 3333 \
  --cidr 0.0.0.0/0 \
  --region ap-south-1 \
  --description "WhatsApp Bridge"
```

If you see error: `InvalidPermission.Duplicate` - the rule already exists ✅

---

## 7. Test Bridge Connectivity

```bash
# Test with auth header
curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://3.109.154.61:3333/status | jq .

# Expected output:
# {
#   "status": "disconnected",
#   "hasQr": false,
#   "lastDisconnectReason": null,
#   "lastDisconnectAt": null,
#   "lastAuthFailure": null
# }
```

---

## 8. Complete Setup Script (All-in-One)

Run this to check everything and restart if needed:

```bash
#!/bin/bash

echo "🔍 Checking EC2 Bridge Setup..."

# Check instance status
echo "📊 Instance Status:"
aws ec2 describe-instance-status --instance-ids i-0d2fb8b38cb190ffe \
  --region ap-south-1 \
  --query 'InstanceStatuses[0].[InstanceState.Name,InstanceStatus.Status,SystemStatus.Status]' \
  --output text

# Check security group rule
echo ""
echo "🔐 Security Group Rules (Port 3333):"
aws ec2 describe-security-groups --group-ids sg-0ebce8ebe37dc8e71 \
  --region ap-south-1 \
  --query 'SecurityGroups[0].IpPermissions[?FromPort==`3333`]' \
  --output table

# Test bridge
echo ""
echo "🌐 Testing Bridge Connectivity..."
RESPONSE=$(curl -s -w "%{http_code}" -H "X-Bridge-Secret: swar-bridge-secret-2024" \
  http://3.109.154.61:3333/status)

if [[ $RESPONSE == *"200" ]]; then
    echo "✅ Bridge is responding!"
    echo "$RESPONSE"
else
    echo "❌ Bridge not responding. Rebooting instance..."
    aws ec2 reboot-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1
    echo "⏳ Waiting 120 seconds for reboot..."
    sleep 120
    echo "🔄 Testing again..."
    curl -s -H "X-Bridge-Secret: swar-bridge-secret-2024" \
      http://3.109.154.61:3333/status | jq .
fi

echo ""
echo "✨ Setup check complete!"
```

Save as `ec2-setup.sh` and run:
```bash
chmod +x ec2-setup.sh
./ec2-setup.sh
```

---

## 9. Quick Commands Reference

```bash
# Get instance IP
aws ec2 describe-instances --region ap-south-1 --instance-ids i-0d2fb8b38cb190ffe \
  --query 'Reservations[0].Instances[0].PublicIpAddress' --output text

# Reboot
aws ec2 reboot-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1

# Check health
aws ec2 describe-instance-status --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1 --output table

# Test bridge
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://3.109.154.61:3333/status

# View IP
echo "Bridge IP: 3.109.154.61:3333"
```

---

## 10. Bridge Status Codes

| Status | Meaning |
|--------|---------|
| `connected` | WhatsApp is authenticated & ready |
| `qr` | QR code ready for scanning |
| `disconnected` | Waiting for authentication |
| `error` | Bridge encountered an error |

---

## Troubleshooting

**Bridge not responding?**
```bash
aws ec2 reboot-instances --instance-ids i-0d2fb8b38cb190ffe --region ap-south-1
sleep 120
curl -H "X-Bridge-Secret: swar-bridge-secret-2024" http://3.109.154.61:3333/status
```

**Connection refused?**
- Check security group has port 3333 rule
- Check instance status is "running ok ok"

**Timeout?**
- Reboot the instance
- Wait 2-3 minutes for full startup

---

## AutoRestart Config (Already Set on EC2)

The bridge has PM2 auto-restart configured:
```bash
✓ Restarts on crash
✓ Starts on EC2 reboot
✓ Daily restart at midnight
✓ Max memory 500MB
```

---

## AWS Credentials

Verified and working! Your AWS credentials are configured.

Account: `846345203506`
Region: `ap-south-1` (Mumbai)

---

**Last Updated:** January 16, 2026
**Bridge Version:** 1.0.0
**Status:** ✅ Ready for Production
