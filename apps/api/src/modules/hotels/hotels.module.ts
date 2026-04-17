import { Module } from '@nestjs/common';
import { HotelsController } from './hotels.controller';
import { HotelsService } from './hotels.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [HotelsController, UsersController],
  providers: [HotelsService, UsersService],
  exports: [HotelsService, UsersService],
})
export class HotelsModule { }
