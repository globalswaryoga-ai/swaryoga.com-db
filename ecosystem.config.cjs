module.exports = {
  apps: [
    // Backend Server (Express API)
    {
      name: 'swar-backend',
      script: 'server/server.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version',
      
      // ✅ AUTO-RESTART CONFIGURATION - ENABLED
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
  // Optional periodic restart for memory cleanup (disabled by default)
  // cron_restart: '*/30 * * * *',
      
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      
      // Error handling
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Instance management
      instances: 1,
      exec_mode: 'fork',
      
      // Restart policies - Enhanced for production
      max_restarts: 15,
      min_uptime: '10s',
  max_memory_restart: '500M',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
      
      // Restart on error
      error_handler: true
    },
  ],
  
  // Cluster configuration
  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'https://github.com/Turya-Kalburgi/swar-yoga-latest.git',
      path: '/home/ubuntu/swar-yoga',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.cjs --env production'
    }
  }
};
