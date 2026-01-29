#!/bin/bash
# =============================================================================
# AUTO CLEANUP SCRIPT - Swaryoga Project
# Run manually: ./scripts/auto-cleanup.sh
# Schedule with cron: 0 2 * * * /path/to/auto-cleanup.sh >> ~/cleanup.log 2>&1
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "🧹 AUTO CLEANUP - $(date '+%Y-%m-%d %H:%M:%S')"
echo "=============================================="

# Get initial disk usage
INITIAL_USED=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
INITIAL_AVAIL=$(df -h / | awk 'NR==2 {print $4}')

echo ""
echo "📊 Initial Status: ${INITIAL_USED}% used, ${INITIAL_AVAIL} available"
echo ""

# Track space freed
SPACE_FREED=0

cleanup_with_size() {
    local name="$1"
    local path="$2"
    
    if [ -d "$path" ] || [ -f "$path" ]; then
        local size=$(du -sh "$path" 2>/dev/null | cut -f1)
        echo -e "${BLUE}→ Cleaning $name ($size)...${NC}"
        rm -rf "$path" 2>/dev/null || true
        echo -e "${GREEN}  ✓ Removed${NC}"
    fi
}

# =============================================================================
# 1. PROJECT-SPECIFIC CLEANUP (Safe)
# =============================================================================
echo -e "\n${YELLOW}━━━ Project Cleanup ━━━${NC}"

PROJECT_DIR="/Users/mohankalburgi/swaryoga.com-db/swaryoga.com-db"

# Clean Next.js cache (always safe to remove)
cleanup_with_size "Next.js cache" "$PROJECT_DIR/.next/cache"

# Clean test/debug files created during development
echo -e "${BLUE}→ Cleaning test scripts...${NC}"
find "$PROJECT_DIR" -maxdepth 1 -name "test-*.js" -mtime +1 -delete 2>/dev/null || true
find "$PROJECT_DIR" -maxdepth 1 -name "check-*.js" -mtime +1 -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ Old test scripts removed${NC}"

# Clean TypeScript build info
rm -f "$PROJECT_DIR"/*.tsbuildinfo 2>/dev/null || true

# =============================================================================
# 2. NPM/NODE CLEANUP
# =============================================================================
echo -e "\n${YELLOW}━━━ NPM/Node Cleanup ━━━${NC}"

# NPM cache (safe - npm will re-download as needed)
if [ -d ~/.npm/_cacache ]; then
    cleanup_with_size "NPM cache" ~/.npm/_cacache
fi

# npm logs
rm -rf ~/.npm/_logs 2>/dev/null && echo -e "${GREEN}  ✓ NPM logs cleaned${NC}"

# =============================================================================
# 3. SYSTEM CACHES (Safe to clean)
# =============================================================================
echo -e "\n${YELLOW}━━━ System Caches ━━━${NC}"

# Homebrew cache (can get very large)
if [ -d ~/Library/Caches/Homebrew ]; then
    cleanup_with_size "Homebrew cache" ~/Library/Caches/Homebrew
fi

# TypeScript cache
cleanup_with_size "TypeScript cache" ~/Library/Caches/typescript

# Next.js SWC cache
cleanup_with_size "Next.js SWC cache" ~/Library/Caches/next-swc

# pip cache (Python)
cleanup_with_size "Pip cache" ~/Library/Caches/pip

# =============================================================================
# 4. CHROME CLEANUP (User should approve)
# =============================================================================
echo -e "\n${YELLOW}━━━ Chrome Cleanup ━━━${NC}"

CHROME_CACHE=~/Library/Caches/Google/Chrome
CHROME_SIZE=$(du -sh "$CHROME_CACHE" 2>/dev/null | cut -f1 || echo "0")

if [ -d "$CHROME_CACHE" ]; then
    echo -e "${BLUE}→ Chrome cache: $CHROME_SIZE${NC}"
    # Only clean Chrome cache subfolder (not cookies/history)
    rm -rf ~/Library/Caches/Google/Chrome/Default/Cache 2>/dev/null || true
    rm -rf ~/Library/Caches/Google/Chrome/Default/Code\ Cache 2>/dev/null || true
    rm -rf ~/Library/Caches/Google/Chrome/Default/GPUCache 2>/dev/null || true
    echo -e "${GREEN}  ✓ Chrome caches cleaned (browsing data preserved)${NC}"
fi

# Google caches
cleanup_with_size "Google general cache" ~/Library/Caches/Google

# =============================================================================
# 5. VS CODE CLEANUP (Safe)
# =============================================================================
echo -e "\n${YELLOW}━━━ VS Code Cleanup ━━━${NC}"

# VS Code caches (will regenerate)
cleanup_with_size "VS Code cached data" ~/Library/Application\ Support/Code/CachedData
cleanup_with_size "VS Code cache" ~/Library/Application\ Support/Code/Cache

# Old workspace storage (older than 7 days)
if [ -d ~/Library/Application\ Support/Code/User/workspaceStorage ]; then
    echo -e "${BLUE}→ Cleaning old workspace storage...${NC}"
    find ~/Library/Application\ Support/Code/User/workspaceStorage -type d -mtime +7 -delete 2>/dev/null || true
    echo -e "${GREEN}  ✓ Old workspace storage cleaned${NC}"
fi

# =============================================================================
# 6. LOG FILES
# =============================================================================
echo -e "\n${YELLOW}━━━ Log Files ━━━${NC}"

# System logs older than 3 days
echo -e "${BLUE}→ Cleaning old logs...${NC}"
find ~/Library/Logs -name "*.log" -mtime +3 -delete 2>/dev/null || true
echo -e "${GREEN}  ✓ Old logs removed${NC}"

# =============================================================================
# 7. TRASH
# =============================================================================
echo -e "\n${YELLOW}━━━ Trash ━━━${NC}"

TRASH_SIZE=$(du -sh ~/.Trash 2>/dev/null | cut -f1 || echo "0B")
if [ "$TRASH_SIZE" != "0B" ]; then
    echo -e "${BLUE}→ Emptying Trash ($TRASH_SIZE)...${NC}"
    rm -rf ~/.Trash/* 2>/dev/null || true
    echo -e "${GREEN}  ✓ Trash emptied${NC}"
else
    echo -e "${GREEN}  ✓ Trash already empty${NC}"
fi

# =============================================================================
# SUMMARY
# =============================================================================
echo ""
echo "=============================================="
FINAL_USED=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
FINAL_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
FREED=$((INITIAL_USED - FINAL_USED))

echo "📊 Final Status: ${FINAL_USED}% used, ${FINAL_AVAIL} available"

if [ $FREED -gt 0 ]; then
    echo -e "${GREEN}✅ Freed approximately ${FREED}% disk space${NC}"
else
    echo -e "${YELLOW}ℹ️  Disk usage unchanged (already clean)${NC}"
fi

echo "=============================================="
echo ""

# Warn if still high
if [ $FINAL_USED -gt 80 ]; then
    echo -e "${RED}⚠️  WARNING: Disk still above 80%!${NC}"
    echo "Consider:"
    echo "  - Clearing Chrome browsing data manually"
    echo "  - Removing unused applications"
    echo "  - Moving large files to external storage"
fi

exit 0
