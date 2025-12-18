import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../modules/auth/decorators/public.decorator';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: Record<string, { status: 'up' | 'down'; latency?: number; message?: string }>;
}

@ApiTags('health')
@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness check - is the process running?' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check - can the service handle requests?' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  async ready(): Promise<HealthCheck> {
    const checks: HealthCheck['checks'] = {};

    // Check database connection
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'down', message: 'Database connection failed' };
    }

    // Determine overall status
    const allUp = Object.values(checks).every((check) => check.status === 'up');

    return {
      status: allUp ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks,
    };
  }

  @Get('deep')
  @ApiOperation({ summary: 'Deep health check - full system status' })
  @ApiResponse({ status: 200, description: 'Full health check results' })
  async deep(): Promise<HealthCheck> {
    const checks: HealthCheck['checks'] = {};

    // Database check
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'down', message: 'Database connection failed' };
    }

    // TODO: Add Redis check when implemented
    // TODO: Add AI provider check when implemented
    // TODO: Add email provider check when implemented

    const allUp = Object.values(checks).every((check) => check.status === 'up');
    const someUp = Object.values(checks).some((check) => check.status === 'up');

    let status: HealthCheck['status'] = 'unhealthy';
    if (allUp) status = 'healthy';
    else if (someUp) status = 'degraded';

    return {
      status,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      checks,
    };
  }
}
