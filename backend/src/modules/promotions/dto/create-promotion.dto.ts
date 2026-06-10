import { IsArray, IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsIn(['PORCENTAJE', 'MONTO_FIJO', 'PRECIO_FIJO', 'N_X_M', 'COMBO', 'ENVIO_GRATIS'])
  tipo!: string;

  @IsString()
  @IsIn(['GLOBAL', 'CATEGORIA', 'PRODUCTO', 'CLIENTE_SEGMENTO'])
  alcance!: string;

  @IsInt()
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsInt()
  valorMaximo?: number;

  @IsOptional()
  @IsInt()
  minCompra?: number;

  @IsOptional()
  @IsInt()
  minItems?: number;

  @IsOptional()
  @IsInt()
  cantidadGratis?: number;

  @IsDateString()
  fechaInicio!: string;

  @IsDateString()
  fechaFin!: string;

  @IsOptional()
  diasSemana?: number[];

  @IsOptional()
  @IsString()
  horarioInicio?: string;

  @IsOptional()
  @IsString()
  horarioFin?: string;

  @IsOptional()
  @IsString()
  segmento?: string;

  @IsOptional()
  @IsInt()
  maxUsos?: number;

  @IsOptional()
  @IsInt()
  maxUsosCliente?: number;

  @IsOptional()
  @IsArray()
  productIds?: string[];
}

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsInt()
  valorMaximo?: number;

  @IsOptional()
  @IsInt()
  minCompra?: number;

  @IsOptional()
  @IsInt()
  minItems?: number;

  @IsOptional()
  @IsInt()
  cantidadGratis?: number;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @IsOptional()
  diasSemana?: number[];

  @IsOptional()
  @IsString()
  horarioInicio?: string;

  @IsOptional()
  @IsString()
  horarioFin?: string;

  @IsOptional()
  @IsString()
  segmento?: string;

  @IsOptional()
  @IsInt()
  maxUsos?: number;

  @IsOptional()
  @IsInt()
  maxUsosCliente?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  productIds?: string[];
}

export class CreateCouponDto {
  @IsString()
  codigo!: string;

  @IsOptional()
  @IsString()
  promotionId?: string;

  @IsString()
  @IsIn(['PORCENTAJE', 'MONTO_FIJO'])
  tipo!: string;

  @IsInt()
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsInt()
  valorMaximo?: number;

  @IsOptional()
  @IsInt()
  minCompra?: number;

  @IsOptional()
  @IsInt()
  usosMaximos?: number;

  @IsOptional()
  @IsInt()
  maxUsosCliente?: number;

  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string;
}

export class UpdateCouponDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsInt()
  valorMaximo?: number;

  @IsOptional()
  @IsInt()
  minCompra?: number;

  @IsOptional()
  @IsInt()
  usosMaximos?: number;

  @IsOptional()
  @IsInt()
  maxUsosCliente?: number;

  @IsOptional()
  @IsDateString()
  fechaExpiracion?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
