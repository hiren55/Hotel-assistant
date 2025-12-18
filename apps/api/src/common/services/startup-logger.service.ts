import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface StartupStep {
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
  duration?: number;
}

@Injectable()
export class StartupLoggerService {
  private steps: StartupStep[] = [];
  private bootTime = Date.now();

  constructor(private readonly configService: ConfigService) {}

  printBanner() {
    const banner = `
\x1b[36m╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║    ██╗  ██╗ ██████╗ ████████╗███████╗██╗         █████╗ ██╗         ║
║    ██║  ██║██╔═══██╗╚══██╔══╝██╔════╝██║        ██╔══██╗██║         ║
║    ███████║██║   ██║   ██║   █████╗  ██║        ███████║██║         ║
║    ██╔══██║██║   ██║   ██║   ██╔══╝  ██║        ██╔══██║██║         ║
║    ██║  ██║╚██████╔╝   ██║   ███████╗███████╗   ██║  ██║██║         ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝   ╚══════╝╚══════╝   ╚═╝  ╚═╝╚═╝         ║
║                                                                      ║
║                   AI Hotel Assistant Platform                        ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝\x1b[0m
`;
    console.log(banner);
  }

  printEnvironmentInfo() {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const port = this.configService.get('PORT', 3001);
    const dbUrl = this.configService.get('DATABASE_URL', 'Not configured');
    const aiProvider = this.configService.get('ai.provider', 'openai');

    console.log('\x1b[33m┌─────────────────────────────────────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[33m│ ENVIRONMENT CONFIGURATION                                           │\x1b[0m');
    console.log('\x1b[33m├─────────────────────────────────────────────────────────────────────┤\x1b[0m');
    console.log(`\x1b[33m│\x1b[0m  NODE_ENV:     \x1b[36m${nodeEnv.padEnd(53)}\x1b[0m\x1b[33m│\x1b[0m`);
    console.log(`\x1b[33m│\x1b[0m  PORT:         \x1b[36m${String(port).padEnd(53)}\x1b[0m\x1b[33m│\x1b[0m`);
    console.log(`\x1b[33m│\x1b[0m  AI Provider:  \x1b[36m${aiProvider.padEnd(53)}\x1b[0m\x1b[33m│\x1b[0m`);
    console.log(`\x1b[33m│\x1b[0m  Database:     \x1b[36m${this.maskDbUrl(dbUrl).padEnd(53)}\x1b[0m\x1b[33m│\x1b[0m`);
    console.log('\x1b[33m└─────────────────────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');
  }

  private maskDbUrl(url: string): string {
    if (!url || url === 'Not configured') return url;
    try {
      const parsed = new URL(url);
      parsed.password = '****';
      return parsed.toString().substring(0, 50) + '...';
    } catch {
      return url.substring(0, 50) + '...';
    }
  }

  startStep(name: string) {
    const step: StartupStep = { name, status: 'running' };
    this.steps.push(step);
    process.stdout.write(`\x1b[33m⟳\x1b[0m  ${name}...`);
    return {
      done: (message?: string) => {
        step.status = 'done';
        step.message = message;
        step.duration = Date.now() - this.bootTime;
        console.log(`\r\x1b[32m✓\x1b[0m  ${name} ${message ? `(${message})` : ''}`);
      },
      error: (message: string) => {
        step.status = 'error';
        step.message = message;
        console.log(`\r\x1b[31m✗\x1b[0m  ${name} - ${message}`);
      },
    };
  }

  printStartupComplete(port: number) {
    const totalTime = Date.now() - this.bootTime;

    console.log('');
    console.log('\x1b[32m╔══════════════════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[32m║                     SERVER STARTED SUCCESSFULLY                      ║\x1b[0m');
    console.log('\x1b[32m╠══════════════════════════════════════════════════════════════════════╣\x1b[0m');
    console.log(`\x1b[32m║\x1b[0m  🌐 API Server:     \x1b[36mhttp://localhost:${port}\x1b[0m`.padEnd(79) + '\x1b[32m║\x1b[0m');
    console.log(`\x1b[32m║\x1b[0m  📚 Swagger Docs:   \x1b[36mhttp://localhost:${port}/api/docs\x1b[0m`.padEnd(79) + '\x1b[32m║\x1b[0m');
    console.log(`\x1b[32m║\x1b[0m  ❤️  Health Check:  \x1b[36mhttp://localhost:${port}/api/v1/health\x1b[0m`.padEnd(79) + '\x1b[32m║\x1b[0m');
    console.log('\x1b[32m╠══════════════════════════════════════════════════════════════════════╣\x1b[0m');
    console.log(`\x1b[32m║\x1b[0m  ⏱️  Boot Time: \x1b[33m${totalTime}ms\x1b[0m`.padEnd(79) + '\x1b[32m║\x1b[0m');
    console.log('\x1b[32m╚══════════════════════════════════════════════════════════════════════╝\x1b[0m');
    console.log('');
    console.log('\x1b[36m┌─────────────────────────────────────────────────────────────────────┐\x1b[0m');
    console.log('\x1b[36m│ AVAILABLE API ENDPOINTS                                             │\x1b[0m');
    console.log('\x1b[36m├─────────────────────────────────────────────────────────────────────┤\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  POST   /api/v1/auth/login          - User login                    \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  POST   /api/v1/auth/register       - User registration             \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  POST   /api/v1/auth/refresh        - Refresh tokens                \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  GET    /api/v1/hotels              - List hotels                   \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  GET    /api/v1/rooms               - List rooms                    \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  POST   /api/v1/bookings            - Create booking                \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  POST   /api/v1/chat                - Chat with AI assistant        \x1b[36m│\x1b[0m');
    console.log('\x1b[36m│\x1b[0m  GET    /api/v1/health              - Health check                  \x1b[36m│\x1b[0m');
    console.log('\x1b[36m└─────────────────────────────────────────────────────────────────────┘\x1b[0m');
    console.log('');
    console.log('\x1b[35m>>> Waiting for requests... (Press Ctrl+C to stop)\x1b[0m');
    console.log('');
  }

  printLocalhostWarning() {
    console.log('\x1b[33m⚠️  LOCALHOST MODE ENABLED - Not for production use!\x1b[0m');
  }
}
