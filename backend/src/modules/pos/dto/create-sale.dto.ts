import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod } from '../../../database/prisma-client';

export class CreateSaleItemDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @Min(1)
  cantidad!: number;
}

export class CreateSaleCustomerDto {
  @IsString()
  @MaxLength(160)
  nombre!: string;

  @IsString()
  @MaxLength(40)
  telefono!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  direccion?: string;
}

export class CreateSaleDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSaleCustomerDto)
  customer?: CreateSaleCustomerDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items!: CreateSaleItemDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  descuento?: number;

  @IsEnum(PaymentMethod)
  metodoPago!: PaymentMethod;

  @IsOptional()
  @IsInt()
  @Min(0)
  montoRecibido?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  referenciaExterna?: string;
}
