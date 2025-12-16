import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { DeviceAuthGuard } from './guards/device-auth.guard';

@Module({
  controllers: [DevicesController],
  providers: [DevicesService, DeviceAuthGuard],
  exports: [DevicesService, DeviceAuthGuard],
})
export class DevicesModule {}
