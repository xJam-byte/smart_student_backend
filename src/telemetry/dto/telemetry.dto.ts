import { IsNumber, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TelemetryDto {
  @ApiProperty({ example: 40.7128 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -74.0060 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 10.5, description: 'Altitude in meters' })
  @IsOptional()
  @IsNumber()
  altitude?: number;

  @ApiPropertyOptional({ example: 15.5, description: 'Accuracy in meters' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Speed in m/s' })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiPropertyOptional({ example: 180, description: 'Bearing in degrees' })
  @IsOptional()
  @IsNumber()
  bearing?: number;

  @ApiPropertyOptional({ example: 75, description: 'Battery level in percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @ApiPropertyOptional({ example: 80, description: 'Heart rate in BPM' })
  @IsOptional()
  @IsNumber()
  heartRate?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Step count' })
  @IsOptional()
  @IsNumber()
  stepCount?: number;

  @ApiPropertyOptional({ enum: ['GPS', 'NETWORK', 'WIFI', 'FUSED'], example: 'GPS' })
  @IsOptional()
  @IsEnum(['GPS', 'NETWORK', 'WIFI', 'FUSED'])
  source?: 'GPS' | 'NETWORK' | 'WIFI' | 'FUSED';

  @ApiPropertyOptional({ example: '2025-12-06T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
