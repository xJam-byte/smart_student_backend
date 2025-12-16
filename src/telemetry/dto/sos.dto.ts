import { IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SosDto {
  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -74.006 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 'Emergency help needed' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ example: '2025-12-06T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
