import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HeartbeatDto {
  @ApiProperty({ example: 75, description: 'Battery level in percentage' })
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel: number;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: -74.0060 })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
