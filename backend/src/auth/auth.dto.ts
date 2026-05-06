import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Language, Role } from '@prisma/client';

export class SignupDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: Role, required: false, default: Role.PARENT })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ enum: Language, required: false, default: Language.EN })
  @IsOptional()
  @IsEnum(Language)
  preferredLanguage?: Language;

  @ApiProperty({ required: false, example: '+919876543210' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ example: 'parent@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}
