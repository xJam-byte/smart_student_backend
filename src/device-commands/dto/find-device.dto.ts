import { IsString, IsNotEmpty, IsOptional, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FindDeviceDto {
  @ApiProperty({
    description: 'ID of the child whose watch needs to be found',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  childId: string;

  @ApiPropertyOptional({
    description: 'Duration in seconds for the find device alert (default: 60)',
    example: 60,
    minimum: 10,
    maximum: 300,
  })
  @IsNumber()
  @IsOptional()
  @Min(10)
  @Max(300)
  duration?: number;

  @ApiPropertyOptional({
    description: 'Whether to vibrate the device (default: true)',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  vibrate?: boolean;
}
