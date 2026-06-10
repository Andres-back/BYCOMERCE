import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '../../../database/prisma-client';

export class DeliverOrderDto {
  @IsOptional()
  @IsEnum(PaymentMethod)
  metodoPago?: PaymentMethod;

  @IsOptional()
  @IsInt()
  @Min(0)
  montoRecibido?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  referenciaExterna?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
