import {
  IsDateString,
  IsInt,
  IsMimeType,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class ExpenseQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateExpenseDto {
  @IsString()
  @MaxLength(80)
  categoria!: string;

  @IsString()
  @MaxLength(500)
  descripcion!: string;

  @IsInt()
  @Min(0)
  valor!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comprobanteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  comprobanteNombre?: string;

  @IsOptional()
  @IsMimeType()
  @MaxLength(120)
  comprobanteMime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comprobanteIaTexto?: string;

  @IsOptional()
  @IsObject()
  comprobanteIaJson?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  fecha?: string;
}

export class UpdateExpenseDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  categoria?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  valor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comprobanteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  comprobanteNombre?: string;

  @IsOptional()
  @IsMimeType()
  @MaxLength(120)
  comprobanteMime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  comprobanteIaTexto?: string;

  @IsOptional()
  @IsObject()
  comprobanteIaJson?: Record<string, unknown>;
}
