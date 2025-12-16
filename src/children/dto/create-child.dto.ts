import { IsString, IsOptional, IsNumber, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiPropertyOptional({ example: '2015-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'male' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 40.7128 })
  @IsOptional()
  @IsNumber()
  homeLatitude?: number;

  @ApiPropertyOptional({ example: -74.0060 })
  @IsOptional()
  @IsNumber()
  homeLongitude?: number;

  @ApiPropertyOptional({ example: 40.7589 })
  @IsOptional()
  @IsNumber()
  schoolLatitude?: number;

  @ApiPropertyOptional({ example: -73.9851 })
  @IsOptional()
  @IsNumber()
  schoolLongitude?: number;

  @ApiPropertyOptional({ example: 100, description: 'School geofence radius in meters' })
  @IsOptional()
  @IsNumber()
  schoolGeofenceRadius?: number;

  @ApiPropertyOptional({ example: 50, description: 'Home geofence radius in meters' })
  @IsOptional()
  @IsNumber()
  homeGeofenceRadius?: number;
}
