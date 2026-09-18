/**
 * Logger Service for Backup Operations
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || '.logs/backup';
const FILE_LOGGING_ENABLED = process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production';

// Ensure log directory exists
if (FILE_LOGGING_ENABLED) {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (error) {
    console.warn('[backup logger] File logging disabled:', error instanceof Error ? error.message : String(error));
  }
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: any;
}

class Logger {
  private logFile: string;

  constructor() {
    const date = new Date().toISOString().split('T')[0];
    this.logFile = path.join(LOG_DIR, `backup-${date}.log`);
  }

  private write(entry: LogEntry) {
    const line = JSON.stringify(entry) + '\n';

    // Vercel/serverless filesystems are read-only or ephemeral. Console logs
    // remain available in the platform runtime log stream instead.
    if (FILE_LOGGING_ENABLED) {
      try {
        fs.appendFileSync(this.logFile, line);
      } catch (error) {
        console.warn('[backup logger] Could not write file log:', error instanceof Error ? error.message : String(error));
      }
    }

    // Console output
    const emoji = {
      info: 'ℹ️ ',
      warn: '⚠️ ',
      error: '❌',
    }[entry.level];

    const color = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
    }[entry.level];

    const reset = '\x1b[0m';

    console.log(
      `${color}${emoji} [${entry.timestamp}] ${entry.message}${reset}`,
      entry.context ? JSON.stringify(entry.context, null, 2) : ''
    );
  }

  info(message: string, context?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  warn(message: string, context?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  error(message: string, context?: any) {
    this.write({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
    });
  }

  getLogFile(): string {
    return this.logFile;
  }
}

export const logger = new Logger();
