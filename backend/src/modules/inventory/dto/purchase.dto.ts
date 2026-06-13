import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsMimeType,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PurchasePaymentStatus } from '../../../database/prisma-client';

const purchaseDueFilters = ['overdue', 'next7', 'next30', 'withoutDue'] as const;

export class PurchaseQueryDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsEnum(PurchasePaymentStatus)
  estadoPago?: PurchasePaymentStatus;

  @IsOptional()
  @IsIn(purchaseDueFilters)
  due?: (typeof purchaseDueFilters)[number];

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreatePurchaseItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;

  @IsInt()
  @Min(0)
  costoUnitario!: number;
}

export class CreatePurchaseDto {
  @IsOptional()
  @IsUUID()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroFactura?: string;

  @IsOptional()
  @IsDateString()
  fechaCompra?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsEnum(PurchasePaymentStatus)
  estadoPago?: PurchasePaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facturaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facturaKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  facturaNombre?: string;

  @IsOptional()
  @IsMimeType()
  @MaxLength(120)
  facturaMime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  facturaOcrTexto?: string;

  @IsOptional()
  @IsObject()
  facturaOcrJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  observaciones?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemDto)
  items!: CreatePurchaseItemDto[];
}

export class UpdatePurchaseInvoiceDto {
  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsEnum(PurchasePaymentStatus)
  estadoPago?: PurchasePaymentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facturaUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  facturaKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  facturaNombre?: string;

  @IsOptional()
  @IsMimeType()
  @MaxLength(120)
  facturaMime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  facturaOcrTexto?: string;

  @IsOptional()
  @IsObject()
  facturaOcrJson?: Record<string, unknown>;
}

export class ExtractPurchaseInvoiceDto {
  @IsString()
  fileBase64!: string;

  @IsMimeType()
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;
}
