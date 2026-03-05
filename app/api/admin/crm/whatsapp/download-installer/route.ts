import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint to download the installer script
 * The script automatically installs dependencies and runs the extension
 * GET /api/admin/crm/whatsapp/download-installer
 */
export async function GET(request: NextRequest) {
  try {
    // Auto-installer script for macOS/Linux (using raw string to avoid template literal issues)
    const installerScript = '#!/bin/bash\n' +
      'set -e\n' +
      '\n' +
      '# Colors for output\n' +
      'RED=\'\\033[0;31m\'\n' +
      'GREEN=\'\\033[0;32m\'\n' +
      'YELLOW=\'\\033[1;33m\'\n' +
      'NC=\'\\033[0m\' # No Color\n' +
      '\n' +
      'echo -e "${GREEN}🚀 QR WhatsApp PC Extension - Auto Installer${NC}"\n' +
      'echo -e "${GREEN}==============================================${NC}\\n"\n' +
      '\n' +
      '# Get the directory where this script is located\n' +
      'SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"\n' +
      'cd "$SCRIPT_DIR"\n' +
      '\n' +
      'echo -e "${YELLOW}Step 1: Checking Node.js installation...${NC}"\n' +
      'if ! command -v node &> /dev/null; then\n' +
      '    echo -e "${RED}❌ Node.js is not installed${NC}"\n' +
      '    echo -e "${YELLOW}Please install Node.js from https://nodejs.org (LTS recommended)${NC}"\n' +
      '    echo -e "${YELLOW}Then come back and run this installer again.${NC}"\n' +
      '    exit 1\n' +
      'fi\n' +
      '\n' +
      'NODE_VERSION=$(node --version)\n' +
      'echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}\\n"\n' +
      '\n' +
      'echo -e "${YELLOW}Step 2: Installing dependencies...${NC}"\n' +
      'if ! command -v npm &> /dev/null; then\n' +
      '    echo -e "${RED}❌ npm is not available${NC}"\n' +
      '    exit 1\n' +
      'fi\n' +
      '\n' +
      'npm install dotenv > /dev/null 2>&1 || {\n' +
      '    echo -e "${YELLOW}Creating minimal node_modules...${NC}"\n' +
      '    mkdir -p node_modules/dotenv\n' +
      '    mkdir -p node_modules/dotenv/lib\n' +
      '    \n' +
      '    # Minimal dotenv stub if npm install fails\n' +
      '    cat > node_modules/dotenv/package.json << \'EOF\'\n' +
      '{"name":"dotenv","version":"16.0.3","main":"lib/main.js"}\n' +
      'EOF\n' +
      '    cat > node_modules/dotenv/lib/main.js << \'EOF\'\n' +
      'module.exports = { config: () => ({}) };\n' +
      'EOF\n' +
      '}\n' +
      '\n' +
      'echo -e "${GREEN}✅ Dependencies installed${NC}\\n"\n' +
      '\n' +
      'echo -e "${GREEN}📱 Starting WhatsApp Extension...${NC}"\n' +
      'echo -e "${GREEN}==============================================${NC}\\n"\n' +
      '\n' +
      '# Run the extension\n' +
      'node qr-whatsapp-pc-extension.js\n';

    // Return as downloadable shell script
    return new NextResponse(installerScript, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-sh',
        'Content-Disposition': 'attachment; filename="install.sh"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[Download Installer] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to generate installer script' },
      { status: 500 }
    );
  }
}
