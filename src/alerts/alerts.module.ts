import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AlertsService } from './alerts.service';
import { QUEUE_NAMES } from '../common/constants/queue-names';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.ALERTS,
    }),
    RealtimeModule,
  ],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
