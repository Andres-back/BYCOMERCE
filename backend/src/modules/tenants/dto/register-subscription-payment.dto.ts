import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PaymentMethod } from '../../../database/prisma-client';

export class RegisterSubscriptionPaymentDto {
  @IsInt()
  @Min(1)
  monto!: number;

  @IsEnum(PaymentMethod)
  metodo!: PaymentMethod;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comprobanteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  referenciaExterna?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  observaciones?: string;
}
