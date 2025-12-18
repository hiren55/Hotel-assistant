import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [ConfigModule, PrismaModule, SupabaseModule],
  providers: [StorageService],
  controllers: [StorageController],
  exports: [StorageService],
})
export class StorageModule {}
