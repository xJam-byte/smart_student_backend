import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CommandStatusUpdate {
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
}

export class UpdateCommandStatusDto {
  @ApiProperty({
    description: 'Command ID',
    example: 'clx1234567890',
  })
  @IsString()
  @IsNotEmpty()
  commandId: string;

  @ApiProperty({
    description: 'New status of the command',
    enum: CommandStatusUpdate,
    example: CommandStatusUpdate.EXECUTED,
  })
  @IsEnum(CommandStatusUpdate)
  status: CommandStatusUpdate;

  @ApiPropertyOptional({
    description: 'Error message if status is FAILED',
    example: 'Device offline',
  })
  @IsString()
  @IsOptional()
  errorMessage?: string;
}
