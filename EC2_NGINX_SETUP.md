# EC2 Nginx Setup for WhatsApp Bridge

## Status
- ✅ Bridge running on EC2 port 3333
- ❌ Nginx NOT configured (that's why domain isn't working)

## What's needed

The bridge is running locally on `localhost:3333`, but the domain `wa-bridge.swaryoga.com` needs to be routed through Nginx to reach it.

## Setup Steps on EC2

### 1. Install Nginx
```bash
sudo apt-get update
sudo apt-get install -y nginx
```

### 2. Create Nginx config file
```bash
sudo tee /etc/nginx/sites-available/wa-bridge.swaryoga.com > /dev/null << 'EOF'
server {
  listen 80;
  server_name wa-bridge.swaryoga.com;

  location / {
    return 301 https://$host$request_uri;
  }
}

server {
  listen 443 ssl http2;
  server_name wa-bridge.swaryoga.com;

  ssl_certificate     /etc/letsencrypt/live/wa-bridge.swaryoga.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/wa-bridge.swaryoga.com/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_session_timeout 1d;

  location / {
    proxy_pass http://127.0.0.1:3333;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
  }
}
EOF
```

### 3. Enable the site
```bash
sudo ln -sf /etc/nginx/sites-available/wa-bridge.swaryoga.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 4. Test Nginx config
```bash
sudo nginx -t
```

Should output: `nginx: the configuration file ... is ok`

### 5. Start/restart Nginx
```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 6. Check SSL certificates
```bash
ls -la /etc/letsencrypt/live/wa-bridge.swaryoga.com/
```

If certificates don't exist, you need to generate them with Certbot:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot certonly --standalone -d wa-bridge.swaryoga.com
```

---

## Verify it works

From Mac:
```bash
curl -H "x-bridge-secret: swar-bridge-secret-2024" https://wa-bridge.swaryoga.com/status
```

Should return JSON with QR code status.

---

## If SSL certificates are missing

The domain won't work without SSL certificates. You need to:

1. Stop bridge temporarily: `Ctrl+C` on EC2 bridge terminal
2. Run Certbot to get certificates:
```bash
sudo certbot certonly --standalone -d wa-bridge.swaryoga.com
```
3. Set up Nginx with the new certificates
4. Restart bridge: `node server.js`

---

## Keep both services running

The bridge needs to stay running. On EC2:

**Terminal 1** (Bridge):
```bash
cd /home/ubuntu/wa-bridge
node server.js
```

**Terminal 2** (Nginx):
```bash
sudo systemctl status nginx
# If not running:
sudo systemctl start nginx
```

Both need to run together for the domain to work.
