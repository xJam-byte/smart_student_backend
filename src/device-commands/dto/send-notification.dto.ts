import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendNotificationDto {
  @ApiProperty({
    description: 'ID of the child whose watch will receive the notification',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  childId: string;

  @ApiProperty({
    description: 'Notification title',
    example: 'Message from Mom',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  title: string;

  @ApiProperty({
    description: 'Notification message content',
    example: 'Don\'t forget to call me after school!',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  message: string;

  @ApiPropertyOptional({
    description: 'Icon name for the notification',
    example: 'heart',
  })
  @IsString()
  @IsOptional()
  icon?: string;
}
