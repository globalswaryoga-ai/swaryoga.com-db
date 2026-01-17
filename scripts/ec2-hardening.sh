#!/bin/bash

###############################################
# EC2 Security Hardening Script
# Hardens Ubuntu 22.04 instance for production
# Run as: sudo bash ec2-hardening.sh
###############################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 EC2 Security Hardening Started${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
  exit 1
fi

# 1. System Updates
echo -e "${YELLOW}[1/8] Installing security updates...${NC}"
apt-get update
apt-get upgrade -y
apt-get install -y unattended-upgrades apt-listchanges

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades

echo -e "${GREEN}✅ Security updates configured${NC}"

# 2. Install Firewall (UFW)
echo -e "${YELLOW}[2/8] Setting up UFW firewall...${NC}"
apt-get install -y ufw

# Default policies
ufw default deny incoming
ufw default allow outgoing
ufw default deny routed

# Allow SSH (prevent lockout)
ufw allow 22/tcp

# Allow HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# ---------------------------------------------------------
# SENSITIVE PORTS - Restricted Access
# ---------------------------------------------------------
echo -e "${YELLOW}Whitelisting your Home IP for SSH/Bridge...${NC}"
echo -e "Please enter your PUBLIC IP address (visit: curl ifconfig.me)"
read -p "Your IP (leave empty to allow port 22 globally): " USER_IP

if [ ! -z "$USER_IP" ]; then
  # Allow SSH from this IP only
  ufw delete allow 22/tcp
  ufw allow from $USER_IP to any port 22 proto tcp
  
  # Allow Bridge (3333) from this IP only
  ufw allow from $USER_IP to any port 3333 proto tcp
  echo -e "${GREEN}✓ Whitelisted $USER_IP for SSH and Bridge${NC}"
else
  # Fallback to global access if no IP provided
  ufw allow 22/tcp
  ufw allow 3333/tcp
  echo -e "${YELLOW}⚠ Ports 22 and 3333 allowed from ANYWHERE (less secure)${NC}"
fi

# Enable firewall
ufw --force enable

echo -e "${GREEN}✅ UFW firewall configured${NC}"

# 3. SSH Hardening
echo -e "${YELLOW}[3/8] Hardening SSH configuration...${NC}"

# Backup original config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup.$(date +%s)

# Apply security settings
cat >> /etc/ssh/sshd_config <<EOF

# Security Hardening
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
X11Forwarding no
PrintMotd yes
PrintLastLog yes
TCPKeepAlive yes
Compression delayed
MaxAuthTries 3
MaxSessions 5
MaxStartups 10:30:60
ClientAliveInterval 300
ClientAliveCountMax 2
Protocol 2
LogLevel VERBOSE
SyslogFacility AUTH
UsePAM yes
EOF

# Validate and restart SSH
echo -e "${YELLOW}Testing and restarting SSH service...${NC}"
sshd -t

# Try both service names and ignore errors to prevent script crash
systemctl restart ssh 2>/dev/null || systemctl restart sshd 2>/dev/null || service ssh restart 2>/dev/null || service sshd restart 2>/dev/null || echo -e "${RED}⚠ Could not restart SSH automatically. Please restart manually.${NC}"

echo -e "${GREEN}✅ SSH hardened${NC}"

# 4. Install Fail2Ban
echo -e "${YELLOW}[4/8] Installing fail2ban (intrusion detection)...${NC}"
apt-get install -y fail2ban

# Create local jail configuration
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@swaryoga.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = false

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[recidive]
enabled = true
action = %(action_mwl)s
logpath = /var/log/fail2ban.log
bantime = 604800
findtime = 86400
maxretry = 5
EOF

systemctl enable fail2ban
systemctl start fail2ban

echo -e "${GREEN}✅ Fail2ban configured${NC}"

# 5. Configure Auditd (audit logging)
echo -e "${YELLOW}[5/8] Setting up audit logging...${NC}"
apt-get install -y auditd audispd-plugins

# Add audit rules
cat >> /etc/audit/rules.d/audit.rules <<EOF
# Monitor root user commands
-a always,exit -F perm=x -F auid>=1000 -F auid!=4294967295 -k exec

