module.exports = {
  apps: [
    // Next.js Frontend (Production Build)
    {
      name: 'swar-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-web-mohan',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
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
    },
    
    // Backend API (MongoDB + PayU)
    {
      name: 'swar-backend',
      script: 'npm',
      args: 'run api',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-web-mohan',
      
      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
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
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
