module.exports = {
  apps: [
    {
      name: 'wa-bridge',
      script: './index.js',
      cwd: __dirname,
      
      // Auto-restart on crash
      autorestart: true,
      max_memory_restart: '500M',
      restart_delay: 3000, // 3 second delay between restarts
      max_restarts: 10,     // max 10 restarts within 1 minute before giving up
      min_uptime: '10s',    // consider app "started" after 10 seconds
      
      // Error/output logging
      error_file: './bridge-error.log',
      out_file: './bridge-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Environment
      env: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'info'
      },
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Watch mode (disabled - don't auto-restart on file changes)
      watch: false,
      
      // Instance count
      instances: 1,
      exec_mode: 'fork'
    }
  ]
};
