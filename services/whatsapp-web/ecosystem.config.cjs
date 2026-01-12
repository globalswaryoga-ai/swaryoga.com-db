/**
 * PM2 ecosystem config for the WhatsApp Web bridge.
 * Single-app config (no watchdog) so you can manage the bridge via PM2 on macOS or Linux.
 * - Place this file in services/whatsapp-web and run `pm2 start ecosystem.config.cjs`.
 * - Use PM2_WA_BRIDGE_CWD to override the cwd if needed.
 */

module.exports = {
  apps: [
    {
      name: 'swaryoga-whatsapp-bridge',
      script: 'index.js',
      // Use an explicit cwd when provided, otherwise default to this file's directory
      cwd: process.env.PM2_WA_BRIDGE_CWD || __dirname,
      // Use provided PM2_NODE or fall back to the current node executable (portable across mac/linux)
      interpreter: process.env.PM2_NODE || process.execPath,
      // WhatsApp Web + Chromium can spike memory; keep a reasonable cap.
      node_args: '--max-old-space-size=768',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_restarts: 20,
      restart_delay: 3000,
      exp_backoff_restart_delay: 500,
      max_memory_restart: '300M',
      // Delay restarts slightly to avoid tight restart loops when Chromium is failing
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        WHATSAPP_WEB_PORT: process.env.WHATSAPP_WEB_PORT || '3333',
        WHATSAPP_CLIENT_ID: process.env.WHATSAPP_CLIENT_ID || 'crm-whatsapp-session',
        WHATSAPP_WEB_BRIDGE_SECRET: process.env.WHATSAPP_WEB_BRIDGE_SECRET || 'swar-bridge-secret-2024',
        WHATSAPP_WEB_ALLOWED_ORIGINS: process.env.WHATSAPP_WEB_ALLOWED_ORIGINS || '*',
        NEXT_BASE_URL: process.env.NEXT_BASE_URL || '',
      }
    }
  ]
}
