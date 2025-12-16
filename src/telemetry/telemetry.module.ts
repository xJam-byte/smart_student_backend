import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TelemetryController } from './telemetry.controller';
import { TelemetryAdminController } from './telemetry-admin.controller';
import { TelemetryService } from './telemetry.service';
import { TelemetryCleanupService } from './telemetry-cleanup.service';
import { DevicesModule } from '../devices/devices.module';
import { QUEUE_NAMES } from '../common/constants/queue-names';

@Module({
  imports: [
    DevicesModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.TELEMETRY,
    }),
  ],
  controllers: [TelemetryController, TelemetryAdminController],
  providers: [TelemetryService, TelemetryCleanupService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
