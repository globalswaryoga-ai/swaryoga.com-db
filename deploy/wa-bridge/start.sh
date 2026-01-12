#!/bin/bash
export WHATSAPP_BRIDGE_SECRET=${WHATSAPP_BRIDGE_SECRET:-swar-bridge-secret-2024}
export PORT=${PORT:-3333}
node server.js
