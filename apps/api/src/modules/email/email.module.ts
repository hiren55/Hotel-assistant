import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailService } from './email.service';
import { EmailQueueService } from './email-queue.service';
import { EmailTemplateService } from './email-template.service';
import { NotificationService } from './notification.service';
import { EmailWebhookController } from './email-webhook.controller';
import { EmailStatsController } from './email-stats.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [EmailWebhookController, EmailStatsController],
  providers: [
    EmailService,
    EmailQueueService,
    EmailTemplateService,
    NotificationService,
  ],
  exports: [EmailService, EmailQueueService, NotificationService],
})
export class EmailModule {}
