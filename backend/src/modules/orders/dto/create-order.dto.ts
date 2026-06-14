import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  Matches,
  MinLength,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../database/prisma-client';

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsOptional()
  @IsUUID()
  variantId?: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class CreateOrderDto {
  @IsString()
  @MaxLength(120)
  tenantSlug!: string;

  @IsString()
  @MaxLength(160)
  customerName!: string;

  @IsString()
  @MinLength(7)
  @Matches(/^[0-9+\s()-]+$/)
  @MaxLength(40)
  customerPhone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  customerEmail?: string;

  @IsString()
  @MaxLength(240)
  direccion!: string;

  @IsOptional()
  @IsLatitude()
  latitud?: number;

  @IsOptional()
  @IsLongitude()
  longitud?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observaciones?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  metodoPago?: PaymentMethod;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
