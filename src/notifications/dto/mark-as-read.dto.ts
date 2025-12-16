import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarkAsReadDto {
  @ApiProperty({
    example: ['notif-1', 'notif-2'],
    description: 'Array of notification IDs to mark as read'
  })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}
