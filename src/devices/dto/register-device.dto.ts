import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'android-device-123456' })
  @IsString()
  hardwareId: string;

  @ApiProperty({ enum: ['WEAR_OS'], example: 'WEAR_OS' })
  @IsEnum(['WEAR_OS'])
  platform: 'WEAR_OS';

  @ApiPropertyOptional({ example: 'Samsung Galaxy Watch 5' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: '1.2.3' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ example: 'Android 13' })
  @IsOptional()
  @IsString()
  osVersion?: string;
}
