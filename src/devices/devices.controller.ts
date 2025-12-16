import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { HeartbeatDto } from './dto/heartbeat.dto';
import { AcknowledgeDto } from './dto/acknowledge.dto';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { CurrentDevice } from '../common/decorators/current-device.decorator';

@ApiTags('devices')
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register or update a device' })
  async register(@Body() registerDeviceDto: RegisterDeviceDto) {
    return this.devicesService.register(registerDeviceDto);
  }

  @Post('heartbeat')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({ summary: 'Send device heartbeat' })
  async heartbeat(@CurrentDevice('id') deviceId: string, @Body() heartbeatDto: HeartbeatDto) {
    return this.devicesService.heartbeat(deviceId, heartbeatDto);
  }

  @Post('ack')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({ summary: 'Acknowledge command receipt' })
  async acknowledge(@CurrentDevice('id') deviceId: string, @Body() acknowledgeDto: AcknowledgeDto) {
    return this.devicesService.acknowledgeCommand(deviceId, acknowledgeDto.commandId);
  }

  @Get('info')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({ summary: 'Get device information' })
  async getInfo(@CurrentDevice('id') deviceId: string) {
    return this.devicesService.getDeviceInfo(deviceId);
  }
}
