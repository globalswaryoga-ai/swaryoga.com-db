#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
# AUTO DEPLOYMENT SYSTEM - Swar Yoga
# ════════════════════════════════════════════════════════════════════════════
# 
# This script monitors for changes and automatically deploys to production
# Usage: ./auto-deploy.sh
#
# Features:
# ✓ Watches for git changes
# ✓ Auto-commits changes
# ✓ Auto-pushes to GitHub
# ✓ Triggers Vercel deployment
# ✓ Logs all activity
# ✓ Error handling & notifications
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version"
LOG_DIR="$PROJECT_DIR/logs"
DEPLOY_LOG="$LOG_DIR/auto-deploy.log"
CHECK_INTERVAL=300  # Check every 5 minutes
MAX_RETRIES=3
RETRY_DELAY=10

# Create log directory if it doesn't exist
mkdir -p "$LOG_DIR"

# ════════════════════════════════════════════════════════════════════════════
# LOGGING FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

log_info() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}] ℹ️  ${msg}${NC}"
    echo "[${timestamp}] INFO: ${msg}" >> "$DEPLOY_LOG"
}

log_success() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[${timestamp}] ✅ ${msg}${NC}"
    echo "[${timestamp}] SUCCESS: ${msg}" >> "$DEPLOY_LOG"
}

log_warning() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[${timestamp}] ⚠️  ${msg}${NC}"
    echo "[${timestamp}] WARNING: ${msg}" >> "$DEPLOY_LOG"
}

log_error() {
    local msg="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[${timestamp}] ❌ ${msg}${NC}"
    echo "[${timestamp}] ERROR: ${msg}" >> "$DEPLOY_LOG"
}

# ════════════════════════════════════════════════════════════════════════════
# CHECK FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

check_backend_status() {
    log_info "Checking backend health..."
    
    if curl -s http://localhost:4000/health | grep -q "online"; then
        log_success "Backend is healthy"
        return 0
    else
        log_warning "Backend not responding"
        return 1
    fi
}

check_frontend_status() {
    log_info "Checking frontend health..."
    
    if curl -s http://localhost:5173 | grep -q "doctype"; then
        log_success "Frontend is running"
        return 0
    else
        log_warning "Frontend not responding"
        return 1
    fi
}

check_git_changes() {
    cd "$PROJECT_DIR"
    
    # Check for unstaged changes
    if git diff --quiet; then
        # Check for untracked files
        if [[ -z $(git ls-files --others --exclude-standard) ]]; then
            log_info "No changes detected"
            return 1
        fi
    fi
    
    log_info "Changes detected in working directory"
    return 0
}

check_uncommitted_changes() {
    cd "$PROJECT_DIR"
    
    if git diff --cached --quiet && git diff --quiet; then
        log_info "All changes committed"
        return 1
    fi
    
    log_info "Uncommitted changes found"
    return 0
}

# ════════════════════════════════════════════════════════════════════════════
# DEPLOYMENT FUNCTIONS
# ════════════════════════════════════════════════════════════════════════════

commit_changes() {
    cd "$PROJECT_DIR"
    
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local commit_msg="Auto-deploy: ${timestamp}"
    
    # Stage all changes
    git add -A
    log_info "Staged all changes"
    
    # Check if there's anything to commit
    if git diff --cached --quiet; then
        log_warning "No changes to commit"
        return 1
    fi
    
    # Commit changes
    if git commit -m "$commit_msg"; then
        log_success "Changes committed: $commit_msg"
        return 0
    else
        log_error "Failed to commit changes"
        return 1
    fi
}

push_to_github() {
    cd "$PROJECT_DIR"
    local branch=$(git rev-parse --abbrev-ref HEAD)
    
    log_info "Pushing to GitHub branch: $branch"
    
    local attempt=1
    while [ $attempt -le $MAX_RETRIES ]; do
        if git push origin "$branch" 2>&1; then
            log_success "Successfully pushed to GitHub"
            return 0
        else
            if [ $attempt -lt $MAX_RETRIES ]; then
                log_warning "Push attempt $attempt failed, retrying in ${RETRY_DELAY}s..."
                sleep $RETRY_DELAY
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    log_error "Failed to push to GitHub after $MAX_RETRIES attempts"
    return 1
}

