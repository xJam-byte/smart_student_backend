import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePushTokenDto {
  @ApiProperty({ example: 'fcm-token-here' })
  @IsString()
  token: string;
}
