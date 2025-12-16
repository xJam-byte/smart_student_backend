import { Controller, Get, Patch, Body, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';

@ApiTags('parent')
@Controller('parent')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get parent profile' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.parentService.getProfile(userId);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update parent profile' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.parentService.updateProfile(userId, updateProfileDto);
  }

  @Patch('push-token')
  @ApiOperation({ summary: 'Update FCM push token' })
  async updatePushToken(
    @CurrentUser('id') userId: string,
    @Body() updatePushTokenDto: UpdatePushTokenDto,
  ) {
    return this.parentService.updatePushToken(userId, updatePushTokenDto);
  }

  @Delete('push-token')
  @ApiOperation({ summary: 'Remove FCM push token' })
  async removePushToken(@CurrentUser('id') userId: string) {
    return this.parentService.removePushToken(userId);
  }
}
