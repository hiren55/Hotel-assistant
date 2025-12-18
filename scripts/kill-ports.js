#!/usr/bin/env node
/**
 * Kill all processes on specified ports before server start
 * Works on Windows, Linux, and macOS
 */

const { execSync, exec } = require('child_process');
const os = require('os');

const PORTS_TO_KILL = [3000, 3001, 3002, 5432, 6379];

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  console.log('\n' + '='.repeat(60));
  log(` ${title}`, 'cyan');
  console.log('='.repeat(60));
}

function killPortWindows(port) {
  try {
    // Find process using the port
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const lines = result.trim().split('\n');

    const pids = new Set();
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0' && !isNaN(parseInt(pid))) {
        pids.add(pid);
      }
    });

    if (pids.size > 0) {
      pids.forEach(pid => {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
          log(`  [KILLED] PID ${pid} on port ${port}`, 'green');
        } catch (e) {
          log(`  [SKIP] Could not kill PID ${pid} (may need admin)`, 'yellow');
        }
      });
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function killPortUnix(port) {
  try {
    const result = execSync(`lsof -ti:${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    const pids = result.trim().split('\n').filter(p => p);

    if (pids.length > 0) {
      pids.forEach(pid => {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
          log(`  [KILLED] PID ${pid} on port ${port}`, 'green');
        } catch (e) {
          log(`  [SKIP] Could not kill PID ${pid}`, 'yellow');
        }
      });
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

function killPort(port) {
  const isWindows = os.platform() === 'win32';
  return isWindows ? killPortWindows(port) : killPortUnix(port);
}

function main() {
  logHeader('PORT CLEANUP - Killing processes on development ports');

  const platform = os.platform();
  log(`Platform: ${platform}`, 'blue');
  log(`Ports to check: ${PORTS_TO_KILL.join(', ')}`, 'blue');
  console.log('');

  let killed = 0;
  let skipped = 0;

  PORTS_TO_KILL.forEach(port => {
    process.stdout.write(`Checking port ${port}... `);
    const wasKilled = killPort(port);
    if (wasKilled) {
      killed++;
    } else {
      log(`[FREE] Port ${port} is available`, 'green');
      skipped++;
    }
  });

  console.log('');
  log(`Summary: ${killed} ports freed, ${skipped} already available`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

main();
