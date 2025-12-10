module.exports = {
  apps: [
    {
      name: 'swar-yoga-web',
      script: 'npm',
      args: 'start',
      cwd: '/Users/mohankalburgi/Downloads/swar-yoga-web-mohan',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      log_file: 'logs/combined.log',
      time: true,
      autorestart: true,
      max_restarts: 999,
      min_uptime: '10s',
      restart_delay: 4000,
      listen_timeout: 3000,
      kill_timeout: 5000,
      wait_ready: true,
      // Auto-restart every 5 minutes (300000 ms)
      cron_restart: '*/5 * * * *',
      // Additional monitoring
      monitor_delay: 5000,
      kill_timeout: 5000,
      shutdown_with_message: true
    }
  ],
  // Global PM2 settings
  env: {
    NODE_ENV: 'production',
    PORT: 3000
  },
  // Enable PM2 to auto-start on system reboot
  exec_mode: 'cluster',
  instances: 1,
  merge_logs: true,
  max_memory_restart: '1G'
};
