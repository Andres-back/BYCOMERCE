import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ImportProductRowDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryName?: string;

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

export class ImportProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => ImportProductRowDto)
  products!: ImportProductRowDto[];
}
