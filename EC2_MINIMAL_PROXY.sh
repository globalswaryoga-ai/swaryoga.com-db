#!/bin/bash

# Minimal Node.js HTTP Proxy for WhatsApp Bridge
# This is a lightweight alternative to Nginx when disk space is limited

# On EC2, stop the bridge (Ctrl+C)
# Then create this minimal proxy file in /home/ubuntu/wa-bridge/

cat > /home/ubuntu/wa-bridge/proxy.js << 'EOPROXY'
// Minimal HTTP proxy - no dependencies needed
const http = require('http');
const net = require('net');

const BRIDGE_PORT = 3333;
const PROXY_PORT = 8080;
const BRIDGE_HOST = 'localhost';

const server = http.createServer((req, res) => {
  const options = {
    hostname: BRIDGE_HOST,
    port: BRIDGE_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Error:', err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bridge unavailable' }));
  });

  req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`HTTP Proxy listening on port ${PROXY_PORT}`);
  console.log(`Forwarding to bridge on ${BRIDGE_HOST}:${BRIDGE_PORT}`);
});
EOPROXY

echo "✓ Created minimal proxy.js"
echo ""
echo "Usage:"
echo "  Terminal 1: cd /home/ubuntu/wa-bridge && node server.js"
echo "  Terminal 2: cd /home/ubuntu/wa-bridge && node proxy.js"
echo ""
echo "Then test locally on EC2:"
echo "  curl -H 'x-bridge-secret: swar-bridge-secret-2024' http://localhost:8080/status"
echo ""
echo "From Mac:"
echo "  curl -H 'x-bridge-secret: swar-bridge-secret-2024' http://3.80.11.153:8080/status"
