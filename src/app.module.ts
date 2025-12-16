import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ParentModule } from './parent/parent.module';
import { ChildrenModule } from './children/children.module';
import { DevicesModule } from './devices/devices.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { AlertsModule } from './alerts/alerts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GeofenceModule } from './geofence/geofence.module';
import { BusModule } from './bus/bus.module';
import { HealthModule } from './health/health.module';
import { WorkersModule } from './workers/workers.module';
import { RealtimeModule } from './realtime/realtime.module';
import { DeviceCommandsModule } from './device-commands/device-commands.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Schedule for cron jobs
    ScheduleModule.forRoot(),

    // BullMQ for async job processing
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),

    // Database
    PrismaModule,

    // Workers
    WorkersModule,

    // Feature modules
    AuthModule,
    ParentModule,
    ChildrenModule,
    DevicesModule,
    TelemetryModule,
    AlertsModule,
    NotificationsModule,
    GeofenceModule,
    BusModule,
    HealthModule,
    RealtimeModule,
    DeviceCommandsModule,
  ],
})
export class AppModule {}
