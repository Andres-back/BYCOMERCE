import { IsString, IsOptional, IsArray, IsObject } from 'class-validator';

export class BusinessTypePreset {
  @IsString()
  id!: string;

  @IsString()
  nombre!: string;

  @IsString()
  icono!: string;

  @IsString()
  descripcion!: string;

  @IsArray()
  @IsString({ each: true })
  categorias: string[] = [];

  @IsObject()
  config: Record<string, any> = {};

  @IsArray()
  @IsString({ each: true })
  atributosProducto: string[] = [];

  @IsOptional()
  @IsObject()
  posConfig?: {
    mostrarMesas?: boolean;
    mostrarTiempoPreparacion?: boolean;
    metodosPago?: string[];
  };

  @IsOptional()
  @IsObject()
  inventarioConfig?: {
    usarVariantes?: boolean;
    tipoVariantes?: string[];
    usarStockMinimo?: boolean;
  };
}
