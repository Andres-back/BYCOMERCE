import { IsString, IsOptional, IsBoolean, IsInt, IsArray, IsEmail, IsEnum, Min, Max, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { RoleName } from '../../../database/prisma-client';

export class ImpersonateDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsBoolean()
  @IsOptional()
  returnToSuperAdmin?: boolean;
}

export class UpdateTenantStatusDto {
  @IsString()
  @IsOptional()
  motivo?: string;
}

export class ProcessPaymentDto {
  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  referenciaExterna?: string;
}

export class CreateTenantDto {
  @IsString() @MaxLength(160)
  nombre!: string;

  @IsString() @MaxLength(80)
  slug!: string;

  @IsString() @MaxLength(80)
  tipoNegocio!: string;

  @IsString()
  planId!: string;

  @IsString() @MaxLength(160)
  adminNombre!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(6)
  adminPassword!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  direccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barrio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ciudad?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  diasPrueba?: number;
}

export class CreatePlanDto {
  @IsString() @MaxLength(80)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(500)
  descripcion?: string;

  @IsInt() @Min(0)
  precio!: number;

  @IsInt() @Min(1)
  limiteUsuarios!: number;

  @IsInt() @Min(1)
  limiteProductos!: number;

  @IsOptional() @IsInt() @Min(0)
  almacenamientoGb?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caracteristicas?: string[];
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @MaxLength(80)
  nombre?: string;

  @IsOptional() @IsString() @MaxLength(500)
  descripcion?: string;

  @IsOptional() @IsInt() @Min(0)
  precio?: number;

  @IsOptional() @IsInt() @Min(1)
  limiteUsuarios?: number;

  @IsOptional() @IsInt() @Min(1)
  limiteProductos?: number;

  @IsOptional() @IsInt() @Min(0)
  almacenamientoGb?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  caracteristicas?: string[];
}

export class CreateUserForTenantDto {
  @IsString() @MaxLength(160)
  nombre!: string;

  @IsEmail()
  email!: string;

  @IsEnum(RoleName)
  rol!: RoleName;

  @IsOptional() @IsString()
  @MinLength(6)
  password?: string;
}

export class AuditLogQueryDto {
  @IsOptional() @IsString()
  tenantId?: string;

  @IsOptional() @IsString()
  accion?: string;

  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  from?: string;

  @IsOptional() @IsString()
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200)
  pageSize?: number;
}
