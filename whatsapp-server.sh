#!/bin/bash

# WhatsApp Web QR Server Manager

case "$1" in
  "start")
    echo "🚀 Starting WhatsApp Web QR Server..."
    node services/whatsapp-web/qrServer.js &
    sleep 2
    echo "✅ Server started on port 3333"
    echo "   WebSocket: ws://localhost:3333"
    echo "   Test: curl http://localhost:3333/health"
    ;;
  
  "stop")
    echo "🛑 Stopping WhatsApp Web QR Server..."
    pkill -f "qrServer.js"
    echo "✅ Server stopped"
    ;;
  
  "restart")
    echo "🔄 Restarting WhatsApp Web QR Server..."
    pkill -f "qrServer.js"
    sleep 1
    node services/whatsapp-web/qrServer.js &
    sleep 2
    echo "✅ Server restarted"
    ;;
  
  "status")
    if pgrep -f "qrServer.js" > /dev/null; then
      echo "✅ WhatsApp Web QR Server is RUNNING (PID: $(pgrep -f 'qrServer.js'))"
      echo "   Port: 3333"
      echo "   WebSocket: ws://localhost:3333"
      
      # Test connection
      STATUS=$(curl -s http://localhost:3333/api/status)
      echo "   Status: $STATUS"
    else
      echo "❌ WhatsApp Web QR Server is NOT running"
      echo "   Start with: bash whatsapp-server.sh start"
    fi
    ;;
  
  "reset")
    echo "🔄 Resetting WhatsApp session..."
    rm -rf .wwebjs_auth/
    echo "✅ Session cleared"
    echo "   Server will regenerate QR on next connection"
    ;;
  
  "logs")
    echo "📊 Monitoring WhatsApp Server Output..."
    pkill -f "qrServer.js"
    sleep 1
    node services/whatsapp-web/qrServer.js
    ;;
  
  *)
    echo "WhatsApp Web QR Server Manager"
    echo "Usage: bash whatsapp-server.sh <command>"
    echo ""
    echo "Commands:"
    echo "  start      - Start WhatsApp Web server"
    echo "  stop       - Stop WhatsApp Web server"
    echo "  restart    - Restart WhatsApp Web server"
    echo "  status     - Check server status"
    echo "  reset      - Clear WhatsApp session (forces new QR)"
    echo "  logs       - View server logs (foreground)"
    echo ""
    echo "Examples:"
    echo "  bash whatsapp-server.sh start"
    echo "  bash whatsapp-server.sh status"
    echo "  bash whatsapp-server.sh reset"
    ;;
esac
