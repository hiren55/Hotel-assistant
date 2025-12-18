import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ValidationService } from './services/validation.service';
import { StartupLoggerService } from './services/startup-logger.service';
import { CryptoService } from './services/crypto.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [ValidationService, StartupLoggerService, CryptoService],
  exports: [ValidationService, StartupLoggerService, CryptoService],
})
export class CommonModule {}
