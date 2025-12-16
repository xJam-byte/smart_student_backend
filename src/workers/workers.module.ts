import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TelemetryProcessor } from './telemetry.processor';
import { AlertsProcessor } from './alerts.processor';
import { NotificationsProcessor } from './notifications.processor';
import { GeofenceModule } from '../geofence/geofence.module';
import { AlertsModule } from '../alerts/alerts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Module({
  imports: [
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.TELEMETRY,
      },
      {
        name: QUEUE_NAMES.ALERTS,
      },
      {
        name: QUEUE_NAMES.NOTIFICATIONS,
      },
    ),
    GeofenceModule,
    AlertsModule,
    NotificationsModule,
  ],
  providers: [TelemetryProcessor, AlertsProcessor, NotificationsProcessor],
})
export class WorkersModule {}
