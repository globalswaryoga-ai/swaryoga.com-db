# EC2 Final Aggressive Cleanup

Run these on EC2 terminal:

## Check current disk space
df -h /

## Nuclear cleanup
sudo rm -rf /var/lib/apt/lists/*
sudo rm -rf /var/cache/apt/*
sudo find /var/log -type f -delete 2>/dev/null
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*
sudo rm -rf ~/.npm/_logs
sudo docker system prune -af 2>/dev/null || true

## Check freed space
df -h /

## If still full, remove unnecessary packages
sudo apt-get autoremove -y 2>/dev/null || true
sudo apt-get autoclean 2>/dev/null || true

## Final check
df -h /
