import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  barcode?: string;

  @IsString()
  @MaxLength(180)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  marca?: string;

  @IsInt()
  @Min(0)
  costo!: number;

  @IsInt()
  @Min(0)
  precio!: number;

  @IsInt()
  @Min(0)
  stock!: number;

  @IsInt()
  @Min(0)
  stockMinimo!: number;

  @IsOptional()
  @IsString()
  imagenPrincipal?: string;

  @IsOptional()
  @IsBoolean()
  destacado?: boolean;
}
