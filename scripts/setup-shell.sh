#!/bin/bash

#################################################################################
# macOS .zshrc Setup Helper for WhatsApp QR Integration
# 
# This script helps you add the WhatsApp aliases to your shell configuration
#################################################################################

PROJECT_ROOT="$HOME/swaryoga.com-db"
ALIASES_SCRIPT="$PROJECT_ROOT/scripts/qa-whatsapp-aliases.sh"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   WhatsApp QR Integration - Shell Setup                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Detect shell
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bash_profile"
    SHELL_NAME="bash"
else
    echo "Could not detect shell (zsh or bash). Manual setup required."
    echo ""
    echo "Add this line to your shell config:"
    echo "source $ALIASES_SCRIPT"
    exit 1
fi

echo "Detected shell: $SHELL_NAME ($SHELL_CONFIG)"
echo ""

# Check if already added
if grep -q "qa-whatsapp-aliases.sh" "$SHELL_CONFIG" 2>/dev/null; then
    echo "✓ WhatsApp aliases already configured in $SHELL_CONFIG"
    echo ""
    echo "Available commands:"
    source "$ALIASES_SCRIPT"
    qa-help
    exit 0
fi

# Ask to add
echo "This will add WhatsApp QR commands to your shell."
echo ""
read -p "Add to $SHELL_CONFIG? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "" >> "$SHELL_CONFIG"
    echo "# WhatsApp QR Integration Commands" >> "$SHELL_CONFIG"
    echo "source $ALIASES_SCRIPT" >> "$SHELL_CONFIG"
    
    echo ""
    echo "✓ Added to $SHELL_CONFIG"
    echo ""
    echo "To activate immediately, run:"
    echo "  source $SHELL_CONFIG"
    echo ""
    echo "Then use:"
    echo "  qa-help      # Show all commands"
    echo "  qa-diagnose  # Check system status"
    echo "  qa-setup     # Run setup wizard"
else
    echo "Skipped. You can manually add this line to $SHELL_CONFIG:"
    echo ""
    echo "  source $ALIASES_SCRIPT"
fi

echo ""
