import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSchoolLocationDto {
  @ApiProperty({ example: 40.7589 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -73.9851 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 100, description: 'Geofence radius in meters' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  radius?: number;
}
