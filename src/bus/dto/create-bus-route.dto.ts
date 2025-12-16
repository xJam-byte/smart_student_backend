import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBusRouteDto {
  @ApiProperty({ example: 'Route 1 - Morning' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Morning school bus route' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: [
      { lat: 40.7128, lng: -74.0060 },
      { lat: 40.7589, lng: -73.9851 },
    ],
    description: 'Array of coordinates representing the bus route',
  })
  @IsArray()
  @IsObject({ each: true })
  coordinates: Array<{ lat: number; lng: number }>;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4, 5],
    description: 'Days of the week (1=Monday, 7=Sunday)',
  })
  @IsOptional()
  @IsArray()
  scheduleDays?: number[];
}
