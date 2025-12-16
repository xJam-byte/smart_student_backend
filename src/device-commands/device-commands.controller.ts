import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { DeviceCommandsService } from './device-commands.service';
import { SendNotificationDto } from './dto/send-notification.dto';
import { FindDeviceDto } from './dto/find-device.dto';
import { UpdateCommandStatusDto } from './dto/update-command-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeviceAuthGuard } from '../devices/guards/device-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentDevice } from '../common/decorators/current-device.decorator';

@ApiTags('device-commands')
@Controller('device-commands')
export class DeviceCommandsController {
  constructor(private readonly deviceCommandsService: DeviceCommandsService) {}

  // ============================================
  // PARENT ENDPOINTS (Mobile App)
  // ============================================

  @Post('send-notification')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send notification to child\'s watch',
    description: 'Parents can send custom notifications to their child\'s smart watch',
  })
  async sendNotification(
    @CurrentUser() user: any,
    @Body() dto: SendNotificationDto,
  ) {
    const parentId = user.parentProfile?.id;
    if (!parentId) {
      throw new ForbiddenException('Parent profile not found');
    }
    return this.deviceCommandsService.sendNotification(parentId, dto);
  }

  @Post('find-device')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger find device alert',
    description: 'Make the watch ring and vibrate to help locate it',
  })
  async findDevice(
    @CurrentUser() user: any,
    @Body() dto: FindDeviceDto,
  ) {
    const parentId = user.parentProfile?.id;
    if (!parentId) {
      throw new ForbiddenException('Parent profile not found');
    }
    return this.deviceCommandsService.findDevice(parentId, dto);
  }

  @Get('history/:childId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get command history for a child',
    description: 'Retrieve all commands sent to a child\'s device',
  })
  async getCommandHistory(
    @CurrentUser() user: any,
    @Param('childId') childId: string,
    @Query('limit') limit?: number,
  ) {
    const parentId = user.parentProfile?.id;
    if (!parentId) {
      throw new ForbiddenException('Parent profile not found');
    }
    return this.deviceCommandsService.getCommandHistory(
      parentId,
      childId,
      limit ? parseInt(limit.toString()) : 50,
    );
  }

  // ============================================
  // DEVICE ENDPOINTS (Watch App)
  // ============================================

  @Get('pending')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({
    summary: 'Get pending commands for device',
    description: 'Watch app polls this endpoint to receive commands',
  })
  async getPendingCommands(@CurrentDevice('id') deviceId: string) {
    return this.deviceCommandsService.getPendingCommands(deviceId);
  }

  @Post('update-status')
  @UseGuards(DeviceAuthGuard)
  @ApiSecurity('device-token')
  @ApiOperation({
    summary: 'Update command execution status',
    description: 'Watch app updates command status after execution',
  })
  async updateCommandStatus(
    @CurrentDevice('id') deviceId: string,
    @Body() dto: UpdateCommandStatusDto,
  ) {
    return this.deviceCommandsService.updateCommandStatus(deviceId, dto);
  }
}
