module.exports = {
  apps: [
    {
      name: 'wa-bridge',
      script: 'server.js',
      cwd: __dirname,
      // Increase memory limit to 1GB to prevent the 2-minute crash cycle
      max_memory_restart: '1G',
      restart_delay: 10000, 
      env: {
        NODE_ENV: 'production',
        PORT: 3333,
        WHATSAPP_WEB_BRIDGE_SECRET: 'swar-bridge-secret-2024',
        SESSION_DIR: './.wwebjs_auth'
      }
    }
  ]
};
