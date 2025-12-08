module.exports = {
  apps: [
    // Backend Server (Express API)
    {
      name: 'swar-backend',
      script: 'server/server.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      
      // Periodic restart (every 10 minutes) - helps with memory leaks
      // Uncomment to enable: every one hour, every 10 minutes, or custom cron
      // cron_restart: '0 */1 * * *',  // Every hour
      
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      
      // Error handling
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Instance management
      instances: 1,
      exec_mode: 'fork',
      
      // Restart policies
      max_restarts: 10,
      min_uptime: '10s',
      
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000
    },
    
    // Frontend Server (Vite Dev Server)
    {
      name: 'swar-frontend',
      script: './node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 5173',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-latest-latest-prod-version',
      
      // Auto-restart configuration
      autorestart: true,
      watch: ['vite.config.ts', 'package.json'],
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development'
      },
      
      // Error handling
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Instance management
      instances: 1,
      exec_mode: 'fork',
      
      // Restart policies
      max_restarts: 10,
      min_uptime: '10s'
    }
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
