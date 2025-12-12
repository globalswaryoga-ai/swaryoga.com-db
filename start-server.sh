#!/bin/bash

# Auto-start and monitor Swar Yoga web server
# This script will keep the server running and auto-restart if it crashes

SERVER_DIR="/Users/mohankalburgi/Downloads/swar-yoga-web-mohan"
LOG_DIR="${SERVER_DIR}/logs"
LOG_FILE="${LOG_DIR}/server.log"
PID_FILE="${LOG_DIR}/server.pid"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to start the server
start_server() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Swar Yoga Web Server..." | tee -a "$LOG_FILE"
    cd "$SERVER_DIR"
    
    # Kill any existing process on port 3000
    lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    sleep 2
    
    # Start the dev server in background
    npm run dev >> "$LOG_FILE" 2>&1 &
    local pid=$!
    echo $pid > "$PID_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Server started with PID: $pid" | tee -a "$LOG_FILE"
    
    return $pid
}

# Function to monitor the server
monitor_server() {
    local server_pid=$1
    
    while true; do
        # Check if process is still running
        if ! kill -0 $server_pid 2>/dev/null; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Server crashed! Restarting..." | tee -a "$LOG_FILE"
            start_server
            server_pid=$!
        fi
        
        # Check if port 3000 is responding (health check every 30 seconds)
        if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  Server not responding. Attempting restart..." | tee -a "$LOG_FILE"
            kill $server_pid 2>/dev/null || true
            sleep 2
            start_server
            server_pid=$!
        fi
        
        sleep 30
    done
}

# Trap signals for graceful shutdown
trap 'echo "Shutting down..."; kill $server_pid 2>/dev/null; exit 0' SIGTERM SIGINT

# Main execution
echo "═══════════════════════════════════════════════════════════════"
echo "         SWAR YOGA WEB SERVER - AUTO START MONITOR"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📍 Server Directory: $SERVER_DIR"
echo "📁 Logs Directory:   $LOG_DIR"
echo "📝 Log File:         $LOG_FILE"
echo ""
echo "Server will auto-restart if it crashes."
echo "Press Ctrl+C to stop the server."
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Start the server
start_server
server_pid=$!

# Wait for server to be ready
sleep 4

# Check if server started successfully
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Server is running on http://localhost:3000"
    echo ""
    echo "📍 Quick Links:"
    echo "   • Home:      http://localhost:3000"
    echo "   • Signup:    http://localhost:3000/signup"
    echo "   • Signin:    http://localhost:3000/signin"
    echo "   • Contact:   http://localhost:3000/contact"
    echo "   • Profile:   http://localhost:3000/profile"
    echo "   • Admin:     http://localhost:3000/admin/login"
    echo ""
    echo "📋 View logs: tail -f $LOG_FILE"
    echo ""
else
    echo "❌ Failed to start server. Check logs:"
    tail -20 "$LOG_FILE"
    exit 1
fi

# Start monitoring
monitor_server $server_pid
