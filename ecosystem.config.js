module.exports = {
  apps: [
    {
      name: 'swaryoga',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/swaryoga',
      autorestart: true,
      watch: false,
      max_memory_restart: '3G',
      node_args: '--max-old-space-size=4096',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        USE_BUNNY_DATABASE_ONLY: 'true',
        DISABLE_MONGODB: 'true'
      },
      error_file: '/root/.pm2/logs/swaryoga-error.log',
      out_file: '/root/.pm2/logs/swaryoga-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      instances: 1,
      exec_mode: 'fork',
      max_restarts: 20,
      min_uptime: '10s',
      restart_delay: 2000
    }
  ]
};
