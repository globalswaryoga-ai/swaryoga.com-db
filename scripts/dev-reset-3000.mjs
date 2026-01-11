import { execSync, spawn } from 'node:child_process';

function tryExec(cmd) {
  try {
    return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

// 1) Find anything listening on :3000 and kill it.
const pidsRaw = tryExec("lsof -nP -iTCP:3000 -sTCP:LISTEN | awk 'NR>1 {print $2}' | sort -u");
const pids = pidsRaw
  .split(/\s+/)
  .map((s) => s.trim())
  .filter(Boolean);

if (pids.length) {
  console.log(`[dev:reset] Found processes on :3000 => ${pids.join(', ')}`);
  for (const pid of pids) {
    tryExec(`kill -9 ${pid}`);
  }
  // give the OS a moment to release the socket
  tryExec('sleep 0.5');
  console.log('[dev:reset] Cleared :3000');
} else {
  console.log('[dev:reset] :3000 is free');
}

// 2) Start Next dev on :3000 only.
console.log('[dev:reset] Starting Next dev on http://localhost:3000');

const child = spawn('npx', ['next', 'dev', '--port', '3000'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: '3000',
  },
});

child.on('exit', (code) => process.exit(code ?? 0));