# Monitor user modifications
-w /etc/passwd -p wa -k identity
-w /etc/group -p wa -k identity
-w /etc/sudoers -p wa -k actions

# Monitor system calls
-a always,exit -F arch=b64 -S adjtimex -S settimeofday -k time-change
-a always,exit -F arch=b32 -S adjtimex -S settimeofday -k time-change
EOF

systemctl enable auditd
systemctl start auditd

echo -e "${GREEN}✅ Audit logging configured${NC}"

# 6. Disable unnecessary services
echo -e "${YELLOW}[6/8] Disabling unnecessary services...${NC}"

# Services to disable (if they exist)
for service in bluetooth cups avahi-daemon isc-dhcp-server6 snmp; do
  if systemctl is-active --quiet $service 2>/dev/null; then
    systemctl stop $service
    systemctl disable $service
  fi
done

echo -e "${GREEN}✅ Unnecessary services disabled${NC}"

# 7. File system hardening
echo -e "${YELLOW}[7/8] Hardening file system...${NC}"

# Mount /tmp with noexec, nodev, nosuid (try remount first, then fresh mount as tmpfs)
mount -o remount,noexec,nodev,nosuid /tmp 2>/dev/null || mount -t tmpfs -o rw,nosuid,nodev,noexec,relatime,size=1G tmpfs /tmp || echo -e "${YELLOW}⚠ Could not harden /tmp immediately. It will be hardened on next reboot via fstab.${NC}"

# Make permanent in /etc/fstab
if ! grep -q "tmpfs /tmp" /etc/fstab; then
  echo "tmpfs /tmp tmpfs defaults,rw,nosuid,nodev,noexec,relatime,size=1G 0 0" >> /etc/fstab
fi

# Set proper permissions
chmod 644 /etc/passwd
chmod 644 /etc/group
chmod 000 /etc/shadow
chmod 000 /etc/gshadow

# Disable core dumps
echo "* hard core 0" >> /etc/security/limits.conf
echo "* soft core 0" >> /etc/security/limits.conf

echo -e "${GREEN}✅ File system hardened${NC}"

# 8. Kernel hardening
echo -e "${YELLOW}[8/8] Applying kernel hardening...${NC}"

# Create sysctl configuration
cat > /etc/sysctl.d/99-hardening.conf <<EOF
# IP forwarding (disable)
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0

# Disable ICMP Ping
net.ipv4.icmp_echo_ignore_all = 1

# Enable SYN cookies
net.ipv4.tcp_syncookies = 1

# Disable source packet routing
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Disable ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Enable bad error message protection
net.ipv4.icmp_ignore_bogus_error_responses = 1

# Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP ping requests
net.ipv4.icmp_echo_ignore_all = 0

# Disable source packet routing
net.ipv4.conf.all.send_redirects = 0

# Increase connection backlog
net.core.somaxconn = 1024
net.ipv4.tcp_max_syn_backlog = 1024

# Disable Magic SysRq
kernel.sysrq = 0
EOF

sysctl -p /etc/sysctl.d/99-hardening.conf

echo -e "${GREEN}✅ Kernel hardened${NC}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ EC2 SECURITY HARDENING COMPLETE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Verify UFW rules: ${GREEN}sudo ufw status${NC}"
echo "2. Check SSH: ${GREEN}ssh ubuntu@<IP>${NC}"
echo "3. Monitor fail2ban: ${GREEN}sudo fail2ban-client status${NC}"
echo "4. View audit logs: ${GREEN}sudo ausearch -k exec${NC}"
echo ""
echo -e "${YELLOW}🔐 Security Features Enabled:${NC}"
echo "  ✅ Automatic security updates"
echo "  ✅ UFW firewall (22, 80, 443, 3333 allowed)"
echo "  ✅ SSH key-only authentication"
echo "  ✅ Fail2ban intrusion detection"
echo "  ✅ Audit logging"
echo "  ✅ Kernel hardening"
echo "  ✅ File system protection"
echo ""
