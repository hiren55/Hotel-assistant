#!/usr/bin/env node
/**
 * Development Server Startup Script
 *
 * This script:
 * 1. Kills all processes on development ports
 * 2. Validates environment configuration
 * 3. Starts the API server with full terminal logging
 *
 * Usage: node scripts/dev-server.js
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n');
  log('='.repeat(70), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(70), 'cyan');
}

function printStartupBanner() {
  console.clear();
  const banner = `
${colors.cyan}
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║     ██████╗ ███████╗██╗   ██╗    ███████╗███████╗██████╗ ██╗   ██╗      ║
║     ██╔══██╗██╔════╝██║   ██║    ██╔════╝██╔════╝██╔══██╗██║   ██║      ║
║     ██║  ██║█████╗  ██║   ██║    ███████╗█████╗  ██████╔╝██║   ██║      ║
║     ██╔══██║██╔══╝  ╚██╗ ██╔╝    ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝      ║
║     ██████╔╝███████╗ ╚████╔╝     ███████║███████╗██║  ██║ ╚████╔╝       ║
║     ╚═════╝ ╚══════╝  ╚═══╝      ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝        ║
║                                                                          ║
║                  Hotel Assistant - Development Mode                      ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
${colors.reset}`;
  console.log(banner);
}

function killPorts() {
  logSection('STEP 1: Killing Existing Processes');

  const killPortsScript = path.join(__dirname, 'kill-ports.js');

  if (fs.existsSync(killPortsScript)) {
    try {
      execSync(`node "${killPortsScript}"`, { stdio: 'inherit' });
      log('Port cleanup completed!', 'green');
    } catch (error) {
      log('Warning: Port cleanup had issues, continuing...', 'yellow');
    }
  } else {
    log('kill-ports.js not found, skipping...', 'yellow');
  }
}

function checkEnvFile() {
  logSection('STEP 2: Checking Environment Configuration');

  const apiEnvPath = path.join(__dirname, '..', 'apps', 'api', '.env');
  const apiEnvLocalPath = path.join(__dirname, '..', 'apps', 'api', '.env.local');
  const rootEnvPath = path.join(__dirname, '..', '.env');

  let envExists = false;

  [apiEnvLocalPath, apiEnvPath, rootEnvPath].forEach((envPath) => {
    if (fs.existsSync(envPath)) {
      log(`  Found: ${path.basename(envPath)} at ${path.dirname(envPath)}`, 'green');
      envExists = true;
    }
  });

  if (!envExists) {
    log('  No .env file found! Creating from .env.example...', 'yellow');

    const exampleEnvPath = path.join(__dirname, '..', '.env.example');
    if (fs.existsSync(exampleEnvPath)) {
      fs.copyFileSync(exampleEnvPath, rootEnvPath);
      log('  Created .env from .env.example', 'green');
    } else {
      log('  Warning: No .env.example found', 'red');
    }
  }

  // Check critical environment variables
  log('\n  Required Environment Variables:', 'cyan');
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const optionalVars = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'RESEND_API_KEY',
  ];

  requiredVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      log(`    [OK] ${varName}`, 'green');
    } else {
      log(`    [MISSING] ${varName}`, 'red');
    }
  });

  log('\n  Optional Environment Variables:', 'cyan');
  optionalVars.forEach((varName) => {
    const value = process.env[varName];
    if (value) {
      log(`    [OK] ${varName}`, 'green');
    } else {
      log(`    [SKIP] ${varName} (feature disabled)`, 'yellow');
    }
  });
}

function checkDatabaseConnection() {
  logSection('STEP 3: Checking Database Connection');

  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    log('  DATABASE_URL not set. Database features will not work.', 'yellow');
    return;
  }

  try {
    // Parse database URL
    const url = new URL(dbUrl);
    log(`  Host: ${url.hostname}`, 'cyan');
    log(`  Port: ${url.port || '5432'}`, 'cyan');
    log(`  Database: ${url.pathname.replace('/', '')}`, 'cyan');
    log(`  User: ${url.username}`, 'cyan');
    log('  Connection string configured!', 'green');
  } catch (error) {
    log(`  Invalid DATABASE_URL format: ${error}`, 'red');
  }
}

function startApiServer() {
  logSection('STEP 4: Starting API Server');

  const apiPath = path.join(__dirname, '..', 'apps', 'api');

  log('  Starting NestJS API server...', 'cyan');
  log(`  Working directory: ${apiPath}`, 'cyan');
  log('  Command: pnpm run start:dev', 'cyan');
  console.log('\n');

  const isWindows = os.platform() === 'win32';
  const npmCmd = isWindows ? 'pnpm.cmd' : 'pnpm';

  const apiServer = spawn(npmCmd, ['run', 'start:dev'], {
    cwd: apiPath,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      FORCE_COLOR: '1',
    },
  });

  apiServer.on('error', (error) => {
    log(`Failed to start API server: ${error.message}`, 'red');
    process.exit(1);
  });

  apiServer.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      log(`API server exited with code ${code}`, 'red');
    }
    process.exit(code || 0);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    log('\nReceived SIGINT, shutting down...', 'yellow');
    apiServer.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    log('\nReceived SIGTERM, shutting down...', 'yellow');
    apiServer.kill('SIGTERM');
  });
}

async function main() {
  printStartupBanner();

  log(`Platform: ${os.platform()}`, 'blue');
  log(`Node Version: ${process.version}`, 'blue');
  log(`Working Directory: ${process.cwd()}`, 'blue');
  log(`Time: ${new Date().toISOString()}`, 'blue');

  // Load .env file manually for pre-startup checks
  const dotenvPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(dotenvPath)) {
    const envContent = fs.readFileSync(dotenvPath, 'utf-8');
    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && match[1] && match[2] !== undefined) {
        process.env[match[1].trim()] = match[2].trim();
      }
    });
  }

  // Execute startup steps
  killPorts();
  checkEnvFile();
  checkDatabaseConnection();
  startApiServer();
}

main().catch((error) => {
  log(`Startup failed: ${error.message}`, 'red');
  process.exit(1);
});
