import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { TerminalLoggerInterceptor } from './common/interceptors/terminal-logger.interceptor';
import { StartupLoggerService } from './common/services/startup-logger.service';
import { ValidationService } from './common/services/validation.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Create app with verbose logging in development
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bufferLogs: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isLocalhost = nodeEnv === 'development';

  // Get startup services
  const startupLogger = app.get(StartupLoggerService);
  const validationService = app.get(ValidationService);

  // Print startup banner
  startupLogger.printBanner();
  startupLogger.printEnvironmentInfo();

  if (isLocalhost) {
    startupLogger.printLocalhostWarning();
  }

  // Localhost-only binding in development
  const bindAddress = isLocalhost ? '127.0.0.1' : '0.0.0.0';

  // Step: Security middleware
  const securityStep = startupLogger.startStep('Configuring security middleware');
  app.use(helmet({
    contentSecurityPolicy: isLocalhost ? false : undefined,
  }));
  app.use(cookieParser());
  securityStep.done('Helmet + Cookie Parser');

  // Step: CORS configuration
  const corsStep = startupLogger.startStep('Configuring CORS');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', '*');
  app.enableCors({
    origin: isLocalhost ? true : corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  corsStep.done(isLocalhost ? 'All origins (localhost)' : corsOrigin);

  // Step: Global prefix
  const prefixStep = startupLogger.startStep('Setting API prefix');
  app.setGlobalPrefix('api/v1');
  prefixStep.done('/api/v1');

  // Step: Validation pipes
  const validationStep = startupLogger.startStep('Configuring validation pipes');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );
  validationStep.done('Whitelist + Transform enabled');

  // Step: Exception filters
  const filterStep = startupLogger.startStep('Configuring exception filters');
  app.useGlobalFilters(new HttpExceptionFilter());
  filterStep.done('HTTP Exception Filter');

  // Step: Interceptors with terminal logging
  const interceptorStep = startupLogger.startStep('Configuring interceptors');
  const terminalLogger = new TerminalLoggerInterceptor(configService);
  app.useGlobalInterceptors(new TransformInterceptor(), terminalLogger);
  interceptorStep.done('Transform + Terminal Logger');

  // Step: Swagger documentation (development only)
  if (nodeEnv !== 'production') {
    const swaggerStep = startupLogger.startStep('Setting up Swagger documentation');
    const config = new DocumentBuilder()
      .setTitle('Hotel Assistant API')
      .setDescription('API documentation for Hotel Assistant SaaS platform')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('hotels', 'Hotel management endpoints')
      .addTag('rooms', 'Room management endpoints')
      .addTag('bookings', 'Booking management endpoints')
      .addTag('chat', 'Chat and AI endpoints')
      .addTag('widget', 'Widget public endpoints')
      .addTag('health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    swaggerStep.done('/api/docs');
  }

  // Step: Service validation
  const serviceValidationStep = startupLogger.startStep('Validating services');
  try {
    await validationService.runFullValidation();
    serviceValidationStep.done('All services validated');
  } catch (error) {
    serviceValidationStep.error(error instanceof Error ? error.message : 'Validation failed');
    logger.warn('Service validation failed, continuing startup...');
  }

  // Step: Start server
  const serverStep = startupLogger.startStep(`Starting server on ${bindAddress}:${port}`);
  try {
    await app.listen(port, bindAddress);
    serverStep.done(`Listening on ${bindAddress}:${port}`);
  } catch (error) {
    serverStep.error(error instanceof Error ? error.message : 'Failed to start server');
    process.exit(1);
  }

  // Print final startup message
  startupLogger.printStartupComplete(port);

  // Graceful shutdown handling
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, shutting down gracefully...`);
      await app.close();
      logger.log('Server closed');
      process.exit(0);
    });
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
