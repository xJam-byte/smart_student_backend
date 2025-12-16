import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MarkAsReadDto } from './dto/mark-as-read.dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current parent' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getNotifications(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.notificationsService.getNotifications(userId, limit ? parseInt(limit) : 50);
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  async markAsRead(@CurrentUser('id') userId: string, @Body() markAsReadDto: MarkAsReadDto) {
    return this.notificationsService.markAsRead(userId, markAsReadDto.notificationIds);
  }
}
