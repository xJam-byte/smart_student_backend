import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { FcmService } from './fcm.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATIONS,
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, FcmService],
  exports: [NotificationsService, FcmService],
})
export class NotificationsModule {}
