import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcknowledgeDto {
  @ApiProperty({ example: 'cmd-12345' })
  @IsString()
  commandId: string;
}
