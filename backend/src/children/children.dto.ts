import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateChildDto {
  @ApiProperty({ example: 'Aanya Sharma' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '2018-03-15' })
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ required: false, type: [String], example: ['ASD', 'Speech delay'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  diagnoses?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sensoryTriggers?: string[];

  @ApiProperty({ required: false, example: 'verbal' })
  @IsOptional()
  @IsString()
  communicationType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  schoolName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  emergencyContact?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, example: 'mother', default: 'parent' })
  @IsOptional()
  @IsString()
  relationship?: string;
}

export class UpdateChildDto {
  @IsOptional() @IsString() @MaxLength(120) fullName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsArray() @IsString({ each: true }) diagnoses?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) allergies?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) medications?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) sensoryTriggers?: string[];
  @IsOptional() @IsString() communicationType?: string;
  @IsOptional() @IsString() schoolName?: string;
  @IsOptional() @IsString() emergencyContact?: string;
  @IsOptional() @IsString() notes?: string;
}
