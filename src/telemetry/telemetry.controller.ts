import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { TelemetryService } from './telemetry.service';
import { TelemetryDto } from './dto/telemetry.dto';
import { SosDto } from './dto/sos.dto';
import { DeviceAuthGuard } from '../devices/guards/device-auth.guard';
import { CurrentDevice } from '../common/decorators/current-device.decorator';

@ApiTags('devices/telemetry')
@Controller('devices')
@UseGuards(DeviceAuthGuard)
@ApiSecurity('device-token')
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('telemetry')
  @ApiOperation({ summary: 'Submit telemetry data from device' })
  async submitTelemetry(@CurrentDevice('id') deviceId: string, @Body() telemetryDto: TelemetryDto) {
    return this.telemetryService.saveTelemetry(deviceId, telemetryDto);
  }

  @Post('sos')
  @ApiOperation({ summary: 'Send SOS alert from device' })
  async sendSOS(@CurrentDevice('id') deviceId: string, @Body() sosDto: SosDto) {
    return this.telemetryService.handleSOS(deviceId, sosDto);
  }
}
