import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TelemetryCleanupService } from './telemetry-cleanup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('admin/telemetry')
@Controller('admin/telemetry')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TelemetryAdminController {
  constructor(private readonly cleanupService: TelemetryCleanupService) {}

  @Get('cleanup/stats')
  @ApiOperation({ summary: 'Get cleanup statistics' })
  async getCleanupStats() {
    return this.cleanupService.getCleanupStats();
  }

  @Post('cleanup/manual')
  @ApiOperation({ summary: 'Manually trigger telemetry cleanup' })
  async manualCleanup(@Query('days') days?: string) {
    const daysToRetain = days ? parseInt(days, 10) : undefined;
    return this.cleanupService.manualCleanup(daysToRetain);
  }
}
