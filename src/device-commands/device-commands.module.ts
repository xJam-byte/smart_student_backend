import { Module } from '@nestjs/common';
import { DeviceCommandsController } from './device-commands.controller';
import { DeviceCommandsService } from './device-commands.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { DevicesModule } from '../devices/devices.module';

@Module({
  imports: [RealtimeModule, DevicesModule],
  controllers: [DeviceCommandsController],
  providers: [DeviceCommandsService],
  exports: [DeviceCommandsService],
})
export class DeviceCommandsModule {}
