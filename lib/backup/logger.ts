/**
 * Logger Service for Backup Operations
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.LOG_DIR || '.logs/backup';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
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

    // Write to file
    fs.appendFileSync(this.logFile, line);

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
