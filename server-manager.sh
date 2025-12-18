#!/bin/bash

# Swar Yoga Web Server Manager
# Usage: ./server-manager.sh [start|stop|restart|status|logs]

ACTION="${1:-status}"
PLIST="/Users/mohankalburgi/Library/LaunchAgents/com.swarYoga.webserver.plist"
LOG_FILE="/Users/mohankalburgi/Downloads/swar-yoga-web-mohan/logs/server.log"

case "$ACTION" in
    start)
        echo "🚀 Starting Swar Yoga Web Server..."
        launchctl load "$PLIST" 2>/dev/null
        sleep 3
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Server started successfully on http://localhost:3000"
        else
            echo "❌ Server failed to start. Check logs."
        fi
        ;;
    
    stop)
        echo "🛑 Stopping Swar Yoga Web Server..."
        launchctl unload "$PLIST"
        echo "✅ Server stopped"
        ;;
    
    restart)
        echo "🔄 Restarting Swar Yoga Web Server..."
        launchctl unload "$PLIST"
        sleep 2
        launchctl load "$PLIST"
        sleep 3
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Server restarted successfully"
        else
            echo "❌ Server failed to restart"
        fi
        ;;
    
    status)
        echo "═══════════════════════════════════════════════════════════════"
        echo "         SWAR YOGA WEB SERVER STATUS"
        echo "═══════════════════════════════════════════════════════════════"
        echo ""
        
        # Check if service is loaded
        if launchctl list | grep -q "com.swarYoga.webserver"; then
            echo "✅ Service Status: LOADED (auto-start enabled)"
        else
            echo "❌ Service Status: NOT LOADED"
        fi
        
        # Check if server is responding
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ Server Status: RUNNING"
            echo "🌐 URL: http://localhost:3000"
        else
            echo "❌ Server Status: NOT RESPONDING"
        fi
        
        echo ""
        echo "Quick Links:"
        echo "  • Home:      http://localhost:3000"
        echo "  • Signup:    http://localhost:3000/signup"
        echo "  • Signin:    http://localhost:3000/signin"
        echo "  • Contact:   http://localhost:3000/contact"
        echo "  • Admin:     http://localhost:3000/admin/login"
        
        echo ""
        echo "═══════════════════════════════════════════════════════════════"
        ;;
    
    logs)
        echo "📋 Server Logs (last 50 lines):"
        echo "═══════════════════════════════════════════════════════════════"
        tail -50 "$LOG_FILE"
        ;;
    
    logs-live)
        echo "📋 Live Server Logs (Ctrl+C to exit):"
        echo "═══════════════════════════════════════════════════════════════"
        tail -f "$LOG_FILE"
        ;;
    
    *)
        echo "Swar Yoga Web Server Manager"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start       - Start the server"
        echo "  stop        - Stop the server"
        echo "  restart     - Restart the server"
        echo "  status      - Check server status (default)"
        echo "  logs        - Show last 50 lines of logs"
        echo "  logs-live   - Show live logs (Ctrl+C to exit)"
        echo ""
        echo "Example:"
        echo "  $0 status"
        echo "  $0 restart"
        echo "  $0 logs-live"
        ;;
esac