verify_vercel_deployment() {
    log_info "Waiting for Vercel deployment..."
    
    # Vercel typically deploys within 1-3 minutes
    sleep 30
    
    local attempt=1
    while [ $attempt -le 12 ]; do
        if curl -s https://swaryoga.com/api/health | grep -q "online"; then
            log_success "Vercel deployment verified - API is responding"
            return 0
        else
            if [ $attempt -lt 12 ]; then
                log_info "Deployment in progress... (attempt $attempt/12)"
                sleep 10
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    log_warning "Could not verify Vercel deployment (API not responding)"
    return 1
}

# ════════════════════════════════════════════════════════════════════════════
# MAIN DEPLOYMENT PROCESS
# ════════════════════════════════════════════════════════════════════════════

deploy() {
    log_info "════════════════════════════════════════════════════════════"
    log_info "STARTING DEPLOYMENT PROCESS"
    log_info "════════════════════════════════════════════════════════════"
    
    # Check system health
    if ! check_backend_status; then
        log_error "Backend is not healthy, skipping deployment"
        return 1
    fi
    
    if ! check_frontend_status; then
        log_warning "Frontend not responding, continuing with deployment"
    fi
    
    # Check for changes
    if ! check_uncommitted_changes; then
        log_info "No uncommitted changes, skipping deployment"
        return 0
    fi
    
    # Commit changes
    if ! commit_changes; then
        log_error "Failed to commit changes"
        return 1
    fi
    
    # Push to GitHub
    if ! push_to_github; then
        log_error "Failed to push to GitHub"
        return 1
    fi
    
    # Verify deployment
    if verify_vercel_deployment; then
        log_success "════════════════════════════════════════════════════════════"
        log_success "DEPLOYMENT COMPLETED SUCCESSFULLY ✨"
        log_success "════════════════════════════════════════════════════════════"
        return 0
    else
        log_warning "Deployment completed but verification pending"
        return 0
    fi
}

# ════════════════════════════════════════════════════════════════════════════
# CONTINUOUS MONITORING LOOP
# ════════════════════════════════════════════════════════════════════════════

monitor() {
    log_info "════════════════════════════════════════════════════════════"
    log_info "AUTO-DEPLOY SYSTEM STARTING"
    log_info "════════════════════════════════════════════════════════════"
    log_info "Check interval: ${CHECK_INTERVAL}s"
    log_info "Project directory: $PROJECT_DIR"
    log_info "Log file: $DEPLOY_LOG"
    log_info ""
    log_info "💡 Tips:"
    log_info "   - Changes are detected every ${CHECK_INTERVAL} seconds"
    log_info "   - All changes are auto-committed and deployed"
    log_info "   - View logs: tail -f $DEPLOY_LOG"
    log_info "   - Stop deployment: Press Ctrl+C"
    log_info ""
    
    while true; do
        log_info "Checking for changes... ($(date '+%H:%M:%S'))"
        
        if check_git_changes; then
            log_info "Changes detected, starting deployment..."
            deploy
        fi
        
        log_info "Next check in ${CHECK_INTERVAL}s"
        sleep "$CHECK_INTERVAL"
    done
}

# ════════════════════════════════════════════════════════════════════════════
# COMMAND HANDLERS
# ════════════════════════════════════════════════════════════════════════════

case "${1:-monitor}" in
    monitor)
        monitor
        ;;
    deploy)
        deploy
        ;;
    check)
        log_info "Checking system status..."
        check_backend_status
        check_frontend_status
        ;;
    logs)
        tail -f "$DEPLOY_LOG"
        ;;
    clean-logs)
        rm -f "$DEPLOY_LOG"
        log_success "Deployment logs cleared"
        ;;
    *)
        echo "Usage: $0 {monitor|deploy|check|logs|clean-logs}"
        echo ""
        echo "Commands:"
        echo "  monitor        - Start continuous monitoring (default)"
        echo "  deploy         - Deploy immediately"
        echo "  check          - Check system health"
        echo "  logs           - View deployment logs"
        echo "  clean-logs     - Clear deployment logs"
        exit 1
        ;;
esac
