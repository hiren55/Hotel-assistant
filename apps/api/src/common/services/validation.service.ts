import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface ServiceStatus {
  name: string;
  status: 'ok' | 'error' | 'warning';
  message: string;
  latency?: number;
  details?: Record<string, any>;
}

export interface ValidationReport {
  timestamp: Date;
  environment: string;
  isLocalhost: boolean;
  services: ServiceStatus[];
  summary: {
    total: number;
    ok: number;
    errors: number;
    warnings: number;
  };
}

@Injectable()
export class ValidationService implements OnModuleInit {
  private readonly logger = new Logger('ValidationService');
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Run validation on startup in development
    if (this.configService.get('NODE_ENV') !== 'production') {
      await this.runFullValidation();
    }
  }

  async runFullValidation(): Promise<ValidationReport> {
    this.printHeader('SERVICE VALIDATION REPORT');

    const services: ServiceStatus[] = [];
    const isLocalhost = this.checkLocalhost();

    // Validate Database
    services.push(await this.validateDatabase());

    // Validate JWT Configuration
    services.push(this.validateJwtConfig());

    // Validate AI Provider
    services.push(this.validateAIConfig());

    // Validate Email Configuration
    services.push(this.validateEmailConfig());

    // Validate Redis (if configured)
    services.push(await this.validateRedis());

    // Validate Environment
    services.push(this.validateEnvironment());

    const report: ValidationReport = {
      timestamp: new Date(),
      environment: this.configService.get('NODE_ENV') || 'development',
      isLocalhost,
      services,
      summary: {
        total: services.length,
        ok: services.filter((s) => s.status === 'ok').length,
        errors: services.filter((s) => s.status === 'error').length,
        warnings: services.filter((s) => s.status === 'warning').length,
      },
    };

    this.printReport(report);
    return report;
  }

  private checkLocalhost(): boolean {
    const corsOrigin = this.configService.get('CORS_ORIGIN', '*');
    const nodeEnv = this.configService.get('NODE_ENV', 'development');

    return (
      nodeEnv === 'development' ||
      corsOrigin.includes('localhost') ||
      corsOrigin === '*'
    );
  }

  async validateDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      // Get table counts
      const userCount = await this.prisma.user.count();
      const hotelCount = await this.prisma.hotel.count();

      return {
        name: 'Database (PostgreSQL)',
        status: 'ok',
        message: 'Connected successfully',
        latency,
        details: {
          users: userCount,
          hotels: hotelCount,
        },
      };
    } catch (error) {
      return {
        name: 'Database (PostgreSQL)',
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        latency: Date.now() - start,
      };
    }
  }

  validateJwtConfig(): ServiceStatus {
    const jwtSecret = this.configService.get('jwt.secret');
    const accessExpires = this.configService.get('jwt.accessTokenExpiresIn');
    const refreshExpires = this.configService.get('jwt.refreshTokenExpiresIn');

    const isDefaultSecret =
      jwtSecret === 'development-secret-change-in-production';
    const nodeEnv = this.configService.get('NODE_ENV');

    if (!jwtSecret) {
      return {
        name: 'JWT Authentication',
        status: 'error',
        message: 'JWT_SECRET not configured',
      };
    }

    if (isDefaultSecret && nodeEnv === 'production') {
      return {
        name: 'JWT Authentication',
        status: 'error',
        message: 'Using default secret in production!',
      };
    }

    return {
      name: 'JWT Authentication',
      status: isDefaultSecret ? 'warning' : 'ok',
      message: isDefaultSecret
        ? 'Using default secret (OK for development)'
        : 'Configured with custom secret',
      details: {
        accessTokenExpiry: accessExpires,
        refreshTokenExpiry: refreshExpires,
      },
    };
  }

  validateAIConfig(): ServiceStatus {
    const provider = this.configService.get('ai.provider', 'openai');
    const openaiKey = this.configService.get('ai.openai.apiKey');
    const anthropicKey = this.configService.get('ai.anthropic.apiKey');
    const openaiModel = this.configService.get('ai.openai.model');
    const anthropicModel = this.configService.get('ai.anthropic.model');

    if (provider === 'openai') {
      if (!openaiKey) {
        return {
          name: 'AI Provider (OpenAI)',
          status: 'warning',
          message: 'OPENAI_API_KEY not configured - AI features disabled',
        };
      }
      return {
        name: 'AI Provider (OpenAI)',
        status: 'ok',
        message: 'OpenAI configured',
        details: {
          model: openaiModel,
          keyPrefix: openaiKey.substring(0, 7) + '...',
        },
      };
    }

    if (provider === 'anthropic') {
      if (!anthropicKey) {
        return {
          name: 'AI Provider (Claude)',
          status: 'warning',
          message: 'ANTHROPIC_API_KEY not configured - AI features disabled',
        };
      }
      return {
        name: 'AI Provider (Claude)',
        status: 'ok',
        message: 'Anthropic Claude configured',
        details: {
          model: anthropicModel,
          keyPrefix: anthropicKey.substring(0, 7) + '...',
        },
      };
    }

    return {
      name: 'AI Provider',
      status: 'error',
      message: `Unknown provider: ${provider}`,
    };
  }

  validateEmailConfig(): ServiceStatus {
    const provider = this.configService.get('email.provider', 'resend');
    const resendKey = this.configService.get('email.resend.apiKey');
    const fromEmail = this.configService.get('email.from');

    if (!resendKey) {
      return {
        name: 'Email Service (Resend)',
        status: 'warning',
        message: 'RESEND_API_KEY not configured - emails disabled',
      };
    }

    return {
      name: 'Email Service (Resend)',
      status: 'ok',
      message: 'Email service configured',
      details: {
        from: fromEmail,
        provider,
      },
    };
  }

  async validateRedis(): Promise<ServiceStatus> {
    const redisUrl = this.configService.get('redis.url');

    if (!redisUrl) {
      return {
        name: 'Redis Cache',
        status: 'warning',
        message: 'Redis not configured - using in-memory fallback',
      };
    }

    // Note: Actual Redis connection would be tested here
    return {
      name: 'Redis Cache',
      status: 'ok',
      message: 'Redis URL configured',
      details: {
        url: redisUrl.replace(/\/\/.*:.*@/, '//***:***@'),
      },
    };
  }

  validateEnvironment(): ServiceStatus {
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const port = this.configService.get('PORT', 3001);
    const corsOrigin = this.configService.get('CORS_ORIGIN', '*');

    const warnings: string[] = [];

    if (nodeEnv === 'production' && corsOrigin === '*') {
      warnings.push('CORS allows all origins in production');
    }

    return {
      name: 'Environment',
      status: warnings.length > 0 ? 'warning' : 'ok',
      message: warnings.length > 0 ? warnings.join(', ') : 'Environment OK',
      details: {
        NODE_ENV: nodeEnv,
        PORT: port,
        CORS_ORIGIN: corsOrigin,
      },
    };
  }

  private printHeader(title: string) {
    const line = '='.repeat(70);
    console.log('\n');
    this.logger.log(line);
    this.logger.log(`  ${title}`);
    this.logger.log(line);
  }

  private printReport(report: ValidationReport) {
    const statusIcon = (status: string) => {
      switch (status) {
        case 'ok':
          return '\x1b[32m[OK]\x1b[0m';
        case 'error':
          return '\x1b[31m[ERROR]\x1b[0m';
        case 'warning':
          return '\x1b[33m[WARN]\x1b[0m';
        default:
          return '[?]';
      }
    };

    console.log('');
    this.logger.log(`Timestamp: ${report.timestamp.toISOString()}`);
    this.logger.log(`Environment: ${report.environment}`);
    this.logger.log(`Localhost Mode: ${report.isLocalhost ? 'YES' : 'NO'}`);
    console.log('');

    report.services.forEach((service) => {
      const icon = statusIcon(service.status);
      const latencyStr = service.latency ? ` (${service.latency}ms)` : '';
      this.logger.log(`${icon} ${service.name}${latencyStr}`);
      this.logger.log(`    ${service.message}`);

      if (service.details) {
        Object.entries(service.details).forEach(([key, value]) => {
          this.logger.log(`    - ${key}: ${value}`);
        });
      }
    });

    console.log('');
    const line = '-'.repeat(70);
    this.logger.log(line);
    this.logger.log(
      `SUMMARY: ${report.summary.ok} OK | ${report.summary.warnings} Warnings | ${report.summary.errors} Errors`,
    );

    if (report.summary.errors > 0) {
      this.logger.error(
        'Some services have errors. Please check configuration.',
      );
    }

    this.logger.log(line);
    console.log('');
  }
}
