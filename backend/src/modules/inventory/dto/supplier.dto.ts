import { PartialType } from '@nestjs/mapped-types';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class SupplierQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}

export class CreateSupplierDto {
  @IsString()
  @MaxLength(180)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(180)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  observaciones?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
