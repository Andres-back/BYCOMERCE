import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateLoyaltyProgramDto {
  @IsOptional() @IsBoolean()
  activo?: boolean;

  @IsOptional() @IsInt() @Min(1)
  puntosPorPeso?: number;

  @IsOptional() @IsInt() @Min(1)
  pesoPorPunto?: number;

  @IsOptional() @IsInt() @Min(1)
  expiracionDias?: number;

  @IsOptional() @IsInt() @Min(0)
  puntosBienvenida?: number;
}

export class CreateLoyaltyTierDto {
  @IsString()
  nombre!: string;

  @IsInt() @Min(1)
  nivel!: number;

  @IsOptional() @IsString()
  color?: string;

  @IsNumber() @Min(0)
  multiplicador!: number;

  @IsInt() @Min(0)
  puntosMinimos!: number;
}

export class UpdateLoyaltyTierDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsInt() @Min(1)
  nivel?: number;

  @IsOptional() @IsString()
  color?: string;

  @IsOptional() @IsNumber() @Min(0)
  multiplicador?: number;

  @IsOptional() @IsInt() @Min(0)
  puntosMinimos?: number;
}

export class CreateLoyaltyRewardDto {
  @IsString()
  nombre!: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsString()
  tipo!: string;

  @IsInt() @Min(0)
  valor!: number;

  @IsInt() @Min(1)
  puntosNecesarios!: number;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsString()
  imagen?: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

export class UpdateLoyaltyRewardDto {
  @IsOptional() @IsString()
  nombre?: string;

  @IsOptional() @IsString()
  descripcion?: string;

  @IsOptional() @IsString()
  tipo?: string;

  @IsOptional() @IsInt() @Min(0)
  valor?: number;

  @IsOptional() @IsInt() @Min(1)
  puntosNecesarios?: number;

  @IsOptional() @IsInt() @Min(0)
  stock?: number;

  @IsOptional() @IsString()
  imagen?: string;

  @IsOptional() @IsBoolean()
  activo?: boolean;
}
