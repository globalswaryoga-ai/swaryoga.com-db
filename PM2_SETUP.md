# PM2 Process Management Setup

## Overview

PM2 is a production-grade process manager for Node.js applications. It provides:
- ✅ Auto-restart on crash
- ✅ Cluster mode for load balancing
- ✅ Memory monitoring and limits
- ✅ Log management
- ✅ Startup scripts for system reboot

## Installation

PM2 has been installed globally:

```bash
npm install -g pm2
```

## Configuration

The `ecosystem.config.js` file contains the PM2 configuration with:

### Auto-Restart Features
- **autorestart**: true - Automatically restarts app if it crashes
- **max_restarts**: 10 - Maximum restart attempts (prevents infinite loops)
- **min_uptime**: 10s - Minimum uptime before counting as a crash
- **restart_delay**: 4000ms - Delay between restart attempts
- **max_memory_restart**: 1G - Auto-restart if memory exceeds 1GB

### Logging
- **error_file**: logs/err.log - Error output
- **out_file**: logs/out.log - Standard output
- **log_file**: logs/combined.log - Combined logs
- **time**: true - Add timestamp to logs

### Server Settings
- **instances**: 1 - Number of instances
- **exec_mode**: cluster - Cluster mode for production
- **NODE_ENV**: production - Production environment
- **listen_timeout**: 3000ms - Timeout for listening
- **kill_timeout**: 5000ms - Timeout for graceful shutdown

## Usage

### Start the Application with PM2

Build the application first:
```bash
npm run build
```

Then start with PM2:
```bash
npm run pm2:start
```

Or directly:
```bash
pm2 start ecosystem.config.js
```

### Stop the Application

```bash
npm run pm2:stop
```

Or:
```bash
pm2 stop swar-yoga-web
```

### Restart the Application

```bash
npm run pm2:restart
```

Or:
```bash
pm2 restart swar-yoga-web
```

### View Application Status

```bash
npm run pm2:status
```

Or:
```bash
pm2 status
```

### View Application Logs

```bash
npm run pm2:logs
```

Or:
```bash
pm2 logs swar-yoga-web
```

### Real-time Monitoring

```bash
npm run pm2:monit
```

Or:
```bash
pm2 monit
```

### Delete Application from PM2

```bash
npm run pm2:delete
```

Or:
```bash
pm2 delete swar-yoga-web
```

## PM2 Commands Reference

| Command | Description |
|---------|-------------|
| `pm2 start app.js` | Start an app |
| `pm2 stop app` | Stop an app |
| `pm2 restart app` | Restart an app |
| `pm2 delete app` | Delete an app from PM2 |
| `pm2 status` | Show all running apps |
| `pm2 logs` | Show all logs |
| `pm2 logs app-name` | Show logs for specific app |
| `pm2 monit` | Real-time monitoring |
| `pm2 save` | Save current state |
| `pm2 resurrect` | Restore saved state |
| `pm2 startup` | Generate startup script |
| `pm2 unstartup` | Remove startup script |

## Startup on System Reboot

To automatically start the application when the system reboots:

### Step 1: Generate Startup Script

```bash
pm2 startup
```

This will output a command to run with sudo. Copy and run it:

```bash
sudo env PATH=$PATH:/usr/local/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup -u mohankalburgi --hp /Users/mohankalburgi
```

### Step 2: Save Current PM2 State

After starting your app with PM2, save the state:

```bash
pm2 save
```

### Step 3: Verify

```bash
pm2 status
```

You should see your app listed. On system reboot, PM2 will automatically start it.

### To Remove Startup Script

```bash
pm2 unstartup
sudo rm /etc/init.d/pm2-init.sh
```

## Auto-Restart Scenarios

The application will automatically restart in these scenarios:

1. **App Crashes** - If the process exits unexpectedly
2. **Out of Memory** - If memory usage exceeds 1GB limit
3. **System Reboot** - If enabled with startup script (after Step 2 above)

The restart will happen after a 4-second delay (configurable via `restart_delay`).

If the app crashes more than 10 times, PM2 will stop trying to restart it.

## Monitoring Dashboard

For a more detailed monitoring dashboard, you can use PM2+:

```bash
pm2 plus
```

This provides:
- Real-time logs
- Error tracking
- Performance metrics
- Server monitoring

## Development Mode

For development, use the standard command:

```bash
npm run dev
```

PM2 is recommended only for production deployments.

## Logs Location

All logs are stored in the `logs/` directory:
- `logs/err.log` - Application errors
- `logs/out.log` - Application output
- `logs/combined.log` - Combined logs with timestamps

To view logs in real-time:

```bash
tail -f logs/combined.log
```

## Troubleshooting

### App Not Starting

Check the logs:
```bash
pm2 logs swar-yoga-web
```

Verify the app builds successfully:
```bash
npm run build
npm start
```

### Memory Issues

If the app keeps restarting due to memory:
1. Increase max_memory_restart in ecosystem.config.js
2. Optimize the application
3. Check for memory leaks:
   ```bash
   pm2 monit
   ```

### Port Already in Use

If port 3000 is already in use:
```bash
lsof -i :3000
kill -9 <PID>
```

Then restart with PM2:
```bash
npm run pm2:restart
```

## Best Practices

✅ **Always build before deploying:**
```bash
npm run build
npm run pm2:start
```

✅ **Check logs regularly:**
```bash
npm run pm2:logs
```

✅ **Monitor memory usage:**
```bash
npm run pm2:monit
```

✅ **Use PM2 status to verify:**
```bash
npm run pm2:status
```

✅ **Save state after changes:**
```bash
pm2 save
```

## Environment Variables

Make sure to create a `.env.local` file with all required variables:

```bash
cp .env.example .env.local
```

Add your credentials:
- MongoDB URI
- Supabase keys
- API keys
- JWT secret

PM2 will use these variables from the environment where it's started.

## Production Checklist

Before deploying to production:

- [ ] Create `.env.local` with all credentials
- [ ] Run `npm run build` successfully
- [ ] Run `npm run pm2:start`
- [ ] Check `npm run pm2:logs` for errors
- [ ] Monitor with `npm run pm2:monit` for 5 minutes
- [ ] Run `pm2 save` to persist state
- [ ] (Optional) Run `pm2 startup` for auto-reboot

## Next Steps

1. Build the application:
   ```bash
   npm run build
   ```

2. Start with PM2:
   ```bash
   npm run pm2:start
   ```

3. Check the status:
   ```bash
   npm run pm2:status
   ```

4. View logs:
   ```bash
   npm run pm2:logs
   ```

5. Setup auto-reboot (optional):
   ```bash
   pm2 startup
   pm2 save
   ```

Your application is now running with automatic restart capabilities!
