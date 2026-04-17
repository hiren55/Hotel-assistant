import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private poolStatsInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const isDev = process.env.NODE_ENV === 'development';

    super({
      log: isDev
        ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ]
        : [
          { emit: 'stdout', level: 'warn' },
          { emit: 'stdout', level: 'error' },
        ],
    });

    // Log slow queries in development (> 500ms)
    if (isDev) {
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 500) {
          this.logger.warn(
            `SLOW QUERY (${e.duration}ms): ${e.query.substring(0, 200)}`,
          );
        }
      });
    }
  }

  /**
   * Connect to database with Neon cold-start retry logic.
   * Neon auto-suspends after inactivity on free tier,
   * causing the first connection to take several seconds.
   * We retry up to 3 times with increasing backoff.
   */
  async onModuleInit() {
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.logger.log(
          `✅ Database connected successfully (attempt ${attempt}/${maxRetries})`,
        );

        // Start connection pool monitoring in development
        if (process.env.NODE_ENV === 'development') {
          this.startPoolMonitoring();
        }

        return;
      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const delay = baseDelay * attempt; // Linear backoff: 2s, 4s, 6s

        if (isLastAttempt) {
          this.logger.error(
            `❌ Database connection failed after ${maxRetries} attempts`,
            error?.message,
          );
          throw error;
        }

        this.logger.warn(
          `⚠️ Database connection attempt ${attempt}/${maxRetries} failed. ` +
          `Retrying in ${delay / 1000}s... (${error?.message || 'Unknown error'})`,
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  async onModuleDestroy() {
    if (this.poolStatsInterval) {
      clearInterval(this.poolStatsInterval);
      this.poolStatsInterval = null;
    }
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Log connection pool stats every 60 seconds in development.
   * Helps monitor connection usage and detect pool exhaustion.
   */
  private startPoolMonitoring() {
    this.poolStatsInterval = setInterval(async () => {
      try {
        const result = await this.$queryRaw<
          Array<{
            active_connections: bigint;
            transactions_committed: bigint;
            transactions_rolled_back: bigint;
          }>
        >`
          SELECT
            numbackends as active_connections,
            xact_commit as transactions_committed,
            xact_rollback as transactions_rolled_back
          FROM pg_stat_database
          WHERE datname = current_database()
        `;

        if (result[0]) {
          this.logger.debug(
            `📊 DB Pool: active=${result[0].active_connections}, ` +
            `committed=${result[0].transactions_committed}, ` +
            `rollbacks=${result[0].transactions_rolled_back}`,
          );
        }
      } catch {
        // Silently ignore monitoring errors
      }
    }, 60_000);
  }

  /**
   * Clean up database for testing - only available in test environment
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be used in test environment');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) =>
        typeof key === 'string' &&
        !key.startsWith('_') &&
        !key.startsWith('$') &&
        typeof (this as Record<string, unknown>)[key] === 'object'
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = (this as Record<string, unknown>)[modelKey as string] as { deleteMany?: () => Promise<unknown> };
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
        return Promise.resolve();
      })
    );
  }
}
