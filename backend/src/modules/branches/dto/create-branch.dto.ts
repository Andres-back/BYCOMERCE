import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString() @MaxLength(160)
  nombre!: string;

  @IsOptional() @IsString() @MaxLength(20)
  codigo?: string;

  @IsOptional() @IsString() @MaxLength(220)
  direccion?: string;

  @IsOptional() @IsString() @MaxLength(40)
  telefono?: string;

  @IsOptional() @IsString() @MaxLength(80)
  barrio?: string;

  @IsOptional() @IsString() @MaxLength(40)
  ciudad?: string;

  @IsOptional()
  latitud?: number;

  @IsOptional()
  longitud?: number;

  @IsOptional() @IsString()
  horarioInicio?: string;

  @IsOptional() @IsString()
  horarioFin?: string;

  @IsOptional() @IsBoolean()
  esPrincipal?: boolean;
}

export class UpdateBranchDto {
  @IsOptional() @IsString() @MaxLength(160)
  nombre?: string;

  @IsOptional() @IsString() @MaxLength(20)
  codigo?: string;

  @IsOptional() @IsString() @MaxLength(220)
  direccion?: string;

  @IsOptional() @IsString() @MaxLength(40)
  telefono?: string;

  @IsOptional() @IsString() @MaxLength(80)
  barrio?: string;

  @IsOptional() @IsString() @MaxLength(40)
  ciudad?: string;

  @IsOptional()
  latitud?: number;

  @IsOptional()
  longitud?: number;

  @IsOptional() @IsString()
  horarioInicio?: string;

  @IsOptional() @IsString()
  horarioFin?: string;

  @IsOptional() @IsBoolean()
  esPrincipal?: boolean;
}
