import { IsEmail, IsOptional, IsString, IsPhoneNumber, ValidateIf } from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiPropertyOptional({ example: 'parent@example.com' })
  @IsOptional()
  @IsEmail()
  @ValidateIf((o) => !o.phone || o.email)
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsPhoneNumber()
  @ValidateIf((o) => !o.email || o.phone)
  phone?: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  password: string;
}
